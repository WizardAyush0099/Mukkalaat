import * as THREE from 'three';
import { sparkTexture, radialGlowTexture, makeCanvas, tex } from './util.js';

function ringTexture() {
  const s = 256;
  const c = makeCanvas(s), g = c.getContext('2d');
  g.translate(s / 2, s / 2);
  g.strokeStyle = '#fff';
  g.lineWidth = 14;
  g.beginPath(); g.arc(0, 0, s * 0.38, 0, 7); g.stroke();
  g.lineWidth = 5;
  g.globalAlpha = .5;
  g.beginPath(); g.arc(0, 0, s * 0.46, 0, 7); g.stroke();
  return tex(c, { srgb: true });
}

/* ---------------- impact / dust spruce-up ---------------- */
export function createFX(scene) {
  const sparkMap = sparkTexture(128);
  const softMap = radialGlowTexture(128, 'rgba(214,198,172,1)', 'rgba(120,92,64,0)');
  const ringMap = ringTexture();

  const sparks = [];
  for (let i = 0; i < 72; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
    }));
    s.visible = false;
    scene.add(s);
    sparks.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1, grow: 0, spin: 0 });
  }
  const dusts = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softMap, transparent: true, depthWrite: false, opacity: 0, color: 0xcbb79a
    }));
    s.visible = false;
    scene.add(s);
    dusts.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
  }
  const rings = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ringMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: 0xffb070
    }));
    s.visible = false;
    scene.add(s);
    rings.push({ s, life: 0, max: 1, size: 1 });
  }

  function free(list) {
    for (const p of list) if (p.life <= 0) return p;
    return list[Math.floor(Math.random() * list.length)];
  }

  function spark(pos, opts = {}) {
    const power = opts.power || 1;
    const color = new THREE.Color(opts.color || 0xffd08a);
    const n = 4 + Math.round(power * 4);
    for (let i = 0; i < n; i++) {
      const p = free(sparks);
      p.s.visible = true;
      p.s.material.color.copy(color);
      p.s.material.opacity = 1;
      p.s.position.copy(pos);
      const a = Math.random() * Math.PI * 2, up = Math.random();
      p.vx = Math.cos(a) * (1.2 + Math.random() * 3 * power);
      p.vy = (0.4 + up * 2.6) * power;
      p.vz = Math.sin(a) * (1.2 + Math.random() * 2.5 * power);
      p.max = p.life = .22 + Math.random() * .3;
      p.size = (.16 + Math.random() * .3) * power;
      p.grow = 1.5 + Math.random();
      p.s.scale.setScalar(p.size);
    }
    // central flash
    const f = free(sparks);
    f.s.visible = true;
    f.s.material.color.set(0xfff3d4);
    f.s.material.opacity = 1;
    f.s.position.copy(pos);
    f.vx = f.vy = f.vz = 0;
    f.max = f.life = .16;
    f.size = .8 * power; f.grow = 2.6;
    f.s.scale.setScalar(f.size);
    // shock ring
    const r = free(rings);
    r.s.visible = true;
    r.s.material.color.copy(color);
    r.s.material.opacity = .9;
    r.s.position.copy(pos);
    r.max = r.life = .32;
    r.size = .55 * power;
    r.s.scale.setScalar(r.size);
  }

  function dust(pos, n = 6, spread = 1, up = .6) {
    for (let i = 0; i < n; i++) {
      const p = free(dusts);
      p.s.visible = true;
      p.s.material.opacity = .4;
      p.s.position.copy(pos);
      p.s.position.x += (Math.random() - .5) * spread;
      p.s.position.z += (Math.random() - .5) * spread * .6;
      p.vx = (Math.random() - .5) * 1.2;
      p.vy = .3 + Math.random() * up;
      p.vz = (Math.random() - .5) * .7;
      p.max = p.life = .45 + Math.random() * .5;
      p.size = .25 + Math.random() * .5;
      p.s.scale.setScalar(p.size);
    }
  }

  function update(dt) {
    for (const p of sparks) {
      if (p.life <= 0) { if (p.s.visible) p.s.visible = false; continue; }
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      p.vy -= 8 * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      p.vx *= 1 - 2.4 * dt; p.vz *= 1 - 2.4 * dt;
      p.s.material.opacity = k;
      p.s.scale.setScalar(p.size * (1 + (1 - k) * p.grow));
    }
    for (const p of dusts) {
      if (p.life <= 0) { if (p.s.visible) p.s.visible = false; continue; }
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      p.vy *= 1 - 1.2 * dt;
      p.s.material.opacity = k * .38;
      p.s.scale.setScalar(p.size * (1 + (1 - k) * 2.4));
    }
    for (const p of rings) {
      if (p.life <= 0) { if (p.s.visible) p.s.visible = false; continue; }
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      p.s.material.opacity = k * .85;
      p.s.scale.setScalar(p.size * (1 + (1 - k) * 3.2));
    }
  }

  return { spark, dust, update };
}

/* ---------------- synthesized audio ---------------- */
export function createAudio() {
  let ctx = null, master = null, noiseBuf = null, muted = false;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = .5;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function unlock() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function noise(dur, freq, gain, type = 'bandpass', q = 1) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + dur + .02);
  }

  function tone(freq, end, dur, gain, type = 'sine') {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + .02);
  }

  const api = {
    unlock,
    toggle() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : .5;
      return !muted;
    },
    get muted() { return muted; },
    hit(power = 1) {
      tone(140 * power, 38, .22, .55 * power, 'sine');
      noise(.09, 1600, .32, 'bandpass', .8);
      noise(.16, 420, .22, 'lowpass', .6);
    },
    block() {
      noise(.12, 3200, .3, 'bandpass', 2);
      tone(700, 300, .1, .14, 'triangle');
    },
    whoosh() { noise(.16, 900, .12, 'bandpass', 1.4); },
    step() { noise(.06, 220, .08, 'lowpass', .7); },
    jump() { tone(260, 520, .12, .1, 'triangle'); },
    ko() {
      tone(120, 30, .8, .75, 'sine');
      noise(.5, 240, .5, 'lowpass', .5);
      api.cheer(.7);
    },
    cheer(amt = .5) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 780; f.Q.value = .55;
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.16 * amt, t + .25);
      g.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
      src.connect(f).connect(g).connect(master);
      src.start(t); src.stop(t + 2.3);
    },
    bell() {
      tone(880, 880, 1.1, .18, 'sine');
      tone(1320, 1320, .9, .09, 'sine');
    },
    super() {
      tone(120, 600, .5, .3, 'sawtooth');
      noise(.5, 1200, .2, 'bandpass', 1.2);
    },
    ui() { tone(520, 700, .07, .1, 'triangle'); }
  };
  return api;
}
