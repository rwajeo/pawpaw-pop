import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { DIFFICULTY_OPTIONS } from '../data/difficulties';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';
import { BaseScene } from './BaseScene';

/** Kept under the existing scene key so saved navigation remains compatible. */
export class StageSelectScene extends BaseScene {
  public constructor() { super('StageSelectScene'); }

  public create(): void {
    this.addBackdrop(0xd9ccff);
    audioSystem.setMusicContext('menu');
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.addTopBar('난이도 선택', () => this.fadeTo('MenuScene'));

    this.add.text(GAME_WIDTH / 2, 245, '원하는 플레이 강도를 골라 주세요', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#684f76',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 300, '매번 새로운 보드 · 목표 · 장애물 배치로 시작합니다', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '24px', color: '#89758d',
    }).setOrigin(0.5);

    const save = saveSystem.getData();
    DIFFICULTY_OPTIONS.forEach((option, index) => {
      const y = 465 + index * 275;
      const card = this.add.container(GAME_WIDTH / 2, y);
      const best = save.progress.stages[String(index + 1)]?.bestScore ?? 0;
      const plate = this.add.graphics()
        .fillStyle(0x4d3d61, 0.14).fillRoundedRect(-425, -94, 850, 210, 42)
        .fillStyle(0xffffff, 0.94).lineStyle(5, option.color, 0.9)
        .fillRoundedRect(-425, -106, 850, 210, 42).strokeRoundedRect(-425, -106, 850, 210, 42)
        .fillStyle(option.color, 0.14).fillRoundedRect(-395, -76, 250, 148, 32);
      const label = this.add.text(-270, -35, option.label, {
        fontFamily: 'Arial, sans-serif', fontSize: option.id === 'veryHard' ? '38px' : '43px', fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(option.color).rgba,
      }).setOrigin(0.5);
      const title = this.add.text(-105, -58, option.title, {
        fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '35px', fontStyle: 'bold', color: '#513b59',
      });
      const description = this.add.text(-105, 2, option.description, {
        fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '24px', color: '#806d83',
      });
      const bestText = this.add.text(385, 54, best > 0 ? `BEST ${best.toLocaleString('ko-KR')}` : 'NEW RUN', {
        fontFamily: 'Arial, sans-serif', fontSize: '22px', fontStyle: 'bold', color: best > 0 ? '#b47584' : '#9b8c9e',
      }).setOrigin(1, 0.5);
      card.add([plate, label, title, description, bestText]);
      card.setSize(850, 210).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.fadeTo('GameScene', { difficulty: option.id }));
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.025, duration: 100 }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 100 }));
    });

    this.add.text(GAME_WIDTH / 2, 1630, '같은 난이도라도 매 판 퍼즐과 공략법이 달라집니다', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#755f78',
    }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }
}
