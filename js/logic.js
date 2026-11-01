// SLUMDUNK TYCOON game rules. Pure state + functions: no DOM, no real clock.
// The UI calls update(g, dt) every frame and the tap functions on input, then drains g.events.

import { CUSTOMERS } from './customers.js';

export const STAGE1 = {
  duration: 300, // seconds
  target: 350000,
  price: 8900,
  recipe: ['bottom', 'sauce', 'pickle', 'meat', 'cheese', 'onion', 'top'],
  cookTime: 6, // seconds from raw to 100% (auto-burn)
  // Gauge zones by cook progress: [0, raw) undercooked MISS, [raw, perfect) PERFECT,
  // [perfect, good) GOOD, [good, 1] burnt MISS.
  zones: { raw: 0.36, perfect: 0.62, good: 0.82 },
  perfectBonus: 500,
  tips: [
    { within: 10, amount: 1500 },
    { within: 18, amount: 700 },
  ],
  pattyStockMax: 4,
  slotUnlocks: [0, 50, 130, 210], // second at which each customer seat opens
  spawnDelay: [5, 3], // seconds between arrivals, start -> end of stage
  patience: [45, 36], // seconds a customer waits, start -> end of stage
  refillGap: 1, // minimum seconds before a freed seat is filled again
  reactionTime: 1.2, // seconds a happy/angry customer stays before leaving
  variants: CUSTOMERS.length,
};

