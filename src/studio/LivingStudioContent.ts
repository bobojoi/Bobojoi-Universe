/** One lightweight studio prop that reuses the existing interaction dialogue surface. */
export interface LivingStudioProp {
  id: string;
  label: string;
  prompt: string;
  description: string;
  x: number;
  y: number;
}

/** Fixed room dressing keeps world layout separate from StudioScene composition code. */
export const LIVING_STUDIO_PROPS: readonly LivingStudioProp[] = [
  {
    id: 'world-record-wall',
    label: '世界紀錄牆',
    prompt: '看看世界紀錄牆',
    description: '牆上貼滿不可思議的泡泡紀錄。角落留著一塊空位，像是在等你們的名字。',
    x: 1510,
    y: 350,
  },
  {
    id: 'tool-cabinet',
    label: '工具櫃',
    prompt: '查看工具櫃',
    description: '不同尺寸的泡泡棒排列得整整齊齊。每一支都有反覆使用的痕跡。',
    x: 1810,
    y: 520,
  },
  {
    id: 'studio-bookshelf',
    label: '書架',
    prompt: '翻翻書架',
    description: '書架上有表演筆記、旅行手冊，還夾著泡妞寫滿註記的便條。',
    x: 1740,
    y: 910,
  },
  {
    id: 'show-photos',
    label: '演出照片',
    prompt: '看看演出照片',
    description: '照片記下你們第一次站上舞台的樣子。畫面有點模糊，笑容卻很清楚。',
    x: 1160,
    y: 1120,
  },
  {
    id: 'studio-globe',
    label: '地球儀',
    prompt: '轉動地球儀',
    description: '地球儀慢慢轉過一圈。世界很大，而工作室正準備從這裡出發。',
    x: 510,
    y: 1120,
  },
] as const;

/** Companion reactions rotate without repeating the immediately previous line. */
export const BUBBLE_DOG_REACTIONS = [
  '泡彈搖著尾巴。',
  '泡彈蹭了蹭你的腿。',
  '泡彈今天精神很好。',
  '泡彈期待今天一起出門。',
  '泡彈興奮地轉了一圈。',
  '泡彈抬起頭，認真聽你說話。',
  '泡彈把最喜歡的角落讓給你。',
  '泡彈輕輕叫了一聲，像是在替你打氣。',
  '泡彈繞著你走了半圈，尾巴停不下來。',
  '泡彈安靜地靠在你身邊。',
  '泡彈眨了眨眼，好像知道今天會有好事。',
  '泡彈伸了個懶腰，又開心地望向你。',
] as const;

/** Quiet observations add room rhythm without changing story or persistent state. */
export const STUDIO_AMBIENT_MESSAGES = [
  '窗外吹來微風。',
  '陽光灑進工作室。',
  '今天是適合練習泡泡的一天。',
  '遠處傳來城市慢慢醒來的聲音。',
  '工作室裡飄著淡淡的咖啡香。',
  '幾顆小泡泡在窗邊映出彩色的光。',
] as const;

/** Selects a valid index while avoiding one immediate repeat when possible. */
export function pickNonRepeatingIndex(
  itemCount: number,
  previousIndex: number,
  randomValue: number,
): number {
  if (!Number.isInteger(itemCount) || itemCount <= 0) return -1;
  if (itemCount === 1) return 0;

  const normalizedRandom = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON)
    : 0;
  const candidate = Math.floor(normalizedRandom * (itemCount - 1));
  if (previousIndex < 0 || previousIndex >= itemCount) return candidate;
  return candidate >= previousIndex ? candidate + 1 : candidate;
}
