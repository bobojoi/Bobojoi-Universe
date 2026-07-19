import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { CHARACTER_ASSET_PATHS } from '../constants/CharacterVisualConstants';
import { COLORS, SCENE_KEYS, TEXTURE_KEYS } from '../constants/GameConstants';
import { MUSIC_TRACKS } from '../audio/MusicCatalog';

const PROGRESS_BAR_WIDTH = 420;
const PROGRESS_BAR_HEIGHT = 12;
const PROGRESS_BAR_RADIUS = 6;
const LOAD_DELAY_MS = 250;

/** Loads official character art and presents progress before the title scene. */
export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  public preload(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // A restrained title and progress bar make future large asset packs visible.
    this.add
      .text(centerX, centerY - 64, 'BOBOJOI UNIVERSE', {
        color: '#f8f5ff',
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    const progressBackground = this.add.graphics();
    progressBackground.fillStyle(COLORS.PANEL, 1);
    progressBackground.fillRoundedRect(
      centerX - PROGRESS_BAR_WIDTH / 2,
      centerY,
      PROGRESS_BAR_WIDTH,
      PROGRESS_BAR_HEIGHT,
      PROGRESS_BAR_RADIUS,
    );

    const progress = this.add.graphics();
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      progress.clear();
      progress.fillStyle(COLORS.MINT, 1);
      progress.fillRoundedRect(
        centerX - PROGRESS_BAR_WIDTH / 2,
        centerY,
        PROGRESS_BAR_WIDTH * value,
        PROGRESS_BAR_HEIGHT,
        PROGRESS_BAR_RADIUS,
      );
    });

    // Official Bobojoi IP art replaces every gameplay character placeholder.
    this.load.image(TEXTURE_KEYS.PLAYER_STANDING, CHARACTER_ASSET_PATHS.HERO_STANDING);
    this.load.image(TEXTURE_KEYS.PLAYER_ACTION, CHARACTER_ASSET_PATHS.HERO_ACTION);
    this.load.image(TEXTURE_KEYS.BUBBLE_GIRL_FRONT, CHARACTER_ASSET_PATHS.GIRL_FRONT);
    this.load.image(TEXTURE_KEYS.BUBBLE_GIRL_SIDE, CHARACTER_ASSET_PATHS.GIRL_SIDE);
    this.load.image(TEXTURE_KEYS.BUBBLE_DOG_FRONT, CHARACTER_ASSET_PATHS.DOG_FRONT);
    this.load.image(TEXTURE_KEYS.BUBBLE_DOG_SIDE, CHARACTER_ASSET_PATHS.DOG_SIDE);

    // User-owned Bobojoi tracks are decoded once and reused by the global music director.
    for (const track of Object.values(MUSIC_TRACKS)) {
      this.load.audio(track.key, track.path);
    }

    // A tiny sentinel keeps the loader lifecycle observable even from a warm cache.
    this.load.image('loading-sentinel', this.createTransparentPixel());
  }

  public create(): void {
    // A brief handoff prevents a jarring flash on fast local machines.
    this.time.delayedCall(LOAD_DELAY_MS, () => this.scene.start(SCENE_KEYS.TITLE));
  }

  /** Produces a valid data URI without introducing an external placeholder file. */
  private createTransparentPixel(): string {
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  }
}
