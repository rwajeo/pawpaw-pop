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
    this.add([this.shadow, this.frame, this.characterArt, this.specialIcon, this.selectionRing]);
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
      scaleX: 1.16,
      scaleY: 0.9,
      duration: 52,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scaleX: 0.42,
          scaleY: 1.28,
          alpha: 0,
          angle: Phaser.Math.Between(-10, 10),
          duration: 118,
          ease: 'Back.In',
          onComplete: () => onComplete?.(),
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
    const r = this.tileSize * 0.34;
    g.clear();
    if (this.special === 'none') return;
    if (this.special === 'rainbow') {
      const colors = [0xff627d, 0xffca4d, 0x65d89b, 0x62b8ef, 0xb583df];
      colors.forEach((color, index) => {
        g.lineStyle(Math.max(2, this.tileSize * 0.035), color, 0.9);
        g.strokeCircle(0, 0, r - index * this.tileSize * 0.045);
      });
      g.fillStyle(0xffffff, 0.9).fillCircle(0, 0, this.tileSize * 0.055);
      return;
    }
    if (this.special === 'bomb') {
      g.fillStyle(0x473c5e, 0.92).fillCircle(0, 0, this.tileSize * 0.17);
      g.lineStyle(3, 0xffd35b, 1).beginPath().moveTo(r * 0.25, -r * 0.5).lineTo(r * 0.56, -r * 0.88).strokePath();
      g.fillStyle(0xffeb78, 1).fillCircle(r * 0.63, -r * 0.93, this.tileSize * 0.045);
      return;
    }
    g.lineStyle(Math.max(3, this.tileSize * 0.06), 0xffffff, 0.92);
    if (this.special === 'row') {
      g.lineBetween(-r, 0, r, 0);
      g.fillStyle(0xffffff, 0.92).fillTriangle(-r, 0, -r + 8, -5, -r + 8, 5).fillTriangle(r, 0, r - 8, -5, r - 8, 5);
    } else {
      g.lineBetween(0, -r, 0, r);
      g.fillStyle(0xffffff, 0.92).fillTriangle(0, -r, -5, -r + 8, 5, -r + 8).fillTriangle(0, r, -5, r - 8, 5, r - 8);
    }
  }
}
