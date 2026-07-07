import { describe, expect, it } from 'vitest';
import { detectMatches } from '../src/game/board';
import { boardFromKinds } from './helpers';

describe('MatchDetector', () => {
  it('detects horizontal and vertical three matches', () => {
    const horizontal = detectMatches(boardFromKinds([[1, 1, 1], [0, 2, 0], [2, 0, 2]]));
    const vertical = detectMatches(boardFromKinds([[1, 0, 2], [1, 2, 0], [1, 0, 2]]));
    expect(horizontal.groups).toHaveLength(1);
    expect(horizontal.groups[0]?.shape).toBe('three');
    expect(horizontal.groups[0]?.runs[0]?.orientation).toBe('horizontal');
    expect(vertical.groups[0]?.runs[0]?.orientation).toBe('vertical');
  });

  it('distinguishes four and five matches', () => {
    const four = detectMatches(boardFromKinds([[2, 2, 2, 2], [0, 1, 0, 1], [1, 0, 1, 0]]));
    const five = detectMatches(boardFromKinds([[3, 3, 3, 3, 3], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1]]));
    expect(four.groups[0]?.shape).toBe('four');
    expect(five.groups[0]?.shape).toBe('five');
  });

  it('classifies L, T, and cross matches by their intersection', () => {
    const l = detectMatches(boardFromKinds([
      [4, 0, 1],
      [4, 1, 0],
      [4, 4, 4],
    ]));
    const t = detectMatches(boardFromKinds([
      [5, 5, 5],
      [0, 5, 1],
      [1, 5, 0],
    ]));
    const cross = detectMatches(boardFromKinds([
      [0, 6, 1],
      [6, 6, 6],
      [1, 6, 0],
    ]));
    expect(l.groups[0]?.shape).toBe('L');
    expect(l.groups[0]?.cells).toHaveLength(5);
    expect(t.groups[0]?.shape).toBe('T');
    expect(cross.groups[0]?.shape).toBe('cross');
  });

  it('reports independent simultaneous matches', () => {
    const result = detectMatches(boardFromKinds([
      [1, 1, 1, 0],
      [0, 2, 0, 3],
      [2, 2, 2, 0],
      [0, 3, 0, 3],
    ]));
    expect(result.groups).toHaveLength(2);
    expect(result.hasMultiple).toBe(true);
    expect(result.cells).toHaveLength(6);
  });
});
