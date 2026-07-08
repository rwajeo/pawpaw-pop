import Phaser from 'phaser';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import { DIFFICULTY_OPTIONS } from '../data/difficulties';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';
import { BaseScene } from './BaseScene';

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
      const y = 310 + index * 245;
      const card = this.add.container(GAME_WIDTH / 2, y);
      const best = save.progress.stages[String(index + 1)]?.bestScore ?? 0;
      const plate = this.add.graphics()
        .fillStyle(0x070611, 0.38).fillRoundedRect(-425, -90, 850, 210, 42)
        .fillGradientStyle(0x30294f, 0x272b49, 0x1f3349, 0x252640, 0.97).lineStyle(3, option.color, 0.72)
        .fillRoundedRect(-425, -106, 850, 210, 42).strokeRoundedRect(-425, -106, 850, 210, 42)
        .fillStyle(option.color, 0.2).fillRoundedRect(-395, -76, 250, 148, 32)
        .fillStyle(option.color, 0.9).fillRoundedRect(-425, -58, 8, 112, 4)
        .fillStyle(0xffffff, 0.08).fillRoundedRect(-380, -88, 730, 4, 2);
      const label = this.add.text(-270, -35, option.label, {
        fontFamily: DISPLAY_FONT, fontSize: option.id === 'veryHard' ? '38px' : '43px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      const title = this.add.text(-105, -58, option.title, {
        fontFamily: UI_FONT, fontSize: '35px', fontStyle: 'bold', color: '#ffffff',
      });
      const description = this.add.text(-105, 2, option.description, {
        fontFamily: UI_FONT, fontSize: '24px', fontStyle: 'bold', color: '#b9bdd3',
      });
      const bestText = this.add.text(385, 54, best > 0 ? `BEST ${best.toLocaleString('ko-KR')}` : 'NEW RUN', {
        fontFamily: DISPLAY_FONT, fontSize: '22px', fontStyle: 'bold', color: best > 0 ? '#ffd57f' : '#8fa4bb',
      }).setOrigin(1, 0.5);
      const arrow = this.add.text(380, -26, '›', {
        fontFamily: DISPLAY_FONT, fontSize: '52px', fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(option.color).rgba,
      }).setOrigin(0.5);
      card.add([plate, label, title, description, bestText, arrow]);
      card.setSize(850, 210).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.fadeTo('GameScene', { difficulty: option.id }));
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.025, duration: 100 }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 100 }));
    });

    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }
}
