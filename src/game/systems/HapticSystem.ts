export type HapticCue = 'tap' | 'match3' | 'match4' | 'bomb' | 'rainbow' | 'failure';

const PATTERNS: Readonly<Record<HapticCue, readonly number[]>> = {
  tap: [5],
  match3: [8, 16, 12],
  match4: [10, 12, 15, 14, 24],
  bomb: [12, 10, 22, 18, 46],
  rainbow: [7, 10, 9, 10, 12, 13, 18, 18, 36],
  failure: [34, 34, 52],
};

export class HapticSystem {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  play(cue: HapticCue): boolean {
    if (!this.enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    try {
      return navigator.vibrate([...PATTERNS[cue]]);
    } catch {
      return false;
    }
  }

  playMatch(cue: Extract<HapticCue, 'match3' | 'match4' | 'bomb' | 'rainbow'>, combo: number): boolean {
    if (!this.enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    const base = [...PATTERNS[cue]];
    const accentCount = Math.min(3, Math.max(0, combo - 1));
    for (let index = 0; index < accentCount; index += 1) base.push(18 + index * 3, 8 + index * 3);
    try {
      return navigator.vibrate(base);
    } catch {
      return false;
    }
  }

  cancel(): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(0);
    } catch {
      // Unsupported or blocked vibration is intentionally ignored.
    }
  }
}

export const hapticSystem = new HapticSystem();
