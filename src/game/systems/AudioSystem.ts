import type { GameSettings } from '../types';

export type SfxName =
  | 'button' | 'select' | 'swap' | 'invalid' | 'match3' | 'match4'
  | 'bomb' | 'rocket' | 'rainbow' | 'obstacle' | 'combo'
  | 'success' | 'failure' | 'star';

export type MusicContext = 'menu' | 'stage' | 'daily' | 'result';

const DEFAULT_AUDIO_SETTINGS: Pick<GameSettings, 'masterVolume' | 'sfxVolume' | 'musicVolume' | 'muted' | 'soundEnabled' | 'musicEnabled'> = {
  masterVolume: 0.8,
  sfxVolume: 0.85,
  musicVolume: 0.45,
  muted: false,
  soundEnabled: true,
  musicEnabled: true,
};

/** Layered, code-synthesized game audio plus a user-provided looping BGM. */
export class AudioSystem {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  private bgm?: HTMLAudioElement;
  private bgmSource?: MediaElementAudioSourceNode;
  private musicContext: MusicContext = 'menu';
  private settings = { ...DEFAULT_AUDIO_SETTINGS };
  private readonly lastPlayed = new Map<SfxName, number>();

  private ensureContext(): AudioContext | undefined {
    if (this.context) return this.context;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return undefined;
    try {
      const context = new AudioContext();
      const master = context.createGain();
      const sfx = context.createGain();
      const music = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      sfx.connect(compressor).connect(master);
      music.connect(master);
      master.connect(context.destination);
      this.context = context;
      this.masterGain = master;
      this.sfxGain = sfx;
      this.musicGain = music;
      this.applyVolumes();
      return context;
    } catch {
      return undefined;
    }
  }

  private ensureBgm(): HTMLAudioElement | undefined {
    const context = this.ensureContext();
    if (!context || !this.musicGain || typeof Audio === 'undefined') return undefined;
    if (!this.bgm) {
      const audio = new Audio('/audio/pawpaw-main.wav');
      audio.loop = true;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.dataset.pawpawBgm = 'true';
      audio.setAttribute('aria-hidden', 'true');
      audio.style.display = 'none';
      document.body.append(audio);
      this.bgm = audio;
      try {
        this.bgmSource = context.createMediaElementSource(audio);
        this.bgmSource.connect(this.musicGain);
      } catch {
        this.bgm = undefined;
        this.bgmSource = undefined;
        return undefined;
      }
    }
    return this.bgm;
  }

