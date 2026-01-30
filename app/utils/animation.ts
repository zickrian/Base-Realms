export class Animation {
  private time: number = 0;
  private paused: boolean = false;

  update(deltaTime: number): void {
    if (!this.paused) {
      this.time += deltaTime;
    }
  }

  getTime(): number {
    return this.time;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  reset(): void {
    this.time = 0;
  }

  // Helper untuk easing functions
  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static sinWave(time: number, speed: number = 1, amplitude: number = 1): number {
    return Math.sin(time * speed) * amplitude;
  }

  static cosWave(time: number, speed: number = 1, amplitude: number = 1): number {
    return Math.cos(time * speed) * amplitude;
  }
}

