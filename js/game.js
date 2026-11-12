import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRenderer, createEnvironment } from './env.js';
import { createArena, STAGES } from './arena.js';
import { createFX, createAudio } from './fx.js';
import { CHARACTERS, buildFighter, poseFor, fighterClip, blendPose, STANCE, P } from './character.js';
import { clamp, lerp, rnd, radialGlowTexture } from './util.js';

const $ = s => document.querySelector(s);
const canvas = $('#scene');

/* =========================================================
   boot
   ========================================================= */
let renderer, scene, camera, composer, bloom, arena, fx, audio;
const clockState = { t: 0 };

try {
  renderer = createRenderer(canvas);
  scene = new THREE.Scene();
  scene.environment = createEnvironment(renderer);
  camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 140);

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.68, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  arena = createArena(renderer, scene);
  fx = createFX(scene);
  audio = createAudio();
} catch (e) {
  console.error(e);
  const err = $('#err');
  if (err) { err.classList.add('open'); $('#errMsg').textContent = 'Could not start the arena: ' + (e.message || e); }
  throw e;
}

/* =========================================================
   game state
   ========================================================= */
const S = {
  mode: 'title',
  phase: 'none',
  round: 1,
  time: 60,
  introT: 0,
  endTimer: 0,
  saidFight: false,
  locked: true,
  hitstop: 0,
  slowTimer: 0,
  timeScale: 1,
  shake: 0,
  zoom: 0,
  paused: false,
  selected: 0,
  stage: 'akhada',
  stageIndex: 0,
  difficulty: 'normal',
  cpuIndex: 2,
  comboShow: 0
};

const DIFF = {
  easy: { think: .85, jitter: .6, block: .16, aggr: .45, dmg: .85, speed: .85 },
  normal: { think: .5, jitter: .45, block: .4, aggr: .68, dmg: 1, speed: 1 },
  hard: { think: .32, jitter: .28, block: .66, aggr: .86, dmg: 1.08, speed: 1.1 }
};

const MOVES = {
  jab: { clip: 'jab', dur: .34, hit: [.26, .40], dmg: 4, range: 1.62, kb: 1.3, stun: .26, chain: 'cross', power: .75 },
  cross: { clip: 'cross', dur: .44, hit: [.3, .46], dmg: 6, range: 1.68, kb: 2.1, stun: .33, chain: 'uppercut', power: 1 },
  uppercut: { clip: 'uppercut', dur: .62, hit: [.34, .5], dmg: 9, range: 1.52, kb: 2.3, stun: .45, launch: true, power: 1.35 },
  kick: { clip: 'kick', dur: .62, hit: [.36, .54], dmg: 9, range: 2.0, kb: 3.2, stun: .42, power: 1.4 },
  sweep: { clip: 'sweep', dur: .72, hit: [.4, .58], dmg: 7, range: 1.95, low: true, knockdown: true, kb: 2, power: 1.1 },
  airkick: { clip: 'airkick', dur: .62, hit: [.1, .55], dmg: 8, range: 1.9, kb: 2.4, stun: .38, power: 1.2 },
  grab: { clip: 'grab', dur: .9, hit: [.3, .44], dmg: 11, range: 1.12, kb: 3.4, throw: true, knockdown: true, power: 1.5 },
  super: {
    clip: 'super', dur: 2.25, superMove: true, range: 2.3,
    hits: [
      { at: [.46, .53], dmg: 4, range: 2.3, power: .8 },
      { at: [.535, .59], dmg: 4, range: 2.3, power: .8 },
      { at: [.6, .665], dmg: 6, range: 2.3, power: 1.1 },
      { at: [.72, .81], dmg: 11, range: 2.6, power: 1.8, big: true }
    ]
  }
};

/* =========================================================
   fighters
   ========================================================= */
let F = [];
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

/* soft contact shadow under each fighter, so they sit on the pit instead of floating */
const blobTex = radialGlowTexture(128, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)');
const blobs = [0, 1].map(() => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 1.25),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: .48, depthWrite: false, color: 0x000000 })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  scene.add(m);
  return m;
});

function disposeModel(model) {
  const geos = new Set(), mats = new Set();
  model.root.traverse(o => {
    if (o.geometry) geos.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
  });
  geos.forEach(g => g.dispose());
  mats.forEach(m => m.dispose());
}

function makeFighter(def, side, x) {
  const model = buildFighter(def);
  scene.add(model.root);
  const f = {
    def, model, side, x, homeX: x, y: 0, vy: 0, vx: 0,
    facing: side === 0 ? 1 : -1, yaw: side === 0 ? Math.PI / 2 : -Math.PI / 2,
    health: 100, meter: 0, wins: 0,
    state: 'idle', stateT: 0, animT: Math.random() * 2, walkPhase: Math.random(),
    action: null, nextMove: null, stun: 0, hurtClip: 'hurtHigh',
    blocking: false, crouch: false, air: false, invuln: 0,
    pose: P(STANCE), snap: true, flash: 0, aura: 0,
    aiTimer: rnd(.1, .6), aiIntent: null,
    combo: 0, comboT: 0, dmgMul: 1, speedMul: 1, landed: false
  };
  model.applyPose(f.pose);
  return f;
}

