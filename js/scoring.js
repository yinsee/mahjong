// Guobiao (MCR, 国标麻将) fan calculator.
import {
  isSuited, isHonor, isWind, isDragon, isTerminal, isTermOrHonor, suitOf, rankOf,
  ORPHANS, GREEN, REVERSIBLE, countsOf,
} from './tiles.js';

// [key, points, 中文, English]
export const FAN_DEFS = [
  ['dsx', 88, '大四喜', 'Big Four Winds'],
  ['dsy', 88, '大三元', 'Big Three Dragons'],
  ['lys', 88, '绿一色', 'All Green'],
  ['jlbd', 88, '九莲宝灯', 'Nine Gates'],
  ['sig', 88, '四杠', 'Four Kongs'],
  ['lqd', 88, '连七对', 'Seven Shifted Pairs'],
  ['ssy', 88, '十三幺', 'Thirteen Orphans'],
  ['qyj', 64, '清幺九', 'All Terminals'],
  ['xsx', 64, '小四喜', 'Little Four Winds'],
  ['xsy', 64, '小三元', 'Little Three Dragons'],
  ['zys', 64, '字一色', 'All Honors'],
  ['sak', 64, '四暗刻', 'Four Concealed Pungs'],
  ['ysslh', 64, '一色双龙会', 'Pure Terminal Chows'],
  ['ys4ts', 48, '一色四同顺', 'Quadruple Chow'],
  ['ys4jg', 48, '一色四节高', 'Four Pure Shifted Pungs'],
  ['ys4bg', 32, '一色四步高', 'Four Pure Shifted Chows'],
  ['sang', 32, '三杠', 'Three Kongs'],
  ['hyj', 32, '混幺九', 'All Terminals & Honors'],
  ['qd', 24, '七对', 'Seven Pairs'],
  ['qxbk', 24, '七星不靠', 'Greater Honors & Knitted'],
  ['qsk', 24, '全双刻', 'All Even Pungs'],
  ['qys', 24, '清一色', 'Full Flush'],
  ['ys3ts', 24, '一色三同顺', 'Pure Triple Chow'],
  ['ys3jg', 24, '一色三节高', 'Pure Shifted Pungs'],
  ['qda', 24, '全大', 'Upper Tiles'],
  ['qzh', 24, '全中', 'Middle Tiles'],
  ['qxi', 24, '全小', 'Lower Tiles'],
  ['ql', 16, '清龙', 'Pure Straight'],
  ['sslh', 16, '三色双龙会', 'Three-Suited Terminal Chows'],
  ['ys3bg', 16, '一色三步高', 'Pure Shifted Chows'],
  ['qdw', 16, '全带五', 'All Fives'],
  ['stk', 16, '三同刻', 'Triple Pung'],
  ['sak3', 16, '三暗刻', 'Three Concealed Pungs'],
  ['qbk', 12, '全不靠', 'Lesser Honors & Knitted'],
  ['zhl', 12, '组合龙', 'Knitted Straight'],
  ['dyw', 12, '大于五', 'Upper Four'],
  ['xyw', 12, '小于五', 'Lower Four'],
  ['sfk', 12, '三风刻', 'Big Three Winds'],
  ['hl', 8, '花龙', 'Mixed Straight'],
  ['tbd', 8, '推不倒', 'Reversible Tiles'],
  ['s3ts', 8, '三色三同顺', 'Mixed Triple Chow'],
  ['s3jg', 8, '三色三节高', 'Mixed Shifted Pungs'],
  ['wfh', 8, '无番和', 'Chicken Hand'],
  ['mshc', 8, '妙手回春', 'Last Tile Draw'],
  ['hdly', 8, '海底捞月', 'Last Tile Claim'],
  ['gskh', 8, '杠上开花', 'Out with Replacement Tile'],
  ['qgh', 8, '抢杠和', 'Robbing the Kong'],
  ['pph', 6, '碰碰和', 'All Pungs'],
  ['hys', 6, '混一色', 'Half Flush'],
  ['s3bg', 6, '三色三步高', 'Mixed Shifted Chows'],
  ['wmq', 6, '五门齐', 'All Types'],
  ['qqr', 6, '全求人', 'Melded Hand'],
  ['sag2', 6, '双暗杠', 'Two Concealed Kongs'],
  ['sjk', 6, '双箭刻', 'Two Dragon Pungs'],
  ['qdy', 4, '全带幺', 'Outside Hand'],
  ['bqr', 4, '不求人', 'Fully Concealed Hand'],
  ['smg', 4, '双明杠', 'Two Melded Kongs'],
  ['hjz', 4, '和绝张', 'Last Tile'],
  ['jk', 2, '箭刻', 'Dragon Pung'],
  ['qfk', 2, '圈风刻', 'Prevalent Wind'],
  ['mfk', 2, '门风刻', 'Seat Wind'],
  ['mqq', 2, '门前清', 'Concealed Hand'],
  ['ph', 2, '平和', 'All Chows'],
  ['sgy', 2, '四归一', 'Tile Hog'],
  ['stk2', 2, '双同刻', 'Double Pung'],
  ['sak2', 2, '双暗刻', 'Two Concealed Pungs'],
  ['ag', 2, '暗杠', 'Concealed Kong'],
  ['dy', 2, '断幺', 'All Simples'],
  ['ybg', 1, '一般高', 'Pure Double Chow'],
  ['xxf', 1, '喜相逢', 'Mixed Double Chow'],
  ['l6', 1, '连六', 'Short Straight'],
  ['lsf', 1, '老少副', 'Two Terminal Chows'],
  ['yjk', 1, '幺九刻', 'Pung of Terminals/Honors'],
  ['mg', 1, '明杠', 'Melded Kong'],
  ['qym', 1, '缺一门', 'One Voided Suit'],
  ['wz', 1, '无字', 'No Honors'],
  ['bz', 1, '边张', 'Edge Wait'],
  ['kz', 1, '嵌张', 'Closed Wait'],
  ['ddj', 1, '单钓将', 'Single Wait'],
  ['zm', 1, '自摸', 'Self-Drawn'],
  ['hp', 1, '花牌', 'Flower Tiles'],
];
export const FAN = Object.fromEntries(FAN_DEFS.map(([k, p, zh, en]) => [k, { p, zh, en }]));
export const MIN_FAN = 8;

