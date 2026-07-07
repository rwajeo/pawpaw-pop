import type { CharacterDefinition, CharacterId } from '../types';

export const CHARACTERS: readonly CharacterDefinition[] = [
  { id: 'momo', name: '모모', englishName: 'Momo', animal: '복숭아 고양이', bodyColor: 0xff9a8f, accentColor: 0xffd1c9, outlineColor: 0x763f52, pattern: 'dots', boardSymbol: '●', silhouette: 'round', expression: 'cheery' },
  { id: 'lulu', name: '루루', englishName: 'Lulu', animal: '주황 여우', bodyColor: 0xffb34d, accentColor: 0xffe0a3, outlineColor: 0x754026, pattern: 'stripes', boardSymbol: '≋', silhouette: 'fox', expression: 'brave' },
  { id: 'bomi', name: '보미', englishName: 'Bomi', animal: '하늘 토끼', bodyColor: 0x62c8e8, accentColor: 0xd8f7ff, outlineColor: 0x285977, pattern: 'chevrons', boardSymbol: '⌄', silhouette: 'long-ear', expression: 'gentle' },
  { id: 'dudu', name: '두두', englishName: 'Dudu', animal: '민트 판다', bodyColor: 0x62d5b4, accentColor: 0xd7fff2, outlineColor: 0x286151, pattern: 'cross', boardSymbol: '✚', silhouette: 'bear', expression: 'sleepy' },
  { id: 'piyo', name: '피요', englishName: 'Piyo', animal: '노랑 병아리', bodyColor: 0xf2ca52, accentColor: 0xfff2ad, outlineColor: 0x735b21, pattern: 'waves', boardSymbol: '≈', silhouette: 'bird', expression: 'curious' },
  { id: 'nunu', name: '누누', englishName: 'Nunu', animal: '연보라 아홀로틀', bodyColor: 0xc797e8, accentColor: 0xf5dcff, outlineColor: 0x664475, pattern: 'diamonds', boardSymbol: '◆', silhouette: 'fluffy', expression: 'dreamy' },
  { id: 'tori', name: '토리', englishName: 'Tori', animal: '연갈색 곰', bodyColor: 0xd9a46f, accentColor: 0xffe1bb, outlineColor: 0x724a30, pattern: 'rings', boardSymbol: '◎', silhouette: 'bear', expression: 'mischievous' },
  { id: 'kongi', name: '콩이', englishName: 'Kongi', animal: '연두 강아지', bodyColor: 0x9acb69, accentColor: 0xe4f8bd, outlineColor: 0x45622f, pattern: 'sprinkles', boardSymbol: '✦', silhouette: 'puppy', expression: 'loyal' },
] as const;

export const CHARACTER_BY_ID: Readonly<Record<CharacterId, CharacterDefinition>> = Object.freeze(
  Object.fromEntries(CHARACTERS.map((character) => [character.id, character])) as Record<CharacterId, CharacterDefinition>,
);

export const ALL_CHARACTER_IDS = CHARACTERS.map((character) => character.id) as readonly CharacterId[];
