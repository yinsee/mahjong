const S = {
  title: ['麻将狂欢', 'Mahjong Mayhem'],
  subtitle: ['国标麻将 · 3D 联机对战', 'Guobiao Mahjong · 3D Online Battle'],
  yourName: ['你的名字', 'Your name'],
  pickAvatar: ['选择头像', 'Pick avatar'],
  createRoom: ['创建房间', 'Create Room'],
  joinRoom: ['加入房间', 'Join Room'],
  roomCode: ['房间号', 'Room code'],
  practice: ['单机练习 (对战电脑)', 'Practice vs Bots'],
  join: ['加入', 'Join'],
  room: ['房间', 'Room'],
  shareLink: ['复制邀请链接', 'Copy invite link'],
  copied: ['已复制！', 'Copied!'],
  waiting: ['等待玩家加入…', 'Waiting for players…'],
  emptySeat: ['空位', 'Empty seat'],
  addBot: ['+ 电脑', '+ Bot'],
  kick: ['移除', 'Remove'],
  start: ['开始游戏！', 'Start Game!'],
  needFour: ['需要 4 名玩家', 'Need 4 players'],
  hostOnly: ['等待房主开始…', 'Waiting for host to start…'],
  hands: ['局数', 'Hands'],
  oneRound: ['一圈 (4局)', '1 round (4 hands)'],
  twoRounds: ['两圈 (8局)', '2 rounds (8 hands)'],
  fullGame: ['全庄 (16局)', 'Full game (16 hands)'],
  leave: ['离开', 'Leave'],
  connecting: ['连接中…', 'Connecting…'],
  connFail: ['连接失败，请检查房间号', 'Connection failed. Check the room code.'],
  noRoom: ['找不到这个房间，请检查房间号', 'Room not found. Check the room code.'],
  p2pBlocked: ['找到房间，但网络阻止了直连（VPN / 公司网络？）。请关闭 VPN 或换个网络再试。', 'Room found, but your network blocks direct connections (VPN or office network?). Turn off the VPN or try another network.'],
  netFail: ['无法连接服务器，请检查网络', 'Cannot reach the server. Check your internet connection.'],
  roomFull: ['房间已满', 'The room is full'],
  hostLeft: ['房主已断开', 'The host disconnected'],
  you: ['你', 'You'],
  bot: ['电脑', 'Bot'],
  hu: ['胡', 'Hu'],
  zimo: ['自摸', 'Self-draw'],
  pon: ['碰', 'Pong'],
  kan: ['杠', 'Kong'],
  chi: ['吃', 'Chow'],
  pass: ['过', 'Pass'],
  ankan: ['暗杠', 'Conc. Kong'],
  kakan: ['加杠', 'Add Kong'],
  yourTurn: ['轮到你出牌！点两下打出', 'Your turn! Tap a tile twice to discard'],
  clickAgain: ['再点一次打出', 'Tap again to discard'],
  wallLeft: ['余牌', 'Wall'],
  handOf: ['第 {a}/{b} 局', 'Hand {a}/{b}'],
  roundWind: ['{w}风圈', '{w} Round'],
  dealer: ['庄', 'Dealer'],
  winner: ['胡牌！', 'WINS!'],
  selfDrawn: ['自摸', 'Self-drawn'],
  dealtIn: ['{n} 放炮', '{n} dealt in'],
  robbed: ['抢杠', 'Robbed the Kong'],
  fanTotal: ['合计', 'Total'],
  fan: ['番', 'fan'],
  flowers: ['花牌', 'Flowers'],
  payments: ['积分变化', 'Score changes'],
  nextHand: ['下一局', 'Next Hand'],
  waitingHost: ['等待房主继续…', 'Waiting for host…'],
  drawGame: ['荒庄！', 'Draw!'],
  drawSub: ['牌墙摸完，无人胡牌', 'Wall exhausted. Nobody wins.'],
  gameOver: ['游戏结束', 'Game Over'],
  finalStand: ['最终排名', 'Final standings'],
  backLobby: ['返回大厅', 'Back to Lobby'],
  playAgain: ['再来一局', 'Play Again'],
  waits: ['听牌', 'Waits'],
  tenpaiHint: ['打这张 → 听', 'Discard → wait on'],
  noFan: ['不够8番', '< 8 fan'],
  fanTable: ['番种表', 'Fan Table'],
  rules: ['规则：国标麻将，8番起和。花牌每张1番（不计起和）。自摸：三家各付 8+番；点炮：放炮者付 8+番，其他两家各付 8。',
    'Rules: Guobiao (MCR). A win needs at least 8 fan. Each flower adds 1 fan (does not count toward the 8). Self-draw: each player pays 8 + fan. Discard win: the discarder pays 8 + fan, the other two pay 8 each.'],
  close: ['关闭', 'Close'],
  disconnected: ['掉线 (电脑代打)', 'Offline (bot plays)'],
  timeout: ['超时自动出牌', 'Timeout: auto play'],
  sound: ['音效', 'Sound'],
  music: ['音乐', 'Music'],
  claimFrom: ['{n} 打出', '{n} discarded'],
  chooseChi: ['选择吃法', 'Choose chow'],
  scoreboard: ['计分', 'Scores'],
  emptyName: ['无名雀神', 'Mystery Player'],
  loading: ['加载中…', 'Loading…'],
  hostTag: ['房主', 'Host'],
  lastTile: ['最后一张！', 'Last tile!'],
  invalidHu: ['番数不足8番，不能胡！', 'Under 8 fan. You cannot win yet!'],
};

const TAUNTS = {
  win: [['哈哈哈！胡啦！', 'HAHAHA! Got it!'], ['不好意思，又是我~', 'Sorry, me again~'], ['给钱给钱！', 'Pay up, pay up!'], ['雀神降临！', 'The Mahjong god has arrived!']],
  dealIn: [['我的钱包…', 'My wallet…'], ['手滑了！！', 'My hand slipped!!'], ['这不科学！', 'This is not science!'], ['我要掀桌了！', 'I flip this table!']],
  pong: [['碰碰碰！', 'Pong pong pong!'], ['这张我要了！', 'I take that one!'], ['谢谢老板！', 'Thanks, boss!']],
  kong: [['杠上加杠！', 'KONG-tastic!'], ['四张全在我这！', 'All four are mine!']],
  chow: [['吃！好吃！', 'Chow! Yummy!'], ['真香！', 'Tasty!']],
  draw: [['白打了…', 'All for nothing…'], ['谁偷了牌？', 'Who stole the tiles?']],
};

let lang = 'zh';
try { lang = localStorage.getItem('mj_lang') || 'zh'; } catch { /* ignore */ }

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('mj_lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  applyI18n();
}
export function t(key, vars) {
  const e = S[key];
  let s = e ? e[lang === 'zh' ? 0 : 1] : key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}
export function both(key) { const e = S[key]; return e ? `${e[0]} ${e[1]}` : key; }
export function taunt(kind) {
  const list = TAUNTS[kind];
  const p = list[Math.floor(Math.random() * list.length)];
  return lang === 'zh' ? p[0] : p[1];
}
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}
