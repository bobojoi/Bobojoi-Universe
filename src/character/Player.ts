import Phaser from 'phaser';
import { DEPTH, TEXTURE_KEYS } from '../constants/GameConstants';

const PLAYER_SPEED = 260;
const BODY_RADIUS = 25;
const BODY_OFFSET = 11;

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

  public constructor(scene: Phaser.Scene, x: number, y: number, controls: PlayerControls) {
    super(scene, x, y, TEXTURE_KEYS.PLAYER);
    this.controls = controls;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.CHARACTER);
    this.setCollideWorldBounds(true);
    this.setCircle(BODY_RADIUS, BODY_OFFSET, BODY_OFFSET);
  }

  /** Applies normalized velocity so diagonal movement is not faster. */
  public updateMovement(): void {
    const horizontal = Number(this.controls.right.isDown) - Number(this.controls.left.isDown);
    const vertical = Number(this.controls.down.isDown) - Number(this.controls.up.isDown);
    const direction = new Phaser.Math.Vector2(horizontal, vertical).normalize();

    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
  }
}
