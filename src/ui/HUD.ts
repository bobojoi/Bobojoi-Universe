import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';

const TITLE_X = 32;
const TITLE_Y = 28;
const PROMPT_Y = 632;
const PROMPT_PADDING_X = 22;
const PROMPT_PADDING_Y = 12;
const PROMPT_RADIUS = 20;

/** Displays fixed player guidance independently of world-camera movement. */
export class HUD {
  private readonly promptBackground: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene) {
    scene.add
      .text(TITLE_X, TITLE_Y, 'BOBOJOI / STUDIO 01', {
        color: '#78f0cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI);

    scene.add
      .text(TITLE_X, TITLE_Y + 28, 'WASD 移動', {
        color: '#b8b9d9',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '15px',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI);

    this.promptBackground = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI);
    this.promptText = scene.add
      .text(GAME_WIDTH / 2, PROMPT_Y, '', {
        color: '#15172c',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);

    this.setInteractionPrompt();
  }

  /** Shows or hides the contextual E-key interaction prompt. */
  public setInteractionPrompt(label?: string): void {
    this.promptBackground.clear();
    this.promptText.setVisible(Boolean(label));

    if (!label) return;

    this.promptText.setText(`E  ${label}`);
    const bounds = this.promptText.getBounds();
    this.promptBackground.fillStyle(COLORS.MINT, 0.96);
    this.promptBackground.fillRoundedRect(
      bounds.x - PROMPT_PADDING_X,
      bounds.y - PROMPT_PADDING_Y,
      bounds.width + PROMPT_PADDING_X * 2,
      bounds.height + PROMPT_PADDING_Y * 2,
      PROMPT_RADIUS,
    );
  }
}
