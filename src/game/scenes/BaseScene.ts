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
    background.fillGradientStyle(0x17132f, 0x231744, 0x092b3c, 0x11192f, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.fillGradientStyle(accent, 0x6551b7, 0x2b7f91, 0x23596e, 0.13)
      .fillEllipse(540, 170, 1320, 420);
    background.fillStyle(0xffffff, 0.035).fillEllipse(540, 115, 980, 210);

    background.fillStyle(accent, 0.075).fillPoints([
      new Phaser.Geom.Point(-120, 430), new Phaser.Geom.Point(170, 255), new Phaser.Geom.Point(430, 350),
      new Phaser.Geom.Point(720, 205), new Phaser.Geom.Point(1210, 360), new Phaser.Geom.Point(1210, 570),
      new Phaser.Geom.Point(760, 420), new Phaser.Geom.Point(420, 515), new Phaser.Geom.Point(-120, 610),
    ], true);
    background.fillStyle(0x49d4cb, 0.055).fillPoints([
      new Phaser.Geom.Point(-100, 620), new Phaser.Geom.Point(260, 430), new Phaser.Geom.Point(560, 520),
      new Phaser.Geom.Point(870, 380), new Phaser.Geom.Point(1180, 520), new Phaser.Geom.Point(1180, 715),
      new Phaser.Geom.Point(780, 585), new Phaser.Geom.Point(390, 690), new Phaser.Geom.Point(-100, 760),
    ], true);

    background.fillGradientStyle(0x243653, 0x273451, 0x172d42, 0x1d2940, 0.88).fillPoints([
      new Phaser.Geom.Point(-80, 1420), new Phaser.Geom.Point(170, 1160), new Phaser.Geom.Point(345, 1330),
      new Phaser.Geom.Point(560, 1060), new Phaser.Geom.Point(770, 1320), new Phaser.Geom.Point(980, 1110),
      new Phaser.Geom.Point(1160, 1340), new Phaser.Geom.Point(1160, 1920), new Phaser.Geom.Point(-80, 1920),
    ], true);
    background.fillGradientStyle(0x132f43, 0x172b42, 0x0b2233, 0x102238, 0.94).fillPoints([
      new Phaser.Geom.Point(-100, 1640), new Phaser.Geom.Point(180, 1430), new Phaser.Geom.Point(390, 1570),
      new Phaser.Geom.Point(650, 1370), new Phaser.Geom.Point(840, 1550), new Phaser.Geom.Point(1180, 1390),
      new Phaser.Geom.Point(1180, 1920), new Phaser.Geom.Point(-100, 1920),
    ], true);
    background.fillStyle(0x071a29, 0.54).fillPoints([
      new Phaser.Geom.Point(-100, 1800), new Phaser.Geom.Point(210, 1610), new Phaser.Geom.Point(500, 1770),
      new Phaser.Geom.Point(780, 1580), new Phaser.Geom.Point(1180, 1730), new Phaser.Geom.Point(1180, 1920),
      new Phaser.Geom.Point(-100, 1920),
    ], true);

    const atmosphere = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([`${this.scene.key}-premium-backdrop`]);
    for (let index = 0; index < 32; index += 1) {
      const x = rng.between(45, GAME_WIDTH - 45);
      const y = rng.between(65, 1460);
      const size = rng.between(2, 6);
      const color = index % 4 === 0 ? accent : index % 3 === 0 ? 0x74e8de : 0xffffff;
      atmosphere.fillStyle(color, rng.realInRange(0.18, 0.48)).fillPoints([
        new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.55, y),
        new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.55, y),
      ], true);
    }
    atmosphere.lineStyle(2, 0xffffff, 0.035).beginPath().moveTo(80, 980).lineTo(340, 900).lineTo(590, 970).lineTo(910, 850).strokePath();
    this.tweens.add({ targets: atmosphere, alpha: { from: 0.55, to: 1 }, y: { from: -4, to: 6 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