// 不计 (exclusion) rules
const EX = {
  dsx: ['qfk', 'mfk', 'sfk', 'pph', 'yjk'],
  dsy: ['jk', 'sjk'],
  lys: ['hys'],
  jlbd: ['qys', 'mqq', 'yjk', 'wz', 'qym'],
  sig: ['sang', 'smg', 'sag2', 'mg', 'ag', 'pph', 'ddj'],
  lqd: ['qd', 'qys', 'mqq', 'ddj', 'wz', 'qym'],
  ssy: ['wmq', 'mqq', 'ddj', 'hyj'],
  qyj: ['hyj', 'pph', 'yjk', 'qdy', 'wz', 'stk2'],
  xsx: ['sfk'],
  xsy: ['jk', 'sjk'],
  zys: ['pph', 'hyj', 'qdy', 'yjk'],
  sak: ['mqq', 'pph', 'sak3', 'sak2'],
  ysslh: ['ph', 'qd', 'qys', 'ybg', 'lsf', 'wz', 'qym'],
  ys4ts: ['ys3ts', 'ys3jg', 'ybg', 'sgy'],
  ys4jg: ['ys3ts', 'ys3jg', 'pph'],
  ys4bg: ['ys3bg', 'l6', 'lsf'],
  sang: ['smg', 'sag2', 'mg', 'ag'],
  hyj: ['pph', 'yjk', 'qdy'],
  qd: ['mqq', 'ddj'],
  qxbk: ['qbk', 'wmq', 'mqq', 'ddj'],
  qsk: ['pph', 'dy', 'wz'],
  qys: ['wz', 'qym'],
  ys3ts: ['ys3jg', 'ybg'],
  ys3jg: ['ys3ts'],
  qda: ['dyw', 'wz'],
  qzh: ['dy', 'wz'],
  qxi: ['xyw', 'wz'],
  ql: ['l6', 'lsf'],
  sslh: ['xxf', 'lsf', 'wz', 'ph'],
  qdw: ['dy', 'wz'],
  stk: ['stk2'],
  sak3: ['sak2'],
  qbk: ['wmq', 'mqq', 'ddj'],
  dyw: ['wz'],
  xyw: ['wz'],
  tbd: ['qym'],
  mshc: ['zm'],
  gskh: ['zm'],
  qgh: ['hjz'],
  qqr: ['ddj'],
  sag2: ['ag', 'sak2'],
  sjk: ['jk'],
  bqr: ['mqq', 'zm'],
  smg: ['mg'],
  ph: ['wz'],
  dy: ['wz'],
};

