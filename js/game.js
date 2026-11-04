// Authoritative Guobiao game state machine. Runs on the host only. No DOM.
import { allTileTypes, shuffle, rng, isFlower, isSuited } from './tiles.js';
import { evaluate, isWinShape } from './scoring.js';
import { countsOf } from './tiles.js';

export class Game {
  constructor({ players, hands = 4, seed = (Math.random() * 2 ** 31) | 0 }) {
    this.players = players.map((p, i) => ({
      name: p.name, avatar: p.avatar || '🀄', isBot: !!p.isBot, connected: true,
      score: 0, seat: i, hand: [], melds: [], discards: [], flowers: [], drawn: null, seatWind: 0,
    }));
    this.totalHands = hands;
    this.handNo = 0;
    this.rand = rng(seed);
    this.events = [];
    this.seq = 0;
    this.phase = 'lobby';
    this.history = [];
  }

  emit(ev) { this.events.push({ ...ev, seq: ++this.seq }); }
  drain() { const e = this.events; this.events = []; return e; }
  ty(id) { return this.types[id]; }
  handTypes(seat) { return this.players[seat].hand.map(id => this.types[id]); }
  meldList(seat) { return this.players[seat].melds.map(m => ({ kind: m.kind, t: m.t })); }

  startHand() {
    this.types = shuffle(allTileTypes(), this.rand);
    this.wall = shuffle([...Array(144).keys()], this.rand);
    this.wallOrder = this.wall.slice();
    this.dealer = this.handNo % 4;
    this.roundWind = Math.floor(this.handNo / 4) % 4;
    this.players.forEach((p, i) => {
      Object.assign(p, { hand: [], melds: [], discards: [], flowers: [], drawn: null, seatWind: (i - this.dealer + 4) % 4 });
    });
    for (let r = 0; r < 13; r++) for (let k = 0; k < 4; k++) this.players[(this.dealer + k) % 4].hand.push(this.wall.shift());
    for (let k = 0; k < 4; k++) {
      const p = this.players[(this.dealer + k) % 4];
      let i;
      while ((i = p.hand.findIndex(id => isFlower(this.types[id]))) >= 0) {
        p.flowers.push(p.hand[i]);
        p.hand[i] = this.wall.pop();
      }
    }
    this.phase = 'play';
    this.claim = null;
    this.result = null;
    this.lastDiscard = null;
    this.flags = {};
    this.emit({ type: 'start', handNo: this.handNo, dealer: this.dealer });
    this.draw(this.dealer, false, false);
  }

  // ---- drawing ----
  draw(seat, fromBack, kong) {
    const p = this.players[seat];
    if (!this.wall.length) return this.exhaust();
    let id = fromBack ? this.wall.pop() : this.wall.shift();
    while (isFlower(this.types[id])) {
      p.flowers.push(id);
      this.emit({ type: 'flower', seat, id });
      if (!this.wall.length) return this.exhaust();
      id = this.wall.pop();
    }
    p.hand.push(id);
    p.drawn = id;
    this.turn = seat;
    this.stage = 'discard';
    this.flags = { kongDraw: !!kong, lastWall: this.wall.length === 0 };
    this.emit({ type: 'draw', seat, id, kong: !!kong });
  }

  visibleCount(t) {
    let n = 0;
    for (const p of this.players) {
      for (const id of p.discards) if (this.types[id] === t) n++;
      for (const m of p.melds) if (m.kind !== 'ankan') for (const id of m.ids) if (this.types[id] === t) n++;
    }
    return n;
  }

  winContext(seat, extra) {
    const p = this.players[seat];
    return {
      melds: this.meldList(seat), seatWind: p.seatWind, roundWind: this.roundWind,
      flowers: p.flowers.length, ...extra,
    };
  }

