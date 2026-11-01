// TEMPORARY ART: SVG stand-ins drawn in the glossy toy style of the Art Direction V1.0.
// Replace with final rendered assets (see docs/v0.3-assets.md) without changing game code:
// every function returns markup for one slot of the UI.

// Shared gradients. Inserted once into the page by main.js.
export const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="g-skin" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffe2c8"/><stop offset=".7" stop-color="#f7c39b"/><stop offset="1" stop-color="#e7a37a"/></radialGradient>
  <radialGradient id="g-shine" cx="35%" cy="25%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="g-red" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ff6b5e"/><stop offset=".6" stop-color="#d92d2f"/><stop offset="1" stop-color="#9c1a20"/></radialGradient>
  <radialGradient id="g-navy" cx="40%" cy="20%" r="85%"><stop offset="0" stop-color="#4f6fb0"/><stop offset="1" stop-color="#22325e"/></radialGradient>
  <radialGradient id="g-teal" cx="40%" cy="20%" r="85%"><stop offset="0" stop-color="#5fc7b7"/><stop offset="1" stop-color="#227a74"/></radialGradient>
  <radialGradient id="g-mustard" cx="40%" cy="20%" r="85%"><stop offset="0" stop-color="#ffd877"/><stop offset="1" stop-color="#d9962b"/></radialGradient>
  <radialGradient id="g-plum" cx="40%" cy="20%" r="85%"><stop offset="0" stop-color="#b47ad6"/><stop offset="1" stop-color="#5d2f86"/></radialGradient>
  <radialGradient id="g-mint" cx="40%" cy="25%" r="80%"><stop offset="0" stop-color="#b6ebcf"/><stop offset="1" stop-color="#4f9a77"/></radialGradient>
  <linearGradient id="g-hair-brown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5634"/><stop offset="1" stop-color="#4e2c19"/></linearGradient>
  <linearGradient id="g-hair-blonde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a1"/><stop offset="1" stop-color="#e2ad4f"/></linearGradient>
  <linearGradient id="g-hair-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4350"/><stop offset="1" stop-color="#1e1a22"/></linearGradient>
  <linearGradient id="g-hair-auburn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8743c"/><stop offset="1" stop-color="#8f3a1b"/></linearGradient>
  <radialGradient id="g-iris" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#6aa7e0"/><stop offset="1" stop-color="#1f3f73"/></radialGradient>
  <radialGradient id="g-iris-brown" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#9a6a45"/><stop offset="1" stop-color="#3b2214"/></radialGradient>
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

// --- Customers ---------------------------------------------------------------------------
// One SVG holds every expression; the wrapper's mood-* class shows the matching parts.

const OUTFITS = [
  { shirt: 'g-navy', hair: 'g-hair-brown', iris: 'g-iris-brown' }, // red "S" cap
  { shirt: 'g-teal', hair: 'g-hair-blonde', iris: 'g-iris' }, // red ribbon
  { shirt: 'g-mustard', hair: 'g-hair-black', iris: 'g-iris-brown' }, // mint beanie + glasses
  { shirt: 'g-plum', hair: 'g-hair-auburn', iris: 'g-iris' }, // curly bob + freckles
];

function hairBack(v) {
  const f = `url(#${OUTFITS[v].hair})`;
  if (v === 1) return `<path d="M38 96 C30 150 44 186 60 190 L140 190 C156 186 170 150 162 96 Z" fill="${f}"/>
    <circle cx="44" cy="160" r="16" fill="${f}"/><circle cx="156" cy="160" r="16" fill="${f}"/>`;
  if (v === 3) return `<g fill="${f}">${[36, 52, 148, 164].map((x, i) => `<circle cx="${x}" cy="${120 + (i % 2) * 18}" r="18"/>`).join('')}</g>`;
  return '';
}

function hairFront(v) {
  const f = `url(#${OUTFITS[v].hair})`;
  switch (v) {
    case 0: // brown tufts under a red cap with an S
      return `<path d="M44 84 Q50 112 66 100 Q72 116 86 104 Q98 118 112 104 Q126 116 134 100 Q150 112 156 84 Z" fill="${f}"/>
        <path d="M40 80 C40 30 160 30 160 80 Z" fill="url(#g-red)"/>
        <path d="M40 80 Q100 70 160 80 L176 88 Q100 78 34 90 Z" fill="#a51e24"/>
        <ellipse cx="88" cy="48" rx="26" ry="10" fill="url(#g-shine)"/>
        <circle cx="100" cy="58" r="15" fill="#fff"/>
        <text x="100" y="65" text-anchor="middle" font-size="22" font-weight="900" fill="#d92d2f" font-family="Arial Black,Arial">S</text>`;
    case 1: // blonde fringe and a big red bow
      return `<path d="M38 96 C34 40 166 40 162 96 Q150 70 128 74 Q110 60 96 76 Q80 62 60 78 Q46 76 38 96 Z" fill="${f}"/>
        <g transform="translate(100 36)"><path d="M0 0 L-42 -22 Q-50 0 -42 22 Z" fill="url(#g-red)"/><path d="M0 0 L42 -22 Q50 0 42 22 Z" fill="url(#g-red)"/>
        <circle r="11" fill="#b8202a"/><ellipse cx="-30" cy="-6" rx="8" ry="4" fill="url(#g-shine)"/></g>`;
    case 2: // black hair and a mint beanie
      return `<path d="M42 96 Q48 70 70 74 Q100 64 130 74 Q152 70 158 96 Z" fill="${f}"/>
        <path d="M42 82 C42 22 158 22 158 82 Z" fill="url(#g-mint)"/>
        <rect x="38" y="72" width="124" height="18" rx="9" fill="#3f8a67"/>
        <circle cx="100" cy="24" r="12" fill="#e8fff2"/>
        <ellipse cx="80" cy="46" rx="20" ry="8" fill="url(#g-shine)"/>`;
    default: // auburn curls
      return `<g fill="${f}">${[[56, 66, 22], [80, 52, 24], [108, 48, 25], [136, 58, 22], [152, 80, 17], [46, 86, 17]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
        <ellipse cx="92" cy="46" rx="18" ry="7" fill="url(#g-shine)"/>`;
  }
}

