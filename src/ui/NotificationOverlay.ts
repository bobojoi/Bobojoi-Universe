import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';

export type NotificationTone = 'info' | 'success' | 'warning' | 'effect';

interface NotificationRequest {
  lines: string[];
  tone: NotificationTone;
  duration: number;
}

const PANEL_WIDTH = 500;
const PANEL_Y = 236;
const PANEL_PADDING_X = 28;
const PANEL_PADDING_Y = 17;
const DEFAULT_DURATION_MS = 2200;

/** Queues short non-modal guidance, save status, warnings, and confirmed effects. */
export class NotificationOverlay {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly queue: NotificationRequest[] = [];
  private dismissTimer?: Phaser.Time.TimerEvent;
  private showing = false;

  public constructor(private readonly scene: Phaser.Scene) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 4);
    this.text = scene.add
      .text(GAME_WIDTH / 2, PANEL_Y, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 7,
        wordWrap: { width: PANEL_WIDTH - PANEL_PADDING_X * 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 5)
      .setVisible(false);
  }

  /** Adds one readable notification without interrupting the current one. */
  public show(
    lines: string | string[],
    tone: NotificationTone = 'info',
    duration = DEFAULT_DURATION_MS,
  ): void {
    const normalized = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
    if (normalized.length === 0) return;
    this.queue.push({ lines: normalized, tone, duration });
    if (!this.showing) this.showNext();
  }

  /** Stops pending timers and clears queued transient UI during shutdown. */
  public destroy(): void {
    this.dismissTimer?.remove(false);
    this.queue.length = 0;
    this.panel.destroy();
    this.text.destroy();
  }

  private showNext(): void {
    const request = this.queue.shift();
    if (!request) {
      this.showing = false;
      this.panel.clear();
      this.text.setVisible(false);
      return;
    }
    this.showing = true;
    this.text.setText(request.lines).setVisible(true).setAlpha(1);
    const bounds = this.text.getBounds();
    const x = (GAME_WIDTH - PANEL_WIDTH) / 2;
    const height = bounds.height + PANEL_PADDING_Y * 2;
    this.panel.clear();
    this.panel.fillStyle(COLORS.PANEL, 0.97);
    this.panel.fillRoundedRect(x, PANEL_Y - PANEL_PADDING_Y, PANEL_WIDTH, height, 18);
    this.panel.lineStyle(2, getToneColor(request.tone), 0.82);
    this.panel.strokeRoundedRect(x, PANEL_Y - PANEL_PADDING_Y, PANEL_WIDTH, height, 18);
    this.dismissTimer = this.scene.time.delayedCall(request.duration, () => {
      this.text.setVisible(false);
      this.panel.clear();
      this.showNext();
    });
  }
}

/** Maps semantic notification roles to the existing studio palette. */
function getToneColor(tone: NotificationTone): number {
  if (tone === 'success') return COLORS.MINT;
  if (tone === 'warning') return COLORS.GOLD;
  if (tone === 'effect') return COLORS.PINK;
  return COLORS.FLOOR_LINE;
}
