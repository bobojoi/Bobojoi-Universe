import Phaser from 'phaser';
import {
  MUSIC_FADE_DURATION_MS,
  MUSIC_TRACKS,
  type MusicTrackId,
} from './MusicCatalog';

type FadableSound = Phaser.Sound.BaseSound & {
  volume: number;
  setVolume(value: number): FadableSound;
};

/** Owns one global BGM voice and cross-fades it across Phaser scene boundaries. */
export class MusicDirector {
  private static requestedTrack?: MusicTrackId;
  private static currentTrack?: MusicTrackId;
  private static currentSound?: FadableSound;

  /** Requests one loop without restarting an already active copy of the same track. */
  public static play(scene: Phaser.Scene, trackId: MusicTrackId): void {
    this.requestedTrack = trackId;
    if (
      this.currentTrack === trackId &&
      this.currentSound?.isPlaying &&
      !this.currentSound.pendingRemove
    ) {
      return;
    }

    const startRequestedTrack = (): void => {
      if (this.requestedTrack !== trackId || !scene.scene.isActive()) return;
      this.startCrossFade(scene, trackId);
    };
    if (scene.sound.locked) {
      scene.sound.once(Phaser.Sound.Events.UNLOCKED, startRequestedTrack);
      return;
    }
    startRequestedTrack();
  }

  /** Removes every global music voice during game hot reload or explicit teardown. */
  public static stopAll(): void {
    this.requestedTrack = undefined;
    this.currentTrack = undefined;
    this.currentSound?.stop();
    this.currentSound?.destroy();
    this.currentSound = undefined;
  }

  private static startCrossFade(scene: Phaser.Scene, trackId: MusicTrackId): void {
    const definition = MUSIC_TRACKS[trackId];
    const outgoing = this.currentSound;
    const incoming = scene.sound.add(definition.key, {
      loop: true,
      volume: 0,
    }) as FadableSound;
    if (!incoming.play()) {
      incoming.destroy();
      return;
    }

    this.currentTrack = trackId;
    this.currentSound = incoming;
    scene.tweens.add({
      targets: incoming,
      volume: definition.volume,
      duration: MUSIC_FADE_DURATION_MS,
      ease: 'Sine.out',
    });

    if (!outgoing || outgoing.pendingRemove) return;
    scene.tweens.add({
      targets: outgoing,
      volume: 0,
      duration: MUSIC_FADE_DURATION_MS,
      ease: 'Sine.in',
      onComplete: () => {
        outgoing.stop();
        outgoing.destroy();
      },
    });
  }
}
