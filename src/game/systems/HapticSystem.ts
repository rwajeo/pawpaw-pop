export type HapticCue = 'tap' | 'match3' | 'match4' | 'bomb' | 'rainbow' | 'failure';

const PATTERNS: Readonly<Record<HapticCue, readonly number[]>> = {
  tap: [8],
  match3: [14],
  match4: [24],
  bomb: [28, 35, 45],
  rainbow: [12, 20, 24, 20, 42],
  failure: [55, 45, 70],
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
