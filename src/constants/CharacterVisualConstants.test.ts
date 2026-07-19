import { describe, expect, it } from 'vitest';
import { CHARACTER_ASSET_PATHS, CHARACTER_VISUALS, getWorldDepth } from './CharacterVisualConstants';

const PROCESSED_HEIGHT = 512;

describe('CharacterVisualConstants', () => {
  it('keeps all official runtime textures in processed character folders', () => {
    for (const path of Object.values(CHARACTER_ASSET_PATHS)) {
      expect(path).toMatch(/^\/assets\/images\/characters\/.+\/processed\/.+\.png$/);
    }
  });

  it('derives every display height from the normalized processed height', () => {
    expect(CHARACTER_VISUALS.HERO.scale * PROCESSED_HEIGHT).toBe(
      CHARACTER_VISUALS.HERO.displayHeight,
    );
    expect(CHARACTER_VISUALS.BUBBLE_GIRL.scale * PROCESSED_HEIGHT).toBe(
      CHARACTER_VISUALS.BUBBLE_GIRL.displayHeight,
    );
    expect(CHARACTER_VISUALS.BUBBLE_DOG.scale * PROCESSED_HEIGHT).toBe(
      CHARACTER_VISUALS.BUBBLE_DOG.displayHeight,
    );
  });

  it('limits collision bodies to the lower portion of each character', () => {
    const bodyPairs = [
      [CHARACTER_VISUALS.HERO, CHARACTER_VISUALS.HERO.standing.body],
      [CHARACTER_VISUALS.HERO, CHARACTER_VISUALS.HERO.action.body],
      [CHARACTER_VISUALS.BUBBLE_GIRL, CHARACTER_VISUALS.BUBBLE_GIRL.front.body],
      [CHARACTER_VISUALS.BUBBLE_GIRL, CHARACTER_VISUALS.BUBBLE_GIRL.side.body],
      [CHARACTER_VISUALS.BUBBLE_DOG, CHARACTER_VISUALS.BUBBLE_DOG.front.body],
      [CHARACTER_VISUALS.BUBBLE_DOG, CHARACTER_VISUALS.BUBBLE_DOG.side.body],
    ] as const;

    for (const [visual, body] of bodyPairs) {
      expect(body.height * visual.scale).toBeLessThan(visual.displayHeight / 2);
      expect(body.offsetY).toBeGreaterThan(PROCESSED_HEIGHT / 2);
    }
  });

  it('keeps world depth ordered below fixed UI depth', () => {
    expect(getWorldDepth(200)).toBeLessThan(getWorldDepth(1200));
    expect(getWorldDepth(1400)).toBeLessThan(100);
  });
});
