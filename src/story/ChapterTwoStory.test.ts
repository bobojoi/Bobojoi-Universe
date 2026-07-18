import { describe, expect, it } from 'vitest';
import {
  createDefaultChapterOneState,
  type ChapterOneFlags,
  type ChapterOneOutcome,
  type ChapterOneSummary,
} from './ChapterOneStory';
import {
  createDefaultChapterTwoState,
  getChapterTwoInteraction,
  getChapterTwoSummary,
  normalizeChapterTwoState,
  resolveChapterTwoChoice,
  type ChapterOneHistoryContext,
  type ChapterTwoChoiceId,
  type ChapterTwoNode,
  type ChapterTwoState,
} from './ChapterTwoStory';
import { PlayerProgress } from './PlayerProgress';

const BASE_STATS = { technique: 30, popularity: 30, conviction: 30, energy: 80 };

/** Builds progression that satisfies every condition unless a test overrides it. */
function createProgress(
  stats = BASE_STATS,
  bubbleGirlTrust = 20,
): PlayerProgress {
  return new PlayerProgress(stats, { bubbleGirlTrust });
}

/** Creates detached first-chapter history used by chapter-two pure rules. */
function createHistory(
  overrides: Partial<ChapterOneSummary> = {},
  outcome: ChapterOneOutcome = 'show-stable',
  flagOverrides: Partial<ChapterOneFlags> = {},
): ChapterOneHistoryContext {
  const chapterOneFlags = {
    ...createDefaultChapterOneState().chapterOneFlags,
    ...flagOverrides,
  };
  return {
    outcome,
    flags: chapterOneFlags,
    summary: {
      route: 'accepted-offer',
      hasShowExperience: true,
      heldAgreement: false,
      developedOriginalDirection: false,
      builtAudienceInteraction: false,
      overextended: false,
      receivedFollowUpInvitation: false,
      ...overrides,
    },
  };
}

/** Creates one current node with empty second-chapter history. */
function createState(node: ChapterTwoNode): ChapterTwoState {
  return { ...createDefaultChapterTwoState(true), chapterTwoNode: node };
}

/** Applies one resolution to detached progression for multi-stage route tests. */
function choose(
  state: ChapterTwoState,
  choiceId: ChapterTwoChoiceId,
  progress: PlayerProgress,
  history = createHistory(),
): { state: ChapterTwoState; progress: PlayerProgress } {
  const result = resolveChapterTwoChoice(state, choiceId, progress, history);
  expect(result.success).toBe(true);
  expect(result.effects).toBeDefined();
  expect(result.nextState).toBeDefined();
  const snapshot = progress.getSnapshot();
  const nextProgress = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
  nextProgress.applyEffects(result.effects ?? {});
  return { state: result.nextState ?? state, progress: nextProgress };
}

