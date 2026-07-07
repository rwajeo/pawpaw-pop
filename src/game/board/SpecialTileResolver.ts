import type { Board, CreatedSpecial, MatchGroup, Position, SpecialKind, TileKind } from './types';
import { cloneBoard, makeTile, positionKey, samePosition } from './types';

export interface SpecialResolution {
  readonly board: Board;
  readonly removed: readonly Position[];
}

const getCell = (board: Board, position: Position) => board[position.row]?.[position.col] ?? null;

const allPositions = (board: Board): Position[] =>
  board.flatMap((row, rowIndex) => row.map((_, col) => ({ row: rowIndex, col })));

const addSquare = (board: Board, center: Position, radius: number, add: (position: Position) => void): void => {
  for (let row = center.row - radius; row <= center.row + radius; row += 1) {
    for (let col = center.col - radius; col <= center.col + radius; col += 1) {
      if (row >= 0 && col >= 0 && row < board.length && col < (board[row]?.length ?? 0)) add({ row, col });
    }
  }
};

export const specialForMatch = (group: MatchGroup): SpecialKind | null => {
  if (group.shape === 'T' || group.shape === 'L' || group.shape === 'cross') return 'bomb';
  const longest = group.runs.reduce((best, run) => (run.cells.length > best.cells.length ? run : best), group.runs[0]!);
  if (longest.cells.length >= 5) return 'rainbow';
  if (longest.cells.length === 4) return longest.orientation === 'horizontal' ? 'row' : 'column';
  return null;
};

export const chooseSpecialPosition = (group: MatchGroup, preferred: readonly Position[] = []): Position => {
  for (const position of preferred) {
    if (group.cells.some((cell) => samePosition(cell, position))) return position;
  }
  if (group.runs.length > 1) {
    const horizontal = group.runs.find((run) => run.orientation === 'horizontal');
    const verticalKeys = new Set(
      group.runs.find((run) => run.orientation === 'vertical')?.cells.map(positionKey) ?? [],
    );
    const intersection = horizontal?.cells.find((cell) => verticalKeys.has(positionKey(cell)));
    if (intersection) return intersection;
  }
  const run = group.runs.reduce((best, candidate) =>
    candidate.cells.length > best.cells.length ? candidate : best,
  );
  return run.cells[Math.floor(run.cells.length / 2)] as Position;
};

export const createSpecials = (
  board: Board,
  groups: readonly MatchGroup[],
  preferred: readonly Position[] = [],
): { board: Board; created: CreatedSpecial[]; protectedKeys: Set<string> } => {
  const copy = cloneBoard(board);
  const created: CreatedSpecial[] = [];
  const protectedKeys = new Set<string>();
  for (const group of groups) {
    const special = specialForMatch(group);
    if (!special) continue;
    const position = chooseSpecialPosition(group, preferred);
    const current = getCell(copy, position);
    const kind = special === 'rainbow' ? null : group.kind;
    if (copy[position.row]) {
      copy[position.row][position.col] = makeTile(kind, current?.id ?? `special-${positionKey(position)}`, special);
    }
    created.push({ position, special, kind });
    protectedKeys.add(positionKey(position));
  }
  return { board: copy, created, protectedKeys };
};

export const resolveSpecialEffects = (
  board: Board,
  initial: readonly Position[],
  rainbowKind?: TileKind | null,
): SpecialResolution => {
  const removed = new Map<string, Position>();
  const queued = new Set<string>();
  const queue: Position[] = [];
  const add = (position: Position): void => {
    if (!getCell(board, position)) return;
    const key = positionKey(position);
    removed.set(key, position);
    const tile = getCell(board, position);
    if (tile?.special && !queued.has(key)) {
      queued.add(key);
      queue.push(position);
    }
  };
  initial.forEach(add);

  while (queue.length > 0) {
    const position = queue.shift() as Position;
    const special = getCell(board, position)?.special;
    if (special === 'row') {
      board[position.row]?.forEach((_, col) => add({ row: position.row, col }));
    } else if (special === 'column') {
      board.forEach((_, row) => add({ row, col: position.col }));
    } else if (special === 'bomb') {
      addSquare(board, position, 2, add);
    } else if (special === 'rainbow') {
      const targets = rainbowKind == null
        ? allPositions(board)
        : allPositions(board).filter((cell) => getCell(board, cell)?.kind === rainbowKind);
      targets.forEach(add);
    }
  }
  return { board, removed: [...removed.values()].sort((a, b) => a.row - b.row || a.col - b.col) };
};

