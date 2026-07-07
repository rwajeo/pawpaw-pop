export type CharacterId =
  | 'momo'
  | 'lulu'
  | 'bomi'
  | 'dudu'
  | 'piyo'
  | 'nunu'
  | 'tori'
  | 'kongi';

export type SpecialTileType = 'rowRocket' | 'columnRocket' | 'pawBomb' | 'rainbowStar';
export type ObstacleType = 'woodCrate' | 'jelly' | 'stone' | 'starShard';

export interface CharacterDefinition {
  readonly id: CharacterId;
  readonly name: string;
  readonly englishName: string;
  readonly animal: string;
  readonly bodyColor: number;
  readonly accentColor: number;
  readonly outlineColor: number;
  readonly pattern: 'dots' | 'stripes' | 'chevrons' | 'cross' | 'waves' | 'diamonds' | 'rings' | 'sprinkles';
  readonly boardSymbol: string;
  readonly silhouette: 'round' | 'long-ear' | 'bird' | 'bear' | 'dog' | 'fluffy' | 'fox' | 'puppy';
  readonly expression: 'cheery' | 'brave' | 'gentle' | 'sleepy' | 'curious' | 'dreamy' | 'mischievous' | 'loyal';
}

export type StageGoal =
  | { readonly type: 'score'; readonly target: number }
  | { readonly type: 'collect'; readonly characterId: CharacterId; readonly target: number }
  | { readonly type: 'obstacle'; readonly obstacle: Exclude<ObstacleType, 'starShard'>; readonly target: number }
  | { readonly type: 'starDrop'; readonly target: number }
  | { readonly type: 'special'; readonly special?: SpecialTileType; readonly target: number };

export interface StageObstacle {
  readonly type: ObstacleType;
  readonly count: number;
  readonly strength?: 1 | 2;
}

export interface StageDefinition {
  readonly id: number;
  readonly title: string;
  readonly seed: string;
  readonly moves?: number;
  readonly timeLimit?: number;
  readonly goals: readonly StageGoal[];
  readonly obstacles: readonly StageObstacle[];
  readonly starThresholds: readonly [number, number, number];
  readonly hint: string;
  readonly characterPool?: readonly CharacterId[];
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard';

export type AchievementId =
  | 'first_stage'
  | 'combo_5'
  | 'combo_10'
  | 'rockets_20'
  | 'bombs_10'
  | 'first_rainbow'
  | 'stars_30'
  | 'all_stages';

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly target: number;
  readonly stat: keyof AchievementStats;
}

export interface AchievementStats {
  stagesCompleted: number;
  bestCombo: number;
  rocketsUsed: number;
  bombsUsed: number;
  rainbowsCreated: number;
  starsEarned: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  screenShake: boolean;
  reducedParticles: boolean;
  reducedMotion: boolean;
}

export interface StageProgress {
  completed: boolean;
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  bestCombo: number;
}

export interface PlayerProgress {
  unlockedStage: number;
  stages: Record<string, StageProgress>;
  tutorialComplete: boolean;
  totalStars: number;
  totalScore: number;
}

export interface Inventory {
  shuffle: number;
  hammer: number;
  paw: number;
}

export interface DailyChallengeProgress {
  date: string;
  seed: string;
  bestScore: number;
  attempts: number;
  completed: boolean;
}

export interface SaveData {
  version: 1;
  settings: GameSettings;
  progress: PlayerProgress;
  items: Inventory;
  daily: DailyChallengeProgress;
  achievements: Partial<Record<AchievementId, true>>;
  achievementStats: AchievementStats;
}

export interface StageResult {
  stageId: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
  bestCombo: number;
}
