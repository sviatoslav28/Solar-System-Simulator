import * as THREE from 'three';
import { CONFIG } from './config.js';

export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.home = new THREE.Vector3(CONFIG.cameraHome.x, CONFIG.cameraHome.y, CONFIG.cameraHome.z);
    this.trackedTarget = null;
    this.isTransitioning = false;
    this.targetPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.prevTargetPos = new THREE.Vector3();

    // Reusable scratch vectors to avoid garbage collection pressure
    this._drift = new THREE.Vector3();
    this._move = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  focus(target) {
    if (!target) return;
    this.trackedTarget = target;
    this.isTransitioning = true;

    const planetPos = target.position;
    this.prevTargetPos.copy(planetPos);

    // Dynamic framing distance based on body size and rings
    const radius = target.radius || 1.0;
    let viewDist = radius * 4.6;
    if (target.data?.name === 'Saturn') {
      viewDist = radius * 6.5; // Extra room for Saturn's ring system
    } else if (target.data?.name === 'Sun') {
      viewDist = radius * 4.8;
    } else {
      viewDist = Math.max(1.8, viewDist);
    }

    // Determine approach direction
    this._dir.copy(this.camera.position).sub(this.controls.target);
    if (this._dir.lengthSq() < 0.001) {
      this._dir.set(0.6, 0.45, 0.8);
    }
    this._dir.normalize();

    // Ensure comfortable viewing elevation
    if (Math.abs(this._dir.y) < 0.25) {
      this._dir.y = 0.35;
      this._dir.normalize();
    }

    this.targetLookAt.copy(planetPos);
    this.targetPos.copy(planetPos).addScaledVector(this._dir, viewDist);
  }

  reset() {
    this.trackedTarget = null;
    this.isTransitioning = true;
    this.targetLookAt.set(0, 0, 0);
    this.targetPos.copy(this.home);
  }

  update(delta) {
    if (this.isTransitioning) {
      if (this.trackedTarget) {
        // Keep moving target updated while animating toward it
        const currentPlanetPos = this.trackedTarget.position;
        this._drift.copy(currentPlanetPos).sub(this.targetLookAt);
        this.targetLookAt.copy(currentPlanetPos);
        this.targetPos.add(this._drift);
        this.prevTargetPos.copy(currentPlanetPos);
      }

      const factor = 1 - Math.exp(-6.5 * delta);
      this.controls.target.lerp(this.targetLookAt, factor);
      this.camera.position.lerp(this.targetPos, factor);

      const distTarget = this.controls.target.distanceTo(this.targetLookAt);
      const distCam = this.camera.position.distanceTo(this.targetPos);

      if (distTarget < 0.04 && distCam < 0.06) {
        this.controls.target.copy(this.targetLookAt);
        this.camera.position.copy(this.targetPos);
        this.isTransitioning = false;
        if (this.trackedTarget) {
          this.prevTargetPos.copy(this.trackedTarget.position);
        }
      }
    } else if (this.trackedTarget) {
      // Dynamic orbit tracking: follow target seamlessly while allowing OrbitControls rotation
      const curr = this.trackedTarget.position;
      this._move.copy(curr).sub(this.prevTargetPos);
      this.camera.position.add(this._move);
      this.controls.target.add(this._move);
      this.prevTargetPos.copy(curr);
    }
  }
}
