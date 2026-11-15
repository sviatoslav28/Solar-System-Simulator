import * as THREE from 'three';
import { createOrbit, getOrbitPoint, solveKepler } from './orbit.js';
import {
  createMercuryTextures,
  createVenusTexture,
  createEarthTextures,
  createMarsTextures,
  createJupiterTexture,
  createSaturnTexture,
  createSaturnRingTexture,
  createUranusTexture,
  createUranusRingTexture,
  createNeptuneTexture,
  createAtmosphereMesh
} from '../js/textures.js';

// Scaled visual radii for pleasing, realistic relative planet proportions
const RADIUS_MAP = {
  Mercury: 0.24,
  Venus: 0.38,
  Earth: 0.40,
  Mars: 0.30,
  Jupiter: 1.05,
  Saturn: 0.88,
  Uranus: 0.58,
  Neptune: 0.56
};

// Calibrated visual orbit semi-major axes:
// Guaranteed strictly non-intersecting orbits that preserve astronomical order,
// clearance from the Sun's coronal flare, and true Keplerian eccentricities.
const ORBIT_MAP = {
  Mercury: 6.8,
  Venus: 10.2,
  Earth: 13.8,
  Mars: 17.8,
  Jupiter: 26.5,
  Saturn: 35.5,
  Uranus: 45.0,
  Neptune: 54.5
};

export const visualOrbitRadius = (data) => {
  if (typeof data === 'string' && ORBIT_MAP[data]) return ORBIT_MAP[data];
  if (data?.name && ORBIT_MAP[data.name]) return ORBIT_MAP[data.name];
  const sma = typeof data === 'number' ? data : (data?.semiMajorAxis || 100);
  return 4.5 + Math.log2(Math.max(1, sma / 10)) * 6.2;
};

const TRAIL_POINTS = 160;

export class PlanetObject {
  constructor(data, index) {
    this.data = data;
    this.group = new THREE.Group();

    // Orbital parameters
    this.orbitRadius = visualOrbitRadius(data);
    this.perihelionAngle = data.longitudeOfPerihelion || 0;
    this.orbit = createOrbit(
      this.orbitRadius,
      data.eccentricity,
      data.orbitalInclination,
      data.color,
      this.perihelionAngle
    );
    this.group.add(this.orbit);

    this.baseRadius = RADIUS_MAP[data.name] || Math.max(0.22, Math.log10(data.radius) * 0.12);
    this.phase = index * 0.78 + 0.35;

    // Local container that positions the planet along its orbit
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);

    // Axial tilt container
    this.axialGroup = new THREE.Group();
    const tiltRad = THREE.MathUtils.degToRad(data.axialTilt || 0);
    this.axialGroup.rotation.z = tiltRad;
    this.pivot.add(this.axialGroup);

    // Cached feature textures (avoids redundant heavy procedural generation)
    this._cachedTextures = null;

    // Planet sphere mesh
    const sphereGeo = new THREE.SphereGeometry(this.baseRadius, 48, 48);
    const material = this.createPlanetMaterial(data.name);
    this.planet = new THREE.Mesh(sphereGeo, material);
    this.planet.userData.planetObject = this;
    this.axialGroup.add(this.planet);

    // Specific planetary features
    this.clouds = null;
    this.ring = null;
    this.atmosphere = null;
    this.initFeatures(data.name);

    // Motion trails with glowing fade-out gradient
    this.trailCount = 0;
    this.lastOrbitScale = null;
    this.baseColor = new THREE.Color(data.color);
    this.trailPositions = new Float32Array(TRAIL_POINTS * 3);
    this.trailColors = new Float32Array(TRAIL_POINTS * 3);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setDrawRange(0, 0);

    this.trail = new THREE.Line(
      this.trailGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.trail.visible = false;
    this.group.add(this.trail);

    // Rotation properties
    const rotationHours = data.rotationHours || 24;
    this.spinSpeed = (24 / rotationHours) * 0.04;

    this.currentPosition = new THREE.Vector3();
  }

