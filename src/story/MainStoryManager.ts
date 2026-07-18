import {
  createDefaultChapterOneState,
  getChapterOneInteraction,
  getChapterOneObjective,
  getChapterOnePostDialogue,
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
  createDefaultPlayerStats,
  createDefaultRelationships,
  normalizePlayerStats,
  normalizeRelationships,
  PlayerProgress,
  type PlayerProgressEffects,
  type PlayerStatsState,
  type RelationshipState,
} from './PlayerProgress';

/** Main-story stage is the single source of truth for the current chapter position. */
export type MainStoryStage =
  | 'prologue'
  | 'first-offer'
  | 'preparing-show'
  | 'training-first'
  | 'small-show'
  | 'chapter-one-complete';

/** Type-safe story flags record the route decision separately from current stage. */
export type StoryFlagId =
  | 'acceptedFirstOffer'
  | 'choseTrainingFirst'
  | 'negotiatedSmallShow'
  | 'firstOfferResolved';

/** Serializable first-offer flags. */
export type StoryFlags = Record<StoryFlagId, boolean>;

/** Stable identifiers for the three first-offer decisions. */
export type FirstOfferChoiceId = 'accept-now' | 'train-first' | 'small-show';

/** Every dialogue choice is resolved by the story owner, never by the scene. */
export type StoryChoiceId = FirstOfferChoiceId | ChapterOneChoiceId;

/** Complete persistent story and character progression state. */
export interface MainStoryState extends ChapterOneState {
  mainStoryStage: MainStoryStage;
  playerStats: PlayerStatsState;
  relationships: RelationshipState;
  storyFlags: StoryFlags;
}

/** UI-ready choice data contains resolved rules but no presentation objects. */
export interface StoryChoiceView {
  id: StoryChoiceId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** Structured story dialogue keeps scene code free of route rules. */
export type StoryInteraction =
  | { kind: 'message'; speaker: string; text: string }
  | { kind: 'choices'; speaker: string; text: string; choices: StoryChoiceView[] };

/** Choice resolution reports one follow-up line without exposing mutation details. */
export interface StoryChoiceResult {
  success: boolean;
  speaker: string;
  text: string;
  chapterCompleted?: boolean;
}

/** Compact main-story HUD state is derived from the same persisted node. */
export interface MainStoryHudView {
  title: string;
  objective: string;
  completed: boolean;
}

interface FirstOfferChoiceDefinition {
  id: FirstOfferChoiceId;
  label: string;
  targetStage: Exclude<MainStoryStage, 'prologue' | 'first-offer' | 'chapter-one-complete'>;
  route: ChapterOneRoute;
  decisionFlag: Exclude<StoryFlagId, 'firstOfferResolved'>;
  effects: PlayerProgressEffects;
  followUp: string;
  condition: (progress: PlayerProgress) => { enabled: boolean; reason?: string };
}

const BUBBLE_GIRL = '泡妞';
const FIRST_OFFER_PROMPT =
  '工作室剛收到第一個演出邀請，但時間很趕，我們還沒有完全準備好。你想怎麼做？';

/** Ordered definitions provide deterministic UI order and conflict-repair priority. */
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

/** Creates safe story defaults based on whether the tutorial prologue is complete. */
export function createDefaultMainStoryState(prologueComplete: boolean): MainStoryState {
  return {
    mainStoryStage: prologueComplete ? 'first-offer' : 'prologue',
    playerStats: createDefaultPlayerStats(),
    relationships: createDefaultRelationships(),
    storyFlags: createDefaultStoryFlags(),
    ...createDefaultChapterOneState(),
  };
}

/** Normalizes current story data and repairs contradictory routes centrally. */
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
    };
  }

  const rawFlags = normalizeStoryFlags(source.storyFlags);
  const selectedChoice = FIRST_OFFER_CHOICES.find(({ decisionFlag }) => rawFlags[decisionFlag]) ??
    (source.mainStoryStage === 'chapter-one-complete' ? FIRST_OFFER_CHOICES[0] : undefined);
  if (!selectedChoice) {
    return {
      mainStoryStage: 'first-offer',
      playerStats,
      relationships,
      storyFlags: createDefaultStoryFlags(),
      ...createDefaultChapterOneState(),
    };
  }

  const chapterComplete =
    source.mainStoryStage === 'chapter-one-complete' || source.chapterOneNode === 'complete';
  const chapterState = normalizeChapterOneState(source, selectedChoice.route, chapterComplete);
  return {
    mainStoryStage: chapterComplete ? 'chapter-one-complete' : selectedChoice.targetStage,
    playerStats,
    relationships,
    storyFlags: createResolvedFlags(selectedChoice.decisionFlag),
    ...chapterState,
  };
}

