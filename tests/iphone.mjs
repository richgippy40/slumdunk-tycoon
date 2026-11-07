// iPhone landscape check against any URL (local or the preview site).
// Run: node tests/iphone.mjs https://<preview>.onrender.com/ [screenshotDir]
// Uses Playwright's iPhone landscape profiles (size, touch, iOS user agent) in Chromium.
// This is an emulation, not Safari/WebKit and not a real device.
import { launch, devices } from './pw.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8000/').replace(/\?.*$/, '');
const SHOTS = process.argv[3] || null;
const NAMES = ['iPhone SE (3rd gen) landscape', 'iPhone 13 Mini landscape', 'iPhone 14 landscape', 'iPhone 15 Pro landscape', 'iPhone 15 Pro Max landscape'];

const results = [];
const check = (dev, name, ok, detail = '') => {
  results.push({ ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${dev}] ${name}${detail ? ' — ' + detail : ''}`);
};

const layout = (page) => page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  const inside = (b) => b.left >= -1 && b.top >= -1 && b.right <= vw + 1 && b.bottom <= vh + 1;
  const sel = ['#pauseBtn', '#soundBtn', '#grill', '#grill2', '#fryer', '#fountain', '.tile.undo',
    ...[...document.querySelectorAll('.tile:not(.off):not(.undo)')].map((t) => `.tile[data-key="${t.dataset.key}"]`)];
  const bad = [];
  let min = 999;
  let hud = 999;
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el || getComputedStyle(el).display === 'none' || el.closest('.station') && getComputedStyle(el.closest('.station')).display === 'none') continue;
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    if (!inside(b) || !(hit === el || el.contains(hit))) bad.push(s);
    if (s === '#pauseBtn' || s === '#soundBtn') hud = Math.min(hud, b.width, b.height);
    else min = Math.min(min, b.width, b.height);
  }
  const regions = ['.hud', '#customers', '.grill-panel', '.assembly-panel', '.tray-panel'].filter((s) => !inside(document.querySelector(s).getBoundingClientRect()));
  return {
    scroll: document.scrollingElement.scrollWidth > vw + 1 || document.scrollingElement.scrollHeight > vh + 1,
    bad, regions, min: Math.round(min), hud: Math.round(hud), vw, vh,
  };
});

const browser = await launch();
for (const name of NAMES) {
  const ctx = await browser.newContext({ ...devices[name], deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.addInitScript(() => { Element.prototype.requestFullscreen = undefined; Element.prototype.webkitRequestFullscreen = undefined; });
  const dev = `${name.replace(' landscape', '')} ${devices[name].viewport.width}x${devices[name].viewport.height}`;

  await page.goto(BASE + '?unlock=all', { waitUntil: 'networkidle' });
  check(dev, '?unlock=all opens all 5 stages', (await page.$$('.stage-card:not(.locked)')).length === 5);
  const sel = await layout(page);
  check(dev, 'stage select: no scroll, cards fit', !sel.scroll && (await page.$$eval('.stage-card', (c) => c.every((x) => { const b = x.getBoundingClientRect(); return b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1; }))));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${dev.replace(/\W+/g, '_')}-select.png` });

  for (const id of [1, 2, 3, 4, 5]) {
    await page.tap(`.stage-card[data-stage="${id}"]`);
    await page.tap('#startBtn');
    // play ~20s: grill, sides, glowing ingredients
    for (let i = 0; i < 70; i++) {
      await page.evaluate(() => {
        const tap = (el) => el && el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        for (const id of ['grill', 'grill2']) {
          const g = document.getElementById(id), n = parseFloat(g.querySelector('.needle').style.left) || 0;
          if (g.classList.contains('cooking') && n >= 45 && n < 58) return tap(g);
          if (!g.classList.contains('cooking') && !g.classList.contains('full')) return tap(g);
        }
        const s = document.querySelector('.side-btn.need'); if (s) return tap(s);
        tap(document.querySelector('.tile.next'));
      });
      await page.waitForTimeout(300);
    }
    const m = await layout(page);
    const sales = await page.textContent('#sales');
    check(dev, `stage ${id}: no scroll, all regions on screen`, !m.scroll && !m.regions.length, m.regions.join(','));
    check(dev, `stage ${id}: every button visible and tappable`, !m.bad.length, m.bad.join(','));
    check(dev, `stage ${id}: game controls (grill, sides, tiles) >= 40px`, m.min >= 40, `smallest ${m.min}px`);
    // Pause/sound are the V0.3 HUD design; reported, not changed without design approval.
    check(dev, `stage ${id}: HUD pause/sound >= 40px`, m.hud >= 40, `${m.hud}px`);
    check(dev, `stage ${id}: real touch play earns sales`, sales !== '₩0', sales);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${dev.replace(/\W+/g, '_')}-s${id}.png` });
    await page.tap('#pauseBtn');
    await page.tap('#quitBtn');
  }
  check(dev, 'no JS errors / failed requests', !errors.length, errors.slice(0, 3).join(' | '));
  await ctx.close();

  // Portrait shows the rotate message.
  const p = await browser.newContext({ ...devices[name.replace(' landscape', '')] });
  const pp = await p.newPage();
  await pp.goto(BASE);
  check(dev, 'portrait -> rotate message', await pp.$eval('#rotate', (e) => getComputedStyle(e).display !== 'none'));
  await p.close();
}
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