const KNIT = [];
for (const p of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
  // suit p[0] gets 147, p[1] gets 258, p[2] gets 369
  const tiles = [];
  p.forEach((suit, i) => { for (const r of [1, 4, 7]) tiles.push(suit * 9 + r - 1 + i); });
  KNIT.push(tiles);
}

// ---------- shape helpers ----------
function canSets(c, n) {
  let i = 0;
  while (i < 34 && c[i] === 0) i++;
  if (i === 34) return n === 0;
  if (n === 0) return false;
  if (c[i] >= 3) {
    c[i] -= 3;
    const ok = canSets(c, n - 1);
    c[i] += 3;
    if (ok) return true;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    const ok = canSets(c, n - 1);
    c[i]++; c[i + 1]++; c[i + 2]++;
    if (ok) return true;
  }
  return false;
}
function canStandard(c, n) {
  for (let p = 0; p < 34; p++) {
    if (c[p] >= 2) {
      c[p] -= 2;
      const ok = canSets(c, n);
      c[p] += 2;
      if (ok) return true;
    }
  }
  return false;
}
function isSevenPairs(c) {
  let pairs = 0;
  for (let t = 0; t < 34; t++) {
    if (c[t] === 2) pairs++;
    else if (c[t] === 4) pairs += 2;
    else if (c[t] !== 0) return false;
  }
  return pairs === 7;
}
function isThirteen(c) {
  let sum = 0, pair = false;
  for (let t = 0; t < 34; t++) {
    if (!c[t]) continue;
    if (!ORPHANS.includes(t)) return false;
    if (c[t] === 2) { if (pair) return false; pair = true; } else if (c[t] > 2) return false;
    sum += c[t];
  }
  return sum === 14 && pair;
}
function knitPerm(c) {
  // 全不靠: 14 distinct tiles from honors + one knitted permutation
  let sum = 0;
  for (let t = 0; t < 34; t++) { if (c[t] > 1) return -1; sum += c[t]; }
  if (sum !== 14) return -1;
  for (let k = 0; k < 6; k++) {
    const set = KNIT[k];
    let ok = true;
    for (let t = 0; t < 27; t++) if (c[t] && !set.includes(t)) { ok = false; break; }
    if (ok) return k;
  }
  return -1;
}
function hasKnittedStraight(c, mc) {
  if (mc > 1) return false;
  for (const set of KNIT) {
    if (set.every(t => c[t] > 0)) {
      set.forEach(t => c[t]--);
      const ok = canStandard(c, 1 - mc);
      set.forEach(t => c[t]++);
      if (ok) return true;
    }
  }
  return false;
}

export function isWinShape(c, mc) {
  if (canStandard(c, 4 - mc)) return true;
  if (mc === 0 && (isSevenPairs(c) || isThirteen(c) || knitPerm(c) >= 0)) return true;
  return hasKnittedStraight(c, mc);
}

// waits for a 13-tile (minus melds) hand given as counts
export function waitsOf(c13, mc) {
  const w = [];
  for (let t = 0; t < 34; t++) {
    if (c13[t] >= 4) continue;
    c13[t]++;
    if (isWinShape(c13, mc)) w.push(t);
    c13[t]--;
  }
  return w;
}

