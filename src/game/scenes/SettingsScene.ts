import { BaseScene } from './BaseScene';
import { GAME_WIDTH, UI_FONT } from '../constants';
import { saveSystem } from '../systems/SaveSystem';
import { audioSystem } from '../systems/AudioSystem';
import { hapticSystem } from '../systems/HapticSystem';
import type { GameSettings } from '../types';

type ToggleKey = keyof Pick<GameSettings, 'muted' | 'soundEnabled' | 'musicEnabled' | 'hapticsEnabled' | 'screenShake' | 'reducedParticles' | 'reducedMotion'>;

export class SettingsScene extends BaseScene {
  public constructor() { super('SettingsScene'); }

  public create(): void {
    this.addPremiumBackdrop(0x55d7a5);
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.addTopBar('설정', () => this.fadeTo('MenuScene'));

    const settings = saveSystem.getData().settings;
    audioSystem.applySettings(settings);
    audioSystem.setMusicContext('menu');
    hapticSystem.setEnabled(settings.hapticsEnabled);

    const panel = this.add.graphics()
      .fillStyle(0x05040d, 0.38).fillRoundedRect(62, 225, 956, 1130, 56)
      .fillGradientStyle(0x3a315d, 0x2f3a5d, 0x1e5062, 0x302c51, 0.96)
      .lineStyle(4, 0xffffff, 0.18).fillRoundedRect(62, 205, 956, 1130, 56).strokeRoundedRect(62, 205, 956, 1130, 56)
      .fillStyle(0xffffff, 0.08).fillRoundedRect(112, 235, 856, 7, 4);
    panel.setDepth(0);

    const items: Array<{ key: ToggleKey; label: string; description: string }> = [
      { key: 'muted', label: '전체 음소거', description: '모든 소리를 한 번에 끕니다.' },
      { key: 'soundEnabled', label: '효과음', description: '터짐, 버튼, 콤보 소리를 재생합니다.' },
      { key: 'musicEnabled', label: '배경 음악', description: '게임 BGM을 재생합니다.' },
      { key: 'hapticsEnabled', label: '진동', description: '터치와 폭발 타이밍에 맞춰 진동합니다.' },
      { key: 'screenShake', label: '화면 흔들림', description: '큰 폭발의 충격감을 더합니다.' },
      { key: 'reducedParticles', label: '파티클 줄이기', description: '낮은 성능 기기에서 이펙트를 줄입니다.' },
      { key: 'reducedMotion', label: '모션 줄이기', description: '흔들림과 큰 이동 애니메이션을 줄입니다.' },
    ];
    items.forEach((item, index) => this.addToggle(540, 315 + index * 142, item.label, item.description, item.key, settings[item.key]));

    this.addButton(GAME_WIDTH / 2, 1492, '완료', () => this.fadeTo('MenuScene'), {
      width: 700, height: 124, color: 0x77df5a, color2: 0x20aa56, fontSize: 46,
    });
    this.addButton(GAME_WIDTH / 2, 1640, '기록 초기화', () => this.confirmReset(), {
      width: 560, height: 96, color: 0xffffff, color2: 0xf1e6ff, textColor: '#a24f5a', fontSize: 32,
    });
    this.input.keyboard?.on('keydown-ESC', () => this.fadeTo('MenuScene'));
  }

  private addToggle(x: number, y: number, label: string, description: string, key: ToggleKey, initial: boolean): void {
    let value = initial;
    const group = this.add.container(x, y);
    const panel = this.add.graphics()
      .fillStyle(0x05040d, 0.28).fillRoundedRect(-430, -54, 860, 124, 34)
      .fillGradientStyle(0xffffff, 0xffffff, 0xeaf8ff, 0xf6ecff, 0.94)
      .lineStyle(2, 0xffffff, 0.52).fillRoundedRect(-430, -64, 860, 124, 34).strokeRoundedRect(-430, -64, 860, 124, 34)
      .fillStyle(0xffffff, 0.35).fillRoundedRect(-392, -40, 500, 5, 3);
    const name = this.add.text(-382, -37, label, { fontFamily: UI_FONT, fontSize: '34px', fontStyle: '900', color: '#4e3b63' });
    const help = this.add.text(-382, 11, description, { fontFamily: UI_FONT, fontSize: '22px', fontStyle: '800', color: '#7a6882' });
    const track = this.add.graphics();
    const knob = this.add.circle(0, 0, 28, 0xffffff).setStrokeStyle(4, 0xffffff, 0.7);
    const stateText = this.add.text(0, 0, '', {
      fontFamily: UI_FONT, fontSize: '21px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5);
    const redraw = (): void => {
      track.clear()
        .fillStyle(value ? 0x169e61 : 0x91889a, 1).fillRoundedRect(286, -34, 124, 68, 34)
        .fillGradientStyle(value ? 0x82f06b : 0xc4bdca, value ? 0x3ddc73 : 0xb0a8b6, value ? 0x1aaa62 : 0x91889a, value ? 0x148651 : 0x7a7380, 1)
        .lineStyle(3, 0xffffff, 0.45).fillRoundedRect(286, -38, 124, 68, 34).strokeRoundedRect(286, -38, 124, 68, 34);
      knob.setPosition(value ? 374 : 322, -4);
      stateText.setPosition(value ? 326 : 373, -4).setText(value ? 'ON' : 'OFF');
      stateText.setColor(value ? '#eaffd7' : '#f4edf7');
    };
    redraw();
    group.add([panel, name, help, track, stateText, knob]).setSize(860, 124).setInteractive({ useHandCursor: true });
    group.on('pointerover', () => this.tweens.add({ targets: group, scale: 1.012, duration: 90 }));
    group.on('pointerout', () => this.tweens.add({ targets: group, scale: 1, duration: 100 }));
    group.on('pointerup', () => {
      value = !value;
      redraw();
      saveSystem.updateSettings({ [key]: value });
      const settings = saveSystem.getData().settings;
      audioSystem.applySettings(settings);
      if (settings.musicEnabled && !settings.muted) void audioSystem.resumeAndStartMusic('menu');
      hapticSystem.setEnabled(settings.hapticsEnabled);
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
    });
  }

  private confirmReset(): void {
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x161023, 0.72).setInteractive().setDepth(1000);
    const panel = this.add.graphics().setDepth(1001)
      .fillStyle(0x05040d, 0.42).fillRoundedRect(120, 660, 840, 540, 52)
      .fillGradientStyle(0xfffbf1, 0xffffff, 0xeef8ff, 0xf8efff, 1)
      .lineStyle(4, 0xffffff, 0.9).fillRoundedRect(120, 640, 840, 540, 52).strokeRoundedRect(120, 640, 840, 540, 52);
    const copy = this.add.text(540, 795, '모든 게임 기록과 설정을\n초기화할까요?', {
      fontFamily: UI_FONT, fontSize: '48px', fontStyle: '900', color: '#513b59', align: 'center', lineSpacing: 12,
    }).setOrigin(0.5).setDepth(1002);
    const cancel = this.addButton(370, 1060, '취소', () => [shade, panel, copy, cancel, reset].forEach((item) => item.destroy()), {
      width: 330, color: 0xc7bdc9, color2: 0x9f93aa, fontSize: 34,
    }).setDepth(1002);
    const reset = this.addButton(710, 1060, '초기화', () => { saveSystem.reset(); this.fadeTo('MenuScene'); }, {
      width: 330, color: 0xff7b86, color2: 0xd9485a, fontSize: 34,
    }).setDepth(1002);
  }
}
