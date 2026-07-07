import Phaser from 'phaser';

export type ToastKind = 'info' | 'success' | 'warning';

export interface ToastOptions {
  kind?: ToastKind;
  duration?: number;
  reducedMotion?: boolean;
}

const TOAST_COLORS: Record<ToastKind, number> = {
  info: 0x6f90d9,
  success: 0x48b99e,
  warning: 0xe3925b,
};

/** Single reusable toast presenter; repeated messages replace the current one. */
export class Toast extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly messageText: Phaser.GameObjects.Text;
  private hideEvent?: Phaser.Time.TimerEvent;
  private kind: ToastKind = 'info';
  private readonly toastWidth: number;

  public constructor(scene: Phaser.Scene, width = 330) {
    super(scene, scene.scale.width / 2, 72);
    this.toastWidth = Math.min(width, scene.scale.width - 28);
    this.background = scene.add.graphics();
    this.messageText = scene.add.text(0, 0, '', {
      fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.toastWidth - 42 },
    }).setOrigin(0.5);
    this.add([this.background, this.messageText]);
    this.setVisible(false).setActive(false).setDepth(1500);
    scene.add.existing(this);
  }

  public show(message: string, options: ToastOptions = {}): this {
    this.hideEvent?.remove(false);
    this.scene.tweens.killTweensOf(this);
    this.kind = options.kind ?? 'info';
    this.messageText.setText(message);
    this.draw();
    this.setPosition(this.scene.scale.width / 2, 72).setVisible(true).setActive(true).setAlpha(1);
    if (!options.reducedMotion) {
      this.setY(48).setScale(0.92);
      this.scene.tweens.add({ targets: this, y: 72, scale: 1, duration: 210, ease: 'Back.Out' });
    }
    this.hideEvent = this.scene.time.delayedCall(options.duration ?? 2200, () => this.hide(options.reducedMotion));
    return this;
  }

  public hide(reducedMotion = false): this {
    if (!this.visible) return this;
    this.hideEvent?.remove(false);
    this.hideEvent = undefined;
    if (reducedMotion) {
      this.setVisible(false).setActive(false);
      return this;
    }
    this.scene.tweens.add({
      targets: this,
      y: this.y - 12,
      alpha: 0,
      duration: 150,
      onComplete: () => this.setVisible(false).setActive(false).setAlpha(1),
    });
    return this;
  }

  public layout(top = 72): this {
    this.setPosition(this.scene.scale.width / 2, top);
    return this;
  }

  private draw(): void {
    const height = Math.max(48, this.messageText.height + 24);
    this.background.clear();
    this.background.fillStyle(0x332942, 0.22).fillRoundedRect(-this.toastWidth / 2 + 3, -height / 2 + 5, this.toastWidth, height, 18);
    this.background.fillStyle(TOAST_COLORS[this.kind], 0.96).fillRoundedRect(-this.toastWidth / 2, -height / 2, this.toastWidth, height, 18);
    this.background.lineStyle(2, 0xffffff, 0.75).strokeRoundedRect(-this.toastWidth / 2 + 2, -height / 2 + 2, this.toastWidth - 4, height - 4, 16);
  }
}

