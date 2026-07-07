import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { audioSystem } from '../systems/AudioSystem';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
  icon?: string;
}

export class BaseScene extends Phaser.Scene {
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
      fontFamily: 'Arial, Malgun Gothic, sans-serif',
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
    const shadow = this.add.graphics().fillStyle(0x523d5d, 0.18).fillRoundedRect(-width / 2, -height / 2 + 10, width, height, 32);
    const plate = this.add.graphics().fillStyle(options.color ?? COLORS.coral, 1)
      .lineStyle(5, 0xffffff, 0.68).fillRoundedRect(-width / 2, -height / 2, width, height, 32)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 32);
    plate.fillStyle(0xffffff, 0.13).fillRoundedRect(-width / 2 + 8, -height / 2 + 8, width - 16, Math.max(22, height * 0.42), 25);
    const text = this.add.text(0, -2, `${options.icon ? `${options.icon}  ` : ''}${label}`, {
      fontFamily: 'Arial, Malgun Gothic, sans-serif',
      fontSize: `${options.fontSize ?? 38}px`,
      fontStyle: 'bold',
      color: options.textColor ?? '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    text.setShadow(0, 4, options.textColor === '#513b59' ? '#ffffff' : '#57394f', 4, true, true);
    container.add([shadow, plate, text]);
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
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '22px', color: '#806d83', fontStyle: 'bold',
    });
    const number = this.add.text(-width / 2 + 24, 10, value, {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '32px', color: '#513b59', fontStyle: 'bold',
    });
    root.add([bg, caption, number]);
    return root;
  }

  protected fadeTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(180, 255, 248, 232);
    this.time.delayedCall(185, () => this.scene.start(key, data));
  }
}
