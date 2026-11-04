import { Table3D } from './render3d.js';
import { prepareFaces, tileHTML } from './textures.js';
import { HostController, wtimeout } from './host.js';
import { hostPeer, joinPeer, genCode } from './net.js';
import { t, getLang, setLang, applyI18n, taunt } from './i18n.js';
import { initAudio, sfx, speak, setSfx, setMusic, isSfx, isMusic } from './audio.js';
import * as fx from './fx.js';
import { FAN, FAN_DEFS } from './scoring.js';
import { discardHints } from './ai.js';
import { tileName, WIND_ZH, WIND_EN } from './tiles.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AVATARS = ['🐼', '🐯', '🦊', '🐸', '🐵', '🐲', '🐷', '🐰', '🐨', '🦁', '🐙', '🦄', '🐔', '🐧'];
const BOTS = [
  { name: '熊猫阿宝 Po', avatar: '🐼' }, { name: '招财猫 Lucky', avatar: '🐱' }, { name: '小龙 Dragon', avatar: '🐲' },
  { name: '狐狸 Foxy', avatar: '🦊' }, { name: '青蛙 Froggy', avatar: '🐸' }, { name: '猴哥 Monkey', avatar: '🐵' },
  { name: '老虎 Tiger', avatar: '🐯' }, { name: '小猪 Piggy', avatar: '🐷' },
];
const EMOTES = ['😂', '😡', '👍', '🔥', '💩', '😭', '🤡', '🙏'];

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

const S = {
  me: { name: store.get('mj_name', ''), avatar: store.get('mj_avatar', AVATARS[(Math.random() * AVATARS.length) | 0]), cid: store.get('mj_cid', '') },
  role: null, peer: null, conns: new Map(), conn: null, code: null,
  seats: [null, null, null, null], hands: 4, host: null, view: null, mySeat: 0,
  selected: null, started: false, attract: null, recvAt: 0, hintCache: null, actSig: '', resultShownFor: null,
};
if (!S.me.cid) { S.me.cid = Math.random().toString(36).slice(2, 10); store.set('mj_cid', S.me.cid); }

let table;

// ---------------- boot ----------------
async function boot() {
  applyI18n();
  await prepareFaces();
  table = new Table3D($('#three'), { onTileClick, onTileHover, onLand: () => sfx.clack() });
  table.setLang(getLang());
  $('#loading').classList.add('hidden');
  buildLobby();
  startAttract();
  setInterval(tickTimers, 250);
  heartbeat();
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if (room) {
    $('#in-code').value = room.toUpperCase();
    if (S.me.name) setTimeout(() => joinRoom(), 400);
    else $('#in-name').focus();
  }
  window.__mj = S; // debug handle
}

// ---------------- phone: fullscreen + landscape ----------------
// Same media query as the CSS (phones and tablets: coarse pointer, no hover)
const PHONE_MQ = matchMedia('(pointer: coarse) and (hover: none)');
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
async function goLandscape(force = false) {
  if (!PHONE_MQ.matches && !force) return;
  const el = document.documentElement;
  try {
    if (!isFullscreen()) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  } catch { /* iOS Safari: not allowed, the rotate overlay covers it */ }
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* unsupported */ }
}
function toggleFullscreen() {
  if (isFullscreen()) {
    try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* ignore */ }
  } else goLandscape(true);
}

function toast(msg, ms = 2500) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------------- attract mode (bots play in the lobby background) ----------------
function startAttract() {
  stopAttract();
  table.orbit = true;
  table.view = null;
  const h = new HostController({
    seats: BOTS.slice(0, 4).map(b => ({ ...b, isBot: true })), hands: 4, deliver: () => {}, botSpeed: 2.2, autoNext: false,
  });
  h.onEvents = events => {
    if (S.started || S.attract !== h) return;
    table.update(h.game.viewFor(0));
    if (events.some(e => e.type === 'discard')) { /* silent */ }
    if (h.game.phase === 'handEnd') setTimeout(() => { if (S.attract === h) h.next(); }, 3500);
    if (h.game.phase === 'gameEnd') setTimeout(() => { if (S.attract === h) startAttract(); }, 2000);
  };
  S.attract = h;
  h.start();
}
function stopAttract() {
  if (S.attract) { S.attract.stop(); S.attract = null; }
}

