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

export interface CharacterPalette {
  body: number;
  light: number;
  dark: number;
  accent: number;
}

const PALETTES: Record<CharacterId, CharacterPalette> = {
  momo: { body: 0xffaeb9, light: 0xffd8dc, dark: 0xb95770, accent: 0xff6f91 },
  lulu: { body: 0xffa447, light: 0xffd090, dark: 0x9b4b24, accent: 0xff6b78 },
  bomi: { body: 0x70c9ee, light: 0xd1f2ff, dark: 0x3475a3, accent: 0xffa9bf },
  dudu: { body: 0x79d8bd, light: 0xd9fff1, dark: 0x34796d, accent: 0x63b552 },
  piyo: { body: 0xffd75e, light: 0xfff2a7, dark: 0x9a6b26, accent: 0xff9b48 },
  nunu: { body: 0xc8a5e8, light: 0xf0dcff, dark: 0x76509f, accent: 0xff91bd },
  tori: { body: 0xc78f63, light: 0xf0c9a2, dark: 0x75472f, accent: 0xf4b93e },
  kongi: { body: 0x9dcc68, light: 0xe4f7b9, dark: 0x52793b, accent: 0x7fc0dd },
};

export function normalizeCharacterId(value: CharacterId | number): CharacterId {
  if (typeof value === 'string') return value;
  return CHARACTER_IDS[Phaser.Math.Wrap(Math.trunc(value), 0, CHARACTER_IDS.length)]!;
}

