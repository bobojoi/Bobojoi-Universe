import { describe, expect, it } from 'vitest';
import {
  createDefaultPlayerStats,
  createDefaultRelationships,
  PlayerProgress,
  type PlayerStatId,
} from './PlayerProgress';

/** Creates an isolated default progression model for each boundary assertion. */
function createProgress(): PlayerProgress {
  return new PlayerProgress(createDefaultPlayerStats(), createDefaultRelationships());
}

describe('PlayerProgress', () => {
  it('creates the required initial values', () => {
    expect(createProgress().getSnapshot()).toEqual({
      playerStats: { technique: 10, popularity: 0, conviction: 10, energy: 100 },
      relationships: { bubbleGirlTrust: 0 },
    });
  });

  it.each([
    ['technique', 500, 100],
    ['technique', -500, 0],
    ['popularity', 500, 100],
    ['popularity', -500, 0],
    ['conviction', 500, 100],
    ['conviction', -500, 0],
    ['energy', 500, 100],
    ['energy', -500, 0],
  ] as const)('clamps %s after a delta of %s', (stat, delta, expected) => {
    const progress = createProgress();
    progress.applyEffects({ stats: { [stat]: delta } as Partial<Record<PlayerStatId, number>> });
    expect(progress.getStat(stat)).toBe(expected);
  });

  it.each([
    [500, 100],
    [-500, -100],
  ] as const)('clamps BubbleGirl trust after a delta of %s', (delta, expected) => {
    const progress = createProgress();
    progress.applyEffects({ bubbleGirlTrust: delta });
    expect(progress.getBubbleGirlTrust()).toBe(expected);
  });

  it('rejects non-finite changes without corrupting values', () => {
    const progress = createProgress();
    progress.applyEffects({ stats: { energy: Number.NaN }, bubbleGirlTrust: Number.POSITIVE_INFINITY });
    expect(progress.getSnapshot()).toEqual({
      playerStats: createDefaultPlayerStats(),
      relationships: createDefaultRelationships(),
    });
  });
});
