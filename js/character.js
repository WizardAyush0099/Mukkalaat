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
    stats: { POWER: 9, SPEED: 9, DEFENSE: 9 },
    blurb: 'Sharp-suited officer. Grey hair, grey moustache, red tie, and a stare that ends arguments.',
    theme: ['#16151a', '#d43a3a'], mono: 'बॉ',
    palette: {
      skin: 0xc89672, skinShade: 0xa1704f, lips: 0x7b4a3c, hair: 0x9d978d, hairHill: 0xcac4b8, brow: 0x6a6357,
      cloth: 0x141419, clothDark: 0x0c0c10, trim: 0xd9d3c7, gold: 0xc0993f,
      wrap: 0xd9d3c6, leather: 0x0b0a0e, eye: 0x3a2a1a, aura: 0xff2f22,
      shirt: 0xc3c2c6, tie: 0xc01722
    },
    build: { height: 1.86, shoulder: 1.16, chest: 1.1, waist: 1.0, hip: 1.0, muscle: 1.05, depth: .79, head: 1.09, female: false },
    face: { jaw: .30, jawPow: 2.0, square: 1.25, w: 1.05, d: 1.0, brow: .085, eye: .94, ear: 1.12, cheek: .012, chin: 1.12, jowl: .02, mouth: 0 },
    gear: 'suit', hair: 'slick', facial: 'mustache', age: 'senior',
    model: 'Characters/cid_acp_pradhuman_3d_model_free.glb'
  },
  {
    id: 'daya', name: 'DAYA', style: 'CID BRAWLER', tag: 'INSPECTOR',
    stats: { POWER: 8, SPEED: 6, DEFENSE: 8 },
    blurb: 'CID inspector in a brown shirt and black jeans. Calm voice, heavy hands.',
    theme: ['#2a1e14', '#c58a4a'], mono: 'द',
    palette: {
      skin: 0xb8835c, skinShade: 0x946646, lips: 0x945244, hair: 0x171310, hairHill: 0x2c2622, brow: 0x140f0c,
      cloth: 0x6d4a30, clothDark: 0x151821, trim: 0x8a6a4c, gold: 0xd4d0c8,
      wrap: 0xcfc3ab, leather: 0x101014, eye: 0x2a1a12, aura: 0xffa63a,
      shirt: 0x6d4a30, tie: 0x2a2118
    },
    build: { height: 1.82, shoulder: 1.09, chest: .99, waist: 1.03, hip: 1.01, muscle: 1.06, depth: .74, head: 1.11, female: false },
    face: { jaw: .20, jawPow: 2.6, square: .8, w: 1.04, d: 1.02, brow: .06, eye: 1.12, ear: 1.04, cheek: .028, chin: .95, jowl: .03, mouth: .4 },
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

/* One continuous limb segment: rounded top, tapered shaft with a belly, rounded end.
   Replaces the old stack of capsules and spheres that read as a string of beads. */
function limbGeo(rTop, rBot, len, bulge = 0, seg = 26) {
  const pts = [];
  const capSteps = 5;
  for (let i = 0; i <= capSteps; i++) {
    const a = (i / capSteps) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.max(.002, rTop * Math.sin(a)), -rTop * (1 - Math.cos(a))));
  }
  const bodyTop = -rTop, bodyBot = -(len - rBot);
  for (let i = 1; i <= 9; i++) {
    const t = i / 9;
    const y = lerp(bodyTop, bodyBot, t);
    const r = lerp(rTop, rBot, t) + Math.sin(Math.PI * t) * bulge;
    pts.push(new THREE.Vector2(Math.max(.004, r), y));
  }
  for (let i = 1; i <= capSteps; i++) {
    const a = (i / capSteps) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.max(.002, rBot * Math.cos(a)), bodyBot - rBot * Math.sin(a)));
  }
  return new THREE.LatheGeometry(pts, seg);
}

/* Torso as one smooth mesh. Muscles are sculpted into the surface with soft bumps
   instead of being separate spheres stuck on top, so there are no seams or ball joints. */
