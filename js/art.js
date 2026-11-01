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
