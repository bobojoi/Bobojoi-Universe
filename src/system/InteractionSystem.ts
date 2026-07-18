import Phaser from 'phaser';

const DEFAULT_INTERACTION_DISTANCE = 132;

/** Data contract for any object that can respond to player interaction. */
export interface Interactable {
  target: Phaser.GameObjects.Components.Transform;
  prompt: string | (() => string);
  onInteract: () => void;
  isEnabled?: () => boolean;
}

/** Locates the nearest valid interaction and executes it on demand. */
export class InteractionSystem {
  private readonly interactables: Interactable[] = [];

  public constructor(
    private readonly player: Phaser.GameObjects.Components.Transform,
    private readonly interactionDistance = DEFAULT_INTERACTION_DISTANCE,
  ) {}

  /** Registers world content without requiring type-specific interaction code. */
  public register(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  /** Returns the closest target inside the configured interaction radius. */
  public getNearest(): Interactable | undefined {
    let nearest: Interactable | undefined;
    let nearestDistance = this.interactionDistance;

    for (const interactable of this.interactables) {
      if (interactable.isEnabled && !interactable.isEnabled()) continue;

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        interactable.target.x,
        interactable.target.y,
      );

      if (distance <= nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  /** Resolves dynamic prompt copy only for the active nearby target. */
  public getPrompt(interactable: Interactable): string {
    return typeof interactable.prompt === 'function' ? interactable.prompt() : interactable.prompt;
  }
}