function torsoGeometry(B, torsoPts, bare, seg = 72, rows = 46) {
  const prof = torsoPts(0);
  const yA = prof[1].y, yB = prof[prof.length - 2].y;
  function radiusAt(y) {
    if (y <= prof[1].y) return prof[1].x;
    for (let i = 1; i < prof.length - 1; i++) {
      const a = prof[i], b = prof[i + 1];
      if (y >= a.y && y <= b.y) {
        const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
        return lerp(a.x, b.x, t);
      }
    }
    return prof[prof.length - 2].x;
  }
  const verts = [], uvs = [], idx = [];
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const y = lerp(yA, yB, v);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const th = u * Math.PI * 2;
      const sn = Math.sin(th), cs = Math.cos(th);
      const front = Math.max(0, sn), back = Math.max(0, -sn), side = Math.abs(cs);
      let r = radiusAt(y);
      const chest = Math.exp(-Math.pow((y - .205) / .065, 2));
      r += (bare ? .021 : .008) * chest * Math.pow(front, 2.2);
      r -= (bare ? .008 : .003) * chest * Math.pow(front, 6) * Math.exp(-Math.pow(cs / .3, 2));
      r += (bare ? .008 : .004) * Math.exp(-Math.pow((y - .075) / .08, 2)) * Math.pow(front, 3);
      r += (bare ? .011 : .005) * Math.exp(-Math.pow((y - .17) / .1, 2)) * Math.pow(side, 3);
      r += .012 * Math.exp(-Math.pow((y - .312) / .045, 2)) * Math.pow(side, 1.4);
      r += (bare ? .013 : .006) * Math.exp(-Math.pow((y + .105) / .06, 2)) * Math.pow(back, 2);
      r -= (bare ? .007 : .004) * Math.exp(-Math.pow(cs / .22, 2)) * Math.exp(-Math.pow((y - .1) / .2, 2));
      verts.push(r * cs, y, r * sn * B.depth);
      uvs.push(u, v);
    }
  }
  const w = seg + 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------- materials ---------------- */
