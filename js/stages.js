// Stage configs. Stages 2-5 extend STAGE1 (logic.js) with data only; every number marked
// (sim) was set from tests/balance.mjs, not guessed.
//
// V0.5: every stage lasts 2 minutes (was 5) and is 30% easier. STAGE1 in logic.js keeps the
// V0.3 5-minute values as the engine's rules baseline; the playable Stage 1 below overrides
// only its clock, seat schedule, target and stars. Recipe, price, grill zones and tips are
// unchanged. Targets: simulated "casual" player (0.8 s/tap) x calibration x EASE.
import { STAGE1 } from './logic.js';

export const DURATION = 120;
export const EASE = 0.7; // 30% lower target and star thresholds than the calibrated values
const TIMED = { duration: DURATION };

const SIDES = {
  sides: {
    fries: { batch: 3, time: 5, max: 6 }, // one tap fries 3 portions
    drink: { time: 1.2, max: 4 }, // one tap pours one cup; taps queue
  },
  sidePrices: { fries: 1900, drink: 1500 },
  setBonus: 1000, // burger + fries + drink
  sidePatience: 5, // extra seconds per side item in an order
};

const COMBO = {
  // Serve streak: +200 per consecutive serve (max +2,000); every 8th serve starts FEVER.
  // Tuned for 2 minutes: FEVER every 5 serves for 10 seconds.
  combo: { step: 200, cap: 2000, feverEvery: 5, feverTime: 10, feverMult: 1.5 },
};

export const STAGES = [
  {
    ...STAGE1,
    ...TIMED,
    id: 1,
    name: 'JUST CHEESE',
    title: '첫 영업',
    target: 90000, // (sim x EASE)
    stars: [130000, 160000], // (sim x EASE)
    slotUnlocks: [0, 20, 50, 80],
    howto: [
      '<b>두 그릴</b>에서 패티를 각각 굽고, <b class="c-perfect">초록 PERFECT</b>에서 한 번 더 탭!',
      '<b>빛나는 재료</b>를 순서대로 탭하면 버거가 쌓여요.',
      '마지막 재료를 넣으면 <b>자동으로 서빙</b>! 빨리 내면 <b class="c-gold">팁</b>까지.',
    ],
    clearText: '목표 매출 달성! 첫 영업 대성공!',
  },
  {
    ...STAGE1,
    ...SIDES,
    ...TIMED,
    id: 2,
    name: 'COMBO TIME',
    title: '세트 메뉴 오픈',
    target: 95000, // (sim x EASE)
    stars: [135000, 170000], // (sim x EASE)
    orders: { fries: [0.35, 0.6], drink: [0.35, 0.6] }, // chance per order, start -> end
    slotUnlocks: [0, 15, 45, 75],
    spawnDelay: [5, 3.2],
    patience: [48, 38],
    howto: [
      '<b>프라이어</b>를 한 번 탭하면 감자튀김 <b>3개</b>가 자동으로 튀겨져요.',
      '<b>음료 기계</b>를 탭하면 한 잔씩 따라요. 여러 번 탭해도 OK.',
      '버거가 완성되면 사이드까지 <b>자동 세트 서빙</b>! 세트는 <b class="c-gold">보너스</b>.',
    ],
    clearText: '세트 메뉴 데뷔 성공!',
  },
  {
    ...STAGE1,
    ...SIDES,
    ...TIMED,
    id: 3,
    name: 'BURGER COLLECTION',
    title: '신메뉴 출시',
    target: 100000, // (sim x EASE)
    stars: [150000, 180000], // (sim x EASE)
    burgers: [
      { id: 'cheese', weight: 2 },
      { id: 'bacon', weight: 3 },
      { id: 'allday', weight: 3, from: 40 }, // NEW MENU beat mid-stage
    ],
    orders: { fries: [0.15, 0.3], drink: [0.15, 0.3] },
    slotUnlocks: [0, 12, 40, 70],
    spawnDelay: [5.5, 3.4],
    patience: [50, 40],
    howto: [
      '손님마다 <b>버거가 달라요</b>. 말풍선과 조립대 위 <b>레시피</b>를 보세요.',
      '재료판은 <b>지금 만드는 버거</b>에 맞춰 바뀌어요. 빛나는 재료만 탭!',
      '0:40에 <b class="c-gold">신메뉴</b>가 등장해요.',
    ],
    clearText: '신메뉴 3종 완벽 마스터!',
  },
  {
    ...STAGE1,
    ...SIDES,
    ...COMBO,
    ...TIMED,
    id: 4,
    name: 'RUSH HOUR',
    title: '피크 타임',
    target: 130000, // (sim x EASE)
    stars: [185000, 265000], // (sim x EASE)
    burgers: [
      { id: 'cheese', weight: 3 },
      { id: 'bacon', weight: 3 },
      { id: 'allday', weight: 3 },
    ],
    orders: { fries: [0.35, 0.5], drink: [0.35, 0.5] },
    slotUnlocks: [0, 0, 10, 20],
    spawnDelay: [4.6, 3.6],
    patience: [48, 42],
    rush: [
      { from: 20, to: 45 },
      { from: 75, to: 120 },
    ],
    rushDelay: 1.8,
    rushBonus: 1000, // every serve during a rush
    howto: [
      '<b class="c-gold">RUSH HOUR</b>에는 손님이 몰려와요. 그 뒤엔 숨 돌릴 시간!',
      '손님을 놓치지 않고 연속 서빙하면 <b>COMBO</b> 보너스.',
      '<b>5콤보</b>마다 <b class="c-gold">FEVER</b> — 10초 동안 매출 ×1.5!',
    ],
    clearText: '러시아워를 완벽하게 버텼어요!',
  },
  {
    ...STAGE1,
    ...SIDES,
    ...COMBO,
    ...TIMED,
    id: 5,
    name: 'GRAND OPENING',
    title: '그랜드 오픈',
    target: 160000, // (sim x EASE)
    stars: [220000, 300000], // (sim x EASE)
    burgers: [
      { id: 'cheese', weight: 3 },
      { id: 'bacon', weight: 3 },
      { id: 'allday', weight: 3 },
    ],
    orders: { fries: [0.4, 0.55], drink: [0.4, 0.55] },
    slotUnlocks: [0, 0, 8, 15],
    spawnDelay: [4.6, 3.4],
    patience: [48, 42],
    groups: { times: [15, 50, 80], sizes: [2, 3], bonus: 3000, patienceBonus: 10, gapScale: 1.6 },
    vip: { times: [30, 65], burger: 'grand', patience: 70, tip: 5000 },
    lastCall: { at: 100, mult: 1.5 },
    howto: [
      '<b>단체 손님</b>이 함께 와요. 모두 서빙하면 <b class="c-gold">단체 보너스</b>!',
      '<b class="c-gold">VIP</b>는 패티 2장 <b>슬럼덩크 그랜드</b> 세트를 주문해요.',
      '마지막 20초 <b>LAST CALL</b> — 모든 매출 ×1.5!',
    ],
    clearText: 'SLUMDUNK 그랜드 오픈 대성공!',
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id);
