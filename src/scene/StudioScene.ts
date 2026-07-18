import Phaser from 'phaser';
import { BubbleDog } from '../character/BubbleDog';
import { BubbleGirl } from '../character/BubbleGirl';
import { Player, type PlayerControls } from '../character/Player';
import { COLORS, DEPTH, SCENE_KEYS } from '../constants/GameConstants';
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

/** First explorable room and composition root for gameplay systems. */
export class StudioScene extends Phaser.Scene {
  private player!: Player;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private saveSystem!: SaveSystem;
  private hud!: HUD;
  private autoSaveTimer!: Phaser.Time.TimerEvent;

  public constructor() {
    super(SCENE_KEYS.STUDIO);
  }

  public create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawStudio();

    const controls = this.createControls();
    const savedPosition = new SaveSystem().load()?.player;
    this.player = new Player(
      this,
      savedPosition?.x ?? PLAYER_START_X,
      savedPosition?.y ?? PLAYER_START_Y,
      controls,
    );

    const bubbleGirl = new BubbleGirl(this, BUBBLE_GIRL_X, BUBBLE_GIRL_Y);
    const bubbleDog = new BubbleDog(this, BUBBLE_DOG_X, BUBBLE_DOG_Y);

    this.dialogueSystem = new DialogueSystem(this);
    this.hud = new HUD(this);
    this.saveSystem = new SaveSystem();
    this.interactionSystem = new InteractionSystem(this.player);
    this.interactionSystem.register({
      target: bubbleGirl,
      prompt: '和泡妞說話',
      message: '泡妞：今天開始努力吧！',
    });
    this.interactionSystem.register({
      target: bubbleDog,
      prompt: '看看泡彈',
      message: '泡彈看起來很開心。',
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
    this.player.updateMovement();

    const interaction = this.interactionSystem.getNearest();
    this.hud.setInteractionPrompt(interaction?.prompt);

    if (interaction && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.dialogueSystem.show(interaction.message);
    }
  }

  /** Creates keyboard controls in one place for later remapping support. */
  private createControls(): PlayerControls {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for StudioScene.');
    }

    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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
    this.saveSystem.save({ x: this.player.x, y: this.player.y });
  }

  /** Persists progress and releases scene-owned resources. */
  private shutdown(): void {
    this.saveProgress();
    this.autoSaveTimer.remove(false);
    this.dialogueSystem.destroy();
  }
}
