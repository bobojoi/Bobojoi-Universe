import Phaser from 'phaser';
import { BubbleDog } from '../character/BubbleDog';
import { BubbleGirl } from '../character/BubbleGirl';
import { Player, type PlayerControls } from '../character/Player';
import { COLORS, DEPTH, SCENE_KEYS } from '../constants/GameConstants';
import {
  createDefaultStudioQuestState,
  StudioQuestManager,
  type StudioInvestigationId,
  type StudioQuestInteractionResult,
} from '../quest/StudioQuestManager';
import { StudioQuestWorldController } from '../quest/StudioQuestWorldController';
import {
  createDefaultMainStoryState,
  MainStoryManager,
  type StoryChoiceId,
  type StoryInteraction,
} from '../story/MainStoryManager';
import { DialogueSystem } from '../system/DialogueSystem';
import { InteractionSystem } from '../system/InteractionSystem';
import { SaveSystem } from '../system/SaveSystem';
import { HUD } from '../ui/HUD';

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1400;
const PLAYER_START_X = 620;
const PLAYER_START_Y = 760;
const BUBBLE_GIRL_X = 960;
const BUBBLE_GIRL_Y = 590;
const BUBBLE_DOG_X = 520;
const BUBBLE_DOG_Y = 460;
const PROP_BOX_X = 720;
const PROP_BOX_Y = 980;
const BUBBLE_TABLE_X = 1260;
const BUBBLE_TABLE_Y = 760;
const DOG_MAT_X = BUBBLE_DOG_X;
const DOG_MAT_Y = BUBBLE_DOG_Y + 44;
const STAR_RING_X = DOG_MAT_X + 70;
const STAR_RING_Y = DOG_MAT_Y + 26;
const CAMERA_LERP = 0.09;
const CAMERA_ZOOM = 1;
const CAMERA_DEADZONE_WIDTH = 160;
const CAMERA_DEADZONE_HEIGHT = 100;
const GRID_SIZE = 100;
const BUBBLE_COUNT = 18;
const BUBBLE_MIN_RADIUS = 10;
const BUBBLE_MAX_RADIUS = 38;
const BUBBLE_MIN_ALPHA = 0.08;
const BUBBLE_MAX_ALPHA = 0.22;
const BUBBLE_FLOAT_DISTANCE = 18;
const BUBBLE_FLOAT_DURATION_MS = 1800;
const AUTO_SAVE_INTERVAL_MS = 5000;
const PROP_WIDTH = 150;
const PROP_HEIGHT = 82;
const PROP_LABEL_OFFSET_Y = 58;
const STAR_RING_RADIUS = 28;
const STAR_RING_PULSE_SCALE = 1.12;
const STAR_RING_PULSE_DURATION_MS = 720;

/** First explorable room and composition root for gameplay systems. */
export class StudioScene extends Phaser.Scene {
  private player!: Player;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private saveSystem!: SaveSystem;
  private questManager!: StudioQuestManager;
  private questWorldController!: StudioQuestWorldController;
  private storyManager!: MainStoryManager;
  private hud!: HUD;
  private bubbleDog!: BubbleDog;
  private starRing!: Phaser.GameObjects.Container;
  private autoSaveTimer!: Phaser.Time.TimerEvent;

  public constructor() {
    super(SCENE_KEYS.STUDIO);
  }

  public create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawStudio();

    this.saveSystem = new SaveSystem();
    const savedData = this.saveSystem.load();
    this.questManager = new StudioQuestManager(
      savedData?.studioQuest ?? createDefaultStudioQuestState(),
      () => this.handleQuestStateChanged(),
    );
    const initialStoryState = savedData
      ? {
          mainStoryStage: savedData.mainStoryStage,
          playerStats: savedData.playerStats,
          relationships: savedData.relationships,
          storyFlags: savedData.storyFlags,
          chapterOneNode: savedData.chapterOneNode,
          chapterOneOutcome: savedData.chapterOneOutcome,
          chapterOneFlags: savedData.chapterOneFlags,
        }
      : createDefaultMainStoryState(this.questManager.isCompleted());
    this.storyManager = new MainStoryManager(
      initialStoryState,
      () => this.questManager.isCompleted(),
      () => this.handleStoryStateChanged(),
    );

    const controls = this.createControls();
    const savedPosition = savedData?.player;
    this.player = new Player(
      this,
      savedPosition?.x ?? PLAYER_START_X,
      savedPosition?.y ?? PLAYER_START_Y,
      controls,
    );

    const bubbleGirl = new BubbleGirl(this, BUBBLE_GIRL_X, BUBBLE_GIRL_Y);
    this.bubbleDog = new BubbleDog(this, BUBBLE_DOG_X, BUBBLE_DOG_Y);
    const investigationTargets = this.createInvestigationTargets();
    this.starRing = this.createStarRing();

