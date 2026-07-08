import { BaseScene } from './BaseScene';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import type { CharacterId } from '../entities/CharacterRenderer';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';

export class MenuScene extends BaseScene {
  public constructor() { super('MenuScene'); }

  public create(): void {
    this.addBackdrop();
    audioSystem.applySettings(saveSystem.getData().settings);
    audioSystem.setMusicContext('menu');
    this.input.on('pointerdown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.input.keyboard?.on('keydown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.cameras.main.fadeIn(220, 255, 248, 232);

    this.add.text(GAME_WIDTH / 2, 245, '포포팝!', {
      fontFamily: DISPLAY_FONT,
      fontSize: '132px', fontStyle: 'bold', color: '#5b4369', stroke: '#ffffff', strokeThickness: 18,
    }).setOrigin(0.5).setAngle(-2).setLetterSpacing(-6);
    this.drawMascot(155, 585, 'momo', -5, 212);
    this.drawMascot(350, 550, 'dudu', -2, 224);
    this.drawMascot(540, 515, 'bomi', 0, 240);
    this.drawMascot(730, 550, 'piyo', 2, 224);
    this.drawMascot(925, 585, 'kongi', 5, 212);

    const stageRecords = Object.values(saveSystem.getData().progress.stages);
    const best = stageRecords.reduce((highest, stage) => Math.max(highest, stage.bestScore), 0);
    this.add.graphics()
      .fillStyle(0x4a3657, 0.14).fillRoundedRect(160, 733, 760, 188, 48)
      .fillGradientStyle(0xffffff, 0xfffbf4, 0xfff5eb, 0xffffff, 0.96)
      .lineStyle(4, 0xffffff, 0.92).fillRoundedRect(160, 720, 760, 188, 48).strokeRoundedRect(160, 720, 760, 188, 48);
    this.add.text(220, 758, '나의 최고 점수', {
      fontFamily: UI_FONT, fontSize: '30px', fontStyle: 'bold', color: '#917b96',
    });
    this.add.text(850, 827, best.toLocaleString('ko-KR'), {
      fontFamily: DISPLAY_FONT, fontSize: '84px', fontStyle: 'bold', color: '#4e385d',
    }).setOrigin(1, 0.5).setLetterSpacing(-2);

    this.addButton(GAME_WIDTH / 2, 1050, '게임 시작', () => this.fadeTo('StageSelectScene'), {
      color: 0x7657b5, color2: 0xe86887, icon: '▶', width: 720, height: 150, fontSize: 48,
    });
    this.addButton(350, 1350, '설정', () => this.fadeTo('SettingsScene'), { width: 360, color: 0xffffff, textColor: '#5f4c67' });
    this.addButton(730, 1350, '게임 방법', () => this.showHowTo(), { width: 360, color: 0xffffff, textColor: '#5f4c67' });

    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelectScene'));
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelectScene'));
  }

  private drawMascot(x: number, y: number, character: CharacterId, angle: number, size: number): void {
    const root = this.add.container(x, y).setAngle(angle);
    const shadow = this.add.ellipse(0, 100, 170, 38, 0x604b68, 0.17);
    const art = this.add.image(0, -18, `mascot-${character}`).setDisplaySize(size, size);
    root.add([shadow, art]);
    this.tweens.add({ targets: root, y: y - 16, duration: 900 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private showHowTo(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x3f3248, 0.62).setInteractive();
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(120, 510, 840, 850, 54);
    const title = this.add.text(540, 620, '게임 방법', { fontFamily: UI_FONT, fontSize: '58px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5);
    const copy = this.add.text(540, 870,
      '인접한 동물 친구를 드래그하거나\n차례로 눌러 자리를 바꿔요.\n\n같은 친구를 3마리 이상 맞추면 시간이 충전돼요.\n4마리는 로켓, 5마리는 특별 블록!\n\n시간이 끝나기 전 최고 점수에 도전하세요.',
      { fontFamily: UI_FONT, fontSize: '34px', fontStyle: 'bold', color: '#66536b', align: 'center', lineSpacing: 18 },
    ).setOrigin(0.5);
    const close = this.addButton(540, 1235, '알겠어요!', () => [shade, panel, title, copy, close].forEach((item) => item.destroy()), { width: 520 });
  }
}
