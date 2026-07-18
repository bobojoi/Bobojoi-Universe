import Phaser from 'phaser';
import { DEPTH, TEXTURE_KEYS } from '../constants/GameConstants';

/** Represents 泡彈 and provides a home for future companion AI. */
export class BubbleDog extends Phaser.Physics.Arcade.Sprite {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEYS.BUBBLE_DOG);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.CHARACTER);
  }
}
