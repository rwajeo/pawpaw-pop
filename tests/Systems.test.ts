import { afterEach, describe, expect, it } from 'vitest';
import { createDifficultyChallenge, DIFFICULTY_OPTIONS } from '../src/game/data/difficulties';
import { getDailyChallenge } from '../src/game/data/stages';
import { SaveSystem } from '../src/game/systems/SaveSystem';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); });

describe('systems and data', () => {
  it('offers four difficulty modes instead of a stage ladder', () => {
    expect(DIFFICULTY_OPTIONS.map((option) => option.label)).toEqual(['EASY', 'MEDIUM', 'HARD', 'VERY HARD']);
  });

  it('creates a different puzzle seed for every run while keeping explicit runs reproducible', () => {
    const first = createDifficultyChallenge('medium');
    const second = createDifficultyChallenge('medium');
    expect(first.seed).not.toBe(second.seed);
    expect(createDifficultyChallenge('hard', 'replayable')).toEqual(createDifficultyChallenge('hard', 'replayable'));
  });

  it('scales character variety and mechanics by difficulty', () => {
    const easy = createDifficultyChallenge('easy', 'easy-check');
    const veryHard = createDifficultyChallenge('veryHard', 'hard-check');
    expect(easy.characterPool).toHaveLength(4);
    expect(veryHard.characterPool).toHaveLength(7);
    expect(veryHard.moves).toBeLessThan(easy.moves ?? 0);
    expect(veryHard.obstacles.length).toBeGreaterThan(0);
  });

  it('creates the same daily challenge for the same date', () => {
    expect(getDailyChallenge('2026-07-07')).toEqual(getDailyChallenge('2026-07-07'));
    expect(getDailyChallenge('2026-07-07').seed).not.toBe(getDailyChallenge('2026-07-08').seed);
  });

  it('recovers safely from corrupt save data', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-save', '{broken-json');
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    const save = new SaveSystem('test-save');
    expect(save.getData().progress.unlockedStage).toBe(1);
    expect(save.getData().items.shuffle).toBeGreaterThan(0);
  });

  it('scores matches once per event and caps duplicate awards', () => {
    const score = new ScoreSystem();
    expect(score.addMatch(3, 1, 1, 'match-a').points).toBe(300);
    expect(score.addMatch(3, 1, 1, 'match-a').points).toBe(0);
    expect(score.addMatch(5, 2, 1.5, 'match-b').points).toBeGreaterThan(1000);
  });
});
