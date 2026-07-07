import type { Board, SpecialKind } from '../src/game/board';
import { makeTile } from '../src/game/board';

export const boardFromKinds = (rows: readonly (readonly (number | null)[])[]): Board =>
  rows.map((row, rowIndex) =>
    row.map((kind, col) => kind == null ? null : makeTile(kind, `${rowIndex}-${col}`)),
  );

export const withSpecial = (board: Board, row: number, col: number, special: SpecialKind): Board => {
  const current = board[row]?.[col];
  if (!current || !board[row]) throw new Error('Missing test tile');
  board[row][col] = makeTile(special === 'rainbow' ? null : current.kind, current.id, special);
  return board;
};

export const kindsOf = (board: Board): (number | null)[][] =>
  board.map((row) => row.map((tile) => tile?.kind ?? null));
