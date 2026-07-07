import type { AchievementDefinition } from '../types';

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first_stage', title: '첫 발자국', description: '첫 스테이지를 완료하세요.', icon: '🏁', target: 1, stat: 'stagesCompleted' },
  { id: 'combo_5', title: '통통 콤보', description: '5콤보를 달성하세요.', icon: '✨', target: 5, stat: 'bestCombo' },
  { id: 'combo_10', title: '포포 콤보!', description: '10콤보를 달성하세요.', icon: '🌟', target: 10, stat: 'bestCombo' },
  { id: 'rockets_20', title: '로켓 배송', description: '로켓을 20번 사용하세요.', icon: '🚀', target: 20, stat: 'rocketsUsed' },
  { id: 'bombs_10', title: '발바닥 쾅!', description: '포포 폭탄을 10번 사용하세요.', icon: '💥', target: 10, stat: 'bombsUsed' },
  { id: 'first_rainbow', title: '무지개 발견', description: '무지개 별을 처음 만드세요.', icon: '🌈', target: 1, stat: 'rainbowsCreated' },
  { id: 'stars_30', title: '별 수집가', description: '별을 누적 30개 획득하세요.', icon: '⭐', target: 30, stat: 'starsEarned' },
  { id: 'all_stages', title: '포포 마스터', description: '20개 스테이지를 모두 완료하세요.', icon: '🏆', target: 20, stat: 'stagesCompleted' },
] as const;
