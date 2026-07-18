import {
  normalizeStudioQuestState,
  type StudioQuestState,
} from '../quest/StudioQuestManager';
import { migrateSaveData, SAVE_VERSION, type GameSaveData } from './SaveDataMigration';

const SAVE_KEY = 'bobojoi-universe-save';

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
      return migrateSaveData(JSON.parse(rawData) as unknown, new Date().toISOString());
    } catch (error) {
      // Malformed or inaccessible storage behaves like an empty save.
      return undefined;
    }
  }
}

export type { GameSaveData } from './SaveDataMigration';
