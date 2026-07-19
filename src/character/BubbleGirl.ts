import Phaser from 'phaser';
import { DEPTH, TEXTURE_KEYS } from '../constants/GameConstants';

const ACTIVITY_MIN_DELAY_MS = 3200;
const ACTIVITY_MAX_DELAY_MS = 6200;
const LABEL_OFFSET_Y = 54;

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
    super(scene, x, y, TEXTURE_KEYS.BUBBLE_GIRL);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.CHARACTER);
    this.activityLabel = scene.add
      .text(x, y + LABEL_OFFSET_Y, '正在看資料', {
        color: '#ffb2d5',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.CHARACTER + 1);
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

    if (activity === '看資料') this.setAngle(-3).setFlipX(false);
    if (activity === '寫筆記') this.setScale(1, 0.92).setAngle(3);
    if (activity === '喝咖啡') this.setTint(0xffe5b4).setAngle(-5);
    if (activity === '抬頭看看你') this.setFlipX(player.x < this.x).setScale(1.04);

    this.scheduleNextActivity();
  }

  /** Restores the neutral placeholder before applying the next readable pose. */
  private resetPose(): void {
    this.clearTint().setScale(1).setAngle(0).setFlipX(false);
  }

  /** Uses scene time rather than timers so shutdown and restart are naturally clean. */
  private scheduleNextActivity(): void {
    this.nextActivityAt =
      this.scene.time.now + Phaser.Math.Between(ACTIVITY_MIN_DELAY_MS, ACTIVITY_MAX_DELAY_MS);
  }
}
