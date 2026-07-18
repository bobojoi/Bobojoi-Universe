import { describe, expect, it } from 'vitest';
import { createDefaultStudioQuestState } from '../quest/StudioQuestManager';
import { createDefaultMainStoryState } from '../story/MainStoryManager';
import { migrateLegacyTutorialProgress } from '../tutorial/TutorialProgress';
import { migrateSaveData, readPlayerPosition, SAVE_VERSION } from './SaveDataMigration';

const TEST_TIMESTAMP = '2026-07-18T00:00:00.000Z';
const VALID_PLAYER = { x: 620, y: 760 };

/** Builds the smallest recognized save fixture for focused migration assertions. */
function createSave(version: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { version, player: VALID_PLAYER, updatedAt: TEST_TIMESTAMP, ...overrides };
}

describe('readPlayerPosition', () => {
  it.each([
    { x: Number.NaN, y: 1 },
    { x: Number.POSITIVE_INFINITY, y: 1 },
    { x: Number.NEGATIVE_INFINITY, y: 1 },
    { x: 1, y: Number.NaN },
    { x: 1, y: Number.POSITIVE_INFINITY },
    { x: 1, y: Number.NEGATIVE_INFINITY },
    { x: '1', y: 1 },
    { x: 1, y: '1' },
    { x: null, y: 1 },
    { x: 1, y: null },
    { x: 1 },
    { y: 1 },
    null,
    'invalid',
  ])('rejects an invalid coordinate fixture', (value) => {
    expect(readPlayerPosition(value)).toBeUndefined();
  });

  it('accepts finite coordinates including zero and negatives', () => {
    expect(readPlayerPosition({ x: 0, y: -42.5 })).toEqual({ x: 0, y: -42.5 });
  });
});