describe('ChapterTwoStory choice effects', () => {
  it.each([
    ['team-discussion', 'discuss-quickly', 'acceptedDiscussionQuickly', { technique: 30, popularity: 36, conviction: 28, energy: 77 }, 18, undefined],
    ['team-discussion', 'define-values', 'definedCoreValuesFirst', { technique: 30, popularity: 29, conviction: 35, energy: 80 }, 24, undefined],
    ['team-discussion', 'prepare-compromise', 'preparedCompromiseTogether', { technique: 30, popularity: 33, conviction: 32, energy: 78 }, 25, undefined],
    ['proposal-decision', 'accept-agency-style', 'acceptedAgencyStyle', { technique: 30, popularity: 42, conviction: 22, energy: 70 }, 14, undefined],
    ['proposal-decision', 'keep-original-style', 'keptOriginalStyle', { technique: 30, popularity: 25, conviction: 40, energy: 80 }, 26, undefined],
    ['proposal-decision', 'propose-compromise', 'compromisedAgencyStyle', { technique: 30, popularity: 37, conviction: 35, energy: 72 }, 26, undefined],
    ['client-response', 'accept-final-demand', 'acceptedFinalClientDemand', { technique: 30, popularity: 35, conviction: 26, energy: 74 }, 17, 'acceptedAgencyStyle'],
    ['client-response', 'limit-final-demand', 'limitedFinalClientDemand', { technique: 30, popularity: 33, conviction: 32, energy: 80 }, 22, 'acceptedAgencyStyle'],
    ['client-response', 'accept-smaller-stage', 'acceptedSmallerAuthenticStage', { technique: 30, popularity: 32, conviction: 35, energy: 80 }, 24, 'keptOriginalStyle'],
    ['client-response', 'walk-away', 'walkedAwayFromAgency', { technique: 30, popularity: 26, conviction: 38, energy: 80 }, 22, 'keptOriginalStyle'],
    ['client-response', 'reopen-negotiation', 'reopenedNegotiation', { technique: 30, popularity: 34, conviction: 34, energy: 75 }, 25, 'keptOriginalStyle'],
    ['client-response', 'complete-preview', 'completedAgencyPreview', { technique: 33, popularity: 35, conviction: 30, energy: 70 }, 22, 'compromisedAgencyStyle'],
    ['client-response', 'submit-limited-preview', 'submittedLimitedPreview', { technique: 30, popularity: 32, conviction: 33, energy: 76 }, 24, 'compromisedAgencyStyle'],
    ['client-response', 'request-paid-preview', 'requestedPaidPreview', { technique: 30, popularity: 31, conviction: 35, energy: 80 }, 25, 'compromisedAgencyStyle'],
  ] as const)(
    'applies %s choice %s exactly',
    (node, choiceId, expectedFlag, expectedStats, expectedTrust, routeFlag) => {
      const state = createState(node);
      if (routeFlag) state.chapterTwoFlags[routeFlag] = true;
      const history = choiceId === 'request-paid-preview'
        ? createHistory({ heldAgreement: true })
        : createHistory();
      const result = resolveChapterTwoChoice(state, choiceId, createProgress(), history);
      expect(result.success).toBe(true);
      expect(result.nextState?.chapterTwoFlags[expectedFlag]).toBe(true);
      const nextProgress = createProgress();
      nextProgress.applyEffects(result.effects ?? {});
      expect(nextProgress.getSnapshot()).toEqual({
        playerStats: expectedStats,
        relationships: { bubbleGirlTrust: expectedTrust },
      });
    },
  );

  it('rejects replaying a confirmed choice without effects', () => {
    const first = resolveChapterTwoChoice(
      createState('team-discussion'),
      'define-values',
      createProgress(),
      createHistory(),
    );
    const replay = resolveChapterTwoChoice(
      first.nextState ?? createState('team-discussion'),
      'define-values',
      createProgress(),
      createHistory(),
    );
    expect(replay.success).toBe(false);
    expect(replay.effects).toBeUndefined();
  });

  it('rejects a choice from a non-current node', () => {
    expect(
      resolveChapterTwoChoice(
        createState('team-discussion'),
        'accept-agency-style',
        createProgress(),
        createHistory(),
      ).success,
    ).toBe(false);
  });
});

describe('ChapterTwoStory conditions', () => {
  it.each([
    ['team-discussion', 'prepare-compromise', BASE_STATS, 9, {}, '泡妞信任至少需要 10'],
    ['proposal-decision', 'propose-compromise', BASE_STATS, 5, {}, '目前缺少足夠信任'],
    ['client-response', 'limit-final-demand', { ...BASE_STATS, conviction: 9 }, 20, {}, '信念至少需要 10'],
    ['client-response', 'reopen-negotiation', { ...BASE_STATS, technique: 19 }, 7, {}, '技藝至少需要 20'],
    ['client-response', 'request-paid-preview', { ...BASE_STATS, conviction: 14 }, 20, {}, '過去必須有堅守合作條件'],
  ] as const)(
    'disables %s / %s with its exact reason',
    (node, choiceId, stats, trust, historyOverrides, reason) => {
      const state = createState(node);
      if (choiceId === 'limit-final-demand') state.chapterTwoFlags.acceptedAgencyStyle = true;
      if (choiceId === 'reopen-negotiation') state.chapterTwoFlags.keptOriginalStyle = true;
      if (choiceId === 'request-paid-preview') state.chapterTwoFlags.compromisedAgencyStyle = true;
      const history = createHistory(historyOverrides);
      const progress = createProgress(stats, trust);
      const interaction = getChapterTwoInteraction(state, progress, history);
      expect(interaction?.kind).toBe('choices');
      if (interaction?.kind === 'choices') {
        expect(interaction.choices.find(({ id }) => id === choiceId)).toMatchObject({
          enabled: false,
          unavailableReason: expect.stringContaining(reason),
        });
      }
      expect(resolveChapterTwoChoice(state, choiceId, progress, history).success).toBe(false);
    },
  );

  it('allows compromise through successful chapter-one negotiation at low trust', () => {
    const history = createHistory({}, 'show-stable', { negotiatedExtraTime: true });
    const interaction = getChapterTwoInteraction(
      createState('proposal-decision'),
      createProgress(BASE_STATS, 0),
      history,
    );
    expect(interaction?.kind).toBe('choices');
    if (interaction?.kind === 'choices') {
      expect(interaction.choices.find(({ id }) => id === 'propose-compromise')?.enabled).toBe(true);
    }
  });

  it('allows compromise through an original chapter-one direction', () => {
    const history = createHistory({ developedOriginalDirection: true });
    const result = resolveChapterTwoChoice(
      createState('proposal-decision'),
      'propose-compromise',
      createProgress(BASE_STATS, 0),
      history,
    );
    expect(result.success).toBe(true);
  });
});

