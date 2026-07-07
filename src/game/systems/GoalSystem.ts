import type { CharacterId, ObstacleType, SpecialTileType, StageDefinition, StageGoal } from '../types';

export type GoalEvent =
  | { readonly type: 'score'; readonly value: number; readonly absolute?: boolean }
  | { readonly type: 'collect'; readonly characterId: CharacterId; readonly amount?: number }
  | { readonly type: 'obstacle'; readonly obstacle: Exclude<ObstacleType, 'starShard'>; readonly amount?: number }
  | { readonly type: 'starDrop'; readonly amount?: number }
  | { readonly type: 'special'; readonly special: SpecialTileType; readonly amount?: number };

export interface GoalProgress {
  readonly goal: StageGoal;
  readonly current: number;
  readonly target: number;
  readonly remaining: number;
  readonly complete: boolean;
}

const goalKey = (goal: StageGoal): string => {
  if (goal.type === 'collect') return `collect:${goal.characterId}`;
  if (goal.type === 'obstacle') return `obstacle:${goal.obstacle}`;
  if (goal.type === 'special') return `special:${goal.special ?? 'any'}`;
  return goal.type;
};

export class GoalSystem {
  private readonly goals: readonly StageGoal[];
  private readonly values = new Map<string, number>();

  constructor(stageOrGoals: StageDefinition | readonly StageGoal[]) {
    this.goals = 'goals' in stageOrGoals ? stageOrGoals.goals : stageOrGoals;
    this.goals.forEach((goal) => this.values.set(goalKey(goal), 0));
  }

  apply(event: GoalEvent): readonly GoalProgress[] {
    for (const goal of this.goals) {
      const key = goalKey(goal);
      let applies = false;
      let amount = 0;
      if (goal.type === 'score' && event.type === 'score') {
        applies = true;
        amount = event.absolute ? event.value - (this.values.get(key) ?? 0) : event.value;
      } else if (goal.type === 'collect' && event.type === 'collect' && goal.characterId === event.characterId) {
        applies = true;
        amount = event.amount ?? 1;
      } else if (goal.type === 'obstacle' && event.type === 'obstacle' && goal.obstacle === event.obstacle) {
        applies = true;
        amount = event.amount ?? 1;
      } else if (goal.type === 'starDrop' && event.type === 'starDrop') {
        applies = true;
        amount = event.amount ?? 1;
      } else if (goal.type === 'special' && event.type === 'special' && (!goal.special || goal.special === event.special)) {
        applies = true;
        amount = event.amount ?? 1;
      }
      if (applies) this.values.set(key, Math.min(goal.target, Math.max(0, (this.values.get(key) ?? 0) + amount)));
    }
    return this.progress;
  }

  reset(): void {
    this.goals.forEach((goal) => this.values.set(goalKey(goal), 0));
  }

  get progress(): readonly GoalProgress[] {
    return this.goals.map((goal) => {
      const current = Math.min(goal.target, this.values.get(goalKey(goal)) ?? 0);
      return { goal, current, target: goal.target, remaining: Math.max(0, goal.target - current), complete: current >= goal.target };
    });
  }

  get isComplete(): boolean {
    return this.progress.every((item) => item.complete);
  }
}
