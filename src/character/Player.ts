import Phaser from 'phaser';
import {
  CHARACTER_VISUALS,
  getWorldDepth,
  type CharacterTextureVisual,
} from '../constants/CharacterVisualConstants';

const PLAYER_SPEED = 260;
const MOVEMENT_BOB_AMOUNT = 0.012;
const MOVEMENT_BOB_PERIOD_MS = 130;
const ACTION_DURATION_MS = 460;

/** Keyboard bindings are injected to keep Player independent of scene setup. */
export interface PlayerControls {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

/** Owns player movement and player-specific physics behavior. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly controls: PlayerControls;
  private actionTimer?: Phaser.Time.TimerEvent;

  public constructor(scene: Phaser.Scene, x: number, y: number, controls: PlayerControls) {
    super(scene, x, y, CHARACTER_VISUALS.HERO.standing.texture);
    this.controls = controls;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(CHARACTER_VISUALS.HERO.originX, CHARACTER_VISUALS.HERO.originY);
    this.applyVisual(CHARACTER_VISUALS.HERO.standing);
    this.setDepth(getWorldDepth(y));
    this.setCollideWorldBounds(true);
  }

  /** Applies normalized velocity so diagonal movement is not faster. */
  public updateMovement(enabled = true): void {
    if (!enabled) {
      this.setVelocity(0, 0);
      this.setScale(CHARACTER_VISUALS.HERO.scale);
      this.setDepth(getWorldDepth(this.y));
      return;
    }

    const horizontal = Number(this.controls.right.isDown) - Number(this.controls.left.isDown);
    const vertical = Number(this.controls.down.isDown) - Number(this.controls.up.isDown);
    const direction = new Phaser.Math.Vector2(horizontal, vertical).normalize();

    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
    const moving = horizontal !== 0 || vertical !== 0;
    const bob = moving
      ? 1 + Math.sin(this.scene.time.now / MOVEMENT_BOB_PERIOD_MS) * MOVEMENT_BOB_AMOUNT
      : 1;
    this.setScale(CHARACTER_VISUALS.HERO.scale * bob);
    this.setDepth(getWorldDepth(this.y));
  }

  /** Briefly swaps to official action art without changing gameplay or saved state. */
  public playAction(): void {
    this.actionTimer?.remove(false);
    this.applyVisual(CHARACTER_VISUALS.HERO.action);
    this.actionTimer = this.scene.time.delayedCall(ACTION_DURATION_MS, () => {
      this.applyVisual(CHARACTER_VISUALS.HERO.standing);
      this.actionTimer = undefined;
    });
  }

  /** Applies one normalized texture and keeps the collision box around the boots. */
  private applyVisual(visual: CharacterTextureVisual): void {
    this.setTexture(visual.texture).setScale(CHARACTER_VISUALS.HERO.scale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(visual.body.width, visual.body.height);
    body.setOffset(visual.body.offsetX, visual.body.offsetY);
  }
}