function decompose(c, n) {
  const out = [];
  const sets = [];
  const rec = pair => {
    let i = 0;
    while (i < 34 && c[i] === 0) i++;
    if (i === 34) { if (sets.length === n) out.push({ pair, sets: sets.slice() }); return; }
    if (sets.length >= n) return;
    if (c[i] >= 3) {
      c[i] -= 3; sets.push({ k: 'p', t: i }); rec(pair); sets.pop(); c[i] += 3;
    }
    if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) {
      c[i]--; c[i + 1]--; c[i + 2]--; sets.push({ k: 'c', t: i }); rec(pair); sets.pop();
      c[i]++; c[i + 1]++; c[i + 2]++;
    }
  };
  for (let p = 0; p < 34; p++) {
    if (c[p] >= 2) { c[p] -= 2; rec(p); c[p] += 2; }
  }
  return out;
}

// ---------- fan helpers ----------
function finalize(F, ctx) {
  const keys = Object.keys(F).sort((a, b) => FAN[b].p - FAN[a].p);
  if (F.bqr && keys.some(k => k !== 'bqr' && EX[k] && EX[k].includes('mqq'))) {
    delete F.bqr;
    if (ctx.selfDraw) F.zm = 1;
  }
  const removed = new Set();
  const ks = Object.keys(F).sort((a, b) => FAN[b].p - FAN[a].p);
  for (const k of ks) {
    if (removed.has(k)) continue;
    for (const e of EX[k] || []) removed.add(e);
  }
  const fans = [];
  let total = 0;
  for (const k of ks) {
    if (removed.has(k)) continue;
    fans.push({ k, n: F[k], p: FAN[k].p });
    total += FAN[k].p * F[k];
  }
  if (total === 0) { fans.push({ k: 'wfh', n: 1, p: 8 }); total = 8; }
  return { fans, total };
}

function tileFans(cnt, add) {
  const types = [];
  for (let t = 0; t < 34; t++) if (cnt[t]) types.push(t);
  const suits = new Set(types.filter(isSuited).map(suitOf));
  const honors = types.filter(isHonor);
  const hasHonor = honors.length > 0;
  const all = f => types.every(f);
  if (all(t => GREEN.has(t))) add('lys');
  if (all(isTerminal)) add('qyj');
  if (all(isHonor)) add('zys');
  if (all(isTermOrHonor) && hasHonor && suits.size > 0) add('hyj');
  if (suits.size === 1 && !hasHonor) add('qys');
  if (suits.size === 1 && hasHonor) add('hys');
  if (!hasHonor) {
    const rs = types.map(rankOf);
    if (rs.every(r => r >= 7)) add('qda'); else if (rs.every(r => r >= 6)) add('dyw');
    if (rs.every(r => r >= 4 && r <= 6)) add('qzh');
    if (rs.every(r => r <= 3)) add('qxi'); else if (rs.every(r => r <= 4)) add('xyw');
  }
  if (all(t => REVERSIBLE.has(t))) add('tbd');
  if (suits.size === 3 && honors.some(isWind) && honors.some(isDragon)) add('wmq');
  if (suits.size === 2) add('qym');
  if (!hasHonor) add('wz');
  if (all(t => isSuited(t) && !isTerminal(t))) add('dy');
}

function situational(ctx, add, concealedHand) {
  if (ctx.lastWall) add(ctx.selfDraw ? 'mshc' : 'hdly');
  if (ctx.kongDraw && ctx.selfDraw) add('gskh');
  if (ctx.robKong) add('qgh');
  if (ctx.lastTile && !ctx.robKong) add('hjz');
  if (ctx.selfDraw) add('zm');
  if (concealedHand) add(ctx.selfDraw ? 'bqr' : 'mqq');
}

