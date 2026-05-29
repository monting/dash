// Sliding-window limiter. Allows a burst up to `max` within `windowMs`, then
// throttles. Massive's free tier is 5 requests/minute.
export class RateLimiter {
  private hits: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.hits = this.hits.filter((t) => now - t < this.windowMs);
      if (this.hits.length < this.max) {
        this.hits.push(now);
        return;
      }
      const wait = this.windowMs - (now - this.hits[0]) + 50;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