function setFighters(defA, defB) {
  for (const f of F) { scene.remove(f.model.root); disposeModel(f.model); }
  F = [makeFighter(defA, 0, -1.75), makeFighter(defB, 1, 1.75)];
  F[0].wins = 0; F[1].wins = 0;
  F[0].dmgMul = 1;
  F[1].dmgMul = DIFF[S.difficulty].dmg;
  F[0].speedMul = .85 + defA.stats.SPEED * .022;
  F[1].speedMul = (.85 + defB.stats.SPEED * .022) * DIFF[S.difficulty].speed;
  F.forEach(f => {
    f.model.root.position.set(f.x, 0, 0);
    f.model.root.rotation.y = f.yaw;
  });
}

const other = f => f === F[0] ? F[1] : F[0];

/* ---------------- pose ---------------- */
function poseTarget(f) {
  switch (f.state) {
    case 'intro': return fighterClip(f.def, 'intro', clamp(f.stateT / 1.1, 0, 1));
    case 'walk': return poseFor(f.moveBack ? 'walkB' : 'walkF', f.walkPhase % 1);
    case 'crouch': return poseFor('crouch', (f.animT * .45) % 1);
    case 'block': return poseFor('block', 0);
    case 'blockstun': return poseFor('blockstun', clamp(f.stateT / .3, 0, 1));
    case 'jump': return poseFor(f.vy > 0 ? 'jump' : 'jumpFall', 0);
    case 'attack': return poseFor(f.action.mv.clip, clamp(f.action.t / f.action.mv.dur, 0, 1));
    case 'hit': return poseFor(f.hurtClip, clamp(f.stateT / .48, 0, 1));
    case 'knockdown': return poseFor('knockdown', clamp(f.stateT / .95, 0, 1));
    case 'getup': return poseFor('getup', clamp(f.stateT / .65, 0, 1));
    case 'ko': return poseFor('ko', clamp(f.stateT / 1.05, 0, 1));
    case 'win': return fighterClip(f.def, 'win', clamp(f.stateT / 1.3, 0, 1));
    default: return poseFor('idle', (f.animT * .42) % 1);
  }
}

function updatePose(f, dt) {
  const target = poseTarget(f);
  f.pose = f.snap ? target : blendPose(f.pose, target, 1 - Math.exp(-30 * dt));
  f.snap = false;
  f.model.applyPose(f.pose);
  f.model.flash(f.flash);
  if (f.aura !== f.lastAura) { f.model.setAura(f.aura); f.lastAura = f.aura; }
}

function syncFighter(f, dt) {
  f.model.root.position.set(f.x, f.y, 0);
  const yaw = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  let d = yaw - f.model.root.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  f.model.root.rotation.y += d * Math.min(1, dt * 12);
}

/* ---------------- combat ---------------- */
function startAction(f, name) {
  const mv = MOVES[name];
  if (!mv) return;
  if (name === 'super') {
    if (f.meter < 100) return;
    f.meter = 0;
    f.aura = 1;
    S.zoom = 1;
    S.timeScale = .55;
    S.slowTimer = .45;
    audio.super();
  }
  f.action = {
    name, mv, t: 0,
    hits: (mv.superMove ? mv.hits : [{ at: mv.hit, dmg: mv.dmg, range: mv.range, low: mv.low, knockdown: mv.knockdown, launch: mv.launch, power: mv.power || 1, big: (mv.dmg || 0) >= 9 }])
      .map(h => ({ ...h, done: false }))
  };
  f.state = 'attack';
  f.stateT = 0;
  f.snap = true;
  f.blocking = false;
  if (name !== 'super') audio.whoosh();
}

function endAction(f) {
  f.action = null;
  f.aura = 0;
  f.state = 'idle';
  f.stateT = 0;
  if (f.nextMove) {
    const n = f.nextMove;
    f.nextMove = null;
    startAction(f, n);
  }
}

function tryAttack(f, kind) {
  if (S.mode !== 'fight' || S.locked || S.paused) return;
  if (f !== F[0] && f.state === 'attack') return;
  if (f.state === 'attack') {
    const t = f.action.t / f.action.mv.dur;
    if (kind === 'punch' && f.action.mv.chain && t > .34) f.nextMove = f.action.mv.chain;
    return;
  }
  if (!['idle', 'walk', 'crouch', 'block', 'jump'].includes(f.state)) return;
  const air = f.air;
  let name = null;
  if (kind === 'punch') name = air ? 'airkick' : (f.crouch ? 'uppercut' : 'jab');
  else if (kind === 'kick') name = air ? 'airkick' : (f.crouch ? 'sweep' : 'kick');
  else if (kind === 'grab') { if (air) return; name = 'grab'; }
  else if (kind === 'super') { if (air) return; name = 'super'; }
  if (!name) return;
  startAction(f, name);
}

function inRange(att, def, range) {
  return Math.abs(def.x - att.x) <= range && Math.sign(def.x - att.x) === att.facing;
}

