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

  it('completes a route once and enters history-aware chapter two on next interaction', () => {
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
      text: expect.stringContaining('原創方向'),
    });
    expect(onChanged).toHaveBeenCalledTimes(4);
  });
});

describe('MainStoryManager chapter two integration', () => {
  /** Completes chapter one through the story route used by integration assertions. */
  function completeChapterOne(manager: MainStoryManager): void {
    manager.resolveFirstOffer('train-first');
    manager.resolveStoryChoice('b-study-audience');
    manager.resolveStoryChoice('b-refuse-preview');
  }

  /** Advances the three confirmed opening messages to the first commercial choices. */
  function advanceChapterTwoOpening(manager: MainStoryManager): void {
    manager.interactWithBubbleGirl();
    manager.interactWithBubbleGirl();
    manager.interactWithBubbleGirl();
  }

  it('keeps chapter two locked before chapter one completion', () => {
    const { manager } = createManager();
    expect(manager.getState().chapterTwoNode).toBe('not-started');
    expect(manager.resolveStoryChoice('define-values').success).toBe(false);
  });

  it('advances first chapter history into the chapter-two intro and discussion', () => {
    const { manager } = createManager();
    completeChapterOne(manager);
    expect(manager.getState().mainStoryStage).toBe('chapter-one-complete');
    const firstChapterFlags = manager.getState().chapterOneFlags;

    expect(manager.interactWithBubbleGirl()).toMatchObject({
      kind: 'message',
      text: expect.stringContaining('正式邀約'),
    });
    expect(manager.getState()).toMatchObject({
      mainStoryStage: 'agency-offer',
      chapterTwoNode: 'agency-first-contact',
      chapterOneFlags: firstChapterFlags,
    });

    manager.interactWithBubbleGirl();
    manager.interactWithBubbleGirl();
    const discussion = manager.interactWithBubbleGirl();
    expect(discussion?.kind).toBe('choices');
    if (discussion?.kind === 'choices') expect(discussion.choices).toHaveLength(3);
  });

  it('completes chapter two once without changing chapter-one history', () => {
    const { manager, onChanged } = createManager();
    completeChapterOne(manager);
    const firstChapterState = {
      outcome: manager.getState().chapterOneOutcome,
      flags: manager.getState().chapterOneFlags,
    };
    advanceChapterTwoOpening(manager);

    expect(manager.resolveStoryChoice('prepare-compromise').success).toBe(true);
    expect(manager.resolveStoryChoice('propose-compromise').success).toBe(true);
    const completed = manager.resolveStoryChoice('request-paid-preview');
    expect(completed).toMatchObject({
      success: true,
      chapterCompleted: true,
      completionLabel: '第二章完成：成功的代價',
    });
    expect(manager.getState()).toMatchObject({
      mainStoryStage: 'chapter-two-complete',
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'agencyRespectEarned',
      chapterOneOutcome: firstChapterState.outcome,
      chapterOneFlags: firstChapterState.flags,
    });
    const notificationCount = onChanged.mock.calls.length;
    expect(manager.resolveStoryChoice('complete-preview').success).toBe(false);
    expect(manager.interactWithBubbleGirl()).toMatchObject({
      kind: 'message',
      text: expect.stringContaining('下一段旅程尚未開放'),
    });
    expect(onChanged).toHaveBeenCalledTimes(notificationCount);
  });
});
