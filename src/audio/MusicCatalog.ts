import { AUDIO_KEYS } from '../constants/GameConstants';

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

export interface MusicTrackDefinition {
  key: string;
  path: string;
  title: string;
  volume: number;
}

/** User-owned Bobojoi music is normalized behind stable runtime identifiers. */
export const MUSIC_TRACKS = {
  title: {
    key: AUDIO_KEYS.TITLE,
    path: '/assets/audio/bgm/title-floating-ring.mp3',
    title: '序（漂浮環）',
    volume: 0.34,
  },
  studio: {
    key: AUDIO_KEYS.STUDIO,
    path: '/assets/audio/bgm/studio-bubble-realm.mp3',
    title: '泡泡幻境',
    volume: 0.24,
  },
  mission: {
    key: AUDIO_KEYS.MISSION,
    path: '/assets/audio/bgm/mission-starlight.mp3',
    title: '星光滿天 1',
    volume: 0.3,
  },
  performance: {
    key: AUDIO_KEYS.PERFORMANCE,
    path: '/assets/audio/bgm/performance-bubble-show.mp3',
    title: '新舞動手泡',
    volume: 0.3,
  },
} as const satisfies Record<string, MusicTrackDefinition>;

// Completes before the shortest camera handoff so retired scene tweens cannot strand a voice.
export const MUSIC_FADE_DURATION_MS = 480;
