/** Small deterministic PRNG. Identical seeds produce identical sequences. */
export class SeededRandom {
  private state: number;

  public constructor(seed: number | string = Date.now()) {
    this.state = SeededRandom.hash(seed) || 0x6d2b79f5;
  }

  public static hash(seed: number | string): number {
    if (typeof seed === 'number') return seed >>> 0;
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  public next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  public int(minInclusive: number, maxExclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive) || maxExclusive <= minInclusive) {
      throw new RangeError('Expected integer bounds with maxExclusive > minInclusive');
    }
    return Math.floor(this.next() * (maxExclusive - minInclusive)) + minInclusive;
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new RangeError('Cannot pick from an empty list');
    return values[this.int(0, values.length)] as T;
  }

  public shuffle<T>(values: readonly T[]): T[] {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
    }
    return result;
  }
}
