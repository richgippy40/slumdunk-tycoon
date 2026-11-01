// Rules tests for js/logic.js. Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE1, createGame, update, tapGrill, tapIngredient, undo, cookProgress, nextIngredient,
  customerMood,
} from '../js/logic.js';

const step = (g, seconds, dt = 0.05) => {
  for (let s = 0; s < seconds - 1e-9; s += dt) update(g, dt);
};
const types = (g) => g.events.map((e) => e.type);
const cookTo = (g, p) => {
  tapGrill(g);
  step(g, p * g.cfg.cookTime);
  tapGrill(g);
  return g.events.filter((e) => e.type === 'cooked').pop();
};
const build = (g, keys) => keys.forEach((k) => tapIngredient(g, k));

test('first customer arrives in seat 1 at start; other seats locked', () => {
  const g = createGame(STAGE1, 1);
  step(g, 1);
  assert.equal(g.unlocked, 1);
  assert.ok(g.slots[0]);
  assert.deepEqual(g.slots.slice(1), [null, null, null]);
});

test('seats unlock 1 -> 4 over the stage', () => {
  const g = createGame(STAGE1, 1);
  const at = {};
  for (let i = 0; i < 300 / 0.05; i++) {
    update(g, 0.05);
    if (!(g.unlocked in at)) at[g.unlocked] = g.t;
  }
  assert.ok(Math.abs(at[2] - 50) < 0.1 && Math.abs(at[3] - 130) < 0.1 && Math.abs(at[4] - 210) < 0.1, JSON.stringify(at));
});

test('arrivals speed up and patience shrinks over time', () => {
  const g = createGame(STAGE1, 7);
  step(g, 299);
  const arrivals = g.events.filter((e) => e.type === 'arrive');
  assert.ok(arrivals.length > 10);
  const early = createGame(STAGE1, 7);
  step(early, 1);
  const lateC = g.slots.find(Boolean);
  assert.ok(lateC.patience < early.slots[0].patience);
});

test('cook grades: raw MISS, PERFECT, GOOD, burnt MISS, auto-burn', () => {
  const z = STAGE1.zones;
  let g = createGame(STAGE1, 1);
  assert.equal(cookTo(g, z.raw - 0.05).grade, 'MISS');
  assert.equal(g.stock.length, 0);
  assert.equal(cookTo(g, (z.raw + z.perfect) / 2).grade, 'PERFECT');
  assert.equal(cookTo(g, (z.perfect + z.good) / 2).grade, 'GOOD');
  assert.deepEqual(g.stock, ['PERFECT', 'GOOD']);
  g = createGame(STAGE1, 1);
  assert.equal(cookTo(g, z.good + 0.05).reason, 'burnt');
  tapGrill(g);
  step(g, STAGE1.cookTime + 0.2);
  const last = g.events.filter((e) => e.type === 'cooked').pop();
  assert.equal(last.grade, 'MISS');
  assert.equal(last.auto, true);
  assert.equal(g.grill.cooking, false);
  assert.deepEqual(g.grades, { PERFECT: 0, GOOD: 0, MISS: 2 });
});

test('patty stock is capped', () => {
  const g = createGame(STAGE1, 1);
  cookTo(g, 0.5);
  cookTo(g, 0.5);
  tapGrill(g);
  assert.equal(g.grill.cooking, false);
  assert.equal(types(g).pop(), 'grillFull');
});

test('meat needs a cooked patty; next ingredient follows the recipe', () => {
  const g = createGame(STAGE1, 1);
  build(g, ['bottom', 'sauce', 'pickle']);
  assert.equal(nextIngredient(g), 'meat');
  tapIngredient(g, 'meat');
  assert.equal(types(g).pop(), 'needPatty');
  assert.equal(g.stack.length, 3);
  cookTo(g, 0.5);
  tapIngredient(g, 'meat');
  assert.equal(g.stack.length, 4);
  assert.equal(nextIngredient(g), 'cheese');
});

test('wrong ingredient is placed, blocks further taps, and undo fixes it', () => {
  const g = createGame(STAGE1, 1);
  tapIngredient(g, 'bottom');
  tapIngredient(g, 'cheese');
  assert.deepEqual(g.stack.map((l) => l.ok), [true, false]);
  assert.equal(nextIngredient(g), null);
  tapIngredient(g, 'sauce');
  assert.equal(types(g).pop(), 'blocked');
  assert.equal(g.stack.length, 2);
  undo(g);
  tapIngredient(g, 'sauce');
  assert.deepEqual(g.stack.map((l) => l.key), ['bottom', 'sauce']);
});

