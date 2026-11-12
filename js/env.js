import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/* A small warm/cool studio baked into an env map. Gives skin, gold and leather
   believable specular response without downloading an HDR. */
export function createEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (color, intensity, pos, scale, rot) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(intensity);
    m.position.fromArray(pos);
    m.scale.set(scale[0], scale[1], 1);
    if (rot) m.rotation.fromArray(rot);
    scene.add(m);
  };
  // warm key (left/front), cool fill (right), red rim (behind)
  add(0xffd2a0, 3.4, [-3.2, 2.2, 2.6], [5, 5], [0.4, 1.1, 0]);
  add(0x9fc4ff, 1.5, [3.4, 1.4, 1.6], [4, 4], [0.2, -1.0, 0]);
  add(0xff5a30, 2.2, [0, 1.4, -3.6], [6, 3], [0, 0, 0]);
  add(0x241b2c, 0.5, [0, -2.2, 0], [10, 10], [-Math.PI / 2, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return rt.texture;
}

export function createComposer(renderer, scene, camera) {
  return { renderer, scene, camera, mode: 'direct' };
}
