// Simulated player for balance tests. One action every `reaction` seconds; presses the grill
// in the middle of the PERFECT zone when free to; keeps sides stocked only when an order
// needs them; taps the glowing ingredient. `mistakes` = chance a tap is a wrong ingredient
// (costs that tap plus an undo).
import {
  createGame, update, tapGrill, tapIngredient, undo, cookProgress, nextIngredient,
  pattyCapacityUsed, tapFryer, tapDrink, sideShortfall, currentRecipe,
} from '../js/logic.js';

export function playBot(cfg, { reaction = 0.6, seed = 1, mistakes = 0, lanes = 2 } = {}) {
  const g = createGame(cfg, seed);
  const z = cfg.zones;
  const perfectAt = (z.raw + z.perfect) / 2;
  let busyUntil = 0;
  let taps = 0;
  let mrng = seed * 7919;
  const chance = () => ((mrng = (mrng * 16807) % 2147483647) / 2147483647);
  const waiting = () => g.slots.some((c) => c && c.status === 'waiting');
  while (!g.ended) {
    update(g, 0.05);
    g.events.length = 0;
    if (g.t < busyUntil) continue;
    let acted = true;
    const top = g.stack[g.stack.length - 1];
    const lane = [...Array(lanes).keys()].find((l) => g.grills[l].cooking && cookProgress(g, l) >= perfectAt);
    const idle = [...Array(lanes).keys()].find((l) => !g.grills[l].cooking);
    const short = sideShortfall(g);
    const next = nextIngredient(g);
    if (top && !top.ok) undo(g);
    else if (lane !== undefined) tapGrill(g, lane);
    else if (idle !== undefined && pattyCapacityUsed(g) < cfg.pattyStockMax) tapGrill(g, idle);
    else if (short.fries && !g.fryer.cooking && g.fries + cfg.sides.fries.batch <= cfg.sides.fries.max) tapFryer(g);
    else if (short.drink) tapDrink(g);
    else if (next && (next !== 'meat' || g.stock.length) && waiting()) {
      if (mistakes && chance() < mistakes) {
        const wrong = currentRecipe(g).find((k) => k !== next && k !== 'meat') || 'bottom';
        tapIngredient(g, wrong);
      } else tapIngredient(g, next);
    } else acted = false;
    if (acted) {
      taps++;
      busyUntil = g.t + reaction;
    }
  }
  return { ...g.result, taps };
}

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
