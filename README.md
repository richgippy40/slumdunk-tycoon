# SLUMDUNK TYCOON

Mobile landscape (16:9) burger-diner casual game. Static site: no build step.

- Play: https://slumdunk-tycoon.onrender.com
- Version: Stage 01 v0.3 (Just Cheese). The previous release is tagged `v0.2`.

## Files
- `index.html` — page structure
- `css/game.css` — styles (Art Direction V1.0 colors as CSS variables)
- `js/logic.js` — game rules (pure, no DOM): customers, grill grades, assembly, auto-serve, tips
- `js/main.js` — screen scaling, touch input, rendering, effects
- `js/customers.js` — selected seven-character cast and portrait framing
- `js/art.js` — customer portrait markup and temporary SVG props; `js/audio.js` — synthesized sounds
- `assets/` — SLUMDUNK food images; `assets/customers/` — selected customer PNGs
- `docs/` — V0.3 plan and asset status

## Render
Static Site, branch `main`, build command `echo ok`, publish directory `.`.

## Tests
- Rules: `node --test tests/logic.test.mjs`
- End to end (real Chrome, touch emulation, fake clock, full 5-minute game):
  `npm i --no-save playwright-core`, serve the folder (e.g. `python -m http.server 8000`),
  then `node tests/e2e.mjs http://127.0.0.1:8000/`
- Viewport regression (same Playwright dependency): `node tests/viewport.mjs http://127.0.0.1:8000/`.
  Uses `/usr/bin/chromium` by default; override with `CHROMIUM_PATH`. These are synthetic
  toolbar/safe-area tests, not a substitute for real iPhone Safari or KakaoTalk testing.

## Current development changes
- Seven selected customer portraits replace the old four SVG customers entirely.
  Only the upper body is framed above the counter; mood uses movement, order bubbles
  and patience gauges while preserving each character's original face.
- Two independently tappable grills, each with its own cooking gauge and grade.
- Patty storage increased to 4. Cooking patties and a patty in the assembly stack
  reserve storage room so cooking and undo cannot overflow storage.
- Late-stage arrival interval eased from 2 to 3 seconds; patience from 30 to 36 seconds.
- HUD spacing reduced while preserving time and money font sizes; visual viewport
  and safe-area fitting remain enabled. Stage duration, price, recipe and grade zones are unchanged.
