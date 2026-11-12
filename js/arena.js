import * as THREE from 'three';
import {
  stoneTexture, stoneBump, earthTexture, tex, makeCanvas,
  radialGlowTexture, mulberry32, rnd, clamp
} from './util.js';

/* ------------------------------------------------------------------ *
 *  AKHADA — a raised mud-and-stone fighting pit at night.
 *  Warm torchlight, a walled courtyard, a crowd in silhouette and
 *  hanging string lights.
 * ------------------------------------------------------------------ */

function archWallTexture(w = 2048, h = 1024) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#2c2422'; g.fillRect(0, 0, w, h);
  // plaster patches
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 180;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${60 + Math.random() * 40 | 0},${48 + Math.random() * 30 | 0},${40 + Math.random() * 25 | 0},.5)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // brick courses
  g.strokeStyle = 'rgba(12,9,8,.45)'; g.lineWidth = 2;
  for (let y = 0; y < h; y += 34) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    const off = (y / 34) % 2 ? 44 : 0;
    for (let x = off; x < w; x += 88) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); }
  }
  const t = tex(c, { srgb: true, repeat: [2, 1] });
  return t;
}

function bannerTexture(bg = '#a8631c', ink = '#f2d9a8') {
  const w = 256, h = 640;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // woven banding
  g.fillStyle = 'rgba(0,0,0,.16)';
  for (let y = 0; y < h; y += 22) g.fillRect(0, y, w, 3);
  g.strokeStyle = ink; g.lineWidth = 5; g.globalAlpha = .75;
  g.strokeRect(18, 18, w - 36, h - 36);
  g.strokeRect(30, 30, w - 60, h - 60);
  // simple sun sigil
  g.save(); g.translate(w / 2, h * 0.24);
  g.strokeStyle = ink; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.beginPath(); g.moveTo(Math.cos(a) * 54, Math.sin(a) * 54); g.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); g.stroke();
  }
  g.restore();
  g.globalAlpha = .8;
  g.fillStyle = ink;
  g.font = 'bold 44px serif'; g.textAlign = 'center';
  const chars = ['मु', 'क्का', 'लात'];
  chars.forEach((ch, i) => g.fillText(ch, w / 2, h * 0.48 + i * 66));
  g.globalAlpha = 1;
  const t = tex(c, { srgb: true });
  return t;
}