export const LABELS = {
  bottom: '아랫번',
  sauce: '소스',
  pickle: '피클',
  meat: '패티',
  cheese: '치즈',
  onion: '어니언',
  top: '윗번',
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (range, k) => range[0] + (range[1] - range[0]) * Math.min(1, Math.max(0, k));

export function createGame(cfg = STAGE1, seed = Date.now()) {
  const grills = Array.from({ length: 2 }, () => ({ cooking: false, start: 0 }));
  return {
    cfg,
    rng: mulberry32(seed),
    t: 0,
    ended: false,
    result: null,
    sales: 0,
    tips: 0,
    bonus: 0,
    served: 0,
    lost: 0,
    grades: { PERFECT: 0, GOOD: 0, MISS: 0 },
    grills,
    grill: grills[0], // Default lane for keyboard controls and existing callers.
    stock: [], // grades of cooked patties waiting to be used
    stack: [], // { key, ok, grade? }
    plated: false, // finished burger waiting for a customer
    slots: [null, null, null, null],
    unlocked: 0,
    nextSpawn: 0.6,
    nextId: 1,
    lastVariant: -1,
    events: [],
  };
}

const emit = (g, type, data = {}) => g.events.push({ type, t: g.t, ...data });

export function cookProgress(g, lane = 0) {
  const grill = g.grills[lane];
  return grill?.cooking ? Math.min(1, (g.t - grill.start) / g.cfg.cookTime) : 0;
}

export function gradeOf(p, z) {
  if (p < z.raw) return { grade: 'MISS', reason: 'raw' };
  if (p < z.perfect) return { grade: 'PERFECT' };
  if (p < z.good) return { grade: 'GOOD' };
  return { grade: 'MISS', reason: 'burnt' };
}

export function nextIngredient(g) {
  const top = g.stack[g.stack.length - 1];
  if (g.plated || (top && !top.ok)) return null;
  return g.cfg.recipe[g.stack.length];
}

export function customerMood(g, c) {
  if (c.status !== 'waiting') return c.status;
  const left = 1 - (g.t - c.arrive) / c.patience;
  return left > 0.55 ? 'normal' : left > 0.28 ? 'waiting' : 'impatient';
}

export function patienceLeft(g, c) {
  return Math.max(0, 1 - (g.t - c.arrive) / c.patience);
}

// Reserve room for cooking patties and a patty that can still be undone.
export function pattyCapacityUsed(g) {
  return g.stock.length + g.grills.filter(x => x.cooking).length + g.stack.filter(x => x.key === 'meat').length;
}

export function tapGrill(g, lane = 0) {
  const grill = g.grills[lane];
  if (g.ended || !grill) return;
  if (!grill.cooking) {
    if (pattyCapacityUsed(g) >= g.cfg.pattyStockMax) return emit(g, 'grillFull', { lane });
    grill.cooking = true;
    grill.start = g.t;
    return emit(g, 'cookStart', { lane });
  }
  finishCook(g, lane, cookProgress(g, lane), false);
}

function finishCook(g, lane, p, auto) {
  g.grills[lane].cooking = false;
  const r = gradeOf(p, g.cfg.zones);
  g.grades[r.grade]++;
  if (r.grade !== 'MISS') g.stock.push(r.grade);
  emit(g, 'cooked', { ...r, lane, p, auto });
}

export function tapIngredient(g, key) {
  if (g.ended) return;
  if (g.plated) return emit(g, 'plateBusy');
  const top = g.stack[g.stack.length - 1];
  if (top && !top.ok) return emit(g, 'blocked');
  const layer = { key, ok: key === g.cfg.recipe[g.stack.length] };
  if (key === 'meat') {
    if (!g.stock.length) return emit(g, 'needPatty');
    layer.grade = g.stock.shift();
  }
  g.stack.push(layer);
  emit(g, 'placed', { key, ok: layer.ok });
  if (layer.ok && g.stack.length === g.cfg.recipe.length) {
    g.plated = true;
    emit(g, 'complete');
    tryServe(g);
  }
}

export function undo(g) {
  if (g.ended || g.plated || !g.stack.length) return;
  const layer = g.stack.pop();
  if (layer.key === 'meat') g.stock.unshift(layer.grade);
  emit(g, 'undo', { key: layer.key });
}

function tryServe(g) {
  let best = -1;
  g.slots.forEach((c, i) => {
    if (c && c.status === 'waiting' && (best < 0 || c.arrive < g.slots[best].arrive)) best = i;
  });
  if (best < 0) return false;
  const c = g.slots[best];
  const wait = g.t - c.arrive;
  const tip = (g.cfg.tips.find((x) => wait <= x.within) || { amount: 0 }).amount;
  const meat = g.stack.find((l) => l.key === 'meat');
  const bonus = meat && meat.grade === 'PERFECT' ? g.cfg.perfectBonus : 0;
  const total = g.cfg.price + tip + bonus;
  g.sales += total;
  g.tips += tip;
  g.bonus += bonus;
  g.served++;
  c.status = 'happy';
  c.until = g.t + g.cfg.reactionTime;
  const stack = g.stack;
  g.stack = [];
  g.plated = false;
  emit(g, 'served', { slot: best, id: c.id, price: g.cfg.price, tip, bonus, total, wait, stack });
  return true;
}

function spawn(g, i) {
  let v = Math.floor(g.rng() * g.cfg.variants);
  if (v === g.lastVariant) v = (v + 1) % g.cfg.variants;
  g.lastVariant = v;
  const k = g.t / g.cfg.duration;
  g.slots[i] = { id: g.nextId++, variant: v, arrive: g.t, patience: lerp(g.cfg.patience, k), status: 'waiting' };
  g.nextSpawn = g.t + lerp(g.cfg.spawnDelay, k);
  emit(g, 'arrive', { slot: i, id: g.slots[i].id });
}

export function update(g, dt) {
  if (g.ended) return;
  g.t = Math.min(g.cfg.duration, g.t + Math.min(dt, 0.25));
  const cfg = g.cfg;

  const unlocked = cfg.slotUnlocks.filter((s) => s <= g.t).length;
  while (g.unlocked < unlocked) emit(g, 'slotUnlocked', { slot: g.unlocked++ });

  g.grills.forEach((grill, lane) => {
    if (grill.cooking && cookProgress(g, lane) >= 1) finishCook(g, lane, 1, true);
  });

  g.slots.forEach((c, i) => {
    if (!c) return;
    if (c.status === 'waiting' && g.t - c.arrive >= c.patience) {
      c.status = 'angry';
      c.until = g.t + cfg.reactionTime;
      g.lost++;
      emit(g, 'left', { slot: i, id: c.id });
    } else if (c.status !== 'waiting' && g.t >= c.until) {
      g.slots[i] = null;
      g.nextSpawn = Math.max(g.nextSpawn, g.t + cfg.refillGap);
      emit(g, 'gone', { slot: i, id: c.id });
    }
  });

  if (g.t >= g.nextSpawn) {
    const free = g.slots.findIndex((c, i) => !c && i < g.unlocked);
    if (free >= 0) spawn(g, free);
  }

  if (g.plated) tryServe(g);

  if (g.t >= cfg.duration) {
    g.ended = true;
    g.grills.forEach(grill => { grill.cooking = false; });
    g.result = {
      cleared: g.sales >= cfg.target,
      sales: g.sales,
      served: g.served,
      tips: g.tips,
      bonus: g.bonus,
      lost: g.lost,
      grades: { ...g.grades },
    };
    emit(g, 'end', g.result);
  }
}
