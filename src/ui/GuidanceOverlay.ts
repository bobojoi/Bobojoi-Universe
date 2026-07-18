import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';

/** One concise blocking guidance page. */
export interface GuidancePage {
  eyebrow: string;
  title: string;
  body: string;
}

const PANEL_WIDTH = 780;
const PANEL_HEIGHT = 350;
const PANEL_RADIUS = 28;

/** Owns keyboard-safe onboarding pages without persisting temporary page cursors. */
export class GuidanceOverlay {
  private readonly panelX = (GAME_WIDTH - PANEL_WIDTH) / 2;
  private readonly panelY = (GAME_HEIGHT - PANEL_HEIGHT) / 2;
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly eyebrow: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly confirmKeys: Phaser.Input.Keyboard.Key[];
  private pages: GuidancePage[] = [];
  private pageIndex = 0;
  private onComplete?: () => void;

  public constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for GuidanceOverlay.');
    this.confirmKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    ];
    this.shade = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.NIGHT, 0.88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 10);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 11);
    this.eyebrow = this.createText(this.panelX + 52, this.panelY + 48, 14, '#78f0cf', 'bold');
    this.title = this.createText(this.panelX + 52, this.panelY + 84, 34, '#f8f5ff', 'bold');
    this.body = this.createText(this.panelX + 52, this.panelY + 148, 21, '#d7d8ed');
    this.body.setLineSpacing(11).setWordWrapWidth(PANEL_WIDTH - 104);
    this.hint = this.createText(
      this.panelX + PANEL_WIDTH - 52,
      this.panelY + PANEL_HEIGHT - 38,
      14,
      '#b8b9d9',
    ).setOrigin(1, 0.5);
    this.setVisible(false);
  }

  /** Starts a fresh page sequence and transfers movement ownership to the overlay. */
  public show(pages: GuidancePage[], onComplete?: () => void): void {
    if (pages.length === 0) {
      onComplete?.();
      return;
    }
    this.pages = pages;
    this.pageIndex = 0;
    this.onComplete = onComplete;
    this.drawPanel();
    this.renderPage();
    this.setVisible(true);
  }

  /** Polling avoids scene-persistent key callbacks across restart. */
  public update(): void {
    if (!this.isActive()) return;
    if (this.confirmKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) this.advance();
  }

  /** Reports whether gameplay input must remain locked. */
  public isActive(): boolean {
    return this.pages.length > 0;
  }

  /** Removes temporary state and display objects during scene shutdown. */
  public destroy(): void {
    this.close();
    this.shade.destroy();
    this.panel.destroy();
    this.eyebrow.destroy();
    this.title.destroy();
    this.body.destroy();
    this.hint.destroy();
  }

  private advance(): void {
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex += 1;
      this.renderPage();
      return;
    }
    const callback = this.onComplete;
    this.close();
    callback?.();
  }

  private close(): void {
    this.pages = [];
    this.pageIndex = 0;
    this.onComplete = undefined;
    this.setVisible(false);
  }

  private renderPage(): void {
    const page = this.pages[this.pageIndex];
    if (!page) return;
    this.eyebrow.setText(page.eyebrow);
    this.title.setText(page.title);
    this.body.setText(page.body);
    this.hint.setText(`${this.pageIndex + 1} / ${this.pages.length}　E / Enter 繼續`);
  }

  private drawPanel(): void {
    this.panel.clear();
    this.panel.fillStyle(COLORS.PANEL, 0.99);
    this.panel.fillRoundedRect(this.panelX, this.panelY, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.lineStyle(2, COLORS.MINT, 0.7);
    this.panel.strokeRoundedRect(this.panelX, this.panelY, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.fillStyle(COLORS.PINK, 0.9);
    this.panel.fillRoundedRect(this.panelX + 34, this.panelY + 42, 6, PANEL_HEIGHT - 84, 3);
  }

  private createText(
    x: number,
    y: number,
    fontSize: number,
    color: string,
    fontStyle?: string,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, '', {
        color,
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 12);
  }

  private setVisible(visible: boolean): void {
    this.shade.setVisible(visible);
    this.panel.setVisible(visible);
    this.eyebrow.setVisible(visible);
    this.title.setVisible(visible);
    this.body.setVisible(visible);
    this.hint.setVisible(visible);
  }
}
