import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultMainStoryState,
  MainStoryManager,
  type FirstOfferChoiceId,
  type MainStoryState,
} from './MainStoryManager';

/** Builds an isolated manager and notification spy for one story rule test. */
function createManager(
  prologueComplete = true,
  overrides: Partial<MainStoryState> = {},
): { manager: MainStoryManager; onChanged: ReturnType<typeof vi.fn> } {
  const onChanged = vi.fn();
  const defaults = createDefaultMainStoryState(prologueComplete);
  const manager = new MainStoryManager(
    { ...defaults, ...overrides },
    () => prologueComplete,
    onChanged,
  );
  return { manager, onChanged };
}

describe('MainStoryManager unlock and conditions', () => {
  it('does not trigger first-offer before the tutorial is complete', () => {
    const { manager } = createManager(false);
    expect(manager.interactWithBubbleGirl()).toBeUndefined();
    expect(manager.resolveFirstOffer('accept-now').success).toBe(false);
    expect(manager.getState().mainStoryStage).toBe('prologue');
  });

  it('offers three decisions after the tutorial is complete', () => {
    const { manager } = createManager(true);
    const interaction = manager.interactWithBubbleGirl();
    expect(interaction?.kind).toBe('choices');
    if (interaction?.kind === 'choices') expect(interaction.choices).toHaveLength(3);
  });

  it('marks the energy-gated choice unavailable in pure logic', () => {
    const { manager } = createManager(true, {
      playerStats: { technique: 10, popularity: 0, conviction: 10, energy: 10 },
    });
    expect(manager.getFirstOfferChoices()[0]).toMatchObject({
      id: 'accept-now',
      enabled: false,
      unavailableReason: '需要至少 15 點體力',
    });
    expect(manager.resolveFirstOffer('accept-now').success).toBe(false);
  });
});

describe('MainStoryManager first-offer effects', () => {
  it.each([
    [
      'accept-now',
      'preparing-show',
      { technique: 10, popularity: 10, conviction: 10, energy: 85 },
      -5,
      'acceptedFirstOffer',
    ],
    [
      'train-first',
      'training-first',
      { technique: 20, popularity: 0, conviction: 15, energy: 100 },
      5,
      'choseTrainingFirst',
    ],
    [
      'small-show',
      'small-show',
      { technique: 10, popularity: 5, conviction: 13, energy: 95 },
      10,
      'negotiatedSmallShow',
    ],
  ] as const)(
    'applies every %s effect and enters %s',
    (choiceId, expectedStage, expectedStats, expectedTrust, expectedFlag) => {
      const { manager, onChanged } = createManager();
      expect(manager.resolveFirstOffer(choiceId).success).toBe(true);
      const state = manager.getState();
      expect(state.mainStoryStage).toBe(expectedStage);
      expect(state.playerStats).toEqual(expectedStats);
      expect(state.relationships.bubbleGirlTrust).toBe(expectedTrust);
      expect(state.storyFlags[expectedFlag]).toBe(true);
      expect(state.storyFlags.firstOfferResolved).toBe(true);
      expect(onChanged).toHaveBeenCalledTimes(1);
    },
  );

  it('never applies a resolved offer twice', () => {
    const { manager, onChanged } = createManager();
    expect(manager.resolveFirstOffer('small-show').success).toBe(true);
    const resolved = manager.getState();
    expect(manager.resolveFirstOffer('small-show').success).toBe(false);
    expect(manager.resolveFirstOffer('accept-now').success).toBe(false);
    expect(manager.getState()).toEqual(resolved);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps all three route stages distinct', () => {
    const stages = (['accept-now', 'train-first', 'small-show'] as FirstOfferChoiceId[]).map(
      (choiceId) => {
        const { manager } = createManager();
        manager.resolveFirstOffer(choiceId);
        return manager.getState().mainStoryStage;
      },
    );
    expect(new Set(stages).size).toBe(3);
  });

  it('uses trust in a later pure choice condition', () => {
    const { manager } = createManager();
    manager.resolveFirstOffer('train-first');
    const interaction = manager.interactWithBubbleGirl();
    expect(interaction?.kind).toBe('choices');
    if (interaction?.kind === 'choices') {
      expect(interaction.choices).toHaveLength(3);
      expect(interaction.text).toContain('練習');
    }
  });

  it('commits a route choice atomically and updates its persisted node', () => {
    const { manager, onChanged } = createManager();
    manager.resolveFirstOffer('small-show');
    const result = manager.resolveStoryChoice('c-interactive-format');
    expect(result.success).toBe(true);
    expect(manager.getState()).toMatchObject({
      mainStoryStage: 'small-show',
      chapterOneNode: 'c-space',
      chapterOneFlags: { smallShowInteractive: true },
      playerStats: { popularity: 11, energy: 85 },
      relationships: { bubbleGirlTrust: 14 },
    });
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('completes a route once and returns route-specific post-chapter dialogue', () => {
    const { manager, onChanged } = createManager();
    manager.resolveFirstOffer('small-show');
    manager.resolveStoryChoice('c-story-format');
    const completed = manager.resolveStoryChoice('c-request-space-change');
    expect(completed).toMatchObject({ success: true, chapterCompleted: true });
    expect(manager.getState()).toMatchObject({
      mainStoryStage: 'chapter-one-complete',
      chapterOneNode: 'complete',
      chapterOneOutcome: 'small-show-story-success',
    });
    expect(manager.resolveStoryChoice('c-adapt-safely').success).toBe(false);
    expect(manager.interactWithBubbleGirl()).toMatchObject({
      kind: 'message',
      text: expect.stringContaining('下一段旅程尚未開放'),
    });
    expect(onChanged).toHaveBeenCalledTimes(3);
  });
});
