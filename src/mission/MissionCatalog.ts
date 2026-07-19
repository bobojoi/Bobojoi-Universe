import type { StudioQuestState } from '../quest/StudioQuestManager';
import type { MainStoryState, MainStoryStage } from '../story/MainStoryManager';

export type MissionCategory =
  | 'performance'
  | 'tutorial'
  | 'research'
  | 'commercial'
  | 'special';

export interface MissionCategoryPresentation {
  label: string;
  icon: string;
  color: number;
}

export interface MissionCardView {
  id: string;
  category: MissionCategory;
  title: string;
  location: string;
  description: string;
  estimatedTime: string;
  reward: string;
  actionHint: string;
}

/** Category marks use a different production symbol and accent without external icon assets. */
export const MISSION_CATEGORY_PRESENTATION: Record<
  MissionCategory,
  MissionCategoryPresentation
> = {
  performance: { label: '表演', icon: '★', color: 0xff78b7 },
  tutorial: { label: '教學', icon: '◆', color: 0x78f0cf },
  research: { label: '研究', icon: '⌕', color: 0x8db7ff },
  commercial: { label: '商業合作', icon: '▦', color: 0xffd66b },
  special: { label: '特殊事件', icon: '✦', color: 0xc99cff },
};

const TUTORIAL_MISSION: MissionCardView = {
  id: 'starlight-ring',
  category: 'tutorial',
  title: '尋找星光泡泡環',
  location: '泡泡工作室',
  description: '和泡妞確認表演道具，調查工作室裡的三處線索，找回失蹤的星光泡泡環。',
  estimatedTime: '約 5 分鐘',
  reward: '開啟第一個演出邀請',
  actionHint: '回到工作室後，先和泡妞談談。',
};

const PERFORMANCE_MISSION: MissionCardView = {
  id: 'first-offer',
  category: 'performance',
  title: '第一個演出邀請',
  location: '泡泡工作室／首演場地',
  description: '第一個正式機會已經到來。和泡妞討論準備方式，讓選擇帶領泡泡家族踏上舞台。',
  estimatedTime: '約 8 分鐘',
  reward: '能力成長、泡妞信任與路線結果',
  actionHint: '和泡妞交談，繼續目前的演出安排。',
};

const COMMERCIAL_MISSION: MissionCardView = {
  id: 'commercial-conflict',
  category: 'commercial',
  title: '成功的代價',
  location: '泡泡工作室／合作會議',
  description: '商業合作帶來更大的舞台，也帶來創作條件。和泡妞一起確認什麼值得堅持。',
  estimatedTime: '約 10 分鐘',
  reward: '第二章結果、能力與關係變化',
  actionHint: '和泡妞交談，處理眼前的合作條件。',
};

const SPECIAL_MISSION: MissionCardView = {
  id: 'next-journey',
  category: 'special',
  title: '下一段旅程',
  location: '泡泡工作室',
  description: '已完成目前 Demo 的主線內容。整理工作室，看看一路留下的照片與紀錄。',
  estimatedTime: '自由探索',
  reward: '回顧第一、二章的選擇',
  actionHint: '目前主線已完成，可以自由探索工作室。',
};

const CHAPTER_TWO_STAGES: readonly MainStoryStage[] = [
  'chapter-one-complete',
  'chapter-two-intro',
  'agency-offer',
  'proposal-discussion',
  'creative-choice',
];

/** Derives one useful mission card from existing quest and story truth without new save state. */
export function getCurrentMissionCard(
  quest: StudioQuestState,
  story: MainStoryState,
): MissionCardView {
  if (quest.stage !== 'completed') return TUTORIAL_MISSION;
  if (story.mainStoryStage === 'chapter-two-complete') return SPECIAL_MISSION;
  if (CHAPTER_TWO_STAGES.includes(story.mainStoryStage)) return COMMERCIAL_MISSION;
  return PERFORMANCE_MISSION;
}
