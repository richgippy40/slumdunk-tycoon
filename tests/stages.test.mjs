// Rules tests for Stages 2-5, the stage data, save/unlock and balance. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import {
  STAGE1, createGame, update, tapGrill, tapIngredient, cookProgress, currentRecipe, currentBurger,
  targetCustomer, tapFryer, tapDrink, recipeOf, starsFor, multiplier, LABELS,
} from '../js/logic.js';
import { STAGES } from '../js/stages.js';
import { BURGERS } from '../js/menu.js';
import { ICONS, LAYERS, BURGER_ICONS } from '../js/art.js';
import { playBot, median } from './sim.mjs';

const S = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const step = (g, seconds, dt = 0.05) => {
  for (let s = 0; s < seconds - 1e-9; s += dt) update(g, dt);
};
const types = (g) => g.events.map((e) => e.type);
// Put a specific waiting customer in a seat (fixtures for order-specific rules).
function seat(g, i, order, extra = {}) {
  g.slots[i] = { id: g.nextId++, variant: 0, arrive: g.t, patience: 999, status: 'waiting', order, ...extra };
  g.unlocked = Math.max(g.unlocked, i + 1);
  return g.slots[i];
}
function emptyShop(cfg) {
  const g = createGame({ ...cfg, slotUnlocks: [999, 999, 999, 999], groups: undefined, vip: undefined }, 1);
  step(g, 0.1);
  return g;
}
function cookPerfect(g, n = 1) {
  for (let i = 0; i < n; i++) {
    tapGrill(g, 0);
    assert.ok(g.grills[0].cooking, 'grill started');
    while (cookProgress(g, 0) < 0.5) update(g, 0.05);
    tapGrill(g, 0);
  }
}
const build = (g) => {
  for (let i = 0; i < 12 && !g.plated; i++) tapIngredient(g, currentRecipe(g)[g.stack.length]);
};

test('Stage 1 regression fingerprint: deterministic bot results are unchanged from V0.3', () => {
  // Values recorded from main@1701be4 before the Stage 2-5 refactor.
  const legacy = (reaction) => {
    const r = playBot(STAGE1, { reaction, seed: 3, lanes: 1 });
    return { cleared: r.cleared, sales: r.sales, served: r.served, tips: r.tips, bonus: r.bonus, lost: r.lost, grades: r.grades };
  };
  assert.deepEqual(legacy(0.45), { cleared: true, sales: 741200, served: 68, tips: 102000, bonus: 34000, lost: 0, grades: { PERFECT: 71, GOOD: 0, MISS: 0 } });
  assert.deepEqual(legacy(1.0), { cleared: false, sales: 314500, served: 32, tips: 13700, bonus: 16000, lost: 0, grades: { PERFECT: 35, GOOD: 0, MISS: 0 } });
  assert.equal(STAGES[0].target, 350000);
  for (const k of ['duration', 'price', 'recipe', 'cookTime', 'zones', 'tips', 'slotUnlocks', 'spawnDelay', 'patience', 'pattyStockMax']) {
    assert.deepEqual(STAGES[0][k], STAGE1[k], `Stage 1 ${k} must not change`);
  }
});

test('stage data: 5 stages of 300s, valid menus, recipes fit the 7-slot tray', () => {
  assert.deepEqual(STAGES.map((s) => s.id), [1, 2, 3, 4, 5]);
  for (const s of STAGES) {
    assert.equal(s.duration, 300);
    assert.ok(s.target > 0 && s.stars.length === 2 && s.stars[0] > s.target && s.stars[1] > s.stars[0], `stage ${s.id} stars`);
    assert.equal(s.howto.length, 3);
    for (const b of s.burgers || []) assert.ok(BURGERS[b.id], `stage ${s.id} burger ${b.id}`);
    if (s.vip) assert.ok(BURGERS[s.vip.burger]);
  }
  for (const [id, b] of Object.entries(BURGERS)) {
    assert.equal(b.recipe[0], 'bottom', id);
    assert.equal(b.recipe.at(-1), 'top', id);
    assert.ok(b.recipe.includes('meat'), id);
    assert.ok(new Set(b.recipe).size <= 7, `${id} needs at most 7 tray tiles`);
    assert.ok(BURGER_ICONS[id], `${id} order bubble icon`);
    for (const k of b.recipe) assert.ok(LABELS[k] && ICONS[k] && LAYERS[k], `${id}: ${k} label/icon/layer`);
  }
});

