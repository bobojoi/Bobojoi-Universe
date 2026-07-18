/** Versioned save shape supports migrations when the game grows. */
export interface GameSaveData {
  version: number;
  player: {
    x: number;
    y: number;
  };
  updatedAt: string;
}

const SAVE_KEY = 'bobojoi-universe-save';
const SAVE_VERSION = 1;

/** Wraps browser persistence so gameplay code never touches localStorage directly. */
export class SaveSystem {
  /** Persists a defensive, versioned snapshot. */
  public save(playerPosition: { x: number; y: number }): void {
    const data: GameSaveData = {
      version: SAVE_VERSION,
      player: { ...playerPosition },
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

      const data = JSON.parse(rawData) as Partial<GameSaveData>;
      if (
        data.version !== SAVE_VERSION ||
        typeof data.player?.x !== 'number' ||
        typeof data.player.y !== 'number'
      ) {
        return undefined;
      }

      return data as GameSaveData;
    } catch (error) {
      console.warn('Unable to load Bobojoi Universe progress.', error);
      return undefined;
    }
  }
}
