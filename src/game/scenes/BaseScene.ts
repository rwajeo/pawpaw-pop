import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, UI_FONT } from '../constants';
import { audioSystem } from '../systems/AudioSystem';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  color2?: number;
  textColor?: string;
  fontSize?: number;
  icon?: string;
}

export class BaseScene extends Phaser.Scene {
  protected addPremiumBackdrop(accent = 0x8067ff): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x17142d, 0x24183e, 0x102a40, 0x15223b, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.fillStyle(accent, 0.16).fillCircle(90, 240, 300).fillCircle(980, 560, 390);
    background.fillStyle(0x4fd5d1, 0.09).fillCircle(120, 1500, 430);
    background.fillStyle(0xff7597, 0.08).fillCircle(1020, 1760, 360);
    background.lineStyle(2, 0xffffff, 0.035);
    for (let y = 90; y < GAME_HEIGHT; y += 110) {
      for (let x = 70 + ((y / 110) % 2) * 45; x < GAME_WIDTH; x += 130) background.strokeCircle(x, y, 3);
    }
    const glow = this.add.graphics();
    glow.fillStyle(0xffffff, 0.035).fillEllipse(540, 360, 900, 440);
    this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  protected addBackdrop(accent = 0xffd8cc): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0xfff9e9, 0xfff4e6, 0xeaf8eb, 0xe8f3ff, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const rng = new Phaser.Math.RandomDataGenerator([this.scene.key]);
    for (let i = 0; i < 24; i += 1) {
      const x = rng.between(20, GAME_WIDTH - 20);
      const y = rng.between(30, GAME_HEIGHT - 30);
      const radius = rng.between(8, 34);
      background.fillStyle(i % 3 === 0 ? accent : 0xffffff, i % 3 === 0 ? 0.14 : 0.28);
      background.fillCircle(x, y, radius);
    }
    this.tweens.add({
      targets: background,
      alpha: { from: 0.88, to: 1 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  protected addTopBar(title: string, onBack?: () => void): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x4a3a55, 0.12).fillRoundedRect(22, 24, GAME_WIDTH - 44, 158, 46);
    bar.fillStyle(0xffffff, 0.9).lineStyle(4, 0xffffff, 0.9)
      .fillRoundedRect(22, 14, GAME_WIDTH - 44, 158, 46).strokeRoundedRect(22, 14, GAME_WIDTH - 44, 158, 46);
    this.add.text(GAME_WIDTH / 2, 100, title, {
      fontFamily: UI_FONT,
      fontSize: '54px',
      fontStyle: 'bold',
      color: '#513b59',
    }).setOrigin(0.5);
    if (onBack) this.addButton(82, 100, '‹', onBack, { width: 100, height: 100, color: 0xffffff, textColor: '#513b59', fontSize: 64 });
  }

  protected addButton(
    x: number,
    y: number,
    label: string,
    callback: () => void,
    options: ButtonOptions = {},
  ): Phaser.GameObjects.Container {
    const width = options.width ?? 620;
    const height = options.height ?? 118;
    const container = this.add.container(x, y);
    const radius = Math.min(38, height * 0.32);
    const topColor = options.color ?? COLORS.coral;
    const bottomColor = options.color2 ?? topColor;
    const shadow = this.add.graphics()
      .fillStyle(0x080613, 0.32).fillRoundedRect(-width / 2, -height / 2 + 13, width, height, radius);
    const plate = this.add.graphics()
      .fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1)
      .lineStyle(3, 0xffffff, 0.34).fillRoundedRect(-width / 2, -height / 2, width, height, radius)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, radius)
      .lineStyle(2, 0xffffff, 0.1).strokeRoundedRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, radius - 5);
    plate.fillStyle(0xffffff, 0.13).fillRoundedRect(-width / 2 + 18, -height / 2 + 10, width - 36, 5, 3);
    const text = this.add.text(0, -2, `${options.icon ? `${options.icon}  ` : ''}${label}`, {
      fontFamily: UI_FONT,
      fontSize: `${options.fontSize ?? 38}px`,
      fontStyle: 'bold',
      color: options.textColor ?? '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setLetterSpacing(-1);
    const darkText = ['#513b59', '#5f4c67', '#a24f5a'].includes(options.textColor ?? '');
    text.setShadow(0, darkText ? 2 : 4, darkText ? '#ffffff' : '#57394f', darkText ? 2 : 4, true, true);
    container.add([shadow, plate, text]);
    container.setData('label', text);
    container.setSize(width, height).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.025, duration: 90 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, y: y, duration: 100 }));
    container.on('pointerdown', () => {
      void audioSystem.resumeAndStartMusic();
      container.setScale(0.97);
      container.y = y + 7;
    });
    container.on('pointerup', () => {
      container.setScale(1);
      container.y = y;
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
      callback();
    });
    return container;
  }

  protected pill(x: number, y: number, label: string, value: string, width = 260): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const bg = this.add.graphics().fillStyle(0xffffff, 0.86).fillRoundedRect(-width / 2, -46, width, 92, 30);
    const caption = this.add.text(-width / 2 + 24, -18, label, {
      fontFamily: UI_FONT, fontSize: '22px', color: '#806d83', fontStyle: 'bold',
    });
    const number = this.add.text(-width / 2 + 24, 10, value, {
      fontFamily: UI_FONT, fontSize: '32px', color: '#513b59', fontStyle: 'bold',
    });
    root.add([bg, caption, number]);
    return root;
  }

  protected fadeTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(180, 255, 248, 232);
    this.time.delayedCall(185, () => this.scene.start(key, data));
  }
}
