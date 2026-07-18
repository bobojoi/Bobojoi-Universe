import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 112;
const PANEL_MARGIN_BOTTOM = 42;
const PANEL_PADDING_X = 34;
const PANEL_RADIUS = 18;
const MESSAGE_DURATION_MS = 3200;
const CHOICE_PANEL_WIDTH = 840;
const CHOICE_PANEL_HEIGHT = 382;
const CHOICE_PANEL_MARGIN_BOTTOM = 24;
const CHOICE_PANEL_PADDING = 32;
const CHOICE_PANEL_RADIUS = 22;
const CHOICE_TEXT_WIDTH = CHOICE_PANEL_WIDTH - CHOICE_PANEL_PADDING * 2;
const CHOICE_ROW_HEIGHT = 54;
const CHOICE_ROW_GAP = 10;
const CHOICE_ROW_START_Y = 146;
const MAX_CHOICES = 3;

/** Presentation-ready option with rules already resolved by pure story logic. */
export interface DialogueChoice<TChoiceId extends string = string> {
  id: TChoiceId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** Structured prompt copy avoids embedding speaker formatting in scene code. */
export interface ChoiceDialogue {
  speaker: string;
  text: string;
}

/** Owns normal dialogue and a small keyboard-driven cue-card choice surface. */
export class DialogueSystem {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly message: Phaser.GameObjects.Text;
  private readonly choicePanel: Phaser.GameObjects.Graphics;
  private readonly choiceSpeaker: Phaser.GameObjects.Text;
  private readonly choicePrompt: Phaser.GameObjects.Text;
  private readonly choiceRows: Phaser.GameObjects.Graphics[] = [];
  private readonly choiceLabels: Phaser.GameObjects.Text[] = [];
  private readonly choiceHint: Phaser.GameObjects.Text;
  private readonly upKeys: Phaser.Input.Keyboard.Key[];
  private readonly downKeys: Phaser.Input.Keyboard.Key[];
  private readonly confirmKeys: Phaser.Input.Keyboard.Key[];
  private activeChoices: DialogueChoice[] = [];
  private selectedChoiceIndex = 0;
  private onChoiceConfirmed?: (choiceId: string) => void;
  private dismissTimer?: Phaser.Time.TimerEvent;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for DialogueSystem.');

