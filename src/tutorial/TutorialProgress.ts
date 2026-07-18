import type { StudioQuestState } from '../quest/StudioQuestManager';
import type { MainStoryState, MainStoryStage } from '../story/MainStoryManager';

/** Stable identifiers keep Demo guidance out of arbitrary string collections. */
export type TutorialFlagId =
  | 'sawIntroText'
  | 'sawMovementHint'
  | 'sawInteractionHint'
  | 'sawObjectiveHint'
  | 'sawChoiceExplanation'
  | 'sawAutosaveExplanation'
  | 'sawLowEnergyWarning'
  | 'sawPrologueCompleteTransition'
  | 'sawChapterOneStartTransition'
  | 'sawChapterOneCompleteTransition'
  | 'sawChapterTwoStartTransition'
  | 'sawChapterTwoCompleteTransition';

/** Serializable v7 state contains durable presentation history only. */
export type TutorialProgressState = Record<TutorialFlagId, boolean>;

/** Chapter transitions are queried separately from their persisted seen flags. */
export type ChapterTransitionId =
  | 'prologue-complete'
  | 'chapter-one-start'
  | 'chapter-one-complete'
  | 'chapter-two-start'
  | 'chapter-two-complete';

const TUTORIAL_FLAG_IDS: readonly TutorialFlagId[] = [
  'sawIntroText',
  'sawMovementHint',
  'sawInteractionHint',
  'sawObjectiveHint',
  'sawChoiceExplanation',
  'sawAutosaveExplanation',
  'sawLowEnergyWarning',
  'sawPrologueCompleteTransition',
  'sawChapterOneStartTransition',
  'sawChapterOneCompleteTransition',
  'sawChapterTwoStartTransition',
  'sawChapterTwoCompleteTransition',
] as const;

const TRANSITION_FLAGS: Record<ChapterTransitionId, TutorialFlagId> = {
  'prologue-complete': 'sawPrologueCompleteTransition',
  'chapter-one-start': 'sawChapterOneStartTransition',
  'chapter-one-complete': 'sawChapterOneCompleteTransition',
  'chapter-two-start': 'sawChapterTwoStartTransition',
  'chapter-two-complete': 'sawChapterTwoCompleteTransition',
};

/** New games begin with every one-shot explanation available. */
export function createDefaultTutorialProgress(): TutorialProgressState {
  return Object.fromEntries(TUTORIAL_FLAG_IDS.map((id) => [id, false])) as TutorialProgressState;
}

/** Damaged or partial v7 flags fall back independently without throwing. */
export function normalizeTutorialProgress(value: unknown): TutorialProgressState {
  const source = isRecord(value) ? value : {};
  const normalized = createDefaultTutorialProgress();
  for (const id of TUTORIAL_FLAG_IDS) normalized[id] = source[id] === true;
  return normalized;
}

/** Existing v1-v6 saves skip onboarding already implied by durable progress. */
export function migrateLegacyTutorialProgress(
  quest: StudioQuestState,
  story: MainStoryState,
): TutorialProgressState {
  const progress = createDefaultTutorialProgress();
  const prologueComplete = quest.stage === 'completed';
  const chapterOneComplete = isChapterOneComplete(story.mainStoryStage);
  const chapterTwoStarted = isChapterTwoStage(story.mainStoryStage);
  const chapterTwoComplete = story.mainStoryStage === 'chapter-two-complete';

  progress.sawIntroText = true;
  progress.sawMovementHint = true;
  progress.sawInteractionHint = true;
  progress.sawObjectiveHint = true;
  progress.sawChoiceExplanation = story.storyFlags.firstOfferResolved;
  progress.sawAutosaveExplanation = story.storyFlags.firstOfferResolved;
  progress.sawLowEnergyWarning = story.playerStats.energy <= 20;
  progress.sawPrologueCompleteTransition = prologueComplete;
  progress.sawChapterOneStartTransition = prologueComplete;
  progress.sawChapterOneCompleteTransition = chapterOneComplete;
  progress.sawChapterTwoStartTransition = chapterTwoStarted;
  progress.sawChapterTwoCompleteTransition = chapterTwoComplete;
  return progress;
}

/** Immutable marking makes repeat prevention straightforward to test. */
export function markTutorialFlag(
  state: TutorialProgressState,
  flag: TutorialFlagId,
): TutorialProgressState {
  return state[flag] ? state : { ...state, [flag]: true };
}

/** Central threshold query prevents repeated low-energy presentation rules in scenes. */
export function shouldShowLowEnergyWarning(
  energy: number,
  state: TutorialProgressState,
  threshold = 20,
): boolean {
  return Number.isFinite(energy) && energy <= threshold && !state.sawLowEnergyWarning;
}

/** Finds every reached but unseen transition in narrative order. */
export function getPendingChapterTransitions(
  quest: StudioQuestState,
  story: MainStoryState,
  tutorial: TutorialProgressState,
): ChapterTransitionId[] {
  const reached = new Set<ChapterTransitionId>();
  if (quest.stage === 'completed') {
    reached.add('prologue-complete');
    reached.add('chapter-one-start');
  }
  if (isChapterOneComplete(story.mainStoryStage)) reached.add('chapter-one-complete');
  if (isChapterTwoStage(story.mainStoryStage)) reached.add('chapter-two-start');
  if (story.mainStoryStage === 'chapter-two-complete') reached.add('chapter-two-complete');

  return (Object.keys(TRANSITION_FLAGS) as ChapterTransitionId[]).filter(
    (id) => reached.has(id) && !tutorial[TRANSITION_FLAGS[id]],
  );
}

/** Resolves the persistent flag paired with one transition overlay. */
export function getTransitionSeenFlag(id: ChapterTransitionId): TutorialFlagId {
  return TRANSITION_FLAGS[id];
}

/** Later stages prove that the first chapter has already concluded. */
function isChapterOneComplete(stage: MainStoryStage): boolean {
  return stage === 'chapter-one-complete' || isChapterTwoStage(stage);
}

/** Second-chapter stages share one durable milestone for transition history. */
function isChapterTwoStage(stage: MainStoryStage): boolean {
  return stage === 'chapter-two-intro' || stage === 'agency-offer' ||
    stage === 'proposal-discussion' || stage === 'creative-choice' ||
    stage === 'chapter-two-complete';
}

/** Rejects arrays and null before reading persisted properties. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
