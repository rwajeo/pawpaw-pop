import type { StageDefinition } from '../types';

export const STAGES = [
  {
    id: 1, title: '첫 만남', seed: 'pawpaw-stage-01', moves: 20,
    goals: [{ type: 'score', target: 1800 }], obstacles: [], starThresholds: [1800, 2800, 4000],
    hint: '같은 친구 셋을 나란히 모아 보세요.', characterPool: ['momo', 'lulu', 'bomi', 'dudu'],
  },
  {
    id: 2, title: '네 친구 나란히', seed: 'pawpaw-stage-02', moves: 21,
    goals: [{ type: 'score', target: 2800 }], obstacles: [], starThresholds: [2800, 4200, 5800],
    hint: '친구 넷을 모으면 줄 전체를 지우는 로켓이 생겨요.', characterPool: ['momo', 'lulu', 'bomi', 'dudu', 'piyo'],
  },
  {
    id: 3, title: '로켓 출발!', seed: 'pawpaw-stage-03', moves: 22,
    goals: [{ type: 'special', target: 2 }, { type: 'score', target: 3500 }], obstacles: [], starThresholds: [3500, 5200, 7000],
    hint: '만든 로켓과 이웃 친구를 바꿔 로켓을 발사하세요.', characterPool: ['momo', 'lulu', 'bomi', 'dudu', 'piyo'],
  },
  {
    id: 4, title: '모모를 찾아서', seed: 'pawpaw-stage-04', moves: 24,
    goals: [{ type: 'collect', characterId: 'momo', target: 18 }], obstacles: [], starThresholds: [3900, 5700, 7600],
    hint: '모모가 포함된 매치를 우선 만들어 보세요.',
  },
  {
    id: 5, title: '파랑새의 노래', seed: 'pawpaw-stage-05', moves: 23,
    goals: [{ type: 'collect', characterId: 'bomi', target: 20 }, { type: 'score', target: 4200 }], obstacles: [], starThresholds: [4200, 6200, 8300],
    hint: '보리를 모으면서 연쇄 매치로 점수를 올리세요.',
  },
  {
    id: 6, title: '둘이서 폴짝', seed: 'pawpaw-stage-06', moves: 25,
    goals: [{ type: 'collect', characterId: 'lulu', target: 16 }, { type: 'collect', characterId: 'dudu', target: 16 }], obstacles: [], starThresholds: [5000, 7200, 9500],
    hint: '두 목표 친구가 함께 사라지는 교차점을 찾아보세요.',
  },
  {
    id: 7, title: '나무 상자', seed: 'pawpaw-stage-07', moves: 25,
    goals: [{ type: 'obstacle', obstacle: 'woodCrate', target: 8 }], obstacles: [{ type: 'woodCrate', count: 8, strength: 1 }], starThresholds: [5200, 7600, 10000],
    hint: '상자 옆에서 매치하면 상자가 부서져요.',
  },
  {
    id: 8, title: '단단한 꾸러미', seed: 'pawpaw-stage-08', moves: 26,
    goals: [{ type: 'obstacle', obstacle: 'woodCrate', target: 12 }, { type: 'score', target: 5800 }], obstacles: [{ type: 'woodCrate', count: 8, strength: 1 }, { type: 'woodCrate', count: 4, strength: 2 }], starThresholds: [5800, 8400, 11000],
    hint: '진한 상자는 두 번 공격해야 사라져요.',
  },
  {
    id: 9, title: '상자 대소동', seed: 'pawpaw-stage-09', moves: 27,
    goals: [{ type: 'obstacle', obstacle: 'woodCrate', target: 16 }], obstacles: [{ type: 'woodCrate', count: 8, strength: 1 }, { type: 'woodCrate', count: 8, strength: 2 }], starThresholds: [6500, 9400, 12400],
    hint: '로켓과 폭탄으로 여러 상자를 한꺼번에 공격하세요.',
  },
  {
    id: 10, title: '말랑 젤리', seed: 'pawpaw-stage-10', moves: 27,
    goals: [{ type: 'obstacle', obstacle: 'jelly', target: 10 }], obstacles: [{ type: 'jelly', count: 10 }], starThresholds: [6800, 9800, 13000],
    hint: '젤리 위의 친구를 매치하면 젤리가 사라져요.',
  },
  {
    id: 11, title: '십자 젤리', seed: 'pawpaw-stage-11', moves: 28,
    goals: [{ type: 'obstacle', obstacle: 'jelly', target: 14 }, { type: 'score', target: 7200 }], obstacles: [{ type: 'jelly', count: 14 }], starThresholds: [7200, 10500, 13800],
    hint: '가운데 젤리부터 지워 새로운 이동 공간을 만드세요.',
  },
  {
    id: 12, title: '젤리와 상자', seed: 'pawpaw-stage-12', moves: 29,
    goals: [{ type: 'obstacle', obstacle: 'jelly', target: 12 }, { type: 'obstacle', obstacle: 'woodCrate', target: 8 }], obstacles: [{ type: 'jelly', count: 12 }, { type: 'woodCrate', count: 8, strength: 2 }], starThresholds: [8000, 11600, 15200],
    hint: '특수 블록을 모아 젤리와 상자를 함께 정리하세요.',
  },
  {
    id: 13, title: '돌길 열기', seed: 'pawpaw-stage-13', moves: 24,
    goals: [{ type: 'obstacle', obstacle: 'stone', target: 12 }], obstacles: [{ type: 'stone', count: 12, strength: 1 }], starThresholds: [8000, 11800, 15600],
    hint: '돌 타일은 인접한 매치로 한 겹씩 깨뜨리세요.',
  },
  {
    id: 14, title: '단단한 돌판', seed: 'pawpaw-stage-14', moves: 23,
    goals: [{ type: 'obstacle', obstacle: 'stone', target: 16 }, { type: 'score', target: 8500 }], obstacles: [{ type: 'stone', count: 8, strength: 1 }, { type: 'stone', count: 8, strength: 2 }], starThresholds: [8500, 12600, 16600],
    hint: '두꺼운 돌은 특수 블록으로 반복해서 공격하세요.',
  },
  {
    id: 15, title: '차가운 꾸러미', seed: 'pawpaw-stage-15', moves: 24,
    goals: [{ type: 'obstacle', obstacle: 'stone', target: 14 }, { type: 'obstacle', obstacle: 'woodCrate', target: 10 }], obstacles: [{ type: 'stone', count: 14, strength: 2 }, { type: 'woodCrate', count: 10, strength: 1 }], starThresholds: [9300, 13600, 18000],
    hint: '적은 이동으로 넓게 지우는 폭탄을 노려보세요.',
  },
  {
    id: 16, title: '별빛 낙하', seed: 'pawpaw-stage-16', moves: 30,
    goals: [{ type: 'starDrop', target: 3 }, { type: 'obstacle', obstacle: 'stone', target: 8 }], obstacles: [{ type: 'starShard', count: 3 }, { type: 'stone', count: 8, strength: 1 }], starThresholds: [9800, 14400, 19000],
    hint: '별 조각 아래를 먼저 지워 바닥 출구까지 내려보내세요.',
  },
  {
    id: 17, title: '시간을 달려서', seed: 'pawpaw-stage-17', timeLimit: 60,
    goals: [{ type: 'score', target: 12000 }, { type: 'collect', characterId: 'tori', target: 18 }], obstacles: [{ type: 'jelly', count: 10 }], starThresholds: [12000, 16600, 21600],
    hint: '멈추지 말고 빠르게 매치해 콤보를 이어가세요.',
  },
  {
    id: 18, title: '세 가지 약속', seed: 'pawpaw-stage-18', moves: 31,
    goals: [{ type: 'collect', characterId: 'nunu', target: 18 }, { type: 'obstacle', obstacle: 'woodCrate', target: 10 }, { type: 'starDrop', target: 2 }], obstacles: [{ type: 'woodCrate', count: 10, strength: 2 }, { type: 'starShard', count: 2 }], starThresholds: [11200, 16200, 21400],
    hint: '낙하 경로를 열면서 누누와 상자를 함께 노리세요.',
  },
  {
    id: 19, title: '특수 블록 축제', seed: 'pawpaw-stage-19', moves: 30,
    goals: [{ type: 'special', target: 7 }, { type: 'obstacle', obstacle: 'stone', target: 16 }], obstacles: [{ type: 'stone', count: 16, strength: 2 }, { type: 'jelly', count: 8 }], starThresholds: [12600, 18200, 24000],
    hint: '특수 블록끼리 바꿔 더 넓은 범위를 지우세요.',
  },
  {
    id: 20, title: '포포 피날레', seed: 'pawpaw-stage-20', moves: 34,
    goals: [{ type: 'special', target: 9 }, { type: 'obstacle', obstacle: 'woodCrate', target: 12 }, { type: 'starDrop', target: 4 }], obstacles: [{ type: 'woodCrate', count: 12, strength: 2 }, { type: 'stone', count: 12, strength: 2 }, { type: 'starShard', count: 4 }], starThresholds: [15000, 21600, 28500],
    hint: '특수 블록 조합으로 장애물을 열고 별을 내려보내세요.',
  },
] as const satisfies readonly StageDefinition[];

