import type { StudioQuestState } from '../quest/StudioQuestManager';
import type { ChapterOneOutcome, ChapterOneState } from '../story/ChapterOneStory';
import type { ChapterTwoOutcome, ChapterTwoState } from '../story/ChapterTwoStory';
import type { MainStoryState, MainStoryStage } from '../story/MainStoryManager';
import type { PlayerProgressEffects } from '../story/PlayerProgress';
import type { ChapterTransitionId } from '../tutorial/TutorialProgress';

/** Player-facing progress data never exposes internal stage or node identifiers. */
export interface ProgressPresentation {
  chapterLabel: string;
  objective: string;
  recentOutcome?: string;
  nextJourneyUnavailable: boolean;
}

/** Text used by one chapter transition overlay. */
export interface ChapterTransitionCopy {
  eyebrow: string;
  title: string;
  body?: string;
}

const CHAPTER_LABELS: Record<'prologue' | 'chapter-one' | 'chapter-two', string> = {
  prologue: '序章',
  'chapter-one': '第一章：第一次登台',
  'chapter-two': '第二章：成功的代價',
};

const CHAPTER_ONE_OUTCOMES: Record<ChapterOneOutcome, string> = {
  'show-stable': '穩定完成第一次演出',
  'show-memorable': '冒險創造了令人難忘的舞台',
  'show-exhausting': '演出成功，但你付出了過多體力',
  'show-mistake': '第一次演出留下了需要面對的失誤',
  'training-solid': '先打穩基礎，等待下一次機會',
  'training-original': '發展出屬於泡泡家族的原創方向',
  'preview-successful': '用試演證明了自己的準備',
  'held-principle': '守住了合作條件與表演原則',
  'small-show-safe': '以安全的小型演出踏出第一步',
  'small-show-interactive-success': '觀眾互動成為第一次演出的亮點',
  'small-show-story-success': '故事形式讓觀眾記住泡泡家族',
  'small-show-compromised': '完成演出，但空間限制犧牲了部分效果',
  'legacy-complete': '完成第一次舞台選擇',
};

const CHAPTER_TWO_OUTCOMES: Record<ChapterTwoOutcome, string> = {
  commercialBreakthrough: '成功取得大型合作，泡泡家族獲得更多關注',
  commercialCompromise: '以折衷版本完成合作，保留了部分核心方向',
  creativeIntegrity: '選擇較小舞台，完整保留自己的創作方向',
  walkedAway: '拒絕不適合的合作，守住泡泡家族的原則',
  teamStrained: '成功取得合作，但團隊關係開始緊張',
  agencyRespectEarned: '堅定而務實的提案贏得活動公司的尊重',
};

const TRANSITION_COPY: Record<ChapterTransitionId, ChapterTransitionCopy> = {
  'prologue-complete': {
    eyebrow: 'STORY MILESTONE',
    title: '序章完成',
    body: '一個意外找到的戒指，成為夢想開始轉動的第一個訊號。',
  },
  'chapter-one-start': {
    eyebrow: 'CHAPTER 01',
    title: '第一章：第一次登台',
  },
  'chapter-one-complete': {
    eyebrow: 'CHAPTER COMPLETE',
    title: '第一章完成',
    body: '你的第一個選擇，已經成為泡泡家族歷史的一部分。',
  },
  'chapter-two-start': {
    eyebrow: 'CHAPTER 02',
    title: '第二章：成功的代價',
  },
  'chapter-two-complete': {
    eyebrow: 'CHAPTER COMPLETE',
    title: '第二章完成',
    body: '被更多人看見之後，你開始明白，每一個機會都有代價。',
  },
};

/** Derives the current chapter and objective solely from durable quest/story state. */
export function getProgressPresentation(
  quest: StudioQuestState,
  story: MainStoryState,
): ProgressPresentation {
  if (quest.stage !== 'completed') {
    return {
      chapterLabel: CHAPTER_LABELS.prologue,
      objective: getPrologueObjective(quest),
      nextJourneyUnavailable: false,
    };
  }

  if (isChapterTwoStage(story.mainStoryStage)) {
    const complete = story.mainStoryStage === 'chapter-two-complete';
    return {
      chapterLabel: CHAPTER_LABELS['chapter-two'],
      objective: complete ? '下一段旅程尚未開放' : getChapterTwoObjective(story),
      recentOutcome: story.chapterTwoOutcome
        ? getChapterTwoOutcomeSummary(story.chapterTwoOutcome)
        : getOptionalChapterOneOutcome(story.chapterOneOutcome),
      nextJourneyUnavailable: complete,
    };
  }

  return {
    chapterLabel: CHAPTER_LABELS['chapter-one'],
    objective: story.mainStoryStage === 'chapter-one-complete'
      ? '第一章完成'
      : getChapterOneObjective(story),
    recentOutcome: getOptionalChapterOneOutcome(story.chapterOneOutcome),
    nextJourneyUnavailable: false,
  };
}

