import { BaseScene } from './BaseScene';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import type { CharacterId } from '../entities/CharacterRenderer';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';

export class MenuScene extends BaseScene {
  public constructor() { super('MenuScene'); }

  public create(): void {
    this.addPremiumBackdrop(0x8b6cff);
    audioSystem.applySettings(saveSystem.getData().settings);
    audioSystem.setMusicContext('menu');
    this.input.on('pointerdown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.input.keyboard?.on('keydown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.cameras.main.fadeIn(220, 255, 248, 232);

    this.add.text(GAME_WIDTH / 2, 245, '포포팝!', {
      fontFamily: DISPLAY_FONT,
      fontSize: '132px', fontStyle: 'bold', color: '#ffffff', stroke: '#6a4fca', strokeThickness: 16,
    }).setOrigin(0.5).setAngle(-2).setLetterSpacing(-6).setShadow(0, 12, '#0c0920', 18, true, true);
    this.drawMascot(155, 585, 'momo', -5, 212);
    this.drawMascot(350, 550, 'dudu', -2, 224);
    this.drawMascot(540, 515, 'bomi', 0, 240);
    this.drawMascot(730, 550, 'piyo', 2, 224);
    this.drawMascot(925, 585, 'kongi', 5, 212);

    const stageRecords = Object.values(saveSystem.getData().progress.stages);
    const best = stageRecords.reduce((highest, stage) => Math.max(highest, stage.bestScore), 0);
    this.add.graphics()
      .fillStyle(0x070611, 0.36).fillRoundedRect(160, 737, 760, 188, 48)
      .fillGradientStyle(0x30284f, 0x282744, 0x1c3148, 0x24263f, 0.96)
      .lineStyle(3, 0xffffff, 0.16).fillRoundedRect(160, 720, 760, 188, 48).strokeRoundedRect(160, 720, 760, 188, 48)
      .fillStyle(0xffffff, 0.08).fillRoundedRect(190, 742, 700, 5, 3);
    this.add.text(220, 758, '나의 최고 점수', {
      fontFamily: UI_FONT, fontSize: '30px', fontStyle: 'bold', color: '#bdb5d5',
    });
    this.add.text(850, 827, best.toLocaleString('ko-KR'), {
      fontFamily: DISPLAY_FONT, fontSize: '84px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5).setLetterSpacing(-2);

    this.addStartButton();
    this.addButton(350, 1340, '설정', () => this.fadeTo('SettingsScene'), { width: 360, color: 0x302b50, color2: 0x25364d, textColor: '#f7f4ff' });
    this.addButton(730, 1340, '게임 방법', () => this.showHowTo(), { width: 360, color: 0x302b50, color2: 0x25364d, textColor: '#f7f4ff' });

    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelectScene'));
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelectScene'));
  }

  private drawMascot(x: number, y: number, character: CharacterId, angle: number, size: number): void {
    const root = this.add.container(x, y).setAngle(angle);
    const art = this.add.image(0, -18, `mascot-${character}`).setDisplaySize(size, size);
    root.add(art);
    this.tweens.add({ targets: root, y: y - 16, duration: 900 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private addStartButton(): void {
    const x = GAME_WIDTH / 2;
    const y = 1050;
    const width = 750;
    const height = 154;
    const root = this.add.container(x, y);
    const glow = this.add.graphics().fillStyle(0xff5f91, 0.2).fillRoundedRect(-width / 2 - 15, -height / 2 + 14, width + 30, height + 16, 52);
    const shadow = this.add.graphics().fillStyle(0x070511, 0.5).fillRoundedRect(-width / 2, -height / 2 + 18, width, height, 46);
    const plate = this.add.graphics()
      .fillGradientStyle(0x7664ff, 0x9b56ee, 0xe953a0, 0xff6b7d, 1)
      .lineStyle(4, 0xffffff, 0.36).fillRoundedRect(-width / 2, -height / 2, width, height, 46).strokeRoundedRect(-width / 2, -height / 2, width, height, 46)
      .fillStyle(0xffffff, 0.2).fillRoundedRect(-width / 2 + 28, -height / 2 + 16, width - 56, 6, 3);
    const label = this.add.text(0, -3, '게임 시작', {
      fontFamily: UI_FONT, fontSize: '52px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#4f2868', 6, true, true);
    root.add([glow, shadow, plate, label]);
    root.setSize(width, height).setInteractive({ useHandCursor: true });
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.025, duration: 100 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, y, duration: 110 }));
    root.on('pointerdown', () => { root.setScale(0.98); root.y = y + 7; void audioSystem.resumeAndStartMusic('menu'); });
    root.on('pointerup', () => {
      root.setScale(1).setY(y);
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
      this.fadeTo('StageSelectScene');
    });
  }

  private showHowTo(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x3f3248, 0.62).setInteractive();
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(120, 510, 840, 850, 54);
    const title = this.add.text(540, 620, '게임 방법', { fontFamily: UI_FONT, fontSize: '58px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5);
    const copy = this.add.text(540, 870,
      '인접한 동물 친구를 드래그하거나\n차례로 눌러 자리를 바꿔요.\n\n같은 친구를 3마리 이상 맞추면 시간이 충전돼요.\n4마리는 로켓, 5마리는 특별 블록!\n\n셔플은 한 게임에 2번까지 사용할 수 있어요.',
      { fontFamily: UI_FONT, fontSize: '34px', fontStyle: 'bold', color: '#66536b', align: 'center', lineSpacing: 18 },
    ).setOrigin(0.5);
    const close = this.addButton(540, 1235, '알겠어요!', () => [shade, panel, title, copy, close].forEach((item) => item.destroy()), { width: 520 });
  }
}
