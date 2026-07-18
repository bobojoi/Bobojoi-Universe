import { describe, expect, it } from 'vitest';
import { createDefaultStudioQuestState, type StudioQuestState } from '../quest/StudioQuestManager';
import { createDefaultMainStoryState, type MainStoryState } from '../story/MainStoryManager';
import {
  formatEffectSummary,
  getChapterOneOutcomeSummary,
  getChapterTwoOutcomeSummary,
  getContinueSummary,
  getProgressPresentation,
} from './ProgressPresentation';

function createCompletedQuest(stage: StudioQuestState['stage'] = 'completed'): StudioQuestState {
  return { ...createDefaultStudioQuestState(), stage };
}

describe('ProgressPresentation objectives', () => {
  it.each([
    ['not-started', '和泡妞談談'],
    ['ring-discovered', '撿起休息墊旁的星光泡泡環'],
    ['ring-collected', '把星光泡泡環交給泡妞'],
  ] as const)('resolves prologue %s', (stage, objective) => {
    const view = getProgressPresentation(createCompletedQuest(stage), createDefaultMainStoryState(false));
    expect(view).toMatchObject({ chapterLabel: '序章', objective });
  });

  it.each([
    ['first-offer', 'not-started', '決定如何面對第一次演出機會'],
    ['preparing-show', 'a-preparation', '為演出做好準備'],
    ['preparing-show', 'a-extra-time', '完成你的第一次舞台選擇'],
  ] as const)('resolves first chapter %s / %s', (stage, node, objective) => {
    const story = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: stage,
      chapterOneNode: node,
    } as MainStoryState;
    expect(getProgressPresentation(createCompletedQuest(), story)).toMatchObject({
      chapterLabel: '第一章：第一次登台',
      objective,
    });
  });

  it.each([
    ['intro-review-history', '回顧第一次演出的結果'],
    ['agency-requirements', '了解活動公司的合作要求'],
    ['team-discussion', '和泡妞討論表演方向'],
    ['proposal-decision', '決定是否接受商業版本'],
    ['client-response', '回應活動公司的最後要求'],
  ] as const)('resolves second chapter node %s', (node, objective) => {
    const story = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: 'chapter-two-intro',
      chapterOneNode: 'complete',
      chapterTwoNode: node,
    } as MainStoryState;
    expect(getProgressPresentation(createCompletedQuest(), story)).toMatchObject({
      chapterLabel: '第二章：成功的代價',
      objective,
    });
  });

  it('shows the unavailable next journey after chapter two completion', () => {
    const story = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: 'chapter-two-complete',
      chapterOneNode: 'complete',
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'teamStrained',
    } as MainStoryState;
    expect(getProgressPresentation(createCompletedQuest(), story)).toMatchObject({
      objective: '下一段旅程尚未開放',
      nextJourneyUnavailable: true,
    });
  });
});

describe('ProgressPresentation summaries', () => {
  it('translates representative first and second chapter outcomes', () => {
    expect(getChapterOneOutcomeSummary('training-original')).toContain('原創方向');
    expect(getChapterTwoOutcomeSummary('teamStrained')).toContain('團隊關係開始緊張');
  });

  it('never exposes internal node IDs in a continue summary', () => {
    const story = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: 'creative-choice',
      chapterOneNode: 'complete',
      chapterOneOutcome: 'training-original',
      chapterTwoNode: 'client-response',
    } as MainStoryState;
    const text = getContinueSummary(createCompletedQuest(), story).join(' ');
    expect(text).toContain('回應活動公司的最後要求');
    expect(text).not.toContain('client-response');
    expect(text).not.toContain('creative-choice');
  });

  it('shows a completed ending and unavailable continuation', () => {
    const story = {
      ...createDefaultMainStoryState(true),
      mainStoryStage: 'chapter-two-complete',
      chapterOneNode: 'complete',
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: 'commercialBreakthrough',
    } as MainStoryState;
    expect(getContinueSummary(createCompletedQuest(), story)).toEqual([
      '第二章：成功的代價',
      '結局：成功取得大型合作，泡泡家族獲得更多關注',
      '下一段旅程尚未開放',
    ]);
  });

  it('formats only confirmed non-zero effects with explicit positive signs', () => {
    expect(formatEffectSummary({
      stats: { technique: 0, popularity: 6, conviction: -2, energy: -3 },
      bubbleGirlTrust: -2,
    })).toEqual(['人氣 +6', '信念 -2', '體力 -3', '泡妞信任 -2']);
  });

  it('does not mutate or apply effects while formatting', () => {
    const effects = { stats: { technique: 5 } } as const;
    expect(formatEffectSummary(effects)).toEqual(['技藝 +5']);
    expect(effects.stats.technique).toBe(5);
  });
});
