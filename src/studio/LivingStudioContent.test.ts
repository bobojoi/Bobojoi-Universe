import { describe, expect, it } from 'vitest';
import {
  BUBBLE_DOG_REACTIONS,
  LIVING_STUDIO_PROPS,
  pickNonRepeatingIndex,
} from './LivingStudioContent';

describe('LivingStudioContent', () => {
  it('provides the requested amount of ambient interaction content', () => {
    expect(BUBBLE_DOG_REACTIONS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(BUBBLE_DOG_REACTIONS).size).toBe(BUBBLE_DOG_REACTIONS.length);
    expect(LIVING_STUDIO_PROPS).toHaveLength(5);
  });

  it('never repeats the previous entry when alternatives exist', () => {
    for (let previous = 0; previous < BUBBLE_DOG_REACTIONS.length; previous += 1) {
      for (const random of [0, 0.2, 0.5, 0.8, 0.999999]) {
        expect(
          pickNonRepeatingIndex(BUBBLE_DOG_REACTIONS.length, previous, random),
        ).not.toBe(previous);
      }
    }
  });

  it('safely handles empty, singleton, and damaged selector input', () => {
    expect(pickNonRepeatingIndex(0, -1, 0.5)).toBe(-1);
    expect(pickNonRepeatingIndex(1, 0, 0.5)).toBe(0);
    expect(pickNonRepeatingIndex(3, -1, Number.NaN)).toBe(0);
  });
});
