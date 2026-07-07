import Phaser from 'phaser';

export interface ProgressBarOptions {
  width?: number;
  height?: number;
  value?: number;
  max?: number;
  color?: number;
  backgroundColor?: number;
  label?: boolean;
  reducedMotion?: boolean;
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly barWidth: number;
  private readonly barHeight: number;
  private readonly color: number;
  private readonly backgroundColor: number;
  private readonly showLabel: boolean;
  private readonly reducedMotion: boolean;
  private maximum: number;
  private currentValue: number;
  private displayRatio: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, options: ProgressBarOptions = {}) {
    super(scene, x, y);
    this.barWidth = options.width ?? 220;
    this.barHeight = options.height ?? 22;
    this.maximum = Math.max(1, options.max ?? 100);
    this.currentValue = Phaser.Math.Clamp(options.value ?? 0, 0, this.maximum);
    this.displayRatio = this.currentValue / this.maximum;
    this.color = options.color ?? 0xff8ca9;
    this.backgroundColor = options.backgroundColor ?? 0x6b5973;
    this.showLabel = options.label ?? false;
    this.reducedMotion = options.reducedMotion ?? false;
    this.track = scene.add.graphics();
    this.fill = scene.add.graphics();
    this.labelText = scene.add.text(0, 0, '', {
      fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: `${Math.max(11, this.barHeight * 0.58)}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#5a4563',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(this.showLabel);
    this.add([this.track, this.fill, this.labelText]);
    this.draw();
    scene.add.existing(this);
  }

  public setValue(value: number, animate = true): this {
    this.currentValue = Phaser.Math.Clamp(value, 0, this.maximum);
    const targetRatio = this.currentValue / this.maximum;
    this.scene.tweens.killTweensOf(this);
    if (!animate || this.reducedMotion) {
      this.displayRatio = targetRatio;
      this.draw();
      return this;
    }
    this.scene.tweens.addCounter({
      from: this.displayRatio,
      to: targetRatio,
      duration: 260,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        this.displayRatio = tween.getValue() ?? targetRatio;
        this.draw();
      },
    });
    return this;
  }

  public setMax(max: number): this {
    this.maximum = Math.max(1, max);
    this.currentValue = Math.min(this.currentValue, this.maximum);
    this.displayRatio = this.currentValue / this.maximum;
    this.draw();
    return this;
  }

  public get value(): number {
    return this.currentValue;
  }

  private draw(): void {
    const width = this.barWidth;
    const height = this.barHeight;
    const radius = height / 2;
    this.track.clear().fillStyle(this.backgroundColor, 0.28).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    this.track.lineStyle(2, 0xffffff, 0.7).strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    const inset = 4;
    const innerWidth = Math.max(0, (width - inset * 2) * Phaser.Math.Clamp(this.displayRatio, 0, 1));
    this.fill.clear();
    if (innerWidth > 0) {
      this.fill.fillStyle(this.color, 1).fillRoundedRect(-width / 2 + inset, -height / 2 + inset, innerWidth, height - inset * 2, Math.max(2, radius - inset));
      this.fill.fillStyle(0xffffff, 0.3).fillRoundedRect(-width / 2 + inset + 2, -height / 2 + inset + 1, Math.max(0, innerWidth - 4), Math.max(2, (height - inset * 2) * 0.35), radius);
    }
    this.labelText.setText(`${Math.round(this.currentValue)} / ${Math.round(this.maximum)}`);
  }
}

