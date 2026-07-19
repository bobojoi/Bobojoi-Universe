import Phaser from 'phaser';
import { MusicDirector } from '../audio/MusicDirector';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS, DEPTH } from '../constants/GameConstants';
import {
  MISSION_CATEGORY_PRESENTATION,
  type MissionCardView,
  type MissionCategory,
} from '../mission/MissionCatalog';

const PANEL_X = 92;
const PANEL_Y = 54;
const PANEL_WIDTH = 1096;
const PANEL_HEIGHT = 612;
const PANEL_RADIUS = 28;
const CONTENT_X = PANEL_X + 44;
const CONTENT_Y = PANEL_Y + 40;
const IMAGE_WIDTH = 430;
const IMAGE_HEIGHT = 238;
const BUTTON_WIDTH = 276;
const BUTTON_HEIGHT = 54;
const BUTTON_GAP = 18;
const FADE_DURATION_MS = 280;

type MissionBoardMode = 'card' | 'departure';

/** Full mission data is injected so the overlay never duplicates progression rules. */
export interface MissionBoardOptions {
  getMission: () => MissionCardView;
  onStartMission: (mission: MissionCardView) => void;
}

/** Presents one production-ready mission card and a deliberate pre-departure confirmation. */
export class MissionBoard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly illustration: Phaser.GameObjects.Graphics;
  private readonly eyebrow: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly category: Phaser.GameObjects.Text;
  private readonly location: Phaser.GameObjects.Text;
  private readonly description: Phaser.GameObjects.Text;
  private readonly estimatedTime: Phaser.GameObjects.Text;
  private readonly reward: Phaser.GameObjects.Text;
  private readonly actionHint: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private readonly legendObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly buttons: MissionButton[];
  private readonly toggleKey: Phaser.Input.Keyboard.Key;
  private readonly upKeys: Phaser.Input.Keyboard.Key[];
  private readonly downKeys: Phaser.Input.Keyboard.Key[];
  private readonly confirmKeys: Phaser.Input.Keyboard.Key[];
  private readonly escapeKey: Phaser.Input.Keyboard.Key;
  private mission!: MissionCardView;
  private mode: MissionBoardMode = 'card';
  private selectedButtonIndex = 0;
  private openState = false;
  private transitioning = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: MissionBoardOptions,
  ) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for MissionBoard.');
    this.toggleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
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

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 20);
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.NIGHT, 0.9).setOrigin(0);
    this.panel = scene.add.graphics();
    this.illustration = scene.add.graphics();
    this.eyebrow = this.createText(CONTENT_X, CONTENT_Y, '', 13, '#78f0cf', 'bold');
    this.title = this.createText(CONTENT_X + IMAGE_WIDTH + 48, CONTENT_Y + 38, '', 32, '#f8f5ff', 'bold');
    this.category = this.createText(CONTENT_X + IMAGE_WIDTH + 48, CONTENT_Y, '', 14, '#ffd66b', 'bold');
    this.location = this.createText(CONTENT_X + IMAGE_WIDTH + 48, CONTENT_Y + 94, '', 16, '#d4d6e9');
    this.description = this.createText(
      CONTENT_X + IMAGE_WIDTH + 48,
      CONTENT_Y + 134,
      '',
      18,
      '#f8f5ff',
    ).setWordWrapWidth(510).setLineSpacing(7);
    this.estimatedTime = this.createText(CONTENT_X, CONTENT_Y + 302, '', 16, '#f8f5ff');
    this.reward = this.createText(CONTENT_X, CONTENT_Y + 352, '', 16, '#f8f5ff');
    this.actionHint = this.createText(CONTENT_X, CONTENT_Y + 410, '', 15, '#c9cbe4')
      .setWordWrapWidth(620)
      .setLineSpacing(5);
    this.footer = this.createText(
      GAME_WIDTH / 2,
      PANEL_Y + PANEL_HEIGHT - 22,
      'M / Esc 關閉　·　W/S 選擇　·　Enter / E 確認',
      13,
      '#8f94bd',
    ).setOrigin(0.5, 1);

    this.root.add([
      shade,
      this.panel,
      this.illustration,
      this.eyebrow,
      this.title,
      this.category,
      this.location,
      this.description,
      this.estimatedTime,
      this.reward,
      this.actionHint,
      this.footer,
    ]);
    this.createCategoryLegend();

    const buttonY = CONTENT_Y + 478;
    this.buttons = [
      new MissionButton(
        scene,
        CONTENT_X + IMAGE_WIDTH + 48,
        buttonY,
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => this.activatePrimary(),
        () => this.selectButton(0),
      ),
      new MissionButton(
        scene,
        CONTENT_X + IMAGE_WIDTH + 48 + BUTTON_WIDTH + BUTTON_GAP,
        buttonY,
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => this.activateSecondary(),
        () => this.selectButton(1),
      ),
    ];
    this.root.add(this.buttons.map(({ container }) => container));
    this.root.setVisible(false);
  }

  /** Polls M globally and owns navigation keys only while the card is open. */
  public update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      if (this.openState) this.close();
      else this.open();
      return;
    }
    if (!this.openState || this.transitioning) return;
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.mode === 'departure') this.showCard();
      else this.close();
      return;
    }
    if (this.wasJustPressed(this.upKeys)) this.selectButton(this.selectedButtonIndex - 1);
    if (this.wasJustPressed(this.downKeys)) this.selectButton(this.selectedButtonIndex + 1);
    if (this.wasJustPressed(this.confirmKeys)) this.buttons[this.selectedButtonIndex]?.activate();
  }

  public isOpen(): boolean {
    return this.openState;
  }

  /** Opens from either the M shortcut or the physical studio production board. */
  public open(): void {
    if (this.openState || this.transitioning) return;
    this.mission = this.options.getMission();
    this.openState = true;
    this.mode = 'card';
    this.selectedButtonIndex = 0;
    this.render();
    this.root.setAlpha(0).setVisible(true);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: FADE_DURATION_MS,
      ease: 'Sine.out',
    });
  }

  /** Fades out without leaving pointer callbacks or keyboard ownership behind. */
  public close(): void {
    if (!this.openState || this.transitioning) return;
    this.transitioning = true;
    MusicDirector.play(this.scene, 'studio');
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: FADE_DURATION_MS,
      ease: 'Sine.in',
      onComplete: () => {
        this.root.setVisible(false);
        this.openState = false;
        this.transitioning = false;
      },
    });
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.destroy(true);
  }

  private showDeparture(): void {
    this.mode = 'departure';
    this.selectedButtonIndex = 0;
    // Performance productions receive their dedicated show theme; other work uses mission music.
    MusicDirector.play(this.scene, this.mission.category === 'performance' ? 'performance' : 'mission');
    this.render();
  }

  private showCard(): void {
    this.mode = 'card';
    this.selectedButtonIndex = 0;
    MusicDirector.play(this.scene, 'studio');
    this.render();
  }

  private activatePrimary(): void {
    if (this.mode === 'card') {
      this.showDeparture();
      return;
    }
    if (this.transitioning) return;
    this.transitioning = true;
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: FADE_DURATION_MS,
      ease: 'Sine.in',
      onComplete: () => {
        this.root.setVisible(false);
        this.openState = false;
        this.transitioning = false;
        this.options.onStartMission(this.mission);
      },
    });
  }

  private activateSecondary(): void {
    if (this.mode === 'departure') this.showCard();
    else this.close();
  }

  private render(): void {
    const presentation = MISSION_CATEGORY_PRESENTATION[this.mission.category];
    this.drawPanel(presentation.color);
    this.drawIllustration(this.mission.category, presentation.color);
    this.eyebrow.setText(this.mode === 'departure' ? 'MISSION DEPARTURE' : 'CURRENT PRODUCTION');
    this.category.setText(`${presentation.icon}  ${presentation.label}`);
    this.category.setColor(colorToCss(presentation.color));
    this.title.setText(`【${this.mission.title}】`);
    this.location.setText(`地點　${this.mission.location}`);
    this.description.setText(
      this.mode === 'departure'
        ? `任務介紹\n${this.mission.description}`
        : this.mission.description,
    );
    this.estimatedTime.setText(`預估時間　${this.mission.estimatedTime}`);
    this.reward.setText(`獎勵　${this.mission.reward}`);
    this.actionHint.setText(this.mode === 'departure' ? this.mission.actionHint : '從製作板確認內容，再決定是否出發。');
    this.buttons[0]?.setLabel(this.mode === 'departure' ? '開始任務' : '查看出發資訊');
    this.buttons[1]?.setLabel(this.mode === 'departure' ? '返回工作室' : '關閉任務卡');
    this.refreshButtons();
  }

  private drawPanel(accentColor: number): void {
    this.panel.clear();
    this.panel.fillStyle(0x060817, 0.62);
    this.panel.fillRoundedRect(PANEL_X + 12, PANEL_Y + 14, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.fillStyle(COLORS.PANEL, 0.995);
    this.panel.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.lineStyle(2, accentColor, 0.76);
    this.panel.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    this.panel.lineStyle(1, COLORS.FLOOR_LINE, 0.55);
    this.panel.lineBetween(CONTENT_X, CONTENT_Y + 278, PANEL_X + PANEL_WIDTH - 44, CONTENT_Y + 278);
  }

  /** Code-native key art satisfies the image requirement without inventing new IP artwork. */
  private drawIllustration(category: MissionCategory, accentColor: number): void {
    this.illustration.clear();
    this.illustration.fillStyle(0x0c1028, 1);
    this.illustration.fillRoundedRect(CONTENT_X, CONTENT_Y + 30, IMAGE_WIDTH, IMAGE_HEIGHT, 20);
    this.illustration.fillStyle(accentColor, 0.12);
    this.illustration.fillCircle(CONTENT_X + 110, CONTENT_Y + 130, 92);
    this.illustration.fillStyle(COLORS.MINT, 0.11);
    this.illustration.fillCircle(CONTENT_X + 308, CONTENT_Y + 116, 118);
    this.illustration.lineStyle(8, accentColor, 0.95);
    this.illustration.strokeCircle(CONTENT_X + 216, CONTENT_Y + 145, 67);
    this.illustration.lineStyle(3, COLORS.WHITE, 0.6);
    this.illustration.strokeCircle(CONTENT_X + 216, CONTENT_Y + 145, 88);
    this.illustration.fillStyle(COLORS.GOLD, 1);
    this.illustration.fillTriangle(
      CONTENT_X + 216,
      CONTENT_Y + 84,
      CONTENT_X + 228,
      CONTENT_Y + 125,
      CONTENT_X + 269,
      CONTENT_Y + 128,
    );
    this.illustration.fillStyle(0x060817, 0.5);
    this.illustration.fillRoundedRect(CONTENT_X + 18, CONTENT_Y + 220, IMAGE_WIDTH - 36, 34, 10);
    const marker = MISSION_CATEGORY_PRESENTATION[category];
    this.illustration.fillStyle(marker.color, 0.8);
    this.illustration.fillCircle(CONTENT_X + 40, CONTENT_Y + 237, 8);
  }

  private createCategoryLegend(): void {
    let x = CONTENT_X;
    const y = PANEL_Y + PANEL_HEIGHT - 62;
    for (const category of Object.keys(MISSION_CATEGORY_PRESENTATION) as MissionCategory[]) {
      const presentation = MISSION_CATEGORY_PRESENTATION[category];
      const icon = this.createText(x, y, presentation.icon, 16, colorToCss(presentation.color), 'bold');
      const label = this.createText(x + 22, y + 1, presentation.label, 12, '#8f94bd');
      this.legendObjects.push(icon, label);
      this.root.add([icon, label]);
      x += category === 'commercial' ? 116 : 88;
    }
  }

  private selectButton(index: number): void {
    this.selectedButtonIndex = (index + this.buttons.length) % this.buttons.length;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    this.buttons.forEach((button, index) => button.setSelected(index === this.selectedButtonIndex));
  }

  private createText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string,
    fontStyle?: string,
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      color,
      fontFamily: 'Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle,
    });
  }

  private wasJustPressed(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}