function chowPair(a, b) {
  if (a === b) return 'ybg';
  const sa = suitOf(a), sb = suitOf(b), ra = rankOf(a), rb = rankOf(b);
  if (sa !== sb) return ra === rb ? 'xxf' : null;
  if (Math.abs(ra - rb) === 3) return 'l6';
  if ((ra === 1 && rb === 7) || (ra === 7 && rb === 1)) return 'lsf';
  return null;
}
function chow3(a, b, c) {
  const arr = [a, b, c].sort((x, y) => x - y);
  const s = arr.map(suitOf), r = arr.map(rankOf);
  if (s[0] === s[1] && s[1] === s[2]) {
    if (arr[0] === arr[2]) return 'ys3ts';
    if (r[0] === 1 && r[1] === 4 && r[2] === 7) return 'ql';
    const d1 = r[1] - r[0], d2 = r[2] - r[1];
    if (d1 === d2 && (d1 === 1 || d1 === 2)) return 'ys3bg';
    return null;
  }
  if (new Set(s).size === 3) {
    const rs = [...r].sort((x, y) => x - y);
    if (rs[0] === 1 && rs[1] === 4 && rs[2] === 7) return 'hl';
    if (rs[0] === rs[2]) return 's3ts';
    if (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) return 's3bg';
  }
  return null;
}
function chowCombos(ts, add) {
  const n = ts.length;
  if (n < 2) return;
  const sorted = [...ts].sort((a, b) => a - b);
  if (n === 4) {
    if (sorted[0] === sorted[3]) { add('ys4ts'); return; }
    if (sorted.every(x => suitOf(x) === suitOf(sorted[0]))) {
      const d = sorted[1] - sorted[0];
      if ((d === 1 || d === 2) && sorted[2] - sorted[1] === d && sorted[3] - sorted[2] === d) { add('ys4bg'); return; }
    }
  }
  if (n >= 3) {
    let best = null;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      const key = chow3(ts[i], ts[j], ts[k]);
      if (!key) continue;
      let score = FAN[key].p * 10, extra = null;
      if (n === 4) {
        const rest = [0, 1, 2, 3].find(x => x !== i && x !== j && x !== k);
        for (const o of [i, j, k]) {
          const e = chowPair(ts[rest], ts[o]);
          if (e) { extra = e; score += 1; break; }
        }
      }
      if (!best || score > best.score) best = { key, extra, score };
    }
    if (best) { add(best.key); if (best.extra) add(best.extra); return; }
  }
  // pairwise fans: maximum acyclic set of edges (套算一次)
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const k = chowPair(ts[i], ts[j]);
    if (k) edges.push([i, j, k]);
  }
  let bestSet = [];
  for (let mask = 1; mask < 1 << edges.length; mask++) {
    const parent = [0, 1, 2, 3];
    const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const chosen = [];
    let ok = true;
    for (let e = 0; e < edges.length; e++) {
      if (!(mask & (1 << e))) continue;
      const [a, b] = edges[e];
      const ra = find(a), rb = find(b);
      if (ra === rb) { ok = false; break; }
      parent[ra] = rb;
      chosen.push(edges[e][2]);
    }
    if (ok && chosen.length > bestSet.length) bestSet = chosen;
  }
  bestSet.forEach(k => add(k));
}
function pungCombos(ts, add) {
  const sp = ts.filter(isSuited).sort((a, b) => a - b);
  const n = sp.length;
  if (n === 4 && suitOf(sp[0]) === suitOf(sp[3]) && sp[1] === sp[0] + 1 && sp[2] === sp[1] + 1 && sp[3] === sp[2] + 1) {
    add('ys4jg'); return;
  }
  let best = null;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const a = [sp[i], sp[j], sp[k]];
    const s = a.map(suitOf), r = a.map(rankOf);
    let key = null;
    if (s[0] === s[1] && s[1] === s[2] && a[1] === a[0] + 1 && a[2] === a[1] + 1) key = 'ys3jg';
    else if (new Set(s).size === 3) {
      const rs = [...r].sort((x, y) => x - y);
      if (rs[0] === rs[2]) key = 'stk';
      else if (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) key = 's3jg';
    }
    if (key && (!best || FAN[key].p > FAN[best].p)) best = key;
  }
  if (best) add(best);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (suitOf(sp[i]) !== suitOf(sp[j]) && rankOf(sp[i]) === rankOf(sp[j])) add('stk2');
  }
}

