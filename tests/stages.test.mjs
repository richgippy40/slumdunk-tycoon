// Rules tests for Stages 2-5, the stage data, save/unlock and balance. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import {
  STAGE1, createGame, update, tapGrill, tapIngredient, cookProgress, currentRecipe, currentBurger,
  targetCustomer, tapFryer, tapDrink, recipeOf, starsFor, multiplier, LABELS,
} from '../js/logic.js';
import { STAGES, DURATION } from '../js/stages.js';
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

test('engine regression fingerprint: V0.3 Stage 1 rules give identical bot results', () => {
  // Values recorded from main@1701be4 before the Stage 2-5 refactor.
  const legacy = (reaction) => {
    const r = playBot(STAGE1, { reaction, seed: 3, lanes: 1 });
    return { cleared: r.cleared, sales: r.sales, served: r.served, tips: r.tips, bonus: r.bonus, lost: r.lost, grades: r.grades };
  };
  assert.deepEqual(legacy(0.45), { cleared: true, sales: 741200, served: 68, tips: 102000, bonus: 34000, lost: 0, grades: { PERFECT: 71, GOOD: 0, MISS: 0 } });
  assert.deepEqual(legacy(1.0), { cleared: false, sales: 314500, served: 32, tips: 13700, bonus: 16000, lost: 0, grades: { PERFECT: 35, GOOD: 0, MISS: 0 } });
});

test('playable Stage 1 (V0.5): same rules as V0.3, only clock, seats, target and stars changed', () => {
  for (const k of ['price', 'recipe', 'cookTime', 'zones', 'tips', 'spawnDelay', 'patience', 'pattyStockMax', 'perfectBonus']) {
    assert.deepEqual(STAGES[0][k], STAGE1[k], `Stage 1 ${k} must not change`);
  }
  assert.equal(STAGES[0].duration, DURATION);
  assert.ok(STAGES[0].target < STAGE1.target);
});

test('every timed event of every stage happens inside the stage clock', () => {
  for (const s of STAGES) {
    const times = [
      ...s.slotUnlocks,
      ...(s.burgers || []).map((b) => b.from || 0),
      ...(s.rush || []).flatMap((r) => [r.from, r.to]),
      ...(s.groups?.times || []),
      ...(s.vip?.times || []),
      ...(s.lastCall ? [s.lastCall.at] : []),
    ];
    assert.ok(times.every((t) => t >= 0 && t <= s.duration), `stage ${s.id}: ${times}`);
    for (const t of [...(s.groups?.times || []), ...(s.vip?.times || [])]) assert.ok(t <= s.duration - 20, `stage ${s.id}: event at ${t}s leaves time to serve`);
  }
});

