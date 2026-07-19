import Phaser from 'phaser';
import {
  CHARACTER_VISUALS,
  getWorldDepth,
  type CharacterTextureVisual,
} from '../constants/CharacterVisualConstants';
import { BUBBLE_DOG_REACTIONS, pickNonRepeatingIndex } from '../studio/LivingStudioContent';
import {
  DOG_CATCH_UP_DISTANCE,
  DOG_FOLLOW_MAX_DISTANCE,
  DOG_FOLLOW_MIN_DISTANCE,
  getBubbleDogCompanionTarget,
  isBubbleDogBlocking,
  type WorldBounds,
  type WorldPoint,
} from './BubbleDogPositioning';

const RUN_DURATION_MS = 650;
const DECISION_MIN_DELAY_MS = 2600;
const DECISION_MAX_DELAY_MS = 5200;
const FOLLOW_REFRESH_MS = 1100;
const TARGET_REACHED_DISTANCE = 28;
const WANDER_DISTANCE = 12;
const WANDER_DURATION_MS = 1700;
const FOLLOW_DURATION_MS = 900;
const QUEST_SETTLE_DELAY_MS = 500;
const LABEL_OFFSET_Y = 18;
const INTERACTION_DURATION_MS = 300;
const INTERACTION_SPIN_DEGREES = 18;
const INTERACTION_SCALE_FACTOR = 1.12;
const SITTING_SCALE_FACTOR = 0.96;
const LYING_SCALE_FACTOR = 0.9;
const IDLE_SCALE_FACTOR = 0.985;
const IDLE_PULSE_DURATION_MS = 760;
const MOVEMENT_THRESHOLD = 8;

/** Scene-owned context supplies transient world constraints without entering dog state. */
export interface BubbleDogActivityContext {
  playerBusy: boolean;
  blockedPositions: readonly WorldPoint[];
  worldBounds: WorldBounds;
}

type BubbleDogActivity = '坐下' | '趴下' | '慢慢散步' | '看著你' | '發呆';

const AUTONOMOUS_ACTIVITIES: readonly BubbleDogActivity[] = [
  '坐下',
  '趴下',
  '慢慢散步',
  '看著你',
  '發呆',
];