test('every image referenced by ingredients exists and is not empty', () => {
  const srcs = new Set();
  for (const html of [...Object.values(ICONS), ...Object.values(LAYERS).map((l) => l.html)]) {
    for (const m of html.matchAll(/src="([^"]+)"/g)) srcs.add(m[1]);
  }
  assert.ok(srcs.size >= 8);
  for (const src of srcs) {
    const path = new URL('../' + src, import.meta.url);
    assert.ok(existsSync(path), src);
    assert.ok(statSync(path).size > 1000, `${src} is empty`);
  }
});

test('stars: target = 1 star, then the two star thresholds', () => {
  const s = S[2];
  assert.equal(starsFor(s, s.target - 1), 0);
  assert.equal(starsFor(s, s.target), 1);
  assert.equal(starsFor(s, s.stars[0]), 2);
  assert.equal(starsFor(s, s.stars[1] + 5), 3);
});

// ---------- Stage 2: sides ----------
test('fryer: one tap fries a batch of 3 automatically; capped at max', () => {
  const g = emptyShop(S[2]);
  tapFryer(g);
  assert.ok(g.fryer.cooking);
  tapFryer(g);
  assert.ok(types(g).includes('fryerBusy'));
  step(g, S[2].sides.fries.time + 0.1);
  assert.equal(g.fries, 3);
  tapFryer(g);
  step(g, S[2].sides.fries.time + 0.1);
  assert.equal(g.fries, 6);
  tapFryer(g);
  assert.ok(!g.fryer.cooking);
  assert.ok(types(g).includes('friesFull'));
});

test('drink: each tap pours one cup; extra taps queue up to the max', () => {
  const g = emptyShop(S[2]);
  for (let i = 0; i < 6; i++) tapDrink(g);
  assert.equal(g.fountain.queue, 3);
  assert.ok(types(g).includes('drinksFull'));
  step(g, S[2].sides.drink.time * 4 + 0.3);
  assert.equal(g.drinks, 4);
  assert.ok(!g.fountain.pouring);
});

test('set order waits for its sides, then auto-serves with sides + set bonus', () => {
  const g = emptyShop(S[2]);
  const c = seat(g, 0, { burger: 'default', fries: true, drink: true });
  cookPerfect(g);
  build(g);
  assert.ok(g.plated, 'burger finished');
  assert.equal(c.status, 'waiting', 'no sides yet: burger waits on the plate');
  tapFryer(g);
  tapDrink(g);
  step(g, S[2].sides.fries.time + 0.2);
  assert.equal(c.status, 'happy');
  const e = g.events.find((x) => x.type === 'served');
  assert.equal(e.price, S[2].price + S[2].sidePrices.fries + S[2].sidePrices.drink);
  assert.equal(e.setBonus, S[2].setBonus);
  assert.equal(g.fries, 2, 'one portion used');
  assert.equal(g.drinks, 0);
  assert.equal(g.sets, 1);
});

test('a ready burger goes to the oldest customer it can fully serve right now', () => {
  const g = emptyShop(S[2]);
  const setOrder = seat(g, 0, { burger: 'default', fries: true, drink: false });
  step(g, 1);
  const single = seat(g, 1, { burger: 'default', fries: false, drink: false });
  cookPerfect(g);
  build(g);
  assert.equal(single.status, 'happy');
  assert.equal(setOrder.status, 'waiting');
});

test('stage 2 order mix: singles, partial sides and full sets all appear', () => {
  const g = createGame(S[2], 5);
  const seen = new Set();
  for (let t = 0; t < 300; t += 0.05) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) {
      if (e.type === 'arrive') {
        const o = g.slots[e.slot].order;
        seen.add(`${o.fries ? 'F' : '-'}${o.drink ? 'D' : '-'}`);
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['--', '-D', 'F-', 'FD']);
});

// ---------- Stage 3: recipes ----------
test('recipe and tray follow the target customer; locks once building starts', () => {
  const g = emptyShop(S[3]);
  seat(g, 0, { burger: 'allday' });
  step(g, 1);
  seat(g, 1, { burger: 'bacon' });
  assert.equal(currentBurger(g), 'allday');
  assert.deepEqual(currentRecipe(g), BURGERS.allday.recipe);
  tapIngredient(g, 'bottom');
  g.slots[0] = null; // the ALL DAY customer leaves mid-build
  assert.equal(currentBurger(g), 'allday', 'the half-built burger keeps its recipe');
});

