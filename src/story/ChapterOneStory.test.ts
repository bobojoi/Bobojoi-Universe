import { describe, expect, it } from 'vitest';
import {
  createDefaultChapterOneState,
  getChapterOneInteraction,
  getChapterOneSummary,
  normalizeChapterOneState,
  resolveChapterOneChoice,
  type ChapterOneChoiceId,
  type ChapterOneNode,
  type ChapterOneRoute,
  type ChapterOneState,
} from './ChapterOneStory';
import { PlayerProgress } from './PlayerProgress';

const BASE_STATS = { technique: 20, popularity: 20, conviction: 20, energy: 80 };
const BASE_RELATIONSHIPS = { bubbleGirlTrust: 10 };

/** Creates progression values that satisfy every chapter condition by default. */
function createProgress(
  stats = BASE_STATS,
  bubbleGirlTrust = BASE_RELATIONSHIPS.bubbleGirlTrust,
): PlayerProgress {
  return new PlayerProgress(stats, { bubbleGirlTrust });
}

/** Creates one focused state without exposing flag construction to each test. */
function createState(node: ChapterOneNode): ChapterOneState {
  return { ...createDefaultChapterOneState(), chapterOneNode: node };
}

/** Applies one pure resolution to detached progress for multi-event route tests. */
function choose(
  state: ChapterOneState,
  route: ChapterOneRoute,
  choiceId: ChapterOneChoiceId,
  progress: PlayerProgress,
): { state: ChapterOneState; progress: PlayerProgress } {
  const result = resolveChapterOneChoice(state, route, choiceId, progress);
  expect(result.success).toBe(true);
  expect(result.nextState).toBeDefined();
  expect(result.effects).toBeDefined();
  const snapshot = progress.getSnapshot();
  const nextProgress = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
  nextProgress.applyEffects(result.effects ?? {});
  return { state: result.nextState ?? state, progress: nextProgress };
}

