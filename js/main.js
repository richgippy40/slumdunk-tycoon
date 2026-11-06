// SLUMDUNK TYCOON — screen, input, effects. Game rules live in logic.js, stage data in stages.js.
import {
  LABELS, createGame, update, tapGrill, tapIngredient, undo, cookProgress,
  nextIngredient, customerMood, patienceLeft, pattyCapacityUsed, currentRecipe, currentBurger,
  targetCustomer, burgerOf, tapFryer, tapDrink, fryProgress, pourProgress, sideShortfall, drinksReserved,
} from './logic.js';
import { STAGES, stageById } from './stages.js';
import { loadProgress, recordResult, isUnlocked } from './save.js';
import * as art from './art.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const won = (n) => '₩' + n.toLocaleString('ko-KR');
const pad2 = (n) => String(n).padStart(2, '0');
const unlockAll = new URLSearchParams(location.search).get('unlock') === 'all';
let progress = loadProgress();
let cfg = STAGES[0];
// Stage 2+ only extras (Stage 1 keeps its exact V0.3 look).
const plus = () => cfg.id > 1;
const multiMenu = () => !!cfg.burgers;

document.body.insertAdjacentHTML('afterbegin', art.DEFS);
$('neon').innerHTML = art.neonBurger;
$('bottles').innerHTML = art.bottlesSVG;
$('flameIcon').innerHTML = art.flameSVG;
$('stackIcon').innerHTML = art.stackSVG;
$('trayIcon').innerHTML = art.trayTitleSVG;
$('timerIcon').innerHTML = art.timerSVG;
$('fryerArt').innerHTML = art.fryerSVG;
$('fountainArt').innerHTML = art.fountainSVG;
$('friesIcon').innerHTML = art.friesSVG;
$('drinkIcon').innerHTML = art.drinkSVG;

// ---------- Screen fit: stage 1280–1600 × 720, scaled to the viewport ----------
const stage = $('stage');
// Read CSS env() insets without changing the document's layout or hit testing.
const safeArea = document.createElement('div');
safeArea.id = 'viewport-safe-area';
safeArea.setAttribute('aria-hidden', 'true');
document.body.append(safeArea);
let scale = 1;
function fit() {
  const viewport = window.visualViewport;
  const insets = getComputedStyle(safeArea);
  const top = parseFloat(insets.paddingTop) || 0;
  const right = parseFloat(insets.paddingRight) || 0;
  const bottom = parseFloat(insets.paddingBottom) || 0;
  const left = parseFloat(insets.paddingLeft) || 0;
  const vw = (viewport?.width ?? window.innerWidth) - left - right;
  const vh = (viewport?.height ?? window.innerHeight) - top - bottom;
  if (vw <= 0 || vh <= 0) return; // Rotation can briefly report an empty viewport.
  // The absolute stage uses document coordinates; visualViewport offsets are
  // relative to the layout viewport and can change without a window resize.
  const x = window.scrollX + (viewport?.offsetLeft || 0) + left;
  const y = window.scrollY + (viewport?.offsetTop || 0) + top;
  scale = vh / 720;
  let w = vw / scale;
  if (w < 1280) {
    scale = vw / 1280;
    w = 1280;
  }
  w = Math.min(w, 1600);
  stage.style.width = w + 'px';
  stage.style.transform = `translate(${x + (vw - w * scale) / 2}px, ${y + (vh - 720 * scale) / 2}px) scale(${scale})`;
  document.body.classList.toggle('portrait', vh > vw);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
window.addEventListener('pageshow', fit);
window.visualViewport?.addEventListener('resize', fit);
window.visualViewport?.addEventListener('scroll', fit);
fit();

// Position of an element's center in stage coordinates.
function center(el) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale };
}

// ---------- Static UI ----------
const seats = [];
for (let i = 0; i < 4; i++) {
  const el = document.createElement('div');
  el.className = 'seat';
  $('customers').append(el);
  seats.push({ el, key: '' });
}

// Contextual tray: 7 slots show the ingredients of the burger being made, in recipe order.
// Stage 1 has one recipe, so its tray never changes.
const TRAY_SLOTS = 7;
const slotTiles = [];
let tiles = {};
for (let i = 0; i < TRAY_SLOTS; i++) {
  const b = document.createElement('button');
  b.className = 'tile';
  $('tray').append(b);
  slotTiles.push(b);
  press(b, () => b.dataset.key && act(() => tapIngredient(game, b.dataset.key)));
}
const undoTile = document.createElement('button');
undoTile.className = 'tile undo';
undoTile.setAttribute('aria-label', '취소');
undoTile.innerHTML = art.undoSVG;
$('tray').append(undoTile);
press(undoTile, () => act(() => undo(game)));

