import * as THREE from 'three';

// Fast 3D Simplex-like Perlin noise implementation
function createNoise(seed = 12345) {
  const p = new Uint8Array(512);
  let s = seed;
  function pseudoRandom() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  }
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];

  const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  return function (x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = x * x * x * (x * (x * 6 - 15) + 10);
    const v = y * y * y * (y * (y * 6 - 15) + 10);
    const w = z * z * z * (z * (z * 6 - 15) + 10);

    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

    const dot = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;

    const g000 = grad3[p[AA] % 12];
    const g100 = grad3[p[BA] % 12];
    const g010 = grad3[p[AB] % 12];
    const g110 = grad3[p[BB] % 12];
    const g001 = grad3[p[AA + 1] % 12];
    const g101 = grad3[p[BA + 1] % 12];
    const g011 = grad3[p[AB + 1] % 12];
    const g111 = grad3[p[BB + 1] % 12];

    const x1 = dot(g000, x, y, z) + u * (dot(g100, x - 1, y, z) - dot(g000, x, y, z));
    const x2 = dot(g010, x, y - 1, z) + u * (dot(g110, x - 1, y - 1, z) - dot(g010, x, y - 1, z));
    const y1 = x1 + v * (x2 - x1);

    const x3 = dot(g001, x, y, z - 1) + u * (dot(g101, x - 1, y, z - 1) - dot(g001, x, y, z - 1));
    const x4 = dot(g011, x, y - 1, z - 1) + u * (dot(g111, x - 1, y - 1, z - 1) - dot(g011, x, y - 1, z - 1));
    const y2 = x3 + v * (x4 - x3);

    return y1 + w * (y2 - y1);
  };
}

const noise = createNoise(42);
const noiseB = createNoise(9999);
const noiseC = createNoise(777);