function flameSpriteTexture() {
  const w = 96, h = 128;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const grd = g.createRadialGradient(w / 2, h * 0.72, 2, w / 2, h * 0.62, w * 0.75);
  grd.addColorStop(0, 'rgba(255,255,235,1)');
  grd.addColorStop(0.22, 'rgba(255,214,120,.95)');
  grd.addColorStop(0.5, 'rgba(255,112,28,.6)');
  grd.addColorStop(1, 'rgba(180,30,0,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.bezierCurveTo(w * 0.92, h * 0.4, w * 0.9, h * 0.85, w / 2, h);
  g.bezierCurveTo(w * 0.1, h * 0.85, w * 0.08, h * 0.4, w / 2, 0);
  g.fill();
  return tex(c, { srgb: true });
}

function buildAkhada(renderer, scene) {
  const group = new THREE.Group();
  scene.add(group);

  scene.fog = new THREE.FogExp2(0x100a14, 0.019);
  scene.background = new THREE.Color(0x08060c);

  /* ---------------- sky ---------------- */
  {
    const skyGeo = new THREE.SphereGeometry(70, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x05060f) },
        mid: { value: new THREE.Color(0x1c1030) },
        bot: { value: new THREE.Color(0x59301f) }
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){
          float h = normalize(vP).y;
          vec3 col = mix(bot, mid, smoothstep(-0.08, 0.28, h));
          col = mix(col, top, smoothstep(0.18, 0.75, h));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    group.add(new THREE.Mesh(skyGeo, skyMat));

    // stars
    const rand = mulberry32(91);
    const N = 320, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2, y = 0.25 + rand() * 0.72, r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 62;
      pos[i * 3 + 1] = y * 62;
      pos[i * 3 + 2] = Math.sin(a) * r * 62;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.22, sizeAttenuation: true, transparent: true, opacity: .75, fog: false, depthWrite: false });
    group.add(new THREE.Points(g, m));

    // moon + halo
    const moonTex = radialGlowTexture(256, 'rgba(255,246,226,1)', 'rgba(255,190,120,0)');
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false, opacity: .95 }));
    moon.scale.set(13, 13, 1); moon.position.set(-19, 15, -46);
    group.add(moon);
    const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false, opacity: .5 }));
    moonCore.scale.set(34, 34, 1); moonCore.position.copy(moon.position);
    group.add(moonCore);
  }

  /* ---------------- ground ---------------- */
  const stoneMap = stoneTexture(1024, 21);
  stoneMap.repeat.set(9, 9);
  const stoneBmp = stoneBump(512, 22);
  stoneBmp.repeat.set(9, 9);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(34, 64),
    new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .06, roughness: .88, metalness: .02, color: 0x8d8279 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.36;
  ground.receiveShadow = true;
  group.add(ground);

  /* raised akhada platform */
  const pitMap = earthTexture(1024, 33);
  pitMap.repeat.set(2.2, 2.2);
  const pit = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 72),
    new THREE.MeshStandardMaterial({ map: pitMap, bumpMap: stoneBmp, bumpScale: .09, roughness: .95, metalness: 0, color: 0x8a7460 })
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = 0.002;
  pit.receiveShadow = true;
  group.add(pit);

  const rimMat = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .08, roughness: .8, color: 0x7d7168 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.75, 0.4, 72, 1, true), rimMat);
  rim.position.y = -0.2;
  rim.receiveShadow = true; rim.castShadow = true;
  group.add(rim);
  const rimTop = new THREE.Mesh(new THREE.RingGeometry(6.5, 6.85, 72), new THREE.MeshStandardMaterial({ color: 0x5c5148, roughness: .6, metalness: .18 }));
  rimTop.rotation.x = -Math.PI / 2; rimTop.position.y = .002;
  group.add(rimTop);

  // chalk circle + centre motif
  const chalk = new THREE.Mesh(new THREE.RingGeometry(5.5, 5.62, 96), new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: .9, transparent: true, opacity: .5 }));
  chalk.rotation.x = -Math.PI / 2; chalk.position.y = .004;
  group.add(chalk);
  const innerChalk = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.12, 72), new THREE.MeshStandardMaterial({ color: 0xe9dcbf, roughness: .9, transparent: true, opacity: .38 }));
  innerChalk.rotation.x = -Math.PI / 2; innerChalk.position.y = .004;
  group.add(innerChalk);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 3.3), new THREE.MeshStandardMaterial({ color: 0xe6d8b8, roughness: .9, transparent: true, opacity: .16 }));
    spoke.rotation.x = -Math.PI / 2; spoke.rotation.z = a;
    spoke.position.set(Math.cos(a) * 3.3, .004, Math.sin(a) * 3.3);
    group.add(spoke);
  }

  /* ---------------- courtyard wall ---------------- */
  const wallTex = archWallTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: stoneBmp, bumpScale: .05, roughness: .94, color: 0x9a8b7e });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 7.4, 0.9), wallMat);
  wall.position.set(0, 3.3, -11.5);
  wall.receiveShadow = true;
  group.add(wall);

  // arched niches with warm inners
  const nicheMat = new THREE.MeshBasicMaterial({ color: 0xffa552 });
  for (let i = -2; i <= 2; i++) {
    const x = i * 6.6;
    const shape = new THREE.Shape();
    shape.moveTo(-0.95, -1.75); shape.lineTo(-0.95, 0.55);
    shape.absarc(0, 0.55, 0.95, Math.PI, 0, true);
    shape.lineTo(0.95, -1.75); shape.lineTo(-0.95, -1.75);
    const niche = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x090608 }));
    niche.position.set(x, 2.4, -11.03);
    group.add(niche);
    const glowShape = new THREE.Shape();
    glowShape.moveTo(-0.8, -1.6); glowShape.lineTo(-0.8, 0.55);
    glowShape.absarc(0, 0.55, 0.8, Math.PI, 0, true);
    glowShape.lineTo(0.8, -1.6); glowShape.lineTo(-0.8, -1.6);
    const glow = new THREE.Mesh(new THREE.ShapeGeometry(glowShape), new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: .16 }));
    glow.position.set(x, 2.4, -11.02);
    group.add(glow);
  }

  const corbel = new THREE.Mesh(new THREE.BoxGeometry(40, 0.45, 1.5), new THREE.MeshStandardMaterial({ color: 0x4a3c32, roughness: .85 }));
  corbel.position.set(0, 6.9, -11.3);
  group.add(corbel);

  /* banners on the wall */
  const bTex = [bannerTexture('#9c2a1f', '#f6dda6'), bannerTexture('#1f4a3c', '#f0d79b'), bannerTexture('#8b5a12', '#ffe6b0')];
  for (let i = 0; i < 6; i++) {
    const x = -13.5 + i * 5.4;
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 3.6),
      new THREE.MeshStandardMaterial({ map: bTex[i % 3], roughness: .92, side: THREE.DoubleSide, color: 0xb3a291 })
    );
    b.position.set(x + 1.2, 4.7, -10.9);
    b.rotation.y = 0.02;
    group.add(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: .7, metalness: .3 }));
    rod.rotation.z = Math.PI / 2; rod.position.set(x + 1.2, 6.45, -10.9);
    group.add(rod);
  }

  /* ---------------- pillars ---------------- */
  function pillar(x, z, h = 6.4, r = .42) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .06, roughness: .82, color: 0x8d7f72 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 20), mat);
    shaft.position.y = h / 2; shaft.castShadow = true; shaft.receiveShadow = true;
    g.add(shaft);
    const base = new THREE.Mesh(new THREE.BoxGeometry(r * 3.1, .45, r * 3.1), mat);
    base.position.y = .22; base.castShadow = true; g.add(base);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(r * 3.2, .4, r * 3.2), mat);
    cap.position.y = h + .2; g.add(cap);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.1, .3, 20), mat);
    cap2.position.y = h - .1; g.add(cap2);
    g.position.set(x, 0.002, z);
    group.add(g);
    return g;
  }
  pillar(-8.6, -4.2, 6.2, .46);
  pillar(8.6, -4.2, 6.2, .46);
  pillar(-8.6, -8.4, 6.2, .46);
  pillar(8.6, -8.4, 6.2, .46);

  /* ---------------- torches ---------------- */
  const flames = [];
  const flameTexture = flameSpriteTexture();
  const torchPositions = [[-8.2, 1.3, -3.7], [8.2, 1.3, -3.7], [-6.4, 2.0, -10.2], [6.4, 2.0, -10.2]];
  torchPositions.forEach((p, idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 1.45, 8), new THREE.MeshStandardMaterial({ color: 0x38251a, roughness: .8 }));
    post.position.set(p[0], p[1], p[2]);
    group.add(post);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.19, .1, .16, 12), new THREE.MeshStandardMaterial({ color: 0x2c211b, roughness: .55, metalness: .5 }));
    bowl.position.set(p[0], p[1] + .78, p[2]);
    group.add(bowl);

    const sprites = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        opacity: .85, color: new THREE.Color().setHSL(0.07 + i * 0.012, 1, .62)
      }));
      const sc = 0.55 - i * 0.08;
      s.scale.set(sc, sc * 1.5, 1);
      s.position.set(p[0] + (Math.random() - .5) * .07, p[1] + .95, p[2]);
      group.add(s); sprites.push(s);
    }
    const light = new THREE.PointLight(0xff7a30, 55, 9, 2);
    light.position.set(p[0], p[1] + 1.0, p[2]);
    group.add(light);
    flames.push({ sprites, light, base: p, seed: idx * 1.7, flick: 0 });
  });

  /* ---------------- hanging string lights ---------------- */
  {
    const rand = mulberry32(55);
    const bulbGeo = new THREE.SphereGeometry(.045, 6, 6);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffcf7a });
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, 3 * 22);
    const dummy = new THREE.Object3D();
    const bulbsPos = [];
    let n = 0;
    for (let row = 0; row < 3; row++) {
      const y0 = 4.4 + row * 0.7, z0 = -6.5 - row * 1.3;
      for (let i = 0; i < 22; i++) {
        const t = i / 21;
        const x = -13 + t * 26;
        const sag = Math.sin(t * Math.PI) * 0.55;
        const y = y0 - sag;
        dummy.position.set(x, y, z0);
        dummy.updateMatrix();
        bulbs.setMatrixAt(n++, dummy.matrix);
        bulbsPos.push([x, y, z0]);
      }
    }
    bulbs.count = n;
    group.add(bulbs);

    // thin wires
    for (let row = 0; row < 3; row++) {
      const pts = [];
      const y0 = 4.4 + row * 0.7, z0 = -6.5 - row * 1.3;
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push(new THREE.Vector3(-13 + t * 26, y0 - Math.sin(t * Math.PI) * .55, z0));
      }
      const wire = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x1a1210, transparent: true, opacity: .8 })
      );
      group.add(wire);
    }

    // a few brighter lamps
    const lampGlow = radialGlowTexture(128, 'rgba(255,215,150,1)', 'rgba(255,120,30,0)');
    for (let i = 0; i < 6; i++) {
      const [x, y, z] = bulbsPos[(i * 11 + 3) % bulbsPos.length];
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlow, transparent: true, depthWrite: false, opacity: .5, blending: THREE.AdditiveBlending }));
      s.scale.set(2.2, 2.2, 1); s.position.set(x, y, z - .05);
      group.add(s);
    }
  }

  /* ---------------- crowd silhouettes ---------------- */
  let crowd, crowdData = [];
  {
    const rand = mulberry32(202);
    const bodyGeo = new THREE.CapsuleGeometry(.17, .62, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x16101a, roughness: 1, metalness: 0 });
    const N = 96;
    crowd = new THREE.InstancedMesh(bodyGeo, mat, N);
    crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crowd.frustumCulled = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const row = i % 3;
      const x = -16 + rand() * 32;
      const z = -12.6 - row * 1.25 - rand() * .4;
      const y = .3 + rand() * .15;
      const s = .9 + rand() * .3;
      crowdData.push({ x, y, z, s, ph: rand() * 7, sp: .6 + rand() * .8 });
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
    }
    crowd.castShadow = false;
    group.add(crowd);

    // faint phone lights in the crowd
    const pts = [];
    for (let i = 0; i < 26; i++) pts.push(new THREE.Vector3(-16 + rand() * 32, 1.35 + rand() * .5, -12.2 - rand() * 2.8));
    const pg = new THREE.BufferGeometry().setFromPoints(pts);
    const pm = new THREE.PointsMaterial({ color: 0xbfe0ff, size: .1, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.Points(pg, pm));
  }

  /* ---------------- light cones / haze ---------------- */
  const cones = [];
  function lightCone(x, y, z, color, radius = 2.6, height = 9) {
    const geo = new THREE.ConeGeometry(radius, height, 24, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: .055 } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 uColor; uniform float uOpacity;
        void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 1.6); gl_FragColor = vec4(uColor, rim * uOpacity); }`
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = Math.PI;
    group.add(m);
    cones.push(m);
    return m;
  }
  lightCone(-4.2, 4.6, -1.6, 0xffb070, 2.6, 9);
  lightCone(4.2, 4.6, -1.6, 0xff9a5a, 2.6, 9);

  /* ---------------- flying dust ---------------- */
  const dust = (() => {
    const rand = mulberry32(77);
    const N = 340, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - .5) * 18;
      pos[i * 3 + 1] = rand() * 6;
      pos[i * 3 + 2] = -9 + rand() * 15;
      vel[i * 3] = (rand() - .5) * .09;
      vel[i * 3 + 1] = .04 + rand() * .1;
      vel[i * 3 + 2] = (rand() - .5) * .07;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: 0xffd9a8, size: .035, transparent: true, opacity: .55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    group.add(p);
    return { p, pos, vel, N, g };
  })();

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight(0x93a6d0, 0x1e1416, 0.28);
  scene.add(hemi);

  const key = new THREE.SpotLight(0xffe6cf, 320, 32, 0.58, 0.8, 1.6);
  key.position.set(5.5, 11, 7.5);
  key.target.position.set(0, 1.1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 30;
  scene.add(key); scene.add(key.target);

  const fill = new THREE.SpotLight(0x8fb4ff, 200, 30, 0.8, 0.9, 1.4);
  fill.position.set(-7.5, 7.5, 4.5);
  fill.target.position.set(0, 1.2, 0);
  scene.add(fill); scene.add(fill.target);

  const rimLight = new THREE.SpotLight(0xff7a44, 150, 26, 0.7, 0.9, 1.5);
  rimLight.position.set(-2.5, 4.4, -8);
  rimLight.target.position.set(0, 1.3, 0);
  scene.add(rimLight); scene.add(rimLight.target);

  const backWarm = new THREE.PointLight(0xff8a44, 26, 14, 2);
  backWarm.position.set(0, 3.4, -6.5);
  scene.add(backWarm);

  const coolRim = new THREE.SpotLight(0x7fa8ff, 210, 28, 0.62, 0.9, 1.5);
  coolRim.position.set(4.6, 5.6, -7.2);
  coolRim.target.position.set(0, 1.2, 0);
  scene.add(coolRim); scene.add(coolRim.target);

  /* ---------------- update ---------------- */
  const dummy = new THREE.Object3D();
  let crowdT = 0;

  function update(dt, time) {
    // torch flicker
    for (const f of flames) {
      const fl = 0.82 + Math.sin(time * 11 + f.seed) * 0.09 + Math.sin(time * 23 + f.seed * 3) * 0.06;
      f.light.intensity = 38 + fl * 24;
      f.sprites.forEach((s, i) => {
        const k = 0.8 + fl * .3;
        s.scale.set((.5 - i * .07) * k, (.78 - i * .095) * k * (1.05 + Math.sin(time * 9 + i) * .06), 1);
        s.position.y = f.base[1] + .94 + i * .055;
        s.material.opacity = (.9 - i * .14) * fl;
      });
    }
    // crowd sway
    crowdT += dt;
    for (let i = 0; i < crowdData.length; i++) {
      const c = crowdData[i];
      const bob = Math.sin(crowdT * c.sp + c.ph) * .035;
      dummy.position.set(c.x + Math.sin(crowdT * .6 + c.ph) * .03, c.y + bob, c.z);
      dummy.rotation.set(0, Math.sin(crowdT * .4 + c.ph) * .25, 0);
      dummy.scale.setScalar(c.s);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
    // dust drift
    const p = dust.pos;
    for (let i = 0; i < dust.N; i++) {
      p[i * 3] += dust.vel[i * 3] * dt;
      p[i * 3 + 1] += dust.vel[i * 3 + 1] * dt;
      p[i * 3 + 2] += dust.vel[i * 3 + 2] * dt;
      if (p[i * 3 + 1] > 6.2) p[i * 3 + 1] = -0.2;
      if (Math.abs(p[i * 3]) > 10) p[i * 3] *= -0.98;
      if (p[i * 3 + 2] > 6) p[i * 3 + 2] = -9;
      if (p[i * 3 + 2] < -10) p[i * 3 + 2] = 6;
    }
    dust.g.attributes.position.needsUpdate = true;
    // cone breathing
    cones.forEach((c, i) => { c.material.uniforms.uOpacity.value = .05 + Math.sin(time * .7 + i) * .012; });
  }

  const lights = [hemi, key, key.target, fill, fill.target, rimLight, rimLight.target, backWarm, coolRim, coolRim.target];
  return { group, update, lights, groundY: 0, center: new THREE.Vector3(0, 0, 0) };
}

/* ------------------------------------------------------------------ *
 *  NEON BAZAAR — a midnight market street. Wet stone, neon signs,
 *  paper lanterns and a crowd under the wires.
 * ------------------------------------------------------------------ */

function neonSignTexture(text, color = '#ff3ad0', sub = '') {
  const w = 512, h = 256;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = 'rgba(5,4,12,.92)';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = color; g.lineWidth = 5;
  g.shadowColor = color; g.shadowBlur = 26;
  g.strokeRect(16, 16, w - 32, h - 32);
  g.fillStyle = color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowBlur = 46;
  g.font = 'bold 104px serif';
  g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2);
  if (sub) {
    g.font = 'bold 34px sans-serif';
    g.shadowBlur = 22;
    g.fillText(sub, w / 2, h / 2 + 64);
  }
  return tex(c, { srgb: true });
}

function awningTexture(a = '#a8322e', b = '#efe2c8') {
  const w = 256, h = 128;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = b; g.fillRect(0, 0, w, h);
  g.fillStyle = a;
  for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 15, h);
  const shade = g.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,.42)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shade; g.fillRect(0, 0, w, h);
  return tex(c, { srgb: true });
}

function buildBazaar(renderer, scene) {
  const group = new THREE.Group();
  scene.add(group);

  scene.fog = new THREE.FogExp2(0x0a0818, 0.021);
  scene.background = new THREE.Color(0x05040d);

  const signs = [], lanterns = [], cones = [], puddles = [];
  const glowTex = radialGlowTexture(128, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');

  /* ---------------- sky ---------------- */
  {
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x04030c) },
        mid: { value: new THREE.Color(0x221046) },
        bot: { value: new THREE.Color(0x5e1b45) }
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){
          float h = normalize(vP).y;
          vec3 col = mix(bot, mid, smoothstep(-0.08, 0.28, h));
          col = mix(col, top, smoothstep(0.18, 0.75, h));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(70, 32, 20), skyMat));

    const rand = mulberry32(303);
    const N = 300, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2, y = .25 + rand() * .72, r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 62;
      pos[i * 3 + 1] = y * 62;
      pos[i * 3 + 2] = Math.sin(a) * r * 62;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd9e2ff, size: .2, transparent: true, opacity: .7, fog: false, depthWrite: false })));
  }

  /* ---------------- wet street + dais ---------------- */
  const stoneMap = stoneTexture(1024, 41); stoneMap.repeat.set(10, 10);
  const stoneBmp = stoneBump(512, 42); stoneBmp.repeat.set(10, 10);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(34, 64),
    new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .05, roughness: .52, metalness: .3, color: 0x3b4256, envMapIntensity: .35 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.36; ground.receiveShadow = true;
  group.add(ground);

  const daisMap = earthTexture(1024, 43); daisMap.repeat.set(2.4, 2.4);
  const dais = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 72),
    new THREE.MeshStandardMaterial({ map: daisMap, bumpMap: stoneBmp, bumpScale: .07, roughness: .45, metalness: .28, color: 0x413a55, envMapIntensity: .3 })
  );
  dais.rotation.x = -Math.PI / 2; dais.position.y = .002; dais.receiveShadow = true;
  group.add(dais);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.78, .4, 72, 1, true),
    new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .06, roughness: .62, metalness: .3, color: 0x2a2a3c })
  );
  rim.position.y = -.2; rim.receiveShadow = true; rim.castShadow = true;
  group.add(rim);

  const neonCyan = new THREE.MeshBasicMaterial({ color: 0x5fe8ff });
  const neonMag = new THREE.MeshBasicMaterial({ color: 0xff45c8 });
  const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(6.56, .045, 8, 96), neonCyan);
  ringOuter.rotation.x = Math.PI / 2; ringOuter.position.y = .028;
  group.add(ringOuter);
  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(5.5, .028, 8, 96), neonMag);
  ringInner.rotation.x = Math.PI / 2; ringInner.position.y = .024;
  group.add(ringInner);
  const rimStrip = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, .05, 96, 1, true), neonCyan);
  rimStrip.position.y = -.04;
  group.add(rimStrip);
  const emblem = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.05, 72), neonMag);
  emblem.rotation.x = -Math.PI / 2; emblem.position.y = .006;
  group.add(emblem);

  /* ---------------- shopfronts + neon ---------------- */
  const signDefs = [
    { x: -9.8, h: 4.9, text: 'चाय', color: '#ff45c8', sub: 'CHAI' },
    { x: -4.9, h: 4.3, text: 'समोसा', color: '#ffb04a', sub: 'SNACKS' },
    { x: 0, h: 5.4, text: 'मुक्का', color: '#5fe8ff', sub: 'MUKKALAAT' },
    { x: 4.9, h: 4.5, text: 'मिठाई', color: '#ff45c8', sub: 'SWEETS' },
    { x: 9.8, h: 5.0, text: 'खाना', color: '#7dff9a', sub: 'KHANA' }
  ];
  const facadeMat = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBmp, bumpScale: .04, roughness: .9, metalness: .05, color: 0x3c3650 });
  signDefs.forEach((s, i) => {
    const w = 5.6;
    const facade = new THREE.Mesh(new THREE.BoxGeometry(w, s.h, .9), facadeMat);
    facade.position.set(s.x, s.h / 2 - .3, -11.9);
    facade.receiveShadow = true;
    group.add(facade);

    for (let k = 0; k < 2; k++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, .85),
        new THREE.MeshBasicMaterial({ color: k ? 0xffc078 : 0xffa85a })
      );
      win.position.set(s.x - 1.15 + k * 1.6, 1.7 + (i % 2) * .3, -11.43);
      group.add(win);
      const winFrame = new THREE.Mesh(
        new THREE.PlaneGeometry(1.32, 1.02),
        new THREE.MeshStandardMaterial({ color: 0x141020, roughness: .9 })
      );
      winFrame.position.set(win.position.x, win.position.y, -11.44);
      group.add(winFrame);
    }

    const awn = new THREE.Mesh(
      new THREE.PlaneGeometry(w * .9, 1.2),
      new THREE.MeshStandardMaterial({ map: awningTexture(i % 2 ? '#266b8c' : '#a8322e'), roughness: .92, side: THREE.DoubleSide, color: 0xb9b3cc })
    );
    awn.position.set(s.x, 2.6, -11.25);
    awn.rotation.x = -.3;
    group.add(awn);

    const signMat = new THREE.MeshBasicMaterial({ map: neonSignTexture(s.text, s.color, s.sub), transparent: true, opacity: .96 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), signMat);
    board.position.set(s.x, 3.8, -11.4);
    group.add(board);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(s.color), transparent: true, opacity: .26,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    halo.scale.set(5.4, 3.4, 1);
    halo.position.set(s.x, 3.8, -11.55);
    group.add(halo);

    const rec = { mat: signMat, halo: halo.material, seed: i * 1.9 };
    if (i % 2 === 0) {
      const light = new THREE.PointLight(new THREE.Color(s.color), 30, 13, 2);
      light.position.set(s.x, 3.9, -9.4);
      group.add(light);
      rec.light = light;
    }
    signs.push(rec);
  });

  /* ---------------- wires + bulbs ---------------- */
  {
    const rows = [
      { y: 3.35, z: -4.6, color: 0x5fe8ff },
      { y: 3.9, z: -6.2, color: 0xff45c8 },
      { y: 4.45, z: -7.8, color: 0xffb04a }
    ];
    const bulbGeo = new THREE.SphereGeometry(.055, 6, 6);
    rows.forEach(row => {
      const bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: row.color }), 24);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 24; i++) {
        const t = i / 23, x = -15 + t * 30, sag = Math.sin(t * Math.PI) * .7;
        dummy.position.set(x, row.y - sag, row.z);
        dummy.updateMatrix();
        bulbs.setMatrixAt(i, dummy.matrix);
      }
      group.add(bulbs);
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push(new THREE.Vector3(-15 + t * 30, row.y - Math.sin(t * Math.PI) * .7, row.z));
      }
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x1a1626, transparent: true, opacity: .9 })
      ));
    });
  }

  /* ---------------- paper lanterns ---------------- */
  {
    const lanternTex = radialGlowTexture(128, 'rgba(255,220,160,1)', 'rgba(255,140,40,0)');
    const spots = [[-9.5, 3.3, -3.4], [-6.2, 3.1, -6.4], [6.2, 3.2, -6.2], [9.5, 3.4, -3.2], [-3.2, 3.7, -8.2], [3.4, 3.6, -8.4]];
    spots.forEach((p, i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(.22, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xffb45a, emissive: 0xff8a2a, emissiveIntensity: 1.5, roughness: .72 })
      );
      body.scale.y = 1.25;
      g.add(body);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: lanternTex, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glow.scale.set(2.4, 2.4, 1);
      g.add(glow);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 2.1, 4), new THREE.MeshBasicMaterial({ color: 0x1b1522 }));
      cord.position.y = 1.2;
      g.add(cord);
      g.position.set(p[0], p[1], p[2]);
      group.add(g);
      lanterns.push({ g, seed: i * 1.3 });
    });
  }

  /* ---------------- street clutter ---------------- */
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: .85, bumpMap: stoneBmp, bumpScale: .02 });
  [[-8.8, -2.6, .9], [-9.6, -1.2, .7], [8.9, -2.8, .8], [9.7, -1.4, 1.05]].forEach(([x, z, s]) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * .8, s), wood);
    box.position.set(x, s * .4 - .34, z);
    box.rotation.y = x * .3;
    box.castShadow = true; box.receiveShadow = true;
    group.add(box);
  });
  [[-7.6, -7.5], [7.7, -7.2]].forEach(([x, z]) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.36, .32, .95, 12), wood);
    barrel.position.set(x, .13, z);
    barrel.castShadow = true;
    group.add(barrel);
  });

  /* ---------------- crowd ---------------- */
  let crowd, crowdHeads, crowdData = [];
  {
    const rand = mulberry32(404);
    const geo = new THREE.CapsuleGeometry(.17, .6, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x141020, roughness: 1, metalness: 0 });
    const N = 64;
    crowd = new THREE.InstancedMesh(geo, mat, N);
    crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crowd.frustumCulled = false;
    crowdHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 6, 6), mat, N);
    crowdHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crowdHeads.frustumCulled = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const x = -16 + rand() * 32;
      const z = -10.2 - rand() * 1.7;
      const y = -.02 + rand() * .05, s = .78 + rand() * .5, hs = .92 + rand() * .5;
      crowdData.push({ x, y, z, s, hs, ph: rand() * 7, sp: .5 + rand() * .7 });
      dummy.position.set(x, y, z);
      dummy.scale.set(s, s * hs, s);
      dummy.rotation.y = rand() * .6 - .3;
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, y + .47 * s * hs + .07 * s, z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      crowdHeads.setMatrixAt(i, dummy.matrix);
    }
    group.add(crowd);
    group.add(crowdHeads);
  }

  /* ---------------- neon puddles ---------------- */
  [[-7.4, -1.2, 2.2, 0x5fe8ff], [7.6, -2.2, 2.6, 0xff45c8], [-8.2, -6.2, 1.8, 0x5fe8ff], [8.4, -6.6, 2.0, 0xffb04a]].forEach(([x, z, s, c], i) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(s, 28),
      new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, .009, z);
    m.scale.set(1, .55, 1);
    group.add(m);
    puddles.push({ m, seed: i * 1.7 });
  });

  /* ---------------- light cones ---------------- */
  function lightCone(x, y, z, color, radius = 2.4, height = 9) {
    const geo = new THREE.ConeGeometry(radius, height, 24, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: .05 } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 uColor; uniform float uOpacity;
        void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 1.6); gl_FragColor = vec4(uColor, rim * uOpacity); }`
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = Math.PI;
    group.add(m);
    cones.push(m);
  }
  lightCone(-3.6, 4.8, -2.2, 0x5fe8ff, 2.4, 9);
  lightCone(3.6, 4.8, -2.2, 0xff45c8, 2.4, 9);

  /* ---------------- drifting motes ---------------- */
  const dust = (() => {
    const rand = mulberry32(88);
    const N = 260, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - .5) * 20;
      pos[i * 3 + 1] = rand() * 6;
      pos[i * 3 + 2] = -12 + rand() * 16;
      vel[i * 3] = (rand() - .5) * .07;
      vel[i * 3 + 1] = .03 + rand() * .08;
      vel[i * 3 + 2] = (rand() - .5) * .05;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xbfe0ff, size: .032, transparent: true, opacity: .5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    p.frustumCulled = false;
    group.add(p);
    return { p, pos, vel, N, g };
  })();

  /* ---------------- rain ---------------- */
  const rain = (() => {
    const rand = mulberry32(717);
    const N = 520;
    const pos = new Float32Array(N * 6);
    const drops = [];
    for (let i = 0; i < N; i++) {
      const d = {
        x: (rand() - .5) * 24,
        y: rand() * 12,
        z: -12 + rand() * 18,
        len: .2 + rand() * .3,
        spd: 9 + rand() * 5
      };
      drops.push(d);
      const o = i * 6;
      pos[o] = d.x; pos[o + 1] = d.y; pos[o + 2] = d.z;
      pos[o + 3] = d.x + .05; pos[o + 4] = d.y - d.len; pos[o + 5] = d.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0xa9c8ff, transparent: true, opacity: .3,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    lines.frustumCulled = false;
    group.add(lines);
    return { g, pos, drops, N };
  })();

  /* splash ripples */
  const splashes = [];
  let splashTimer = 0;
  {
    const geo = new THREE.RingGeometry(.055, .08, 10);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xa9d8ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      group.add(m);
      splashes.push({ m, t: 1, dur: .45, x: 0, y: .012, z: 0 });
    }
  }

  /* distant lightning */
  const boltLight = new THREE.DirectionalLight(0xcfe0ff, 0);
  boltLight.position.set(-7, 13, -9);
  scene.add(boltLight);
  const bgBase = new THREE.Color(0x05040d);
  const fogBase = new THREE.Color(0x0a0818);
  const boltColor = new THREE.Color(0xbfd4ff);
  let boltWait = 5 + Math.random() * 6;
  let boltT = -1;
  let lightning = 0;

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight(0x7d8cff, 0x160f22, 0.42);
  scene.add(hemi);

  const key = new THREE.SpotLight(0xe8f0ff, 340, 32, 0.6, 0.85, 1.6);
  key.position.set(4.8, 10.5, 7.2);
  key.target.position.set(0, 1.1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 30;
  scene.add(key); scene.add(key.target);

  const fill = new THREE.SpotLight(0x35d8ff, 230, 26, 0.8, 0.9, 1.5);
  fill.position.set(-7.5, 6.2, 4.2);
  fill.target.position.set(0, 1.2, 0);
  scene.add(fill); scene.add(fill.target);

  const rimLight = new THREE.SpotLight(0xff45c8, 165, 26, 0.78, 0.9, 1.5);
  rimLight.position.set(6.8, 4.2, -8.2);
  rimLight.target.position.set(0, 1.3, 0);
  scene.add(rimLight); scene.add(rimLight.target);

  const shopGlow = new THREE.PointLight(0xffa54a, 18, 16, 2);
  shopGlow.position.set(0, 2.6, -9.5);
  scene.add(shopGlow);

  /* ---------------- update ---------------- */
  const dummy = new THREE.Object3D();
  let crowdT = 0;

  function update(dt, time) {
    for (const s of signs) {
      const fl = .9 + Math.sin(time * 17 + s.seed) * .05 + Math.sin(time * 5.3 + s.seed * 2) * .05;
      s.mat.opacity = clamp(fl, .5, 1);
      s.halo.opacity = .24 * fl;
      if (s.light) s.light.intensity = 30 * fl;
    }
    for (const l of lanterns) {
      l.g.rotation.z = Math.sin(time * .8 + l.seed) * .05;
      l.g.rotation.x = Math.sin(time * .63 + l.seed * 1.7) * .04;
    }
    crowdT += dt;
    for (let i = 0; i < crowdData.length; i++) {
      const c = crowdData[i];
      const bob = Math.sin(crowdT * c.sp + c.ph) * .03;
      dummy.position.set(c.x + Math.sin(crowdT * .5 + c.ph) * .04, c.y + bob, c.z);
      dummy.rotation.set(0, Math.sin(crowdT * .35 + c.ph) * .22, 0);
      dummy.scale.set(c.s, c.s * c.hs, c.s);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
      dummy.position.y = c.y + bob + .47 * c.s * c.hs + .07 * c.s;
      dummy.scale.setScalar(c.s);
      dummy.updateMatrix();
      crowdHeads.setMatrixAt(i, dummy.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
    crowdHeads.instanceMatrix.needsUpdate = true;

    const p = dust.pos;
    for (let i = 0; i < dust.N; i++) {
      p[i * 3] += dust.vel[i * 3] * dt;
      p[i * 3 + 1] += dust.vel[i * 3 + 1] * dt;
      p[i * 3 + 2] += dust.vel[i * 3 + 2] * dt;
      if (p[i * 3 + 1] > 6.2) p[i * 3 + 1] = -0.2;
      if (Math.abs(p[i * 3]) > 11) p[i * 3] *= -0.98;
      if (p[i * 3 + 2] > 5) p[i * 3 + 2] = -12;
      if (p[i * 3 + 2] < -13) p[i * 3 + 2] = 4;
    }
    dust.g.attributes.position.needsUpdate = true;

    // rain fall + wind drift
    const rp = rain.pos;
    for (let i = 0; i < rain.N; i++) {
      const d = rain.drops[i];
      d.y -= d.spd * dt;
      d.x += 1.1 * dt;
      if (d.y < -.35) {
        d.y = 10 + Math.random() * 3;
        d.x = (Math.random() - .5) * 24;
        d.z = -12 + Math.random() * 18;
      }
      const o = i * 6;
      rp[o] = d.x; rp[o + 1] = d.y; rp[o + 2] = d.z;
      rp[o + 3] = d.x + .05; rp[o + 4] = d.y - d.len; rp[o + 5] = d.z;
    }
    rain.g.attributes.position.needsUpdate = true;

    // splashes
    splashTimer -= dt;
    if (splashTimer <= 0) {
      splashTimer = .03 + Math.random() * .05;
      const s = splashes.find(o => o.t >= o.dur);
      if (s) {
        s.t = 0;
        s.dur = .38 + Math.random() * .25;
        s.x = (Math.random() - .5) * 18;
        s.z = -10 + Math.random() * 14;
        s.y = Math.hypot(s.x, s.z) < 6.2 ? .012 : -.35;
        s.m.visible = true;
      }
    }
    for (const s of splashes) {
      if (s.t >= s.dur) { s.m.visible = false; continue; }
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      s.m.position.set(s.x, s.y, s.z);
      s.m.scale.setScalar(.6 + k * 3.2);
      s.m.material.opacity = (1 - k) * .42;
    }

    // lightning flash: double strike, then a long fade
    if (boltT >= 0) {
      boltT += dt;
      if (boltT < .09) lightning = 1;
      else if (boltT < .16) lightning = .12;
      else if (boltT < .3) lightning = .8;
      else if (boltT < .95) lightning = Math.max(0, .5 * (1 - (boltT - .3) / .65));
      if (boltT > .95) { boltT = -1; boltWait = 6 + Math.random() * 9; }
    } else {
      boltWait -= dt;
      if (boltWait <= 0) boltT = 0;
      lightning = Math.max(0, lightning - dt * 5);
    }
    boltLight.intensity = lightning * 3.4;
    hemi.intensity = .42 + lightning * 1.5;
    scene.background.copy(bgBase).lerp(boltColor, lightning * .5);
    scene.fog.color.copy(fogBase).lerp(boltColor, lightning * .3);

    cones.forEach((c, i) => { c.material.uniforms.uOpacity.value = .05 + Math.sin(time * .8 + i) * .012; });
    puddles.forEach((pu, i) => { pu.m.material.opacity = .15 + Math.sin(time * 1.2 + pu.seed) * .05; });
  }

  const lights = [hemi, key, key.target, fill, fill.target, rimLight, rimLight.target, shopGlow, boltLight];
  return { group, update, lights, groundY: 0, center: new THREE.Vector3(0, 0, 0), debugBolt: () => { boltT = 0; } };
}

/* ------------------------------------------------------------------ *
 *  stage registry
 * ------------------------------------------------------------------ */

export const STAGES = [
  {
    id: 'akhada', name: 'THE OLD AKHADA', mono: 'अ',
    tag: 'MUD · TORCHLIGHT · CROWD',
    blurb: 'A walled kushti pit. Torch smoke, chalk dust and a crowd that has seen every trick.',
    colors: ['#3a1d16', '#ffb066'], chip: 'AKHADA · NIGHT'
  },
  {
    id: 'bazaar', name: 'NEON BAZAAR', mono: 'ब',
    tag: 'RAIN · NEON · LANTERNS',
    blurb: 'A midnight market street. Wet stone, buzzing signs and nobody closing up early.',
    colors: ['#161033', '#ff4fd8'], chip: 'BAZAAR · MIDNIGHT'
  }
];

const BUILDERS = { akhada: buildAkhada, bazaar: buildBazaar };

function disposeTree(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k in m) {
        const v = m[k];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose();
    }
  });
}

export function createArena(renderer, scene, id = 'akhada') {
  const build = BUILDERS[id] || buildAkhada;
  const a = build(renderer, scene);
  a.key = id;
  a.dispose = () => {
    scene.remove(a.group);
    for (const l of a.lights || []) {
      scene.remove(l);
      if (l.target) scene.remove(l.target);
      if (l.dispose) l.dispose();
    }
    disposeTree(a.group);
  };
  return a;
}