let trayKey = '';
function setTray(recipe) {
  const keys = [...new Set(recipe)];
  const key = keys.join(',');
  if (key === trayKey) return false;
  const swap = trayKey !== '';
  trayKey = key;
  tiles = {};
  slotTiles.forEach((b, i) => {
    const k = keys[i];
    b.className = 'tile' + (k ? '' : ' off');
    if (k) {
      b.dataset.key = k;
      b.setAttribute('aria-label', LABELS[k]);
      b.removeAttribute('aria-hidden');
      b.innerHTML = art.ICONS[k] + (k === 'meat' ? '<span class="badge zero">0</span>' : '');
      tiles[k] = b;
      if (swap) flash(b, 'swap', 300);
    } else {
      delete b.dataset.key;
      b.setAttribute('aria-hidden', 'true');
      b.innerHTML = '';
    }
  });
  return true;
}

let recipeKey = '';
let recipeIcons = [];
function setRecipe(recipe) {
  const key = recipe.join(',');
  if (key === recipeKey) return;
  recipeKey = key;
  $('recipe').innerHTML = '';
  recipeIcons = recipe.map((k) => {
    const i = document.createElement('i');
    i.innerHTML = art.ICONS[k];
    $('recipe').append(i);
    return i;
  });
}

const firstGrill = $('grill');
const grillRow = document.createElement('div');
grillRow.className = 'grill-row';
firstGrill.before(grillRow);
grillRow.append(firstGrill);
const secondGrill = firstGrill.cloneNode(true);
secondGrill.id = 'grill2';
secondGrill.querySelectorAll('[id]').forEach(el => { el.id += '2'; });
grillRow.append(secondGrill);
const grillElements = [firstGrill, secondGrill];
const z = STAGES[0].zones;
grillElements.forEach((grill, lane) => {
  grill.setAttribute('aria-label', `그릴 ${lane + 1}: 탭해서 굽기 / 꺼내기`);
  grill.tabIndex = 0;
  const gauge = grill.querySelector('.gauge');
  gauge.querySelector('.z-raw').style.width = z.raw * 100 + '%';
  gauge.querySelector('.z-perfect').style.width = (z.perfect - z.raw) * 100 + '%';
  gauge.querySelector('.z-good').style.width = (z.good - z.perfect) * 100 + '%';
  gauge.querySelector('.z-burnt').style.width = (1 - z.good) * 100 + '%';
  press(grill, () => act(() => tapGrill(game, lane)));
  grill.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) act(() => tapGrill(game, lane));
    }
  });
});
press($('fryer'), () => act(() => tapFryer(game)));
press($('fountain'), () => act(() => tapDrink(game)));

// ---------- Input ----------
function press(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 120);
    fn();
  });
}

let game = null;
let running = false;
let paused = false;
let last = 0;

function act(fn) {
  if (!running || paused || !game) return;
  fn();
  handleEvents();
  render();
}

press($('pauseBtn'), () => running && setPaused(true));
press($('resumeBtn'), () => setPaused(false));
press($('restartBtn'), () => start());
press($('quitBtn'), () => showSelect());
press($('againBtn'), () => start());
press($('menuBtn'), () => showSelect());
press($('nextBtn'), () => {
  const next = stageById(cfg.id + 1);
  if (next) showIntro(next);
});
press($('backBtn'), () => showSelect());
press($('startBtn'), () => {
  sfx.unlock();
  goFullscreen();
  start();
});
press($('soundBtn'), () => {
  sfx.unlock();
  sfx.setMuted(!sfx.muted);
  drawSoundBtn();
});
function drawSoundBtn() {
  $('soundBtn').innerHTML = sfx.muted
    ? '<svg viewBox="0 0 32 32"><path d="M5 12h6l7-6v20l-7-6H5z" fill="#fff"/><path d="M22 11l7 10M29 11l-7 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 32 32"><path d="M5 12h6l7-6v20l-7-6H5z" fill="#fff"/><path d="M22 11q4 5 0 10M25 7q8 9 0 18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
}
drawSoundBtn();

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (!running && $('startScreen').classList.contains('show')) {
      sfx.unlock();
      return start();
    }
    act(() => tapGrill(game));
  } else if (e.key >= '1' && e.key <= '7') {
    const k = slotTiles[e.key - 1].dataset.key;
    if (k) act(() => tapIngredient(game, k));
  } else if (e.key === 'f') act(() => tapFryer(game));
  else if (e.key === 'd') act(() => tapDrink(game));
  else if (e.key === 'Backspace' || e.key === 'z') act(() => undo(game));
  else if (e.key === 'Escape' || e.key === 'p') running && setPaused(!paused);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && running && !paused) setPaused(true);
});

function goFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement) return;
  Promise.resolve(req.call(el, { navigationUI: 'hide' }))
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

function setPaused(p) {
  paused = p;
  $('pauseScreen').classList.toggle('show', p);
  if (!p) last = performance.now();
  sfx.setSizzle(!p && game && game.grills.some(grill => grill.cooking));
}

// ---------- Stage select & intro ----------
const OVERLAYS = ['selectScreen', 'startScreen', 'pauseScreen', 'resultScreen'];
function showOverlay(id) {
  OVERLAYS.forEach((o) => $(o).classList.toggle('show', o === id));
}

const STAGE_ICONS = {
  1: art.burgerIcon,
  2: `<span class="combo-art">${art.burgerIcon}${art.friesSVG}${art.drinkSVG}</span>`,
  3: `<span class="trio-art">${art.BURGER_ICONS.bacon}${art.burgerIcon}${art.BURGER_ICONS.allday}</span>`,
  4: `<span class="rush-art">${art.BURGER_ICONS.bacon}<b>RUSH!</b></span>`,
  5: `<span class="grand-art">${art.crownSVG}${art.BURGER_ICONS.grand}</span>`,
};
const stars = (n, max = 3) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');

function showSelect() {
  running = false;
  paused = false;
  sfx.setSizzle(false);
  progress = loadProgress();
  let total = 0;
  $('stageCards').innerHTML = '';
  for (const s of STAGES) {
    const rec = progress.stages[s.id];
    const open = isUnlocked(progress, s.id, unlockAll);
    total += rec?.stars || 0;
    const b = document.createElement('button');
    b.className = 'stage-card' + (open ? '' : ' locked') + (rec?.cleared ? ' cleared' : '');
    b.dataset.stage = s.id;
    b.setAttribute('aria-label', `STAGE ${pad2(s.id)} ${s.name}${open ? '' : ' (잠김)'}`);
    b.innerHTML = `<span class="sc-no">STAGE ${pad2(s.id)}</span>
      <span class="sc-art">${STAGE_ICONS[s.id]}</span>
      <span class="sc-name">${s.name}</span>
      <span class="sc-stars">${stars(rec?.stars || 0)}</span>
      <span class="sc-best">${rec?.best ? 'BEST ' + won(rec.best) : open ? s.title : '이전 스테이지 클리어 시 오픈'}</span>
      ${open ? '' : `<span class="sc-lock">${art.lockSVG}</span>`}`;
    press(b, () => {
      if (!open) {
        flash(b, 'shake');
        sfx.unlock();
        sfx.play('wrong');
        return;
      }
      sfx.unlock();
      sfx.play('tap');
      showIntro(s);
    });
    $('stageCards').append(b);
  }
  $('starTotal').textContent = `★ ${total} / ${STAGES.length * 3}`;
  showOverlay('selectScreen');
}

function applyStage(s) {
  cfg = s;
  stage.classList.toggle('has-sides', !!cfg.sides);
  stage.classList.toggle('plus', plus());
  stage.classList.remove('fever', 'rush', 'lastcall');
  $('stageNo').textContent = `STAGE ${pad2(cfg.id)}`;
  $('stageName').textContent = cfg.name;
  $('target').textContent = won(cfg.target);
  $('goalText').textContent = won(cfg.target);
  $('comboMeter').classList.toggle('on', !!cfg.combo);
}

function showIntro(s) {
  applyStage(s);
  $('introSub').textContent = `STAGE ${pad2(s.id)} · ${s.name}`;
  $('howto').innerHTML = s.howto.map((h) => `<li>${h}</li>`).join('');
  showOverlay('startScreen');
}

// ---------- Game flow ----------
function start() {
  applyStage(cfg);
  game = createGame(cfg);
  running = true;
  paused = false;
  last = performance.now();
  seats.forEach((s) => (s.key = ''));
  stackKey = '';
  lastSec = -1;
  trayKey = '';
  recipeKey = '';
  bannerQueue.length = 0;
  $('banner').className = 'banner';
  $('fx').innerHTML = '';
  $('confetti').innerHTML = '';
  showOverlay(null);
  sfx.setSizzle(false);
  render();
}

