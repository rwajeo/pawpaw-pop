import Phaser from 'phaser';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import { MAX_LEVEL, STAGES } from '../data/stages';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';
import type { StageDefinition, StageGoal } from '../types';
import { BaseScene } from './BaseScene';

const levelPalette = (levelId: number): { top: number; bottom: number; accent: number } => {
  const palettes = [
    { top: 0x35c8a8, bottom: 0x2772c7, accent: 0x8fffe2 },
    { top: 0x7d68f5, bottom: 0xd95caa, accent: 0xffd7ef },
    { top: 0xffa84d, bottom: 0xe15875, accent: 0xffef9b },
    { top: 0x32a7df, bottom: 0x4556c9, accent: 0xb4ecff },
  ] as const;
  return palettes[(levelId - 1) % palettes.length] ?? palettes[0];
};

/** Kept under the existing scene key so saved navigation remains compatible. */
export class StageSelectScene extends BaseScene {
  public constructor() { super('StageSelectScene'); }

  public create(): void {
    this.addPremiumBackdrop(0x6f63e8);
    audioSystem.setMusicContext('menu');
    this.cameras.main.fadeIn(180, 255, 248, 232);

    const save = saveSystem.getData();
    const unlocked = Math.min(MAX_LEVEL, Math.max(1, save.progress.unlockedStage));
    const completed = Object.values(save.progress.stages).filter((stage) => stage.completed).length;
    const totalStars = save.progress.totalStars;

    this.drawMapPath(unlocked);
    this.add.text(GAME_WIDTH / 2, 104, '레벨 진행', {
      fontFamily: UI_FONT, fontSize: '66px', fontStyle: '900', color: '#ffffff',
      stroke: '#322154', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(0, 7, '#09071a', 12, true, true);

    this.addButton(86, 104, '홈', () => this.fadeTo('MenuScene'), {
      width: 116, height: 92, color: 0x725ff0, color2: 0x2e98c7, textColor: '#ffffff', fontSize: 30,
    });

    this.drawProgressPanel(completed, totalStars);
    this.drawCurrentLevel(unlocked);
    STAGES.forEach((stage, index) => this.drawLevelCard(stage.id, index, unlocked));
    this.drawEndlessButton(save.progress.endlessBestScore);
    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }

  private drawMapPath(unlocked: number): void {
    const path = this.add.graphics();
    const points = Array.from({ length: MAX_LEVEL }, (_, index) => {
      const row = Math.floor(index / 4);
      const localCol = index % 4;
      const col = row % 2 === 0 ? localCol : 3 - localCol;
      return new Phaser.Geom.Point(165 + col * 250, 610 + row * 190);
    });
    const drawPath = (width: number, color: number, alpha: number): void => {
      path.lineStyle(width, color, alpha).beginPath().moveTo(points[0]?.x ?? 165, points[0]?.y ?? 610);
      points.slice(1).forEach((point) => path.lineTo(point.x, point.y));
      path.strokePath();
    };
    drawPath(18, 0x05040d, 0.2);
    drawPath(7, 0xffffff, 0.17);
    const current = points[Math.max(0, unlocked - 1)];
    if (current) path.fillStyle(0xffe38d, 0.18).fillCircle(current.x, current.y, 100);
  }

  private drawProgressPanel(completed: number, totalStars: number): void {
    const progress = this.add.graphics()
      .fillStyle(0x05040d, 0.4).fillRoundedRect(112, 178, 856, 124, 38)
      .fillGradientStyle(0x3a315d, 0x30395c, 0x1f5063, 0x302d51, 0.98)
      .lineStyle(3, 0xffffff, 0.18).fillRoundedRect(112, 162, 856, 124, 38).strokeRoundedRect(112, 162, 856, 124, 38)
      .fillStyle(0xffffff, 0.09).fillRoundedRect(150, 188, 780, 7, 4);
    const ratio = completed / MAX_LEVEL;
    progress.fillStyle(0x05040d, 0.25).fillRoundedRect(160, 250, 760, 20, 10);
    progress.fillGradientStyle(0x7effd9, 0x75d7ff, 0xffd36d, 0xff8ab2, 1)
      .fillRoundedRect(160, 250, Math.max(18, 760 * ratio), 20, 10);
    this.add.text(166, 210, `진도 ${completed}/${MAX_LEVEL}`, {
      fontFamily: UI_FONT, fontSize: '32px', fontStyle: '900', color: '#dfe7ff',
    });
    this.add.text(920, 210, `★ ${totalStars}`, {
      fontFamily: DISPLAY_FONT, fontSize: '44px', fontStyle: '900', color: '#ffe38d',
    }).setOrigin(1, 0.5).setShadow(0, 4, '#181124', 6, true, true);
  }

  private drawCurrentLevel(levelId: number): void {
    const stage = STAGES[levelId - 1] ?? STAGES[0];
    const root = this.add.container(GAME_WIDTH / 2, 398);
    const palette = levelPalette(levelId);
    const plate = this.add.graphics()
      .fillStyle(0x05040d, 0.48).fillRoundedRect(-455, -82, 910, 190, 50)
      .fillStyle(0xffffff, 0.12).fillRoundedRect(-446, -101, 892, 184, 48)
      .fillGradientStyle(palette.top, palette.top, palette.bottom, palette.bottom, 0.98)
      .lineStyle(5, palette.accent, 0.72).fillRoundedRect(-455, -100, 910, 184, 48).strokeRoundedRect(-455, -100, 910, 184, 48)
      .fillStyle(0xffffff, 0.14).fillRoundedRect(-410, -70, 820, 8, 4);
    const caption = this.add.text(-340, -34, '다음 목표', {
      fontFamily: UI_FONT, fontSize: '27px', fontStyle: '900', color: '#e8e7ff',
    }).setOrigin(0.5);
    const title = this.add.text(-210, 25, `LEVEL ${levelId} · ${stage?.title ?? ''}`, {
      fontFamily: DISPLAY_FONT, fontSize: '45px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#0d0820', 8, true, true);
    const time = this.add.text(202, -8, `제한 시간`, {
      fontFamily: UI_FONT, fontSize: '24px', fontStyle: '900', color: '#dff4ff',
    }).setOrigin(0.5);
    const timeValue = this.add.text(202, 35, this.formatTime(stage?.timeLimit ?? 120), {
      fontFamily: DISPLAY_FONT, fontSize: '42px', fontStyle: '900', color: '#fff6c9',
    }).setOrigin(0.5).setShadow(0, 4, '#171126', 6, true, true);
    const start = this.add.text(396, 10, '정보', {
      fontFamily: DISPLAY_FONT, fontSize: '40px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#151126', 7, true, true);
    root.add([plate, caption, title, time, timeValue, start]);
    root.setSize(910, 184).setInteractive({ useHandCursor: true });
    root.on('pointerup', () => this.showLevelPreview(stage));
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.025, duration: 100 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, duration: 100 }));
  }

  private drawLevelCard(levelId: number, index: number, unlocked: number): void {
    const row = Math.floor(index / 4);
    const localCol = index % 4;
    const col = row % 2 === 0 ? localCol : 3 - localCol;
    const x = 165 + col * 250;
    const y = 610 + row * 190;
    const save = saveSystem.getData();
    const record = save.progress.stages[String(levelId)];
    const isUnlocked = levelId <= unlocked;
    const isCurrent = levelId === unlocked;
    const stars = record?.stars ?? 0;
    const palette = levelPalette(levelId);
    const root = this.add.container(x, y).setAlpha(isUnlocked ? 1 : 0.5);
    const card = this.add.graphics()
      .fillStyle(0x05040d, 0.42).fillRoundedRect(-92, -68, 184, 158, 36)
      .fillStyle(0xffffff, isUnlocked ? 0.12 : 0.05).fillRoundedRect(-86, -84, 172, 150, 34)
      .fillGradientStyle(isUnlocked ? palette.top : 0x5a5365, isUnlocked ? palette.top : 0x5a5365, isUnlocked ? palette.bottom : 0x3e3949, isUnlocked ? palette.bottom : 0x3e3949, 0.98)
      .lineStyle(isCurrent ? 7 : 4, isCurrent ? 0xffffff : palette.accent, isCurrent ? 0.95 : 0.45)
      .fillRoundedRect(-92, -84, 184, 158, 36).strokeRoundedRect(-92, -84, 184, 158, 36)
      .fillStyle(0xffffff, 0.14).fillRoundedRect(-56, -68, 112, 6, 3);
    const level = this.add.text(0, -18, String(levelId), {
      fontFamily: DISPLAY_FONT, fontSize: '62px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 6, '#111026', 8, true, true);
    const starText = this.add.text(0, 48, isUnlocked ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : '잠김', {
      fontFamily: DISPLAY_FONT, fontSize: isUnlocked ? '28px' : '25px', fontStyle: '900', color: isUnlocked ? '#ffe38d' : '#d5cfdf',
    }).setOrigin(0.5).setShadow(0, 3, '#151025', 5, true, true);
    root.add([card, level, starText]);
    if (!isUnlocked) return;
    root.setSize(184, 158).setInteractive({ useHandCursor: true });
    root.on('pointerup', () => this.showLevelPreview(STAGES[levelId - 1]));
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.055, duration: 90 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, duration: 100 }));
  }

