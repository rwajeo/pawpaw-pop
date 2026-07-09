import type {
  AchievementId,
  AchievementStats,
  DailyChallengeProgress,
  GameSettings,
  Inventory,
  SaveData,
  StageProgress,
  StageResult,
} from '../types';

const SAVE_KEY = 'pawpaw-pop-save-v1';
const MAX_STAGE = 20;

interface SaveEnvelope {
  version: 1;
  savedAt: number;
  checksum: string;
  data: SaveData;
}

type SaveListener = (data: Readonly<SaveData>) => void;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finiteNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const boundedInt = (value: unknown, fallback: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.floor(finiteNumber(value, fallback))));
const boundedVolume = (value: unknown, fallback: number): number => Math.min(1, Math.max(0, finiteNumber(value, fallback)));
const bool = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dailySeedForDate = (dateKey: string): string => `pawpaw-daily-${dateKey}`;

export const createDefaultSaveData = (dateKey = getLocalDateKey()): SaveData => ({
  version: 1,
  settings: {
    masterVolume: 0.8,
    sfxVolume: 0.85,
    musicVolume: 0.45,
    muted: false,
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    screenShake: true,
    reducedParticles: false,
    reducedMotion: false,
  },
  progress: {
    unlockedStage: 1,
    stages: {},
    tutorialComplete: false,
    totalStars: 0,
    totalScore: 0,
    endlessBestScore: 0,
    endlessBestCombo: 0,
    endlessLongestSeconds: 0,
  },
  items: { shuffle: 1, hammer: 1, paw: 0 },
  daily: { date: dateKey, seed: dailySeedForDate(dateKey), bestScore: 0, attempts: 0, completed: false },
  achievements: {},
  achievementStats: {
    stagesCompleted: 0,
    bestCombo: 0,
    rocketsUsed: 0,
    bombsUsed: 0,
    rainbowsCreated: 0,
    starsEarned: 0,
  },
});

const hash = (text: string): string => {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, '0');
};

const normalizeSettings = (value: unknown, defaults: GameSettings): GameSettings => {
  const source = isRecord(value) ? value : {};
  return {
    masterVolume: boundedVolume(source.masterVolume, defaults.masterVolume),
    sfxVolume: boundedVolume(source.sfxVolume, defaults.sfxVolume),
    musicVolume: boundedVolume(source.musicVolume, defaults.musicVolume),
    muted: bool(source.muted, defaults.muted),
    soundEnabled: bool(source.soundEnabled, defaults.soundEnabled),
    musicEnabled: bool(source.musicEnabled, defaults.musicEnabled),
    hapticsEnabled: bool(source.hapticsEnabled, defaults.hapticsEnabled),
    screenShake: bool(source.screenShake, defaults.screenShake),
    reducedParticles: bool(source.reducedParticles, defaults.reducedParticles),
    reducedMotion: bool(source.reducedMotion, defaults.reducedMotion),
  };
};

const normalizeInventory = (value: unknown, defaults: Inventory): Inventory => {
  const source = isRecord(value) ? value : {};
  return {
    shuffle: boundedInt(source.shuffle, defaults.shuffle, 0, 999),
    hammer: boundedInt(source.hammer, defaults.hammer, 0, 999),
    paw: boundedInt(source.paw, defaults.paw, 0, 999),
  };
};

const normalizeStats = (value: unknown): AchievementStats => {
  const source = isRecord(value) ? value : {};
  return {
    stagesCompleted: boundedInt(source.stagesCompleted, 0, 0, MAX_STAGE),
    bestCombo: boundedInt(source.bestCombo, 0, 0, 999),
    rocketsUsed: boundedInt(source.rocketsUsed, 0, 0, 999_999),
    bombsUsed: boundedInt(source.bombsUsed, 0, 0, 999_999),
    rainbowsCreated: boundedInt(source.rainbowsCreated, 0, 0, 999_999),
    starsEarned: boundedInt(source.starsEarned, 0, 0, MAX_STAGE * 3),
  };
};

const normalizeStageProgress = (value: unknown): StageProgress | undefined => {
  if (!isRecord(value)) return undefined;
  const stars = boundedInt(value.stars, 0, 0, 3) as 0 | 1 | 2 | 3;
  return {
    completed: bool(value.completed, stars > 0),
    bestScore: boundedInt(value.bestScore, 0, 0, Number.MAX_SAFE_INTEGER),
    stars,
    bestCombo: boundedInt(value.bestCombo, 0, 0, 999),
  };
};

