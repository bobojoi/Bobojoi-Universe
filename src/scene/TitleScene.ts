import Phaser from 'phaser';
import { MusicDirector } from '../audio/MusicDirector';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH, SCENE_KEYS } from '../constants/GameConstants';
import { getContinueSummary } from '../presentation/ProgressPresentation';
import {
  TitleMenuModel,
  type TitleMenuAction,
  type TitleMenuItemId,
} from '../presentation/TitleMenuModel';
import { SaveSystem } from '../system/SaveSystem';

const MENU_X = 116;
const MENU_Y = 318;
const MENU_WIDTH = 480;
const MENU_ROW_HEIGHT = 58;
const MENU_ROW_GAP = 10;
const SUMMARY_X = 720;
const SUMMARY_Y = 318;
const SUMMARY_WIDTH = 440;

/** Warm keyboard-first entry point for new, continued, and reset Demo sessions. */
export class TitleScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;
  private menu!: TitleMenuModel;
  private upKeys: Phaser.Input.Keyboard.Key[] = [];
  private downKeys: Phaser.Input.Keyboard.Key[] = [];
  private confirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private summary: string[] = [];
  private sceneTransitioning = false;

  public constructor() {
    super(SCENE_KEYS.TITLE);
  }

  public create(): void {
    this.saveSystem = new SaveSystem();
    const save = this.saveSystem.load();
    this.menu = new TitleMenuModel(Boolean(save));
    this.summary = save ? getContinueSummary(save.studioQuest, save) : [];
    this.drawBackground();
    this.createHeading();
    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', {
        color: '#ffd66b',
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: '15px',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI + 2);
    this.createControls();
    this.renderMenu();
    this.cameras.main.fadeIn(620, 16, 19, 47);
    MusicDirector.play(this, 'title');
  }

  public update(): void {
    if (this.sceneTransitioning) return;
    if (this.wasJustPressed(this.upKeys)) {
      this.menu.move(-1);
      this.renderMenu();
      return;
    }
    if (this.wasJustPressed(this.downKeys)) {
      this.menu.move(1);
      this.renderMenu();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.menu.back();
      this.renderMenu();
      return;
    }
    if (this.wasJustPressed(this.confirmKeys)) this.processAction(this.menu.confirm());
  }

  /** Uses an ambient bubble path as the title's single visual signature. */
  private drawBackground(): void {
    this.cameras.main.setBackgroundColor(COLORS.NIGHT);
    const graphics = this.add.graphics().setDepth(DEPTH.BACKGROUND);
    graphics.fillStyle(COLORS.NIGHT, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.lineStyle(2, COLORS.MINT, 0.13);
    const bubblePath = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(-80, 550),
      new Phaser.Math.Vector2(260, 330),
      new Phaser.Math.Vector2(570, 690),
      new Phaser.Math.Vector2(1370, 120),
    );
    const pathPoints = bubblePath.getPoints(48);
    graphics.beginPath();
    graphics.moveTo(pathPoints[0]?.x ?? -80, pathPoints[0]?.y ?? 550);
    for (const point of pathPoints.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();

    const bubbles = [
      { x: 1030, y: 112, radius: 78, color: COLORS.PINK, alpha: 0.13 },
      { x: 1150, y: 210, radius: 34, color: COLORS.MINT, alpha: 0.17 },
      { x: 665, y: 615, radius: 54, color: COLORS.PINK, alpha: 0.09 },
      { x: 168, y: 512, radius: 24, color: COLORS.MINT, alpha: 0.16 },
    ];
    for (const bubble of bubbles) {
      this.add
        .circle(bubble.x, bubble.y, bubble.radius, bubble.color, bubble.alpha)
        .setStrokeStyle(2, COLORS.WHITE, 0.17)
        .setDepth(DEPTH.BACKGROUND + 1);
    }
  }

  /** Establishes the narrative-RPG identity before exposing menu actions. */
  private createHeading(): void {
    this.add
      .text(112, 82, 'BOBOJOI UNIVERSE', {
        color: '#78f0cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        letterSpacing: 5,
      })
      .setDepth(DEPTH.UI);
    this.add
      .text(108, 126, '泡泡家族：夢想啟程', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: '49px',
        fontStyle: 'bold',
      })
      .setDepth(DEPTH.UI);
    this.add
      .text(112, 202, '一個關於夢想、選擇與成為自己的故事', {
        color: '#c9cbe4',
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: '20px',
      })
      .setDepth(DEPTH.UI);
    this.add
      .text(112, 248, '敘事 RPG　·　角色成長　·　關係與故事分支', {
        color: '#ff9bca',
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        letterSpacing: 1,
      })
      .setDepth(DEPTH.UI);
  }

  /** Rebuilds only the temporary menu layer after navigation or storage changes. */
  private renderMenu(): void {
    for (const object of this.dynamicObjects) object.destroy();
    this.dynamicObjects = [];
    const view = this.menu.getView();
    if (view.mode === 'help') {
      this.renderHelp();
      return;
    }
    if (view.mode === 'confirm-new-game' || view.mode === 'confirm-clear-save') {
      this.renderConfirmation(view.confirmationText ?? '', view.items, view.selectedIndex);
      return;
    }
    this.renderMainMenu(view.items, view.selectedIndex);
    this.renderContinueSummary();
  }

  private renderMainMenu(
    items: ReturnType<TitleMenuModel['getView']>['items'],
    selectedIndex: number,
  ): void {
    items.forEach((item, index) => {
      const y = MENU_Y + index * (MENU_ROW_HEIGHT + MENU_ROW_GAP);
      this.createMenuButton(item.id, item.label, item.enabled, index === selectedIndex, MENU_X, y);
      if (!item.enabled && item.unavailableReason) {
        this.addDynamicText(MENU_X + 262, y + MENU_ROW_HEIGHT / 2, item.unavailableReason, 13, '#777b9e')
          .setOrigin(0, 0.5);
      }
    });
    this.addDynamicText(MENU_X, MENU_Y + 286, 'W / S 或 ↑↓ 選擇　Enter / E 確認', 13, '#8f92b8');
  }

  private renderContinueSummary(): void {
    const panel = this.add.graphics().setDepth(DEPTH.UI);
    panel.fillStyle(COLORS.PANEL, 0.9);
    panel.fillRoundedRect(SUMMARY_X, SUMMARY_Y, SUMMARY_WIDTH, 242, 22);
    panel.lineStyle(2, this.summary.length > 0 ? COLORS.MINT : COLORS.FLOOR_LINE, 0.5);
    panel.strokeRoundedRect(SUMMARY_X, SUMMARY_Y, SUMMARY_WIDTH, 242, 22);
    this.dynamicObjects.push(panel);
    this.addDynamicText(SUMMARY_X + 28, SUMMARY_Y + 26, 'CONTINUE / 目前進度', 13, '#78f0cf', 'bold');
    if (this.summary.length === 0) {
      this.addDynamicText(
        SUMMARY_X + 28,
        SUMMARY_Y + 72,
        '尚無可繼續的進度\n\n開始新遊戲，和泡妞、泡彈一起\n踏出夢想的第一步。',
        17,
        '#a7a9c7',
      ).setLineSpacing(8);
      return;
    }
    this.addDynamicText(
      SUMMARY_X + 28,
      SUMMARY_Y + 68,
      this.summary.join('\n\n'),
      17,
      '#f8f5ff',
    ).setLineSpacing(7).setWordWrapWidth(SUMMARY_WIDTH - 56);
  }

  private renderHelp(): void {
    const panel = this.add.graphics().setDepth(DEPTH.UI);
    panel.fillStyle(COLORS.PANEL, 0.98);
    panel.fillRoundedRect(172, 292, 936, 344, 24);
    panel.lineStyle(2, COLORS.MINT, 0.65);
    panel.strokeRoundedRect(172, 292, 936, 344, 24);
    this.dynamicObjects.push(panel);
    this.addDynamicText(210, 324, '操作說明', 25, '#f8f5ff', 'bold');
    this.addDynamicText(
      210,
      374,
      'WASD：移動\nE：互動／確認\n方向鍵或 W／S：切換對話選項\nEnter 或 E：確認選擇\nEsc：關閉說明或返回\n\n遊戲會自動儲存重要進度。',
      17,
      '#d7d8ed',
    ).setLineSpacing(9);
    this.addDynamicText(
      650,
      374,
      '角色狀態\n技藝：表演與創作能力\n人氣：外界對泡泡家族的關注\n信念：堅持自身方向的力量\n體力：承擔工作與準備的狀態\n泡妞信任：泡妞對你的信任程度',
      17,
      '#d7d8ed',
    ).setLineSpacing(9);
    this.addDynamicText(640, 602, 'Esc 返回主選單', 13, '#8f92b8').setOrigin(0.5);
  }

  private renderConfirmation(
    text: string,
    items: ReturnType<TitleMenuModel['getView']>['items'],
    selectedIndex: number,
  ): void {
    const panel = this.add.graphics().setDepth(DEPTH.UI);
    panel.fillStyle(COLORS.PANEL, 0.99);
    panel.fillRoundedRect(310, 300, 660, 290, 26);
    panel.lineStyle(2, COLORS.GOLD, 0.78);
    panel.strokeRoundedRect(310, 300, 660, 290, 26);
    this.dynamicObjects.push(panel);
    this.addDynamicText(640, 344, '請再次確認', 16, '#ffd66b', 'bold').setOrigin(0.5);
    this.addDynamicText(640, 392, text, 21, '#f8f5ff', 'bold')
      .setOrigin(0.5)
      .setAlign('center')
      .setWordWrapWidth(540);
    items.forEach((item, index) => {
      this.createMenuButton(item.id, item.label, true, index === selectedIndex, 430 + index * 220, 492, 190);
    });
  }

  private createMenuButton(
    id: TitleMenuItemId,
    label: string,
    enabled: boolean,
    selected: boolean,
    x: number,
    y: number,
    width = MENU_WIDTH,
  ): void {
    const background = this.add.graphics().setDepth(DEPTH.UI);
    background.fillStyle(selected ? COLORS.FLOOR : COLORS.PANEL, enabled ? 0.98 : 0.5);
    background.fillRoundedRect(x, y, width, MENU_ROW_HEIGHT, 14);
    background.lineStyle(2, selected ? COLORS.MINT : COLORS.FLOOR_LINE, selected ? 0.95 : 0.48);
    background.strokeRoundedRect(x, y, width, MENU_ROW_HEIGHT, 14);
    if (selected) {
      background.fillStyle(COLORS.MINT, 1);
      background.fillRoundedRect(x, y, 7, MENU_ROW_HEIGHT, 4);
    }
    const text = this.addDynamicText(
      x + 24,
      y + MENU_ROW_HEIGHT / 2,
      label,
      18,
      enabled ? (selected ? '#78f0cf' : '#f8f5ff') : '#777b9e',
      'bold',
    ).setOrigin(0, 0.5);
    this.dynamicObjects.push(background);
    if (enabled) {
      const hitArea = this.add
        .rectangle(x, y, width, MENU_ROW_HEIGHT, COLORS.WHITE, 0.001)
        .setOrigin(0)
        .setDepth(DEPTH.UI + 2)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          background.setAlpha(0.86);
          text.setColor('#78f0cf');
          this.tweens.add({ targets: text, scale: 1.035, duration: 110 });
        })
        .on('pointerout', () => {
          background.setAlpha(1);
          text.setColor(selected ? '#78f0cf' : '#f8f5ff');
          this.tweens.add({ targets: text, scale: 1, duration: 110 });
        })
        .on('pointerdown', () => {
          this.tweens.add({ targets: text, scale: 0.965, duration: 70 });
        })
        .on('pointerup', () => {
          this.tweens.add({ targets: text, scale: 1, duration: 90 });
          this.processAction(this.menu.confirm(id));
        });
      this.dynamicObjects.push(hitArea);
    }
  }

  private processAction(action: TitleMenuAction): void {
    this.statusText.setText('');
    if (action === 'none') {
      this.renderMenu();
      return;
    }
    if (action === 'continue-game') {
      this.transitionToStudio();
      return;
    }
    if (action === 'start-new-game') {
      if (!this.saveSystem.clear()) {
        this.statusText.setText('無法建立新進度，請確認瀏覽器儲存空間。');
        return;
      }
      this.transitionToStudio({ newGame: true });
      return;
    }
    const cleared = this.saveSystem.clear();
    if (cleared) {
      this.menu.setHasSave(false);
      this.summary = [];
      this.statusText.setText('存檔已清除。');
      this.renderMenu();
    } else {
      this.statusText.setText('清除失敗，請確認瀏覽器儲存空間。');
    }
  }

  /** Couples camera and music fades so entering the studio feels like one handoff. */
  private transitionToStudio(data?: { newGame: boolean }): void {
    if (this.sceneTransitioning) return;
    this.sceneTransitioning = true;
    MusicDirector.play(this, 'studio');
    this.cameras.main.fadeOut(620, 16, 19, 47);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.STUDIO, data);
    });
  }

  private createControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for TitleScene.');
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
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private addDynamicText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string,
    fontStyle?: string,
  ): Phaser.GameObjects.Text {
    const object = this.add
      .text(x, y, text, {
        color,
        fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle,
      })
      .setDepth(DEPTH.UI + 1);
    this.dynamicObjects.push(object);
    return object;
  }

  private wasJustPressed(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
