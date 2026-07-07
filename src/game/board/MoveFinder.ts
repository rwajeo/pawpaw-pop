import { detectMatches } from './MatchDetector';
import type { Board, Move, Position } from './types';
import { cloneBoard, isAdjacent, positionKey } from './types';

export const isInside = (board: Board, position: Position): boolean =>
  position.row >= 0 &&
  position.col >= 0 &&
  position.row < board.length &&
  position.col < (board[position.row]?.length ?? 0);

export const swapCells = (board: Board, a: Position, b: Position): Board => {
  const copy = cloneBoard(board);
  const first = copy[a.row]?.[a.col] ?? null;
  const second = copy[b.row]?.[b.col] ?? null;
  if (copy[a.row]) copy[a.row][a.col] = second;
  if (copy[b.row]) copy[b.row][b.col] = first;
  return copy;
};

export const isProductiveSwap = (board: Board, a: Position, b: Position): boolean => {
  if (!isInside(board, a) || !isInside(board, b) || !isAdjacent(a, b)) return false;
  const first = board[a.row]?.[a.col];
  const second = board[b.row]?.[b.col];
  if (!first || !second) return false;
  if (first.special || second.special) return true;
  if (first.kind === second.kind) return false;
  const swapped = swapCells(board, a, b);
  const relevant = new Set([positionKey(a), positionKey(b)]);
  return detectMatches(swapped).groups.some((group) => group.cells.some((cell) => relevant.has(positionKey(cell))));
};

export const findMoves = (board: Board): Move[] => {
  const moves: Move[] = [];
  const height = board.length;
  const width = board[0]?.length ?? 0;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const from = { row, col };
      const right = { row, col: col + 1 };
      const down = { row: row + 1, col };
      if (col + 1 < width && isProductiveSwap(board, from, right)) moves.push({ from, to: right });
      if (row + 1 < height && isProductiveSwap(board, from, down)) moves.push({ from, to: down });
    }
  }
  return moves;
};

export class MoveFinder {
  public static find(board: Board): Move[] {
    return findMoves(board);
  }

  public static hasMove(board: Board): boolean {
    return findMoves(board).length > 0;
  }
}
