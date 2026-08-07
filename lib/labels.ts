import type { BabyEvent } from '../db/schema';

/** 中文標籤對照。UI 一律用這裡的字，不要在元件裡散落硬字串。 */

export const TYPE_LABEL = {
  feed: '喝奶',
  diaper: '尿布',
  sleep: '睡覺',
  pump: '擠奶',
  growth: '生長',
} as const;

export const TYPE_EMOJI = {
  feed: '🍼',
  diaper: '💧',
  sleep: '🌙',
  pump: '🫗',
  growth: '📏',
} as const;

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
  return n === STOOL_CARD_UNSURE ? '說不準' : String(n);
}

export const STOOL_CARD_ALERT =
  '這個顏色屬於需要注意的範圍。膽道閉鎖若能在出生 60 天內接受葛西手術，10 年存活率可達 73%，越早發現越好。\n\n請盡快帶寶寶就醫，並在滿 30 天打 B 肝疫苗時主動請醫護人員做大便顏色評估。\n\n兒童肝膽疾病防治基金會諮詢專線：(02) 2382-0886（平日 8:30–17:30）';

/** 舊資料用的自由顏色欄位，已從 UI 移除，僅保留顯示 */
export const DIAPER_COLOR_SWATCH = {
  yellow: '#E3C15C',
  green: '#7FA05C',
  brown: '#8A6244',
  black: '#3A322C',
  white: '#EFEAE2',
} as const;

export const SEX_LABEL = { boy: '男寶', girl: '女寶' } as const;

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
  if (h === 0) return `${m} 分`;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

/** 一行摘要：「配方 120ml」/「親餵 左 18 分」/「尿+便 · 大便卡 3 ⚠」/「睡 2 小時 15 分」 */
export function summarizeEvent(e: BabyEvent): string {
  if (e.type === 'sleep') {
    if (e.status === 'active') return '正在睡';
    return e.durationMin != null ? `睡 ${formatMinutes(e.durationMin)}` : '睡覺';
  }

  if (e.type === 'pump') {
    return e.amountMl != null ? `擠出 ${e.amountMl}ml` : '擠奶';
  }

  if (e.type === 'growth') {
    const parts: string[] = [];
    if (e.weightG != null) parts.push(formatWeight(e.weightG));
    if (e.heightMm != null) parts.push(formatLength(e.heightMm));
    if (e.headMm != null) parts.push(`頭圍 ${formatLength(e.headMm)}`);
    return parts.length ? parts.join(' · ') : '生長紀錄';
  }

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
  if (e.stoolCard != null) {
    // 異常編號加上警示符號，這樣在紀錄列表裡掃一眼就看得到
    parts.push(`大便卡 ${stoolCardLabel(e.stoolCard)}${isStoolCardAbnormal(e.stoolCard) ? ' ⚠' : ''}`);
  } else if (e.diaperColor) {
    // 舊資料
    parts.push(DIAPER_COLOR_LABEL[e.diaperColor]);
  }
  return parts.join(' · ');
}

/** ml 快選按鈕的數字。刻意不叫鍵盤——半夜單手、腦袋糊，打字是災難。 */
export const ML_PRESETS = [60, 90, 120, 150, 180] as const;

/** 親餵時長快選（補登用） */
export const DURATION_PRESETS = [10, 15, 20, 25, 30] as const;

/** 睡眠時長快選（分鐘）。小睡到夜間長睡都要涵蓋 */
export const SLEEP_PRESETS = [30, 60, 90, 120, 180, 240] as const;

/** 擠奶量快選 */
export const PUMP_PRESETS = [60, 90, 120, 150, 180] as const;
