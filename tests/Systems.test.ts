import { afterEach, describe, expect, it } from 'vitest';
import { createDifficultyChallenge, createEndlessChallenge, DIFFICULTY_OPTIONS } from '../src/game/data/difficulties';
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
    expect(veryHard.timeLimit).toBeLessThan(easy.timeLimit ?? 0);
    expect(easy.moves).toBeUndefined();
    expect(veryHard.moves).toBeUndefined();
    expect(veryHard.obstacles.length).toBeGreaterThan(0);
  });

  it('creates reproducible endless survival runs', () => {
    const run = createEndlessChallenge('endless-check');
    expect(run).toEqual(createEndlessChallenge('endless-check'));
    expect(run.endless).toBe(true);
    expect(run.timeLimit).toBe(60);
    expect(run.characterPool).toHaveLength(6);
  });

  it('recovers safely from corrupt save data', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-save', '{broken-json');
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    const save = new SaveSystem('test-save');
    expect(save.getData().progress.unlockedStage).toBe(1);
    expect(save.getData().items.shuffle).toBeGreaterThan(0);
  });

  it('keeps endless records separate and only replaces them with better results', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    const save = new SaveSystem('endless-save');
    save.recordEndlessResult(12000, 4, 95);
    save.recordEndlessResult(9000, 3, 70);
    expect(save.getData().progress.endlessBestScore).toBe(12000);
    expect(save.getData().progress.endlessBestCombo).toBe(4);
    expect(save.getData().progress.endlessLongestSeconds).toBe(95);
    expect(save.getData().progress.stages).toEqual({});
  });

  it('scores matches once per event and caps duplicate awards', () => {
    const score = new ScoreSystem();
    expect(score.addMatch(3, 1, 1, 'match-a').points).toBe(300);
    expect(score.addMatch(3, 1, 1, 'match-a').points).toBe(0);
    expect(score.addMatch(5, 2, 1.5, 'match-b').points).toBeGreaterThan(1000);
  });
});
