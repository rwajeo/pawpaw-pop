import Phaser from 'phaser';
import { DISPLAY_FONT, UI_FONT } from '../constants';
import { CHARACTER_IDS } from '../entities/CharacterRenderer';

export class BootScene extends Phaser.Scene {
  public constructor() { super('BootScene'); }

  public preload(): void {
    CHARACTER_IDS.forEach((id) => this.load.image(`mascot-${id}`, `art/characters/${id}.png`));
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#fff4df');
    this.add.text(540, 910, '포포팝!', {
      fontFamily: DISPLAY_FONT, fontSize: '96px', fontStyle: 'bold', color: '#684f76',
    }).setOrigin(0.5);
    this.add.text(540, 1035, '말랑한 친구들을 깨우는 중…', {
      fontFamily: UI_FONT, fontSize: '30px', fontStyle: 'bold', color: '#806d83',
    }).setOrigin(0.5);
    const bar = this.add.rectangle(540, 1110, 420, 20, 0x8e79a6);
    bar.setScale(0.05, 1);
    this.tweens.add({ targets: bar, scaleX: 1, duration: 500, ease: 'Sine.Out', onComplete: () => this.scene.start('MenuScene') });
  }
}
