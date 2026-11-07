// SLUMDUNK TYCOON game rules. Pure state + functions: no DOM, no real clock.
// The UI calls update(g, dt) every frame and the tap functions on input, then drains g.events.
//
// Stage 1 (STAGE1) is the regression baseline. Every Stage 2-5 feature is switched on by an
// optional config field (burgers, sides, orders, combo, rush, groups, vip, lastCall); when a
// field is absent the code takes exactly the Stage 1 path, including the RNG call sequence.

import { CUSTOMERS } from './customers.js';
import { BURGERS, LABELS } from './menu.js';

export { LABELS };

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

// Stage 1 orders a single unnamed burger built from cfg.recipe at cfg.price.
export const DEFAULT_BURGER = 'default';

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
    building: null, // burger id of the stack in progress (null when the plate is empty)
    plated: false, // finished burger waiting for a customer
    slots: [null, null, null, null],
    unlocked: 0,
    nextSpawn: 0.6,
    nextId: 1,
    lastVariant: -1,
    // Stage 2+ state (unused by Stage 1)
    fries: 0,
    drinks: 0,
    fryer: { cooking: false, start: 0 },
    fountain: { pouring: false, start: 0, queue: 0 },
    combo: 0,
    bestCombo: 0,
    feverUntil: -1,
    fevers: 0,
    sets: 0,
    groupsDone: 0,
    vipServed: 0,
    burgersBy: {},
    groups: {},
    nextGroup: 1,
    vipIndex: 0,
    groupIndex: 0,
    menusSeen: new Set(),
    rushIndex: -1,
    lastCallOn: false,
    events: [],
  };
}

const emit = (g, type, data = {}) => g.events.push({ type, t: g.t, ...data });

// ---------- Menu helpers ----------
export function burgerOf(g, id) {
  if (id === DEFAULT_BURGER) return { name: '저스트치즈버거', short: 'JUST CHEESE', price: g.cfg.price, recipe: g.cfg.recipe };
  return BURGERS[id];
}
export const recipeOf = (g, id) => burgerOf(g, id).recipe;

// The waiting customer the current burger is for: the longest-waiting one whose order
// matches the burger on the board (or any, when the board is empty). No player choice.
export function targetCustomer(g) {
  let best = null;
  for (const c of g.slots) {
    if (c && c.status === 'waiting' && (!g.building || c.order.burger === g.building) && (!best || c.arrive < best.arrive)) best = c;
  }
  return best;
}

export function currentBurger(g) {
  if (g.building) return g.building;
  const c = targetCustomer(g);
  if (c) return c.order.burger;
  return g.cfg.burgers ? g.cfg.burgers[0].id : DEFAULT_BURGER;
}

export const currentRecipe = (g) => recipeOf(g, currentBurger(g));

// ---------- Grill ----------
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
  return currentRecipe(g)[g.stack.length];
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

// ---------- Sides (Stage 2+): one tap, then automatic ----------
export function fryProgress(g) {
  return g.fryer.cooking ? Math.min(1, (g.t - g.fryer.start) / g.cfg.sides.fries.time) : 0;
}
export function pourProgress(g) {
  return g.fountain.pouring ? Math.min(1, (g.t - g.fountain.start) / g.cfg.sides.drink.time) : 0;
}

export function tapFryer(g) {
  const s = g.cfg.sides?.fries;
  if (g.ended || !s) return;
  if (g.fryer.cooking) return emit(g, 'fryerBusy');
  if (g.fries + s.batch > s.max) return emit(g, 'friesFull');
  g.fryer.cooking = true;
  g.fryer.start = g.t;
  emit(g, 'fryStart');
}

export const drinksReserved = (g) => g.drinks + (g.fountain.pouring ? 1 : 0) + g.fountain.queue;

export function tapDrink(g) {
  const s = g.cfg.sides?.drink;
  if (g.ended || !s) return;
  if (drinksReserved(g) >= s.max) return emit(g, 'drinksFull');
  if (g.fountain.pouring) g.fountain.queue++;
  else {
    g.fountain.pouring = true;
    g.fountain.start = g.t;
  }
  emit(g, 'pourStart');
}

// Sides still missing for waiting orders, after what is ready and in progress.
export function sideShortfall(g) {
  const need = { fries: 0, drink: 0 };
  for (const c of g.slots) {
    if (c && c.status === 'waiting') {
      if (c.order.fries) need.fries++;
      if (c.order.drink) need.drink++;
    }
  }
  const fries = g.cfg.sides ? need.fries - g.fries - (g.fryer.cooking ? g.cfg.sides.fries.batch : 0) : 0;
  const drink = g.cfg.sides ? need.drink - drinksReserved(g) : 0;
  return { fries: Math.max(0, fries), drink: Math.max(0, drink) };
}

