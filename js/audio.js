// TEMPORARY SOUND: short synthesized effects (Web Audio), no sound files needed.
// Replace play() bodies with sampled sounds later if desired.

let ctx = null;
let master = null;
let sizzle = null;
export let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.3, slide = 0 } = {}) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, freq = 3000, q = 0.8, loop = false } = {}) {
  const len = Math.floor(ctx.sampleRate * (loop ? 1 : dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (loop ? 0.6 + 0.4 * Math.random() : 1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
  if (!loop) src.stop(ctx.currentTime + dur);
  return { src, g };
}

const SOUNDS = {
  tap: () => tone(660, 0, 0.06, { type: 'triangle', vol: 0.15 }),
  place: () => {
    tone(220, 0, 0.09, { type: 'sine', vol: 0.35, slide: 0.6 });
    noise(0.05, { vol: 0.08, freq: 1200 });
  },
  wrong: () => {
    tone(180, 0, 0.12, { type: 'square', vol: 0.12 });
    tone(140, 0.1, 0.16, { type: 'square', vol: 0.12 });
  },
  perfect: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.18, { type: 'triangle', vol: 0.22 })),
  good: () => [659, 880].forEach((f, i) => tone(f, i * 0.07, 0.16, { type: 'triangle', vol: 0.2 })),
  miss: () => tone(200, 0, 0.35, { type: 'sawtooth', vol: 0.12, slide: 0.5 }),
  coin: () => {
    tone(1319, 0, 0.08, { type: 'square', vol: 0.12 });
    tone(1976, 0.07, 0.25, { type: 'square', vol: 0.12 });
  },
  happy: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.05, 0.12, { type: 'sine', vol: 0.18 })),
  angry: () => tone(330, 0, 0.3, { type: 'triangle', vol: 0.18, slide: 0.55 }),
  arrive: () => tone(988, 0, 0.12, { type: 'sine', vol: 0.12 }),
  unlock: () => [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.2, { type: 'triangle', vol: 0.16 })),
  tick: () => tone(1400, 0, 0.04, { type: 'square', vol: 0.06 }),
  end: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, { type: 'triangle', vol: 0.2 })),
};

export function play(name) {
  if (!ctx || muted) return;
  SOUNDS[name]?.();
}

export function setSizzle(on) {
  if (!ctx) return;
  if (on && !sizzle) sizzle = noise(1, { vol: 0.05, freq: 5000, q: 0.5, loop: true });
  if (!on && sizzle) {
    sizzle.src.stop();
    sizzle = null;
  }
}
