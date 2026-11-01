// SLUMDUNK TYCOON — screen, input, effects. Game rules live in logic.js.
import {
  STAGE1, LABELS, createGame, update, tapGrill, tapIngredient, undo, cookProgress,
  nextIngredient, customerMood, patienceLeft,
} from './logic.js';
import * as art from './art.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const won = (n) => '₩' + n.toLocaleString('ko-KR');
const cfg = STAGE1;

document.body.insertAdjacentHTML('afterbegin', art.DEFS);
$('neon').innerHTML = art.neonBurger;
$('bottles').innerHTML = art.bottlesSVG;
$('flameIcon').innerHTML = art.flameSVG;
$('stackIcon').innerHTML = art.stackSVG;
$('trayIcon').innerHTML = art.trayTitleSVG;
$('timerIcon').innerHTML = art.timerSVG;
$('target').textContent = won(cfg.target);
$('goalText').textContent = won(cfg.target);

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

const tiles = {};
for (const key of cfg.recipe) {
  const b = document.createElement('button');
  b.className = 'tile';
  b.dataset.key = key;
  b.setAttribute('aria-label', LABELS[key]);
  b.innerHTML = art.ICONS[key] + (key === 'meat' ? '<span class="badge zero">0</span>' : '');
  $('tray').append(b);
  tiles[key] = b;
  press(b, () => act(() => tapIngredient(game, key)));
}
const undoTile = document.createElement('button');
undoTile.className = 'tile undo';
undoTile.setAttribute('aria-label', '취소');
undoTile.innerHTML = art.undoSVG;
$('tray').append(undoTile);
press(undoTile, () => act(() => undo(game)));

const recipeIcons = cfg.recipe.map((key) => {
  const i = document.createElement('i');
  i.innerHTML = art.ICONS[key];
  $('recipe').append(i);
  return i;
});

const z = cfg.zones;
$('gauge').querySelector('.z-raw').style.width = z.raw * 100 + '%';
$('gauge').querySelector('.z-perfect').style.width = (z.perfect - z.raw) * 100 + '%';
$('gauge').querySelector('.z-good').style.width = (z.good - z.perfect) * 100 + '%';
$('gauge').querySelector('.z-burnt').style.width = (1 - z.good) * 100 + '%';

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

press($('grill'), () => act(() => tapGrill(game)));
press($('pauseBtn'), () => running && setPaused(true));
press($('resumeBtn'), () => setPaused(false));
press($('restartBtn'), () => start());
press($('againBtn'), () => start());
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
  } else if (e.key >= '1' && e.key <= '7') act(() => tapIngredient(game, cfg.recipe[e.key - 1]));
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
  sfx.setSizzle(!p && game && game.grill.cooking);
}

// ---------- Game flow ----------
function start() {
  game = createGame(cfg);
  running = true;
  paused = false;
  last = performance.now();
  seats.forEach((s) => (s.key = ''));
  stackKey = '';
  lastSec = -1;
  $('fx').innerHTML = '';
  ['startScreen', 'pauseScreen', 'resultScreen'].forEach((id) => $(id).classList.remove('show'));
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
        sfx.setSizzle(false);
        const g = $('grade');
        g.className = 'grade ' + e.grade;
        g.textContent = e.grade === 'MISS' ? (e.reason === 'raw' ? 'MISS · 덜 익음' : 'MISS · 탔어요') : e.grade + '!';
        void g.offsetWidth;
        g.classList.add('show');
        sfx.play(e.grade.toLowerCase());
        if (e.grade !== 'MISS') flash(tiles.meat, 'pressed', 150);
        break;
      }
      case 'grillFull':
        toast(`패티 보관함이 가득 찼어요 (${cfg.pattyStockMax}/${cfg.pattyStockMax})`, true);
        flash($('grill'), 'shake');
        sfx.play('wrong');
        break;
      case 'needPatty':
        toast('그릴에서 패티를 먼저 구워주세요', true);
        flash($('grill'), 'shake');
        flash(tiles.meat, 'shake');
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
        toast('완성된 버거가 손님을 기다리고 있어요');
        break;
      case 'complete':
        flash($('sparkle'), 'show', 650);
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
      case 'end':
        finish(e);
        break;
    }
  }
}