function makeMaterials(P) {
  const T = tex();
  const skin = new THREE.MeshPhysicalMaterial({
    color: P.skin, map: T.skin, roughness: .72, metalness: 0,
    clearcoat: .03, clearcoatRoughness: .85,
    bumpMap: T.skinBump, bumpScale: .0022, envMapIntensity: .36
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
  const brow = new THREE.MeshStandardMaterial({ color: P.brow ?? P.hair, roughness: .8, envMapIntensity: .25 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe9e2d8, roughness: .16, envMapIntensity: 1.1 });
  const iris = new THREE.MeshStandardMaterial({ color: P.eye, roughness: .2, envMapIntensity: 1.1 });
  const black = new THREE.MeshBasicMaterial({ color: 0x09070b });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const flash = [skin, skinDark, cloth, cloth2, wrap, hair, trim, shirt, tie];
  flash.forEach(m => { m.emissive = new THREE.Color(0xff3c18); m.emissiveIntensity = 0; });
  return { skin, skinDark, lips, cloth, cloth2, trim, gold, wrap, leather, hair, hairLite, brow, eyeWhite, iris, black, glow, shirt, tie, flash };
}

/* ---------------- sculpted head ---------------- */
function buildHead(head, def, M, B) {
  const face = grp(head, 0, 0.115, 0);
  const H = B.head;
  const FC = def.face || {};
  const skullGeo = new THREE.SphereGeometry(1, 56, 44);
  const pos = skullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = clamp((0.12 - y) / 1.12, 0, 1);
    // jaw taper + cheekbones (driven per character: square heavy jaw vs round full face)
    let jaw = 1 - (FC.jaw ?? 0.34) * Math.pow(t, FC.jawPow ?? 1.32);
    jaw += 0.05 * Math.exp(-Math.pow((y + 0.18) / 0.26, 2)) * (FC.square ?? 1);
    let X = x * jaw;
    let Z = z;
    if (z > 0) {
      Z = z * (0.97 - 0.13 * t);
      if (y < -0.28) Z += 0.20 * (1 - Math.abs(x) * .85) * Math.pow(clamp((-y - 0.28) / 0.66, 0, 1), 1.35);
      // brow ridge
      Z += (FC.brow ?? 0.055) * Math.exp(-Math.pow((y - 0.24) / 0.12, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.4) / 0.42, 2));
      // eye socket recess
      Z -= 0.028 * Math.exp(-Math.pow((Math.abs(x) - 0.38) / 0.22, 2)) * Math.exp(-Math.pow((y - 0.10) / 0.15, 2));
      // temple hollow
      Z -= 0.018 * Math.exp(-Math.pow((Math.abs(x) - 0.62) / 0.2, 2)) * Math.exp(-Math.pow((y - 0.22) / 0.2, 2));
    } else {
      Z *= 1.045;
    }
    // temples narrower at the top
    X *= 1 - 0.05 * Math.max(0, y - 0.25);
    pos.setXYZ(i, X * 0.0975 * H * (FC.w ?? 1), y * 0.124 * H, Z * 0.103 * H * (FC.d ?? 1));
  }
  skullGeo.computeVertexNormals();
  const skull = put(skullGeo, M.skin, face);
  skull.castShadow = true;
  // skull seam shading at the back
  const occiput = put(sph(.082, 18), M.skin, face, [0, -.01, -.045], [0, 0, 0], [1, 1.05, .9]);

  // cheekbones & jaw corners
  const fuller = 1 + (FC.cheek ?? 0) * 6;
  for (const s of [-1, 1]) {
    put(sph(.03 * fuller, 14), M.skin, face, [s * .055, -.012, .058], [0, 0, 0], [.95, .78, .6]);
    put(sph(.032, 14), M.skin, face, [s * .052, -.06, .045], [0, 0, 0], [.9, .95, .7]);
  }
  // chin
  put(sph(.026, 16), M.skin, face, [0, -.106, .068], [0, 0, 0], [1.15 * (FC.chin ?? 1), .72, .7]);
  if (FC.jowl) {
    // heavy under-jaw and a soft double chin
    put(sph(.052, 18), M.skin, face, [0, -.098, .034], [0, 0, 0], [1.3, .58, 1.02], false);
    put(sph(.042, 16), M.skin, face, [0, -.118, .018], [0, 0, 0], [1.42, .5, .95], false);
  }

  /* eyes */
  const eyeY = .012, eyeX = .037, eyeZ = .0905;
  for (const s of [-1, 1]) {
    const eye = grp(face, s * eyeX, eyeY, eyeZ);
    eye.rotation.y = s * -0.14;
    eye.scale.setScalar(FC.eye ?? 1);
    put(sph(.0175, 22), M.eyeWhite, eye, [0, 0, -.002], [0, 0, 0], [1, .8, .78], false);
    put(new THREE.CircleGeometry(.0082, 22), M.iris, eye, [0, -.001, .0132], [0, 0, 0], null, false);
    put(new THREE.CircleGeometry(.0035, 18), M.black, eye, [0, -.001, .0137], [0, 0, 0], null, false);
    // wet catchlight + limbal ring
    put(sph(.0016, 8), M.glow, eye, [-s * .0026, .0018, .0134], [0, 0, 0], null, false);
    put(new THREE.TorusGeometry(.0064, .0008, 4, 20), M.black, eye, [0, -.001, .0128], [0, 0, 0], [1, 1, 1], false);
    // upper/lower lids, wrapping the eyeball
    put(new THREE.TorusGeometry(.017, .0028, 6, 16, Math.PI), M.skin, eye, [0, .001, .002], [-.18, 0, .04], [1, .82, 1.05], false);
    put(new THREE.TorusGeometry(.0166, .0016, 6, 16, Math.PI), M.skinDark, eye, [0, -.001, .002], [.12, 0, Math.PI], [1, .82, 1.05], false);
    // eyebrows
    tube([
      [s * .01, .038, .0955], [s * .03, .044, .0975], [s * .052, .041, .092], [s * .068, .034, .079]
    ], .0062, M.brow, face, 14, 5);
    // eyelash edge
    put(new THREE.TorusGeometry(.0198, .0016, 5, 14, Math.PI), M.hair, eye, [0, .001, .002], [0, 0, .04], [1, .8, 1], false);
    // ear
    const ear = grp(face, s * .097, -.002, .004);
    ear.rotation.set(0, s * .28, s * .12);
    ear.scale.setScalar(FC.ear ?? 1);
    put(sph(.021, 14), M.skin, ear, [0, 0, 0], [0, 0, 0], [.42, 1.25, .85]);
    put(new THREE.TorusGeometry(.017, .0055, 6, 14, Math.PI * 1.4), M.skinDark, ear, [0, 0, .008], [0, s * 1.2, 0], [1, 1.1, 1]);
    put(sph(.008, 10), M.skinDark, ear, [0, -.004, .006], [0, 0, 0], [.5, .7, .4]);
    // sideburn / temple hair
    put(sph(.02, 12), M.hair, face, [s * .088, .03, .02], [0, 0, 0], [.5, 1.3, .8], false);
  }

  /* nose */
  put(sph(.0135, 18), M.skin, face, [0, .026, .09], [0.32, 0, 0], [.58, 1.5, .72]);
  put(sph(.0142, 18), M.skin, face, [0, -.010, .099], [0, 0, 0], [.92, .72, .82]);
  for (const s of [-1, 1]) {
    put(sph(.0098, 14), M.skin, face, [s * .0142, -.017, .089], [0, 0, 0], [1, .66, .8]);
    put(sph(.0042, 10), M.skinDark, face, [s * .0098, -.0245, .094], [0, 0, 0], [1.1, .6, .5], false);
  }
  put(sph(.0072, 10), M.skinDark, face, [0, -.021, .099], [0, 0, 0], [1.4, .5, .5], false);

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
      // deep nasolabial fold from the nose wing to the moustache
      tube([[s * .024, -.026, .084], [s * .036, -.043, .08], [s * .041, -.06, .075], [s * .039, -.075, .066]], .0024, M.skinDark, face, 12, 4);
      put(sph(.016, 12), M.skin, face, [s * .043, .05, .078], [0, 0, 0], [1.5, .45, .55], false);
      // slack jaw and a creased cheek, kept shallow so it stays smooth
      put(sph(.026, 16), M.skin, face, [s * .055, -.058, .05], [0, 0, 0], [.7, .82, .62], false);
      tube([[s * .05, -.038, .066], [s * .056, -.05, .058], [s * .048, -.06, .052]], .0016, M.skinDark, face, 8, 4);
    }
  } else if (def.id === 'daya') {
    // fuller, rounder cheeks and a warm brow
    for (const s of [-1, 1]) {
      put(sph(.026, 16), M.skin, face, [s * .047, -.014, .06], [0, 0, 0], [1.0, .8, .62], false);
      put(sph(.022, 14), M.skin, face, [s * .042, .046, .072], [0, 0, 0], [1.35, .5, .6], false);
      tube([[s * .026, -.03, .084], [s * .036, -.043, .08], [s * .04, -.055, .075]], .0019, M.skinDark, face, 8, 4);
    }
  }

  /* mouth */
  const mouthY = -.062, smile = FC.mouth || 0;
  put(sph(.0155, 16), M.lips, face, [0, mouthY + .008, .094], [0, 0, 0], [1.2, .4, .5]);
  put(sph(.0175, 16), M.lips, face, [0, mouthY - .004, .093], [0, 0, 0], [1.05, .48, .5]);
  if (smile > .05) {
    // lifted mouth line, corners turned up
    tube([[-.03, mouthY - .002 + smile * .013, .092], [-.014, mouthY - .007, .097], [0, mouthY - .008, .098],
      [.014, mouthY - .007, .097], [.03, mouthY - .002 + smile * .013, .092]], .0022, M.skinDark, face, 18, 4);
  } else {
    put(new THREE.BoxGeometry(.032, .0024, .004), M.skinDark, face, [0, mouthY + .002, .099], [0, 0, 0], null, false);
  }
  for (const s of [-1, 1]) {
    put(sph(.0055, 8), M.skinDark, face, [s * .025, mouthY + .004 + smile * .014, .092], [0, 0, 0], [1, .6, .5], false);
  }

  /* facial hair */
  if (def.facial === 'mustache') {
    const senior = def.age === 'senior';
    const r = senior ? .0078 : .0072;
    const spread = senior ? .045 : .046;
    for (const s of [-1, 1]) {
      tube([
        [0, mouthY + .028, .096], [s * .022, mouthY + .029, .097],
        [s * (spread * .82), mouthY + .024, .095], [s * spread, mouthY + .014, .088]
      ], r, M.hair, face, 18, 6);
      put(sph(r * 1.15, 10), M.hair, face, [s * spread, mouthY + .012, .087], [0, 0, 0], [1, .8, .9], false);
      if (senior) put(sph(r * .7, 8), M.hair, face, [s * (spread * 1.02), mouthY - .004, .083], [0, 0, 0], [1, .7, .8], false);
    }
    put(sph(senior ? .0145 : .013, 12), M.hair, face, [0, mouthY + .03, .094], [0, 0, 0], [1.8, .7, .7], false);
    // stubble shadow on the jaw, for the younger moustached fighter only
    if (!senior) for (let i = 0; i < 10; i++) {
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
    // soft beard shadow rather than dots
    for (let i = 0; i < 18; i++) {
      const a = -1.28 + i * .145;
      put(sph(.009, 8), M.skinShade, face, [Math.sin(a) * .064, -.088 - Math.cos(a) * .012, .047 + Math.cos(a) * .024], [0, 0, 0], [1.2, .42, .32], false);
    }
    for (const s of [-1, 1]) put(sph(.012, 8), M.skinShade, face, [s * .028, -.047, .088], [0, 0, 0], [1.25, .3, .3], false);
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
    // thick black hair with volume on top and a side part
    put(new THREE.SphereGeometry(.107, 46, 32, 0, Math.PI * 2, 0, Math.PI * .66), M.hair, g, [0, .008, -.012], [.04, 0, 0], [1.08 * H, 1.32, 1.1], false);
    // crown volume
    for (let i = 0; i < 8; i++) {
      const a = -1.6 + i * .46;
      put(sph(.04, 16), M.hair, g, [Math.sin(a) * .056, .112 - Math.abs(a) * .01, Math.cos(a) * .058], [0, a * .5, a * .2], [1.15, .9, 1.05], false);
    }
    // side part, then a thick lock sweeping across the brow
    put(new THREE.BoxGeometry(.006, .06, .014), M.skinDark, g, [-.05, .098, .052], [.55, 0, -.16], null, false);
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      put(sph(.036 - t * .004, 16), i === 0 ? M.hairLite : M.hair, g,
        [-.07 + t * .11, .092 - t * .016, .056 + t * .012],
        [.3, t * .3, -.42 + t * .55], [1.2, .66, .82], false);
    }
    // full sides, sideburns and a thick nape
    for (const s of [-1, 1]) {
      put(sph(.032, 14), M.hair, g, [s * .09, .014, .006], [0, 0, 0], [.6, 1.18, 1.02], false);
      put(sph(.026, 12), M.hair, g, [s * .082, -.03, .02], [0, 0, 0], [.62, 1.0, .9], false);
      put(sph(.034, 14), M.hair, g, [s * .068, -.02, -.052], [0, 0, 0], [.8, .96, .88], false);
    }
    put(sph(.06, 18), M.hair, g, [0, -.03, -.084], [0, 0, 0], [1.12, .86, .74], false);
    return {};
  } else {
    // grey hair: full and swept back off the forehead, cropped at the sides
    put(new THREE.SphereGeometry(.1025, 44, 30, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair, g, [0, .01, -.012], [.06, 0, 0], [1.04 * H, 1.34, 1.08], false);
    // swept-back mass over the forehead, lifted on the parted side
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      put(sph(.033 - t * .003, 16), i < 2 ? M.hairLite : M.hair, g,
        [-.048 + t * .096, .086 + (1 - t) * .01, .05 - t * .01],
        [.34 - t * .1, 0, -.2 + t * .26], [1.2, .62, .9], false);
    }
    // side part
    put(new THREE.BoxGeometry(.006, .05, .012), M.skinDark, g, [.042, .1, .045], [.5, 0, .2], null, false);
    // short sides, temples and a cropped nape
    for (const s of [-1, 1]) {
      put(sph(.05, 18), M.hair, g, [s * .085, .008, -.012], [0, 0, 0], [.6, 1.02, 1.0], false);
      put(sph(.044, 16), M.hair, g, [s * .062, -.014, -.066], [0, 0, 0], [.72, .92, .82], false);
      put(sph(.026, 12), M.hair, g, [s * .07, .052, .046], [0, 0, .3], [.72, .5, .8], false);
    }
    put(sph(.074, 20), M.hair, g, [0, -.012, -.078], [0, 0, 0], [1.14, .8, .74], false);
    // combed ridges
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      put(sph(.028, 14), M.hairLite, g, [-.062 + t * .11, .118 - Math.abs(t - .5) * .012, .022 - t * .03], [.2, 0, 0], [.45, .3, 1.4], false);
    }
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
  const head = grp(neck, 0, .035, 0);

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

  // front surface depth of the torso at a height (spine-relative), so garment
  // details such as ties and plackets sit on the cloth instead of sinking into it
  const zScale = B.depth * 1.05;
  function frontZ(y, inflate = 0, extra = .006) {
    const p = torsoPts(inflate);
    let r = p[1].x;
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (y >= a.y && y <= b.y) {
        const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
        r = lerp(a.x, b.x, t);
        break;
      }
    }
    return r * zScale + extra;
  }

  const bare = def.gear === 'pehelwan';
  const mus = B.muscle;
  put(torsoGeometry(B, torsoPts, bare), M.skin, spine);
  put(sph(.148, 24), M.skin, hips, [0, -.055, 0], [0, 0, 0], [1.0, .82, B.depth * 1.05]);
  // dark under-layer so no bare skin can peek through a seam in a dressed fighter
  if (def.gear === 'suit' || def.gear === 'shirt') {
    /* sits well inside the garment: at the same depth scale it showed through
       the shirt around the shoulders as a dark bib */
    put(new THREE.LatheGeometry(torsoPts(.006), 40), M.cloth2, spine, null, null, [.985, 1, zScale * .96]);
    put(sph(.152, 22), M.cloth2, hips, [0, -.055, 0], [0, 0, 0], [1.0, .84, B.depth * 1.1]);
  }

  // definition lines only: the muscle volume is sculpted into the torso mesh itself
  if (bare) {
    tube([[0, .268, .123], [0, .234, .129], [0, .2, .127], [0, .168, .117]], .0028, M.skinDark, spine, 16, 4);
    for (let i = 0; i < 2; i++) {
      tube([[-.04, .118 - i * .045, .119], [0, .114 - i * .045, .126], [.04, .118 - i * .045, .119]], .0022, M.skinDark, spine, 18, 4);
    }
  }

  // neck
  put(cyl(.054, .069, .125, 22), M.skin, neck, [0, .006, .008], [0, 0, 0], [1, 1, .96]);
  for (const s of [-1, 1]) tube([[s * .03, .02, .05], [s * .05, .09, .03], [s * .055, .14, .0]], .009, M.skin, neck, 10, 5);

  const face = buildHead(head, def, M, B);
  buildHair(B.height, def.hair, head, face, M, def);
  head.scale.setScalar(1.12);

  /* --- arms --- */
  const hands = {}, wrists = {};
  function buildArm(side) {
    const s = side > 0 ? 1 : -1;
    const key = side > 0 ? 'L' : 'R';
    const sh = grp(chest, s * .205 * B.shoulder, .235, 0);
    put(limbGeo(.065 * mus, .047 * mus, .305, .01 * mus), M.skin, sh, [0, -.004, 0], null, [1, 1, .96]);

    const el = grp(sh, 0, -.30, 0);
    put(sph(.047, 22), M.skin, el, [0, 0, 0], [0, 0, 0], [1, .94, .96]);
    put(limbGeo(.047, .034, .265, .007), M.skin, el, [0, .006, 0]);
    const wr = grp(el, 0, -.285, 0);
    put(cyl(.036, .031, .05, 14), M.skin, wr, [0, .012, 0]);
    put(sph(.037, 12), M.skin, wr, [0, -.02, 0], [0, 0, 0], [1, .9, .92]);

    if (def.gear === 'kurta') {
      // short sleeve
      put(cyl(.082 * B.muscle, .074, .16, 18), M.cloth, sh, [0, -.07, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.076, .009, 6, 16), M.trim, sh, [0, -.15, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
      put(cyl(.049, .04, .10, 16), M.wrap, el, [0, -.19, 0], [0, 0, 0], [1, 1, 1]);
    } else if (def.gear === 'sherwani') {
      put(cyl(.078, .064, .32, 20), M.cloth, sh, [0, -.145, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.062, .048, .29, 18), M.cloth, el, [0, -.132, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.049, .011, 6, 16), M.gold, el, [0, -.268, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    } else if (def.gear === 'suit') {
      put(cyl(.068, .057, .315, 20), M.cloth, sh, [0, -.143, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.059, .045, .29, 18), M.cloth, el, [0, -.132, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.0415, .0405, .05, 16), M.shirt, wr, [0, -.004, 0], [0, 0, 0], [1, 1, 1], false);
      put(sph(.0055, 8), M.cloth2, wr, [0, -.006, .040], [0, 0, 0], [1, 1, .5], false);
    } else if (def.gear === 'shirt') {
      // sleeve rolled to just below the elbow, with a soft cap over the deltoid:
      // the cap rides on the shoulder joint, so a raised arm keeps its shoulder
      put(sph(.067, 20), M.cloth, sh, [0, .004, 0], [0, 0, 0], [1.06, .86, 1.02], false);
      put(new THREE.TorusGeometry(.062, .006, 6, 20), M.cloth2, sh, [0, -.052, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
      put(cyl(.071, .064, .3, 20), M.cloth, sh, [0, -.15, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.062, .064, .052, 18), M.cloth, el, [0, -.036, 0], [0, 0, 0], [1, 1, 1]);
      put(new THREE.TorusGeometry(.064, .011, 8, 20), M.cloth, el, [0, -.012, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
      // brushed-steel watch on his left wrist
      if (side > 0) {
        put(new THREE.TorusGeometry(.0375, .008, 6, 18), M.leather, wr, [0, -.004, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
        put(cyl(.0135, .0135, .006, 16), M.gold, wr, [0, -.004, .04], [Math.PI / 2, 0, 0], null, false);
        put(sph(.0028, 8), M.cloth2, wr, [0, -.004, .044], [0, 0, 0], [1, 1, .3], false);
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
    put(sph(.093 * B.muscle, 22), M.skin, hip, [0, -.012, 0], [0, 0, 0], [1, .94, 1]);
    put(limbGeo(.092 * B.muscle, .066, .43, .016 * B.muscle), M.skin, hip, [0, -.018, 0]);
    const kn = grp(hip, 0, -.45, 0);
    put(sph(.06, 22), M.skin, kn, [0, 0, .004], [0, 0, 0], [1, .95, .94]);
    put(limbGeo(.061, .037, .415, .014), M.skin, kn, [0, .008, 0]);
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
      put(cyl(.121, .088, .55, 22), M.cloth2, hip, [0, -.2, 0], [0, 0, 0], [1, 1, 1]);
      put(cyl(.083, .058, .415, 20), M.cloth2, kn, [0, -.206, 0], [0, 0, 0], [1, 1, 1]);
    }
    return { hip, kn, an };
  }
  const legL = buildLeg(1), legR = buildLeg(-1);

  /* --- garments --- */
  if (def.gear === 'pehelwan') {
    put(cyl(.158, .152, .075, 24), M.cloth, hips, [0, -.02, 0], [0, 0, 0], [1, 1, B.depth * 1.06]);
    put(new THREE.TorusGeometry(.153, .012, 8, 32), M.trim, hips, [0, .012, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.02]);
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
    // structured shoulders, riding on the shoulder joints so they move with the arms
    for (const s of [-1, 1]) {
      const sh = s > 0 ? armL.sh : armR.sh;
      put(sph(.07, 20), M.cloth, sh, [0, .012, 0], [0, 0, 0], [1.12, .78, 1.04], false);
    }
    // trouser seat under the jacket skirt
    put(sph(.156, 28), M.cloth2, hips, [0, -.06, 0], [0, 0, 0], [1.04, .92, B.depth * 1.14]);
    // shirt placket showing between the jacket edges
    put(new THREE.BoxGeometry(.038, .2, .012), M.shirt, spine, [0, .235, frontZ(.235, .034) + .001], [-.2, 0, 0], null, false);
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.03, .048, .012), M.shirt, neck, [s * .016, .002, .056], [.18, s * .45, s * .3], null, false);
    }
    // wide red tie laid on the shirt: knot, blade and tapered tip
    put(new THREE.BoxGeometry(.056, .05, .024), M.tie, spine, [0, .325, frontZ(.325, .034) + .006], [-.1, 0, 0], null, false);
    put(new THREE.BoxGeometry(.068, .26, .014), M.tie, spine, [0, .19, frontZ(.19, .034) + .008], [-.12, 0, 0], null, false);
    put(new THREE.BoxGeometry(.05, .1, .013), M.tie, spine, [0, .095, frontZ(.095, .034) + .004], [-.3, 0, 0], null, false);
    // lapels folded over the shirt, following the chest curve
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.072, .17, .016), M.cloth2, spine, [s * .068, .27, frontZ(.27, .034) + .004], [-.18, s * .26, s * .1], null, false);
      put(new THREE.BoxGeometry(.068, .17, .014), M.cloth2, spine, [s * .072, .1, frontZ(.1, .034) + .006], [-.16, s * .2, s * .08], null, false);
      put(new THREE.BoxGeometry(.008, .19, .012), M.cloth, spine, [s * .036, .235, frontZ(.235, .034) + .012], [-.16, s * .2, s * .08], null, false);
    }
    // pocket square
    put(new THREE.BoxGeometry(.03, .024, .008), M.shirt, spine, [-.072, .285, frontZ(.285, .034) + .001], [-.12, 0, .6], null, false);
    // buttons
    for (let i = 0; i < 2; i++) {
      const by = .05 - i * .07;
      put(sph(.0085, 8), M.gold, spine, [.022, by, frontZ(by, .034) + .004], [0, 0, 0], [1, 1, .5], false);
    }
    // jacket collar behind the neck
    put(new THREE.BoxGeometry(.135, .055, .03), M.cloth, neck, [0, .012, -.055], [0, 0, 0], null, false);
  } else if (def.gear === 'shirt') {
    const pts = torsoPts(.026);
    pts.unshift(new THREE.Vector2(.001, -.21));
    pts.splice(1, 0, new THREE.Vector2(.118, -.2));
    pts.splice(2, 0, new THREE.Vector2(.15, -.172));
    put(new THREE.LatheGeometry(pts, 56), M.cloth, spine, null, null, [1, 1, B.depth * 1.04]);
    // buttoned front placket, following the chest
    for (let i = 0; i < 3; i++) {
      const py = .2 - i * .145;
      put(new THREE.BoxGeometry(.015, .15, .006), M.cloth, spine, [0, py, frontZ(py, .026) + .001], [0, 0, 0], null, false);
    }
    for (let i = 0; i < 5; i++) {
      const by = .27 - i * .072;
      put(sph(.0058, 8), M.trim, spine, [0, by, frontZ(by, .026) + .003], [0, 0, 0], [1, 1, .6], false);
    }
    // collar band
    put(new THREE.TorusGeometry(.05, .0115, 6, 22), M.cloth, neck, [0, .002, .006], [Math.PI / 2, 0, 0], [1, 1.05, 1], false);
    // collar flaps, folded down and open at the throat
    for (const s of [-1, 1]) {
      put(new THREE.BoxGeometry(.044, .058, .012), M.cloth, neck, [s * .03, -.016, .056], [.24, s * .5, s * .34], null, false);
      put(new THREE.BoxGeometry(.041, .009, .014), M.cloth2, neck, [s * .032, -.045, .058], [.24, s * .5, s * .34], null, false);
    }
    // chest pocket
    put(new THREE.BoxGeometry(.052, .045, .007), M.cloth, spine, [.052, .18, frontZ(.18, .026) - .004], [-.2, 0, 0], null, false);
    put(new THREE.BoxGeometry(.052, .006, .009), M.trim, spine, [.052, .204, frontZ(.204, .026) - .004], [-.2, 0, 0], null, false);
    // trouser seat covering the hips, so no bare hip shows at the sides or front
    put(sph(.158, 28), M.cloth2, hips, [0, -.052, 0], [0, 0, 0], [1.04, .88, B.depth * 1.14]);
    // narrow waistband with a modest silver buckle
    put(cyl(.127, .124, .04, 28), M.cloth2, hips, [0, .01, 0], [0, 0, 0], [1, 1, B.depth * 1.02], false);
    const bz = .127 * B.depth * 1.02;
    put(new THREE.BoxGeometry(.06, .04, .01), M.gold, hips, [0, .012, bz + .002], [0, 0, 0], null, false);
    put(new THREE.BoxGeometry(.032, .022, .006), M.cloth2, hips, [0, .012, bz + .008], [0, 0, 0], null, false);

  } else {
    // torso garment
    const inflate = def.gear === 'kurta' ? .03 : .034;
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
      put(new THREE.TorusGeometry(.148, .012, 8, 28), M.trim, hips, [0, .02, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.05], false);
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
    put(new THREE.TorusGeometry(.132, .008, 5, 30), M.trim, hips, [0, def.gear === 'kurta' ? -.172 : -.132, 0], [Math.PI / 2, 0, 0], [1, 1, B.depth * 1.04], false);
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