/** A resolution-independent, code-drawn character used by board tiles and menus. */
export class CharacterRenderer extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics;
  private character: CharacterId;
  private expression: CharacterExpression = 'idle';
  private artSize: number;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    character: CharacterId | number,
    size = 64,
  ) {
    super(scene, x, y);
    this.character = normalizeCharacterId(character);
    this.artSize = size;
    this.art = scene.add.graphics();
    this.add(this.art);
    this.setSize(size, size);
    this.redraw();
    scene.add.existing(this);
  }

  public get id(): CharacterId {
    return this.character;
  }

  public setCharacter(character: CharacterId | number): this {
    this.character = normalizeCharacterId(character);
    this.redraw();
    return this;
  }

  public setExpression(expression: CharacterExpression): this {
    if (this.expression !== expression) {
      this.expression = expression;
      this.redraw();
    }
    return this;
  }

  public resize(size: number): this {
    this.artSize = size;
    this.setSize(size, size);
    this.redraw();
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
        scaleX: 1.1,
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

  private redraw(): void {
    const g = this.art;
    const s = this.artSize / 64;
    const p = PALETTES[this.character];
    g.clear();
    g.setScale(s);
    this.drawSilhouette(g, p);
    this.drawFace(g, p);
    this.drawSignature(g, p);
  }

  private drawSilhouette(g: Phaser.GameObjects.Graphics, p: CharacterPalette): void {
    g.lineStyle(3, p.dark, 0.75);
    g.fillStyle(p.body);

    switch (this.character) {
      case 'momo':
        g.fillTriangle(-24, -15, -14, -35, -3, -20);
        g.strokeTriangle(-24, -15, -14, -35, -3, -20);
        g.fillTriangle(3, -20, 15, -35, 24, -15);
        g.strokeTriangle(3, -20, 15, -35, 24, -15);
        break;
      case 'lulu':
        g.fillTriangle(-27, -12, -18, -38, -2, -20);
        g.strokeTriangle(-27, -12, -18, -38, -2, -20);
        g.fillTriangle(2, -20, 18, -38, 27, -12);
        g.strokeTriangle(2, -20, 18, -38, 27, -12);
        g.fillStyle(p.light);
        g.fillTriangle(-21, -18, -17, -31, -8, -20);
        g.fillTriangle(8, -20, 17, -31, 21, -18);
        g.fillStyle(p.body);
        break;
      case 'bomi':
        g.fillRoundedRect(-19, -43, 13, 29, 7);
        g.strokeRoundedRect(-19, -43, 13, 29, 7);
        g.fillRoundedRect(7, -34, 13, 21, 7);
        g.strokeRoundedRect(7, -34, 13, 21, 7);
        break;
      case 'dudu':
        g.fillCircle(-16, -22, 10);
        g.strokeCircle(-16, -22, 10);
        g.fillCircle(16, -22, 10);
        g.strokeCircle(16, -22, 10);
        break;
      case 'piyo':
        g.fillEllipse(-27, 3, 14, 25);
        g.strokeEllipse(-27, 3, 14, 25);
        g.fillEllipse(27, 3, 14, 25);
        g.strokeEllipse(27, 3, 14, 25);
        break;
      case 'nunu':
        for (const side of [-1, 1]) {
          g.fillEllipse(side * 27, -14, 12, 22);
          g.strokeEllipse(side * 27, -14, 12, 22);
          g.fillEllipse(side * 30, 0, 12, 22);
          g.strokeEllipse(side * 30, 0, 12, 22);
          g.fillEllipse(side * 26, 14, 12, 20);
          g.strokeEllipse(side * 26, 14, 12, 20);
        }
        break;
      case 'tori':
        g.fillCircle(-16, -22, 10);
        g.strokeCircle(-16, -22, 10);
        g.fillCircle(16, -22, 10);
        g.strokeCircle(16, -22, 10);
        break;
      case 'kongi':
        g.fillEllipse(-18, -23, 17, 25);
        g.strokeEllipse(-18, -23, 17, 25);
        g.fillEllipse(18, -23, 17, 25);
        g.strokeEllipse(18, -23, 17, 25);
        break;
    }

    g.fillStyle(p.body);
    g.fillRoundedRect(-28, -23, 56, 51, 20);
    g.strokeRoundedRect(-28, -23, 56, 51, 20);
    g.fillStyle(p.light, 0.7);
    g.fillEllipse(0, 17, 28, 14);
  }

  private drawFace(g: Phaser.GameObjects.Graphics, p: CharacterPalette): void {
    const eyeY = -2;
    g.lineStyle(3, p.dark, 1);

    if (this.expression === 'blink' || this.expression === 'sleepy') {
      g.beginPath();
      g.arc(-10, eyeY, 4, 0.15, Math.PI - 0.15);
      g.strokePath();
      g.beginPath();
      g.arc(10, eyeY, 4, 0.15, Math.PI - 0.15);
      g.strokePath();
    } else if (this.expression === 'excited') {
      for (const x of [-10, 10]) {
        g.beginPath();
        g.moveTo(x - 4, eyeY + 2);
        g.lineTo(x, eyeY - 2);
        g.lineTo(x + 4, eyeY + 2);
        g.strokePath();
      }
    } else if (this.expression === 'worried') {
      g.fillStyle(p.dark);
      g.fillEllipse(-10, eyeY + 1, 5, 7);
      g.fillEllipse(10, eyeY + 1, 5, 7);
      g.lineStyle(2, p.dark);
      g.lineBetween(-15, -8, -7, -10);
      g.lineBetween(7, -10, 15, -8);
    } else {
      g.fillStyle(p.dark);
      g.fillCircle(-10, eyeY, this.expression === 'selected' ? 4 : 3);
      g.fillCircle(10, eyeY, this.expression === 'selected' ? 4 : 3);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(-11, eyeY - 1, 1);
      g.fillCircle(9, eyeY - 1, 1);
    }

    g.fillStyle(p.dark);
    if (this.character === 'momo') {
      g.fillTriangle(-3, 7, 3, 7, 0, 11);
    } else if (this.character === 'piyo') {
      g.fillStyle(p.accent);
      g.fillTriangle(-5, 6, 5, 6, 0, 12);
    } else {
      g.fillCircle(0, 7, 2.3);
    }

    g.lineStyle(2, p.dark);
    if (this.expression === 'worried') {
      g.beginPath();
      g.arc(0, 15, 5, Math.PI + 0.2, Math.PI * 2 - 0.2);
      g.strokePath();
    } else if (this.expression === 'excited' || this.expression === 'selected') {
      g.beginPath();
      g.arc(0, 9, 7, 0.15, Math.PI - 0.15);
      g.strokePath();
    } else {
      g.lineBetween(-4, 11, 0, 13);
      g.lineBetween(0, 13, 4, 11);
    }
  }

  private drawSignature(g: Phaser.GameObjects.Graphics, p: CharacterPalette): void {
    g.lineStyle(2, p.dark, 0.8);
    switch (this.character) {
      case 'momo':
        g.fillStyle(p.accent, 0.45);
        g.fillCircle(-20, 7, 4);
        g.fillCircle(20, 7, 4);
        break;
      case 'lulu':
        g.fillStyle(p.accent, 0.7);
        g.fillEllipse(-18, 8, 8, 5);
        g.fillEllipse(18, 8, 8, 5);
        break;
      case 'bomi':
        g.lineStyle(3, p.dark);
        g.lineBetween(12, -18, 18, -10);
        g.lineBetween(16, -19, 21, -13);
        break;
      case 'dudu':
        g.fillStyle(p.accent);
        g.fillEllipse(0, -27, 7, 15);
        g.fillEllipse(6, -25, 11, 6);
        break;
      case 'piyo':
        g.fillStyle(p.accent);
        g.fillTriangle(23, 17, 34, 11, 29, 22);
        break;
      case 'nunu':
        g.fillStyle(p.accent, 0.75);
        g.fillCircle(-29, -14, 3);
        g.fillCircle(29, -14, 3);
        g.fillCircle(-31, 0, 3);
        g.fillCircle(31, 0, 3);
        break;
      case 'tori':
        g.fillStyle(p.light);
        g.fillEllipse(0, 8, 18, 14);
        g.fillStyle(p.accent, 0.8);
        g.fillCircle(20, -22, 5);
        g.lineStyle(2, p.accent);
        g.strokeCircle(25, -27, 3);
        break;
      case 'kongi':
        g.fillStyle(p.dark, 0.22);
        g.fillEllipse(-14, -9, 16, 22);
        g.lineStyle(2, p.light);
        g.lineBetween(-20, -16, -9, -6);
        break;
    }
  }
}
