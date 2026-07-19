import Phaser from 'phaser';
import {
  CHARACTER_VISUALS,
  getWorldDepth,
  type CharacterTextureVisual,
} from '../constants/CharacterVisualConstants';

const ACTIVITY_MIN_DELAY_MS = 3200;
const ACTIVITY_MAX_DELAY_MS = 6200;
const LABEL_OFFSET_Y = 18;
const SIDE_FACING_THRESHOLD = 60;

type BubbleGirlActivity = '看資料' | '寫筆記' | '喝咖啡' | '抬頭看看你';

const IDLE_ACTIVITIES: readonly BubbleGirlActivity[] = [
  '看資料',
  '寫筆記',
  '喝咖啡',
  '抬頭看看你',
];

/** Represents 泡妞 and owns her small, non-persistent workday idle loop. */
export class BubbleGirl extends Phaser.Physics.Arcade.Sprite {
  private readonly activityLabel: Phaser.GameObjects.Text;
  private nextActivityAt = 0;
  private previousActivity?: BubbleGirlActivity;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, CHARACTER_VISUALS.BUBBLE_GIRL.front.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(
      CHARACTER_VISUALS.BUBBLE_GIRL.originX,
      CHARACTER_VISUALS.BUBBLE_GIRL.originY,
    );
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_GIRL.front);
    this.setDepth(getWorldDepth(y));
    this.activityLabel = scene.add
      .text(x, y + LABEL_OFFSET_Y, '正在看資料', {
        color: '#ffb2d5',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(getWorldDepth(y) + 0.5);
    this.scheduleNextActivity();
  }

  /** Polls one quiet work activity at a time without scene-persistent event listeners. */
  public updateActivity(player: Phaser.GameObjects.Components.Transform): void {
    if (this.scene.time.now < this.nextActivityAt) return;

    const available = IDLE_ACTIVITIES.filter((activity) => activity !== this.previousActivity);
    const activity = Phaser.Utils.Array.GetRandom([...available]);
    this.previousActivity = activity;
    this.resetPose();
    this.activityLabel.setText(`正在${activity}`);

    if (activity === '看資料') this.faceSide(this.x - 1).setAngle(-1.5);
    if (activity === '寫筆記') this.faceSide(this.x + 1).setAngle(1.5);
    if (activity === '喝咖啡') this.applyVisual(CHARACTER_VISUALS.BUBBLE_GIRL.front);
    if (activity === '抬頭看看你') {
      if (Math.abs(player.x - this.x) >= SIDE_FACING_THRESHOLD) this.faceSide(player.x);
      else this.applyVisual(CHARACTER_VISUALS.BUBBLE_GIRL.front);
    }

    this.scheduleNextActivity();
  }

  /** Restores the neutral front art before applying the next readable pose. */
  private resetPose(): void {
    this.clearTint().setAngle(0).setFlipX(false);
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_GIRL.front);
  }

  /** Uses official side art and flips only that orientation toward the target. */
  private faceSide(targetX: number): this {
    this.applyVisual(CHARACTER_VISUALS.BUBBLE_GIRL.side);
    this.setFlipX(targetX > this.x);
    return this;
  }

  /** Keeps both orientations at one height and their static bodies around the feet. */
  private applyVisual(visual: CharacterTextureVisual): void {
    this.setTexture(visual.texture).setScale(CHARACTER_VISUALS.BUBBLE_GIRL.scale);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(visual.body.width, visual.body.height);
    body.setOffset(visual.body.offsetX, visual.body.offsetY);
    this.refreshBody();
  }

  /** Uses scene time rather than timers so shutdown and restart are naturally clean. */
  private scheduleNextActivity(): void {
    this.nextActivityAt =
      this.scene.time.now + Phaser.Math.Between(ACTIVITY_MIN_DELAY_MS, ACTIVITY_MAX_DELAY_MS);
  }
}
