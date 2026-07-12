import Phaser from 'phaser';
import {
  CharacterRenderer,
  type CharacterExpression,
  type CharacterId,
} from './CharacterRenderer';

export type TileSpecial = 'none' | 'row' | 'column' | 'bomb' | 'rainbow';

export interface TileOptions {
  character: CharacterId | number;
  size?: number;
  special?: TileSpecial;
  reducedMotion?: boolean;
}

/** Board presentation only; the board model remains the source of truth. */
export class Tile extends Phaser.GameObjects.Container {
  public readonly characterArt: CharacterRenderer;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly selectionRing: Phaser.GameObjects.Graphics;
  private readonly specialIcon: Phaser.GameObjects.Graphics;
  private tileSize: number;
  private selected = false;
  private special: TileSpecial;
  private locked = false;
  private readonly reducedMotion: boolean;

  public constructor(scene: Phaser.Scene, x: number, y: number, options: TileOptions) {
    super(scene, x, y);
    this.tileSize = options.size ?? 64;
    this.special = options.special ?? 'none';
    this.reducedMotion = options.reducedMotion ?? false;
    this.shadow = scene.add.graphics();
    this.frame = scene.add.graphics();
    this.characterArt = new CharacterRenderer(scene, 0, -2, options.character, this.tileSize * 0.9);
    this.selectionRing = scene.add.graphics();
    this.specialIcon = scene.add.graphics();
    // Power styling stays behind the mascot so the board still reads as
    // characters first, without stickers or boxes covering their faces.
    this.add([this.shadow, this.frame, this.specialIcon, this.characterArt, this.selectionRing]);
    this.setSize(this.tileSize, this.tileSize);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.handlePointerOver, this);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.handlePointerOut, this);
    this.drawFrame();
    this.drawSpecialIcon();
    scene.add.existing(this);
  }

  public setCharacter(character: CharacterId | number): this {
    this.characterArt.setCharacter(character);
    return this;
  }

  public setSpecial(special: TileSpecial): this {
    this.special = special;
    this.drawSpecialIcon();
    return this;
  }

  public setExpression(expression: CharacterExpression): this {
    this.characterArt.setExpression(expression);
    return this;
  }

  public setSelected(value: boolean, animate = true): this {
    if (this.selected === value) return this;
    this.selected = value;
    this.characterArt.setExpression(value ? 'selected' : 'idle');
    this.drawFrame();
    if (animate && !this.reducedMotion) {
      this.scene.tweens.add({
        targets: this,
        scale: value ? 1.08 : 1,
        duration: 130,
        ease: value ? 'Back.Out' : 'Sine.Out',
      });
    } else {
      this.setScale(value ? 1.06 : 1);
    }
    return this;
  }

  public setLocked(value: boolean): this {
    this.locked = value;
    if (value) this.disableInteractive();
    else this.setInteractive();
    this.setAlpha(value ? 0.72 : 1);
    return this;
  }

  public resize(size: number): this {
    this.tileSize = size;
    this.setSize(size, size);
    this.input?.hitArea.setTo(-size / 2, -size / 2, size, size);
    this.characterArt.resize(size * 0.9);
    this.drawFrame();
    this.drawSpecialIcon();
    return this;
  }

  public playLanding(): this {
    if (this.reducedMotion) return this;
    this.setScale(0.88, 1.12);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 210,
      ease: 'Back.Out',
    });
    return this;
  }

  public playRemove(onComplete?: () => void): this {
    this.characterArt.setExpression('worried');
    this.disableInteractive();
    if (this.reducedMotion) {
      this.scene.tweens.add({ targets: this, scale: 0.65, alpha: 0, duration: 100, onComplete: () => onComplete?.() });
      return this;
    }
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 0.88,
      duration: 46,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.25,
          scaleY: 1.25,
          y: this.y - 7,
          duration: 72,
          ease: 'Back.Out',
          onComplete: () => {
            this.scene.tweens.add({
              targets: this,
              scaleX: 0.16,
              scaleY: 0.16,
              alpha: 0,
              angle: Phaser.Math.Between(-14, 14),
              duration: 126,
              ease: 'Back.In',
              onComplete: () => onComplete?.(),
            });
          },
        });
      },
    });
    return this;
  }

  public playSpecialCreation(
    special: Exclude<TileSpecial, 'none'>,
    onReveal?: () => void,
    onComplete?: () => void,
  ): this {
    this.disableInteractive();
    this.characterArt.setExpression('selected');
    if (this.reducedMotion) {
      this.setSpecial(special);
      onReveal?.();
      onComplete?.();
      return this;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.18,
      scaleY: 0.86,
      duration: 58,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scaleX: 0.2,
          scaleY: 1.24,
          alpha: 0,
          angle: Phaser.Math.Between(-9, 9),
          duration: 112,
          ease: 'Back.In',
          onComplete: () => {
            this.setSpecial(special).setAlpha(1).setAngle(0).setScale(1.34, 0.82);
            onReveal?.();
            this.scene.tweens.add({
              targets: this,
              scaleX: 1,
              scaleY: 1,
              duration: 220,
              ease: 'Back.Out',
              onComplete: () => {
                this.characterArt.setExpression('idle');
                onComplete?.();
              },
            });
          },
        });
      },
    });
    return this;
  }

  public playSwapHint(directionX: number, directionY: number): this {
    if (this.reducedMotion || this.locked) return this;
    const length = this.tileSize * 0.1;
    this.scene.tweens.add({
      targets: this,
      x: this.x + Math.sign(directionX) * length,
      y: this.y + Math.sign(directionY) * length,
      duration: 220,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.InOut',
    });
    return this;
  }

  public flashInvalid(): this {
    this.characterArt.setExpression('worried');
    if (this.reducedMotion) {
      this.setAlpha(0.65);
      this.scene.time.delayedCall(100, () => this.setAlpha(1).characterArt.setExpression('idle'));
      return this;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      angle: { from: -3, to: 3 },
      scaleX: { from: 1.02, to: 0.96 },
      duration: 42,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.setAngle(0).setScale(this.selected ? 1.06 : 1);
        this.characterArt.setExpression(this.selected ? 'selected' : 'idle');
      },
    });
    return this;
  }

  public resetVisualState(): this {
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1).setAngle(0).setScale(this.selected ? 1.06 : 1);
    this.characterArt.setExpression(this.selected ? 'selected' : 'idle');
    if (!this.locked) this.setInteractive();
    return this;
  }

  private handlePointerOver(): void {
    if (this.locked || this.selected || this.reducedMotion) return;
    this.scene.tweens.add({ targets: this, scale: 1.035, duration: 90, ease: 'Sine.Out' });
  }

  private handlePointerOut(): void {
    if (this.locked || this.selected || this.reducedMotion) return;
    this.scene.tweens.add({ targets: this, scale: 1, duration: 90, ease: 'Sine.Out' });
  }

  private drawFrame(): void {
    const half = this.tileSize / 2;
    this.shadow.clear();
    this.frame.clear();
    this.selectionRing.clear();
    if (this.selected) {
      this.selectionRing
        .lineStyle(7, 0xffd45f, 0.95).lineBetween(-22, half - 3, 22, half - 3)
        .lineStyle(2, 0xffffff, 0.9).lineBetween(-16, half - 8, 16, half - 8)
        .fillStyle(0xffec9b, 1)
        .fillCircle(-28, half - 3, 4)
        .fillCircle(28, half - 3, 4);
    }
  }

  private drawSpecialIcon(): void {
    const g = this.specialIcon;
    g.clear();
    if (this.special === 'none') return;
    const half = this.tileSize * 0.46;
    const color = {
      row: 0x55d8ff,
      column: 0x69e3a5,
      bomb: 0xff8b51,
      rainbow: 0xd884ff,
    }[this.special];
    if (this.special === 'row') {
      [-20, 0, 20].forEach((y, index) => {
        g.lineStyle(index === 1 ? 6 : 3, index === 1 ? 0xffffff : color, index === 1 ? 0.72 : 0.5)
          .lineBetween(-half, y, -half * 0.5, y).lineBetween(half * 0.5, y, half, y);
      });
      return;
    }
    if (this.special === 'column') {
      [-20, 0, 20].forEach((x, index) => {
        g.lineStyle(index === 1 ? 6 : 3, index === 1 ? 0xffffff : color, index === 1 ? 0.72 : 0.5)
          .lineBetween(x, -half, x, -half * 0.5).lineBetween(x, half * 0.5, x, half);
      });
      return;
    }
    if (this.special === 'bomb') {
      [[-half, -half * 0.5], [half, -half * 0.42], [-half * 0.84, half * 0.58], [half * 0.9, half * 0.62]].forEach(([x, y], index) => {
        const size = index % 2 === 0 ? 8 : 6;
        g.fillStyle(index % 2 === 0 ? color : 0xffffff, 0.85).fillPoints([
          new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.55, y),
          new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.55, y),
        ], true);
      });
      return;
    }
    [0xff7f9f, 0xffdf73, 0x74e5d2, 0x8cc8ff, 0xd596ff].forEach((arcColor, index) => {
      g.lineStyle(3, arcColor, 0.44).beginPath().arc(0, 2, half - index * 4, Math.PI * 1.08, Math.PI * 1.92).strokePath();
    });
  }
}
