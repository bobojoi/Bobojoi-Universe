import {
  createDefaultStudioQuestState,
  normalizeStudioQuestState,
  type StudioQuestState,
} from '../quest/StudioQuestManager';

/** Versioned save shape supports migrations when the game grows. */
export interface GameSaveData {
  version: number;
  player: {
    x: number;
    y: number;
  };
  studioQuest: StudioQuestState;
  updatedAt: string;
}

const SAVE_KEY = 'bobojoi-universe-save';
const SAVE_VERSION = 2;

/** Wraps browser persistence so gameplay code never touches localStorage directly. */
export class SaveSystem {
  /** Persists a defensive, versioned snapshot. */
  public save(playerPosition: { x: number; y: number }, studioQuest: StudioQuestState): void {
    const data: GameSaveData = {
      version: SAVE_VERSION,
      player: { ...playerPosition },
      studioQuest: normalizeStudioQuestState(studioQuest),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Unable to save Bobojoi Universe progress.', error);
    }
  }

  /** Loads only compatible, structurally valid data. */
  public load(): GameSaveData | undefined {
    try {
      const rawData = localStorage.getItem(SAVE_KEY);
      if (!rawData) return undefined;

      const data = JSON.parse(rawData) as Record<string, unknown>;
      const player = this.readPlayerPosition(data.player);
      if (!player) {
        return undefined;
      }

      // TASK-001 saves migrate forward with a fresh tutorial quest.
      if (data.version === 1) {
        return {
          version: SAVE_VERSION,
          player,
          studioQuest: createDefaultStudioQuestState(),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
        };
      }

      if (data.version !== SAVE_VERSION) return undefined;

      return {
        version: SAVE_VERSION,
        player,
        studioQuest: normalizeStudioQuestState(data.studioQuest),
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Unable to load Bobojoi Universe progress.', error);
      return undefined;
    }
  }

  /** Validates coordinates separately so every migration shares the same guard. */
  private readPlayerPosition(value: unknown): GameSaveData['player'] | undefined {
    if (typeof value !== 'object' || value === null) return undefined;

    const player = value as Record<string, unknown>;
    if (typeof player.x !== 'number' || typeof player.y !== 'number') return undefined;
    return { x: player.x, y: player.y };
  }
}