// ---------------- lobby ----------------
function buildLobby() {
  const av = $('#avatars');
  av.innerHTML = AVATARS.map(a => `<button class="av ${a === S.me.avatar ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('');
  av.onclick = e => {
    const b = e.target.closest('.av');
    if (!b) return;
    S.me.avatar = b.dataset.a;
    store.set('mj_avatar', S.me.avatar);
    av.querySelectorAll('.av').forEach(x => x.classList.toggle('sel', x === b));
    initAudio(); sfx.pop();
  };
  $('#in-name').value = S.me.name;
  $('#in-name').oninput = e => { S.me.name = e.target.value.trim(); store.set('mj_name', S.me.name); };
  $('#btn-create').onclick = createRoom;
  $('#btn-join').onclick = joinRoom;
  $('#in-code').onkeydown = e => { if (e.key === 'Enter') joinRoom(); };
  $('#btn-practice').onclick = practice;
  $('#btn-fans').onclick = $('#btn-fans2').onclick = showFanTable;
  $('#btn-lang').onclick = $('#btn-lang2').onclick = toggleLang;
  $('#btn-sfx').onclick = () => { setSfx(!isSfx()); syncToggles(); };
  $('#btn-music').onclick = () => { initAudio(); setMusic(!isMusic()); syncToggles(); };
  $('#btn-copy').onclick = copyLink;
  $('#btn-fs').onclick = toggleFullscreen;
  $('#btn-rot-fs').onclick = () => goLandscape(true);
  $('#btn-leave').onclick = () => leave();
  $('#btn-start').onclick = startGame;
  $('#sel-hands').onchange = e => { S.hands = +e.target.value; broadcastLobby(); };
  $('#emotes').innerHTML = EMOTES.map(e => `<button data-e="${e}">${e}</button>`).join('');
  $('#emotes').onclick = e => { const b = e.target.closest('button'); if (b) sendEmote(b.dataset.e); };
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
    if (e.target === m && m.id === 'modal-fans') m.classList.add('hidden');
  }));
  document.addEventListener('pointerdown', () => initAudio(), { once: true });
  syncToggles();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#modal-fans').classList.add('hidden');
  });
}
function syncToggles() {
  $('#btn-sfx').classList.toggle('off', !isSfx());
  $('#btn-music').classList.toggle('off', !isMusic());
  $('#btn-lang').textContent = getLang() === 'zh' ? 'EN' : '中';
}
function toggleLang() {
  setLang(getLang() === 'zh' ? 'en' : 'zh');
  syncToggles();
  table.setLang(getLang());
  if (S.view) { S.actSig = ''; renderHUD(); }
  if (!$('#modal-result').classList.contains('hidden') && S.view) showResult(S.view, true);
  if (!$('#modal-final').classList.contains('hidden') && S.view) showFinal(S.view);
  if (!$('#modal-fans').classList.contains('hidden')) showFanTable();
  if (!$('#screen-room').classList.contains('hidden')) renderRoom();
}
function myName() { return S.me.name || t('emptyName'); }
function showScreen(id) {
  ['#screen-lobby', '#screen-room'].forEach(s => $(s).classList.toggle('hidden', s !== id));
}

async function createRoom() {
  goLandscape();
  initAudio(); sfx.pop();
  $('#btn-create').disabled = true;
  toast(t('connecting'));
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = genCode();
    try {
      S.peer = await hostPeer(code, { onConnection: onHostConnection, onError: e => console.warn(e) });
      S.code = code;
      break;
    } catch (e) {
      console.warn('host peer failed', e);
      if (e.type !== 'unavailable-id') { toast(`${t('connFail')} (${e.type || e.message})`); $('#btn-create').disabled = false; return; }
    }
  }
  $('#btn-create').disabled = false;
  if (!S.peer) return;
  S.role = 'host';
  S.mySeat = 0;
  S.seats = [{ name: myName(), avatar: S.me.avatar, cid: S.me.cid, isBot: false, local: true }, null, null, null];
  history.replaceState(null, '', `?room=${S.code}`);
  showScreen('#screen-room');
  renderRoom();
}

async function joinRoom() {
  goLandscape();
  initAudio();
  const code = $('#in-code').value.trim().toUpperCase();
  if (code.length < 4) { $('#in-code').focus(); return; }
  sfx.pop();
  toast(t('connecting'), 15000);
  $('#btn-join').disabled = true;
  try {
    const { peer, conn } = await joinPeer(code, { onData: onClientData, onClose: onHostClosed });
    S.peer = peer; S.conn = conn; S.code = code; S.role = 'client'; S.hostSeen = Date.now();
    conn.send({ t: 'hello', name: myName(), avatar: S.me.avatar, cid: S.me.cid });
    toast('✅', 800);
  } catch (e) {
    console.warn(e);
    toast(t('connFail'));
  }
  $('#btn-join').disabled = false;
}

function practice() {
  goLandscape();
  initAudio(); sfx.pop();
  S.role = 'host';
  S.code = null;
  S.mySeat = 0;
  const bots = shuffled(BOTS).slice(0, 3);
  S.seats = [{ name: myName(), avatar: S.me.avatar, isBot: false, local: true }, ...bots.map(b => ({ ...b, isBot: true }))];
  startGame();
}
function shuffled(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }

function renderRoom() {
  $('#room-code').textContent = S.code || '';
  const isHost = S.role === 'host';
  $('#seats').innerHTML = S.seats.map((s, i) => {
    if (!s) {
      return `<div class="seat"><div class="s-tag">${t('emptySeat')}</div>${isHost ? `<button class="btn btn-small" data-add="${i}">${t('addBot')}</button>` : ''}</div>`;
    }
    const tags = [i === 0 ? t('hostTag') : '', s.isBot ? '🤖 ' + t('bot') : '', i === S.mySeat ? t('you') : ''].filter(Boolean).join(' · ');
    return `<div class="seat filled"><div class="s-av">${s.avatar}</div><div class="s-name">${esc(s.name)}</div><div class="s-tag">${tags}</div>
      ${isHost && i !== 0 ? `<div class="s-btns"><button class="btn btn-small" data-kick="${i}">${t('kick')}</button></div>` : ''}</div>`;
  }).join('');
  $('#seats').onclick = e => {
    const add = e.target.closest('[data-add]');
    const kick = e.target.closest('[data-kick]');
    if (add) addBot(+add.dataset.add);
    if (kick) kickSeat(+kick.dataset.kick);
  };
  const full = S.seats.every(Boolean);
  $('#btn-start').classList.toggle('hidden', !isHost);
  $('#btn-start').disabled = !full;
  $('#sel-hands').disabled = !isHost;
  $('#sel-hands').value = String(S.hands);
  $('#btn-copy').classList.toggle('hidden', !S.code);
  $('#room-status').textContent = isHost ? (full ? '' : t('needFour')) : t('hostOnly');
  applyI18n($('#screen-room'));
  $('#sel-hands').value = String(S.hands);
}
function addBot(i) {
  const used = new Set(S.seats.filter(Boolean).map(s => s.name));
  const b = BOTS.find(x => !used.has(x.name)) || BOTS[0];
  S.seats[i] = { ...b, isBot: true };
  sfx.boing();
  broadcastLobby();
}
function kickSeat(i) {
  for (const [seat, conn] of S.conns) {
    if (seat === i) { try { conn.send({ t: 'kicked' }); setTimeout(() => conn.close(), 200); } catch { /* ignore */ } S.conns.delete(seat); }
  }
  S.seats[i] = null;
  broadcastLobby();
}
function copyLink() {
  const url = `${location.origin}${location.pathname}?room=${S.code}`;
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(t('copied') + ' ' + url), () => toast(url, 6000));
}
function lobbyPayload(seat) {
  return { t: 'lobby', seats: S.seats.map(s => s && { name: s.name, avatar: s.avatar, isBot: s.isBot }), you: seat, hands: S.hands, code: S.code };
}
function broadcastLobby() {
  if (S.role !== 'host') return;
  for (const [seat, conn] of S.conns) { try { conn.send(lobbyPayload(seat)); } catch { /* ignore */ } }
  if (!S.started) renderRoom();
}

// ---------------- host networking ----------------
function heartbeat() {
  wtimeout(heartbeat, 2000);
  const now = Date.now();
  if (S.role === 'host') {
    for (const conn of [...S.conns.values()]) {
      try { conn.send({ t: 'ping' }); } catch { /* ignore */ }
      if (now - (conn.lastSeen || now) > 9000) onConnClose(conn);
    }
  } else if (S.role === 'client' && S.conn) {
    try { S.conn.send({ t: 'hb' }); } catch { /* ignore */ }
    if (now - (S.hostSeen || now) > 15000) onHostClosed();
  }
}

function onHostConnection(conn) {
  conn.lastSeen = Date.now();
  conn.on('data', d => onHostData(conn, d));
  conn.on('close', () => onConnClose(conn));
  conn.on('error', () => onConnClose(conn));
}
function onHostData(conn, d) {
  if (!d || typeof d !== 'object') return;
  conn.lastSeen = Date.now();
  // a player we had marked offline is talking again: give the seat back
  if (S.started && S.host && conn.seat != null && !S.conns.has(conn.seat) && S.host.seats[conn.seat] && !S.host.seats[conn.seat].connected) {
    S.conns.set(conn.seat, conn);
    S.host.setConnected(conn.seat, true);
    toast(`${S.seats[conn.seat].name} ✅`);
  }
  if (d.t === 'hb' || d.t === 'pong') return;
  if (d.t === 'hello') {
    const name = String(d.name || '?').slice(0, 14);
    const avatar = String(d.avatar || '🀄').slice(0, 4);
    if (S.started) {
      const seat = S.seats.findIndex((s, i) => s && s.cid === d.cid && i !== 0);
      if (seat > 0 && S.host) {
        conn.seat = seat; S.conns.set(seat, conn);
        S.host.setConnected(seat, true);
        toast(`${name} ✅`);
        return;
      }
      conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return;
    }
    let seat = S.seats.findIndex((s, i) => s && s.cid === d.cid && i !== 0);
    if (seat < 0) seat = S.seats.findIndex(s => !s);
    if (seat < 0) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    S.seats[seat] = { name, avatar, cid: d.cid, isBot: false };
    conn.seat = seat;
    S.conns.set(seat, conn);
    sfx.boing();
    toast(`${avatar} ${name} 👋`);
    broadcastLobby();
    return;
  }
  if (conn.seat == null) return;
  if (d.t === 'act' && S.host && d.a && typeof d.a === 'object') S.host.act(conn.seat, d.a);
  if (d.t === 'emote' && EMOTES.includes(d.e)) broadcastEmote(conn.seat, d.e);
}
function onConnClose(conn) {
  const seat = conn.seat;
  if (seat == null || S.conns.get(seat) !== conn) return;
  S.conns.delete(seat);
  if (!S.started) { S.seats[seat] = null; broadcastLobby(); return; }
  if (S.host) { S.host.setConnected(seat, false); toast(`${S.seats[seat].name}: ${t('disconnected')}`); }
}

// ---------------- client networking ----------------
function onClientData(d) {
  if (!d || typeof d !== 'object') return;
  S.hostSeen = Date.now();
  if (d.t === 'ping') { try { S.conn.send({ t: 'pong' }); } catch { /* ignore */ } return; }
  if (d.t === 'lobby') {
    S.seats = d.seats; S.mySeat = d.you; S.hands = d.hands; S.code = d.code;
    if (!S.started) { showScreen('#screen-room'); renderRoom(); }
  } else if (d.t === 'state') onState(d.view, d.events || []);
  else if (d.t === 'emote') showEmote(d.seat, d.e);
  else if (d.t === 'full') { toast(t('roomFull')); leave(true); } else if (d.t === 'kicked') { toast('👢'); leave(true); }
}
function onHostClosed() {
  if (S.role !== 'client') return;
  toast(t('hostLeft'), 4000);
  leave(true);
}

function leave(silent) {
  if (S.host) S.host.stop();
  for (const c of S.conns.values()) { try { c.close(); } catch { /* ignore */ } }
  S.conns.clear();
  if (S.peer) { try { S.peer.destroy(); } catch { /* ignore */ } }
  Object.assign(S, { peer: null, conn: null, role: null, host: null, started: false, view: null, code: null, selected: null, seats: [null, null, null, null] });
  history.replaceState(null, '', location.pathname);
  $('#hud').classList.add('hidden');
  document.body.classList.remove('in-game');
  ['#modal-result', '#modal-final'].forEach(m => $(m).classList.add('hidden'));
  showScreen('#screen-lobby');
  if (!silent) sfx.pop();
  table.selected = null;
  startAttract();
}

// ---------------- game start / actions ----------------
function startGame() {
  goLandscape();
  if (S.role !== 'host' || !S.seats.every(Boolean)) return;
  initAudio();
  const seats = S.seats.map(s => ({ name: s.name, avatar: s.avatar, isBot: s.isBot }));
  if (S.host) S.host.stop();
  S.resultShownFor = null;
  S.host = new HostController({
    seats, hands: S.hands,
    deliver: (seat, msg) => {
      if (seat === S.mySeat) onState(msg.view, msg.events);
      else { const c = S.conns.get(seat); if (c) { try { c.send(msg); } catch (e) { console.warn(e); } } }
    },
  });
  S.host.start();
}

function sendAction(a) {
  if (S.role === 'host' && S.host) S.host.act(S.mySeat, a);
  else if (S.conn) S.conn.send({ t: 'act', a });
}
function sendEmote(e) {
  initAudio();
  if (S.role === 'host') broadcastEmote(S.mySeat, e);
  else if (S.conn) S.conn.send({ t: 'emote', e });
}
function broadcastEmote(seat, e) {
  showEmote(seat, e);
  for (const c of S.conns.values()) { try { c.send({ t: 'emote', seat, e }); } catch { /* ignore */ } }
}
function showEmote(seat, e) {
  if (!S.view) return;
  const rel = (seat - S.view.seat + 4) % 4;
  fx.floatEmote($(`#badge-${rel}`), e);
  ({ '😂': sfx.laugh, '💩': sfx.fart, '🔥': sfx.whoosh, '👍': sfx.pop, '😭': sfx.sadTrombone, '😡': sfx.boing, '🤡': sfx.boing, '🙏': sfx.flower }[e] || sfx.pop)();
}

function enterGame() {
  S.started = true;
  document.body.classList.add('in-game');
  stopAttract();
  table.orbit = false;
  table.view = null;
  showScreen(null);
  $('#hud').classList.remove('hidden');
  $('#modal-final').classList.add('hidden');
}

// ---------------- state handling ----------------
function onState(view, events) {
  if (!S.started) enterGame();
  const prev = S.view;
  S.view = view;
  S.mySeat = view.seat;
  S.recvAt = Date.now();
  const me = view.players[view.seat];
  if (S.selected != null && !me.hand.includes(S.selected)) { S.selected = null; table.setSelected(null); }
  if (view.handNo !== (prev && prev.handNo) || view.phase === 'play' && prev && prev.phase !== 'play') {
    $('#modal-result').classList.add('hidden');
  }
  if (view.phase !== 'gameEnd') $('#modal-final').classList.add('hidden');
  handleEvents(events, view);
  table.update(view);
  // alerts for my decisions
  const myTurnNow = view.options && (view.options.turn || view.options.claim);
  const myTurnBefore = prev && prev.options && (prev.options.turn || prev.options.claim);
  if (myTurnNow && !myTurnBefore) sfx.alert();
  if (!(view.options && view.options.turn)) { S.selected = null; table.setSelected(null); }
  renderHUD();
  if (view.phase === 'handEnd') {
    const key = `${view.handNo}`;
    if (S.resultShownFor !== key) {
      S.resultShownFor = key;
      const hadWin = events.some(e => e.type === 'win' || e.type === 'exhaust');
      setTimeout(() => { if (S.view && S.view.phase === 'handEnd') showResult(S.view); }, hadWin ? 3000 : 200);
    } else if (!$('#modal-result').classList.contains('hidden')) showResult(view, true);
  }
  if (view.phase === 'gameEnd') {
    $('#modal-result').classList.add('hidden');
    showFinal(view);
  }
}

function relOf(seat) { return (seat - S.view.seat + 4) % 4; }
function badgeOf(seat) { return $(`#badge-${relOf(seat)}`); }

function callout(zh, en, color, seat, size = 0.75) {
  const rel = relOf(seat);
  const p = table.seatScreen(rel);
  const x = Math.max(140, Math.min(innerWidth - 140, p.x));
  const y = Math.max(120, Math.min(innerHeight - 160, p.y));
  fx.bigText(zh, en, { color, x, y, size });
}

function handleEvents(events, view) {
  const lang = getLang();
  for (const e of events) {
    const seat = e.seat;
    switch (e.type) {
      case 'start':
        sfx.start();
        fx.bigText(lang === 'zh' ? `第${e.handNo + 1}局` : `Hand ${e.handNo + 1}`, `${WIND_ZH[view.roundWind]}风圈 · ${WIND_EN[view.roundWind]} Round`, { color: 'white', size: 0.55, dur: 1600 });
        break;
      case 'draw':
        if (seat === view.seat) sfx.draw();
        break;
      case 'discard':
        sfx.whoosh();
        speak(tileName(e.t, 'zh'), tileName(e.t, 'en'), lang);
        break;
      case 'flower':
        sfx.flower();
        fx.bubble(badgeOf(seat), '🌸 补花 Flower!', 1400);
        break;
      case 'pong':
        callout('碰！', 'PONG!', 'blue', seat);
        sfx.pong(); fx.shakeScreen(1); table.shake(0.4);
        speak('碰', 'Pong!', lang);
        fx.bubble(badgeOf(seat), taunt('pong'));
        bounce(seat);
        break;
      case 'chow': {
        callout('吃！', 'CHOW!', 'green', seat);
        sfx.chow(); fx.shakeScreen(1);
        speak('吃', 'Chow!', lang);
        const b = badgeOf(seat).getBoundingClientRect();
        fx.emojiBurst(['🍜', '🥟', '🍚', '🥢'], b.left + 30, b.top + 20, 10);
        fx.bubble(badgeOf(seat), taunt('chow'));
        bounce(seat);
        break;
      }
      case 'kong':
        callout('杠！', 'KONG!', 'red', seat, 0.95);
        sfx.kong(); fx.shakeScreen(2); fx.flash('#ff3b5c'); table.shake(1); table.kick(5);
        table.burst(relOf(seat), 0xff3b5c, 50);
        speak('杠', 'Kong!', lang);
        fx.bubble(badgeOf(seat), taunt('kong'));
        bounce(seat);
        break;
      case 'kakanTry':
        sfx.drumroll(0.5);
        break;
      case 'win': winFx(e, view); break;
      case 'exhaust':
        fx.bigText('荒庄！', 'DRAW GAME', { color: 'white', size: 0.9, dur: 2600 });
        fx.tumbleweed(); sfx.sadTrombone();
        speak('荒庄', 'Draw game', lang);
        for (let s = 0; s < 4; s++) setTimeout(() => fx.bubble(badgeOf(s), taunt('draw'), 1800), s * 300);
        break;
      default: break;
    }
  }
}

function bounce(seat, cls = 'bounce') {
  const av = badgeOf(seat)?.querySelector('.b-av');
  if (!av) return;
  av.classList.remove('bounce', 'sad');
  void av.offsetWidth;
  av.classList.add(cls);
  setTimeout(() => av.classList.remove(cls), 2000);
}

function winFx(e, view) {
  const lang = getLang();
  const rel = relOf(e.seat);
  fx.flash('#fff'); sfx.slam(); fx.shakeScreen(3); table.shake(1.4); table.kick(9);
  table.focusSeat(rel, 2900);
  sfx.drumroll(0.35);
  setTimeout(() => {
    const big = e.grand >= 88 ? ['天下无敌！', 'LEGENDARY!!'] : e.grand >= 32 ? ['大牌！', 'MONSTER HAND!'] : null;
    fx.bigText(e.selfDraw ? '自摸！' : '胡了！', e.selfDraw ? 'SELF-DRAWN!' : 'MAHJONG!', { color: 'rainbow', size: 1.25, dur: 2600 });
    sfx.fanfare();
    fx.fireworks(e.seat === view.seat ? 12 : 6);
    fx.emojiRain(['🪙', '💰', '🧧', '💸', '🀄'], e.seat === view.seat ? 80 : 40);
    table.burst(rel, 0xffd54a, 90);
    speak(e.selfDraw ? '自摸' : '胡了', 'Mahjong!', lang);
    for (let i = 0; i < 6; i++) sfx.coin(0.9 + i * 0.12);
    if (big) setTimeout(() => { fx.bigText(big[0], big[1], { color: 'red', size: 0.8, y: innerHeight * 0.7, x: innerWidth / 2 }); sfx.boom(); }, 1300);
  }, 380);
  fx.bubble(badgeOf(e.seat), taunt('win'), 3000);
  bounce(e.seat);
  if (e.from != null) {
    const lb = badgeOf(e.from);
    setTimeout(() => {
      const r = lb.getBoundingClientRect();
      fx.emojiBurst(['💥', '💣', '😵', '💸'], r.left + 30, r.top + 20, 18, 600, 42);
      fx.bubble(lb, `💥 ${taunt('dealIn')}`, 3000);
      bounce(e.from, 'sad');
      if (e.from === view.seat) setTimeout(() => sfx.sadTrombone(), 1500);
    }, 700);
  }
}

// ---------------- HUD ----------------
function renderHUD() {
  const v = S.view;
  if (!v) return;
  const lang = getLang();
  const W = lang === 'zh' ? WIND_ZH : WIND_EN;
  $('#info-round').textContent = `${t('roundWind', { w: W[v.roundWind] })} · ${t('handOf', { a: Math.min(v.handNo + 1, v.totalHands), b: v.totalHands })}`;
  $('#info-wall').innerHTML = `${t('wallLeft')} <b>${v.wall.length}</b>`;
  $('#info-room').textContent = S.code ? `${t('room')} ${S.code}` : '🤖';
  $('#info-room').classList.toggle('hidden', !S.code);
  v.players.forEach((p, s) => {
    const el = badgeOf(s);
    const isTurn = (v.phase === 'play' && v.turn === s) || (v.phase === 'claim' && (v.timerFor || []).includes(s));
    el.classList.toggle('turn', isTurn);
    const tags = [];
    if (s === v.seat) tags.push(t('you'));
    if (p.isBot) tags.push('🤖');
    if (!p.connected) tags.push('📴 ' + t('disconnected'));
    if (p.flowers.length) tags.push(`🌸×${p.flowers.length}`);
    const html = `<div class="b-av">${p.avatar}<div class="b-wind ${s === v.dealer ? 'dealer' : ''}">${WIND_ZH[p.seatWind]}</div></div>
      <div class="b-main"><div class="b-name">${esc(p.name)}</div><div class="b-score ${p.score < 0 ? 'neg' : ''}">${p.score > 0 ? '+' : ''}${p.score}</div>
      <div class="b-tags">${tags.join(' · ')}${s === v.dealer ? ` · ${t('dealer')}` : ''}</div></div><div class="b-timer hidden"></div>`;
    const key = html;
    if (el.dataset.key !== key) {
      const bub = el.querySelector('.bubble');
      const avCls = el.querySelector('.b-av')?.className;
      el.innerHTML = html;
      el.dataset.key = key;
      if (bub) el.appendChild(bub);
      if (avCls) el.querySelector('.b-av').className = avCls;
    }
  });
  renderActions();
  renderStatus();
}

function renderStatus() {
  const v = S.view;
  let s = '';
  if (v.phase === 'play' && v.turn === v.seat && v.options && v.options.turn) s = S.selected != null ? t('clickAgain') : t('yourTurn');
  else if (v.phase === 'claim' && v.options && v.options.claim) s = t('claimFrom', { n: v.players[v.claim.from].name });
  $('#status-line').textContent = s;
}

function actBtn(cls, zh, en, payload, extra = '') {
  return `<button class="act ${cls}" data-a='${JSON.stringify(payload)}'>${zh}<small>${en}</small>${extra}</button>`;
}

function renderActions() {
  const v = S.view;
  const o = v.options;
  let html = '';
  if (o && o.turn) {
    if (o.turn.tsumo) html += actBtn('act-hu', '自摸', `TSUMO · ${o.turn.tsumo.grand} ${t('fan')}`, { type: 'tsumo' });
    for (const x of o.turn.ankan) html += actBtn('act-kan', '暗杠', 'KONG', { type: 'ankan', t: x }, `<span class="tiles">${tileHTML(x, 'sm')}</span>`);
    for (const x of o.turn.kakan) html += actBtn('act-kan', '加杠', 'KONG', { type: 'kakan', t: x }, `<span class="tiles">${tileHTML(x, 'sm')}</span>`);
  }
  if (o && o.claim) {
    const c = o.claim;
    if (c.hu) html += actBtn('act-hu', '胡', `HU! · ${c.hu.grand} ${t('fan')}`, { type: 'hu' });
    if (c.kan) html += actBtn('act-kan', '杠', 'KONG', { type: 'kan' });
    if (c.pon) html += actBtn('act-pon', '碰', 'PONG', { type: 'pon' });
    if (c.chi) for (const b of c.chi) html += actBtn('act-chi', '吃', 'CHOW', { type: 'chi', base: b }, `<span class="tiles">${[b, b + 1, b + 2].map(x => tileHTML(x, x === v.claim.t ? 'sm win' : 'sm')).join('')}</span>`);
    html += actBtn('act-pass', '过', 'PASS', { type: 'pass' });
  }
  const sig = html + getLang();
  if (sig === S.actSig) return;
  S.actSig = sig;
  const box = $('#actions');
  box.innerHTML = html;
  box.querySelectorAll('.act').forEach(b => {
    b.onclick = () => {
      const a = JSON.parse(b.dataset.a);
      sfx.pop();
      box.innerHTML = ''; S.actSig = '';
      sendAction(a);
    };
  });
}

function tickTimers() {
  const v = S.view;
  if (!v) return;
  const left = v.remain != null ? Math.max(0, Math.ceil((S.recvAt + v.remain - Date.now()) / 1000)) : null;
  v.players.forEach((p, s) => {
    const tm = badgeOf(s)?.querySelector('.b-timer');
    if (!tm) return;
    const show = left != null && (v.timerFor || []).includes(s) && v.phase !== 'handEnd';
    tm.classList.toggle('hidden', !show);
    if (show) tm.textContent = `⏳${left}`;
  });
  if (left != null && (v.timerFor || []).includes(v.seat) && left <= 5 && left > 0 && tickTimers.last !== left) {
    tickTimers.last = left;
    sfx.tick();
  }
  const cd = $('#next-cd');
  if (cd && v.phase === 'handEnd' && left != null) cd.textContent = `(${left}s)`;
}

// ---------------- tiles: select / discard / hints ----------------
function onTileHover() { /* hover lift handled by renderer */ }

function onTileClick(id) {
  const v = S.view;
  if (!v || v.phase !== 'play' || v.turn !== v.seat || !(v.options && v.options.turn)) { sfx.tick(); return; }
  if (S.selected === id) {
    S.selected = null;
    table.setSelected(null);
    $('#hint').classList.remove('show');
    sendAction({ type: 'discard', id });
    return;
  }
  S.selected = id;
  table.setSelected(id);
  sfx.select();
  showHint(id);
  renderStatus();
}

function hintsFor(v) {
  const me = v.players[v.seat];
  const key = `${v.handNo}:${me.hand.join(',')}:${me.melds.length}`;
  if (S.hintCache && S.hintCache.key === key) return S.hintCache.hints;
  const types = me.hand.map(id => v.known[id]);
  const hints = discardHints(types, me.melds.map(m => ({ kind: m.kind, t: m.t })), { seatWind: me.seatWind, roundWind: v.roundWind, flowers: me.flowers.length });
  S.hintCache = { key, hints };
  return hints;
}

function showHint(id) {
  const v = S.view;
  const el = $('#hint');
  const hints = hintsFor(v);
  const list = hints[v.known[id]];
  if (!list) { el.classList.remove('show'); return; }
  const lang = getLang();
  el.innerHTML = `<span>${t('tenpaiHint')}</span>` + list.map(h =>
    `<span class="${h.valid ? '' : 'bad'}">${tileHTML(h.t, 'sm')} ${h.fan}${t('fan')}${h.valid ? '' : ` (${t('noFan')})`}</span>`).join(' ');
  el.classList.add('show');
  void lang;
}

// ---------------- result / final ----------------
function meldTiles(m, known) {
  return m.ids.map(id => tileHTML(known[id], 'sm')).join('');
}

function showResult(v, refresh = false) {
  const r = v.result;
  if (!r) return;
  const lang = getLang();
  const card = $('#result-card');
  let html = '';
  if (r.draw) {
    html += `<div class="res-title"><div class="rt-av">🌵</div><div class="rt-name">${t('drawGame')}</div><div class="rt-sub">${t('drawSub')}</div></div>`;
  } else {
    const w = v.players[r.winner];
    const sub = r.selfDraw ? t('selfDrawn') : r.rob ? `${t('robbed')} · ${t('dealtIn', { n: esc(v.players[r.from].name) })}` : t('dealtIn', { n: esc(v.players[r.from].name) });
    html += `<div class="res-title"><div class="rt-av">${w.avatar}</div><div class="rt-name">${esc(w.name)} ${t('winner')}</div><div class="rt-sub">${sub}</div></div>`;
    const hand = w.hand.slice().sort((a, b) => v.known[a] - v.known[b]);
    html += `<div class="res-hand">${hand.map(id => tileHTML(v.known[id], id === r.tile ? 'win' : '')).join('')}
      ${w.melds.map(m => `<span class="gap"></span>${meldTiles(m, v.known)}`).join('')}
      ${w.flowers.length ? `<span class="gap"></span>${w.flowers.map(id => tileHTML(v.known[id], 'sm')).join('')}` : ''}</div>`;
    html += '<div class="fan-list">';
    r.fans.forEach((f, i) => {
      const def = FAN[f.k];
      const main = lang === 'zh' ? def.zh : def.en;
      const alt = lang === 'zh' ? def.en : def.zh;
      const d = refresh ? 0 : 0.15 * i;
      html += `<div class="fan-row"><div class="fn" style="animation-delay:${d}s">${main}${f.n > 1 ? ` ×${f.n}` : ''}<small>${alt}</small></div><div class="fp" style="animation-delay:${d}s">${def.p * f.n} ${t('fan')}</div></div>`;
    });
    if (r.flowers) {
      const d = refresh ? 0 : 0.15 * r.fans.length;
      html += `<div class="fan-row"><div class="fn" style="animation-delay:${d}s">${t('flowers')} ×${r.flowers}<small>${lang === 'zh' ? 'Flower Tiles' : '花牌'}</small></div><div class="fp" style="animation-delay:${d}s">${r.flowers} ${t('fan')}</div></div>`;
    }
    html += `</div><div class="fan-total"><span>${t('fanTotal')}</span><span>${r.grand} ${t('fan')}</span></div>`;
  }
  html += `<table class="pay-table">${v.players.map((p, s) => {
    const d = r.pay[s];
    return `<tr><td>${p.avatar} ${esc(p.name)}${s === v.seat ? ` (${t('you')})` : ''}</td><td class="${d >= 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d}</td><td class="tot">${p.score}</td></tr>`;
  }).join('')}</table>`;
  const isHost = S.role === 'host';
  const last = v.handNo + 1 >= v.totalHands;
  html += `<div class="modal-btns">${isHost
    ? `<button class="btn btn-gold" id="btn-next">${last ? t('gameOver') : t('nextHand')}</button>`
    : `<span class="countdown">${t('waitingHost')}</span>`}<span class="countdown" id="next-cd"></span></div>`;
  card.innerHTML = html;
  $('#modal-result').classList.remove('hidden');
  const nb = $('#btn-next');
  if (nb) nb.onclick = () => { sfx.pop(); $('#modal-result').classList.add('hidden'); S.host.next(); };
  if (!refresh && !r.draw) r.fans.forEach((_, i) => setTimeout(() => sfx.coin(), 150 * i + 100));
}

function showFinal(v) {
  const ranked = v.players.map((p, s) => ({ ...p, s })).sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '🥔'];
  const card = $('#final-card');
  const wasHidden = $('#modal-final').classList.contains('hidden');
  card.innerHTML = `<div class="res-title"><div class="rt-av">🏆</div><div class="rt-name">${t('gameOver')}</div><div class="rt-sub">${t('finalStand')}</div></div>
    ${ranked.map((p, i) => `<div class="rank-row ${i === 0 ? 'first' : ''}" style="animation-delay:${i * 0.2}s"><span class="medal">${medals[i]}</span><span class="r-av">${p.avatar}</span><span class="r-name">${esc(p.name)}${p.s === v.seat ? ` (${t('you')})` : ''}</span><span class="r-score">${p.score > 0 ? '+' : ''}${p.score}</span></div>`).join('')}
    <div class="modal-btns" style="margin-top:14px">${S.role === 'host' ? `<button class="btn btn-gold" id="btn-again">${t('playAgain')}</button>` : ''}<button class="btn btn-blue" id="btn-back">${t('backLobby')}</button></div>`;
  $('#modal-final').classList.remove('hidden');
  $('#btn-back').onclick = () => leave();
  const ag = $('#btn-again');
  if (ag) ag.onclick = () => { $('#modal-final').classList.add('hidden'); startGame(); };
  if (wasHidden) {
    fx.fireworks(10); sfx.fanfare();
    if (ranked[0].s === v.seat) fx.emojiRain(['🏆', '👑', '🎉'], 60);
    else fx.emojiRain(['🥔', '😭', '💸'], 40);
  }
}

function showFanTable() {
  const lang = getLang();
  const groups = {};
  for (const [k, p, zh, en] of FAN_DEFS) { if (k === 'hp') continue; (groups[p] = groups[p] || []).push([zh, en]); }
  const pts = Object.keys(groups).map(Number).sort((a, b) => b - a);
  $('#fans-card').innerHTML = `<div class="res-title"><div class="rt-name">${t('fanTable')}</div></div>
    <p class="rules-text">${t('rules')}</p>
    ${pts.map(p => `<h3>${p} ${t('fan')}</h3><div class="fgrid">${groups[p].map(([zh, en]) => `<div>${lang === 'zh' ? zh : en}<small>${lang === 'zh' ? en : zh}</small></div>`).join('')}</div>`).join('')}
    <div class="modal-btns" style="margin-top:16px"><button class="btn btn-gold" id="btn-close-fans">${t('close')}</button></div>`;
  $('#modal-fans').classList.remove('hidden');
  $('#btn-close-fans').onclick = () => $('#modal-fans').classList.add('hidden');
}

boot();