/** Owns main-story rules, conditions, flags, and atomic effects without Phaser. */
export class MainStoryManager {
  private stage: MainStoryStage;
  private flags: StoryFlags;
  private chapterState: ChapterOneState;
  private progress: PlayerProgress;

  public constructor(
    initialState: MainStoryState,
    private readonly isPrologueComplete: () => boolean,
    private readonly onStateChanged: (state: MainStoryState) => void,
  ) {
    const normalized = normalizeMainStoryState(initialState, isPrologueComplete());
    this.stage = normalized.mainStoryStage;
    this.flags = normalized.storyFlags;
    this.chapterState = {
      chapterOneNode: normalized.chapterOneNode,
      chapterOneOutcome: normalized.chapterOneOutcome,
      chapterOneFlags: normalized.chapterOneFlags,
    };
    this.progress = new PlayerProgress(normalized.playerStats, normalized.relationships);
  }

  /** Returns the correct BubbleGirl story interaction, or defers to the tutorial quest. */
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
    if (this.stage === 'chapter-one-complete') {
      return {
        kind: 'message',
        speaker: BUBBLE_GIRL,
        text: getChapterOnePostDialogue(this.getRoute(), this.chapterState.chapterOneOutcome),
      };
    }

    const route = this.getRoute();
    const interaction = route
      ? getChapterOneInteraction(this.chapterState, route, this.progress)
      : undefined;
    return interaction
      ? { kind: 'choices', ...interaction }
      : { kind: 'message', speaker: BUBBLE_GIRL, text: '先把眼前的安排確認好吧。' };
  }

  /** Returns condition-resolved first-offer options without exposing predicates to the UI. */
  public getFirstOfferChoices(): StoryChoiceView[] {
    return FIRST_OFFER_CHOICES.map((choice) => {
      const condition = choice.condition(this.progress);
      return {
        id: choice.id,
        label: choice.label,
        enabled: condition.enabled,
        ...(condition.enabled || !condition.reason
          ? {}
          : { unavailableReason: condition.reason }),
      };
    });
  }

  /** Resolves either the first offer or the active route event through one scene API. */
  public resolveStoryChoice(choiceId: StoryChoiceId): StoryChoiceResult {
    if (isFirstOfferChoice(choiceId)) return this.resolveFirstOffer(choiceId);
    const route = this.getRoute();
    if (!route || this.stage === 'chapter-one-complete') {
      return { success: false, speaker: BUBBLE_GIRL, text: '這段選擇已經結束了。' };
    }
    const resolution = resolveChapterOneChoice(this.chapterState, route, choiceId, this.progress);
    if (!resolution.success || !resolution.effects || !resolution.nextState) {
      return { success: false, speaker: BUBBLE_GIRL, text: resolution.text };
    }

    // Draft every effect before replacing live progression and chapter state once.
    const snapshot = this.progress.getSnapshot();
    const nextProgress = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
    nextProgress.applyEffects(resolution.effects);
    this.progress = nextProgress;
    this.chapterState = resolution.nextState;
    if (resolution.completed) this.stage = 'chapter-one-complete';
    this.notifyStateChanged();
    return {
      success: true,
      speaker: BUBBLE_GIRL,
      text: resolution.text,
      chapterCompleted: resolution.completed,
    };
  }

  /** Atomically applies the one available route decision and rejects replays. */
  public resolveFirstOffer(choiceId: FirstOfferChoiceId): StoryChoiceResult {
    if (!this.canResolveFirstOffer()) {
      return { success: false, speaker: BUBBLE_GIRL, text: '這次演出邀請已經做出決定了。' };
    }
    const definition = FIRST_OFFER_CHOICES.find(({ id }) => id === choiceId);
    if (!definition) {
      return { success: false, speaker: BUBBLE_GIRL, text: '這個選擇目前不存在。' };
    }
    const condition = definition.condition(this.progress);
    if (!condition.enabled) {
      return {
        success: false,
        speaker: BUBBLE_GIRL,
        text: condition.reason ?? '目前還不能選擇這個做法。',
      };
    }

    const snapshot = this.progress.getSnapshot();
    const nextProgress = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
    nextProgress.applyEffects(definition.effects);
    this.progress = nextProgress;
    this.stage = definition.targetStage;
    this.flags = createResolvedFlags(definition.decisionFlag);
    this.chapterState = {
      chapterOneNode: getRouteOpeningNode(definition.route),
      chapterOneFlags: createDefaultChapterOneState().chapterOneFlags,
    };
    this.notifyStateChanged();
    return { success: true, speaker: BUBBLE_GIRL, text: definition.followUp };
  }

  /** Reports whether the one-shot offer can still be resolved. */
  public canResolveFirstOffer(): boolean {
    return this.isPrologueComplete() && this.stage === 'first-offer' && !this.flags.firstOfferResolved;
  }

  /** Exposes derived chapter facts for future story conditions without mutable flags. */
  public getChapterOneSummary(): ChapterOneSummary {
    return getChapterOneSummary(this.chapterState, this.getRoute());
  }

  /** Returns a compact objective card from the same story state used for interaction. */
  public getHudView(): MainStoryHudView | undefined {
    if (!this.isPrologueComplete()) return undefined;
    return {
      title: 'MAIN STORY / 第一章',
      objective: this.stage === 'first-offer'
        ? '和泡妞討論第一個演出邀請'
        : getChapterOneObjective(this.chapterState),
      completed: this.stage === 'chapter-one-complete',
    };
  }

  /** Returns a detached snapshot for HUD rendering and persistence. */
  public getState(): MainStoryState {
    const snapshot = this.progress.getSnapshot();
    return {
      mainStoryStage: this.stage,
      playerStats: snapshot.playerStats,
      relationships: snapshot.relationships,
      storyFlags: { ...this.flags },
      chapterOneNode: this.chapterState.chapterOneNode,
      chapterOneOutcome: this.chapterState.chapterOneOutcome,
      chapterOneFlags: { ...this.chapterState.chapterOneFlags },
    };
  }

  /** Maps the mutually exclusive first-offer flag to a permanent route identity. */
  private getRoute(): ChapterOneRoute | undefined {
    if (this.flags.acceptedFirstOffer) return 'accepted-offer';
    if (this.flags.choseTrainingFirst) return 'training-first';
    if (this.flags.negotiatedSmallShow) return 'small-show';
    return undefined;
  }

  /** Emits one complete state after an atomic transition. */
  private notifyStateChanged(): void {
    this.onStateChanged(this.getState());
  }
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

/** Normalizes booleans while keeping identifiers centralized. */
function normalizeStoryFlags(value: unknown): StoryFlags {
  const source = isRecord(value) ? value : {};
  return {
    acceptedFirstOffer: source.acceptedFirstOffer === true,
    choseTrainingFirst: source.choseTrainingFirst === true,
    negotiatedSmallShow: source.negotiatedSmallShow === true,
    firstOfferResolved: source.firstOfferResolved === true,
  };
}

/** Keeps exactly one route flag using definition order as conflict priority. */
function createResolvedFlags(decisionFlag: Exclude<StoryFlagId, 'firstOfferResolved'>): StoryFlags {
  return {
    acceptedFirstOffer: decisionFlag === 'acceptedFirstOffer',
    choseTrainingFirst: decisionFlag === 'choseTrainingFirst',
    negotiatedSmallShow: decisionFlag === 'negotiatedSmallShow',
    firstOfferResolved: true,
  };
}

function isFirstOfferChoice(choiceId: StoryChoiceId): choiceId is FirstOfferChoiceId {
  return FIRST_OFFER_CHOICES.some(({ id }) => id === choiceId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