function scoreStandard(sets, pair, ctx, knit, wait) {
  const F = {};
  const add = (k, n = 1) => { F[k] = (F[k] || 0) + n; };
  const chows = sets.filter(s => s.k === 'c');
  const pungs = sets.filter(s => s.k !== 'c');
  const kongs = sets.filter(s => s.k === 'k');
  const cnt = new Array(34).fill(0);
  for (const s of sets) {
    if (s.k === 'c') { cnt[s.t]++; cnt[s.t + 1]++; cnt[s.t + 2]++; } else cnt[s.t] += s.k === 'k' ? 4 : 3;
  }
  cnt[pair] += 2;
  if (knit) knit.forEach(t => cnt[t]++);
  tileFans(cnt, add);

  const windP = pungs.filter(p => isWind(p.t));
  const dragP = pungs.filter(p => isDragon(p.t));
  if (windP.length === 4) add('dsx');
  if (windP.length === 3) add(isWind(pair) ? 'xsx' : 'sfk');
  if (dragP.length === 3) add('dsy');
  if (dragP.length === 2) { add('sjk'); if (isDragon(pair)) add('xsy'); }
  dragP.forEach(() => add('jk'));
  if (ctx.nineGates) add('jlbd');

  const ankans = kongs.filter(k => !k.meld).length;
  if (kongs.length === 4) add('sig');
  else if (kongs.length === 3) add('sang');
  else if (kongs.length === 2) {
    if (ankans === 2) add('sag2'); else if (ankans === 0) add('smg'); else { add('mg'); add('ag'); }
  } else if (kongs.length === 1) add(ankans ? 'ag' : 'mg');

  const cp = pungs.filter(p => !p.open).length;
  if (cp === 4) add('sak'); else if (cp === 3) add('sak3'); else if (cp === 2) add('sak2');
  if (pungs.length === 4) add('pph');

  if (chows.length === 4 && isSuited(pair)) {
    const st = chows.map(c => c.t);
    const suit = suitOf(pair);
    const rs = st.map(rankOf).sort((a, b) => a - b);
    if (st.every(t => suitOf(t) === suit) && rankOf(pair) === 5 && rs.join() === '1,1,7,7') add('ysslh');
    const ps = suitOf(pair);
    const others = [0, 1, 2].filter(s => s !== ps);
    if (rankOf(pair) === 5 && others.every(s => {
      const r = st.filter(t => suitOf(t) === s).map(rankOf).sort((a, b) => a - b);
      return r.join() === '1,7';
    })) add('sslh');
  }
  chowCombos(chows.map(c => c.t), add);
  pungCombos(pungs.map(p => p.t), add);
  if (knit) add('zhl');

  if (!knit && isSuited(pair) && rankOf(pair) === 5 && sets.every(s =>
    s.k === 'c' ? (rankOf(s.t) >= 3 && rankOf(s.t) <= 5) : (isSuited(s.t) && rankOf(s.t) === 5))) add('qdw');
  if (pungs.length === 4) {
    let even = true;
    for (let t = 0; t < 34; t++) if (cnt[t] && (!isSuited(t) || rankOf(t) % 2)) even = false;
    if (even) add('qsk');
  }
  if (!knit && isTermOrHonor(pair) && sets.every(s =>
    s.k === 'c' ? (rankOf(s.t) === 1 || rankOf(s.t) === 7) : isTermOrHonor(s.t))) add('qdy');
  if (chows.length + (knit ? 3 : 0) === 4 && isSuited(pair)) add('ph');
  if (sets.filter(s => s.meld).length === 4 && !ctx.selfDraw) add('qqr');

  for (const p of windP) {
    if (p.t - 27 === ctx.seatWind) add('mfk');
    if (p.t - 27 === ctx.roundWind) add('qfk');
  }
  const yj = pungs.filter(p => isTerminal(p.t) ||
    (isWind(p.t) && windP.length < 3 && p.t - 27 !== ctx.seatWind && p.t - 27 !== ctx.roundWind)).length;
  if (yj) add('yjk', yj);
  for (let t = 0; t < 34; t++) if (cnt[t] === 4 && !kongs.some(k => k.t === t)) add('sgy');
  if (wait) add(wait);
  situational(ctx, add, !sets.some(s => s.meld));
  return finalize(F, ctx);
}

function scoreSevenPairs(c, ctx, singleWait) {
  const F = {};
  const add = (k, n = 1) => { F[k] = (F[k] || 0) + n; };
  tileFans(c, add);
  const types = [];
  for (let t = 0; t < 34; t++) if (c[t]) types.push(t);
  if (types.length === 7 && types.every(t => isSuited(t) && suitOf(t) === suitOf(types[0])) &&
    types[6] - types[0] === 6) add('lqd');
  add('qd');
  for (let t = 0; t < 34; t++) if (c[t] === 4) add('sgy');
  if (singleWait) add('ddj');
  situational(ctx, add, true);
  return finalize(F, ctx);
}

