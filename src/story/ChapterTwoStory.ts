import {
  type ChapterOneFlags,
  type ChapterOneOutcome,
  type ChapterOneSummary,
} from './ChapterOneStory';
import { PlayerProgress, type PlayerProgressEffects } from './PlayerProgress';

/** Second-chapter nodes persist confirmed events without saving dialogue cursors. */
export type ChapterTwoNode =
  | 'not-started'
  | 'intro-review-history'
  | 'agency-first-contact'
  | 'agency-requirements'
  | 'team-discussion'
  | 'proposal-decision'
  | 'client-response'
  | 'chapter-two-ending';

/** The chosen proposal remains the route identity after chapter completion. */
export type ChapterTwoRoute = 'agency-style' | 'original-style' | 'compromise';

/** Deterministic commercial outcomes retain the long-term cost of each route. */
export type ChapterTwoOutcome =
  | 'commercialBreakthrough'
  | 'commercialCompromise'
  | 'creativeIntegrity'
  | 'walkedAway'
  | 'teamStrained'
  | 'agencyRespectEarned';

/** Type-safe historical flags replace arbitrary string-based story state. */
export type ChapterTwoFlagId =
  | 'acceptedDiscussionQuickly'
  | 'definedCoreValuesFirst'
  | 'preparedCompromiseTogether'
  | 'acceptedAgencyStyle'
  | 'keptOriginalStyle'
  | 'compromisedAgencyStyle'
  | 'acceptedFinalClientDemand'
  | 'limitedFinalClientDemand'
  | 'acceptedSmallerAuthenticStage'
  | 'walkedAwayFromAgency'
  | 'reopenedNegotiation'
  | 'completedAgencyPreview'
  | 'submittedLimitedPreview'
  | 'requestedPaidPreview';

/** Serializable second-chapter history. */
export type ChapterTwoFlags = Record<ChapterTwoFlagId, boolean>;

/** Stable identifiers for every commercial-conflict decision. */
export type ChapterTwoChoiceId =
  | 'discuss-quickly'
  | 'define-values'
  | 'prepare-compromise'
  | 'accept-agency-style'
  | 'keep-original-style'
  | 'propose-compromise'
  | 'accept-final-demand'
  | 'limit-final-demand'
  | 'accept-smaller-stage'
  | 'walk-away'
  | 'reopen-negotiation'
  | 'complete-preview'
  | 'submit-limited-preview'
  | 'request-paid-preview';

/** Persistent v6 data for the second chapter. */
export interface ChapterTwoState {
  chapterTwoNode: ChapterTwoNode;
  chapterTwoOutcome?: ChapterTwoOutcome;
  chapterTwoFlags: ChapterTwoFlags;
}

/** First-chapter context is read-only input to chapter-two rules. */
export interface ChapterOneHistoryContext {
  summary: ChapterOneSummary;
  outcome?: ChapterOneOutcome;
  flags: ChapterOneFlags;
}

