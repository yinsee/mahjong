// 2D overlay effects: giant callouts, confetti, emoji rain, coins, screen shake, bubbles.
const layer = () => document.getElementById('fx-layer');
let canvas, g2, parts = [], running = false;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.getElementById('fx-canvas');
  g2 = canvas.getContext('2d');
  const rs = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
  addEventListener('resize', rs); rs();
}
function loop() {
  if (!parts.length) { running = false; g2.clearRect(0, 0, canvas.width, canvas.height); return; }
  running = true;
  const d = devicePixelRatio;
  g2.clearRect(0, 0, canvas.width, canvas.height);
  const now = performance.now();
  parts = parts.filter(p => {
    const age = (now - p.t0) / 1000;
    if (age > p.life) return false;
    p.vy += p.g / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.rot += p.vr / 60;
    g2.save();
    g2.globalAlpha = Math.min(1, (p.life - age) * 2);
    g2.translate(p.x * d, p.y * d); g2.rotate(p.rot);
    if (p.emoji) {
      g2.font = `${p.size * d}px serif`;
      g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillText(p.emoji, 0, 0);
    } else {
      g2.fillStyle = p.color;
      g2.fillRect(-p.size * d / 2, -p.size * d / 4, p.size * d, p.size * d / 2);
    }
    g2.restore();
    return true;
  });
  requestAnimationFrame(loop);
}
function addParts(list) {
  ensureCanvas();
  parts.push(...list);
  if (!running) requestAnimationFrame(loop);
}

const COLORS = ['#ff3b5c', '#ffd54a', '#4ade80', '#38bdf8', '#c084fc', '#fb923c'];
export function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 120, spread = 900) {
  const t0 = performance.now();
  addParts(Array.from({ length: n }, () => ({
    x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * spread * 0.9 - 200,
    g: 900, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, size: 8 + Math.random() * 10,
    color: COLORS[(Math.random() * COLORS.length) | 0], life: 2.5 + Math.random(), t0,
  })));
}
export function emojiBurst(emoji, x, y, n = 14, spread = 500, size = 36) {
  const t0 = performance.now();
  const list = Array.isArray(emoji) ? emoji : [emoji];
  addParts(Array.from({ length: n }, () => ({
    x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * spread - 150, g: 800,
    rot: (Math.random() - 0.5), vr: (Math.random() - 0.5) * 8, size: size * (0.7 + Math.random() * 0.6),
    emoji: list[(Math.random() * list.length) | 0], life: 1.8 + Math.random(), t0,
  })));
}
export function emojiRain(emoji, n = 60, dur = 2.5) {
  const t0 = performance.now();
  const list = Array.isArray(emoji) ? emoji : [emoji];
  addParts(Array.from({ length: n }, (_, i) => ({
    x: Math.random() * innerWidth, y: -60 - Math.random() * innerHeight * 0.8, vx: (Math.random() - 0.5) * 60,
    vy: 200 + Math.random() * 200, g: 300, rot: Math.random(), vr: (Math.random() - 0.5) * 6, size: 30 + Math.random() * 30,
    emoji: list[i % list.length], life: dur + Math.random() * 1.5, t0,
  })));
}
export function fireworks(times = 6) {
  for (let i = 0; i < times; i++) {
    setTimeout(() => confetti(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.2 + Math.random() * 0.4), 70, 700), i * 280);
  }
}

export function bigText(main, sub = '', { color = 'gold', x = null, y = null, dur = 1600, size = 1 } = {}) {
  const el = document.createElement('div');
  el.className = `big-text bt-${color}`;
  el.innerHTML = `<div class="bt-main" style="font-size:${size * 9}rem">${main}</div>${sub ? `<div class="bt-sub">${sub}</div>` : ''}`;
  if (x != null) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
  layer().appendChild(el);
  setTimeout(() => el.remove(), dur);
  return el;
}

export function flash(color = '#fff') {
  const el = document.createElement('div');
  el.className = 'flash';
  el.style.background = color;
  layer().appendChild(el);
  setTimeout(() => el.remove(), 500);
}

export function shakeScreen(level = 1) {
  const st = document.getElementById('stage');
  st.classList.remove('shake1', 'shake2', 'shake3');
  void st.offsetWidth;
  st.classList.add(`shake${level}`);
  setTimeout(() => st.classList.remove(`shake${level}`), 700);
}

export function bubble(anchor, text, ms = 2200) {
  if (!anchor) return;
  let b = anchor.querySelector('.bubble');
  if (b) b.remove();
  b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  anchor.appendChild(b);
  setTimeout(() => b.remove(), ms);
}

export function floatEmote(fromEl, emoji) {
  if (!fromEl) return;
  const r = fromEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-emote';
  el.textContent = emoji;
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top}px`;
  layer().appendChild(el);
  setTimeout(() => el.remove(), 1800);
  emojiBurst(emoji, r.left + r.width / 2, r.top + r.height / 2, 8, 350, 28);
}

export function tumbleweed() {
  const el = document.createElement('div');
  el.className = 'tumbleweed';
  el.textContent = '🌵';
  layer().appendChild(el);
  const w = document.createElement('div');
  w.className = 'tumbleweed tw2';
  w.textContent = '🍂';
  layer().appendChild(w);
  setTimeout(() => { el.remove(); w.remove(); }, 4200);
}
