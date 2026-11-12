import * as THREE from 'three';
import { clamp, lerp, EASE, smoothstep, mottleTexture, bumpTexture, weaveTexture } from './util.js';

/* ============================================================
   MUKKALAAT fighters
   A shared anatomical rig, built from sculpted primitives:
   deformed skull, layered muscles, knuckled hands, cloth pieces.
   ============================================================ */

let TX = null;
function tex() {
  if (TX) return TX;
  TX = {
    skin: mottleTexture(512, 21, { base: '#f4e7de', dark: '150,92,72', blobs: 100 }),
    skinBump: bumpTexture(256, 22),
    clothMap: mottleTexture(512, 31, { base: '#ffffff', dark: '80,60,50', blobs: 40 }),
    clothBump: weaveTexture(256, 32),
    hairBump: weaveTexture(256, 41)
  };
  return TX;
}

export const CHARACTERS = [
  {
    id: 'mukkal', name: 'MUKKAL', style: 'KUSHTI BRAWLER', tag: 'GALLI PEHELWAN',
    stats: { POWER: 8, SPEED: 6, DEFENSE: 8 },
    blurb: 'Aakhada champion. Bare knuckles, iron jaw, and a mustache that has seen things.',
    theme: ['#3c130e', '#c33a20'], mono: 'मु',
    palette: {
      skin: 0x9e6a49, skinShade: 0x7b4c33, lips: 0x8a4a3c, hair: 0x171210, hairHill: 0x2a211c,
      cloth: 0xb5212b, clothDark: 0x6e1119, trim: 0xe8c07a, gold: 0xd9a63c,
      wrap: 0xe6d8bd, leather: 0x3a2418, eye: 0x3d2416, aura: 0xff6a2a
    },
    build: { height: 1.83, shoulder: 1.06, chest: 1.06, waist: .96, hip: 1.0, muscle: 1.14, depth: .70, head: 1.0, female: false },
    gear: 'pehelwan', hair: 'crop', facial: 'mustache'
  },
  {
    id: 'chhaya', name: 'CHHAYA', style: 'KALARI BLADE', tag: 'SHADOW DANCER',
    stats: { POWER: 5, SPEED: 9, DEFENSE: 5 },
    blurb: 'Kalari fighter from the coast. Reads your shoulder before you know it moved.',
    theme: ['#0c2b2b', '#25b3a4'], mono: 'छा',
    palette: {
      skin: 0xb07a55, skinShade: 0x8a5a3e, lips: 0x9a4f44, hair: 0x120f12, hairHill: 0x251e26,
      cloth: 0x17575a, clothDark: 0x0d3438, trim: 0xd9b468, gold: 0xd2a849,
      wrap: 0xdcd1b9, leather: 0x2c2018, eye: 0x2a1a12, aura: 0x35e2cf
    },
    build: { height: 1.76, shoulder: .88, chest: .86, waist: .78, hip: 1.02, muscle: .9, depth: .64, head: .99, female: true },
    gear: 'kurta', hair: 'braid', facial: 'bindi'
  },
  {
    id: 'baaz', name: 'BAAZ', style: 'SHERWANI BRUISER', tag: 'THE LANDLORD',
    stats: { POWER: 10, SPEED: 4, DEFENSE: 9 },
    blurb: 'Collects rent in the old city. Hits like a falling balcony, twice as slow to leave.',
    theme: ['#241f2b', '#8d7cc2'], mono: 'बा',
    palette: {
      skin: 0x8a5b3e, skinShade: 0x6b422c, lips: 0x7c4034, hair: 0xbcb8b2, hairHill: 0xd8d4cc,
      cloth: 0x22202c, clothDark: 0x131219, trim: 0xc9a049, gold: 0xe0b04c,
      wrap: 0x2a2730, leather: 0x161218, eye: 0x241a12, aura: 0xa77bff
    },
    build: { height: 1.9, shoulder: 1.16, chest: 1.16, waist: 1.04, hip: .96, muscle: 1.24, depth: .74, head: 1.03, female: false },
    gear: 'sherwani', hair: 'slick', facial: 'beard'
  },
  {
    id: 'boss', name: 'BOSS', style: 'SUITED ENFORCER', tag: 'THE DON',
    stats: { POWER: 9, SPEED: 5, DEFENSE: 9 },
    blurb: 'Runs the bazaar and the akhada. Grey at the temples, red at the throat, no patience left.',
    theme: ['#2a0f14', '#d43a3a'], mono: 'बॉ',
    palette: {
      skin: 0x9a6a4c, skinShade: 0x7a4c34, lips: 0x86463a, hair: 0xb9b5ad, hairHill: 0xd6d2c8,
      cloth: 0x1b1a22, clothDark: 0x111016, trim: 0xd9d3c6, gold: 0xc9a24a,
      wrap: 0xd9d3c6, leather: 0x141218, eye: 0x2c1c13, aura: 0xff3b2a,
      shirt: 0xe4ded2, tie: 0x8f1520
    },
    build: { height: 1.87, shoulder: 1.04, chest: 1.02, waist: 1.0, hip: .98, muscle: 1.0, depth: .72, head: 1.02, female: false },
    gear: 'suit', hair: 'slick', facial: 'mustache', age: 'senior'
  },
  {
    id: 'daya', name: 'DAYA', style: 'CID BRAWLER', tag: 'SUB-INSPECTOR',
    stats: { POWER: 7, SPEED: 6, DEFENSE: 8 },
    blurb: 'CID officer who never files the paperwork. Brown shirt, iron grip, and a watch that stopped years ago.',
    theme: ['#20170f', '#c58a4a'], mono: 'द',
    palette: {
      skin: 0xa9744f, skinShade: 0x855536, lips: 0x8e4a3c, hair: 0x1a1411, hairHill: 0x2f261f,
      cloth: 0x6b4a33, clothDark: 0x1d2027, trim: 0xcfb08a, gold: 0xd8b25c,
      wrap: 0xcfc3ab, leather: 0x131218, eye: 0x2a1a12, aura: 0xffa63a,
      shirt: 0x6b4a33, tie: 0x2a2118
    },
    build: { height: 1.81, shoulder: 1.04, chest: .98, waist: .96, hip: 1.0, muscle: 1.04, depth: .71, head: 1.0, female: false },
    gear: 'shirt', hair: 'wavy', facial: 'stubble'
  }
];

const V3 = THREE.Vector3;
const HIP_Y = 0.99, L1 = 0.45, L2 = 0.43, ANKLE_Y = 0.08;

function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.order = 'YXZ';
  parent.add(g);
  return g;
}
function put(geo, mat, parent, pos, rot, scl, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scl) m.scale.set(scl[0], scl[1], scl[2]);
  m.castShadow = cast;
  parent.add(m);
  return m;
}
const sph = (r, s = 20) => new THREE.SphereGeometry(r, s, Math.max(8, Math.round(s * .72)));
const cap = (r, len, s = 14) => new THREE.CapsuleGeometry(r, len, 5, s);
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
function tube(points, radius, mat, parent, seg = 22, rad = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new V3(p[0], p[1], p[2])));
  return put(new THREE.TubeGeometry(curve, seg, radius, rad, false), mat, parent);
}

/* ---------------- materials ---------------- */
function makeMaterials(P) {
  const T = tex();
  const skin = new THREE.MeshPhysicalMaterial({
    color: P.skin, map: T.skin, roughness: .64, metalness: 0,
    clearcoat: .1, clearcoatRoughness: .7,
    bumpMap: T.skinBump, bumpScale: .0016, envMapIntensity: .5
  });
  const skinDark = new THREE.MeshStandardMaterial({ color: P.skinShade, roughness: .62, envMapIntensity: .5 });
  const lips = new THREE.MeshStandardMaterial({ color: P.lips, roughness: .42, envMapIntensity: .6 });
  const cloth = new THREE.MeshStandardMaterial({
    color: P.cloth, map: T.clothMap, roughness: .86, bumpMap: T.clothBump, bumpScale: .003, envMapIntensity: .4
  });
  const cloth2 = new THREE.MeshStandardMaterial({
    color: P.clothDark, map: T.clothMap, roughness: .9, bumpMap: T.clothBump, bumpScale: .003, envMapIntensity: .3
  });
  const trim = new THREE.MeshStandardMaterial({ color: P.trim, roughness: .52, metalness: .12, envMapIntensity: .55 });
  const gold = new THREE.MeshStandardMaterial({ color: P.gold, roughness: .24, metalness: .95, envMapIntensity: 1.25 });
  const wrap = new THREE.MeshStandardMaterial({ color: P.wrap, roughness: .92, bumpMap: T.clothBump, bumpScale: .003, envMapIntensity: .3 });
  const leather = new THREE.MeshStandardMaterial({ color: P.leather, roughness: .55, metalness: .1, envMapIntensity: .6 });
  const shirt = new THREE.MeshStandardMaterial({
    color: P.shirt ?? 0xe6e0d4, map: T.clothMap, roughness: .82,
    bumpMap: T.clothBump, bumpScale: .0022, envMapIntensity: .38
  });
  const tie = new THREE.MeshStandardMaterial({
    color: P.tie ?? 0x8f1520, map: T.clothMap, roughness: .5, metalness: .05, envMapIntensity: .55
  });
  const hair = new THREE.MeshStandardMaterial({ color: P.hair, roughness: .68, bumpMap: T.hairBump, bumpScale: .004, envMapIntensity: .4 });
  const hairLite = new THREE.MeshStandardMaterial({ color: P.hairHill, roughness: .72, envMapIntensity: .3 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe9e2d8, roughness: .16, envMapIntensity: 1.1 });
  const iris = new THREE.MeshStandardMaterial({ color: P.eye, roughness: .2, envMapIntensity: 1.1 });
  const black = new THREE.MeshBasicMaterial({ color: 0x09070b });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const flash = [skin, skinDark, cloth, cloth2, wrap, hair, trim, shirt, tie];
  flash.forEach(m => { m.emissive = new THREE.Color(0xff3c18); m.emissiveIntensity = 0; });
  return { skin, skinDark, lips, cloth, cloth2, trim, gold, wrap, leather, hair, hairLite, eyeWhite, iris, black, glow, shirt, tie, flash };
}

