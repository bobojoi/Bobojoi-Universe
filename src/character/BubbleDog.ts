import Phaser from 'phaser';
import { DEPTH, TEXTURE_KEYS } from '../constants/GameConstants';

const RUN_DURATION_MS = 650;

/** Represents 泡彈 and provides a home for future companion AI. */
export class BubbleDog extends Phaser.Physics.Arcade.Sprite {
  private hasRun = false;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEYS.BUBBLE_DOG);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.CHARACTER);
  }

  /** Moves 泡彈 once and synchronizes its static body after the tween. */
  public runTo(x: number, y: number): void {
    if (this.hasRun) return;
    this.hasRun = true;

    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: RUN_DURATION_MS,
      ease: 'Sine.out',
      onComplete: () => this.refreshBody(),
    });
  }
}
