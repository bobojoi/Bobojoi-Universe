import { describe, expect, it } from 'vitest';
import { createDefaultStudioQuestState } from '../quest/StudioQuestManager';
import { migrateSaveData, readPlayerPosition, SAVE_VERSION } from './SaveDataMigration';

const TEST_TIMESTAMP = '2026-07-18T00:00:00.000Z';
const VALID_PLAYER = { x: 620, y: 760 };

/** Builds the smallest recognized save fixture for focused migration assertions. */
function createSave(version: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { version, player: VALID_PLAYER, updatedAt: TEST_TIMESTAMP, ...overrides };
}

describe('readPlayerPosition', () => {
  it.each([
    { x: Number.NaN, y: 1 },
    { x: Number.POSITIVE_INFINITY, y: 1 },
    { x: Number.NEGATIVE_INFINITY, y: 1 },
    { x: 1, y: Number.NaN },
    { x: 1, y: Number.POSITIVE_INFINITY },
    { x: 1, y: Number.NEGATIVE_INFINITY },
    { x: '1', y: 1 },
    { x: 1, y: '1' },
    { x: null, y: 1 },
    { x: 1, y: null },
    { x: 1 },
    { y: 1 },
    null,
    'invalid',
  ])('rejects an invalid coordinate fixture', (value) => {
    expect(readPlayerPosition(value)).toBeUndefined();
  });

  it('accepts finite coordinates including zero and negatives', () => {
    expect(readPlayerPosition({ x: 0, y: -42.5 })).toEqual({ x: 0, y: -42.5 });
  });
});

describe('migrateSaveData', () => {
  it('migrates v1 with a default quest and preserves a valid player', () => {
    expect(migrateSaveData(createSave(1), TEST_TIMESTAMP)).toEqual({
      version: SAVE_VERSION,
      player: VALID_PLAYER,
      studioQuest: createDefaultStudioQuestState(),
      updatedAt: TEST_TIMESTAMP,
    });
  });

  it('keeps quest progress but drops an invalid player position', () => {
    const migrated = migrateSaveData(
      createSave(3, {
        player: { x: Number.POSITIVE_INFINITY, y: 760 },
        studioQuest: { stage: 'ring-discovered', investigated: { 'dog-mat': true } },
      }),
      TEST_TIMESTAMP,
    );

    expect(migrated?.player).toBeUndefined();
    expect(migrated?.studioQuest.stage).toBe('ring-discovered');
  });

  it.each([
    [{ stage: 'not-started', completed: true, ringCollected: false }, 'completed'],
    [{ stage: 'ring-discovered', completed: false, ringCollected: true }, 'ring-collected'],
    [{ stage: 'ring-discovered', completed: false, ringCollected: false }, 'ring-discovered'],
    [{ stage: 'in-progress', completed: false, ringCollected: false }, 'in-progress'],
    [{ stage: 'not-started', completed: false, ringCollected: false }, 'not-started'],
  ] as const)('migrates v2 precedence to %s', (legacyQuest, expectedStage) => {
    const migrated = migrateSaveData(
      createSave(2, { studioQuest: legacyQuest }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.studioQuest.stage).toBe(expectedStage);
  });

  it('normalizes a partial v3 quest without legacy flags', () => {
    const migrated = migrateSaveData(
      createSave(3, { studioQuest: { stage: 'in-progress', investigated: null } }),
      TEST_TIMESTAMP,
    );
    expect(migrated?.studioQuest).toEqual({
      stage: 'in-progress',
      investigated: { 'prop-box': false, 'bubble-table': false, 'dog-mat': false },
    });
  });

  it.each([undefined, null, {}, [], createSave(99)])('rejects an unknown save shape', (value) => {
    expect(migrateSaveData(value, TEST_TIMESTAMP)).toBeUndefined();
  });
});
