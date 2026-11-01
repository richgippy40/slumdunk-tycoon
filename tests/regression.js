// SLUMDUNK TYCOON regression test (V0.2 gameplay baseline).
// Run in the browser console of a freshly loaded game page (before pressing "영업 시작!"):
//   await (await import('/tests/regression.js')).run()            -> part 1: rules + first sale + stage clear
//   await (await import('/tests/regression.js')).run({timeOver:true}) -> part 2: time over (reload first)
// The game clock is virtual: performance.now and requestAnimationFrame are replaced, and the test
// advances time frame by frame. Results do not depend on real waits or on Chrome frame throttling.

const FRAME = 50; // ms of game time per frame (the game clamps dt to 200 ms)
let vnow = 0;
let queue = [];

function installClock() {
  vnow = performance.now();
  performance.now = () => vnow;
  window.requestAnimationFrame = (cb) => queue.push(cb);
}

function advance(ms) {
  for (let t = 0; t < ms; t += FRAME) frame();
}

function frame() {
  vnow += FRAME;
  const q = queue;
  queue = [];
  q.forEach((cb) => cb(vnow));
}

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = () => parseInt($('cookpercent').textContent, 10);
const ingButtons = () => [...$('ingredients').querySelectorAll('button')];
const ing = (label) => ingButtons().find((b) => b.textContent.replace('✓ ', '') === label);

function snap() {
  return {
    sales: $('sales').textContent,
    salesbar: $('salesbar').style.width,
    orderno: $('orderno').textContent,
    customer: $('customername').textContent + ' ' + $('person').textContent,
    patty: $('patty').getAttribute('src'),
    cook: $('cook').textContent + ($('cook').disabled ? ' [disabled]' : ''),
    cookstate: $('cookstate').textContent,
    step: $('step').textContent,
    ingredients: ingButtons().map((b) => b.textContent + (b.disabled ? '' : ' *')).join(' | '),
    stack: [...$('stack').children].map((e) => e.className).join(' / '),
    finish: $('finish').disabled ? 'disabled' : 'enabled',
    serve: $('serve').disabled ? 'disabled' : 'enabled',
    readycount: $('readycount').textContent,
    servestate: $('servestate').textContent,
    notice: $('notice').textContent,
  };
}

// Start cooking and press again when the gauge is inside [lo, hi).
async function cookTo(lo, hi) {
  $('cook').click();
  let frames = 0;
  while (!(pct() >= lo && pct() < hi)) {
    if (++frames > 400) throw new Error('gauge never reached ' + lo);
    frame();
  }
  const at = pct();
  $('cook').click();
  return at;
}

const RECIPE = ['아랫번', '기본소스', '피클', '소고기 패티', '치즈', '카라멜어니언', '윗번'];

async function sellOne() {
  await cookTo(50, 65);
  for (const n of RECIPE) {
    ing(n).click();
    await wait(5);
  }
  $('finish').click();
  await wait(5);
  $('serve').click();
  await wait(5);
}