// ---------- Assembly ----------
export function tapIngredient(g, key) {
  if (g.ended) return;
  if (g.plated) return emit(g, 'plateBusy');
  const top = g.stack[g.stack.length - 1];
  if (top && !top.ok) return emit(g, 'blocked');
  const recipe = currentRecipe(g);
  const layer = { key, ok: key === recipe[g.stack.length] };
  if (key === 'meat') {
    if (!g.stock.length) return emit(g, 'needPatty');
    layer.grade = g.stock.shift();
  }
  if (!g.stack.length) g.building = currentBurger(g);
  g.stack.push(layer);
  emit(g, 'placed', { key, ok: layer.ok });
  if (layer.ok && g.stack.length === recipe.length) {
    g.plated = true;
    emit(g, 'complete', { burger: g.building });
    tryServe(g);
  }
}

export function undo(g) {
  if (g.ended || g.plated || !g.stack.length) return;
  const layer = g.stack.pop();
  if (layer.key === 'meat') g.stock.unshift(layer.grade);
  if (!g.stack.length) g.building = null;
  emit(g, 'undo', { key: layer.key });
}

const canFulfill = (g, o) => (!o.fries || g.fries > 0) && (!o.drink || g.drinks > 0);

export function multiplier(g) {
  let m = 1;
  if (g.cfg.combo && g.t < g.feverUntil) m *= g.cfg.combo.feverMult;
  if (g.lastCallOn) m *= g.cfg.lastCall.mult;
  return m;
}

function tryServe(g) {
  let best = -1;
  g.slots.forEach((c, i) => {
    if (c && c.status === 'waiting' && c.order.burger === g.building && canFulfill(g, c.order) && (best < 0 || c.arrive < g.slots[best].arrive)) best = i;
  });
  if (best < 0) return false;
  const cfg = g.cfg;
  const c = g.slots[best];
  const o = c.order;
  const wait = g.t - c.arrive;
  const burger = burgerOf(g, o.burger);
  let price = burger.price;
  let tip = (cfg.tips.find((x) => wait <= x.within) || { amount: 0 }).amount;
  const meat = g.stack.filter((l) => l.key === 'meat');
  let bonus = meat.length && meat.every((l) => l.grade === 'PERFECT') ? cfg.perfectBonus : 0;
  let setBonus = 0;
  if (o.fries) { g.fries--; price += cfg.sidePrices.fries; }
  if (o.drink) { g.drinks--; price += cfg.sidePrices.drink; }
  if (o.fries && o.drink) { setBonus = cfg.setBonus; g.sets++; }
  if (c.vip) tip += cfg.vip.tip;
  const rushBonus = cfg.rush && inRush(g) >= 0 ? cfg.rushBonus : 0;
  bonus += rushBonus;
  let comboBonus = 0;
  if (cfg.combo) {
    g.combo++;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    comboBonus = Math.min(cfg.combo.cap, cfg.combo.step * (g.combo - 1));
  }
  bonus += setBonus + comboBonus;
  const mult = multiplier(g);
  if (mult !== 1) {
    const r100 = (n) => Math.round((n * mult) / 100) * 100; // keep amounts in ₩100 steps
    price = r100(price);
    tip = r100(tip);
    bonus = r100(bonus);
  }
  const total = price + tip + bonus;
  g.sales += total;
  g.tips += tip;
  g.bonus += bonus;
  g.served++;
  g.burgersBy[o.burger] = (g.burgersBy[o.burger] || 0) + 1;
  if (c.vip) g.vipServed++;
  c.status = 'happy';
  c.until = g.t + cfg.reactionTime;
  const stack = g.stack;
  const menu = g.building;
  g.stack = [];
  g.plated = false;
  g.building = null;
  const data = { slot: best, id: c.id, price, tip, bonus, total, wait, stack };
  if (cfg.burgers || cfg.sides) Object.assign(data, { menu, order: o, setBonus, comboBonus, rushBonus, combo: g.combo, mult, vip: !!c.vip });
  emit(g, 'served', data);
  if (cfg.combo && cfg.combo.feverEvery && g.combo % cfg.combo.feverEvery === 0) {
    g.feverUntil = g.t + cfg.combo.feverTime;
    g.fevers++;
    emit(g, 'fever', { until: g.feverUntil });
  }
  if (c.group) groupProgress(g, c.group, true);
  return true;
}