function applyHit(att, def, h) {
  if (def.invuln > 0 || def.state === 'ko' || def.state === 'knockdown') return;
  const blocked = def.blocking && def.state !== 'attack' && !def.air;
  const counter = !blocked && def.state === 'attack';
  const powerStat = .86 + att.def.stats.POWER * .024;
  let dmg = h.dmg * powerStat * att.dmgMul * (blocked ? .13 : 1) * (counter ? 1.18 : 1);

  att.model.worldPos(h.low ? 'knR' : 'chest', tmpV);
  tmpV.x = (att.x + def.x) / 2 + att.facing * .08;
  tmpV.y = h.low ? .55 : 1.18;
  tmpV.z = .18;

  if (blocked) {
    def.health = Math.max(1, def.health - dmg);
    def.state = 'blockstun'; def.stateT = 0; def.stun = .18;
    def.vx = (def.x > att.x ? 1 : -1) * 1.4;
    def.blocking = true;
    def.flash = .35;
    fx.spark(tmpV, { power: .7, color: 0x9fd8ff });
    audio.block();
    S.shake = Math.max(S.shake, .12);
    S.hitstop = Math.max(S.hitstop, .045);
    callout('BLOCKED');
    att.meter = Math.min(100, att.meter + 2);
    def.meter = Math.min(100, def.meter + 3);
    return;
  }

  def.health = Math.max(0, def.health - dmg);
  def.flash = 1;
  def.invuln = 0;
  def.stateT = 0;
  def.stun = h.stun || .34;
  def.hurtClip = h.low ? 'hurtBody' : (Math.random() > .5 ? 'hurtHigh' : 'hurtBody');
  def.vx = (def.x > att.x ? 1 : -1) * (h.kb || 2.2);
  def.blocking = false;
  def.y = Math.max(def.y, 0);
  if (h.knockdown || h.throw || def.health <= 0) {
    def.state = 'knockdown';
    def.vy = h.throw ? 3.6 : 1.6;
    def.air = true;
    def.y = Math.max(def.y, .02);
  } else {
    def.state = 'hit';
  }
  if (def.air) def.vy = Math.max(def.vy, h.launch ? 4.2 : 2.2);

  att.combo = att.comboT > 0 ? att.combo + 1 : 1;
  att.comboT = 1.7;
  if (att === F[0] && att.combo > 1) {
    showCombo(att.combo);
    callout(att.combo >= 3 ? 'COMBO!' : '');
  }
  att.meter = Math.min(100, att.meter + (h.big ? 8 : 5));
  def.meter = Math.min(100, def.meter + 4);

  fx.spark(tmpV, { power: (h.power || 1) * (h.big ? 1.35 : 1), color: h.big ? 0xff8a3a : 0xffd08a });
  audio.hit(clamp((h.power || 1) * .9, .6, 1.5));
  S.hitstop = Math.max(S.hitstop, h.big ? .1 : .06);
  S.shake = Math.max(S.shake, h.big ? .5 : .26);
  if (counter) callout('COUNTER!');

  if (def.health <= 0) {
    def.state = 'ko';
    def.stateT = 0;
    def.air = true;
    def.vy = 3.2;
    endRound(att, 'ko');
  }
}

/* ---------------- round / match ---------------- */
function updatePips() {
  const set = (id, n) => {
    const box = $(id);
    Array.from(box.children).forEach((p, i) => p.classList.toggle('won', i < n));
  };
  set('#pips1', F[0] ? F[0].wins : 0);
  set('#pips2', F[1] ? F[1].wins : 0);
}

function announce(text, gold = false) {
  const span = $('#announce span');
  span.textContent = text;
  span.className = gold ? 'gold' : '';
  void span.offsetWidth;
  span.classList.add('show');
  S.announceUntil = performance.now() + 1200;
}

