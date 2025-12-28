(() => {
  "use strict";

  const MATERIALS = {
    glass: {
      breakThreshold: 2.6,
      stressLimit: 3.6,
      crackStages: [0.4, 0.7],
      color: 0x9ad4ff,
      crackColor: 0x6aa4d8,
      shardCount: 6,
      density: 0.6,
      restitution: 0.05,
      stressScale: 0.9,
    },
    wood: {
      breakThreshold: 4.2,
      stressLimit: 6.8,
      crackStages: [0.5, 0.8],
      color: 0xc08a5b,
      crackColor: 0x9a6d44,
      shardCount: 4,
      density: 0.9,
      restitution: 0.1,
      stressScale: 0.75,
    },
    stone: {
      breakThreshold: 7.5,
      stressLimit: 10.5,
      crackStages: [0.6, 0.85],
      color: 0x8f96a4,
      crackColor: 0x6f757f,
      shardCount: 3,
      density: 1.4,
      restitution: 0.05,
      stressScale: 0.6,
    },
    metal: {
      breakThreshold: 9.0,
      stressLimit: 13.0,
      crackStages: [0.7, 0.9],
      color: 0x9aa6b4,
      crackColor: 0x6b7b87,
      shardCount: 2,
      density: 1.6,
      restitution: 0.03,
      stressScale: 0.55,
    },
    rubber: {
      breakThreshold: 6.0,
      stressLimit: 16.0,
      crackStages: [0.7, 0.9],
      color: 0x3abf87,
      crackColor: 0x2f8f67,
      shardCount: 1,
      density: 1.0,
      restitution: 0.9,
      stressScale: 0.35,
    },
  };

  const HEAD_TYPES = {
    ball: {
      name: "Wrecking Ball",
      texture: "head-ball",
      shape: "circle",
      radius: 20,
      massMultiplier: 1.6,
      damageMultiplier: 1.1,
      jointMultiplier: 1.2,
      trailColor: 0xffd479,
    },
    spike: {
      name: "Spike",
      texture: "head-spike",
      shape: "polygon",
      radius: 18,
      sides: 3,
      massMultiplier: 0.8,
      damageMultiplier: 1.5,
      jointMultiplier: 1.1,
      trailColor: 0x8fffb1,
    },
    hammer: {
      name: "Hammer",
      texture: "head-hammer",
      shape: "rectangle",
      width: 34,
      height: 22,
      massMultiplier: 1.2,
      damageMultiplier: 1.2,
      jointMultiplier: 1.6,
      trailColor: 0xff7b7b,
    },
  };

  const CHAIN_LIMITS = { minLength: 140, maxLength: 380 };

  const LEVELS = [
    {
      name: "Tower Start",
      objective: { label: "Destroy all targets", mode: "marked" },
      build(scene) {
        addGround(scene);
        addStack(scene, 720, 420, 3, 4, 40, 40, "wood", [0, 2, 5, 8], true);
        addStack(scene, 640, 420, 2, 3, 34, 34, "glass", [1, 3], false);
        addTargetPlatform(scene, 520, 320);
      },
    },
    {
      name: "Suspended Punch",
      objective: { label: "Destroy all targets in 4 swings", mode: "marked", maxSwings: 4 },
      build(scene) {
        addGround(scene);
        addSuspendedWeight(scene, 620, 140, 620, 280, "stone", true);
        addStack(scene, 480, 430, 3, 2, 46, 36, "glass", [0, 3], true);
        addStack(scene, 760, 430, 3, 2, 46, 36, "wood", [1, 4], true);
      },
    },
    {
      name: "Domino Line",
      objective: { label: "Destroy all targets in 18s", mode: "marked", timeLimitMs: 18000 },
      build(scene) {
        addGround(scene);
        addDominoLine(scene, 220, 420, 12, 32, "wood", [10, 11]);
        addTargetPlatform(scene, 860, 360);
      },
    },
    {
      name: "Shielded Angle",
      objective: {
        label: "Destroy targets with <=2 collateral",
        mode: "marked",
        collateralLimit: 2,
      },
      build(scene) {
        addGround(scene);
        addShield(scene, 620, 300);
        createTarget(scene, 720, 320, 36, 36, "glass");
        createTarget(scene, 770, 360, 32, 32, "glass");
        addStack(scene, 560, 430, 2, 2, 30, 30, "wood", [], false);
      },
    },
    {
      name: "Tight Corridor",
      objective: { label: "Destroy all targets", mode: "marked" },
      build(scene) {
        addGround(scene);
        addCorridor(scene, 580, 360);
        createTarget(scene, 700, 400, 36, 36, "wood");
        createTarget(scene, 740, 400, 36, 36, "wood");
      },
    },
    {
      name: "Glass House",
      objective: { label: "Destroy everything", mode: "all" },
      build(scene) {
        addGround(scene);
        addStack(scene, 700, 420, 4, 3, 36, 36, "glass", [3, 6, 8], true);
        createTarget(scene, 600, 380, 34, 34, "glass");
      },
    },
    {
      name: "Rubber Trouble",
      objective: { label: "Destroy all targets in 3 swings", mode: "marked", maxSwings: 3 },
      build(scene) {
        addGround(scene);
        addStack(scene, 700, 420, 3, 3, 44, 36, "rubber", [2, 4], true);
        createTarget(scene, 520, 420, 40, 40, "wood");
      },
    },
    {
      name: "Mixed Joints",
      objective: { label: "Destroy all targets in 20s", mode: "marked", timeLimitMs: 20000 },
      build(scene) {
        addGround(scene);
        addJointedRig(scene, 600, 220, 520, 280, "wood", true);
        addJointedRig(scene, 740, 220, 820, 280, "glass", true);
        createTarget(scene, 680, 420, 40, 40, "stone");
      },
    },
    {
      name: "Twin Towers",
      objective: {
        label: "Destroy targets with <=3 collateral",
        mode: "marked",
        collateralLimit: 3,
      },
      build(scene) {
        addGround(scene);
        addStack(scene, 520, 420, 2, 5, 38, 38, "wood", [1, 5, 7], true);
        addStack(scene, 780, 420, 2, 5, 38, 38, "stone", [2, 6, 8], true);
        addShield(scene, 650, 360);
      },
    },
    {
      name: "Pendulum Finish",
      objective: { label: "Destroy all targets", mode: "marked" },
      build(scene) {
        addGround(scene);
        addSuspendedWeight(scene, 520, 140, 560, 280, "metal", false);
        addSuspendedWeight(scene, 760, 140, 720, 280, "metal", false);
        createTarget(scene, 640, 400, 46, 46, "wood");
        createTarget(scene, 700, 360, 36, 36, "glass");
      },
    },
    {
      name: "Bridge Drop",
      objective: { label: "Destroy all targets in 5 swings", mode: "marked", maxSwings: 5 },
      build(scene) {
        addGround(scene);
        addBridge(scene, 640, 300);
        addSuspendedWeight(scene, 640, 120, 640, 220, "stone", false);
        addStack(scene, 520, 430, 2, 2, 36, 36, "glass", [0, 2], true);
        addStack(scene, 760, 430, 2, 2, 36, 36, "wood", [1, 3], true);
      },
    },
    {
      name: "Seesaw Switch",
      objective: { label: "Destroy all targets in 5 swings", mode: "marked", maxSwings: 5 },
      build(scene) {
        addGround(scene);
        addSeesaw(scene, 560, 360);
        createTarget(scene, 460, 320, 30, 30, "glass");
        createTarget(scene, 660, 320, 30, 30, "glass");
        addStack(scene, 780, 430, 2, 3, 32, 32, "wood", [1, 4], true);
      },
    },
    {
      name: "Hanging Alley",
      objective: { label: "Destroy all targets in 16s", mode: "marked", timeLimitMs: 16000 },
      build(scene) {
        addGround(scene);
        addHangingRow(scene, 320, 140, 3, 120, "glass", [1]);
        addHangingRow(scene, 680, 140, 3, 120, "wood", [0, 2]);
        addCorridor(scene, 520, 340);
      },
    },
    {
      name: "Cage Crash",
      objective: { label: "Destroy everything", mode: "all" },
      build(scene) {
        addGround(scene);
        addCage(scene, 680, 340, 200, 140, "wood");
        addStack(scene, 520, 430, 2, 2, 36, 36, "glass", [0, 2], true);
      },
    },
  ];

  const MatterBody = Phaser.Physics.Matter.Matter.Body;

  class ChainController {
    constructor(scene) {
      this.scene = scene;
      this.active = false;
      this.handle = null;
      this.head = null;
      this.segments = [];
      this.constraints = [];
      this.handleConstraint = null;
      this.profile = null;
      this.chainGroup = this.scene.matter.world.nextGroup(true);
      this.headSpec = HEAD_TYPES.ball;
    }

    updateProfile(profile, rebuildIfActive) {
      const shouldRebuild =
        this.profile &&
        (this.profile.length !== profile.length ||
          this.profile.segmentCount !== profile.segmentCount ||
          this.profile.headMass !== profile.headMass ||
          this.profile.headSpec !== profile.headSpec);
      this.profile = profile;
      this.headSpec = profile.headSpec || HEAD_TYPES.ball;
      if (this.active) {
        if (this.handleConstraint) {
          this.handleConstraint.stiffness = profile.handleStiffness;
        }
        if (this.handle) {
          this.handle.setFrictionAir(profile.handleDamping);
        }
        if (this.head) {
          MatterBody.setMass(this.head.body, profile.headMass);
          this.head.setFrictionAir(profile.drag);
        }
        if (rebuildIfActive && shouldRebuild) {
          this.respawnAtPointer();
        }
      }
    }

    respawnAtPointer() {
      const pointer = this.scene.input.activePointer;
      if (!pointer) {
        return;
      }
      this.stop();
      this.start(pointer);
    }

    start(pointer) {
      if (this.active || !this.profile) {
        return;
      }
      this.active = true;
      const startX = pointer.worldX;
      const startY = pointer.worldY;

      this.handle = this.scene.add.image(startX, startY, "handle");
      this.handle.setDisplaySize(24, 24);
      this.scene.matter.add.gameObject(this.handle, {
        shape: { type: "circle", radius: 12 },
        collisionFilter: { group: this.chainGroup },
      });
      this.handle.setFrictionAir(this.profile.handleDamping);
      this.handle.setIgnoreGravity(true);

      this.handleConstraint = this.scene.matter.add.constraint(
        this.handle.body,
        null,
        0,
        this.profile.handleStiffness
      );
      this.handleConstraint.pointB = { x: startX, y: startY };

      const segmentLength = this.profile.length / this.profile.segmentCount;
      const segmentWidth = 10;
      let previousBody = this.handle.body;

      for (let i = 0; i < this.profile.segmentCount; i += 1) {
        const segY = startY + (i + 1) * segmentLength;
        const segment = this.scene.add.image(startX, segY, "chain-link");
        segment.setDisplaySize(segmentWidth, segmentLength);
        this.scene.matter.add.gameObject(segment, {
          shape: { type: "rectangle", width: segmentWidth, height: segmentLength },
          collisionFilter: { group: this.chainGroup },
        });
        segment.setFrictionAir(this.profile.drag);
        segment.setDensity(0.4);
        segment.setBounce(0.05);

        const constraint = this.scene.matter.add.constraint(
          previousBody,
          segment.body,
          segmentLength,
          0.9
        );
        this.constraints.push(constraint);
        this.segments.push(segment);
        previousBody = segment.body;
      }

      const headSpec = this.profile.headSpec || HEAD_TYPES.ball;
      this.headSpec = headSpec;
      const headOffset = headSpec.shape === "rectangle" ? headSpec.height / 2 : headSpec.radius;
      this.head = this.scene.add.image(
        startX,
        startY + this.profile.length + headOffset,
        headSpec.texture
      );
      if (headSpec.shape === "rectangle") {
        this.head.setDisplaySize(headSpec.width, headSpec.height);
      } else {
        this.head.setDisplaySize(headSpec.radius * 2, headSpec.radius * 2);
      }
      const headShape =
        headSpec.shape === "polygon"
          ? { type: "polygon", sides: headSpec.sides || 3, radius: headSpec.radius }
          : headSpec.shape === "rectangle"
            ? { type: "rectangle", width: headSpec.width, height: headSpec.height }
            : { type: "circle", radius: headSpec.radius };
      this.scene.matter.add.gameObject(this.head, {
        shape: headShape,
        collisionFilter: { group: this.chainGroup },
      });
      this.head.setFrictionAir(this.profile.drag);
      this.head.setBounce(0.1);
      MatterBody.setMass(this.head.body, this.profile.headMass);

      const headConstraint = this.scene.matter.add.constraint(
        previousBody,
        this.head.body,
        segmentLength,
        0.9
      );
      this.constraints.push(headConstraint);
    }

    stop() {
      if (!this.active) {
        return;
      }
      this.active = false;

      this.constraints.forEach((constraint) => {
        this.scene.matter.world.remove(constraint);
      });
      this.constraints = [];

      if (this.handleConstraint) {
        this.scene.matter.world.remove(this.handleConstraint);
        this.handleConstraint = null;
      }

      this.segments.forEach((segment) => segment.destroy());
      this.segments = [];

      if (this.head) {
        this.head.destroy();
        this.head = null;
      }

      if (this.handle) {
        this.handle.destroy();
        this.handle = null;
      }
    }

    update(pointer) {
      if (!this.active || !this.handleConstraint || !pointer) {
        return;
      }
      this.handleConstraint.pointB.x = pointer.worldX;
      this.handleConstraint.pointB.y = pointer.worldY;
    }

    getTension(pointer) {
      if (!this.active || !this.handle || !pointer) {
        return 0;
      }
      const dx = this.handle.body.position.x - pointer.worldX;
      const dy = this.handle.body.position.y - pointer.worldY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    getHeadSpeed() {
      if (!this.head) {
        return 0;
      }
      const { x, y } = this.head.body.velocity;
      return Math.sqrt(x * x + y * y);
    }

    getHeadSpec() {
      return this.headSpec || HEAD_TYPES.ball;
    }

    isHeadBody(body) {
      return Boolean(this.head && body && this.head.body && this.head.body.id === body.id);
    }

    getDamageMultiplier(sourceBody) {
      if (this.isHeadBody(sourceBody)) {
        return this.getHeadSpec().damageMultiplier || 1;
      }
      return 1;
    }

    getJointMultiplier(sourceBody) {
      if (this.isHeadBody(sourceBody)) {
        return this.getHeadSpec().jointMultiplier || 1;
      }
      return 1;
    }
  }

  class MainScene extends Phaser.Scene {
    constructor() {
      super({ key: "main" });
      this.levelIndex = 0;
      this.targetsRemaining = 0;
      this.breakables = new Map();
      this.joints = [];
      this.jointsByBody = new Map();
      this.levelObjects = [];
      this.levelConstraints = [];
      this.debris = [];
      this.chainController = null;
      this.tuning = null;
      this.objective = null;
      this.levelOver = false;
      this.targetsTotal = 0;
      this.swingCount = 0;
      this.collateralBreaks = 0;
      this.elapsedTimeMs = 0;
      this.bestImpact = 0;
      this.failureReason = "";
      this.headType = "ball";
      this.pinch = { active: false, startDistance: 0, startLength: 0 };
      this.resultsElements = null;
      this.background = null;
      this.trailEmitter = null;
      this.breakScale = 1.0;
      this.fixedStep = { dt: 1000 / 60, accumulator: 0 };
      this.timeScale = 1;
      this.timeScaleTarget = 1;
      this.lastImpact = 0;
      this.lastImpactTimer = 0;
      this.pointerIndicator = null;
      this.shardEmitter = null;
      this.audioContext = null;
      this.noiseBuffer = null;
    }

    create() {
      this.createTextures();
      this.createBackground();
      this.chainController = new ChainController(this);
      this.tuning = setupTuningPanel(() => this.applyTuning());
      this.resultsElements = getResultsElements();
      this.applyTuning();

      this.matter.world.setBounds(0, 0, 960, 540, 64, true, true, true, true);
      this.matter.world.autoUpdate = false;
      this.matter.world.engine.timing.timeScale = 1;

      this.pointerIndicator = this.add.circle(0, 0, 6, 0xff7b7b, 0.9);
      this.pointerIndicator.setDepth(10);

      this.setupParticles();
      this.setupInput();
      this.setupUI();
      this.loadLevel(loadSavedLevelIndex());
      this.updateHUD();

      this.matter.world.on("collisionstart", (event) => {
        this.routeCollisions(event, 1);
      });
      this.matter.world.on("collisionactive", (event) => {
        this.routeCollisions(event, 0.35);
      });
    }

    createTextures() {
      if (!this.textures.exists("chain-link")) {
        const link = this.add.graphics();
        link.fillStyle(0x8f96a4, 1);
        link.fillRoundedRect(0, 0, 12, 28, 4);
        link.fillStyle(0xd9dbe5, 0.8);
        link.fillRoundedRect(2, 4, 8, 20, 3);
        link.generateTexture("chain-link", 12, 28);
        link.destroy();
      }

      if (!this.textures.exists("handle")) {
        const handle = this.add.graphics();
        handle.fillStyle(0x8fffb1, 1);
        handle.fillCircle(12, 12, 12);
        handle.lineStyle(2, 0x1d3425, 0.7);
        handle.strokeCircle(12, 12, 10);
        handle.generateTexture("handle", 24, 24);
        handle.destroy();
      }

      if (!this.textures.exists("head-ball")) {
        const ball = this.add.graphics();
        ball.fillStyle(0xffdf7e, 1);
        ball.fillCircle(20, 20, 20);
        ball.fillStyle(0xffffff, 0.3);
        ball.fillCircle(14, 14, 9);
        ball.generateTexture("head-ball", 40, 40);
        ball.destroy();
      }

      if (!this.textures.exists("head-spike")) {
        const spike = this.add.graphics();
        spike.fillStyle(0x8fffb1, 1);
        spike.fillTriangle(18, 2, 34, 34, 2, 34);
        spike.lineStyle(2, 0x1d3425, 0.6);
        spike.strokeTriangle(18, 2, 34, 34, 2, 34);
        spike.generateTexture("head-spike", 36, 36);
        spike.destroy();
      }

      if (!this.textures.exists("head-hammer")) {
        const hammer = this.add.graphics();
        hammer.fillStyle(0xff7b7b, 1);
        hammer.fillRoundedRect(0, 4, 34, 18, 4);
        hammer.fillStyle(0x1f2837, 0.8);
        hammer.fillRect(12, 0, 10, 26);
        hammer.generateTexture("head-hammer", 34, 26);
        hammer.destroy();
      }

      if (!this.textures.exists("bg-grid")) {
        const grid = this.add.graphics();
        grid.fillStyle(0x0c101b, 1);
        grid.fillRect(0, 0, 64, 64);
        grid.lineStyle(1, 0x1a2233, 0.8);
        grid.strokeRect(0, 0, 64, 64);
        grid.lineStyle(1, 0x141b2a, 0.6);
        grid.strokeLineShape(new Phaser.Geom.Line(0, 32, 64, 32));
        grid.strokeLineShape(new Phaser.Geom.Line(32, 0, 32, 64));
        grid.generateTexture("bg-grid", 64, 64);
        grid.destroy();
      }
    }

    createBackground() {
      if (this.background) {
        this.background.destroy();
      }
      this.background = this.add.tileSprite(0, 0, 960, 540, "bg-grid");
      this.background.setOrigin(0, 0);
      this.background.setDepth(-5);
      this.background.setScrollFactor(0);
    }

    setupParticles() {
      if (!this.textures.exists("dot")) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture("dot", 8, 8);
        gfx.destroy();
      }

      const particles = this.add.particles("dot");
      particles.setDepth(5);
      this.shardEmitter = particles.createEmitter({
        speed: { min: 40, max: 220 },
        lifespan: { min: 200, max: 600 },
        scale: { start: 0.8, end: 0 },
        quantity: 0,
        on: false,
      });

      this.trailEmitter = particles.createEmitter({
        speed: { min: 10, max: 60 },
        lifespan: { min: 240, max: 420 },
        scale: { start: 0.6, end: 0 },
        frequency: 40,
        alpha: { start: 0.6, end: 0 },
        on: false,
      });
    }

    setupInput() {
      this.input.addPointer(1);
      this.input.on("pointerdown", (pointer) => {
        if (this.levelOver) {
          return;
        }
        if (pointer.id !== 0) {
          return;
        }
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        if (!this.chainController.active) {
          this.swingCount += 1;
          this.evaluateObjective();
        }
        if (this.levelOver) {
          return;
        }
        this.chainController.start(pointer);
        this.updateHUD();
      });

      const stopChain = () => {
        this.chainController.stop();
        this.updateHUD();
      };
      this.input.on("pointerup", stopChain);
      this.input.on("pointerupoutside", stopChain);

      this.input.keyboard.on("keydown-R", () => this.restartLevel());
      this.input.keyboard.on("keydown-N", () => this.advanceLevel());
      const keys = this.input.keyboard.addKeys({
        one: Phaser.Input.Keyboard.KeyCodes.ONE,
        two: Phaser.Input.Keyboard.KeyCodes.TWO,
        three: Phaser.Input.Keyboard.KeyCodes.THREE,
      });
      keys.one.on("down", () => this.setHeadType("ball"));
      keys.two.on("down", () => this.setHeadType("spike"));
      keys.three.on("down", () => this.setHeadType("hammer"));

      const restartButton = document.getElementById("restart-btn");
      if (restartButton) {
        restartButton.addEventListener("click", () => this.restartLevel());
      }

      this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
        if (this.levelOver) {
          return;
        }
        const step = deltaY > 0 ? -10 : 10;
        this.adjustChainLength(step);
      });
    }

    setupUI() {
      const headButtons = {
        ball: document.getElementById("head-ball"),
        spike: document.getElementById("head-spike"),
        hammer: document.getElementById("head-hammer"),
      };
      Object.entries(headButtons).forEach(([key, button]) => {
        if (!button) {
          return;
        }
        button.addEventListener("click", () => this.setHeadType(key));
      });
      this.updateHeadButtons();

      if (this.resultsElements) {
        const { restart, next } = this.resultsElements;
        if (restart) {
          restart.addEventListener("click", () => this.restartLevel());
        }
        if (next) {
          next.addEventListener("click", () => this.advanceLevel());
        }
      }
    }

    setHeadType(type) {
      if (!HEAD_TYPES[type]) {
        return;
      }
      this.headType = type;
      this.applyTuning();
      this.updateHeadButtons();
      this.updateHUD();
    }

    updateHeadButtons() {
      const mapping = {
        ball: document.getElementById("head-ball"),
        spike: document.getElementById("head-spike"),
        hammer: document.getElementById("head-hammer"),
      };
      Object.entries(mapping).forEach(([key, button]) => {
        if (!button) {
          return;
        }
        button.classList.toggle("active", this.headType === key);
      });
    }

    adjustChainLength(delta) {
      this.setChainLength(this.tuning.chainLength + delta);
    }

    setChainLength(nextLength) {
      if (!this.tuning) {
        return;
      }
      const clamped = Phaser.Math.Clamp(nextLength, CHAIN_LIMITS.minLength, CHAIN_LIMITS.maxLength);
      const snapped = Math.round(clamped / 10) * 10;
      if (Math.abs(snapped - this.tuning.chainLength) < 0.5) {
        return;
      }
      if (typeof this.tuning.setValue === "function") {
        this.tuning.setValue("chainLength", snapped);
      } else {
        this.tuning.chainLength = snapped;
        this.applyTuning();
      }
    }

    applyTuning() {
      if (!this.tuning) {
        return;
      }
      this.breakScale = this.tuning.breakScale;
      const profile = buildChainProfile(this.tuning, this.headType);
      this.chainController.updateProfile(profile, true);
    }

    loadLevel(index) {
      const clampedIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
      this.levelIndex = clampedIndex;
      saveLevelIndex(clampedIndex);
      this.clearLevel();

      this.objective = normalizeObjective(LEVELS[clampedIndex].objective);
      this.levelOver = false;
      this.failureReason = "";
      this.targetsTotal = 0;
      this.targetsRemaining = 0;
      this.swingCount = 0;
      this.collateralBreaks = 0;
      this.elapsedTimeMs = 0;
      this.bestImpact = 0;
      this.lastImpact = 0;
      this.lastImpactTimer = 0;
      this.timeScale = 1;
      this.timeScaleTarget = 1;
      this.fixedStep.accumulator = 0;

      LEVELS[clampedIndex].build(this);

      updateText("objective", `Objective: ${this.objective.label}`);
      updateText("level-status", `Level ${clampedIndex + 1} - ${LEVELS[clampedIndex].name}`);
      const clear = document.getElementById("level-clear");
      if (clear) {
        clear.classList.add("hidden");
      }
      this.updateResults(false, "");
      this.updateHUD();
    }

    clearLevel() {
      this.chainController.stop();
      this.breakables.clear();
      this.targetsRemaining = 0;
      this.joints = [];
      this.jointsByBody.clear();

      this.levelObjects.forEach((object) => {
        if (object && object.destroy) {
          object.destroy();
        }
      });
      this.levelObjects = [];

      this.levelConstraints.forEach((constraint) => {
        this.matter.world.remove(constraint);
      });
      this.levelConstraints = [];

      this.debris.forEach((piece) => {
        if (piece.object && piece.object.destroy) {
          piece.object.destroy();
        }
      });
      this.debris = [];
    }

    restartLevel() {
      this.loadLevel(this.levelIndex);
    }

    advanceLevel() {
      const nextIndex = (this.levelIndex + 1) % LEVELS.length;
      this.loadLevel(nextIndex);
    }

    registerBreakable(gameObject, materialName, isTarget) {
      const objectiveTarget =
        this.objective && this.objective.mode === "all" ? true : Boolean(isTarget);
      const entry = {
        object: gameObject,
        material: materialName,
        stress: 0,
        crackStage: 0,
        isTarget: objectiveTarget,
        isMarked: Boolean(isTarget),
      };
      this.breakables.set(gameObject.body.id, entry);
      if (entry.isTarget) {
        this.targetsRemaining += 1;
        this.targetsTotal += 1;
      }
      return entry;
    }

    registerJoint(constraint, threshold, bodies) {
      const joint = {
        constraint,
        threshold,
        stress: 0,
        bodies,
      };
      this.joints.push(joint);
      bodies.forEach((body) => {
        if (!body) {
          return;
        }
        if (!this.jointsByBody.has(body.id)) {
          this.jointsByBody.set(body.id, []);
        }
        this.jointsByBody.get(body.id).push(joint);
      });
    }

    routeCollisions(event, multiplier) {
      if (!event || !event.pairs) {
        return;
      }
      event.pairs.forEach((pair) => {
        const impulse = estimateImpact(pair) * multiplier;
        if (impulse <= 0.01) {
          return;
        }
        const contact = pair.collision.supports[0] || pair.collision.supports[1];
        this.handleImpactFX(impulse, contact);

        this.applyImpactToBody(pair.bodyA, impulse, pair.bodyB);
        this.applyImpactToBody(pair.bodyB, impulse, pair.bodyA);
        this.applyImpactToJoints(pair.bodyA, impulse, pair.bodyB);
        this.applyImpactToJoints(pair.bodyB, impulse, pair.bodyA);
      });
    }

    applyImpactToBody(body, impulse, sourceBody) {
      if (!body || !this.breakables.has(body.id)) {
        return;
      }
      const entry = this.breakables.get(body.id);
      const material = MATERIALS[entry.material];
      const damageMultiplier = this.chainController.getDamageMultiplier(sourceBody);
      const scaledImpulse = impulse * damageMultiplier;
      entry.stress += scaledImpulse * material.stressScale;

      const breakThreshold = material.breakThreshold * this.breakScale;
      const stressLimit = material.stressLimit * this.breakScale;

      if (scaledImpulse >= breakThreshold || entry.stress >= stressLimit) {
        this.breakObject(entry, scaledImpulse);
        return;
      }

      const crackStage = computeCrackStage(entry.stress, stressLimit, material.crackStages);
      if (crackStage > entry.crackStage) {
        entry.crackStage = crackStage;
        if (entry.object.setFillStyle) {
          entry.object.setFillStyle(material.crackColor);
        } else if (entry.object.setTint) {
          entry.object.setTint(material.crackColor);
        }
      }
    }

    applyImpactToJoints(body, impulse, sourceBody) {
      if (!body || !this.jointsByBody.has(body.id)) {
        return;
      }
      const jointMultiplier = this.chainController.getJointMultiplier(sourceBody);
      const joints = this.jointsByBody.get(body.id) || [];
      joints.forEach((joint) => {
        if (!joint.constraint) {
          return;
        }
        const scaledImpulse = impulse * jointMultiplier;
        joint.stress += scaledImpulse;
        if (scaledImpulse >= joint.threshold || joint.stress >= joint.threshold * 1.4) {
          this.breakJoint(joint);
        }
      });
    }

    breakJoint(joint) {
      if (!joint || !joint.constraint) {
        return;
      }
      this.matter.world.remove(joint.constraint);
      joint.constraint = null;
    }

    breakObject(entry, impulse) {
      const material = MATERIALS[entry.material];
      const object = entry.object;
      const bodyId = object.body.id;
      const { x, y } = object.body.position;
      const width = object.width || 20;
      const height = object.height || 20;
      const angle = object.rotation || 0;
      object.destroy();
      this.breakables.delete(bodyId);

      if (entry.isTarget) {
        this.targetsRemaining = Math.max(0, this.targetsRemaining - 1);
        this.evaluateObjective();
      } else {
        this.collateralBreaks += 1;
        this.evaluateObjective();
      }

      const pieceCount = material.shardCount;
      const kick = Math.min(impulse * 0.08, 6);
      for (let i = 0; i < pieceCount; i += 1) {
        const pieceW = Phaser.Math.Clamp(width * (0.25 + Math.random() * 0.35), 8, width * 0.6);
        const pieceH = Phaser.Math.Clamp(height * (0.25 + Math.random() * 0.35), 8, height * 0.6);
        const offsetX = Phaser.Math.Between(-width * 0.2, width * 0.2);
        const offsetY = Phaser.Math.Between(-height * 0.2, height * 0.2);

        const piece = this.add.rectangle(x + offsetX, y + offsetY, pieceW, pieceH, material.crackColor);
        this.matter.add.gameObject(piece, { shape: { type: "rectangle" } });
        piece.setRotation(angle + Phaser.Math.FloatBetween(-0.4, 0.4));
        piece.setDensity(material.density * 0.6);
        piece.setFrictionAir(0.02);
        piece.setBounce(material.restitution || 0.1);
        piece.setVelocity(
          Phaser.Math.FloatBetween(-kick, kick),
          Phaser.Math.FloatBetween(-kick, kick)
        );
        piece.setAngularVelocity(Phaser.Math.FloatBetween(-0.2, 0.2));

        this.debris.push({ object: piece, ttl: 3200 });
      }
      this.emitShards(x, y, material.crackColor);
    }

    emitShards(x, y, color) {
      if (!this.shardEmitter) {
        return;
      }
      this.shardEmitter.setTint(color);
      this.shardEmitter.explode(10, x, y);
    }

    updateResults(visible, reason) {
      if (!this.resultsElements) {
        return;
      }
      const { container, title, subtitle, time, swings, collateral, targets, impulse } =
        this.resultsElements;
      container.classList.toggle("hidden", !visible);
      if (!visible) {
        return;
      }
      const success = Boolean(reason === "");
      title.textContent = success ? "Cleared!" : "Failed";
      subtitle.textContent = success
        ? "Momentum speaks louder than buttons."
        : reason || "The chain learned something. Try again.";

      const elapsedSeconds = this.elapsedTimeMs / 1000;
      const timeLimit = this.objective.timeLimitMs ? this.objective.timeLimitMs / 1000 : null;
      time.textContent = timeLimit
        ? `Time: ${formatSeconds(elapsedSeconds)}s / ${formatSeconds(timeLimit)}s`
        : `Time: ${formatSeconds(elapsedSeconds)}s`;
      const maxSwings = this.objective.maxSwings;
      swings.textContent = maxSwings
        ? `Swings: ${this.swingCount}/${maxSwings}`
        : `Swings: ${this.swingCount}`;
      const collateralLimit = this.objective.collateralLimit;
      collateral.textContent =
        collateralLimit !== null && collateralLimit !== undefined
          ? `Collateral: ${this.collateralBreaks}/${collateralLimit}`
          : `Collateral: ${this.collateralBreaks}`;
      targets.textContent = `Targets: ${this.targetsTotal - this.targetsRemaining}/${this.targetsTotal}`;
      impulse.textContent = `Best impact: ${this.bestImpact.toFixed(2)}`;
    }

    evaluateObjective() {
      if (this.levelOver || !this.objective) {
        return;
      }
      if (this.targetsRemaining <= 0 && this.targetsTotal > 0) {
        this.completeLevel(true, "");
        return;
      }
      if (this.objective.timeLimitMs && this.elapsedTimeMs >= this.objective.timeLimitMs) {
        if (this.targetsRemaining > 0) {
          this.completeLevel(false, "Time ran out.");
        }
        return;
      }
      if (this.objective.maxSwings && this.swingCount > this.objective.maxSwings) {
        if (this.targetsRemaining > 0) {
          this.completeLevel(false, "Out of swings.");
        }
        return;
      }
      if (
        this.objective.collateralLimit !== null &&
        this.objective.collateralLimit !== undefined &&
        this.collateralBreaks > this.objective.collateralLimit
      ) {
        this.completeLevel(false, "Collateral limit exceeded.");
      }
    }

    completeLevel(success, reason) {
      if (this.levelOver) {
        return;
      }
      this.levelOver = true;
      this.failureReason = success ? "" : reason || "Failed.";
      this.chainController.stop();
      this.timeScale = 1;
      this.timeScaleTarget = 1;
      this.updateResults(true, this.failureReason);
    }

    handleImpactFX(impulse, contact) {
      const clamped = Math.min(impulse, 12);
      this.lastImpact = clamped;
      this.lastImpactTimer = 600;
      this.bestImpact = Math.max(this.bestImpact, impulse);

      if (impulse >= 6) {
        this.timeScaleTarget = 0.7;
        this.timeScale = Math.min(this.timeScale, 0.8);
      }

      const shake = Phaser.Math.Clamp(clamped / 35, 0.002, 0.015);
      this.cameras.main.shake(120, shake);

      if (contact) {
        this.emitShards(contact.x, contact.y, 0xffffff);
      }

      this.playImpactSound(clamped);
    }

    playImpactSound(impulse) {
      if (!this.audioContext) {
        return;
      }
      if (!this.noiseBuffer) {
        this.noiseBuffer = createNoiseBuffer(this.audioContext);
      }
      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const headSpec = this.chainController.getHeadSpec();
      const base = headSpec === HEAD_TYPES.hammer ? 90 : 120;
      const freq = base + impulse * 24;
      const volume = Math.min(0.18, 0.04 + impulse * 0.012);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.14);

      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(800 + impulse * 40, now);
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.008);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioContext.destination);
      noiseSource.start(now);
      noiseSource.stop(now + 0.1);
    }

    update(time, delta) {
      const pointer = this.input.activePointer;
      this.updatePointerIndicator(pointer);
      this.updatePinch();

      if (!this.levelOver) {
        const stepMs = this.fixedStep.dt * this.timeScale;
        this.fixedStep.accumulator += delta;
        while (this.fixedStep.accumulator >= stepMs) {
          this.matter.world.step(stepMs);
          this.fixedStep.accumulator -= stepMs;
        }
        this.chainController.update(pointer);
        this.elapsedTimeMs += delta;
        this.evaluateObjective();
      }

      this.updateDebris(delta);
      this.updateTimeScale(delta);
      if (this.lastImpactTimer > 0) {
        this.lastImpactTimer = Math.max(0, this.lastImpactTimer - delta);
      }
      this.updateTrail();
      this.updateHUD();
      this.updateCamera();
    }

    updateTimeScale(delta) {
      if (this.timeScaleTarget < 1) {
        this.timeScaleTarget += delta * 0.004;
      } else {
        this.timeScaleTarget = 1;
      }
      this.timeScale = Phaser.Math.Linear(this.timeScale, this.timeScaleTarget, 0.12);
    }

    updateDebris(delta) {
      this.debris.forEach((piece) => {
        piece.ttl -= delta;
      });
      const remaining = [];
      this.debris.forEach((piece) => {
        if (piece.ttl > 0) {
          remaining.push(piece);
        } else if (piece.object && piece.object.destroy) {
          piece.object.destroy();
        }
      });
      while (remaining.length > 120) {
        const oldest = remaining.shift();
        if (oldest && oldest.object && oldest.object.destroy) {
          oldest.object.destroy();
        }
      }
      this.debris = remaining;
    }

    updateTrail() {
      if (!this.trailEmitter) {
        return;
      }
      const head = this.chainController.head;
      if (!head) {
        this.trailEmitter.on = false;
        return;
      }
      const headSpec = this.chainController.getHeadSpec();
      this.trailEmitter.on = true;
      this.trailEmitter.setTint(headSpec.trailColor);
      this.trailEmitter.setPosition(head.x, head.y);
    }

    updatePinch() {
      if (this.levelOver) {
        this.pinch.active = false;
        return;
      }
      const activePointers = this.input.pointers.filter((pointer) => pointer.isDown);
      if (activePointers.length < 2) {
        this.pinch.active = false;
        return;
      }
      const [first, second] = activePointers;
      const distance = Phaser.Math.Distance.Between(
        first.worldX,
        first.worldY,
        second.worldX,
        second.worldY
      );
      if (!this.pinch.active) {
        this.pinch.active = true;
        this.pinch.startDistance = distance;
        this.pinch.startLength = this.tuning.chainLength;
        return;
      }
      if (this.pinch.startDistance <= 0.01) {
        return;
      }
      const scale = distance / this.pinch.startDistance;
      const nextLength = this.pinch.startLength * scale;
      this.setChainLength(nextLength);
    }

    updatePointerIndicator(pointer) {
      if (!pointer || !this.pointerIndicator) {
        return;
      }
      this.pointerIndicator.x = pointer.worldX;
      this.pointerIndicator.y = pointer.worldY;
    }

    updateHUD() {
      const pointer = this.input.activePointer;
      const tension = this.chainController.getTension(pointer);
      const tensionRatio = Phaser.Math.Clamp(tension / (this.tuning.chainLength * 0.6), 0, 1);
      const fill = document.getElementById("tension-fill");
      if (fill) {
        fill.style.width = `${Math.round(tensionRatio * 100)}%`;
      }

      const progress = this.targetsTotal > 0 ? this.targetsTotal - this.targetsRemaining : 0;
      const progressText = this.targetsTotal > 0 ? ` (${progress}/${this.targetsTotal})` : "";
      updateText("objective", `Objective: ${this.objective.label}${progressText}`);

      updateText(
        "impact",
        this.lastImpactTimer > 0 ? `Impact: ${this.lastImpact.toFixed(2)}` : "Impact: --"
      );

      const elapsedSeconds = this.elapsedTimeMs / 1000;
      const timeLimit = this.objective.timeLimitMs ? this.objective.timeLimitMs / 1000 : null;
      updateText(
        "timer",
        timeLimit
          ? `Time: ${formatSeconds(elapsedSeconds)}s / ${formatSeconds(timeLimit)}s`
          : `Time: ${formatSeconds(elapsedSeconds)}s`
      );
      const maxSwings = this.objective.maxSwings;
      updateText(
        "swings",
        maxSwings ? `Swings: ${this.swingCount}/${maxSwings}` : `Swings: ${this.swingCount}`
      );
      const collateralLimit = this.objective.collateralLimit;
      updateText(
        "collateral",
        collateralLimit
          ? `Collateral: ${this.collateralBreaks}/${collateralLimit}`
          : `Collateral: ${this.collateralBreaks}`
      );
      const headSpec = HEAD_TYPES[this.headType] || HEAD_TYPES.ball;
      updateText("head-status", `Head: ${headSpec.name}`);

      const state = document.getElementById("chain-state");
      if (state) {
        state.textContent = this.chainController.active ? "Chain active" : "Chain idle";
        state.classList.toggle("active", this.chainController.active);
      }

      const clear = document.getElementById("level-clear");
      if (clear) {
        clear.classList.toggle("hidden", this.targetsRemaining !== 0);
      }
    }

    updateCamera() {
      const speed = this.chainController.getHeadSpeed();
      const targetZoom = 1 - Phaser.Math.Clamp(speed / 50, 0, 0.12);
      this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.05);
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: "#0b0f1a",
    parent: "game-container",
    physics: {
      default: "matter",
      matter: {
        gravity: { y: 1.2 },
        enableSleep: true,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: MainScene,
  };

  new Phaser.Game(config);

  function buildChainProfile(tuning, headType) {
    const length = tuning.chainLength;
    const segmentCount = Phaser.Math.Clamp(Math.round(length / 24), 6, 14);
    const headSpec = HEAD_TYPES[headType] || HEAD_TYPES.ball;
    return {
      length,
      segmentCount,
      handleStiffness: tuning.handleStiffness,
      handleDamping: tuning.handleDamping,
      headMass: tuning.headMass * headSpec.massMultiplier,
      drag: 0.03,
      headSpec,
    };
  }

  function estimateImpact(pair) {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;
    if (!bodyA || !bodyB) {
      return 0;
    }
    const normal = pair.collision.normal;
    const rvx = bodyB.velocity.x - bodyA.velocity.x;
    const rvy = bodyB.velocity.y - bodyA.velocity.y;
    const relVel = Math.abs(rvx * normal.x + rvy * normal.y);
    const mass = (bodyA.mass * bodyB.mass) / (bodyA.mass + bodyB.mass);
    return relVel * mass;
  }

  function computeCrackStage(stress, stressLimit, stages) {
    let stage = 0;
    stages.forEach((threshold) => {
      if (stress >= stressLimit * threshold) {
        stage += 1;
      }
    });
    return stage;
  }

  function setupTuningPanel(onChange) {
    const tuning = {
      handleStiffness: 0.12,
      handleDamping: 0.08,
      chainLength: 240,
      headMass: 6,
      breakScale: 1.0,
      inputs: {},
      setValue(key, nextValue) {
        if (!this.inputs[key] || !this.inputs[key].input) {
          this[key] = nextValue;
          if (onChange) {
            onChange();
          }
          return;
        }
        const { input, value } = this.inputs[key];
        input.value = nextValue;
        this[key] = parseFloat(input.value);
        if (value) {
          value.textContent = input.value;
        }
        if (onChange) {
          onChange();
        }
      },
    };

    bindSlider("handle-stiffness", "handle-stiffness-value", "handleStiffness");
    bindSlider("handle-damping", "handle-damping-value", "handleDamping");
    bindSlider("chain-length", "chain-length-value", "chainLength");
    bindSlider("head-mass", "head-mass-value", "headMass");
    bindSlider("break-scale", "break-scale-value", "breakScale");

    function bindSlider(id, valueId, key) {
      const input = document.getElementById(id);
      const value = document.getElementById(valueId);
      if (!input) {
        return;
      }
      tuning.inputs[key] = { input, value };
      const update = () => {
        tuning[key] = parseFloat(input.value);
        if (value) {
          value.textContent = input.value;
        }
        if (onChange) {
          onChange();
        }
      };
      input.addEventListener("input", update);
      update();
    }

    return tuning;
  }

  function updateText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  function normalizeObjective(objective) {
    const base = {
      label: "Destroy all targets",
      mode: "marked",
      maxSwings: null,
      timeLimitMs: null,
      collateralLimit: null,
    };
    if (!objective) {
      return base;
    }
    return { ...base, ...objective };
  }

  function getResultsElements() {
    const container = document.getElementById("results");
    if (!container) {
      return null;
    }
    return {
      container,
      title: document.getElementById("results-title"),
      subtitle: document.getElementById("results-subtitle"),
      time: document.getElementById("results-time"),
      swings: document.getElementById("results-swings"),
      collateral: document.getElementById("results-collateral"),
      targets: document.getElementById("results-targets"),
      impulse: document.getElementById("results-impulse"),
      restart: document.getElementById("results-restart"),
      next: document.getElementById("results-next"),
    };
  }

  function formatSeconds(value) {
    if (!Number.isFinite(value)) {
      return "0.0";
    }
    return value.toFixed(1);
  }

  function createNoiseBuffer(audioContext) {
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    return buffer;
  }

  function addGround(scene) {
    const ground = scene.add.rectangle(480, 530, 960, 30, 0x1e2533);
    scene.matter.add.gameObject(ground, { isStatic: true });
    ground.setStrokeStyle(1, 0x2f394d);
    scene.levelObjects.push(ground);
  }

  function addStack(scene, x, y, cols, rows, width, height, material, targetIndices, stagger) {
    const indices = new Set(targetIndices || []);
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const offsetX = (col - (cols - 1) / 2) * (width + 4) + (stagger ? row * 6 : 0);
        const offsetY = (rows - row - 1) * (height + 4);
        const isTarget = indices.has(index);
        createBreakableRect(scene, x + offsetX, y - offsetY, width, height, material, isTarget);
        index += 1;
      }
    }
  }

  function addDominoLine(scene, x, y, count, spacing, material, targetIndices) {
    const indices = new Set(targetIndices || []);
    for (let i = 0; i < count; i += 1) {
      const isTarget = indices.has(i);
      const rect = createBreakableRect(scene, x + i * spacing, y, 16, 48, material, isTarget);
      rect.setAngle(Phaser.Math.FloatBetween(-2, 2));
    }
  }

  function addTargetPlatform(scene, x, y) {
    const base = createSolidRect(scene, x, y, 120, 20, 0x1f2837, true);
    base.setStrokeStyle(1, 0x3a4458);
    createTarget(scene, x - 36, y - 32, 30, 30, "glass");
    createTarget(scene, x + 36, y - 32, 30, 30, "glass");
  }

  function addSuspendedWeight(scene, anchorX, anchorY, weightX, weightY, material, isTarget) {
    const anchor = createSolidRect(scene, anchorX, anchorY, 18, 18, 0x2a2f3a, true);
    const weight = createBreakableRect(scene, weightX, weightY, 46, 46, material, isTarget);
    const distance = Phaser.Math.Distance.Between(anchorX, anchorY, weightX, weightY);
    const constraint = scene.matter.add.constraint(anchor.body, weight.body, distance, 0.9);
    scene.levelConstraints.push(constraint);
    scene.registerJoint(constraint, 7.5, [anchor.body, weight.body]);
  }

  function addJointedRig(scene, anchorX, anchorY, weightX, weightY, material, isTarget) {
    const anchor = createSolidRect(scene, anchorX, anchorY, 20, 20, 0x2a2f3a, true);
    const hinge = createBreakableRect(scene, weightX, weightY, 26, 26, material, false);
    const weight = createBreakableRect(scene, weightX, weightY + 60, 44, 44, material, isTarget);
    const hingeConstraint = scene.matter.add.constraint(anchor.body, hinge.body, 70, 0.85);
    const weightConstraint = scene.matter.add.constraint(hinge.body, weight.body, 60, 0.85);
    scene.levelConstraints.push(hingeConstraint, weightConstraint);
    scene.registerJoint(hingeConstraint, 6.5, [anchor.body, hinge.body]);
    scene.registerJoint(weightConstraint, 6.0, [hinge.body, weight.body]);
  }

  function addShield(scene, x, y) {
    createSolidRect(scene, x - 60, y, 20, 120, 0x2f394d, true);
    createSolidRect(scene, x + 60, y, 20, 120, 0x2f394d, true);
    createSolidRect(scene, x, y + 50, 140, 20, 0x2f394d, true);
  }

  function addCorridor(scene, x, y) {
    createSolidRect(scene, x - 70, y, 20, 140, 0x2f394d, true);
    createSolidRect(scene, x + 70, y, 20, 140, 0x2f394d, true);
    createSolidRect(scene, x, y - 60, 160, 20, 0x2f394d, true);
  }

  function addBridge(scene, x, y) {
    const leftSupport = createSolidRect(scene, x - 140, y + 20, 24, 90, 0x2f394d, true);
    const rightSupport = createSolidRect(scene, x + 140, y + 20, 24, 90, 0x2f394d, true);
    const plankCount = 3;
    const plankWidth = 80;
    const plankHeight = 16;
    const planks = [];
    let previous = null;
    for (let i = 0; i < plankCount; i += 1) {
      const plankX = x - plankWidth + i * plankWidth;
      const plank = createBreakableRect(scene, plankX, y, plankWidth, plankHeight, "wood", false);
      planks.push(plank);
      if (previous) {
        const link = scene.matter.add.constraint(previous.body, plank.body, plankWidth, 0.8);
        scene.levelConstraints.push(link);
        scene.registerJoint(link, 6.5, [previous.body, plank.body]);
      }
      previous = plank;
    }
    const firstPlank = planks[0];
    const lastPlank = planks[planks.length - 1];
    if (firstPlank) {
      const leftLink = scene.matter.add.constraint(leftSupport.body, firstPlank.body, 20, 0.9);
      scene.levelConstraints.push(leftLink);
      scene.registerJoint(leftLink, 6.0, [leftSupport.body, firstPlank.body]);
    }
    if (lastPlank) {
      const rightLink = scene.matter.add.constraint(rightSupport.body, lastPlank.body, 20, 0.9);
      scene.levelConstraints.push(rightLink);
      scene.registerJoint(rightLink, 6.0, [rightSupport.body, lastPlank.body]);
    }
  }

  function addSeesaw(scene, x, y) {
    const pivot = createSolidRect(scene, x, y, 24, 24, 0x2f394d, true);
    const beam = createBreakableRect(scene, x, y - 20, 200, 18, "wood", false);
    const joint = scene.matter.add.constraint(pivot.body, beam.body, 0, 0.9);
    scene.levelConstraints.push(joint);
    scene.registerJoint(joint, 6.0, [pivot.body, beam.body]);
  }

  function addHangingRow(scene, startX, y, count, spacing, material, targetIndices) {
    const indices = new Set(targetIndices || []);
    for (let i = 0; i < count; i += 1) {
      const anchorX = startX + i * spacing;
      const anchor = createSolidRect(scene, anchorX, y, 16, 16, 0x2a2f3a, true);
      const weight = createBreakableRect(
        scene,
        anchorX,
        y + 90,
        32,
        32,
        material,
        indices.has(i)
      );
      const constraint = scene.matter.add.constraint(anchor.body, weight.body, 90, 0.85);
      scene.levelConstraints.push(constraint);
      scene.registerJoint(constraint, 6.5, [anchor.body, weight.body]);
    }
  }

  function addCage(scene, x, y, width, height, material) {
    const halfW = width / 2;
    const halfH = height / 2;
    const top = createBreakableRect(scene, x, y - halfH, width, 16, material, false);
    const bottom = createBreakableRect(scene, x, y + halfH, width, 16, material, false);
    const left = createBreakableRect(scene, x - halfW, y, 16, height, material, false);
    const right = createBreakableRect(scene, x + halfW, y, 16, height, material, false);
    const topLeft = scene.matter.add.constraint(top.body, left.body, 0, 0.9);
    const topRight = scene.matter.add.constraint(top.body, right.body, 0, 0.9);
    const bottomLeft = scene.matter.add.constraint(bottom.body, left.body, 0, 0.9);
    const bottomRight = scene.matter.add.constraint(bottom.body, right.body, 0, 0.9);
    const joints = [
      { joint: topLeft, bodies: [top.body, left.body] },
      { joint: topRight, bodies: [top.body, right.body] },
      { joint: bottomLeft, bodies: [bottom.body, left.body] },
      { joint: bottomRight, bodies: [bottom.body, right.body] },
    ];
    joints.forEach((entry) => {
      scene.levelConstraints.push(entry.joint);
      scene.registerJoint(entry.joint, 6.0, entry.bodies);
    });
    createTarget(scene, x, y, 38, 38, "glass");
  }

  function createTarget(scene, x, y, width, height, material) {
    return createBreakableRect(scene, x, y, width, height, material, true);
  }

  function createBreakableRect(scene, x, y, width, height, materialName, isTarget) {
    const material = MATERIALS[materialName];
    const rect = scene.add.rectangle(x, y, width, height, material.color);
    scene.matter.add.gameObject(rect, { shape: { type: "rectangle" } });
    rect.setFrictionAir(0.02);
    rect.setFriction(0.2);
    rect.setBounce(material.restitution || 0.05);
    rect.setDensity(material.density);
    if (isTarget && rect.setStrokeStyle) {
      rect.setStrokeStyle(2, 0xff4d4d);
    }
    scene.registerBreakable(rect, materialName, isTarget);
    scene.levelObjects.push(rect);
    return rect;
  }

  function createSolidRect(scene, x, y, width, height, color, isStatic) {
    const rect = scene.add.rectangle(x, y, width, height, color);
    scene.matter.add.gameObject(rect, { isStatic: isStatic });
    rect.setBounce(0.1);
    rect.setFriction(0.3);
    scene.levelObjects.push(rect);
    return rect;
  }

  function saveLevelIndex(index) {
    try {
      window.localStorage.setItem("chaini_level", String(index));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function loadSavedLevelIndex() {
    try {
      const stored = window.localStorage.getItem("chaini_level");
      const index = parseInt(stored, 10);
      if (Number.isFinite(index)) {
        return index;
      }
    } catch (error) {
      // Ignore storage failures.
    }
    return 0;
  }
})();