    this.upKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    ];
    this.downKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    ];
    this.confirmKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    ];

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

    const choiceX = (GAME_WIDTH - CHOICE_PANEL_WIDTH) / 2;
    const choiceY = GAME_HEIGHT - CHOICE_PANEL_HEIGHT - CHOICE_PANEL_MARGIN_BOTTOM;
    this.choicePanel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.DIALOGUE);
    this.choiceSpeaker = scene.add
      .text(choiceX + CHOICE_PANEL_PADDING, choiceY + 22, '', {
        color: '#ffd66b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 2);
    this.choicePrompt = scene.add
      .text(choiceX + CHOICE_PANEL_PADDING, choiceY + 51, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '22px',
        lineSpacing: 6,
        wordWrap: { width: CHOICE_TEXT_WIDTH },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 2);

    for (let index = 0; index < MAX_CHOICES; index += 1) {
      const rowY = choiceY + CHOICE_ROW_START_Y + index * (CHOICE_ROW_HEIGHT + CHOICE_ROW_GAP);
      this.choiceRows.push(scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 1));
      this.choiceLabels.push(
        scene.add
          .text(choiceX + CHOICE_PANEL_PADDING + 20, rowY + CHOICE_ROW_HEIGHT / 2, '', {
            color: '#f8f5ff',
            fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
            fontSize: '17px',
          })
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH.DIALOGUE + 2),
      );
    }

    this.choiceHint = scene.add
      .text(GAME_WIDTH / 2, choiceY + CHOICE_PANEL_HEIGHT - 20, '↑↓ 或 W/S 選擇　Enter / E 確認', {
        color: '#b8b9d9',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 2);

    this.setMessageVisible(false);
    this.setChoicesVisible(false);
  }

  /** Shows one message and renews the automatic dismissal timer. */
  public show(text: string): void {
    this.closeChoices();
    this.dismissTimer?.remove(false);
    this.message.setText(text);
    this.setMessageVisible(true);
    this.dismissTimer = this.scene.time.delayedCall(MESSAGE_DURATION_MS, () => {
      this.setMessageVisible(false);
    });
  }

  /** Opens two or three choices and transfers keyboard ownership to this system. */
  public showChoices<TChoiceId extends string>(
    dialogue: ChoiceDialogue,
    choices: DialogueChoice<TChoiceId>[],
    onConfirmed: (choiceId: TChoiceId) => void,
  ): void {
    this.dismissTimer?.remove(false);
    this.setMessageVisible(false);
    this.activeChoices = choices.slice(0, MAX_CHOICES);
    this.selectedChoiceIndex = this.findNextEnabledIndex(-1, 1);
    this.onChoiceConfirmed = (choiceId) => onConfirmed(choiceId as TChoiceId);
    this.choiceSpeaker.setText(dialogue.speaker.toUpperCase());
    this.choicePrompt.setText(dialogue.text);
    this.drawChoicePanel();
    this.setChoicesVisible(true);
  }

  /** Polls choice input without registering scene-persistent keyboard listeners. */
  public update(): void {
    if (!this.isChoosing()) return;

    if (this.wasJustPressed(this.upKeys)) {
      this.selectedChoiceIndex = this.findNextEnabledIndex(this.selectedChoiceIndex, -1);
      this.drawChoiceRows();
      return;
    }
    if (this.wasJustPressed(this.downKeys)) {
      this.selectedChoiceIndex = this.findNextEnabledIndex(this.selectedChoiceIndex, 1);
      this.drawChoiceRows();
      return;
    }
    if (this.wasJustPressed(this.confirmKeys)) this.confirmSelectedChoice();
  }

  /** Reports whether modal choices currently own movement and interaction input. */
  public isChoosing(): boolean {
    return this.activeChoices.length > 0 && Boolean(this.onChoiceConfirmed);
  }

  /** Closes all dialogue surfaces without invoking a choice effect. */
  public close(): void {
    this.dismissTimer?.remove(false);
    this.setMessageVisible(false);
    this.closeChoices();
  }

  /** Releases timer and display resources when the owning scene shuts down. */
  public destroy(): void {
    this.close();
    this.panel.destroy();
    this.message.destroy();
    this.choicePanel.destroy();
    this.choiceSpeaker.destroy();
    this.choicePrompt.destroy();
    this.choiceHint.destroy();
    for (const row of this.choiceRows) row.destroy();
    for (const label of this.choiceLabels) label.destroy();
  }

  /** Draws the restrained production-card frame around the decision. */
  private drawChoicePanel(): void {
    const choiceX = (GAME_WIDTH - CHOICE_PANEL_WIDTH) / 2;
    const choiceY = GAME_HEIGHT - CHOICE_PANEL_HEIGHT - CHOICE_PANEL_MARGIN_BOTTOM;
    this.choicePanel.clear();
    this.choicePanel.fillStyle(COLORS.PANEL, 0.985);
    this.choicePanel.fillRoundedRect(
      choiceX,
      choiceY,
      CHOICE_PANEL_WIDTH,
      CHOICE_PANEL_HEIGHT,
      CHOICE_PANEL_RADIUS,
    );
    this.choicePanel.lineStyle(2, COLORS.PINK, 0.72);
    this.choicePanel.strokeRoundedRect(
      choiceX,
      choiceY,
      CHOICE_PANEL_WIDTH,
      CHOICE_PANEL_HEIGHT,
      CHOICE_PANEL_RADIUS,
    );
    this.drawChoiceRows();
  }

  /** Renders enabled, disabled, and selected cue cards with one clear accent rail. */
  private drawChoiceRows(): void {
    const choiceX = (GAME_WIDTH - CHOICE_PANEL_WIDTH) / 2;
    const choiceY = GAME_HEIGHT - CHOICE_PANEL_HEIGHT - CHOICE_PANEL_MARGIN_BOTTOM;

    for (let index = 0; index < MAX_CHOICES; index += 1) {
      const choice = this.activeChoices[index];
      const row = this.choiceRows[index];
      const label = this.choiceLabels[index];
      if (!row || !label) continue;
      row.clear();
      row.setVisible(Boolean(choice));
      label.setVisible(Boolean(choice));
      if (!choice) continue;

      const rowY = choiceY + CHOICE_ROW_START_Y + index * (CHOICE_ROW_HEIGHT + CHOICE_ROW_GAP);
      const selected = index === this.selectedChoiceIndex;
      row.fillStyle(selected ? COLORS.FLOOR : COLORS.NIGHT, choice.enabled ? 0.98 : 0.5);
      row.fillRoundedRect(
        choiceX + CHOICE_PANEL_PADDING,
        rowY,
        CHOICE_TEXT_WIDTH,
        CHOICE_ROW_HEIGHT,
        12,
      );
      row.lineStyle(2, selected ? COLORS.MINT : COLORS.FLOOR_LINE, selected ? 0.95 : 0.65);
      row.strokeRoundedRect(
        choiceX + CHOICE_PANEL_PADDING,
        rowY,
        CHOICE_TEXT_WIDTH,
        CHOICE_ROW_HEIGHT,
        12,
      );
      if (selected) {
        row.fillStyle(COLORS.MINT, 1);
        row.fillRoundedRect(choiceX + CHOICE_PANEL_PADDING, rowY, 7, CHOICE_ROW_HEIGHT, 4);
      }

      const cue = String.fromCharCode(65 + index);
      const unavailable = choice.enabled ? '' : `　條件不足：${choice.unavailableReason ?? '不可用'}`;
      label
        .setText(`${cue}　${choice.label}${unavailable}`)
        .setColor(choice.enabled ? (selected ? '#78f0cf' : '#f8f5ff') : '#777b9e');
    }
  }

  /** Confirms once, closes modal state first, then invokes the pure story resolver. */
  private confirmSelectedChoice(): void {
    const choice = this.activeChoices[this.selectedChoiceIndex];
    const onConfirmed = this.onChoiceConfirmed;
    if (!choice?.enabled || !onConfirmed) return;

    const choiceId = choice.id;
    this.closeChoices();
    onConfirmed(choiceId);
  }

  /** Cycles only through enabled choices so disabled rules cannot be bypassed. */
  private findNextEnabledIndex(startIndex: number, direction: -1 | 1): number {
    const choiceCount = this.activeChoices.length;
    if (choiceCount === 0) return 0;

    for (let offset = 1; offset <= choiceCount; offset += 1) {
      const index = (startIndex + direction * offset + choiceCount) % choiceCount;
      if (this.activeChoices[index]?.enabled) return index;
    }
    return 0;
  }

  /** Consumes edge-triggered keys without subscribing callbacks across restarts. */
  private wasJustPressed(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  /** Resets modal data so an old callback can never run after close or restart. */
  private closeChoices(): void {
    this.activeChoices = [];
    this.onChoiceConfirmed = undefined;
    this.setChoicesVisible(false);
  }

  private setMessageVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.message.setVisible(visible);
  }

  private setChoicesVisible(visible: boolean): void {
    this.choicePanel.setVisible(visible);
    this.choiceSpeaker.setVisible(visible);
    this.choicePrompt.setVisible(visible);
    this.choiceHint.setVisible(visible);
    for (let index = 0; index < MAX_CHOICES; index += 1) {
      this.choiceRows[index]?.setVisible(visible && index < this.activeChoices.length);
      this.choiceLabels[index]?.setVisible(visible && index < this.activeChoices.length);
    }
  }
}
