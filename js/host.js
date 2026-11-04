// Host-side controller: owns the Game, drives bots, timeouts, and sends per-seat views.
import { Game } from './game.js';
import { botTurn, botClaim } from './ai.js';

// Timers run in a Web Worker so a host tab in the background keeps the game moving
// (browsers throttle main-thread timers in hidden tabs).
let worker = null, nid = 0;
const cbs = new Map();
export function wtimeout(fn, ms) {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return setTimeout(fn, ms);
  if (!worker) {
    try {
      const src = 'const t={};onmessage=e=>{const d=e.data;if(d.c){clearTimeout(t[d.id]);delete t[d.id];}else t[d.id]=setTimeout(()=>{delete t[d.id];postMessage(d.id)},d.ms)}';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = e => { const f = cbs.get(e.data); cbs.delete(e.data); if (f) f(); };
    } catch { worker = null; return setTimeout(fn, ms); }
  }
  const id = `w${++nid}`;
  cbs.set(id, fn);
  worker.postMessage({ id, ms });
  return id;
}
export function wclear(id) {
  if (typeof id === 'string') { cbs.delete(id); if (worker) worker.postMessage({ id, c: 1 }); } else clearTimeout(id);
}

export const TURN_MS = 30000;
export const CLAIM_MS = 15000;
export const NEXT_MS = 30000;

export class HostController {
  constructor({ seats, hands = 4, deliver, botSpeed = 1, autoNext = true }) {
    this.seats = seats.map(s => ({ ...s, connected: true }));
    this.deliver = deliver;
    this.botSpeed = botSpeed;
    this.autoNext = autoNext;
    this.game = new Game({ players: this.seats, hands });
    this.token = 0;
    this.timers = [];
    this.stopped = false;
  }

  isBot(s) { return this.seats[s].isBot || !this.seats[s].connected; }

  start() { this.game.startHand(); this.pump(); }

  stop() { this.stopped = true; this.clearTimers(); }

  clearTimers() { this.timers.forEach(wclear); this.timers = []; }

  later(ms, fn) { this.timers.push(wtimeout(fn, ms)); }

  act(seat, a) {
    if (this.stopped) return;
    if (this.game.act(seat, a)) this.pump();
    else this.sendState(seat, []);
  }

  next() {
    if (this.stopped) return;
    if (this.game.phase === 'handEnd' && this.game.nextHand()) this.pump();
  }

  setConnected(seat, on) {
    this.seats[seat].connected = on;
    this.game.players[seat].connected = on;
    this.pump(true);
  }

  sendState(seat, events) {
    const v = this.game.viewFor(seat);
    v.remain = this.remain;
    v.timerFor = this.timerFor;
    this.deliver(seat, { t: 'state', view: v, events });
  }

  pump(quiet = false) {
    if (this.stopped) return;
    const g = this.game;
    const events = quiet ? [] : g.drain();
    this.clearTimers();
    const token = ++this.token;
    const actors = g.pendingActors();
    const humans = actors.filter(s => !this.isBot(s));
    this.remain = null;
    this.timerFor = humans;
    if (humans.length) {
      const ms = g.phase === 'claim' ? CLAIM_MS : TURN_MS;
      this.remain = ms;
      this.later(ms, () => this.onTimeout(token));
    }
    if (g.phase === 'handEnd' && this.autoNext) {
      this.remain = NEXT_MS;
      this.later(NEXT_MS, () => { if (token === this.token) this.next(); });
    }
    for (let s = 0; s < 4; s++) if (!this.isBot(s)) this.sendState(s, events);
    if (this.onEvents) this.onEvents(events);
    for (const s of actors) {
      if (!this.isBot(s)) continue;
      const claim = g.phase === 'claim';
      const delay = (claim ? 350 + Math.random() * 450 : 550 + Math.random() * 700) / this.botSpeed;
      this.later(delay, () => {
        if (token !== this.token || this.stopped) return;
        const v = g.viewFor(s);
        const a = g.phase === 'claim' ? botClaim(v) : botTurn(v);
        if (a) this.act(s, a);
      });
    }
  }

  onTimeout(token) {
    if (token !== this.token) return;
    const g = this.game;
    if (g.phase === 'claim') {
      for (const s of g.pendingActors()) if (!this.isBot(s)) g.forcePass(s);
      this.pump();
    } else if (g.phase === 'play') {
      const s = g.turn;
      const v = g.viewFor(s);
      const a = botTurn(v);
      if (a && a.type !== 'tsumo') this.act(s, a);
      else if (a) this.act(s, a);
    }
  }
}
