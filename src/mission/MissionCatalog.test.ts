import { describe, expect, it } from 'vitest';
import { createDefaultStudioQuestState } from '../quest/StudioQuestManager';
import { createDefaultMainStoryState } from '../story/MainStoryManager';
import { getCurrentMissionCard, MISSION_CATEGORY_PRESENTATION } from './MissionCatalog';

describe('MissionCatalog', () => {
  it('uses a distinct icon for every supported category', () => {
    const icons = Object.values(MISSION_CATEGORY_PRESENTATION).map(({ icon }) => icon);
    expect(new Set(icons).size).toBe(5);
  });

  it('shows the tutorial card until the studio quest is complete', () => {
    const card = getCurrentMissionCard(
      createDefaultStudioQuestState(),
      createDefaultMainStoryState(false),
    );
    expect(card).toMatchObject({ id: 'starlight-ring', category: 'tutorial' });
  });

  it('maps completed progression to performance, commercial, and special cards', () => {
    const quest = {
      ...createDefaultStudioQuestState(),
      stage: 'completed' as const,
    };
    const performance = createDefaultMainStoryState(true);
    expect(getCurrentMissionCard(quest, performance).category).toBe('performance');

    const commercial = { ...performance, mainStoryStage: 'chapter-two-intro' as const };
    expect(getCurrentMissionCard(quest, commercial).category).toBe('commercial');

    const special = { ...performance, mainStoryStage: 'chapter-two-complete' as const };
    expect(getCurrentMissionCard(quest, special).category).toBe('special');
  });
});