/** Condition-resolved option data keeps UI free of story rules. */
export interface ChapterTwoChoiceView {
  id: ChapterTwoChoiceId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** Story messages advance only confirmed narrative nodes; choices remain replayable until confirmed. */
export type ChapterTwoInteraction =
  | { kind: 'message'; speaker: string; text: string; nextNode: ChapterTwoNode }
  | { kind: 'choices'; speaker: string; text: string; choices: ChapterTwoChoiceView[] };

/** Resolution drafts allow state and progression to commit atomically. */
export interface ChapterTwoResolution {
  success: boolean;
  text: string;
  effects?: PlayerProgressEffects;
  nextState?: ChapterTwoState;
  completed?: boolean;
}

/** Central future-chapter queries derive meaning from typed history. */
export interface ChapterTwoSummary {
  route?: ChapterTwoRoute;
  prioritizedExposure: boolean;
  preservedOriginalStyle: boolean;
  achievedCompromise: boolean;
  rejectedUnsuitablePartnership: boolean;
  securedLargeCommercialPartnership: boolean;
  earnedAgencyRespect: boolean;
  bubbleGirlTrustGrew: boolean;
  bubbleGirlWorriesAboutDirection: boolean;
  overextendedAgain: boolean;
}

interface ChoiceDefinition {
  id: ChapterTwoChoiceId;
  label: string;
  flag: ChapterTwoFlagId;
  effects: PlayerProgressEffects;
  condition?: (
    progress: PlayerProgress,
    history: ChapterOneHistoryContext,
  ) => { enabled: boolean; reason?: string };
}

const BUBBLE_GIRL = '泡妞';
const AGENCY = '活動公司';
const CHAPTER_COMPLETE_LABEL = '第二章完成：成功的代價';
const ALWAYS_AVAILABLE = (): { enabled: boolean; reason?: string } => ({ enabled: true });

/** The opening decisions establish leverage before the formal proposal. */
const DISCUSSION_CHOICES: readonly ChoiceDefinition[] = [
  {
    id: 'discuss-quickly',
    label: '先答應合作，再想辦法調整',
    flag: 'acceptedDiscussionQuickly',
    effects: { stats: { popularity: 6, conviction: -2, energy: -3 }, bubbleGirlTrust: -2 },
  },
  {
    id: 'define-values',
    label: '先確認哪些內容不能改',
    flag: 'definedCoreValuesFirst',
    effects: { stats: { conviction: 5, popularity: -1 }, bubbleGirlTrust: 4 },
  },
  {
    id: 'prepare-compromise',
    label: '請泡妞一起整理折衷方案',
    flag: 'preparedCompromiseTogether',
    effects: { stats: { conviction: 2, popularity: 3, energy: -2 }, bubbleGirlTrust: 5 },
    condition: (progress) => ({
      enabled: progress.getBubbleGirlTrust() >= 10,
      reason: '泡妞信任至少需要 10，才願意和你一起承擔這次提案。',
    }),
  },
];

/** The proposal decision expresses the chapter's central commercial conflict. */
const PROPOSAL_CHOICES: readonly ChoiceDefinition[] = [
  {
    id: 'accept-agency-style',
    label: '照客戶版本執行，先把機會做起來',
    flag: 'acceptedAgencyStyle',
    effects: { stats: { popularity: 12, energy: -10, conviction: -8 }, bubbleGirlTrust: -6 },
  },
  {
    id: 'keep-original-style',
    label: '保留科學、故事與互動，不接受大幅修改',
    flag: 'keptOriginalStyle',
    effects: { stats: { conviction: 10, popularity: -5 }, bubbleGirlTrust: 6 },
  },
  {
    id: 'propose-compromise',
    label: '保留核心內容，但重新設計成十五分鐘版本',
    flag: 'compromisedAgencyStyle',
    effects: { stats: { popularity: 7, conviction: 5, energy: -8 }, bubbleGirlTrust: 6 },
    condition: (progress, history) => ({
      enabled:
        progress.getBubbleGirlTrust() >= 12 ||
        hasSuccessfulChapterOneNegotiation(history.flags) ||
        history.summary.developedOriginalDirection,
      reason: '目前缺少足夠信任或過去經驗，無法提出有說服力的折衷版本。',
    }),
  },
];

/** Agency-style follow-up trades more visibility for another values concession. */
const AGENCY_RESPONSE_CHOICES: readonly ChoiceDefinition[] = [
  {
    id: 'accept-final-demand',
    label: '全部接受',
    flag: 'acceptedFinalClientDemand',
    effects: { stats: { popularity: 5, conviction: -4, energy: -6 }, bubbleGirlTrust: -3 },
  },
  {
    id: 'limit-final-demand',
    label: '只接受品牌口號，不加入指定橋段',
    flag: 'limitedFinalClientDemand',
    effects: { stats: { popularity: 3, conviction: 2 }, bubbleGirlTrust: 2 },
    condition: (progress) => ({
      enabled: progress.getStat('conviction') >= 10,
      reason: '信念至少需要 10，才能在合作已確定後重新劃出界線。',
    }),
  },
];

/** Original-style follow-up decides whether integrity can coexist with a smaller deal. */
const ORIGINAL_RESPONSE_CHOICES: readonly ChoiceDefinition[] = [
  {
    id: 'accept-smaller-stage',
    label: '接受較小舞台，保留完整內容',
    flag: 'acceptedSmallerAuthenticStage',
    effects: { stats: { conviction: 5, popularity: 2 }, bubbleGirlTrust: 4 },
  },
  {
    id: 'walk-away',
    label: '取消合作',
    flag: 'walkedAwayFromAgency',
    effects: { stats: { conviction: 8, popularity: -4 }, bubbleGirlTrust: 2 },
  },
  {
    id: 'reopen-negotiation',
    label: '重新提出精簡但不刪核心的版本',
    flag: 'reopenedNegotiation',
    effects: { stats: { popularity: 4, conviction: 4, energy: -5 }, bubbleGirlTrust: 5 },
    condition: (progress) => ({
      enabled: progress.getStat('technique') >= 20 && progress.getBubbleGirlTrust() >= 8,
      reason: '技藝至少需要 20，且泡妞信任至少需要 8。',
    }),
  },
];

/** Compromise follow-up tests preparation cost and the value assigned to preview work. */
const COMPROMISE_RESPONSE_CHOICES: readonly ChoiceDefinition[] = [
  {
    id: 'complete-preview',
    label: '投入額外時間完成試演',
    flag: 'completedAgencyPreview',
    effects: { stats: { popularity: 5, energy: -10, technique: 3 }, bubbleGirlTrust: 2 },
  },
  {
    id: 'submit-limited-preview',
    label: '只提供流程提案與片段',
    flag: 'submittedLimitedPreview',
    effects: { stats: { conviction: 3, energy: -4, popularity: 2 }, bubbleGirlTrust: 4 },
  },
  {
    id: 'request-paid-preview',
    label: '要求試演費',
    flag: 'requestedPaidPreview',
    effects: { stats: { conviction: 5, popularity: 1 }, bubbleGirlTrust: 5 },
    condition: (progress, history) => ({
      enabled: progress.getStat('conviction') >= 15 && history.summary.heldAgreement,
      reason: '信念至少需要 15，且過去必須有堅守合作條件的經驗。',
    }),
  },
];

const CHAPTER_TWO_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'acceptedDiscussionQuickly', 'definedCoreValuesFirst', 'preparedCompromiseTogether',
  'acceptedAgencyStyle', 'keptOriginalStyle', 'compromisedAgencyStyle',
  'acceptedFinalClientDemand', 'limitedFinalClientDemand',
  'acceptedSmallerAuthenticStage', 'walkedAwayFromAgency', 'reopenedNegotiation',
  'completedAgencyPreview', 'submittedLimitedPreview', 'requestedPaidPreview',
];

