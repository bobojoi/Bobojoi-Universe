import Phaser from 'phaser';
import { MusicDirector } from '../audio/MusicDirector';
import { BubbleDog } from '../character/BubbleDog';
import type { WorldPoint } from '../character/BubbleDogPositioning';
import { BubbleGirl } from '../character/BubbleGirl';
import { Player, type PlayerControls } from '../character/Player';
import { GAME_WIDTH } from '../config/gameConfig';
import { getWorldDepth } from '../constants/CharacterVisualConstants';
import { COLORS, DEPTH, SCENE_KEYS } from '../constants/GameConstants';
import { getCurrentMissionCard, type MissionCardView } from '../mission/MissionCatalog';
import {
  getProgressPresentation,
} from '../presentation/ProgressPresentation';
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
import {
  LIVING_STUDIO_PROPS,
  STUDIO_AMBIENT_MESSAGES,
  pickNonRepeatingIndex,
  type LivingStudioProp,
} from '../studio/LivingStudioContent';
import { StudioEnvironment } from '../studio/StudioEnvironment';
import { DialogueSystem } from '../system/DialogueSystem';
import { InteractionSystem } from '../system/InteractionSystem';
import { SaveSystem } from '../system/SaveSystem';
import { StudioGuidanceController } from '../tutorial/StudioGuidanceController';
import {
  createDefaultTutorialProgress,
  type TutorialProgressState,
} from '../tutorial/TutorialProgress';
import { HUD } from '../ui/HUD';
import { MissionBoard } from '../ui/MissionBoard';

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1400;
const WORLD_BOUNDS_MARGIN = 80;
const PLAYER_START_X = 620;
const PLAYER_START_Y = 760;
const BUBBLE_GIRL_X = 960;
const BUBBLE_GIRL_Y = 590;
const BUBBLE_DOG_X = 520;
const BUBBLE_DOG_Y = 570;
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
const AUTO_SAVE_INTERVAL_MS = 5000;
const PROP_WIDTH = 150;
const PROP_HEIGHT = 82;
const PROP_LABEL_OFFSET_Y = 58;
const STAR_RING_RADIUS = 28;
const STAR_RING_PULSE_SCALE = 1.12;
const STAR_RING_PULSE_DURATION_MS = 720;
const LIVING_PROP_COLOR = COLORS.FLOOR_LINE;
const AMBIENT_INITIAL_DELAY_MS = 9000;
const AMBIENT_MIN_DELAY_MS = 15000;
const AMBIENT_MAX_DELAY_MS = 26000;
const AMBIENT_VISIBLE_DURATION_MS = 4200;
const AMBIENT_FADE_DURATION_MS = 900;
const AMBIENT_TEXT_Y = 600;

/** First explorable room and composition root for gameplay systems. */
export class StudioScene extends Phaser.Scene {
  private player!: Player;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private saveSystem!: SaveSystem;
  private questManager!: StudioQuestManager;
  private questWorldController!: StudioQuestWorldController;
  private storyManager!: MainStoryManager;
  private hud!: HUD;
  private bubbleDog!: BubbleDog;
  private bubbleGirl!: BubbleGirl;
  private bubbleDogBlockedPositions: WorldPoint[] = [];
  private starRing!: Phaser.GameObjects.Container;
  private autoSaveTimer!: Phaser.Time.TimerEvent;
  private ambientTimer?: Phaser.Time.TimerEvent;
  private ambientText!: Phaser.GameObjects.Text;
  private lastAmbientMessageIndex = -1;
  private guidanceController!: StudioGuidanceController;
  private missionBoard!: MissionBoard;
  private tutorialProgress!: TutorialProgressState;
  private lastSaveSucceeded = true;
  private sceneTransitioning = false;

  public constructor() {
    super(SCENE_KEYS.STUDIO);
  }

  public create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const environment = new StudioEnvironment(this, WORLD_WIDTH, WORLD_HEIGHT).create();

    this.saveSystem = new SaveSystem();
    const savedData = this.saveSystem.load();
    this.tutorialProgress = savedData?.tutorialProgress ?? createDefaultTutorialProgress();
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
          chapterTwoNode: savedData.chapterTwoNode,
          chapterTwoOutcome: savedData.chapterTwoOutcome,
          chapterTwoFlags: savedData.chapterTwoFlags,
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