function serveFx(e) {
  const fx = $('fx');
  const from = center($('board'));
  const seat = seats[e.slot].el;
  const to = center(seat);
  to.y -= 40;
  const money = center($('sales'));

  const b = document.createElement('div');
  b.className = 'flyburger';
  b.innerHTML = art.burgerIcon;
  fx.append(b);
  b.animate(
    [
      { transform: `translate(${from.x - 55}px, ${from.y - 60}px) scale(1.4)` },
      { transform: `translate(${(from.x + to.x) / 2 - 55}px, ${Math.min(from.y, to.y) - 160}px) scale(1.1)`, offset: 0.5 },
      { transform: `translate(${to.x - 55}px, ${to.y - 40}px) scale(0.7)`, opacity: 0.9 },
    ],
    { duration: 480, easing: 'ease-in-out' },
  ).onfinish = () => {
    b.remove();
    sfx.play('happy');
    sfx.play('coin');
    floatText(`+${won(e.price + e.bonus)}`, to.x, to.y - 140);
    if (e.tip) setTimeout(() => floatText(`TIP +${won(e.tip)}`, to.x, to.y - 100, 'tip'), 180);
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

function finish(r) {
  running = false;
  sfx.setSizzle(false);
  sfx.play('end');
  $('resultTitle').textContent = r.cleared ? 'STAGE CLEAR!' : 'TIME OVER';
  $('resultTitle').classList.toggle('fail', !r.cleared);
  $('resultDesc').textContent = r.cleared
    ? '목표 매출 달성! 첫 영업 대성공!'
    : `목표까지 ${won(cfg.target - r.sales)} 부족해요. 다시 도전!`;
  $('resultMoney').textContent = won(r.sales);
  const stats = [
    ['판매한 버거', r.served + '개'],
    ['받은 팁', won(r.tips)],
    ['PERFECT', r.grades.PERFECT + '회'],
    ['PERFECT 보너스', won(r.bonus)],
    ['MISS', r.grades.MISS + '회'],
    ['놓친 손님', r.lost + '명'],
  ];
  $('resultStats').innerHTML = stats.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  setTimeout(() => $('resultScreen').classList.add('show'), 600);
}

// ---------- Render ----------
let stackKey = '';
let lastSec = -1;

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

  // Grill
  const p = cookProgress(g);
  const grill = $('grill');
  const full = !g.grill.cooking && g.stock.length >= cfg.pattyStockMax;
  grill.classList.toggle('cooking', g.grill.cooking);
  grill.classList.toggle('full', full);
  grill.classList.toggle('burnt-warn', g.grill.cooking && p >= z.good);
  const img = !g.grill.cooking ? 'beef_raw' : p < 0.18 ? 'beef_raw' : p < z.raw ? 'beef_cooking' : p < z.good ? 'beef_ready' : 'beef_burnt';
  const src = `assets/${img}.webp`;
  if ($('patty').getAttribute('src') !== src) $('patty').setAttribute('src', src);
  $('needle').style.left = p * 100 + '%';
  $('grillHint').textContent = 'TAP!';
  $('stockPill').textContent = `보관 ${g.stock.length}/${cfg.pattyStockMax}`;
  $('stockPill').classList.toggle('full', full);

  // Customers
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
        s.el.className = 'seat';
        s.el.innerHTML = `<div class="cust mood-normal">${art.customerSVG(c.variant)}</div>
          <div class="bubble">${art.burgerIcon}</div><div class="patience"><div></div></div>`;
        s.mood = 'normal';
      } else {
        const old = s.el.querySelector('.cust');
        if (old && !wasLocked) {
          // let the leaving customer slide out before clearing the seat
          old.classList.add('leave');
          s.el.querySelector('.bubble')?.remove();
          s.el.querySelector('.patience')?.remove();
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
      const bar = s.el.querySelector('.patience');
      if (bar) {
        const k = c.status === 'waiting' ? patienceLeft(g, c) : c.status === 'happy' ? 1 : 0;
        bar.firstChild.style.width = k * 100 + '%';
        bar.classList.toggle('mid', k <= 0.55 && k > 0.28);
        bar.classList.toggle('low', k <= 0.28);
      }
    }
  });

  // Assembly
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
      d.innerHTML = L.html;
      st.append(d);
      y += L.h - 2;
    });
  }
  $('step').textContent = `${g.stack.filter((l) => l.ok).length} / ${cfg.recipe.length}`;

  // Tray + recipe
  const next = nextIngredient(g);
  const top = g.stack[g.stack.length - 1];
  const blocked = top && !top.ok;
  for (const k of cfg.recipe) {
    const t = tiles[k];
    t.classList.toggle('next', k === next && (k !== 'meat' || g.stock.length > 0));
    t.classList.toggle('dim', blocked || g.plated);
  }
  const badge = tiles.meat.querySelector('.badge');
  badge.textContent = g.stock.length;
  badge.classList.toggle('zero', !g.stock.length);
  tiles.meat.classList.toggle('empty', !g.stock.length);
  undoTile.classList.toggle('alert', !!blocked);
  recipeIcons.forEach((ic, i) => {
    ic.classList.toggle('done', i < g.stack.length && g.stack[i].ok);
    ic.classList.toggle('now', cfg.recipe[i] === next && i === g.stack.length);
  });
}
