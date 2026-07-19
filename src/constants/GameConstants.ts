/** Stable scene keys avoid string duplication throughout the project. */
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  STUDIO: 'StudioScene',
} as const;

/** Runtime texture keys for the official Bobojoi character art. */
export const TEXTURE_KEYS = {
  PLAYER_STANDING: 'bubble-hero-standing',
  PLAYER_ACTION: 'bubble-hero-action',
  BUBBLE_GIRL_FRONT: 'bubble-girl-front',
  BUBBLE_GIRL_SIDE: 'bubble-girl-side',
  BUBBLE_DOG_FRONT: 'bubble-dog-front',
  BUBBLE_DOG_SIDE: 'bubble-dog-side',
} as const;

/** Stable audio keys keep scene code independent of file names and track metadata. */
export const AUDIO_KEYS = {
  TITLE: 'bgm-title-floating-ring',
  STUDIO: 'bgm-studio-bubble-realm',
  MISSION: 'bgm-mission-starlight',
  PERFORMANCE: 'bgm-performance-bubble-show',
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
  WALL: 0x4a4059,
  WALL_SHADOW: 0x342f49,
  WOOD: 0x9a6748,
  WOOD_DARK: 0x70442f,
  CREAM: 0xffedcf,
  LEAF: 0x4d9b75,
} as const;

/** Layer depths define a predictable rendering contract for future scenes. */
export const DEPTH = {
  BACKGROUND: 0,
  WORLD_DECORATION: 10,
  CHARACTER: 20,
  UI: 100,
  DIALOGUE: 110,
} as const;
