// Synthesized sound effects (no audio files) + speech callouts + generative pentatonic music.
let ctx = null, master = null, sfxGain = null, musicGain = null;
let sfxOn = true, musicOn = true, musicTimer = null;
try {
  sfxOn = localStorage.getItem('mj_sfx') !== '0';
  musicOn = localStorage.getItem('mj_music') !== '0';
} catch { /* ignore */ }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 1 : 0; sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
  startMusic();
}
export const isSfx = () => sfxOn;
export const isMusic = () => musicOn;
export function setSfx(on) {
  sfxOn = on;
  try { localStorage.setItem('mj_sfx', on ? '1' : '0'); } catch { /* ignore */ }
  if (sfxGain) sfxGain.gain.value = on ? 1 : 0;
}
export function setMusic(on) {
  musicOn = on;
  try { localStorage.setItem('mj_music', on ? '1' : '0'); } catch { /* ignore */ }
  if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.16 : 0, ctx.currentTime, 0.3);
}

function tone({ f = 440, f2 = null, type = 'sine', dur = 0.2, vol = 0.3, at = 0, attack = 0.005, out = sfxGain }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
let noiseBuf = null;
function noise({ dur = 0.1, vol = 0.3, at = 0, freq = 2000, q = 1, type = 'bandpass', f2 = null }) {
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t0); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(sfxGain);
  s.start(t0); s.stop(t0 + dur + 0.02);
}

export const sfx = {
  clack() { // tile hits table
    noise({ dur: 0.06, vol: 0.9, freq: 2600 + Math.random() * 800, q: 3 });
    tone({ f: 1800 + Math.random() * 300, type: 'triangle', dur: 0.05, vol: 0.25 });
    tone({ f: 320, f2: 180, type: 'sine', dur: 0.08, vol: 0.3 });
  },
  tick() { tone({ f: 1400, type: 'square', dur: 0.03, vol: 0.06 }); },
  hover() { tone({ f: 900 + Math.random() * 100, type: 'sine', dur: 0.04, vol: 0.05 }); },
  select() { tone({ f: 660, f2: 990, type: 'triangle', dur: 0.08, vol: 0.15 }); },
  draw() { noise({ dur: 0.12, vol: 0.25, freq: 900, f2: 3000, q: 0.8 }); },
  whoosh() { noise({ dur: 0.35, vol: 0.5, freq: 400, f2: 4000, q: 0.7 }); },
  boing() {
    tone({ f: 180, f2: 520, type: 'sine', dur: 0.25, vol: 0.4 });
    tone({ f: 520, f2: 260, type: 'sine', dur: 0.3, vol: 0.3, at: 0.18 });
  },
  pop() { tone({ f: 500, f2: 1200, type: 'sine', dur: 0.08, vol: 0.3 }); },
  pong() {
    sfx.boing();
    tone({ f: 784, type: 'square', dur: 0.12, vol: 0.12, at: 0.02 });
    tone({ f: 1046, type: 'square', dur: 0.18, vol: 0.12, at: 0.12 });
    noise({ dur: 0.15, vol: 0.4, freq: 1500, q: 1 });
  },
  chow() {
    tone({ f: 300, f2: 900, type: 'sawtooth', dur: 0.12, vol: 0.12 });
    tone({ f: 900, f2: 300, type: 'sawtooth', dur: 0.12, vol: 0.12, at: 0.12 });
    tone({ f: 600, type: 'triangle', dur: 0.15, vol: 0.2, at: 0.24 });
  },
  boom() {
    noise({ dur: 0.8, vol: 1.2, freq: 300, f2: 60, q: 0.5, type: 'lowpass' });
    tone({ f: 120, f2: 30, type: 'sine', dur: 0.7, vol: 0.8 });
  },
  kong() {
    sfx.boom();
    [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'square', dur: 0.12, vol: 0.1, at: 0.1 + i * 0.06 }));
  },
  flower() {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, type: 'sine', dur: 0.3, vol: 0.12, at: i * 0.05 }));
  },
  drumroll(dur = 1) {
    for (let i = 0; i < dur * 28; i++) noise({ dur: 0.05, vol: 0.15 + (i / (dur * 28)) * 0.4, freq: 180, q: 1, type: 'lowpass', at: i / 28 });
  },
  fanfare() {
    const seq = [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.52], [1046, 0.64]];
    seq.forEach(([f, at]) => {
      tone({ f, type: 'sawtooth', dur: 0.22, vol: 0.12, at });
      tone({ f: f * 2, type: 'square', dur: 0.18, vol: 0.05, at });
    });
    [1046, 1318, 1568].forEach(f => tone({ f, type: 'triangle', dur: 1.4, vol: 0.12, at: 0.8, attack: 0.02 }));
    sfx.cymbal(0.8);
  },
  cymbal(at = 0) { noise({ dur: 1.2, vol: 0.4, freq: 7000, q: 0.5, type: 'highpass', at }); },
  sadTrombone() {
    [[392, 0], [370, 0.45], [349, 0.9]].forEach(([f, at]) => tone({ f, f2: f * 0.98, type: 'sawtooth', dur: 0.42, vol: 0.13, at, attack: 0.05 }));
    tone({ f: 330, f2: 290, type: 'sawtooth', dur: 1.3, vol: 0.13, at: 1.35, attack: 0.05 });
  },
  coin(at = 0) {
    tone({ f: 988, type: 'square', dur: 0.08, vol: 0.08, at });
    tone({ f: 1318, type: 'square', dur: 0.25, vol: 0.08, at: at + 0.08 });
  },
  slam() {
    noise({ dur: 0.3, vol: 1.1, freq: 200, q: 0.7, type: 'lowpass' });
    tone({ f: 90, f2: 40, type: 'sine', dur: 0.35, vol: 0.9 });
    noise({ dur: 0.08, vol: 0.7, freq: 3000, q: 2, at: 0.01 });
  },
  alert() { tone({ f: 880, type: 'triangle', dur: 0.1, vol: 0.15 }); tone({ f: 1175, type: 'triangle', dur: 0.15, vol: 0.15, at: 0.1 }); },
  fart() {
    tone({ f: 90, f2: 60, type: 'sawtooth', dur: 0.5, vol: 0.25 });
    noise({ dur: 0.5, vol: 0.3, freq: 150, q: 4 });
  },
  laugh() { [0, 0.13, 0.26, 0.39].forEach((at, i) => tone({ f: 600 - i * 40, f2: 400 - i * 40, type: 'triangle', dur: 0.1, vol: 0.15, at })); },
  start() {
    sfx.whoosh();
    [392, 523, 659, 784].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.2, vol: 0.15, at: 0.2 + i * 0.08 }));
  },
};

