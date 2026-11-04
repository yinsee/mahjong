// Three.js table renderer. All 144 tiles exist as meshes; each frame they ease toward target poses.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { faceCanvas } from './textures.js';
import { WIND_ZH, WIND_EN } from './tiles.js';

const TW = 1, TH = 1.36, TD = 0.78;
const GAP = 1.03;
const HAND_Z = 12.5, WALL_Z = 10.1, MELD_Z = 12.7;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const hash = id => { let x = Math.sin(id * 12.9898) * 43758.5453; return x - Math.floor(x); };

export class Table3D {
  constructor(container, { onTileClick, onTileHover, onLand }) {
    this.container = container;
    this.onTileClick = onTileClick;
    this.onTileHover = onTileHover;
    this.onLand = onLand;
    this.view = null;
    this.selected = null;
    this.hover = null;
    this.tiles = new Map();
    this.shakeAmt = 0;
    this.fovKick = 0;
    this.focus = null;
    this.clock = new THREE.Clock();
    this.effects = [];
    this.lang = 'zh';

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x12091f, 40, 90);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camBase = new THREE.Vector3(0, 19, 25);
    this.camLook = new THREE.Vector3(0, 0, 4);
    this.camPos = this.camBase.clone();
    this.camTarget = this.camLook.clone();