test('undo of meat returns the patty to stock', () => {
  const g = createGame(STAGE1, 1);
  cookTo(g, 0.5);
  build(g, ['bottom', 'sauce', 'pickle', 'meat']);
  assert.equal(g.stock.length, 0);
  undo(g);
  assert.deepEqual(g.stock, ['PERFECT']);
});

test('last ingredient auto-completes and auto-serves the longest-waiting customer', () => {
  const g = createGame(STAGE1, 1);
  step(g, 1);
  cookTo(g, 0.5);
  build(g, STAGE1.recipe);
  const served = g.events.find((e) => e.type === 'served');
  assert.ok(served);
  assert.equal(served.slot, 0);
  assert.equal(served.tip, 1500); // served within 10 s
  assert.equal(served.bonus, 500); // PERFECT patty
  assert.equal(g.sales, 8900 + 1500 + 500);
  assert.equal(g.stack.length, 0);
  assert.equal(g.slots[0].status, 'happy');
  step(g, 1.3);
  assert.ok(g.events.some((e) => e.type === 'gone' && e.id === served.id));
});

test('tip tiers: fast 1,500 / normal 700 / slow 0', () => {
  for (const [wait, tip] of [[5, 1500], [15, 700], [25, 0]]) {
    const g = createGame(STAGE1, 1);
    step(g, 0.7);
    step(g, wait - 0.1 - STAGE1.cookTime * 0.7);
    cookTo(g, 0.7); // GOOD patty, no bonus
    build(g, STAGE1.recipe);
    const s = g.events.find((e) => e.type === 'served');
    assert.equal(s.tip, tip, `wait ${s.wait}`);
    assert.equal(s.bonus, 0);
  }
});

test('finished burger waits on the plate when nobody is waiting', () => {
  const g = createGame(STAGE1, 1);
  cookTo(g, 0.5); // 3 s in: customer 1 present
  g.slots[0].status = 'angry';
  g.slots[0].until = g.t + 10;
  build(g, STAGE1.recipe);
  assert.equal(g.plated, true);
  tapIngredient(g, 'bottom');
  assert.equal(types(g).pop(), 'plateBusy');
  step(g, 12);
  assert.ok(g.events.some((e) => e.type === 'served'));
  assert.equal(g.plated, false);
});

test('customers lose patience, leave angry, and count as lost', () => {
  const g = createGame(STAGE1, 1);
  step(g, 1);
  assert.equal(customerMood(g, g.slots[0]), 'normal');
  step(g, 25);
  assert.equal(customerMood(g, g.slots[0]), 'waiting');
  step(g, 20);
  assert.equal(g.lost, 1);
  assert.ok(types(g).includes('left'));
});

test('stage ends at exactly 5:00 with a result; inputs are ignored after', () => {
  const g = createGame(STAGE1, 1);
  step(g, 310);
  assert.equal(g.t, 300);
  assert.equal(g.ended, true);
  assert.equal(g.result.cleared, false);
  tapGrill(g);
  tapIngredient(g, 'bottom');
  assert.equal(g.grill.cooking, false);
  assert.equal(g.stack.length, 0);
});

// A simulated staff member: one action every `reaction` seconds, presses the grill in the
// PERFECT zone, cooks ahead while assembling, never makes mistakes.
function playBot(reaction, seed) {
  const g = createGame(STAGE1, seed);
  let busyUntil = 0;
  const z = STAGE1.zones;
  const perfectAt = (z.raw + z.perfect) / 2;
  while (!g.ended) {
    update(g, 0.05);
    if (g.t < busyUntil) continue;
    const p = cookProgress(g);
    let acted = true;
    if (g.grill.cooking && p >= perfectAt) tapGrill(g);
    else if (!g.grill.cooking && g.stock.length < STAGE1.pattyStockMax) tapGrill(g);
    else {
      const next = nextIngredient(g);
      if (next && (next !== 'meat' || g.stock.length) && g.slots.some((c) => c && c.status === 'waiting')) {
        tapIngredient(g, next);
      } else acted = false;
    }
    if (acted) busyUntil = g.t + reaction;
  }
  return g.result;
}

test('balance: target is reachable for a steady player, not for a slow one', () => {
  const fast = playBot(0.45, 3);
  const slow = playBot(1.0, 3);
  console.log('bot 0.45s/tap', JSON.stringify(fast));
  console.log('bot 1.0s/tap', JSON.stringify(slow));
  assert.ok(fast.cleared, 'steady player should reach 350,000');
  assert.ok(!slow.cleared, 'slow player should fall short');
});