export async function run({ timeOver = false } = {}) {
  installClock();
  const log = [];
  const check = (name, cond, detail) => log.push({ name, ok: !!cond, detail });
  const steps = {};

  steps.initial = snap();
  check('intro shown before start', $('intro').classList.contains('show'));
  check('target 350,000원', $('target').firstChild.nodeValue === '350,000원');
  check('timer 05:00', $('time').textContent === '05:00');
  check('recipe order text', $('recipelist').textContent ===
    '1. 아랫번  →  2. 기본소스  →  3. 피클  →  4. 소고기 패티  →  5. 치즈  →  6. 카라멜어니언  →  7. 윗번');
  check('all ingredients disabled before start', ingButtons().every((b) => b.disabled));

  $('recipe').click();
  check('recipe modal opens', $('recipeModal').classList.contains('show'));
  $('closeRecipe').click();
  check('recipe modal closes', !$('recipeModal').classList.contains('show'));

  $('start').click();
  advance(1000);
  check('intro hidden after start', !$('intro').classList.contains('show'));
  check('timer running', $('time').textContent !== '05:00', $('time').textContent);

  if (timeOver) {
    advance(300 * 1000);
    steps.timeOver = {
      title: $('resulttitle').textContent,
      desc: $('resultdesc').textContent,
      money: $('resultmoney').textContent,
      small: $('resultsmall').textContent,
      time: $('time').textContent,
    };
    check('TIME OVER shown', steps.timeOver.title === 'TIME OVER');
    check('timer at 00:00', steps.timeOver.time === '00:00');
    // Known V0.2 behavior: end() does not re-render, so the next ingredient button stays enabled;
    // the full-screen result overlay is what blocks input.
    check('result overlay blocks the board', getComputedStyle($('result')).position === 'fixed');
    check('next ingredient still enabled (known V0.2 behavior)', !ing('아랫번').disabled);
    return { log, steps, pass: log.every((c) => c.ok) };
  }

  steps.started = snap();
  check('only 아랫번 enabled', ingButtons().filter((b) => !b.disabled).map((b) => b.textContent).join() === '아랫번');

  // Undercooked
  steps.underAt = await cookTo(10, 30);
  steps.under = snap();
  check('undercooked -> raw', steps.under.patty === 'assets/beef_raw.webp' && steps.under.notice.includes('설익'));

  // Burnt by late press, then discard
  steps.lateAt = await cookTo(80, 95);
  steps.late = snap();
  check('late press -> burnt', steps.late.patty === 'assets/beef_burnt.webp' && steps.late.cook === '탄 패티 버리기');
  $('cook').click();
  await wait(30);
  steps.discard = snap();
  check('discard burnt -> raw', steps.discard.patty === 'assets/beef_raw.webp' && steps.discard.cook === '조리 시작');

  // Auto-burn at 100%
  $('cook').click();
  frame();
  steps.cooking = snap();
  check('cooking visual', steps.cooking.patty === 'assets/beef_cooking.webp' && steps.cooking.cook === '패티 꺼내기');
  advance(7300);
  steps.autoBurn = snap();
  check('auto-burn at 100%', steps.autoBurn.patty === 'assets/beef_burnt.webp' && pct() === 100);
  $('cook').click();
  await wait(30);

  // Assembly before patty ready: meat must stay disabled
  for (const n of RECIPE.slice(0, 3)) {
    ing(n).click();
    await wait(10);
  }
  steps.waitMeat = snap();
  check('meat disabled without cooked patty', ing('소고기 패티').disabled);

  // Perfect
  steps.goodAt = await cookTo(50, 65);
  steps.good = snap();
  check('green press -> ready', steps.good.patty === 'assets/beef_ready.webp' && steps.good.cook === '조리 완료 [disabled]');
  // Known V0.2 bug: the cook handler does not re-render the ingredient buttons, so a patty cooked
  // after earlier layers were added stays locked until something re-renders (here: undo + redo).
  check('meat still locked after cook (known V0.2 bug)', ing('소고기 패티').disabled);
  $('undo').click();
  await wait(10);
  ing('피클').click();
  await wait(10);
  check('meat enabled after re-render', !ing('소고기 패티').disabled);

  ing('소고기 패티').click();
  await wait(10);
  steps.meatAdded = snap();
  check('meat consumes patty', steps.meatAdded.patty === 'assets/beef_raw.webp' && steps.meatAdded.step === '4 / 7');

  $('undo').click();
  await wait(10);
  steps.undoMeat = snap();
  check('undo meat restores patty', steps.undoMeat.patty === 'assets/beef_ready.webp' && steps.undoMeat.step === '3 / 7');

  for (const n of RECIPE.slice(3)) {
    ing(n).click();
    await wait(10);
  }
  steps.full = snap();
  check('7/7 enables finish', steps.full.step === '7 / 7' && steps.full.finish === 'enabled' && steps.full.serve === 'disabled');

  $('finish').click();
  await wait(10);
  steps.finished = snap();
  check('finish -> 1 burger, serve enabled', steps.finished.readycount === '완성 버거 1개' && steps.finished.serve === 'enabled');

  $('serve').click();
  await wait(50);
  steps.served = snap();
  check('sale +8,900원', steps.served.sales === '8,900원' && steps.served.orderno === '주문 #2');
  check('next customer', steps.served.customer === '손님 2 👩');
  check('float money shown', !!document.querySelector('.floatmoney'));
  check('board reset', steps.served.step === '0 / 7' && steps.served.patty === 'assets/beef_raw.webp');

  // Play to stage clear (350,000 / 8,900 -> 40 sales)
  for (let i = 0; i < 60 && !$('result').classList.contains('show'); i++) await sellOne();
  steps.clear = {
    title: $('resulttitle').textContent,
    desc: $('resultdesc').textContent,
    money: $('resultmoney').textContent,
    small: $('resultsmall').textContent,
  };
  check('STAGE CLEAR at 40 sales', steps.clear.title === 'STAGE CLEAR!' && steps.clear.money === '356,000원');

  return { log, steps, pass: log.every((c) => c.ok) };
}
