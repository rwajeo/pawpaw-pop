import { describe, expect, it } from 'vitest';
import { BoardModel, MatchDetector, calculateMatchScore } from '../src/game/board';
import { boardFromKinds, kindsOf } from './helpers';

describe('BoardModel', () => {
  it('restores an invalid swap exactly', () => {
    const board = boardFromKinds([
      [0, 1, 2],
      [2, 0, 1],
      [1, 2, 0],
    ]);
    const model = new BoardModel({ board, seed: 1, kinds: [0, 1, 2] });
    const result = model.swap({ row: 0, col: 0 }, { row: 0, col: 1 });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('no-match');
    expect(kindsOf(result.board)).toEqual(kindsOf(board));
  });

  it('never leaves holes after repeated invalid swaps', () => {
    const board = boardFromKinds([
      [0, 1, 2],
      [2, 0, 1],
      [1, 2, 0],
    ]);
    const model = new BoardModel({ board, seed: 7, kinds: [0, 1, 2] });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = model.swap({ row: 0, col: 0 }, { row: 0, col: 1 });
      expect(result.accepted).toBe(false);
      expect(result.board.flat().every((cell) => cell !== null)).toBe(true);
      expect(kindsOf(result.board)).toEqual(kindsOf(board));
    }
  });

  it('rejects non-adjacent and out-of-bounds swaps', () => {
    const model = new BoardModel({ seed: 2 });
    expect(model.swap({ row: 0, col: 0 }, { row: 2, col: 0 }).reason).toBe('not-adjacent');
    expect(model.swap({ row: -1, col: 0 }, { row: 0, col: 0 }).reason).toBe('out-of-bounds');
  });

  it('resolves a match, refills, and leaves a stable playable board', () => {
    const board = boardFromKinds([
      [0, 1, 0, 2],
      [2, 0, 2, 1],
      [1, 2, 1, 0],
      [2, 1, 0, 2],
    ]);
    const model = new BoardModel({ board, seed: 99, kinds: [0, 1, 2, 3] });
    const result = model.swap({ row: 0, col: 1 }, { row: 1, col: 1 });
    expect(result.accepted).toBe(true);
    expect(result.cascades.length).toBeGreaterThanOrEqual(1);
    expect(result.cascades[0]?.removed).toHaveLength(3);
    expect(result.score).toBeGreaterThanOrEqual(300);
    result.cascades.forEach((step, index) => {
      expect(step.source.flat().every((cell) => cell !== null)).toBe(true);
      expect(step.board.flat().every((cell) => cell !== null)).toBe(true);
      if (index > 0) expect(step.source).toEqual(result.cascades[index - 1]?.board);
    });
    expect(MatchDetector.hasMatches(result.board)).toBe(false);
    expect(model.availableMoves().length).toBeGreaterThan(0);
  });

  it('applies a bounded cascade multiplier to score', () => {
    const matches = MatchDetector.detect(boardFromKinds([[1, 1, 1], [0, 2, 0], [2, 0, 2]]));
    expect(calculateMatchScore(matches, 1)).toBe(300);
    expect(calculateMatchScore(matches, 2)).toBe(375);
    expect(calculateMatchScore(matches, 20)).toBe(900);
  });
});
