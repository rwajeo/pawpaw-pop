import { BoardGenerator } from './BoardGenerator';
import { detectMatches } from './MatchDetector';
import { findMoves, isInside, isProductiveSwap, swapCells } from './MoveFinder';
import { createSpecials, resolveSpecialEffects, resolveSpecialSwap } from './SpecialTileResolver';
import type {
  Board,
  BoardOptions,
  CascadeStep,
  MatchResult,
  Move,
  Position,
  SwapResult,
} from './types';
import { cloneBoard, isAdjacent, positionKey } from './types';

const EMPTY_MATCH: MatchResult = { groups: [], cells: [], hasMultiple: false };
const MAX_CASCADES = 100;

export const calculateMatchScore = (
  matches: MatchResult,
  cascadeIndex: number,
  removedCount = matches.cells.length,
): number => {
  const groupScore = matches.groups.reduce((score, group) => {
    if (group.shape === 'T' || group.shape === 'L' || group.shape === 'cross') return score + 1_000;
    if (group.cells.length >= 5) return score + 800 + (group.cells.length - 5) * 150;
    if (group.cells.length === 4) return score + 500;
    return score + 300;
  }, 0);
  const effectBonus = Math.max(0, removedCount - matches.cells.length) * 50;
  const multiplier = Math.min(3, 1 + Math.max(0, cascadeIndex - 1) * 0.25);
  return Math.round((groupScore + effectBonus) * multiplier);
};

export const collapseAndRefill = (board: Board, generator: BoardGenerator): Board => {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const result: Board = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  for (let col = 0; col < width; col += 1) {
    const existing = board.map((row) => row[col] ?? null).filter((cell) => cell !== null);
    let writeRow = height - 1;
    for (let index = existing.length - 1; index >= 0; index -= 1) {
      if (result[writeRow]) result[writeRow][col] = existing[index] ?? null;
      writeRow -= 1;
    }
    while (writeRow >= 0) {
      if (result[writeRow]) result[writeRow][col] = generator.createRandomTile();
      writeRow -= 1;
    }
  }
  return result;
};

const clearCells = (board: Board, cells: readonly Position[]): Board => {
  const copy = cloneBoard(board);
  cells.forEach(({ row, col }) => {
    if (copy[row]) copy[row][col] = null;
  });
  return copy;
};

interface CascadeOutcome {
  readonly board: Board;
  readonly step: Omit<CascadeStep, 'board'>;
}

const resolveMatchStep = (
  board: Board,
  matches: MatchResult,
  cascadeIndex: number,
  preferred: readonly Position[],
): CascadeOutcome => {
  const specials = createSpecials(board, matches.groups, preferred);
  const initialRemoval = matches.cells.filter((cell) => !specials.protectedKeys.has(positionKey(cell)));
  const effects = resolveSpecialEffects(specials.board, initialRemoval);
  return {
    board: clearCells(specials.board, effects.removed),
    step: {
      index: cascadeIndex,
      source: cloneBoard(board),
      matches,
      removed: effects.removed,
      created: specials.created,
      score: calculateMatchScore(matches, cascadeIndex, effects.removed.length),
    },
  };
};

export const resolveSwap = (
  source: Board,
  from: Position,
  to: Position,
  generator: BoardGenerator,
): SwapResult => {
  const original = cloneBoard(source);
  if (!isInside(source, from) || !isInside(source, to)) {
    return { accepted: false, reason: 'out-of-bounds', board: original, cascades: [], score: 0, reshuffled: false };
  }
  if (!isAdjacent(from, to)) {
    return { accepted: false, reason: 'not-adjacent', board: original, cascades: [], score: 0, reshuffled: false };
  }
  if (!isProductiveSwap(source, from, to)) {
    return { accepted: false, reason: 'no-match', board: original, cascades: [], score: 0, reshuffled: false };
  }

  let board = swapCells(source, from, to);
  const cascades: CascadeStep[] = [];
  const first = board[from.row]?.[from.col];
  const second = board[to.row]?.[to.col];
  if (first?.special || second?.special) {
    const specialSource = cloneBoard(board);
    const specialResult = resolveSpecialSwap(board, from, to);
    board = clearCells(specialResult.board, specialResult.removed);
    board = collapseAndRefill(board, generator);
    cascades.push({
      index: 1,
      source: specialSource,
      board: cloneBoard(board),
      matches: EMPTY_MATCH,
      removed: specialResult.removed,
      created: [],
      score: specialResult.removed.length * 100,
    });
  }

  let matches = detectMatches(board);
  let cascadeIndex = cascades.length + 1;
  while (matches.groups.length > 0 && cascadeIndex <= MAX_CASCADES) {
    const outcome = resolveMatchStep(board, matches, cascadeIndex, cascadeIndex === 1 ? [to, from] : []);
    board = collapseAndRefill(outcome.board, generator);
    cascades.push({ ...outcome.step, board: cloneBoard(board) });
    matches = detectMatches(board);
    cascadeIndex += 1;
  }
  if (matches.groups.length > 0) throw new Error('Cascade safety limit exceeded');

  let reshuffled = false;
  if (findMoves(board).length === 0) {
    board = generator.reshuffle(board);
    reshuffled = true;
  }
  return {
    accepted: true,
    board,
    cascades,
    score: cascades.reduce((sum, step) => sum + step.score, 0),
    reshuffled,
  };
};

export class BoardModel {
  private currentBoard: Board;
  private readonly generator: BoardGenerator;
  private resolving = false;

  public constructor(options: BoardOptions & { board?: Board } = {}) {
    const width = options.board?.[0]?.length ?? options.width;
    const height = options.board?.length ?? options.height;
    this.generator = new BoardGenerator({ ...options, width, height });
    this.currentBoard = options.board ? cloneBoard(options.board) : this.generator.generate();
  }

  public get board(): Board {
    return cloneBoard(this.currentBoard);
  }

  public get isResolving(): boolean {
    return this.resolving;
  }

  public availableMoves(): Move[] {
    return findMoves(this.currentBoard);
  }

  public canSwap(from: Position, to: Position): boolean {
    return isAdjacent(from, to) && isProductiveSwap(this.currentBoard, from, to);
  }

  public swap(from: Position, to: Position): SwapResult {
    if (this.resolving) {
      return { accepted: false, reason: 'no-match', board: this.board, cascades: [], score: 0, reshuffled: false };
    }
    this.resolving = true;
    try {
      const result = resolveSwap(this.currentBoard, from, to, this.generator);
      if (result.accepted) this.currentBoard = result.board;
      return result;
    } finally {
      this.resolving = false;
    }
  }

  public reshuffle(): Board {
    this.currentBoard = this.generator.reshuffle(this.currentBoard);
    return this.board;
  }

  /** Removes selected cells for booster items, refills, then restores a playable state. */
  public removePositions(positions: readonly Position[]): Board {
    const valid = positions.filter((position) => isInside(this.currentBoard, position));
    this.currentBoard = collapseAndRefill(clearCells(this.currentBoard, valid), this.generator);
    if (findMoves(this.currentBoard).length === 0) this.currentBoard = this.generator.reshuffle(this.currentBoard);
    return this.board;
  }
}