export const getStage = (stageId: number): StageDefinition | undefined => STAGES.find((stage) => stage.id === stageId);

export const getStarsForScore = (stage: StageDefinition, score: number): 0 | 1 | 2 | 3 => {
  if (score >= stage.starThresholds[2]) return 3;
  if (score >= stage.starThresholds[1]) return 2;
  if (score >= stage.starThresholds[0]) return 1;
  return 0;
};

const dailyNumber = (dateKey: string): number => {
  let value = 0;
  for (const character of dateKey) value = (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0;
  return value;
};

/** Creates the same 60-second challenge for every player on a given local date. */
export const getDailyChallenge = (dateKey: string): StageDefinition => {
  const variant = dailyNumber(dateKey) % 4;
  if (variant === 0) {
    return {
      id: 0, title: '오늘의 모모', seed: `pawpaw-daily-${dateKey}`, timeLimit: 60,
      goals: [{ type: 'score', target: 15000 }, { type: 'collect', characterId: 'momo', target: 20 }],
      obstacles: [{ type: 'jelly', count: 10 }], starThresholds: [15000, 20000, 26000],
      hint: '60초 동안 모모를 모으며 빠르게 콤보를 이어가세요.',
    };
  }
  if (variant === 1) {
    return {
      id: 0, title: '오늘의 상자', seed: `pawpaw-daily-${dateKey}`, timeLimit: 60,
      goals: [{ type: 'score', target: 14500 }, { type: 'obstacle', obstacle: 'woodCrate', target: 12 }],
      obstacles: [{ type: 'woodCrate', count: 12, strength: 1 }], starThresholds: [14500, 19500, 25500],
      hint: '로켓으로 나무 상자를 여러 개씩 공격하세요.',
    };
  }
  if (variant === 2) {
    return {
      id: 0, title: '오늘의 별빛', seed: `pawpaw-daily-${dateKey}`, timeLimit: 60,
      goals: [{ type: 'score', target: 14000 }, { type: 'starDrop', target: 2 }],
      obstacles: [{ type: 'starShard', count: 2 }, { type: 'stone', count: 8, strength: 1 }], starThresholds: [14000, 19000, 25000],
      hint: '별 조각 아래를 먼저 비워 출구까지 내려보내세요.',
    };
  }
  return {
    id: 0, title: '오늘의 특수 블록', seed: `pawpaw-daily-${dateKey}`, timeLimit: 60,
    goals: [{ type: 'score', target: 15500 }, { type: 'special', target: 5 }],
    obstacles: [{ type: 'stone', count: 10, strength: 2 }], starThresholds: [15500, 21000, 27500],
    hint: '4개와 5개 매치를 찾아 특수 블록을 적극 활용하세요.',
  };
};