const CHAPTER_TWO_NODES: readonly ChapterTwoNode[] = [
  'not-started', 'intro-review-history', 'agency-first-contact', 'agency-requirements',
  'team-discussion', 'proposal-decision', 'client-response', 'chapter-two-ending',
];

const CHAPTER_TWO_OUTCOMES: readonly ChapterTwoOutcome[] = [
  'commercialBreakthrough', 'commercialCompromise', 'creativeIntegrity',
  'walkedAway', 'teamStrained', 'agencyRespectEarned',
];

/** Creates a locked state until the first chapter has been completed. */
export function createDefaultChapterTwoState(chapterOneComplete: boolean): ChapterTwoState {
  return {
    chapterTwoNode: chapterOneComplete ? 'intro-review-history' : 'not-started',
    chapterTwoFlags: createDefaultFlags(),
  };
}

/** Builds history-aware messages and condition-resolved choices for one current node. */
export function getChapterTwoInteraction(
  state: ChapterTwoState,
  progress: PlayerProgress,
  history: ChapterOneHistoryContext,
): ChapterTwoInteraction | undefined {
  switch (state.chapterTwoNode) {
    case 'intro-review-history':
      return {
        kind: 'message',
        speaker: BUBBLE_GIRL,
        text: buildHistoryReview(history),
        nextNode: 'agency-first-contact',
      };
    case 'agency-first-contact':
      return {
        kind: 'message',
        speaker: AGENCY,
        text: buildAgencyContact(history),
        nextNode: 'agency-requirements',
      };
    case 'agency-requirements':
      return {
        kind: 'message',
        speaker: AGENCY,
        text: '大型親子活動需要十五分鐘版本：縮短表演、刪減科學與長故事、增加大型泡泡，互動也必須照指定流程。',
        nextNode: 'team-discussion',
      };
    case 'team-discussion':
      return createChoiceInteraction(
        '這是我們目前收到規模最大的邀請。但他們想改很多東西，你覺得呢？',
        DISCUSSION_CHOICES,
        progress,
        history,
      );
    case 'proposal-decision':
      return createChoiceInteraction(
        '條件都清楚了。這次合作，我們要朝哪個方向提出正式版本？',
        PROPOSAL_CHOICES,
        progress,
        history,
      );
    case 'client-response':
      return createClientResponseInteraction(state, progress, history);
    default:
      return undefined;
  }
}

