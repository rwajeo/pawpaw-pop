import { ACHIEVEMENTS } from '../data/achievements';
import type { AchievementDefinition, AchievementStats, SpecialTileType } from '../types';
import { SaveSystem, saveSystem } from './SaveSystem';

export type AchievementEvent =
  | { readonly type: 'stageComplete'; readonly combo: number; readonly completedStages?: number }
  | { readonly type: 'combo'; readonly value: number }
  | { readonly type: 'specialUsed'; readonly special: SpecialTileType; readonly amount?: number }
  | { readonly type: 'starsEarned'; readonly total: number };

type UnlockListener = (achievement: AchievementDefinition) => void;

export class AchievementSystem {
  private readonly listeners = new Set<UnlockListener>();

  constructor(private readonly save: SaveSystem = saveSystem) {}

  record(event: AchievementEvent): readonly AchievementDefinition[] {
    const current = this.save.getData().achievementStats;
    const next: AchievementStats = { ...current };
    if (event.type === 'stageComplete') {
      const completedInSave = Object.values(this.save.getData().progress.stages).filter((stage) => stage.completed).length;
      next.stagesCompleted = Math.min(20, Math.max(current.stagesCompleted, event.completedStages ?? completedInSave));
      next.bestCombo = Math.max(current.bestCombo, event.combo);
    } else if (event.type === 'combo') {
      next.bestCombo = Math.max(current.bestCombo, event.value);
    } else if (event.type === 'specialUsed') {
      const amount = Math.max(1, event.amount ?? 1);
      if (event.special === 'rowRocket' || event.special === 'columnRocket') next.rocketsUsed += amount;
      if (event.special === 'pawBomb') next.bombsUsed += amount;
      if (event.special === 'rainbowStar') next.rainbowsCreated += amount;
    } else if (event.type === 'starsEarned') {
      next.starsEarned = Math.max(current.starsEarned, event.total);
    }
    this.save.updateAchievementStats(next);
    return this.check();
  }

  check(): readonly AchievementDefinition[] {
    const data = this.save.getData();
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (achievement) => !data.achievements[achievement.id] && data.achievementStats[achievement.stat] >= achievement.target,
    );
    for (const achievement of newlyUnlocked) {
      this.save.unlockAchievement(achievement.id);
      this.listeners.forEach((listener) => listener(achievement));
    }
    return newlyUnlocked;
  }

  getProgress(achievement: AchievementDefinition): { current: number; target: number; complete: boolean } {
    const current = this.save.getData().achievementStats[achievement.stat];
    return { current: Math.min(current, achievement.target), target: achievement.target, complete: current >= achievement.target };
  }

  subscribe(listener: UnlockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const achievementSystem = new AchievementSystem();