  createPlanetMaterial(name) {
    switch (name) {
      case 'Mercury': {
        const { map, bumpMap } = createMercuryTextures();
        return new THREE.MeshStandardMaterial({
          map,
          bumpMap,
          bumpScale: 0.035,
          roughness: 0.88,
          metalness: 0.05
        });
      }
      case 'Venus': {
        const map = createVenusTexture();
        return new THREE.MeshStandardMaterial({
          map,
          roughness: 0.45,
          metalness: 0.02
        });
      }
      case 'Earth': {
        // Cache Earth textures to reuse cloudsMap without re-generating procedural canvases
        this._cachedTextures = createEarthTextures();
        return new THREE.MeshStandardMaterial({
          map: this._cachedTextures.map,
          bumpMap: this._cachedTextures.bumpMap,
          bumpScale: 0.04,
          roughnessMap: this._cachedTextures.roughnessMap,
          metalness: 0.06
        });
      }
      case 'Mars': {
        const { map, bumpMap } = createMarsTextures();
        return new THREE.MeshStandardMaterial({
          map,
          bumpMap,
          bumpScale: 0.045,
          roughness: 0.85,
          metalness: 0.04
        });
      }
      case 'Jupiter': {
        const map = createJupiterTexture();
        return new THREE.MeshStandardMaterial({
          map,
          roughness: 0.62,
          metalness: 0.02
        });
      }
      case 'Saturn': {
        const map = createSaturnTexture();
        return new THREE.MeshStandardMaterial({
          map,
          roughness: 0.68,
          metalness: 0.02
        });
      }
      case 'Uranus': {
        const map = createUranusTexture();
        return new THREE.MeshStandardMaterial({
          map,
          roughness: 0.58,
          metalness: 0.02
        });
      }
      case 'Neptune': {
        const map = createNeptuneTexture();
        return new THREE.MeshStandardMaterial({
          map,
          roughness: 0.52,
          metalness: 0.02
        });
      }
      default:
        return new THREE.MeshStandardMaterial({
          color: this.data.color,
          roughness: 0.75,
          metalness: 0.05
        });
    }
  }