    this.bubbleGirl = new BubbleGirl(this, BUBBLE_GIRL_X, BUBBLE_GIRL_Y);
    this.bubbleDog = new BubbleDog(this, BUBBLE_DOG_X, BUBBLE_DOG_Y);
    const investigationTargets = this.createInvestigationTargets();
    const livingStudioTargets = this.createLivingStudioTargets();
    this.starRing = this.createStarRing();
    this.bubbleDogBlockedPositions = [
      this.bubbleGirl,
      investigationTargets.propBox,
      investigationTargets.bubbleTable,
      investigationTargets.dogMat,
      this.starRing,
      environment.missionBoardTarget,
      ...livingStudioTargets.map(({ target }) => target),
    ];
    this.ambientText = this.createAmbientText();

    this.dialogueSystem = new DialogueSystem(this);
    this.hud = new HUD(this);
    this.guidanceController = new StudioGuidanceController(
      this,
      this.tutorialProgress,
      () => this.questManager.getState(),
      () => this.storyManager.getState(),
      (state) => {
        this.tutorialProgress = state;
        return this.saveProgress();
      },
      () => this.dialogueSystem.close(),
    );
    this.refreshPlayerProgressHud();
    this.questWorldController = new StudioQuestWorldController(this.questManager, {
      bubbleDog: this.bubbleDog,
      starRing: this.starRing,
      dialogue: this.dialogueSystem,
      hud: this.hud,
    });
    this.questWorldController.synchronizeFromState();
    this.missionBoard = new MissionBoard(this, {
      getMission: () =>
        getCurrentMissionCard(this.questManager.getState(), this.storyManager.getState()),
      onStartMission: (mission) => this.handleMissionDeparture(mission),
    });
    this.interactionSystem = new InteractionSystem(this.player);
    this.interactionSystem.register({
      target: this.bubbleGirl,
      prompt: '和泡妞說話',
      onInteract: () => this.interactWithBubbleGirl(),
    });
    this.interactionSystem.register({
      target: this.bubbleDog,
      prompt: '摸摸泡彈',
      onInteract: () => this.dialogueSystem.show(this.bubbleDog.playInteraction()),
    });
    this.interactionSystem.register({
      target: environment.missionBoardTarget,
      prompt: '查看任務製作板',
      onInteract: () => this.missionBoard.open(),
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
    for (const { definition, target } of livingStudioTargets) {
      this.registerLivingStudioTarget(target, definition);
    }

    this.configureCamera();
    this.cameras.main.fadeIn(620, 16, 19, 47);
    MusicDirector.play(this, 'studio');
    this.autoSaveTimer = this.time.addEvent({
      delay: AUTO_SAVE_INTERVAL_MS,
      loop: true,
      callback: this.saveProgress,
      callbackScope: this,
    });
    this.scheduleAmbientMessage(AMBIENT_INITIAL_DELAY_MS);

    // The persisted flag is marked before display so reload/restart cannot replay onboarding.
    this.time.delayedCall(180, () => this.guidanceController.start());

    // Scene shutdown can occur during future transitions or hot reloads.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public update(): void {
    // R is a development-only restart hook for repeatable lifecycle regression checks.
    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (this.sceneTransitioning) {
      this.player.updateMovement(false);
      this.hud.setInteractionPrompt();
      return;
    }

    this.missionBoard.update();

    // Character life continues independently of player input and story progression.
    this.bubbleDog.updateActivity(this.player, {
      playerBusy:
        this.guidanceController.isBlockingInput() ||
        this.dialogueSystem.isActive() ||
        this.missionBoard.isOpen(),
      blockedPositions: this.bubbleDogBlockedPositions,
      worldBounds: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        margin: WORLD_BOUNDS_MARGIN,
      },
    });
    this.bubbleGirl.updateActivity(this.player);

    if (this.missionBoard.isOpen()) {
      this.player.updateMovement(false);
      this.hud.setInteractionPrompt();
      return;
    }

    if (this.guidanceController.isBlockingInput()) {
      this.player.updateMovement(false);
      this.hud.setInteractionPrompt();
      this.guidanceController.update();
      return;
    }

    if (this.dialogueSystem.isChoosing()) {
      this.player.updateMovement(false);
      this.hud.setInteractionPrompt();
      this.dialogueSystem.update();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.returnToTitle();
      return;
    }

    this.player.updateMovement();

    const interaction = this.interactionSystem.getNearest();
    this.hud.setInteractionPrompt(
      interaction ? this.interactionSystem.getPrompt(interaction) : undefined,
    );

    if (interaction && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.player.playAction();
      interaction.onInteract();
    }
  }