describe('ChapterOneStory choice effects', () => {
  it.each([
    ['accepted-offer', 'a-preparation', 'a-safe-routine', 'preparedSafeRoutine', { technique: 26, popularity: 20, conviction: 20, energy: 70 }, 13],
    ['accepted-offer', 'a-preparation', 'a-risky-routine', 'preparedRiskyRoutine', { technique: 23, popularity: 20, conviction: 26, energy: 65 }, 7],
    ['accepted-offer', 'a-preparation', 'a-audience-plan', 'preparedAudiencePlan', { technique: 20, popularity: 24, conviction: 20, energy: 73 }, 16],
    ['accepted-offer', 'a-extra-time', 'a-accept-extra-time', 'acceptedExtraTime', { technique: 20, popularity: 27, conviction: 18, energy: 68 }, 8],
    ['accepted-offer', 'a-extra-time', 'a-decline-extra-time', 'keptOriginalAgreement', { technique: 20, popularity: 18, conviction: 26, energy: 80 }, 14],
    ['accepted-offer', 'a-extra-time', 'a-negotiate-extra-time', 'negotiatedExtraTime', { technique: 20, popularity: 25, conviction: 23, energy: 75 }, 16],
    ['accepted-offer', 'a-mistake-response', 'a-admit-mistake', 'admittedShowMistake', { technique: 20, popularity: 18, conviction: 25, energy: 80 }, 16],
    ['accepted-offer', 'a-mistake-response', 'a-conceal-mistake', 'concealedShowMistake', { technique: 20, popularity: 22, conviction: 15, energy: 80 }, 4],
    ['training-first', 'b-training', 'b-train-basics', 'trainedBasics', { technique: 28, popularity: 20, conviction: 20, energy: 72 }, 14],
    ['training-first', 'b-training', 'b-original-style', 'trainedOriginalStyle', { technique: 25, popularity: 20, conviction: 27, energy: 68 }, 10],
    ['training-first', 'b-training', 'b-study-audience', 'studiedAudience', { technique: 23, popularity: 24, conviction: 20, energy: 80 }, 12],
    ['training-first', 'b-preview', 'b-accept-preview', 'acceptedFreePreview', { technique: 24, popularity: 26, conviction: 18, energy: 70 }, 10],
    ['training-first', 'b-preview', 'b-refuse-preview', 'refusedFreePreview', { technique: 20, popularity: 19, conviction: 27, energy: 80 }, 13],
    ['training-first', 'b-preview', 'b-negotiate-preview', 'negotiatedPreview', { technique: 22, popularity: 25, conviction: 23, energy: 75 }, 15],
    ['small-show', 'c-format', 'c-visual-format', 'smallShowVisual', { technique: 25, popularity: 23, conviction: 20, energy: 72 }, 10],
    ['small-show', 'c-format', 'c-interactive-format', 'smallShowInteractive', { technique: 20, popularity: 26, conviction: 20, energy: 70 }, 14],
    ['small-show', 'c-format', 'c-story-format', 'smallShowStory', { technique: 22, popularity: 24, conviction: 26, energy: 70 }, 10],
    ['small-show', 'c-space', 'c-adapt-safely', 'adaptedSafely', { technique: 20, popularity: 22, conviction: 22, energy: 80 }, 16],
    ['small-show', 'c-space', 'c-request-space-change', 'requestedSpaceChange', { technique: 20, popularity: 23, conviction: 25, energy: 80 }, 13],
    ['small-show', 'c-space', 'c-perform-tight-space', 'performedInTightSpace', { technique: 24, popularity: 20, conviction: 20, energy: 72 }, 8],
  ] as const)(
    'applies %s / %s choice %s exactly once',
    (route, node, choiceId, expectedFlag, expectedStats, expectedTrust) => {
      const progress = createProgress();
      const result = resolveChapterOneChoice(createState(node), route, choiceId, progress);
      expect(result.success).toBe(true);
      expect(result.nextState?.chapterOneFlags[expectedFlag]).toBe(true);
      const nextProgress = createProgress();
      nextProgress.applyEffects(result.effects ?? {});
      expect(nextProgress.getSnapshot()).toEqual({
        playerStats: expectedStats,
        relationships: { bubbleGirlTrust: expectedTrust },
      });
    },
  );

  it('rejects replaying a confirmed choice without returning effects', () => {
    const first = resolveChapterOneChoice(
      createState('a-preparation'),
      'accepted-offer',
      'a-safe-routine',
      createProgress(),
    );
    const replay = resolveChapterOneChoice(
      first.nextState ?? createState('a-preparation'),
      'accepted-offer',
      'a-safe-routine',
      createProgress(),
    );
    expect(replay.success).toBe(false);
    expect(replay.effects).toBeUndefined();
  });

  it('rejects a choice from a non-current route or node', () => {
    expect(
      resolveChapterOneChoice(
        createState('b-training'),
        'training-first',
        'c-visual-format',
        createProgress(),
      ).success,
    ).toBe(false);
  });
});

describe('ChapterOneStory conditions', () => {
  it.each([
    ['accepted-offer', 'a-preparation', 'a-risky-routine', { technique: 14, popularity: 0, conviction: 20, energy: 80 }, 10, '技藝至少需要 15'],
    ['accepted-offer', 'a-extra-time', 'a-negotiate-extra-time', BASE_STATS, -1, '泡妞目前不信任'],
    ['training-first', 'b-training', 'b-original-style', { technique: 20, popularity: 0, conviction: 9, energy: 80 }, 10, '信念至少需要 10'],
    ['training-first', 'b-preview', 'b-negotiate-preview', BASE_STATS, 4, '泡妞信任至少需要 5'],
    ['small-show', 'c-format', 'c-story-format', { technique: 20, popularity: 0, conviction: 11, energy: 80 }, 10, '信念至少需要 12'],
    ['small-show', 'c-space', 'c-request-space-change', BASE_STATS, 4, '泡妞信任至少需要 5'],
  ] as const)(
    'disables %s condition at %s',
    (route, node, choiceId, stats, trust, reason) => {
      const progress = createProgress(stats, trust);
      const interaction = getChapterOneInteraction(createState(node), route, progress);
      expect(interaction?.choices.find(({ id }) => id === choiceId)).toMatchObject({
        enabled: false,
        unavailableReason: expect.stringContaining(reason),
      });
      expect(resolveChapterOneChoice(createState(node), route, choiceId, progress).success).toBe(false);
    },
  );
});

