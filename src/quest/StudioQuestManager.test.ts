import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultStudioQuestState,
  normalizeStudioQuestState,
  StudioQuestManager,
} from './StudioQuestManager';

/** Creates a manager with an isolated notification spy for rule-level tests. */
function createManager(stage: ReturnType<StudioQuestManager['getState']>['stage']) {
  return new StudioQuestManager(
    { ...createDefaultStudioQuestState(), stage },
    vi.fn(),
  );
}

describe('StudioQuestManager stage truth', () => {
  it('persists only stage and investigations', () => {
    expect(createManager('ring-collected').getState()).toEqual({
      stage: 'ring-collected',
      investigated: { 'prop-box': false, 'bubble-table': false, 'dog-mat': false },
    });
  });

  it('ignores removed legacy flags in current-version normalization', () => {
    expect(
      normalizeStudioQuestState({ stage: 'not-started', ringCollected: true, completed: true }),
    ).toEqual(createDefaultStudioQuestState());
  });

  it.each([
    ['not-started', false, false, false],
    ['in-progress', false, false, false],
    ['ring-discovered', true, false, false],
    ['ring-collected', false, true, false],
    ['completed', false, true, true],
  ] as const)(
    'derives queries for %s',
    (stage, canCollectRing, isRingCollected, isCompleted) => {
      const manager = createManager(stage);
      expect(manager.canCollectRing()).toBe(canCollectRing);
      expect(manager.isRingCollected()).toBe(isRingCollected);
      expect(manager.isCompleted()).toBe(isCompleted);
    },
  );

  it('keeps collectRing as the final state guard', () => {
    const manager = createManager('in-progress');
    expect(manager.collectRing().events).toBeUndefined();
    expect(manager.getState().stage).toBe('in-progress');
  });

  it('collects only while the ring is available', () => {
    const manager = createManager('ring-discovered');
    expect(manager.collectRing().events).toEqual(['ring-collected']);
    expect(manager.getState().stage).toBe('ring-collected');
  });
});
