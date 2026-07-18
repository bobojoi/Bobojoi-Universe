import { describe, expect, it } from 'vitest';
import { createDefaultStudioQuestState } from '../quest/StudioQuestManager';
import { createDefaultMainStoryState, type MainStoryState } from '../story/MainStoryManager';
import {
  createDefaultTutorialProgress,
  getPendingChapterTransitions,
  markTutorialFlag,
  migrateLegacyTutorialProgress,
  normalizeTutorialProgress,
  shouldShowLowEnergyWarning,
} from './TutorialProgress';

describe('TutorialProgress', () => {
  it('starts every one-shot flag unseen for a new game', () => {
    expect(Object.values(createDefaultTutorialProgress()).every((value) => value === false)).toBe(true);
  });

  it('normalizes missing and damaged flags independently', () => {
    expect(normalizeTutorialProgress({ sawIntroText: true, sawMovementHint: 'yes' })).toMatchObject({
      sawIntroText: true,
      sawMovementHint: false,
      sawChoiceExplanation: false,
    });
  });

  it('marks a flag without mutating the original snapshot', () => {
    const state = createDefaultTutorialProgress();
    const marked = markTutorialFlag(state, 'sawMovementHint');
    expect(state.sawMovementHint).toBe(false);
    expect(marked.sawMovementHint).toBe(true);
  });

  it.each([
    'sawIntroText',
    'sawMovementHint',
    'sawInteractionHint',
    'sawChoiceExplanation',
    'sawAutosaveExplanation',
    'sawLowEnergyWarning',
  ] as const)('keeps %s seen after reload normalization', (flag) => {
    expect(normalizeTutorialProgress({ [flag]: true })[flag]).toBe(true);
  });

  it('marks completed legacy milestones so old stories do not replay transitions', () => {
    const quest = { ...createDefaultStudioQuestState(), stage: 'completed' as const };
    const story: MainStoryState = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: 'chapter-two-complete',
      storyFlags: {
        acceptedFirstOffer: true,
        choseTrainingFirst: false,
        negotiatedSmallShow: false,
        firstOfferResolved: true,
      },
      chapterOneNode: 'complete',
      chapterOneOutcome: 'show-stable',
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'commercialBreakthrough',
    };
    const migrated = migrateLegacyTutorialProgress(quest, story);
    expect(migrated).toMatchObject({
      sawIntroText: true,
      sawChoiceExplanation: true,
      sawPrologueCompleteTransition: true,
      sawChapterOneCompleteTransition: true,
      sawChapterTwoStartTransition: true,
      sawChapterTwoCompleteTransition: true,
    });
    expect(getPendingChapterTransitions(quest, story, migrated)).toEqual([]);
  });

  it('returns reached transitions in narrative order only once', () => {
    const quest = { ...createDefaultStudioQuestState(), stage: 'completed' as const };
    const story = createDefaultMainStoryState(true);
    const tutorial = createDefaultTutorialProgress();
    expect(getPendingChapterTransitions(quest, story, tutorial)).toEqual([
      'prologue-complete',
      'chapter-one-start',
    ]);
    const seen = markTutorialFlag(
      markTutorialFlag(tutorial, 'sawPrologueCompleteTransition'),
      'sawChapterOneStartTransition',
    );
    expect(getPendingChapterTransitions(quest, story, seen)).toEqual([]);
  });

  it('new-game defaults make every reached transition replayable again', () => {
    const quest = { ...createDefaultStudioQuestState(), stage: 'completed' as const };
    const story = { ...createDefaultMainStoryState(true), mainStoryStage: 'chapter-one-complete' as const };
    expect(getPendingChapterTransitions(quest, story, createDefaultTutorialProgress())).toEqual([
      'prologue-complete',
      'chapter-one-start',
      'chapter-one-complete',
    ]);
  });

  it('shows the low-energy warning once at or below the threshold', () => {
    const tutorial = createDefaultTutorialProgress();
    expect(shouldShowLowEnergyWarning(20, tutorial)).toBe(true);
    expect(shouldShowLowEnergyWarning(21, tutorial)).toBe(false);
    expect(shouldShowLowEnergyWarning(
      5,
      markTutorialFlag(tutorial, 'sawLowEnergyWarning'),
    )).toBe(false);
  });
});
