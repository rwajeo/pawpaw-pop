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
    this.addBackdrop(this.result.success ? 0xffd88d : 0xd9ccff);
    this.cameras.main.fadeIn(250, 255, 248, 232);
    this.add.text(GAME_WIDTH / 2, 250, this.result.success ? '기록 완료!' : '시간 종료', {
      fontFamily: DISPLAY_FONT, fontSize: '78px', fontStyle: 'bold', color: '#5a4466', stroke: '#ffffff', strokeThickness: 14,
    }).setOrigin(0.5);
    const stars = Array.from({ length: 3 }, (_, index) => index < this.result.stars ? '★' : '☆').join('  ');
    this.add.text(GAME_WIDTH / 2, 435, stars, { fontFamily: DISPLAY_FONT, fontSize: '112px', color: '#f2ae35', stroke: '#ffffff', strokeThickness: 9 }).setOrigin(0.5);
    const scoreLabel = this.add.text(GAME_WIDTH / 2, 700, '0', { fontFamily: DISPLAY_FONT, fontSize: '92px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 610, '최종 점수', { fontFamily: UI_FONT, fontSize: '30px', fontStyle: 'bold', color: '#837184' }).setOrigin(0.5);
    this.tweens.addCounter({ from: 0, to: this.result.score, duration: 850, ease: 'Cubic.Out', onUpdate: (tween) => scoreLabel.setText(Math.floor(tween.getValue() ?? 0).toLocaleString('ko-KR')) });
    this.pill(350, 860, '최고 콤보', `${this.result.bestCombo} COMBO`, 350);
    this.pill(730, 860, '제한 시간', `${Math.floor(this.result.remaining / 60)}분 ${this.result.remaining % 60 || ''}${this.result.remaining % 60 ? '초' : ''}`, 350);
    this.pill(540, 990, '획득 보상', `🐾 ${this.result.reward}`, 440);
    this.addButton(540, 1190, '새 퍼즐로 다시 하기', () => this.fadeTo('GameScene', { difficulty: this.result.difficulty ?? 'easy' }), { color: 0x7657b5, color2: 0xe86887 });
    this.addButton(540, 1360, '난이도 선택', () => this.fadeTo('StageSelectScene'), { color: 0x7659a7 });
  }
}
