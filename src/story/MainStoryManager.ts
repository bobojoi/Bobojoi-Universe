import {
  createDefaultChapterOneState,
  getChapterOneInteraction,
  getChapterOneObjective,
  getChapterOneSummary,
  getRouteOpeningNode,
  normalizeChapterOneState,
  resolveChapterOneChoice,
  type ChapterOneChoiceId,
  type ChapterOneRoute,
  type ChapterOneState,
  type ChapterOneSummary,
} from './ChapterOneStory';
import {
  advanceChapterTwoMessage,
  createDefaultChapterTwoState,
  getChapterTwoInteraction,
  getChapterTwoObjective,
  getChapterTwoPostDialogue,
  getChapterTwoStage,
  getChapterTwoSummary,
  normalizeChapterTwoState,
  resolveChapterTwoChoice,
  type ChapterOneHistoryContext,
  type ChapterTwoChoiceId,
  type ChapterTwoState,
  type ChapterTwoSummary,
} from './ChapterTwoStory';
import {
  createDefaultPlayerStats,
  createDefaultRelationships,
  normalizePlayerStats,
  normalizeRelationships,
  PlayerProgress,
  type PlayerProgressEffects,
  type PlayerStatsState,
  type RelationshipState,
} from './PlayerProgress';

/** Main-story stage is the broad single source of truth for the current chapter position. */
export type MainStoryStage =
  | 'prologue'
  | 'first-offer'
  | 'preparing-show'
  | 'training-first'
  | 'small-show'
  | 'chapter-one-complete'
  | 'chapter-two-intro'
  | 'agency-offer'
  | 'proposal-discussion'
  | 'creative-choice'
  | 'chapter-two-complete';

/** Type-safe story flags retain the first route decision separately from stage. */
export type StoryFlagId =
  | 'acceptedFirstOffer'
  | 'choseTrainingFirst'
  | 'negotiatedSmallShow'
  | 'firstOfferResolved';

/** Serializable first-offer history. */
export type StoryFlags = Record<StoryFlagId, boolean>;

/** Stable identifiers for the three first-offer decisions. */
export type FirstOfferChoiceId = 'accept-now' | 'train-first' | 'small-show';

/** Every dialogue choice resolves through the story owner rather than the scene. */
export type StoryChoiceId = FirstOfferChoiceId | ChapterOneChoiceId | ChapterTwoChoiceId;

/** Complete v6 story and character progression state. */
export interface MainStoryState extends ChapterOneState, ChapterTwoState {
  mainStoryStage: MainStoryStage;
  playerStats: PlayerStatsState;
  relationships: RelationshipState;
  storyFlags: StoryFlags;
}