  private drawEndlessButton(bestScore: number): void {
    const root = this.add.container(GAME_WIDTH / 2, 1630);
    const plate = this.add.graphics()
      .fillStyle(0x05040d, 0.48).fillRoundedRect(-430, -72, 860, 164, 44)
      .fillGradientStyle(0x8e4aff, 0x397bd9, 0x124567, 0x56329a, 0.98)
      .lineStyle(5, 0xd7a8ff, 0.76).fillRoundedRect(-430, -88, 860, 164, 44).strokeRoundedRect(-430, -88, 860, 164, 44)
      .fillStyle(0xffffff, 0.13).fillRoundedRect(-392, -58, 784, 7, 4);
    const label = this.add.text(-215, -12, '무한 모드', {
      fontFamily: DISPLAY_FONT, fontSize: '50px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#120d28', 8, true, true);
    const best = this.add.text(200, -12, bestScore > 0 ? `BEST ${bestScore.toLocaleString('ko-KR')}` : '최고 기록 도전', {
      fontFamily: UI_FONT, fontSize: '35px', fontStyle: '900', color: '#fff1ba',
    }).setOrigin(0.5);
    const copy = this.add.text(0, 42, '시간을 버티며 끝없이 콤보를 쌓으세요', {
      fontFamily: UI_FONT, fontSize: '24px', fontStyle: '800', color: '#dfe7ff',
    }).setOrigin(0.5);
    root.add([plate, label, best, copy]);
    root.setSize(860, 164).setInteractive({ useHandCursor: true });
    root.on('pointerup', () => this.fadeTo('GameScene', { mode: 'endless' }));
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.025, duration: 100 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, duration: 100 }));
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest > 0 ? `${minutes}분 ${rest}초` : `${minutes}분`;
  }

  private showLevelPreview(stage?: StageDefinition): void {
    if (!stage) return;
    const palette = levelPalette(stage.id);
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x070611, 0.78).setDepth(1000).setInteractive();
    const panel = this.add.graphics().setDepth(1001)
      .fillStyle(0x05040d, 0.54).fillRoundedRect(105, 505, 870, 850, 58)
      .fillGradientStyle(0x3a315d, 0x31375c, 0x214c61, 0x332d55, 1)
      .lineStyle(5, palette.accent, 0.7)
      .fillRoundedRect(105, 480, 870, 850, 58)
      .strokeRoundedRect(105, 480, 870, 850, 58)
      .fillStyle(0xffffff, 0.12).fillRoundedRect(160, 525, 760, 8, 4);
    const eyebrow = this.add.text(540, 585, `LEVEL ${stage.id}`, {
      fontFamily: DISPLAY_FONT, fontSize: '30px', fontStyle: '900', color: '#bfefff',
    }).setOrigin(0.5).setLetterSpacing(5).setDepth(1002);
    const title = this.add.text(540, 665, stage.title, {
      fontFamily: UI_FONT, fontSize: '66px', fontStyle: '900', color: '#ffffff',
      stroke: '#1b1735', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1002);
    const time = this.add.text(540, 755, `제한 시간  ${this.formatTime(stage.timeLimit ?? 120)}`, {
      fontFamily: UI_FONT, fontSize: '36px', fontStyle: '900', color: '#ffe59b',
    }).setOrigin(0.5).setDepth(1002);
    const mission = this.add.text(540, 900, stage.goals.map((goal) => this.goalLabel(goal)).join('\n'), {
      fontFamily: UI_FONT, fontSize: '38px', fontStyle: '800', color: '#ffffff', align: 'center', lineSpacing: 20,
    }).setOrigin(0.5).setDepth(1002);
    const hint = this.add.text(540, 1030, '보드는 매번 새롭게 섞여 시작됩니다', {
      fontFamily: UI_FONT, fontSize: '27px', fontStyle: '800', color: '#bdc6df',
    }).setOrigin(0.5).setDepth(1002);
    let overlayPointerHandler: ((pointer: Phaser.Input.Pointer) => void) | undefined;
    const cleanup = (): void => {
      if (overlayPointerHandler) this.input.off(Phaser.Input.Events.POINTER_UP, overlayPointerHandler);
      [shade, panel, eyebrow, title, time, mission, hint, start, close].forEach((item) => item.destroy());
    };
    const start = this.addButton(540, 1160, '도전 시작', () => this.fadeTo('GameScene', { stageId: stage.id }), {
      width: 650, height: 126, color: palette.top, color2: palette.bottom, fontSize: 46,
    }).setDepth(1002);
    const close = this.addButton(540, 1305, '다른 레벨 보기', cleanup, {
      width: 520, height: 94, color: 0x3e4668, color2: 0x323654, fontSize: 31,
    }).setDepth(1002);
    overlayPointerHandler = (pointer: Phaser.Input.Pointer): void => {
      if (Math.abs(pointer.worldX - 540) <= 325 && Math.abs(pointer.worldY - 1160) <= 70) {
        this.fadeTo('GameScene', { stageId: stage.id });
      } else if (Math.abs(pointer.worldX - 540) <= 260 && Math.abs(pointer.worldY - 1305) <= 55) {
        cleanup();
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, overlayPointerHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (overlayPointerHandler) this.input.off(Phaser.Input.Events.POINTER_UP, overlayPointerHandler);
    });
  }

  private goalLabel(goal: StageGoal): string {
    if (goal.type === 'score') return `점수 ${goal.target.toLocaleString('ko-KR')} 달성`;
    if (goal.type === 'collect') return `목표 친구 ${goal.target}마리 모으기`;
    if (goal.type === 'obstacle') return `봉인 ${goal.target}개 해제`;
    if (goal.type === 'starDrop') return `별 조각 ${goal.target}개 모으기`;
    return `매치 파워 ${goal.target}회 만들기`;
  }
}