function fbm(x, y, z, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let total = 0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency, z * frequency) * amplitude;
    max += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return total / max;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t))
  ];
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// -------------------------------------------------------------
// SUN TEXTURE
// -------------------------------------------------------------
export function createSunTexture(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Convection granulation & solar flares
      const n1 = fbm(nx * 14, ny * 14, nz * 14, 4);
      const n2 = fbm(nx * 28 + 4.2, ny * 28 + 1.7, nz * 28 + 8.9, 3);
      const n3 = noiseB(nx * 4, ny * 4, nz * 4);

      let val = n1 * 0.6 + n2 * 0.4;
      val = (val + 1) * 0.5; // 0 to 1

      // Sunspots
      let sunspot = Math.max(0, 1.0 - Math.abs(n3) * 6.0);
      sunspot = Math.pow(sunspot, 3);

      // Palette: deep fiery red -> bright orange-yellow -> incandescent white
      let r, g, b;
      if (val < 0.4) {
        const t = val / 0.4;
        [r, g, b] = lerpColor([200, 45, 0], [255, 120, 10], t);
      } else if (val < 0.75) {
        const t = (val - 0.4) / 0.35;
        [r, g, b] = lerpColor([255, 120, 10], [255, 215, 60], t);
      } else {
        const t = (val - 0.75) / 0.25;
        [r, g, b] = lerpColor([255, 215, 60], [255, 255, 220], t);
      }

      if (sunspot > 0.05) {
        const spotColor = [50, 15, 5];
        [r, g, b] = lerpColor([r, g, b], spotColor, sunspot * 0.85);
      }

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

// -------------------------------------------------------------
// MERCURY TEXTURES (Cratered, dusty grey-brown regolith + bump)
// -------------------------------------------------------------
export function createMercuryTextures(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const bumpCanvas = createCanvas(width, height);
  const bumpCtx = bumpCanvas.getContext('2d');
  const bumpImg = bumpCtx.createImageData(width, height);
  const bumpData = bumpImg.data;

  // Pre-generate prominent crater centers
  const craters = [];
  for (let i = 0; i < 35; i++) {
    const lat = (Math.random() - 0.5) * Math.PI * 0.85;
    const lon = (Math.random() - 0.5) * Math.PI * 2;
    craters.push({
      x: Math.cos(lat) * Math.cos(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.sin(lon),
      radius: 0.06 + Math.random() * 0.16,
      depth: 0.4 + Math.random() * 0.6
    });
  }

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Regolith noise
      const n1 = fbm(nx * 10, ny * 10, nz * 10, 5, 2.1, 0.5);
      const n2 = fbm(nx * 26, ny * 26, nz * 26, 3, 2.0, 0.5);
      let terrain = (n1 * 0.65 + n2 * 0.35 + 1) * 0.5;

      // Crater effects
      let craterHeight = 0;
      let rayEffect = 0;
      for (let i = 0; i < craters.length; i++) {
        const c = craters[i];
        const dist = Math.hypot(nx - c.x, ny - c.y, nz - c.z);
        if (dist < c.radius * 2.2) {
          const normDist = dist / c.radius;
          if (normDist < 1.0) {
            // Inside crater: bowl shape with raised rim
            const bowl = Math.sin(normDist * Math.PI * 0.5);
            craterHeight -= (1.0 - bowl) * c.depth * 0.4;
          } else if (normDist < 1.3) {
            // Crater rim peak
            const rim = Math.sin((normDist - 1.0) / 0.3 * Math.PI);
            craterHeight += rim * c.depth * 0.35;
          }
          // Bright impact ejecta rays
          if (dist > c.radius * 0.8 && dist < c.radius * 3.5) {
            const rayNoise = Math.abs(noiseB(nx * 40, ny * 40, nz * 40));
            rayEffect += (1.0 - dist / (c.radius * 3.5)) * rayNoise * 0.4;
          }
        }
      }

      const totalHeight = clamp(terrain + craterHeight, 0, 1);
      // Diffuse color: charcoal brown-grey with bright ray accents
      const baseTone = lerp(110, 175, totalHeight);
      let r = baseTone * 0.98;
      let g = baseTone * 0.95;
      let b = baseTone * 0.92;

      if (rayEffect > 0.05) {
        r = lerp(r, 220, clamp(rayEffect, 0, 0.7));
        g = lerp(g, 218, clamp(rayEffect, 0, 0.7));
        b = lerp(b, 215, clamp(rayEffect, 0, 0.7));
      }

      const idx = (y * width + x) * 4;
      data[idx] = clamp(Math.round(r), 0, 255);
      data[idx + 1] = clamp(Math.round(g), 0, 255);
      data[idx + 2] = clamp(Math.round(b), 0, 255);
      data[idx + 3] = 255;

      const bumpVal = Math.round(totalHeight * 255);
      bumpData[idx] = bumpVal;
      bumpData[idx + 1] = bumpVal;
      bumpData[idx + 2] = bumpVal;
      bumpData[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  return {
    map: makeCanvasTexture(canvas),
    bumpMap: makeCanvasTexture(bumpCanvas)
  };
}

// -------------------------------------------------------------
// VENUS TEXTURE (Dense, swirling sulfurous cream clouds)
// -------------------------------------------------------------
export function createVenusTexture(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;

    // Atmospheric zonal winds shear clouds in chevron patterns
    const shear = Math.cos(lat) * 2.2;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI + shear;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Swirling multi-octave cloud patterns
      const n1 = fbm(nx * 4, ny * 10, nz * 4, 4);
      const n2 = fbm(nx * 12 + 2, ny * 18, nz * 12, 3);
      const n3 = noise(nx * 2, ny * 5, nz * 2);

      let val = (n1 * 0.6 + n2 * 0.3 + n3 * 0.1 + 1) * 0.5;
      val = clamp(val, 0, 1);

      // Colors: Warm ivory, golden sulfur, muted amber-tan
      let r, g, b;
      if (val < 0.45) {
        const t = val / 0.45;
        [r, g, b] = lerpColor([210, 175, 120], [235, 205, 155], t);
      } else {
        const t = (val - 0.45) / 0.55;
        [r, g, b] = lerpColor([235, 205, 155], [252, 244, 222], t);
      }

      // Soft polar brightening
      const polar = Math.pow(Math.abs(sinLat), 3) * 0.2;
      r = lerp(r, 255, polar);
      g = lerp(g, 250, polar);
      b = lerp(b, 235, polar);

      const idx = (y * width + x) * 4;
      data[idx] = clamp(Math.round(r), 0, 255);
      data[idx + 1] = clamp(Math.round(g), 0, 255);
      data[idx + 2] = clamp(Math.round(b), 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

// -------------------------------------------------------------
// EARTH TEXTURES (Continents, biomes, ice caps, oceans, clouds, specular, bump)
// -------------------------------------------------------------
export function createEarthTextures(width = 1024, height = 512) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const bumpCanvas = createCanvas(width, height);
  const bumpCtx = bumpCanvas.getContext('2d');
  const bumpImg = bumpCtx.createImageData(width, height);
  const bumpData = bumpImg.data;

  const specCanvas = createCanvas(width, height);
  const specCtx = specCanvas.getContext('2d');
  const specImg = specCtx.createImageData(width, height);
  const specData = specImg.data;

  // Cloud canvas
  const cloudCanvas = createCanvas(width, height);
  const cloudCtx = cloudCanvas.getContext('2d');
  const cloudImg = cloudCtx.createImageData(width, height);
  const cloudData = cloudImg.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI; // -PI/2 to PI/2
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const absLat = Math.abs(lat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Continent shape generation via multi-octave noise
      const c1 = fbm(nx * 1.8, ny * 1.8, nz * 1.8, 5, 2.0, 0.52);
      const c2 = fbm(nx * 4.5 + 1.2, ny * 4.5, nz * 4.5 + 3.1, 4, 2.0, 0.5);
      const c3 = fbm(nx * 12.0, ny * 12.0, nz * 12.0, 3, 2.0, 0.5);

      let continentVal = c1 * 0.7 + c2 * 0.25 + c3 * 0.05;

      // Polar ice caps
      const isNorthPole = lat > 1.25;
      const isSouthPole = lat < -1.15;
      const poleProximity = Math.max(0, (absLat - 1.1) / 0.47);

      let r = 0, g = 0, b = 0;
      let bump = 0;
      let roughness = 20; // 0 = reflective ocean, 255 = matte land

      const seaLevel = 0.04;

      if (poleProximity > 0.4 || isNorthPole || isSouthPole) {
        // Polar Ice
        const iceNoise = (noise(nx * 16, ny * 16, nz * 16) + 1) * 0.5;
        const iceFactor = clamp(poleProximity * 1.5 + iceNoise * 0.3, 0, 1);
        [r, g, b] = lerpColor([210, 230, 250], [255, 255, 255], iceFactor);
        bump = Math.round(180 + iceNoise * 50);
        roughness = 70;
      } else if (continentVal < seaLevel) {
        // Ocean
        const depth = clamp((seaLevel - continentVal) * 3.5, 0, 1);
        // Shallow shelf turquoise -> deep abyssal navy
        [r, g, b] = lerpColor([24, 98, 148], [10, 28, 72], depth);
        bump = 15;
        roughness = 18; // Very smooth, high specular glint!
      } else {
        // Land
        const elevation = clamp((continentVal - seaLevel) * 3.0, 0, 1);
        bump = Math.round(elevation * 230 + 25);
        roughness = 220; // Matte land

        // Biomes based on latitude & elevation
        if (absLat < 0.45) {
          // Tropical / Equatorial: Lush greens & savanna
          if (elevation < 0.3) {
            [r, g, b] = lerpColor([38, 92, 42], [58, 126, 52], elevation / 0.3);
          } else {
            [r, g, b] = lerpColor([58, 126, 52], [148, 132, 78], (elevation - 0.3) / 0.7);
          }
        } else if (absLat < 0.75) {
          // Arid desert belts (around 20-35 deg latitude)
          const desertNoise = (noise(nx * 5, ny * 5, nz * 5) + 1) * 0.5;
          if (desertNoise > 0.35 && elevation < 0.55) {
            // Golden-ochre desert
            [r, g, b] = lerpColor([198, 168, 110], [162, 130, 80], elevation / 0.55);
          } else {
            // Temperate forests & meadows
            [r, g, b] = lerpColor([52, 105, 48], [88, 135, 62], elevation);
          }
        } else {
          // Sub-polar taiga & tundra
          [r, g, b] = lerpColor([56, 82, 54], [112, 115, 98], elevation);
        }

        // Mountain snow peaks
        if (elevation > 0.75) {
          const snow = (elevation - 0.75) / 0.25;
          [r, g, b] = lerpColor([r, g, b], [245, 250, 255], snow);
          roughness = Math.round(lerp(220, 90, snow));
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;

      bumpData[idx] = bump;
      bumpData[idx + 1] = bump;
      bumpData[idx + 2] = bump;
      bumpData[idx + 3] = 255;

      specData[idx] = roughness;
      specData[idx + 1] = roughness;
      specData[idx + 2] = roughness;
      specData[idx + 3] = 255;

      // -----------------
      // Clouds Texture
      // -----------------
      // Swirling atmospheric storms & cyclonic cloud spirals
      const cloudN1 = fbm(nx * 3.5, ny * 3.5, nz * 3.5, 5, 2.1, 0.5);
      const cloudN2 = fbm(nx * 10.0 + 1.5, ny * 10.0, nz * 10.0 + 2.3, 3);
      // Equatorial ITCZ trade-wind belt
      const itcz = Math.exp(-Math.pow(lat / 0.28, 2)) * 0.35;
      let cloudVal = cloudN1 * 0.7 + cloudN2 * 0.3 + itcz;

      if (cloudVal > 0.18) {
        const cloudAlpha = clamp((cloudVal - 0.18) / 0.35, 0, 0.95);
        cloudData[idx] = 255;
        cloudData[idx + 1] = 255;
        cloudData[idx + 2] = 255;
        cloudData[idx + 3] = Math.round(cloudAlpha * 255);
      } else {
        cloudData[idx] = 0;
        cloudData[idx + 1] = 0;
        cloudData[idx + 2] = 0;
        cloudData[idx + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);
  specCtx.putImageData(specImg, 0, 0);
  cloudCtx.putImageData(cloudImg, 0, 0);

  return {
    map: makeCanvasTexture(canvas),
    bumpMap: makeCanvasTexture(bumpCanvas),
    roughnessMap: makeCanvasTexture(specCanvas),
    cloudsMap: makeCanvasTexture(cloudCanvas)
  };
}

// -------------------------------------------------------------
// MARS TEXTURES (Ferric red/orange, dark maria, white ice caps + bump)
// -------------------------------------------------------------
export function createMarsTextures(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const bumpCanvas = createCanvas(width, height);
  const bumpCtx = bumpCanvas.getContext('2d');
  const bumpImg = bumpCtx.createImageData(width, height);
  const bumpData = bumpImg.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const absLat = Math.abs(lat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Mars terrain & dark albedo maria (Syrtis Major, Acidalia)
      const n1 = fbm(nx * 3.0, ny * 3.0, nz * 3.0, 5, 2.0, 0.5);
      const n2 = fbm(nx * 8.0 + 3.1, ny * 8.0, nz * 8.0 + 1.9, 4);
      const n3 = noise(nx * 18, ny * 18, nz * 18);

      let terrain = (n1 * 0.65 + n2 * 0.25 + n3 * 0.1 + 1) * 0.5;

      // Polar ice caps (crisp North & South caps)
      const isPole = absLat > 1.35;
      const poleT = clamp((absLat - 1.3) / 0.25, 0, 1);

      let r, g, b;
      let bumpVal = Math.round(terrain * 200 + 40);

      if (isPole || poleT > 0.5) {
        // Polar ice cap (carbon dioxide and water frost)
        [r, g, b] = lerpColor([210, 160, 140], [255, 250, 248], poleT);
        bumpVal = 210;
      } else {
        // Rusty ferric terrain with dark basaltic lowlands
        if (terrain < 0.42) {
          // Dark albedo regions
          const t = terrain / 0.42;
          [r, g, b] = lerpColor([85, 42, 28], [155, 68, 36], t);
        } else {
          // Bright rusty highlands & dust plains
          const t = (terrain - 0.42) / 0.58;
          [r, g, b] = lerpColor([155, 68, 36], [218, 108, 52], t);
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;

      bumpData[idx] = bumpVal;
      bumpData[idx + 1] = bumpVal;
      bumpData[idx + 2] = bumpVal;
      bumpData[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  return {
    map: makeCanvasTexture(canvas),
    bumpMap: makeCanvasTexture(bumpCanvas)
  };
}

// -------------------------------------------------------------
// JUPITER TEXTURE (Gas bands, turbulent ripples, Great Red Spot)
// -------------------------------------------------------------
export function createJupiterTexture(width = 1024, height = 512) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Position of Great Red Spot: lat around -22 deg (-0.38 rad), lon around 0 rad
  const grsLat = -0.38;
  const grsLon = 0.2;
  const grsRadiusX = 0.26;
  const grsRadiusY = 0.13;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;

    // Atmospheric shear between counter-rotating jet streams
    const bandSine = Math.sin(lat * 14.0);
    const shear = bandSine * 0.4;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;

      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      const nx = cosLat * Math.cos(lon + shear);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon + shear);

      // Multi-scale cloud turbulence
      const turb1 = fbm(nx * 3.0, ny * 18.0, nz * 3.0, 4);
      const turb2 = noise(nx * 14.0, ny * 35.0, nz * 14.0) * 0.25;

      // Band modulation (Equatorial Belts vs Tropical Zones)
      const bandPattern = Math.sin(lat * 16.0 + turb1 * 2.5 + turb2);
      const bandT = (bandPattern + 1) * 0.5;

      let r, g, b;
      if (bandT < 0.4) {
        // Dark belts: copper, burnt sienna, umber
        const t = bandT / 0.4;
        [r, g, b] = lerpColor([155, 82, 54], [195, 128, 86], t);
      } else if (bandT < 0.75) {
        // Light zones: ivory, cream, pale amber
        const t = (bandT - 0.4) / 0.35;
        [r, g, b] = lerpColor([195, 128, 86], [238, 218, 185], t);
      } else {
        // Bright white/cream cloud crests
        const t = (bandT - 0.75) / 0.25;
        [r, g, b] = lerpColor([238, 218, 185], [252, 244, 230], t);
      }

      // Check Great Red Spot
      let dLon = lon - grsLon;
      if (dLon > Math.PI) dLon -= 2 * Math.PI;
      if (dLon < -Math.PI) dLon += 2 * Math.PI;
      const dLat = lat - grsLat;
      const spotDist = Math.pow(dLon / grsRadiusX, 2) + Math.pow(dLat / grsRadiusY, 2);

      if (spotDist < 1.0) {
        // Inside Great Red Spot: concentric vortex spiral rings
        const normDist = Math.sqrt(spotDist);
        const spiralAngle = Math.atan2(dLat, dLon) + normDist * 6.0;
        const spotTurb = (Math.sin(spiralAngle * 3.0) + 1) * 0.15;
        const spotColor = lerpColor([185, 48, 28], [225, 95, 58], (1.0 - normDist) + spotTurb);
        const edgeBlend = clamp((1.0 - normDist) * 3.5, 0, 1);
        [r, g, b] = lerpColor([r, g, b], spotColor, edgeBlend);
      } else if (spotDist < 1.6 && dLon > 0) {
        // Turbulent wake trailing the Great Red Spot
        const wakeNoise = Math.abs(noiseB(nx * 20, ny * 20, nz * 20));
        [r, g, b] = lerpColor([r, g, b], [245, 235, 220], wakeNoise * 0.4);
      }

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

// -------------------------------------------------------------
// SATURN TEXTURES (Pastel gas bands + Multi-division rings)
// -------------------------------------------------------------
export function createSaturnTexture(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;

      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Subtle, smooth golden pastel gas bands
      const band = Math.sin(lat * 18.0) * 0.3 + fbm(nx * 2, ny * 12, nz * 2, 3) * 0.2;
      const t = (band + 1) * 0.5;

      let r, g, b;
      [r, g, b] = lerpColor([215, 185, 138], [242, 224, 186], t);

      // Darker polar hoods
      const polar = Math.pow(Math.abs(sinLat), 4) * 0.35;
      [r, g, b] = lerpColor([r, g, b], [150, 130, 95], polar);

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

// Saturn Rings: Drawn on a 2D canvas matching RingGeometry planar UVs
export function createSaturnRingTexture(size = 512, innerRadiusRatio = 0.55) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const center = size / 2;
  const maxR = size / 2;
  const minR = maxR * innerRadiusRatio;

  for (let y = 0; y < size; y++) {
    const dy = y - center;
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dist = Math.hypot(dx, dy);

      const idx = (y * size + x) * 4;

      if (dist < minR || dist > maxR) {
        // Outside the ring
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      // Normalized radial position across ring span (0 = inner edge, 1 = outer edge)
      const rNorm = (dist - minR) / (maxR - minR);

      let alpha = 0;
      let [r, g, b] = [218, 192, 148];

      // Multi-band ring structure:
      // 0.00 - 0.20: C Ring (faint, translucent)
      // 0.20 - 0.65: B Ring (bright, dense, high opacity)
      // 0.65 - 0.72: Cassini Division (gap, low opacity)
      // 0.72 - 0.96: A Ring (medium bright with Encke gap)
      // 0.96 - 1.00: Soft outer edge
      if (rNorm < 0.20) {
        // C Ring
        alpha = lerp(0.12, 0.45, rNorm / 0.20);
        [r, g, b] = [170, 150, 120];
      } else if (rNorm < 0.65) {
        // B Ring (bright & dense with fine sub-ringlets)
        const ringlet = (Math.sin(rNorm * 180.0) + 1) * 0.08;
        alpha = clamp(0.85 + ringlet, 0, 0.98);
        [r, g, b] = [232, 208, 164];
      } else if (rNorm < 0.72) {
        // Cassini Division (prominent clear gap)
        const gapT = (rNorm - 0.65) / 0.07;
        alpha = Math.sin(gapT * Math.PI) * 0.04 + 0.02;
        [r, g, b] = [110, 95, 75];
      } else if (rNorm < 0.96) {
        // A Ring
        let aAlpha = 0.72;
        // Encke gap around 0.88
        if (Math.abs(rNorm - 0.88) < 0.015) {
          aAlpha = 0.15;
        }
        alpha = aAlpha;
        [r, g, b] = [215, 190, 148];
      } else {
        // Outer fade
        alpha = (1.0 - (rNorm - 0.96) / 0.04) * 0.65;
        [r, g, b] = [190, 168, 130];
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// -------------------------------------------------------------
// URANUS TEXTURES (Pale cyan ice giant + faint thin rings)
// -------------------------------------------------------------
export function createUranusTexture(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;

    for (let x = 0; x < width; x++) {
      // Subtle pastel banding
      const band = Math.sin(lat * 8.0) * 0.08;
      const polar = Math.pow(Math.abs(Math.sin(lat)), 2) * 0.22;

      let [r, g, b] = lerpColor([142, 217, 223], [178, 236, 240], (band + 1) * 0.5);
      [r, g, b] = lerpColor([r, g, b], [210, 246, 248], polar);

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

export function createUranusRingTexture(size = 256, innerRadiusRatio = 0.72) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const center = size / 2;
  const maxR = size / 2;
  const minR = maxR * innerRadiusRatio;

  for (let y = 0; y < size; y++) {
    const dy = y - center;
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dist = Math.hypot(dx, dy);
      const idx = (y * size + x) * 4;

      if (dist < minR || dist > maxR) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      const rNorm = (dist - minR) / (maxR - minR);
      // Delicate thin ice rings
      const ringLine = Math.sin(rNorm * Math.PI * 4.0);
      const alpha = Math.max(0, ringLine) * 0.4;

      data[idx] = 180;
      data[idx + 1] = 225;
      data[idx + 2] = 235;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// -------------------------------------------------------------
// NEPTUNE TEXTURE (Deep cobalt/azure blue, wind bands, storm spots, cirrus)
// -------------------------------------------------------------
export function createNeptuneTexture(width = 512, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Great Dark Spot at lat -0.4, lon -0.5
  const gdsLat = -0.4;
  const gdsLon = -0.5;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * 2 * Math.PI - Math.PI;

      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);

      // Supersonic wind streaks & banding
      const band = Math.sin(lat * 12.0) * 0.2 + fbm(nx * 2, ny * 14, nz * 2, 3) * 0.15;
      const t = (band + 1) * 0.5;

      let [r, g, b] = lerpColor([24, 60, 195], [52, 118, 235], t);

      // Great Dark Spot
      const dLon = lon - gdsLon;
      const dLat = lat - gdsLat;
      const spotDist = Math.pow(dLon / 0.22, 2) + Math.pow(dLat / 0.11, 2);
      if (spotDist < 1.0) {
        [r, g, b] = lerpColor([12, 28, 105], [r, g, b], Math.sqrt(spotDist));
      }

      // Bright white high-altitude methane cirrus clouds ("Scooter")
      const cirrusNoise = fbm(nx * 12 + 4.5, ny * 20, nz * 12 + 1.2, 4);
      if (cirrusNoise > 0.42) {
        const cFactor = clamp((cirrusNoise - 0.42) / 0.25, 0, 0.85);
        [r, g, b] = lerpColor([r, g, b], [230, 245, 255], cFactor);
      }

      const idx = (y * width + x) * 4;
      data[idx] = clamp(r, 0, 255);
      data[idx + 1] = clamp(g, 0, 255);
      data[idx + 2] = clamp(b, 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return makeCanvasTexture(canvas);
}

// -------------------------------------------------------------
// ATMOSPHERIC GLOW MESH HELPER (Fresnel Limb Scattering)
// -------------------------------------------------------------
export function createAtmosphereMesh(radius, glowColor, opacity = 0.35) {
  const geometry = new THREE.SphereGeometry(radius * 1.028, 48, 48);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(glowColor) },
      opacity: { value: opacity }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float fresnel = 1.0 - max(0.0, dot(vNormal, viewDir));
        float intensity = pow(fresnel, 2.8);
        gl_FragColor = vec4(color, intensity * opacity);
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  return new THREE.Mesh(geometry, material);
}
