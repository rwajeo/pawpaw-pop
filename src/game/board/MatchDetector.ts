import type { Board, MatchGroup, MatchResult, MatchRun, MatchShape, Position } from './types';
import { positionKey } from './types';

const classifyLinear = (length: number): MatchShape => {
  if (length >= 5) return 'five';
  if (length === 4) return 'four';
  return 'three';
};

const classifyGroup = (runs: readonly MatchRun[], cellCount: number): MatchShape => {
  const horizontal = runs.find((run) => run.orientation === 'horizontal');
  const vertical = runs.find((run) => run.orientation === 'vertical');
  if (!horizontal || !vertical) return classifyLinear(cellCount);

  const verticalKeys = new Set(vertical.cells.map(positionKey));
  const intersection = horizontal.cells.find((cell) => verticalKeys.has(positionKey(cell)));
  if (!intersection) return classifyLinear(cellCount);
  const horizontalIndex = horizontal.cells.findIndex((cell) => positionKey(cell) === positionKey(intersection));
  const verticalIndex = vertical.cells.findIndex((cell) => positionKey(cell) === positionKey(intersection));
  const horizontalEnd = horizontalIndex === 0 || horizontalIndex === horizontal.cells.length - 1;
  const verticalEnd = verticalIndex === 0 || verticalIndex === vertical.cells.length - 1;
  if (horizontalEnd && verticalEnd) return 'L';
  if (horizontalEnd || verticalEnd) return 'T';
  return 'cross';
};

const collectRuns = (board: Board): MatchRun[] => {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const runs: MatchRun[] = [];

  for (let row = 0; row < height; row += 1) {
    let start = 0;
    while (start < width) {
      const kind = board[row]?.[start]?.kind;
      let end = start + 1;
      while (kind != null && end < width && board[row]?.[end]?.kind === kind) end += 1;
      if (kind != null && end - start >= 3) {
        runs.push({
          orientation: 'horizontal',
          kind,
          cells: Array.from({ length: end - start }, (_, offset) => ({ row, col: start + offset })),
        });
      }
      start = end;
    }
  }

  for (let col = 0; col < width; col += 1) {
    let start = 0;
    while (start < height) {
      const kind = board[start]?.[col]?.kind;
      let end = start + 1;
      while (kind != null && end < height && board[end]?.[col]?.kind === kind) end += 1;
      if (kind != null && end - start >= 3) {
        runs.push({
          orientation: 'vertical',
          kind,
          cells: Array.from({ length: end - start }, (_, offset) => ({ row: start + offset, col })),
        });
      }
      start = end;
    }
  }
  return runs;
};

export const detectMatches = (board: Board): MatchResult => {
  const runs = collectRuns(board);
  const remaining = new Set(runs.map((_, index) => index));
  const groups: MatchGroup[] = [];

  while (remaining.size > 0) {
    const seedIndex = remaining.values().next().value as number;
    remaining.delete(seedIndex);
    const groupRunIndexes = [seedIndex];
    const keys = new Set(runs[seedIndex]?.cells.map(positionKey));
    const kind = runs[seedIndex]?.kind;

    let changed = true;
    while (changed) {
      changed = false;
      for (const index of remaining) {
        const candidate = runs[index];
        if (!candidate || candidate.kind !== kind || !candidate.cells.some((cell) => keys.has(positionKey(cell)))) continue;
        remaining.delete(index);
        groupRunIndexes.push(index);
        candidate.cells.forEach((cell) => keys.add(positionKey(cell)));
        changed = true;
      }
    }

    const groupRuns = groupRunIndexes.map((index) => runs[index] as MatchRun);
    const cells = [...keys]
      .map((key) => {
        const [row, col] = key.split(':').map(Number);
        return { row: row as number, col: col as number };
      })
      .sort((a, b) => a.row - b.row || a.col - b.col);
    groups.push({ kind: kind as number, cells, runs: groupRuns, shape: classifyGroup(groupRuns, cells.length) });
  }

  const cellsByKey = new Map<string, Position>();
  groups.forEach((group) => group.cells.forEach((cell) => cellsByKey.set(positionKey(cell), cell)));
  return {
    groups,
    cells: [...cellsByKey.values()].sort((a, b) => a.row - b.row || a.col - b.col),
    hasMultiple: groups.length > 1,
  };
};

export class MatchDetector {
  public static detect(board: Board): MatchResult {
    return detectMatches(board);
  }

  public static hasMatches(board: Board): boolean {
    return detectMatches(board).groups.length > 0;
  }
}
