// Bot brain: shanten + ukeire with a light "fan plan" bias for Guobiao's 8-fan minimum.
import { isSuited, isHonor, isWind, isDragon, isTerminal, suitOf, countsOf, ORPHANS } from './tiles.js';
import { evaluate, waitsOf } from './scoring.js';

const suitCache = new Map();
function suitOptions(arr, honors) {
  const key = (honors ? 'h' : 's') + arr.join('');
  let v = suitCache.get(key);
  if (v) return v;
  const res = new Set();
  const a = arr.slice();
  const n = a.length;
  const rec = (i, m, p, h) => {
    while (i < n && !a[i]) i++;
    if (i >= n) { res.add(m * 100 + p * 10 + h); return; }
    if (a[i] >= 3) { a[i] -= 3; rec(i, m + 1, p, h); a[i] += 3; }
    if (!honors && i <= 6 && a[i + 1] && a[i + 2]) { a[i]--; a[i + 1]--; a[i + 2]--; rec(i, m + 1, p, h); a[i]++; a[i + 1]++; a[i + 2]++; }
    if (a[i] >= 2) {
      a[i] -= 2;
      if (!h) rec(i, m, p, 1);
      rec(i, m, p + 1, h);
      a[i] += 2;
    }
    if (!honors && i <= 7 && a[i + 1]) { a[i]--; a[i + 1]--; rec(i, m, p + 1, h); a[i]++; a[i + 1]++; }
    if (!honors && i <= 6 && a[i + 2]) { a[i]--; a[i + 2]--; rec(i, m, p + 1, h); a[i]++; a[i + 2]++; }
    a[i]--; rec(i, m, p, h); a[i]++;
  };
  rec(0, 0, 0, 0);
  const list = [...res].map(x => [Math.floor(x / 100), Math.floor(x / 10) % 10, x % 10]);
  v = list.filter(o => !list.some(q => q !== o && q[0] >= o[0] && q[1] >= o[1] && q[2] >= o[2] && (q[0] + q[1] + q[2] > o[0] + o[1] + o[2])));
  suitCache.set(key, v);
  return v;
}

export function shanten(c, mc) {
  const need = 4 - mc;
  const parts = [
    suitOptions(c.slice(0, 9), false), suitOptions(c.slice(9, 18), false),
    suitOptions(c.slice(18, 27), false), suitOptions(c.slice(27, 34), true),
  ];
  let best = 8;
  for (const a of parts[0]) for (const b of parts[1]) for (const d of parts[2]) for (const e of parts[3]) {
    const h = a[2] + b[2] + d[2] + e[2];
    const m = a[0] + b[0] + d[0] + e[0];
    let p = a[1] + b[1] + d[1] + e[1] + Math.max(0, h - 1);
    const head = h > 0 ? 1 : 0;
    const mm = Math.min(m, need);
    p = Math.min(p, need - mm);
    const s = 2 * need - 2 * mm - p - head;
    if (s < best) best = s;
  }
  if (mc === 0) {
    let pairs = 0, kinds = 0, orph = 0, oPair = 0;
    for (let t = 0; t < 34; t++) {
      if (c[t]) kinds++;
      if (c[t] >= 2) pairs++;
      if (ORPHANS.includes(t) && c[t]) { orph++; if (c[t] >= 2) oPair = 1; }
    }
    best = Math.min(best, 6 - pairs + Math.max(0, 7 - kinds), 13 - orph - oPair);
  }
  return best;
}

function plan(c, melds) {
  const suitCnt = [0, 0, 0];
  let honors = 0;
  for (let t = 0; t < 34; t++) { if (isSuited(t)) suitCnt[suitOf(t)] += c[t]; else honors += c[t]; }
  const meldSuits = new Set();
  for (const m of melds) {
    const n = m.kind === 'chi' || m.kind === 'pon' ? 3 : 4;
    if (isSuited(m.t)) { suitCnt[suitOf(m.t)] += n; meldSuits.add(suitOf(m.t)); } else honors += n;
  }
  const dom = suitCnt.indexOf(Math.max(...suitCnt));
  const flush = meldSuits.size <= 1 && (meldSuits.size === 0 || meldSuits.has(dom)) && suitCnt[dom] + honors >= 9 && suitCnt[dom] >= 6;
  let pairs = 0;
  for (let t = 0; t < 34; t++) if (c[t] >= 2) pairs++;
  const pungish = melds.every(m => m.kind !== 'chi') && pairs + melds.length >= 4;
  return { flush, dom, pungish };
}

function valuableHonor(t, ctx) {
  return isDragon(t) || (isWind(t) && (t - 27 === ctx.seatWind || t - 27 === ctx.roundWind));
}

function unseenCounts(view) {
  const seen = new Array(34).fill(0);
  for (const id in view.known) { const t = view.known[id]; if (t < 34) seen[t]++; }
  return seen.map(n => Math.max(0, 4 - n));
}

function ukeire(c, mc, s, unseen) {
  let n = 0;
  for (let t = 0; t < 34; t++) {
    if (!unseen[t]) continue;
    c[t]++;
    if (shanten(c, mc) < s) n += unseen[t];
    c[t]--;
  }
  return n;
}

function validWaits(c, melds, ctx) {
  const w = waitsOf(c.slice(), melds.length);
  let good = 0;
  const concealed = [];
  for (let t = 0; t < 34; t++) for (let k = 0; k < c[t]; k++) concealed.push(t);
  for (const t of w) {
    const r = evaluate({ concealed: concealed.concat([t]), melds, winTile: t, selfDraw: true, ...ctx });
    if (r && r.valid) good++;
  }
  return { waits: w.length, good };
}

