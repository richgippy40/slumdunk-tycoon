# SLUMDUNK TYCOON STAFF TEST

Deploy this folder as a static site. The entry file is `index.html`; styles are in `css/`, game code in `js/`, and images in `assets/`.

Version: Stage 01 v0.3-dev (v0.2 gameplay, code split into separate files). The v0.2 release is tagged `v0.2`.

For Render: Static Site, publish directory `.` (repository root).

Regression test: serve the folder locally, open the game, then run `await (await import('/tests/regression.js')).run()` in the console (see the header of `tests/regression.js`).
