import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';
import type { StudioQuestHudView } from '../quest/StudioQuestManager';
import type { PlayerStatsState, RelationshipState } from '../story/PlayerProgress';
import type { MainStoryHudView } from '../story/MainStoryManager';

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
const STATUS_X = 32;
const STATUS_Y = 88;
const STATUS_WIDTH = 226;
const STATUS_HEIGHT = 118;
const STATUS_PADDING = 16;
const STATUS_RADIUS = 14;
const STORY_X = QUEST_X;
const STORY_Y = QUEST_Y + QUEST_HEIGHT + 12;
const STORY_HEIGHT = 82;
const CHAPTER_BANNER_Y = COMPLETE_BANNER_Y + 58;

/** Displays fixed player guidance independently of world-camera movement. */
export class HUD {
  private readonly promptBackground: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly questBackground: Phaser.GameObjects.Graphics;
  private readonly questTitle: Phaser.GameObjects.Text;
  private readonly questObjective: Phaser.GameObjects.Text;
  private readonly statusValues: Phaser.GameObjects.Text;
  private readonly storyBackground: Phaser.GameObjects.Graphics;
  private readonly storyTitle: Phaser.GameObjects.Text;
  private readonly storyObjective: Phaser.GameObjects.Text;

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

    this.storyBackground = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI);
    this.storyTitle = scene.add
      .text(STORY_X + QUEST_PADDING, STORY_Y + 13, '', {
        color: '#78f0cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);
    this.storyObjective = scene.add
      .text(STORY_X + QUEST_PADDING, STORY_Y + 38, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '15px',
        wordWrap: { width: QUEST_WIDTH - QUEST_PADDING * 2 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);

    const statusBackground = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI);
    statusBackground.fillStyle(COLORS.PANEL, 0.88);
    statusBackground.fillRoundedRect(
      STATUS_X,
      STATUS_Y,
      STATUS_WIDTH,
      STATUS_HEIGHT,
      STATUS_RADIUS,
    );
    statusBackground.lineStyle(1, COLORS.MINT, 0.42);
    statusBackground.strokeRoundedRect(
      STATUS_X,
      STATUS_Y,
      STATUS_WIDTH,
      STATUS_HEIGHT,
      STATUS_RADIUS,
    );
    scene.add
      .text(STATUS_X + STATUS_PADDING, STATUS_Y + 12, 'CAST STATUS', {
        color: '#78f0cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);
    this.statusValues = scene.add
      .text(STATUS_X + STATUS_PADDING, STATUS_Y + 35, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '14px',
        lineSpacing: 7,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 1);

    this.setInteractionPrompt();
    this.setQuest();
    this.setMainStory();
  }

  /** Updates the compact cast card immediately after a story effect. */
  public setPlayerProgress(stats: PlayerStatsState, relationships: RelationshipState): void {
    this.statusValues.setText([
      `技藝 ${formatStat(stats.technique)}　人氣 ${formatStat(stats.popularity)}`,
      `信念 ${formatStat(stats.conviction)}　體力 ${formatStat(stats.energy)}`,
      `泡妞信任 ${formatSignedStat(relationships.bubbleGirlTrust)}`,
    ]);
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

  /** Shows current chapter progress without duplicating story-stage rules in the UI. */
  public setMainStory(view?: MainStoryHudView): void {
    this.storyBackground.clear();
    this.storyTitle.setVisible(Boolean(view));
    this.storyObjective.setVisible(Boolean(view));
    if (!view) return;

    this.storyBackground.fillStyle(COLORS.PANEL, 0.92);
    this.storyBackground.fillRoundedRect(
      STORY_X,
      STORY_Y,
      QUEST_WIDTH,
      STORY_HEIGHT,
      QUEST_RADIUS,
    );
    this.storyBackground.lineStyle(2, view.completed ? COLORS.GOLD : COLORS.MINT, 0.65);
    this.storyBackground.strokeRoundedRect(
      STORY_X,
      STORY_Y,
      QUEST_WIDTH,
      STORY_HEIGHT,
      QUEST_RADIUS,
    );
    this.storyTitle.setText(view.completed ? 'CHAPTER COMPLETE' : view.title);
    this.storyObjective.setText(view.objective);
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

  /** Celebrates chapter completion once at the transition, never during state restore. */
  public showChapterCompleted(label: string): void {
    const banner = this.storyObjective.scene.add
      .text(GAME_WIDTH / 2, CHAPTER_BANNER_Y, label.replace('：', '  ✦  '), {
        color: '#15172c',
        backgroundColor: '#78f0cf',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 2);

    this.storyObjective.scene.tweens.add({
      targets: banner,
      alpha: 0,
      y: CHAPTER_BANNER_Y - 12,
      delay: COMPLETE_BANNER_DURATION_MS,
      duration: 350,
      onComplete: () => banner.destroy(),
    });
  }
}

/** Aligns bounded values for a stable compact HUD rhythm. */
function formatStat(value: number): string {
  return String(value).padStart(3, ' ');
}

/** Makes relationship direction legible at a glance. */
function formatSignedStat(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