function callout(text) {
  if (!text) return;
  const box = $('#calls');
  const d = document.createElement('div');
  d.textContent = text;
  box.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function showCombo(n) {
  const c = $('#combo');
  c.querySelector('.n').textContent = n;
  c.classList.add('on');
  S.comboShow = 1.4;
}

function endRound(winner, reason) {
  if (S.phase !== 'battle') return;
  S.phase = 'roundover';
  S.locked = true;
  S.endTimer = 3.3;
  S.timeScale = .38;
  S.slowTimer = 1.1;
  S.zoom = 1;
  if (winner) {
    winner.wins++;
    winner.state = 'win';
    winner.stateT = 0;
    winner.snap = true;
    winner.aura = 1;
  }
  updatePips();
  if (reason === 'ko') {
    announce('K.O.', true);
    audio.ko();
  } else {
    announce('TIME UP');
    audio.bell();
  }
  S.shake = .7;
}

function startRound() {
  S.phase = 'intro';
  S.introT = 0;
  S.saidFight = false;
  S.locked = true;
  S.time = 60;
  S.hitstop = 0;
  S.timeScale = 1;
  S.slowTimer = 0;
  S.zoom = 0;
  const order = [F[0], F[1]];
  order.forEach((f, i) => {
    f.health = 100;
    f.state = 'intro';
    f.stateT = 0;
    f.animT = Math.random() * 2;
    f.action = null;
    f.nextMove = null;
    f.air = false;
    f.y = 0; f.vy = 0; f.vx = 0;
    f.invuln = 0;
    f.x = i === 0 ? -1.75 : 1.75;
    f.facing = i === 0 ? 1 : -1;
    f.blocking = false;
    f.crouch = false;
    f.combo = 0;
    f.comboT = 0;
    f.flash = 0;
    f.aura = 0;
    f.pose = fighterClip(f.def, 'intro', 0);
    f.snap = true;
    f.model.setAura(0);
  });
  $('#roundlab').textContent = 'ROUND ' + S.round;
  announce('ROUND ' + S.round, false);
}

function beginMatch() {
  S.mode = 'versus';
  hide('#select'); hide('#title'); hide('#result'); hide('#pause'); hide('#stages');
  S.paused = false;
  S.comboShow = 0;
  $('#hud').classList.remove('on');
  const playerDef = CHARACTERS[S.selected];
  let cpu = Math.floor(Math.random() * CHARACTERS.length);
  if (cpu === S.selected) cpu = (cpu + 1) % CHARACTERS.length;
  S.cpuIndex = cpu;
  const cpuDef = CHARACTERS[cpu];
  setFighters(playerDef, cpuDef);
  S.round = 1;
  updatePips();
  setStage(S.stage);
  const stageMeta = STAGES.find(s => s.id === S.stage) || STAGES[0];
  $('#stagechip').textContent = `${stageMeta.chip} · BEST OF 3`;

  $('#name1').textContent = playerDef.name;
  $('#style1').textContent = playerDef.style;
  $('#name2').textContent = cpuDef.name;
  $('#style2').textContent = cpuDef.style;
  $('#cpuName').textContent = cpuDef.name;

  const vs = $('#versus');
  $('#vsL').style.setProperty('--vc', playerDef.theme[1]);
  $('#vsR').style.setProperty('--vc', cpuDef.theme[1]);
  $('#vsL').querySelector('.vname').textContent = playerDef.name;
  $('#vsL').querySelector('.vtag').textContent = playerDef.style;
  $('#vsR').querySelector('.vname').textContent = cpuDef.name;
  $('#vsR').querySelector('.vtag').textContent = cpuDef.style;
  vs.classList.add('open');
  announce2();
  audio.bell();

  setTimeout(() => {
    if (S.mode !== 'versus') return;
    vs.classList.remove('open');
    $('#hud').classList.add('on');
    S.mode = 'fight';
    startRound();
  }, 1900);
}

function announce2() {
  // re-trigger the vs entrance animations
  ['#vsL', '#vsR'].forEach(sel => {
    const el = $(sel);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

function finishMatch() {
  S.mode = 'result';
  S.locked = true;
  const win = F[0].wins > F[1].wins;
  $('#resTitle').textContent = win ? 'YOU WIN' : 'YOU LOSE';
  $('#resTitle').style.textShadow = win
    ? '0 0 50px rgba(255,180,60,.7), 6px 6px 0 #6b0b13'
    : '0 0 50px rgba(120,120,255,.45), 6px 6px 0 #160b2b';
  $('#resSub').textContent = win ? 'AKHADA CONQUERED' : 'THE AKHADA KEEPS ITS CHAMPION';
  $('#resLine').textContent = `${F[0].def.name} ${F[0].wins} — ${F[1].wins} ${F[1].def.name}`;
  $('#hud').classList.remove('on');
  show('#result');
  audio.cheer(win ? 1 : .35);
}

function rematch() {
  hide('#result');
  S.round = 1;
  beginMatch();
}

function goSelect() {
  hide('#title'); hide('#result'); hide('#pause'); hide('#versus'); hide('#stages');
  show('#select');
  S.mode = 'select';
  S.paused = false;
  S.phase = 'none';
  $('#hud').classList.remove('on');
  if (F[0]) { F[0].state = 'idle'; F[1].state = 'idle'; }
  audio.ui();
}

function goTitle() {
  hide('#select'); hide('#result'); hide('#pause'); hide('#versus'); hide('#stages');
  show('#title');
  S.mode = 'title';
  S.phase = 'none';
  S.paused = false;
  $('#hud').classList.remove('on');
}

/* ---------------- stage select ---------------- */
const stageCardsEl = $('#stagecards');
let stageEls = [];

function buildStageCards() {
  if (stageEls.length || !stageCardsEl) return;
  STAGES.forEach((s, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'stagecard';
    el.style.setProperty('--c0', s.colors[0]);
    el.style.setProperty('--c1', s.colors[1]);
    el.innerHTML = `
      <div class="thumb"><div class="rays"></div><div class="sig">${s.mono}</div><div class="floorline"></div></div>
      <div class="smeta"><div class="snm">${s.name}</div><div class="stag">${s.tag}</div><p>${s.blurb}</p></div>`;
    el.addEventListener('click', () => selectStage(i));
    stageCardsEl.appendChild(el);
    stageEls.push(el);
  });
}

function setStage(id) {
  S.stage = id;
  if (arena && arena.key === id) return;
  const next = createArena(renderer, scene, id);
  const old = arena;
  arena = next;
  if (old && old.dispose) old.dispose();
}

function selectStage(i) {
  if (!STAGES.length) return;
  const k = ((i % STAGES.length) + STAGES.length) % STAGES.length;
  S.stageIndex = k;
  stageEls.forEach((el, j) => el.classList.toggle('on', j === k));
  setStage(STAGES[k].id);
  audio.ui();
}

function goStage() {
  hide('#title'); hide('#select'); hide('#result'); hide('#pause'); hide('#versus');
  show('#stages');
  S.mode = 'stage';
  S.paused = false;
  S.phase = 'none';
  $('#hud').classList.remove('on');
  buildStageCards();
  const idx = Math.max(0, STAGES.findIndex(s => s.id === S.stage));
  S.stageIndex = idx;
  stageEls.forEach((el, j) => el.classList.toggle('on', j === idx));
  setStage(STAGES[idx].id);
  $('#stageP1').textContent = CHARACTERS[S.selected].name;
  $('#stageCpu').textContent = 'RANDOM';
  audio.ui();
}

/* =========================================================
   controls
   ========================================================= */
const keys = { left: false, right: false, up: false, down: false };

function playerIntent(dt) {
  const f = F[0];
  if (!f) return;
  if (S.locked || S.paused) { if (f.state === 'idle') f.blocking = false; return; }
  if (['attack', 'hit', 'knockdown', 'getup', 'ko', 'win', 'blockstun'].includes(f.state)) return;
  if (f.air) {
    const drift = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    f.facing = Math.sign(F[1].x - f.x) || f.facing;
    f.x += drift * f.facing * 1.1 * dt;
    return;
  }
  const back = keys.left, fwd = keys.right, down = keys.down;
  if (back) {
    f.state = 'block';
    f.blocking = true;
    f.crouch = false;
    f.x -= f.facing * .8 * f.speedMul * dt;
    f.moveBack = true;
  } else if (fwd) {
    f.state = 'walk';
    f.blocking = false;
    f.crouch = false;
    f.moveBack = false;
    f.x += f.facing * 2.15 * f.speedMul * dt;
  } else if (down) {
    f.state = 'crouch';
    f.blocking = false;
    f.crouch = true;
  } else {
    f.state = 'idle';
    f.blocking = false;
    f.crouch = false;
  }
}

/* =========================================================
   fighter update
   ========================================================= */
function updateFighter(f, dt) {
  const opp = other(f);
  f.stateT += dt;
  f.animT += dt;
  f.flash = Math.max(0, f.flash - dt * 5);
  if (f.invuln > 0) f.invuln -= dt;
  if (f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) f.combo = 0; }

  if (['idle', 'walk', 'crouch', 'block', 'jump'].includes(f.state)) {
    f.facing = Math.sign(opp.x - f.x) || f.facing;
  }

  // knockback drift
  if (Math.abs(f.vx) > .01) {
    f.x += f.vx * dt;
    f.vx *= Math.pow(.012, dt);
    if (Math.abs(f.vx) < .04) f.vx = 0;
  }

  // airborne
  if (f.air) {
    f.vy -= 15.5 * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0; f.vy = 0; f.air = false;
      if (f.state === 'jump') { f.state = 'idle'; f.stateT = 0; }
      fx.dust(new THREE.Vector3(f.x, .05, .15), 5, .6, .4);
      audio.step();
      if (f.state === 'attack' && f.action.mv.clip === 'airkick') endAction(f);
    }
  }

  switch (f.state) {
    case 'jump':
      break;
    case 'attack': {
      const a = f.action;
      a.t += dt;
      const t = a.t / a.mv.dur;
      const def = other(f);
      for (const h of a.hits) {
        if (h.done) continue;
        if (t >= h.at[1]) { h.done = true; continue; }
        if (t >= h.at[0] && inRange(f, def, h.range)) {
          h.done = true;
          applyHit(f, def, h);
        }
      }
      if (a.name === 'super') {
        f.aura = t > .1 && t < .92 ? 1 : 0;
        S.zoom = t > .4 && t < .9 ? 1 : S.zoom;
      }
      if (a.t >= a.mv.dur) endAction(f);
      break;
    }
    case 'hit':
      if (f.stateT >= f.stun) { f.state = 'idle'; f.stateT = 0; }
      break;
    case 'blockstun':
      if (f.stateT >= f.stun) { f.state = 'idle'; f.stateT = 0; }
      break;
    case 'knockdown':
      if (f.stateT > 1.05 && !f.air) { f.state = 'getup'; f.stateT = 0; f.invuln = .9; }
      break;
    case 'getup':
      if (f.stateT > .62) { f.state = 'idle'; f.stateT = 0; f.invuln = .25; }
      break;
    case 'walk':
      f.walkPhase += dt * 2.3;
      break;
  }

  // clamp the ring
  f.x = clamp(f.x, -4.35, 4.35);
}

function separate() {
  const a = F[0], b = F[1];
  const d = b.x - a.x;
  const min = .92;
  if (Math.abs(d) < min) {
    const push = (min - Math.abs(d)) / 2 * (Math.sign(d) || 1);
    a.x -= push; b.x += push;
    a.x = clamp(a.x, -4.35, 4.35);
    b.x = clamp(b.x, -4.35, 4.35);
  }
}

/* =========================================================
   AI
   ========================================================= */
function aiUpdate(f, dt) {
  const opp = other(f);
  const cfg = DIFF[S.difficulty];
  f.blocking = false;
  if (S.locked || S.paused) return;
  if (['attack', 'hit', 'blockstun', 'knockdown', 'getup', 'ko', 'win', 'jump'].includes(f.state)) return;

  const dist = Math.abs(opp.x - f.x);
  f.aiTimer -= dt;

  if (f.aiIntent) {
    const it = f.aiIntent;
    it.t -= dt;
    if (it.attack) {
      startAction(f, it.attack);
      f.aiIntent = null;
      f.aiTimer = cfg.think + Math.random() * cfg.jitter;
      return;
    }
    if (it.block) {
      f.state = 'block';
      f.blocking = true;
      f.x -= f.facing * .5 * dt;
    } else if (it.move) {
      f.state = 'walk';
      f.moveBack = it.move < 0;
      f.x += f.facing * it.move * 1.7 * cfg.speed * dt;
      f.walkPhase += dt * 2.2;
    }
    if (it.t <= 0) f.aiIntent = null;
    return;
  }

  if (f.aiTimer > 0) {
    f.state = 'idle';
    return;
  }
  f.aiTimer = cfg.think * (.6 + Math.random() * cfg.jitter);

  // react to an incoming attack
  if (opp.state === 'attack' && dist < 2.5 && Math.random() < cfg.block) {
    f.aiIntent = { block: true, t: .4 };
    return;
  }
  if (dist > 1.65) {
    f.aiIntent = { move: 1, t: .35 + Math.random() * .25 };
    return;
  }
  if (dist < 1.05) {
    f.aiIntent = Math.random() < .3 ? { move: -1, t: .3 } : { attack: pickAiAttack(dist), t: .1 };
    return;
  }
  if (Math.random() < cfg.aggr) {
    f.aiIntent = { attack: pickAiAttack(dist), t: .1 };
  } else {
    f.aiIntent = { move: Math.random() < .5 ? 1 : -1, t: .3 };
  }
}

function pickAiAttack(dist) {
  const r = Math.random();
  if (dist < 1.25) {
    if (r < .28) return 'grab';
    if (r < .6) return 'jab';
    if (r < .82) return 'uppercut';
    return 'sweep';
  }
  if (dist < 1.8) {
    if (r < .5) return 'kick';
    if (r < .7) return 'jab';
    if (r < .88) return 'cross';
    return 'sweep';
  }
  return r < .6 ? 'kick' : 'jab';
}

/* =========================================================
   match flow
   ========================================================= */
function updateMatch(dt) {
  if (S.phase === 'intro') {
    S.introT += dt;
    F.forEach(f => {
      if (f.state === 'intro' && S.introT > 1.0) { f.state = 'idle'; f.stateT = 0; }
    });
    if (!S.saidFight && S.introT > 1.12) {
      announce('FIGHT!', true);
      S.saidFight = true;
      audio.bell();
    }
    if (S.introT > 1.65) { S.phase = 'battle'; S.locked = false; }
  } else if (S.phase === 'battle') {
    S.time -= dt;
    if (S.time <= 0) {
      S.time = 0;
      const a = F[0], b = F[1];
      if (a.health === b.health) {
        S.phase = 'roundover';
        S.endTimer = 2.8;
        S.locked = true;
        announce('DRAW');
      } else {
        endRound(a.health > b.health ? a : b, 'time');
      }
    }
  } else if (S.phase === 'roundover') {
    S.endTimer -= dt;
    if (S.endTimer <= 0) {
      if (F[0].wins >= 2 || F[1].wins >= 2) finishMatch();
      else { S.round++; startRound(); }
    }
  }
}

/* =========================================================
   HUD
   ========================================================= */
let hudCache = {};
function updateHUD() {
  const a = F[0], b = F[1];
  if (!a || !b) return;
  const la = Math.max(0, a.health / 100), lb = Math.max(0, b.health / 100);
  $('#life1').style.transform = `scaleX(${la})`;
  $('#life2').style.transform = `scaleX(${lb})`;
  $('#trail1').style.transform = `scaleX(${la})`;
  $('#trail2').style.transform = `scaleX(${lb})`;
  $('#life1').classList.toggle('low', la < .3);
  $('#life2').classList.toggle('low', lb < .3);
  $('#meter1').style.transform = `scaleX(${a.meter / 100})`;
  $('#meter2').style.transform = `scaleX(${b.meter / 100})`;
  $('#meter1wrap').classList.toggle('full', a.meter >= 100);
  $('#meter2wrap').classList.toggle('full', b.meter >= 100);
  const superBtn = document.querySelector('#acts .super');
  if (superBtn) superBtn.classList.toggle('ready', a.meter >= 100);

  const t = Math.max(0, Math.ceil(S.time));
  if (hudCache.t !== t) {
    hudCache.t = t;
    $('#clock').textContent = String(t).padStart(2, '0');
    $('#clock').classList.toggle('hurry', t <= 10);
  }
  if (S.comboShow > 0) {
    S.comboShow -= 1 / 60;
    if (S.comboShow <= 0) $('#combo').classList.remove('on');
  }
}

/* =========================================================
   camera
   ========================================================= */
function updateCamera(dt) {
  if (S.mode === 'title' || S.mode === 'select' || S.mode === 'stage' || S.mode === 'versus') {
    const t = clockState.t * .14;
    const r = 7.4;
    camera.position.lerp(new THREE.Vector3(Math.sin(t) * r, 2.6 + Math.sin(t * .8) * .35, Math.cos(t) * r), 1 - Math.exp(-1.5 * dt));
    camera.lookAt(0, 1.05, 0);
    camera.fov = lerp(camera.fov, 40, 1 - Math.exp(-2 * dt));
    camera.updateProjectionMatrix();
    return;
  }
  if (S.mode === 'result') {
    const t = clockState.t * .1;
    camera.position.lerp(new THREE.Vector3(Math.sin(t) * 4.6, 2.1, 4.4 + Math.cos(t) * .6), 1 - Math.exp(-1.2 * dt));
    camera.lookAt((F[0].x + F[1].x) / 2 * .5, 1.0, 0);
    return;
  }
  const a = F[0], b = F[1];
  if (!a || !b) return;
  const mid = (a.x + b.x) / 2;
  const sep = Math.abs(a.x - b.x);
  const desired = new THREE.Vector3(
    mid * .7,
    1.44 + Math.max(0, a.y, b.y) * .18 - S.zoom * .12,
    4.3 + sep * .42 - S.zoom * .7
  );
  camera.position.lerp(desired, 1 - Math.exp(-5 * dt));

  const target = new THREE.Vector3(mid * .88, 1.05 + Math.min(a.y, b.y) * .1 + S.zoom * .06, 0);
  if (S.shake > 0) {
    const k = S.shake * S.shake;
    camera.position.x += (Math.random() - .5) * k;
    camera.position.y += (Math.random() - .5) * k;
    camera.position.z += (Math.random() - .5) * k * .5;
    S.shake = Math.max(0, S.shake - dt * 2.6);
  }
  camera.lookAt(target);
  camera.fov = lerp(camera.fov, 34 - S.zoom * 2, 1 - Math.exp(-4 * dt));
  camera.updateProjectionMatrix();
}

/* =========================================================
   UI wiring
   ========================================================= */
const cardsEl = $('#cards');
let cardEls = [];

function buildCards() {
  if (cardEls.length) return;
  CHARACTERS.forEach((c, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card';
    el.style.setProperty('--c0', c.theme[0]);
    el.style.setProperty('--c1', c.theme[1]);
    const stats = Object.entries(c.stats).map(([k, v]) =>
      `<div class="stat"><span>${k.slice(0, 3)}</span><div class="track"><i style="width:${v * 10}%"></i></div></div>`
    ).join('');
    el.innerHTML = `
      <div class="portrait">
        <div class="rays"></div>
        <div class="ring"></div>
        <div class="mono">${c.mono}</div>
        <div class="badge">1P</div>
        <div class="stamp">PICK</div>
      </div>
      <div class="meta">
        <div class="nm">${c.name}</div>
        <div class="st">${c.style}</div>
        <div class="stats">${stats}</div>
        <div class="blurb">${c.blurb}</div>
      </div>`;
    el.addEventListener('click', () => selectChar(i));
    cardsEl.appendChild(el);
    cardEls.push(el);
  });
  selectChar(0);
}

function selectChar(i) {
  S.selected = i;
  cardEls.forEach((el, k) => el.classList.toggle('on', k === i));
  audio.ui();
}

document.querySelectorAll('#difficulty button').forEach(b => {
  b.addEventListener('click', () => {
    S.difficulty = b.dataset.d;
    document.querySelectorAll('#difficulty button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    audio.ui();
  });
});

function show(sel) { const e = $(sel); if (e) e.classList.add('open'); }
function hide(sel) { const e = $(sel); if (e) e.classList.remove('open'); }

$('#btnStart').addEventListener('click', () => { audio.unlock(); buildCards(); goSelect(); });
$('#btnFight').addEventListener('click', () => { audio.unlock(); buildCards(); goStage(); });
$('#btnEnterStage').addEventListener('click', () => { audio.unlock(); beginMatch(); });
$('#btnRematch').addEventListener('click', () => { audio.unlock(); rematch(); });
$('#btnRoster').addEventListener('click', () => { goSelect(); });
$('#btnPause').addEventListener('click', () => togglePause(true));
$('#btnResume').addEventListener('click', () => togglePause(false));
$('#btnRestart').addEventListener('click', () => { hide('#pause'); S.paused = false; beginMatch(); });
$('#btnQuit').addEventListener('click', () => { hide('#pause'); S.paused = false; goSelect(); });
$('#btnSound').addEventListener('click', toggleSound);
$('#btnMute').addEventListener('click', () => { toggleSound(); });

function togglePause(force) {
  if (S.mode !== 'fight') return;
  S.paused = typeof force === 'boolean' ? force : !S.paused;
  if (S.paused) show('#pause'); else hide('#pause');
  audio.ui();
}

function toggleSound() {
  audio.unlock();
  const on = audio.toggle();
  const icon = $('#sndIcon');
  const label = $('#btnMute');
  if (label) label.textContent = 'SOUND: ' + (on ? 'ON' : 'OFF');
  if (icon) icon.setAttribute('d', on
    ? 'M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z'
    : 'M4 9v6h4l5 4V5L8 9H4zm12.2-.2-1.4 1.4L17 12l-2.2 2.2 1.4 1.4L18.4 13.4 20.6 15.6l1.4-1.4L19.8 12l2.2-2.2-1.4-1.4L18.4 10.6z');
}

/* keyboard */
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.code === 'KeyM') { toggleSound(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (S.mode === 'fight') { togglePause(); e.preventDefault(); }
    return;
  }

  if (S.mode === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') { audio.unlock(); buildCards(); goSelect(); e.preventDefault(); }
    return;
  }
  if (S.mode === 'select') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { selectChar((S.selected + CHARACTERS.length - 1) % CHARACTERS.length); e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { selectChar((S.selected + 1) % CHARACTERS.length); e.preventDefault(); }
    if (e.code === 'Enter' || e.code === 'Space') { audio.unlock(); goStage(); e.preventDefault(); }
    if (e.code === 'Digit1') S.difficulty = 'easy';
    if (e.code === 'Digit2') S.difficulty = 'normal';
    if (e.code === 'Digit3') S.difficulty = 'hard';
    document.querySelectorAll('#difficulty button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.d === S.difficulty)));
    return;
  }
  if (S.mode === 'stage') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { selectStage(S.stageIndex - 1); e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { selectStage(S.stageIndex + 1); e.preventDefault(); }
    if (e.code === 'Enter' || e.code === 'Space') { audio.unlock(); beginMatch(); e.preventDefault(); }
    return;
  }
  if (S.mode === 'result') {
    if (e.code === 'Enter') { audio.unlock(); rematch(); }
    return;
  }
  if (S.mode !== 'fight') return;

  if (e.repeat) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': keys.left = true; e.preventDefault(); break;
    case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
    case 'ArrowDown': case 'KeyS': keys.down = true; e.preventDefault(); break;
    case 'ArrowUp': case 'KeyW': case 'Space':
      e.preventDefault();
      if (!keys.up && F[0] && !F[0].air && !F[0].action && !S.locked &&
        ['idle', 'walk', 'crouch', 'block'].includes(F[0].state)) {
        F[0].air = true; F[0].vy = 4.4; F[0].state = 'jump'; F[0].stateT = 0;
        F[0].blocking = false;
        audio.jump();
      }
      keys.up = true;
      break;
    case 'KeyJ': tryAttack(F[0], 'punch'); break;
    case 'KeyK': tryAttack(F[0], 'kick'); break;
    case 'KeyI': tryAttack(F[0], 'grab'); break;
    case 'KeyL': tryAttack(F[0], 'super'); break;
  }
});

window.addEventListener('keyup', e => {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': keys.left = false; break;
    case 'ArrowRight': case 'KeyD': keys.right = false; break;
    case 'ArrowDown': case 'KeyS': keys.down = false; break;
    case 'ArrowUp': case 'KeyW': case 'Space': keys.up = false; break;
  }
});

