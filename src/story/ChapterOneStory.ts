import { PlayerProgress, type PlayerProgressEffects } from './PlayerProgress';

/** The first decision remains the stable route identity after all routes converge. */
export type ChapterOneRoute = 'accepted-offer' | 'training-first' | 'small-show';

/** Event nodes save confirmed progress without persisting a dialogue cursor. */
export type ChapterOneNode =
  | 'not-started'
  | 'a-preparation'
  | 'a-extra-time'
  | 'a-mistake-response'
  | 'b-training'
  | 'b-preview'
  | 'c-format'
  | 'c-space'
  | 'complete';

/** Route outcomes remain distinct after the main stage converges. */
export type ChapterOneOutcome =
  | 'show-stable'
  | 'show-memorable'
  | 'show-exhausting'
  | 'show-mistake'
  | 'training-solid'
  | 'training-original'
  | 'preview-successful'
  | 'held-principle'
  | 'small-show-safe'
  | 'small-show-interactive-success'
  | 'small-show-story-success'
  | 'small-show-compromised'
  | 'legacy-complete';

/** Typed history flags prevent scenes and future chapters from using string literals. */
export type ChapterOneFlagId =
  | 'preparedSafeRoutine'
  | 'preparedRiskyRoutine'
  | 'preparedAudiencePlan'
  | 'acceptedExtraTime'
  | 'keptOriginalAgreement'
  | 'negotiatedExtraTime'
  | 'admittedShowMistake'
  | 'concealedShowMistake'
  | 'trainedBasics'
  | 'trainedOriginalStyle'
  | 'studiedAudience'
  | 'acceptedFreePreview'
  | 'refusedFreePreview'
  | 'negotiatedPreview'
  | 'smallShowVisual'
  | 'smallShowInteractive'
  | 'smallShowStory'
  | 'adaptedSafely'
  | 'requestedSpaceChange'
  | 'performedInTightSpace';

/** Serializable route history. */
export type ChapterOneFlags = Record<ChapterOneFlagId, boolean>;

/** Stable identifiers for all choices after the first offer. */
export type ChapterOneChoiceId =
  | 'a-safe-routine'
  | 'a-risky-routine'
  | 'a-audience-plan'
  | 'a-accept-extra-time'
  | 'a-decline-extra-time'
  | 'a-negotiate-extra-time'
  | 'a-admit-mistake'
  | 'a-conceal-mistake'
  | 'b-train-basics'
  | 'b-original-style'
  | 'b-study-audience'
  | 'b-accept-preview'
  | 'b-refuse-preview'
  | 'b-negotiate-preview'
  | 'c-visual-format'
  | 'c-interactive-format'
  | 'c-story-format'
  | 'c-adapt-safely'
  | 'c-request-space-change'
  | 'c-perform-tight-space';

/** Persistent chapter-one data added by save version 5. */
export interface ChapterOneState {
  chapterOneNode: ChapterOneNode;
  chapterOneOutcome?: ChapterOneOutcome;
  chapterOneFlags: ChapterOneFlags;
}