  /** Creates five optional room details without adding story or persistent state. */
  private createLivingStudioTargets(): Array<{
    definition: LivingStudioProp;
    target: Phaser.GameObjects.Container;
  }> {
    return LIVING_STUDIO_PROPS.map((definition) => ({
      definition,
      target: this.createLabeledProp(
        definition.x,
        definition.y,
        definition.label,
        LIVING_PROP_COLOR,
      ),
    }));
  }

  /** Connects optional room dressing to the existing non-modal interaction path. */
  private registerLivingStudioTarget(
    target: Phaser.GameObjects.Container,
    definition: LivingStudioProp,
  ): void {
    this.interactionSystem.register({
      target,
      prompt: definition.prompt,
      onInteract: () => this.dialogueSystem.show(definition.description),
    });
  }

  /** Builds one quiet fixed line for atmosphere that never takes input ownership. */
  private createAmbientText(): Phaser.GameObjects.Text {
    return this.add
      .text(GAME_WIDTH / 2, AMBIENT_TEXT_Y, '', {
        color: '#b8b9d9',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '15px',
        fontStyle: 'italic',
        backgroundColor: 'rgba(16, 19, 47, 0.72)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI)
      .setVisible(false);
  }

  /** Schedules one ambient observation with a fresh interval after every attempt. */
  private scheduleAmbientMessage(delay?: number): void {
    this.ambientTimer?.remove(false);
    this.ambientTimer = this.time.delayedCall(
      delay ?? Phaser.Math.Between(AMBIENT_MIN_DELAY_MS, AMBIENT_MAX_DELAY_MS),
      () => {
        if (!this.guidanceController.isBlockingInput() && !this.dialogueSystem.isActive()) {
          this.showAmbientMessage();
        }
        this.scheduleAmbientMessage();
      },
    );
  }

  /** Fades one non-repeating observation without touching dialogue or HUD state. */
  private showAmbientMessage(): void {
    this.lastAmbientMessageIndex = pickNonRepeatingIndex(
      STUDIO_AMBIENT_MESSAGES.length,
      this.lastAmbientMessageIndex,
      Math.random(),
    );
    const message = STUDIO_AMBIENT_MESSAGES[this.lastAmbientMessageIndex];
    if (!message) return;

    this.tweens.killTweensOf(this.ambientText);
    this.ambientText.setText(message).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.ambientText,
      alpha: 0,
      delay: AMBIENT_VISIBLE_DURATION_MS,
      duration: AMBIENT_FADE_DURATION_MS,
      onComplete: () => this.ambientText.setVisible(false),
    });
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
      .setDepth(getWorldDepth(DOG_MAT_Y));

    return { propBox, bubbleTable, dogMat };
  }