function groupProgress(g, id, served) {
  const grp = g.groups[id];
  if (!grp) return;
  if (!served) grp.failed = true;
  else if (++grp.served === grp.size && !grp.failed) {
    const bonus = Math.round((g.cfg.groups.bonus * multiplier(g)) / 100) * 100;
    g.sales += bonus;
    g.bonus += bonus;
    g.groupsDone++;
    emit(g, 'groupDone', { id, bonus, slots: grp.slots });
  }
}

// ---------- Customers ----------
function pickBurger(g) {
  const list = g.cfg.burgers.filter((b) => b.from === undefined || g.t >= b.from);
  // A finished or half-built burger nobody is waiting for: the next guest wants it.
  if (g.building && !g.slots.some((c) => c && c.status === 'waiting' && c.order.burger === g.building)) return g.building;
  const total = list.reduce((s, b) => s + b.weight, 0);
  let r = g.rng() * total;
  for (const b of list) {
    if ((r -= b.weight) < 0) return b.id;
  }
  return list[list.length - 1].id;
}

function rollOrder(g) {
  if (!g.cfg.burgers && !g.cfg.orders) return { burger: DEFAULT_BURGER };
  const o = { burger: g.cfg.burgers ? pickBurger(g) : DEFAULT_BURGER };
  const p = g.cfg.orders;
  if (p) {
    const k = g.t / g.cfg.duration;
    o.fries = g.rng() < lerp(p.fries, k);
    o.drink = g.rng() < lerp(p.drink, k);
  }
  return o;
}

function orderPatience(g, o, base) {
  const extra = g.cfg.sidePatience || 0;
  const layers = recipeOf(g, o.burger).length - 7;
  return base + extra * ((o.fries ? 1 : 0) + (o.drink ? 1 : 0)) + Math.max(0, layers) * 4;
}

function spawn(g, i, opts = {}) {
  let v = Math.floor(g.rng() * g.cfg.variants);
  if (v === g.lastVariant) v = (v + 1) % g.cfg.variants;
  g.lastVariant = v;
  const k = g.t / g.cfg.duration;
  const order = opts.order || rollOrder(g);
  const base = opts.patience || lerp(g.cfg.patience, k);
  const c = { id: g.nextId++, variant: v, arrive: g.t, patience: base, status: 'waiting', order };
  if (g.cfg.burgers || g.cfg.orders) c.patience = opts.patience || orderPatience(g, order, base);
  if (opts.vip) c.vip = true;
  if (opts.group) c.group = opts.group;
  g.slots[i] = c;
  g.nextSpawn = g.t + spawnDelay(g, k);
  emit(g, 'arrive', { slot: i, id: c.id, vip: !!opts.vip, group: opts.group || 0 });
  return c;
}

export function inRush(g) {
  return (g.cfg.rush || []).findIndex((r) => g.t >= r.from && g.t < r.to);
}

function spawnDelay(g, k) {
  if (g.cfg.rush && inRush(g) >= 0) return g.cfg.rushDelay;
  return lerp(g.cfg.spawnDelay, k);
}

function spawnGroup(g, free) {
  const cfg = g.cfg.groups;
  const size = Math.min(free.length, cfg.sizes[Math.floor(g.rng() * cfg.sizes.length)]);
  const id = g.nextGroup++;
  const seats = free.slice(0, size);
  g.groups[id] = { size, served: 0, failed: false, slots: seats };
  const k = g.t / g.cfg.duration;
  const base = lerp(g.cfg.patience, k) + cfg.patienceBonus;
  for (const i of seats) {
    const order = rollOrder(g);
    spawn(g, i, { group: id, order, patience: orderPatience(g, order, base) });
  }
  g.nextSpawn = g.t + spawnDelay(g, k) * cfg.gapScale;
  emit(g, 'group', { id, size, slots: seats });
}

function trySpawn(g) {
  const cfg = g.cfg;
  if (!cfg.groups && !cfg.vip) {
    const free = g.slots.findIndex((c, i) => !c && i < g.unlocked);
    if (free >= 0) spawn(g, free);
    return;
  }
  const free = g.slots.map((c, i) => (!c && i < g.unlocked ? i : -1)).filter((i) => i >= 0);
  if (!free.length) return;
  const vip = cfg.vip;
  if (vip && g.vipIndex < vip.times.length && g.t >= vip.times[g.vipIndex]) {
    g.vipIndex++;
    spawn(g, free[0], { vip: true, patience: vip.patience, order: { burger: vip.burger, fries: true, drink: true } });
    emit(g, 'vip', { slot: free[0] });
    return;
  }
  const grp = cfg.groups;
  if (grp && g.groupIndex < grp.times.length && g.t >= grp.times[g.groupIndex]) {
    // A group is due: hold the door until two seats are free, then seat them together.
    if (free.length < 2) return;
    g.groupIndex++;
    return spawnGroup(g, free);
  }
  spawn(g, free[0]);
}

