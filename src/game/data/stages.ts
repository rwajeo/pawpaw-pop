import { SeededRandom } from '../board';
import type { CharacterId, StageDefinition, StageGoal, StageObstacle } from '../types';
import { ALL_CHARACTER_IDS } from './characters';

export const MAX_LEVEL = 20;

const LEVEL_TITLES = [
  '첫 번개',
  '톡톡 팝콘',
  '반짝 로켓',
  '젤리 산책',
  '상자 소동',
  '쌍둥이 매치',
  '구름 관문',
  '나무 요새',
  '파도 콤보',
  '전기 정원',
  '돌판 균열',
  '별빛 하강',
  '번개 훈련',
  '폭풍 골짜기',
  '유물의 방',
  '하늘 사다리',
  '스파크 러시',
  '천둥 회랑',
  '별무리 대작전',
  '포포 피날레',
] as const;

const clampLevel = (levelId: number): number => Math.min(MAX_LEVEL, Math.max(1, Math.floor(levelId)));
const levelTime = (levelId: number): number => (levelId <= 3 ? 150 : levelId <= 7 ? 135 : levelId <= 12 ? 120 : levelId <= 16 ? 105 : 90);
const poolSizeForLevel = (levelId: number): number => Math.min(7, 4 + Math.floor((levelId - 1) / 4));

let runSequence = 0;
const nextRunToken = (): string => {
  runSequence += 1;
  return `${Date.now()}-${runSequence}-${Math.floor(Math.random() * 0x7fffffff).toString(36)}`;
};

const chooseCollectTarget = (pool: readonly CharacterId[], random: SeededRandom): CharacterId =>
  random.pick(pool) ?? 'momo';

const createLevelRules = (
  levelId: number,
  pool: readonly CharacterId[],
  random: SeededRandom,
): { goals: readonly StageGoal[]; obstacles: readonly StageObstacle[]; hint: string } => {
  const collect = chooseCollectTarget(pool, random);
  const scoreBase = 2600 + levelId * 520;
  const variant = (levelId - 1) % 5;

  if (levelId <= 2) {
    return {
      goals: [{ type: 'score', target: scoreBase }],
      obstacles: [],
      hint: '같은 동물 3마리 이상을 맞춰 점수를 채우세요.',
    };
  }

  if (variant === 0) {
    return {
      goals: [{ type: 'collect', characterId: collect, target: 14 + Math.floor(levelId * 0.55) }, { type: 'score', target: scoreBase }],
      obstacles: levelId >= 11 ? [{ type: 'jelly', count: 6 + Math.floor(levelId / 4) }] : [],
      hint: '목표 동물이 포함된 매치를 우선으로 만들면 빠르게 클리어할 수 있어요.',
    };
  }

  if (variant === 1) {
    return {
      goals: [{ type: 'special', target: 2 + Math.floor(levelId / 4) }, { type: 'score', target: scoreBase }],
      obstacles: levelId >= 8 ? [{ type: 'woodCrate', count: 5 + Math.floor(levelId / 3), strength: levelId >= 14 ? 2 : 1 }] : [],
      hint: '4마리 이상 매치로 특수 블록을 만들고 연쇄 폭발을 노리세요.',
    };
  }

  if (variant === 2) {
    return {
      goals: [{ type: 'obstacle', obstacle: 'jelly', target: 6 + Math.floor(levelId / 2) }, { type: 'score', target: scoreBase }],
      obstacles: [{ type: 'jelly', count: 6 + Math.floor(levelId / 2) }],
      hint: '젤리 위의 동물을 터뜨리면 젤리가 사라집니다.',
    };
  }

  if (variant === 3) {
    return {
      goals: [{ type: 'obstacle', obstacle: 'woodCrate', target: 6 + Math.floor(levelId / 2) }, { type: 'collect', characterId: collect, target: 12 + Math.floor(levelId / 2) }],
      obstacles: [{ type: 'woodCrate', count: 6 + Math.floor(levelId / 2), strength: levelId >= 10 ? 2 : 1 }],
      hint: '상자 옆에서 매치하거나 큰 폭발로 한 번에 정리하세요.',
    };
  }

  return {
    goals: levelId >= 12
      ? [{ type: 'starDrop', target: Math.min(4, 1 + Math.floor(levelId / 6)) }, { type: 'special', target: 3 + Math.floor(levelId / 4) }]
      : [{ type: 'obstacle', obstacle: 'stone', target: 5 + Math.floor(levelId / 2) }, { type: 'score', target: scoreBase }],
    obstacles: levelId >= 12
      ? [{ type: 'starShard', count: Math.min(4, 1 + Math.floor(levelId / 6)) }, { type: 'stone', count: 4 + Math.floor(levelId / 3), strength: levelId >= 16 ? 2 : 1 }]
      : [{ type: 'stone', count: 5 + Math.floor(levelId / 2), strength: 1 }],
    hint: '특수 블록과 토템을 아껴 두었다가 막힌 구간에서 터뜨리세요.',
  };
};

const buildLevel = (levelId: number, seed: string): StageDefinition => {
  const id = clampLevel(levelId);
  const random = new SeededRandom(seed);
  const characterPool = random.shuffle(ALL_CHARACTER_IDS).slice(0, poolSizeForLevel(id));
  const rules = createLevelRules(id, characterPool, random);
  const base = 5200 + id * 920;

  return {
    id,
    title: LEVEL_TITLES[id - 1] ?? `레벨 ${id}`,
    seed,
    timeLimit: levelTime(id),
    goals: rules.goals,
    obstacles: rules.obstacles,
    starThresholds: [base, Math.round(base * 1.42), Math.round(base * 1.92)],
    hint: rules.hint,
    characterPool,
  };
};

export const STAGES = Array.from({ length: MAX_LEVEL }, (_, index) =>
  buildLevel(index + 1, `pawpaw-level-${index + 1}-preview`),
) satisfies readonly StageDefinition[];

export const getStage = (stageId: number): StageDefinition | undefined =>
  STAGES.find((stage) => stage.id === clampLevel(stageId));

export const createStageChallenge = (stageId: number, runToken = nextRunToken()): StageDefinition => {
  const levelId = clampLevel(stageId);
  return buildLevel(levelId, `pawpaw-level-${levelId}-${runToken}`);
};

export const getStarsForScore = (stage: StageDefinition, score: number): 0 | 1 | 2 | 3 => {
  if (score >= stage.starThresholds[2]) return 3;
  if (score >= stage.starThresholds[1]) return 2;
  if (score >= stage.starThresholds[0]) return 1;
  return 0;
};