const normalizeSaveData = (value: unknown): SaveData => {
  const defaults = createDefaultSaveData();
  const source = isRecord(value) ? value : {};
  const progressSource = isRecord(source.progress) ? source.progress : {};
  const stagesSource = isRecord(progressSource.stages) ? progressSource.stages : {};
  const stages: Record<string, StageProgress> = {};
  for (const [key, stageValue] of Object.entries(stagesSource)) {
    const stageId = Number(key);
    const stage = normalizeStageProgress(stageValue);
    if (stage && Number.isInteger(stageId) && stageId >= 1 && stageId <= MAX_STAGE) stages[String(stageId)] = stage;
  }

  const achievements: SaveData['achievements'] = {};
  const achievementSource = isRecord(source.achievements) ? source.achievements : {};
  const validAchievementIds: readonly AchievementId[] = ['first_stage', 'combo_5', 'combo_10', 'rockets_20', 'bombs_10', 'first_rainbow', 'stars_30', 'all_stages'];
  for (const id of validAchievementIds) {
    if (achievementSource[id] === true) achievements[id] = true;
  }

  const dailySource = isRecord(source.daily) ? source.daily : {};
  const today = getLocalDateKey();
  const savedDate = typeof dailySource.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dailySource.date) ? dailySource.date : today;
  const isToday = savedDate === today;
  const daily: DailyChallengeProgress = isToday ? {
    date: today,
    seed: dailySeedForDate(today),
    bestScore: boundedInt(dailySource.bestScore, 0, 0, Number.MAX_SAFE_INTEGER),
    attempts: boundedInt(dailySource.attempts, 0, 0, 999),
    completed: bool(dailySource.completed, false),
  } : defaults.daily;

  const totalStars = Object.values(stages).reduce((sum, stage) => sum + stage.stars, 0);
  const totalScore = Object.values(stages).reduce((sum, stage) => sum + stage.bestScore, 0);
  return {
    version: 1,
    settings: normalizeSettings(source.settings, defaults.settings),
    progress: {
      unlockedStage: boundedInt(progressSource.unlockedStage, 1, 1, MAX_STAGE),
      stages,
      tutorialComplete: bool(progressSource.tutorialComplete, false),
      totalStars,
      totalScore,
      endlessBestScore: boundedInt(progressSource.endlessBestScore, 0, 0, Number.MAX_SAFE_INTEGER),
      endlessBestCombo: boundedInt(progressSource.endlessBestCombo, 0, 0, 999),
      endlessLongestSeconds: boundedInt(progressSource.endlessLongestSeconds, 0, 0, Number.MAX_SAFE_INTEGER),
    },
    items: normalizeInventory(source.items, defaults.items),
    daily,
    achievements,
    achievementStats: normalizeStats(source.achievementStats),
  };
};

const cloneData = (data: SaveData): SaveData => JSON.parse(JSON.stringify(data)) as SaveData;

export class SaveSystem {
  private data: SaveData;
  private readonly listeners = new Set<SaveListener>();

  constructor(private readonly key = SAVE_KEY) {
    this.data = createDefaultSaveData();
    this.data = this.read();
  }

