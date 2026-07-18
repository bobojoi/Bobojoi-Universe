/** Stable scene keys avoid string duplication throughout the project. */
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  STUDIO: 'StudioScene',
} as const;

/** Runtime texture keys for the first-version placeholder art. */
export const TEXTURE_KEYS = {
  PLAYER: 'player-placeholder',
  BUBBLE_GIRL: 'bubble-girl-placeholder',
  BUBBLE_DOG: 'bubble-dog-placeholder',
} as const;

/** Shared visual colors keep programmatic art consistent. */
export const COLORS = {
  NIGHT: 0x10132f,
  FLOOR: 0x272b54,
  FLOOR_LINE: 0x3b4075,
  MINT: 0x78f0cf,
  PINK: 0xff78b7,
  GOLD: 0xffd66b,
  WHITE: 0xf8f5ff,
  INK: 0x15172c,
  PANEL: 0x171a39,
} as const;

/** Layer depths define a predictable rendering contract for future scenes. */
export const DEPTH = {
  BACKGROUND: 0,
  WORLD_DECORATION: 10,
  CHARACTER: 20,
  UI: 100,
  DIALOGUE: 110,
} as const;
