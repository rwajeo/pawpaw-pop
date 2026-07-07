import Phaser from 'phaser';

export interface FloatingTextOptions {
  color?: string;
  fontSize?: number;
  duration?: number;
  rise?: number;
  stroke?: string;
}

/** Recycles score/combo labels to keep cascades allocation-light. */
export class FloatingTextPool {
  private readonly all: Phaser.GameObjects.Text[] = [];
  private readonly available: Phaser.GameObjects.Text[] = [];

  public constructor(private readonly scene: Phaser.Scene, initialSize = 12) {
    this.grow(initialSize);
  }

  public show(x: number, y: number, value: string | number, options: FloatingTextOptions = {}): Phaser.GameObjects.Text {
    if (this.available.length === 0) this.grow(4);
    const label = this.available.pop();
    if (!label) throw new Error('Floating text pool could not allocate a label.');
    label
      .setText(typeof value === 'number' ? `+${value.toLocaleString()}` : value)
      .setFontSize(options.fontSize ?? 38)
      .setColor(options.color ?? '#fff7c2')
      .setStroke(options.stroke ?? '#4b315c', 8)
      .setShadow(0, 7, '#38263f', 8, true, true)
      .setPosition(x, y)
      .setAlpha(1)
      .setScale(0.45)
      .setVisible(true)
      .setActive(true)
      .setDepth(200);
    this.scene.tweens.add({
      targets: label,
      y: y - (options.rise ?? 42),
      alpha: { from: 1, to: 0 },
      scale: { from: 0.45, to: 1.16 },
      duration: options.duration ?? 760,
      ease: 'Back.Out',
      onComplete: () => this.release(label),
    });
    return label;
  }

  public clear(): void {
    for (const label of this.all) {
      this.scene.tweens.killTweensOf(label);
      if (label.active) this.release(label);
    }
  }

  public destroy(): void {
    for (const label of this.all) label.destroy();
    this.all.length = 0;
    this.available.length = 0;
  }

  private grow(count: number): void {
    for (let index = 0; index < count; index += 1) {
      const label = this.scene.add.text(0, 0, '', {
        fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setVisible(false).setActive(false);
      this.all.push(label);
      this.available.push(label);
    }
  }

  private release(label: Phaser.GameObjects.Text): void {
    label.setVisible(false).setActive(false);
    if (!this.available.includes(label)) this.available.push(label);
  }
}
