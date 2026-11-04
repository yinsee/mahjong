// Procedural tile face artwork drawn on canvas (no image assets).
const W = 256, H = 348;
const NUM_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const FONT = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const BLUE = '#1d4fa8', GREEN = '#127a3a', RED = '#c8102e', NAVY = '#14213d';

const canvases = [];
const urls = [];

function circleDot(g, x, y, r, color) {
  g.save();
  g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fbf6e9'; g.beginPath(); g.arc(x, y, r * 0.72, 0, Math.PI * 2); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(x, y, r * 0.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fbf6e9'; g.lineWidth = r * 0.08;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48); g.stroke();
  }
  g.fillStyle = '#fbf6e9'; g.beginPath(); g.arc(x, y, r * 0.14, 0, Math.PI * 2); g.fill();
  g.restore();
}

function stick(g, x, y, len, color, rot = 0) {
  const w = 22;
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.fillStyle = color;
  const r = 10;
  g.beginPath();
  g.roundRect(-w / 2, -len / 2, w, len, r);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(-w / 2 + 4, -len / 2 + 6, 4, len - 12);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (const fy of [-0.5, 0, 0.5]) g.fillRect(-w / 2 - 2, fy * len * 0.8 - 3, w + 4, 6);
  g.restore();
}

function bird(g) {
  g.save();
  g.translate(W / 2, H / 2 + 6);
  // tail feathers
  const tail = [[-0.9, RED], [-0.45, BLUE], [0, GREEN], [0.45, BLUE], [0.9, RED]];
  for (const [a, c] of tail) {
    g.save(); g.rotate(a * 0.6 + Math.PI);
    g.fillStyle = c; g.beginPath(); g.ellipse(0, -70, 20, 62, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(0, -110, 10, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.fillStyle = GREEN; g.beginPath(); g.ellipse(0, -10, 42, 56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = BLUE; g.beginPath(); g.ellipse(-10, -12, 22, 36, 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = RED; g.beginPath(); g.arc(14, -78, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(22, -84, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.arc(24, -84, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2a900'; g.beginPath(); g.moveTo(38, -80); g.lineTo(64, -72); g.lineTo(38, -66); g.fill();
  g.strokeStyle = RED; g.lineWidth = 5;
  for (const dx of [-10, 0, 10]) { g.beginPath(); g.moveTo(14, -102); g.lineTo(14 + dx * 1.4, -124); g.stroke(); }
  g.restore();
}

const DOTS = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.27], [0.5, 0.73]],
  3: [[0.24, 0.2], [0.5, 0.5], [0.76, 0.8]],
  4: [[0.28, 0.27], [0.72, 0.27], [0.28, 0.73], [0.72, 0.73]],
  5: [[0.26, 0.22], [0.74, 0.22], [0.5, 0.5], [0.26, 0.78], [0.74, 0.78]],
  6: [[0.3, 0.17], [0.7, 0.17], [0.3, 0.5], [0.7, 0.5], [0.3, 0.83], [0.7, 0.83]],
  7: [[0.22, 0.13], [0.5, 0.25], [0.78, 0.37], [0.3, 0.62], [0.7, 0.62], [0.3, 0.86], [0.7, 0.86]],
  8: [[0.3, 0.13], [0.7, 0.13], [0.3, 0.38], [0.7, 0.38], [0.3, 0.62], [0.7, 0.62], [0.3, 0.87], [0.7, 0.87]],
  9: [[0.2, 0.17], [0.5, 0.17], [0.8, 0.17], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.83], [0.5, 0.83], [0.8, 0.83]],
};
const DOT_R = { 1: 88, 2: 52, 3: 44, 4: 42, 5: 38, 6: 34, 7: 30, 8: 28, 9: 30 };
const DOT_COL = {
  1: [RED], 2: [GREEN, BLUE], 3: [BLUE, RED, GREEN], 4: [BLUE, GREEN, GREEN, BLUE], 5: [BLUE, GREEN, RED, GREEN, BLUE],
  6: [GREEN, GREEN, RED, RED, RED, RED], 7: [GREEN, GREEN, GREEN, RED, RED, RED, RED], 8: Array(8).fill(BLUE),
  9: [BLUE, BLUE, BLUE, RED, RED, RED, GREEN, GREEN, GREEN],
};
const STICKS = {
  2: [[0.5, 0.27], [0.5, 0.73]],
  3: [[0.5, 0.27], [0.3, 0.73], [0.7, 0.73]],
  4: [[0.3, 0.27], [0.7, 0.27], [0.3, 0.73], [0.7, 0.73]],
  5: [[0.25, 0.27], [0.75, 0.27], [0.5, 0.5, 1], [0.25, 0.73], [0.75, 0.73]],
  6: [[0.2, 0.27], [0.5, 0.27], [0.8, 0.27], [0.2, 0.73], [0.5, 0.73], [0.8, 0.73]],
  7: [[0.5, 0.17, 1], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.83], [0.5, 0.83], [0.8, 0.83]],
  // 8 条: "M" on top (middle sticks lean together at the top), "W" below (lean together at the bottom)
  8: [[0.12, 0.27], [0.39, 0.27, 0, 0.42], [0.61, 0.27, 0, -0.42], [0.88, 0.27],
    [0.12, 0.73], [0.39, 0.73, 0, -0.42], [0.61, 0.73, 0, 0.42], [0.88, 0.73]],
  9: [[0.2, 0.17], [0.5, 0.17, 1], [0.8, 0.17], [0.2, 0.5], [0.5, 0.5, 1], [0.8, 0.5], [0.2, 0.83], [0.5, 0.83, 1], [0.8, 0.83]],
};

function corner(g, text, color) {
  g.save();
  g.font = `bold 34px Arial, sans-serif`;
  g.fillStyle = color;
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText(text, 14, 10);
  g.restore();
}

function drawFace(t) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const pad = 22, iw = W - pad * 2, ih = H - pad * 2;
  if (t < 9) {
    g.fillStyle = NAVY;
    g.font = `900 120px ${FONT}`;
    g.fillText(NUM_ZH[t], W / 2, H * 0.3);
    g.fillStyle = RED;
    g.font = `900 150px ${FONT}`;
    g.fillText('萬', W / 2, H * 0.68);
    corner(g, String(t + 1), RED);
  } else if (t < 18) {
    const r = t - 8;
    DOTS[r].forEach(([x, y], i) => circleDot(g, pad + x * iw, pad + y * ih, DOT_R[r], DOT_COL[r][i]));
    if (r === 1) {
      g.strokeStyle = GREEN; g.lineWidth = 6;
      g.beginPath(); g.arc(W / 2, H / 2, 104, 0, Math.PI * 2); g.stroke();
    }
  } else if (t < 27) {
    const r = t - 17;
    if (r === 1) bird(g);
    else {
      const rows = r === 7 || r === 9 ? 3 : 2;
      const len = rows === 3 ? 82 : 120;
      STICKS[r].forEach(([x, y, red, rot]) => stick(g, pad + x * iw, pad + y * ih, len, red ? RED : GREEN, rot));
    }
  } else if (t < 31) {
    g.fillStyle = NAVY;
    g.font = `900 170px ${FONT}`;
    g.fillText(['東', '南', '西', '北'][t - 27], W / 2, H / 2 + 8);
    corner(g, ['E', 'S', 'W', 'N'][t - 27], BLUE);
  } else if (t === 31) {
    g.fillStyle = RED;
    g.font = `900 190px ${FONT}`;
    g.fillText('中', W / 2, H / 2 + 6);
  } else if (t === 32) {
    g.fillStyle = GREEN;
    g.font = `900 180px ${FONT}`;
    g.fillText('發', W / 2, H / 2 + 6);
  } else if (t === 33) {
    g.strokeStyle = BLUE; g.lineWidth = 12;
    g.strokeRect(46, 50, W - 92, H - 100);
    g.lineWidth = 4;
    g.strokeRect(66, 70, W - 132, H - 140);
  } else {
    const f = t - 34;
    const chars = ['梅', '蘭', '竹', '菊', '春', '夏', '秋', '冬'];
    const cols = ['#d6336c', '#7048e8', '#2b8a3e', '#e67700', '#2f9e44', '#e03131', '#d9480f', '#1c7ed6'];
    g.fillStyle = cols[f];
    g.globalAlpha = 0.18;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(W / 2 + Math.cos(i) * 70, H / 2 + Math.sin(i * 1.7) * 90, 30 + (i % 3) * 8, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.font = `900 150px ${FONT}`;
    g.fillText(chars[f], W / 2, H / 2 + 20);
    corner(g, String((f % 4) + 1), cols[f]);
    g.font = `bold 28px Arial`;
    g.textAlign = 'right';
    g.fillText(f < 4 ? '✿' : '☀', W - 18, 30);
  }
  return c;
}

export async function prepareFaces() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`900 100px "Noto Serif SC"`, '一萬東南西北中發梅蘭竹菊春夏秋冬')]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch { /* fallback fonts */ }
  for (let t = 0; t < 42; t++) {
    canvases[t] = drawFace(t);
    urls[t] = null;
  }
}
export const faceCanvas = t => canvases[t];
export function faceURL(t) {
  if (!urls[t]) urls[t] = canvases[t].toDataURL();
  return urls[t];
}
export function tileHTML(t, cls = '') {
  return `<span class="mini-tile ${cls}"><img src="${faceURL(t)}" alt=""></span>`;
}
