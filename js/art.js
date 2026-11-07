import { CUSTOMERS } from './customers.js';

// TEMPORARY ART: SVG stand-ins drawn in the glossy toy style of the Art Direction V1.0.
// Replace with final rendered assets (see docs/v0.3-assets.md) without changing game code:
// every function returns markup for one slot of the UI.

// Shared gradients. Inserted once into the page by main.js.
export const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="g-shine" cx="35%" cy="25%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="g-red" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ff6b5e"/><stop offset=".6" stop-color="#d92d2f"/><stop offset="1" stop-color="#9c1a20"/></radialGradient>
  <radialGradient id="g-mustard" cx="40%" cy="20%" r="85%"><stop offset="0" stop-color="#ffd877"/><stop offset="1" stop-color="#d9962b"/></radialGradient>
  <linearGradient id="g-bun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb45a"/><stop offset=".55" stop-color="#e98a2c"/><stop offset="1" stop-color="#c3651c"/></linearGradient>
  <linearGradient id="g-bun-base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c47c"/><stop offset="1" stop-color="#d98a3a"/></linearGradient>
  <linearGradient id="g-patty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b4a2b"/><stop offset="1" stop-color="#4a2314"/></linearGradient>
  <linearGradient id="g-cheese" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f5a623"/></linearGradient>
  <radialGradient id="g-pickle" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#d9ef9a"/><stop offset=".65" stop-color="#9cc75a"/><stop offset="1" stop-color="#4f7d2b"/></radialGradient>
  <linearGradient id="g-sauce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc79a"/><stop offset="1" stop-color="#e98a5a"/></linearGradient>
  <linearGradient id="g-onion" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9893f"/><stop offset="1" stop-color="#8a4a1c"/></linearGradient>
  <radialGradient id="g-gold" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#f5be45"/><stop offset="1" stop-color="#b9821b"/></radialGradient>
  <linearGradient id="g-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d4cc"/></linearGradient>
  <linearGradient id="g-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset="1" stop-color="#a9a9ad"/></linearGradient>
