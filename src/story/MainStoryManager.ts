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

/** Type-safe story flags record historical decisions separately from current stage. */
export type StoryFlagId =
  | 'acceptedFirstOffer'
  | 'choseTrainingFirst'
  | 'negotiatedSmallShow'
  | 'firstOfferResolved';

/** Serializable story flags. */
export type StoryFlags = Record<StoryFlagId, boolean>;

/** Stable identifiers for the three first-offer decisions. */
export type FirstOfferChoiceId = 'accept-now' | 'train-first' | 'small-show';

/** Complete persistent story and character progression state. */
export interface MainStoryState {
  mainStoryStage: MainStoryStage;
  playerStats: PlayerStatsState;
  relationships: RelationshipState;
  storyFlags: StoryFlags;
}

/** UI-ready choice data contains resolved rules but no presentation objects. */
export interface StoryChoiceView {
  id: FirstOfferChoiceId;
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
}

interface FirstOfferChoiceDefinition {
  id: FirstOfferChoiceId;
  label: string;
  targetStage: MainStoryStage;
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
    decisionFlag: 'choseTrainingFirst',
    effects: { stats: { technique: 10, conviction: 5 }, bubbleGirlTrust: 5 },
    followUp: '好，我們先把實力準備好。下一次機會來時，就不能再錯過。',
    condition: () => ({ enabled: true }),
  },
  {
    id: 'small-show',
    label: '提議縮小演出規模',
    targetStage: 'small-show',
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
  };
}

/** Normalizes v4 story data and repairs contradictory route flags centrally. */
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
    };
  }

  const rawFlags = normalizeStoryFlags(source.storyFlags);
  const selectedChoice = FIRST_OFFER_CHOICES.find(({ decisionFlag }) => rawFlags[decisionFlag]);

  // A resolved event without one understandable route is reset to an available offer.
  if (!selectedChoice) {
    return {
      mainStoryStage: 'first-offer',
      playerStats,
      relationships,
      storyFlags: createDefaultStoryFlags(),
    };
  }

  const stage =
    source.mainStoryStage === 'chapter-one-complete'
      ? 'chapter-one-complete'
      : selectedChoice.targetStage;
  return {
    mainStoryStage: stage,
    playerStats,
    relationships,
    storyFlags: createResolvedFlags(selectedChoice.decisionFlag),
  };
}

/** Owns main-story rules, conditions, flags, and atomic choice effects without Phaser. */
export class MainStoryManager {
  private stage: MainStoryStage;
  private flags: StoryFlags;
  private progress: PlayerProgress;

  public constructor(
    initialState: MainStoryState,
    private readonly isPrologueComplete: () => boolean,
    private readonly onStateChanged: (state: MainStoryState) => void,
  ) {
    const normalized = normalizeMainStoryState(initialState, isPrologueComplete());
    this.stage = normalized.mainStoryStage;
    this.flags = normalized.storyFlags;
    this.progress = new PlayerProgress(normalized.playerStats, normalized.relationships);
  }

  /** Returns the correct BubbleGirl story interaction, or defers to the tutorial quest. */
  public interactWithBubbleGirl(): StoryInteraction | undefined {
    if (!this.isPrologueComplete()) return undefined;

    if (this.stage === 'prologue') {
      this.stage = 'first-offer';
      this.notifyStateChanged();
    }

    switch (this.stage) {
      case 'first-offer':
        return {
          kind: 'choices',
          speaker: BUBBLE_GIRL,
          text: FIRST_OFFER_PROMPT,
          choices: this.getFirstOfferChoices(),
        };
      case 'preparing-show':
        return {
          kind: 'message',
          speaker: BUBBLE_GIRL,
          text: '演出已經接下來了。先整理流程，再把最需要的段落練熟。',
        };
      case 'training-first':
        return {
          kind: 'message',
          speaker: BUBBLE_GIRL,
          text:
            this.progress.getBubbleGirlTrust() >= 5
              ? '你願意先把基本功練穩，我很放心。今天從星環的節奏開始吧。'
              : '既然選擇先練習，我們就把每一個動作做好。',
        };
      case 'small-show':
        return {
          kind: 'message',
          speaker: BUBBLE_GIRL,
          text: '小型演出的流程正在成形。我們先把第一段做到最好。',
        };
      case 'chapter-one-complete':
        return {
          kind: 'message',
          speaker: BUBBLE_GIRL,
          text: '第一步已經踏出去了。接下來，工作室會迎來更多選擇。',
        };
    }
  }

  /** Returns condition-resolved options without exposing predicates to the UI. */
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

  /** Atomically applies one available decision and rejects every replay attempt. */
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

    // Draft every mutation first, then replace live state and notify exactly once.
    const snapshot = this.progress.getSnapshot();
    const nextProgress = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
    nextProgress.applyEffects(definition.effects);
    const nextFlags = createResolvedFlags(definition.decisionFlag);

    this.progress = nextProgress;
    this.stage = definition.targetStage;
    this.flags = nextFlags;
    this.notifyStateChanged();
    return { success: true, speaker: BUBBLE_GIRL, text: definition.followUp };
  }

  /** Reports whether the one-shot offer can still be resolved. */
  public canResolveFirstOffer(): boolean {
    return (
      this.isPrologueComplete() &&
      this.stage === 'first-offer' &&
      !this.flags.firstOfferResolved
    );
  }

  /** Returns a detached snapshot for HUD rendering and persistence. */
  public getState(): MainStoryState {
    const snapshot = this.progress.getSnapshot();
    return {
      mainStoryStage: this.stage,
      playerStats: snapshot.playerStats,
      relationships: snapshot.relationships,
      storyFlags: { ...this.flags },
    };
  }

  /** Emits one complete state after an atomic transition. */
  private notifyStateChanged(): void {
    this.onStateChanged(this.getState());
  }
}

/** Creates all false historical flags for new or repaired saves. */
function createDefaultStoryFlags(): StoryFlags {
  return {
    acceptedFirstOffer: false,
    choseTrainingFirst: false,
    negotiatedSmallShow: false,
    firstOfferResolved: false,
  };
}

/** Normalizes booleans while keeping flag identifiers centralized. */
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

/** Narrows persisted values without treating arrays as story objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
