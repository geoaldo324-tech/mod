import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BOX_DESK, BOX_START, checkGlb } from './project.js';

const material = (color, properties = {}) => new THREE.MeshStandardMaterial({ color, roughness: .76, ...properties });
const mat = {
  slate: material('#333a56'), wall: material('#3c4460'), brick: material('#454d69'),
  light: material('#687496'), wood: material('#b57756'), woodLight: material('#d99e72'),
  metal: material('#31384c', { metalness: .35 }), navy: material('#252c40'),
  blue: material('#599bff'), blueEdge: material('#2e5fae'), orange: material('#e4a27a'),
  white: material('#ecedff'), glass: material('#8ce6ed', { emissive: '#4d80c3', emissiveIntensity: .45 }),
  visor: material('#222447', { roughness: .33 }), mint: material('#8eeccd', { emissive: '#5ca794', emissiveIntensity: .35 }),
  green: material('#65a58b'), green2: material('#8cb996'), paper: material('#f7c9a3'),
};
const floorMaterials = ['#896353','#966e58','#8b6553','#a5745a','#855b4a','#9b6b54'].map((color) => material(color));

function make(geometry, surface, parent, x, y, z) {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
let curveDetail = 3;
const box = (parent, x, y, z, w, h, d, surface) => {
  // Subdivide large faces for the SVG renderer, which sorts faces by depth.
  const segments = curveDetail === 1 ? [w, h, d].map((size) => Math.ceil(size / .85)) : [];
  return make(new THREE.BoxGeometry(w, h, d, ...segments), surface, parent, x, y, z);
};
const rounded = (parent, x, y, z, w, h, d, radius, surface) =>
  curveDetail === 1 && Math.max(w, h, d) > 2
    ? box(parent, x, y, z, w, h, d, surface)
    : make(new RoundedBoxGeometry(w, h, d, curveDetail, radius), surface, parent, x, y, z);
const ball = (parent, x, y, z, radius, surface) =>
  make(new THREE.SphereGeometry(radius, 16, 10), surface, parent, x, y, z);
const column = (parent, x, y, z, top, bottom, height, surface) =>
  make(new THREE.CylinderGeometry(top, bottom, height, 15), surface, parent, x, y, z);

function crate(parent, color, edge, size = 0.63) {
  const group = new THREE.Group();
  parent.add(group);
  rounded(group, 0, 0, 0, size, size, size, .045, color);
  for (const offset of [-.34, .34]) {
    box(group, 0, size * offset, size * .505, size * .92, .035, .029, edge);
    box(group, size * .505, size * offset, 0, .029, .035, size * .92, edge);
  }
  box(group, -.13 * size, .04, size * .51, .28 * size, .16 * size, .022, mat.white);
  return group;
}

function plant(parent, x, y, z, scale = 1) {
  const group = new THREE.Group();
  parent.add(group);
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  column(group, 0, .14, 0, .21, .15, .28, mat.orange);
  column(group, 0, .27, 0, .19, .19, .015, mat.navy);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const leaf = ball(group, Math.cos(angle) * (.08 + i * .018), .45 + (i % 3) * .12,
      Math.sin(angle) * .16, .16, i % 2 ? mat.green2 : mat.green);
    leaf.scale.set(.48, 1.45, .75);
    leaf.rotation.set(Math.sin(angle) * .6, angle, Math.cos(angle) * .6);
  }
}

function desk(parent) {
  const group = new THREE.Group();
  parent.add(group);
  group.position.set(2.6, 0, -1.65);
  rounded(group, 0, 1.16, 0, 3.0, .15, 1.12, .035, mat.woodLight);
  box(group, 0, 1.04, .49, 2.84, .14, .12, mat.wood);
  for (const x of [-1.35, 1.35]) {
    for (const z of [-.46, .46]) box(group, x, .52, z, .12, 1.04, .12, mat.metal);
    box(group, x, .25, 0, .12, .1, .9, mat.metal);
  }
  box(group, 0, .42, -.43, 2.7, .10, .1, mat.metal);
  box(group, -.98, 1.27, -.22, .37, .08, .28, mat.navy);
  box(group, -.98, 1.46, -.29, .07, .4, .07, mat.metal);
  rounded(group, -.98, 1.69, -.29, .58, .4, .09, .024, mat.navy);
  box(group, -.98, 1.69, -.234, .49, .30, .012, mat.glass);
  for (let i = 0; i < 3; i++) box(group, -.97, 1.61 + i * .07, -.225, .26 - i * .035, .012, .016, mat.white);
  plant(group, 1.17, 1.23, -.33, .53);
  return group;
}

