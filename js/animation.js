export class AnimationLoop {
  constructor(callback) {
    this.callback = callback;
    this.running = false;
    this.lastTime = 0;
    this.frameId = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  tick = (time) => {
    if (!this.running) return;
    const delta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.callback(delta);
    this.frameId = requestAnimationFrame(this.tick);
  };

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }
}
