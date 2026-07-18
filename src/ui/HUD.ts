import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';
import type { StudioQuestHudView } from '../quest/StudioQuestManager';

const TITLE_X = 32;
const TITLE_Y = 28;
const PROMPT_Y = 632;
const PROMPT_PADDING_X = 22;
const PROMPT_PADDING_Y = 12;
const PROMPT_RADIUS = 20;
const QUEST_X = 932;
const QUEST_Y = 28;
const QUEST_WIDTH = 316;
const QUEST_HEIGHT = 96;
const QUEST_PADDING = 20;
const QUEST_RADIUS = 16;
const COMPLETE_BANNER_Y = 154;
const COMPLETE_BANNER_DURATION_MS = 2600;

/** Displays fixed player guidance independently of world-camera movement. */
export class HUD {
  private readonly promptBackground: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly questBackground: Phaser.GameObjects.Graphics;
  private readonly questTitle: Phaser.GameObjects.Text;
  private readonly questObjective: Phaser.GameObjects.Text;

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

    this.questBackground = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI);
    this.questTitle = scene.add
      .text(QUEST_X + QUEST_PADDING, QUEST_Y + 16, '', {
        color: '#ffd66b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);
    this.questObjective = scene.add
      .text(QUEST_X + QUEST_PADDING, QUEST_Y + 46, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '16px',
        wordWrap: { width: QUEST_WIDTH - QUEST_PADDING * 2 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);

    this.setInteractionPrompt();
    this.setQuest();
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

  /** Renders the current quest objective as a quiet studio production card. */
  public setQuest(view?: StudioQuestHudView): void {
    this.questBackground.clear();
    this.questTitle.setVisible(Boolean(view));
    this.questObjective.setVisible(Boolean(view));
    if (!view) return;

    this.questBackground.fillStyle(COLORS.PANEL, 0.92);
    this.questBackground.fillRoundedRect(QUEST_X, QUEST_Y, QUEST_WIDTH, QUEST_HEIGHT, QUEST_RADIUS);
    this.questBackground.lineStyle(2, view.completed ? COLORS.GOLD : COLORS.PINK, 0.7);
    this.questBackground.strokeRoundedRect(QUEST_X, QUEST_Y, QUEST_WIDTH, QUEST_HEIGHT, QUEST_RADIUS);
    this.questTitle.setText(view.completed ? 'QUEST COMPLETE' : view.title);
    this.questObjective.setText(view.objective);
  }

  /** Celebrates completion once without leaving an event listener behind. */
  public showQuestCompleted(): void {
    const banner = this.questObjective.scene.add
      .text(GAME_WIDTH / 2, COMPLETE_BANNER_Y, '任務完成  ✦  尋找星光泡泡環', {
        color: '#15172c',
        backgroundColor: '#ffd66b',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 2);

    this.questObjective.scene.tweens.add({
      targets: banner,
      alpha: 0,
      y: COMPLETE_BANNER_Y - 12,
      delay: COMPLETE_BANNER_DURATION_MS,
      duration: 350,
      onComplete: () => banner.destroy(),
    });
  }
}
