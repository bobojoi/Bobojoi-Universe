import { describe, expect, it } from 'vitest';
import {
  DOG_AVOID_RADIUS,
  DOG_FOLLOW_MAX_DISTANCE,
  DOG_FOLLOW_MIN_DISTANCE,
  getBubbleDogCompanionTarget,
  isBubbleDogBlocking,
} from './BubbleDogPositioning';

const BOUNDS = { width: 2200, height: 1400, margin: 80 } as const;

describe('BubbleDogPositioning', () => {
  it('places the companion at a side-rear distance from the player', () => {
    const player = { x: 600, y: 600 };
    const target = getBubbleDogCompanionTarget(player, { x: 1, y: 0 }, -1, [], BOUNDS);
    const distance = Math.hypot(target.x - player.x, target.y - player.y);

    expect(target.x).toBeLessThan(player.x);
    expect(target.y).toBeLessThan(player.y);
    expect(distance).toBeGreaterThanOrEqual(DOG_FOLLOW_MIN_DISTANCE);
    expect(distance).toBeLessThanOrEqual(DOG_FOLLOW_MAX_DISTANCE);
  });

  it('switches sides when the preferred target overlaps an interaction point', () => {
    const player = { x: 600, y: 600 };
    const blockedPreferredSide = { x: 522, y: 490 };
    const target = getBubbleDogCompanionTarget(
      player,
      { x: 1, y: 0 },
      -1,
      [blockedPreferredSide],
      BOUNDS,
    );

    expect(Math.hypot(target.x - blockedPreferredSide.x, target.y - blockedPreferredSide.y))
      .toBeGreaterThanOrEqual(DOG_AVOID_RADIUS);
  });

  it('detects protected interaction locations', () => {
    expect(isBubbleDogBlocking({ x: 100, y: 100 }, [{ x: 150, y: 100 }])).toBe(true);
    expect(isBubbleDogBlocking({ x: 100, y: 100 }, [{ x: 300, y: 100 }])).toBe(false);
  });
});
