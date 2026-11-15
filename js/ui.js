import { formatDistance } from './utils.js';

const metric = (label, value) => `
  <div class="metric-item">
    <dt>${label}</dt>
    <dd title="${value}">${value}</dd>
  </div>
`;

export class UI {
  constructor() {
    this.elements = {
      name: document.querySelector('#planet-name'),
      description: document.querySelector('#planet-description'),
      swatch: document.querySelector('#planet-swatch'),
      metrics: document.querySelector('#planet-metrics'),
      status: document.querySelector('#simulation-status'),
      liveIndicator: document.querySelector('#live-indicator'),
      fps: document.querySelector('#fps-counter'),
      pause: document.querySelector('#pause-button'),
      play: document.querySelector('#play-button'),
      planetNav: document.querySelector('#planet-nav'),
      timeSpeedSlider: document.querySelector('#time-speed'),
      timeSpeedOutput: document.querySelector('#time-speed-output'),
      speedSelect: document.querySelector('#speed-select'),
      planetScaleSlider: document.querySelector('#planet-scale'),
      planetScaleOutput: document.querySelector('#planet-scale-output'),
      orbitScaleSlider: document.querySelector('#orbit-scale'),
      orbitScaleOutput: document.querySelector('#orbit-scale-output'),
      toggleOrbits: document.querySelector('#toggle-orbits'),
      toggleLabels: document.querySelector('#toggle-labels'),
      toggleTrails: document.querySelector('#toggle-trails'),
      toggleAutoRotate: document.querySelector('#toggle-autorotate')
    };

    this.navButtons = new Map();
  }

  renderPlanetNav(bodies, currentSelected, onSelect) {
    if (!this.elements.planetNav) return;
    this.elements.planetNav.innerHTML = '';
    this.navButtons.clear();

    bodies.forEach((body) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'planet-nav-pill';
      if (body.data.name === currentSelected.data.name) {
        btn.classList.add('active');
      }
      btn.innerHTML = `<span class="pill-dot" style="background:${body.data.color};"></span><span>${body.data.name}</span>`;
      btn.addEventListener('click', () => onSelect(body));
      this.elements.planetNav.append(btn);
      this.navButtons.set(body.data.name, btn);
    });
  }

  updateSelectedNav(name) {
    this.navButtons.forEach((btn, bodyName) => {
      if (bodyName === name) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });
  }

  renderPlanet(data) {
    this.elements.name.textContent = data.name;
    this.elements.description.textContent = data.description;
    this.elements.swatch.style.background = data.color;
    this.elements.swatch.style.boxShadow = `0 0 16px ${data.color}`;

    const items = [
      metric('MASS', data.mass),
      metric('RADIUS', `${data.radius.toLocaleString()} km`),
      metric('DENSITY', data.density),
      metric('GRAVITY', data.gravity),
      metric('AXIAL TILT', `${data.axialTilt}°`),
      metric('ROTATION', data.rotationPeriod),
      metric('ORBITAL SPEED', data.averageOrbitalVelocity),
      metric('ORBITAL PERIOD', data.orbitalPeriodLabel),
      metric('DISTANCE', formatDistance(data.semiMajorAxis)),
      metric('MOONS', data.moons !== undefined ? String(data.moons) : '—')
    ];

    this.elements.metrics.innerHTML = items.join('');
    this.updateSelectedNav(data.name);
  }

  setPlaying(playing) {
    this.elements.status.textContent = playing ? 'SIMULATION LIVE' : 'SIMULATION PAUSED';
    if (playing) {
      this.elements.liveIndicator.classList.remove('paused');
      this.elements.play.classList.remove('button-primary');
      this.elements.play.classList.add('button-quiet');
      this.elements.pause.classList.remove('button-quiet');
      this.elements.pause.classList.add('button-primary');
    } else {
      this.elements.liveIndicator.classList.add('paused');
      this.elements.play.classList.remove('button-quiet');
      this.elements.play.classList.add('button-primary');
      this.elements.pause.classList.remove('button-primary');
      this.elements.pause.classList.add('button-quiet');
    }
  }

  setFPS(fps) {
    this.elements.fps.textContent = `${fps} FPS`;
  }

  bind(simulation, handlers) {
    // Bi-directional Speed Sync
    const updateSpeed = (val) => {
      const num = Number(val);
      simulation.settings.speed = num;
      this.elements.timeSpeedSlider.value = num;
      this.elements.timeSpeedOutput.value = `${num.toFixed(1)}×`;

      // Sync select if exact match or reset to custom
      let matched = false;
      for (const opt of this.elements.speedSelect.options) {
        if (Math.abs(Number(opt.value) - num) < 0.01) {
          this.elements.speedSelect.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        this.elements.speedSelect.value = '';
      }
    };

    this.elements.timeSpeedSlider.addEventListener('input', (e) => {
      updateSpeed(e.target.value);
    });

    this.elements.speedSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        updateSpeed(e.target.value);
      }
    });

    // Planet scale
    this.elements.planetScaleSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      simulation.settings.planetScale = val;
      this.elements.planetScaleOutput.value = `${val.toFixed(2)}×`;
    });

    // Orbit scale
    this.elements.orbitScaleSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      simulation.settings.orbitScale = val;
      this.elements.orbitScaleOutput.value = `${val.toFixed(2)}×`;
    });

    // Playback
    this.elements.pause.addEventListener('click', () => {
      simulation.isPlaying = false;
      this.setPlaying(false);
    });

    this.elements.play.addEventListener('click', () => {
      simulation.isPlaying = true;
      this.setPlaying(true);
    });

    // Reset & Focus
    document.querySelector('#reset-button').addEventListener('click', handlers.reset);
    document.querySelector('#focus-button').addEventListener('click', handlers.focus);

    // Switches
    this.elements.toggleOrbits.addEventListener('change', (e) => handlers.toggle('orbits', e.target.checked));
    this.elements.toggleLabels.addEventListener('change', (e) => handlers.toggle('labels', e.target.checked));
    this.elements.toggleTrails.addEventListener('change', (e) => handlers.toggle('trails', e.target.checked));
    this.elements.toggleAutoRotate.addEventListener('change', (e) => handlers.toggle('autoRotate', e.target.checked));

    // Initialize initial state
    this.setPlaying(simulation.isPlaying);
  }
}