describe('migrateSaveData', () => {
  it('migrates v1 with a default quest and preserves a valid player', () => {
    const quest = createDefaultStudioQuestState();
    const story = createDefaultMainStoryState(false);
    expect(migrateSaveData(createSave(1), TEST_TIMESTAMP)).toEqual({
      version: SAVE_VERSION,
      player: VALID_PLAYER,
      studioQuest: quest,
      ...story,
      tutorialProgress: migrateLegacyTutorialProgress(quest, story),
      updatedAt: TEST_TIMESTAMP,
    });
  });

  it('migrates v6 into v7 without replaying completed chapter transitions', () => {
    const migrated = migrateSaveData(
      createSave(6, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'chapter-two-complete',
        storyFlags: { acceptedFirstOffer: true, firstOfferResolved: true },
        chapterOneNode: 'complete',
        chapterOneOutcome: 'show-stable',
        chapterTwoNode: 'chapter-two-ending',
        chapterTwoOutcome: 'commercialBreakthrough',
        chapterTwoFlags: { acceptedAgencyStyle: true, acceptedFinalClientDemand: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      version: 7,
      tutorialProgress: {
        sawIntroText: true,
        sawChapterOneCompleteTransition: true,
        sawChapterTwoStartTransition: true,
        sawChapterTwoCompleteTransition: true,
      },
    });
  });

  it('normalizes partial and damaged v7 tutorial flags safely', () => {
    const migrated = migrateSaveData(
      createSave(7, {
        studioQuest: { stage: 'not-started', investigated: {} },
        tutorialProgress: { sawIntroText: true, sawMovementHint: 'yes' },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.tutorialProgress).toMatchObject({
      sawIntroText: true,
      sawMovementHint: false,
      sawAutosaveExplanation: false,
    });
  });

  it('keeps quest progress but drops an invalid player position', () => {
    const migrated = migrateSaveData(
      createSave(3, {
        player: { x: Number.POSITIVE_INFINITY, y: 760 },
        studioQuest: { stage: 'ring-discovered', investigated: { 'dog-mat': true } },
      }),
      TEST_TIMESTAMP,
    );

    expect(migrated?.player).toBeUndefined();
    expect(migrated?.studioQuest.stage).toBe('ring-discovered');
  });

  it.each([
    [{ stage: 'not-started', completed: true, ringCollected: false }, 'completed'],
    [{ stage: 'ring-discovered', completed: false, ringCollected: true }, 'ring-collected'],
    [{ stage: 'ring-discovered', completed: false, ringCollected: false }, 'ring-discovered'],
    [{ stage: 'in-progress', completed: false, ringCollected: false }, 'in-progress'],
    [{ stage: 'not-started', completed: false, ringCollected: false }, 'not-started'],
  ] as const)('migrates v2 precedence to %s', (legacyQuest, expectedStage) => {
    const migrated = migrateSaveData(
      createSave(2, { studioQuest: legacyQuest }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.studioQuest.stage).toBe(expectedStage);
  });

  it('migrates a completed v2 save through the current story defaults', () => {
    const migrated = migrateSaveData(
      createSave(2, {
        studioQuest: { stage: 'completed', completed: true, ringCollected: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      version: SAVE_VERSION,
      mainStoryStage: 'first-offer',
      playerStats: { technique: 10, popularity: 0, conviction: 10, energy: 100 },
      relationships: { bubbleGirlTrust: 0 },
    });
  });

  it('normalizes a partial v3 quest without legacy flags', () => {
    const migrated = migrateSaveData(
      createSave(3, { studioQuest: { stage: 'in-progress', investigated: null } }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.studioQuest).toEqual({
      stage: 'in-progress',
      investigated: { 'prop-box': false, 'bubble-table': false, 'dog-mat': false },
    });
    expect(migrated?.mainStoryStage).toBe('prologue');
  });

  it('migrates a completed v3 tutorial into an available first offer', () => {
    const migrated = migrateSaveData(
      createSave(3, {
        studioQuest: { stage: 'completed', investigated: { 'dog-mat': true } },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      version: SAVE_VERSION,
      mainStoryStage: 'first-offer',
      playerStats: { technique: 10, popularity: 0, conviction: 10, energy: 100 },
      relationships: { bubbleGirlTrust: 0 },
      storyFlags: { firstOfferResolved: false },
    });
  });

  it('normalizes mutually exclusive v4 flags with A then B then C priority', () => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'small-show',
        playerStats: {},
        relationships: {},
        storyFlags: {
          acceptedFirstOffer: true,
          choseTrainingFirst: true,
          negotiatedSmallShow: true,
          firstOfferResolved: true,
        },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.mainStoryStage).toBe('preparing-show');
    expect(migrated?.storyFlags).toEqual({
      acceptedFirstOffer: true,
      choseTrainingFirst: false,
      negotiatedSmallShow: false,
      firstOfferResolved: true,
    });
    expect(migrated).toMatchObject({
      version: SAVE_VERSION,
      chapterOneNode: 'a-preparation',
    });
  });

  it.each([
    ['preparing-show', { acceptedFirstOffer: true, firstOfferResolved: true }, 'a-preparation'],
    ['training-first', { choseTrainingFirst: true, firstOfferResolved: true }, 'b-training'],
    ['small-show', { negotiatedSmallShow: true, firstOfferResolved: true }, 'c-format'],
  ] as const)('migrates a v4 %s route to its opening node', (stage, storyFlags, node) => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: stage,
        storyFlags,
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({ version: SAVE_VERSION, mainStoryStage: stage, chapterOneNode: node });
  });

  it('repairs an abnormal v4 completed chapter with a safe typed outcome', () => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'chapter-one-complete',
        storyFlags: { acceptedFirstOffer: true, firstOfferResolved: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      version: SAVE_VERSION,
      mainStoryStage: 'chapter-two-intro',
      chapterOneNode: 'complete',
      chapterOneOutcome: 'legacy-complete',
      chapterTwoNode: 'intro-review-history',
    });
  });

  it('repairs a route-less v4 completed chapter to the deterministic fallback route', () => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'chapter-one-complete',
        storyFlags: { firstOfferResolved: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      mainStoryStage: 'chapter-two-intro',
      storyFlags: { acceptedFirstOffer: true, firstOfferResolved: true },
      chapterOneNode: 'complete',
      chapterOneOutcome: 'legacy-complete',
      chapterTwoNode: 'intro-review-history',
    });
  });

  it('normalizes damaged v5 chapter flags and preserves a valid confirmed node', () => {
    const migrated = migrateSaveData(
      createSave(5, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'small-show',
        storyFlags: { negotiatedSmallShow: true, firstOfferResolved: true },
        chapterOneNode: 'c-space',
        chapterOneFlags: { smallShowVisual: true, smallShowStory: true, trainedBasics: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      chapterOneNode: 'c-space',
      chapterOneFlags: {
        smallShowVisual: true,
        smallShowStory: false,
        trainedBasics: false,
      },
    });
  });

  it('migrates a completed v5 first chapter into the chapter-two intro', () => {
    const migrated = migrateSaveData(
      createSave(5, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'chapter-one-complete',
        storyFlags: { choseTrainingFirst: true, firstOfferResolved: true },
        chapterOneNode: 'complete',
        chapterOneOutcome: 'held-principle',
        chapterOneFlags: { studiedAudience: true, refusedFreePreview: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      version: SAVE_VERSION,
      mainStoryStage: 'chapter-two-intro',
      chapterOneOutcome: 'held-principle',
      chapterOneFlags: { studiedAudience: true, refusedFreePreview: true },
      chapterTwoNode: 'intro-review-history',
    });
  });

  it('restores a confirmed v6 discussion choice at the proposal node', () => {
    const migrated = migrateSaveData(
      createSave(6, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'proposal-discussion',
        storyFlags: { acceptedFirstOffer: true, firstOfferResolved: true },
        chapterOneNode: 'complete',
        chapterOneOutcome: 'show-stable',
        chapterOneFlags: { preparedSafeRoutine: true, keptOriginalAgreement: true },
        chapterTwoNode: 'proposal-decision',
        chapterTwoFlags: { definedCoreValuesFirst: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      mainStoryStage: 'creative-choice',
      chapterTwoNode: 'proposal-decision',
      chapterTwoFlags: { definedCoreValuesFirst: true },
      chapterOneOutcome: 'show-stable',
    });
  });

  it('normalizes mutually exclusive v6 routes and cross-route final flags', () => {
    const migrated = migrateSaveData(
      createSave(6, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'creative-choice',
        storyFlags: { acceptedFirstOffer: true, firstOfferResolved: true },
        chapterOneNode: 'complete',
        chapterOneOutcome: 'show-stable',
        chapterTwoNode: 'client-response',
        chapterTwoFlags: {
          acceptedAgencyStyle: true,
          keptOriginalStyle: true,
          acceptedFinalClientDemand: true,
          walkedAwayFromAgency: true,
        },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      mainStoryStage: 'chapter-two-complete',
      chapterTwoOutcome: 'commercialBreakthrough',
      chapterTwoFlags: {
        acceptedAgencyStyle: true,
        keptOriginalStyle: false,
        acceptedFinalClientDemand: true,
        walkedAwayFromAgency: false,
      },
    });
  });

  it('repairs an abnormal completed v6 chapter with a safe typed outcome', () => {
    const migrated = migrateSaveData(
      createSave(6, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'chapter-two-complete',
        storyFlags: { negotiatedSmallShow: true, firstOfferResolved: true },
        chapterOneNode: 'complete',
        chapterOneOutcome: 'small-show-safe',
        chapterTwoNode: 'damaged',
        chapterTwoOutcome: 'wrong',
        chapterTwoFlags: 'damaged',
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      mainStoryStage: 'chapter-two-complete',
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'commercialCompromise',
      chapterTwoFlags: { compromisedAgencyStyle: true },
    });
  });

  it('repairs a resolved v4 offer without a route back to an understandable offer', () => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'completed', investigated: {} },
        mainStoryStage: 'preparing-show',
        storyFlags: { firstOfferResolved: true },
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.mainStoryStage).toBe('first-offer');
    expect(migrated?.storyFlags.firstOfferResolved).toBe(false);
  });

  it('keeps damaged v4 values bounded and behind an incomplete prologue', () => {
    const migrated = migrateSaveData(
      createSave(4, {
        studioQuest: { stage: 'in-progress', investigated: null },
        mainStoryStage: 'small-show',
        playerStats: { technique: Number.POSITIVE_INFINITY, energy: -50 },
        relationships: { bubbleGirlTrust: 900 },
        storyFlags: 'damaged',
      }),
      TEST_TIMESTAMP,
    );
    expect(migrated).toMatchObject({
      mainStoryStage: 'prologue',
      playerStats: { technique: 10, popularity: 0, conviction: 10, energy: 0 },
      relationships: { bubbleGirlTrust: 100 },
      storyFlags: { firstOfferResolved: false },
    });
  });

  it.each([undefined, null, {}, [], createSave(99)])('rejects an unknown save shape', (value) => {
    expect(migrateSaveData(value, TEST_TIMESTAMP)).toBeUndefined();
  });
});
