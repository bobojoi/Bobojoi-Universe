import Phaser from 'phaser';
import { COLORS, SCENE_KEYS } from '../constants/GameConstants';

/** Performs only the fastest startup work before asset loading begins. */
export class BootScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.BOOT);
  }

  public create(): void {
    // Set one shared input convention before any gameplay scene is created.
    this.input.keyboard?.addCapture(['W', 'A', 'S', 'D', 'E', 'UP', 'DOWN', 'ENTER', 'ESC']);
    this.cameras.main.setBackgroundColor(COLORS.NIGHT);

    // Hand off immediately; PreloadScene owns all loading feedback.
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
