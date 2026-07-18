import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';
import type { ChapterTransitionCopy } from '../presentation/ProgressPresentation';

const HOLD_DURATION_MS = 2100;
const FADE_DURATION_MS = 360;

/** Plays a small queued chapter card while safely owning gameplay input. */
export class ChapterTransitionOverlay {
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly eyebrow: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private queue: ChapterTransitionCopy[] = [];
  private active = false;
  private timer?: Phaser.Time.TimerEvent;
  private onComplete?: () => void;

  public constructor(private readonly scene: Phaser.Scene) {
    this.shade = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.NIGHT, 0.97)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 20);
    this.eyebrow = this.createText(GAME_HEIGHT / 2 - 82, 14, '#78f0cf', 'bold', 4);
    this.title = this.createText(GAME_HEIGHT / 2 - 37, 38, '#f8f5ff', 'bold');
    this.body = this.createText(GAME_HEIGHT / 2 + 35, 19, '#c9cbe4');
    this.body.setWordWrapWidth(720).setLineSpacing(8);
    this.setVisible(false);
  }

  /** Queues reached transitions and fades each one exactly once. */
  public play(copies: ChapterTransitionCopy[], onComplete?: () => void): void {
    if (copies.length === 0) {
      onComplete?.();
      return;
    }
    this.queue.push(...copies);
    this.onComplete = onComplete;
    if (!this.active) this.showNext();
  }

  /** Reports modal ownership to the scene update loop. */
  public isActive(): boolean {
    return this.active;
  }

  /** Removes timers, tweens, and overlays without leaving callbacks behind. */
  public destroy(): void {
    this.timer?.remove(false);
    this.scene.tweens.killTweensOf([this.shade, this.eyebrow, this.title, this.body]);
    this.queue = [];
    this.onComplete = undefined;
    this.shade.destroy();
    this.eyebrow.destroy();
    this.title.destroy();
    this.body.destroy();
  }

  private showNext(): void {
    const copy = this.queue.shift();
    if (!copy) {
      const callback = this.onComplete;
      this.active = false;
      this.onComplete = undefined;
      this.setVisible(false);
      callback?.();
      return;
    }
    this.active = true;
    this.eyebrow.setText(copy.eyebrow);
    this.title.setText(copy.title);
    this.body.setText(copy.body ?? '');
    this.setVisible(true);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.shade, this.eyebrow, this.title, this.body],
      alpha: 1,
      duration: FADE_DURATION_MS,
    });
    this.timer = this.scene.time.delayedCall(HOLD_DURATION_MS, () => {
      this.scene.tweens.add({
        targets: [this.shade, this.eyebrow, this.title, this.body],
        alpha: 0,
        duration: FADE_DURATION_MS,
        onComplete: () => this.showNext(),
      });
    });
  }

  private createText(
    y: number,
    fontSize: number,
    color: string,
    fontStyle?: string,
    letterSpacing?: number,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(GAME_WIDTH / 2, y, '', {
        color,
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle,
        letterSpacing,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 21);
  }

  private setVisible(visible: boolean): void {
    this.shade.setVisible(visible);
    this.eyebrow.setVisible(visible);
    this.title.setVisible(visible);
    this.body.setVisible(visible && this.body.text.length > 0);
  }

  private setAlpha(alpha: number): void {
    this.shade.setAlpha(alpha);
    this.eyebrow.setAlpha(alpha);
    this.title.setAlpha(alpha);
    this.body.setAlpha(alpha);
  }
}
