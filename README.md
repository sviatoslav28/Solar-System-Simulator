# 🌌 3D Solar System Simulator

[![Three.js](https://img.shields.io/badge/Three.js-r166-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl)](https://www.khronos.org/webgl/)
[![NASA Data](https://img.shields.io/badge/Data-NASA%20Planetary%20Fact%20Sheet-0B3D91?style=for-the-badge&logo=nasa)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Pure Vanilla](https://img.shields.io/badge/Architecture-Zero--Build%20ESM-2ea44f?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

An interactive, data-driven 3D Solar System simulator built with **Three.js**, **WebGL**, and native **JavaScript ES Modules**. Features physically grounded **Keplerian orbital mechanics**, procedural planetary textures, Fresnel atmospheric scattering, and a responsive glassmorphism control panel.

Created by **Sviatoslav Bayer**.

---

## ✨ Features

- **Keplerian Orbital Mechanics**:
  - Solves Kepler's Equation ($M = E - e \sin E$) via Newton-Raphson numerical iteration to accurately reflect planetary velocity changes between perihelion and aphelion (Kepler's Second Law).
  - Accurate NASA orbital parameters: eccentricities, inclinations, and longitudes of perihelion.
  - Calibrated, mathematically proven non-intersecting orbit lanes ensuring visual clarity without orbital collisions.

- **High-Fidelity Procedural Textures**:
  - Procedural canvas generators for surface maps, bump maps, roughness maps, and cloud layers.
  - Granulated solar convective cell flares, sunspots, Earth oceans and terrain, Jupiter's Great Red Spot with turbulent trailing wake, multi-band ring systems for Saturn and Uranus.
  - GLSL ShaderMaterial implementation for atmospheric Rayleigh limb scattering on Earth, Venus, and Mars.

- **Cinematic Camera & Tracking**:
  - Smooth exponential damping with dynamic framing based on planetary radii and ring extents.
  - Real-time orbital target tracking allowing full orbit/pan/zoom inspection while celestial bodies travel through space.
  - Global overview reset framing the entire solar system out to Neptune with stars and deep-space nebula haze.

- **Cometary Motion Trails**:
  - Dynamic orbital trails with smooth alpha-gradient fading towards the tail.
  - Pause-safe point recording that prevents trail collapse.

- **HUD & Interactive Controls**:
  - Bi-directional time controls ($0.25\times$ to $10\times$ speed multipliers, pause/play).
  - Dynamic scaling sliders for planet sizes and orbital distances.
  - Interactive planet picker strip, raycaster object picking, and billboarding screen-projected labels.
  - Comprehensive NASA physical metrics: mass, equatorial radius, density, gravity, orbital velocity, axial tilt, rotation period, distance, and moon counts.

---

## 🎮 Controls & Shortcuts

| Action | Control | Description |
| :--- | :--- | :--- |
| **Orbit Camera** | Left Click + Drag | Rotate viewing perspective around the target |
| **Pan Camera** | Right Click + Drag | Pan camera parallel to viewing plane |
| **Zoom View** | Mouse Wheel / Pinch | Zoom in or out ($0.65$ to $280$ units) |
| **Select Body** | Click mesh / label | View planetary metrics in sidebar |
| **Focus & Track** | Double-Click / Focus button | Smoothly fly camera to and lock tracking on planet |
| **Reset Overview** | `Esc` / "Reset view" button | Smoothly return to the complete solar overview |
| **Play / Pause** | `Space` / Playback buttons | Pause or resume celestial motion |
| **Quick Select** | `0` through `8` keys | Instant focus (`0`: Sun, `1`: Mercury, ..., `8`: Neptune) |

---

## 🪐 Planetary Data Overview

All celestial bodies are modeled using data from the [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/):

| Body | Semi-Major Axis | Eccentricity | Inclination | Axial Tilt | Moons |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Sun** | Center ($0.0$) | $0.0000$ | $0.00^\circ$ | $7.25^\circ$ | 8 planets, 5 dwarfs |
| **Mercury** | $57.91$ million km | $0.2056$ | $7.00^\circ$ | $0.03^\circ$ | $0$ |
| **Venus** | $108.21$ million km | $0.0068$ | $3.39^\circ$ | $177.30^\circ$ | $0$ |
| **Earth** | $149.60$ million km | $0.0167$ | $0.00^\circ$ | $23.44^\circ$ | $1$ |
| **Mars** | $227.92$ million km | $0.0934$ | $1.85^\circ$ | $25.19^\circ$ | $2$ |
| **Jupiter** | $778.57$ million km | $0.0489$ | $1.30^\circ$ | $3.13^\circ$ | $95$ |
| **Saturn** | $1433.53$ million km | $0.0565$ | $2.49^\circ$ | $26.73^\circ$ | $146$ |
| **Uranus** | $2872.46$ million km | $0.0457$ | $0.77^\circ$ | $97.77^\circ$ | $28$ |
| **Neptune** | $4495.06$ million km | $0.0113$ | $1.77^\circ$ | $28.32^\circ$ | $16$ |

---

## 📁 Project Structure

```text
solar-system/
├── index.html                 # Main HTML5 entry point & import map
├── style.css                  # Modern glassmorphism UI styles
├── favic.png                  # Project favicon
├── package.json               # Project metadata & npm dev scripts
├── LICENSE                    # MIT License
├── README.md                  # Project documentation
├── data/
│   └── planets.js             # NASA astronomical dataset & parameters
├── js/
│   ├── animation.js           # RequestAnimationFrame loop controller
│   ├── app.js                 # Application bootstrap & event orchestration
│   ├── camera.js              # CameraController with target tracking & easing
│   ├── config.js              # Simulation configuration & camera home coordinates
│   ├── controls.js            # Three.js OrbitControls configuration
│   ├── renderer.js            # WebGL renderer, ACES tone mapping, resize observer
│   ├── textures.js            # Procedural canvas textures & atmospheric GLSL shaders
│   ├── ui.js                  # HUD event listeners, metric binding, speed sync
│   └── utils.js               # Mathematical helpers & label creation
├── managers/
│   ├── sceneManager.js        # Scene graph, starfield, nebula particles & lights
│   └── simulationManager.js   # Time progression & settings state manager
└── objects/
    ├── orbit.js               # Kepler solver & 3D elliptical orbit geometry
    ├── planet.js              # PlanetObject class (meshes, tilt, rings, clouds, trails)
    └── sun.js                 # SunObject class (emissive core, pulsing coronas, solar light)
```

---

## 🚀 Getting Started

Because this project uses native **ES Modules** and standard **Browser Import Maps**, it requires **zero build steps** or bundlers. You just need a local static HTTP server to serve the ES modules.

### Option 1: Using Node.js (Quickest)

```bash
# Clone the repository
git clone https://github.com/svatoslavbayer/solar-system.git
cd solar-system

# Start lightweight server (no install required)
npx serve .
# or
npm start
```

Open `http://localhost:3000` in your browser.

### Option 2: Using Python

```bash
# Python 3
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

### Option 3: VS Code Live Server

1. Open the project folder in **Visual Studio Code**.
2. Right click on `index.html` and click **"Open with Live Server"**.

---

## 🌐 Deploying to GitHub Pages

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Solar System Simulator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/solar-system.git
   git push -u origin main
   ```
2. On GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4. Set branch to `main` and folder to `/(root)`.
5. Click **Save**. Your site will be live at `https://<your-username>.github.io/solar-system/`!

---

## 🔬 Physics & Mathematical Details

### Kepler's Equation Solution
Planets in elliptical orbits do not move at a constant angular velocity. To find the true position at any time $t$:

1. Compute **Mean Anomaly**:
   $$M = M_0 + \frac{2\pi}{T} \cdot t$$
   where $T$ is the orbital period and $M_0$ is the initial phase.

2. Solve **Kepler's Equation** for **Eccentric Anomaly** $E$:
   $$M = E - e \sin E$$
   using Newton-Raphson iteration:
   $$E_{n+1} = E_n - \frac{E_n - e \sin E_n - M}{1 - e \cos E_n}$$

3. Calculate 3D coordinates in the orbital plane tilted by inclination $i$ and rotated by longitude of perihelion $\omega$:
   $$\begin{aligned}
   x_{\text{orb}} &= a(\cos E - e) \\
   z_{\text{orb}} &= a\sqrt{1 - e^2}\sin E \\
   x &= x_{\text{orb}}\cos\omega - z_{\text{orb}}\sin\omega \\
   y &= (x_{\text{orb}}\sin\omega + z_{\text{orb}}\cos\omega)\sin i \\
   z &= (x_{\text{orb}}\sin\omega + z_{\text{orb}}\cos\omega)\cos i
   \end{aligned}$$

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