  // ---- options ----
  turnOptions(seat) {
    if (this.phase !== 'play' || this.turn !== seat || this.stage !== 'discard') return null;
    const p = this.players[seat];
    const types = this.handTypes(seat);
    const o = { discard: true, tsumo: null, ankan: [], kakan: [] };
    if (p.drawn != null) {
      const wt = this.types[p.drawn];
      const res = evaluate({
        concealed: types, winTile: wt, selfDraw: true,
        lastTile: this.visibleCount(wt) === 3, kongDraw: this.flags.kongDraw, lastWall: this.flags.lastWall,
        ...this.winContext(seat),
      });
      if (res && res.valid) o.tsumo = res;
      if (this.wall.length) {
        const c = countsOf(types);
        for (let t = 0; t < 34; t++) if (c[t] === 4) o.ankan.push(t);
        for (const m of p.melds) if (m.kind === 'pon' && c[m.t] > 0) o.kakan.push(m.t);
      }
    }
    return o;
  }

  huCheck(seat, t, extra) {
    const types = this.handTypes(seat).concat([t]);
    const c = countsOf(types);
    if (!isWinShape(c, this.players[seat].melds.length)) return null;
    const res = evaluate({ concealed: types, winTile: t, selfDraw: false, ...this.winContext(seat, extra) });
    return res && res.valid ? res : null;
  }

  claimOptionsFor(seat, t, fromSeat, kind) {
    const o = {};
    const lastTile = this.visibleCount(t) === 3 + (kind === 'discard' ? 1 : 0);
    const hu = this.huCheck(seat, t, {
      lastTile: kind === 'rob' ? false : lastTile, robKong: kind === 'rob', lastWall: kind === 'discard' && this.wall.length === 0,
    });
    if (hu) o.hu = hu;
    if (kind === 'discard' && this.wall.length > 0) {
      const c = countsOf(this.handTypes(seat));
      if (c[t] >= 2) o.pon = true;
      if (c[t] >= 3) o.kan = true;
      if ((fromSeat + 1) % 4 === seat && isSuited(t)) {
        const chi = [];
        const r = t % 9;
        for (const b of [t - 2, t - 1, t]) {
          const br = b - (t - r);
          if (br < 0 || br > 6) continue;
          if ([b, b + 1, b + 2].every(x => x === t || c[x] > 0)) chi.push(b);
        }
        if (chi.length) o.chi = chi;
      }
    }
    return Object.keys(o).length ? o : null;
  }

  openClaims(id, fromSeat, kind) {
    const t = this.types[id];
    const options = {};
    for (let k = 1; k < 4; k++) {
      const s = (fromSeat + k) % 4;
      const o = this.claimOptionsFor(s, t, fromSeat, kind);
      if (o) options[s] = o;
    }
    if (!Object.keys(options).length) return false;
    this.phase = 'claim';
    this.claim = { id, t, from: fromSeat, kind, options, responses: {} };
    return true;
  }

  pendingActors() {
    if (this.phase === 'play') return [this.turn];
    if (this.phase === 'claim') return Object.keys(this.claim.options).map(Number).filter(s => !this.claim.responses[s]);
    return [];
  }

  // ---- actions ----
  act(seat, a) {
    try {
      if (this.phase === 'claim') return this.respond(seat, a);
      if (this.phase !== 'play' || seat !== this.turn) return false;
      const p = this.players[seat];
      if (a.type === 'discard') {
        const idx = p.hand.indexOf(a.id);
        if (idx < 0) return false;
        p.hand.splice(idx, 1);
        p.discards.push(a.id);
        p.drawn = null;
        this.flags = {};
        this.lastDiscard = { id: a.id, seat };
        this.emit({ type: 'discard', seat, id: a.id, t: this.types[a.id] });
        if (!this.openClaims(a.id, seat, 'discard')) this.nextTurn(seat);
        return true;
      }
      const opts = this.turnOptions(seat);
      if (!opts) return false;
      if (a.type === 'tsumo' && opts.tsumo) {
        this.win(seat, null, p.drawn, opts.tsumo, true);
        return true;
      }
      if (a.type === 'ankan' && opts.ankan.includes(a.t)) {
        const ids = p.hand.filter(id => this.types[id] === a.t);
        p.hand = p.hand.filter(id => this.types[id] !== a.t);
        p.melds.push({ kind: 'ankan', t: a.t, ids, from: null });
        this.emit({ type: 'kong', seat, t: a.t, concealed: true, ids });
        p.drawn = null;
        this.draw(seat, true, true);
        return true;
      }
      if (a.type === 'kakan' && opts.kakan.includes(a.t)) {
        const id = p.hand.find(i => this.types[i] === a.t);
        p.hand.splice(p.hand.indexOf(id), 1);
        p.drawn = null;
        this.emit({ type: 'kakanTry', seat, t: a.t, id });
        this.pendingKakan = { seat, id, t: a.t };
        if (!this.openClaims(id, seat, 'rob')) this.finishKakan();
        return true;
      }
    } catch (e) {
      console.error('act error', e);
    }
    return false;
  }

