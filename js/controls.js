import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 0.65; // Allows inspecting high-detail planet surfaces closely
  controls.maxDistance = 280;  // Allows zooming out to view the entire solar system
  controls.maxPolarAngle = Math.PI * 0.94;
  return controls;
}
