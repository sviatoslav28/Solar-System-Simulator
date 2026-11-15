import * as THREE from 'three';
import { createSun } from '../objects/sun.js';
import { PlanetObject } from '../objects/planet.js';

let sharedStarTexture = null;
function getSharedStarTexture() {
  if (sharedStarTexture) return sharedStarTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(235, 245, 255, 0.85)');
  gradient.addColorStop(0.5, 'rgba(180, 210, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  sharedStarTexture = new THREE.CanvasTexture(canvas);
  return sharedStarTexture;
}

export class SceneManager {
  constructor(planetData) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050711, 0.0035);

    // Balanced space ambient lighting (preserves dark sides of planets while keeping textures visible)
    const ambient = new THREE.AmbientLight(0x404868, 0.55);
    this.scene.add(ambient);

    // Sun object
    this.sun = createSun();
    this.scene.add(this.sun.group);

    // Planets
    this.planets = planetData.map((data, index) => new PlanetObject(data, index));
    this.planets.forEach((planet) => this.scene.add(planet.group));

    this.addStars();
    this.addNebulaHaze();
  }

  addStars() {
    const starCount = 3800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    // Realistic stellar spectral colors: O/B (blue-white), A/F (white), G (yellow), K/M (orange-red)
    const spectralColors = [
      new THREE.Color(0xaabbff), // Hot blue-white
      new THREE.Color(0xdce6ff), // Blue-white
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0xfff1dc), // Soft yellow
      new THREE.Color(0xffddb4), // Warm gold
      new THREE.Color(0xffbb88)  // Orange giant
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 120 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Weight towards white and blue-white
      const colorIndex = Math.floor(Math.pow(Math.random(), 1.5) * spectralColors.length);
      const col = spectralColors[colorIndex];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starTexture = getSharedStarTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.42,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  addNebulaHaze() {
    // Subtle cosmic dust haze in deep background
    const hazeCount = 500;
    const positions = new Float32Array(hazeCount * 3);
    const colors = new Float32Array(hazeCount * 3);

    for (let i = 0; i < hazeCount; i++) {
      const i3 = i * 3;
      const r = 160 + Math.random() * 90;
      // Concentrate near galactic plane
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.PI * 0.5 + (Math.random() - 0.5) * 0.45;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi);
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      colors[i3] = 0.12 + Math.random() * 0.08;
      colors[i3 + 1] = 0.08 + Math.random() * 0.12;
      colors[i3 + 2] = 0.22 + Math.random() * 0.18;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 8.5,
      map: getSharedStarTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.nebula = new THREE.Points(geo, mat);
    this.scene.add(this.nebula);
  }

  update(days, settings, delta, isPlaying = true) {
    this.planets.forEach((planet) => {
      planet.trail.visible = settings.trails;
      planet.update(
        delta,
        days,
        settings.speed,
        isPlaying,
        settings.planetScale,
        settings.orbitScale,
        settings.trails
      );
    });

    this.sun.update(delta, settings.speed, isPlaying);

    if (this.stars) {
      this.stars.rotation.y += delta * 0.001;
    }
    if (this.nebula) {
      this.nebula.rotation.y += delta * 0.0006;
    }
  }

  clearAllTrails() {
    this.planets.forEach((planet) => planet.clearTrail());
  }

  setOrbitsVisible(value) {
    this.planets.forEach((planet) => {
      planet.orbit.visible = value;
    });
  }

  getPlanetFromObject(object) {
    let current = object;
    while (current) {
      if (current.userData.planetObject) return current.userData.planetObject;
      current = current.parent;
    }
    return null;
  }

  dispose() {
    this.sun.dispose();
    this.planets.forEach((p) => p.dispose());
    if (this.stars) {
      this.stars.geometry.dispose();
      this.stars.material.dispose();
    }
    if (this.nebula) {
      this.nebula.geometry.dispose();
      this.nebula.material.dispose();
    }
    if (sharedStarTexture) {
      sharedStarTexture.dispose();
      sharedStarTexture = null;
    }
  }
}
