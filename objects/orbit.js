import * as THREE from 'three';

/**
 * Solves Kepler's equation M = E - e * sin(E) using Newton-Raphson iteration.
 * Returns Eccentric Anomaly E given Mean Anomaly M and eccentricity e.
 */
export function solveKepler(meanAnomaly, eccentricity) {
  if (eccentricity === 0) return meanAnomaly;

  // Normalize mean anomaly to [0, 2π)
  let M = meanAnomaly % (Math.PI * 2);
  if (M < 0) M += Math.PI * 2;

  let E = M;
  for (let i = 0; i < 6; i++) {
    const f = E - eccentricity * Math.sin(E) - M;
    const fPrime = 1 - eccentricity * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return E;
}

/**
 * Calculates 3D orbital position given semi-major axis, eccentricity, inclination,
 * eccentric anomaly (or orbital parameter) theta, and optional longitude of perihelion.
 * Sun is located at the primary focus (0, 0, 0).
 */
export function getOrbitPoint(a, e, inclinationDeg, theta, target = new THREE.Vector3(), perihelionDeg = 0) {
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const inc = (inclinationDeg * Math.PI) / 180;
  const omega = (perihelionDeg * Math.PI) / 180;

  // Primary focus at (0, 0): offset along perihelion axis
  const xOrb = a * (Math.cos(theta) - e);
  const zOrb = b * Math.sin(theta);

  // Rotate by argument/longitude of perihelion in orbital plane
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);
  const xRot = xOrb * cosW - zOrb * sinW;
  const zRot = xOrb * sinW + zOrb * cosW;

  // Apply orbital inclination tilt relative to the ecliptic plane
  const x = xRot;
  const y = zRot * Math.sin(inc);
  const z = zRot * Math.cos(inc);

  target.set(x, y, z);
  return target;
}

/**
 * Builds a smooth Three.js LineLoop representing the planet's Keplerian orbit path.
 */
export function createOrbit(radius, eccentricity, inclinationDeg, color, perihelionDeg = 0) {
  const segments = 240;
  const positions = new Float32Array(segments * 3);
  const pt = new THREE.Vector3();

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    getOrbitPoint(radius, eccentricity, inclinationDeg, theta, pt, perihelionDeg);
    positions[i * 3] = pt.x;
    positions[i * 3 + 1] = pt.y;
    positions[i * 3 + 2] = pt.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.LineLoop(geometry, material);
}