function face(v) {
  const iris = `url(#${OUTFITS[v].iris})`;
  const eye = (x) => `<ellipse cx="${x}" cy="112" rx="11" ry="13" fill="#fff"/>
    <ellipse cx="${x}" cy="114" rx="8.5" ry="10" fill="${iris}"/><circle cx="${x}" cy="115" r="4" fill="#111"/>
    <circle cx="${x - 3}" cy="109" r="3.2" fill="#fff"/><circle cx="${x + 3}" cy="118" r="1.4" fill="#fff"/>`;
  const glasses = v === 2
    ? `<g fill="none" stroke="#272326" stroke-width="3.5"><circle cx="80" cy="113" r="16"/><circle cx="120" cy="113" r="16"/><path d="M96 112 H104"/></g>`
    : '';
  const freckles = v === 3 ? `<g fill="#c9784c" opacity=".6"><circle cx="66" cy="130" r="1.6"/><circle cx="72" cy="134" r="1.6"/><circle cx="128" cy="130" r="1.6"/><circle cx="134" cy="134" r="1.6"/></g>` : '';
  return `
    <g class="e-open">${eye(80)}${eye(120)}</g>
    <g class="e-closed" fill="none" stroke="#3a2418" stroke-width="4" stroke-linecap="round">
      <path d="M69 114 Q80 102 91 114"/><path d="M109 114 Q120 102 131 114"/></g>
    <g class="e-lid"><path d="M68 106 Q80 100 92 106 L92 110 L68 110 Z" fill="url(#g-skin)"/><path d="M108 106 Q120 100 132 106 L132 110 L108 110 Z" fill="url(#g-skin)"/></g>
    <g class="e-brow-angry" stroke="#3a2418" stroke-width="4" stroke-linecap="round"><path d="M68 96 L90 102"/><path d="M132 96 L110 102"/></g>
    <g class="e-brow-worry" stroke="#3a2418" stroke-width="3.5" stroke-linecap="round"><path d="M70 100 L90 95"/><path d="M130 100 L110 95"/></g>
    ${glasses}
    <ellipse cx="64" cy="132" rx="10" ry="6" fill="#ff8f8f" opacity=".55" class="blush"/>
    <ellipse cx="136" cy="132" rx="10" ry="6" fill="#ff8f8f" opacity=".55" class="blush"/>
    ${freckles}
    <path class="m-smile" d="M88 134 Q100 146 112 134" fill="none" stroke="#7a2a1e" stroke-width="4" stroke-linecap="round"/>
    <path class="m-flat" d="M90 138 H110" stroke="#7a2a1e" stroke-width="4" stroke-linecap="round"/>
    <path class="m-frown" d="M88 142 Q100 132 112 142" fill="none" stroke="#7a2a1e" stroke-width="4" stroke-linecap="round"/>
    <g class="m-laugh"><path d="M84 130 Q100 158 116 130 Z" fill="#7a2a1e"/><path d="M92 144 Q100 150 108 144 Q100 140 92 144 Z" fill="#ff7d7d"/></g>
    <path class="sweat" d="M146 92 Q154 104 148 110 Q140 108 146 92 Z" fill="#8fd3ff" stroke="#4aa3d8" stroke-width="1.5"/>`;
}

export function customerSVG(v) {
  const shirt = `url(#${OUTFITS[v].shirt})`;
  return `<svg viewBox="0 0 200 210" class="cust-svg">
    ${hairBack(v)}
    <path d="M40 210 C40 168 64 154 100 154 C136 154 160 168 160 210 Z" fill="${shirt}"/>
    <ellipse cx="82" cy="170" rx="22" ry="7" fill="url(#g-shine)" opacity=".6"/>
    ${v === 0 ? '<path d="M82 156 L100 180 L118 156" fill="none" stroke="#e9e9f2" stroke-width="6"/>' : ''}
    ${v === 1 ? '<path d="M80 156 Q100 172 120 156" fill="none" stroke="#e9fff9" stroke-width="5"/>' : ''}
    <ellipse cx="40" cy="116" rx="11" ry="14" fill="url(#g-skin)"/><ellipse cx="160" cy="116" rx="11" ry="14" fill="url(#g-skin)"/>
    <ellipse cx="100" cy="110" rx="62" ry="58" fill="url(#g-skin)"/>
    <ellipse cx="80" cy="82" rx="28" ry="14" fill="url(#g-shine)" opacity=".5"/>
    ${face(v)}
    ${hairFront(v)}
  </svg>`;
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