/* ---------------- sculpted head ---------------- */
function buildHead(head, def, M, B) {
  const face = grp(head, 0, 0.115, 0);
  const H = B.head;
  const skullGeo = new THREE.SphereGeometry(1, 56, 44);
  const pos = skullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = clamp((0.12 - y) / 1.12, 0, 1);
    // jaw taper + cheekbones
    let jaw = 1 - 0.34 * Math.pow(t, 1.32);
    jaw += 0.05 * Math.exp(-Math.pow((y + 0.18) / 0.26, 2));
    let X = x * jaw;
    let Z = z;
    if (z > 0) {
      Z = z * (0.97 - 0.13 * t);
      if (y < -0.28) Z += 0.20 * (1 - Math.abs(x) * .85) * Math.pow(clamp((-y - 0.28) / 0.66, 0, 1), 1.35);
      // brow ridge
      Z += 0.055 * Math.exp(-Math.pow((y - 0.24) / 0.12, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.4) / 0.42, 2));
      // eye socket recess
      Z -= 0.028 * Math.exp(-Math.pow((Math.abs(x) - 0.38) / 0.22, 2)) * Math.exp(-Math.pow((y - 0.10) / 0.15, 2));
      // temple hollow
      Z -= 0.018 * Math.exp(-Math.pow((Math.abs(x) - 0.62) / 0.2, 2)) * Math.exp(-Math.pow((y - 0.22) / 0.2, 2));
    } else {
      Z *= 1.045;
    }
    // temples narrower at the top
    X *= 1 - 0.05 * Math.max(0, y - 0.25);
    pos.setXYZ(i, X * 0.0975 * H, y * 0.124 * H, Z * 0.103 * H);
  }
  skullGeo.computeVertexNormals();
  const skull = put(skullGeo, M.skin, face);
  skull.castShadow = true;
  // skull seam shading at the back
  const occiput = put(sph(.082, 18), M.skin, face, [0, -.01, -.045], [0, 0, 0], [1, 1.05, .9]);

  // cheekbones & jaw corners
  for (const s of [-1, 1]) {
    put(sph(.03, 14), M.skin, face, [s * .055, -.005, .062], [0, 0, 0], [.95, .75, .55]);
    put(sph(.032, 14), M.skin, face, [s * .052, -.06, .045], [0, 0, 0], [.9, .95, .7]);
  }
  // chin
  put(sph(.03, 16), M.skin, face, [0, -.105, .062], [0, 0, 0], [1.1, .8, .75]);

  /* eyes */
  const eyeY = .012, eyeX = .038, eyeZ = .079;
  for (const s of [-1, 1]) {
    const eye = grp(face, s * eyeX, eyeY, eyeZ);
    eye.rotation.y = s * -0.16;
    put(sph(.0182, 20), M.eyeWhite, eye, [0, 0, 0], [0, 0, 0], [1, .9, .82], false);
    put(new THREE.CircleGeometry(.0096, 22), M.iris, eye, [0, 0, .0152], [0, 0, 0], null, false);
    put(new THREE.CircleGeometry(.0046, 18), M.black, eye, [0, 0, .0158], [0, 0, 0], null, false);
    // wet catchlight + limbal ring
    put(sph(.0022, 8), M.glow, eye, [-s * .0035, .0035, .0172], [0, 0, 0], null, false);
    put(new THREE.TorusGeometry(.0086, .0011, 4, 20), M.black, eye, [0, 0, .0156], [0, 0, 0], [1, 1, 1], false);
    // upper/lower lids
    put(new THREE.TorusGeometry(.0192, .0034, 6, 16, Math.PI), M.skinDark, eye, [0, .0005, .001], [0, 0, .04], [1, .8, 1], false);
    put(new THREE.TorusGeometry(.0186, .0022, 6, 16, Math.PI), M.skinDark, eye, [0, 0, .001], [0, 0, Math.PI], [1, .8, 1], false);
    // eyebrows
    tube([
      [s * .012, .052, .086], [s * .032, .058, .089], [s * .055, .054, .082], [s * .07, .045, .068]
    ], .0055, M.hair, face, 14, 5);
    // eyelash edge
    put(new THREE.TorusGeometry(.0198, .0016, 5, 14, Math.PI), M.hair, eye, [0, .001, .002], [0, 0, .04], [1, .8, 1], false);
    // ear
    const ear = grp(face, s * .097, -.002, .004);
    ear.rotation.set(0, s * .28, s * .12);
    put(sph(.021, 14), M.skin, ear, [0, 0, 0], [0, 0, 0], [.42, 1.25, .85]);
    put(new THREE.TorusGeometry(.017, .0055, 6, 14, Math.PI * 1.4), M.skinDark, ear, [0, 0, .008], [0, s * 1.2, 0], [1, 1.1, 1]);
    put(sph(.008, 10), M.skinDark, ear, [0, -.004, .006], [0, 0, 0], [.5, .7, .4]);
    // sideburn / temple hair
    put(sph(.02, 12), M.hair, face, [s * .088, .03, .02], [0, 0, 0], [.5, 1.3, .8], false);
  }

  /* nose */
  put(sph(.016, 18), M.skin, face, [0, .03, .086], [0.32, 0, 0], [.62, 1.5, .78]);
  put(sph(.0175, 18), M.skin, face, [0, -.012, .099], [0, 0, 0], [1, .78, .9]);
  for (const s of [-1, 1]) {
    put(sph(.0125, 14), M.skin, face, [s * .0165, -.019, .088], [0, 0, 0], [1, .7, .85]);
    put(sph(.0055, 10), M.skinDark, face, [s * .0115, -.028, .094], [0, 0, 0], [1.1, .6, .5], false);
  }
  put(sph(.009, 10), M.skinDark, face, [0, -.024, .099], [0, 0, 0], [1.4, .5, .5], false);

  /* nose bridge, philtrum, folds — the small planes that make a face read */
  tube([[0, .072, .073], [0, .042, .085], [0, .018, .092]], .0105, M.skin, face, 10, 6);
  for (const s of [-1, 1]) {
    put(sph(.0038, 8), M.skin, face, [s * .0065, -.041, .094], [0, 0, 0], [.8, 1.5, .5], false);
    tube([[s * .024, -.026, .085], [s * .033, -.043, .083], [s * .029, -.058, .083]], .0031, M.skinDark, face, 8, 4);
    put(sph(.0105, 10), M.skin, face, [s * .038, -.013, .077], [0, 0, 0], [1.15, .45, .45], false);
  }
  if (def.age === 'senior') {
    for (let i = 0; i < 2; i++) {
      tube([[-.045, .072 - i * .014, .082], [0, .078 - i * .014, .094], [.045, .072 - i * .014, .082]], .0021, M.skinDark, face, 10, 4);
    }
    for (const s of [-1, 1]) {
      tube([[s * .058, .022, .081], [s * .063, .03, .075], [s * .061, .038, .069]], .0017, M.skinDark, face, 6, 4);
      tube([[s * .05, -.012, .082], [s * .059, -.02, .074], [s * .059, -.03, .069]], .0017, M.skinDark, face, 6, 4);
      put(sph(.016, 12), M.skin, face, [s * .043, .05, .078], [0, 0, 0], [1.5, .45, .55], false);
    }
  }

  /* mouth */
  const mouthY = -.062;
  put(sph(.016, 16), M.lips, face, [0, mouthY + .008, .089], [0, 0, 0], [1.25, .42, .55]);
  put(sph(.018, 16), M.lips, face, [0, mouthY - .004, .088], [0, 0, 0], [1.1, .5, .55]);
  put(new THREE.BoxGeometry(.035, .0026, .004), M.skinDark, face, [0, mouthY + .002, .095], [0, 0, 0], null, false);
  for (const s of [-1, 1]) {
    put(sph(.006, 8), M.skinDark, face, [s * .026, mouthY + .004, .086], [0, 0, 0], [1, .6, .5], false);
  }

  /* facial hair */
  if (def.facial === 'mustache') {
    for (const s of [-1, 1]) {
      tube([
        [0, mouthY + .024, .097], [s * .022, mouthY + .026, .097], [s * .04, mouthY + .02, .09], [s * .05, mouthY + .002, .078]
      ], .0072, M.hair, face, 16, 6);
      put(sph(.009, 10), M.hair, face, [s * .05, mouthY + .001, .078], [0, 0, 0], [1, .8, .9], false);
    }
    put(sph(.013, 12), M.hair, face, [0, mouthY + .026, .092], [0, 0, 0], [1.7, .7, .7], false);
    // stubble shadow on the jaw
    for (let i = 0; i < 10; i++) {
      const a = -1 + i * .22;
      put(sph(.011, 8), M.hair, face, [Math.sin(a) * .065, -.09 - Math.cos(a) * .012, .045 + Math.cos(a) * .025], [0, 0, 0], [1, .7, .6], false);
    }
  } else if (def.facial === 'beard') {
    const beardGeo = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.34);
    const p2 = beardGeo.attributes.position;
    for (let i = 0; i < p2.count; i++) {
      let x = p2.getX(i), y = p2.getY(i), z = p2.getZ(i);
      const t = clamp((0.12 - y) / 1.1, 0, 1);
      x *= 1 - 0.3 * Math.pow(t, 1.3);
      p2.setXYZ(i, x * 0.098 * H, y * 0.126 * H, z * 0.106 * H);
    }
    beardGeo.computeVertexNormals();
    const beard = put(beardGeo, M.hair, face, [0, .004, 0], null, null, false);
    // trim the moustache gap is impossible per-vertex here, so overlay lips area
    put(sph(.024, 14), M.lips, face, [0, mouthY + .006, .096], [0, 0, 0], [1.4, .55, .5], false);
    tube([
      [0, mouthY + .024, .097], [.026, mouthY + .024, .096], [.044, mouthY + .012, .086]
    ], .008, M.hair, face, 12, 5);
    tube([
      [0, mouthY + .024, .097], [-.026, mouthY + .024, .096], [-.044, mouthY + .012, .086]
    ], .008, M.hair, face, 12, 5);
  } else if (def.facial === 'stubble') {
    for (let i = 0; i < 12; i++) {
      const a = -1.15 + i * .21;
      put(sph(.010, 8), M.hair, face, [Math.sin(a) * .062, -.088 - Math.cos(a) * .012, .048 + Math.cos(a) * .022], [0, 0, 0], [1, .62, .45], false);
    }
    for (const s of [-1, 1]) put(sph(.0115, 8), M.hair, face, [s * .026, -.048, .088], [0, 0, 0], [1.15, .4, .35], false);
  } else if (def.facial === 'bindi') {
    put(sph(.0045, 10), new THREE.MeshStandardMaterial({ color: 0xa8232a, roughness: .4 }), face, [0, .048, .093], [0, 0, 0], [1, 1.1, .4], false);
    put(sph(.0022, 8), M.gold, face, [0, .062, .087], [0, 0, 0], null, false);
  }
  return face;
}
function s1(v) { return v; }