  initFeatures(name) {
    if (name === 'Earth') {
      // Dynamic Cloud Sphere using cached clouds texture
      const cloudGeo = new THREE.SphereGeometry(this.baseRadius * 1.018, 48, 48);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: this._cachedTextures ? this._cachedTextures.cloudsMap : null,
        transparent: true,
        opacity: 0.92,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
      this.clouds.userData.planetObject = this;
      this.axialGroup.add(this.clouds);

      // Atmospheric Rayleigh Rim Glow
      this.atmosphere = createAtmosphereMesh(this.baseRadius, 0x489dff, 0.42);
      this.pivot.add(this.atmosphere);
    } else if (name === 'Venus') {
      // Sulfuric atmosphere haze
      this.atmosphere = createAtmosphereMesh(this.baseRadius, 0xf0d59e, 0.35);
      this.pivot.add(this.atmosphere);
    } else if (name === 'Mars') {
      // Thin ferric pink atmosphere
      this.atmosphere = createAtmosphereMesh(this.baseRadius, 0xde7a52, 0.22);
      this.pivot.add(this.atmosphere);
    } else if (name === 'Saturn') {
      // Detailed multi-band ring system
      const innerR = this.baseRadius * 1.38;
      const outerR = this.baseRadius * 2.45;
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 80);
      const ringTex = createSaturnRingTexture(512, innerR / outerR);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        roughness: 0.65,
        metalness: 0.08
      });
      this.ring = new THREE.Mesh(ringGeo, ringMat);
      this.ring.userData.planetObject = this;
      this.ring.rotation.x = Math.PI / 2;
      this.axialGroup.add(this.ring);
    } else if (name === 'Uranus') {
      // Delicate thin ice rings
      const innerR = this.baseRadius * 1.32;
      const outerR = this.baseRadius * 1.82;
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
      const ringTex = createUranusRingTexture(256, innerR / outerR);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        roughness: 0.6
      });
      this.ring = new THREE.Mesh(ringGeo, ringMat);
      this.ring.userData.planetObject = this;
      this.ring.rotation.x = Math.PI / 2;
      this.axialGroup.add(this.ring);
    }
  }

  update(delta, simulationDays, simulationSpeed, isPlaying, planetScale, orbitScale, trailsEnabled) {
    const period = this.data.orbitalPeriod;
    // Mean anomaly progresses linearly with time
    const meanAnomaly = this.phase + (simulationDays / period) * Math.PI * 2;
    // Solve Kepler's equation for true Keplerian motion (Kepler's 2nd Law)
    const eccentricAnomaly = solveKepler(meanAnomaly, this.data.eccentricity);
    const scaledOrbitRadius = this.orbitRadius * orbitScale;

    if (this.lastOrbitScale !== orbitScale || !trailsEnabled) {
      this.clearTrail();
    }
    this.lastOrbitScale = orbitScale;

    // Calculate exact Keplerian elliptical position in 3D
    getOrbitPoint(
      scaledOrbitRadius,
      this.data.eccentricity,
      this.data.orbitalInclination,
      eccentricAnomaly,
      this.currentPosition,
      this.perihelionAngle
    );

    this.pivot.position.copy(this.currentPosition);
    this.pivot.scale.setScalar(planetScale);
    this.orbit.scale.setScalar(orbitScale);

    // Planet rotation on its tilted axis
    if (isPlaying) {
      const rotDelta = delta * this.spinSpeed * Math.min(simulationSpeed, 12);
      this.planet.rotation.y += rotDelta;

      if (this.clouds) {
        // Independent atmospheric cloud rotation
        this.clouds.rotation.y += rotDelta * 1.15;
      }

      // Record motion trails only when simulation is playing and moving
      if (trailsEnabled) {
        this.recordTrail();
      }
    }
  }

  recordTrail() {
    const point = this.currentPosition;

    // Avoid recording redundant points if barely moved
    if (this.trailCount > 0) {
      const lastIdx = (this.trailCount === TRAIL_POINTS ? TRAIL_POINTS - 1 : this.trailCount - 1) * 3;
      const dx = point.x - this.trailPositions[lastIdx];
      const dy = point.y - this.trailPositions[lastIdx + 1];
      const dz = point.z - this.trailPositions[lastIdx + 2];
      if (dx * dx + dy * dy + dz * dz < 0.0003) return;
    }

    if (this.trailCount === TRAIL_POINTS) {
      this.trailPositions.copyWithin(0, 3);
      const writeOffset = (TRAIL_POINTS - 1) * 3;
      this.trailPositions[writeOffset] = point.x;
      this.trailPositions[writeOffset + 1] = point.y;
      this.trailPositions[writeOffset + 2] = point.z;
    } else {
      const writeOffset = this.trailCount * 3;
      this.trailPositions[writeOffset] = point.x;
      this.trailPositions[writeOffset + 1] = point.y;
      this.trailPositions[writeOffset + 2] = point.z;
      this.trailCount++;
    }

    // Update smooth fading colors along the trail length
    const total = this.trailCount;
    for (let i = 0; i < total; i++) {
      const i3 = i * 3;
      const progress = total > 1 ? i / (total - 1) : 1;
      const alpha = Math.pow(progress, 1.8);
      this.trailColors[i3] = this.baseColor.r * alpha;
      this.trailColors[i3 + 1] = this.baseColor.g * alpha;
      this.trailColors[i3 + 2] = this.baseColor.b * alpha;
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;

    if (this.trailCount >= 2) {
      this.trailGeometry.setDrawRange(0, this.trailCount);
    }
  }

  clearTrail() {
    if (this.trailCount === 0) return;
    this.trailCount = 0;
    this.trailGeometry.setDrawRange(0, 0);
  }

  get position() {
    return this.pivot.getWorldPosition(new THREE.Vector3());
  }

  get radius() {
    return this.baseRadius;
  }

  dispose() {
    this.planet.geometry.dispose();
    if (this.planet.material.map) this.planet.material.map.dispose();
    if (this.planet.material.bumpMap) this.planet.material.bumpMap.dispose();
    if (this.planet.material.roughnessMap) this.planet.material.roughnessMap.dispose();
    this.planet.material.dispose();

    this.orbit.geometry.dispose();
    this.orbit.material.dispose();
    this.trailGeometry.dispose();
    this.trail.material.dispose();

    if (this.clouds) {
      this.clouds.geometry.dispose();
      if (this.clouds.material.map) this.clouds.material.map.dispose();
      this.clouds.material.dispose();
    }

    if (this.ring) {
      this.ring.geometry.dispose();
      if (this.ring.material.map) this.ring.material.map.dispose();
      this.ring.material.dispose();
    }

    if (this.atmosphere) {
      this.atmosphere.geometry.dispose();
      this.atmosphere.material.dispose();
    }
  }
}