function room(parent) {
  const group = new THREE.Group();
  parent.add(group);
  if (curveDetail === 1) {
    // Leave the top open here: the planks make the visible floor in SVG.
    for (const z of [-3.49, 3.49]) box(group, 0, -.19, z, 9.93, .38, .08, mat.navy);
    for (const x of [-4.95, 4.95]) box(group, x, -.19, 0, .08, .38, 6.98, mat.navy);
  } else {
    rounded(group, 0, -.21, 0, 10.04, .42, 7.1, .075, mat.navy);
    box(group, 0, -.11, 0, 9.9, .23, 7.0, mat.slate);
  }
  for (let row = 0; row < 16; row++) {
    const z = (row - 7.5) * .43;
    for (let i = 0; i < 5; i++) {
      const w = i === 0 ? (row % 2 ? 1.2 : 1.7) : i === 4 ? (row % 2 ? 2.65 : 2.15) : 2;
      const left = i === 0 ? 0 : (row % 2 ? 1.2 : 1.7) + (i - 1) * 2;
      const surface = floorMaterials[(i * 5 + row * 7 + i * row) % floorMaterials.length];
      const x = -4.92 + left + w / 2;
      if (curveDetail === 1) {
        const plank = make(new THREE.PlaneGeometry(w - .010, .43), surface, group, x, .026, z);
        plank.rotation.x = -Math.PI / 2;
      } else {
        box(group, x, .002, z, w - .028, .047, .407, surface);
      }
    }
  }
  box(group, 0, 1.65, -3.48, 9.96, 3.27, .22, mat.wall);
  box(group, -4.9, 1.65, -1.51, .20, 3.27, 3.93, mat.slate);
  box(group, 0, 3.3, -3.48, 10.0, .12, .25, mat.light);
  box(group, -4.9, 3.3, -1.51, .24, .12, 4, mat.light);
  box(group, 0, .19, -3.35, 9.69, .26, .05, mat.navy);
  box(group, -4.78, .19, -1.51, .05, .26, 3.78, mat.navy);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 8; col++) {
    const x = -4.55 + col * 1.18 + (row % 2 ? .32 : 0);
    box(group, x + .31, .57 + row * .46, -3.361, .58, .405, .025, mat.brick);
  }

  const window = new THREE.Group();
  window.position.set(-2.2, 1.98, -3.30);
  group.add(window);
  rounded(window, 0, 0, 0, 3.48, 1.85, .18, .06, mat.navy);
  const sky = material('#78a7ea', { emissive: '#557ff2', emissiveIntensity: .28 });
  box(window, 0, 0, .106, 3.18, 1.56, .035, sky);
  for (let i = 0; i < 4; i++) {
    const facade = material(['#516eae', '#6691c8', '#547bba', '#749dd4'][i]);
    box(window, -1.16 + i * .71, -.39, .13, .6, .6 + i % 3 * .11, .018, facade);
  }
  box(window, 0, 0, .173, .085, 1.63, .05, mat.navy);
  box(window, 0, 0, .173, 3.27, .065, .05, mat.navy);
  box(window, 0, -.87, .16, 3.6, .10, .43, mat.wood);
  plant(window, 1.08, -.81, .22, .57);

  const shelf = new THREE.Group();
  shelf.position.set(-3.8, 0, -.8);
  shelf.rotation.y = Math.PI / 2;
  group.add(shelf);
  for (const x of [-.86, .86]) for (const z of [-.35, .35])
    box(shelf, x, 1.04, z, .085, 2.08, .085, mat.metal);
  for (const y of [.19, .82, 1.45, 2.07]) box(shelf, 0, y, 0, 1.88, .10, .86, mat.woodLight);
  const bin = crate(shelf, mat.slate, mat.light, .53);
  bin.position.set(-.46, .51, .02);
  const secondBin = crate(shelf, mat.orange, mat.wood, .46);
  secondBin.position.set(.43, 1.10, .02);
  for (let i = 0; i < 6; i++) {
    box(shelf, -.57 + i * .123, 1.69, -.11, .105, .37 - i % 3 * .045, .36,
      [mat.blueEdge, mat.orange, mat.light][i % 3]);
  }
  plant(shelf, .51, 2.12, -.05, .65);

  box(group, 2.8, 2.1, -3.28, 3.12, 1.25, .10, mat.navy);
  box(group, 2.8, 2.1, -3.21, 3, 1.13, .04, mat.light);
  for (let x = 0; x < 14; x++) for (let y = 0; y < 5; y++) {
    const dot = box(group, 1.45 + x * .208, 1.72 + y * .19, -3.185, .035, .035, .014, mat.slate);
    dot.castShadow = false;
  }
  for (let i = 0; i < 5; i++) {
    const x = 1.70 + i * .52;
    const tool = rounded(group, x, 2.12 + (i % 2) * .10, -3.12, .10, .43, .065, .017,
      i % 2 ? mat.orange : mat.navy);
    tool.rotation.z = -.17 + (i % 3) * .2;
    box(group, x + .022, 2.31 + (i % 2) * .1, -3.12, .22, .075, .08, mat.metal);
  }
  if (curveDetail !== 1) {
    const matWork = material('#635e91');
    box(group, 2.61, .037, -.91, 3.25, .024, 1.59, matWork).castShadow = false;
    box(group, 2.61, .049, -.15, 3.16, .006, .035, mat.light).castShadow = false;
  }
  desk(group);
  plant(group, 4.37, .02, -2.41, 1.22);
}

