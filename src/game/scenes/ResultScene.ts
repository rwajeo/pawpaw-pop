import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { DISPLAY_FONT, GAME_WIDTH, UI_FONT } from '../constants';
import type { Difficulty, GameMode, StageResult } from '../types';
import { audioSystem } from '../systems/AudioSystem';

interface ResultData extends StageResult {
  success: boolean;
  remaining: number;
  reward: number;
  difficulty?: Difficulty;
  mode?: GameMode;
  survivedSeconds?: number;
}

export class ResultScene extends BaseScene {
  private result: ResultData = { stageId: 1, score: 0, stars: 0, bestCombo: 0, success: false, remaining: 0, reward: 0 };

  public constructor() { super('ResultScene'); }
  public init(data: ResultData): void { this.result = { ...this.result, ...data }; }

  public create(): void {
    const isEndless = this.result.mode === 'endless';
    audioSystem.setMusicContext('result');
    this.addPremiumBackdrop(this.result.success ? 0xffb852 : 0x8b6cff);
    this.cameras.main.fadeIn(250, 255, 248, 232);
    this.add.text(GAME_WIDTH / 2, 225, isEndless ? '무한 모드 기록' : this.result.success ? '기록 완료!' : '시간 종료', {
      fontFamily: DISPLAY_FONT, fontSize: '82px', fontStyle: 'bold', color: '#ffffff', stroke: '#5b43a1', strokeThickness: 14,
    }).setOrigin(0.5).setShadow(0, 10, '#090715', 14, true, true);
    if (isEndless) {
      this.add.text(GAME_WIDTH / 2, 420, '∞', {
        fontFamily: DISPLAY_FONT, fontSize: '210px', fontStyle: 'bold', color: '#d9a7ff', stroke: '#563a91', strokeThickness: 10,
      }).setOrigin(0.5).setShadow(0, 12, '#090615', 18, true, true);
    } else {
      [340, 540, 740].forEach((x, index) => this.drawResultStar(x, 420, index < this.result.stars, index));
    }
    const scoreLabel = this.add.text(GAME_WIDTH / 2, 680, '0', { fontFamily: DISPLAY_FONT, fontSize: '106px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setShadow(0, 9, '#080612', 14, true, true).setLetterSpacing(-2);
    this.add.text(GAME_WIDTH / 2, 565, '최종 점수', { fontFamily: UI_FONT, fontSize: '34px', fontStyle: 'bold', color: '#c8c2dc' })
      .setOrigin(0.5).setLetterSpacing(2);
    this.tweens.addCounter({ from: 0, to: this.result.score, duration: 850, ease: 'Cubic.Out', onUpdate: (tween) => scoreLabel.setText(Math.floor(tween.getValue() ?? 0).toLocaleString('ko-KR')) });
    this.statCard(315, 835, '최고 콤보', `${this.result.bestCombo} COMBO`, 410);
    this.statCard(765, 835, isEndless ? '생존 시간' : '제한 시간', this.formatLimit(), 410);
    this.statCard(540, 1015, isEndless ? '도달 레벨' : '획득 보상', isEndless ? `LEVEL ${1 + Math.floor((this.result.survivedSeconds ?? 0) / 45)}` : `포포 포인트  ${this.result.reward}`, 860, true);
    this.addButton(540, 1245, isEndless ? '무한 모드 다시 하기' : '새 퍼즐로 다시 하기', () => this.fadeTo('GameScene', {
      difficulty: this.result.difficulty ?? 'easy', mode: this.result.mode ?? 'timed',
    }), { color: 0x7657b5, color2: 0xe86887 });
    this.addButton(540, 1415, '난이도 선택', () => this.fadeTo('StageSelectScene'), { color: 0x7659a7 });
  }

  private formatLimit(): string {
    const total = this.result.mode === 'endless' ? this.result.survivedSeconds ?? 0 : this.result.remaining;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
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
    const points = this.starPoints(92, 42);
    const inner = this.starPoints(67, 30);
    const socket = this.add.graphics().setPosition(x, y).setDepth(2)
      .fillStyle(0x080611, 0.5).fillPoints(points.map((point) => new Phaser.Geom.Point(point.x, point.y + 12)), true)
      .fillStyle(0x25223e, 0.96).lineStyle(7, 0xffcf62, 0.82).fillPoints(points, true).strokePoints(points, true)
      .lineStyle(3, 0xffffff, 0.14).strokePoints(inner, true);
    if (!filled) {
      socket.setScale(0.72).setAlpha(0);
      this.tweens.add({ targets: socket, scale: 1, alpha: 1, duration: 360, delay: 150 + index * 90, ease: 'Back.Out' });
      return;
    }
    socket.setAlpha(0.62);
    const root = this.add.container(x + (index - 1) * 34, y - 62).setScale(5.2).setAlpha(0).setAngle((index - 1) * 16).setDepth(20);
    const glow = this.add.graphics().fillStyle(0xffc74f, 0.2).fillCircle(0, 2, 104);
    const shadow = this.add.graphics().fillStyle(0x080611, 0.52).fillPoints(points.map((point) => new Phaser.Geom.Point(point.x, point.y + 14)), true);
    const base = this.add.graphics();
    base.fillGradientStyle(0xffffcf, 0xffdc57, 0xff9438, 0xffbd3e, 1).lineStyle(6, 0xffffff, 0.94).fillPoints(points, true).strokePoints(points, true);
    base.fillStyle(0xffffff, 0.23).fillPoints(inner, true);
    root.add([glow, shadow, base]);
    const delay = 220 + index * 360;
    this.tweens.add({ targets: root, alpha: 1, duration: 90, delay });
    this.tweens.add({
      targets: root,
      x,
      y,
      scaleX: 1.08,
      scaleY: 1.08,
      angle: 0,
      duration: 540,
      delay,
      ease: 'Quart.In',
      onComplete: () => {
        this.playStarImpact(x, y, index);
        root.setScale(1.32, 0.78);
        this.tweens.add({ targets: root, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.Out' });
      },
    });
  }

  private playStarImpact(x: number, y: number, index: number): void {
    const burst = this.add.graphics().setPosition(x, y).setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
    burst.fillStyle(0xffffff, 0.8).fillCircle(0, 0, 28);
    burst.lineStyle(8, 0xffd55f, 0.92).strokeCircle(0, 0, 72);
    burst.lineStyle(3, 0xffffff, 0.82).strokeCircle(0, 0, 104);
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = ray * Math.PI / 6;
      const inner = 82 + (ray % 2) * 12;
      const outer = inner + 38;
      burst.lineStyle(ray % 2 === 0 ? 6 : 3, ray % 2 === 0 ? 0xffd45f : 0xffffff, 0.88)
        .lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    burst.setScale(0.38);
    this.tweens.add({ targets: burst, scale: 1.7, alpha: 0, angle: index % 2 === 0 ? 9 : -9, duration: 360, ease: 'Expo.Out', onComplete: () => burst.destroy() });
    this.cameras.main.shake(85, 0.0018);
  }

  private starPoints(outerRadius: number, innerRadius: number): Phaser.Geom.Point[] {
    return Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      return new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius);
    });
  }
}
