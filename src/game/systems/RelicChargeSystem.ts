export interface RelicChargeResult {
  readonly gained: number;
  readonly charge: number;
  readonly becameReady: boolean;
}

/** Small, deterministic gameplay system so relic balance is easy to tune. */
export class RelicChargeSystem {
  private value = 0;
  private readyState = false;
  private exhaustedState = false;

  public constructor(private readonly reusable = false) {}

  public addMatch(removed: number, createdPowers: number, chain: number): RelicChargeResult {
    if (this.readyState || this.exhaustedState) return { gained: 0, charge: this.value, becameReady: false };
    const base = removed >= 5 ? 22 : removed === 4 ? 16 : 10;
    const gained = Math.min(34, base + Math.max(0, createdPowers) * 7 + Math.max(0, chain - 1) * 5);
    const before = this.value;
    this.value = Math.min(100, this.value + gained);
    this.readyState = this.value >= 100;
    return { gained: this.value - before, charge: this.value, becameReady: before < 100 && this.readyState };
  }

  public consume(): boolean {
    if (!this.readyState) return false;
    this.readyState = false;
    this.value = 0;
    this.exhaustedState = !this.reusable;
    return true;
  }

  public get charge(): number { return this.value; }
  public get ready(): boolean { return this.readyState; }
  public get exhausted(): boolean { return this.exhaustedState; }
}
