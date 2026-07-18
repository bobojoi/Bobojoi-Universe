import type Phaser from 'phaser';
import { formatEffectSummary, getChapterTransitionCopy } from '../presentation/ProgressPresentation';
import type { StudioQuestState } from '../quest/StudioQuestManager';
import type {
  MainStoryState,
  StoryChoiceResult,
  StoryChoiceView,
} from '../story/MainStoryManager';
import { ChapterTransitionOverlay } from '../ui/ChapterTransitionOverlay';
import { GuidanceOverlay } from '../ui/GuidanceOverlay';
import { NotificationOverlay } from '../ui/NotificationOverlay';
import {
  getPendingChapterTransitions,
  getTransitionSeenFlag,
  markTutorialFlag,
  normalizeTutorialProgress,
  shouldShowLowEnergyWarning,
  type ChapterTransitionId,
  type TutorialFlagId,
  type TutorialProgressState,
} from './TutorialProgress';

const CHAPTER_TRANSITION_DELAY_MS = 3400;
const LOW_ENERGY_THRESHOLD = 20;

/** Coordinates Demo-only guidance while leaving quest and story rules untouched. */
export class StudioGuidanceController {
  private state: TutorialProgressState;
  private readonly guidance: GuidanceOverlay;
  private readonly notifications: NotificationOverlay;
  private readonly transitions: ChapterTransitionOverlay;
  private transitionTimer?: Phaser.Time.TimerEvent;

  public constructor(
    private readonly scene: Phaser.Scene,
    initialState: TutorialProgressState,
    private readonly getQuestState: () => StudioQuestState,
    private readonly getStoryState: () => MainStoryState,
    private readonly persistProgress: (state: TutorialProgressState) => boolean,
    private readonly beforeTransition: () => void,
  ) {
    this.state = normalizeTutorialProgress(initialState);
    this.guidance = new GuidanceOverlay(scene);
    this.notifications = new NotificationOverlay(scene);
    this.transitions = new ChapterTransitionOverlay(scene);
  }

  /** Starts first-entry copy, one-shot hints, and any interrupted chapter transition. */
  public start(): void {
    if (!this.state.sawIntroText) {
      this.markSeen('sawIntroText');
      this.guidance.show(
        [
          {
            eyebrow: 'YOUR STORY BEGINS',
            title: '你是泡泡俠',
            body: '你和泡妞、泡彈一起待在小小的工作室裡。\n\n你們還沒有名氣，也不知道下一次演出機會會從哪裡來。\n\n但你相信，小小的泡泡，也能創造很大的改變。',
          },
          {
            eyebrow: 'FIRST STEP',
            title: '從一次交談開始',
            body: '走近泡妞，按 E 與她交談。',
          },
        ],
        () => this.showInitialHints(),
      );
      return;
    }
    this.showInitialHints();
  }

  /** Advances modal guidance without installing long-lived keyboard callbacks. */
  public update(): void {
    this.guidance.update();
  }

  /** Reports when tutorial or chapter UI owns player input. */
  public isBlockingInput(): boolean {
    return this.guidance.isActive() || this.transitions.isActive() || Boolean(this.transitionTimer);
  }

  /** Shows the branch explanation once, then releases the original choice callback. */
  public presentChoiceExplanation(
    choices: StoryChoiceView[],
    onReady: () => void,
  ): void {
    if (this.state.sawChoiceExplanation) {
      onReady();
      return;
    }
    const hasDisabledChoice = choices.some(({ enabled }) => !enabled);
    this.markSeen('sawChoiceExplanation');
    this.guidance.show(
      [{
        eyebrow: 'CHOICES MATTER',
        title: '你的選擇會留下影響',
        body: `你的選擇會改變能力、關係與後續故事。${
          hasDisabledChoice ? '\n\n部分選項需要足夠的能力、信任或過去經歷。' : ''
        }`,
      }],
      onReady,
    );
  }

  /** Presents only committed deltas, the actual save result, and one low-energy warning. */
  public presentChoiceResult(result: StoryChoiceResult, saveSucceeded: boolean): void {
    const effectLines = formatEffectSummary(result.effects);
    if (effectLines.length > 0) this.notifications.show(effectLines, 'effect', 2400);
    this.showSaveNotification(saveSucceeded);
    this.showLowEnergyWarningIfNeeded();
  }

  /** Schedules reached transitions without replaying previously started cards. */
  public schedulePendingChapterTransitions(): void {
    if (this.transitionTimer || this.transitions.isActive()) return;
    const pending = getPendingChapterTransitions(
      this.getQuestState(),
      this.getStoryState(),
      this.state,
    );
    if (pending.length === 0) return;
    this.transitionTimer = this.scene.time.delayedCall(CHAPTER_TRANSITION_DELAY_MS, () => {
      this.transitionTimer = undefined;
      this.beforeTransition();
      this.playTransitionQueue(pending);
    });
  }

  /** Returns detached persistent guidance state for normal game saves. */
  public getState(): TutorialProgressState {
    return normalizeTutorialProgress(this.state);
  }

  /** Removes every overlay timer and callback during scene shutdown. */
  public destroy(): void {
    this.transitionTimer?.remove(false);
    this.guidance.destroy();
    this.notifications.destroy();
    this.transitions.destroy();
  }

  /** Displays each missing first-studio hint once without blocking movement. */
  private showInitialHints(): void {
    const hints: Array<[TutorialFlagId, string]> = [
      ['sawMovementHint', '使用 WASD 移動'],
      ['sawInteractionHint', '靠近角色或物件時，按 E 互動'],
      ['sawObjectiveHint', '目前目標：和泡妞談談'],
    ];
    for (const [flag, text] of hints) {
      if (this.state[flag]) continue;
      this.markSeen(flag);
      this.notifications.show(text, 'info', 1900);
    }
    this.schedulePendingChapterTransitions();
  }

  /** Persists before showing one-shot UI so reload cannot duplicate it. */
  private markSeen(flag: TutorialFlagId): boolean {
    this.state = markTutorialFlag(this.state, flag);
    return this.persistProgress(this.getState());
  }

  private showSaveNotification(saveSucceeded: boolean): void {
    if (!saveSucceeded) {
      this.notifications.show(
        '儲存失敗，請確認瀏覽器儲存空間。',
        'warning',
        2800,
      );
      return;
    }
    if (!this.state.sawAutosaveExplanation) {
      this.markSeen('sawAutosaveExplanation');
      this.notifications.show(
        ['進度已自動儲存', '重要事件與選擇會自動保存。'],
        'success',
        2600,
      );
      return;
    }
    this.notifications.show('已儲存', 'success', 1600);
  }

  private showLowEnergyWarningIfNeeded(): void {
    const energy = this.getStoryState().playerStats.energy;
    if (!shouldShowLowEnergyWarning(energy, this.state, LOW_ENERGY_THRESHOLD)) return;
    this.markSeen('sawLowEnergyWarning');
    this.notifications.show(
      '體力已經很低。部分選擇可能讓你更加疲憊。',
      'warning',
      2800,
    );
  }

  /** Marks one card at its actual start so queued cards survive an interrupted scene. */
  private playTransitionQueue(pending: ChapterTransitionId[]): void {
    const [current, ...remaining] = pending;
    if (!current) return;
    this.markSeen(getTransitionSeenFlag(current));
    this.transitions.play(
      [getChapterTransitionCopy(current)],
      () => this.playTransitionQueue(remaining),
    );
  }
}
