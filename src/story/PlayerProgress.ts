/** Player attributes currently used by story decisions and their effects. */
export type PlayerStatId = 'technique' | 'popularity' | 'conviction' | 'energy';

/** Serializable player attributes. */
export interface PlayerStatsState {
  technique: number;
  popularity: number;
  conviction: number;
  energy: number;
}

/** Serializable relationships kept deliberately small for the first chapter. */
export interface RelationshipState {
  bubbleGirlTrust: number;
}

/** One atomic set of changes produced by a story choice. */
export interface PlayerProgressEffects {
  stats?: Partial<Record<PlayerStatId, number>>;
  bubbleGirlTrust?: number;
}

/** Central value bounds prevent scenes and story nodes from inventing limits. */
export const PLAYER_STAT_LIMITS: Record<PlayerStatId, Readonly<{ min: number; max: number }>> = {
  technique: { min: 0, max: 100 },
  popularity: { min: 0, max: 100 },
  conviction: { min: 0, max: 100 },
  energy: { min: 0, max: 100 },
};

/** Trust supports both positive and negative relationship development. */
export const BUBBLE_GIRL_TRUST_LIMITS = { min: -100, max: 100 } as const;

/** Creates the initial progression values for new and legacy saves. */
export function createDefaultPlayerStats(): PlayerStatsState {
  return { technique: 10, popularity: 0, conviction: 10, energy: 100 };
}

/** Creates the initial relationship values for new and legacy saves. */
export function createDefaultRelationships(): RelationshipState {
  return { bubbleGirlTrust: 0 };
}

/** Normalizes unknown persisted attributes into bounded finite values. */
export function normalizePlayerStats(value: unknown): PlayerStatsState {
  const fallback = createDefaultPlayerStats();
  const source = isRecord(value) ? value : {};
  return {
    technique: normalizeBoundedNumber(source.technique, fallback.technique, PLAYER_STAT_LIMITS.technique),
    popularity: normalizeBoundedNumber(
      source.popularity,
      fallback.popularity,
      PLAYER_STAT_LIMITS.popularity,
    ),
    conviction: normalizeBoundedNumber(
      source.conviction,
      fallback.conviction,
      PLAYER_STAT_LIMITS.conviction,
    ),
    energy: normalizeBoundedNumber(source.energy, fallback.energy, PLAYER_STAT_LIMITS.energy),
  };
}

/** Normalizes the supported relationship data without trusting the save shape. */
export function normalizeRelationships(value: unknown): RelationshipState {
  const source = isRecord(value) ? value : {};
  return {
    bubbleGirlTrust: normalizeBoundedNumber(
      source.bubbleGirlTrust,
      createDefaultRelationships().bubbleGirlTrust,
      BUBBLE_GIRL_TRUST_LIMITS,
    ),
  };
}

/** Owns every attribute and relationship mutation used by story logic. */
export class PlayerProgress {
  private stats: PlayerStatsState;
  private relationships: RelationshipState;

  public constructor(stats: unknown, relationships: unknown) {
    this.stats = normalizePlayerStats(stats);
    this.relationships = normalizeRelationships(relationships);
  }

  /** Applies all requested deltas through the same bounded mutation path. */
  public applyEffects(effects: PlayerProgressEffects): void {
    const nextStats = { ...this.stats };
    for (const stat of PLAYER_STAT_IDS) {
      const delta = effects.stats?.[stat];
      if (typeof delta !== 'number' || !Number.isFinite(delta)) continue;
      nextStats[stat] = clamp(nextStats[stat] + delta, PLAYER_STAT_LIMITS[stat]);
    }

    const trustDelta = effects.bubbleGirlTrust;
    const nextTrust =
      typeof trustDelta === 'number' && Number.isFinite(trustDelta)
        ? clamp(this.relationships.bubbleGirlTrust + trustDelta, BUBBLE_GIRL_TRUST_LIMITS)
        : this.relationships.bubbleGirlTrust;

    this.stats = nextStats;
    this.relationships = { bubbleGirlTrust: nextTrust };
  }

  /** Returns one attribute for pure choice-condition evaluation. */
  public getStat(stat: PlayerStatId): number {
    return this.stats[stat];
  }

  /** Returns current trust for conditional dialogue and choice rules. */
  public getBubbleGirlTrust(): number {
    return this.relationships.bubbleGirlTrust;
  }

  /** Returns detached serializable data so callers cannot bypass mutation rules. */
  public getSnapshot(): { playerStats: PlayerStatsState; relationships: RelationshipState } {
    return {
      playerStats: { ...this.stats },
      relationships: { ...this.relationships },
    };
  }
}

const PLAYER_STAT_IDS: PlayerStatId[] = ['technique', 'popularity', 'conviction', 'energy'];

/** Safely reads one persisted number and clamps it to its declared range. */
function normalizeBoundedNumber(
  value: unknown,
  fallback: number,
  limits: Readonly<{ min: number; max: number }>,
): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, limits) : fallback;
}

/** Shared inclusive clamp used by both loading and runtime effects. */
function clamp(value: number, limits: Readonly<{ min: number; max: number }>): number {
  return Math.min(limits.max, Math.max(limits.min, value));
}

/** Narrows persisted values without treating arrays as data records. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
