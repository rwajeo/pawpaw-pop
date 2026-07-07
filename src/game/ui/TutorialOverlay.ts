import Phaser from 'phaser';
import { Button } from './Button';

export interface TutorialStep {
  message: string;
  target: { x: number; y: number; width: number; height: number };
  arrowFrom?: { x: number; y: number };
}

export interface TutorialOverlayOptions {
  reducedMotion?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

/** Spotlight tutorial that leaves the real board visible and indicates drag direction. */
export class TutorialOverlay extends Phaser.GameObjects.Container {
  private readonly shade: Phaser.GameObjects.Graphics;
  private readonly focus: Phaser.GameObjects.Graphics;
  private readonly arrow: Phaser.GameObjects.Graphics;
  private readonly messageBubble: Phaser.GameObjects.Graphics;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly nextButton: Button;
  private readonly skipButton: Button;
  private readonly options: TutorialOverlayOptions;
  private steps: readonly TutorialStep[] = [];
  private stepIndex = 0;

  public constructor(scene: Phaser.Scene, options: TutorialOverlayOptions = {}) {
    super(scene, 0, 0);
    this.options = options;
    this.shade = scene.add.graphics();
    this.focus = scene.add.graphics();
    this.arrow = scene.add.graphics();
    this.messageBubble = scene.add.graphics();
    this.messageText = scene.add.text(0, 0, '', {
      fontFamily: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#5a4563',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: Math.min(310, scene.scale.width - 70) },
    }).setOrigin(0.5);
    this.nextButton = new Button(scene, 0, 0, {
      label: '다음', width: 110, height: 46, fontSize: 17, reducedMotion: options.reducedMotion,
      onClick: () => this.nextStep(),
    });
    this.skipButton = new Button(scene, 0, 0, {
      label: '건너뛰기', width: 106, height: 42, fontSize: 15, variant: 'quiet', reducedMotion: options.reducedMotion,
      onClick: () => this.skip(),
    });
    this.add([this.shade, this.focus, this.arrow, this.messageBubble, this.messageText, this.nextButton, this.skipButton]);
    this.setDepth(2000).setVisible(false).setActive(false);
    scene.add.existing(this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handleGlobalPointer, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.handleGlobalPointer, this);
    });
  }

  public start(steps: readonly TutorialStep[]): this {
    if (steps.length === 0) return this;
    this.steps = steps;
    this.stepIndex = 0;
    this.setVisible(true).setActive(true);
    this.renderStep();
    return this;
  }

  public nextStep(): this {
    if (!this.active) return this;
    if (this.stepIndex >= this.steps.length - 1) {
      this.complete();
      return this;
    }
    this.stepIndex += 1;
    this.renderStep();
    return this;
  }

  public previousStep(): this {
    this.stepIndex = Math.max(0, this.stepIndex - 1);
    this.renderStep();
    return this;
  }

  public skip(): this {
    this.stopArrowTween();
    this.setVisible(false).setActive(false);
    this.options.onSkip?.();
    this.emit('skip');
    return this;
  }

  public layout(): this {
    if (this.active) this.renderStep();
    return this;
  }

  private complete(): void {
    this.stopArrowTween();
    this.setVisible(false).setActive(false);
    this.options.onComplete?.();
    this.emit('complete');
  }

  private renderStep(): void {
    const step = this.steps[this.stepIndex];
    if (!step) return;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const target = step.target;
    this.shade.clear().fillStyle(0x2e2540, 0.7).fillRect(0, 0, width, height);
    this.focus.clear().lineStyle(5, 0xffdc67, 1).strokeRoundedRect(
      target.x - target.width / 2 - 7,
      target.y - target.height / 2 - 7,
      target.width + 14,
      target.height + 14,
      18,
    );
    this.focus.fillStyle(0xffdc67, 0.12).fillRoundedRect(
      target.x - target.width / 2 - 4,
      target.y - target.height / 2 - 4,
      target.width + 8,
      target.height + 8,
      16,
    );
    this.drawArrow(step);

    const bubbleWidth = Math.min(350, width - 28);
    const bubbleHeight = 128;
    const preferBelow = target.y < height * 0.55;
    const bubbleY = Phaser.Math.Clamp(
      preferBelow ? target.y + target.height / 2 + 95 : target.y - target.height / 2 - 95,
      bubbleHeight / 2 + 12,
      height - bubbleHeight / 2 - 12,
    );
    this.messageBubble.clear().fillStyle(0xfff9ee, 0.98).fillRoundedRect(
      width / 2 - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      22,
    );
    this.messageBubble.lineStyle(3, 0xe6bfad, 1).strokeRoundedRect(
      width / 2 - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      22,
    );
    this.messageText.setText(step.message).setPosition(width / 2, bubbleY - 19);
    this.nextButton.setLabel(this.stepIndex === this.steps.length - 1 ? '시작!' : '다음');
    this.nextButton.setPosition(width / 2 + 56, bubbleY + 36);
    this.skipButton.setPosition(width / 2 - 64, bubbleY + 36);
  }

  private drawArrow(step: TutorialStep): void {
    this.stopArrowTween();
    const from = step.arrowFrom ?? { x: step.target.x, y: step.target.y - step.target.height * 0.75 - 36 };
    const to = { x: step.target.x, y: step.target.y - step.target.height * 0.48 - 8 };
    this.arrow.clear().lineStyle(7, 0xffffff, 0.95).beginPath().moveTo(from.x, from.y).lineTo(to.x, to.y).strokePath();
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const wing = 14;
    this.arrow.fillStyle(0xffffff, 0.95).fillTriangle(
      to.x,
      to.y,
      to.x - Math.cos(angle - 0.65) * wing,
      to.y - Math.sin(angle - 0.65) * wing,
      to.x - Math.cos(angle + 0.65) * wing,
      to.y - Math.sin(angle + 0.65) * wing,
    );
    if (!this.options.reducedMotion) {
      this.scene.tweens.add({ targets: this.arrow, y: 7, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private stopArrowTween(): void {
    this.scene.tweens.killTweensOf(this.arrow);
    this.arrow.setY(0);
  }

  private handleGlobalPointer(pointer: Phaser.Input.Pointer): void {
    if (!this.active || !this.visible) return;
    const hit = (button: Button, width: number, height: number): boolean =>
      Math.abs(pointer.worldX - button.x) <= width / 2 && Math.abs(pointer.worldY - button.y) <= height / 2;
    if (hit(this.skipButton, 132, 64)) this.skip();
    else if (hit(this.nextButton, 136, 66)) this.nextStep();
  }
}
