import Phaser from 'phaser';
import {
  CHARACTER_VISUALS,
  getWorldDepth,
  type CharacterTextureVisual,
} from '../constants/CharacterVisualConstants';
import { BUBBLE_DOG_REACTIONS, pickNonRepeatingIndex } from '../studio/LivingStudioContent';

const RUN_DURATION_MS = 650;
const DECISION_MIN_DELAY_MS = 2600;
const DECISION_MAX_DELAY_MS = 5200;
const FOLLOW_REFRESH_MS = 850;
const FOLLOW_DISTANCE = 230;
const FOLLOW_STOP_DISTANCE = 82;
const WANDER_DISTANCE = 120;
const WANDER_DURATION_MS = 1700;
const FOLLOW_DURATION_MS = 900;
const QUEST_SETTLE_DELAY_MS = 500;
const LABEL_OFFSET_Y = 18;
const INTERACTION_DURATION_MS = 300;
const INTERACTION_SPIN_DEGREES = 18;
const INTERACTION_SCALE_FACTOR = 1.12;
const SITTING_SCALE_FACTOR = 0.96;
const LYING_SCALE_FACTOR = 0.9;

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
  private homeX: number;
  private homeY: number;
  private nextDecisionAt = 0;
  private lastReactionIndex = -1;
  private readonly activityLabel: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, CHARACTER_VISUALS.BUBBLE_DOG.front.texture);
    this.homeX = x;
    this.homeY = y;

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
    this.scheduleNextDecision();
  }

  /** Advances proximity following and autonomous activity without registering timers. */
  public updateActivity(player: Phaser.GameObjects.Components.Transform): void {
    this.activityLabel.setPosition(this.x, this.y + LABEL_OFFSET_Y);
    this.setDepth(getWorldDepth(this.y));
    this.activityLabel.setDepth(getWorldDepth(this.y) + 0.5);
    if (this.scene.time.now < this.nextDecisionAt) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (distance <= FOLLOW_DISTANCE) {
      this.followPlayer(player, distance);
      return;
    }
    this.performAutonomousActivity(player);
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

  /** Restores a quest-authoritative home without replaying the one-shot run event. */
  public restoreHome(x: number, y: number): void {
    this.homeX = x;
    this.homeY = y;
    this.setPosition(x, y);
    this.resetPose();
    this.refreshBody();
  }

  /** Moves 泡彈 once for the quest and makes the destination his new roaming home. */
  public runTo(x: number, y: number): void {
    if (this.hasRun) return;
    this.hasRun = true;
    this.homeX = x;
    this.homeY = y;
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
      onComplete: () => this.refreshBody(),
    });
  }

  /** Approaches the player but stops short enough to keep both tokens readable. */
  private followPlayer(
    player: Phaser.GameObjects.Components.Transform,
    distance: number,
  ): void {
    this.resetPose();
    this.faceTowards(player.x);
    if (distance <= FOLLOW_STOP_DISTANCE) {
      this.activityLabel.setText('看著你');
      this.nextDecisionAt = this.scene.time.now + FOLLOW_REFRESH_MS;
      return;
    }

    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
    const travel = Math.max(0, distance - FOLLOW_STOP_DISTANCE);
    this.activityLabel.setText('跑向你');
    this.moveTo(
      this.x + direction.x * travel,
      this.y + direction.y * travel,
      FOLLOW_DURATION_MS,
    );
    this.nextDecisionAt = this.scene.time.now + FOLLOW_REFRESH_MS;
  }

  /** Chooses one small visual activity around the current quest-compatible home. */
  private performAutonomousActivity(player: Phaser.GameObjects.Components.Transform): void {
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
      const targetX = this.homeX + Phaser.Math.Between(-WANDER_DISTANCE, WANDER_DISTANCE);
      const targetY = this.homeY + Phaser.Math.Between(-WANDER_DISTANCE, WANDER_DISTANCE);
      this.faceTowards(targetX);
      this.moveTo(targetX, targetY, WANDER_DURATION_MS);
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
      onComplete: () => this.refreshBody(),
    });
  }

  /** Uses official side art and flips only that orientation for left/right travel. */
  private faceTowards(targetX: number): void {
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_DOG.side);
    this.setFlipX(targetX > this.x);
  }

  /** Clears all temporary pose transforms while optionally preserving direction. */
  private resetPose(): void {
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