/** UI-ready choice data contains resolved conditions but no Phaser objects. */
export interface StoryChoiceView {
  id: StoryChoiceId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** Structured story dialogue keeps the scene free of chapter rules. */
export type StoryInteraction =
  | { kind: 'message'; speaker: string; text: string }
  | { kind: 'choices'; speaker: string; text: string; choices: StoryChoiceView[] };

/** Choice resolution reports presentation data without exposing mutations. */
export interface StoryChoiceResult {
  success: boolean;
  speaker: string;
  text: string;
  chapterCompleted?: boolean;
  completionLabel?: string;
}

/** Compact main-story HUD state derives from the same event nodes. */
export interface MainStoryHudView {
  title: string;
  objective: string;
  completed: boolean;
}

interface FirstOfferChoiceDefinition {
  id: FirstOfferChoiceId;
  label: string;
  targetStage: 'preparing-show' | 'training-first' | 'small-show';
  route: ChapterOneRoute;
  decisionFlag: Exclude<StoryFlagId, 'firstOfferResolved'>;
  effects: PlayerProgressEffects;
  followUp: string;
  condition: (progress: PlayerProgress) => { enabled: boolean; reason?: string };
}

const BUBBLE_GIRL = '泡妞';
const FIRST_OFFER_PROMPT =
  '工作室剛收到第一個演出邀請，但時間很趕，我們還沒有完全準備好。你想怎麼做？';
const CHAPTER_ONE_COMPLETION = '第一章完成：夢想的第一步';
const CHAPTER_TWO_COMPLETION = '第二章完成：成功的代價';

/** Ordered definitions provide deterministic UI order and route-repair priority. */
const FIRST_OFFER_CHOICES: readonly FirstOfferChoiceDefinition[] = [
  {
    id: 'accept-now',
    label: '立刻接下演出',
    targetStage: 'preparing-show',
    route: 'accepted-offer',
    decisionFlag: 'acceptedFirstOffer',
    effects: { stats: { popularity: 10, energy: -15 }, bubbleGirlTrust: -5 },
    followUp: '既然決定接下來，我們就得用最快速度準備。',
    condition: (progress) => ({
      enabled: progress.getStat('energy') >= 15,
      reason: '需要至少 15 點體力',
    }),
  },
  {
    id: 'train-first',
    label: '拒絕邀請，先加強練習',
    targetStage: 'training-first',
    route: 'training-first',
    decisionFlag: 'choseTrainingFirst',
    effects: { stats: { technique: 10, conviction: 5 }, bubbleGirlTrust: 5 },
    followUp: '好，我們先把實力準備好。下一次機會來時，就不能再錯過。',
    condition: () => ({ enabled: true }),
  },
  {
    id: 'small-show',
    label: '提議縮小演出規模',
    targetStage: 'small-show',
    route: 'small-show',
    decisionFlag: 'negotiatedSmallShow',
    effects: { stats: { popularity: 5, conviction: 3, energy: -5 }, bubbleGirlTrust: 10 },
    followUp: '這個方法比較穩，也能讓我們真正踏出第一步。',
    condition: (progress) => ({
      enabled: progress.getStat('energy') >= 5,
      reason: '需要至少 5 點體力',
    }),
  },
] as const;

/** Creates safe defaults while keeping chapter two locked behind chapter one. */
export function createDefaultMainStoryState(prologueComplete: boolean): MainStoryState {
  return {
    mainStoryStage: prologueComplete ? 'first-offer' : 'prologue',
    playerStats: createDefaultPlayerStats(),
    relationships: createDefaultRelationships(),
    storyFlags: createDefaultStoryFlags(),
    ...createDefaultChapterOneState(),
    ...createDefaultChapterTwoState(false),
  };
}

/** Normalizes story data and repairs contradictory chapter, route, and node state centrally. */
export function normalizeMainStoryState(value: unknown, prologueComplete: boolean): MainStoryState {
  const source = isRecord(value) ? value : {};
  const playerStats = normalizePlayerStats(source.playerStats);
  const relationships = normalizeRelationships(source.relationships);
  if (!prologueComplete) {
    return {
      mainStoryStage: 'prologue',
      playerStats,
      relationships,
      storyFlags: createDefaultStoryFlags(),
      ...createDefaultChapterOneState(),
      ...createDefaultChapterTwoState(false),
    };
  }

  const rawFlags = normalizeStoryFlags(source.storyFlags);
  const postChapterOne = isPostChapterOneStage(source.mainStoryStage) || source.chapterOneNode === 'complete';
  const selectedChoice = FIRST_OFFER_CHOICES.find(({ decisionFlag }) => rawFlags[decisionFlag]) ??
    (postChapterOne ? FIRST_OFFER_CHOICES[0] : undefined);
  if (!selectedChoice) {
    return {
      mainStoryStage: 'first-offer',
      playerStats,
      relationships,
      storyFlags: createDefaultStoryFlags(),
      ...createDefaultChapterOneState(),
      ...createDefaultChapterTwoState(false),
    };
  }

  const chapterOneState = normalizeChapterOneState(source, selectedChoice.route, postChapterOne);
  if (!postChapterOne) {
    return {
      mainStoryStage: selectedChoice.targetStage,
      playerStats,
      relationships,
      storyFlags: createResolvedFlags(selectedChoice.decisionFlag),
      ...chapterOneState,
      ...createDefaultChapterTwoState(false),
    };
  }

  const forceChapterTwoComplete =
    source.mainStoryStage === 'chapter-two-complete' || source.chapterTwoNode === 'chapter-two-ending';
  const chapterTwoState = normalizeChapterTwoState(source, true, forceChapterTwoComplete);
  return {
    mainStoryStage: getChapterTwoStage(chapterTwoState.chapterTwoNode),
    playerStats,
    relationships,
    storyFlags: createResolvedFlags(selectedChoice.decisionFlag),
    ...chapterOneState,
    ...chapterTwoState,
  };
}

/** Owns all chapter rules, conditions, progression, and atomic effects without Phaser. */
export class MainStoryManager {
  private stage: MainStoryStage;
  private flags: StoryFlags;
  private chapterOneState: ChapterOneState;
  private chapterTwoState: ChapterTwoState;
  private progress: PlayerProgress;

