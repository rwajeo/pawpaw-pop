import { BaseScene } from './BaseScene';
import { GAME_WIDTH } from '../constants';
import { saveSystem } from '../systems/SaveSystem';
import { audioSystem } from '../systems/AudioSystem';
import { hapticSystem } from '../systems/HapticSystem';
import type { GameSettings } from '../types';

export class SettingsScene extends BaseScene {
  public constructor() { super('SettingsScene'); }

  public create(): void {
    this.addBackdrop(0xcaf1df);
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.addTopBar('설정', () => this.fadeTo('MenuScene'));
    const settings = saveSystem.getData().settings;
    audioSystem.applySettings(settings);
    audioSystem.setMusicContext('menu');
    hapticSystem.setEnabled(settings.hapticsEnabled);
    const items: Array<{ key: keyof Pick<GameSettings, 'muted' | 'soundEnabled' | 'musicEnabled' | 'hapticsEnabled' | 'screenShake' | 'reducedParticles' | 'reducedMotion'>; label: string; description: string }> = [
      { key: 'muted', label: '전체 음소거', description: '모든 소리를 한 번에 끕니다' },
      { key: 'soundEnabled', label: '효과음', description: '팡팡 터지는 소리를 재생합니다' },
      { key: 'musicEnabled', label: '배경 음악', description: '코드로 만든 밝은 음악을 재생합니다' },
      { key: 'hapticsEnabled', label: '진동', description: '지원 기기에서 손맛을 더합니다' },
      { key: 'screenShake', label: '화면 흔들림', description: '특수 블록의 타격감을 표현합니다' },
      { key: 'reducedParticles', label: '파티클 줄이기', description: '터지는 장식 효과를 줄입니다' },
      { key: 'reducedMotion', label: '모션 줄이기', description: '큰 움직임과 확대 연출을 줄입니다' },
    ];
    items.forEach((item, index) => this.addToggle(540, 340 + index * 155, item.label, item.description, item.key, settings[item.key]));
    this.addButton(GAME_WIDTH / 2, 1545, '저장하고 돌아가기', () => this.fadeTo('MenuScene'), { width: 650, color: 0x6e58a1 });
    this.addButton(GAME_WIDTH / 2, 1690, '저장 데이터 초기화', () => this.confirmReset(), { width: 520, height: 92, color: 0xffffff, textColor: '#a24f5a', fontSize: 30 });
    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }

  private addToggle(x: number, y: number, label: string, description: string, key: keyof GameSettings, initial: boolean): void {
    let value = initial;
    const group = this.add.container(x, y);
    const panel = this.add.graphics().fillStyle(0xffffff, 0.84).fillRoundedRect(-430, -62, 860, 124, 34);
    const name = this.add.text(-385, -35, label, { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '35px', fontStyle: 'bold', color: '#513b59' });
    const help = this.add.text(-385, 15, description, { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '22px', color: '#857286' });
    const track = this.add.graphics();
    const knob = this.add.circle(0, 0, 23, 0xffffff);
    const redraw = (): void => {
      track.clear().fillStyle(value ? 0x62c7a6 : 0xb9afbc).fillRoundedRect(300, -29, 102, 58, 29);
      knob.setPosition(value ? 373 : 329, 0);
    };
    redraw();
    group.add([panel, name, help, track, knob]).setSize(860, 124).setInteractive({ useHandCursor: true });
    group.on('pointerup', () => {
      value = !value;
      redraw();
      saveSystem.updateSettings({ [key]: value });
      const settings = saveSystem.getData().settings;
      audioSystem.applySettings(settings);
      if (settings.musicEnabled && !settings.muted) void audioSystem.resume().then(() => audioSystem.startMusic('menu'));
      hapticSystem.setEnabled(settings.hapticsEnabled);
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
    });
  }

  private confirmReset(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x3f3248, 0.65).setInteractive();
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(120, 660, 840, 540, 52);
    const copy = this.add.text(540, 800, '모든 게임 기록과\n설정을 초기화할까요?', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '44px', fontStyle: 'bold', color: '#513b59', align: 'center' }).setOrigin(0.5);
    const cancel = this.addButton(370, 1070, '취소', () => [shade, panel, copy, cancel, reset].forEach((item) => item.destroy()), { width: 320, color: 0xc7bdc9, fontSize: 32 });
    const reset = this.addButton(710, 1070, '초기화', () => { saveSystem.reset(); this.fadeTo('MenuScene'); }, { width: 320, color: 0xdb6674, fontSize: 32 });
  }
}