test('a finished burger is served to the customer who ordered that menu, not just the oldest', () => {
  const g = emptyShop(S[3]);
  const bacon = seat(g, 0, { burger: 'bacon' });
  step(g, 1);
  const cheese = seat(g, 1, { burger: 'cheese' });
  cookPerfect(g);
  build(g);
  assert.equal(bacon.status, 'happy');
  assert.equal(cheese.status, 'waiting');
  const e = g.events.find((x) => x.type === 'served');
  assert.equal(e.price, BURGERS.bacon.price);
  assert.equal(e.menu, 'bacon');
});

test('orphan burger: the next customer orders it, so the board never deadlocks', () => {
  const g = createGame(S[3], 2);
  step(g, 1);
  const first = g.slots[0];
  const menu = first.order.burger;
  cookPerfect(g);
  tapIngredient(g, 'bottom');
  first.patience = 0; // leaves now
  step(g, 3);
  for (let n = 0; n < 3; n++) step(g, 6);
  const waitingFor = g.slots.filter((c) => c && c.status === 'waiting').map((c) => c.order.burger);
  assert.ok(waitingFor.includes(menu), `someone orders the ${menu} on the board: ${waitingFor}`);
});

test('stage 3 new menu beat: ALL DAY appears only from 1:40 with a newMenu event', () => {
  const g = createGame(S[3], 9);
  const orders = [];
  let beat = null;
  for (let t = 0; t < 300; t += 0.05) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) {
      if (e.type === 'arrive') orders.push([g.t, g.slots[e.slot].order.burger]);
      if (e.type === 'newMenu') beat = e;
    }
  }
  assert.equal(beat.burger, 'allday');
  assert.ok(Math.abs(beat.t - 100) < 0.1);
  assert.ok(orders.every(([t, b]) => b !== 'allday' || t >= 100));
  assert.ok(orders.some(([, b]) => b === 'allday'));
  assert.ok(orders.some(([, b]) => b === 'bacon') && orders.some(([, b]) => b === 'cheese'));
});

// ---------- Stage 4: rush, combo, fever ----------
test('rush hour: start/end events and faster arrivals during rush', () => {
  const g = createGame(S[4], 3);
  const ev = [];
  const gaps = { rush: [], calm: [] };
  let lastArrive = null;
  for (let t = 0; t < 300; t += 0.05) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) {
      if (e.type === 'rushStart' || e.type === 'rushEnd') ev.push([e.type, Math.round(e.t)]);
      if (e.type === 'arrive') {
        // force seats to clear quickly so spawn tempo is visible
        g.slots[e.slot].patience = 0.5;
        if (lastArrive !== null) (S[4].rush.some((r) => g.t >= r.from && g.t < r.to) ? gaps.rush : gaps.calm).push(g.t - lastArrive);
        lastArrive = g.t;
      }
    }
  }
  assert.deepEqual(ev.slice(0, 4), [['rushStart', 45], ['rushEnd', 85], ['rushStart', 140], ['rushEnd', 185]]);
  assert.ok(median(gaps.rush) < median(gaps.calm), `rush ${median(gaps.rush)} < calm ${median(gaps.calm)}`);
});

test('combo grows per serve, pays a capped bonus, breaks when a customer leaves', () => {
  const g = emptyShop(S[4]);
  for (let i = 0; i < 3; i++) {
    seat(g, 0, { burger: 'cheese' });
    cookPerfect(g);
    build(g);
    step(g, 1.5);
  }
  assert.equal(g.combo, 3);
  const served = g.events.filter((e) => e.type === 'served').map((e) => e.comboBonus);
  assert.deepEqual(served.slice(-3), [0, 200, 400]);
  seat(g, 1, { burger: 'cheese' }, { patience: 0.2 });
  step(g, 1);
  assert.equal(g.combo, 0);
  assert.equal(g.bestCombo, 3);
  assert.ok(types(g).includes('comboBreak'));
});

