import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, SCENE_KEYS, TEXTURE_KEYS } from '../constants/GameConstants';

const PROGRESS_BAR_WIDTH = 420;
const PROGRESS_BAR_HEIGHT = 12;
const PROGRESS_BAR_RADIUS = 6;
const LOAD_DELAY_MS = 250;
const CHARACTER_SIZE = 72;

/** Loads production assets and generates replaceable first-version art. */
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

    // Keep the loading lifecycle active until real external assets are added.
    this.load.image('loading-sentinel', this.createTransparentPixel());
  }

  public create(): void {
    this.createPlaceholderTextures();

    // A brief handoff prevents a jarring flash on fast local machines.
    this.time.delayedCall(LOAD_DELAY_MS, () => this.scene.start(SCENE_KEYS.STUDIO));
  }

  /** Produces a valid data URI without introducing an external placeholder file. */
  private createTransparentPixel(): string {
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  }

  /** Generates named textures so real art can replace them without gameplay edits. */
  private createPlaceholderTextures(): void {
    this.createCharacterTexture(TEXTURE_KEYS.PLAYER, COLORS.MINT, '我');
    this.createCharacterTexture(TEXTURE_KEYS.BUBBLE_GIRL, COLORS.PINK, '妞');
    this.createCharacterTexture(TEXTURE_KEYS.BUBBLE_DOG, COLORS.GOLD, '彈');
  }

  /** Draws one readable circular character token into the texture manager. */
  private createCharacterTexture(textureKey: string, color: number, label: string): void {
    const radius = CHARACTER_SIZE / 2;
    const texture = this.textures.createCanvas(textureKey, CHARACTER_SIZE, CHARACTER_SIZE);
    if (!texture) {
      throw new Error(`Unable to create placeholder texture: ${textureKey}`);
    }
    const context = texture.context;

    // Canvas textures reliably combine vector placeholder art and CJK labels.
    context.fillStyle = 'rgba(21, 23, 44, 0.35)';
    context.beginPath();
    context.arc(radius + 3, radius + 5, radius - 2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = Phaser.Display.Color.IntegerToColor(color).rgba;
    context.beginPath();
    context.arc(radius, radius, radius - 4, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(248, 245, 255, 0.85)';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(radius, radius, radius - 6, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#15172c';
    context.font = 'bold 24px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, radius, radius + 1);
    texture.refresh();
  }
}
