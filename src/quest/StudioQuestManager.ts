/** Stable investigation identifiers are persisted in save data. */
export type StudioInvestigationId = 'prop-box' | 'bubble-table' | 'dog-mat';

/** Explicit stages prevent impossible combinations from driving the HUD. */
export type StudioQuestStage =
  | 'not-started'
  | 'in-progress'
  | 'ring-discovered'
  | 'ring-collected'
  | 'completed';

/** Serializable state for the studio tutorial quest. */
export interface StudioQuestState {
  stage: StudioQuestStage;
  investigated: Record<StudioInvestigationId, boolean>;
}

/** Scene events keep world animation outside the quest state machine. */
export type StudioQuestEvent = 'dog-runs' | 'ring-revealed' | 'ring-collected' | 'completed';

/** Every interaction returns player-facing copy and optional scene events. */
export interface StudioQuestInteractionResult {
  message: string;
  events?: StudioQuestEvent[];
}

/** HUD data stays presentation-agnostic and easy to replace later. */
export interface StudioQuestHudView {
  title: string;
  objective: string;
  completed: boolean;
}

const QUEST_TITLE = '尋找星光泡泡環';
const INVESTIGATION_IDS: StudioInvestigationId[] = ['prop-box', 'bubble-table', 'dog-mat'];

const INVESTIGATION_MESSAGES: Record<StudioInvestigationId, string> = {
  'prop-box': '道具箱裡只有彩帶和備用氣球，沒有星光泡泡環。',
  'bubble-table': '桌上留著一串亮晶晶的泡泡水腳印，一路往泡彈的休息墊去了。',
  'dog-mat': '泡彈突然跳起來跑開了！休息墊下面好像壓著什麼。',
};

const REPEAT_MESSAGES: Record<StudioInvestigationId, string> = {
  'prop-box': '道具箱已經找過了，星光泡泡環不在裡面。',
  'bubble-table': '泡泡水腳印仍然指向泡彈的休息墊。',
  'dog-mat': '休息墊已經仔細檢查過了。',
};

/** Creates a defensive default that is also used by save migration. */
export function createDefaultStudioQuestState(): StudioQuestState {
  return {
    stage: 'not-started',
    investigated: {
      'prop-box': false,
      'bubble-table': false,
      'dog-mat': false,
    },
  };
}

/** Converts current-version input without reviving removed legacy flags. */
export function normalizeStudioQuestState(value: unknown): StudioQuestState {
  const fallback = createDefaultStudioQuestState();
  if (!isRecord(value)) return fallback;

  return {
    stage: isStudioQuestStage(value.stage) ? value.stage : fallback.stage,
    investigated: normalizeInvestigations(value.investigated),
  };
}

/** Migrates redundant v2 flags using one documented highest-stage-wins policy. */
export function migrateLegacyStudioQuestState(value: unknown): StudioQuestState {
  const fallback = createDefaultStudioQuestState();
  if (!isRecord(value)) return fallback;

  const legacyStage = isStudioQuestStage(value.stage) ? value.stage : fallback.stage;
  let stage = legacyStage;

  // Precedence: completed > ring-collected > ring-discovered > in-progress > not-started.
  if (value.completed === true || legacyStage === 'completed') {
    stage = 'completed';
  } else if (value.ringCollected === true || legacyStage === 'ring-collected') {
    stage = 'ring-collected';
  }

  return { stage, investigated: normalizeInvestigations(value.investigated) };
}

/** Owns the small tutorial state machine without controlling scene objects or UI. */
export class StudioQuestManager {
  private state: StudioQuestState;

  public constructor(
    initialState: StudioQuestState,
    private readonly onStateChanged: (state: StudioQuestState) => void,
  ) {
    this.state = normalizeStudioQuestState(initialState);
  }

  /** Starts, advances, completes, or follows up the quest through 泡妞. */
  public interactWithBubbleGirl(): StudioQuestInteractionResult {
    switch (this.state.stage) {
      case 'not-started':
        this.state.stage = 'in-progress';
        this.notifyStateChanged();
        return {
          message:
            '泡妞：準備表演了……咦？星光泡泡環不見了！可以幫我調查工作室嗎？',
        };
      case 'in-progress':
        return { message: '泡妞：麻煩你找找道具箱、泡泡水工作桌和泡彈的休息墊。' };
      case 'ring-discovered':
        return { message: '泡妞：那道閃光一定是星光泡泡環，快去拿起來看看！' };
      case 'ring-collected':
        this.state.stage = 'completed';
        this.notifyStateChanged();
        return {
          message: '泡妞：找到了！有了星光泡泡環，今天的表演一定會閃閃發亮！',
          events: ['completed'],
        };
      case 'completed':
        return { message: '泡妞：星光泡泡環準備好了，一起開始今天的練習吧！' };
    }
  }