    this.dialogueSystem = new DialogueSystem(this);
    this.hud = new HUD(this);
    this.refreshPlayerProgressHud();
    this.questWorldController = new StudioQuestWorldController(this.questManager, {
      bubbleDog: this.bubbleDog,
      starRing: this.starRing,
      dialogue: this.dialogueSystem,
      hud: this.hud,
    });
    this.questWorldController.synchronizeFromState();
    this.interactionSystem = new InteractionSystem(this.player);
    this.interactionSystem.register({
      target: bubbleGirl,
      prompt: '和泡妞說話',
      onInteract: () => this.interactWithBubbleGirl(),
    });
    this.interactionSystem.register({
      target: this.bubbleDog,
      prompt: '看看泡彈',
      onInteract: () => this.dialogueSystem.show('泡彈看起來很開心。'),
    });
    this.registerInvestigationTarget(investigationTargets.propBox, 'prop-box', '調查道具箱');
    this.registerInvestigationTarget(
      investigationTargets.bubbleTable,
      'bubble-table',
      '調查泡泡水工作桌',
    );
    this.registerInvestigationTarget(investigationTargets.dogMat, 'dog-mat', '調查泡彈休息墊');
    this.interactionSystem.register({
      target: this.starRing,
      prompt: '拿起星光泡泡環',
      isEnabled: () => this.questWorldController.isRingAvailable(),
      onInteract: () => this.handleQuestInteraction(this.questManager.collectRing()),
    });

    this.configureCamera();
    this.autoSaveTimer = this.time.addEvent({
      delay: AUTO_SAVE_INTERVAL_MS,
      loop: true,
      callback: this.saveProgress,
      callbackScope: this,
    });

    // Scene shutdown can occur during future transitions or hot reloads.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public update(): void {
    // R is a development-only restart hook for repeatable lifecycle regression checks.
    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (this.dialogueSystem.isChoosing()) {
      this.player.updateMovement(false);
      this.hud.setInteractionPrompt();
      this.dialogueSystem.update();
      return;
    }

    this.player.updateMovement();

    const interaction = this.interactionSystem.getNearest();
    this.hud.setInteractionPrompt(
      interaction ? this.interactionSystem.getPrompt(interaction) : undefined,
    );