describe('ChapterTwoStory deterministic outcomes', () => {
  it.each([
    ['discuss-quickly', 'accept-agency-style', 'accept-final-demand', 20, 'commercialBreakthrough'],
    ['discuss-quickly', 'accept-agency-style', 'accept-final-demand', -10, 'teamStrained'],
    ['define-values', 'keep-original-style', 'accept-smaller-stage', 20, 'creativeIntegrity'],
    ['define-values', 'keep-original-style', 'walk-away', 20, 'walkedAway'],
    ['prepare-compromise', 'propose-compromise', 'complete-preview', 20, 'commercialCompromise'],
    ['define-values', 'keep-original-style', 'reopen-negotiation', 20, 'agencyRespectEarned'],
  ] as const)(
    'resolves %s → %s → %s as %s',
    (first, second, third, trust, outcome) => {
      const history = createHistory({ heldAgreement: true });
      let flow = choose(createState('team-discussion'), first, createProgress(BASE_STATS, trust), history);
      flow = choose(flow.state, second, flow.progress, history);
      flow = choose(flow.state, third, flow.progress, history);
      expect(flow.state).toMatchObject({
        chapterTwoNode: 'chapter-two-ending',
        chapterTwoOutcome: outcome,
      });
    },
  );

  it('earns agency respect through a paid compromise preview', () => {
    const history = createHistory({ heldAgreement: true });
    let flow = choose(createState('team-discussion'), 'define-values', createProgress(), history);
    flow = choose(flow.state, 'propose-compromise', flow.progress, history);
    flow = choose(flow.state, 'request-paid-preview', flow.progress, history);
    expect(flow.state.chapterTwoOutcome).toBe('agencyRespectEarned');
  });
});

describe('ChapterTwoStory chapter-one history', () => {
  it.each([
    ['show-mistake', {}, '失誤'],
    ['show-memorable', {}, '亮點'],
    ['show-exhausting', { overextended: true }, '透支'],
    ['training-original', { developedOriginalDirection: true }, '原創方向'],
    ['small-show-interactive-success', { builtAudienceInteraction: true }, '近距離互動'],
  ] as const)('changes opening copy for %s history', (outcome, summary, text) => {
    const interaction = getChapterTwoInteraction(
      createState('intro-review-history'),
      createProgress(),
      createHistory(summary, outcome),
    );
    expect(interaction).toMatchObject({ kind: 'message', text: expect.stringContaining(text) });
  });

  it('changes agency evaluation when formal show experience is missing', () => {
    const interaction = getChapterTwoInteraction(
      createState('agency-first-contact'),
      createProgress(),
      createHistory({ hasShowExperience: false }),
    );
    expect(interaction).toMatchObject({ kind: 'message', text: expect.stringContaining('缺少正式舞台') });
  });
});

describe('ChapterTwoStory normalization and summary', () => {
  it('keeps chapter two locked when chapter one is incomplete', () => {
    expect(normalizeChapterTwoState({ chapterTwoNode: 'client-response' }, false, false)).toEqual({
      chapterTwoNode: 'not-started',
      chapterTwoFlags: createDefaultChapterTwoState(false).chapterTwoFlags,
    });
  });

  it('normalizes route conflicts and clears cross-route final flags', () => {
    const state = normalizeChapterTwoState(
      {
        chapterTwoFlags: {
          acceptedAgencyStyle: true,
          keptOriginalStyle: true,
          acceptedFinalClientDemand: true,
          walkedAwayFromAgency: true,
        },
      },
      true,
      false,
    );
    expect(state).toMatchObject({
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'commercialBreakthrough',
      chapterTwoFlags: {
        acceptedAgencyStyle: true,
        keptOriginalStyle: false,
        acceptedFinalClientDemand: true,
        walkedAwayFromAgency: false,
      },
    });
  });

  it('repairs an abnormal completed state with a safe compromise outcome', () => {
    expect(normalizeChapterTwoState({}, true, true)).toMatchObject({
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'commercialCompromise',
      chapterTwoFlags: { compromisedAgencyStyle: true },
    });
  });

  it('derives distinct durable history from a strained commercial route', () => {
    const state = normalizeChapterTwoState(
      {
        chapterTwoNode: 'chapter-two-ending',
        chapterTwoOutcome: 'teamStrained',
        chapterTwoFlags: {
          acceptedDiscussionQuickly: true,
          acceptedAgencyStyle: true,
          acceptedFinalClientDemand: true,
        },
      },
      true,
      true,
    );
    expect(getChapterTwoSummary(state, createHistory({ overextended: true }), createProgress(BASE_STATS, -20))).toMatchObject({
      route: 'agency-style',
      prioritizedExposure: true,
      securedLargeCommercialPartnership: true,
      bubbleGirlTrustGrew: false,
      bubbleGirlWorriesAboutDirection: true,
      overextendedAgain: true,
    });
  });
});