test('stage data: 5 stages of 2 minutes, valid menus, recipes fit the 7-slot tray', () => {
  assert.deepEqual(STAGES.map((s) => s.id), [1, 2, 3, 4, 5]);
  for (const s of STAGES) {
    assert.equal(s.duration, DURATION);
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
  for (let t = 0; t < g.cfg.duration; t += 0.05) {
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

test('stage 3 new menu beat: ALL DAY appears only from its start time with a newMenu event', () => {
  const from = S[3].burgers.find((b) => b.id === 'allday').from;
  const g = createGame(S[3], 1); // a seed whose 2-minute order list has all three menus
  const orders = [];
  let beat = null;
  for (let t = 0; t < g.cfg.duration; t += 0.05) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) {
      if (e.type === 'arrive') orders.push([g.t, g.slots[e.slot].order.burger]);
      if (e.type === 'newMenu') beat = e;
    }
  }
  assert.equal(beat.burger, 'allday');
  assert.ok(Math.abs(beat.t - from) < 0.1);
  assert.ok(orders.every(([t, b]) => b !== 'allday' || t >= from));
  assert.ok(orders.some(([, b]) => b === 'allday'));
  assert.ok(orders.some(([, b]) => b === 'bacon') && orders.some(([, b]) => b === 'cheese'));
});

// ---------- Stage 4: rush, combo, fever ----------
test('rush hour: start/end events and faster arrivals during rush', () => {
  const g = createGame(S[4], 3);
  const ev = [];
  const gaps = { rush: [], calm: [] };
  let lastArrive = null;
  for (let t = 0; t < g.cfg.duration; t += 0.05) {
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
  // The last rush runs to the final whistle, so it has no rushEnd.
  const want = S[4].rush.flatMap((r) => [['rushStart', r.from], ['rushEnd', r.to]]).filter(([, t]) => t < S[4].duration);
  assert.deepEqual(ev, want);
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

test('every Nth serve starts FEVER: sales x1.5 for the fever time', () => {
  const g = emptyShop(S[4]);
  g.combo = S[4].combo.feverEvery - 1;
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
  step(g, S[4].combo.feverTime + 1);
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

test('VIP arrives on schedule ordering the double-patty GRAND set', () => {
  const g = createGame(S[5], 6);
  let vip = null;
  while (!vip && g.t < 200) {
    update(g, 0.05);
    for (const e of g.events.splice(0)) if (e.type === 'vip') vip = g.slots[e.slot];
    for (const c of g.slots) if (c && c.status === 'waiting' && !c.vip) c.patience = Math.min(c.patience, g.t - c.arrive + 0.1);
  }
  assert.ok(vip && vip.vip);
  assert.ok(g.t >= S[5].vip.times[0]);
  assert.deepEqual(vip.order, { burger: 'grand', fries: true, drink: true });
  assert.equal(recipeOf(g, 'grand').filter((k) => k === 'meat').length, 2);
});

test('LAST CALL near the end multiplies sales', () => {
  const g = emptyShop(S[5]);
  step(g, S[5].lastCall.at - 0.2);
  assert.equal(multiplier(g), 1);
  step(g, 0.5);
  assert.ok(types(g).includes('lastCall'));
  assert.equal(multiplier(g), S[5].lastCall.mult);
});

test('all stages run to the final whistle with a result for every seed', () => {
  for (const s of STAGES) {
    for (let seed = 1; seed <= 5; seed++) {
      const r = playBot(s, { reaction: 0.7, seed, mistakes: 0.05 });
      assert.ok(r.sales > 0 && r.served > 0, `stage ${s.id} seed ${seed}`);
      assert.ok(Number.isInteger(r.sales) && r.sales % 100 === 0, `stage ${s.id} sales in ₩100 steps: ${r.sales}`);
    }
  }
});

// ---------- Balance (simulated players; see tests/balance.mjs for the full table) ----------
test('balance (V0.5, 30% easier): experts 3 stars, casual always clears, beginners mostly clear, slow fall short', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const s of STAGES) {
    const runs = (reaction, mistakes) => seeds.map((seed) => playBot(s, { reaction, mistakes, seed }));
    const expert = runs(0.45, 0);
    const casual = runs(0.8, 0.05);
    const beginner = runs(1.0, 0.08);
    const slow = runs(1.3, 0.1);
    assert.ok(expert.every((r) => r.stars === 3), `stage ${s.id}: expert 3 stars`);
    const clear = casual.filter((r) => r.cleared).length / seeds.length;
    assert.ok(clear === 1, `stage ${s.id}: casual clear rate ${clear}`);
    const beginnerClear = beginner.filter((r) => r.cleared).length / seeds.length;
    assert.ok(beginnerClear >= 0.5, `stage ${s.id}: beginner clear rate ${beginnerClear}`);
    assert.ok(slow.every((r) => !r.cleared), `stage ${s.id}: slow player should not clear`);
  }
});

// ---------- Name ranking (this device only) ----------
test('name ranking: cleaned names, sorted by sales, ties to the earlier entry, capped per stage', async () => {
  const { addRanking, rankingOf, cleanName, recordResult, RANK_SIZE, NAME_MAX } = await import('../js/save.js');
  assert.equal(cleanName('  민수   님  '), '민수 님');
  assert.equal([...cleanName('가나다라마바사아자차')].length, NAME_MAX);
  let p = { stages: {} };
  assert.equal(addRanking(p, 1, '   ', { sales: 5000 }).rank, 0, 'blank names are not saved');
  ({ progress: p } = addRanking(p, 1, 'A', { sales: 100000 }, 1));
  const b = addRanking(p, 1, 'B', { sales: 100000 }, 2);
  assert.equal(b.rank, 2, 'same score: earlier entry stays ahead');
  p = b.progress;
  const c = addRanking(p, 1, 'C', { sales: 200000 }, 3);
  assert.equal(c.rank, 1);
  p = c.progress;
  assert.deepEqual(rankingOf(p, 1).map((e) => e.name), ['C', 'A', 'B']);
  assert.equal(p.lastName, 'C', 'last name is remembered for the next game');
  assert.deepEqual(rankingOf(p, 2), [], 'rankings are per stage');
  for (let i = 0; i < RANK_SIZE + 3; i++) p = addRanking(p, 1, 'X' + i, { sales: 300000 + i }, 10 + i).progress;
  assert.equal(rankingOf(p, 1).length, RANK_SIZE);
  assert.equal(addRanking(p, 1, 'low', { sales: 1 }, 99).rank, 0, 'below the kept list');
  // finishing another game must not wipe the ranking
  p = recordResult(p, 1, { sales: 1000, cleared: false, stars: 0 }).progress;
  assert.equal(rankingOf(p, 1).length, RANK_SIZE);
});
