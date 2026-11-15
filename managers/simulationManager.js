import { CONFIG } from '../js/config.js';

export class SimulationManager {
  constructor() {
    this.isPlaying = true;
    this.elapsedDays = 0;
    this.settings = {
      speed: 1,
      planetScale: 1,
      orbitScale: 1,
      labels: true,
      trails: false,
      autoRotate: false
    };
  }

  update(delta) {
    if (this.isPlaying) {
      this.elapsedDays += delta * CONFIG.baseSimulationDaysPerSecond * this.settings.speed;
    }
  }

  reset() {
    this.elapsedDays = 0;
    this.isPlaying = true;
  }
}
