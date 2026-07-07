import { BaseScene } from './BaseScene';
import { COLORS, GAME_WIDTH } from '../constants';
import { audioSystem } from '../systems/AudioSystem';
import { saveSystem } from '../systems/SaveSystem';

export class MenuScene extends BaseScene {
  public constructor() { super('MenuScene'); }

  public create(): void {
    this.addBackdrop();
    audioSystem.applySettings(saveSystem.getData().settings);
    audioSystem.setMusicContext('menu');
    this.input.on('pointerdown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.input.keyboard?.on('keydown', () => void audioSystem.resumeAndStartMusic('menu'));
    this.cameras.main.fadeIn(220, 255, 248, 232);

    this.add.text(GAME_WIDTH / 2, 245, '포포팝!', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif',
      fontSize: '132px', fontStyle: 'bold', color: '#694f77', stroke: '#ffffff', strokeThickness: 18,
    }).setOrigin(0.5).setAngle(-2);
    this.add.text(GAME_WIDTH / 2, 350, 'P A W  P A W  P O P !', {
      fontFamily: 'Arial, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#b47584',
    }).setOrigin(0.5);

    this.drawMascot(310, 575, 0xffa89c, '고양이', -8);
    this.drawMascot(540, 540, 0x73d8bc, '판다', 0);
    this.drawMascot(770, 575, 0x87d7f1, '토끼', 8);

    const best = this.registry.get('bestScore') as number | undefined;
    this.pill(GAME_WIDTH / 2, 775, '나의 최고 점수', (best ?? 0).toLocaleString('ko-KR'), 500);
    this.addButton(GAME_WIDTH / 2, 960, '난이도 선택', () => this.fadeTo('StageSelectScene'), { color: COLORS.coral, icon: '▶', height: 132, fontSize: 44 });
    this.addButton(GAME_WIDTH / 2, 1125, '오늘의 도전 · 60초', () => this.fadeTo('GameScene', { daily: true }), { color: 0x55b99a, icon: '☀' });
    this.addButton(360, 1435, '설정', () => this.fadeTo('SettingsScene'), { width: 340, color: 0xffffff, textColor: '#5f4c67', icon: '⚙' });
    this.addButton(720, 1435, '게임 방법', () => this.showHowTo(), { width: 340, color: 0xffffff, textColor: '#5f4c67', icon: '?' });

    this.add.text(GAME_WIDTH / 2, 1655, '같은 친구 셋을 이어 톡! 터뜨려요', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '31px', color: '#755f78', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelectScene'));
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelectScene'));
  }

  private drawMascot(x: number, y: number, color: number, label: string, angle: number): void {
    const root = this.add.container(x, y).setAngle(angle);
    const shadow = this.add.ellipse(0, 104, 190, 48, 0x6f5d70, 0.16);
    const body = this.add.graphics();
    body.fillStyle(color).lineStyle(9, 0xffffff, 0.85);
    body.fillCircle(0, 0, 110).strokeCircle(0, 0, 110);
    if (label === '토끼') {
      body.fillEllipse(-48, -104, 55, 126).strokeEllipse(-48, -104, 55, 126);
      body.fillEllipse(48, -104, 55, 126).strokeEllipse(48, -104, 55, 126);
    } else {
      body.fillCircle(-72, -73, 43).strokeCircle(-72, -73, 43);
      body.fillCircle(72, -73, 43).strokeCircle(72, -73, 43);
    }
    const face = this.add.graphics();
    face.fillStyle(0x4e3a52).fillCircle(-36, -7, 11).fillCircle(36, -7, 11);
    face.fillStyle(0xffffff).fillCircle(-32, -12, 4).fillCircle(40, -12, 4);
    face.fillStyle(0xff7890, 0.55).fillEllipse(-66, 26, 36, 18).fillEllipse(66, 26, 36, 18);
    face.lineStyle(7, 0x4e3a52).beginPath().arc(0, 28, 25, 0.1, Math.PI - 0.1).strokePath();
    const mark = this.add.text(0, 64, label === '판다' ? '✚' : label === '토끼' ? '⌄' : '●', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    root.add([shadow, body, face, mark]);
    this.tweens.add({ targets: root, y: y - 16, duration: 900 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private showHowTo(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x3f3248, 0.62).setInteractive();
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(120, 510, 840, 850, 54);
    const title = this.add.text(540, 620, '게임 방법', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '58px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5);
    const copy = this.add.text(540, 870,
      '인접한 동물 친구를 드래그하거나\n차례로 눌러 자리를 바꿔요.\n\n같은 친구 3마리 이상을 맞추면 팡!\n4마리는 로켓, 5마리는 특별 블록!\n\n키보드: 방향키 · Enter · Esc',
      { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '35px', color: '#66536b', align: 'center', lineSpacing: 18 },
    ).setOrigin(0.5);
    const close = this.addButton(540, 1235, '알겠어요!', () => [shade, panel, title, copy, close].forEach((item) => item.destroy()), { width: 520 });
  }
}