function avatar(parent) {
  const lola = new THREE.Group();
  parent.add(lola);
  column(lola, 0, .17, 0, .31, .37, .26, mat.visor);
  column(lola, 0, .30, 0, .32, .34, .07, mat.mint);
  rounded(lola, 0, .49, 0, .61, .39, .48, .17, mat.white);
  rounded(lola, 0, .91, 0, .73, .48, .56, .16, mat.white);
  rounded(lola, 0, .91, .27, .59, .30, .084, .065, mat.visor);
  for (const x of [-.127, .127]) rounded(lola, x, .929, .317, .070, .095, .019, .018, mat.mint);
  box(lola, 0, .843, .318, .075, .013, .014, mat.mint);
  box(lola, .22, 1.19, -.047, .038, .12, .037, mat.visor);
  ball(lola, .22, 1.266, -.047, .055, mat.mint);
  return lola;
}

function dispose(group) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const item of [object.material].flat()) {
      materials.add(item);
      for (const value of Object.values(item)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const item of materials) item.dispose();
  for (const texture of textures) {
    texture.source?.data?.close?.();
    texture.dispose();
  }
}

export class World {
  constructor(host) {
    this.host = host;
    this.scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    this.software = !context;
    if (context) {
      this.renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.27;
    } else {
      curveDetail = 1;
      this.renderer = new SVGRenderer();
      this.renderer.setPrecision(2);
    }
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', 'Vista 3D del taller de Lola');
    host.append(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 90);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = .20;
    this.controls.maxPolarAngle = Math.PI * .48;
    this.controls.minZoom = .55;
    this.controls.maxZoom = 2.5;
    this.controls.enablePan = true;
    this.homeCamera();

    this.scene.add(new THREE.HemisphereLight('#c6daff', '#6a4c76', 2.0));
    if (this.software) this.scene.add(new THREE.AmbientLight('#a49cb9', 1));
    const key = new THREE.DirectionalLight('#ffe4bb', this.software ? .60 : 3.1);
    key.position.set(2.5, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7.2, right: 7.2, top: 7, bottom: -7, near: .5, far: 30 });
    key.shadow.normalBias = .022;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#9caaff', this.software ? .29 : 1.2);
    fill.position.set(-5, 4, 2);
    this.scene.add(fill);
    const grid = new THREE.GridHelper(200, 160, '#43495f', '#292d3f');
    grid.position.y = -.44;
    grid.material.transparent = true;
    grid.material.opacity = this.software ? .50 : .53;
    if (this.software) grid.material.color.set('#505472');
    this.scene.add(grid);
    room(this.scene);
    this.lola = avatar(this.scene);
    this.crate = crate(this.scene, mat.blue, mat.blueEdge);
    this.imported = new THREE.Group();
    this.scene.add(this.imported);

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      if (!url.startsWith('blob:')) throw new Error('El archivo debe llevar sus recursos incluidos.');
      return url;
    });
    this.loader = new GLTFLoader(manager);

    new ResizeObserver(() => this.resize()).observe(host);
    const frame = (now) => {
      this.animate(now);
      if (this.visible) {
        const moved = this.controls.update();
        if (moved || this.dirty) {
          this.renderer.render(this.scene, this.camera);
          this.dirty = false;
        }
      }
    };
    if (this.software) {
      this.renderer.domElement.style.touchAction = 'none';
      const tick = (now) => {
        frame(now);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      this.renderer.setAnimationLoop(frame);
    }
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (!width || !height) return;
    const ratio = width / height;
    const span = Math.max(5.00, 6.9 / ratio);
    Object.assign(this.camera, { left: -span * ratio, right: span * ratio, top: span, bottom: -span });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.dirty = true;
  }

  homeCamera() {
    this.camera.position.set(9.2, 10.4, 13.0);
    this.controls.target.set(0, .92, -.12);
    this.dirty = true;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  renderState(state) {
    this.motion = null;
    this.dirty = true;
    this.lola.position.set(state.lola[0], .03, state.lola[1]);
    this.lola.rotation.y = .24;
    const point = state.box === 'desk' ? BOX_DESK : BOX_START;
    this.crate.position.set(point[0], state.box === 'desk' ? 1.55 : .35, point[1]);
  }

  async importAsset(buffer) {
    checkGlb(buffer);
    const model = (await this.loader.parseAsync(buffer, '')).scene;
    if (!model) throw new Error('El modelo no contiene una escena.');
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (bounds.isEmpty() || !Number.isFinite(max) || max <= 0) {
      dispose(model);
      throw new Error('El archivo no contiene objetos 3D visibles.');
    }
    const scale = 2.2 / max;
    const center = bounds.getCenter(new THREE.Vector3());
    // Place the asset at floor level near the back of the work area.
    model.scale.multiplyScalar(scale);
    model.position.multiplyScalar(scale).add(new THREE.Vector3(-.9 - center.x * scale,
      .03 - bounds.min.y * scale, -1.87 - center.z * scale));
    model.traverse((child) => {
      if (child.isMesh) child.castShadow = child.receiveShadow = true;
    });
    this.clearAsset();
    this.imported.add(model);
    this.dirty = true;
  }

  clearAsset() {
    this.dirty = true;
    for (const child of [...this.imported.children]) {
      this.imported.remove(child);
      dispose(child);
    }
  }

  play(plan, callback) {
    this.motion = { plan, callback, index: 0, segment: null, carry: false };
  }

  animate(now) {
    const motion = this.motion;
    if (!motion) return;
    this.dirty = true;
    const waypoint = motion.plan.waypoints[motion.index];
    if (!motion.segment) {
      const from = this.lola.position.clone();
      const to = new THREE.Vector3(waypoint.at[0], .03, waypoint.at[1]);
      const distance = from.distanceTo(to);
      if (distance > .02) this.lola.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      motion.segment = { start: now, from, to, duration: Math.max(260, distance * 390) };
    }
    const { start, from, to, duration } = motion.segment;
    const progress = Math.min(1, (now - start) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    this.lola.position.lerpVectors(from, to, eased);
    this.lola.position.y += Math.sin(progress * Math.PI * 8) * .025;
    if (motion.carry) {
      this.crate.position.set(this.lola.position.x + .43, .55, this.lola.position.z + .14);
    }
    if (progress < 1) return;
    if (waypoint.pickUp) motion.carry = true;
    motion.index++;
    motion.segment = null;
    if (motion.index >= motion.plan.waypoints.length) {
      this.renderState(motion.plan.result);
      motion.callback();
    }
  }
}