function frame(now) {
  if (running && !paused) {
    update(game, (now - last) / 1000);
    handleEvents();
    render();
  }
  last = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Events -> sound, toasts, effects ----------
let toastTimer = 0;
function toast(msg, warn = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('warn', warn);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// Big center banner for stage beats (RUSH HOUR, NEW MENU, FEVER...). Queued, never stacked.
const bannerQueue = [];
let bannerBusy = false;
function banner(html, cls = '') {
  bannerQueue.push({ html, cls });
  if (!bannerBusy) nextBanner();
}
function nextBanner() {
  const b = bannerQueue.shift();
  if (!b) return (bannerBusy = false);
  bannerBusy = true;
  const el = $('banner');
  el.innerHTML = b.html;
  el.className = 'banner ' + b.cls;
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(nextBanner, 250);
  }, 1500);
}

function flash(el, cls, ms = 700) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function handleEvents() {
  const evs = game.events.splice(0);
  for (const e of evs) {
    switch (e.type) {
      case 'cookStart':
        sfx.play('tap');
        sfx.setSizzle(true);
        break;
      case 'cooked': {
        sfx.setSizzle(game.grills.some(grill => grill.cooking));
        const g = grillElements[e.lane].querySelector('.grade');
        g.className = 'grade ' + e.grade;
        g.textContent = e.grade === 'MISS' ? (e.reason === 'raw' ? 'MISS · 덜 익음' : 'MISS · 탔어요') : e.grade + '!';
        void g.offsetWidth;
        g.classList.add('show');
        sfx.play(e.grade.toLowerCase());
        if (e.grade !== 'MISS' && tiles.meat) flash(tiles.meat, 'pressed', 150);
        break;
      }
      case 'grillFull':
        toast(`패티 공간이 부족해요 (굽기·조립 포함 ${cfg.pattyStockMax}개)`, true);
        flash(grillElements[e.lane], 'shake');
        sfx.play('wrong');
        break;
      case 'needPatty':
        toast('그릴에서 패티를 먼저 구워주세요', true);
        flash($('grill'), 'shake');
        if (tiles.meat) flash(tiles.meat, 'shake');
        sfx.play('wrong');
        break;
      case 'blocked':
        toast('순서가 틀렸어요! ↶ 취소를 눌러주세요', true);
        flash(undoTile, 'alert', 900);
        sfx.play('wrong');
        break;
      case 'placed':
        if (e.ok) sfx.play('place');
        else {
          sfx.play('wrong');
          toast('순서가 틀렸어요! ↶ 취소로 빼주세요', true);
        }
        break;
      case 'undo':
        sfx.play('tap');
        break;
      case 'plateBusy':
        toast(plus() ? waitingHint() : '완성된 버거가 손님을 기다리고 있어요');
        break;
      case 'complete':
        flash($('sparkle'), 'show', 650);
        if (plus()) flash($('stack'), 'squash', 400);
        break;
      case 'served':
        serveFx(e);
        break;
      case 'arrive':
        sfx.play('arrive');
        break;
      case 'left':
        sfx.play('angry');
        toast('손님이 기다리다 떠났어요…', true);
        break;
      case 'slotUnlocked':
        if (e.slot > 0) {
          sfx.play('unlock');
          toast('새 좌석 오픈! 손님이 늘어나요');
          const el = seats[e.slot].el;
          el.classList.add('unlocking');
        }
        break;
      // ----- Stage 2+ -----
      case 'fryStart':
        sfx.play('fry');
        break;
      case 'friesDone':
        sfx.play('ding');
        flash($('fryer'), 'done', 600);
        floatText(`+${cfg.sides.fries.batch}`, center($('fryer')).x, center($('fryer')).y - 70, 'side');
        break;
      case 'pourStart':
        sfx.play('pour');
        break;
      case 'drinkDone':
        sfx.play('tap');
        flash($('fountain'), 'done', 500);
        break;
      case 'fryerBusy':
        toast('감자튀김을 튀기는 중이에요');
        break;
      case 'friesFull':
        toast(`감자튀김이 충분해요 (최대 ${cfg.sides.fries.max}개)`);
        break;
      case 'drinksFull':
        toast(`음료가 충분해요 (최대 ${cfg.sides.drink.max}잔)`);
        break;
      case 'newMenu':
        sfx.play('unlock');
        banner(`<small>NEW MENU!</small>${art.burgerIconFor(e.burger)}<b>${burgerOf(game, e.burger).name}</b>`, 'menu');
        break;
      case 'rushStart':
        sfx.play('rush');
        stage.classList.add('rush');
        banner('<b>RUSH HOUR!</b><small>서빙마다 +₩1,000</small>', 'rush');
        break;
      case 'rushEnd':
        stage.classList.remove('rush');
        banner('<small>잠깐 숨 돌려요</small><b>NICE!</b>', 'calm');
        break;
      case 'fever':
        sfx.play('fever');
        stage.classList.add('fever');
        banner(`<b>FEVER TIME!</b><small>${cfg.combo.feverTime}초 동안 매출 ×${cfg.combo.feverMult}</small>`, 'fever');
        break;
      case 'comboBreak':
        if (e.combo >= 3) toast(`${e.combo} COMBO 끊김! 다시 이어가요`, true);
        flash($('comboMeter'), 'shake');
        break;
      case 'lastCall':
        sfx.play('rush');
        stage.classList.add('lastcall');
        banner(`<b>LAST CALL!</b><small>마지막 30초 매출 ×${cfg.lastCall.mult}</small>`, 'fever');
        break;
      case 'vip':
        sfx.play('vip');
        banner(`${art.crownSVG}<b>VIP 손님!</b><small>슬럼덩크 그랜드 세트 주문</small>`, 'vip');
        break;
      case 'group':
        sfx.play('unlock');
        banner(`<b>단체 손님 ${e.size}명!</b><small>모두 서빙하면 +${won(cfg.groups.bonus)}</small>`, 'menu');
        break;
      case 'groupDone': {
        sfx.play('fever');
        const at = center(seats[e.slots[0]].el);
        setTimeout(() => floatText(`단체 보너스 +${won(e.bonus)}`, at.x + 60, at.y - 170, 'tip'), 500);
        break;
      }
      case 'end':
        finish(e);
        break;
    }
  }
}

