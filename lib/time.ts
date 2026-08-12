import { getCurrentLang, t } from './i18n';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInMonths,
  format,
  parseISO,
  startOfDay,
} from 'date-fns';

/**
 * 時間格式化。全部自己寫而不用 date-fns 的 formatDistanceToNow，
 * 因為它會輸出「大約 2 小時」——把分鐘吃掉了。
 * 育兒情境下「2 小時 15 分前」和「2 小時 50 分前」是完全不同的決策資訊。
 */

/** 「剛剛」/「40 分鐘前」/「2 小時 15 分前」/「3 天前」 */
export function formatAgo(ms: number, now: number = Date.now()): string {
  const diffMin = Math.floor((now - ms) / 60000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minAgo', { n: diffMin });

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  if (hours < 24) {
    return mins === 0 ? t('time.hourAgo', { h: hours }) : t('time.hourMinAgo', { h: hours, m: mins });
  }

  const days = Math.floor(hours / 24);
  // 英文的 1 day / N days 要分開，中文兩個字典值一樣所以無害
  return t(days === 1 ? 'time.dayAgo_one' : 'time.dayAgo', { n: days });
}

/** 「13:20」 */
export function formatClock(ms: number): string {
  return format(new Date(ms), 'HH:mm');
}

/**
 * 計時器顯示：「12:34」（分:秒）或「1:02:34」（時:分:秒）。
 *
 * ⚠️ 刻意設計成「每次呼叫都用當下時間重算」，不是累加秒數。
 * 這樣 APP 被 Android 系統殺掉、重開之後，計時仍然是正確的
 * （因為真相存在資料庫的 occurredAt，不是存在記憶體的計數器裡）。
 */
export function formatElapsed(fromMs: number, now: number = Date.now()): string {
  const totalSec = Math.max(0, Math.floor((now - fromMs) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 「3 個月 12 天」/「出生 12 天」 */
export function formatBabyAge(birthDate: string, now: number = Date.now()): string {
  const birth = parseISO(birthDate);
  const nowDate = new Date(now);
  const months = differenceInMonths(nowDate, birth);

  if (months < 1) {
    const days = differenceInCalendarDays(nowDate, birth);
    return t('time.ageDays', { d: Math.max(0, days) });
  }

  const days = differenceInCalendarDays(nowDate, addMonths(birth, months));
  return days === 0
    ? t('time.ageMonth', { mo: months })
    : t('time.ageMonthDay', { mo: months, d: days });
}

/** 依當地時區的今天零點（epoch ms） */
export function startOfToday(now: number = Date.now()): number {
  return startOfDay(new Date(now)).getTime();
}

/** 用來把事件分組的日期鍵，'2026-08-05' */
export function dayKey(ms: number): string {
  return format(new Date(ms), 'yyyy-MM-dd');
}

/** 「今天」/「昨天」/「8月3日 週一」 */
export function formatDayLabel(key: string, now: number = Date.now()): string {
  const date = parseISO(key);
  const diff = differenceInCalendarDays(startOfDay(new Date(now)), date);
  if (diff === 0) return t('time.today');
  if (diff === 1) return t('time.yesterday');

  // 日期格式本身也要換：中文是「8月12日 週三」，英文用 date-fns 的預設
  // 英文 locale（Aug 12 · Wed）。這不是字串翻譯，是格式差異，所以不進字典。
  if (getCurrentLang() === 'en') return format(date, 'MMM d · EEE');

  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${format(date, 'M月d日')} ${weekdays[date.getDay()]}`;
}

/** 把某一天的零點往前/往後移 N 天，回傳新的零點。日期導覽用。 */
export function shiftDay(dayStartMs: number, deltaDays: number): number {
  return startOfDay(addDays(new Date(dayStartMs), deltaDays)).getTime();
}

/** 兩個時間點是否落在同一天（依當地時區）。 */
export function isSameDay(aMs: number, bMs: number): boolean {
  return dayKey(aMs) === dayKey(bMs);
}

/** 「今天」/「昨天」/「8月3日 週一」——吃 epoch ms 的版本。 */
export function formatDayLabelMs(ms: number, now: number = Date.now()): string {
  return formatDayLabel(dayKey(ms), now);
}

/**
 * 生日輸入遮罩：只吃數字，自動補上 `-`。
 *
 * 打 `20260624` → 顯示 `2026-06-24`，不用去找 `-` 鍵在哪
 * （模擬器的數字鍵盤上要切換頁面才找得到，實機上也是多一步）。
 *
 * 用 `-` 而不是 `/`：資料庫存的是 ISO 格式，date-fns 的 parseISO() 也只吃 `-`，
 * 統一用 `-` 就不需要在顯示與儲存之間做轉換。
 *
 * 每次都從「原字串裡的數字」重新產生輸出，所以退格會自然運作：
 *   `2026-0` 退格 → 原字串 `2026-` → 數字 `2026` → 輸出 `2026`（連 `-` 一起消失）
 */
export function maskDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

/** 遮罩後的完整長度 `YYYY-MM-DD`，給 TextInput 的 maxLength 用 */
export const DATE_INPUT_MAX_LENGTH = 10;

/** 早安 / 午安 / 晚安 / 深夜辛苦了 */
export function greeting(now: number = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return t('greeting.lateNight');
  if (h < 11) return t('greeting.morning');
  if (h < 18) return t('greeting.afternoon');
  if (h < 23) return t('greeting.evening');
  return t('greeting.lateNight');
}
