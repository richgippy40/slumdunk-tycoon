// Menu data: ingredients, burgers and sides. Adding a burger = adding one entry here
// (plus its layer/icon art in art.js). Stage configs in stages.js reference these ids.
//
// NOTE: recipes and prices for burgers other than JUST CHEESE are game hypotheses,
// not confirmed SLUMDUNK store recipes. Edit freely; the tests check structure, not values.

export const LABELS = {
  bottom: '아랫번',
  sauce: '소스',
  pickle: '피클',
  meat: '패티',
  cheese: '치즈',
  onion: '어니언',
  top: '윗번',
  lettuce: '양상추',
  tomato: '토마토',
  bacon: '베이컨',
  egg: '계란',
};

export const BURGERS = {
  cheese: {
    name: '저스트치즈버거',
    short: 'JUST CHEESE',
    price: 8900,
    recipe: ['bottom', 'sauce', 'pickle', 'meat', 'cheese', 'onion', 'top'],
  },
  bacon: {
    name: '베이컨치즈버거',
    short: 'BACON CHEESE',
    price: 10900,
    recipe: ['bottom', 'sauce', 'lettuce', 'meat', 'cheese', 'bacon', 'top'],
  },
  allday: {
    name: '올데이버거',
    short: 'ALL DAY',
    price: 11900,
    recipe: ['bottom', 'sauce', 'tomato', 'meat', 'egg', 'bacon', 'top'],
  },
  // Stage 5 VIP signature: double patty uses the existing grill skill, no new control.
  grand: {
    name: '슬럼덩크 그랜드',
    short: 'GRAND',
    price: 16900,
    recipe: ['bottom', 'sauce', 'meat', 'cheese', 'meat', 'cheese', 'bacon', 'top'],
  },
};

export const SIDES = {
  fries: { name: '감자튀김', price: 1900 },
  drink: { name: '콜라', price: 1500 },
};