/** Resolves one current-node decision and rejects cross-node or replay attempts. */
export function resolveChapterTwoChoice(
  state: ChapterTwoState,
  choiceId: ChapterTwoChoiceId,
  progress: PlayerProgress,
  history: ChapterOneHistoryContext,
): ChapterTwoResolution {
  const choices = getChoicesForNode(state);
  const choice = choices.find(({ id }) => id === choiceId);
  if (!choice || state.chapterTwoFlags[choice.flag]) {
    return { success: false, text: '這個選擇不屬於目前事件，或已經確認。' };
  }
  const condition = (choice.condition ?? ALWAYS_AVAILABLE)(progress, history);
  if (!condition.enabled) {
    return { success: false, text: condition.reason ?? '目前無法選擇這個做法。' };
  }

  const nextFlags = { ...state.chapterTwoFlags, [choice.flag]: true };
  const nextProgress = cloneProgressWithEffects(progress, choice.effects);
  if (state.chapterTwoNode === 'team-discussion') {
    return successDraft(choice, nextFlags, 'proposal-decision', '我們先把立場整理清楚，再回覆正式版本。');
  }
  if (state.chapterTwoNode === 'proposal-decision') {
    return successDraft(choice, nextFlags, 'client-response', buildProposalFollowUp(nextFlags));
  }

  const outcome = determineOutcome(nextFlags, nextProgress);
  return {
    success: true,
    text: `${getEndingDialogue(outcome)} ${CHAPTER_COMPLETE_LABEL}`,
    effects: choice.effects,
    nextState: {
      chapterTwoNode: 'chapter-two-ending',
      chapterTwoOutcome: outcome,
      chapterTwoFlags: nextFlags,
    },
    completed: true,
  };
}

/** Advances a displayed narrative message without applying character effects. */
export function advanceChapterTwoMessage(
  state: ChapterTwoState,
  nextNode: ChapterTwoNode,
): ChapterTwoState {
  const interactionOrder: Partial<Record<ChapterTwoNode, ChapterTwoNode>> = {
    'intro-review-history': 'agency-first-contact',
    'agency-first-contact': 'agency-requirements',
    'agency-requirements': 'team-discussion',
  };
  if (interactionOrder[state.chapterTwoNode] !== nextNode) return state;
  return { chapterTwoNode: nextNode, chapterTwoFlags: { ...state.chapterTwoFlags } };
}

/** Normalizes v6 data, exclusive flags, route nodes, and abnormal completion outcomes. */
export function normalizeChapterTwoState(
  value: unknown,
  chapterOneComplete: boolean,
  forceComplete: boolean,
): ChapterTwoState {
  if (!chapterOneComplete) return createDefaultChapterTwoState(false);
  const source = isRecord(value) ? value : {};
  const flags = normalizeFlags(source.chapterTwoFlags);
  if (forceComplete && !getRoute(flags)) flags.compromisedAgencyStyle = true;
  const route = getRoute(flags);
  const hasFinalDecision = hasFinalChoice(flags, route);
  const complete = forceComplete || source.chapterTwoNode === 'chapter-two-ending' || hasFinalDecision;
  if (complete) {
    const outcome = isOutcomeForRoute(source.chapterTwoOutcome, route)
      ? source.chapterTwoOutcome
      : getSafeOutcome(route, flags);
    return { chapterTwoNode: 'chapter-two-ending', chapterTwoOutcome: outcome, chapterTwoFlags: flags };
  }

  if (route) return { chapterTwoNode: 'client-response', chapterTwoFlags: flags };
  if (hasAnyFlag(flags, DISCUSSION_FLAG_IDS)) {
    return { chapterTwoNode: 'proposal-decision', chapterTwoFlags: flags };
  }
  const node = isChapterTwoNode(source.chapterTwoNode) && INTRO_NODES.includes(source.chapterTwoNode)
    ? source.chapterTwoNode
    : 'intro-review-history';
  return { chapterTwoNode: node, chapterTwoFlags: flags };
}

