import * as THREE from 'three';

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EASE = {
  lin: t => t,
  io: t => t * t * (3 - 2 * t),
  out: t => 1 - Math.pow(1 - t, 3),
  out2: t => 1 - Math.pow(1 - t, 4),
  inn: t => t * t * t,
  snap: t => 1 - Math.pow(1 - t, 6),
  back: t => { const c = 1.70158 + 1; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

let maxAniso = 4;
export function setAniso(n) { maxAniso = n; }

export function tex(canvas, opts = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(maxAniso, opts.aniso || 8);
  t.needsUpdate = true;
  return t;
}

/* soft mottled colour map: keeps skin from looking like flat plastic */
export function mottleTexture(size = 512, seed = 7, opts = {}) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = opts.base || '#f2e6df';
  g.fillRect(0, 0, size, size);
  const blobs = opts.blobs || 90;
  for (let i = 0; i < blobs; i++) {
    const x = rand() * size, y = rand() * size, r = size * (0.02 + rand() * 0.12);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.03 + rand() * 0.1;
    grd.addColorStop(0, `rgba(${opts.dark || '150,90,70'},${a})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // fine speckle
  for (let i = 0; i < size * 26; i++) {
    const a = rand() * 0.05;
    g.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(90,50,40,${a})`;
    g.fillRect(rand() * size, rand() * size, 1.4, 1.4);
  }
  return tex(c, { srgb: true });
}

export function bumpTexture(size = 256, seed = 3, strength = 1) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = 88 + rand() * 96;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.arc(rand() * size, rand() * size, 0.5 + rand() * 2.2, 0, 7); g.fill();
  }
  const t = tex(c, { srgb: false });
  t.userData.strength = strength;
  return t;
}

export function weaveTexture(size = 256, seed = 5) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
  const step = 6;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const on = ((x / step + y / step) | 0) % 2 === 0;
      const v = (on ? 118 : 96) + rand() * 34;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, step, step);
      g.fillStyle = `rgba(255,255,255,.05)`;
      g.fillRect(x, y, step, 1);
    }
  }
  for (let i = 0; i < 900; i++) {
    const v = 80 + rand() * 90;
    g.fillStyle = `rgba(${v},${v},${v},.25)`;
    g.fillRect(rand() * size, rand() * size, 2, rand() * 14);
  }
  return tex(c, { srgb: false });
}

export function stoneTexture(size = 1024, seed = 11) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = '#3b3230'; g.fillRect(0, 0, size, size);
  const rows = 5, cols = 5, ch = size / rows, cw = size / cols;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const off = (r % 2) * cw * 0.5;
      const x = col * cw + off - cw, y = r * ch;
      const v = 0.72 + rand() * 0.5;
      const base = [82 * v, 70 * v, 64 * v];
      const grd = g.createLinearGradient(x, y, x + cw, y + ch);
      grd.addColorStop(0, `rgb(${base[0] * 1.1 | 0},${base[1] * 1.1 | 0},${base[2] * 1.1 | 0})`);
      grd.addColorStop(0.55, `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`);
      grd.addColorStop(1, `rgb(${base[0] * 0.72 | 0},${base[1] * 0.72 | 0},${base[2] * 0.72 | 0})`);
      g.fillStyle = grd;
      g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      // speckles
      for (let i = 0; i < 260; i++) {
        const a = rand() * 0.09;
        g.fillStyle = rand() > 0.5 ? `rgba(255,240,220,${a})` : `rgba(0,0,0,${a})`;
        g.fillRect(x + rand() * cw, y + rand() * ch, 1 + rand() * 3, 1 + rand() * 3);
      }
      // cracks
      if (rand() > 0.7) {
        g.strokeStyle = 'rgba(10,8,8,.5)'; g.lineWidth = 1.2;
        g.beginPath();
        let px = x + rand() * cw, py = y + rand() * ch;
        g.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (rand() - 0.5) * cw * 0.4; py += (rand() - 0.5) * ch * 0.4; g.lineTo(px, py); }
        g.stroke();
      }
    }
  }
  return tex(c, { srgb: true });
}

export function stoneBump(size = 512, seed = 13) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = '#7e7e7e'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const v = 90 + rand() * 80;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.arc(rand() * size, rand() * size, 0.6 + rand() * 3, 0, 7); g.fill();
  }
  return tex(c, { srgb: false });
}

export function earthTexture(size = 1024, seed = 17) {
  const rand = mulberry32(seed);
  const c = makeCanvas(size), g = c.getContext('2d');
  g.fillStyle = '#8a6647'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, r = size * (0.01 + rand() * 0.1);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.45;
    grd.addColorStop(0, dark ? 'rgba(72,48,32,.32)' : 'rgba(196,158,116,.22)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 14000; i++) {
    const v = rand();
    g.fillStyle = v > 0.5 ? `rgba(45,30,20,${rand() * 0.35})` : `rgba(215,186,148,${rand() * 0.25})`;
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2.4, 1 + rand() * 2.4);
  }
  return tex(c, { srgb: true, repeat: [3, 3] });
}

export function radialGlowTexture(size = 128, inner = 'rgba(255,240,210,1)', outer = 'rgba(255,120,40,0)') {
  const c = makeCanvas(size), g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.6)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return tex(c, { srgb: true });
}

export function sparkTexture(size = 128) {
  const c = makeCanvas(size), g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,244,196,.95)');
  grd.addColorStop(0.45, 'rgba(255,168,64,.42)');
  grd.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, size / 2, 0, 7); g.fill();
  // star flare
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[size, 3], [3, size]]) {
    const lg = g.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
    lg.addColorStop(0, 'rgba(255,255,255,.9)');
    lg.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = lg;
    g.beginPath(); g.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); g.fill();
  }
  return tex(c, { srgb: true });
}
