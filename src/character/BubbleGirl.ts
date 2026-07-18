import Phaser from 'phaser';
import { DEPTH, TEXTURE_KEYS } from '../constants/GameConstants';

/** Represents 泡妞 and isolates her future animation or quest behavior. */
export class BubbleGirl extends Phaser.Physics.Arcade.Sprite {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEYS.BUBBLE_GIRL);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.CHARACTER);
  }
}