export function chooseDiscard(types, melds, ctx, unseen) {
  const c = countsOf(types);
  const mc = melds.length;
  const pl = plan(c, melds);
  let best = null;
  const cands = [...new Set(types)];
  const scored = cands.map(x => {
    c[x]--;
    const s = shanten(c, mc);
    c[x]++;
    return { x, s };
  });
  const minS = Math.min(...scored.map(o => o.s));
  for (const o of scored) {
    if (o.s > minS + 1) continue;
    const x = o.x;
    c[x]--;
    let score = -o.s * 1000;
    if (o.s <= minS) score += ukeire(c, mc, o.s, unseen) * 8;
    if (o.s === 0) {
      const v = validWaits(c, melds, ctx);
      if (!v.good) score -= 700; else score += v.good * 40;
    }
    c[x]++;
    if (pl.flush && (isSuited(x) && suitOf(x) !== pl.dom)) score += 450;
    if (pl.flush && isHonor(x) && c[x] === 1 && !valuableHonor(x, ctx)) score += 60;
    if (isHonor(x) && c[x] === 1) score += valuableHonor(x, ctx) ? 10 : 40;
    if (isTerminal(x) && c[x] === 1) score += 15;
    if (isHonor(x) && c[x] >= 2) score -= 80;
    if (!best || score > best.score) best = { x, score };
  }
  return best.x;
}

// Decide what to do on own turn. view: game view for the bot's seat.
export function botTurn(view) {
  const me = view.players[view.seat];
  const o = view.options && view.options.turn;
  if (!o) return null;
  if (o.tsumo) return { type: 'tsumo' };
  const types = me.hand.map(id => view.known[id]);
  const ctx = { seatWind: me.seatWind, roundWind: view.roundWind, flowers: me.flowers.length };
  const melds = me.melds.map(m => ({ kind: m.kind, t: m.t }));
  const c = countsOf(types);
  const s0 = shanten(c, melds.length);
  for (const t of o.ankan) {
    c[t] -= 4;
    const s = shanten(c, melds.length + 1);
    c[t] += 4;
    if (s <= s0) return { type: 'ankan', t };
  }
  for (const t of o.kakan) return { type: 'kakan', t };
  const x = chooseDiscard(types, melds, ctx, unseenCounts(view));
  const id = me.drawn != null && view.known[me.drawn] === x ? me.drawn : me.hand.find(i => view.known[i] === x);
  return { type: 'discard', id };
}

function bestAfterMeld(types, melds, ctx) {
  // shanten after making a meld and discarding the best tile
  const c = countsOf(types);
  let best = 9;
  for (let t = 0; t < 34; t++) {
    if (!c[t]) continue;
    c[t]--;
    best = Math.min(best, shanten(c, melds.length));
    c[t]++;
  }
  return best;
}

export function botClaim(view) {
  const o = view.options && view.options.claim;
  if (!o) return null;
  if (o.hu) return { type: 'hu' };
  const me = view.players[view.seat];
  const types = me.hand.map(id => view.known[id]);
  const melds = me.melds.map(m => ({ kind: m.kind, t: m.t }));
  const ctx = { seatWind: me.seatWind, roundWind: view.roundWind, flowers: me.flowers.length };
  const t = view.claim.t;
  const c = countsOf(types);
  const s0 = shanten(c, melds.length);
  const pl = plan(c, melds);
  const fits = isHonor(t) ? (valuableHonor(t, ctx) || pl.flush || pl.pungish) : (pl.flush ? suitOf(t) === pl.dom : pl.pungish);
  if (o.pon || o.kan) {
    const rest = types.slice();
    for (let k = 0; k < 2; k++) rest.splice(rest.indexOf(t), 1);
    const nm = melds.concat([{ kind: 'pon', t }]);
    const s1 = bestAfterMeld(rest, nm, ctx);
    if ((valuableHonor(t, ctx) || (fits && melds.length > 0) || (fits && pl.flush)) && s1 <= s0) {
      if (o.kan && melds.length > 0) return { type: 'kan' };
      return { type: 'pon' };
    }
  }
  if (o.chi && pl.flush && suitOf(t) === pl.dom) {
    for (const b of o.chi) {
      const rest = types.slice();
      for (const x of [b, b + 1, b + 2]) if (x !== t) rest.splice(rest.indexOf(x), 1);
      const s1 = bestAfterMeld(rest, melds.concat([{ kind: 'chi', t: b }]), ctx);
      if (s1 < s0) return { type: 'chi', base: b };
    }
  }
  return { type: 'pass' };
}

// Hint helper for humans: for each discard choice, which tiles win with >= 8 fan
export function discardHints(types, melds, ctx) {
  const out = {};
  for (const x of new Set(types)) {
    const rest = types.slice();
    rest.splice(rest.indexOf(x), 1);
    const c = countsOf(rest);
    if (shanten(c, melds.length) > 0) continue;
    const w = waitsOf(c, melds.length);
    const list = [];
    for (const t of w) {
      const r = evaluate({ concealed: rest.concat([t]), melds, winTile: t, selfDraw: false, ...ctx });
      if (r) list.push({ t, fan: r.total, valid: r.valid });
    }
    if (list.length) out[x] = list;
  }
  return out;
}