function waitingHint() {
  const c = targetCustomer(game);
  if (c && c.order.fries && !game.fries) return '감자튀김이 필요해요! 프라이어를 탭하세요';
  if (c && c.order.drink && !game.drinks) return '음료가 필요해요! 음료 기계를 탭하세요';
  return '완성된 버거가 손님을 기다리고 있어요';
}

function flyItem(html, cls, from, to, delay = 0) {
  const fx = $('fx');
  const b = document.createElement('div');
  b.className = cls;
  b.innerHTML = html;
  fx.append(b);
  const a = b.animate(
    [
      { transform: `translate(${from.x - 55}px, ${from.y - 60}px) scale(1.4)` },
      { transform: `translate(${(from.x + to.x) / 2 - 55}px, ${Math.min(from.y, to.y) - 160}px) scale(1.1)`, offset: 0.5 },
      { transform: `translate(${to.x - 55}px, ${to.y - 40}px) scale(0.7)`, opacity: 0.9 },
    ],
    { duration: 480, easing: 'ease-in-out', delay, fill: 'backwards' },
  );
  a.onfinish = () => b.remove();
  return a;
}

function serveFx(e) {
  const fx = $('fx');
  const from = center($('board'));
  const seat = seats[e.slot].el;
  const to = center(seat);
  to.y -= 40;
  const money = center($('sales'));

  if (e.order?.fries) flyItem(art.friesSVG, 'flyside', center($('fryer')), to, 60);
  if (e.order?.drink) flyItem(art.drinkSVG, 'flyside', center($('fountain')), to, 120);
  flyItem(e.menu ? art.burgerIconFor(e.menu) : art.burgerIcon, 'flyburger', from, to).onfinish = (ev) => {
    ev.target.effect?.target?.remove();
    sfx.play('happy');
    sfx.play('coin');
    floatText(`+${won(e.total - e.tip)}`, to.x, to.y - 140, e.mult > 1 ? 'fever' : '');
    if (e.tip) setTimeout(() => floatText(`TIP +${won(e.tip)}`, to.x, to.y - 100, 'tip'), 180);
    if (e.setBonus) setTimeout(() => floatText('SET!', to.x - 90, to.y - 60, 'set'), 260);
    if (e.combo >= 2) {
      const cm = center($('comboMeter'));
      floatText(`${e.combo} COMBO${e.comboBonus ? ' +' + won(e.comboBonus) : ''}`, cm.x + 30, cm.y + 90, 'combo');
      flash($('comboMeter'), 'bump', 400);
    }
    for (let i = 0; i < 7; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.innerHTML = art.coinSVG;
      fx.append(c);
      const sx = to.x - 20 + (Math.random() - 0.5) * 60;
      const sy = to.y - 40 + (Math.random() - 0.5) * 30;
      c.animate(
        [
          { transform: `translate(${sx}px, ${sy}px) scale(0.6)`, opacity: 0 },
          { transform: `translate(${sx + (Math.random() - 0.5) * 80}px, ${sy - 70}px) scale(1.1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${money.x - 20}px, ${money.y - 20}px) scale(0.6)`, opacity: 0.9 },
        ],
        { duration: 700 + i * 60, easing: 'ease-in', delay: i * 30, fill: 'backwards' },
      ).onfinish = () => {
        c.remove();
        if (i === 6) flash($('sales').parentElement, 'bump', 400);
      };
    }
  };
}