  public async resume(): Promise<boolean> {
    const context = this.ensureContext();
    if (!context) return false;
    try {
      if (context.state === 'suspended') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  public applySettings(settings: Partial<GameSettings>): void {
    this.settings = {
      masterVolume: Math.min(1, Math.max(0, settings.masterVolume ?? this.settings.masterVolume)),
      sfxVolume: Math.min(1, Math.max(0, settings.sfxVolume ?? this.settings.sfxVolume)),
      musicVolume: Math.min(1, Math.max(0, settings.musicVolume ?? this.settings.musicVolume)),
      muted: settings.muted ?? this.settings.muted,
      soundEnabled: settings.soundEnabled ?? this.settings.soundEnabled,
      musicEnabled: settings.musicEnabled ?? this.settings.musicEnabled,
    };
    this.applyVolumes();
    if (!this.settings.musicEnabled || this.settings.muted) this.stopMusic();
  }

  private applyVolumes(): void {
    const now = this.context?.currentTime ?? 0;
    this.masterGain?.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.masterVolume, now, 0.015);
    this.sfxGain?.gain.setTargetAtTime(this.settings.soundEnabled ? this.settings.sfxVolume : 0, now, 0.015);
    const contextGain = this.musicContext === 'menu' ? 0.72 : this.musicContext === 'result' ? 0.62 : 1;
    this.musicGain?.gain.setTargetAtTime(this.settings.musicEnabled ? this.settings.musicVolume * contextGain : 0, now, 0.08);
  }

  public startMusic(context: MusicContext = this.musicContext): boolean {
    this.musicContext = context;
    if (this.settings.muted || !this.settings.musicEnabled) return false;
    const audioContext = this.ensureContext();
    const audio = this.ensureBgm();
    if (!audioContext || audioContext.state !== 'running' || !audio) return false;
    audio.playbackRate = context === 'daily' ? 1.045 : context === 'menu' ? 0.975 : context === 'result' ? 0.94 : 1;
    this.applyVolumes();
    void audio.play().catch(() => undefined);
    return true;
  }

  public setMusicContext(context: MusicContext): void {
    this.musicContext = context;
    if (this.bgm) this.bgm.playbackRate = context === 'daily' ? 1.045 : context === 'menu' ? 0.975 : context === 'result' ? 0.94 : 1;
    this.applyVolumes();
  }

  public duckMusic(duration = 0.22, amount = 0.42): void {
    const context = this.context;
    const gain = this.musicGain;
    if (!context || !gain || !this.settings.musicEnabled) return;
    const target = this.settings.musicVolume * (this.musicContext === 'menu' ? 0.72 : 1);
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(target * amount, context.currentTime, 0.012);
    gain.gain.setTargetAtTime(target, context.currentTime + duration, 0.08);
  }

  public playSfx(name: SfxName, combo = 0): boolean {
    if (this.settings.muted || !this.settings.soundEnabled) return false;
    const context = this.ensureContext();
    if (!context || context.state !== 'running' || !this.sfxGain) return false;
    const nowMs = performance.now();
    if (nowMs - (this.lastPlayed.get(name) ?? -1000) < 24) return false;
    this.lastPlayed.set(name, nowMs);
    const now = context.currentTime;
    const pitch = 1 + Math.min(12, Math.max(0, combo)) * 0.026 + (Math.random() - 0.5) * 0.018;

    switch (name) {
      case 'button':
        this.tone(430, 680, 0.07, 0.075, 'sine', now, 2200);
        this.tone(880, 1160, 0.045, 0.025, 'triangle', now + 0.018, 3600);
        break;
      case 'select':
        this.tone(560, 880, 0.085, 0.075, 'sine', now, 2800);
        this.tone(1120, 1380, 0.05, 0.022, 'triangle', now + 0.025, 4400);
        break;
      case 'swap':
        this.tone(300, 520, 0.1, 0.065, 'triangle', now, 1800);
        this.tone(420, 720, 0.1, 0.055, 'triangle', now + 0.055, 2400);
        this.noise(now, 0.09, 0.022, 1800, 'highpass');
        break;
      case 'invalid':
        this.tone(190, 125, 0.12, 0.07, 'square', now, 650);
        this.tone(165, 110, 0.11, 0.055, 'square', now + 0.085, 550);
        break;
      case 'match3':
        this.pop(now, pitch, 1);
        break;
      case 'match4':
        this.pop(now, pitch, 1.25);
        this.tone(900 * pitch, 1420 * pitch, 0.2, 0.06, 'triangle', now + 0.045, 5000);
        break;
      case 'bomb':
        this.duckMusic(0.32, 0.28);
        this.tone(105, 34, 0.42, 0.18, 'sine', now, 300);
        this.tone(190, 58, 0.3, 0.09, 'sawtooth', now, 720);
        this.noise(now, 0.34, 0.16, 1500, 'lowpass');
        this.noise(now + 0.018, 0.18, 0.055, 2300, 'highpass');
        break;
      case 'rocket':
        this.duckMusic(0.2, 0.48);
        this.tone(210, 1900, 0.33, 0.09, 'sawtooth', now, 2800);
        this.tone(430, 2600, 0.25, 0.045, 'triangle', now + 0.025, 5200);
        this.noise(now, 0.29, 0.07, 2600, 'highpass');
        break;
      case 'rainbow':
        this.duckMusic(0.42, 0.35);
        [620, 820, 1080, 1450, 1900].forEach((frequency, index) => this.tone(frequency, frequency * 1.12, 0.24, 0.048, 'sine', now + index * 0.055, 5200));
        this.noise(now + 0.06, 0.38, 0.035, 4200, 'highpass');
        break;
      case 'obstacle':
        this.tone(155, 72, 0.16, 0.105, 'triangle', now, 720);
        this.noise(now, 0.13, 0.095, 1250, 'bandpass');
        this.noise(now + 0.035, 0.09, 0.045, 3100, 'highpass');
        break;
      case 'combo':
        this.tone(660 * pitch, 990 * pitch, 0.16, 0.07, 'triangle', now, 4200);
        this.tone(990 * pitch, 1480 * pitch, 0.18, 0.038, 'sine', now + 0.055, 5600);
        break;
      case 'success':
        this.duckMusic(0.6, 0.35);
        [523, 659, 784, 1047].forEach((frequency, index) => this.tone(frequency, frequency * 1.03, 0.48, 0.055, 'sine', now + index * 0.09, 4200));
        break;
      case 'failure':
        [330, 277, 220].forEach((frequency, index) => this.tone(frequency, frequency * 0.78, 0.3, 0.055, 'triangle', now + index * 0.13, 1100));
        break;
      case 'star':
        this.tone(980, 1620, 0.18, 0.065, 'sine', now, 5600);
        this.tone(1480, 2250, 0.22, 0.04, 'triangle', now + 0.055, 6500);
        break;
    }
    return true;
  }

  private pop(start: number, pitch: number, strength: number): void {
    this.tone(145 * pitch, 58 * pitch, 0.13, 0.095 * strength, 'sine', start, 500);
    this.tone(480 * pitch, 920 * pitch, 0.15, 0.075 * strength, 'triangle', start + 0.008, 3200);
    this.tone(1080 * pitch, 1520 * pitch, 0.09, 0.027 * strength, 'sine', start + 0.035, 5200);
    this.noise(start, 0.085, 0.055 * strength, 2200, 'highpass');
  }

  private tone(
    frequency: number,
    endFrequency: number,
    duration: number,
    gainValue: number,
    wave: OscillatorType,
    start: number,
    filterFrequency: number,
  ): void {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.7;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gainValue, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(envelope).connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(start: number, duration: number, gainValue: number, frequency: number, type: BiquadFilterType): void {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) channel[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / frameCount, 1.6);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === 'bandpass' ? 1.8 : 0.8;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.sfxGain);
    source.start(start);
  }

  public stopMusic(): void {
    this.bgm?.pause();
  }

  public suspend(): void {
    this.bgm?.pause();
    void this.context?.suspend().catch(() => undefined);
  }

  public destroy(): void {
    this.stopMusic();
    if (this.bgm) {
      this.bgm.src = '';
      this.bgm.remove();
    }
    this.bgm = undefined;
    this.bgmSource = undefined;
    const context = this.context;
    this.context = undefined;
    this.masterGain = undefined;
    this.sfxGain = undefined;
    this.musicGain = undefined;
    void context?.close().catch(() => undefined);
  }
}

export const audioSystem = new AudioSystem();
