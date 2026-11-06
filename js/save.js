// Progress saved in this browser only (localStorage). No server, no account: clearing site
// data or switching device/browser resets it. Falls back to memory if storage is blocked.
const KEY = 'slumdunk-tycoon.progress.v1';
let memory = null;

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.stages === 'object') return p;
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return memory || { stages: {} };
}

function persist(p) {
  memory = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* keep in memory for this visit */ }
}

// Merge a finished game into the stored bests. Returns { progress, newBest, firstClear }.
export function recordResult(progress, id, r) {
  const prev = progress.stages[id] || { cleared: false, best: 0, stars: 0, bestCombo: 0, plays: 0 };
  const next = {
    cleared: prev.cleared || r.cleared,
    best: Math.max(prev.best, r.sales),
    stars: Math.max(prev.stars, r.stars || 0),
    bestCombo: Math.max(prev.bestCombo, r.bestCombo || 0),
    plays: prev.plays + 1,
  };
  const updated = { ...progress, stages: { ...progress.stages, [id]: next } };
  persist(updated);
  return { progress: updated, newBest: r.sales > prev.best && prev.plays > 0, firstClear: r.cleared && !prev.cleared };
}

// Stage 1 is always open; each later stage opens when the previous one is cleared.
// `?unlock=all` in the URL opens every stage (for staff demos and QA), without saving.
export function isUnlocked(progress, id, unlockAll = false) {
  return unlockAll || id === 1 || !!progress.stages[id - 1]?.cleared;
}

export function resetProgress() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch { /* nothing to remove */ }
}
