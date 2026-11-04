// Simulates full bot games to check rules engine invariants, termination and bot win rate.
import { Game } from '../js/game.js';
import { botTurn, botClaim } from '../js/ai.js';
import { FAN } from '../js/scoring.js';

const GAMES = +(process.argv[2] || 30);
const HANDS = 4;
let wins = 0, draws = 0, selfDraws = 0, robs = 0, kongs = 0, chis = 0, pongs = 0, hands = 0;
const fanFreq = {};
let errors = 0;
const t0 = Date.now();

function checkInvariants(g, where) {
  if (g.phase === 'lobby' || g.phase === 'gameEnd') return;
  const ids = [...g.wall];
  for (const p of g.players) {
    ids.push(...p.hand, ...p.discards, ...p.flowers);
    for (const m of p.melds) ids.push(...m.ids);
  }
  if (g.pendingKakan) ids.push(g.pendingKakan.id);
  const set = new Set(ids);
  if (ids.length !== 144 || set.size !== 144) {
    errors++;
    console.error(`INVARIANT tile count ${ids.length}/${set.size} at ${where}`);
    process.exit(1);
  }
  for (const p of g.players) {
    const expect = 13 - 3 * p.melds.length;
    const n = p.hand.length;
    const isTurn = g.phase === 'play' && g.turn === p.seat;
    if (g.phase === 'handEnd') continue;
    if (!(n === expect || (isTurn && n === expect + 1))) {
      errors++;
      console.error(`INVARIANT hand size seat ${p.seat} n=${n} melds=${p.melds.length} phase=${g.phase} turn=${g.turn} at ${where}`);
      process.exit(1);
    }
  }
}

for (let gi = 0; gi < GAMES; gi++) {
  const g = new Game({ players: [0, 1, 2, 3].map(i => ({ name: 'B' + i, isBot: true })), hands: HANDS, seed: gi * 7919 + 1 });
  g.startHand();
  let steps = 0;
  while (g.phase !== 'gameEnd') {
    if (++steps > 20000) { console.error('STUCK'); process.exit(1); }
    checkInvariants(g, `game ${gi} step ${steps}`);
    if (g.phase === 'handEnd') {
      hands++;
      const r = g.result;
      if (r.draw) draws++;
      else {
        wins++;
        if (r.selfDraw) selfDraws++;
        if (r.rob) robs++;
        if (r.total < 8) { console.error('INVALID WIN', r); process.exit(1); }
        for (const f of r.fans) fanFreq[f.k] = (fanFreq[f.k] || 0) + 1;
      }
      const sum = g.players.reduce((a, p) => a + p.score, 0);
      if (sum !== 0) { console.error('score sum', sum); process.exit(1); }
      g.nextHand();
      continue;
    }
    const actors = g.pendingActors();
    for (const s of actors) {
      const v = g.viewFor(s);
      const a = g.phase === 'claim' ? botClaim(v) : botTurn(v);
      if (!a) { console.error('bot returned no action', g.phase, s); process.exit(1); }
      const ok = g.act(s, a);
      if (!ok) { console.error('rejected', a, g.phase); process.exit(1); }
      for (const e of g.drain()) {
        if (e.type === 'kong') kongs++;
        if (e.type === 'chow') chis++;
        if (e.type === 'pong') pongs++;
      }
      if (g.phase !== 'claim') break;
    }
  }
}
const top = Object.entries(fanFreq).sort((a, b) => b[1] - a[1]).slice(0, 25)
  .map(([k, n]) => `${FAN[k].zh}:${n}`).join(' ');
console.log(`games=${GAMES} hands=${hands} wins=${wins} (${((wins / hands) * 100).toFixed(1)}%) selfDraw=${selfDraws} rob=${robs} draws=${draws}`);
console.log(`pongs=${pongs} chows=${chis} kongs=${kongs} time=${Date.now() - t0}ms`);
console.log('fans:', top);
console.log(errors ? 'ERRORS' : 'Simulation OK');
