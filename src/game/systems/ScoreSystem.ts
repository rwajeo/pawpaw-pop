export interface ScoreBreakdown {
  readonly match: number;
  readonly special: number;
  readonly obstacle: number;
  readonly moveBonus: number;
  readonly total: number;
}

export interface ScoreAward {
  readonly points: number;
  readonly total: number;
}

const MATCH_POINTS: Readonly<Record<number, number>> = { 3: 300, 4: 650, 5: 1100 };

export class ScoreSystem {
  private matchPoints = 0;
  private specialPoints = 0;
  private obstaclePoints = 0;
  private moveBonusPoints = 0;
  private readonly scoredEvents = new Set<string>();

  reset(): void {
    this.matchPoints = 0;
    this.specialPoints = 0;
    this.obstaclePoints = 0;
    this.moveBonusPoints = 0;
    this.scoredEvents.clear();
  }

  private award(category: 'match' | 'special' | 'obstacle' | 'moveBonus', rawPoints: number, eventId?: string): ScoreAward {
    if (eventId && this.scoredEvents.has(eventId)) return { points: 0, total: this.total };
    if (eventId) this.scoredEvents.add(eventId);
    const points = Math.max(0, Math.round(rawPoints));
    if (category === 'match') this.matchPoints += points;
    if (category === 'special') this.specialPoints += points;
    if (category === 'obstacle') this.obstaclePoints += points;
    if (category === 'moveBonus') this.moveBonusPoints += points;
    return { points, total: this.total };
  }

  addMatch(matchSize: number, cascadeLevel = 1, comboMultiplier = 1, eventId?: string): ScoreAward {
    const size = Math.max(3, Math.floor(matchSize));
    const base = MATCH_POINTS[Math.min(size, 5)] ?? (1100 + (size - 5) * 300);
    const cascadeMultiplier = 1 + Math.max(0, cascadeLevel - 1) * 0.25;
    return this.award('match', base * cascadeMultiplier * Math.max(1, comboMultiplier), eventId);
  }

  addSpecial(clearedTiles: number, comboMultiplier = 1, eventId?: string): ScoreAward {
    return this.award('special', (350 + Math.max(0, clearedTiles) * 85) * Math.max(1, comboMultiplier), eventId);
  }

  addObstacle(strength = 1, count = 1, eventId?: string): ScoreAward {
    return this.award('obstacle', Math.max(1, strength) * Math.max(0, count) * 180, eventId);
  }

  addMoveBonus(remainingMoves: number, eventId?: string): ScoreAward {
    return this.award('moveBonus', Math.max(0, Math.floor(remainingMoves)) * 500, eventId);
  }

  get total(): number {
    return this.matchPoints + this.specialPoints + this.obstaclePoints + this.moveBonusPoints;
  }

  get breakdown(): ScoreBreakdown {
    return {
      match: this.matchPoints,
      special: this.specialPoints,
      obstacle: this.obstaclePoints,
      moveBonus: this.moveBonusPoints,
      total: this.total,
    };
  }
}
