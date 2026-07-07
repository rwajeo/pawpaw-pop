import { describe, expect, it } from 'vitest';
import { BoardGenerator, MatchDetector, MoveFinder, SeededRandom } from '../src/game/board';
import { kindsOf } from './helpers';

describe('SeededRandom and BoardGenerator', () => {
  it('produces a repeatable random sequence', () => {
    const first = new SeededRandom('daily-2026-07-07');
    const second = new SeededRandom('daily-2026-07-07');
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(Array.from({ length: 20 }, () => second.next()));
  });

  it('creates identical boards for identical seeds', () => {
    const first = new BoardGenerator({ seed: 42 }).generate();
    const second = new BoardGenerator({ seed: 42 }).generate();
    expect(kindsOf(first)).toEqual(kindsOf(second));
  });

  it('always creates an 8x8 board without matches and with a move', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const board = new BoardGenerator({ seed }).generate();
      expect(board).toHaveLength(8);
      expect(board.every((row) => row.length === 8)).toBe(true);
      expect(MatchDetector.hasMatches(board)).toBe(false);
      expect(MoveFinder.hasMove(board)).toBe(true);
    }
  });
});
