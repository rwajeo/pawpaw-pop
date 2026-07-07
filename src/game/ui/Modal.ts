import Phaser from 'phaser';
import { Button } from './Button';

export interface ModalOptions {
  title: string;
  width?: number;
  height?: number;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  reducedMotion?: boolean;
}

/** Modal shell with a blocking backdrop and a content slot for arbitrary game objects. */
export class Modal extends Phaser.GameObjects.Container {
  public readonly content: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly closeButton?: Button;
  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private readonly reducedMotion: boolean;

  public constructor(scene: Phaser.Scene, options: ModalOptions) {
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    super(scene, centerX, centerY);
    this.panelWidth = Math.min(options.width ?? 420, scene.scale.width - 32);
    this.panelHeight = Math.min(options.height ?? 430, scene.scale.height - 48);
    this.reducedMotion = options.reducedMotion ?? false;
    this.backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x332942, 0.66).setInteractive();
    this.panel = scene.add.graphics();
    this.titleText = scene.add.text(0, -this.panelHeight / 2 + 42, options.title, {
      fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#5d456c',
      align: 'center',
    }).setOrigin(0.5);
    this.content = scene.add.container(0, -4);
    this.add([this.backdrop, this.panel, this.titleText, this.content]);
    if (options.showCloseButton ?? true) {
      this.closeButton = new Button(scene, this.panelWidth / 2 - 34, -this.panelHeight / 2 + 34, {
        label: '×', width: 42, height: 42, variant: 'quiet', fontSize: 26, reducedMotion: this.reducedMotion,
        onClick: () => this.hide(),
      });
      this.add(this.closeButton);
    }
    if (options.closeOnBackdrop) this.backdrop.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.hide());
    this.drawPanel();
    this.setDepth(1000).setVisible(false).setActive(false);
    scene.add.existing(this);
  }

  public setTitle(title: string): this {
    this.titleText.setText(title);
    return this;
  }

  public addContent(child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): this {
    this.content.add(child);
    return this;
  }

  public show(): this {
    this.setVisible(true).setActive(true).setAlpha(1);
    if (this.reducedMotion) return this;
    this.panel.setScale(0.85);
    this.titleText.setScale(0.85);
    this.content.setScale(0.85);
    if (this.closeButton) this.closeButton.setScale(0.85);
    this.backdrop.setAlpha(0);
    this.scene.tweens.add({ targets: this.backdrop, alpha: 1, duration: 130 });
    this.scene.tweens.add({
      targets: [this.panel, this.titleText, this.content, this.closeButton].filter(Boolean),
      scale: 1,
      duration: 220,
      ease: 'Back.Out',
    });
    this.emit('shown');
    return this;
  }

  public hide(): this {
    if (!this.visible) return this;
    if (this.reducedMotion) {
      this.setVisible(false).setActive(false);
      this.emit('hidden');
      return this;
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 130,
      onComplete: () => {
        this.setVisible(false).setActive(false).setAlpha(1);
        this.emit('hidden');
      },
    });
    return this;
  }

  public layout(): this {
    this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    this.backdrop.setSize(this.scene.scale.width, this.scene.scale.height);
    return this;
  }

  private drawPanel(): void {
    const width = this.panelWidth;
    const height = this.panelHeight;
    this.panel.clear();
    this.panel.fillStyle(0x332942, 0.2).fillRoundedRect(-width / 2 + 5, -height / 2 + 9, width, height, 28);
    this.panel.fillStyle(0xfff9ee, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 28);
    this.panel.lineStyle(4, 0xecc9bd, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 28);
    this.panel.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 23);
  }
}

