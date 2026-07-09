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
    background.fillGradientStyle(0x17183c, 0x292053, 0x0d4661, 0x102438, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.fillGradientStyle(accent, 0xff7db4, 0x55d8ff, 0x30d7a7, 0.18).fillEllipse(540, 128, 1340, 470);
    background.fillStyle(0xffffff, 0.045).fillEllipse(540, 106, 980, 220);
    background.fillStyle(0xffeaa6, 0.09).fillEllipse(955, 210, 280, 280);
    background.fillStyle(0x79f7e1, 0.07).fillEllipse(120, 520, 420, 320);

    background.fillGradientStyle(0x4b39a4, 0x6d5ced, 0x22a4c0, 0x248c9c, 0.2).fillPoints([
      new Phaser.Geom.Point(-130, 420), new Phaser.Geom.Point(130, 250), new Phaser.Geom.Point(365, 345),
      new Phaser.Geom.Point(615, 230), new Phaser.Geom.Point(875, 330), new Phaser.Geom.Point(1220, 245),
      new Phaser.Geom.Point(1220, 620), new Phaser.Geom.Point(910, 520), new Phaser.Geom.Point(640, 610),
      new Phaser.Geom.Point(360, 520), new Phaser.Geom.Point(-130, 690),
    ], true);
    background.fillGradientStyle(0x2a4166, 0x264f6d, 0x123852, 0x17354e, 0.92).fillPoints([
      new Phaser.Geom.Point(-90, 1390), new Phaser.Geom.Point(150, 1185), new Phaser.Geom.Point(335, 1310),
      new Phaser.Geom.Point(560, 1070), new Phaser.Geom.Point(760, 1315), new Phaser.Geom.Point(985, 1115),
      new Phaser.Geom.Point(1180, 1315), new Phaser.Geom.Point(1180, 1920), new Phaser.Geom.Point(-90, 1920),
    ], true);
    background.fillGradientStyle(0x153147, 0x173a50, 0x0b2233, 0x102238, 0.98).fillPoints([
      new Phaser.Geom.Point(-100, 1610), new Phaser.Geom.Point(175, 1425), new Phaser.Geom.Point(390, 1565),
      new Phaser.Geom.Point(650, 1375), new Phaser.Geom.Point(850, 1560), new Phaser.Geom.Point(1180, 1400),
      new Phaser.Geom.Point(1180, 1920), new Phaser.Geom.Point(-100, 1920),
    ], true);
    background.fillStyle(0x071a29, 0.62).fillPoints([
      new Phaser.Geom.Point(-100, 1800), new Phaser.Geom.Point(210, 1615), new Phaser.Geom.Point(500, 1770),
      new Phaser.Geom.Point(780, 1585), new Phaser.Geom.Point(1180, 1735), new Phaser.Geom.Point(1180, 1920),
      new Phaser.Geom.Point(-100, 1920),
    ], true);

    const atmosphere = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([`${this.scene.key}-premium-backdrop`]);
    for (let index = 0; index < 42; index += 1) {
      const x = rng.between(36, GAME_WIDTH - 36);
      const y = rng.between(58, 1500);
      const size = rng.between(3, 9);
      const color = index % 5 === 0 ? 0xffe28a : index % 4 === 0 ? accent : index % 3 === 0 ? 0x74e8de : 0xffffff;
      atmosphere.fillStyle(color, rng.realInRange(0.16, 0.5)).fillPoints([
        new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.62, y),
        new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.62, y),
      ], true);
    }
    atmosphere.lineStyle(4, 0xffffff, 0.045).beginPath().moveTo(80, 995).lineTo(340, 900).lineTo(590, 970).lineTo(910, 850).strokePath();
    atmosphere.lineStyle(2, 0x9ef8ff, 0.05).beginPath().moveTo(145, 1210).lineTo(390, 1110).lineTo(670, 1185).lineTo(950, 1060).strokePath();
    this.tweens.add({ targets: atmosphere, alpha: { from: 0.58, to: 1 }, y: { from: -5, to: 7 }, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  protected addBackdrop(accent = 0xffd8cc): void {
    this.addPremiumBackdrop(accent);
  }

  protected addTopBar(title: string, onBack?: () => void): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x05040d, 0.4).fillRoundedRect(28, 33, GAME_WIDTH - 56, 144, 42);
    bar.fillGradientStyle(0x3c315f, 0x32385b, 0x1f4b61, 0x2a2d50, 0.98)
      .lineStyle(3, 0xffffff, 0.18)
      .fillRoundedRect(28, 18, GAME_WIDTH - 56, 144, 42)
      .strokeRoundedRect(28, 18, GAME_WIDTH - 56, 144, 42)
      .fillStyle(0xffffff, 0.1).fillRoundedRect(68, 42, GAME_WIDTH - 136, 6, 3);
    this.add.text(GAME_WIDTH / 2, 91, title, {
      fontFamily: UI_FONT,
      fontSize: '58px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#34264d',
      strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 7, '#070614', 10, true, true);
    if (onBack) this.addButton(88, 91, '‹', onBack, { width: 104, height: 96, color: 0x6f63e8, color2: 0x2a9ec0, textColor: '#ffffff', fontSize: 66 });
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
    const radius = Math.min(44, height * 0.34);
    const topColor = options.color ?? COLORS.coral;
    const bottomColor = options.color2 ?? topColor;
    const rim = Phaser.Display.Color.ValueToColor(topColor).darken(22).color;
    const deep = Phaser.Display.Color.ValueToColor(bottomColor).darken(34).color;
    const shadow = this.add.graphics()
      .fillStyle(0x05040d, 0.42).fillRoundedRect(-width / 2 + 6, -height / 2 + 18, width - 12, height, radius)
      .fillStyle(0x000000, 0.15).fillRoundedRect(-width / 2 + 26, height / 2 - 6, width - 52, 18, 12);
    const plate = this.add.graphics()
      .fillStyle(deep, 1).fillRoundedRect(-width / 2, -height / 2 + 10, width, height, radius)
      .fillGradientStyle(topColor, Phaser.Display.Color.ValueToColor(topColor).lighten(10).color, bottomColor, deep, 1)
      .lineStyle(5, rim, 0.92)
      .fillRoundedRect(-width / 2, -height / 2, width, height - 10, radius)
      .strokeRoundedRect(-width / 2, -height / 2, width, height - 10, radius)
      .lineStyle(3, 0xffffff, 0.34).strokeRoundedRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 26, radius - 7)
      .fillStyle(0xffffff, 0.18).fillRoundedRect(-width / 2 + 32, -height / 2 + 17, width - 64, 8, 4);
    const text = this.add.text(0, -5, `${options.icon ? `${options.icon}  ` : ''}${label}`, {
      fontFamily: UI_FONT,
      fontSize: `${options.fontSize ?? 40}px`,
      fontStyle: '900',
      color: options.textColor ?? '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setLetterSpacing(-1);
    const darkText = ['#513b59', '#5f4c67', '#a24f5a'].includes(options.textColor ?? '');
    text.setShadow(0, darkText ? 2 : 5, darkText ? '#ffffff' : '#3d244f', darkText ? 2 : 5, true, true);
    container.add([shadow, plate, text]);
    container.setData('label', text);
    container.setSize(width, height).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.03, duration: 90, ease: 'Sine.Out' }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, y, duration: 100, ease: 'Sine.Out' }));
    container.on('pointerdown', () => {
      void audioSystem.resumeAndStartMusic();
      container.setScale(0.965);
      container.y = y + 8;
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
    const bg = this.add.graphics()
      .fillStyle(0x05040d, 0.24).fillRoundedRect(-width / 2, -40, width, 96, 30)
      .fillGradientStyle(0xffffff, 0xffffff, 0xe7f6ff, 0xf4e9ff, 0.92)
      .lineStyle(2, 0xffffff, 0.52).fillRoundedRect(-width / 2, -50, width, 96, 30).strokeRoundedRect(-width / 2, -50, width, 96, 30);
    const caption = this.add.text(-width / 2 + 24, -22, label, {
      fontFamily: UI_FONT, fontSize: '22px', color: '#806d83', fontStyle: '900',
    });
    const number = this.add.text(-width / 2 + 24, 9, value, {
      fontFamily: UI_FONT, fontSize: '34px', color: '#513b59', fontStyle: '900',
    });
    root.add([bg, caption, number]);
    return root;
  }

  protected fadeTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(180, 255, 248, 232);
    this.time.delayedCall(185, () => this.scene.start(key, data));
  }
}
