import * as THREE from 'three';
import { PLANETS } from '../data/planets.js';
import { CONFIG } from './config.js';
import { createRenderer, resizeRenderer } from './renderer.js';
import { createControls } from './controls.js';
import { CameraController } from './camera.js';
import { AnimationLoop } from './animation.js';
import { makeLabel } from './utils.js';
import { SceneManager } from '../managers/sceneManager.js';
import { SimulationManager } from '../managers/simulationManager.js';
import { UI } from './ui.js';

const container = document.querySelector('#scene-container');
const renderer = createRenderer(container);
const camera = new THREE.PerspectiveCamera(
  45,
  (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
  0.1,
  1000
);
camera.position.set(CONFIG.cameraHome.x, CONFIG.cameraHome.y, CONFIG.cameraHome.z);

const controls = createControls(camera, renderer.domElement);
const cameraController = new CameraController(camera, controls);
const sceneManager = new SceneManager(PLANETS);
const simulation = new SimulationManager();
const ui = new UI();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const labels = new Map();

// All selectable bodies: Sun + 8 Planets
const allBodies = [sceneManager.sun, ...sceneManager.planets];
let selectedBody = sceneManager.planets.find((planet) => planet.data.name === 'Earth') || sceneManager.planets[2];

// Pre-collected pickable meshes (avoids array allocations on every click)
const pickableMeshes = [
  sceneManager.sun.mesh,
  ...sceneManager.planets.flatMap((p) => {
    const items = [p.planet];
    if (p.ring) items.push(p.ring);
    if (p.clouds) items.push(p.clouds);
    return items;
  })
];

let fpsElapsed = 0;
let frames = 0;

function selectBody(body, focus = false) {
  if (!body) return;
  selectedBody = body;
  ui.renderPlanet(body.data);
  if (focus) {
    cameraController.focus(body);
  }
}

// Render the quick-select strip
ui.renderPlanetNav(allBodies, selectedBody, (body) => {
  selectBody(body, true);
});

// Create labels for all celestial bodies
allBodies.forEach((body) => {
  const label = makeLabel(body.data.name, body.data.color);
  label.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBody(body, true);
  });
  container.append(label);
  labels.set(body, label);
});

// Reusable scratch vectors for 60fps label projection (avoids GC allocations)
const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _toBody = new THREE.Vector3();
const _ndc = new THREE.Vector3();

function updateLabels() {
  if (!simulation.settings.labels) {
    labels.forEach((label) => {
      label.style.display = 'none';
    });
    return;
  }

  _camPos.copy(camera.position);
  camera.getWorldDirection(_camDir);

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;

  labels.forEach((label, body) => {
    const worldPos = body.position;

    // Check if body is in front of the camera plane
    _toBody.copy(worldPos).sub(_camPos);
    const inFront = _toBody.dot(_camDir) > 0.1;

    if (!inFront) {
      label.style.display = 'none';
      return;
    }

    _ndc.copy(worldPos).project(camera);
    if (_ndc.z < -1 || _ndc.z > 1) {
      label.style.display = 'none';
      return;
    }

    const screenX = (_ndc.x * 0.5 + 0.5) * containerW;
    const screenY = (-_ndc.y * 0.5 + 0.5) * containerH;

    label.style.display = 'flex';
    label.style.left = `${screenX}px`;
    label.style.top = `${screenY}px`;

    if (body === selectedBody) {
      label.classList.add('selected');
    } else {
      label.classList.remove('selected');
    }
  });
}

// Initial UI bindings
ui.renderPlanet(selectedBody.data);
ui.bind(simulation, {
  reset: () => {
    simulation.reset();
    cameraController.reset();
    sceneManager.clearAllTrails();
    ui.setPlaying(true);
  },
  focus: () => {
    cameraController.focus(selectedBody);
  },
  toggle: (key, value) => {
    if (key === 'orbits') {
      sceneManager.setOrbitsVisible(value);
    } else {
      simulation.settings[key] = value;
    }
  }
});

// Pointer drag detection to prevent accidental picking during orbit rotation
let pointerDownPos = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDownPos = { x: event.clientX, y: event.clientY };
});

function pickObject(event, focus = false) {
  const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
  if (dist > 6) return; // User was dragging the view, not clicking

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(pickableMeshes, true);
  if (hits.length > 0) {
    const targetObj = sceneManager.getPlanetFromObject(hits[0].object);
    if (targetObj) {
      selectBody(targetObj, focus);
    }
  }
}

renderer.domElement.addEventListener('click', (event) => pickObject(event, false));
renderer.domElement.addEventListener('dblclick', (event) => pickObject(event, true));

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cameraController.reset();
  } else if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    simulation.isPlaying = !simulation.isPlaying;
    ui.setPlaying(simulation.isPlaying);
  } else if (event.key >= '0' && event.key <= '8' && event.target.tagName !== 'INPUT') {
    const idx = parseInt(event.key, 10);
    if (allBodies[idx]) {
      selectBody(allBodies[idx], true);
    }
  }
});

// Responsive resize handling with ResizeObserver
const resizeObs = new ResizeObserver(() => {
  resizeRenderer(renderer, camera, container);
});
resizeObs.observe(container);
window.addEventListener('resize', () => resizeRenderer(renderer, camera, container));

// Main Animation Loop
const loop = new AnimationLoop((delta) => {
  simulation.update(delta);
  sceneManager.update(simulation.elapsedDays, simulation.settings, delta, simulation.isPlaying);
  controls.autoRotate = simulation.settings.autoRotate;

  cameraController.update(delta);
  controls.update();
  updateLabels();
  renderer.render(sceneManager.scene, camera);

  // FPS Counter
  fpsElapsed += delta;
  frames++;
  if (fpsElapsed >= 0.5) {
    ui.setFPS(Math.round(frames / fpsElapsed));
    fpsElapsed = 0;
    frames = 0;
  }
});

loop.start();