  finishKakan() {
    const { seat, id, t } = this.pendingKakan;
    const p = this.players[seat];
    const m = p.melds.find(x => x.kind === 'pon' && x.t === t);
    m.kind = 'kan';
    m.ids.push(id);
    m.added = id;
    this.pendingKakan = null;
    this.emit({ type: 'kong', seat, t, added: true, ids: m.ids });
    this.draw(seat, true, true);
  }

  respond(seat, a) {
    const cl = this.claim;
    const o = cl.options[seat];
    if (!o || cl.responses[seat]) return false;
    let r = { type: 'pass' };
    if (a.type === 'hu' && o.hu) r = { type: 'hu' };
    else if (a.type === 'pon' && o.pon) r = { type: 'pon' };
    else if (a.type === 'kan' && o.kan) r = { type: 'kan' };
    else if (a.type === 'chi' && o.chi && o.chi.includes(a.base)) r = { type: 'chi', base: a.base };
    cl.responses[seat] = r;
    this.emit({ type: 'responded', seat });
    if (this.pendingActors().length === 0) this.resolveClaims();
    return true;
  }

  // auto-pass everyone still pending (timeouts)
  forcePass(seat) {
    if (this.phase === 'claim' && this.claim.options[seat] && !this.claim.responses[seat]) this.respond(seat, { type: 'pass' });
  }

  resolveClaims() {
    const cl = this.claim;
    this.phase = 'play';
    this.claim = null;
    const order = [1, 2, 3].map(k => (cl.from + k) % 4);
    const huer = order.find(s => cl.responses[s] && cl.responses[s].type === 'hu');
    if (huer !== undefined) {
      const res = cl.options[huer].hu;
      if (cl.kind === 'rob') this.pendingKakan = null;
      else this.players[cl.from].discards.pop();
      this.players[huer].hand.push(cl.id);
      this.win(huer, cl.from, cl.id, res, false, cl.kind === 'rob');
      return;
    }
    if (cl.kind === 'rob') return this.finishKakan();
    const pk = order.find(s => cl.responses[s] && (cl.responses[s].type === 'pon' || cl.responses[s].type === 'kan'));
    const from = this.players[cl.from];
    if (pk !== undefined) {
      const kan = cl.responses[pk].type === 'kan';
      const p = this.players[pk];
      from.discards.pop();
      const need = kan ? 3 : 2;
      const ids = [];
      for (const id of p.hand.slice()) {
        if (ids.length < need && this.types[id] === cl.t) { ids.push(id); p.hand.splice(p.hand.indexOf(id), 1); }
      }
      ids.push(cl.id);
      p.melds.push({ kind: kan ? 'kan' : 'pon', t: cl.t, ids, from: cl.from, claimed: cl.id });
      this.emit({ type: kan ? 'kong' : 'pong', seat: pk, from: cl.from, t: cl.t, ids });
      this.turn = pk;
      if (kan) { this.draw(pk, true, true); } else { this.stage = 'discard'; p.drawn = null; this.flags = {}; }
      return;
    }
    const ch = order.find(s => cl.responses[s] && cl.responses[s].type === 'chi');
    if (ch !== undefined) {
      const base = cl.responses[ch].base;
      const p = this.players[ch];
      from.discards.pop();
      const ids = [];
      for (const t of [base, base + 1, base + 2]) {
        if (t === cl.t) { ids.push(cl.id); continue; }
        const id = p.hand.find(i => this.types[i] === t);
        p.hand.splice(p.hand.indexOf(id), 1);
        ids.push(id);
      }
      p.melds.push({ kind: 'chi', t: base, ids, from: cl.from, claimed: cl.id });
      this.emit({ type: 'chow', seat: ch, from: cl.from, t: base, ids });
      this.turn = ch;
      this.stage = 'discard';
      p.drawn = null;
      this.flags = {};
      return;
    }
    this.nextTurn(cl.from);
  }