    if (interaction && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      interaction.onInteract();
    }
  }

  /** Creates the three investigation props in the established studio visual language. */
  private createInvestigationTargets(): Record<
    'propBox' | 'bubbleTable' | 'dogMat',
    Phaser.GameObjects.Container
  > {
    const propBox = this.createLabeledProp(PROP_BOX_X, PROP_BOX_Y, '道具箱', COLORS.PINK);
    const bubbleTable = this.createLabeledProp(
      BUBBLE_TABLE_X,
      BUBBLE_TABLE_Y,
      '泡泡水工作桌',
      COLORS.MINT,
    );

    const matShape = this.add
      .ellipse(0, 0, PROP_WIDTH, PROP_HEIGHT, COLORS.PINK, 0.2)
      .setStrokeStyle(3, COLORS.PINK, 0.7);
    const matLabel = this.add
      .text(0, PROP_LABEL_OFFSET_Y, '泡彈休息墊', {
        color: '#ffb2d5',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const dogMat = this.add
      .container(DOG_MAT_X, DOG_MAT_Y, [matShape, matLabel])
      .setDepth(DEPTH.WORLD_DECORATION);

    return { propBox, bubbleTable, dogMat };
  }

  /** Builds one readable placeholder prop without introducing texture dependencies. */
  private createLabeledProp(
    x: number,
    y: number,
    label: string,
    color: number,
  ): Phaser.GameObjects.Container {
    const shape = this.add
      .rectangle(0, 0, PROP_WIDTH, PROP_HEIGHT, COLORS.PANEL, 0.9)
      .setStrokeStyle(3, color, 0.8);
    const accent = this.add.rectangle(
      0,
      -PROP_HEIGHT / 2 + 12,
      PROP_WIDTH - 22,
      6,
      color,
      0.8,
    );
    const labelText = this.add
      .text(0, 2, label, {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    return this.add
      .container(x, y, [shape, accent, labelText])
      .setDepth(DEPTH.WORLD_DECORATION);
  }

  /** Creates the quest pickup as the studio's single high-emphasis visual signature. */
  private createStarRing(): Phaser.GameObjects.Container {
    const glow = this.add
      .circle(0, 0, STAR_RING_RADIUS + 10, COLORS.GOLD, 0.14)
      .setStrokeStyle(2, COLORS.MINT, 0.35);
    const ring = this.add
      .circle(0, 0, STAR_RING_RADIUS, COLORS.GOLD, 0.08)
      .setStrokeStyle(7, COLORS.GOLD, 1);
    const star = this.add
      .text(0, 0, '✦', {
        color: '#f8f5ff',
        fontFamily: 'serif',
        fontSize: '28px',
      })
      .setOrigin(0.5);
    const container = this.add
      .container(STAR_RING_X, STAR_RING_Y, [glow, ring, star])
      .setDepth(DEPTH.CHARACTER + 1);

    this.tweens.add({
      targets: container,
      scale: STAR_RING_PULSE_SCALE,
      duration: STAR_RING_PULSE_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return container;
  }

  /** Connects a scene target to one quest investigation action. */
  private registerInvestigationTarget(
    target: Phaser.GameObjects.Container,
    location: StudioInvestigationId,
    prompt: string,
  ): void {
    this.interactionSystem.register({
      target,
      prompt,
      onInteract: () => this.handleQuestInteraction(this.questManager.investigate(location)),
    });
  }

  /** Delegates quest presentation and world effects to the studio coordinator. */
  private handleQuestInteraction(result: StudioQuestInteractionResult): void {
    this.questWorldController.applyInteraction(result);
  }

  /** Routes BubbleGirl interaction to the tutorial until the main story unlocks. */
  private interactWithBubbleGirl(): void {
    const storyInteraction = this.storyManager.interactWithBubbleGirl();
    if (!storyInteraction) {
      this.handleQuestInteraction(this.questManager.interactWithBubbleGirl());
      return;
    }
    this.handleStoryInteraction(storyInteraction);
  }

  /** Presents structured story copy and resolves choices through pure story logic. */
  private handleStoryInteraction(interaction: StoryInteraction): void {
    if (interaction.kind === 'message') {
      this.dialogueSystem.show(`${interaction.speaker}：${interaction.text}`);
      return;
    }

    this.dialogueSystem.showChoices<StoryChoiceId>(
      { speaker: interaction.speaker, text: interaction.text },
      interaction.choices,
      (choiceId) => {
        const result = this.storyManager.resolveStoryChoice(choiceId);
        this.dialogueSystem.show(`${result.speaker}：${result.text}`);
        if (result.chapterCompleted) this.hud.showChapterCompleted();
      },
    );
  }

  /** Refreshes derived HUD content and persists every meaningful quest transition. */
  private handleQuestStateChanged(): void {
    this.questWorldController.refreshHud();
    this.saveProgress();
  }

  /** Updates character values and saves one complete story transition. */
  private handleStoryStateChanged(): void {
    this.refreshPlayerProgressHud();
    this.saveProgress();
  }

  /** Maps the story manager snapshot into the compact character-status HUD. */
  private refreshPlayerProgressHud(): void {
    const state = this.storyManager.getState();
    this.hud.setPlayerProgress(state.playerStats, state.relationships);
    this.hud.setMainStory(this.storyManager.getHudView());
  }

  /** Creates keyboard controls in one place for later remapping support. */
  private createControls(): PlayerControls {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for StudioScene.');
    }

    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    if (import.meta.env.DEV) {
      this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }
    return {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  /** Configures a bounded, gently following world camera. */
  private configureCamera(): void {
    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .setZoom(CAMERA_ZOOM)
      .startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setDeadzone(CAMERA_DEADZONE_WIDTH, CAMERA_DEADZONE_HEIGHT);
  }

  /** Draws a deterministic studio floor and an ambient bubble constellation. */
  private drawStudio(): void {
    const background = this.add.graphics().setDepth(DEPTH.BACKGROUND);
    background.fillStyle(COLORS.NIGHT, 1);
    background.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    background.fillStyle(COLORS.FLOOR, 1);
    background.fillRoundedRect(120, 120, WORLD_WIDTH - 240, WORLD_HEIGHT - 240, 48);

    background.lineStyle(1, COLORS.FLOOR_LINE, 0.38);
    for (let x = 120; x <= WORLD_WIDTH - 120; x += GRID_SIZE) {
      background.lineBetween(x, 120, x, WORLD_HEIGHT - 120);
    }
    for (let y = 120; y <= WORLD_HEIGHT - 120; y += GRID_SIZE) {
      background.lineBetween(120, y, WORLD_WIDTH - 120, y);
    }

    // Seeded positions keep the room stable while still feeling organic.
    const random = new Phaser.Math.RandomDataGenerator(['bobojoi-studio-01']);
    for (let index = 0; index < BUBBLE_COUNT; index += 1) {
      const radius = random.between(BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS);
      const bubble = this.add
        .circle(
          random.between(radius, WORLD_WIDTH - radius),
          random.between(radius, WORLD_HEIGHT - radius),
          radius,
          index % 2 === 0 ? COLORS.MINT : COLORS.PINK,
          random.realInRange(BUBBLE_MIN_ALPHA, BUBBLE_MAX_ALPHA),
        )
        .setStrokeStyle(2, COLORS.WHITE, 0.16)
        .setDepth(DEPTH.WORLD_DECORATION);

      this.tweens.add({
        targets: bubble,
        y: bubble.y - BUBBLE_FLOAT_DISTANCE,
        duration: BUBBLE_FLOAT_DURATION_MS + random.between(0, BUBBLE_FLOAT_DURATION_MS),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    this.add
      .text(WORLD_WIDTH / 2, 220, '泡 泡 工 作 室', {
        color: '#6f75ae',
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '54px',
        letterSpacing: 14,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.WORLD_DECORATION);
  }

  /** Captures player position without blocking the render loop. */
  private saveProgress(): void {
    this.saveSystem.save(
      { x: this.player.x, y: this.player.y },
      this.questManager.getState(),
      this.storyManager.getState(),
    );
  }

  /** Persists progress and releases scene-owned resources. */
  private shutdown(): void {
    this.saveProgress();
    this.autoSaveTimer.remove(false);
    this.dialogueSystem.destroy();
  }
}
