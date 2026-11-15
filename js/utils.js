import * as THREE from 'three';

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const damp = (current, target, lambda, delta) => THREE.MathUtils.damp(current, target, lambda, delta);

export function formatDistance(millionKm) {
  if (millionKm === 0) return 'Solar Center';
  return millionKm >= 1000
    ? `${(millionKm / 1000).toFixed(2)} bn km`
    : `${millionKm.toFixed(1)} m km`;
}

export function makeLabel(text, color = '#dbe5ff') {
  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'scene-label';
  label.setAttribute('aria-label', `Select ${text}`);
  label.innerHTML = `<span class="label-dot" style="background:${color};"></span><span>${text}</span>`;
  return label;
}