function floatText(text, x, y, cls = '') {
  const f = document.createElement('div');
  f.className = 'float ' + cls;
  f.textContent = text;
  f.style.left = x + 'px';
  f.style.top = y + 'px';
  $('fx').append(f);
  f.animate(
    [
      { transform: 'translate(-50%, 20px) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, 0) scale(1.15)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -50px) scale(1)', opacity: 0 },
    ],
    { duration: 1300, easing: 'ease-out' },
  ).onfinish = () => f.remove();
}

function confetti(n) {
  const box = $('confetti');
  box.innerHTML = '';
  const colors = ['#f5be45', '#d92d2f', '#fff0d7', '#80b69a', '#ff7a3c'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 1.2 + 's';
    c.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
    c.style.setProperty('--r', Math.random() * 720 - 360 + 'deg');
    box.append(c);
  }
}

function finish(r) {
  running = false;
  sfx.setSizzle(false);
  sfx.play('end');
  stage.classList.remove('fever', 'rush', 'lastcall');
  const saved = recordResult(progress, cfg.id, r);
  progress = saved.progress;
  const next = stageById(cfg.id + 1);
  const grand = cfg.id === STAGES.length && r.cleared;
  $('resultTitle').textContent = grand ? 'GRAND OPENING!' : r.cleared ? 'STAGE CLEAR!' : 'TIME OVER';
  $('resultTitle').classList.toggle('fail', !r.cleared);
  $('resultTitle').classList.toggle('grand', grand);
  $('resultDesc').textContent = r.cleared
    ? cfg.clearText
    : `목표까지 ${won(cfg.target - r.sales)} 부족해요. 다시 도전!`;
  $('resultMoney').textContent = won(r.sales);
  $('resultStars').innerHTML = stars(r.stars);
  $('resultStars').classList.toggle('none', !r.stars);
  $('resultBest').textContent = saved.newBest
    ? 'NEW BEST!'
    : saved.firstClear && next ? `STAGE ${pad2(next.id)} 오픈!` : `BEST ${won(progress.stages[cfg.id].best)}`;
  $('resultBest').classList.toggle('hot', saved.newBest || (saved.firstClear && !!next));
  const burgers = ['판매한 버거', r.served + '개'];
  const stats = cfg.id === 1
    ? [burgers, ['받은 팁', won(r.tips)], ['PERFECT', r.grades.PERFECT + '회'], ['PERFECT 보너스', won(r.bonus)], ['MISS', r.grades.MISS + '회'], ['놓친 손님', r.lost + '명']]
    : [
        burgers,
        cfg.groups ? ['단체 · VIP', `${r.groups}팀 · ${r.vip}명`] : ['세트 완성', r.sets + '개'],
        cfg.combo ? ['최고 콤보', r.bestCombo + '연속'] : ['받은 팁', won(r.tips)],
        ['PERFECT', r.grades.PERFECT + '회'],
        cfg.combo ? ['FEVER', r.fevers + '회'] : ['보너스', won(r.bonus)],
        ['놓친 손님', r.lost + '명'],
      ];
  $('resultStats').innerHTML = stats.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  const canNext = !!next && isUnlocked(progress, next.id, unlockAll);
  $('nextBtn').style.display = canNext ? '' : 'none';
  $('againBtn').classList.toggle('ghostish', canNext && r.cleared);
  setTimeout(() => {
    showOverlay('resultScreen');
    if (r.cleared) confetti(grand ? 140 : 60);
    if (grand) sfx.play('fever');
  }, 600);
}

// ---------- Render ----------
let stackKey = '';
let lastSec = -1;

