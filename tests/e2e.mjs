// End-to-end test in real Chrome with mobile touch emulation and a fake clock.
// Setup once: npm i --no-save playwright-core
// Run:        node tests/e2e.mjs http://127.0.0.1:8000/ [screenshotDir]
import { launch } from './pw.mjs';

const URL = process.argv[2] || 'http://127.0.0.1:8000/';
const SHOTS = process.argv[3] || null;

const DEVICES = [
  { name: 'iPhone 14 (844x390)', width: 844, height: 390, mobile: true },
  { name: 'Galaxy S23 (780x360)', width: 780, height: 360, mobile: true },
  { name: 'iPhone SE (667x375)', width: 667, height: 375, mobile: true },
  { name: 'Pixel 7 (915x412)', width: 915, height: 412, mobile: true },
  { name: 'iPad (1024x768)', width: 1024, height: 768, mobile: true },
  { name: 'Desktop (1366x768)', width: 1366, height: 768, mobile: false },
];

const results = [];
const check = (dev, name, ok, detail = '') => {
  results.push({ dev, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${dev}] ${name}${detail ? ' — ' + detail : ''}`);
};

async function open(browser, d, { portrait = false } = {}) {
  const ctx = await browser.newContext({
    viewport: portrait ? { width: d.height, height: d.width } : { width: d.width, height: d.height },
    deviceScaleFactor: 2,
    isMobile: d.mobile,
    hasTouch: d.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push('request failed ' + r.url()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.clock.install();
  await page.goto(URL);
  return { ctx, page, errors };
}

const tapEl = async (page, d, sel) => (d.mobile ? page.tap(sel) : page.click(sel));
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.trim());
const hasClass = (page, sel, c) => page.$eval(sel, (e, c) => e.classList.contains(c), c);

async function layoutChecks(page, d) {
  const m = await page.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const r = (sel) => document.querySelector(sel).getBoundingClientRect();
    const inside = (b) => b.left >= -1 && b.top >= -1 && b.right <= vw + 1 && b.bottom <= vh + 1;
    const parts = ['.hud', '#sales', '#target', '#time', '#customers', '.grill-panel', '.assembly-panel', '.tray-panel', '#pauseBtn'];
    const tiles = [...document.querySelectorAll('.tile')].map((t) => t.getBoundingClientRect());
    // every control must be the topmost element at its own center (not clipped or covered)
    const hidden = ['#pauseBtn', '#soundBtn', '#grill', '#grill2', ...[...document.querySelectorAll('.tile')].map((t) => `.tile[aria-label="${t.getAttribute('aria-label')}"]`)]
      .filter(() => !document.querySelector('.overlay.show'))
      .filter((sel) => {
        const el = document.querySelector(sel);
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !inside(b) || !(hit === el || el.contains(hit));
      });
    const heads = [...document.querySelectorAll('.panel-head span')].filter((x) => x.offsetHeight > 45);
    return {
      scroll: document.scrollingElement.scrollHeight > vh + 1 || document.scrollingElement.scrollWidth > vw + 1,
      outside: parts.filter((p) => !inside(r(p))),
      minTile: Math.min(...tiles.map((t) => Math.min(t.width, t.height))),
      grill: Math.min(r('#grill').width, r('#grill').height),
      tiles: tiles.length,
      hidden,
      heads: heads.length,
    };
  });
  check(d.name, 'no page scroll', !m.scroll);
  check(d.name, 'HUD, customers, grill, assembly, tray all on screen', !m.outside.length, m.outside.join(','));
  check(d.name, '7 ingredient tiles + undo', m.tiles === 8);
  check(d.name, 'all buttons visible and tappable (pause, sound, grill, tiles)', !m.hidden.length, m.hidden.join(','));
  check(d.name, 'panel titles on one line', !m.heads);
  check(d.name, 'touch targets >= 40px', m.minTile >= 40, `smallest tile ${m.minTile.toFixed(0)}px, grill ${m.grill.toFixed(0)}px`);
}

// Plays like a person: watches the needle, taps glowing tiles, one action per `reaction` ms.
async function playFor(page, d, seconds, reaction = 450) {
  let taps = 0;
  const end = seconds * 1000;
  for (let t = 0; t < end; ) {
    const s = await page.evaluate(() => {
      const grill = document.getElementById('grill');
      const needle = parseFloat(document.getElementById('needle').style.left) || 0;
      const next = document.querySelector('.tile.next');
      return {
        cooking: grill.classList.contains('cooking'),
        full: grill.classList.contains('full'),
        needle,
        next: next ? next.dataset.key : null,
        customer: !!document.querySelector('.cust:not(.leave)'),
        result:
          document.getElementById('resultScreen').classList.contains('show') ||
          document.getElementById('time').textContent === '00:00',
      };
    });
    if (s.result) break;
    let sel = null;
    if (s.cooking && s.needle >= 42 && s.needle < 58) sel = '#grill';
    else if (!s.cooking && !s.full) sel = '#grill';
    else if (s.next && s.customer) sel = `.tile[data-key=${s.next}]`;
    if (sel) {
      await tapEl(page, d, sel);
      taps++;
      await page.clock.runFor(reaction);
      t += reaction;
    } else {
      await page.clock.runFor(100);
      t += 100;
    }
  }
  return taps;
}

async function fullGame(browser, d) {
  const { ctx, page, errors } = await open(browser, d);
  await tapEl(page, d, '#startBtn');
  await page.clock.runFor(1500);
  check(d.name, 'start screen closes, game running', !(await hasClass(page, '#startScreen', 'show')));
  check(d.name, 'first customer seated', (await page.$$('.seat .cust')).length === 1);
  check(d.name, 'seats 2-4 locked at start', (await page.$$('.seat.locked')).length === 3);

  // Rules through the UI
  await tapEl(page, d, '.tile[data-key=meat]');
  check(d.name, 'patty tile without cooked patty -> warning', (await text(page, '#toast')).includes('패티를 먼저'));
  await tapEl(page, d, '.tile[data-key=bottom]');
  await tapEl(page, d, '.tile[data-key=cheese]');
  check(d.name, 'wrong ingredient shown as wrong layer', (await page.$$('.layer.bad')).length === 1);
  check(d.name, 'undo button alerts', await hasClass(page, '.tile.undo', 'alert'));
  await tapEl(page, d, '.tile[data-key=sauce]');
  check(d.name, 'further taps blocked until undo', (await page.$$('.layer')).length === 2);
  await tapEl(page, d, '.tile.undo');
  check(d.name, 'undo removes wrong layer', (await page.$$('.layer.bad')).length === 0 && (await page.$$('.layer')).length === 1);
  check(d.name, 'next ingredient highlighted (sauce)', await hasClass(page, '.tile[data-key=sauce]', 'next'));

  // Grades
  await tapEl(page, d, '#grill');
  await page.clock.runFor(600);
  await tapEl(page, d, '#grill');
  await page.clock.runFor(100);
  check(d.name, 'early press -> MISS', (await text(page, '#grade')).startsWith('MISS'));
  await tapEl(page, d, '#grill');
  await page.clock.runFor(3000);
  await tapEl(page, d, '#grill');
  await page.clock.runFor(100);
  check(d.name, 'green press -> PERFECT', (await text(page, '#grade')) === 'PERFECT!');
  await tapEl(page, d, '#grill');
  await page.clock.runFor(4200);
  await tapEl(page, d, '#grill');
  await page.clock.runFor(100);
  check(d.name, 'yellow press -> GOOD', (await text(page, '#grade')) === 'GOOD!');
  check(d.name, 'patty stock 2/4', (await text(page, '#stockPill')) === '보관 2/4');

  // Finish the burger -> auto serve
  for (const k of ['sauce', 'pickle', 'meat', 'cheese', 'onion', 'top']) {
    await tapEl(page, d, `.tile[data-key=${k}]`);
    await page.clock.runFor(200);
  }
  await page.clock.runFor(1500);
  const sales = await text(page, '#sales');
  check(d.name, 'last ingredient auto-serves (no button)', sales !== '₩0', sales);
  check(d.name, 'customer reacts happy', (await page.$$('.cust.mood-happy, .cust.leave')).length >= 1);
  check(d.name, 'no finish/sell buttons exist', !(await page.$('#finish')) && !(await page.$('#serve')));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-serve.png` });

  // Pause freezes time
  const before = await text(page, '#time');
  await tapEl(page, d, '#pauseBtn');
  await page.clock.runFor(5000);
  check(d.name, 'pause overlay + timer frozen', (await hasClass(page, '#pauseScreen', 'show')) && (await text(page, '#time')) === before);
  await tapEl(page, d, '#resumeBtn');

  // Play the rest of the 5 minutes
  const taps = await playFor(page, d, 300);
  await page.clock.runFor(2000);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/result.png` });
  const seats = await page.$$eval('.seat', (s) => s.filter((x) => !x.classList.contains('locked')).length);
  check(d.name, 'all 4 seats open by the end', seats === 4);
  check(d.name, 'result screen after 5:00', await hasClass(page, '#resultScreen', 'show'));
  check(d.name, 'timer shows 00:00', (await text(page, '#time')) === '00:00');
  const title = await text(page, '#resultTitle');
  const money = await text(page, '#resultMoney');
  const stats = await page.$$eval('.result-stats div', (x) => x.map((e) => e.textContent).join(' · '));
  check(d.name, 'result shows title, sales, stats', /STAGE CLEAR!|TIME OVER/.test(title) && money.startsWith('₩'), `${title} ${money} | ${stats} | ${taps} taps`);

  await tapEl(page, d, '#againBtn');
  await page.clock.runFor(500);
  check(d.name, 'play again resets to ₩0 / 05:00', (await text(page, '#sales')) === '₩0' && (await text(page, '#time')).startsWith('0'));
  check(d.name, 'no JS errors / failed requests', !errors.length, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function quick(browser, d) {
  const { ctx, page, errors } = await open(browser, d);
  await layoutChecks(page, d);
  await tapEl(page, d, '#startBtn');
  await page.clock.runFor(1200);
  await layoutChecks(page, d);
  await tapEl(page, d, '#grill');
  await page.clock.runFor(2900);
  await tapEl(page, d, '#grill');
  for (const k of ['bottom', 'sauce', 'pickle', 'meat', 'cheese', 'onion', 'top']) {
    await tapEl(page, d, `.tile[data-key=${k}]`);
    await page.clock.runFor(150);
  }
  await page.clock.runFor(1500);
  check(d.name, 'touch play: burger served', (await text(page, '#sales')) !== '₩0', await text(page, '#sales'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${d.width}x${d.height}.png` });
  check(d.name, 'no JS errors / failed requests', !errors.length, errors.slice(0, 3).join(' | '));
  await ctx.close();

  if (d.mobile && d.width < 1000) {
    const p = await open(browser, d, { portrait: true });
    const shown = await p.page.$eval('#rotate', (e) => getComputedStyle(e).display !== 'none');
    check(d.name, 'portrait -> "rotate to landscape" message', shown);
    await p.ctx.close();
  }
}