test('every 8th serve starts FEVER: sales x1.5 for 15 seconds', () => {
  const g = emptyShop(S[4]);
  g.combo = 7;
  seat(g, 0, { burger: 'cheese' });
  cookPerfect(g);
  build(g);
  assert.ok(types(g).includes('fever'));
  assert.equal(multiplier(g), 1.5);
  seat(g, 1, { burger: 'cheese' });
  cookPerfect(g);
  build(g);
  const e = g.events.filter((x) => x.type === 'served').pop();
  assert.equal(e.mult, 1.5);
  assert.equal(e.price, Math.round((BURGERS.cheese.price * 1.5) / 100) * 100);
  assert.equal(e.total % 100, 0, 'amounts stay in ₩100 steps');
  step(g, 16);
  assert.equal(multiplier(g), 1);
});

// ---------- Stage 5: groups, VIP, last call ----------
test('groups arrive together on schedule; all served = group bonus', () => {
  const g = createGame(S[5], 4);
  let group = null;
  while (!group && g.t < 120) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) if (e.type === 'group') group = e;
    // keep the shop moving so seats free up
    for (const c of g.slots) if (c && c.status === 'waiting' && !c.group && !c.vip) c.patience = Math.min(c.patience, g.t - c.arrive + 0.1);
  }
  assert.ok(group, 'a group arrived');
  assert.ok(group.t >= S[5].groups.times[0]);
  assert.ok(group.size >= 2);
  const members = group.slots.map((i) => g.slots[i]);
  assert.ok(members.every((c) => c.group === group.id && c.arrive === members[0].arrive));
  g.slots.forEach((c, i) => { if (c && c.group !== group.id) g.slots[i] = null; });
  const sales0 = g.sales;
  for (const c of members) {
    g.stock.push('PERFECT');
    g.fries = 6;
    g.drinks = 4;
    g.building = null;
    const served = g.served;
    for (let n = 0; n < 12 && g.served === served; n++) tapIngredient(g, currentRecipe(g)[g.stack.length]);
    assert.equal(g.served, served + 1, 'served right away');
  }
  const done = g.events.find((e) => e.type === 'groupDone');
  assert.ok(done, 'group bonus paid');
  assert.ok(g.sales - sales0 >= S[5].groups.bonus);
});

test('VIP arrives at 1:15 ordering the double-patty GRAND set', () => {
  const g = createGame(S[5], 6);
  let vip = null;
  while (!vip && g.t < 200) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) if (e.type === 'vip') vip = g.slots[e.slot];
    for (const c of g.slots) if (c && c.status === 'waiting' && !c.vip) c.patience = Math.min(c.patience, g.t - c.arrive + 0.1);
  }
  assert.ok(vip && vip.vip);
  assert.ok(g.t >= 75);
  assert.deepEqual(vip.order, { burger: 'grand', fries: true, drink: true });
  assert.equal(recipeOf(g, 'grand').filter((k) => k === 'meat').length, 2);
});

test('LAST CALL from 4:30 multiplies sales', () => {
  const g = emptyShop(S[5]);
  step(g, S[5].lastCall.at - 0.2);
  assert.equal(multiplier(g), 1);
  step(g, 0.5);
  assert.ok(types(g).includes('lastCall'));
  assert.equal(multiplier(g), S[5].lastCall.mult);
});

test('all stages run 5:00 to a result without errors for every seed', () => {
  for (const s of STAGES) {
    for (let seed = 1; seed <= 5; seed++) {
      const r = playBot(s, { reaction: 0.7, seed, mistakes: 0.05 });
      assert.ok(r.sales > 0 && r.served > 0, `stage ${s.id} seed ${seed}`);
      assert.ok(Number.isInteger(r.sales) && r.sales % 100 === 0, `stage ${s.id} sales in ₩100 steps: ${r.sales}`);
    }
  }
});

// ---------- Balance (simulated players; see tests/balance.mjs for the full table) ----------
test('balance: experts earn 3 stars, casual players usually clear, slow players fall short', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const s of STAGES) {
    const runs = (reaction, mistakes) => seeds.map((seed) => playBot(s, { reaction, mistakes, seed }));
    const expert = runs(0.45, 0);
    const casual = runs(0.8, 0.05);
    const slow = runs(1.3, 0.1);
    assert.ok(expert.every((r) => r.stars === 3), `stage ${s.id}: expert 3 stars`);
    const clear = casual.filter((r) => r.cleared).length / seeds.length;
    assert.ok(clear >= 0.6, `stage ${s.id}: casual clear rate ${clear}`);
    assert.ok(slow.every((r) => !r.cleared), `stage ${s.id}: slow player should not clear`);
  }
});