/**
 * Evaluate a winning hand.
 * concealed: tile types in hand INCLUDING the winning tile
 * melds: [{kind:'chi'|'pon'|'kan'|'ankan', t}] (chi t = lowest tile)
 * Returns {fans, total, flowers, grand} or null if not a winning shape.
 */
export function evaluate(inp) {
  const { concealed, melds = [], winTile } = inp;
  const mc = melds.length;
  if (concealed.length !== 14 - 3 * mc) return null;
  const c = countsOf(concealed);
  if (!isWinShape(c, mc)) return null;
  const c13 = c.slice();
  c13[winTile]--;
  const waits = waitsOf(c13, mc);
  const singleWait = waits.length === 1;

  let nineGates = false;
  if (mc === 0) {
    const s = suitOf(winTile);
    if (s < 3 && concealed.every(t => suitOf(t) === s)) {
      const pat = [3, 1, 1, 1, 1, 1, 1, 1, 3];
      nineGates = pat.every((n, i) => c13[s * 9 + i] === n);
    }
  }
  const ctx = { ...inp, nineGates };
  const meldSets = melds.map(m => ({
    k: m.kind === 'chi' ? 'c' : m.kind === 'pon' ? 'p' : 'k',
    t: m.t, meld: m.kind !== 'ankan', open: m.kind !== 'ankan',
  }));

  let best = null;
  const consider = r => { if (r && (!best || r.total > best.total)) best = r; };
  const tryReceivers = (csets, pair, knit) => {
    const recv = [];
    csets.forEach((s, i) => {
      if ((s.k === 'p' && s.t === winTile) || (s.k === 'c' && winTile >= s.t && winTile <= s.t + 2)) recv.push(i);
    });
    if (pair === winTile) recv.push('pair');
    if (knit && knit.includes(winTile)) recv.push('knit');
    for (const r of recv) {
      const sets = meldSets.concat(csets.map((s, i) => ({
        ...s, meld: false, open: !ctx.selfDraw && i === r && s.k === 'p',
      })));
      let wait = null;
      if (singleWait) {
        if (r === 'pair') wait = 'ddj';
        else if (typeof r === 'number' && csets[r].k === 'c') {
          const t = csets[r].t;
          if (winTile === t + 1) wait = 'kz';
          else if ((rankOf(t) === 1 && winTile === t + 2) || (rankOf(t) === 7 && winTile === t)) wait = 'bz';
        }
      }
      consider(scoreStandard(sets, pair, ctx, knit, wait));
    }
  };
  for (const d of decompose(c, 4 - mc)) tryReceivers(d.sets, d.pair, null);
  if (mc <= 1) {
    for (const set of KNIT) {
      if (!set.every(t => c[t] > 0)) continue;
      set.forEach(t => c[t]--);
      for (const d of decompose(c, 1 - mc)) tryReceivers(d.sets, d.pair, set);
      set.forEach(t => c[t]++);
    }
  }
  if (mc === 0 && isSevenPairs(c)) consider(scoreSevenPairs(c, ctx, singleWait));
  if (mc === 0 && isThirteen(c)) {
    const F = { ssy: 1 };
    situational(ctx, (k, n = 1) => { F[k] = (F[k] || 0) + n; }, true);
    consider(finalize(F, ctx));
  }
  if (mc === 0 && knitPerm(c) >= 0) {
    const F = {};
    const add = (k, n = 1) => { F[k] = (F[k] || 0) + n; };
    let honors = 0, suited = 0;
    for (let t = 0; t < 34; t++) if (c[t]) { if (isHonor(t)) honors++; else suited++; }
    add(honors === 7 ? 'qxbk' : 'qbk');
    if (suited === 9) add('zhl');
    situational(ctx, add, true);
    consider(finalize(F, ctx));
  }
  if (!best) return null;
  const flowers = inp.flowers || 0;
  return { ...best, flowers, grand: best.total + flowers, valid: best.total >= MIN_FAN };
}

export function fanLabel(k, lang) {
  return lang === 'zh' ? FAN[k].zh : FAN[k].en;
}