  private getStorage(): Storage | undefined {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
      return undefined;
    }
  }

  private read(): SaveData {
    const storage = this.getStorage();
    if (!storage) return createDefaultSaveData();
    let raw: string | null = null;
    try {
      raw = storage.getItem(this.key);
      if (!raw) return createDefaultSaveData();
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) throw new Error('Save root is not an object');

      if ('data' in parsed && 'checksum' in parsed) {
        const payload = parsed.data;
        if (typeof parsed.checksum !== 'string' || hash(JSON.stringify(payload)) !== parsed.checksum) throw new Error('Save checksum mismatch');
        return normalizeSaveData(payload);
      }
      return normalizeSaveData(parsed);
    } catch {
      if (raw) {
        try {
          storage.setItem(`${this.key}-corrupt-${Date.now()}`, raw);
        } catch {
          // Recovery must remain safe even when storage is full or unavailable.
        }
      }
      const recovered = createDefaultSaveData();
      this.write(recovered);
      return recovered;
    }
  }

  private write(data: SaveData): boolean {
    const storage = this.getStorage();
    if (!storage) return false;
    try {
      const payload = cloneData(data);
      const envelope: SaveEnvelope = { version: 1, savedAt: Date.now(), checksum: hash(JSON.stringify(payload)), data: payload };
      storage.setItem(this.key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  private commit(next: SaveData): boolean {
    this.data = normalizeSaveData(next);
    const saved = this.write(this.data);
    const snapshot = this.getData();
    this.listeners.forEach((listener) => listener(snapshot));
    return saved;
  }

  getData(): Readonly<SaveData> {
    return cloneData(this.data);
  }

  reload(): Readonly<SaveData> {
    this.data = this.read();
    return this.getData();
  }

  updateSettings(changes: Partial<GameSettings>): boolean {
    return this.commit({ ...this.data, settings: { ...this.data.settings, ...changes } });
  }

  setTutorialComplete(complete = true): boolean {
    return this.commit({ ...this.data, progress: { ...this.data.progress, tutorialComplete: complete } });
  }

  recordStageResult(result: StageResult): boolean {
    if (!Number.isInteger(result.stageId) || result.stageId < 1 || result.stageId > MAX_STAGE) return false;
    const key = String(result.stageId);
    const previous = this.data.progress.stages[key] ?? { completed: false, bestScore: 0, stars: 0, bestCombo: 0 };
    const stages = {
      ...this.data.progress.stages,
      [key]: {
        completed: result.stars > 0 || previous.completed,
        bestScore: Math.max(previous.bestScore, Math.floor(result.score)),
        stars: Math.max(previous.stars, result.stars) as 0 | 1 | 2 | 3,
        bestCombo: Math.max(previous.bestCombo, Math.floor(result.bestCombo)),
      },
    };
    const completedCount = Object.values(stages).filter((stage) => stage.completed).length;
    const stats = {
      ...this.data.achievementStats,
      stagesCompleted: completedCount,
      bestCombo: Math.max(this.data.achievementStats.bestCombo, result.bestCombo),
      starsEarned: Object.values(stages).reduce((sum, stage) => sum + stage.stars, 0),
    };
    return this.commit({
      ...this.data,
      progress: {
        ...this.data.progress,
        stages,
        unlockedStage: Math.min(MAX_STAGE, Math.max(this.data.progress.unlockedStage, result.stageId + (result.stars > 0 ? 1 : 0))),
      },
      achievementStats: stats,
    });
  }

  recordEndlessResult(score: number, bestCombo: number, seconds: number): boolean {
    return this.commit({
      ...this.data,
      progress: {
        ...this.data.progress,
        endlessBestScore: Math.max(this.data.progress.endlessBestScore, Math.floor(score)),
        endlessBestCombo: Math.max(this.data.progress.endlessBestCombo, Math.floor(bestCombo)),
        endlessLongestSeconds: Math.max(this.data.progress.endlessLongestSeconds, Math.floor(seconds)),
      },
      achievementStats: {
        ...this.data.achievementStats,
        bestCombo: Math.max(this.data.achievementStats.bestCombo, Math.floor(bestCombo)),
      },
    });
  }

  updateDaily(score: number, completed: boolean): boolean {
    const date = getLocalDateKey();
    const current = this.data.daily.date === date ? this.data.daily : createDefaultSaveData(date).daily;
    return this.commit({
      ...this.data,
      daily: { ...current, attempts: current.attempts + 1, bestScore: Math.max(current.bestScore, Math.floor(score)), completed: current.completed || completed },
    });
  }

  changeItem(item: keyof Inventory, amount: number): boolean {
    const next = this.data.items[item] + Math.trunc(amount);
    if (next < 0) return false;
    return this.commit({ ...this.data, items: { ...this.data.items, [item]: Math.min(999, next) } });
  }

  unlockAchievement(id: AchievementId): boolean {
    if (this.data.achievements[id]) return false;
    return this.commit({ ...this.data, achievements: { ...this.data.achievements, [id]: true } });
  }

  updateAchievementStats(changes: Partial<AchievementStats>): boolean {
    return this.commit({ ...this.data, achievementStats: { ...this.data.achievementStats, ...changes } });
  }

  subscribe(listener: SaveListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): boolean {
    return this.commit(createDefaultSaveData());
  }
}

export const saveSystem = new SaveSystem();
