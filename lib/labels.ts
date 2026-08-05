import type { BabyEvent } from '../db/schema';

/** 中文標籤對照。UI 一律用這裡的字，不要在元件裡散落硬字串。 */

export const METHOD_LABEL = { bottle: '瓶餵', nursing: '親餵' } as const;
export const MILK_LABEL = { breast: '母奶', formula: '配方', mixed: '混合' } as const;
export const SIDE_LABEL = { left: '左', right: '右', both: '兩側' } as const;
export const DIAPER_KIND_LABEL = { pee: '尿', poop: '便', both: '尿+便' } as const;
export const DIAPER_COLOR_LABEL = {
  yellow: '黃',
  green: '綠',
  brown: '褐',
  black: '黑',
  white: '白',
} as const;

/** 大便卡的實際顏色，用來畫色塊讓你對照 */
export const DIAPER_COLOR_SWATCH = {
  yellow: '#E3C15C',
  green: '#7FA05C',
  brown: '#8A6244',
  black: '#3A322C',
  white: '#EFEAE2',
} as const;

/**
 * ⚠️ 白色/灰白色大便是【膽道閉鎖】的警訊，需要立刻就醫。
 * 這是這個 APP 記顏色唯一的正當理由，所以選到白色時一定要跳出提醒。
 */
export const DIAPER_COLOR_ALERT: Partial<Record<keyof typeof DIAPER_COLOR_LABEL, string>> = {
  white: '白色或灰白色大便是膽道閉鎖的警訊，請盡快帶寶寶就醫，並對照寶寶手冊的大便卡。',
};

/** 一行摘要：「配方 120ml」/「親餵 左 18 分」/「尿+便 · 黃」 */
export function summarizeEvent(e: BabyEvent): string {
  if (e.type === 'feed') {
    const parts: string[] = [];
    if (e.milk) parts.push(MILK_LABEL[e.milk]);
    else if (e.method) parts.push(METHOD_LABEL[e.method]);

    if (e.method === 'nursing' && e.side) parts.push(SIDE_LABEL[e.side]);
    if (e.amountMl) parts.push(`${e.amountMl}ml`);
    if (e.durationMin) parts.push(`${e.durationMin} 分`);

    return parts.length ? parts.join(' ') : '喝奶';
  }

  const parts: string[] = [e.diaperKind ? DIAPER_KIND_LABEL[e.diaperKind] : '尿布'];
  if (e.diaperColor) parts.push(DIAPER_COLOR_LABEL[e.diaperColor]);
  return parts.join(' · ');
}

/** ml 快選按鈕的數字。刻意不叫鍵盤——半夜單手、腦袋糊，打字是災難。 */
export const ML_PRESETS = [60, 90, 120, 150, 180] as const;

/** 親餵時長快選（補登用） */
export const DURATION_PRESETS = [10, 15, 20, 25, 30] as const;
