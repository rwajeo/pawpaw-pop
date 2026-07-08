import { SeededRandom } from '../board';
import type { Difficulty, StageDefinition, StageGoal, StageObstacle } from '../types';
import { ALL_CHARACTER_IDS } from './characters';

export interface DifficultyOption {
  readonly id: Difficulty;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly color: number;
}

export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
  { id: 'easy', label: 'EASY', title: '편안한 시작', description: '3분 · 캐릭터 4종 · 매치 시간 +1초', color: 0x62b997 },
  { id: 'medium', label: 'MEDIUM', title: '기분 좋은 도전', description: '2분 · 캐릭터 5종 · 젤리와 상자', color: 0x5faed6 },
  { id: 'hard', label: 'HARD', title: '짜릿한 승부', description: '1분 30초 · 캐릭터 6종 · 복합 장애물', color: 0xef9c63 },
  { id: 'veryHard', label: 'VERY HARD', title: '포포 마스터', description: '1분 · 캐릭터 7종 · 강한 장애물', color: 0xd66f8f },
] as const;

let runSequence = 0;

const nextRunToken = (): string => {
  runSequence += 1;
  return `${Date.now()}-${runSequence}-${Math.floor(Math.random() * 0x7fffffff).toString(36)}`;
};

const difficultyIndex = (difficulty: Difficulty): number => DIFFICULTY_OPTIONS.findIndex((option) => option.id === difficulty) + 1;

/** Builds a fresh rule set and seed for every normal game. Passing a token makes a run reproducible for tests. */
export const createDifficultyChallenge = (difficulty: Difficulty, runToken = nextRunToken()): StageDefinition => {
  const seed = `pawpaw-${difficulty}-${runToken}`;
  const random = new SeededRandom(seed);
  const option = DIFFICULTY_OPTIONS.find((item) => item.id === difficulty) ?? DIFFICULTY_OPTIONS[0];
  const poolSize = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : difficulty === 'hard' ? 6 : 7;
  const characterPool = random.shuffle(ALL_CHARACTER_IDS).slice(0, poolSize);
  const collectCharacter = random.pick(characterPool);
  const variant = random.int(0, 3);

  const timeLimit = difficulty === 'easy' ? 180 : difficulty === 'medium' ? 120 : difficulty === 'hard' ? 90 : 60;
  let goals: readonly StageGoal[] = [];
  let obstacles: readonly StageObstacle[] = [];
  let thresholds: readonly [number, number, number] = [3500, 5200, 7000];
  let hint = '연속 매치를 이어 콤보를 만들어 보세요.';

  if (difficulty === 'easy') {
    if (variant === 0) goals = [{ type: 'score', target: 3500 }];
    if (variant === 1) goals = [{ type: 'collect', characterId: collectCharacter, target: 16 }, { type: 'score', target: 2600 }];
    if (variant === 2) goals = [{ type: 'special', target: 2 }, { type: 'score', target: 2800 }];
    thresholds = [12000, 20000, 32000];
    hint = '네 종류의 친구로 기본 매치와 특수 블록을 익혀 보세요.';
  } else if (difficulty === 'medium') {
    if (variant === 0) {
      goals = [{ type: 'obstacle', obstacle: 'jelly', target: 8 }, { type: 'score', target: 4800 }];
      obstacles = [{ type: 'jelly', count: 8 }];
    } else if (variant === 1) {
      goals = [{ type: 'obstacle', obstacle: 'woodCrate', target: 8 }, { type: 'collect', characterId: collectCharacter, target: 18 }];
      obstacles = [{ type: 'woodCrate', count: 8, strength: 1 }];
    } else {
      goals = [{ type: 'special', target: 4 }, { type: 'score', target: 5600 }];
      obstacles = [{ type: 'jelly', count: 6 }];
    }
    thresholds = [10000, 18000, 28000];
    hint = '장애물 주변을 맞추고 특수 블록으로 길을 여세요.';
  } else if (difficulty === 'hard') {
    if (variant === 0) {
      goals = [{ type: 'obstacle', obstacle: 'stone', target: 10 }, { type: 'score', target: 7600 }];
      obstacles = [{ type: 'stone', count: 10, strength: 1 }];
    } else if (variant === 1) {
      goals = [{ type: 'obstacle', obstacle: 'woodCrate', target: 10 }, { type: 'special', target: 5 }];
      obstacles = [{ type: 'woodCrate', count: 6, strength: 1 }, { type: 'woodCrate', count: 4, strength: 2 }];
    } else {
      goals = [{ type: 'obstacle', obstacle: 'jelly', target: 10 }, { type: 'collect', characterId: collectCharacter, target: 20 }];
      obstacles = [{ type: 'jelly', count: 10 }, { type: 'stone', count: 6, strength: 1 }];
    }
    thresholds = [9000, 15000, 24000];
    hint = '복합 목표의 우선순위를 정하고 큰 연쇄를 노려 보세요.';
  } else {
    if (variant === 0) {
      goals = [{ type: 'starDrop', target: 2 }, { type: 'obstacle', obstacle: 'stone', target: 12 }, { type: 'score', target: 10500 }];
      obstacles = [{ type: 'starShard', count: 2 }, { type: 'stone', count: 12, strength: 2 }];
    } else if (variant === 1) {
      goals = [{ type: 'obstacle', obstacle: 'woodCrate', target: 12 }, { type: 'special', target: 7 }];
      obstacles = [{ type: 'woodCrate', count: 12, strength: 2 }, { type: 'jelly', count: 8 }];
    } else {
      goals = [{ type: 'obstacle', obstacle: 'stone', target: 10 }, { type: 'obstacle', obstacle: 'jelly', target: 10 }, { type: 'collect', characterId: collectCharacter, target: 22 }];
      obstacles = [{ type: 'stone', count: 10, strength: 2 }, { type: 'jelly', count: 10 }];
    }
    thresholds = [8000, 14000, 22000];
    hint = '짧은 시간 안에 장애물과 여러 목표를 동시에 해결하세요.';
  }

  return {
    id: difficultyIndex(difficulty),
    title: option?.title ?? '편안한 시작',
    seed,
    timeLimit,
    goals,
    obstacles,
    starThresholds: thresholds,
    hint,
    characterPool,
  };
};
