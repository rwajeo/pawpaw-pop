import Phaser from 'phaser';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  variant?: ButtonVariant;
  fontSize?: number;
  icon?: string;
  onClick?: () => void;
  reducedMotion?: boolean;
}

const BUTTON_COLORS: Record<ButtonVariant, { top: number; bottom: number; border: number; text: string }> = {
  primary: { top: 0xff8ca9, bottom: 0xe85f8c, border: 0xb84370, text: '#ffffff' },
  secondary: { top: 0x77d9cd, bottom: 0x43b8ae, border: 0x27867f, text: '#ffffff' },
  danger: { top: 0xff8a78, bottom: 0xe2584a, border: 0xa83e35, text: '#ffffff' },
  quiet: { top: 0xfff7e5, bottom: 0xf2dec6, border: 0xb89b83, text: '#604c67' },
};

/** Accessible-feeling Phaser button with clear hover, pressed and disabled states. */
export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly options: Required<Pick<ButtonOptions, 'width' | 'height' | 'variant' | 'reducedMotion'>> & ButtonOptions;
  private enabled = true;
  private hovered = false;
  private pressed = false;

  public constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.options = {
      ...options,
      width: options.width ?? 220,
      height: options.height ?? 58,
      variant: options.variant ?? 'primary',
      reducedMotion: options.reducedMotion ?? false,
    };
    this.background = scene.add.graphics();
    const displayLabel = options.icon ? `${options.icon}  ${options.label}` : options.label;
    this.labelText = scene.add.text(0, -2, displayLabel, {
      fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: `${options.fontSize ?? 21}px`,
      fontStyle: 'bold',
      color: BUTTON_COLORS[this.options.variant].text,
      align: 'center',
    }).setOrigin(0.5);
    this.add([this.background, this.labelText]);
    this.setSize(this.options.width, this.options.height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.options.width / 2, -this.options.height / 2, this.options.width, this.options.height),
      Phaser.Geom.Rectangle.Contains,
      true,
    );
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.onPointerOver, this);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.onPointerOut, this);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onPointerDown, this);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, this.onPointerUp, this);
    this.draw();
    scene.add.existing(this);
  }

  public setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  public setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.pressed = false;
    if (enabled) this.setInteractive({ useHandCursor: true });
    else this.disableInteractive();
    this.draw();
    return this;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public focus(): this {
    this.hovered = true;
    this.draw();
    return this;
  }

  public blur(): this {
    this.hovered = false;
    this.pressed = false;
    this.draw();
    return this;
  }

  public trigger(): this {
    if (!this.enabled) return this;
    this.playRelease();
    this.options.onClick?.();
    this.emit('click');
    return this;
  }

  private onPointerOver(): void {
    if (!this.enabled) return;
    this.hovered = true;
    this.draw();
    if (!this.options.reducedMotion) this.scene.tweens.add({ targets: this, scale: 1.025, duration: 90 });
  }

  private onPointerOut(): void {
    if (!this.enabled) return;
    this.hovered = false;
    this.pressed = false;
    this.draw();
    if (!this.options.reducedMotion) this.scene.tweens.add({ targets: this, scale: 1, duration: 90 });
  }

  private onPointerDown(): void {
    if (!this.enabled) return;
    this.pressed = true;
    this.draw();
    this.setScale(this.options.reducedMotion ? 1 : 0.96);
  }

  private onPointerUp(): void {
    if (!this.enabled || !this.pressed) return;
    this.pressed = false;
    this.draw();
    this.trigger();
  }

  private playRelease(): void {
    if (this.options.reducedMotion) return;
    this.scene.tweens.add({ targets: this, scale: this.hovered ? 1.025 : 1, duration: 110, ease: 'Back.Out' });
  }

  private draw(): void {
    const { width, height, variant } = this.options;
    const colors = BUTTON_COLORS[variant];
    const radius = Math.min(20, height * 0.36);
    const topColor = !this.enabled ? 0xc8c3c6 : colors.top;
    const bottomColor = !this.enabled ? 0xa9a4aa : colors.bottom;
    const borderColor = !this.enabled ? 0x8c888d : colors.border;
    const offset = this.pressed ? 4 : 0;
    this.background.clear();
    this.background.fillStyle(borderColor, this.enabled ? 0.45 : 0.3);
    this.background.fillRoundedRect(-width / 2, -height / 2 + 5, width, height, radius);
    this.background.fillStyle(bottomColor, 1);
    this.background.fillRoundedRect(-width / 2, -height / 2 + offset, width, height - 5, radius);
    this.background.fillStyle(topColor, this.hovered && this.enabled ? 1 : 0.9);
    this.background.fillRoundedRect(-width / 2 + 3, -height / 2 + 3 + offset, width - 6, (height - 8) * 0.52, radius - 2);
    this.background.lineStyle(this.hovered && this.enabled ? 3 : 2, this.hovered ? 0xffffff : borderColor, this.hovered ? 0.9 : 0.75);
    this.background.strokeRoundedRect(-width / 2, -height / 2 + offset, width, height - 5, radius);
    this.labelText.setY(-3 + offset).setAlpha(this.enabled ? 1 : 0.62);
  }
}

