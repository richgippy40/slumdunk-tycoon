# SLUMDUNK TYCOON

Mobile landscape (16:9) burger-diner casual game. Static site: no build step.

- Play: https://slumdunk-tycoon.onrender.com
- Version: V0.5 — Stages 1–5, **2 minutes per stage, targets 30% lower** than the calibrated
  values (V0.4 was 5 minutes). Stage 1 keeps the V0.3 rules (recipe, price, grill zones, tips);
  only its clock, seat schedule, target and stars changed.
  The previous production build is `main@1701be4`; older release tag `v0.2`.
- Design: `docs/stage2-5-design.md` · Assets: `docs/v0.4-assets.md`, `docs/v0.3-assets.md`

## Stages
| # | Name | New idea |
| --- | --- | --- |
| 1 | JUST CHEESE | Grill timing + tap-to-stack assembly + auto serve |
| 2 | COMBO TIME | One-tap fryer (3 portions) and drink fountain; sides attach automatically |
| 3 | BURGER COLLECTION | Three burgers; the tray shows only the current burger's ingredients |
| 4 | RUSH HOUR | Rush waves, serve COMBO, FEVER x1.5 every 5 serves |
| 5 | GRAND OPENING | Group customers, VIP double-patty order, LAST CALL x1.5 |

Progress (unlocks, best sales, stars) is saved in this browser's `localStorage` only.
Changing device/browser or clearing site data resets it. Add `?unlock=all` to the URL to open
every stage for this visit (demos and QA); results you play are still recorded.

## Files
- `index.html` — page structure
- `css/game.css` — styles (Art Direction V1.0 colors as CSS variables)
- `js/logic.js` — game rules (pure, no DOM). Stage 2–5 features are optional config fields;
  without them the Stage 1 code path and RNG sequence are unchanged.
- `js/menu.js` — ingredients, burgers (recipe, price), sides
- `js/stages.js` — the five stage configs (menus, odds, tempo, targets, how-to text)
- `js/save.js` — local progress and unlocks
- `js/main.js` — screen scaling, touch input, stage select, rendering, effects
- `js/customers.js` — selected seven-character cast and portrait framing
- `js/art.js` — customer portrait markup, ingredient icons/layers, temporary SVG props
- `js/audio.js` — synthesized sounds
- `assets/` — SLUMDUNK food images; `assets/customers/` — selected customer PNGs

## Render
Static Site, branch `main`, build command `echo ok`, publish directory `.`.

## Tests
- Rules, stage data, assets, save, balance: `npm test`
- Balance table (simulated players x 30 seeds): `npm run balance`
- iPhone landscape check (Playwright iPhone profiles; any URL, e.g. the preview site):
  `node tests/iphone.mjs https://slumdunk-tycoon-preview.onrender.com/`
- Preview site (dev branch only, free Render Static Site): https://slumdunk-tycoon-preview.onrender.com
- Browser tests need Playwright: a preinstalled `playwright` is used if present, otherwise
  `npm i --no-save playwright-core`. Set `CHROMIUM_PATH` to use a specific browser binary.
  Serve the folder (e.g. `python3 -m http.server 8000`), then:
  - End to end (touch emulation, fake clock, 6 screen sizes, Stage 1 regression,
    full 5-minute plays of Stages 2–5, unlock, save + reload): `node tests/e2e.mjs http://127.0.0.1:8000/`
  - Viewport/safe-area regression (Stage 1 and Stage 5 layouts): `node tests/viewport.mjs http://127.0.0.1:8000/`
  These are synthetic browser tests, not a substitute for real iPhone Safari or KakaoTalk testing.