/** Returns a compact title-menu summary without raw implementation identifiers. */
export function getContinueSummary(
  quest: StudioQuestState,
  story: MainStoryState,
): string[] {
  const view = getProgressPresentation(quest, story);
  const lines = [view.chapterLabel];
  if (story.mainStoryStage === 'chapter-two-complete' && view.recentOutcome) {
    lines.push(`結局：${view.recentOutcome}`);
  } else {
    lines.push(`目前目標：${view.objective}`);
    if (view.recentOutcome) {
      const outcomeLabel = isChapterTwoStage(story.mainStoryStage) ? '最近結果' : '第一章結果';
      lines.push(`${outcomeLabel}：${view.recentOutcome}`);
    }
  }
  if (view.nextJourneyUnavailable) lines.push('下一段旅程尚未開放');
  return lines;
}

/** Converts a first-chapter outcome into concise Traditional Chinese. */
export function getChapterOneOutcomeSummary(outcome: ChapterOneOutcome): string {
  return CHAPTER_ONE_OUTCOMES[outcome];
}

/** Converts a second-chapter outcome into concise Traditional Chinese. */
export function getChapterTwoOutcomeSummary(outcome: ChapterTwoOutcome): string {
  return CHAPTER_TWO_OUTCOMES[outcome];
}

/** Formats only confirmed non-zero deltas supplied by the story resolver. */
export function formatEffectSummary(effects: PlayerProgressEffects | undefined): string[] {
  if (!effects) return [];
  const entries: Array<[string, number | undefined]> = [
    ['技藝', effects.stats?.technique],
    ['人氣', effects.stats?.popularity],
    ['信念', effects.stats?.conviction],
    ['體力', effects.stats?.energy],
    ['泡妞信任', effects.bubbleGirlTrust],
  ];
  return entries
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([label, value]) => `${label} ${value > 0 ? '+' : ''}${value}`);
}

/** Keeps chapter-transition writing centralized and testable. */
export function getChapterTransitionCopy(id: ChapterTransitionId): ChapterTransitionCopy {
  return TRANSITION_COPY[id];
}

/** Maps the tutorial quest into concrete next actions. */
function getPrologueObjective(quest: StudioQuestState): string {
  switch (quest.stage) {
    case 'not-started':
      return '和泡妞談談';
    case 'in-progress': {
      const count = Object.values(quest.investigated).filter(Boolean).length;
      return count === 0 ? '查看工作室裡的異常' : `繼續調查工作室（${count}/3）`;
    }
    case 'ring-discovered':
      return '撿起休息墊旁的星光泡泡環';
    case 'ring-collected':
      return '把星光泡泡環交給泡妞';
    case 'completed':
      return '序章完成';
  }
}

/** Converts broad stage and detailed event node into a readable first-chapter objective. */
function getChapterOneObjective(story: MainStoryState & ChapterOneState): string {
  if (story.mainStoryStage === 'first-offer') return '決定如何面對第一次演出機會';
  if (story.chapterOneNode === 'complete') return '第一章完成';
  if (story.chapterOneNode === 'a-mistake-response') return '面對第一次演出的結果';
  if (story.chapterOneNode === 'a-extra-time' || story.chapterOneNode === 'b-preview' ||
      story.chapterOneNode === 'c-space') {
    return '完成你的第一次舞台選擇';
  }
  return '為演出做好準備';
}

/** Converts second-chapter event nodes into the commercial-conflict objectives. */
function getChapterTwoObjective(story: MainStoryState & ChapterTwoState): string {
  switch (story.chapterTwoNode) {
    case 'not-started':
    case 'intro-review-history':
      return '回顧第一次演出的結果';
    case 'agency-first-contact':
    case 'agency-requirements':
      return '了解活動公司的合作要求';
    case 'team-discussion':
      return '和泡妞討論表演方向';
    case 'proposal-decision':
      return '決定是否接受商業版本';
    case 'client-response':
      return '回應活動公司的最後要求';
    case 'chapter-two-ending':
      return '下一段旅程尚未開放';
  }
}

/** Narrows story stages to the player-facing second chapter. */
function isChapterTwoStage(stage: MainStoryStage): boolean {
  return stage === 'chapter-two-intro' || stage === 'agency-offer' ||
    stage === 'proposal-discussion' || stage === 'creative-choice' ||
    stage === 'chapter-two-complete';
}

/** Avoids rendering an empty result line before a chapter outcome exists. */
function getOptionalChapterOneOutcome(outcome: ChapterOneOutcome | undefined): string | undefined {
  return outcome ? getChapterOneOutcomeSummary(outcome) : undefined;
}
