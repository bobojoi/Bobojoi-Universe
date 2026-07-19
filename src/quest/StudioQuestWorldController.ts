import type Phaser from 'phaser';
import type { BubbleDog } from '../character/BubbleDog';
import type { DialogueSystem } from '../system/DialogueSystem';
import type { HUD } from '../ui/HUD';
import type {
  StudioQuestEvent,
  StudioQuestInteractionResult,
  StudioQuestManager,
} from './StudioQuestManager';

const DOG_REST_X = 520;
const DOG_REST_Y = 460;
const DOG_RUN_X = 340;
const DOG_RUN_Y = 350;

/** Small dependency bundle for applying quest effects to the studio world. */
export interface StudioQuestWorldObjects {
  bubbleDog: BubbleDog;
  starRing: Phaser.GameObjects.Container;
  dialogue: DialogueSystem;
  hud: HUD;
}

/** Coordinates quest results with studio objects while keeping rules Phaser-free. */
export class StudioQuestWorldController {
  public constructor(
    private readonly quest: StudioQuestManager,
    private readonly world: StudioQuestWorldObjects,
  ) {}

  /** Restores deterministic world and HUD state without replaying one-shot effects. */
  public synchronizeFromState(): void {
    const dogHasRun = this.quest.getState().investigated['dog-mat'];
    this.world.bubbleDog.restoreHome(
      dogHasRun ? DOG_RUN_X : DOG_REST_X,
      dogHasRun ? DOG_RUN_Y : DOG_REST_Y,
    );
    this.synchronizeRingAvailability();
    this.refreshHud();
  }

  /** Presents dialogue and applies only the world events emitted by one interaction. */
  public applyInteraction(result: StudioQuestInteractionResult): void {
    this.world.dialogue.show(result.message);
    for (const event of result.events ?? []) this.applyEvent(event);
  }

  /** Exposes the same authoritative query used to render the ring. */
  public isRingAvailable(): boolean {
    return this.quest.canCollectRing();
  }

  /** Refreshes derived task copy after state changes without replaying effects. */
  public refreshHud(): void {
    this.world.hud.setQuest(this.quest.isCompleted() ? undefined : this.quest.getHudView());
  }

  /** Maps the small studio event vocabulary to concrete scene effects. */
  private applyEvent(event: StudioQuestEvent): void {
    switch (event) {
      case 'dog-runs':
        this.world.bubbleDog.runTo(DOG_RUN_X, DOG_RUN_Y);
        break;
      case 'ring-revealed':
      case 'ring-collected':
        this.synchronizeRingAvailability();
        break;
      case 'completed':
        this.world.hud.showQuestCompleted();
        break;
    }
  }

  /** Keeps visible and interactive ring conditions tied to one manager query. */
  private synchronizeRingAvailability(): void {
    this.world.starRing.setVisible(this.isRingAvailable());
  }
}
