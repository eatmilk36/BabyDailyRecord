import type { BabyEvent, NursingSide } from '../db/schema';
import { t } from './i18n';

/** 中文標籤對照。UI 一律用這裡的字，不要在元件裡散落硬字串。 */

/**
 * ⚠️ 這些原本都是 `as const` 的常數物件，改成函式因為它們要跟著語言變。
 * 這個檔案不是元件，所以用 lib/i18n.ts 的模組層級 t()（讀 currentLang）。
 * 呼叫端從 TYPE_LABEL[x] 改成 typeLabel(x)。
 */
export function typeLabel(type: BabyEvent['type']): string {
  return t(`type.${type}`);
}

export const TYPE_EMOJI = {
  feed: '🍼',
  diaper: '💧',
  sleep: '🌙',
  pump: '🫗',
  growth: '📏',
} as const;

export function methodLabel(m: NonNullable<BabyEvent['method']>): string {
  return t(`method.${m}`);
}
export function milkLabel(m: NonNullable<BabyEvent['milk']>): string {
  return t(`milk.${m}`);
}
/**
 * 左右邊。
 *
 * ⚠️ 從常數物件改成函式，因為它要跟著語言變。
 * 這個檔案不是元件，所以用 lib/i18n.ts 的模組層級 t()（讀 currentLang）——
 * 元件請用 useT()，否則語言切換時不會重繪。
 *
 * 呼叫端從 SIDE_LABEL[s] 改成 sideLabel(s)。
 */
export function sideLabel(side: NursingSide): string {
  return t(side === 'left' ? 'side.left' : side === 'right' ? 'side.right' : 'side.both');
}
export function diaperKindLabel(k: NonNullable<BabyEvent['diaperKind']>): string {
  return t(`diaperKind.${k}`);
}
/** 舊資料的自由顏色欄位。UI 已移除，只剩摘要顯示與 CSV 匯出會用到 */
export function diaperColorLabel(c: NonNullable<BabyEvent['diaperColor']>): string {
  return t(`color.${c}`);
}

/**
 * 台灣兒童健康手冊「九色大便卡」。
 *
 * 1–6 號 = 異常（膽汁滯留，淡黃／灰白）→ 應儘速就醫
 * 7–9 號 = 正常（黃／綠）
 * 0      = 我們自己加的「說不準／介於之間」
 *
 * 為什麼加 0：衛福部的指引明確寫「最像 1–6 號，**或介於正常與異常之間**，
 * 應儘速就醫」。如果只給 1–9，家長遇到說不準的情況會傾向猜一個正常值 ——
 * 那正是最危險的漏接。給一個明確的「說不準」並讓它同樣觸發警示。
 *
 * ⚠️ 刻意【不在螢幕上畫色塊】：手機螢幕沒有色彩校準，而這個 APP 的使用情境
 * 是半夜把亮度調到最低。在那種條件下比對螢幕顏色比不比對更危險。
 * 正確流程是對照手冊裡的實體卡片，在 APP 裡點編號。
 */
export const STOOL_CARD_ABNORMAL = [1, 2, 3, 4, 5, 6] as const;
export const STOOL_CARD_NORMAL = [7, 8, 9] as const;
export const STOOL_CARD_UNSURE = 0;

/** 0（說不準）與 1–6 都算需要就醫 */
export function isStoolCardAbnormal(n: number | null | undefined): boolean {
  return n != null && n <= 6;
}

export function stoolCardLabel(n: number): string {
  return n === STOOL_CARD_UNSURE ? t('stool.unsure') : String(n);
}

/**
 * 就醫警示的內文原本是這個檔案裡的 STOOL_CARD_ALERT 常數，現在住在
 * lib/i18n.ts 的 `stool.alertBody`。
 *
 * ⚠️ 搬過去的時候【英文版是加註而不是直譯】—— 那張卡是台灣兒童健康手冊裡的
 * 實體卡片、那支專線是台灣號碼而且只有中文接線。完整理由寫在 i18n.ts 的
 * 「九色大便卡（醫療）」那一區，改字之前先讀那段。
 */

