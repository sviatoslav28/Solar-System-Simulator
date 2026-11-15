import * as THREE from 'three';
import { createSunTexture } from '../js/textures.js';
import { SUN_DATA } from '../data/planets.js';

export class SunObject {
  constructor() {
    this.data = SUN_DATA;
    this.group = new THREE.Group();
    this.radius = 2.3;

    // Sun Surface
    const texture = createSunTexture(1024, 512);
    const coreGeo = new THREE.SphereGeometry(this.radius, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      map: texture
    });
    this.mesh = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.userData.planetObject = this; // Allow picking & focusing like planets
    this.group.add(this.mesh);

    // Inner Corona (warm bright glow)
    const innerCoronaGeo = new THREE.SphereGeometry(this.radius * 1.08, 36, 36);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    this.group.add(this.innerCorona);

    // Outer Corona Aura (pulsing soft flare halo)
    const outerCoronaGeo = new THREE.SphereGeometry(this.radius * 1.35, 36, 36);
    const outerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xff7711,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    this.group.add(this.outerCorona);

    // Primary Solar Light
    this.light = new THREE.PointLight(0xfff5ea, 3.8, 240, 1.15);
    this.group.add(this.light);

    // Warm secondary bounce light for atmospheric richness
    this.warmLight = new THREE.PointLight(0xffa834, 1.2, 160, 1.4);
    this.group.add(this.warmLight);

    this.pulsePhase = 0;
  }

  get position() {
    return this.mesh.getWorldPosition(new THREE.Vector3());
  }

  update(delta, speed = 1, isPlaying = true) {
    if (isPlaying) {
      // Differential solar rotation
      this.mesh.rotation.y += delta * 0.05 * Math.min(speed, 5);
      this.innerCorona.rotation.y -= delta * 0.03 * Math.min(speed, 5);
      this.outerCorona.rotation.z += delta * 0.02 * Math.min(speed, 5);

      // Subtle corona pulsation
      this.pulsePhase += delta * 1.5;
      const s = 1.0 + Math.sin(this.pulsePhase) * 0.02;
      this.outerCorona.scale.set(s, s, s);
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.innerCorona.geometry.dispose();
    this.innerCorona.material.dispose();
    this.outerCorona.geometry.dispose();
    this.outerCorona.material.dispose();
  }
}

export function createSun() {
  return new SunObject();
}