async function dualGrill(browser) {
  const d = DEVICES[0];
  const { ctx, page, errors } = await open(browser, d);
  // Stop automatic clock advancement during touch actions; only runFor moves it.
  await page.clock.pauseAt(await page.evaluate(() => new Date(Date.now() + 1000).toISOString()));
  await tapEl(page, d, '#startBtn');
  // Settle the optional fullscreen transition and decode the first portrait
  // before measuring cooking time; neither belongs to the gauge assertion.
  await page.clock.runFor(1500);
  await page.locator('.cust-portrait').evaluate(img => img.decode());
  await tapEl(page, d, '#grill');
  await page.clock.runFor(1500);
  await tapEl(page, d, '#grill2');
  await page.clock.runFor(1500);
  const needles = await page.$$eval('.needle', els => els.map(el => parseFloat(el.style.left)));
  check(d.name, 'two independent grill gauges', Math.abs(needles[0] - 50) < 2 && Math.abs(needles[1] - 25) < 2, needles.join(' / '));
  await tapEl(page, d, '#pauseBtn');
  const atPause = await page.$$eval('.needle', els => els.map(el => parseFloat(el.style.left)));
  await page.clock.runFor(5000);
  const paused = await page.$$eval('.needle', els => els.map(el => parseFloat(el.style.left)));
  check(d.name, 'pause freezes both gauges', JSON.stringify(paused) === JSON.stringify(atPause));
  await tapEl(page, d, '#resumeBtn');
  await tapEl(page, d, '#grill');
  check(d.name, 'first patty finished while second keeps cooking', await hasClass(page, '#grill2', 'cooking'));
  await page.clock.runFor(1500);
  await tapEl(page, d, '#grill2');
  check(d.name, 'both patties stored with separate PERFECT grades', (await text(page, '#stockPill')) === '보관 2/4' && (await text(page, '#grade2')) === 'PERFECT!');
  await tapEl(page, d, '#grill');
  await tapEl(page, d, '#grill2');
  await page.clock.runFor(3000);
  await tapEl(page, d, '#grill');
  await tapEl(page, d, '#grill2');
  check(d.name, 'storage holds four patties', (await text(page, '#stockPill')) === '보관 4/4');
  await tapEl(page, d, '#grill2');
  check(d.name, 'full storage prevents another cook', !(await hasClass(page, '#grill2', 'cooking')));
  check(d.name, 'dual grill has no JS errors / failed requests', !errors.length, errors.join(' | '));
  await ctx.close();
}

