import { describe, expect, it } from 'vitest';
import { findMoves, isProductiveSwap } from '../src/game/board';
import { boardFromKinds, withSpecial } from './helpers';

describe('MoveFinder', () => {
  it('finds a swap that creates a match', () => {
    const board = boardFromKinds([
      [0, 1, 0],
      [2, 0, 2],
      [1, 2, 1],
    ]);
    expect(isProductiveSwap(board, { row: 0, col: 1 }, { row: 1, col: 1 })).toBe(true);
    expect(findMoves(board)).toContainEqual({
      from: { row: 0, col: 1 },
      to: { row: 1, col: 1 },
    });
  });

  it('rejects swaps that do not create a match', () => {
    const board = boardFromKinds([
      [0, 1, 2],
      [2, 0, 1],
      [1, 2, 0],
    ]);
    expect(isProductiveSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('allows activating a special tile by swapping it', () => {
    const board = withSpecial(boardFromKinds([
      [0, 1, 2],
      [2, 0, 1],
      [1, 2, 0],
    ]), 0, 0, 'row');
    expect(isProductiveSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isProductiveSwap(board, { row: 0, col: 0 }, { row: 2, col: 0 })).toBe(false);
  });
});