function customerMarkup(c) {
  const o = c.order;
  if (!plus()) {
    return `<div class="cust mood-normal">${art.customerPortrait(c.variant)}</div>
          <div class="bubble">${art.burgerIcon}</div><div class="patience"><div></div></div>`;
  }
  const sides = (o.fries ? `<i>${art.friesSVG}</i>` : '') + (o.drink ? `<i>${art.drinkSVG}</i>` : '');
  const tag = multiMenu() ? `<div class="menu-tag m-${o.burger}">${burgerOf(game, o.burger).short}</div>` : '';
  const vip = c.vip ? `<div class="crown">${art.crownSVG}</div>` : '';
  const grp = c.group ? `<div class="grp g${c.group % 4}">단체</div>` : '';
  return `<div class="cust mood-normal">${art.customerPortrait(c.variant)}</div>${vip}${grp}
    <div class="bubble${sides ? ' with-sides' : ''}${c.vip ? ' vip' : ''}">${art.burgerIconFor(o.burger)}${sides ? `<div class="sides">${sides}</div>` : ''}${tag}</div>
    <div class="patience"><div></div></div>`;
}

function render() {
  const g = game;
  if (!g) return;

  // HUD
  $('sales').textContent = won(g.sales);
  $('salesbar').style.width = Math.min(100, (g.sales / cfg.target) * 100) + '%';
  const left = Math.max(0, cfg.duration - g.t);
  const sec = Math.ceil(left);
  if (sec !== lastSec) {
    $('time').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    $('timerBox').classList.toggle('hurry', sec <= 30 && sec > 0);
    if (sec <= 10 && sec > 0 && lastSec !== -1) sfx.play('tick');
    lastSec = sec;
  }
  if (cfg.combo) {
    $('comboNum').textContent = g.combo;
    const fever = Math.max(0, g.feverUntil - g.t) / cfg.combo.feverTime;
    const toFever = (g.combo % cfg.combo.feverEvery) / cfg.combo.feverEvery;
    $('feverBar').style.width = (fever > 0 ? fever : toFever) * 100 + '%';
    $('comboMeter').classList.toggle('feverOn', fever > 0);
    if (fever <= 0 && stage.classList.contains('fever')) stage.classList.remove('fever');
  }

  // Grill
  const full = pattyCapacityUsed(g) >= cfg.pattyStockMax;
  grillElements.forEach((grill, lane) => {
    const cooking = g.grills[lane].cooking;
    const p = cookProgress(g, lane);
    grill.classList.toggle('cooking', cooking);
    grill.classList.toggle('full', !cooking && full);
    grill.classList.toggle('burnt-warn', cooking && p >= z.good);
    const img = !cooking ? 'beef_raw' : p < 0.18 ? 'beef_raw' : p < z.raw ? 'beef_cooking' : p < z.good ? 'beef_ready' : 'beef_burnt';
    const patty = grill.querySelector('.patty');
    const src = `assets/${img}.webp`;
    if (patty.getAttribute('src') !== src) patty.setAttribute('src', src);
    grill.querySelector('.needle').style.left = p * 100 + '%';
    grill.querySelector('.grill-hint').textContent = `패티 ${lane + 1} · TAP!`;
  });
  $('stockPill').textContent = `보관 ${g.stock.length}/${cfg.pattyStockMax}`;
  $('stockPill').classList.toggle('full', full);

  // Side station
  if (cfg.sides) {
    const short = sideShortfall(g);
    const fr = $('fryer');
    fr.classList.toggle('cooking', g.fryer.cooking);
    fr.classList.toggle('need', short.fries > 0 && !g.fryer.cooking);
    fr.classList.toggle('full', !g.fryer.cooking && g.fries + cfg.sides.fries.batch > cfg.sides.fries.max);
    $('fryRing').style.setProperty('--p', fryProgress(g));
    $('friesCount').textContent = `${g.fries}/${cfg.sides.fries.max}`;
    const fo = $('fountain');
    fo.classList.toggle('pouring', g.fountain.pouring);
    fo.classList.toggle('need', short.drink > 0);
    fo.classList.toggle('full', drinksReserved(g) >= cfg.sides.drink.max);
    $('cupFill').style.height = pourProgress(g) * 100 + '%';
    $('drinkCount').textContent = `${g.drinks}/${cfg.sides.drink.max}` + (g.fountain.queue ? ` +${g.fountain.queue}` : '');
  }

  // Customers
  const target = plus() ? targetCustomer(g) : null;
  seats.forEach((s, i) => {
    const c = g.slots[i];
    const locked = i >= g.unlocked;
    const key = locked ? 'L' : c ? `C${c.id}` : 'E';
    if (key !== s.key) {
      const wasLocked = s.key === 'L';
      s.key = key;
      if (locked) {
        s.el.className = 'seat locked';
        s.el.innerHTML = `<div class="lock">${art.lockSVG}</div>`;
      } else if (c) {
        s.el.className = 'seat' + (c.vip ? ' vip' : '');
        s.el.innerHTML = customerMarkup(c);
        s.mood = 'normal';
      } else {
        const old = s.el.querySelector('.cust');
        if (old && !wasLocked) {
          // let the leaving customer slide out before clearing the seat
          old.classList.add('leave');
          s.el.querySelectorAll('.bubble, .patience, .crown, .grp').forEach((x) => x.remove());
          setTimeout(() => s.key === 'E' && (s.el.innerHTML = ''), 600);
        } else if (!s.el.classList.contains('unlocking')) s.el.innerHTML = '';
        else setTimeout(() => s.key === 'E' && ((s.el.className = 'seat'), (s.el.innerHTML = '')), 900);
      }
    }
    if (c) {
      const mood = customerMood(g, c);
      if (mood !== s.mood) {
        s.mood = mood;
        const cust = s.el.querySelector('.cust');
        if (cust) cust.className = 'cust mood-' + mood;
        const bubble = s.el.querySelector('.bubble');
        if (bubble && mood === 'happy') bubble.innerHTML = `<div class="heart">${art.heartSVG}</div>`;
        if (bubble && mood === 'angry') bubble.innerHTML = `<div class="mad">${art.angrySVG}</div>`;
      }
      if (plus()) s.el.classList.toggle('target', c === target);
      const bar = s.el.querySelector('.patience');
      if (bar) {
        const k = c.status === 'waiting' ? patienceLeft(g, c) : c.status === 'happy' ? 1 : 0;
        bar.firstChild.style.width = k * 100 + '%';
        bar.classList.toggle('mid', k <= 0.55 && k > 0.28);
        bar.classList.toggle('low', k <= 0.28);
      }
    } else if (plus()) s.el.classList.remove('target');
  });

  // Assembly: the recipe and tray follow the burger being made.
  const recipe = currentRecipe(g);
  setRecipe(recipe);
  setTray(recipe);
  const title = multiMenu() ? burgerOf(g, currentBurger(g)).name : '조립대';
  const head = $('stackIcon').nextElementSibling;
  if (head.textContent !== title) {
    head.textContent = title;
    if (multiMenu()) flash(head, 'bump', 400);
  }
  const key = g.stack.map((l) => l.key + (l.ok ? '' : '!')).join(',');
  if (key !== stackKey) {
    const prevLen = stackKey ? stackKey.split(',').length : 0;
    stackKey = key;
    const st = $('stack');
    st.innerHTML = '';
    let y = 0;
    g.stack.forEach((l, i) => {
      const L = art.LAYERS[l.key];
      const d = document.createElement('div');
      d.className = 'layer' + (l.ok ? '' : ' bad');
      if (i < prevLen) d.style.animation = 'none';
      d.style.bottom = y + 'px';
      d.style.height = L.h + 'px';
      d.style.zIndex = i + 1;
      // Stage 2+: tiny offsets so the stack looks hand-built, not machine-printed.
      if (plus() && l.key !== 'bottom' && l.key !== 'top') d.style.translate = `${((i * 37) % 9) - 4}px 0`;
      d.innerHTML = L.html;
      st.append(d);
      y += L.h - 2;
    });
    // Tall burgers (double patty) shrink to fit the board.
    st.style.scale = y > 210 ? String(210 / y) : '';
  }
  $('step').textContent = `${g.stack.filter((l) => l.ok).length} / ${recipe.length}`;

  // Tray + recipe
  const next = nextIngredient(g);
  const top = g.stack[g.stack.length - 1];
  const blocked = top && !top.ok;
  for (const k of Object.keys(tiles)) {
    const t = tiles[k];
    t.classList.toggle('next', k === next && (k !== 'meat' || g.stock.length > 0));
    t.classList.toggle('dim', blocked || g.plated);
  }
  if (tiles.meat) {
    const badge = tiles.meat.querySelector('.badge');
    badge.textContent = g.stock.length;
    badge.classList.toggle('zero', !g.stock.length);
    tiles.meat.classList.toggle('empty', !g.stock.length);
  }
  undoTile.classList.toggle('alert', !!blocked);
  recipeIcons.forEach((ic, i) => {
    ic.classList.toggle('done', i < g.stack.length && g.stack[i].ok);
    ic.classList.toggle('now', recipe[i] === next && i === g.stack.length);
  });
}

showSelect();
