import {
  normalizeStudioQuestState,
  type StudioQuestState,
} from '../quest/StudioQuestManager';
import { normalizeMainStoryState, type MainStoryState } from '../story/MainStoryManager';
import {
  normalizeTutorialProgress,
  type TutorialProgressState,
} from '../tutorial/TutorialProgress';
import { migrateSaveData, SAVE_VERSION, type GameSaveData } from './SaveDataMigration';

const SAVE_KEY = 'bobojoi-universe-save';

/** Minimal storage contract keeps persistence repeatably testable outside a browser. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Wraps browser persistence so gameplay code never touches localStorage directly. */
export class SaveSystem {
  public constructor(private readonly storage: SaveStorage = localStorage) {}

  /** Persists a defensive, versioned snapshot. */
  public save(
    playerPosition: { x: number; y: number },
    studioQuest: StudioQuestState,
    mainStory: MainStoryState,
    tutorialProgress: TutorialProgressState,
  ): boolean {
    const normalizedQuest = normalizeStudioQuestState(studioQuest);
    const data: GameSaveData = {
      version: SAVE_VERSION,
      player: { ...playerPosition },
      studioQuest: normalizedQuest,
      ...normalizeMainStoryState(mainStory, normalizedQuest.stage === 'completed'),
      tutorialProgress: normalizeTutorialProgress(tutorialProgress),
      updatedAt: new Date().toISOString(),
    };

    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Unable to save Bobojoi Universe progress.', error);
      return false;
    }
  }

  /** Loads only compatible, structurally valid data. */
  public load(): GameSaveData | undefined {
    try {
      const rawData = this.storage.getItem(SAVE_KEY);
      if (!rawData) return undefined;
      return migrateSaveData(JSON.parse(rawData) as unknown, new Date().toISOString());
    } catch (error) {
      // Malformed or inaccessible storage behaves like an empty save.
      return undefined;
    }
  }

  /** Valid saves alone enable continue; malformed JSON behaves like an empty slot. */
  public hasSave(): boolean {
    return this.load() !== undefined;
  }

  /** Clears the one save slot and reports whether storage confirmed the operation. */
  public clear(): boolean {
    try {
      this.storage.removeItem(SAVE_KEY);
      return this.storage.getItem(SAVE_KEY) === null;
    } catch (error) {
      console.error('Unable to clear Bobojoi Universe progress.', error);
      return false;
    }
  }
}

export type { GameSaveData } from './SaveDataMigration';
