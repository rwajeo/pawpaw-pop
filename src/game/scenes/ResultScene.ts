import { BaseScene } from './BaseScene';
import { GAME_WIDTH } from '../constants';
import type { Difficulty, StageResult } from '../types';
import { audioSystem } from '../systems/AudioSystem';

interface ResultData extends StageResult { success: boolean; remaining: number; reward: number; daily?: boolean; difficulty?: Difficulty; }

export class ResultScene extends BaseScene {
  private result: ResultData = { stageId: 1, score: 0, stars: 0, bestCombo: 0, success: false, remaining: 0, reward: 0 };

  public constructor() { super('ResultScene'); }
  public init(data: ResultData): void { this.result = { ...this.result, ...data }; }

  public create(): void {
    audioSystem.setMusicContext('result');
    this.addBackdrop(this.result.success ? 0xffd88d : 0xd9ccff);
    this.cameras.main.fadeIn(250, 255, 248, 232);
    this.add.text(GAME_WIDTH / 2, 250, this.result.success ? '도전 성공!' : '조금만 더!', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '78px', fontStyle: 'bold', color: '#5a4466', stroke: '#ffffff', strokeThickness: 14,
    }).setOrigin(0.5);
    const stars = Array.from({ length: 3 }, (_, index) => index < this.result.stars ? '★' : '☆').join('  ');
    this.add.text(GAME_WIDTH / 2, 435, stars, { fontFamily: 'Arial, sans-serif', fontSize: '112px', color: '#f2ae35', stroke: '#ffffff', strokeThickness: 9 }).setOrigin(0.5);
    const scoreLabel = this.add.text(GAME_WIDTH / 2, 700, '0', { fontFamily: 'Arial, sans-serif', fontSize: '92px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 610, '최종 점수', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '30px', color: '#837184' }).setOrigin(0.5);
    this.tweens.addCounter({ from: 0, to: this.result.score, duration: 850, ease: 'Cubic.Out', onUpdate: (tween) => scoreLabel.setText(Math.floor(tween.getValue() ?? 0).toLocaleString('ko-KR')) });
    this.pill(350, 860, '최고 콤보', `${this.result.bestCombo} COMBO`, 350);
    this.pill(730, 860, '남은 이동 보너스', `+${this.result.remaining * 100}`, 350);
    this.pill(540, 990, '획득 보상', `🐾 ${this.result.reward}`, 440);
    this.addButton(540, 1190, '새 퍼즐로 다시 하기', () => this.fadeTo('GameScene', this.result.daily ? { daily: true } : { difficulty: this.result.difficulty ?? 'easy' }), { color: 0xff7185 });
    this.addButton(540, 1360, '난이도 선택', () => this.fadeTo(this.result.daily ? 'MenuScene' : 'StageSelectScene'), { color: 0x7659a7 });
    this.add.text(540, 1700, this.result.success ? '새로운 길이 열렸어요! 친구들이 환호해요 ✦' : '다시 웃고, 한 번 더 도전해 봐요!', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '28px', color: '#806d83', fontStyle: 'bold' }).setOrigin(0.5);
  }
}