  public constructor(
    initialState: MainStoryState,
    private readonly isPrologueComplete: () => boolean,
    private readonly onStateChanged: (state: MainStoryState) => void,
  ) {
    const normalized = normalizeMainStoryState(initialState, isPrologueComplete());
    this.stage = normalized.mainStoryStage;
    this.flags = normalized.storyFlags;
    this.chapterOneState = {
      chapterOneNode: normalized.chapterOneNode,
      chapterOneOutcome: normalized.chapterOneOutcome,
      chapterOneFlags: normalized.chapterOneFlags,
    };
    this.chapterTwoState = {
      chapterTwoNode: normalized.chapterTwoNode,
      chapterTwoOutcome: normalized.chapterTwoOutcome,
      chapterTwoFlags: normalized.chapterTwoFlags,
    };
    this.progress = new PlayerProgress(normalized.playerStats, normalized.relationships);
  }

  /** Returns BubbleGirl's current interaction or defers to the tutorial quest. */
  public interactWithBubbleGirl(): StoryInteraction | undefined {
    if (!this.isPrologueComplete()) return undefined;
    if (this.stage === 'prologue') {
      this.stage = 'first-offer';
      this.notifyStateChanged();
    }
    if (this.stage === 'first-offer') {
      return {
        kind: 'choices',
        speaker: BUBBLE_GIRL,
        text: FIRST_OFFER_PROMPT,
        choices: this.getFirstOfferChoices(),
      };
    }
    if (isChapterOneRouteStage(this.stage)) return this.getChapterOneInteraction();

    // A newly completed first chapter enters chapter two on the next interaction.
    if (this.stage === 'chapter-one-complete') {
      this.chapterTwoState = createDefaultChapterTwoState(true);
      this.stage = 'chapter-two-intro';
    }
    if (this.stage === 'chapter-two-complete') {
      return {
        kind: 'message',
        speaker: BUBBLE_GIRL,
        text: getChapterTwoPostDialogue(this.chapterTwoState.chapterTwoOutcome),
      };
    }

    const interaction = getChapterTwoInteraction(
      this.chapterTwoState,
      this.progress,
      this.getChapterOneHistory(),
    );
    if (!interaction) {
      return { kind: 'message', speaker: BUBBLE_GIRL, text: '先把眼前的合作條件確認清楚吧。' };
    }
    if (interaction.kind === 'choices') return interaction;

    this.chapterTwoState = advanceChapterTwoMessage(this.chapterTwoState, interaction.nextNode);
    this.stage = getChapterTwoStage(this.chapterTwoState.chapterTwoNode);
    this.notifyStateChanged();
    return { kind: 'message', speaker: interaction.speaker, text: interaction.text };
  }

  /** Returns condition-resolved first-offer options without exposing predicates to UI. */
  public getFirstOfferChoices(): StoryChoiceView[] {
    return FIRST_OFFER_CHOICES.map((choice) => {
      const condition = choice.condition(this.progress);
      return {
        id: choice.id,
        label: choice.label,
        enabled: condition.enabled,
        ...(condition.enabled || !condition.reason ? {} : { unavailableReason: condition.reason }),
      };
    });
  }

  /** Resolves first-offer, first-chapter, or second-chapter choices through one scene API. */
  public resolveStoryChoice(choiceId: StoryChoiceId): StoryChoiceResult {
    if (isFirstOfferChoice(choiceId)) return this.resolveFirstOffer(choiceId);
    if (isChapterOneRouteStage(this.stage)) return this.resolveChapterOneChoice(choiceId as ChapterOneChoiceId);
    if (isChapterTwoActiveStage(this.stage)) return this.resolveChapterTwoChoice(choiceId as ChapterTwoChoiceId);
    return { success: false, speaker: BUBBLE_GIRL, text: '這段選擇已經結束了。' };
  }

  /** Atomically applies the first offer and initializes the selected chapter-one route. */
  public resolveFirstOffer(choiceId: FirstOfferChoiceId): StoryChoiceResult {
    if (!this.canResolveFirstOffer()) {
      return { success: false, speaker: BUBBLE_GIRL, text: '這次演出邀請已經做出決定了。' };
    }
    const definition = FIRST_OFFER_CHOICES.find(({ id }) => id === choiceId);
    if (!definition) return { success: false, speaker: BUBBLE_GIRL, text: '這個選擇目前不存在。' };
    const condition = definition.condition(this.progress);
    if (!condition.enabled) {
      return { success: false, speaker: BUBBLE_GIRL, text: condition.reason ?? '目前無法選擇。' };
    }

    this.progress = cloneProgressWithEffects(this.progress, definition.effects);
    this.stage = definition.targetStage;
    this.flags = createResolvedFlags(definition.decisionFlag);
    this.chapterOneState = {
      chapterOneNode: getRouteOpeningNode(definition.route),
      chapterOneFlags: createDefaultChapterOneState().chapterOneFlags,
    };
    this.chapterTwoState = createDefaultChapterTwoState(false);
    this.notifyStateChanged();
    return { success: true, speaker: BUBBLE_GIRL, text: definition.followUp };
  }