// Speech callouts (bilingual voices)
export function speak(zh, en, lang) {
  if (!sfxOn || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(lang === 'zh' ? zh : en);
    u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    u.rate = 1.15; u.pitch = 1.3; u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

// Gentle generative pentatonic "guzheng" music
const SCALE = [0, 2, 4, 7, 9];
function pluck(freq, at, vol = 0.25) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(freq * 6, t0);
  fl.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.8);
  o.type = 'triangle'; o2.type = 'sine';
  o.frequency.value = freq; o2.frequency.value = freq * 2.01;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
  o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(musicGain);
  o.start(t0); o2.start(t0); o.stop(t0 + 1.7); o2.stop(t0 + 1.7);
}
function startMusic() {
  if (musicTimer) return;
  let step = 0;
  const base = 220;
  let phrase = [];
  const newPhrase = () => {
    phrase = [];
    let deg = Math.floor(Math.random() * 5) + 5;
    for (let i = 0; i < 8; i++) {
      deg = Math.max(0, Math.min(12, deg + Math.floor(Math.random() * 5) - 2));
      phrase.push(Math.random() < 0.25 ? null : deg);
    }
  };
  newPhrase();
  musicTimer = setInterval(() => {
    if (!ctx || !musicOn) return;
    const i = step % 16;
    if (i === 0 && Math.random() < 0.5) newPhrase();
    const d = phrase[i % 8];
    if (d != null && (i % 2 === 0 || Math.random() < 0.4)) {
      const oct = Math.floor(d / 5), n = SCALE[d % 5];
      pluck(base * Math.pow(2, oct + n / 12), 0, 0.18);
    }
    if (i % 8 === 0) pluck(base / 2 * Math.pow(2, SCALE[[0, 3, 4, 0][(step / 8) % 4 | 0]] / 12), 0, 0.2);
    step++;
  }, 260);
}
