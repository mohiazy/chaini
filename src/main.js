(function chainImpactLab() {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const tipSpeedEl = document.getElementById("tipSpeed");
  const impactEl = document.getElementById("impactValue");
  const targetCountEl = document.getElementById("targetCount");
  const shatteredCountEl = document.getElementById("shatteredCount");
  const linkCountValueEl = document.getElementById("linkCountValue");
  const tipMassValueEl = document.getElementById("tipMassValue");
  const stiffnessValueEl = document.getElementById("stiffnessValue");
  const gripValueEl = document.getElementById("gripValue");
  const themeNameEl = document.getElementById("themeName");
  const audioStateEl = document.getElementById("audioState");
  const tuningReadoutEl = document.getElementById("tuningReadout");

  const FIXED_DT = 1 / 120;
  const SOLVER_ITERATIONS = 10;
  const LINK_LENGTH = 24;
  const BASE_LINK_RADIUS = 8.4;

  const tuning = {
    linkCount: 18,
    tipMass: 6.8,
    stiffness: 0.98,
    grip: 1.04
  };

  const limits = {
    linkCountMin: 10,
    linkCountMax: 30,
    tipMassMin: 3,
    tipMassMax: 14,
    stiffnessMin: 0.68,
    stiffnessMax: 1.45,
    gripMin: 0.85,
    gripMax: 1.6
  };

  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
    sampleTime: performance.now() * 0.001,
    turnSnap: 0,
    turnDirX: 0,
    turnDirY: 0
  };

  const targetTierDefs = {
    soft: {
      key: "soft",
      name: "Soft",
      weight: 0.43,
      hpScale: 0.78,
      massScale: 0.86,
      damageScale: 1.28,
      threshold: 10,
      crackScale: 1.3,
      debrisScale: 1.1,
      radiusScale: 1,
      hueMin: 26,
      hueMax: 45,
      saturation: 78
    },
    armored: {
      key: "armored",
      name: "Armored",
      weight: 0.27,
      hpScale: 1.72,
      massScale: 1.35,
      damageScale: 0.56,
      threshold: 21,
      crackScale: 0.72,
      debrisScale: 0.7,
      radiusScale: 1,
      hueMin: 198,
      hueMax: 220,
      saturation: 38
    },
    explosive: {
      key: "explosive",
      name: "Explosive",
      weight: 0.18,
      hpScale: 0.96,
      massScale: 0.96,
      damageScale: 0.96,
      threshold: 13,
      crackScale: 1,
      debrisScale: 1.45,
      radiusScale: 1,
      blastRadiusScale: 4.3,
      blastPowerScale: 1.1,
      hueMin: 6,
      hueMax: 20,
      saturation: 84
    },
    metallic: {
      key: "metallic",
      name: "Metallic",
      weight: 0.12,
      hpScale: 2.6,
      massScale: 2.3,
      damageScale: 0.44,
      threshold: 30,
      crackScale: 0.52,
      debrisScale: 0.46,
      radiusScale: 1.22,
      hueMin: 205,
      hueMax: 222,
      saturation: 22
    }
  };
  const targetTierPool = [
    targetTierDefs.soft,
    targetTierDefs.armored,
    targetTierDefs.explosive,
    targetTierDefs.metallic
  ];

  const themePresets = {
    impact: {
      key: "impact",
      name: "Impact Forge",
      bgTop: "#1a2a3a",
      bgMid: "#0d1622",
      bgBottom: "#070b12",
      pointerGlow: "255, 186, 92",
      pointerHalo: "255, 123, 67",
      grid: "190, 211, 238",
      chainA: "#edf3fb",
      chainB: "#95a2b7",
      chainC: "#d9e5f3",
      chainShadow: "0, 0, 0",
      tipSpike: "177, 194, 214",
      tipCore: "#f6f9ff",
      tipCoreMid: "#aab6c6",
      tipCoreEdge: "#596678",
      soundStyle: "impact"
    },
    pinball: {
      key: "pinball",
      name: "Neon Pinball",
      bgTop: "#0f2f39",
      bgMid: "#0a1f2e",
      bgBottom: "#051219",
      pointerGlow: "94, 245, 221",
      pointerHalo: "255, 210, 127",
      grid: "92, 231, 212",
      chainA: "#d8fff2",
      chainB: "#68b7ac",
      chainC: "#b4f6e6",
      chainShadow: "2, 12, 18",
      tipSpike: "95, 245, 220",
      tipCore: "#f6fffa",
      tipCoreMid: "#9de1d2",
      tipCoreEdge: "#2c6b67",
      soundStyle: "pinball"
    }
  };

  const handle = {
    x: pointer.x,
    y: pointer.y,
    vx: 0,
    vy: 0
  };

  const world = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  const chain = [];
  const targets = [];
  const impacts = [];
  const debris = [];

  let accumulator = 0;
  let previousTime = performance.now() * 0.001;
  let lastImpactStrength = 0;
  let cameraShake = 0;
  let hitStopTimer = 0;
  let tipSpin = 0;
  let shatteredCount = 0;
  let activeTheme = themePresets.impact;
  let audioMuted = false;
  let audioReady = false;
  let audioContext = null;
  let masterGain = null;
  let noiseBuffer = null;
  let nextImpactSoundTime = 0;
  let nextShatterSoundTime = 0;
  let nextExplosionSoundTime = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function updateAudioHud() {
    if (!audioStateEl) {
      return;
    }
    if (audioMuted) {
      audioStateEl.textContent = "Muted";
      return;
    }
    audioStateEl.textContent = audioReady ? "On" : "Off";
  }

  function applyTheme(themeKey) {
    const nextTheme = themePresets[themeKey];
    if (!nextTheme) {
      return;
    }
    activeTheme = nextTheme;
    document.body.setAttribute("data-theme", nextTheme.key);
    if (themeNameEl) {
      themeNameEl.textContent = nextTheme.name;
    }
    triggerTuningFlash();
  }

  function cycleTheme() {
    const keys = Object.keys(themePresets);
    const currentIndex = Math.max(0, keys.indexOf(activeTheme.key));
    const nextKey = keys[(currentIndex + 1) % keys.length];
    applyTheme(nextKey);
  }

  function createNoiseBuffer(context) {
    const length = Math.floor(context.sampleRate * 1.2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const low = (Math.random() * 2 - 1) * (1 - t);
      const high = (Math.random() * 2 - 1) * 0.35;
      data[i] = low + high;
    }
    return buffer;
  }

  function ensureAudio() {
    if (audioMuted) {
      return false;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return false;
    }

    if (!audioContext) {
      audioContext = new AudioCtx();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.19;
      masterGain.connect(audioContext.destination);
      noiseBuffer = createNoiseBuffer(audioContext);
      audioReady = true;
      updateAudioHud();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return true;
  }

  function playOscillator(settings) {
    if (!ensureAudio()) {
      return;
    }
    const now = audioContext.currentTime;
    const start = settings.startTime || now;
    const attack = settings.attack || 0.002;
    const sustain = settings.sustain || 0.025;
    const release = settings.release || 0.09;
    const end = start + attack + sustain + release;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = settings.type || "sine";
    osc.frequency.setValueAtTime(settings.frequency || 220, start);
    if (settings.endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, settings.endFrequency),
        end
      );
    }
    if (settings.detune) {
      osc.detune.setValueAtTime(settings.detune, start);
    }

    const volume = settings.volume || 0.1;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.38), start + attack + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(end + 0.01);
  }

  function playNoiseBurst(settings) {
    if (!ensureAudio() || !noiseBuffer) {
      return;
    }
    const now = audioContext.currentTime;
    const start = settings.startTime || now;
    const duration = settings.duration || 0.13;
    const end = start + duration;
    const volume = settings.volume || 0.12;

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    source.buffer = noiseBuffer;
    source.playbackRate.value = settings.rate || 1;
    filter.type = settings.filterType || "bandpass";
    filter.frequency.setValueAtTime(settings.freqStart || 1600, start);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, settings.freqEnd || 340),
      end
    );
    filter.Q.value = settings.q || 0.7;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.01, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(start);
    source.stop(end + 0.01);
  }

  function playImpactSound(strength, tierKey) {
    if (!ensureAudio()) {
      return;
    }
    const now = audioContext.currentTime;
    if (now < nextImpactSoundTime) {
      return;
    }
    nextImpactSoundTime = now + 0.025;

    const normalized = clamp((strength - 12) / 95, 0, 1);
    const style = activeTheme.soundStyle;

    if (style === "pinball") {
      const scale = [329.63, 392.0, 440.0, 523.25, 659.25, 783.99];
      const index = Math.floor(normalized * (scale.length - 1));
      const tierPitch = tierKey === "metallic" ? 0.72 : tierKey === "armored" ? 0.9 : 1;
      const base = scale[index] * tierPitch;
      playOscillator({
        type: "triangle",
        frequency: base,
        endFrequency: base * (tierKey === "armored" ? 0.96 : 1.06),
        volume: 0.05 + normalized * 0.08,
        attack: 0.0015,
        sustain: 0.013,
        release: 0.06
      });
      playOscillator({
        type: "square",
        frequency: base * 2,
        endFrequency: base * 1.9,
        volume: 0.013 + normalized * 0.028,
        attack: 0.001,
        sustain: 0.01,
        release: 0.05
      });
      if (tierKey === "metallic") {
        playOscillator({
          type: "square",
          frequency: base * 3.1,
          endFrequency: base * 2.2,
          volume: 0.012 + normalized * 0.02,
          attack: 0.001,
          sustain: 0.008,
          release: 0.065
        });
      }
      return;
    }

    const freq = 95 + normalized * 95;
    playOscillator({
      type: tierKey === "armored" || tierKey === "metallic" ? "triangle" : "sine",
      frequency: freq,
      endFrequency: freq * 0.64,
      volume: 0.045 + normalized * 0.09,
      attack: 0.002,
      sustain: 0.015,
      release: 0.1
    });
    if (tierKey === "metallic") {
      playOscillator({
        type: "square",
        frequency: 700 + normalized * 320,
        endFrequency: 380 + normalized * 120,
        volume: 0.014 + normalized * 0.022,
        attack: 0.001,
        sustain: 0.009,
        release: 0.08
      });
    }
    if (strength > 20) {
      playNoiseBurst({
        duration: 0.06 + normalized * 0.09,
        volume: 0.018 + normalized * 0.035,
        freqStart: tierKey === "armored" || tierKey === "metallic" ? 1300 : 900,
        freqEnd: 260,
        q: 0.8
      });
    }
  }

  function playShatterSound(strength, tierKey) {
    if (!ensureAudio()) {
      return;
    }
    const now = audioContext.currentTime;
    if (now < nextShatterSoundTime) {
      return;
    }
    nextShatterSoundTime = now + 0.06;
    const style = activeTheme.soundStyle;
    const normalized = clamp(strength / 180, 0, 1);

    if (style === "pinball") {
      const notes = [523.25, 659.25, 783.99, 987.77];
      for (let i = 0; i < notes.length; i += 1) {
        playOscillator({
          type: "triangle",
          startTime: now + i * 0.014,
          frequency: notes[i] * (tierKey === "armored" ? 0.95 : tierKey === "metallic" ? 0.75 : 1),
          endFrequency: notes[i] * 0.95,
          volume: 0.03 + normalized * 0.03,
          attack: 0.001,
          sustain: 0.008,
          release: 0.09
        });
      }
      return;
    }

    playNoiseBurst({
      startTime: now,
      duration: 0.12 + normalized * 0.16,
      volume: 0.04 + normalized * 0.09,
      freqStart: tierKey === "armored" || tierKey === "metallic" ? 1900 : 1400,
      freqEnd: 180,
      q: tierKey === "armored" || tierKey === "metallic" ? 1.25 : 0.9
    });
    playOscillator({
      type: "sawtooth",
      startTime: now,
      frequency: tierKey === "armored" ? 180 : tierKey === "metallic" ? 220 : 120,
      endFrequency: 50,
      volume: 0.03 + normalized * 0.05,
      attack: 0.001,
      sustain: 0.03,
      release: 0.2
    });
  }

  function playExplosionSound(strength) {
    if (!ensureAudio()) {
      return;
    }
    const now = audioContext.currentTime;
    if (now < nextExplosionSoundTime) {
      return;
    }
    nextExplosionSoundTime = now + 0.09;
    const normalized = clamp(strength / 220, 0, 1);
    const style = activeTheme.soundStyle;

    if (style === "pinball") {
      const root = 164.81;
      playOscillator({
        type: "square",
        frequency: root * 2,
        endFrequency: root * 1.1,
        volume: 0.06 + normalized * 0.06,
        attack: 0.001,
        sustain: 0.04,
        release: 0.24
      });
      playOscillator({
        type: "triangle",
        startTime: now + 0.012,
        frequency: root * 3,
        endFrequency: root * 2.2,
        volume: 0.03 + normalized * 0.04,
        attack: 0.001,
        sustain: 0.03,
        release: 0.2
      });
      return;
    }

    playNoiseBurst({
      duration: 0.18 + normalized * 0.16,
      volume: 0.06 + normalized * 0.11,
      freqStart: 980,
      freqEnd: 90,
      q: 0.65,
      filterType: "lowpass"
    });
    playOscillator({
      type: "sine",
      frequency: 66,
      endFrequency: 28,
      volume: 0.05 + normalized * 0.05,
      attack: 0.001,
      sustain: 0.05,
      release: 0.32
    });
  }

  function toggleMute() {
    audioMuted = !audioMuted;
    if (audioMuted && masterGain && audioContext) {
      const now = audioContext.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.0001, now, 0.02);
    } else if (!audioMuted && masterGain && audioContext) {
      const now = audioContext.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.19, now, 0.04);
    } else if (!audioMuted) {
      ensureAudio();
    }
    updateAudioHud();
  }

  function queueHitStop(strength, kind) {
    const shatter = kind === "shatter";
    const amount = shatter
      ? clamp((strength - 20) * 0.00014, 0, 0.01)
      : clamp((strength - 26) * 0.00007, 0, 0.0035);
    if (amount <= 0) {
      return;
    }
    hitStopTimer = Math.max(hitStopTimer, amount);
  }

  function applyChainRecoil(dirX, dirY, strength, tierKey) {
    const tierScale =
      tierKey === "metallic" ? 1.45 : tierKey === "armored" ? 1.2 : 1;
    const recoil = clamp((strength - 10) * 0.058 * tierScale, 0, 9.5);
    if (recoil <= 0) {
      return;
    }

    handle.vx -= dirX * recoil * 2.1;
    handle.vy -= dirY * recoil * 2.1;

    const maxLinks = Math.min(6, chain.length - 1);
    for (let i = 1; i <= maxLinks; i += 1) {
      const link = chain[i];
      const weight = 1 - (i - 1) / maxLinks;
      const vx = link.x - link.px;
      const vy = link.y - link.py;
      link.px = link.x - (vx - dirX * recoil * weight * 0.42);
      link.py = link.y - (vy - dirY * recoil * weight * 0.42);
    }
  }

  function triggerTuningFlash() {
    if (!tuningReadoutEl) {
      return;
    }
    tuningReadoutEl.classList.remove("flash");
    void tuningReadoutEl.offsetWidth;
    tuningReadoutEl.classList.add("flash");
  }

  function updateTuningHud() {
    if (linkCountValueEl) {
      linkCountValueEl.textContent = String(tuning.linkCount);
    }
    if (tipMassValueEl) {
      tipMassValueEl.textContent = tuning.tipMass.toFixed(1);
    }
    if (stiffnessValueEl) {
      stiffnessValueEl.textContent = tuning.stiffness.toFixed(2);
    }
    if (gripValueEl) {
      gripValueEl.textContent = tuning.grip.toFixed(2);
    }
  }

  function pickTargetTier() {
    const roll = Math.random();
    let cumulative = 0;
    for (let i = 0; i < targetTierPool.length; i += 1) {
      const tier = targetTierPool[i];
      cumulative += tier.weight;
      if (roll <= cumulative) {
        return tier;
      }
    }
    return targetTierDefs.soft;
  }

  function particle(x, y, radius, mass, drag, kind) {
    return {
      kind,
      x,
      y,
      px: x,
      py: y,
      radius,
      invMass: mass === Infinity ? 0 : 1 / mass,
      drag,
      flash: 0,
      lift: 0,
      hue: random(21, 42)
    };
  }

  function createChainLink(index, linkCount) {
    const isHandle = index === 0;
    const isTip = index === linkCount - 1;
    const radius = isTip
      ? BASE_LINK_RADIUS * (1.16 + tuning.tipMass * 0.055)
      : BASE_LINK_RADIUS * (0.88 + Math.sin(index * 0.74) * 0.08);
    const mass = isHandle ? Infinity : isTip ? tuning.tipMass : 2.4;
    const drag = isTip ? clamp(0.989 + tuning.tipMass * 0.00062, 0.989, 0.996) : 0.9945;

    const link = particle(handle.x, handle.y, radius, mass, drag, "chain");
    link.index = index;
    return link;
  }

  function applyTipMass() {
    if (chain.length === 0) {
      return;
    }
    const tip = chain[chain.length - 1];
    tip.invMass = 1 / tuning.tipMass;
    tip.radius = BASE_LINK_RADIUS * (1.16 + tuning.tipMass * 0.055);
    tip.drag = clamp(0.989 + tuning.tipMass * 0.00062, 0.989, 0.996);
  }

  function rebuildChain() {
    const previous = chain.slice();
    chain.length = 0;

    let directionX = -1;
    let directionY = 0;
    if (previous.length > 1) {
      const dx = previous[1].x - previous[0].x;
      const dy = previous[1].y - previous[0].y;
      const length = Math.hypot(dx, dy);
      if (length > 1e-4) {
        directionX = dx / length;
        directionY = dy / length;
      }
    }

    for (let i = 0; i < tuning.linkCount; i += 1) {
      const link = createChainLink(i, tuning.linkCount);

      if (previous.length > 0) {
        const mappedIndex = Math.round((i / Math.max(1, tuning.linkCount - 1)) * (previous.length - 1));
        const source = previous[mappedIndex] || previous[previous.length - 1];
        const vx = source.x - source.px;
        const vy = source.y - source.py;
        link.x = clamp(source.x, link.radius, world.width - link.radius);
        link.y = clamp(source.y, link.radius, world.height - link.radius);
        link.px = link.x - vx;
        link.py = link.y - vy;
      } else {
        link.x = handle.x + directionX * LINK_LENGTH * i;
        link.y = handle.y + directionY * LINK_LENGTH * i;
        link.px = link.x;
        link.py = link.y;
      }

      chain.push(link);
    }

    if (chain.length > 0) {
      chain[0].x = handle.x;
      chain[0].y = handle.y;
      chain[0].px = handle.x;
      chain[0].py = handle.y;
    }

    applyTipMass();
  }

  function initializeChain() {
    rebuildChain();
    updateTuningHud();
  }

  function initializeTarget(target, radius, tier) {
    target.tier = tier;
    target.hue = random(tier.hueMin, tier.hueMax);
    target.maxHp = radius * random(2.45, 2.95) * tier.hpScale;
    target.hp = target.maxHp;
    target.hitCooldown = 0;
    target.broken = false;
    target.saturation = tier.saturation;
    target.crackAngles = [];
    target.crackBias = random(0, Math.PI * 2);
    const crackCount = Math.round(8 * tier.crackScale);
    for (let i = 0; i < crackCount; i += 1) {
      target.crackAngles.push(random(0, Math.PI * 2));
    }
  }

  function spawnTargets(count, options) {
    const opts = options || {};
    const ensureExplosive = Boolean(opts.ensureExplosive);
    const ensureMetallic = Boolean(opts.ensureMetallic);
    let explosivePlaced = false;
    let metallicPlaced = false;
    let placed = 0;
    let tries = 0;

    while (placed < count && tries < count * 120) {
      tries += 1;
      const remaining = count - placed;
      let forcedTier = null;
      if (
        ensureExplosive &&
        ensureMetallic &&
        !explosivePlaced &&
        !metallicPlaced &&
        remaining === 2
      ) {
        forcedTier = Math.random() < 0.5 ? targetTierDefs.explosive : targetTierDefs.metallic;
      } else if (ensureExplosive && !explosivePlaced && remaining <= 1) {
        forcedTier = targetTierDefs.explosive;
      } else if (ensureMetallic && !metallicPlaced && remaining <= 1) {
        forcedTier = targetTierDefs.metallic;
      }

      const tier = forcedTier || pickTargetTier();
      const radius = random(18, 33) * (tier.radiusScale || 1);
      const x = random(radius + 28, world.width - radius - 28);
      const y = random(radius + 28, world.height - radius - 28);

      if (Math.hypot(x - handle.x, y - handle.y) < 170) {
        continue;
      }

      let overlapping = false;
      for (let i = 0; i < targets.length; i += 1) {
        const other = targets[i];
        if (Math.hypot(x - other.x, y - other.y) < radius + other.radius + 16) {
          overlapping = true;
          break;
        }
      }
      if (overlapping) {
        continue;
      }

      const mass = radius * radius * 0.03 * tier.massScale;
      const target = particle(x, y, radius, mass, 0.9975, "target");
      initializeTarget(target, radius, tier);
      targets.push(target);
      if (tier.key === "explosive") {
        explosivePlaced = true;
      } else if (tier.key === "metallic") {
        metallicPlaced = true;
      }
      placed += 1;
    }
  }

  function resetArena() {
    targets.length = 0;
    debris.length = 0;
    impacts.length = 0;
    shatteredCount = 0;
    lastImpactStrength = 0;
    spawnTargets(12, { ensureExplosive: true, ensureMetallic: true });
  }

  function resize() {
    world.width = window.innerWidth;
    world.height = window.innerHeight;
    world.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(world.width * world.dpr);
    canvas.height = Math.floor(world.height * world.dpr);
    canvas.style.width = `${world.width}px`;
    canvas.style.height = `${world.height}px`;

    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);

    for (let i = 0; i < chain.length; i += 1) {
      const link = chain[i];
      link.x = clamp(link.x, link.radius, world.width - link.radius);
      link.y = clamp(link.y, link.radius, world.height - link.radius);
      link.px = link.x;
      link.py = link.y;
    }

    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i];
      t.x = clamp(t.x, t.radius, world.width - t.radius);
      t.y = clamp(t.y, t.radius, world.height - t.radius);
      t.px = t.x;
      t.py = t.y;
    }

    for (let i = 0; i < debris.length; i += 1) {
      const piece = debris[i];
      piece.x = clamp(piece.x, piece.radius, world.width - piece.radius);
      piece.y = clamp(piece.y, piece.radius, world.height - piece.radius);
    }
  }

  function updateHandle(dt) {
    const pointerDecay = Math.pow(0.84, dt * 60);
    pointer.vx *= pointerDecay;
    pointer.vy *= pointerDecay;
    pointer.turnSnap *= Math.pow(0.62, dt * 60);

    const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
    const lead = (0.016 + pointerSpeed / 56000) * tuning.grip;
    const targetX = clamp(pointer.x + pointer.vx * lead, 0, world.width);
    const targetY = clamp(pointer.y + pointer.vy * lead, 0, world.height);

    const dx = targetX - handle.x;
    const dy = targetY - handle.y;
    const distance = Math.hypot(dx, dy);
    const snapBoost = 1 + pointer.turnSnap * 1.18;
    const spring = (90 + Math.min(170, distance * 0.33)) * tuning.grip * snapBoost;
    const feedForward = (0.22 + pointer.turnSnap * 0.21) * tuning.grip;
    const dampingBase = clamp(0.71 - (tuning.grip - 1) * 0.08, 0.61, 0.79);
    const decay = Math.pow(dampingBase, dt * 60);
    const maxSpeed = 2700 + (tuning.grip - 1) * 680 + pointer.turnSnap * 420;

    handle.vx += dx * spring * dt + pointer.vx * feedForward * dt;
    handle.vy += dy * spring * dt + pointer.vy * feedForward * dt;

    handle.vx *= decay;
    handle.vy *= decay;

    const speed = Math.hypot(handle.vx, handle.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      handle.vx *= scale;
      handle.vy *= scale;
    }

    const catchup = clamp(
      (0.024 + pointer.turnSnap * 0.05) * tuning.grip * dt * 60,
      0,
      0.22
    );
    if (pointer.turnSnap > 0.01) {
      const snapImpulse = pointer.turnSnap * 26 * dt;
      handle.vx += pointer.turnDirX * snapImpulse;
      handle.vy += pointer.turnDirY * snapImpulse;
    }
    handle.x += dx * catchup;
    handle.y += dy * catchup;
    handle.x += handle.vx * dt;
    handle.y += handle.vy * dt;
    handle.x = clamp(handle.x, 12, world.width - 12);
    handle.y = clamp(handle.y, 12, world.height - 12);
  }

  function integrateBody(body) {
    if (body.invMass === 0) {
      return;
    }

    const vx = (body.x - body.px) * body.drag;
    const vy = (body.y - body.py) * body.drag;

    body.px = body.x;
    body.py = body.y;
    body.x += vx;
    body.y += vy;
  }

  function constrainDistance(a, b, distance, stiffness) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1e-8) {
      return;
    }

    const dist = Math.sqrt(distSq);
    const diff = (dist - distance) / dist;
    const massSum = a.invMass + b.invMass;

    if (massSum === 0) {
      return;
    }

    const correctionX = dx * diff * stiffness;
    const correctionY = dy * diff * stiffness;

    if (a.invMass > 0) {
      const share = a.invMass / massSum;
      a.x += correctionX * share;
      a.y += correctionY * share;
    }
    if (b.invMass > 0) {
      const share = b.invMass / massSum;
      b.x -= correctionX * share;
      b.y -= correctionY * share;
    }
  }

  function solveBounds(body, bounce) {
    if (body.invMass === 0) {
      return;
    }

    let vx = body.x - body.px;
    let vy = body.y - body.py;
    let bounced = false;

    if (body.x < body.radius) {
      body.x = body.radius;
      if (vx < 0) {
        vx *= -bounce;
      }
      bounced = true;
    } else if (body.x > world.width - body.radius) {
      body.x = world.width - body.radius;
      if (vx > 0) {
        vx *= -bounce;
      }
      bounced = true;
    }

    if (body.y < body.radius) {
      body.y = body.radius;
      if (vy < 0) {
        vy *= -bounce;
      }
      bounced = true;
    } else if (body.y > world.height - body.radius) {
      body.y = world.height - body.radius;
      if (vy > 0) {
        vy *= -bounce;
      }
      bounced = true;
    }

    if (bounced) {
      body.px = body.x - vx;
      body.py = body.y - vy;
    }
  }

  function pushImpact(x, y, strength, tint) {
    impacts.push({
      x,
      y,
      radius: 14,
      width: 2.5 + strength * 0.015,
      growth: 6 + strength * 0.11,
      alpha: clamp(0.25 + strength * 0.01, 0.1, 0.95),
      tint: tint || "255, 216, 152"
    });

    if (impacts.length > 48) {
      impacts.shift();
    }

    lastImpactStrength = Math.max(lastImpactStrength, strength);
    cameraShake = Math.max(cameraShake, Math.min(26, strength * 0.064));
  }

  function spawnDebris(target, dirX, dirY, strength) {
    const baseAngle = Math.atan2(dirY, dirX);
    const pieceCount = Math.round(
      clamp(target.radius * 0.45 + strength * 0.045, 9, 28) * target.tier.debrisScale
    );

    for (let i = 0; i < pieceCount; i += 1) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.6;
      const angle = baseAngle + spread;
      const directionMix = random(0.45, 1.1);
      const speed = random(110, 260) + strength * directionMix;
      const piece = {
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: random(1.8, 5.2),
        life: random(0.34, 0.95),
        maxLife: 1,
        angle: random(0, Math.PI * 2),
        spin: random(-13, 13),
        hue: target.hue + random(-7, 7),
        saturation: target.saturation
      };
      debris.push(piece);
    }

    if (debris.length > 320) {
      debris.splice(0, debris.length - 320);
    }
  }

  function shatterTarget(target, impactX, impactY, dirX, dirY, strength) {
    if (target.broken) {
      return;
    }

    target.broken = true;
    shatteredCount += 1;
    pushImpact(
      impactX,
      impactY,
      strength * 1.25,
      target.tier.key === "explosive"
        ? "255, 145, 100"
        : target.tier.key === "metallic"
          ? "196, 218, 238"
          : "255, 216, 152"
    );
    pushImpact(
      target.x,
      target.y,
      strength * 0.92,
      target.tier.key === "armored" || target.tier.key === "metallic"
        ? "184, 215, 255"
        : "255, 216, 152"
    );
    spawnDebris(target, dirX, dirY, strength);
    playShatterSound(strength, target.tier.key);
    queueHitStop(strength, "shatter");

    if (target.tier.key === "explosive") {
      const blastRadius = target.radius * target.tier.blastRadiusScale + strength * 0.32;
      const blastPower = (0.42 + target.tier.blastPowerScale * 0.24) * strength;
      pushImpact(target.x, target.y, strength * 1.8, "255, 120, 82");
      pushImpact(target.x, target.y, strength * 1.35, "255, 174, 126");
      playExplosionSound(strength);

      for (let i = 0; i < targets.length; i += 1) {
        const other = targets[i];
        if (other === target || other.broken) {
          continue;
        }

        const dx = other.x - target.x;
        const dy = other.y - target.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const reach = blastRadius + other.radius;
        if (dist > reach) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const falloff = 1 - dist / reach;
        const push = blastPower * falloff * 0.024;
        const ovx = other.x - other.px;
        const ovy = other.y - other.py;

        other.px = other.x - (ovx + nx * push);
        other.py = other.y - (ovy + ny * push);
        other.flash = clamp(other.flash + falloff * 0.7, 0, 1);

        const blastStrength = 20 + strength * falloff * 0.92;
        applyTargetDamage(other, blastStrength, other.x, other.y, nx, ny, true);
      }
    }
  }

  function applyTargetDamage(target, strength, impactX, impactY, dirX, dirY, fromBlast) {
    if (target.broken) {
      return;
    }

    const explosiveHit = Boolean(fromBlast);
    const threshold = explosiveHit ? target.tier.threshold * 0.75 : target.tier.threshold;
    const effectiveStrength = Math.max(0, strength - threshold);
    if (effectiveStrength <= 0) {
      return;
    }

    const cooldownScale = target.hitCooldown > 0 ? (explosiveHit ? 0.66 : 0.34) : 1;
    const massScale = explosiveHit ? 0.96 : 0.7 + tuning.tipMass * 0.09;
    const damage = effectiveStrength * 0.16 * massScale * target.tier.damageScale * cooldownScale;

    if (damage <= 0) {
      return;
    }

    target.hp -= damage;
    target.flash = clamp(target.flash + damage / target.maxHp * 2.1, 0, 1);
    target.hitCooldown = explosiveHit ? 0.018 : 0.045;

    if (target.hp <= 0) {
      target.hp = 0;
      shatterTarget(target, impactX, impactY, dirX, dirY, strength);
    }
  }

  function circleCollision(a, b, restitution, friction) {
    if ((a.kind === "target" && a.broken) || (b.kind === "target" && b.broken)) {
      return;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist) {
      return;
    }

    let dist = Math.sqrt(distSq);
    let nx = 1;
    let ny = 0;
    if (dist > 1e-8) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      dist = minDist - 0.001;
    }

    const overlap = minDist - dist;
    const massSum = a.invMass + b.invMass;
    if (massSum === 0) {
      return;
    }

    if (a.invMass > 0) {
      const share = a.invMass / massSum;
      a.x -= nx * overlap * share;
      a.y -= ny * overlap * share;
    }
    if (b.invMass > 0) {
      const share = b.invMass / massSum;
      b.x += nx * overlap * share;
      b.y += ny * overlap * share;
    }

    let vax = a.x - a.px;
    let vay = a.y - a.py;
    let vbx = b.x - b.px;
    let vby = b.y - b.py;

    const rvx = vbx - vax;
    const rvy = vby - vay;
    const normalSpeed = rvx * nx + rvy * ny;

    if (normalSpeed < 0) {
      const impulse = (-(1 + restitution) * normalSpeed) / massSum;
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;

      if (a.invMass > 0) {
        vax -= impulseX * a.invMass;
        vay -= impulseY * a.invMass;
      }
      if (b.invMass > 0) {
        vbx += impulseX * b.invMass;
        vby += impulseY * b.invMass;
      }

      const txRaw = rvx - normalSpeed * nx;
      const tyRaw = rvy - normalSpeed * ny;
      const tangentLength = Math.hypot(txRaw, tyRaw);
      if (tangentLength > 1e-8) {
        const tx = txRaw / tangentLength;
        const ty = tyRaw / tangentLength;
        const tangentSpeed = rvx * tx + rvy * ty;
        const frictionImpulse = clamp(
          -tangentSpeed / massSum,
          -impulse * friction,
          impulse * friction
        );
        const fx = frictionImpulse * tx;
        const fy = frictionImpulse * ty;

        if (a.invMass > 0) {
          vax -= fx * a.invMass;
          vay -= fy * a.invMass;
        }
        if (b.invMass > 0) {
          vbx += fx * b.invMass;
          vby += fy * b.invMass;
        }
      }

      const tip = chain[chain.length - 1];
      const tipHitTarget =
        (a === tip && b.kind === "target") || (b === tip && a.kind === "target");

      if (tipHitTarget) {
        const strength = Math.abs(normalSpeed) * 24;
        const impactX = (a.x + b.x) * 0.5;
        const impactY = (a.y + b.y) * 0.5;
        const target = a.kind === "target" ? a : b;
        const impactTint =
          target.tier.key === "armored"
            ? "164, 206, 255"
            : target.tier.key === "metallic"
              ? "194, 214, 232"
            : target.tier.key === "explosive"
              ? "255, 150, 105"
              : "255, 216, 152";

        if (strength > 15) {
          pushImpact(impactX, impactY, strength, impactTint);
          playImpactSound(strength, target.tier.key);
        }

        const dirX = a.kind === "target" ? -nx : nx;
        const dirY = a.kind === "target" ? -ny : ny;
        applyChainRecoil(dirX, dirY, strength, target.tier.key);
        if (strength > 24) {
          queueHitStop(strength, "impact");
        }

        if (strength > 12) {
          applyTargetDamage(target, strength, impactX, impactY, dirX, dirY);
        }

        target.flash = clamp(target.flash + strength * 0.0035, 0, 1);
      }
    }

    a.px = a.x - vax;
    a.py = a.y - vay;
    b.px = b.x - vbx;
    b.py = b.y - vby;
  }

  function cleanupBrokenTargets() {
    for (let i = targets.length - 1; i >= 0; i -= 1) {
      if (targets[i].broken) {
        targets.splice(i, 1);
      }
    }
  }

  function updateDebris(dt) {
    const decay = Math.pow(0.964, dt * 60);

    for (let i = debris.length - 1; i >= 0; i -= 1) {
      const piece = debris[i];
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.vx *= decay;
      piece.vy *= decay;
      piece.angle += piece.spin * dt;
      piece.life -= dt;

      if (piece.x < piece.radius) {
        piece.x = piece.radius;
        if (piece.vx < 0) {
          piece.vx *= -0.35;
        }
      } else if (piece.x > world.width - piece.radius) {
        piece.x = world.width - piece.radius;
        if (piece.vx > 0) {
          piece.vx *= -0.35;
        }
      }

      if (piece.y < piece.radius) {
        piece.y = piece.radius;
        if (piece.vy < 0) {
          piece.vy *= -0.35;
        }
      } else if (piece.y > world.height - piece.radius) {
        piece.y = world.height - piece.radius;
        if (piece.vy > 0) {
          piece.vy *= -0.35;
        }
      }

      if (piece.life <= 0.01) {
        debris.splice(i, 1);
      }
    }
  }

  function physicsStep(dt) {
    updateHandle(dt);

    for (let i = 1; i < chain.length; i += 1) {
      integrateBody(chain[i]);
    }
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (target.broken) {
        continue;
      }
      integrateBody(target);
    }

    const handleStepX = handle.vx * dt;
    const handleStepY = handle.vy * dt;

    chain[0].x = handle.x;
    chain[0].y = handle.y;
    chain[0].px = handle.x - handleStepX;
    chain[0].py = handle.y - handleStepY;

    const chainStiffness = tuning.stiffness;
    const bendStiffness = clamp(0.13 + tuning.stiffness * 0.13, 0.17, 0.35);

    for (let iter = 0; iter < SOLVER_ITERATIONS; iter += 1) {
      chain[0].x = handle.x;
      chain[0].y = handle.y;
      chain[0].px = handle.x - handleStepX;
      chain[0].py = handle.y - handleStepY;

      for (let i = 0; i < chain.length - 1; i += 1) {
        constrainDistance(chain[i], chain[i + 1], LINK_LENGTH, chainStiffness);
      }
      for (let i = 0; i < chain.length - 2; i += 1) {
        constrainDistance(chain[i], chain[i + 2], LINK_LENGTH * 2, bendStiffness);
      }

      for (let i = 1; i < chain.length; i += 1) {
        const link = chain[i];
        for (let j = i + 2; j < chain.length; j += 1) {
          circleCollision(link, chain[j], 0.08, 0.09);
        }
      }

      for (let i = 1; i < chain.length; i += 1) {
        const link = chain[i];
        for (let j = 0; j < targets.length; j += 1) {
          if (targets[j].broken) {
            continue;
          }
          circleCollision(link, targets[j], 0.31, 0.28);
        }
      }

      for (let i = 0; i < targets.length; i += 1) {
        if (targets[i].broken) {
          continue;
        }
        for (let j = i + 1; j < targets.length; j += 1) {
          if (targets[j].broken) {
            continue;
          }
          circleCollision(targets[i], targets[j], 0.12, 0.34);
        }
      }

      for (let i = 1; i < chain.length; i += 1) {
        solveBounds(chain[i], 0.38);
      }
      for (let i = 0; i < targets.length; i += 1) {
        if (targets[i].broken) {
          continue;
        }
        solveBounds(targets[i], 0.35);
      }
    }

    const tip = chain[chain.length - 1];
    const tipVx = tip.x - tip.px;
    const tipVy = tip.y - tip.py;
    tipSpin += Math.hypot(tipVx, tipVy) * 0.025;

    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i];
      if (t.broken) {
        continue;
      }
      const speed = Math.hypot(t.x - t.px, t.y - t.py);
      t.lift += (speed * 0.26 - t.lift) * 0.14;
      t.lift *= 0.92;
      t.flash *= 0.9;
      t.hitCooldown = Math.max(0, t.hitCooldown - dt);
    }

    cleanupBrokenTargets();
    updateDebris(dt);

    lastImpactStrength *= 0.94;
    cameraShake *= 0.87;
  }

  function drawBackground(time) {
    const w = world.width;
    const h = world.height;
    const theme = activeTheme;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.bgTop);
    sky.addColorStop(0.55, theme.bgMid);
    sky.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const pulse = 0.12 + 0.1 * Math.sin(time * 1.45);
    const pointerGlow = ctx.createRadialGradient(
      pointer.x,
      pointer.y,
      30,
      pointer.x,
      pointer.y,
      260
    );
    pointerGlow.addColorStop(0, `rgba(${theme.pointerGlow}, ${0.3 + pulse})`);
    pointerGlow.addColorStop(0.5, `rgba(${theme.pointerHalo}, ${0.12 + pulse * 0.3})`);
    pointerGlow.addColorStop(1, "rgba(8, 14, 21, 0)");
    ctx.fillStyle = pointerGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = `rgba(${theme.grid}, 0.075)`;
    ctx.lineWidth = 1;
    const step = 56;
    ctx.beginPath();
    for (let x = (time * 14) % step; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = ((time * 10) % step) * 0.6; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  function drawTarget(target) {
    const tier = target.tier;
    const shadowOffset = 8 + target.lift * 0.45;

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(
      target.x + shadowOffset,
      target.y + shadowOffset * 0.8,
      target.radius * 1.03,
      target.radius * 0.78,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const hpRatio = clamp(target.hp / target.maxHp, 0, 1);
    const damageRatio = 1 - hpRatio;
    const glow = target.flash * 12;
    const saturation = target.saturation;

    const body = ctx.createRadialGradient(
      target.x - target.radius * 0.35,
      target.y - target.radius * 0.45,
      target.radius * 0.2,
      target.x,
      target.y,
      target.radius * 1.15
    );
    body.addColorStop(0, `hsl(${target.hue} ${saturation}% ${58 + glow}%)`);
    body.addColorStop(
      0.65,
      `hsl(${target.hue} ${Math.max(22, saturation - 22)}% ${34 + glow * 0.38 - damageRatio * 6}%)`
    );
    body.addColorStop(1, `hsl(${target.hue} ${Math.max(18, saturation - 34)}% ${18 - damageRatio * 3}%)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    if (damageRatio > 0.08) {
      const cracks = Math.floor(2 + damageRatio * target.crackAngles.length);
      ctx.strokeStyle = `rgba(52, 32, 18, ${0.25 + damageRatio * 0.55})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < cracks; i += 1) {
        const angle = target.crackAngles[i % target.crackAngles.length] + target.crackBias;
        const branch = 0.26 + (i % 4) * 0.16 + damageRatio * 0.24;
        const x1 = target.x + Math.cos(angle) * target.radius * 0.18;
        const y1 = target.y + Math.sin(angle) * target.radius * 0.18;
        const x2 = target.x + Math.cos(angle + Math.sin(i + damageRatio)) * target.radius * branch;
        const y2 = target.y + Math.sin(angle + Math.cos(i + damageRatio)) * target.radius * branch;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    let rim = "rgba(255, 230, 188, 0.48)";
    if (tier.key === "armored") {
      rim = "rgba(196, 225, 255, 0.58)";
    } else if (tier.key === "metallic") {
      rim = "rgba(214, 229, 244, 0.62)";
    } else if (tier.key === "explosive") {
      rim = "rgba(255, 198, 144, 0.64)";
    }
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();

    if (tier.key === "armored") {
      ctx.strokeStyle = `rgba(182, 207, 235, ${0.28 + hpRatio * 0.38})`;
      ctx.lineWidth = 1.15;
      for (let i = 0; i < 3; i += 1) {
        const phase = i * (Math.PI / 3) + target.crackBias;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius * (0.56 + i * 0.14), phase, phase + Math.PI * 0.9);
        ctx.stroke();
      }
    } else if (tier.key === "metallic") {
      ctx.strokeStyle = `rgba(188, 210, 232, ${0.34 + hpRatio * 0.36})`;
      ctx.lineWidth = 1.05;
      for (let i = 0; i < 4; i += 1) {
        const angle = i * (Math.PI / 2) + target.crackBias * 0.35;
        const x1 = target.x + Math.cos(angle) * target.radius * 0.28;
        const y1 = target.y + Math.sin(angle) * target.radius * 0.28;
        const x2 = target.x + Math.cos(angle) * target.radius * 0.82;
        const y2 = target.y + Math.sin(angle) * target.radius * 0.82;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(220, 235, 252, ${0.25 + hpRatio * 0.22})`;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.52, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tier.key === "explosive") {
      const pulse = 0.3 + Math.sin(performance.now() * 0.012 + target.crackBias) * 0.12;
      ctx.fillStyle = `rgba(255, 136, 86, ${0.5 + pulse})`;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 225, 178, ${0.45 + pulse * 0.4})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (damageRatio > 0.03) {
      const ringColor =
        tier.key === "armored"
          ? `rgba(122, 194, 255, ${0.25 + damageRatio * 0.45})`
          : tier.key === "metallic"
            ? `rgba(192, 217, 241, ${0.28 + damageRatio * 0.42})`
          : tier.key === "explosive"
            ? `rgba(255, 96, 72, ${0.29 + damageRatio * 0.45})`
            : `rgba(255, 123, 90, ${0.25 + damageRatio * 0.45})`;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 1.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * damageRatio);
      ctx.stroke();
    }
  }

  function drawDebris() {
    for (let i = 0; i < debris.length; i += 1) {
      const piece = debris[i];
      const alpha = clamp(piece.life / piece.maxLife, 0, 1);

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.angle);
      ctx.fillStyle = `hsla(${piece.hue} ${piece.saturation}% 58% / ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, piece.radius, piece.radius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawChain() {
    const theme = activeTheme;
    const shadowOffsetX = 7;
    const shadowOffsetY = 6;

    for (let i = 0; i < chain.length - 1; i += 1) {
      const a = chain[i];
      const b = chain[i + 1];
      ctx.strokeStyle = `rgba(${theme.chainShadow}, 0.36)`;
      ctx.lineWidth = Math.min(a.radius, b.radius) * 1.26;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x + shadowOffsetX, a.y + shadowOffsetY);
      ctx.lineTo(b.x + shadowOffsetX, b.y + shadowOffsetY);
      ctx.stroke();
    }

    for (let i = 0; i < chain.length - 1; i += 1) {
      const a = chain[i];
      const b = chain[i + 1];
      const steel = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      steel.addColorStop(0, theme.chainA);
      steel.addColorStop(0.52, theme.chainB);
      steel.addColorStop(1, theme.chainC);
      ctx.strokeStyle = steel;
      ctx.lineWidth = Math.min(a.radius, b.radius) * 1.18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (let i = chain.length - 2; i >= 0; i -= 1) {
      const link = chain[i];

      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(
        link.x + shadowOffsetX * 0.9,
        link.y + shadowOffsetY * 0.84,
        link.radius * 1.03,
        link.radius * 0.8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const gradient = ctx.createRadialGradient(
        link.x - link.radius * 0.25,
        link.y - link.radius * 0.35,
        link.radius * 0.1,
        link.x,
        link.y,
        link.radius * 1.1
      );
      gradient.addColorStop(0, theme.chainA);
      gradient.addColorStop(0.57, theme.chainB);
      gradient.addColorStop(1, theme.chainC);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(link.x, link.y, link.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const tip = chain[chain.length - 1];
    const shadow = 9;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(
      tip.x + shadow,
      tip.y + shadow * 0.85,
      tip.radius * 1.3,
      tip.radius * 1.02,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(tipSpin * 0.03);

    ctx.strokeStyle = `rgba(${theme.tipSpike}, 0.92)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x * tip.radius * 0.6, y * tip.radius * 0.6);
      ctx.lineTo(x * tip.radius * 1.45, y * tip.radius * 1.45);
      ctx.stroke();
    }

    const tipBody = ctx.createRadialGradient(
      -tip.radius * 0.35,
      -tip.radius * 0.4,
      tip.radius * 0.12,
      0,
      0,
      tip.radius * 1.2
    );
    tipBody.addColorStop(0, theme.tipCore);
    tipBody.addColorStop(0.6, theme.tipCoreMid);
    tipBody.addColorStop(1, theme.tipCoreEdge);

    ctx.fillStyle = tipBody;
    ctx.beginPath();
    ctx.arc(0, 0, tip.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawImpacts(frameScale) {
    for (let i = impacts.length - 1; i >= 0; i -= 1) {
      const impact = impacts[i];
      impact.radius += impact.growth * frameScale;
      impact.alpha *= Math.pow(0.93, frameScale);
      if (impact.alpha < 0.03) {
        impacts.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = `rgba(${impact.tint}, ${impact.alpha})`;
      ctx.lineWidth = impact.width;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, impact.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function render(time, frameScale) {
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    ctx.clearRect(0, 0, world.width, world.height);

    const shakeX = (Math.random() - 0.5) * cameraShake;
    const shakeY = (Math.random() - 0.5) * cameraShake;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground(time);

    for (let i = 0; i < targets.length; i += 1) {
      drawTarget(targets[i]);
    }

    drawDebris();
    drawImpacts(frameScale);
    drawChain();
    ctx.restore();

    const tip = chain[chain.length - 1];
    const tipSpeed = Math.hypot(tip.x - tip.px, tip.y - tip.py) * 58;
    tipSpeedEl.textContent = tipSpeed.toFixed(0);
    impactEl.textContent = (lastImpactStrength * 0.5).toFixed(0);
    targetCountEl.textContent = String(targets.length);
    shatteredCountEl.textContent = String(shatteredCount);
  }

  function frame(nowMs) {
    const now = nowMs * 0.001;
    const delta = Math.min(now - previousTime, 0.033);
    previousTime = now;

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - delta);
      render(now, delta * 60);
      requestAnimationFrame(frame);
      return;
    }

    accumulator += delta;
    while (accumulator >= FIXED_DT) {
      physicsStep(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    render(now, delta * 60);
    requestAnimationFrame(frame);
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now() * 0.001;
    const nextX = clamp(event.clientX - rect.left, 0, world.width);
    const nextY = clamp(event.clientY - rect.top, 0, world.height);
    const dt = clamp(now - pointer.sampleTime, 1 / 240, 0.05);
    const prevVx = pointer.vx;
    const prevVy = pointer.vy;
    let vx = (nextX - pointer.x) / dt;
    let vy = (nextY - pointer.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed > 3200) {
      const scale = 3200 / speed;
      vx *= scale;
      vy *= scale;
    }

    const prevSpeed = Math.hypot(prevVx, prevVy);
    if (prevSpeed > 260 && speed > 300) {
      const dot = (prevVx * vx + prevVy * vy) / (prevSpeed * speed);
      if (dot < 0.42) {
        const severity = clamp((0.42 - dot) * 0.75, 0, 0.5);
        const toTargetX = nextX - handle.x;
        const toTargetY = nextY - handle.y;
        const toTargetLength = Math.hypot(toTargetX, toTargetY) || 1;
        pointer.turnDirX = toTargetX / toTargetLength;
        pointer.turnDirY = toTargetY / toTargetLength;
        pointer.turnSnap = Math.max(pointer.turnSnap, severity);
      }
    }

    pointer.x = nextX;
    pointer.y = nextY;
    pointer.vx = vx;
    pointer.vy = vy;
    pointer.sampleTime = now;
  }

  function adjustLinkCount(delta) {
    const next = clamp(tuning.linkCount + delta, limits.linkCountMin, limits.linkCountMax);
    if (next === tuning.linkCount) {
      return;
    }
    tuning.linkCount = next;
    rebuildChain();
    updateTuningHud();
    triggerTuningFlash();
  }

  function adjustTipMass(delta) {
    const next = clamp(
      Math.round((tuning.tipMass + delta) * 10) / 10,
      limits.tipMassMin,
      limits.tipMassMax
    );
    if (next === tuning.tipMass) {
      return;
    }
    tuning.tipMass = next;
    applyTipMass();
    updateTuningHud();
    triggerTuningFlash();
  }

  function adjustStiffness(delta) {
    const next = clamp(
      Math.round((tuning.stiffness + delta) * 100) / 100,
      limits.stiffnessMin,
      limits.stiffnessMax
    );
    if (next === tuning.stiffness) {
      return;
    }
    tuning.stiffness = next;
    updateTuningHud();
    triggerTuningFlash();
  }

  function adjustGrip(delta) {
    const next = clamp(
      Math.round((tuning.grip + delta) * 100) / 100,
      limits.gripMin,
      limits.gripMax
    );
    if (next === tuning.grip) {
      return;
    }
    tuning.grip = next;
    updateTuningHud();
    triggerTuningFlash();
  }

  window.addEventListener("resize", resize);
  window.addEventListener(
    "pointermove",
    (event) => {
      updatePointerFromEvent(event);
    },
    { passive: true }
  );
  window.addEventListener("pointerdown", (event) => {
    updatePointerFromEvent(event);
    ensureAudio();
  });

  window.addEventListener("keydown", (event) => {
    ensureAudio();
    if (event.code === "Space") {
      event.preventDefault();
      spawnTargets(4);
      return;
    }
    if (event.code === "KeyR") {
      resetArena();
      return;
    }
    if (event.code === "KeyQ") {
      adjustLinkCount(1);
      return;
    }
    if (event.code === "KeyA") {
      adjustLinkCount(-1);
      return;
    }
    if (event.code === "KeyW") {
      adjustTipMass(0.5);
      return;
    }
    if (event.code === "KeyS") {
      adjustTipMass(-0.5);
      return;
    }
    if (event.code === "KeyE") {
      adjustStiffness(0.04);
      return;
    }
    if (event.code === "KeyD") {
      adjustStiffness(-0.04);
      return;
    }
    if (event.code === "KeyF") {
      adjustGrip(0.04);
      return;
    }
    if (event.code === "KeyG") {
      adjustGrip(-0.04);
      return;
    }
    if (event.code === "KeyT") {
      cycleTheme();
      return;
    }
    if (event.code === "Digit1") {
      applyTheme("impact");
      return;
    }
    if (event.code === "Digit2") {
      applyTheme("pinball");
      return;
    }
    if (event.code === "KeyM") {
      toggleMute();
      return;
    }
  });

  if (tuningReadoutEl) {
    tuningReadoutEl.addEventListener("animationend", () => {
      tuningReadoutEl.classList.remove("flash");
    });
  }

  applyTheme("impact");
  updateAudioHud();
  initializeChain();
  resetArena();
  resize();
  requestAnimationFrame(frame);
})();