  /** Reports whether the one-shot first offer remains available. */
  public canResolveFirstOffer(): boolean {
    return this.isPrologueComplete() && this.stage === 'first-offer' && !this.flags.firstOfferResolved;
  }

  /** Exposes durable first-chapter meaning without mutable state access. */
  public getChapterOneSummary(): ChapterOneSummary {
    return getChapterOneSummary(this.chapterOneState, this.getChapterOneRoute());
  }

  /** Exposes durable second-chapter meaning for future story conditions. */
  public getChapterTwoSummary(): ChapterTwoSummary {
    return getChapterTwoSummary(this.chapterTwoState, this.getChapterOneHistory(), this.progress);
  }

  /** Returns the current chapter objective from the same persisted event node. */
  public getHudView(): MainStoryHudView | undefined {
    if (!this.isPrologueComplete()) return undefined;
    if (this.stage === 'first-offer' || isChapterOneRouteStage(this.stage) || this.stage === 'chapter-one-complete') {
      return {
        title: 'MAIN STORY / 第一章',
        objective: this.stage === 'first-offer'
          ? '和泡妞討論第一個演出邀請'
          : getChapterOneObjective(this.chapterOneState),
        completed: this.stage === 'chapter-one-complete',
      };
    }
    return {
      title: 'MAIN STORY / 第二章',
      objective: getChapterTwoObjective(this.chapterTwoState),
      completed: this.stage === 'chapter-two-complete',
    };
  }

  /** Returns detached serializable data for persistence and HUD rendering. */
  public getState(): MainStoryState {
    const snapshot = this.progress.getSnapshot();
    return {
      mainStoryStage: this.stage,
      playerStats: snapshot.playerStats,
      relationships: snapshot.relationships,
      storyFlags: { ...this.flags },
      chapterOneNode: this.chapterOneState.chapterOneNode,
      chapterOneOutcome: this.chapterOneState.chapterOneOutcome,
      chapterOneFlags: { ...this.chapterOneState.chapterOneFlags },
      chapterTwoNode: this.chapterTwoState.chapterTwoNode,
      chapterTwoOutcome: this.chapterTwoState.chapterTwoOutcome,
      chapterTwoFlags: { ...this.chapterTwoState.chapterTwoFlags },
    };
  }

  /** Presents the current first-chapter route choices. */
  private getChapterOneInteraction(): StoryInteraction {
    const route = this.getChapterOneRoute();
    const interaction = route
      ? getChapterOneInteraction(this.chapterOneState, route, this.progress)
      : undefined;
    return interaction
      ? { kind: 'choices', ...interaction }
      : { kind: 'message', speaker: BUBBLE_GIRL, text: '先把眼前的安排確認好吧。' };
  }

  /** Applies one first-chapter choice atomically and preserves second-chapter lock state. */
  private resolveChapterOneChoice(choiceId: ChapterOneChoiceId): StoryChoiceResult {
    const route = this.getChapterOneRoute();
    if (!route) return { success: false, speaker: BUBBLE_GIRL, text: '第一章路線無法辨識。' };
    const resolution = resolveChapterOneChoice(this.chapterOneState, route, choiceId, this.progress);
    if (!resolution.success || !resolution.effects || !resolution.nextState) {
      return { success: false, speaker: BUBBLE_GIRL, text: resolution.text };
    }
    this.progress = cloneProgressWithEffects(this.progress, resolution.effects);
    this.chapterOneState = resolution.nextState;
    if (resolution.completed) this.stage = 'chapter-one-complete';
    this.notifyStateChanged();
    return {
      success: true,
      speaker: BUBBLE_GIRL,
      text: resolution.text,
      chapterCompleted: resolution.completed,
      completionLabel: resolution.completed ? CHAPTER_ONE_COMPLETION : undefined,
    };
  }

