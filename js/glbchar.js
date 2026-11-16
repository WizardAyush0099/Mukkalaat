import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ------------------------------------------------------------------
   GLB-backed fighter.

   The character model (Characters/cid_acp_pradhuman_3d_model_free.glb) is a
   skinned humanoid with no animation clips of its own, so this module drives
   its skeleton from the same pose objects the procedural fighters use
   (hips / spine / chest / head / shoulders / elbows / wrists / hips / knees /
   ankles), which means every move, hit reaction, walk cycle and win pose in
   game.js works unchanged.

   Each pose value is a rotation about a *world* axis at the joint, so it is
   converted into the bone's own space with
       local = restLocal * (restWorld^-1 * R * restWorld)
   which is exact for any rest orientation the rig happens to have.
   ------------------------------------------------------------------ */

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);

const _qx = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _qz = new THREE.Quaternion();
const _r = new THREE.Quaternion(), _tmp = new THREE.Quaternion(), _v = new THREE.Vector3();
const _p = new THREE.Vector3(), _fq = new THREE.Quaternion();

/* world-frame rotation from the game's YXZ euler, same order as the primitive rig */
function worldRot(out, x, y, z) {
  _qx.setFromAxisAngle(AX, x);
  _qy.setFromAxisAngle(AY, y);
  _qz.setFromAxisAngle(AZ, z);
  return out.copy(_qy).multiply(_qx).multiply(_qz);
}

const BONE_PATTERNS = [
  ['hips', /^Hips/],
  ['spine', /^Spine_/],
  ['spine1', /^Spine1_/],
  ['spine2', /^Spine2_/],
  ['neck', /^Neck_/],
  ['head', /^Head_/],
  ['shoulderL', /^LeftShoulder/],
  ['armL', /^LeftArm_/],
  ['elbowL', /^LeftForeArm_/],
  ['handL', /^LeftHand_/],
  ['shoulderR', /^RightShoulder/],
  ['armR', /^RightArm_/],
  ['elbowR', /^RightForeArm_/],
  ['handR', /^RightHand_/],
  ['thighL', /^LeftUpLeg/],
  ['kneeL', /^LeftLeg_/],
  ['ankleL', /^LeftFoot/],
  ['toeL', /^LeftToeBase/],
  ['thighR', /^RightUpLeg/],
  ['kneeR', /^RightLeg_/],
  ['ankleR', /^RightFoot/],
  ['toeR', /^RightToeBase/]
];

const FINGER_RE = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([1-4])/;