/** Represents 泡彈 and owns his small, non-persistent studio companion behavior. */
export class BubbleDog extends Phaser.Physics.Arcade.Sprite {
  private hasRun = false;
  private nextDecisionAt = 0;
  private lastReactionIndex = -1;
  private wasPlayerBusy = false;
  private readonly lastPlayerHeading = new Phaser.Math.Vector2(0, 1);
  private readonly preferredSide: -1 | 1 = -1;
  private readonly companionTarget = new Phaser.Math.Vector2();
  private readonly activityLabel: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, CHARACTER_VISUALS.BUBBLE_DOG.front.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(
      CHARACTER_VISUALS.BUBBLE_DOG.originX,
      CHARACTER_VISUALS.BUBBLE_DOG.originY,
    );
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_DOG.front);
    this.setDepth(getWorldDepth(y));
    this.activityLabel = scene.add
      .text(x, y + LABEL_OFFSET_Y, '發呆', {
        color: '#ffd66b',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(getWorldDepth(y) + 0.5);
    this.startIdleAnimation();
    this.scheduleNextDecision();
  }

  /** Advances proximity following and autonomous activity without registering timers. */
  public updateActivity(
    player: Phaser.Physics.Arcade.Sprite,
    context: BubbleDogActivityContext,
  ): void {
    this.activityLabel.setPosition(this.x, this.y + LABEL_OFFSET_Y);
    this.setDepth(getWorldDepth(this.y));
    this.activityLabel.setDepth(getWorldDepth(this.y) + 0.5);
    this.updatePlayerHeading(player);
    if (context.playerBusy && !this.wasPlayerBusy) this.nextDecisionAt = 0;
    this.wasPlayerBusy = context.playerBusy;
    if (this.scene.time.now < this.nextDecisionAt) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.companionTarget.setFromObject(
      getBubbleDogCompanionTarget(
        player,
        this.lastPlayerHeading,
        this.preferredSide,
        context.blockedPositions,
        context.worldBounds,
      ),
    );
    const targetDistance = Phaser.Math.Distance.BetweenPoints(this, this.companionTarget);
    const needsCatchUp = distance > DOG_CATCH_UP_DISTANCE;
    const tooClose = distance < DOG_FOLLOW_MIN_DISTANCE;
    const blocking = isBubbleDogBlocking(this, context.blockedPositions);
    if (
      needsCatchUp ||
      tooClose ||
      blocking ||
      (context.playerBusy && targetDistance > TARGET_REACHED_DISTANCE)
    ) {
      this.followPlayer(targetDistance);
      return;
    }

    if (distance > DOG_FOLLOW_MAX_DISTANCE) {
      this.startIdleAnimation('在附近等你');
      this.nextDecisionAt = this.scene.time.now + FOLLOW_REFRESH_MS;
      return;
    }
    this.performAutonomousActivity(player, context);
  }

  /** Plays one official-art greeting and returns non-repeating companion copy. */
  public playInteraction(): string {
    this.scene.tweens.killTweensOf(this);
    this.resetPose();
    this.activityLabel.setText('開心地轉圈');
    this.scene.tweens.add({
      targets: this,
      angle: INTERACTION_SPIN_DEGREES,
      scale: CHARACTER_VISUALS.BUBBLE_DOG.scale * INTERACTION_SCALE_FACTOR,
      duration: INTERACTION_DURATION_MS,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.resetPose();
        this.refreshBody();
        this.startIdleAnimation('開心地看著你');
      },
    });
    this.nextDecisionAt = this.scene.time.now + INTERACTION_DURATION_MS * 4;

    this.lastReactionIndex = pickNonRepeatingIndex(
      BUBBLE_DOG_REACTIONS.length,
      this.lastReactionIndex,
      Math.random(),
    );
    return BUBBLE_DOG_REACTIONS[this.lastReactionIndex] ?? BUBBLE_DOG_REACTIONS[0];
  }

  /** Restores a quest-authoritative position without replaying the one-shot run event. */
  public restoreHome(x: number, y: number): void {
    this.setPosition(x, y);
    this.resetPose();
    this.refreshBody();
    this.startIdleAnimation();
  }

  /** Moves 泡彈 once for the quest before companion positioning resumes. */
  public runTo(x: number, y: number): void {
    if (this.hasRun) return;
    this.hasRun = true;
    this.scene.tweens.killTweensOf(this);
    this.resetPose();
    this.faceTowards(x);
    this.activityLabel.setText('跑到一旁');
    this.nextDecisionAt = this.scene.time.now + RUN_DURATION_MS + QUEST_SETTLE_DELAY_MS;

    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: RUN_DURATION_MS,
      ease: 'Sine.out',
      onComplete: () => {
        this.refreshBody();
        this.startIdleAnimation('在一旁待機');
      },
    });
  }

  /** Moves toward the current side-rear anchor while keeping the hero unobstructed. */
  private followPlayer(targetDistance: number): void {
    this.resetPose();
    if (targetDistance <= TARGET_REACHED_DISTANCE) {
      this.startIdleAnimation('在你身後待機');
      this.nextDecisionAt = this.scene.time.now + FOLLOW_REFRESH_MS;
      return;
    }

    this.faceTowards(this.companionTarget.x);
    this.activityLabel.setText('跟在側後方');
    this.moveTo(this.companionTarget.x, this.companionTarget.y, FOLLOW_DURATION_MS);
    this.nextDecisionAt = this.scene.time.now + FOLLOW_REFRESH_MS;
  }

  /** Chooses one small visual activity around the safe side-rear companion area. */
  private performAutonomousActivity(
    player: Phaser.GameObjects.Components.Transform,
    context: BubbleDogActivityContext,
  ): void {
    const activity = Phaser.Utils.Array.GetRandom([...AUTONOMOUS_ACTIVITIES]);
    this.scene.tweens.killTweensOf(this);
    this.resetPose();
    this.activityLabel.setText(activity);

    if (activity === '坐下') {
      this.setScale(CHARACTER_VISUALS.BUBBLE_DOG.scale * SITTING_SCALE_FACTOR);
    }
    if (activity === '趴下') {
      this.setScale(CHARACTER_VISUALS.BUBBLE_DOG.scale * LYING_SCALE_FACTOR).setAngle(7);
    }
    if (activity === '看著你') this.faceTowards(player.x);
    if (activity === '慢慢散步') {
      const wanderTarget = getBubbleDogCompanionTarget(
        player,
        this.lastPlayerHeading,
        this.preferredSide,
        context.blockedPositions,
        context.worldBounds,
      );
      const targetX = wanderTarget.x + Phaser.Math.Between(-WANDER_DISTANCE, WANDER_DISTANCE);
      const targetY = wanderTarget.y + Phaser.Math.Between(-WANDER_DISTANCE, WANDER_DISTANCE);
      this.faceTowards(targetX);
      this.moveTo(targetX, targetY, WANDER_DURATION_MS);
    }

    if (activity !== '慢慢散步' && activity !== '坐下' && activity !== '趴下') {
      this.startIdleAnimation(activity);
    }

    this.scheduleNextDecision();
  }

  /** Tweens the static interaction token and refreshes its body on completion. */
  private moveTo(x: number, y: number, duration: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.resetPose();
        this.refreshBody();
        this.startIdleAnimation();
      },
    });
  }

  /** Uses official side art and flips only that orientation for left/right travel. */
  private faceTowards(targetX: number): void {
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_DOG.side);
    this.setFlipX(targetX > this.x);
  }

  /** Clears all temporary pose transforms while optionally preserving direction. */
  private resetPose(): void {
    this.scene.tweens.killTweensOf(this);
    this.setAngle(0).setFlipX(false);
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_DOG.front);
  }

  /** Uses player velocity as a stable facing memory so the dog does not swap sides every frame. */
  private updatePlayerHeading(player: Phaser.Physics.Arcade.Sprite): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.length() < MOVEMENT_THRESHOLD) return;
    this.lastPlayerHeading.copy(body.velocity).normalize();
  }

  /** Adds a subtle uniform idle pulse after every stop without distorting official artwork. */
  private startIdleAnimation(label = '發呆'): void {
    this.scene.tweens.killTweensOf(this);
    this.resetPoseWithoutKillingTweens();
    this.activityLabel.setText(label);
    this.scene.tweens.add({
      targets: this,
      scale: CHARACTER_VISUALS.BUBBLE_DOG.scale * IDLE_SCALE_FACTOR,
      duration: IDLE_PULSE_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** Restores the front-facing frame when an idle tween has already been stopped. */
  private resetPoseWithoutKillingTweens(): void {
    this.setAngle(0).setFlipX(false);
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_DOG.front);
  }

  /** Keeps both official orientations at one height with a feet-only static body. */
  private applyVisual(visual: CharacterTextureVisual): void {
    this.setTexture(visual.texture).setScale(CHARACTER_VISUALS.BUBBLE_DOG.scale);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(visual.body.width, visual.body.height);
    body.setOffset(visual.body.offsetX, visual.body.offsetY);
    this.refreshBody();
  }

  /** Schedules the next poll using scene time so restart leaves no callbacks behind. */
  private scheduleNextDecision(): void {
    this.nextDecisionAt =
      this.scene.time.now + Phaser.Math.Between(DECISION_MIN_DELAY_MS, DECISION_MAX_DELAY_MS);
  }
}