  /** Applies one second-chapter choice atomically without mutating first-chapter history. */
  private resolveChapterTwoChoice(choiceId: ChapterTwoChoiceId): StoryChoiceResult {
    const resolution = resolveChapterTwoChoice(
      this.chapterTwoState,
      choiceId,
      this.progress,
      this.getChapterOneHistory(),
    );
    if (!resolution.success || !resolution.effects || !resolution.nextState) {
      return { success: false, speaker: BUBBLE_GIRL, text: resolution.text };
    }
    this.progress = cloneProgressWithEffects(this.progress, resolution.effects);
    this.chapterTwoState = resolution.nextState;
    this.stage = resolution.completed
      ? 'chapter-two-complete'
      : getChapterTwoStage(this.chapterTwoState.chapterTwoNode);
    this.notifyStateChanged();
    return {
      success: true,
      speaker: BUBBLE_GIRL,
      text: resolution.text,
      chapterCompleted: resolution.completed,
      completionLabel: resolution.completed ? CHAPTER_TWO_COMPLETION : undefined,
    };
  }

  /** Creates detached first-chapter input for all second-chapter conditions and dialogue. */
  private getChapterOneHistory(): ChapterOneHistoryContext {
    return {
      summary: this.getChapterOneSummary(),
      outcome: this.chapterOneState.chapterOneOutcome,
      flags: { ...this.chapterOneState.chapterOneFlags },
    };
  }

  /** Maps the mutually exclusive first-offer flag to its permanent route. */
  private getChapterOneRoute(): ChapterOneRoute | undefined {
    if (this.flags.acceptedFirstOffer) return 'accepted-offer';
    if (this.flags.choseTrainingFirst) return 'training-first';
    if (this.flags.negotiatedSmallShow) return 'small-show';
    return undefined;
  }

  /** Emits one complete snapshot after an atomic or narrative transition. */
  private notifyStateChanged(): void {
    this.onStateChanged(this.getState());
  }
}

/** Copies and applies one bounded effect set before replacing live progression. */
function cloneProgressWithEffects(progress: PlayerProgress, effects: PlayerProgressEffects): PlayerProgress {
  const snapshot = progress.getSnapshot();
  const next = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
  next.applyEffects(effects);
  return next;
}

/** Creates all-false first-offer history for new or repaired saves. */
function createDefaultStoryFlags(): StoryFlags {
  return {
    acceptedFirstOffer: false,
    choseTrainingFirst: false,
    negotiatedSmallShow: false,
    firstOfferResolved: false,
  };
}

/** Normalizes first-offer booleans while keeping identifiers centralized. */
function normalizeStoryFlags(value: unknown): StoryFlags {
  const source = isRecord(value) ? value : {};
  return {
    acceptedFirstOffer: source.acceptedFirstOffer === true,
    choseTrainingFirst: source.choseTrainingFirst === true,
    negotiatedSmallShow: source.negotiatedSmallShow === true,
    firstOfferResolved: source.firstOfferResolved === true,
  };
}

/** Keeps exactly one first route using definition order as conflict priority. */
function createResolvedFlags(decisionFlag: Exclude<StoryFlagId, 'firstOfferResolved'>): StoryFlags {
  return {
    acceptedFirstOffer: decisionFlag === 'acceptedFirstOffer',
    choseTrainingFirst: decisionFlag === 'choseTrainingFirst',
    negotiatedSmallShow: decisionFlag === 'negotiatedSmallShow',
    firstOfferResolved: true,
  };
}

/** Identifies the one-shot offer choices. */
function isFirstOfferChoice(choiceId: StoryChoiceId): choiceId is FirstOfferChoiceId {
  return FIRST_OFFER_CHOICES.some(({ id }) => id === choiceId);
}

/** Limits first-chapter resolvers to their three distinct route stages. */
function isChapterOneRouteStage(stage: MainStoryStage): boolean {
  return stage === 'preparing-show' || stage === 'training-first' || stage === 'small-show';
}

/** Identifies stages where second-chapter decisions may be resolved. */
function isChapterTwoActiveStage(stage: MainStoryStage): boolean {
  return stage === 'chapter-two-intro' || stage === 'agency-offer' ||
    stage === 'proposal-discussion' || stage === 'creative-choice';
}

/** Treats every later stage as proof that chapter one was completed. */
function isPostChapterOneStage(value: unknown): boolean {
  return value === 'chapter-one-complete' || value === 'chapter-two-intro' ||
    value === 'agency-offer' || value === 'proposal-discussion' ||
    value === 'creative-choice' || value === 'chapter-two-complete';
}

/** Narrows persisted values without treating arrays as story objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
