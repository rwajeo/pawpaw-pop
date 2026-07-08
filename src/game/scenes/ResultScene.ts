import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import type { Difficulty, StageResult } from '../types';
import { audioSystem } from '../systems/AudioSystem';

interface ResultData extends StageResult { success: boolean; remaining: number; reward: number; difficulty?: Difficulty; }

export class ResultScene extends BaseScene {
  private result: ResultData = { stageId: 1, score: 0, stars: 0, bestCombo: 0, success: false, remaining: 0, reward: 0 };

  public constructor() { super('ResultScene'); }
  public init(data: ResultData): void { this.result = { ...this.result, ...data }; }

  public create(): void {
    audioSystem.setMusicContext('result');
    this.addPremiumBackdrop(this.result.success ? 0xffb852 : 0x8b6cff);
    this.cameras.main.fadeIn(250, 255, 248, 232);
    this.add.text(GAME_WIDTH / 2, 225, this.result.success ? '기록 완료!' : '시간 종료', {
      fontFamily: DISPLAY_FONT, fontSize: '82px', fontStyle: 'bold', color: '#ffffff', stroke: '#5b43a1', strokeThickness: 14,
    }).setOrigin(0.5).setShadow(0, 10, '#090715', 14, true, true);
    [340, 540, 740].forEach((x, index) => this.drawResultStar(x, 420, index < this.result.stars, index));
    const scoreLabel = this.add.text(GAME_WIDTH / 2, 680, '0', { fontFamily: DISPLAY_FONT, fontSize: '106px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setShadow(0, 9, '#080612', 14, true, true).setLetterSpacing(-2);
    this.add.text(GAME_WIDTH / 2, 565, '최종 점수', { fontFamily: UI_FONT, fontSize: '34px', fontStyle: 'bold', color: '#c8c2dc' })
      .setOrigin(0.5).setLetterSpacing(2);
    this.tweens.addCounter({ from: 0, to: this.result.score, duration: 850, ease: 'Cubic.Out', onUpdate: (tween) => scoreLabel.setText(Math.floor(tween.getValue() ?? 0).toLocaleString('ko-KR')) });
    this.statCard(315, 835, '최고 콤보', `${this.result.bestCombo} COMBO`, 410);
    this.statCard(765, 835, '제한 시간', this.formatLimit(), 410);
    this.statCard(540, 1015, '획득 보상', `포포 포인트  ${this.result.reward}`, 860, true);
    this.addButton(540, 1245, '새 퍼즐로 다시 하기', () => this.fadeTo('GameScene', { difficulty: this.result.difficulty ?? 'easy' }), { color: 0x7657b5, color2: 0xe86887 });
    this.addButton(540, 1415, '난이도 선택', () => this.fadeTo('StageSelectScene'), { color: 0x7659a7 });
  }

  private formatLimit(): string {
    const minutes = Math.floor(this.result.remaining / 60);
    const seconds = this.result.remaining % 60;
    return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
  }

  private statCard(x: number, y: number, label: string, value: string, width: number, reward = false): void {
    const height = 150;
    const root = this.add.container(x, y);
    const shadow = this.add.graphics().fillStyle(0x05040d, 0.46).fillRoundedRect(-width / 2, -height / 2 + 11, width, height, 34);
    const plate = this.add.graphics()
      .fillGradientStyle(reward ? 0x4b3f72 : 0x302b50, reward ? 0x4a456c : 0x29364e, reward ? 0x273e55 : 0x1f3449, reward ? 0x3a3159 : 0x282641, 0.98)
      .lineStyle(3, reward ? 0xffcf65 : 0xffffff, reward ? 0.42 : 0.16)
      .fillRoundedRect(-width / 2, -height / 2, width, height, 34)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 34);
    const labelText = this.add.text(0, -35, label, {
      fontFamily: UI_FONT, fontSize: '29px', fontStyle: 'bold', color: reward ? '#ffd978' : '#bbb5d2',
    }).setOrigin(0.5).setLetterSpacing(1);
    const valueText = this.add.text(0, 26, value, {
      fontFamily: DISPLAY_FONT, fontSize: reward ? '45px' : '41px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 5, '#0a0815', 8, true, true);
    root.add([shadow, plate, labelText, valueText]);
  }

  private drawResultStar(x: number, y: number, filled: boolean, index: number): void {
    const root = this.add.container(x, y).setScale(0.15).setAlpha(0);
    const points = this.starPoints(92, 42);
    const inner = this.starPoints(67, 30);
    const glow = this.add.graphics().fillStyle(0xffc74f, filled ? 0.18 : 0.06).fillCircle(0, 2, 102);
    const shadow = this.add.graphics().fillStyle(0x080611, 0.48).fillPoints(points.map((point) => new Phaser.Geom.Point(point.x, point.y + 13)), true);
    const base = this.add.graphics();
    if (filled) {
      base.fillGradientStyle(0xfff5a8, 0xffd24f, 0xff9a3d, 0xffba42, 1).lineStyle(6, 0xffffff, 0.9).fillPoints(points, true).strokePoints(points, true);
      base.fillStyle(0xffffff, 0.22).fillPoints(inner, true);
    } else {
      base.fillStyle(0x2a2744, 0.94).lineStyle(7, 0xffcf62, 0.95).fillPoints(points, true).strokePoints(points, true);
      base.lineStyle(3, 0xffffff, 0.22).strokePoints(inner, true);
    }
    root.add([glow, shadow, base]);
    this.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 440, delay: index * 115, ease: 'Back.Out' });
  }

  private starPoints(outerRadius: number, innerRadius: number): Phaser.Geom.Point[] {
    return Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      return new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius);
    });
  }
}