/* ---------------- hair ---------------- */
function buildHair(height, style, head, face, M, def) {
  const H = def.build.head;
  const g = grp(head, 0, .115, 0);
  if (style === 'crop') {
    put(new THREE.SphereGeometry(.1005, 40, 26, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair, g, [0, .012, -.004], [0, 0, 0], [1.02 * H, .94, 1.03], false);
    // short fringe + messy crown
    for (let i = 0; i < 9; i++) {
      const a = -1.5 + i * .37;
      const r = .085;
      put(sph(.021, 10), M.hair, g, [Math.sin(a) * r, .085 - Math.abs(a) * .012, Math.cos(a) * r * .92], [a * .3, a, 0], [1.3, .7, 1.1], false);
    }
    put(sph(.075, 18), M.hair, g, [0, .095, -.03], [0, 0, 0], [1.05, .45, 1.0], false);
  } else if (style === 'braid') {
    put(new THREE.SphereGeometry(.1015, 40, 26, 0, Math.PI * 2, 0, Math.PI * 0.62), M.hair, g, [0, .008, -.008], [.1, 0, 0], [1.04 * H, 1.0, 1.06], false);
    put(sph(.062, 20), M.hair, g, [0, -.02, -.085], [0, 0, 0], [1.0, .9, .8], false); // gathered back
    // centre part
    put(new THREE.BoxGeometry(.004, .07, .01), M.skinDark, g, [0, .07, .078], [.35, 0, 0], null, false);
    // framing strands
    for (const s of [-1, 1]) {
      tube([[s * .078, .055, .055], [s * .092, .005, .048], [s * .09, -.05, .03]], .011, M.hair, g, 12, 5);
    }
    // braid down the back
    const braid = grp(g, 0, -.05, -.095);
    braid.rotation.x = .28;
    let y = 0;
    for (let i = 0; i < 9; i++) {
      const r = .036 - i * .0024;
      put(sph(r, 12), M.hair, braid, [Math.sin(i * 1.1) * .008, y, Math.sin(i * .8) * .006], [0, i * .4, 0], [1, 1.25, 1], false);
      y -= r * 1.7;
    }
    put(sph(.012, 8), M.gold, braid, [0, y - .01, 0], [0, 0, 0], [1, 1.4, 1], false);
    // loose hairs
    tube([[.03, .085, .05], [.05, .04, .07], [.035, -.02, .075]], .006, M.hair, g, 10, 4);
    return { braid };
  } else if (style === 'wavy') {
    put(new THREE.SphereGeometry(.1015, 40, 26, 0, Math.PI * 2, 0, Math.PI * .58), M.hair, g, [0, .012, -.006], [0, 0, 0], [1.04 * H, 1.0, 1.06], false);
    for (let i = 0; i < 8; i++) {
      const a = -1.7 + i * .48;
      put(sph(.026, 12), M.hair, g, [Math.sin(a) * .062, .098 - Math.abs(a) * .012, Math.cos(a) * .062], [0, a * .5, a * .3], [1.25, .85, 1.05], false);
    }
    for (let i = 0; i < 5; i++) {
      tube([[.006 + i * .011, .098, .052], [.03 + i * .01, .078, .08], [.058 + i * .006, .052, .07]], .011, M.hair, g, 10, 5);
    }
    for (const s of [-1, 1]) put(sph(.017, 10), M.hair, g, [s * .089, .02, .035], [0, 0, 0], [.5, 1.25, .8], false);
    return {};
  } else {
    // slicked back silver
    put(new THREE.SphereGeometry(.099, 40, 26, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, g, [0, .022, -.016], [0, 0, 0], [1.02 * H, 1.02, 1.04], false);
    for (let i = 0; i < 7; i++) {
      const x = -.06 + i * .02;
      tube([[x, .1, .055], [x * 1.1, .105, .0], [x * 1.15, .075, -.065], [x * 1.2, .03, -.088]], .008, M.hairLite, g, 14, 5);
    }
    // beard jaw strip
    for (const s of [-1, 1]) {
      tube([[s * .085, .02, .01], [s * .085, -.03, .035], [s * .065, -.08, .055], [s * .03, -.105, .075]], .014, M.hair, g, 14, 5);
    }
    put(sph(.036, 14), M.hair, g, [0, -.115, .062], [0, 0, 0], [1.2, .85, .8], false);
  }
  return {};
}

/* ---------------- hands ---------------- */
function buildHand(wrist, side, M) {
  const hand = grp(wrist, 0, 0, 0);
  const palm = put(sph(.044, 20), M.skin, hand, [0, -.055, .004], [0, 0, 0], [.86, 1.18, .5]);
  put(sph(.04, 16), M.skin, hand, [0, -.02, 0], [0, 0, 0], [.82, .7, .6]);
  const fingers = [];
  const xs = [-.026, -.009, .008, .025];
  const lens = [.031, .034, .032, .026];
  for (let i = 0; i < 4; i++) {
    const j1 = grp(hand, xs[i], -.092, .004);
    const r = .0088 - i * .0006;
    put(cap(r, lens[i] * .72, 8), M.skin, j1, [0, -lens[i] * .38, 0], null, null, false);
    const j2 = grp(j1, 0, -lens[i] * .78, 0);
    put(cap(r * .93, lens[i] * .62, 8), M.skin, j2, [0, -lens[i] * .34, 0], null, null, false);
    const j3 = grp(j2, 0, -lens[i] * .7, 0);
    put(cap(r * .82, lens[i] * .5, 8), M.skin, j3, [0, -lens[i] * .26, 0], null, null, false);
    put(sph(r * .78, 8), M.skin, j3, [0, -lens[i] * .55, 0], null, null, false);
    fingers.push({ j1, j2, j3 });
  }
  const thumb = grp(hand, side * .038, -.045, .018);
  thumb.rotation.set(-.5, 0, side * -.85);
  put(cap(.0105, .032, 8), M.skin, thumb, [0, -.026, 0], null, null, false);
  const thumb2 = grp(thumb, 0, -.052, 0);
  put(cap(.0095, .026, 8), M.skin, thumb2, [0, -.02, 0], null, null, false);

  function setGrip(v) {
    const c = lerp(0.1, 1.35, clamp(v, 0, 1));
    fingers.forEach((f, i) => {
      f.j1.rotation.x = -c * (1 + (i === 3 ? .08 : 0));
      f.j2.rotation.x = -c * 1.18;
      f.j3.rotation.x = -c * .76;
    });
    thumb.rotation.z = side * lerp(-.85, -.38, clamp(v, 0, 1));
    thumb.rotation.x = lerp(-.5, -1.05, clamp(v, 0, 1));
    thumb2.rotation.x = lerp(0, -.8, clamp(v, 0, 1));
  }
  setGrip(.8);
  return { hand, setGrip };
}

/* ---------------- pose model ---------------- */
const NEUTRAL = {
  bodyRot: [0, 0, 0], drive: 0, hy: 0, lift: 0, air: 0,
  hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0],
  shL: [0, 0, .14], elL: -.1, wrL: [0, 0, 0], gripL: .85,
  shR: [0, 0, -.14], elR: -.1, wrR: [0, 0, 0], gripR: .85,
  hipL: [0, 0, .04], knL: .06, anL: 0, flatL: 1,
  hipR: [0, 0, -.04], knR: .06, anR: 0, flatR: 1
};
const POSE_KEYS = Object.keys(NEUTRAL);

export function P(base, over) {
  const out = {};
  for (const k of POSE_KEYS) {
    const v = base[k];
    out[k] = Array.isArray(v) ? v.slice() : v;
  }
  if (over) for (const k in over) {
    const v = over[k];
    out[k] = Array.isArray(v) ? v.slice() : v;
  }
  return out;
}

export function blendPose(a, b, t) {
  const o = {};
  for (const k of POSE_KEYS) {
    const x = a[k], y = b[k];
    if (Array.isArray(x)) o[k] = [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
    else o[k] = x + (y - x) * t;
  }
  return o;
}

function keyed(base, keys) {
  const full = keys.map(([t, over, e]) => [t, P(base, over), e || 'io']);
  return t => {
    if (t <= full[0][0]) return full[0][1];
    for (let i = 0; i < full.length - 1; i++) {
      const a = full[i], b = full[i + 1];
      if (t < b[0]) {
        const w = (t - a[0]) / (b[0] - a[0]);
        return blendPose(a[1], b[1], (EASE[b[2]] || EASE.io)(clamp(w, 0, 1)));
      }
    }
    return full[full.length - 1][1];
  };
}

export const STANCE = P(NEUTRAL, {
  hy: -.04,
  hips: [.03, -.38, .02],
  spine: [.05, -.10, 0],
  chest: [.05, -.16, 0],
  head: [-.04, .60, .02],
  shL: [-.85, .05, .42], elL: -2.05, gripL: 1,
  shR: [-.55, -.10, -.40], elR: -2.35, gripR: 1,
  hipL: [-.30, .18, .12], knL: .45, anL: 0, flatL: 1,
  hipR: [.14, -.22, -.12], knR: .32, anR: 0, flatR: 1
});

const GUARD = P(STANCE, {
  hy: -.055, spine: [.08, -.10, 0], chest: [.07, -.16, 0], head: [-.06, .60, 0],
  shL: [-1.02, .10, .34], elL: -2.25, shR: [-.86, -.08, -.32], elR: -2.5,
  hipL: [-.32, .18, .12], knL: .52, hipR: [.14, -.22, -.12], knR: .42
});

const TUCK = P(STANCE, {
  bodyRot: [0, 0, 0], air: 1, hy: .02,
  spine: [.12, -.1, 0], chest: [.08, -.16, 0],
  shL: [-1.1, .1, .45], elL: -1.7, shR: [-1.0, -.1, -.45], elR: -1.9,
  hipL: [-.95, .2, .12], knL: 1.6, anL: .5, flatL: 0,
  hipR: [-.55, -.2, -.12], knR: 1.9, anR: .4, flatR: 0
});

/* ---------------- animation clips ---------------- */
export const CLIPS = {
  idle: t => {
    const b = Math.sin(t * Math.PI * 2);
    const q = P(STANCE, {
      spine: [.05 + b * .012, -.10, 0],
      chest: [.05 + b * .01, -.16, 0],
      head: [-.04 - b * .008, .60 + b * .03, .02],
      hy: -.04 + b * .006,
      shL: [-.85 + b * .02, .05, .42], shR: [-.55 - b * .02, -.10, -.40]
    });
    return q;
  },
  intro: keyed(STANCE, [
    [0, { shL: [-.2, .1, .3], elL: -.4, shR: [-.2, -.1, -.3], elR: -.4, head: [.05, .5, 0] }],
    [.55, { shL: [-1.2, .1, .45], elL: -2.3, shR: [-1.1, -.1, -.45], elR: -2.5, head: [-.08, .62, 0], hy: -.09 }],
    [1, STANCE]
  ]),
  walkF: t => {
    const ph = t * Math.PI * 2, s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    return P(STANCE, {
      hy: -.045 + Math.abs(Math.cos(ph)) * .008,
      hipL: [-.30 - .42 * s, .18, .12], knL: .45 + .55 * Math.max(0, -s),
      hipR: [.14 - .42 * s2, -.22, -.12], knR: .32 + .55 * Math.max(0, -s2),
      shL: [-.85 + s2 * .07, .05, .42], shR: [-.55 - s2 * .06, -.10, -.40],
      chest: [.05, -.16 + s * .05, 0], head: [-.04, .60 - s * .05, .02]
    });
  },
  walkB: t => {
    const ph = t * Math.PI * 2, s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    return P(STANCE, {
      hy: -.055 + Math.abs(Math.cos(ph)) * .008,
      hipL: [-.22 - .34 * s, .2, .12], knL: .55 + .5 * Math.max(0, -s),
      hipR: [.2 - .34 * s2, -.2, -.12], knR: .42 + .5 * Math.max(0, -s2),
      shL: [-.95, .05, .44], shR: [-.7, -.10, -.42],
      chest: [.07, -.13, 0], head: [-.03, .58, 0]
    });
  },
  jump: () => P(TUCK, { hy: .02, lift: 0 }),
  jumpFall: () => P(TUCK, {
    spine: [.18, -.1, 0], chest: [.12, -.16, 0], head: [-.1, .6, 0],
    hipL: [-.62, .2, .15], knL: 1.15, hipR: [-.3, -.2, -.15], knR: .95,
    shL: [-.9, .1, .55], elL: -1.5, shR: [-.85, -.1, -.55], elR: -1.6
  }),
  crouch: t => {
    const b = Math.sin(t * Math.PI * 2) * .004;
    return P(STANCE, {
      hy: -.29 + b,
      hips: [.16, -.34, .02], spine: [.3, -.1, 0], chest: [.22, -.16, 0], head: [-.28, .6, 0],
      shL: [-1.05, .12, .32], elL: -2.3, shR: [-.95, -.08, -.3], elR: -2.55,
      hipL: [-.85, .2, .14], knL: 1.55, anL: 0, flatL: 1,
      hipR: [-.12, -.24, -.12], knR: 1.4, anR: 0, flatR: 1
    });
  },
  block: t => P(GUARD, {
    spine: [-.04, -.10, 0], chest: [-.02, -.16, 0], head: [-.14, .60, 0],
    shL: [-1.12, .18, .22], elL: -2.55, shR: [-1.02, -.16, -.2], elR: -2.6,
    hy: -.075, hipL: [-.34, .2, .13], knL: .62, hipR: [.18, -.24, -.13], knR: .54
  }),
  blockstun: keyed(GUARD, [
    [0, {}],
    [.4, { spine: [-.16, -.1, 0], head: [-.3, .58, 0], drive: -.05, shL: [-1.25, .22, .3], shR: [-1.15, -.2, -.28] }],
    [1, {}]
  ]),
  jab: keyed(GUARD, [
    [0, {}],
    [.22, { spine: [.1, -.16, 0], chest: [.08, -.2, 0], shL: [-1.0, .0, .34], elL: -2.4, head: [-.05, .7, 0] }],
    [.36, {
      spine: [.12, -.02, 0], chest: [.1, .02, 0], hips: [.03, -.46, .02],
      shL: [-1.52, -.18, .06], elL: -.10, wrL: [0, 0, -.15], head: [-.06, .64, 0], drive: .055
    }, 'snap'],
    [.52, { shL: [-1.5, -.16, .08], elL: -.12, drive: .05 }],
    [.74, {}],
    [1, {}]
  ]),
  cross: keyed(GUARD, [
    [0, {}],
    [.2, {
      hips: [.03, -.24, .02], spine: [.09, -.02, 0], chest: [.08, .02, 0],
      shR: [-.9, -.16, -.3], elR: -2.5, head: [-.05, .4, 0]
    }],
    [.38, {
      hips: [.02, .14, .02], spine: [.1, .06, 0], chest: [.08, .1, 0],
      shR: [-1.5, .26, -.02], elR: -.12, wrR: [0, 0, .18], head: [-.05, -.1, 0],
      hipL: [-.36, .2, .12], knL: .5, hipR: [.1, -.24, -.12], knR: .4, drive: .08
    }, 'snap'],
    [.55, { head: [-.05, -.06, 0], drive: .07 }],
    [.8, {}],
    [1, {}]
  ]),
  uppercut: keyed(GUARD, [
    [0, {}],
    [.22, {
      hy: -.16, hips: [.08, -.3, .02], spine: [.26, -.16, 0], chest: [.2, -.2, 0],
      shR: [-.2, -.2, -.3], elR: -2.2, head: [-.18, .5, 0]
    }],
    [.42, {
      hy: .045, hips: [-.12, .12, .02], spine: [-.12, .04, 0], chest: [-.16, .08, 0],
      shR: [-2.35, .2, -.12], elR: -.55, gripR: 1, head: [.08, -.02, 0], drive: .06, lift: .04
    }, 'snap'],
    [.58, { hy: .02, shR: [-2.2, .2, -.14], elR: -.7, drive: .04 }],
    [.82, {}],
    [1, {}]
  ]),
  kick: keyed(GUARD, [
    [0, {}],
    [.2, {
      hy: -.05, hips: [.06, -.1, .02], spine: [.02, .1, 0],
      hipR: [-.85, -.2, -.2], knR: 1.75, anR: .45, flatR: 0,
      shL: [-.8, .2, .5], shR: [-.2, -.1, -.5], elR: -1.2, head: [-.02, .58, 0]
    }],
    [.4, {
      hy: -.02, hips: [-.02, .28, .02], spine: [-.28, .24, 0], chest: [-.2, .26, 0],
      hipR: [-1.72, -.34, -.1], knR: .18, anR: .35, flatR: 0,
      shL: [-.4, .2, .9], elL: -1.3, shR: [.35, -.2, -.75], elR: -.9,
      head: [.16, .1, 0], lift: .06, drive: .04
    }, 'snap'],
    [.56, { hipR: [-1.6, -.32, -.1], knR: .3, spine: [-.24, .22, 0], lift: .05 }],
    [.78, {}],
    [1, {}]
  ]),
  sweep: keyed(GUARD, [
    [0, {}],
    [.25, {
      hy: -.3, hips: [.24, -.34, .02], spine: [.4, -.14, 0], chest: [.28, -.16, 0],
      head: [-.4, .56, 0], shL: [-.9, .1, .7], elL: -1.3, shR: [-.2, -.1, -.6], elR: -1.1,
      hipL: [-.9, .2, .16], knL: 1.6, hipR: [-.5, -.26, -.14], knR: 1.3
    }],
    [.45, {
      hy: -.36, hips: [.3, -.38, .02], spine: [.52, -.12, 0], chest: [.36, -.16, 0],
      head: [-.5, .54, 0],
      hipR: [-1.28, -.42, -.16], knR: .16, anR: .35, flatR: 0,
      hipL: [-1.0, .2, .16], knL: 1.8, anL: 0, flatL: 1,
      shL: [-1.1, .2, .8], elL: -1.0, shR: [.2, -.1, -.7], elR: -.8, drive: .05
    }, 'snap'],
    [.66, { hipR: [-1.2, -.42, -.16], knR: .25 }],
    [.86, {}],
    [1, {}]
  ]),
  airkick: keyed(TUCK, [
    [0, {}],
    [.3, {
      spine: [-.15, -.1, 0], chest: [-.1, -.16, 0],
      hipR: [-1.5, -.3, -.15], knR: .18, anR: .3, flatR: 0,
      hipL: [-.2, .2, .15], knL: 1.9, flatL: 0,
      shL: [-.3, .2, .9], elL: -1.2, shR: [.2, -.2, -.8], elR: -1.0, head: [.1, .6, 0]
    }, 'snap'],
    [.7, { hipR: [-1.55, -.3, -.15], knR: .12, hipL: [-.35, .2, .15], knL: 1.7 }],
    [1, {}]
  ]),
  grab: keyed(GUARD, [
    [0, {}],
    [.28, {
      shL: [-1.35, -.3, .25], elL: -.5, gripL: 0, shR: [-1.35, .3, -.25], elR: -.5, gripR: 0,
      hy: -.02, drive: .12, spine: [.14, -.08, 0], head: [-.1, .62, 0]
    }, 'snap'],
    [.48, { gripL: 1, gripR: 1, shL: [-1.25, -.2, .18], elL: -1.2, shR: [-1.25, .2, -.16], elR: -1.2, drive: .1 }],
    [.7, {
      hy: .07, hips: [-.2, -.1, 0], spine: [-.2, -.08, 0], chest: [-.22, -.12, 0],
      shL: [-2.5, -.2, .3], elL: -.4, shR: [-2.5, .2, -.28], elR: -.4,
      head: [.05, .6, 0], lift: .07, drive: .02
    }, 'snap'],
    [.84, { hy: -.1, hips: [.2, -.1, 0], spine: [.3, -.08, 0], drive: .08 }],
    [1, {}]
  ]),
  super: keyed(GUARD, [
    [0, {}],
    [.1, {
      hy: -.18, hips: [.1, -.3, 0], spine: [.24, -.1, 0], chest: [.2, -.14, 0],
      shL: [.4, .2, .5], elL: -2.2, shR: [.4, -.2, -.5], elR: -2.2, head: [-.15, .6, 0]
    }],
    [.22, {
      hy: .02, spine: [-.15, 0, 0], chest: [-.2, 0, 0], head: [.15, 0, 0],
      shL: [-.2, 0, 1.35], elL: -.35, shR: [-.2, 0, -1.35], elR: -.35, lift: .03
    }, 'snap'],
    [.34, { shL: [-.2, 0, 1.5], shR: [-.2, 0, -1.5], hy: 0 }],
    [.44, { ...GUARD, drive: .03 }],
    [.5, {
      shL: [-1.55, -.2, .05], elL: -.1, hips: [.02, -.5, .02], chest: [.1, .0, 0], head: [-.05, .66, 0], drive: .06
    }, 'snap'],
    [.56, {
      shR: [-1.55, .22, -.02], elR: -.1, hips: [.02, .18, .02], chest: [.1, .12, 0], head: [-.05, -.14, 0],
      shL: [-.9, .1, .4], elL: -1.8, drive: .06
    }, 'snap'],
    [.64, {
      hy: .05, hips: [-.1, .1, 0], spine: [-.1, 0, 0], chest: [-.14, .06, 0],
      shR: [-2.3, .2, -.1], elR: -.5, shL: [-.8, .1, .4], elL: -2.1, head: [.1, 0, 0], lift: .04, drive: .02
    }, 'snap'],
    [.76, {
      hy: -.02, hips: [.02, -.2, 0], spine: [.06, -.08, 0], chest: [.05, -.1, 0],
      shL: [-1.6, .15, .12], elL: -.1, gripL: 0, shR: [-1.6, -.15, -.1], elR: -.1, gripR: 0, head: [-.02, .3, 0], drive: .05
    }, 'snap'],
    [.88, { shL: [-1.55, .15, .12], shR: [-1.55, -.15, -.1], gripL: .4, gripR: .4 }],
    [1, {}]
  ]),
  hurtHigh: keyed(STANCE, [
    [0, {}],
    [.18, {
      spine: [-.34, .18, .04], chest: [-.3, .2, .06], head: [-.5, .34, -.12],
      shL: [-.3, .2, .8], elL: -.8, shR: [-.1, -.2, -.8], elR: -.7, drive: -.06
    }, 'snap'],
    [.6, { spine: [-.2, .12, 0], head: [-.3, .45, -.05], drive: -.03 }],
    [1, {}]
  ]),
  hurtBody: keyed(STANCE, [
    [0, {}],
    [.18, {
      spine: [.42, -.05, 0], chest: [.3, 0, 0], head: [.28, .5, 0],
      shL: [-.5, .15, .5], elL: -1.9, shR: [-.45, -.15, -.5], elR: -2.0, hy: -.09, drive: -.07
    }, 'snap'],
    [.6, { spine: [.2, -.05, 0], head: [.1, .55, 0], drive: -.03 }],
    [1, {}]
  ]),
  knockdown: keyed(STANCE, [
    [0, {}],
    [.28, {
      bodyRot: [-.35, 0, 0], hy: -.12, spine: [-.3, .1, 0], head: [-.5, .2, 0],
      shL: [-.2, .2, 1.0], shR: [.1, -.2, -1.0], hipL: [-.8, .2, .2], knL: 1.2, hipR: [-.4, -.2, -.2], knR: .9,
      air: 1, lift: .08
    }],
    [.6, {
      bodyRot: [-1.35, 0, .05], hy: 0, lift: 0, air: 1,
      spine: [.1, .1, 0], head: [.2, .2, 0],
      shL: [-.1, .3, 1.3], shR: [.05, -.3, -1.3],
      hipL: [-.5, .2, .2], knL: .9, hipR: [-.2, -.2, -.2], knR: .6
    }, 'out'],
    [1, { bodyRot: [-1.38, 0, .05], head: [.25, .25, 0] }]
  ]),
  getup: keyed(NEUTRAL, [
    [0, {
      bodyRot: [-1.38, 0, .05], air: 1, lift: 0, hy: 0,
      shL: [-.1, .3, 1.3], shR: [.05, -.3, -1.3], hipL: [-.5, .2, .2], knL: .9, hipR: [-.2, -.2, -.2], knR: .6
    }],
    [.5, {
      bodyRot: [-.55, 0, 0], hy: -.25, hipL: [-1.1, .2, .2], knL: 1.9, hipR: [-.2, -.2, -.2], knR: 1.7,
      shL: [-.6, .2, .6], elL: -1.2, shR: [-.5, -.2, -.5], elR: -1.4, head: [-.2, .3, 0]
    }],
    [1, STANCE]
  ]),
  ko: keyed(STANCE, [
    [0, {}],
    [.22, {
      bodyRot: [-.25, 0, .06], spine: [-.4, .2, 0], head: [-.6, .3, -.15], drive: -.06,
      shL: [-.1, .1, 1.1], elL: -.4, shR: [.1, -.1, -1.1], elR: -.3, hy: -.05
    }, 'snap'],
    [.62, {
      bodyRot: [-1.45, 0, .1], air: 1, lift: 0,
      spine: [.15, .1, 0], head: [.3, .1, 0],
      shL: [-.1, .2, 1.5], shR: [0, -.2, -1.5], elL: -.2, elR: -.2,
      hipL: [-.6, .2, .2], knL: .8, hipR: [-.3, -.2, -.2], knR: .5
    }, 'out'],
    [1, { bodyRot: [-1.47, 0, .1], head: [.35, .1, 0], hipL: [-.65, .2, .2], knL: .7 }]
  ]),
  win: keyed(STANCE, [
    [0, {}],
    [.3, {
      hy: .01, spine: [-.1, -.06, 0], chest: [-.14, -.08, 0], head: [.12, .3, 0],
      shL: [-2.7, 0, .35], elL: -.4, shR: [-2.7, 0, -.35], elR: -.4, gripL: 1, gripR: 1
    }],
    [.6, { shL: [-2.55, 0, .5], elL: -.7, shR: [-2.55, 0, -.5], elR: -.7, head: [.1, .1, 0] }],
    [1, { shL: [-2.6, 0, .45], elL: -.55, shR: [-2.6, 0, -.45], elR: -.55 }]
  ])
};

export function poseFor(name, t) {
  const c = CLIPS[name] || CLIPS.idle;
  return c(clamp(t, 0, 1));
}

/* ---------------- signature intros & wins ---------------- */
const INTROS = {
  // chest-beating showman
  mukkal: keyed(STANCE, [
    [0, {}],
    [.22, { chest: [-.06, -.16, 0], head: [.06, .5, 0], shL: [-.45, .2, .95], elL: -.5, shR: [-.45, -.2, -.95], elR: -.5, hy: -.02 }],
    [.45, { shL: [-1.15, .35, .18], elL: -2.45, shR: [-1.15, -.35, -.18], elR: -2.45, chest: [.12, -.16, 0], head: [-.12, .6, 0], hy: -.07 }],
    [.62, { shL: [-1.05, .3, .3], elL: -2.2, shR: [-1.05, -.3, -.3], elR: -2.2, chest: [.02, -.16, 0], head: [.02, .6, 0] }],
    [.8, { shL: [-1.15, .35, .18], elL: -2.45, shR: [-1.15, -.35, -.18], elR: -2.45, chest: [.12, -.16, 0], head: [-.12, .6, 0] }],
    [1, STANCE]
  ]),
  // low kalari guard, then a blade-hand sweep
  chhaya: keyed(STANCE, [
    [0, {}],
    [.25, { hy: -.12, hips: [.1, -.5, .02], spine: [.16, -.2, 0], chest: [.1, -.3, 0], head: [-.1, .8, 0], shL: [-1.3, .3, .5], elL: -2.2, shR: [-.5, -.3, -.7], elR: -1.4, hipL: [-.5, .2, .14], knL: .8, hipR: [.2, -.24, -.12], knR: .6 }],
    [.55, { hy: -.1, hips: [.08, -.2, .02], spine: [.1, .1, 0], chest: [.06, .2, 0], head: [-.06, .2, 0], shR: [-1.35, .5, -.15], elR: -.35, wrR: [0, 0, .5], shL: [-.9, .2, .5], elL: -2.0, hipL: [-.45, .2, .14], knL: .7, hipR: [.18, -.24, -.12], knR: .55 }],
    [1, STANCE]
  ]),
  // cracks his neck, fixes his collar, points
  baaz: keyed(STANCE, [
    [0, {}],
    [.25, { head: [-.05, .95, .1], chest: [-.04, -.16, 0], shL: [-.7, .1, .5], shR: [-.5, -.1, -.45] }],
    [.5, { head: [-.02, .3, 0], shR: [-1.45, -.25, -.1], elR: -2.6, wrR: [0, 0, -.3], chest: [.02, -.16, 0] }],
    [.75, { shR: [-1.55, .05, -.05], elR: -.12, head: [-.08, .1, 0], chest: [.06, -.1, 0], drive: .04 }],
    [1, STANCE]
  ]),
  // straightens his cuffs, then his tie
  boss: keyed(STANCE, [
    [0, {}],
    [.22, { shL: [-.95, .35, .18], elL: -2.3, shR: [-.95, -.35, -.18], elR: -2.3, head: [-.1, .5, 0], chest: [.04, -.16, 0] }],
    [.5, { shR: [-1.5, -.12, -.05], elR: -2.55, wrR: [0, 0, -.2], shL: [-.3, .1, .2], elL: -.4, head: [-.06, .3, 0] }],
    [.78, { shR: [-.5, -.1, -.3], elR: -.5, head: [-.02, .55, 0], chest: [-.02, -.16, 0] }],
    [1, STANCE]
  ]),
  // flashes the badge, then beckons
  daya: keyed(STANCE, [
    [0, {}],
    [.22, { shR: [-1.95, -.1, -.12], elR: -1.95, wrR: [0, 0, -.4], head: [-.06, .35, 0], chest: [.04, -.16, 0] }],
    [.5, { shR: [-1.25, -.25, -.2], elR: -1.5, gripR: 0, head: [-.04, .5, 0] }],
    [.7, { shR: [-1.3, -.2, -.2], elR: -1.9, gripR: 1 }],
    [1, STANCE]
  ])
};

const WINS = {
  // double biceps, roaring
  mukkal: keyed(STANCE, [
    [0, {}],
    [.3, { hy: .01, chest: [-.12, -.16, 0], head: [.14, .3, 0], shL: [-2.35, .1, .55], elL: -1.5, shR: [-2.35, -.1, -.55], elR: -1.5, gripL: 1, gripR: 1 }],
    [.6, { shL: [-1.85, .1, 1.15], elL: -2.3, shR: [-1.85, -.1, -1.15], elR: -2.3, chest: [-.06, -.16, 0], head: [.1, .1, 0] }],
    [1, { shL: [-1.9, .1, 1.1], elL: -2.2, shR: [-1.9, -.1, -1.1], elR: -2.2, head: [.08, .2, 0] }]
  ]),
  // arms open, then a formal salute
  chhaya: keyed(STANCE, [
    [0, {}],
    [.3, { shL: [-.35, .2, 1.15], elL: -.5, shR: [-.35, -.2, -1.15], elR: -.5, chest: [-.08, -.16, 0], head: [.1, .2, 0], hy: -.02 }],
    [.6, { shL: [-1.25, .45, .12], elL: -2.3, shR: [-1.25, -.45, -.12], elR: -2.3, head: [-.12, .1, 0], chest: [.1, -.16, 0], hy: -.05 }],
    [1, { shL: [-1.2, .45, .12], elL: -2.25, shR: [-1.2, -.45, -.12], elR: -2.25, head: [-.1, .1, 0] }]
  ]),
  // folds his arms and nods once
  baaz: keyed(STANCE, [
    [0, {}],
    [.35, { shL: [-1.05, .55, .08], elL: -2.65, shR: [-1.05, -.55, -.08], elR: -2.65, chest: [-.06, -.16, 0], head: [.06, .1, 0], hy: -.02 }],
    [.7, { head: [.14, .1, 0] }],
    [1, { head: [.1, .1, 0] }]
  ]),
  // fixes his tie, then dismisses the room
  boss: keyed(STANCE, [
    [0, {}],
    [.3, { shR: [-1.5, -.12, -.05], elR: -2.55, wrR: [0, 0, -.2], shL: [-.25, .1, .18], elL: -.35, head: [-.04, .3, 0] }],
    [.6, { shR: [-.55, -.25, -.35], elR: -.55, wrR: [0, 0, .3], head: [-.02, -.35, 0], chest: [-.04, -.16, 0] }],
    [1, { shR: [-.5, -.2, -.3], elR: -.5, head: [.02, -.3, 0] }]
  ]),
  // arms crossed, chin up
  daya: keyed(STANCE, [
    [0, {}],
    [.35, { shL: [-1.0, .6, .05], elL: -2.7, shR: [-1.0, -.6, -.05], elR: -2.7, chest: [-.04, -.16, 0], head: [.08, .1, 0] }],
    [.7, { head: [.16, .1, 0] }],
    [1, { head: [.12, .1, 0] }]
  ])
};

export function fighterClip(def, name, t) {
  const table = name === 'intro' ? INTROS : name === 'win' ? WINS : null;
  const fn = table && table[def.id];
  return fn ? fn(clamp(t, 0, 1)) : poseFor(name, t);
}

/* ---------------- build the fighter ---------------- */
export function buildFighter(def) {
  const B = def.build, P0 = def.palette;
  const M = makeMaterials(P0);
  const T = tex();
  const root = new THREE.Group();
  const body = grp(root);
  const extras = [];

  const hips = grp(body, 0, HIP_Y, 0);
  const spine = grp(hips, 0, .06, 0);
  const chest = grp(spine, 0, .20, 0);
  const neck = grp(chest, 0, .27, 0);
  const head = grp(neck, 0, .06, 0);

  /* --- torso --- */
  const TORSO = [
    [.001, -.16], [.138, -.155], [.158, -.132], [.158, -.06], [.148, 0],
    [.15, .05], [.163, .10], [.185, .16], [.203, .21], [.213, .25],
    [.209, .285], [.19, .315], [.155, .345], [.10, .365], [.001, .372]
  ];
  const torsoPts = (inflate = 0) => TORSO.map(([r, y]) => {
    const f = 1 + (B.chest - 1) * smoothstep(0, .22, y) + (B.waist - 1) * (1 - smoothstep(-.04, .16, y));
    return new THREE.Vector2(Math.max(.02, (r + inflate) * f), y);
  });

  const bare = def.gear === 'pehelwan';
  put(new THREE.LatheGeometry(torsoPts(0), 56), M.skin, spine, null, null, [1, 1, B.depth]);
  put(sph(.155, 24), M.skin, hips, [0, -.055, 0], [0, 0, 0], [1.0, .8, B.depth * 1.05]);

  // muscular definition
  if (bare) {
    for (const s of [-1, 1]) {
      put(sph(.078 * B.muscle, 20), M.skin, spine, [s * .082, .215, .125], [.22, s * -.12, 0], [1.2, .85, .38]);
      put(sph(.028, 12), M.skin, spine, [s * .082, .202, .146], [0, 0, 0], [.7, .7, .6]);
      put(sph(.034, 12), M.skin, spine, [s * .145, .175, .04], [0, 0, s * -.2], [.55, 1.1, .9]); // serratus
      put(sph(.03, 12), M.skin, spine, [s * .09, .32, .03], [0, 0, 0], [1.5, .6, .9]); // trap
    }
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        put(sph(.026, 12), M.skin, spine, [s * .038, .115 - i * .048, .115 - i * .002], [0, 0, 0], [1.35, .72, .32]);
      }
    }
    put(sph(.014, 10), M.skinDark, spine, [0, -.005, .107], [0, 0, 0], [.6, .8, .35], false);
    tube([[-.02, .312, .072], [-.09, .298, .062], [-.155, .278, .04]], .0085, M.skin, spine, 12, 5);
    tube([[.02, .312, .072], [.09, .298, .062], [.155, .278, .04]], .0085, M.skin, spine, 12, 5);
    // back muscles
    for (const s of [-1, 1]) {
      put(sph(.075, 16), M.skin, spine, [s * .085, .235, -.095], [0, 0, 0], [1.15, 1.2, .5]);
      put(sph(.06, 14), M.skin, spine, [s * .13, .15, -.05], [0, 0, 0], [.55, 1.35, .7]);
    }
  }

  // neck
  put(cyl(.056, .07, .16, 20), M.skin, neck, [0, .03, .01], [0, 0, 0], [1, 1, .95]);
  for (const s of [-1, 1]) tube([[s * .03, .02, .05], [s * .05, .09, .03], [s * .055, .14, .0]], .009, M.skin, neck, 10, 5);

  const face = buildHead(head, def, M, B);
  buildHair(B.height, def.hair, head, face, M, def);

  /* --- arms --- */
  const hands = {}, wrists = {};
  function buildArm(side) {
    const s = side > 0 ? 1 : -1;
    const key = side > 0 ? 'L' : 'R';
    const sh = grp(chest, s * .205 * B.shoulder, .235, 0);
    put(sph(.074 * B.muscle, 20), M.skin, sh, [0, .004, 0], [0, 0, 0], [1.06, 1.12, 1.0]);
    put(cap(.053 * B.muscle, .195, 12), M.skin, sh, [0, -.115, 0]);
    put(sph(.049 * B.muscle, 16), M.skin, sh, [0, -.10, .014], [0, 0, 0], [1, .92, 1.05]);
    put(sph(.047 * B.muscle, 14), M.skin, sh, [0, -.145, -.02], [0, 0, 0], [.92, 1.15, .92]);

    const el = grp(sh, 0, -.30, 0);
    put(sph(.056, 16), M.skin, el);
    put(cyl(.052, .036, .21, 18), M.skin, el, [0, -.12, 0], [0, 0, 0], [1, 1, .95]);
    put(sph(.05, 14), M.skin, el, [0, -.065, .006], [0, 0, 0], [1.02, 1.25, 1.0]);
    put(sph(.036, 12), M.skin, el, [0, -.245, .004], [0, 0, 0], [1, 1, .95]);
    const wr = grp(el, 0, -.285, 0);
    put(cyl(.036, .031, .05, 14), M.skin, wr, [0, .012, 0]);
    put(sph(.037, 12), M.skin, wr, [0, -.02, 0], [0, 0, 0], [1, .9, .92]);

    if (def.gear === 'kurta') {
      // short sleeve
      put(cyl(.082 * B.muscle, .074, .16, 18), M.cloth, sh, [0, -.07, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.076, .009, 6, 16), M.trim, sh, [0, -.15, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
      put(cyl(.049, .04, .10, 16), M.wrap, el, [0, -.19, 0], [0, 0, 0], [1, 1, 1]);
    } else if (def.gear === 'sherwani') {
      put(cyl(.078, .062, .29, 18), M.cloth, sh, [0, -.15, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.06, .046, .26, 16), M.cloth, el, [0, -.13, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.048, .011, 6, 16), M.gold, el, [0, -.255, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    } else if (def.gear === 'suit') {
      put(cyl(.072, .058, .28, 18), M.cloth, sh, [0, -.145, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.056, .043, .26, 16), M.cloth, el, [0, -.13, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.044, .043, .045, 16), M.shirt, wr, [0, -.003, 0], [0, 0, 0], [1, 1, 1], false);
      put(sph(.0075, 8), M.gold, wr, [0, -.006, .042], [0, 0, 0], [1, 1, .6], false);
    } else if (def.gear === 'shirt') {
      put(cyl(.081, .068, .17, 18), M.cloth, sh, [0, -.078, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.067, .009, 6, 16), M.cloth, sh, [0, -.158, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
      if (side > 0) {
        put(new THREE.TorusGeometry(.042, .008, 5, 14), M.leather, wr, [0, -.004, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
        put(cyl(.017, .017, .007, 12), M.gold, wr, [0, -.004, .04], [Math.PI / 2, 0, 0], null, false);
      }
    } else {
      // forearm wraps
      for (let i = 0; i < 3; i++) {
        put(new THREE.TorusGeometry(.044 - i * .002, .008, 6, 18), M.wrap, el, [0, -.11 - i * .05, 0], [Math.PI / 2, .18 * (i % 2 ? 1 : -1), 0], [1, 1, 1], false);
      }
      put(cyl(.043, .039, .07, 16), M.wrap, wr, [0, -.015, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.043, .012, 6, 16), M.trim, sh, [0, -.23, 0], [Math.PI / 2, .1, 0], [1, 1, 1], false);
    }
    if (def.facial === 'bindi') {
      put(new THREE.TorusGeometry(.05, .005, 6, 18), M.gold, el, [0, -.19, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    }
    const { hand, setGrip } = buildHand(wr, s, M);
    hands[key] = setGrip; wrists[key] = wr;

    if (def.id === 'mukkal' && side > 0) {
      put(new THREE.TorusGeometry(.05, .008, 6, 18), M.gold, sh, [0, -.165, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    }
    return { sh, el, wr };
  }
  const armL = buildArm(1), armR = buildArm(-1);

  /* --- legs --- */
  function buildLeg(side) {
    const s = side > 0 ? 1 : -1;
    const hip = grp(hips, s * .105 * B.hip, -.03, 0);
    put(sph(.093 * B.muscle, 18), M.skin, hip, [0, -.01, 0], [0, 0, 0], [1, .98, 1]);
    put(cyl(.093 * B.muscle, .064, .42, 22), M.skin, hip, [0, -.225, 0], [0, 0, 0], [1, 1, .98]);
    put(sph(.075, 16), M.skin, hip, [0, -.19, -.012], [0, 0, 0], [.95, 1.15, 1.0]);
    const kn = grp(hip, 0, -.45, 0);
    put(sph(.071, 16), M.skin, kn, [0, 0, .006], [0, 0, 0], [1, 1, .95]);
    put(cyl(.063, .039, .40, 20), M.skin, kn, [0, -.215, 0], [0, 0, 0], [1, 1, .95]);
    put(sph(.05, 14), M.skin, kn, [0, -.105, -.024], [0, 0, 0], [.88, 1.45, .92]);
    const an = grp(kn, 0, -.43, 0);
    put(sph(.045, 14), M.skin, an);
    const dress = def.gear === 'sherwani' || def.gear === 'suit' || def.gear === 'shirt';
    if (dress) {
      put(sph(.055, 20), M.leather, an, [0, -.038, .05], [0, 0, 0], [.92, .62, 2.05]);
      put(sph(.04, 14), M.leather, an, [0, -.03, .13], [0, 0, 0], [.98, .6, 1.05]);
      put(new THREE.BoxGeometry(.096, .016, .225), M.leather, an, [0, -.076, .05], [0, 0, 0], null, false);
      if (def.gear === 'suit') {
        put(new THREE.BoxGeometry(.045, .004, .07), M.cloth2, an, [0, -.004, .075], [0, 0, 0], null, false);
        for (let i = 0; i < 3; i++) {
          put(new THREE.BoxGeometry(.04, .003, .005), M.cloth2, an, [0, .004, .045 + i * .018], [0, 0, 0], null, false);
        }
      } else {
        put(new THREE.BoxGeometry(.09, .02, .21), M.skinDark, an, [0, -.078, .055], [0, 0, 0], null, false);
      }
    } else {
      put(sph(.052, 20), M.skin, an, [0, -.044, .045], [0, 0, 0], [.84, .56, 1.95]);
      put(sph(.038, 14), M.skin, an, [0, -.036, .125], [0, 0, 0], [.98, .62, 1.05]);
      put(sph(.03, 12), M.skin, an, [0, -.03, -.03], [0, 0, 0], [.9, .9, .8]);
      for (let i = 0; i < 5; i++) {
        put(sph(.0115 - i * .0008, 8), M.skin, an, [-.03 + i * .015, -.062, .153 - i * .002], [0, 0, 0], [.9, .75, 1.3], false);
      }
      put(new THREE.BoxGeometry(.085, .012, .20), M.skinDark, an, [0, -.073, .045], [0, 0, 0], null, false);
      // ankle wrap
      put(new THREE.TorusGeometry(.046, .009, 6, 16), M.wrap, an, [0, -.005, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    }

    // clothing on legs
    if (def.gear === 'pehelwan') {
      put(cyl(.108, .086, .24, 18), M.cloth, hip, [0, -.115, 0], [0, 0, 0], [1, 1, 1.02]);
      put(new THREE.TorusGeometry(.086, .006, 6, 18), M.trim, hip, [0, -.235, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    } else if (def.gear === 'kurta') {
      put(cyl(.095, .062, .42, 18), M.cloth2, hip, [0, -.225, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.058, .036, .40, 16), M.cloth2, kn, [0, -.215, 0], [0, 0, 0], [1, 1, 1]);
    } else {
      put(cyl(.102, .078, .44, 18), M.cloth2, hip, [0, -.225, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.072, .054, .40, 16), M.cloth2, kn, [0, -.215, 0], [0, 0, 0], [1, 1, 1]);
    }
    return { hip, kn, an };
  }
  const legL = buildLeg(1), legR = buildLeg(-1);

  /* --- garments --- */
  if (def.gear === 'pehelwan') {
    put(cyl(.172, .168, .075, 24), M.cloth, hips, [0, -.02, 0], [0, 0, 0], [1, 1, B.depth * 1.06]);
    put(new THREE.TorusGeometry(.168, .016, 8, 32), M.trim, hips, [0, .015, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.02]);
    // sash knot + tails
    put(sph(.032, 12), M.trim, hips, [.12, .005, .09], [0, 0, 0], [1, .8, 1]);
    const tail = grp(hips, .14, -.01, .08);
    tail.rotation.set(.15, 0, .12);
    put(new THREE.BoxGeometry(.07, .3, .018), M.trim, tail, [0, -.15, 0]);
    extras.push({ obj: tail, rot: tail.rotation.z, amp: .07, sp: 1.4 });
  } else if (def.gear === 'suit') {
    const pts = torsoPts(.034);
    pts.unshift(new THREE.Vector2(.001, -.18));
    pts.splice(1, 0, new THREE.Vector2(pts[1].x + .03, -.17));
    put(new THREE.LatheGeometry(pts, 56), M.cloth, spine, null, null, [1, 1, B.depth * 1.05]);
    // structured shoulders
    for (const s of [-1, 1]) {
      put(sph(.09, 18), M.cloth, chest, [s * .205 * B.shoulder, .245, 0], [0, 0, 0], [1.12, .85, 1.08], false);
    }
    // shirt V + collar
    const sShape = new THREE.Shape();
    sShape.moveTo(-.052, .352); sShape.lineTo(.052, .352); sShape.lineTo(0, .13); sShape.lineTo(-.052, .352);
    put(new THREE.ShapeGeometry(sShape), M.shirt, spine, [0, 0, .158], [0, 0, 0], null, false);
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.05, .08, .016), M.shirt, neck, [s * .022, .008, .06], [.12, s * .55, s * .34], null, false);
    }
    // tie
    put(new THREE.BoxGeometry(.046, .05, .022), M.tie, spine, [0, .345, .166], [.05, 0, 0], null, false);
    put(new THREE.BoxGeometry(.038, .26, .014), M.tie, spine, [0, .205, .168], [.05, 0, 0], null, false);
    put(new THREE.BoxGeometry(.02, .055, .012), M.tie, spine, [0, .068, .164], [.05, 0, 0], null, false);
    // lapels
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.064, .33, .018), M.cloth2, spine, [s * .078, .215, .16], [.05, s * .34, s * .12], null, false);
      put(new THREE.BoxGeometry(.008, .33, .02), M.cloth, spine, [s * .048, .215, .166], [.05, s * .34, s * .12], null, false);
    }
    // pocket square
    put(new THREE.BoxGeometry(.034, .028, .008), M.shirt, spine, [-.078, .292, .168], [0, 0, .6], null, false);
    // buttons
    for (let i = 0; i < 2; i++) {
      put(sph(.0095, 8), M.gold, spine, [.02, .06 - i * .075, .17], [0, 0, 0], [1, 1, .5], false);
    }
    // jacket collar behind the neck
    put(new THREE.BoxGeometry(.135, .055, .03), M.cloth, neck, [0, .012, -.055], [0, 0, 0], null, false);
  } else if (def.gear === 'shirt') {
    const pts = torsoPts(.018);
    pts.unshift(new THREE.Vector2(.001, -.12));
    pts.splice(1, 0, new THREE.Vector2(pts[1].x + .015, -.115));
    put(new THREE.LatheGeometry(pts, 56), M.cloth, spine, null, null, [1, 1, B.depth * 1.04]);
    // open collar with chest showing
    const vShape = new THREE.Shape();
    vShape.moveTo(-.05, .35); vShape.lineTo(.05, .35); vShape.lineTo(0, .22); vShape.lineTo(-.05, .35);
    put(new THREE.ShapeGeometry(vShape), M.skin, spine, [0, 0, .152], [.05, 0, 0], null, false);
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.055, .09, .015), M.cloth, neck, [s * .027, .002, .058], [.12, s * .48, s * .28], null, false);
      put(new THREE.BoxGeometry(.055, .012, .016), M.trim, neck, [s * .027, -.042, .066], [.12, s * .48, s * .28], null, false);
    }
    // placket + buttons
    put(new THREE.BoxGeometry(.016, .24, .012), M.cloth, spine, [0, .09, .156], [0, 0, 0], null, false);
    for (let i = 0; i < 4; i++) {
      put(sph(.0066, 8), M.trim, spine, [0, .19 - i * .058, .164], [0, 0, 0], [1, 1, .6], false);
    }
    // chest pocket
    put(new THREE.BoxGeometry(.062, .055, .01), M.cloth, spine, [.058, .185, .158], [0, 0, 0], null, false);
    put(new THREE.BoxGeometry(.062, .008, .012), M.trim, spine, [.058, .213, .16], [0, 0, 0], null, false);
    // belt + buckle
    put(cyl(.185, .182, .055, 26), M.leather, hips, [0, .008, 0], [0, 0, 0], [1, 1, B.depth], false);
    put(new THREE.BoxGeometry(.058, .045, .02), M.gold, hips, [0, .008, .142], [0, 0, 0], null, false);
    // watch on the left wrist
    put(new THREE.TorusGeometry(.043, .0075, 5, 16), M.leather, armL.wr, [0, -.004, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    put(cyl(.018, .018, .008, 12), M.gold, armL.wr, [0, -.004, .042], [Math.PI / 2, 0, 0], null, false);
  } else {
    // torso garment
    const inflate = def.gear === 'kurta' ? .016 : .028;
    const hem = def.gear === 'kurta' ? -.19 : -.15;
    const pts = torsoPts(inflate);
    pts.unshift(new THREE.Vector2(.001, hem));
    pts.splice(1, 0, new THREE.Vector2(pts[1].x + .02, hem + .01));
    const g = put(new THREE.LatheGeometry(pts, 56), M.cloth, spine, null, null, [1, 1, B.depth * 1.04]);
    // collar + trim
    put(new THREE.TorusGeometry(.062, .011, 6, 24), M.trim, neck, [0, .055, .0], [Math.PI / 2, 0, 0], [1, 1, .9], false);
    if (def.gear === 'kurta') {
      // deep V neckline
      put(new THREE.CylinderGeometry(.05, .02, .16, 16, 1, false, 0, Math.PI), M.skinDark, spine, [0, .30, .115], [.25, 0, 0], [1, 1, .5], false);
      // bust shaping
      for (const s of [-1, 1]) {
        put(sph(.062, 16), M.cloth, spine, [s * .062, .205, .105], [.1, s * -.1, 0], [1.05, .85, .6]);
      }
      // front trim
      put(new THREE.BoxGeometry(.014, .40, .012), M.trim, spine, [.045, .09, .126], [0, 0, .05], null, false);
      // side slits
      put(new THREE.BoxGeometry(.01, .22, .012), M.trim, hips, [.11, -.1, .085], [0, 0, 0], null, false);
      put(new THREE.BoxGeometry(.01, .22, .012), M.trim, hips, [-.11, -.1, .085], [0, 0, 0], null, false);
      // waist sash
      put(new THREE.TorusGeometry(.162, .014, 8, 28), M.trim, hips, [0, .02, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.05], false);
    } else {
      // sherwani lapels + button placket
      for (const s of [-1, 1]) {
        const lap = put(new THREE.BoxGeometry(.052, .30, .012), M.trim, spine, [s * .07, .21, .135], [.06, s * .22, 0], null, false);
      }
      for (let i = 0; i < 5; i++) {
        put(sph(.0105, 8), M.gold, spine, [0, .22 - i * .065, .137], [0, 0, 0], [1, 1, .5], false);
      }
      put(new THREE.BoxGeometry(.02, .45, .01), M.gold, spine, [0, .09, .134], [0, 0, 0], null, false);
      // shoulder cape hints
      for (const s of [-1, 1]) {
        put(new THREE.BoxGeometry(.10, .03, .16), M.trim, chest, [s * .14, .245, -.01], [0, s * .1, 0], null, false);
      }
    }
    // hem trim
    put(new THREE.TorusGeometry(.145, .009, 5, 30), M.trim, hips, [0, def.gear === 'kurta' ? -.175 : -.135, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.04], false);
  }

  // earring
  if (def.id === 'mukkal') {
    const earring = put(new THREE.TorusGeometry(.017, .0035, 6, 14), M.gold, face, [-.103, -.02, .004], [0, 1.2, 0], [1, 1, 1], false);
  }

  /* --- aura --- */
  const auraGroup = new THREE.Group();
  auraGroup.visible = false;
  root.add(auraGroup);
  const auraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(P0.aura) }, uI: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uI;
      void main(){ float a = smoothstep(0.0,0.35,vUv.y) * smoothstep(1.0,0.55,vUv.y) * pow(vUv.x,0.7);
        gl_FragColor = vec4(uColor, a * uI * 0.45); }`
  });
  const aura = new THREE.Mesh(new THREE.CylinderGeometry(.42, .78, 2.3, 28, 1, true), auraMat);
  aura.position.y = 1.1;
  auraGroup.add(aura);
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(.5, .85, 40),
    new THREE.MeshBasicMaterial({ color: P0.aura, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  auraRing.rotation.x = -Math.PI / 2; auraRing.position.y = .01;
  auraGroup.add(auraRing);

  /* --- rig + pose application --- */
  const rig = {
    hips, spine, chest, neck, head, shL: armL.sh, elL: armL.el, wrL: armL.wr,
    shR: armR.sh, elR: armR.el, wrR: armR.wr,
    hipL: legL.hip, knL: legL.kn, anL: legL.an,
    hipR: legR.hip, knR: legR.kn, anR: legR.an
  };

  let auraI = 0;
  function applyPose(p) {
    body.rotation.set(p.bodyRot[0], p.bodyRot[1], p.bodyRot[2]);
    body.position.z = p.drive || 0;
    rig.hips.position.y = HIP_Y + p.hy;
    rig.hips.rotation.set(p.hips[0], p.hips[1], p.hips[2]);
    rig.spine.rotation.set(p.spine[0], p.spine[1], p.spine[2]);
    rig.chest.rotation.set(p.chest[0], p.chest[1], p.chest[2]);
    rig.head.rotation.set(p.head[0], p.head[1], p.head[2]);
    rig.shL.rotation.set(p.shL[0], p.shL[1], p.shL[2]);
    rig.shR.rotation.set(p.shR[0], p.shR[1], p.shR[2]);
    rig.elL.rotation.x = p.elL;
    rig.elR.rotation.x = p.elR;
    rig.wrL.rotation.set(p.wrL[0], p.wrL[1], p.wrL[2]);
    rig.wrR.rotation.set(p.wrR[0], p.wrR[1], p.wrR[2]);
    hands.L(p.gripL); hands.R(p.gripR);
    rig.hipL.rotation.set(p.hipL[0], p.hipL[1], p.hipL[2]);
    rig.hipR.rotation.set(p.hipR[0], p.hipR[1], p.hipR[2]);
    rig.knL.rotation.x = p.knL;
    rig.knR.rotation.x = p.knR;
    rig.anL.rotation.x = p.anL + (p.flatL ? -(p.hips[0] + p.hipL[0] + p.knL) : 0);
    rig.anR.rotation.x = p.anR + (p.flatR ? -(p.hips[0] + p.hipR[0] + p.knR) : 0);

    let off = 0;
    if (!p.air) {
      const aL = p.hips[0] + p.hipL[0], bL = aL + p.knL;
      const aR = p.hips[0] + p.hipR[0], bR = aR + p.knR;
      const yL = HIP_Y + p.hy - .03 - (L1 * Math.cos(aL) + L2 * Math.cos(bL));
      const yR = HIP_Y + p.hy - .03 - (L1 * Math.cos(aR) + L2 * Math.cos(bR));
      off = ANKLE_Y - Math.min(yL, yR);
    }
    body.position.y = off + (p.lift || 0);
  }

  function flash(v) {
    for (const m of M.flash) m.emissiveIntensity = v * .55;
  }

  function setAura(v) {
    auraGroup.visible = v > .01;
    auraMat.uniforms.uI.value = v;
    auraRing.material.opacity = v * .7;
    auraRing.scale.setScalar(1 + v * .35);
  }

  function update(dt, time) {
    for (const e of extras) e.obj.rotation.z = e.rot + Math.sin(time * e.sp) * e.amp;
  }

  const scale = B.height / 1.82;
  root.scale.setScalar(scale);

  return {
    def, root, body, rig, hands,
    applyPose, flash, setAura, update,
    height: B.height,
    worldPos(node, target = new V3()) {
      return rig[node].getWorldPosition(target);
    }
  };
}
