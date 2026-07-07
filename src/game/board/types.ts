export type TileKind = number;

export type SpecialKind = 'row' | 'column' | 'bomb' | 'rainbow';

export interface Position {
  readonly row: number;
  readonly col: number;
}

export interface Tile {
  readonly id: string;
  readonly kind: TileKind | null;
  readonly special: SpecialKind | null;
}

export type Cell = Tile | null;
export type Board = Cell[][];

export type MatchShape = 'three' | 'four' | 'five' | 'T' | 'L' | 'cross';

export interface MatchRun {
  readonly orientation: 'horizontal' | 'vertical';
  readonly kind: TileKind;
  readonly cells: readonly Position[];
}

export interface MatchGroup {
  readonly kind: TileKind;
  readonly cells: readonly Position[];
  readonly runs: readonly MatchRun[];
  readonly shape: MatchShape;
}

export interface MatchResult {
  readonly groups: readonly MatchGroup[];
  readonly cells: readonly Position[];
  readonly hasMultiple: boolean;
}

export interface Move {
  readonly from: Position;
  readonly to: Position;
}

export interface CreatedSpecial {
  readonly position: Position;
  readonly special: SpecialKind;
  readonly kind: TileKind | null;
}

export interface CascadeStep {
  readonly index: number;
  readonly matches: MatchResult;
  readonly removed: readonly Position[];
  readonly created: readonly CreatedSpecial[];
  readonly score: number;
}

export type SwapFailure = 'out-of-bounds' | 'not-adjacent' | 'no-match';

export interface SwapResult {
  readonly accepted: boolean;
  readonly reason?: SwapFailure;
  readonly board: Board;
  readonly cascades: readonly CascadeStep[];
  readonly score: number;
  readonly reshuffled: boolean;
}

export interface BoardOptions {
  readonly width?: number;
  readonly height?: number;
  readonly kinds?: readonly TileKind[];
  readonly seed?: number | string;
}

export const positionKey = ({ row, col }: Position): string => `${row}:${col}`;

export const samePosition = (a: Position, b: Position): boolean =>
  a.row === b.row && a.col === b.col;

export const isAdjacent = (a: Position, b: Position): boolean =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

export const cloneBoard = (board: Board): Board => board.map((row) => row.slice());

export const makeTile = (
  kind: TileKind | null,
  id: string,
  special: SpecialKind | null = null,
): Tile => ({ id, kind, special });