/** 舊資料用的自由顏色欄位，已從 UI 移除，僅保留顯示 */
export const DIAPER_COLOR_SWATCH = {
  yellow: '#E3C15C',
  green: '#7FA05C',
  brown: '#8A6244',
  black: '#3A322C',
  white: '#EFEAE2',
} as const;

export function sexLabel(s: NonNullable<import('../db/schema').Baby['sex']>): string {
  return t(`sex.${s}`);
}

/** 公克 → 「3.25 kg」 */
export function formatWeight(g: number): string {
  return `${(g / 1000).toFixed(2)} kg`;
}

/** 公釐 → 「50.2 cm」 */
export function formatLength(mm: number): string {
  return `${(mm / 10).toFixed(1)} cm`;
}

/** 分鐘 → 「2 小時 15 分」/「45 分」 */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return t('time.min', { n: m });
  return m === 0 ? t('time.hour', { h }) : t('time.hourMin', { h, m });
}

/** 一行摘要：「配方 120ml」/「親餵 左 18 分」/「尿+便 · 大便卡 3 ⚠」/「睡 2 小時 15 分」 */
export function summarizeEvent(e: BabyEvent): string {
  if (e.type === 'sleep') {
    if (e.status === 'active') return t('sum.sleeping');
    return e.durationMin != null
      ? t('sum.slept', { dur: formatMinutes(e.durationMin) })
      : t('sum.sleepNoDur');
  }

  if (e.type === 'pump') {
    return e.amountMl != null ? t('sum.pumped', { ml: e.amountMl }) : t('sum.pumpNoAmount');
  }

  if (e.type === 'growth') {
    const parts: string[] = [];
    if (e.weightG != null) parts.push(formatWeight(e.weightG));
    if (e.heightMm != null) parts.push(formatLength(e.heightMm));
    if (e.headMm != null) parts.push(t('sum.head', { v: formatLength(e.headMm) }));
    return parts.length ? parts.join(' · ') : t('sum.growthEmpty');
  }

  if (e.type === 'feed') {
    const parts: string[] = [];
    // 餵法與奶種【都要】顯示，不是二選一。
    // 原本是 `if (milk) ... else if (method) ...`，所以只要填了奶種，
    // 餵法就被吃掉 —— 一筆親餵母奶會顯示成「母奶 18 分」，
    // 完全看不出是親餵；而瓶餵母奶也是從「母奶」開頭，兩者無從分辨。
    if (e.method) parts.push(methodLabel(e.method));
    if (e.milk) parts.push(milkLabel(e.milk));

    if (e.method === 'nursing' && e.side) parts.push(sideLabel(e.side));
    if (e.amountMl) parts.push(`${e.amountMl}ml`);
    if (e.durationMin) parts.push(t('time.min', { n: e.durationMin }));

    return parts.length ? parts.join(' ') : t('sum.feedPlain');
  }

  const parts: string[] = [e.diaperKind ? diaperKindLabel(e.diaperKind) : t('sum.diaperPlain')];
  if (e.stoolCard != null) {
    parts.push(t('stool.summary', { n: stoolCardLabel(e.stoolCard) }));
  } else if (e.diaperColor) {
    // 舊資料
    parts.push(diaperColorLabel(e.diaperColor));
  }
  const summary = parts.join(' · ');

  // ⚠️ 警示符號放在【最前面】，不是最後面。
  // 紀錄列的摘要有行數限制，排在字串尾端的東西是第一個被裁掉的 ——
  // 而這是膽道閉鎖的警示，是整個列表裡最不能被裁掉的一個字元。
  return isStoolCardAbnormal(e.stoolCard) ? `⚠ ${summary}` : summary;
}

/** ml 快選按鈕的數字。刻意不叫鍵盤——半夜單手、腦袋糊，打字是災難。 */
export const ML_PRESETS = [60, 90, 120, 150, 180] as const;

/** 親餵時長快選（補登用） */
export const DURATION_PRESETS = [10, 15, 20, 25, 30] as const;

/** 睡眠時長快選（分鐘）。小睡到夜間長睡都要涵蓋 */
export const SLEEP_PRESETS = [30, 60, 90, 120, 180, 240] as const;

/** 擠奶量快選 */
export const PUMP_PRESETS = [60, 90, 120, 150, 180] as const;
