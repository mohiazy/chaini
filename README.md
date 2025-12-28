# Chaini

Click and drag to manifest a chain, build momentum, and shatter weak structures in compact physics arenas.

## Run

1. Start a local server from the repo root:

```bash
python -m http.server 8000
```

2. Open `http://localhost:8000` in a browser.

You can also open `index.html` directly, but some browsers throttle audio and storage when run from disk.

## Controls

- Click or touch: spawn chain.
- Move pointer: swing the head and build momentum.
- Release: chain retracts.
- Mouse wheel / pinch: adjust chain length on the fly.
- 1 / 2 / 3 or head buttons: switch wrecking ball, spike, hammer.
- R: restart arena.
- N: next arena.

## Tuning

Use the tuning panel to adjust handle stiffness/damping, chain length, head mass, and break threshold.

## Notes

This prototype uses Phaser 3 + Matter.js with impulse-based breaking, stress buildup, joint failure, and quick restarts.
Objectives now include swing limits, time limits, and collateral caps with a results screen.