/* soft contact shadow, so the fighter sits on the arena floor instead of floating */
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,.85)');
  grad.addColorStop(.55, 'rgba(0,0,0,.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* arm poses were authored for the primitives, so they are eased slightly and the
   wrists are held almost neutral - a real wrist snaps at those angles */
const TUNE = { shoulder: .9, elbow: .92, wrist: .3 };

export function createGlbFighter(def) {
  const root = new THREE.Group();
  const bodyGrp = new THREE.Group();
  const scaleGrp = new THREE.Group();
  root.add(bodyGrp);
  bodyGrp.add(scaleGrp);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: .8 })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .015;
  contact.renderOrder = 1;
  root.add(contact);

  const api = {
    root,
    def,
    ready: false,
    error: null,
    applyPose, flash, setAura, worldPos,
    dispose
  };

  let rig = null;             // { name: { bone, restLocal, restWorld, restWorldInv, restPos } }
  let fingers = [];           // [{ bone, restLocal, side, seg }]
  let hipsRestParentInv = new THREE.Quaternion();
  let scale = 1;
  let restFootY = 0;
  let pendingPose = null;
  let auraValue = 0;
  let flashValue = 0;
  let groundY = null;
  let frameCount = 0;
  const flashMats = [];

  /* game.js asks the model where a body part is (for hit sparks); accept the
     primitive rig's joint names as well */
  const POS_KEY = { chest: 'spine1', knL: 'kneeL', knR: 'kneeR', anL: 'ankleL', anR: 'ankleR', shL: 'armL', shR: 'armR' };
  function worldPos(node, target = new THREE.Vector3()) {
    if (!rig) return target.set(root.position.x, 1.1, 0);
    const entry = rig[POS_KEY[node] || node] || rig[node] || rig.spine2 || rig.spine || rig.hips;
    return entry ? entry.bone.getWorldPosition(target) : target.set(root.position.x, 1.1, 0);
  }

  const gltfRoot = new THREE.Group();
  scaleGrp.add(gltfRoot);

  new GLTFLoader().load(def.model, gltf => {
    const model = gltf.scene;
    model.updateMatrixWorld(true);

    /* --- normalise: face +Z, feet on the floor, the game's body height --- */
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetH = def.build.height / 1.0;
    scale = targetH / Math.max(1e-4, size.y);
    scaleGrp.scale.setScalar(scale);
    scaleGrp.position.set(
      -(box.min.x + box.max.x) * .5 * scale,
      -box.min.y * scale,
      -(box.min.z + box.max.z) * .5 * scale
    );
    gltfRoot.add(model);

    model.traverse(o => {
      if (!o.isMesh) return;
      /* ten skinned meshes re-skinned into the shadow map every frame is the
         single most expensive thing this model can do; the soft contact shadow
         under his feet grounds him instead */
      o.castShadow = false;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        m.side = THREE.FrontSide;
        /* material pass: suit gets a slight sheen, skin stays matte, glass is glossy */
        const nm = (m.name || '').toLowerCase();
        if (m.isMeshStandardMaterial) {
          if (nm.includes('outfit')) { m.roughness = .46; m.metalness = .08; }
          else if (nm.includes('cornea') || nm.includes('eyeball')) { m.roughness = .12; m.metalness = 0; }
          else if (nm.includes('teeth')) { m.roughness = .32; m.metalness = 0; }
          else { m.roughness = .74; m.metalness = 0; }
        }
        if ('envMapIntensity' in m) m.envMapIntensity = 1.15;
        if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 8; }
        if (m.normalMap) m.normalScale.multiplyScalar(1.15);
        flashMats.push({ m, emissive: m.emissive ? m.emissive.clone() : null, base: m.emissiveIntensity ?? 1 });
      }
    });

    /* --- collect the bones we drive --- */
    const byName = {};
    model.traverse(o => { if (o.isBone || o.type === 'Bone') byName[o.name] = o; });

    /* ---- bake the T-pose into something a fighting game can pose ----------
       The arms are authored straight out with the palms on the floor. Dropping
       them is split between the clavicle and the upper arm, so the deltoid is
       not sheared out of the shoulder, and each hand is then rolled about its
       finger axis until the palm faces the body - which also turns the knuckles
       forward, where a punch needs them. */
    const DOWN = new THREE.Vector3(0, -1, 0);
    const findBone = re => {
      const n = Object.keys(byName).find(name => re.test(name));
      return n ? byName[n] : null;
    };

    /* rotate a bone about its own origin by a world-space rotation */
    function swingBone(bone, q) {
      if (!bone) return;
      const pw = new THREE.Quaternion();
      if (bone.parent) bone.parent.getWorldQuaternion(pw); else pw.identity();
      bone.quaternion.premultiply(pw.clone().invert().multiply(q).multiply(pw));
    }

    /* fingers / palm frame of one hand in world space at the current bind pose */
    function handFrame(side) {
      const hand = findBone(side > 0 ? /^LeftHand_/ : /^RightHand_/);
      const mid = findBone(side > 0 ? /^LeftHandMiddle1/ : /^RightHandMiddle1/);
      const thumb = findBone(side > 0 ? /^LeftHandThumb1/ : /^RightHandThumb1/);
      if (!hand || !mid || !thumb) return null;
      const hp = new THREE.Vector3(), mp = new THREE.Vector3(), tp = new THREE.Vector3();
      hand.getWorldPosition(hp);
      mid.getWorldPosition(mp);
      thumb.getWorldPosition(tp);
      const f = mp.sub(hp).normalize();
      const n = new THREE.Vector3().crossVectors(f, tp.sub(hp).normalize());
      if (n.lengthSq() < 1e-8) return null;
      n.normalize();
      /* mirrored joints flip the cross product, so the palms are made to agree
         with the bind pose, where a T-pose hand faces the floor */
      if (n.y > 0) n.negate();
      return { hand, f, n };
    }

    root.updateMatrixWorld(true);
    for (const side of [1, -1]) {
      const armBone = findBone(side > 0 ? /^LeftArm_/ : /^RightArm_/);
      const hand = findBone(side > 0 ? /^LeftHand_/ : /^RightHand_/);
      const clav = findBone(side > 0 ? /^LeftShoulder/ : /^RightShoulder/);
      if (!armBone || !hand) continue;

      const a = new THREE.Vector3(), b = new THREE.Vector3();
      armBone.getWorldPosition(a);
      hand.getWorldPosition(b);
      const dir = b.sub(a).normalize();
      const full = new THREE.Quaternion().setFromUnitVectors(dir, DOWN);
      const collarbone = new THREE.Quaternion().slerp(full, .34);
      if (clav) { swingBone(clav, collarbone); root.updateMatrixWorld(true); }
      swingBone(armBone, clav ? full.clone().multiply(collarbone.clone().invert()) : full);
      root.updateMatrixWorld(true);

      /* palm toward the body */
      const frame = handFrame(side);
      if (!frame) continue;
      const target = new THREE.Vector3(-side, 0, 0);
      const axis = new THREE.Vector3().crossVectors(frame.n, target);
      if (axis.lengthSq() < 1e-8) continue;
      axis.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, frame.n.dot(target))));
      if (angle > 1e-3) {
        swingBone(hand, new THREE.Quaternion().setFromAxisAngle(axis, angle * .92));
        root.updateMatrixWorld(true);
      }
    }
    root.updateMatrixWorld(true);

    const restWorld = new THREE.Quaternion();
    rig = {};
    for (const [key, re] of BONE_PATTERNS) {
      const name = Object.keys(byName).find(n => re.test(n));
      if (!name) continue;
      const bone = byName[name];
      bone.getWorldQuaternion(restWorld);
      const parentWorld = new THREE.Quaternion();
      if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);
      rig[key] = {
        bone,
        restLocal: bone.quaternion.clone(),
        restWorld: restWorld.clone(),
        restWorldInv: restWorld.clone().invert(),
        parentWorld: parentWorld.clone(),
        parentWorldInv: parentWorld.clone().invert(),
        restPos: bone.position.clone()
      };
    }

    /* ---- fingers ---------------------------------------------------------
       Each knuckle folds about its own hinge, taken from the bone's direction
       and the palm normal, so the same numbers curl a fist on either hand
       instead of splaying the fingers out like claws. */
    const palmFrames = { 1: handFrame(1), '-1': handFrame(-1) };
    const bindQuat = new THREE.Quaternion();
    const CURL = [1.15, 1.32, .8, .5];
    const CURL_THUMB = [.55, .65, .45, .3];
    for (const name in byName) {
      const m = FINGER_RE.exec(name);
      if (!m) continue;
      const bone = byName[name];
      const side = m[1] === 'Left' ? 1 : -1;
      const frame = palmFrames[side];
      if (!frame) continue;
      const seg = Math.min(4, parseInt(m[3], 10));
      const isThumb = m[2] === 'Thumb';

      bone.getWorldQuaternion(bindQuat);
      const inv = bindQuat.clone().invert();
      const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
      bone.getWorldPosition(p0);
      const child = bone.children.find(c => c.isBone);
      let dir;
      if (child) { child.getWorldPosition(p1); dir = p1.clone().sub(p0); }
      else if (bone.parent) { bone.parent.getWorldPosition(p1); dir = p0.clone().sub(p1); }
      if (!dir || dir.lengthSq() < 1e-10) continue;

      const dirLocal = dir.normalize().applyQuaternion(inv).normalize();
      const nLocal = frame.n.clone().applyQuaternion(inv).normalize();
      const hinge = new THREE.Vector3().crossVectors(dirLocal, nLocal);
      if (hinge.lengthSq() < 1e-8) continue;
      hinge.normalize();

      fingers.push({
        bone,
        restLocal: bone.quaternion.clone(),
        hinge,
        curl: (isThumb ? CURL_THUMB : CURL)[seg - 1] || .5,
        side
      });
    }

    if (rig.hips) {
      const parent = rig.hips.bone.parent;
      if (parent) {
        parent.getWorldQuaternion(_tmp);
        hipsRestParentInv.copy(_tmp).invert();
      }
    }

    /* foot height at rest, used to keep the planted foot on the floor */
    root.updateMatrixWorld(true);
    restFootY = lowestFoot();

    api.ready = true;
    if (pendingPose) applyPose(pendingPose);
  }, undefined, err => {
    api.error = err;
    console.error('GLB load failed', def.model, err);
  });

  function lowestFoot() {
    let y = Infinity;
    for (const key of ['ankleL', 'ankleR', 'toeL', 'toeR']) {
      const b = rig && rig[key] && rig[key].bone;
      if (!b) continue;
      b.getWorldPosition(_p);
      root.worldToLocal(_p);
      y = Math.min(y, _p.y);
    }
    return Number.isFinite(y) ? y : 0;
  }

  /* rotates a joint about a world axis through its own origin:
     local = (parentWorld^-1 * R * parentWorld) * restLocal
     used for the spine, head and legs, which hang down in the bind pose */
  function rotBone(entry, x, y, z) {
    if (!entry) return;
    worldRot(_r, x, y, z);
    _tmp.copy(entry.parentWorldInv).multiply(_r).multiply(entry.parentWorld);
    entry.bone.quaternion.copy(_tmp).multiply(entry.restLocal);
  }

  /* same as rotBone, but with a ready-made world rotation */
  function rotBoneWorld(entry, R) {
    if (!entry) return;
    _r.copy(R);
    _tmp.copy(entry.parentWorldInv).multiply(_r).multiply(entry.parentWorld);
    entry.bone.quaternion.copy(_tmp).multiply(entry.restLocal);
  }

  /* rotates a joint about an axis fixed to the joint itself:
     local = restLocal * (restWorld^-1 * R * restWorld)
     used for the arms, which are in a T-pose in the bind pose */
  function rotBoneLocal(entry, x, y, z) {
    if (!entry) return;
    worldRot(_r, x, y, z);
    _tmp.copy(entry.restWorldInv).multiply(_r).multiply(entry.restWorld);
    entry.bone.quaternion.copy(entry.restLocal).multiply(_tmp);
  }

  /* one pose value set per frame */
  function applyPose(p) {
    if (!rig) { pendingPose = p; return; }
    pendingPose = p;

    bodyGrp.rotation.set(p.bodyRot[0], p.bodyRot[1], p.bodyRot[2]);
    bodyGrp.position.z = p.drive || 0;

    /* hips: rotation + vertical shift (crouch, landing) */
    if (rig.hips) {
      rotBone(rig.hips, p.hips[0], p.hips[1], p.hips[2]);
      _v.set(0, (p.hy || 0) / (scale || 1), 0).applyQuaternion(hipsRestParentInv);
      rig.hips.bone.position.copy(rig.hips.restPos).add(_v);
    }
    rotBone(rig.spine, p.spine[0], p.spine[1], p.spine[2]);
    rotBone(rig.spine1, p.chest[0] * .55, p.chest[1] * .55, p.chest[2] * .55);
    rotBone(rig.spine2, p.chest[0] * .45, p.chest[1] * .45, p.chest[2] * .45);
    rotBone(rig.head, p.head[0], p.head[1], p.head[2]);

    rotBone(rig.armL, p.shL[0] * TUNE.shoulder, p.shL[1] * TUNE.shoulder, p.shL[2] * TUNE.shoulder);
    /* the pose data mirrors abduction/twist for the right arm, so the axes are
       flipped here to keep both shoulders moving symmetrically */
    rotBone(rig.armR, p.shR[0] * TUNE.shoulder, -p.shR[1] * TUNE.shoulder, -p.shR[2] * TUNE.shoulder);
    rotBone(rig.elbowL, p.elL * TUNE.elbow, 0, 0);
    rotBone(rig.elbowR, p.elR * TUNE.elbow, 0, 0);
    rotBone(rig.handL, p.wrL[0] * TUNE.wrist, p.wrL[1] * TUNE.wrist, p.wrL[2] * TUNE.wrist);
    rotBone(rig.handR, p.wrR[0] * TUNE.wrist, p.wrR[1] * TUNE.wrist, p.wrR[2] * TUNE.wrist);

    rotBone(rig.thighL, p.hipL[0], p.hipL[1], p.hipL[2]);
    rotBone(rig.thighR, p.hipR[0], p.hipR[1], p.hipR[2]);
    rotBone(rig.kneeL, p.knL, 0, 0);
    rotBone(rig.kneeR, p.knR, 0, 0);
    rotBone(rig.ankleL, p.anL, 0, 0);
    rotBone(rig.ankleR, p.anR, 0, 0);

    /* hands close into fists and open again for grabs, from the pose's grip */
    for (const f of fingers) {
      const grip = Math.max(0, Math.min(1, f.side > 0 ? p.gripL : p.gripR));
      _fq.setFromAxisAngle(f.hinge, -f.curl * grip);
      f.bone.quaternion.copy(f.restLocal).multiply(_fq);
    }

    /* contact shadow stays flat on the arena floor even while airborne */
    contact.position.y = .015 - root.position.y;
    contact.scale.setScalar(.95);

    /* keep the planted foot on the floor - the offset barely changes between
       frames, so it is refreshed every other call instead of every frame */
    if (!p.air) {
      if ((frameCount++ & 1) === 0 || groundY === null) {
        bodyGrp.updateMatrixWorld(true);
        groundY = restFootY - lowestFoot();
      }
      bodyGrp.position.y = groundY;
    } else {
      bodyGrp.position.y = 0;
      groundY = null;
    }
    applyFlash();
  }

  function flash(v) {
    flashValue = typeof v === 'number' ? v : 0;
    applyFlash();
  }

  function applyFlash() {
    const f = Math.max(flashValue, 0), a = Math.max(auraValue, 0);
    for (const entry of flashMats) {
      const m = entry.m;
      if (!m.emissive) continue;
      if (f > 0.001) {
        m.emissive.setRGB(1, .96, .9);
        m.emissiveIntensity = f * .9;
      } else if (a > 0.001) {
        m.emissive.setRGB(.95, .14, .08);
        m.emissiveIntensity = a * .35;
      } else {
        if (entry.emissive) m.emissive.copy(entry.emissive);
        m.emissiveIntensity = entry.base;
      }
    }
    if (contact) contact.material.opacity = .8 * (1 - a * .5);
  }

  function setAura(v) {
    auraValue = v;
    applyFlash();
  }

  function dispose() {
    const geos = new Set(), mats = new Set();
    root.traverse(o => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    });
    geos.forEach(g => g.dispose());
    mats.forEach(m => m.dispose());
  }

  return api;
}