/** Maps a precise event node to its broad main-story stage. */
export function getChapterTwoStage(
  node: ChapterTwoNode,
): 'chapter-two-intro' | 'agency-offer' | 'proposal-discussion' | 'creative-choice' | 'chapter-two-complete' {
  if (node === 'intro-review-history') return 'chapter-two-intro';
  if (node === 'agency-first-contact' || node === 'agency-requirements') return 'agency-offer';
  if (node === 'team-discussion') return 'proposal-discussion';
  if (node === 'chapter-two-ending') return 'chapter-two-complete';
  return 'creative-choice';
}

/** Returns a concise objective derived from the persisted event node. */
export function getChapterTwoObjective(state: ChapterTwoState): string {
  const objectives: Record<ChapterTwoNode, string> = {
    'not-started': '完成第一章後解鎖',
    'intro-review-history': '和泡妞回顧第一次舞台經驗',
    'agency-first-contact': '聽取活動公司的合作邀請',
    'agency-requirements': '確認大型親子活動的修改要求',
    'team-discussion': '和泡妞決定如何開始合作討論',
    'proposal-decision': '選擇正式合作方向',
    'client-response': '回應客戶的最後要求',
    'chapter-two-ending': CHAPTER_COMPLETE_LABEL,
  };
  return objectives[state.chapterTwoNode];
}

/** Derives durable meaning for later chapters without adding redundant save booleans. */
export function getChapterTwoSummary(
  state: ChapterTwoState,
  history: ChapterOneHistoryContext,
  progress: PlayerProgress,
): ChapterTwoSummary {
  const flags = state.chapterTwoFlags;
  const outcome = state.chapterTwoOutcome;
  const trustDelta = getBubbleGirlTrustDelta(flags);
  return {
    route: getRoute(flags),
    prioritizedExposure: flags.acceptedDiscussionQuickly || flags.acceptedAgencyStyle,
    preservedOriginalStyle: flags.keptOriginalStyle,
    achievedCompromise: flags.compromisedAgencyStyle,
    rejectedUnsuitablePartnership: flags.walkedAwayFromAgency,
    securedLargeCommercialPartnership:
      outcome === 'commercialBreakthrough' || outcome === 'commercialCompromise' ||
      outcome === 'teamStrained' || outcome === 'agencyRespectEarned',
    earnedAgencyRespect: outcome === 'agencyRespectEarned',
    bubbleGirlTrustGrew: trustDelta > 0,
    bubbleGirlWorriesAboutDirection:
      flags.acceptedAgencyStyle || outcome === 'teamStrained',
    overextendedAgain:
      history.summary.overextended &&
      (flags.acceptedFinalClientDemand || flags.completedAgencyPreview || progress.getStat('energy') < 20),
  };
}

/** Completed interactions never expose choices or reapply effects. */
export function getChapterTwoPostDialogue(outcome: ChapterTwoOutcome | undefined): string {
  const ending = outcome ? getEndingDialogue(outcome) : '我們已經知道，成功也需要付出選擇的代價。';
  return `${ending} 下一段旅程尚未開放。`;
}

/** Provides the three route choices appropriate to the current event. */
function getChoicesForNode(state: ChapterTwoState): readonly ChoiceDefinition[] {
  if (state.chapterTwoNode === 'team-discussion') return DISCUSSION_CHOICES;
  if (state.chapterTwoNode === 'proposal-decision') return PROPOSAL_CHOICES;
  if (state.chapterTwoNode !== 'client-response') return [];
  const route = getRoute(state.chapterTwoFlags);
  if (route === 'agency-style') return AGENCY_RESPONSE_CHOICES;
  if (route === 'original-style') return ORIGINAL_RESPONSE_CHOICES;
  if (route === 'compromise') return COMPROMISE_RESPONSE_CHOICES;
  return [];
}

/** Converts pure choice definitions into a dialogue interaction. */
function createChoiceInteraction(
  text: string,
  definitions: readonly ChoiceDefinition[],
  progress: PlayerProgress,
  history: ChapterOneHistoryContext,
): ChapterTwoInteraction {
  return {
    kind: 'choices',
    speaker: BUBBLE_GIRL,
    text,
    choices: definitions.map((choice) => {
      const condition = (choice.condition ?? ALWAYS_AVAILABLE)(progress, history);
      return {
        id: choice.id,
        label: choice.label,
        enabled: condition.enabled,
        ...(!condition.enabled && condition.reason ? { unavailableReason: condition.reason } : {}),
      };
    }),
  };
}

