import { MatchDetector } from './MatchDetector';
import { MoveFinder } from './MoveFinder';
import { SeededRandom } from './SeededRandom';
import type { Board, BoardOptions, TileKind } from './types';
import { makeTile } from './types';

const DEFAULT_KINDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export class BoardGenerator {
  public readonly width: number;
  public readonly height: number;
  public readonly kinds: readonly TileKind[];
  public readonly random: SeededRandom;
  private nextId = 0;

  public constructor(options: BoardOptions = {}) {
    this.width = options.width ?? 8;
    this.height = options.height ?? 8;
    this.kinds = options.kinds ?? DEFAULT_KINDS;
    this.random = new SeededRandom(options.seed ?? Date.now());
    if (this.width < 3 || this.height < 3) throw new RangeError('Board dimensions must both be at least 3');
    if (this.kinds.length < 3) throw new RangeError('At least three tile kinds are required');
  }

  public generate(): Board {
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const board = this.generateWithoutImmediateMatches();
      if (MoveFinder.hasMove(board)) return board;
    }
    throw new Error('Unable to generate a playable board');
  }

  public createRandomTile() {
    return makeTile(this.random.pick(this.kinds), `tile-${this.nextId++}`);
  }

  public reshuffle(board: Board): Board {
    const tiles = board.flat().filter((tile) => tile !== null);
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const shuffled = this.random.shuffle(tiles);
      const candidate: Board = Array.from({ length: this.height }, (_, row) =>
        Array.from({ length: this.width }, (_, col) => shuffled[row * this.width + col] ?? null),
      );
      if (!MatchDetector.hasMatches(candidate) && MoveFinder.hasMove(candidate)) return candidate;
    }
    return this.generate();
  }

  private generateWithoutImmediateMatches(): Board {
    const board: Board = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => null));
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const forbidden = new Set<TileKind>();
        if (col >= 2 && board[row]?.[col - 1]?.kind === board[row]?.[col - 2]?.kind) {
          const kind = board[row]?.[col - 1]?.kind;
          if (kind != null) forbidden.add(kind);
        }
        if (row >= 2 && board[row - 1]?.[col]?.kind === board[row - 2]?.[col]?.kind) {
          const kind = board[row - 1]?.[col]?.kind;
          if (kind != null) forbidden.add(kind);
        }
        const choices = this.kinds.filter((kind) => !forbidden.has(kind));
        const kind = this.random.pick(choices);
        if (board[row]) board[row][col] = makeTile(kind, `tile-${this.nextId++}`);
      }
    }
    return board;
  }
}

export const generateBoard = (options: BoardOptions = {}): Board => new BoardGenerator(options).generate();
