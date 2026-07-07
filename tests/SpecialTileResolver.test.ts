import { describe, expect, it } from 'vitest';
import {
  createSpecials,
  detectMatches,
  resolveSpecialEffects,
  resolveSpecialSwap,
  specialForMatch,
} from '../src/game/board';
import { boardFromKinds, withSpecial } from './helpers';

describe('SpecialTileResolver', () => {
  it('maps four, five, and shaped matches to the correct specials', () => {
    const four = detectMatches(boardFromKinds([[1, 1, 1, 1], [0, 2, 0, 2], [2, 0, 2, 0]])).groups[0];
    const five = detectMatches(boardFromKinds([[2, 2, 2, 2, 2], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1]])).groups[0];
    const shaped = detectMatches(boardFromKinds([[3, 0, 1], [3, 1, 0], [3, 3, 3]])).groups[0];
    expect(four && specialForMatch(four)).toBe('row');
    expect(five && specialForMatch(five)).toBe('rainbow');
    expect(shaped && specialForMatch(shaped)).toBe('bomb');
  });

  it('places a created special at the swapped tile when possible', () => {
    const board = boardFromKinds([[1, 1, 1, 1], [0, 2, 0, 2], [2, 0, 2, 0]]);
    const matches = detectMatches(board);
    const result = createSpecials(board, matches.groups, [{ row: 0, col: 0 }]);
    expect(result.created[0]).toMatchObject({ position: { row: 0, col: 0 }, special: 'row' });
    expect(result.board[0]?.[0]?.special).toBe('row');
  });

  it('fires chained special tiles only once', () => {
    let board = boardFromKinds([
      [0, 1, 2, 3, 4],
      [1, 2, 3, 4, 0],
      [2, 3, 4, 0, 1],
      [3, 4, 0, 1, 2],
      [4, 0, 1, 2, 3],
    ]);
    board = withSpecial(board, 2, 0, 'row');
    board = withSpecial(board, 2, 2, 'column');
    const result = resolveSpecialEffects(board, [{ row: 2, col: 0 }]);
    expect(result.removed).toHaveLength(9);
  });

  it('resolves rocket+rocket, bomb+bomb, and rainbow+normal combinations', () => {
    const base = boardFromKinds(Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 8 }, (_, col) => (row * 3 + col) % 6),
    ));
    const rockets = withSpecial(withSpecial(base.map((row) => row.slice()), 3, 3, 'row'), 3, 4, 'column');
    expect(resolveSpecialSwap(rockets, { row: 3, col: 3 }, { row: 3, col: 4 }).removed.length).toBeGreaterThan(20);

    const bombs = withSpecial(withSpecial(base.map((row) => row.slice()), 3, 3, 'bomb'), 3, 4, 'bomb');
    expect(resolveSpecialSwap(bombs, { row: 3, col: 3 }, { row: 3, col: 4 }).removed).toHaveLength(49);

    const rainbow = withSpecial(base.map((row) => row.slice()), 0, 0, 'rainbow');
    const targetKind = rainbow[0]?.[1]?.kind;
    const expected = rainbow.flat().filter((tile) => tile?.kind === targetKind).length + 1;
    expect(resolveSpecialSwap(rainbow, { row: 0, col: 0 }, { row: 0, col: 1 }).removed).toHaveLength(expected);
  });

  it('resolves rocket+bomb and every rainbow special combination', () => {
    const base = boardFromKinds(Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 8 }, (_, col) => (row * 3 + col) % 6),
    ));
    const rocketBomb = withSpecial(withSpecial(base.map((row) => row.slice()), 3, 3, 'row'), 3, 4, 'bomb');
    expect(resolveSpecialSwap(rocketBomb, { row: 3, col: 3 }, { row: 3, col: 4 }).removed.length).toBeGreaterThan(35);

    const rainbowRocket = withSpecial(withSpecial(base.map((row) => row.slice()), 0, 0, 'rainbow'), 0, 1, 'row');
    expect(resolveSpecialSwap(rainbowRocket, { row: 0, col: 0 }, { row: 0, col: 1 }).removed.length).toBeGreaterThan(40);

    const rainbowBomb = withSpecial(withSpecial(base.map((row) => row.slice()), 0, 0, 'rainbow'), 0, 1, 'bomb');
    expect(resolveSpecialSwap(rainbowBomb, { row: 0, col: 0 }, { row: 0, col: 1 }).removed.length).toBeGreaterThan(40);

    const doubleRainbow = withSpecial(withSpecial(base.map((row) => row.slice()), 0, 0, 'rainbow'), 0, 1, 'rainbow');
    expect(resolveSpecialSwap(doubleRainbow, { row: 0, col: 0 }, { row: 0, col: 1 }).removed).toHaveLength(64);
  });
});