/** Creates the route-specific final client response. */
function createClientResponseInteraction(
  state: ChapterTwoState,
  progress: PlayerProgress,
  history: ChapterOneHistoryContext,
): ChapterTwoInteraction | undefined {
  const route = getRoute(state.chapterTwoFlags);
  if (route === 'agency-style') {
    return createChoiceInteraction(
      '客戶接受版本，但臨時要求再加入品牌口號與指定橋段。',
      AGENCY_RESPONSE_CHOICES,
      progress,
      history,
    );
  }
  if (route === 'original-style') {
    return createChoiceInteraction(
      '客戶只願意提供較小舞台與較少宣傳。我們要接受、離開，還是重啟談判？',
      ORIGINAL_RESPONSE_CHOICES,
      progress,
      history,
    );
  }
  if (route === 'compromise') {
    return createChoiceInteraction(
      '客戶基本接受折衷方案，但要求先看完整流程。',
      COMPROMISE_RESPONSE_CHOICES,
      progress,
      history,
    );
  }
  return undefined;
}

/** Commits a non-final transition draft with its exact effect set. */
function successDraft(
  choice: ChoiceDefinition,
  flags: ChapterTwoFlags,
  nextNode: ChapterTwoNode,
  text: string,
): ChapterTwoResolution {
  return {
    success: true,
    text,
    effects: choice.effects,
    nextState: { chapterTwoNode: nextNode, chapterTwoFlags: flags },
  };
}

/** Outcome priority is deterministic and keeps route-specific meaning. */
function determineOutcome(flags: ChapterTwoFlags, progress: PlayerProgress): ChapterTwoOutcome {
  if (flags.acceptedAgencyStyle) {
    return progress.getBubbleGirlTrust() < -15 ? 'teamStrained' : 'commercialBreakthrough';
  }
  if (flags.keptOriginalStyle) {
    if (flags.walkedAwayFromAgency) return 'walkedAway';
    if (flags.reopenedNegotiation) return 'agencyRespectEarned';
    return 'creativeIntegrity';
  }
  if (flags.requestedPaidPreview) return 'agencyRespectEarned';
  return 'commercialCompromise';
}

/** Route-specific endings make convergence preserve emotional consequences. */
function getEndingDialogue(outcome: ChapterTwoOutcome): string {
  const endings: Record<ChapterTwoOutcome, string> = {
    commercialBreakthrough: '我們真的被更多人看見了。只是我開始不確定，台上的那個表演，還是不是我們原本想做的樣子。',
    commercialCompromise: '這次我們沒有完全照著別人的方式走，也沒有把機會推開。也許找到自己的位置，本來就需要一次次談出來。',
    creativeIntegrity: '舞台變小了，但我知道我們為什麼站在上面。這次我更相信，泡泡家族可以有自己的樣子。',
    walkedAway: '我們失去了一次機會，但也知道什麼不能交換。只是下一次機會什麼時候來，沒有人知道。',
    teamStrained: '合作完成了，可是我覺得我們之間有些事情還沒有說清楚。',
    agencyRespectEarned: '他們一開始只想改變我們，最後卻開始聽我們說話。這也許才是真正的合作。',
  };
  return endings[outcome];
}

/** First-chapter experience changes BubbleGirl's opening attitude. */
function buildHistoryReview(history: ChapterOneHistoryContext): string {
  if (history.outcome === 'show-mistake') {
    return '活動公司看過那次失誤的影片，也注意到我們怎麼把演出撐完。這次不能只想到機會，也要想清楚代價。';
  }
  if (history.outcome === 'show-memorable') {
    return '他們是被上次舞台的亮點吸引來的。那次我們被看見了，但這次對方想改很多內容。';
  }
  if (history.outcome === 'show-exhausting' || history.summary.overextended) {
    return '這次規模更大，但我不想再看你透支一次。我們要先確認自己能承擔多少。';
  }
  if (history.summary.developedOriginalDirection) {
    return '那次堅持發展自己的風格沒有白費，他們正是因為原創方向才聯絡我們。';
  }
  if (history.summary.heldAgreement) {
    return '這次是正式邀約，證明我們之前守住合作條件是有意義的。';
  }
  if (history.summary.builtAudienceInteraction) {
    return '上次和觀眾的近距離互動被注意到了。這次對方願意保留互動，卻希望把它變成指定流程。';
  }
  if (!history.summary.hasShowExperience) {
    return '我們終於收到真正的大型邀約，只是對方也擔心我們還缺正式舞台經驗。';
  }
  return '第一個舞台讓更多人注意到我們，現在真正的商業合作找上門了。';
}