/* touch / mouse deck */
function bindHold(el, on, off) {
  const down = e => { e.preventDefault(); el.classList.add('down'); on(); };
  const up = e => { el.classList.remove('down'); off(); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}

document.querySelectorAll('#dpad button[data-k]').forEach(btn => {
  const k = btn.dataset.k;
  bindHold(btn,
    () => {
      if (k === 'up') {
        if (F[0] && !F[0].air && !F[0].action && !S.locked && S.mode === 'fight' &&
          ['idle', 'walk', 'crouch', 'block'].includes(F[0].state)) {
          F[0].air = true; F[0].vy = 4.4; F[0].state = 'jump'; F[0].stateT = 0;
          F[0].blocking = false;
          audio.jump();
        }
        keys.up = true;
      } else keys[k] = true;
    },
    () => {
      if (k === 'up') keys.up = false;
      else keys[k] = false;
    });
});

document.querySelectorAll('#acts button[data-a]').forEach(btn => {
  const a = btn.dataset.a;
  bindHold(btn, () => tryAttack(F[0], a), () => { });
});

/* =========================================================
   boot / loop
   ========================================================= */
setFighters(CHARACTERS[0], CHARACTERS[2]);
buildCards();
updatePips();

let last = performance.now();
let bootHidden = false;

function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(.05, (now - last) / 1000);
  last = now;
  clockState.t += raw;

  arena.update(raw, clockState.t);

  if (S.slowTimer > 0) {
    S.slowTimer -= raw;
    S.timeScale = lerp(S.timeScale, .38, 1 - Math.exp(-8 * raw));
  } else {
    S.timeScale = lerp(S.timeScale, 1, 1 - Math.exp(-4 * raw));
  }
  if (S.zoom > 0) S.zoom = Math.max(0, S.zoom - raw * .8);
  const dt = raw * S.timeScale;

  if (S.mode === 'fight' && !S.paused) {
    if (S.hitstop > 0) {
      S.hitstop -= raw;
    } else {
      if (S.phase === 'battle' && !S.locked) {
        playerIntent(raw);
        aiUpdate(F[1], raw);
      }
      updateFighter(F[0], dt);
      updateFighter(F[1], dt);
      separate();
      updateMatch(dt);
    }
    updateHUD();
  }

  // pose + transform
  const animDt = S.hitstop > 0 || S.paused ? 0 : (S.mode === 'fight' ? dt : raw);
  for (const f of F) {
    if (animDt > 0) updatePose(f, animDt);
    syncFighter(f, animDt || raw);
  }
  blobs.forEach((b, i) => {
    const f = F[i];
    if (!f) return;
    const k = 1 - Math.min(.8, f.y * .42);
    b.position.set(f.x, .013, .06);
    b.scale.setScalar(.78 + k * .42);
    b.material.opacity = .46 * k;
  });

  fx.update(animDt || raw);
  updateCamera(raw);
  composer.render();

  if (!bootHidden) {
    bootHidden = true;
    const boot = $('#boot');
    if (boot) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 600); }
    window.__mkBooted = true;
  }
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

resize();
requestAnimationFrame(frame);

window.__mk = {
  S, scene, camera, renderer, CHARACTERS, beginMatch, tryAttack, startRound, startAction, MOVES, finishMatch,
  get F() { return F; },
  get arena() { return arena; }
};
