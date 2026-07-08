import Phaser from 'phaser';

export const CHARACTER_IDS = [
  'momo',
  'lulu',
  'bomi',
  'dudu',
  'piyo',
  'nunu',
  'tori',
  'kongi',
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
export type CharacterExpression = 'idle' | 'selected' | 'worried' | 'excited' | 'sleepy' | 'blink';

export function normalizeCharacterId(value: CharacterId | number): CharacterId {
  if (typeof value === 'string') return value;
  return CHARACTER_IDS[Phaser.Math.Wrap(Math.trunc(value), 0, CHARACTER_IDS.length)]!;
}

/** Production mascot art shared by board tiles and menus. */
export class CharacterRenderer extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Image;
  private character: CharacterId;
  private expression: CharacterExpression = 'idle';
  private artSize: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, character: CharacterId | number, size = 64) {
    super(scene, x, y);
    this.character = normalizeCharacterId(character);
    this.artSize = size;
    this.art = scene.add.image(0, 0, `mascot-${this.character}`);
    this.add(this.art);
    this.setSize(size, size);
    this.applyPresentation();
    scene.add.existing(this);
  }

  public get id(): CharacterId { return this.character; }

  public setCharacter(character: CharacterId | number): this {
    this.character = normalizeCharacterId(character);
    this.art.setTexture(`mascot-${this.character}`);
    this.applyPresentation();
    return this;
  }

  public setExpression(expression: CharacterExpression): this {
    if (this.expression !== expression) {
      this.expression = expression;
      this.applyPresentation();
    }
    return this;
  }

  public resize(size: number): this {
    this.artSize = size;
    this.setSize(size, size);
    this.applyPresentation();
    return this;
  }

  public blink(duration = 110): this {
    const previous = this.expression;
    this.setExpression('blink');
    this.scene.time.delayedCall(duration, () => {
      if (this.active && this.expression === 'blink') this.setExpression(previous);
    });
    return this;
  }

  public celebrate(reducedMotion = false): this {
    this.setExpression('excited');
    if (!reducedMotion) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.12,
        scaleY: 0.9,
        angle: { from: -4, to: 4 },
        yoyo: true,
        repeat: 2,
        duration: 100,
        ease: 'Sine.InOut',
        onComplete: () => this.setScale(1).setAngle(0),
      });
    }
    return this;
  }

  private applyPresentation(): void {
    const scale = this.artSize / 330;
    this.art.clearTint().setAlpha(1).setScale(scale).setPosition(0, 0).setAngle(0);
    if (this.expression === 'selected') this.art.setScale(scale * 1.06).setPosition(0, 0);
    if (this.expression === 'worried') this.art.setTint(0xffa9b7).setAlpha(0.82).setAngle(-2);
    if (this.expression === 'excited') this.art.setScale(scale * 1.09).setTint(0xffffe2).setPosition(0, -3);
    if (this.expression === 'sleepy') this.art.setTint(0xcfc7db).setAlpha(0.78);
    if (this.expression === 'blink') this.art.setScale(scale, scale * 0.92).setPosition(0, 4);
  }
}