  nextTurn(fromSeat) {
    this.draw((fromSeat + 1) % 4, false, false);
  }

  win(seat, from, tileId, res, selfDraw, rob) {
    const grand = res.total + res.flowers;
    const pay = [0, 0, 0, 0];
    for (let s = 0; s < 4; s++) {
      if (s === seat) continue;
      const amt = selfDraw ? 8 + grand : s === from ? 8 + grand : 8;
      pay[s] -= amt;
      pay[seat] += amt;
    }
    pay.forEach((d, s) => { this.players[s].score += d; });
    this.phase = 'handEnd';
    this.result = {
      winner: seat, from, selfDraw, rob: !!rob, tile: tileId, t: this.types[tileId],
      fans: res.fans, total: res.total, flowers: res.flowers, grand, pay,
    };
    this.history.push({ handNo: this.handNo, winner: seat, from, grand, pay });
    this.emit({ type: 'win', seat, from, selfDraw, t: this.types[tileId], grand, result: this.result });
  }

  exhaust() {
    this.phase = 'handEnd';
    this.result = { draw: true, pay: [0, 0, 0, 0] };
    this.history.push({ handNo: this.handNo, draw: true });
    this.emit({ type: 'exhaust' });
  }

  nextHand() {
    if (this.phase !== 'handEnd') return false;
    this.handNo++;
    if (this.handNo >= this.totalHands) {
      this.phase = 'gameEnd';
      this.emit({ type: 'gameEnd' });
      return true;
    }
    this.startHand();
    return true;
  }

  // ---- views ----
  viewFor(seat) {
    const reveal = this.phase === 'handEnd' || this.phase === 'gameEnd';
    const known = {};
    const add = id => { known[id] = this.types[id]; };
    this.players.forEach((p, i) => {
      p.discards.forEach(add); p.flowers.forEach(add);
      p.melds.forEach(m => m.ids.forEach(add));
      if (i === seat || reveal) p.hand.forEach(add);
    });
    if (this.claim) add(this.claim.id);
    if (this.pendingKakan) add(this.pendingKakan.id);
    let options = null;
    if (this.phase === 'play' && this.turn === seat) options = { turn: this.turnOptions(seat) };
    if (this.phase === 'claim' && this.claim.options[seat] && !this.claim.responses[seat]) {
      const o = this.claim.options[seat];
      options = { claim: { hu: o.hu || null, pon: !!o.pon, kan: !!o.kan, chi: o.chi || null } };
    }
    return {
      seat, phase: this.phase, stage: this.stage, turn: this.turn, handNo: this.handNo, totalHands: this.totalHands,
      roundWind: this.roundWind, dealer: this.dealer,
      wallOrder: this.wallOrder, wall: this.wall.slice(),
      players: this.players.map((p, i) => ({
        name: p.name, avatar: p.avatar, isBot: p.isBot, connected: p.connected, score: p.score, seatWind: p.seatWind,
        hand: p.hand.slice(), melds: p.melds.map(m => ({ kind: m.kind, t: m.t, ids: m.ids.slice(), from: m.from, claimed: m.claimed })),
        discards: p.discards.slice(), flowers: p.flowers.slice(), drawn: i === seat ? p.drawn : null,
      })),
      known,
      claim: this.claim ? { id: this.claim.id, t: this.claim.t, from: this.claim.from, kind: this.claim.kind } : null,
      pendingKakan: this.pendingKakan ? { ...this.pendingKakan } : null,
      lastDiscard: this.lastDiscard,
      options,
      result: this.result,
      history: this.history,
    };
  }
}