/** The agency's initial evaluation reflects demonstrated chapter-one strengths. */
function buildAgencyContact(history: ChapterOneHistoryContext): string {
  if (history.summary.developedOriginalDirection) {
    return '我們注意到泡泡家族的原創表演風格，希望邀請你們參加大型親子活動。';
  }
  if (history.summary.builtAudienceInteraction) {
    return '我們看過你們和觀眾互動的片段，希望大型活動仍保留一小段可控互動。';
  }
  if (history.summary.hasShowExperience) {
    return '我們看過現場演出或影片，認為大型泡泡畫面很有商業潛力。';
  }
  return '你們的概念有潛力，但缺少正式舞台紀錄，我們需要更嚴格掌握節目流程。';
}

/** Proposal follow-up makes the immediate relationship cost visible. */
function buildProposalFollowUp(flags: ChapterTwoFlags): string {
  if (flags.acceptedAgencyStyle) return '客戶很滿意，泡妞卻對表演方向顯得更不安。';
  if (flags.keptOriginalStyle) return '泡妞支持保留核心，客戶則決定縮小資源再談。';
  return '客戶願意看折衷版本，但要求我們先證明十五分鐘流程可行。';
}

/** Recognizes the exact first-chapter negotiations relevant to proposal credibility. */
function hasSuccessfulChapterOneNegotiation(flags: ChapterOneFlags): boolean {
  return flags.negotiatedExtraTime || flags.negotiatedPreview || flags.requestedSpaceChange;
}

/** Copies and mutates detached progression solely for deterministic result rules. */
function cloneProgressWithEffects(progress: PlayerProgress, effects: PlayerProgressEffects): PlayerProgress {
  const snapshot = progress.getSnapshot();
  const next = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
  next.applyEffects(effects);
  return next;
}

const DISCUSSION_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'acceptedDiscussionQuickly', 'definedCoreValuesFirst', 'preparedCompromiseTogether',
];
const ROUTE_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'acceptedAgencyStyle', 'keptOriginalStyle', 'compromisedAgencyStyle',
];
const AGENCY_FINAL_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'acceptedFinalClientDemand', 'limitedFinalClientDemand',
];
const ORIGINAL_FINAL_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'acceptedSmallerAuthenticStage', 'walkedAwayFromAgency', 'reopenedNegotiation',
];
const COMPROMISE_FINAL_FLAG_IDS: readonly ChapterTwoFlagId[] = [
  'completedAgencyPreview', 'submittedLimitedPreview', 'requestedPaidPreview',
];
const INTRO_NODES: readonly ChapterTwoNode[] = [
  'intro-review-history', 'agency-first-contact', 'agency-requirements', 'team-discussion',
];

/** Normalizes booleans, exclusivity, and cross-route final flags with stable priority. */
function normalizeFlags(value: unknown): ChapterTwoFlags {
  const source = isRecord(value) ? value : {};
  const flags = createDefaultFlags();
  for (const id of CHAPTER_TWO_FLAG_IDS) flags[id] = source[id] === true;
  keepFirstTrue(flags, DISCUSSION_FLAG_IDS);
  keepFirstTrue(flags, ROUTE_FLAG_IDS);
  const route = getRoute(flags);
  if (route === 'agency-style') {
    keepFirstTrue(flags, AGENCY_FINAL_FLAG_IDS);
    clearFlags(flags, [...ORIGINAL_FINAL_FLAG_IDS, ...COMPROMISE_FINAL_FLAG_IDS]);
  } else if (route === 'original-style') {
    keepFirstTrue(flags, ORIGINAL_FINAL_FLAG_IDS);
    clearFlags(flags, [...AGENCY_FINAL_FLAG_IDS, ...COMPROMISE_FINAL_FLAG_IDS]);
  } else if (route === 'compromise') {
    keepFirstTrue(flags, COMPROMISE_FINAL_FLAG_IDS);
    clearFlags(flags, [...AGENCY_FINAL_FLAG_IDS, ...ORIGINAL_FINAL_FLAG_IDS]);
  } else {
    clearFlags(flags, [...AGENCY_FINAL_FLAG_IDS, ...ORIGINAL_FINAL_FLAG_IDS, ...COMPROMISE_FINAL_FLAG_IDS]);
  }
  return flags;
}

