/**
 * 多語系的字典與純函式部分。
 *
 * ⚠️ 這個檔案【刻意不 import lib/settings】。
 * settings.tsx 需要 setCurrentLang，如果這裡又 import useSettings 就是循環相依 ——
 * ESM 的 live binding 大多時候會讓它過關，但那是運氣不是設計。
 * 所以 LangKey 定義在這裡，而需要 hook 的 useT() 放在 lib/useT.ts
 * （那個檔案 import 兩邊，本身不被任何人 import 回來）。
 *
 * ── 設計立場 ──
 *
 * 1. 【漏翻譯要是編譯錯誤，不是執行期 fallback】
 *    en 宣告成 Record<Key, string>，少一個 key 就過不了 tsc。
 *    如果讓它 fallback 回中文，半套的英文介面會靜靜出貨 ——
 *    而使用這個語言的人是【只讀英文的照顧者】，她看到的中文等於看不懂。
 *
 * 2. 【t() 有兩種入口】
 *    元件用 useT()（會訂閱語言變更而重繪），
 *    非元件的程式碼（lib/labels.ts 的 summarizeEvent、lib/export.ts 的 CSV 表頭）
 *    用模組層級的 t()。後者讀 currentLang，由 SettingsProvider 同步。
 *
 * 3. 【台灣特有的內容要加註，不能直譯】
 *    九色大便卡是台灣兒童健康手冊的東西，兒童肝膽疾病防治基金會的專線
 *    在國外打不通。英文版必須說明「這是什麼」並指向當地資源，
 *    直譯會讓照顧者以為自己手上也有那張卡、或以為那支電話能打。
 */

export type LangKey = 'zh-TW' | 'en';

export type Params = Record<string, string | number>;

const zh = {
  // ---- tab ----
  'tab.home': '首頁',
  'tab.history': '紀錄',
  'tab.stats': '統計',
  'tab.settings': '設定',

  // ---- 問候 ----
  'greeting.lateNight': '深夜辛苦了',
  'greeting.morning': '早安',
  'greeting.afternoon': '午安',
  'greeting.evening': '晚安',

  // ---- 寶寶卡 ----
  'baby.feedDue': '該餵了',
  'baby.noFeedYet': '還沒有喝奶紀錄',
  'baby.noDiaperYet': '還沒有尿布紀錄',
  'baby.startNursing': '開始親餵',
  'baby.startNursingSide': '親餵 · 建議 {side}',
  'baby.startSleep': '🌙 開始睡覺',
  'action.feed': '喝奶',
  'action.diaper': '尿布',

  // ---- 計時橫幅 ----
  'timer.nursing': '正在餵',
  'timer.nursingOverdue': '還在餵嗎？',
  'timer.sleep': '正在睡',
  'timer.stopNursing': '結束親餵',
  'timer.stopSleep': '結束睡眠',
  'timer.startedAt': '{time} 開始',

  // ---- 今日摘要 ----
  'summary.today': '今天',
  'summary.feeds': '次奶',
  'summary.ml': 'ml',
  'summary.nursingMin': '分親餵',
  'summary.diapers': '片尿布',
  'summary.poops': '次便',
  'summary.sleep': '睡',

  // ---- 首頁的「兩個一起」與擠奶 ----
  'home.bothTitle': '兩個一起',
  'home.bothFeed': '都餵了',
  'home.bothDiaper': '都換了',
  'home.tandemStart': '同時親餵',
  'home.tandemStop': '結束同時哺餵',
  'home.pumpTitle': '擠奶　母乳庫存 {ml} ml',
  'home.pumpButton': '🫗 記一次擠奶',
  'home.loadingBabies': '讀取寶寶資料…',

  // ---- 左右邊 ----
  'side.left': '左',
  'side.right': '右',
  'side.both': '兩側',

  // ---- 通用 ----
  'common.done': '完成',
  'common.cancel': '取消',
  'common.delete': '刪除',
  'common.restore': '復原',
  'common.close': '關閉',
  'common.save': '儲存',
  'common.revert': '還原',
  'common.ok': '好',
} as const;

export type I18nKey = keyof typeof zh;

/**
 * ⚠️ 型別是 Record<I18nKey, string> 而不是 Partial —— 少一個 key 就編譯不過。
 * 這是刻意的：漏翻譯必須在 CI／tsc 就爆，不能等使用者看到中文才發現。
 */
const en: Record<I18nKey, string> = {
  'tab.home': 'Home',
  'tab.history': 'Log',
  'tab.stats': 'Stats',
  'tab.settings': 'Settings',

  'greeting.lateNight': 'Long night',
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',

  'baby.feedDue': 'Feed due',
  'baby.noFeedYet': 'No feeds yet',
  'baby.noDiaperYet': 'No diapers yet',
  'baby.startNursing': 'Start nursing',
  'baby.startNursingSide': 'Nurse · {side} next',
  'baby.startSleep': '🌙 Start sleep',
  'action.feed': 'Feed',
  'action.diaper': 'Diaper',

  'timer.nursing': 'Nursing',
  'timer.nursingOverdue': 'Still nursing?',
  'timer.sleep': 'Sleeping',
  'timer.stopNursing': 'End nursing',
  'timer.stopSleep': 'End sleep',
  'timer.startedAt': 'started {time}',

  'summary.today': 'Today',
  'summary.feeds': 'feeds',
  'summary.ml': 'ml',
  'summary.nursingMin': 'min nursing',
  'summary.diapers': 'diapers',
  'summary.poops': 'poops',
  'summary.sleep': 'sleep',

  'home.bothTitle': 'Both babies',
  'home.bothFeed': 'Both fed',
  'home.bothDiaper': 'Both changed',
  'home.tandemStart': 'Tandem nurse',
  'home.tandemStop': 'End tandem',
  'home.pumpTitle': 'Pumping　Milk stash {ml} ml',
  'home.pumpButton': '🫗 Log a pump',
  'home.loadingBabies': 'Loading babies…',

  'side.left': 'L',
  'side.right': 'R',
  'side.both': 'Both',

  'common.done': 'Done',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.restore': 'Undo',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.revert': 'Discard',
  'common.ok': 'OK',
};

export const DICTS: Record<LangKey, Record<I18nKey, string>> = { 'zh-TW': zh, en };

/**
 * 模組層級的目前語言。給【非元件】的程式碼用
 * （lib/labels.ts 的 summarizeEvent、lib/export.ts 的 CSV 表頭…）。
 * 由 SettingsProvider 在語言變更時同步 —— 見 lib/settings.tsx。
 */
let currentLang: LangKey = 'zh-TW';

export function setCurrentLang(lang: LangKey): void {
  currentLang = lang;
}

export function getCurrentLang(): LangKey {
  return currentLang;
}

export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
}

/** 非元件用。元件請用 useT()，否則語言切換時不會重繪。 */
export function t(key: I18nKey, params?: Params): string {
  return interpolate(DICTS[currentLang][key], params);
}

export const LANGS: { key: LangKey; label: string }[] = [
  { key: 'zh-TW', label: '中文' },
  { key: 'en', label: 'English' },
];
