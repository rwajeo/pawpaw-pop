export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;
export const BOARD_SIZE = 8;
export const BOARD_PIXELS = 816;
export const TILE_SIZE = BOARD_PIXELS / BOARD_SIZE;

export const COLORS = {
  ink: 0x513b59,
  cream: 0xfff6e6,
  lavender: 0xd9ccff,
  mint: 0xcaf1df,
  peach: 0xffc8b8,
  sky: 0xccecff,
  yellow: 0xffe28a,
  coral: 0xff7185,
  purple: 0x7659a7,
  white: 0xffffff,
} as const;

export const STORAGE_KEY = 'pawpaw-pop-save-v1';