/** Presentation data has already evaluated every gameplay condition. */
export interface ChapterOneChoiceView {
  id: ChapterOneChoiceId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** One route event ready for the dialogue layer. */
export interface ChapterOneInteraction {
  speaker: string;
  text: string;
  choices: ChapterOneChoiceView[];
}

/** Pure resolution draft lets the owner commit state and effects atomically. */
export interface ChapterOneResolution {
  success: boolean;
  text: string;
  effects?: PlayerProgressEffects;
  nextState?: ChapterOneState;
  completed?: boolean;
}

/** Derived facts expose stable chapter history without duplicate persisted booleans. */
export interface ChapterOneSummary {
  route?: ChapterOneRoute;
  hasShowExperience: boolean;
  heldAgreement: boolean;
  developedOriginalDirection: boolean;
  builtAudienceInteraction: boolean;
  overextended: boolean;
  receivedFollowUpInvitation: boolean;
}

interface ChoiceDefinition {
  id: ChapterOneChoiceId;
  label: string;
  flag: ChapterOneFlagId;
  effects: PlayerProgressEffects;
  condition?: (progress: PlayerProgress) => { enabled: boolean; reason?: string };
}

interface NodeDefinition {
  route: ChapterOneRoute;
  text: string;
  choices: readonly ChoiceDefinition[];
}

const ALWAYS_AVAILABLE = (): { enabled: boolean; reason?: string } => ({ enabled: true });
const BUBBLE_GIRL = '泡妞';
const CHAPTER_COMPLETE_LABEL = '第一章完成：夢想的第一步';

/** Route content is declarative but intentionally limited to this chapter. */
const NODE_DEFINITIONS: Partial<Record<ChapterOneNode, NodeDefinition>> = {
  'a-preparation': {
    route: 'accepted-offer',
    text: '時間很緊，我們只能先決定最重要的準備方向。你想怎麼安排？',
    choices: [
      {
        id: 'a-safe-routine',
        label: '排練穩定、安全的流程',
        flag: 'preparedSafeRoutine',
        effects: { stats: { technique: 6, energy: -10 }, bubbleGirlTrust: 3 },
      },
      {
        id: 'a-risky-routine',
        label: '挑戰高難度招式',
        flag: 'preparedRiskyRoutine',
        effects: { stats: { technique: 3, conviction: 6, energy: -15 }, bubbleGirlTrust: -3 },
        condition: (progress) => ({
          enabled: progress.getStat('technique') >= 15,
          reason: '技藝至少需要 15，才有把握嘗試。',
        }),
      },
      {
        id: 'a-audience-plan',
        label: '先設計觀眾互動段落',
        flag: 'preparedAudiencePlan',
        effects: { stats: { popularity: 4, energy: -7 }, bubbleGirlTrust: 6 },
      },
    ],
  },
  'a-extra-time': {
    route: 'accepted-offer',
    text: '主辦方臨時希望延長演出。這會增加曝光，也會壓縮我們的體力。',
    choices: [
      {
        id: 'a-accept-extra-time',
        label: '接受延長演出',
        flag: 'acceptedExtraTime',
        effects: { stats: { popularity: 7, energy: -12, conviction: -2 }, bubbleGirlTrust: -2 },
      },
      {
        id: 'a-decline-extra-time',
        label: '維持原本約定',
        flag: 'keptOriginalAgreement',
        effects: { stats: { conviction: 6, popularity: -2 }, bubbleGirlTrust: 4 },
      },
      {
        id: 'a-negotiate-extra-time',
        label: '協商一個較短的加演',
        flag: 'negotiatedExtraTime',
        effects: { stats: { popularity: 5, conviction: 3, energy: -5 }, bubbleGirlTrust: 6 },
        condition: (progress) => ({
          enabled: progress.getBubbleGirlTrust() >= 0,
          reason: '泡妞目前不信任這個臨場談判方式。',
        }),
      },
    ],
  },
  'a-mistake-response': {
    route: 'accepted-offer',
    text: '高難度段落出了差錯。觀眾還在等，你要怎麼面對？',
    choices: [
      {
        id: 'a-admit-mistake',
        label: '坦白失誤，重新完成動作',
        flag: 'admittedShowMistake',
        effects: { stats: { conviction: 5, popularity: -2 }, bubbleGirlTrust: 6 },
      },
      {
        id: 'a-conceal-mistake',
        label: '裝作沒事，直接繼續',
        flag: 'concealedShowMistake',
        effects: { stats: { popularity: 2, conviction: -5 }, bubbleGirlTrust: -6 },
      },
    ],
  },
  'b-training': {
    route: 'training-first',
    text: '既然選擇先練習，今天要把時間放在哪個方向？',
    choices: [
      {
        id: 'b-train-basics',
        label: '紮實練習基本功',
        flag: 'trainedBasics',
        effects: { stats: { technique: 8, energy: -8 }, bubbleGirlTrust: 4 },
      },
      {
        id: 'b-original-style',
        label: '發展原創演出風格',
        flag: 'trainedOriginalStyle',
        effects: { stats: { technique: 5, conviction: 7, energy: -12 } },
        condition: (progress) => ({
          enabled: progress.getStat('conviction') >= 10,
          reason: '信念至少需要 10，才能堅持自己的表演方向。',
        }),
      },
      {
        id: 'b-study-audience',
        label: '研究觀眾喜歡的內容',
        flag: 'studiedAudience',
        effects: { stats: { popularity: 4, technique: 3 }, bubbleGirlTrust: 2 },
      },
    ],
  },
  'b-preview': {
    route: 'training-first',
    text: '社區提出免費試演邀請。它能累積經驗，但也可能讓努力被低估。',
    choices: [
      {
        id: 'b-accept-preview',
        label: '接受免費試演',
        flag: 'acceptedFreePreview',
        effects: { stats: { popularity: 6, technique: 4, energy: -10, conviction: -2 } },
      },
      {
        id: 'b-refuse-preview',
        label: '拒絕免費演出',
        flag: 'refusedFreePreview',
        effects: { stats: { conviction: 7, popularity: -1 }, bubbleGirlTrust: 3 },
      },
      {
        id: 'b-negotiate-preview',
        label: '協商交換宣傳資源',
        flag: 'negotiatedPreview',
        effects: { stats: { popularity: 5, technique: 2, conviction: 3, energy: -5 }, bubbleGirlTrust: 5 },
        condition: (progress) => ({
          enabled: progress.getBubbleGirlTrust() >= 5,
          reason: '泡妞信任至少需要 5，才願意一起提出交換條件。',
        }),
      },
    ],
  },
  'c-format': {
    route: 'small-show',
    text: '場地雖小，仍要有一個清楚的演出核心。你想選哪種形式？',
    choices: [
      {
        id: 'c-visual-format',
        label: '強化視覺技巧',
        flag: 'smallShowVisual',
        effects: { stats: { technique: 5, popularity: 3, energy: -8 } },
      },
      {
        id: 'c-interactive-format',
        label: '設計近距離互動',
        flag: 'smallShowInteractive',
        effects: { stats: { popularity: 6, energy: -10 }, bubbleGirlTrust: 4 },
      },
      {
        id: 'c-story-format',
        label: '用故事串起整場演出',
        flag: 'smallShowStory',
        effects: { stats: { conviction: 6, popularity: 4, technique: 2, energy: -10 } },
        condition: (progress) => ({
          enabled: progress.getStat('conviction') >= 12,
          reason: '信念至少需要 12，才能把故事完整說完。',
        }),
      },
    ],
  },
  'c-space': {
    route: 'small-show',
    text: '進場後才發現空間比預期更窄。要怎麼調整？',
    choices: [
      {
        id: 'c-adapt-safely',
        label: '安全縮小動作範圍',
        flag: 'adaptedSafely',
        effects: { stats: { conviction: 2, popularity: 2 }, bubbleGirlTrust: 6 },
      },
      {
        id: 'c-request-space-change',
        label: '請主辦方調整空間',
        flag: 'requestedSpaceChange',
        effects: { stats: { conviction: 5, popularity: 3 }, bubbleGirlTrust: 3 },
        condition: (progress) => ({
          enabled: progress.getBubbleGirlTrust() >= 5,
          reason: '泡妞信任至少需要 5，才願意一起提出場地調整。',
        }),
      },
      {
        id: 'c-perform-tight-space',
        label: '維持難度，在狹窄空間完成',
        flag: 'performedInTightSpace',
        effects: { stats: { technique: 4, energy: -8 }, bubbleGirlTrust: -2 },
      },
    ],
  },
};

const CHAPTER_ONE_FLAG_IDS: readonly ChapterOneFlagId[] = [
  'preparedSafeRoutine', 'preparedRiskyRoutine', 'preparedAudiencePlan',
  'acceptedExtraTime', 'keptOriginalAgreement', 'negotiatedExtraTime',
  'admittedShowMistake', 'concealedShowMistake', 'trainedBasics',
  'trainedOriginalStyle', 'studiedAudience', 'acceptedFreePreview',
  'refusedFreePreview', 'negotiatedPreview', 'smallShowVisual',
  'smallShowInteractive', 'smallShowStory', 'adaptedSafely',
  'requestedSpaceChange', 'performedInTightSpace',
];

const CHAPTER_ONE_NODES: readonly ChapterOneNode[] = [
  'not-started', 'a-preparation', 'a-extra-time', 'a-mistake-response',
  'b-training', 'b-preview', 'c-format', 'c-space', 'complete',
];

const CHAPTER_ONE_OUTCOMES: readonly ChapterOneOutcome[] = [
  'show-stable', 'show-memorable', 'show-exhausting', 'show-mistake',
  'training-solid', 'training-original', 'preview-successful', 'held-principle',
  'small-show-safe', 'small-show-interactive-success', 'small-show-story-success',
  'small-show-compromised', 'legacy-complete',
];

const ROUTE_OUTCOMES: Record<ChapterOneRoute, readonly ChapterOneOutcome[]> = {
  'accepted-offer': ['show-stable', 'show-memorable', 'show-exhausting', 'show-mistake', 'legacy-complete'],
  'training-first': ['training-solid', 'training-original', 'preview-successful', 'held-principle', 'legacy-complete'],
  'small-show': ['small-show-safe', 'small-show-interactive-success', 'small-show-story-success', 'small-show-compromised', 'legacy-complete'],
};

/** Creates an empty history before a route has begun. */
export function createDefaultChapterOneState(): ChapterOneState {
  return { chapterOneNode: 'not-started', chapterOneFlags: createDefaultFlags() };
}

/** Maps the main route to its first confirmed-progress node. */
export function getRouteOpeningNode(route: ChapterOneRoute): ChapterOneNode {
  if (route === 'accepted-offer') return 'a-preparation';
  if (route === 'training-first') return 'b-training';
  return 'c-format';
}

/** Builds condition-resolved interaction data for the current route node. */
export function getChapterOneInteraction(
  state: ChapterOneState,
  route: ChapterOneRoute,
  progress: PlayerProgress,
): ChapterOneInteraction | undefined {
  const definition = NODE_DEFINITIONS[state.chapterOneNode];
  if (!definition || definition.route !== route) return undefined;
  return {
    speaker: BUBBLE_GIRL,
    text: definition.text,
    choices: definition.choices.map((choice) => {
      const condition: { enabled: boolean; reason?: string } =
        (choice.condition ?? ALWAYS_AVAILABLE)(progress);
      return {
        id: choice.id,
        label: choice.label,
        enabled: condition.enabled,
        ...(!condition.enabled && condition.reason
          ? { unavailableReason: condition.reason }
          : {}),
      };
    }),
  };
}

/** Resolves one choice only when it belongs to the current persisted node. */
export function resolveChapterOneChoice(
  state: ChapterOneState,
  route: ChapterOneRoute,
  choiceId: ChapterOneChoiceId,
  progress: PlayerProgress,
): ChapterOneResolution {
  const definition = NODE_DEFINITIONS[state.chapterOneNode];
  if (!definition || definition.route !== route) {
    return { success: false, text: '這個事件目前尚未發生。' };
  }
  const choice = definition.choices.find(({ id }) => id === choiceId);
  if (!choice || state.chapterOneFlags[choice.flag]) {
    return { success: false, text: '這個選擇已經確認，不能重複套用。' };
  }
  const condition: { enabled: boolean; reason?: string } =
    (choice.condition ?? ALWAYS_AVAILABLE)(progress);
  if (!condition.enabled) {
    return { success: false, text: condition.reason ?? '目前無法選擇這個做法。' };
  }

  const nextFlags = { ...state.chapterOneFlags, [choice.flag]: true };
  const nextProgress = cloneProgressWithEffects(progress, choice.effects);
  const transition = getTransition(state.chapterOneNode, nextFlags, nextProgress);
  const nextState: ChapterOneState = {
    chapterOneNode: transition.nextNode,
    chapterOneFlags: nextFlags,
    ...(transition.outcome ? { chapterOneOutcome: transition.outcome } : {}),
  };
  return {
    success: true,
    text: transition.text,
    effects: choice.effects,
    nextState,
    completed: transition.nextNode === 'complete',
  };
}

/** Repairs missing, conflicting, or cross-route chapter data from a save. */
export function normalizeChapterOneState(
  value: unknown,
  route: ChapterOneRoute | undefined,
  chapterComplete: boolean,
): ChapterOneState {
  if (!route) return createDefaultChapterOneState();
  const source = isRecord(value) ? value : {};
  const flags = normalizeFlags(source.chapterOneFlags, route);
  if (chapterComplete) {
    const outcome = isChapterOneOutcome(source.chapterOneOutcome) &&
      ROUTE_OUTCOMES[route].includes(source.chapterOneOutcome)
      ? source.chapterOneOutcome
      : 'legacy-complete';
    return { chapterOneNode: 'complete', chapterOneOutcome: outcome, chapterOneFlags: flags };
  }

  const rawNode = isChapterOneNode(source.chapterOneNode)
    ? source.chapterOneNode
    : getRouteOpeningNode(route);
  return {
    chapterOneNode: normalizeNodeForRoute(rawNode, route, flags),
    chapterOneFlags: flags,
  };
}

/** Derives future-chapter facts from route history and outcome without duplicate truth. */
export function getChapterOneSummary(
  state: ChapterOneState,
  route: ChapterOneRoute | undefined,
): ChapterOneSummary {
  const flags = state.chapterOneFlags;
  const outcome = state.chapterOneOutcome;
  return {
    route,
    hasShowExperience:
      route === 'accepted-offer' || route === 'small-show' ||
      flags.acceptedFreePreview || flags.negotiatedPreview,
    heldAgreement: flags.keptOriginalAgreement || flags.refusedFreePreview,
    developedOriginalDirection: flags.trainedOriginalStyle || flags.smallShowStory,
    builtAudienceInteraction:
      flags.preparedAudiencePlan || flags.studiedAudience || flags.smallShowInteractive,
    overextended:
      outcome === 'show-exhausting' || outcome === 'show-mistake' ||
      outcome === 'small-show-compromised',
    receivedFollowUpInvitation:
      outcome === 'show-memorable' || outcome === 'preview-successful' ||
      outcome === 'small-show-interactive-success' || outcome === 'small-show-story-success',
  };
}

/** Returns route-specific dialogue after completion without replaying effects. */
export function getChapterOnePostDialogue(
  route: ChapterOneRoute | undefined,
  outcome: ChapterOneOutcome | undefined,
): string {
  const routeLine = route === 'accepted-offer'
    ? '那次正式演出讓我們知道，機會和壓力總是一起出現。'
    : route === 'training-first'
      ? '先打好底子讓我們找到自己的節奏，下一次會更有準備。'
      : route === 'small-show'
        ? '那場小演出證明，只要方法對，小舞台也能留下很深的印象。'
        : '我們已經一起踏出了夢想的第一步。';
  const outcomeLine = outcome === 'show-mistake'
    ? '那次失誤也會成為下一次做得更好的理由。'
    : '';
  return `${routeLine}${outcomeLine} 下一段旅程尚未開放。`;
}

/** Produces a compact HUD objective from the saved event node. */
export function getChapterOneObjective(state: ChapterOneState): string {
  const objectives: Record<ChapterOneNode, string> = {
    'not-started': '等待第一個演出邀請',
    'a-preparation': '和泡妞決定演出準備方向',
    'a-extra-time': '回應主辦方的加演要求',
    'a-mistake-response': '面對演出中的失誤',
    'b-training': '和泡妞決定練習方向',
    'b-preview': '回應社區免費試演邀請',
    'c-format': '決定小型演出的核心形式',
    'c-space': '處理比預期狹窄的演出空間',
    complete: CHAPTER_COMPLETE_LABEL,
  };
  return objectives[state.chapterOneNode];
}

/** Transition rules stay close to chapter content rather than growing the scene. */
function getTransition(
  node: ChapterOneNode,
  flags: ChapterOneFlags,
  progress: PlayerProgress,
): { nextNode: ChapterOneNode; outcome?: ChapterOneOutcome; text: string } {
  if (node === 'a-preparation') {
    return { nextNode: 'a-extra-time', text: '準備方向定下來了。接著要回覆主辦方的新要求。' };
  }
  if (node === 'a-extra-time') {
    const outcome = resolveRouteAOutcome(flags, progress);
    if (outcome === 'show-mistake') {
      return { nextNode: 'a-mistake-response', outcome, text: '高難度演出出了差錯，現在必須決定怎麼面對。' };
    }
    return completeTransition(outcome);
  }
  if (node === 'a-mistake-response') return completeTransition('show-mistake');
  if (node === 'b-training') {
    return { nextNode: 'b-preview', text: '練習有了方向。這時，社區送來一個免費試演的提案。' };
  }
  if (node === 'b-preview') return completeTransition(resolveRouteBOutcome(flags));
  if (node === 'c-format') {
    return { nextNode: 'c-space', text: '演出形式確定了，但現場空間比原先說的更狹窄。' };
  }
  if (node === 'c-space') return completeTransition(resolveRouteCOutcome(flags));
  return { nextNode: node, text: '這個事件已經結束。' };
}

/** Route A rewards spectacle but exposes pressure and energy risk. */
function resolveRouteAOutcome(flags: ChapterOneFlags, progress: PlayerProgress): ChapterOneOutcome {
  if (flags.preparedRiskyRoutine && progress.getStat('energy') < 35) return 'show-mistake';
  if (flags.acceptedExtraTime) return 'show-exhausting';
  if (flags.preparedRiskyRoutine || flags.preparedAudiencePlan) return 'show-memorable';
  return 'show-stable';
}

/** Route B keeps training identity even when a preview supplies show experience. */
function resolveRouteBOutcome(flags: ChapterOneFlags): ChapterOneOutcome {
  if (flags.acceptedFreePreview || flags.negotiatedPreview) return 'preview-successful';
  if (flags.trainedOriginalStyle) return 'training-original';
  if (flags.studiedAudience && flags.refusedFreePreview) return 'held-principle';
  return 'training-solid';
}

/** Route C resolves from venue handling before format-specific success. */
function resolveRouteCOutcome(flags: ChapterOneFlags): ChapterOneOutcome {
  if (flags.performedInTightSpace) return 'small-show-compromised';
  if (flags.smallShowInteractive) return 'small-show-interactive-success';
  if (flags.smallShowStory) return 'small-show-story-success';
  return 'small-show-safe';
}

/** Adds the explicit chapter label to every route-specific ending. */
function completeTransition(outcome: ChapterOneOutcome): {
  nextNode: 'complete';
  outcome: ChapterOneOutcome;
  text: string;
} {
  const endings: Record<ChapterOneOutcome, string> = {
    'show-stable': '演出穩穩完成，主辦方記住了我們的可靠。',
    'show-memorable': '演出留下了鮮明印象，也帶來新的關注。',
    'show-exhausting': '曝光增加了，但大家也感受到勉強撐完的代價。',
    'show-mistake': '失誤沒有消失，但我們學會了如何一起承擔。',
    'training-solid': '基本功更穩了，工作室建立了可靠的節奏。',
    'training-original': '我們找到更像自己的演出方向。',
    'preview-successful': '試演帶來真實觀眾，也讓下一次準備更清楚。',
    'held-principle': '我們守住了合作原則，也更確定自己的價值。',
    'small-show-safe': '小舞台安全完成，第一次正式經驗很踏實。',
    'small-show-interactive-success': '近距離互動讓觀眾記住了泡泡工作室。',
    'small-show-story-success': '觀眾跟著故事走到最後，演出有了自己的靈魂。',
    'small-show-compromised': '演出完成了，但狹窄空間也暴露出逞強的代價。',
    'legacy-complete': '我們已經完成第一章的旅程。',
  };
  return { nextNode: 'complete', outcome, text: `${endings[outcome]} ${CHAPTER_COMPLETE_LABEL}` };
}

/** Applies effects to a detached progress object solely for deterministic outcome rules. */
function cloneProgressWithEffects(progress: PlayerProgress, effects: PlayerProgressEffects): PlayerProgress {
  const snapshot = progress.getSnapshot();
  const next = new PlayerProgress(snapshot.playerStats, snapshot.relationships);
  next.applyEffects(effects);
  return next;
}

/** Keeps only flags belonging to the selected route and resolves mutually exclusive groups. */
function normalizeFlags(value: unknown, route: ChapterOneRoute): ChapterOneFlags {
  const source = isRecord(value) ? value : {};
  const flags = createDefaultFlags();
  for (const id of CHAPTER_ONE_FLAG_IDS) flags[id] = source[id] === true;

  const routeGroups: Record<ChapterOneRoute, readonly (readonly ChapterOneFlagId[])[]> = {
    'accepted-offer': [
      ['preparedSafeRoutine', 'preparedRiskyRoutine', 'preparedAudiencePlan'],
      ['acceptedExtraTime', 'keptOriginalAgreement', 'negotiatedExtraTime'],
      ['admittedShowMistake', 'concealedShowMistake'],
    ],
    'training-first': [
      ['trainedBasics', 'trainedOriginalStyle', 'studiedAudience'],
      ['acceptedFreePreview', 'refusedFreePreview', 'negotiatedPreview'],
    ],
    'small-show': [
      ['smallShowVisual', 'smallShowInteractive', 'smallShowStory'],
      ['adaptedSafely', 'requestedSpaceChange', 'performedInTightSpace'],
    ],
  };
  const allowed = new Set(routeGroups[route].flat());
  for (const id of CHAPTER_ONE_FLAG_IDS) if (!allowed.has(id)) flags[id] = false;
  for (const group of routeGroups[route]) keepFirstTrue(flags, group);
  return flags;
}

/** Infers the furthest safe confirmed node instead of trusting a damaged node value. */
function normalizeNodeForRoute(
  node: ChapterOneNode,
  route: ChapterOneRoute,
  flags: ChapterOneFlags,
): ChapterOneNode {
  const opening = getRouteOpeningNode(route);
  if (route === 'accepted-offer') {
    if (flags.admittedShowMistake || flags.concealedShowMistake) return 'a-mistake-response';
    if (flags.acceptedExtraTime || flags.keptOriginalAgreement || flags.negotiatedExtraTime) {
      return flags.preparedRiskyRoutine ? 'a-mistake-response' : 'a-extra-time';
    }
    if (flags.preparedSafeRoutine || flags.preparedRiskyRoutine || flags.preparedAudiencePlan) return 'a-extra-time';
    return node === opening ? node : opening;
  }
  if (route === 'training-first') {
    if (flags.trainedBasics || flags.trainedOriginalStyle || flags.studiedAudience) return 'b-preview';
    return node === opening ? node : opening;
  }
  if (flags.smallShowVisual || flags.smallShowInteractive || flags.smallShowStory) return 'c-space';
  return node === opening ? node : opening;
}

/** Keeps deterministic first-in-definition priority for corrupted exclusive flags. */
function keepFirstTrue(flags: ChapterOneFlags, ids: readonly ChapterOneFlagId[]): void {
  const selected = ids.find((id) => flags[id]);
  for (const id of ids) flags[id] = id === selected;
}

function createDefaultFlags(): ChapterOneFlags {
  return Object.fromEntries(CHAPTER_ONE_FLAG_IDS.map((id) => [id, false])) as ChapterOneFlags;
}

function isChapterOneNode(value: unknown): value is ChapterOneNode {
  return typeof value === 'string' && CHAPTER_ONE_NODES.includes(value as ChapterOneNode);
}

function isChapterOneOutcome(value: unknown): value is ChapterOneOutcome {
  return typeof value === 'string' && CHAPTER_ONE_OUTCOMES.includes(value as ChapterOneOutcome);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
