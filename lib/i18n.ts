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
  // 英文需要單複數；中文兩個值一樣，所以 _one 只是為了讓兩本字典的 key 對齊
  'summary.feeds': '次奶',
  'summary.feeds_one': '次奶',
  'summary.ml': 'ml',
  'summary.nursingMin': '分親餵',
  'summary.diapers': '片尿布',
  'summary.diapers_one': '片尿布',
  'summary.poops': '次便',
  'summary.poops_one': '次便',
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

  // ---- 時間格式 ----
  'time.justNow': '剛剛',
  'time.minAgo': '{n} 分鐘前',
  'time.hourAgo': '{h} 小時前',
  'time.hourMinAgo': '{h} 小時 {m} 分前',
  'time.dayAgo': '{n} 天前',
  'time.dayAgo_one': '1 天前',
  'time.min': '{n} 分',
  'time.hour': '{h} 小時',
  'time.hourMin': '{h} 小時 {m} 分',
  'time.ageDays': '出生 {d} 天',
  'time.ageMonth': '{mo} 個月',
  'time.ageMonthDay': '{mo} 個月 {d} 天',
  'time.today': '今天',
  'time.yesterday': '昨天',

  // ---- 紀錄頁 ----
  'history.title': '紀錄',
  'history.backToToday': '點一下回到今天',
  'history.returnToday': '回到今天',
  'history.emptyToday': '今天還沒有紀錄。回首頁按下大按鈕就會出現在這裡。',
  'history.emptyOther': '這天沒有紀錄。',
  'history.deleteConfirm': '刪除這筆紀錄？',
  'history.deleteFailed': '刪不掉',
  'history.undoFailed': '復原失敗',
  'history.deletedOne': '已刪除',
  'history.deletedMany': '已刪除 {n} 筆',
  'history.undoAll': '全部復原',
  'history.mother': '媽媽',
  'history.noBaby': '—',
  'history.inProgress': '進行中',

  // ---- 統計頁 ----
  'stats.title': '統計',
  'stats.milkStash': '母乳庫存',
  'stats.stashBreakdown': '擠出 {pumped} ml − 瓶餵母奶 {used} ml',
  'stats.stashNegativeTitle': '瓶餵的母奶比記錄到的擠奶多了 {n} ml。',
  'stats.stashNegativeWhy':
    '通常是這兩個原因：開始用這個 APP 之前就有冷凍庫存，或有幾次擠奶忘了記。庫存只能從紀錄推導，所以先當成 0。',
  'stats.stashNote':
    '這個數字是從紀錄推導的，不是另外存的欄位。也就是說：它只反映你【記下來的】擠奶與瓶餵，沒記到的不會憑空出現。',
  'stats.recentDays': '{name} · 最近 {days} 天',
  'stats.barBottleMl': '每日瓶餵奶量 ml',
  'stats.barNursingTime': '每日親餵時間',
  'stats.barSleep': '每日睡眠',
  'stats.barDiapers': '每日尿布片數',
  'stats.avg': '{days} 天平均 {value}',
  'stats.daysWithData': '　有記錄 {n} 天',
  'stats.daysWithData_one': '　有記錄 {n} 天',
  'stats.sharedScaleNote': '兩寶同一項的長條圖用【同一個刻度】，所以上下並排可以直接比高低。',
  'stats.windowNote': '趨勢只算最近 {days} 天，且來源是最近 1000 筆紀錄 —— 再往前的日子可能顯示為 0。',
  'stats.growthTitle': '生長對照',
  'stats.weight': '體重',
  'stats.height': '身長',
  'stats.head': '頭圍',
  'stats.logGrowth': '記錄 {name}',
  'stats.whoNote':
    '兩寶疊在同一個座標系比較。WHO 百分位需要官方的 LMS 參考表，那是醫療數據不能憑估計填，所以尚未加入。',

  // ---- 生長曲線 ----
  'growth.empty': '還沒有這項測量的紀錄。量過之後這裡會出現曲線。',
  'growth.deltaSameDay': '最新差距 {value}（{date} 同一天量的）',
  'growth.deltaDiffDay': '最新差距 {value}　⚠ 不是同一天量的：{a} {aDate}、{b} {bDate}',

  // ---- 讀取失敗 ----
  'error.queryTitle': '⚠ 讀取{what}時出錯',
  'error.queryHint':
    '這個畫面上的數字可能不完整或全部是 0，不要當成真的。\n請先到「設定 → 匯出 JSON 備份」把資料存出來，再截圖這段訊息。',
  'error.whatBabies': '寶寶資料',
  'error.whatRecentEvents': '最近的紀錄',
  'error.whatDayEvents': '這一天的紀錄',
  'error.whatGrowth': '生長紀錄',
  'error.whatStash': '母乳庫存',

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
  'summary.feeds_one': 'feed',
  'summary.ml': 'ml',
  'summary.nursingMin': 'min nursing',
  'summary.diapers': 'diapers',
  'summary.diapers_one': 'diaper',
  'summary.poops': 'poops',
  'summary.poops_one': 'poop',
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

  'time.justNow': 'just now',
  'time.minAgo': '{n} min ago',
  'time.hourAgo': '{h} hr ago',
  'time.hourMinAgo': '{h} hr {m} min ago',
  'time.dayAgo': '{n} days ago',
  'time.dayAgo_one': '1 day ago',
  'time.min': '{n} min',
  'time.hour': '{h} hr',
  'time.hourMin': '{h} hr {m} min',
  'time.ageDays': '{d} days old',
  'time.ageMonth': '{mo} mo',
  'time.ageMonthDay': '{mo} mo {d} d',
  'time.today': 'Today',
  'time.yesterday': 'Yesterday',

  'history.title': 'Log',
  'history.backToToday': 'tap to jump to today',
  'history.returnToday': 'Back to today',
  'history.emptyToday': 'Nothing logged today yet. Tap a big button on Home and it shows up here.',
  'history.emptyOther': 'Nothing logged on this day.',
  'history.deleteConfirm': 'Delete this entry?',
  'history.deleteFailed': "Couldn't delete",
  'history.undoFailed': "Couldn't undo",
  'history.deletedOne': 'Deleted',
  'history.deletedMany': 'Deleted {n}',
  'history.undoAll': 'Undo all',
  'history.mother': 'Mum',
  'history.noBaby': '—',
  'history.inProgress': 'in progress',

  'stats.title': 'Stats',
  'stats.milkStash': 'Milk stash',
  'stats.stashBreakdown': 'pumped {pumped} ml − bottled breast milk {used} ml',
  'stats.stashNegativeTitle': "You've bottle-fed {n} ml more breast milk than you logged pumping.",
  'stats.stashNegativeWhy':
    'Usually one of two reasons: you had a freezer stash before you started using this app, or a few pump sessions went unlogged. The stash can only be derived from what you log, so it shows 0 for now.',
  'stats.stashNote':
    'This number is derived from your entries, not stored separately. It only reflects the pumping and bottle-feeding you actually logged — nothing appears out of thin air.',
  'stats.recentDays': '{name} · last {days} days',
  'stats.barBottleMl': 'Bottle ml per day',
  'stats.barNursingTime': 'Nursing time per day',
  'stats.barSleep': 'Sleep per day',
  'stats.barDiapers': 'Diapers per day',
  'stats.avg': '{days}-day avg {value}',
  'stats.daysWithData': '　{n} days with data',
  'stats.daysWithData_one': '　{n} day with data',
  'stats.sharedScaleNote':
    'Both babies share the same scale for each metric, so you can compare the bars directly.',
  'stats.windowNote':
    'Trends cover the last {days} days, drawn from the most recent 1000 entries — anything older may show as 0.',
  'stats.growthTitle': 'Growth',
  'stats.weight': 'Weight',
  'stats.height': 'Length',
  'stats.head': 'Head',
  'stats.logGrowth': 'Log {name}',
  'stats.whoNote':
    'Both babies on one set of axes. WHO percentiles need the official LMS reference tables — that is clinical data and cannot be estimated, so it is not included.',

  'growth.empty': 'No measurements yet. Once you log one, the curve appears here.',
  'growth.deltaSameDay': 'Latest gap {value} (both measured {date})',
  'growth.deltaDiffDay':
    'Latest gap {value}　⚠ not measured on the same day: {a} {aDate}, {b} {bDate}',

  'error.queryTitle': "⚠ Couldn't load {what}",
  'error.queryHint':
    'Numbers on this screen may be incomplete or all zero — do not trust them.\nGo to Settings → Export JSON backup to save your data first, then screenshot this message.',
  'error.whatBabies': 'baby profiles',
  'error.whatRecentEvents': 'recent entries',
  'error.whatDayEvents': "this day's entries",
  'error.whatGrowth': 'growth entries',
  'error.whatStash': 'milk stash',

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

/**
 * 依數量挑單數或複數的 key。
 *
 * ⚠️ 這不是可選的雞毛蒜皮。實機截圖上出現過「1 days with data」——
 * 而英文版的讀者是【母語使用者】，那一眼就看得出是機器翻的。
 * 中文兩個字典值一樣，所以這個函式在中文下是 no-op。
 *
 * 用法：tr(plural(n, 'summary.feeds'), { n })
 * 慣例：複數 key 是基底，單數 key 加 `_one` 後綴。
 */
export function plural<K extends I18nKey>(count: number, base: K): I18nKey {
  if (count !== 1) return base;
  const one = `${base}_one` as I18nKey;
  return one in DICTS['zh-TW'] ? one : base;
}

/** 非元件用。元件請用 useT()，否則語言切換時不會重繪。 */
export function t(key: I18nKey, params?: Params): string {
  return interpolate(DICTS[currentLang][key], params);
}

export const LANGS: { key: LangKey; label: string }[] = [
  { key: 'zh-TW', label: '中文' },
  { key: 'en', label: 'English' },
];
