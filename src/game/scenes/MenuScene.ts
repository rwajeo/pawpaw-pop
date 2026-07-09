import { BaseScene } from './BaseScene';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import type { CharacterId } from '../entities/CharacterRenderer';
import { MAX_LEVEL } from '../data/stages';
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

    this.drawHeroStage();
    this.drawLogo();
    this.drawMascot(150, 598, 'momo', -5, 216);
    this.drawMascot(350, 555, 'dudu', -2, 226);
    this.drawMascot(540, 516, 'bomi', 0, 246);
    this.drawMascot(730, 555, 'piyo', 2, 226);
    this.drawMascot(930, 598, 'kongi', 5, 216);

    const save = saveSystem.getData();
    const stageRecords = Object.values(save.progress.stages);
    const best = Math.max(save.progress.endlessBestScore, stageRecords.reduce((highest, stage) => Math.max(highest, stage.bestScore), 0));
    const completed = stageRecords.filter((stage) => stage.completed).length;
    const primaryLevel = this.getPrimaryLevel();
    this.drawRecordCard(best, completed, save.progress.totalStars);

    this.addStartButton(primaryLevel);
    this.addButton(340, 1375, '설정', () => this.fadeTo('SettingsScene'), {
      width: 350, height: 112, color: 0x705ce8, color2: 0x2e83c8, textColor: '#ffffff', fontSize: 38,
    });
    this.addButton(740, 1375, '게임 방법', () => this.showHowTo(), {
      width: 390, height: 112, color: 0xffa33d, color2: 0xe95f78, textColor: '#ffffff', fontSize: 36,
    });

    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('GameScene', { stageId: primaryLevel }));
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('GameScene', { stageId: primaryLevel }));
  }

  private getPrimaryLevel(): number {
    const progress = saveSystem.getData().progress;
    const hasCompletedLevel = Object.values(progress.stages).some((stage) => stage.completed);
    const level = hasCompletedLevel ? progress.unlockedStage : 1;
    return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  }

  private drawHeroStage(): void {
    const stage = this.add.graphics();
    stage.fillStyle(0x05040d, 0.24).fillEllipse(540, 715, 960, 210);
    stage.fillGradientStyle(0xfff6d4, 0xffffff, 0xaaf4ee, 0xc9c0ff, 0.22).fillEllipse(540, 690, 1040, 240);
    stage.lineStyle(5, 0xffffff, 0.1).strokeEllipse(540, 690, 1040, 240);
    for (let index = 0; index < 9; index += 1) {
      const x = 120 + index * 105;
      stage.fillStyle(index % 2 === 0 ? 0xffe28a : 0x8ef6ff, 0.12).fillCircle(x, 835 + (index % 3) * 8, 22 + (index % 4) * 6);
    }
  }

  private drawLogo(): void {
    const root = this.add.container(GAME_WIDTH / 2, 232);
    const glow = this.add.graphics().fillStyle(0xff77be, 0.24).fillEllipse(0, 18, 680, 180);
    const back = this.add.graphics()
      .fillGradientStyle(0xffd95e, 0xff8d5e, 0xd95cff, 0x6d66ff, 1)
      .lineStyle(6, 0xffffff, 0.78)
      .fillRoundedRect(-330, -74, 660, 154, 50)
      .strokeRoundedRect(-330, -74, 660, 154, 50)
      .fillStyle(0xffffff, 0.18).fillRoundedRect(-285, -48, 570, 8, 4);
    const title = this.add.text(0, -4, '포포팝!', {
      fontFamily: DISPLAY_FONT,
      fontSize: '116px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#5b3ab8',
      strokeThickness: 14,
    }).setOrigin(0.5).setLetterSpacing(-5).setShadow(0, 12, '#0c0920', 18, true, true);
    const sub = this.add.text(0, 102, '번개처럼 터지는 매치 퍼즐', {
      fontFamily: UI_FONT, fontSize: '32px', fontStyle: '900', color: '#fff2b8',
      stroke: '#3c2c65', strokeThickness: 5,
    }).setOrigin(0.5);
    root.add([glow, back, title, sub]);
    root.setAngle(-1.5);
    this.tweens.add({ targets: glow, scaleX: { from: 0.96, to: 1.04 }, alpha: { from: 0.2, to: 0.34 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawMascot(x: number, y: number, character: CharacterId, angle: number, size: number): void {
    const root = this.add.container(x, y).setAngle(angle);
    const shadow = this.add.graphics().fillStyle(0x05040d, 0.24).fillEllipse(0, size * 0.38, size * 0.7, size * 0.18);
    const art = this.add.image(0, -18, `mascot-${character}`).setDisplaySize(size, size);
    root.add([shadow, art]);
    this.tweens.add({ targets: root, y: y - 15, duration: 900 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawRecordCard(best: number, completed: number, stars: number): void {
    const root = this.add.container(540, 845);
    const width = 820;
    const height = 190;
    const card = this.add.graphics()
      .fillStyle(0x05040d, 0.42).fillRoundedRect(-width / 2, -height / 2 + 15, width, height, 48)
      .fillGradientStyle(0x352d58, 0x2e3658, 0x1d4a62, 0x2d2b50, 0.98)
      .lineStyle(3, 0xffffff, 0.18)
      .fillRoundedRect(-width / 2, -height / 2, width, height, 48)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 48)
      .fillStyle(0xffffff, 0.1).fillRoundedRect(-360, -68, 720, 6, 3);
    const label = this.add.text(-330, -38, '나의 최고 점수', {
      fontFamily: UI_FONT, fontSize: '30px', fontStyle: '900', color: '#cfd4ff',
    });
    const score = this.add.text(330, 22, best.toLocaleString('ko-KR'), {
      fontFamily: DISPLAY_FONT, fontSize: '82px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(1, 0.5).setLetterSpacing(-2).setShadow(0, 8, '#090715', 12, true, true);
    const progress = this.add.text(-330, 48, `진도 ${completed}/${MAX_LEVEL}   ★ ${stars}`, {
      fontFamily: DISPLAY_FONT, fontSize: '32px', fontStyle: '900', color: '#ffe38d',
    }).setShadow(0, 4, '#171126', 6, true, true);
    root.add([card, label, score, progress]);
  }

  private addStartButton(primaryLevel: number): void {
    const x = GAME_WIDTH / 2;
    const y = 1088;
    const width = 780;
    const height = 164;
    const root = this.add.container(x, y);
    const glow = this.add.graphics().fillStyle(0x6bff9d, 0.22).fillRoundedRect(-width / 2 - 20, -height / 2 + 12, width + 40, height + 26, 58);
    const shadow = this.add.graphics().fillStyle(0x070511, 0.55).fillRoundedRect(-width / 2, -height / 2 + 22, width, height, 52);
    const plate = this.add.graphics()
      .fillStyle(0x1f7c28, 1).fillRoundedRect(-width / 2, -height / 2 + 13, width, height, 52)
      .fillGradientStyle(0x9cff55, 0x6fe834, 0x2ac24f, 0x179c45, 1)
      .lineStyle(6, 0x15773b, 0.94).fillRoundedRect(-width / 2, -height / 2, width, height - 12, 52).strokeRoundedRect(-width / 2, -height / 2, width, height - 12, 52)
      .lineStyle(3, 0xffffff, 0.5).strokeRoundedRect(-width / 2 + 12, -height / 2 + 10, width - 24, height - 32, 42)
      .fillStyle(0xffffff, 0.23).fillRoundedRect(-width / 2 + 42, -height / 2 + 22, width - 84, 10, 5);
    const label = this.add.text(0, -7, '게임 시작', {
      fontFamily: UI_FONT, fontSize: '62px', fontStyle: '900', color: '#ffffff',
      stroke: '#1d6f2c', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 7, '#0d4b21', 8, true, true);
    const tag = this.add.text(0, 54, `LEVEL ${primaryLevel}`, {
      fontFamily: DISPLAY_FONT, fontSize: '24px', fontStyle: '900', color: '#eaffc6',
    }).setOrigin(0.5).setLetterSpacing(4);
    root.add([glow, shadow, plate, label, tag]);
    root.setSize(width, height).setInteractive({ useHandCursor: true });
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.028, duration: 100 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, y, duration: 110 }));
    root.on('pointerdown', () => { root.setScale(0.97); root.y = y + 9; void audioSystem.resumeAndStartMusic('menu'); });
    root.on('pointerup', () => {
      root.setScale(1).setY(y);
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
      this.fadeTo('GameScene', { stageId: primaryLevel });
    });
    this.tweens.add({ targets: glow, alpha: { from: 0.6, to: 1 }, scale: { from: 0.99, to: 1.03 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private showHowTo(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x161023, 0.72).setInteractive().setDepth(1000);
    const panel = this.add.graphics().setDepth(1001)
      .fillStyle(0x05040d, 0.42).fillRoundedRect(110, 500, 860, 850, 56)
      .fillGradientStyle(0xfffbf1, 0xffffff, 0xeef8ff, 0xf8efff, 1)
      .lineStyle(4, 0xffffff, 0.9).fillRoundedRect(110, 480, 860, 850, 56).strokeRoundedRect(110, 480, 860, 850, 56);
    const title = this.add.text(540, 610, '게임 방법', {
      fontFamily: UI_FONT, fontSize: '62px', fontStyle: '900', color: '#513b59',
    }).setOrigin(0.5).setDepth(1002);
    const copy = this.add.text(540, 870,
      '인접한 동물을 드래그하거나\n두 칸을 차례로 눌러 자리를 바꿔요.\n\n같은 동물 3마리 이상을 맞추면\n시원하게 터지고 시간이 조금 충전됩니다.\n\n4마리 이상은 특수 블록,\n천둥 토템은 획득 후 직접 눌러 발동해요.',
      { fontFamily: UI_FONT, fontSize: '36px', fontStyle: '800', color: '#66536b', align: 'center', lineSpacing: 17 },
    ).setOrigin(0.5).setDepth(1002);
    const close = this.addButton(540, 1235, '알겠어요!', () => [shade, panel, title, copy, close].forEach((item) => item.destroy()), { width: 540, color: 0x62cf7c, color2: 0x2aae63 }).setDepth(1002);
  }
}