// ---------- Frame ----------
export function update(g, dt) {
  if (g.ended) return;
  g.t = Math.min(g.cfg.duration, g.t + Math.min(dt, 0.25));
  const cfg = g.cfg;

  const unlocked = cfg.slotUnlocks.filter((s) => s <= g.t).length;
  while (g.unlocked < unlocked) emit(g, 'slotUnlocked', { slot: g.unlocked++ });

  if (cfg.burgers) {
    for (const b of cfg.burgers) {
      if (!g.menusSeen.has(b.id) && (b.from === undefined || g.t >= b.from)) {
        g.menusSeen.add(b.id);
        if (b.from) emit(g, 'newMenu', { burger: b.id });
      }
    }
  }
  if (cfg.rush) {
    const r = inRush(g);
    if (r !== g.rushIndex) {
      if (r >= 0) {
        emit(g, 'rushStart', { index: r, until: cfg.rush[r].to });
        g.nextSpawn = Math.min(g.nextSpawn, g.t + cfg.rushDelay);
      } else if (g.t < cfg.duration) emit(g, 'rushEnd', { index: g.rushIndex }); // no 'rush over' banner at the final whistle
      g.rushIndex = r;
    }
  }
  if (cfg.lastCall && !g.lastCallOn && g.t >= cfg.lastCall.at) {
    g.lastCallOn = true;
    emit(g, 'lastCall');
  }

  g.grills.forEach((grill, lane) => {
    if (grill.cooking && cookProgress(g, lane) >= 1) finishCook(g, lane, 1, true);
  });

  if (cfg.sides) {
    if (g.fryer.cooking && fryProgress(g) >= 1) {
      g.fryer.cooking = false;
      g.fries = Math.min(cfg.sides.fries.max, g.fries + cfg.sides.fries.batch);
      emit(g, 'friesDone', { count: g.fries });
    }
    if (g.fountain.pouring && pourProgress(g) >= 1) {
      g.drinks++;
      if (g.fountain.queue > 0) {
        g.fountain.queue--;
        g.fountain.start = g.t;
      } else g.fountain.pouring = false;
      emit(g, 'drinkDone', { count: g.drinks });
    }
  }

  g.slots.forEach((c, i) => {
    if (!c) return;
    if (c.status === 'waiting' && g.t - c.arrive >= c.patience) {
      c.status = 'angry';
      c.until = g.t + cfg.reactionTime;
      g.lost++;
      emit(g, 'left', { slot: i, id: c.id });
      if (cfg.combo && g.combo > 0) {
        emit(g, 'comboBreak', { combo: g.combo });
        g.combo = 0;
      }
      if (c.group) groupProgress(g, c.group, false);
    } else if (c.status !== 'waiting' && g.t >= c.until) {
      g.slots[i] = null;
      g.nextSpawn = Math.max(g.nextSpawn, g.t + cfg.refillGap);
      emit(g, 'gone', { slot: i, id: c.id });
    }
  });

  if (g.t >= g.nextSpawn) trySpawn(g);

  if (g.plated) tryServe(g);

  if (g.t >= cfg.duration) {
    g.ended = true;
    g.grills.forEach(grill => { grill.cooking = false; });
    g.fryer.cooking = false;
    g.fountain.pouring = false;
    g.result = {
      cleared: g.sales >= cfg.target,
      sales: g.sales,
      served: g.served,
      tips: g.tips,
      bonus: g.bonus,
      lost: g.lost,
      grades: { ...g.grades },
      stars: starsFor(cfg, g.sales),
      bestCombo: g.bestCombo,
      sets: g.sets,
      groups: g.groupsDone,
      vip: g.vipServed,
      fevers: g.fevers,
    };
    emit(g, 'end', g.result);
  }
}

// 0-3 stars. Star 1 is the stage target; stars 2-3 come from cfg.stars.
export function starsFor(cfg, sales) {
  const steps = [cfg.target, ...(cfg.stars || [])];
  return steps.filter((s) => sales >= s).length;
}