  /** Records one freely ordered investigation and reveals the ring after all three. */
  public investigate(location: StudioInvestigationId): StudioQuestInteractionResult {
    if (this.state.stage === 'not-started') {
      return { message: '現在還不需要調查這裡。先去和泡妞打聲招呼吧。' };
    }

    if (this.state.investigated[location]) {
      return { message: REPEAT_MESSAGES[location] };
    }

    if (this.state.stage !== 'in-progress') {
      return { message: REPEAT_MESSAGES[location] };
    }

    this.state.investigated[location] = true;
    const events: StudioQuestEvent[] = [];
    if (location === 'dog-mat') events.push('dog-runs');

    let message = INVESTIGATION_MESSAGES[location];
    if (this.hasInvestigatedEveryLocation()) {
      this.state.stage = 'ring-discovered';
      events.push('ring-revealed');
      message += ' 星光泡泡環就在休息墊旁閃著光！';
    }

    this.notifyStateChanged();
    return { message, events };
  }

  /** Adds the discovered ring to the player's quest inventory exactly once. */
  public collectRing(): StudioQuestInteractionResult {
    if (!this.canCollectRing()) {
      return { message: '這裡目前沒有可以拿取的東西。' };
    }

    this.state.stage = 'ring-collected';
    this.notifyStateChanged();
    return {
      message: '你取得了「星光泡泡環」！把它交給泡妞吧。',
      events: ['ring-collected'],
    };
  }

  /** Returns a detached snapshot safe for persistence. */
  public getState(): StudioQuestState {
    return normalizeStudioQuestState(this.state);
  }

  /** Provides one authoritative condition for visibility, interaction, and collection. */
  public canCollectRing(): boolean {
    return this.state.stage === 'ring-discovered';
  }

  /** Derives inventory history from stage instead of persisting a duplicate flag. */
  public isRingCollected(): boolean {
    return this.state.stage === 'ring-collected' || this.state.stage === 'completed';
  }

  /** Derives completion from stage instead of persisting a duplicate flag. */
  public isCompleted(): boolean {
    return this.state.stage === 'completed';
  }

  /** Exposes task copy without coupling HUD to quest rules. */
  public getHudView(): StudioQuestHudView | undefined {
    switch (this.state.stage) {
      case 'not-started':
        return undefined;
      case 'in-progress': {
        const count = INVESTIGATION_IDS.filter((id) => this.state.investigated[id]).length;
        return { title: QUEST_TITLE, objective: `調查工作室的三處線索（${count}/3）`, completed: false };
      }
      case 'ring-discovered':
        return { title: QUEST_TITLE, objective: '拿起休息墊旁的星光泡泡環', completed: false };
      case 'ring-collected':
        return { title: QUEST_TITLE, objective: '把星光泡泡環交給泡妞', completed: false };
      case 'completed':
        return { title: QUEST_TITLE, objective: '任務完成 · 星光泡泡環已歸還', completed: true };
    }
  }

  private hasInvestigatedEveryLocation(): boolean {
    return INVESTIGATION_IDS.every((id) => this.state.investigated[id]);
  }

  private notifyStateChanged(): void {
    this.onStateChanged(this.getState());
  }
}

/** Narrows JSON values without trusting persisted data. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Normalizes the three independent investigation flags for every save version. */
function normalizeInvestigations(value: unknown): StudioQuestState['investigated'] {
  const investigated = isRecord(value) ? value : {};
  return {
    'prop-box': investigated['prop-box'] === true,
    'bubble-table': investigated['bubble-table'] === true,
    'dog-mat': investigated['dog-mat'] === true,
  };
}

/** Rejects unknown future or corrupted stage strings during load. */
function isStudioQuestStage(value: unknown): value is StudioQuestStage {
  return (
    value === 'not-started' ||
    value === 'in-progress' ||
    value === 'ring-discovered' ||
    value === 'ring-collected' ||
    value === 'completed'
  );
}
