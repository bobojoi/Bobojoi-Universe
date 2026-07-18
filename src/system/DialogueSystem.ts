import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 112;
const PANEL_MARGIN_BOTTOM = 42;
const PANEL_PADDING_X = 34;
const PANEL_RADIUS = 18;
const MESSAGE_DURATION_MS = 3200;

/** Owns dialogue presentation without coupling conversations to the scene. */
export class DialogueSystem {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly message: Phaser.GameObjects.Text;
  private dismissTimer?: Phaser.Time.TimerEvent;

  public constructor(scene: Phaser.Scene) {
    const panelX = (GAME_WIDTH - PANEL_WIDTH) / 2;
    const panelY = GAME_HEIGHT - PANEL_HEIGHT - PANEL_MARGIN_BOTTOM;

    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.DIALOGUE);
    this.panel.fillStyle(COLORS.PANEL, 0.96);
    this.panel.fillRoundedRect(panelX, panelY, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.lineStyle(2, COLORS.MINT, 0.55);
    this.panel.strokeRoundedRect(panelX, panelY, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);

    this.message = scene.add
      .text(panelX + PANEL_PADDING_X, panelY + PANEL_HEIGHT / 2, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '24px',
        lineSpacing: 8,
        wordWrap: { width: PANEL_WIDTH - PANEL_PADDING_X * 2 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 1);

    this.setVisible(false);
  }

  /** Shows one message and renews the automatic dismissal timer. */
  public show(text: string): void {
    this.dismissTimer?.remove(false);
    this.message.setText(text);
    this.setVisible(true);
    this.dismissTimer = this.message.scene.time.delayedCall(MESSAGE_DURATION_MS, () => {
      this.setVisible(false);
    });
  }

  /** Releases timer and display resources when the owning scene shuts down. */
  public destroy(): void {
    this.dismissTimer?.remove(false);
    this.panel.destroy();
    this.message.destroy();
  }

  private setVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.message.setVisible(visible);
  }
}