async function customerCast(browser) {
  for (const d of [DEVICES[0], DEVICES[5]]) {
    const { ctx, page, errors } = await open(browser, d);
    await tapEl(page, d, '#startBtn');
    await tapEl(page, d, '#pauseBtn');
    // Fixture the selected portraits while paused to inspect every asset,
    // including characters not randomly drawn during the gameplay checks.
    await page.evaluate(() => document.getElementById('pauseScreen').classList.remove('show'));
    for (const offset of [0, 4]) {
      const result = await page.evaluate(async offset => {
        const { CUSTOMERS } = await import('./js/customers.js');
        const { customerPortrait } = await import('./js/art.js');
        const selected = CUSTOMERS.slice(offset, offset + 4);
        const seats = [...document.querySelectorAll('.seat')];
        seats.forEach((seat, i) => {
          seat.className = 'seat';
          seat.innerHTML = selected[i]
            ? `<div class="cust mood-normal" style="animation:none">${customerPortrait(offset + i)}</div>`
            : '';
        });
        await Promise.all([...document.querySelectorAll('.cust-portrait')].map(img => img.decode()));
        const loaded = [...document.querySelectorAll('.cust-portrait')].every((img, i) => img.naturalWidth > 0 && img.dataset.customer === selected[i].id);
        const contained = [...document.querySelectorAll('.cust-art')].every(el => {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.top >= document.querySelector('.hud').getBoundingClientRect().bottom && r.right <= innerWidth && r.bottom <= innerHeight;
        });
        const legacy = !!document.querySelector('.cust-svg');
        return { loaded, contained, legacy, count: selected.length };
      }, offset);
      check(d.name, `selected customer portraits ${offset + 1}-${offset + result.count} load`, result.loaded);
      check(d.name, 'portraits stay below HUD and inside screen', result.contained);
      check(d.name, 'no legacy customer SVGs', !result.legacy);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/cast-${d.width}-${offset}.png` });
    }
    check(d.name, 'customer assets have no failed requests', !errors.length, errors.join(' | '));
    await ctx.close();
  }
}

const browser = await launch();
for (const d of DEVICES) await quick(browser, d);
await customerCast(browser);
await dualGrill(browser);
await fullGame(browser, DEVICES[0]);
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