/** One pointer-and-keyboard button with hover, press, shadow, and a rounded production rail. */
class MissionButton {
  public readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private selected = false;
  private hovered = false;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly onActivate: () => void,
    private readonly onHover: () => void,
  ) {
    this.graphics = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.container = scene.add.container(x + width / 2, y + height / 2, [this.graphics, this.text]);
    this.container
      .setSize(width, height)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.hovered = true;
        this.onHover();
        this.draw();
        scene.tweens.add({ targets: this.container, scale: 1.025, duration: 110 });
      })
      .on('pointerout', () => {
        this.hovered = false;
        this.draw();
        scene.tweens.add({ targets: this.container, scale: 1, duration: 110 });
      })
      .on('pointerdown', () => {
        scene.tweens.add({ targets: this.container, scale: 0.975, duration: 70, yoyo: true });
      })
      .on('pointerup', () => this.activate());
    this.draw();
  }

  public setLabel(label: string): void {
    this.text.setText(label);
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    this.draw();
  }

  public activate(): void {
    this.onActivate();
  }

  private draw(): void {
    const active = this.selected || this.hovered;
    const left = -this.width / 2;
    const top = -this.height / 2;
    this.graphics.clear();
    this.graphics.fillStyle(0x060817, 0.58);
    this.graphics.fillRoundedRect(left + 5, top + 7, this.width, this.height, 15);
    this.graphics.fillStyle(active ? COLORS.FLOOR : COLORS.NIGHT, 0.99);
    this.graphics.fillRoundedRect(left, top, this.width, this.height, 15);
    this.graphics.lineStyle(2, active ? COLORS.MINT : COLORS.FLOOR_LINE, active ? 0.95 : 0.62);
    this.graphics.strokeRoundedRect(left, top, this.width, this.height, 15);
    if (active) {
      this.graphics.fillStyle(COLORS.MINT, 1);
      this.graphics.fillRoundedRect(left, top, 7, this.height, 4);
    }
    this.text.setColor(active ? '#78f0cf' : '#f8f5ff');
  }
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
