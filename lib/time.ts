import {
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

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  if (hours < 24) {
    return mins === 0 ? `${hours} 小時前` : `${hours} 小時 ${mins} 分前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
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
    return `出生 ${Math.max(0, days)} 天`;
  }

  const days = differenceInCalendarDays(nowDate, addMonths(birth, months));
  return days === 0 ? `${months} 個月` : `${months} 個月 ${days} 天`;
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
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${format(date, 'M月d日')} ${weekdays[date.getDay()]}`;
}

/** 早安 / 午安 / 晚安 / 深夜辛苦了 */
export function greeting(now: number = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return '深夜辛苦了';
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  if (h < 23) return '晚安';
  return '深夜辛苦了';
}