  /** Adds a compact interaction plaque while illustrated furniture carries the object silhouette. */
  private createLabeledProp(
    x: number,
    y: number,
    label: string,
    color: number,
  ): Phaser.GameObjects.Container {
    const plaque = this.add.graphics();
    plaque.fillStyle(0x090b1d, 0.45);
    plaque.fillRoundedRect(-PROP_WIDTH / 2 + 4, PROP_LABEL_OFFSET_Y - 14, PROP_WIDTH, 36, 12);
    plaque.fillStyle(COLORS.PANEL, 0.88);
    plaque.fillRoundedRect(-PROP_WIDTH / 2, PROP_LABEL_OFFSET_Y - 18, PROP_WIDTH, 36, 12);
    plaque.lineStyle(2, color, 0.72);
    plaque.strokeRoundedRect(-PROP_WIDTH / 2, PROP_LABEL_OFFSET_Y - 18, PROP_WIDTH, 36, 12);
    plaque.fillStyle(color, 0.9);
    plaque.fillCircle(-PROP_WIDTH / 2 + 17, PROP_LABEL_OFFSET_Y, 5);
    const labelText = this.add
      .text(8, PROP_LABEL_OFFSET_Y, label, {
        color: '#f8f5ff',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    return this.add
      .container(x, y, [plaque, labelText])
      .setSize(PROP_WIDTH, PROP_HEIGHT + PROP_LABEL_OFFSET_Y)
      .setDepth(getWorldDepth(y));
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
      .setDepth(getWorldDepth(STAR_RING_Y) + 0.5);

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

    const showChoices = (): void => {
      this.dialogueSystem.showChoices<StoryChoiceId>(
        { speaker: interaction.speaker, text: interaction.text },
        interaction.choices,
        (choiceId) => this.resolveStoryChoice(choiceId),
      );
    };

    this.guidanceController.presentChoiceExplanation(interaction.choices, showChoices);
  }

  /** Resolves once, then presents only the already-committed effects and save result. */
  private resolveStoryChoice(choiceId: StoryChoiceId): void {
    const result = this.storyManager.resolveStoryChoice(choiceId);
    this.dialogueSystem.show(`${result.speaker}：${result.text}`);
    if (!result.success) return;

    this.guidanceController.presentChoiceResult(result, this.lastSaveSucceeded);
    if (result.chapterCompleted && result.completionLabel) {
      this.hud.showChapterCompleted(result.completionLabel);
    }
  }

  /** Uses the departure confirmation as a short production transition, not a new game mode. */
  private handleMissionDeparture(mission: MissionCardView): void {
    if (this.sceneTransitioning) return;
    this.sceneTransitioning = true;
    this.cameras.main.fadeOut(620, 16, 19, 47);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      MusicDirector.play(this, 'studio');
      this.dialogueSystem.show(`任務製作板：${mission.actionHint}`);
      this.cameras.main.fadeIn(620, 16, 19, 47);
      this.sceneTransitioning = false;
    });
  }

  /** Refreshes derived HUD content and persists every meaningful quest transition. */
  private handleQuestStateChanged(): void {
    this.questWorldController.refreshHud();
    this.saveProgress();
    this.refreshProgressPresentation();
    this.guidanceController.schedulePendingChapterTransitions();
  }

  /** Updates character values and saves one complete story transition. */
  private handleStoryStateChanged(): void {
    this.refreshPlayerProgressHud();
    this.saveProgress();
    this.guidanceController.schedulePendingChapterTransitions();
  }

  /** Maps the story manager snapshot into the compact character-status HUD. */
  private refreshPlayerProgressHud(): void {
    const state = this.storyManager.getState();
    this.hud.setPlayerProgress(state.playerStats, state.relationships);
    this.refreshProgressPresentation();
  }

  /** Maps quest and story truth into one human-readable chapter/objective card. */
  private refreshProgressPresentation(): void {
    this.hud.setProgress(
      getProgressPresentation(this.questManager.getState(), this.storyManager.getState()),
    );
  }

  /** Creates keyboard controls in one place for later remapping support. */
  private createControls(): PlayerControls {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for StudioScene.');
    }

    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
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

  /** Fades camera and music together before handing control back to the title scene. */
  private returnToTitle(): void {
    if (this.sceneTransitioning) return;
    this.sceneTransitioning = true;
    this.saveProgress();
    MusicDirector.play(this, 'title');
    this.cameras.main.fadeOut(540, 16, 19, 47);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TITLE);
    });
  }

  /** Captures player position without blocking the render loop. */
  private saveProgress(): boolean {
    this.lastSaveSucceeded = this.saveSystem.save(
      { x: this.player.x, y: this.player.y },
      this.questManager.getState(),
      this.storyManager.getState(),
      this.tutorialProgress,
    );
    return this.lastSaveSucceeded;
  }

  /** Persists progress and releases scene-owned resources. */
  private shutdown(): void {
    this.saveProgress();
    this.autoSaveTimer.remove(false);
    this.ambientTimer?.remove(false);
    this.tweens.killTweensOf(this.ambientText);
    this.dialogueSystem.destroy();
    this.guidanceController.destroy();
    this.missionBoard.destroy();
  }
}