const isRocket = (special: SpecialKind | null): special is 'row' | 'column' => special === 'row' || special === 'column';

export const resolveSpecialSwap = (board: Board, a: Position, b: Position): SpecialResolution => {
  const copy = cloneBoard(board);
  const first = getCell(copy, a);
  const second = getCell(copy, b);
  if (!first || !second || (!first.special && !second.special)) return { board: copy, removed: [] };

  const firstSpecial = first.special;
  const secondSpecial = second.special;
  if (firstSpecial === 'rainbow' && secondSpecial === 'rainbow') {
    return { board: copy, removed: allPositions(copy) };
  }

  const rainbowPosition = firstSpecial === 'rainbow' ? a : secondSpecial === 'rainbow' ? b : null;
  if (rainbowPosition) {
    const otherPosition = samePosition(rainbowPosition, a) ? b : a;
    const other = getCell(copy, otherPosition);
    if (!other) return { board: copy, removed: [] };
    if (isRocket(other.special) || other.special === 'bomb') {
      const targets = allPositions(copy).filter((position) => getCell(copy, position)?.kind === other.kind);
      targets.forEach((position, index) => {
        const current = getCell(copy, position);
        if (!current || !copy[position.row]) return;
        const special = other.special === 'bomb' ? 'bomb' : index % 2 === 0 ? 'row' : 'column';
        copy[position.row][position.col] = makeTile(current.kind, current.id, special);
      });
      return resolveSpecialEffects(copy, [rainbowPosition, ...targets], other.kind);
    }
    return resolveSpecialEffects(copy, [rainbowPosition, otherPosition], other.kind);
  }

  if (firstSpecial && secondSpecial) {
    const removal = new Map<string, Position>();
    const add = (position: Position): void => {
      if (getCell(copy, position)) removal.set(positionKey(position), position);
    };
    if (isRocket(firstSpecial) && isRocket(secondSpecial)) {
      for (const position of [a, b]) {
        copy[position.row]?.forEach((_, col) => add({ row: position.row, col }));
        copy.forEach((_, row) => add({ row, col: position.col }));
      }
    } else if ((isRocket(firstSpecial) && secondSpecial === 'bomb') || (firstSpecial === 'bomb' && isRocket(secondSpecial))) {
      for (let offset = -1; offset <= 1; offset += 1) {
        const center = b;
        copy[center.row + offset]?.forEach((_, col) => add({ row: center.row + offset, col }));
        copy.forEach((_, row) => add({ row, col: center.col + offset }));
      }
    } else if (firstSpecial === 'bomb' && secondSpecial === 'bomb') {
      addSquare(copy, b, 3, add);
    }
    const chained = resolveSpecialEffects(copy, [...removal.values()]);
    return { board: copy, removed: chained.removed };
  }

  const specialPosition = firstSpecial ? a : b;
  const normalPosition = firstSpecial ? b : a;
  return resolveSpecialEffects(copy, [specialPosition, normalPosition]);
};

export class SpecialTileResolver {
  public static resolveSwap(board: Board, a: Position, b: Position): SpecialResolution {
    return resolveSpecialSwap(board, a, b);
  }

  public static resolve(board: Board, positions: readonly Position[]): SpecialResolution {
    return resolveSpecialEffects(board, positions);
  }
}