describe('ChapterOneStory deterministic outcomes', () => {
  it.each([
    ['a-safe-routine', 'a-decline-extra-time', 'show-stable'],
    ['a-risky-routine', 'a-decline-extra-time', 'show-memorable'],
    ['a-safe-routine', 'a-accept-extra-time', 'show-exhausting'],
  ] as const)('resolves route A %s + %s as %s', (firstChoice, secondChoice, outcome) => {
    let flow = choose(createState('a-preparation'), 'accepted-offer', firstChoice, createProgress());
    flow = choose(flow.state, 'accepted-offer', secondChoice, flow.progress);
    expect(flow.state).toMatchObject({ chapterOneNode: 'complete', chapterOneOutcome: outcome });
  });

  it('routes a low-energy risky show through a one-shot mistake response', () => {
    const lowEnergy = createProgress({ ...BASE_STATS, energy: 45 });
    let flow = choose(createState('a-preparation'), 'accepted-offer', 'a-risky-routine', lowEnergy);
    flow = choose(flow.state, 'accepted-offer', 'a-decline-extra-time', flow.progress);
    expect(flow.state).toMatchObject({
      chapterOneNode: 'a-mistake-response',
      chapterOneOutcome: 'show-mistake',
    });
    flow = choose(flow.state, 'accepted-offer', 'a-admit-mistake', flow.progress);
    expect(flow.state).toMatchObject({ chapterOneNode: 'complete', chapterOneOutcome: 'show-mistake' });
  });

  it.each([
    ['b-train-basics', 'b-refuse-preview', 'training-solid'],
    ['b-original-style', 'b-refuse-preview', 'training-original'],
    ['b-study-audience', 'b-accept-preview', 'preview-successful'],
    ['b-study-audience', 'b-refuse-preview', 'held-principle'],
  ] as const)('resolves route B %s + %s as %s', (firstChoice, secondChoice, outcome) => {
    let flow = choose(createState('b-training'), 'training-first', firstChoice, createProgress());
    flow = choose(flow.state, 'training-first', secondChoice, flow.progress);
    expect(flow.state).toMatchObject({ chapterOneNode: 'complete', chapterOneOutcome: outcome });
  });

  it.each([
    ['c-visual-format', 'c-adapt-safely', 'small-show-safe'],
    ['c-interactive-format', 'c-adapt-safely', 'small-show-interactive-success'],
    ['c-story-format', 'c-request-space-change', 'small-show-story-success'],
    ['c-visual-format', 'c-perform-tight-space', 'small-show-compromised'],
  ] as const)('resolves route C %s + %s as %s', (firstChoice, secondChoice, outcome) => {
    let flow = choose(createState('c-format'), 'small-show', firstChoice, createProgress());
    flow = choose(flow.state, 'small-show', secondChoice, flow.progress);
    expect(flow.state).toMatchObject({ chapterOneNode: 'complete', chapterOneOutcome: outcome });
  });
});

describe('ChapterOneStory normalization and future queries', () => {
  it('repairs cross-route and mutually exclusive flags with definition-order priority', () => {
    const normalized = normalizeChapterOneState(
      {
        chapterOneNode: 'c-space',
        chapterOneFlags: {
          preparedSafeRoutine: true,
          preparedRiskyRoutine: true,
          trainedBasics: true,
        },
      },
      'accepted-offer',
      false,
    );
    expect(normalized.chapterOneNode).toBe('a-extra-time');
    expect(normalized.chapterOneFlags).toMatchObject({
      preparedSafeRoutine: true,
      preparedRiskyRoutine: false,
      trainedBasics: false,
    });
  });

  it('repairs an abnormal completed legacy save with a safe typed outcome', () => {
    expect(normalizeChapterOneState({}, 'training-first', true)).toMatchObject({
      chapterOneNode: 'complete',
      chapterOneOutcome: 'legacy-complete',
    });
  });

  it('rejects a completed outcome that belongs to another route', () => {
    expect(
      normalizeChapterOneState(
        { chapterOneOutcome: 'show-memorable' },
        'training-first',
        true,
      ).chapterOneOutcome,
    ).toBe('legacy-complete');
  });

  it('derives second-chapter facts from flags and outcome', () => {
    const state = normalizeChapterOneState(
      {
        chapterOneOutcome: 'small-show-interactive-success',
        chapterOneFlags: { smallShowInteractive: true, requestedSpaceChange: true },
      },
      'small-show',
      true,
    );
    expect(getChapterOneSummary(state, 'small-show')).toEqual({
      route: 'small-show',
      hasShowExperience: true,
      heldAgreement: false,
      developedOriginalDirection: false,
      builtAudienceInteraction: true,
      overextended: false,
      receivedFollowUpInvitation: true,
    });
  });
});
