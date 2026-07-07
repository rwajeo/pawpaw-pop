export interface ComboUpdate {
  readonly combo: number;
  readonly multiplier: number;
  readonly message?: string;
  readonly isMilestone: boolean;
}

export const comboMessage = (combo: number): string | undefined => {
  if (combo >= 15) return '믿을 수 없어!';
  if (combo >= 12) return '환상적이야!';
  if (combo >= 10) return '포포 콤보!';
  if (combo >= 7) return '대단해!';
  if (combo >= 5) return '멋져!';
  if (combo >= 3) return '좋아!';
  return undefined;
};

export class ComboSystem {
  private currentCombo = 0;
  private highestCombo = 0;
  private moveActive = false;

  beginMove(): void {
    this.currentCombo = 0;
    this.moveActive = true;
  }

  registerCascade(): ComboUpdate {
    if (!this.moveActive) this.beginMove();
    this.currentCombo += 1;
    this.highestCombo = Math.max(this.highestCombo, this.currentCombo);
    return {
      combo: this.currentCombo,
      multiplier: this.multiplier,
      message: comboMessage(this.currentCombo),
      isMilestone: [3, 5, 7, 10, 12, 15].includes(this.currentCombo),
    };
  }

  endMove(): number {
    const completedCombo = this.currentCombo;
    this.currentCombo = 0;
    this.moveActive = false;
    return completedCombo;
  }

  reset(): void {
    this.currentCombo = 0;
    this.highestCombo = 0;
    this.moveActive = false;
  }

  get combo(): number {
    return this.currentCombo;
  }

  get maxCombo(): number {
    return this.highestCombo;
  }

  get multiplier(): number {
    return Math.min(2.5, 1 + Math.max(0, this.currentCombo - 1) * 0.15);
  }
}
