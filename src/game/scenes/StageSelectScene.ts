import Phaser from 'phaser';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import { DIFFICULTY_OPTIONS } from '../data/difficulties';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';
import { BaseScene } from './BaseScene';

const CARD_PALETTES = [
  { top: 0x277961, bottom: 0x174d59, accent: 0x6aebbd },
  { top: 0x2d67a1, bottom: 0x313f78, accent: 0x73ceff },
  { top: 0xa65c32, bottom: 0x67374f, accent: 0xffb269 },
  { top: 0x91345f, bottom: 0x4d347e, accent: 0xff79b5 },
] as const;

const DIFFICULTY_TIMES = ['3분', '2분', '1분 30초', '1분'] as const;

/** Kept under the existing scene key so saved navigation remains compatible. */
export class StageSelectScene extends BaseScene {
  public constructor() { super('StageSelectScene'); }

  public create(): void {
    this.addPremiumBackdrop(0x6f63e8);
    audioSystem.setMusicContext('menu');
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.add.text(GAME_WIDTH / 2, 104, '난이도 선택', {
      fontFamily: UI_FONT, fontSize: '58px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 7, '#09071a', 10, true, true);
    this.addButton(78, 102, '‹', () => this.fadeTo('MenuScene'), {
      width: 100, height: 100, color: 0x302b50, color2: 0x223b52, textColor: '#ffffff', fontSize: 64,
    });

    const save = saveSystem.getData();
    DIFFICULTY_OPTIONS.forEach((option, index) => {
      const y = 310 + index * 250;
      const card = this.add.container(GAME_WIDTH / 2, y);
      const best = save.progress.stages[String(index + 1)]?.bestScore ?? 0;
      const palette = CARD_PALETTES[index] ?? CARD_PALETTES[0];
      const plate = this.add.graphics()
        .fillStyle(0x05040d, 0.42).fillRoundedRect(-455, -96, 910, 220, 46)
        .fillGradientStyle(palette.top, palette.top, palette.bottom, palette.bottom, 0.98).lineStyle(4, palette.accent, 0.76)
        .fillRoundedRect(-455, -110, 910, 220, 46).strokeRoundedRect(-455, -110, 910, 220, 46)
        .fillStyle(0xffffff, 0.08).fillRoundedRect(-425, -82, 330, 164, 36)
        .fillStyle(palette.accent, 0.92).fillRoundedRect(-455, -60, 10, 120, 5);
      const label = this.add.text(-260, 0, option.label, {
        fontFamily: DISPLAY_FONT, fontSize: option.id === 'veryHard' ? '45px' : '53px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      const timeCaption = this.add.text(135, -48, '제한 시간', {
        fontFamily: UI_FONT, fontSize: '27px', fontStyle: 'bold', color: '#d8d9ea',
      }).setOrigin(0.5);
      const timeText = this.add.text(135, 8, DIFFICULTY_TIMES[index] ?? '1분', {
        fontFamily: DISPLAY_FONT, fontSize: '45px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setShadow(0, 5, '#11101f', 7, true, true);
      const bestText = this.add.text(135, 69, best > 0 ? `BEST  ${best.toLocaleString('ko-KR')}` : 'BEST  —', {
        fontFamily: DISPLAY_FONT, fontSize: '27px', fontStyle: 'bold', color: '#fff0b5',
      }).setOrigin(0.5);
      const arrow = this.add.text(395, 0, '›', {
        fontFamily: DISPLAY_FONT, fontSize: '58px', fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(palette.accent).rgba,
      }).setOrigin(0.5);
      card.add([plate, label, timeCaption, timeText, bestText, arrow]);
      card.setSize(910, 220).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.fadeTo('GameScene', { difficulty: option.id }));
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.025, duration: 100 }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 100 }));
    });

    const endless = this.add.container(GAME_WIDTH / 2, 1405);
    const endlessPlate = this.add.graphics()
      .fillStyle(0x05040d, 0.48).fillRoundedRect(-455, -84, 910, 196, 46)
      .fillGradientStyle(0x6d36a8, 0x275f99, 0x123f67, 0x482e7d, 0.98)
      .lineStyle(4, 0xd7a8ff, 0.82).fillRoundedRect(-455, -98, 910, 196, 46).strokeRoundedRect(-455, -98, 910, 196, 46)
      .fillStyle(0xffffff, 0.1).fillRoundedRect(-420, -69, 840, 5, 3)
      .fillStyle(0xb875ff, 0.9).fillRoundedRect(-455, -49, 10, 98, 5);
    const endlessLabel = this.add.text(-240, -22, 'INFINITE', {
      fontFamily: DISPLAY_FONT, fontSize: '50px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#130d28', 8, true, true);
    const endlessCopy = this.add.text(-240, 42, '끝없는 모험', {
      fontFamily: UI_FONT, fontSize: '29px', fontStyle: 'bold', color: '#d9c7ff',
    }).setOrigin(0.5);
    const endlessBest = save.progress.endlessBestScore;
    const endlessScore = this.add.text(160, -24, endlessBest > 0 ? `BEST  ${endlessBest.toLocaleString('ko-KR')}` : 'BEST  —', {
      fontFamily: DISPLAY_FONT, fontSize: '33px', fontStyle: 'bold', color: '#fff0b5',
    }).setOrigin(0.5);
    const endlessRule = this.add.text(160, 39, '시간 충전 · 난이도 상승', {
      fontFamily: UI_FONT, fontSize: '27px', fontStyle: 'bold', color: '#d6ddff',
    }).setOrigin(0.5);
    const endlessArrow = this.add.text(397, 0, '›', {
      fontFamily: DISPLAY_FONT, fontSize: '68px', fontStyle: 'bold', color: '#e0b6ff',
    }).setOrigin(0.5);
    endless.add([endlessPlate, endlessLabel, endlessCopy, endlessScore, endlessRule, endlessArrow]);
    endless.setSize(910, 196).setInteractive({ useHandCursor: true });
    endless.on('pointerup', () => this.fadeTo('GameScene', { mode: 'endless', difficulty: 'medium' }));
    endless.on('pointerover', () => this.tweens.add({ targets: endless, scale: 1.025, duration: 100 }));
    endless.on('pointerout', () => this.tweens.add({ targets: endless, scale: 1, duration: 100 }));

    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }
}