</defs></svg>`;

// --- Customers: selected image assets only (no legacy SVG customers) ---
export function customerPortrait(v) {
  const customer = CUSTOMERS[v];
  if (!customer) throw new RangeError(`Unknown customer variant: ${v}`);
  return `<div class="cust-art" style="--portrait-zoom:${customer.zoom}"><img class="cust-portrait" src="${customer.src}" alt="${customer.name}" data-customer="${customer.id}" decoding="async" draggable="false" /></div>`;
}

// --- Food ----------------------------------------------------------------------------------

export const burgerIcon = `<svg viewBox="0 0 120 100" class="burger-icon">
  <ellipse cx="60" cy="88" rx="46" ry="8" fill="#000" opacity=".15"/>
  <path d="M16 70 Q16 86 60 86 Q104 86 104 70 Z" fill="url(#g-bun-base)"/>
  <rect x="12" y="56" width="96" height="16" rx="8" fill="url(#g-patty)"/>
  <path d="M14 54 H106 L98 64 L88 58 L76 68 L66 58 L50 66 L40 58 L26 66 Z" fill="url(#g-cheese)"/>
  <path d="M14 52 C14 14 106 14 106 52 Z" fill="url(#g-bun)"/>
  <ellipse cx="44" cy="30" rx="18" ry="7" fill="url(#g-shine)"/>
  <g fill="#fff4d6">${[[38, 38], [56, 28], [74, 36], [86, 44], [50, 46], [66, 44]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2" transform="rotate(-20 ${x} ${y})"/>`).join('')}</g>
</svg>`;

const pickleSlice = (cx, cy, r, rot = 0) => `<g transform="rotate(${rot} ${cx} ${cy})">
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.86}" fill="#4f7d2b"/>
  <ellipse cx="${cx}" cy="${cy - 1}" rx="${r * 0.88}" ry="${r * 0.74}" fill="url(#g-pickle)"/>
  ${[0, 72, 144, 216, 288].map((a) => {
    const x = cx + Math.cos((a * Math.PI) / 180) * r * 0.42;
    const y = cy - 1 + Math.sin((a * Math.PI) / 180) * r * 0.36;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * 0.12).toFixed(1)}" ry="${(r * 0.08).toFixed(1)}" fill="#f1f8c8"/>`;
  }).join('')}
  <ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.35}" rx="${r * 0.3}" ry="${r * 0.14}" fill="url(#g-shine)"/></g>`;

const onionRing = (cx, cy, rx, ry, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"
  fill="none" stroke="url(#g-onion)" stroke-width="7"/><ellipse cx="${cx - 2}" cy="${cy - 3}" rx="${rx * 0.6}" ry="${ry * 0.3}"
  transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="#f6c27f" stroke-width="2" opacity=".7"/>`;

// Tray icons (square tiles). Existing SLUMDUNK images are used where they exist.
export const ICONS = {
  bottom: '<img src="assets/bun_bottom.webp" alt="">',
  sauce: `<svg viewBox="0 0 100 80"><ellipse cx="50" cy="66" rx="40" ry="8" fill="#000" opacity=".12"/>
    <path d="M12 40 Q14 70 50 70 Q86 70 88 40 Z" fill="url(#g-bowl)"/><ellipse cx="50" cy="40" rx="38" ry="10" fill="#efe9df"/>
    <path d="M26 40 Q30 22 46 20 Q42 10 52 6 Q56 16 64 20 Q76 24 74 40 Q50 48 26 40 Z" fill="url(#g-sauce)"/>
    <ellipse cx="44" cy="24" rx="8" ry="4" fill="url(#g-shine)"/></svg>`,
  pickle: `<svg viewBox="0 0 100 80">${pickleSlice(36, 44, 24, -10)}${pickleSlice(64, 38, 24, 12)}</svg>`,
  meat: '<img src="assets/beef_ready.webp" alt="">',
  cheese: '<img src="assets/cheese.webp" alt="">',
  onion: `<svg viewBox="0 0 100 80">${[[34, 48, 16, 9, -20], [58, 52, 17, 9, 15], [46, 36, 15, 8, 30], [66, 34, 14, 8, -25], [30, 30, 12, 7, 10]]
    .map((r) => onionRing(...r)).join('')}</svg>`,
  top: '<img src="assets/bun_top.webp" alt="">',
};

// Burger layers seen from the side, for the assembly plate. h = visible thickness.
export const LAYERS = {
  bottom: { h: 46, html: '<img src="assets/bun_bottom.webp" alt="" style="height:84px;margin-top:-26px">' },
  sauce: { h: 10, html: `<svg viewBox="0 0 240 24" preserveAspectRatio="none" style="height:18px;margin-top:-4px"><path d="M8 10 Q20 22 40 16 Q60 24 80 16 Q100 24 120 16 Q140 24 160 16 Q180 24 200 16 Q220 22 232 10 Q120 -2 8 10 Z" fill="url(#g-sauce)"/></svg>` },
  pickle: { h: 16, html: `<svg viewBox="0 0 240 40" style="height:40px;margin-top:-14px">${[40, 92, 148, 200].map((x, i) => pickleSlice(x, 20, 24, i * 25 - 30)).join('')}</svg>` },
  meat: { h: 30, html: '<img src="assets/beef_ready.webp" alt="" style="width:92%;height:62px;margin-top:-16px">' },
  cheese: { h: 12, html: `<svg viewBox="0 0 240 40" preserveAspectRatio="none" style="height:30px;margin-top:-4px"><path d="M4 6 H236 L226 22 L214 14 L200 34 L184 14 L160 26 L140 12 L118 30 L96 14 L72 28 L54 14 L36 32 L22 14 L10 20 Z" fill="url(#g-cheese)"/><path d="M10 7 H230" stroke="#fff6b8" stroke-width="3" opacity=".8"/></svg>` },
  onion: { h: 18, html: `<svg viewBox="0 0 240 44" style="height:44px;margin-top:-16px">${[[40, 26, 22, 9, -8], [80, 22, 22, 10, 10], [122, 26, 24, 10, -4], [164, 22, 22, 10, 12], [202, 26, 20, 9, -10], [100, 14, 18, 8, 20], [146, 14, 18, 8, -15]]
    .map((r) => onionRing(...r)).join('')}</svg>` },
  top: { h: 60, html: '<img src="assets/bun_top.webp" alt="" style="height:116px;margin-top:-50px">' },
};

export const coinSVG = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#b9821b"/><circle cx="20" cy="19" r="17" fill="url(#g-gold)"/>
  <circle cx="20" cy="19" r="12" fill="none" stroke="#c98d1d" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="16" font-weight="900" fill="#a86f10" font-family="Arial Black,Arial">₩</text>
  <ellipse cx="14" cy="11" rx="6" ry="3" fill="#fff" opacity=".7"/></svg>`;

export const lockSVG = `<svg viewBox="0 0 60 70"><path d="M16 30 V20 a14 14 0 0 1 28 0 V30" fill="none" stroke="#c9c9cf" stroke-width="8"/>
  <rect x="8" y="28" width="44" height="36" rx="9" fill="url(#g-steel)"/><circle cx="30" cy="44" r="5" fill="#77777e"/><rect x="28" y="46" width="4" height="9" rx="2" fill="#77777e"/></svg>`;

export const heartSVG = `<svg viewBox="0 0 40 36"><path d="M20 34 C-6 16 4 -4 20 8 C36 -4 46 16 20 34 Z" fill="url(#g-red)"/><ellipse cx="12" cy="10" rx="5" ry="3" fill="#fff" opacity=".7"/></svg>`;

export const angrySVG = `<svg viewBox="0 0 40 40"><g stroke="#d92d2f" stroke-width="5" stroke-linecap="round" fill="none">
  <path d="M8 16 Q16 16 16 8"/><path d="M32 16 Q24 16 24 8"/><path d="M8 24 Q16 24 16 32"/><path d="M32 24 Q24 24 24 32"/></g></svg>`;

export const flameSVG = `<svg viewBox="0 0 30 36"><path d="M15 2 C20 12 28 14 26 24 C25 32 19 35 15 35 C9 35 4 31 4 24 C4 18 9 15 10 9 C13 13 13 16 15 18 C17 13 16 8 15 2 Z" fill="#ff7a1a"/>
  <path d="M15 16 C18 21 21 23 20 28 C19 32 16 33 15 33 C12 33 9 31 9 27 C9 24 12 22 13 19 C14 21 14 22 15 23 C16 21 16 19 15 16 Z" fill="#ffd34d"/></svg>`;
export const stackSVG = `<svg viewBox="0 0 30 30"><g fill="#e9e3dc"><path d="M15 3 L28 9 L15 15 L2 9 Z"/><path d="M2 14 L15 20 L28 14 L28 17 L15 23 L2 17 Z" opacity=".85"/><path d="M2 20 L15 26 L28 20 L28 23 L15 29 L2 23 Z" opacity=".7"/></g></svg>`;
export const trayTitleSVG = `<svg viewBox="0 0 30 30"><path d="M4 12 L15 5 L26 12 V24 H4 Z" fill="none" stroke="#e9e3dc" stroke-width="3" stroke-linejoin="round"/><path d="M4 16 H26" stroke="#e9e3dc" stroke-width="3"/></svg>`;
export const undoSVG = `<svg viewBox="0 0 48 48"><path d="M18 10 L6 20 L18 30" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8 20 H28 a12 12 0 0 1 0 24 H20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
export const timerSVG = `<svg viewBox="0 0 32 32"><circle cx="16" cy="18" r="11" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 11 V18 L21 21" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 3 H20 M16 3 V7" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
export const neonBurger = `<svg viewBox="0 0 160 120" class="neon"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
  <path d="M20 56 C20 14 140 14 140 56 Z" stroke="#ffb347"/><path d="M14 72 Q30 62 46 72 Q62 82 80 72 Q98 62 114 72 Q130 82 146 72" stroke="#ffd34d"/>
  <path d="M20 88 H140" stroke="#ff7a3c"/><path d="M24 100 Q24 112 80 112 Q136 112 136 100 Z" stroke="#ffb347"/></g></svg>`;
export const bottlesSVG = `<svg viewBox="0 0 120 140"><rect x="6" y="110" width="108" height="26" rx="6" fill="url(#g-steel)"/>
  <path d="M26 30 L36 10 L44 10 L54 30 L56 112 L24 112 Z" fill="url(#g-red)"/><rect x="34" y="2" width="12" height="10" rx="3" fill="#b8202a"/>
  <path d="M66 30 L76 10 L84 10 L94 30 L96 112 L64 112 Z" fill="url(#g-mustard)"/><rect x="74" y="2" width="12" height="10" rx="3" fill="#c98d1d"/>
  <ellipse cx="34" cy="60" rx="5" ry="22" fill="#fff" opacity=".35"/><ellipse cx="74" cy="60" rx="5" ry="22" fill="#fff" opacity=".35"/></svg>`;

// ---------- Stage 2-5 additions ----------
// Existing SLUMDUNK images reused for Stage 3 ingredients (were unused in Stage 1):
// lettuce.webp, tomato.webp, bacon.webp, onion.webp (actually a fried egg).
Object.assign(ICONS, {
  lettuce: '<img src="assets/lettuce.webp" alt="">',
  tomato: '<img src="assets/tomato.webp" alt="">',
  bacon: '<img src="assets/bacon.webp" alt="">',
  egg: '<img src="assets/onion.webp" alt="">',
});
// Top-down images pressed flat to read as side-view layers on the plate.
Object.assign(LAYERS, {
  lettuce: { h: 16, html: '<img src="assets/lettuce.webp" alt="" style="width:108%;height:46px;margin-top:-16px">' },
  tomato: { h: 18, html: '<img src="assets/tomato.webp" alt="" style="width:94%;height:44px;margin-top:-14px">' },
  bacon: { h: 14, html: '<img src="assets/bacon.webp" alt="" style="width:100%;height:42px;margin-top:-16px">' },
  egg: { h: 18, html: '<img src="assets/onion.webp" alt="" style="width:96%;height:50px;margin-top:-18px">' },
});

const bunTop = `<path d="M14 52 C14 14 106 14 106 52 Z" fill="url(#g-bun)"/>
  <ellipse cx="44" cy="30" rx="18" ry="7" fill="url(#g-shine)"/>
  <g fill="#fff4d6">${[[38, 38], [56, 28], [74, 36], [86, 44], [50, 46], [66, 44]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2" transform="rotate(-20 ${x} ${y})"/>`).join('')}</g>`;
const bunBase = `<ellipse cx="60" cy="88" rx="46" ry="8" fill="#000" opacity=".15"/><path d="M16 70 Q16 86 60 86 Q104 86 104 70 Z" fill="url(#g-bun-base)"/>`;
const lettuceBand = (y) => `<path d="M10 ${y} q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t10 0 v5 H10 Z" fill="#6cc04a"/>`;
const baconBand = (y) => `<path d="M12 ${y} q12 -7 24 0 t24 0 t24 0 t24 0 v6 q-12 7 -24 0 t-24 0 t-24 0 t-24 0 Z" fill="#c8402f"/><path d="M14 ${y + 2} q12 -6 24 0 t24 0 t24 0 t24 0" stroke="#ffb38a" stroke-width="2" fill="none"/>`;
const patty = (y) => `<rect x="12" y="${y}" width="96" height="14" rx="7" fill="url(#g-patty)"/>`;
const cheese = (y) => `<path d="M14 ${y} H106 L98 ${y + 9} L88 ${y + 4} L76 ${y + 12} L66 ${y + 4} L50 ${y + 11} L40 ${y + 4} L26 ${y + 11} Z" fill="url(#g-cheese)"/>`;
const svgWrap = (inner) => `<svg viewBox="0 0 120 100" class="burger-icon">${bunBase}${inner}${bunTop}</svg>`;

export const BURGER_ICONS = {
  default: burgerIcon,
  cheese: burgerIcon,
  bacon: svgWrap(`${lettuceBand(68)}${patty(57)}${cheese(55)}${baconBand(49)}`),
  allday: svgWrap(`<rect x="16" y="64" width="88" height="7" rx="3" fill="#e23b2e"/>${patty(54)}
    <ellipse cx="60" cy="54" rx="44" ry="6" fill="#fffaf0"/><ellipse cx="60" cy="52" rx="13" ry="5" fill="#ffb21f"/>${baconBand(45)}`),
  grand: svgWrap(`${patty(64)}${cheese(62)}${patty(52)}${cheese(50)}${baconBand(45)}`).replace('viewBox="0 0 120 100"', 'viewBox="0 -6 120 106"'),
};
export const burgerIconFor = (id) => BURGER_ICONS[id] || burgerIcon;

// TEMPORARY ART: fries, drink, fryer and fountain (no SLUMDUNK assets exist yet).
export const friesSVG = `<svg viewBox="0 0 80 90" class="fries-icon">
  <g>${[[22, 8, -10], [30, 2, -4], [38, 0, 2], [46, 4, 7], [54, 10, 12], [26, 14, -6], [42, 10, 0], [50, 16, 8]]
    .map(([x, y, r]) => `<rect x="${x}" y="${y}" width="8" height="46" rx="2" transform="rotate(${r} ${x + 4} ${y + 40})" fill="#ffd54a" stroke="#e0a21f" stroke-width="1.5"/>`).join('')}</g>
  <path d="M12 36 L68 36 L60 86 L20 86 Z" fill="url(#g-red)"/>
  <path d="M12 36 Q40 50 68 36" fill="#b8202a"/>
  <text x="40" y="70" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="Arial Black,Arial">SD</text>
  <ellipse cx="24" cy="54" rx="4" ry="14" fill="#fff" opacity=".3"/></svg>`;
export const drinkSVG = `<svg viewBox="0 0 70 96" class="drink-icon">
  <rect x="38" y="0" width="7" height="34" rx="3" fill="#f6efe6" transform="rotate(12 41 34)"/>
  <path d="M10 22 H60 L54 92 H16 Z" fill="#fff"/><path d="M10 22 H60 L58 40 H12 Z" fill="url(#g-red)"/>
  <path d="M14 62 Q35 54 56 62" stroke="#d92d2f" stroke-width="5" fill="none"/>
  <rect x="6" y="16" width="58" height="9" rx="4" fill="#e6e0d8"/>
  <ellipse cx="22" cy="58" rx="4" ry="18" fill="#000" opacity=".06"/></svg>`;
export const crownSVG = `<svg viewBox="0 0 60 40"><path d="M4 34 L8 8 L22 22 L30 4 L38 22 L52 8 L56 34 Z" fill="url(#g-gold)" stroke="#a86f10" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="30" cy="24" r="4" fill="#d92d2f"/></svg>`;
export const fryerSVG = `<svg viewBox="0 0 200 120" class="fryer-art">
  <rect x="10" y="40" width="180" height="76" rx="14" fill="url(#g-steel)"/>
  <rect x="24" y="34" width="152" height="40" rx="10" fill="#3a2a12"/>
  <rect x="28" y="42" width="144" height="28" rx="8" fill="#d99a2b" class="oil"/>
  <g class="bubbles">${[44, 70, 98, 124, 150].map((x, i) => `<circle cx="${x}" cy="${56 + (i % 2) * 6}" r="4" fill="#ffe08a"/>`).join('')}</g>
  <g class="basket"><rect x="46" y="2" width="108" height="50" rx="8" fill="none" stroke="#c9c9cf" stroke-width="5"/>
    <path d="M52 14 H148 M52 26 H148 M52 38 H148 M76 4 V50 M100 4 V50 M124 4 V50" stroke="#a9a9ad" stroke-width="2"/>
    <rect x="152" y="18" width="40" height="9" rx="4" fill="#272326"/></g></svg>`;
export const fountainSVG = `<svg viewBox="0 0 200 120" class="fountain-art">
  <rect x="34" y="0" width="132" height="58" rx="12" fill="url(#g-red)"/>
  <text x="100" y="38" text-anchor="middle" font-size="26" font-weight="900" fill="#fff" font-family="Arial Black,Arial">COLA</text>
  <rect x="88" y="56" width="24" height="12" rx="3" fill="#a9a9ad"/>
  <rect x="30" y="104" width="140" height="12" rx="5" fill="url(#g-steel)"/></svg>`;
