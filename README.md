# Chain Impact Lab

A lightweight top-down 2D/2.5D chain physics sandbox.  
Move the cursor to drag the chain handle, build momentum, and slam targets with the weighted tip.

## Run

1. Open `index.html` directly in a browser, or serve the folder with a static server.
2. If you want a local server quickly:

```bash
npx serve .
```

## Controls

- Move cursor: steer the chain
- Hold click + drag: engage auto-spin assist for much harder hits
- `Q / A`: increase or decrease chain link count
- `W / S`: increase or decrease tip mass
- `E / D`: increase or decrease chain stiffness
- `F / G`: increase or decrease handle grip (responsiveness)
- `T`: cycle theme
- `1 / 2`: direct theme select (`Impact Forge` / `Neon Pinball`)
- `M`: mute or unmute sound
- `Space`: add more targets
- `R`: reset the arena
- First click/key press unlocks audio in browsers (autoplay policy).

## Notes

- Uses Verlet integration + iterative constraints for chain behavior.
- Includes collision response between chain links, targets, and boundaries.
- Targets are breakable with tier-based durability and crack as they take damage.
- Soft targets: lower durability, breaks quickly.
- Armored targets: high durability, reduced damage intake.
- Metallic targets: very heavy and highly durable, with strong recoil on impact.
- Explosive targets: detonate on break, pushing and damaging nearby targets.
- Shattered targets emit debris, impact rings, and stronger camera shake on heavy strikes.
- Cursor-to-chain response defaults to a more realistic feel, with a small rubber-band snap assist on sharp direction changes.
- Default chain is shorter for tighter control.
- Chain impacts now push subtle recoil back through the chain and handle.
- A minimal hit-stop effect is applied on stronger hits and shatters for extra feel without obvious slowdown.
- Theme modes include matching visuals and synthesized audio:
- `Impact Forge`: heavy metallic/destruction vibes.
- `Neon Pinball`: brighter musical/pinball-style blips.
- HUD and controls were visually refreshed with stronger theme-driven styling.
