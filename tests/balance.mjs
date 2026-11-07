// Balance report: node tests/balance.mjs
// Plays every stage with simulated players of different speeds over many seeds and prints
// median sales, clear rate, stars and lost customers. Targets in js/stages.js come from here.
import { STAGES } from '../js/stages.js';
import { playBot, median } from './sim.mjs';

const PLAYERS = [
  { name: 'expert 0.45s', reaction: 0.45, mistakes: 0 },
  { name: 'good 0.6s', reaction: 0.6, mistakes: 0.02 },
  { name: 'casual 0.8s', reaction: 0.8, mistakes: 0.05 },
  { name: 'new 1.0s', reaction: 1.0, mistakes: 0.08 },
  { name: 'slow 1.3s', reaction: 1.3, mistakes: 0.1 },
];
const SEEDS = Number(process.env.SEEDS || 30);

for (const cfg of STAGES) {
  console.log(`\nSTAGE ${cfg.id} ${cfg.name}  target ₩${cfg.target.toLocaleString()}  stars ${cfg.stars.map((s) => '₩' + s.toLocaleString()).join(' / ')}`);
  for (const p of PLAYERS) {
    const runs = Array.from({ length: SEEDS }, (_, i) => playBot(cfg, { ...p, seed: i + 1 }));
    const clear = runs.filter((r) => r.cleared).length / runs.length;
    console.log(
      `  ${p.name.padEnd(13)} sales ₩${median(runs.map((r) => r.sales)).toLocaleString().padStart(9)}` +
        `  clear ${(clear * 100).toFixed(0).padStart(3)}%  stars ${median(runs.map((r) => r.stars))}` +
        `  served ${median(runs.map((r) => r.served))}  lost ${median(runs.map((r) => r.lost))}` +
        `  taps/min ${(median(runs.map((r) => r.taps)) / (cfg.duration / 60)).toFixed(0)}` +
        (cfg.combo ? `  bestCombo ${median(runs.map((r) => r.bestCombo))} fevers ${median(runs.map((r) => r.fevers))}` : '') +
        (cfg.groups ? `  groups ${median(runs.map((r) => r.groups))} vip ${median(runs.map((r) => r.vip))}` : ''),
    );
  }
}
