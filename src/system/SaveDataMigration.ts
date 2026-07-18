import {
  createDefaultStudioQuestState,
  migrateLegacyStudioQuestState,
  normalizeStudioQuestState,
  type StudioQuestState,
} from '../quest/StudioQuestManager';

/** Current serialized schema version. */
export const SAVE_VERSION = 3;

/** A validated world position; non-finite coordinates never satisfy this shape. */
export interface PlayerSavePosition {
  x: number;
  y: number;
}

/** Loaded data may omit an invalid player position so the scene uses its defaults. */
export interface GameSaveData {
  version: typeof SAVE_VERSION;
  player?: PlayerSavePosition;
  studioQuest: StudioQuestState;
  updatedAt: string;
}

/** Migrates recognized save versions while rejecting unknown root structures. */
export function migrateSaveData(value: unknown, fallbackTimestamp: string): GameSaveData | undefined {
  if (!isRecord(value)) return undefined;

  const common = {
    version: SAVE_VERSION,
    player: readPlayerPosition(value.player),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : fallbackTimestamp,
  } as const;

  if (value.version === 1) {
    return { ...common, studioQuest: createDefaultStudioQuestState() };
  }

  if (value.version === 2) {
    return { ...common, studioQuest: migrateLegacyStudioQuestState(value.studioQuest) };
  }

  if (value.version === SAVE_VERSION) {
    return { ...common, studioQuest: normalizeStudioQuestState(value.studioQuest) };
  }

  return undefined;
}

/** Accepts coordinates only when both values are finite JavaScript numbers. */
export function readPlayerPosition(value: unknown): PlayerSavePosition | undefined {
  if (!isRecord(value)) return undefined;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return undefined;
  return { x: value.x, y: value.y };
}

/** Narrows persisted objects without trusting JSON or test fixtures. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Number.isFinite rejects NaN and both infinities after type narrowing. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