/** Reads the mutually exclusive proposal route. */
function getRoute(flags: ChapterTwoFlags): ChapterTwoRoute | undefined {
  if (flags.acceptedAgencyStyle) return 'agency-style';
  if (flags.keptOriginalStyle) return 'original-style';
  if (flags.compromisedAgencyStyle) return 'compromise';
  return undefined;
}

/** Detects a confirmed final choice for damaged-stage recovery. */
function hasFinalChoice(flags: ChapterTwoFlags, route: ChapterTwoRoute | undefined): boolean {
  if (route === 'agency-style') return hasAnyFlag(flags, AGENCY_FINAL_FLAG_IDS);
  if (route === 'original-style') return hasAnyFlag(flags, ORIGINAL_FINAL_FLAG_IDS);
  if (route === 'compromise') return hasAnyFlag(flags, COMPROMISE_FINAL_FLAG_IDS);
  return false;
}

/** Ensures completed outcomes remain understandable for their persisted route. */
function isOutcomeForRoute(
  value: unknown,
  route: ChapterTwoRoute | undefined,
): value is ChapterTwoOutcome {
  if (typeof value !== 'string' || !CHAPTER_TWO_OUTCOMES.includes(value as ChapterTwoOutcome)) return false;
  if (value === 'teamStrained') return route === 'agency-style';
  if (value === 'commercialBreakthrough') return route === 'agency-style';
  if (value === 'creativeIntegrity' || value === 'walkedAway') return route === 'original-style';
  if (value === 'commercialCompromise') return route === 'compromise';
  return route === 'original-style' || route === 'compromise';
}

/** Supplies deterministic fallback outcomes for corrupted completed saves. */
function getSafeOutcome(route: ChapterTwoRoute | undefined, flags: ChapterTwoFlags): ChapterTwoOutcome {
  if (route === 'agency-style') return 'commercialBreakthrough';
  if (route === 'original-style') return flags.walkedAwayFromAgency ? 'walkedAway' : 'creativeIntegrity';
  if (flags.requestedPaidPreview) return 'agencyRespectEarned';
  return 'commercialCompromise';
}

/** Sums only the centralized relationship effects to derive trust direction. */
function getBubbleGirlTrustDelta(flags: ChapterTwoFlags): number {
  const deltas: Partial<Record<ChapterTwoFlagId, number>> = {
    acceptedDiscussionQuickly: -2, definedCoreValuesFirst: 4, preparedCompromiseTogether: 5,
    acceptedAgencyStyle: -6, keptOriginalStyle: 6, compromisedAgencyStyle: 6,
    acceptedFinalClientDemand: -3, limitedFinalClientDemand: 2,
    acceptedSmallerAuthenticStage: 4, walkedAwayFromAgency: 2, reopenedNegotiation: 5,
    completedAgencyPreview: 2, submittedLimitedPreview: 4, requestedPaidPreview: 5,
  };
  return CHAPTER_TWO_FLAG_IDS.reduce((total, id) => total + (flags[id] ? deltas[id] ?? 0 : 0), 0);
}

/** Keeps deterministic first-true priority for corrupted exclusive groups. */
function keepFirstTrue(flags: ChapterTwoFlags, ids: readonly ChapterTwoFlagId[]): void {
  const selected = ids.find((id) => flags[id]);
  for (const id of ids) flags[id] = id === selected;
}

/** Clears flags that do not belong to the selected proposal route. */
function clearFlags(flags: ChapterTwoFlags, ids: readonly ChapterTwoFlagId[]): void {
  for (const id of ids) flags[id] = false;
}

/** Reports whether any typed flag in one group is confirmed. */
function hasAnyFlag(flags: ChapterTwoFlags, ids: readonly ChapterTwoFlagId[]): boolean {
  return ids.some((id) => flags[id]);
}

/** Creates every false v6 history field in one place. */
function createDefaultFlags(): ChapterTwoFlags {
  return Object.fromEntries(CHAPTER_TWO_FLAG_IDS.map((id) => [id, false])) as ChapterTwoFlags;
}

/** Narrows a persisted node against the complete type-safe list. */
function isChapterTwoNode(value: unknown): value is ChapterTwoNode {
  return typeof value === 'string' && CHAPTER_TWO_NODES.includes(value as ChapterTwoNode);
}

/** Narrows unknown save objects without accepting arrays. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
