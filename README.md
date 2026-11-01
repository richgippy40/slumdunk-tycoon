# SLUMDUNK TYCOON

Mobile landscape (16:9) burger-diner casual game. Static site: no build step.

- Play: https://slumdunk-tycoon.onrender.com
- Version: Stage 01 v0.3 (Just Cheese). The previous release is tagged `v0.2`.

## Files
- `index.html` — page structure
- `css/game.css` — styles (Art Direction V1.0 colors as CSS variables)
- `js/logic.js` — game rules (pure, no DOM): customers, grill grades, assembly, auto-serve, tips
- `js/main.js` — screen scaling, touch input, rendering, effects
- `js/art.js` — temporary SVG art; `js/audio.js` — temporary synthesized sounds
- `assets/` — original SLUMDUNK images (unchanged)
- `docs/` — V0.3 plan and asset status

## Render
Static Site, branch `main`, build command `echo ok`, publish directory `.`.

## Tests
- Rules: `node --test tests/logic.test.mjs`
- End to end (real Chrome, touch emulation, fake clock, full 5-minute game):
  `npm i --no-save playwright-core`, serve the folder (e.g. `python -m http.server 8000`),
  then `node tests/e2e.mjs http://127.0.0.1:8000/`
