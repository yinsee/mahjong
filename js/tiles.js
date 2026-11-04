// Tile types: 0-8 万 (m), 9-17 筒 (p), 18-26 条 (s), 27-30 东南西北, 31 中, 32 發, 33 白, 34-41 flowers
export const NUM_TYPES = 34;
export const isSuited = t => t < 27;
export const isHonor = t => t >= 27 && t < 34;
export const isWind = t => t >= 27 && t <= 30;
export const isDragon = t => t >= 31 && t <= 33;
export const isFlower = t => t >= 34;
export const suitOf = t => (t < 27 ? Math.floor(t / 9) : 3);
export const rankOf = t => (t < 27 ? (t % 9) + 1 : 0);
export const isTerminal = t => t < 27 && (t % 9 === 0 || t % 9 === 8);
export const isTermOrHonor = t => isTerminal(t) || isHonor(t);
export const T = (suit, rank) => suit * 9 + rank - 1;

export const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
export const GREEN = new Set([T(2, 2), T(2, 3), T(2, 4), T(2, 6), T(2, 8), 32]);
// 推不倒: 1234589筒, 245689条, 白
export const REVERSIBLE = new Set([
  ...[1, 2, 3, 4, 5, 8, 9].map(r => T(1, r)),
  ...[2, 4, 5, 6, 8, 9].map(r => T(2, r)),
  33,
]);

// All 144 physical tiles: 4 x 34 + 8 flowers
export function allTileTypes() {
  const a = [];
  for (let t = 0; t < 34; t++) for (let k = 0; k < 4; k++) a.push(t);
  for (let f = 34; f < 42; f++) a.push(f);
  return a;
}

const SUIT_ZH = ['万', '筒', '条'];
const SUIT_EN = ['Crak', 'Dot', 'Bam'];
const NUM_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONOR_ZH = ['东', '南', '西', '北', '中', '发', '白'];
const HONOR_EN = ['East', 'South', 'West', 'North', 'Red', 'Green', 'White'];
const FLOWER_ZH = ['梅', '兰', '竹', '菊', '春', '夏', '秋', '冬'];
const FLOWER_EN = ['Plum', 'Orchid', 'Bamboo', 'Mum', 'Spring', 'Summer', 'Autumn', 'Winter'];

export function tileName(t, lang = 'zh') {
  if (t < 27) {
    return lang === 'zh' ? NUM_ZH[t % 9] + SUIT_ZH[suitOf(t)] : `${rankOf(t)} ${SUIT_EN[suitOf(t)]}`;
  }
  if (t < 34) return lang === 'zh' ? HONOR_ZH[t - 27] : HONOR_EN[t - 27];
  return lang === 'zh' ? FLOWER_ZH[t - 34] : FLOWER_EN[t - 34];
}
export const WIND_ZH = ['东', '南', '西', '北'];
export const WIND_EN = ['East', 'South', 'West', 'North'];

export function countsOf(types) {
  const c = new Array(34).fill(0);
  for (const t of types) if (t < 34) c[t]++;
  return c;
}

// Seeded RNG (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