    this.buildLights();
    this.buildTable();
    this.buildTiles();
    this.buildMarker();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    const dom = r.domElement;
    dom.addEventListener('pointermove', e => this.onPointer(e, false));
    dom.addEventListener('pointerdown', e => { this.downAt = [e.clientX, e.clientY]; });
    dom.addEventListener('pointerup', e => {
      if (this.downAt && Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) < 12) this.onPointer(e, true);
      this.downAt = null;
    });
    dom.addEventListener('pointerleave', () => this.setHover(null));

    window.addEventListener('resize', () => this.resize());
    this.resize();
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff4e0, 0x2a1840, 0.55));
    const key = new THREE.DirectionalLight(0xfff1d6, 1.6);
    key.position.set(7, 26, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 60;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    s.add(key);
    const warm = new THREE.PointLight(0xffb36b, 60, 40, 1.6);
    warm.position.set(0, 12, 0);
    s.add(warm);
    const rim = new THREE.DirectionalLight(0x8a7dff, 0.5);
    rim.position.set(-15, 10, -20);
    s.add(rim);
    this.turnLight = new THREE.PointLight(0xffd54a, 0, 14, 2);
    this.turnLight.position.set(0, 4, 10);
    s.add(this.turnLight);
  }

  buildTable() {
    const s = this.scene;
    // felt
    const fc = document.createElement('canvas');
    fc.width = fc.height = 1024;
    const g = fc.getContext('2d');
    const grd = g.createRadialGradient(512, 512, 80, 512, 512, 720);
    grd.addColorStop(0, '#1f9d63'); grd.addColorStop(0.6, '#137a4a'); grd.addColorStop(1, '#0a4d2e');
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 40000; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.035)`;
      g.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    g.strokeStyle = 'rgba(255,215,120,0.35)'; g.lineWidth = 6;
    g.strokeRect(40, 40, 944, 944);
    g.lineWidth = 2; g.strokeRect(56, 56, 912, 912);
    const felt = new THREE.Mesh(
      new THREE.PlaneGeometry(29.5, 29.5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(fc), roughness: 0.95 }),
    );
    felt.material.map.colorSpace = THREE.SRGBColorSpace;
    felt.rotation.x = -Math.PI / 2;
    felt.receiveShadow = true;
    s.add(felt);
    // wood rim
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 0.45, metalness: 0.1 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a537, roughness: 0.3, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(31.9, 1.1, 1.3, 3, 0.3), wood);
      const a = (i * Math.PI) / 2;
      b.position.set(Math.sin(a) * 15.4, 0.35, Math.cos(a) * 15.4);
      b.rotation.y = a;
      b.castShadow = true; b.receiveShadow = true;
      s.add(b);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(30, 0.08, 0.12), gold);
      strip.position.set(Math.sin(a) * 14.8, 0.92, Math.cos(a) * 14.8);
      strip.rotation.y = a;
      s.add(strip);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(19, 22, 10, 48), new THREE.MeshStandardMaterial({ color: 0x3a1f10, roughness: 0.7 }));
    base.position.y = -5.05;
    s.add(base);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: 0x1a0f2a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -10;
    s.add(floor);

    // center compass disc
    this.compassCanvas = document.createElement('canvas');
    this.compassCanvas.width = this.compassCanvas.height = 512;
    this.compassTex = new THREE.CanvasTexture(this.compassCanvas);
    this.compassTex.colorSpace = THREE.SRGBColorSpace;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.3, 0.35, 64),
      new THREE.MeshStandardMaterial({ color: 0x2b1408, roughness: 0.4 }),
    );
    disc.position.y = 0.17;
    disc.castShadow = true;
    s.add(disc);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 64),
      new THREE.MeshStandardMaterial({ map: this.compassTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: this.compassTex, emissiveIntensity: 0.35 }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.352;
    s.add(top);
    this.disc = disc;
  }

  drawCompass() {
    const v = this.view;
    const g = this.compassCanvas.getContext('2d');
    const S = 512;
    g.clearRect(0, 0, S, S);
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, '#5a2d0c'); grd.addColorStop(1, '#2b1408');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#d4a537'; g.lineWidth = 10;
    g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke();
    if (!v) { this.compassTex.needsUpdate = true; return; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // positions: rel 0 bottom, 1 right, 2 top, 3 left (texture v flipped: top of canvas = -z)
    const pos = [[256, 430, 0], [430, 256, -Math.PI / 2], [256, 82, Math.PI], [82, 256, Math.PI / 2]];
    for (let s = 0; s < 4; s++) {
      const rel = (s - v.seat + 4) % 4;
      const [x, y, rot] = pos[rel];
      const p = v.players[s];
      const active = v.turn === s && (v.phase === 'play' || v.phase === 'claim');
      g.save();
      g.translate(x, y); g.rotate(rot);
      if (active) {
        g.fillStyle = '#ffd54a';
        g.shadowColor = '#ffb300'; g.shadowBlur = 30;
        g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
      }
      g.fillStyle = active ? '#5a1a00' : (s === v.dealer ? '#ff6b6b' : '#f3e3c3');
      g.font = '900 92px "Noto Serif SC", serif';
      g.fillText(WIND_ZH[p.seatWind], 0, 4);
      g.restore();
    }
    g.fillStyle = '#ffd54a';
    g.font = 'bold 64px Arial';
    g.fillText(String(v.wall.length), 256, 236);
    g.font = '900 40px "Noto Serif SC", serif';
    g.fillStyle = '#f3e3c3';
    g.fillText(this.lang === 'zh' ? `${WIND_ZH[v.roundWind]}风圈` : `${WIND_EN[v.roundWind]}`, 256, 300);
    this.compassTex.needsUpdate = true;
  }

  buildTiles() {
    const bodyGeo = new RoundedBoxGeometry(TW, TH, TD * 0.64, 3, 0.1);
    bodyGeo.translate(0, 0, TD * 0.18);
    const backGeo = new RoundedBoxGeometry(TW, TH, TD * 0.42, 3, 0.1);
    backGeo.translate(0, 0, -TD * 0.29);
    const faceGeo = new THREE.PlaneGeometry(TW * 0.9, TH * 0.9);
    this.faceMats = [];
    for (let t = 0; t < 42; t++) {
      const tex = new THREE.CanvasTexture(faceCanvas(t));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      this.faceMats[t] = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
    }
    const backMat = new THREE.MeshPhysicalMaterial({ color: 0x0f8a5f, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    for (let id = 0; id < 144; id++) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf5e4, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25, emissive: 0x000000 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      const back = new THREE.Mesh(backGeo, backMat);
      const face = new THREE.Mesh(faceGeo, this.faceMats[0]);
      face.position.z = TD * 0.5 + 0.004;
      face.visible = false;
      body.castShadow = back.castShadow = true;
      body.receiveShadow = true;
      body.userData.id = back.userData.id = face.userData.id = id;
      group.add(body, back, face);
      group.position.set(0, -20, 0);
      group.visible = false;
      this.scene.add(group);
      this.tiles.set(id, {
        id, group, body, face, type: -1,
        pos: group.position.clone(), quat: new THREE.Quaternion(), scale: 1,
        anim: null, tgt: null, onTable: false,
      });
    }
  }

  buildMarker() {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3b5c, emissive: 0xff1f4a, emissiveIntensity: 0.8 }),
    );
    m.rotation.x = Math.PI;
    m.visible = false;
    this.scene.add(m);
    this.marker = m;
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    const a = w / h;
    // fit the full table width (incl. own hand, ~±13 units) horizontally
    const half = Math.atan(Math.tan((42 / 2) * Math.PI / 180) * a);
    const need = 13.2 / Math.tan(half);
    const portrait = a < 1;
    const dir = new THREE.Vector3(0, portrait ? 30 : 19, portrait ? 17 : 21).normalize();
    const dist = Math.max(28.4, need * (portrait ? 0.95 : 0.8));
    this.camLook.set(0, 0, portrait ? 4.5 : 3.6);
    this.camBase.copy(this.camLook).addScaledVector(dir, dist);
    this.camera.updateProjectionMatrix();
  }

  setLang(l) { this.lang = l; this.drawCompass(); }

  // ---------- layout ----------
  place(rel, x, y, z, rotX, yaw = 0, scale = 1) {
    const a = rel * Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    const pos = new THREE.Vector3(x * c + z * s, y, -x * s + z * c);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + yaw);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotX));
    return { pos, quat: q, scale };
  }

  update(view, opts = {}) {
    const prevHand = this.view ? this.view.handNo : -1;
    this.view = view;
    const me = view.seat;
    const reveal = view.phase === 'handEnd' || view.phase === 'gameEnd';
    const targets = new Map();
    const deal = opts.deal || prevHand !== view.handNo;

    if (!this.slotOf || this.wallOrderRef !== view.wallOrder.join()) {
      this.wallOrderRef = view.wallOrder.join();
      this.slotOf = new Map(view.wallOrder.map((id, k) => [id, k]));
    }
    // wall
    for (const id of view.wall) {
      const k = this.slotOf.get(id);
      const stack = Math.floor(k / 2);
      let top = k % 2 === 0;
      if (stack >= 36) top = !top;
      const side = (view.dealer + Math.floor(stack / 18)) % 4;
      const rel = (side - me + 4) % 4;
      const pos = stack % 18;
      targets.set(id, this.place(rel, -8.5 + pos * 1.0, top ? TD * 1.5 : TD * 0.5, WALL_Z, Math.PI / 2));
    }
    view.players.forEach((p, seat) => {
      const rel = (seat - me + 4) % 4;
      // hand
      let ids = p.hand.slice();
      let drawnId = null;
      if (seat === me) {
        if (p.drawn != null && ids.includes(p.drawn) && !reveal) { drawnId = p.drawn; ids = ids.filter(i => i !== drawnId); }
        ids.sort((a, b) => (view.known[a] - view.known[b]) || a - b);
        if (drawnId != null) ids.push(drawnId);
      } else if (reveal) {
        ids.sort((a, b) => (view.known[a] - view.known[b]) || a - b);
      }
      const n = ids.length;
      const hasExtra = seat === me ? drawnId != null : n % 3 === 2 && !reveal;
      ids.forEach((id, i) => {
        let x = -9 + i * GAP;
        if (hasExtra && i === n - 1) x += 0.5;
        let tgt;
        if (reveal) {
          tgt = this.place(rel, x, TD / 2, HAND_Z, -Math.PI / 2);
        } else if (seat === me) {
          let y = TH / 2, z = HAND_Z;
          if (id === this.selected) { y += 0.55; z -= 0.25; } else if (id === this.hover) { y += 0.22; }
          tgt = this.place(rel, x, y, z, -0.3);
        } else {
          tgt = this.place(rel, x, TH / 2, HAND_Z, 0.12);
        }
        targets.set(id, tgt);
      });
      // melds (right aligned)
      const widths = p.melds.map(m => m.ids.length * GAP);
      let cursor = 10.7 - widths.reduce((a, b) => a + b + 0.35, 0);
      p.melds.forEach((m, mi) => {
        m.ids.forEach((id, j) => {
          const faceDown = m.kind === 'ankan' && (j === 0 || j === 3);
          targets.set(id, this.place(rel, cursor + j * GAP + GAP / 2, TD / 2, MELD_Z, faceDown ? Math.PI / 2 : -Math.PI / 2));
        });
        if (view.pendingKakan && view.pendingKakan.seat === seat && m.kind === 'pon' && m.t === view.pendingKakan.t) {
          targets.set(view.pendingKakan.id, this.place(rel, cursor + GAP * 1.5, TD * 1.5 + 0.4, MELD_Z, -Math.PI / 2));
        }
        cursor += widths[mi] + 0.35;
      });
      // discards
      p.discards.forEach((id, i) => {
        const row = Math.floor(i / 7), col = i % 7;
        targets.set(id, this.place(rel, -4 + col * GAP, TD / 2, 4.0 + row * 1.42, -Math.PI / 2, (hash(id) - 0.5) * 0.14));
      });
      // flowers
      p.flowers.forEach((id, i) => {
        targets.set(id, this.place(rel, -10.5 - (i % 4) * 0.82, TD * 0.4, 12.0 + Math.floor(i / 4) * 1.12, -Math.PI / 2, 0, 0.78));
      });
    });

    // apply
    let di = 0;
    for (const [id, tile] of this.tiles) {
      const t = view.known[id];
      const type = t === undefined ? -1 : t;
      if (type !== tile.type) {
        tile.type = type;
        if (type >= 0) { tile.face.material = this.faceMats[type]; tile.face.visible = true; } else tile.face.visible = false;
      }
      const tgt = targets.get(id);
      if (!tgt) { tile.group.visible = false; tile.anim = null; tile.tgt = null; continue; }
      tile.group.visible = true;
      const isDiscard = view.players.some(p => p.discards.includes(id));
      if (deal) {
        // snap wall, fly hands with stagger
        if (view.wall.includes(id)) this.snap(tile, tgt);
        else this.animate(tile, tgt, { delay: 0.25 + (di++) * 0.012, dur: 0.5, arc: 2.5 });
      } else this.moveTo(tile, tgt, isDiscard);
    }
    // marker on last discard
    const ld = view.claim ? view.claim.id : (view.lastDiscard && view.players[view.lastDiscard.seat].discards.slice(-1)[0] === view.lastDiscard.id ? view.lastDiscard.id : null);
    this.markerId = reveal ? null : ld;
    // turn light
    const rel = (view.turn - me + 4) % 4;
    const tl = this.place(rel, 0, 5, 9, 0);
    this.turnLight.position.copy(tl.pos);
    this.turnLight.intensity = view.phase === 'play' ? 30 : 0;
    this.drawCompass();
  }

  snap(tile, tgt) {
    tile.group.position.copy(tgt.pos);
    tile.group.quaternion.copy(tgt.quat);
    tile.group.scale.setScalar(tgt.scale);
    tile.tgt = tgt; tile.anim = null;
  }

  moveTo(tile, tgt, isDiscard) {
    const prev = tile.tgt;
    if (prev && prev.pos.distanceTo(tgt.pos) < 0.001 && prev.quat.angleTo(tgt.quat) < 0.001) return;
    const d = tile.group.position.distanceTo(tgt.pos);
    if (d > 2.5) {
      this.animate(tile, tgt, { dur: isDiscard ? 0.45 : 0.5, arc: Math.min(4, 1 + d * 0.18), spin: isDiscard ? 1 : 0, land: isDiscard });
    } else {
      this.animate(tile, tgt, { dur: 0.16, arc: 0 });
    }
  }

  animate(tile, tgt, { delay = 0, dur = 0.3, arc = 0, spin = 0, land = false }) {
    tile.anim = {
      fromPos: tile.group.position.clone(), fromQuat: tile.group.quaternion.clone(), fromScale: tile.group.scale.x,
      t0: this.clock.elapsedTime + delay, dur, arc, spin, land,
    };
    tile.tgt = tgt;
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = this.clock.elapsedTime;
    for (const tile of this.tiles.values()) {
      const a = tile.anim;
      if (!a || !tile.tgt) continue;
      let p = (now - a.t0) / a.dur;
      if (p < 0) continue;
      if (p >= 1) p = 1;
      const e = easeOut(p);
      tile.group.position.lerpVectors(a.fromPos, tile.tgt.pos, e);
      tile.group.position.y += Math.sin(Math.PI * p) * a.arc;
      tile.group.quaternion.slerpQuaternions(a.fromQuat, tile.tgt.quat, e);
      if (a.spin) tile.group.rotateY(Math.sin(Math.PI * p) * Math.PI * 2 * (1 - p));
      tile.group.scale.setScalar(a.fromScale + (tile.tgt.scale - a.fromScale) * e + Math.sin(Math.PI * p) * (a.spin ? 0.5 : 0));
      if (p >= 1) {
        tile.anim = null;
        if (a.land) { this.dust(tile.group.position); if (this.onLand) this.onLand(tile.id); }
      }
    }
    // marker
    if (this.markerId != null) {
      const tile = this.tiles.get(this.markerId);
      this.marker.visible = true;
      this.marker.position.set(tile.group.position.x, 1.4 + Math.abs(Math.sin(now * 5)) * 0.5, tile.group.position.z);
      this.marker.rotation.y = now * 3;
    } else this.marker.visible = false;
    // effects
    this.effects = this.effects.filter(fx => fx(now, dt));
    // camera
    let base = this.focus ? this.focus.pos : this.camBase;
    let look = this.focus ? this.focus.look : this.camLook;
    if (this.orbit) {
      const a = now * 0.06;
      base = new THREE.Vector3(Math.sin(a) * 27, 21, Math.cos(a) * 27);
      look = new THREE.Vector3(0, 0, 0);
    }
    this.camPos.lerp(base, 1 - Math.pow(0.02, dt));
    this.camTarget.lerp(look, 1 - Math.pow(0.02, dt));
    this.camera.position.copy(this.camPos);
    if (this.shakeAmt > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= Math.pow(0.02, dt);
    }
    this.camera.lookAt(this.camTarget);
    this.fovKick *= Math.pow(0.05, dt);
    this.camera.fov = 42 - this.fovKick;
    this.camera.updateProjectionMatrix();
    this.disc.rotation.y = 0;
    this.renderer.render(this.scene, this.camera);
  }

  dust(pos) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.05, pos.z);
    this.scene.add(ring);
    const t0 = this.clock.elapsedTime;
    this.effects.push(now => {
      const p = (now - t0) / 0.45;
      ring.scale.setScalar(1 + p * 2.5);
      ring.material.opacity = 0.8 * (1 - p);
      if (p >= 1) { this.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); return false; }
      return true;
    });
  }

  burst(rel, color = 0xffd54a, count = 40) {
    const center = this.place(rel, 0, 1, 9, 0).pos;
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const parts = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).offsetHSL((Math.random() - 0.5) * 0.2, 0, 0), transparent: true }));
      m.position.copy(center);
      const v = new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 10, (Math.random() - 0.5) * 14);
      parts.push({ m, v });
      this.scene.add(m);
    }
    const t0 = this.clock.elapsedTime;
    this.effects.push((now, dt) => {
      const p = (now - t0) / 1.6;
      for (const o of parts) {
        o.v.y -= 22 * dt;
        o.m.position.addScaledVector(o.v, dt);
        o.m.material.opacity = 1 - p;
      }
      if (p >= 1) { parts.forEach(o => { this.scene.remove(o.m); o.m.material.dispose(); }); geo.dispose(); return false; }
      return true;
    });
  }

  shake(a = 0.6) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  kick(a = 6) { this.fovKick = a; }

  focusSeat(rel, ms = 2600) {
    const hand = this.place(rel, 0, 0, HAND_Z, 0).pos;
    const cam = this.place(rel, 0, 13, HAND_Z + 5.5, 0).pos;
    if (rel === 0) cam.set(0, 12, HAND_Z + 8);
    this.focus = { pos: cam, look: hand };
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => { this.focus = null; }, ms);
  }

  seatScreen(rel) {
    const p = this.place(rel, 0, 1.5, 9.5, 0).pos.project(this.camera);
    const w = this.container.clientWidth, h = this.container.clientHeight;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h };
  }

  onPointer(e, click) {
    if (!this.view) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const me = this.view.players[this.view.seat];
    const meshes = me.hand.map(id => this.tiles.get(id).body);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    const id = hit ? hit.object.userData.id : null;
    if (click) { if (id != null && this.onTileClick) this.onTileClick(id); } else this.setHover(id);
  }

  setHover(id) {
    if (id === this.hover) return;
    this.hover = id;
    this.renderer.domElement.style.cursor = id != null ? 'pointer' : 'default';
    if (this.onTileHover) this.onTileHover(id);
    if (this.view) this.update(this.view);
  }

  setSelected(id) {
    this.selected = id;
    for (const tile of this.tiles.values()) tile.body.material.emissive.setHex(tile.id === id ? 0x664400 : 0x000000);
    if (this.view) this.update(this.view);
  }

  highlight(ids) {
    for (const tile of this.tiles.values()) {
      if (tile.id === this.selected) continue;
      tile.body.material.emissive.setHex(ids && ids.includes(tile.id) ? 0x3a2a00 : 0x000000);
    }
  }
}
