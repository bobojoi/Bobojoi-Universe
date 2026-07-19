import { DEPTH, TEXTURE_KEYS } from './GameConstants';

/** Processed files share one height and transparent safety padding. */
const PROCESSED_TEXTURE_HEIGHT = 512;
const PROCESSED_CONTENT_BOTTOM = 496;
const WORLD_DEPTH_Y_FACTOR = 0.01;

/** Runtime uses transparent, normalized derivatives while preserving full originals in public. */
export const CHARACTER_ASSET_PATHS = {
  HERO_STANDING: '/assets/images/characters/bubble-hero/processed/hero-standing-game.png',
  HERO_ACTION: '/assets/images/characters/bubble-hero/processed/hero-action-game.png',
  GIRL_FRONT: '/assets/images/characters/bubble-girl/processed/girl-front-game.png',
  GIRL_SIDE: '/assets/images/characters/bubble-girl/processed/girl-side-game.png',
  DOG_FRONT: '/assets/images/characters/bubble-dog/processed/dog-front-game.png',
  DOG_SIDE: '/assets/images/characters/bubble-dog/processed/dog-side-game.png',
} as const;

/** Body geometry uses source pixels and is scaled with its owning sprite. */
export interface CharacterBodyVisual {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/** One texture orientation with a matching feet-only collision footprint. */
export interface CharacterTextureVisual {
  texture: string;
  body: CharacterBodyVisual;
}

/** Shared art layout prevents scale, origin, and collision magic numbers in actors. */
export const CHARACTER_VISUALS = {
  HERO: {
    displayHeight: 150,
    scale: 150 / PROCESSED_TEXTURE_HEIGHT,
    originX: 0.5,
    originY: PROCESSED_CONTENT_BOTTOM / PROCESSED_TEXTURE_HEIGHT,
    standing: {
      texture: TEXTURE_KEYS.PLAYER_STANDING,
      body: { width: 150, height: 112, offsetX: 145, offsetY: 384 },
    },
    action: {
      texture: TEXTURE_KEYS.PLAYER_ACTION,
      body: { width: 150, height: 112, offsetX: 152, offsetY: 384 },
    },
  },
  BUBBLE_GIRL: {
    displayHeight: 142,
    scale: 142 / PROCESSED_TEXTURE_HEIGHT,
    originX: 0.5,
    originY: PROCESSED_CONTENT_BOTTOM / PROCESSED_TEXTURE_HEIGHT,
    front: {
      texture: TEXTURE_KEYS.BUBBLE_GIRL_FRONT,
      body: { width: 152, height: 96, offsetX: 189, offsetY: 400 },
    },
    side: {
      texture: TEXTURE_KEYS.BUBBLE_GIRL_SIDE,
      body: { width: 126, height: 96, offsetX: 120, offsetY: 400 },
    },
  },
  BUBBLE_DOG: {
    displayHeight: 112,
    scale: 112 / PROCESSED_TEXTURE_HEIGHT,
    originX: 0.5,
    originY: PROCESSED_CONTENT_BOTTOM / PROCESSED_TEXTURE_HEIGHT,
    front: {
      texture: TEXTURE_KEYS.BUBBLE_DOG_FRONT,
      body: { width: 152, height: 92, offsetX: 126, offsetY: 404 },
    },
    side: {
      texture: TEXTURE_KEYS.BUBBLE_DOG_SIDE,
      body: { width: 136, height: 92, offsetX: 118, offsetY: 404 },
    },
  },
} as const;

/** Orders feet and furniture by world Y while keeping every world object below UI. */
export function getWorldDepth(y: number): number {
  return DEPTH.WORLD_DECORATION + y * WORLD_DEPTH_Y_FACTOR;
}
