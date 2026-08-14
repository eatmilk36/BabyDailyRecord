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

  // ---- 紀錄類型與欄位值 ----
  'type.feed': '喝奶',
  'type.diaper': '尿布',
  'type.sleep': '睡覺',
  'type.pump': '擠奶',
  'type.growth': '生長',
  'method.bottle': '瓶餵',
  'method.nursing': '親餵',
  'milk.breast': '母奶',
  'milk.formula': '配方',
  'milk.mixed': '混合',
  'diaperKind.pee': '尿',
  'diaperKind.poop': '便',
  'diaperKind.both': '尿+便',
  'sex.boy': '男寶',
  'sex.girl': '女寶',

  // ---- 一行摘要 ----
  'sum.sleeping': '正在睡',
  'sum.slept': '睡 {dur}',
  'sum.sleepNoDur': '睡覺',
  'sum.pumped': '擠出 {ml}ml',
  'sum.pumpNoAmount': '擠奶',
  'sum.head': '頭圍 {v}',
  'sum.growthEmpty': '生長紀錄',
  'sum.feedPlain': '喝奶',
  'sum.diaperPlain': '尿布',

  // ---- 彈窗欄位 ----
  'field.occurredAt': '發生時間',
  'field.earlierBy': '早 {n} 分',
  'field.method': '餵法',
  'field.milk': '奶種',
  'field.side': '哪一邊',
  'field.nursingDuration': '親餵時長',
  'field.amountDrunk': '實際喝掉的量',
  'field.diaperKind': '類型',
  'field.sleepDuration': '睡了多久',
  'field.pumpAmount': '擠出的量',
  'field.custom': '自訂',
  'field.minutes': '分鐘',
  'field.weight': '體重',
  'field.height': '身長',
  'field.head': '頭圍',
  'note.deductsStash': '這筆會從母乳庫存扣掉。',
  'note.addsStash': '這筆會加進母乳庫存。',
  'note.stillSleeping': '還在睡。回首頁按「結束」才會算時長。',
  'note.growthUnits': '內部用公克／公釐這種整數存，避免浮點數累積誤差。',

  // ---- 九色大便卡（醫療）----
  //
  // ⚠️⚠️ 這一區的英文【不是翻譯，是加註】。三個理由：
  //
  //  1.「九色大便卡」是台灣兒童健康手冊裡的一張【實體卡片】。只讀英文的照顧者
  //     看到 "nine-colour stool card" 不會知道要去翻哪一本、哪一頁 —— 所以英文版
  //     把中文原名一起寫出來，讓他能拿著手冊認字比對。少了這個加註，整個功能
  //     對他來說是不可用的。
  //  2. 諮詢專線是台灣號碼而且只有中文服務。直譯成 "helpline: (02) 2382-0886"
  //     會讓一個只講英文的照顧者打過去卡住 —— 那是在最不該浪費時間的情況下
  //     浪費時間。英文版明講「台灣號碼、中文接線」並給替代路徑（直接看小兒科、
  //     把尿布給醫師看）。
  //  3. 滿 30 天打 B 肝疫苗是台灣的常規接種時程。英文版要點出那是「你本來就會去
  //     的那次門診」，否則讀起來像在叫他為這件事多跑一趟。
  //
  // 醫學數字（60 天、葛西手術、10 年存活率 73%）兩個版本【完全一致】。
  // 加註只加脈絡，不動事實 —— 這是加註與改寫的界線。
  'stool.pickHint': '選「便」或「尿+便」會展開九色大便卡，可以記下大便顏色編號。',
  'stool.compareHint1': '拿出寶寶手冊裡的「九色大便卡」，對照實體卡片後點下最接近的編號。',
  'stool.compareHint2': '手機螢幕沒有色彩校準（而你現在可能把亮度調到最低），所以這裡不放色塊。',
  'stool.sectionNormal': '正常（7–9）',
  'stool.sectionWatch': '需要注意（1–6）',
  'stool.unsure': '說不準',
  'stool.alertTitle': '請盡快就醫',
  'stool.alertBody':
    '這個顏色屬於需要注意的範圍。膽道閉鎖若能在出生 60 天內接受葛西手術，10 年存活率可達 73%，越早發現越好。\n\n請盡快帶寶寶就醫，並在滿 30 天打 B 肝疫苗時主動請醫護人員做大便顏色評估。\n\n兒童肝膽疾病防治基金會諮詢專線：(02) 2382-0886（平日 8:30–17:30）',
  'stool.inlineWarn1': '⚠ 這個編號需要就醫評估。滿 30 天打 B 肝疫苗時務必主動請醫護人員看大便顏色。',
  'stool.inlineWarn2': '兒童肝膽疾病防治基金會：(02) 2382-0886',
  'stool.summary': '大便卡 {n}',
  /** CSV 的「大便卡異常」欄。表頭本身還是中文（第 5 批），但值跟著語言走 */
  'stool.csvAbnormal': '異常',

  // 舊資料的自由顏色欄位。UI 已經移除，只剩顯示與匯出還會用到
  'color.yellow': '黃',
  'color.green': '綠',
  'color.brown': '褐',
  'color.black': '黑',
  'color.white': '白',

  // ---- 單寶彈窗 ----
  'modal.eventTitle': '紀錄細節',
  'modal.sessionTitle': '兩寶紀錄',
  'modal.pumpHeader': '擠奶',
  'modal.savedAt': '✓ 已儲存 {time}',
  'modal.allOptional': '全部欄位都可以不填，每次改動都已經存好了。',
  'modal.notFoundOne': '找不到這筆紀錄',
  'modal.notFoundSession': '找不到這組紀錄',
  'modal.deleteOne': '刪除這筆紀錄',
  'modal.deleteTwo': '刪除這兩筆紀錄',
  'modal.deleteOneAsk': '刪除這筆紀錄？',
  'modal.deleteTwoAsk': '刪除這兩筆紀錄？',
  'modal.deleteWarn': '刪除後這一頁會出現「復原」，離開這一頁就不能復原了。',
  'modal.deletedOne': '已刪除這筆紀錄',
  'modal.deletedTwo': '已刪除這兩筆紀錄',
  'modal.noUndoAfterLeave': '離開這一頁之後就沒有復原入口了。',
  'modal.saveFailed': '存不進去',

  // ---- 雙寶連動 ----
  'link.bothSaved': '✓ 兩筆都已儲存',
  'link.hintLine1': '改其中一位，另一位會自動跟著變（不分上下，兩邊都會）。',
  'link.hintLine2': '改過的那一位就不再跟著變，卡片上會標出來，可以按一下改回去。',
  'link.hintTimeAlways': '時間永遠兩邊同步',
  'link.hintSep': '；',
  'link.hintNeverMirror': '左右邊與大便卡編號永遠不連動',
  'link.hintWhy': '—— 那是各自的觀察，不該被複製。',
  'link.willFollow': '會跟著另一位變',
  'link.wontFollow': '不跟著變 · 改回去',
  'link.syncedTo': '↕ 已同步到 {names}',
  'link.otherBaby': '另一位',
  /** 名字之間的分隔符。中文用頓號、英文用逗號＋空白 —— 這是標點差異不是翻譯 */
  'link.nameJoin': '、',

  // ---- 通用 ----
  'common.done': '完成',
  'common.cancel': '取消',
  'common.delete': '刪除',
  'common.restore': '復原',
  'common.close': '關閉',
  'common.save': '儲存',
  'common.revert': '還原',
  'common.ok': '好',
  /** 寶寶還沒取名時的稱呼。⚠️ 不要用「寶寶」當硬字串，雙胞胎兩個都叫寶寶等於沒標示 */
  'common.babyFallback': '寶寶',

  // ---- 啟動畫面 ----
  // ⚠️ 這兩句在 SettingsProvider 掛上【之前】就會顯示，所以只能走模組層級的 t()，
  //    而那時 currentLang 還是預設的 zh-TW（設定還沒從資料庫讀出來）。
  //    英文使用者在這半秒會看到中文 —— 這是可接受的，因為替代方案是
  //    「資料庫壞掉時什麼都不顯示」。
  'splash.dbError': '資料庫錯誤：{msg}',
  'splash.preparing': '準備中…',

  // ---- 深淺模式的三個選項 ----
  // ⚠️ mode.auto 的值被 settings.themeModeNote2 用彎引號引用（兩本字典都是）。
  //    兩邊要一字不差，否則說明文字會指向一顆畫面上不存在的按鈕。
  'mode.auto': '跟隨系統',
  'mode.light': '淺色',
  'mode.dark': '深色',

  // ---- 設定頁 ----
  // run() 的共用錯誤標題：匯出 JSON／匯出 CSV／匯入／測試通知四件事都走這裡，
  // 所以不能寫死是哪一件。
  'settings.opFailed': '失敗',
  // ⚠️ 刻意只講「檔案產生了」不講「備份完成」—— shareAsync 不回報使用者最後有沒有
  //    真的存檔，宣稱完成會是假的。
  'settings.exportDoneTitle': '檔案已產生',
  'settings.exportCounts': '寶寶 {babies} 筆、紀錄 {events} 筆',
  // ⚠️ 原本是兩個字串字面值用 + 接起來的，這裡合成一個 key（畫面上本來就是同一行）。
  //    「 —— 」前後的空白是原字面值就有的，照抄不要順手改。
  //    LINE 不加註：在台灣的照顧者本來就會在分享選單裡看到它。
  'settings.exportVerifyNote':
    '⚠️ 分享選單開過不等於存好了。請到你選的目的地（雲端硬碟、LINE…）確認檔案真的在那裡 —— 這是這個 APP 唯一的備份途徑。',
  'settings.importDoneTitle': '匯入完成',
  'settings.importBabies': '寶寶：新增 {added}、跳過 {skipped}',
  'settings.importEvents': '紀錄：新增 {added}、跳過 {skipped}',
  'settings.importSkipNote': '已存在的 id 一律跳過，不會覆蓋現有資料。',
  // 字面值跟 tab.settings 一樣，但比照 history.title／stats.title 的慣例各留一個 key ——
  // tab 標籤和頁標題會各自演化（例如 tab 要縮短），共用一個 key 之後就分不開了。
  'settings.title': '設定',
  /** 這一區固定列出兩張雙胞胎的卡，所以英文用複數 */
  'settings.sectionBaby': '寶寶',
  'settings.sectionAppearance': '外觀',
  // ⚠️ 引號裡的是畫面上那顆按鈕的名字，必須跟 settings.exportJson 一字不差（英文也一樣）。
  'settings.appearanceNote':
    '語言、皮膚與深淺模式會跟著「匯出 JSON 備份」一起帶走，換手機不用重設。',
  // ⚠️ 兩本字典都刻意保留【雙語】，這不是漏翻。這是「介面還不是你的語言時」唯一要找得到
  //    的標籤：中文介面下英文照顧者要認得 Language，英文介面下中文使用者要認得「語言」。
  //    順序是介面自己的語言擺前面。
  'settings.langLabel': '語言 / Language',
  // ⚠️ 這句本身就是在講加註原則，所以英文版自己也必須示範加註：把「九色大便卡」的中文
  //    原名寫進去。原始 JSX 是三行，換行處的空白是排版折行擠出來的、不是作者打的，
  //    搬進字典時要拿掉。
  'settings.langNote1':
    '英文版是給只讀英文的照顧者用的。台灣特有的內容（九色大便卡、兒童肝膽疾病防治基金會專線）在英文版會加上說明，不是直譯 —— 因為那張卡在寶寶手冊裡、那支電話在國外打不通。',
  // ⚠️ 這一句是【改寫】不是照抄。原文是「翻譯還在分批進行，目前只有一部分畫面切得動」，
  //    這一批做完就變成假的了。改寫時順手把 BUILD_NOTES 講清楚：lib/build.ts 刻意永遠
  //    不翻譯，英文使用者捲到「關於」會看到一整串中文，沒有這句話會以為是壞掉。
  'settings.langNote2':
    '現在所有畫面都切得動了。只有這頁最下面的版本更新說明刻意保持中文 —— 那是拿來核對 bundle 版本的。',
  // 沒有直譯成 Skin：程式裡的型別叫 SkinKey 是內部詞彙，畫面上要用照顧者看得懂的說法，
  // 而且要跟隔壁的「深淺模式」明確分開。
  'settings.skinLabel': '皮膚',
  'settings.themeModeLabel': '深淺模式',
  // 原始 JSX 折成兩行，「兩個寶寶，」後面那個空白是折行造成的，不要帶進字典。
  'settings.themeModeNote1':
    '深色模式在這個 APP 不只是偏好 —— 半夜開燈會吵醒兩個寶寶，所以深色版是低亮度的「夜燈」，不是把淺色反過來。',
  // ⚠️ 引號裡是 mode.auto 的字面值。兩個 key 要一起改，否則說明會指向一顆畫面上叫別的
  //    名字的按鈕。
  'settings.themeModeNote2': '「跟隨系統」會照你手機的自動深色排程走。',
  'settings.sectionBackup': '備份',
  'settings.backupNote1': '這個版本資料只存在這台手機。建議每週匯出一次 JSON 丟到雲端硬碟。',
  // ⚠️ 跟 backupNote1 之間的 {'\n\n'} 留在 JSX 裡，不要包進字典值 —— 空行是排版，不是字。
  'settings.backupNote2':
    '另外：現在資料存在 Expo Go 的沙箱裡。之後如果把 APP 裝成獨立的 APK，要先在這裡匯出 JSON、再到新 APP 匯入，資料才會跟著搬過去。',
  // ⚠️ 四顆按鈕共用（匯出 JSON／匯出 CSV／匯入／測試通知）。這是【顯示文字】，判斷該不該
  //    顯示它是靠 busy 的識別碼，不是靠比對這個字串 —— 詳見 BusyJob 的註解。
  //    省略號是單一字元 …，不是三個點。
  'settings.working': '處理中…',
  // ⚠️ 這顆按鈕的名字被三個地方引用：settings.appearanceNote、lock.saveFailedBody、
  //    以及【已存在的】error.queryHint（「Go to Settings → Export JSON backup」）。
  //    改英文字要三處一起改，否則錯誤訊息會叫使用者去按一顆不存在的按鈕。
  'settings.exportJson': '匯出 JSON 備份',
  'settings.exportCsv': '匯出 CSV（給醫生看）',
  'settings.importJson': '從 JSON 匯入',
  'settings.sectionNotifications': '通知',
  // ⚠️ 兩個引號裡的字都是別的 key 的字面值：「還在餵嗎？」是 timer.nursingOverdue、
  //    「結束」是 timer.stopNursing。英文引用時要跟那兩個 key 一致。
  //    {min} 由 NURSING_OVERDUE_MIN 傳入，不要寫死 60。
  'settings.notifyNote1':
    '開始親餵時會排一則 {min} 分鐘後的「還在餵嗎？」提醒，按結束就會取消。這是手機自己排的本地通知，不需要網路也不經過任何伺服器。',
  'settings.notifyNote2':
    '第一次開始親餵時會請求通知權限。拒絕也沒關係，記錄完全不受影響，只是少了鎖屏提醒、仍然會在 APP 內顯示警示橫幅。',
  // ⚠️ 加註而不是直譯。Android 的電池最佳化清單顯示的是 app.json 裡的 name，也就是中文的
  //    「寶寶日誌」；只讀英文的人拿到 Baby Daily Log 會在清單裡找不到任何東西。所以英文版
  //    把中文原名留著，並且明講現在該找的其實是 Expo Go 那一列。
  'settings.notifyNote3':
    '⚠️ 小米／華為／OPPO 等系統的省電機制可能延遲或吃掉通知。若提醒沒出現，去系統設定把「寶寶日誌」（Expo Go）排除在電池最佳化之外。',
  // ⚠️ 不要退回舊名「測試通知權限」。只讀權限旗標是假的安心感，這顆按鈕的意義就在於它
  //    真的送一則出去，名字必須說到做到。
  'settings.sendTest': '發送測試通知',
  'settings.noPermTitle': '沒有通知權限',
  'settings.noPermBody': '你之前拒絕過通知權限，要到系統設定裡手動開啟。記錄功能完全不受影響。',
  // {sec} 來自 TEST_NOTIFICATION_DELAY_SEC，目前固定是 8，所以沒有配 _one 單數 key
  // （永遠不會渲染到的 key 只是負擔）。⚠️ 哪天那個常數改成 1，這裡要補
  // settings.testScheduledTitle_one 並改用 plural()。
  'settings.testScheduledTitle': '{sec} 秒後會送出',
  // 中文的【】是強調，英文沒有對應的排版（Alert 不能用粗體），改用語序把 now 提到前面來
  // 承擔重音 —— 比照字典裡其他句子的處理方式，不要硬塞 *星號* 或全大寫。
  'settings.testStep1': '現在請【把螢幕關掉】，然後等一下。',
  'settings.testSeen': '看到通知 = 鎖屏提醒會正常送到。',
  'settings.testNotSeen': '沒看到 = 被省電機制吃掉了，要去系統設定把 Expo Go 排除在電池最佳化之外。',
  'settings.testWhy': '權限有開不代表送得到，所以只能用實際送一則來確認。',
  'settings.sectionAbout': '關於',
  // ⚠️ 加註而不是直譯。app.json 的 name 是「寶寶日誌」，桌面圖示、通知、系統的電池清單
  //    顯示的都是這四個字；只給英文名字會讓照顧者對不起來手機上看到的東西。
  //    版本號 v1 兩版必須一致。
  'settings.aboutName': '寶寶日誌 v1',
  'settings.aboutSync': '資料只存在這台手機。兩人共用同一份紀錄需要一個同步伺服器，尚未實作。',
  // ⚠️ 只有「版本」兩個字進字典，{tag} 是 BUILD_TAG 原樣帶入。BUILD_TAG 本身是中文而且
  //    刻意不翻譯（lib/build.ts 不准動）。
  'settings.buildTag': '版本 {tag}',
  // ⚠️ 這行底下接的是 BUILD_NOTES，那是刻意不翻譯的中文條列，所以英文介面會出現
  //    「英文標題 + 中文清單」。這不是漏翻，理由已經寫在 settings.langNote2 裡告訴使用者了。
  'settings.buildNotesHeading': '這一版應該有：',
  /** Reload 不翻譯 —— 那是 Expo Go 開發者選單上的英文原字，翻成中文反而找不到 */
  'settings.buildMismatch':
    '對不上就是 Expo Go 還在跑舊的 JS：搖手機叫出開發者選單按 Reload，或強制關閉 Expo Go 後重新輸入網址載入。',
  'settings.errNameEmpty': '名字不能空白',
  // ⚠️ 範例日期兩版【必須完全一樣】。這裡示範的是 ISO 格式，換成 24/06/2026 之類的在地
  //    寫法會讓使用者打出存不進去的字串。
  'settings.errBirthFormat': '生日格式要像 2026-06-24',
  'settings.errBirthFuture': '生日不能在未來',
  'settings.namePlaceholder': '名字',
  // YYYYMMDD 不翻譯：那是要照著打的格式本身。中文用全形括號、英文用半形括號加前置空白。
  'settings.birthPlaceholder': 'YYYYMMDD（直接打數字）',
  'settings.saving': '儲存中…',
  // ⚠️ 這是整個編輯機制唯一的「你的修改還沒進去」訊號，英文要保留 yet —— 少了它讀起來
  //    像存檔失敗，那是另一回事（存檔失敗走 modal.saveFailed）。
  'settings.unsaved': '尚未儲存',

  // ---- 皮膚 ----
  // ⚠️ 三個 blurb 都是短語不是句子，所以句尾【不加句點】，兩本字典一致。
  //    中文的「——」緊貼前字（原字面值就是這樣，照抄），英文的 em dash 前後要空格。
  'skin.warmwood': '奶油暖木',
  'skin.warmwoodBlurb': '木地板、藤編、暖色燈泡——「家」的語言',
  'skin.sakura': '粉櫻',
  'skin.sakuraBlurb': '玫瑰粉 + 薰衣草紫，柔和不刺眼',
  'skin.seasalt': '海鹽藍',
  'skin.seasaltBlurb': '冷色低刺激，白天看最清爽',

  // ---- 新手引導 ----
  'onboard.title': '歡迎',
  // ⚠️ 原文在 JSX 裡跨行縮排，JSX 會把換行＋縮排折成單一空白，所以字典值是折疊後的單行，
  //    不要留跳行。
  'onboard.subtitle': '先告訴我兩個寶寶的名字，之後在設定裡都可以改。',
  'onboard.babyOneLabel': '第一個寶寶',
  // ⚠️ 這是【在地化不是翻譯】。「小熊」是中文語境的可愛示範小名，直譯成 "Little Bear"
  //    或音譯成 "Xiao Xiong" 都會讓英文讀者以為那是真的名字。英文取同一個語域（對嬰兒
  //    的暱稱）而不是同一個字面。與 onboard.babyTwoPlaceholder 是成對的動物暱稱，
  //    改字要一起改。
  'onboard.babyOnePlaceholder': '例如：小熊',
  'onboard.babyTwoLabel': '第二個寶寶',
  // ⚠️ 同上，在地化不是翻譯。與 onboard.babyOnePlaceholder 成對（熊／兔），英文也要維持
  //    成對的可愛暱稱感，讓人一眼看出是示範不是預設值。
  'onboard.babyTwoPlaceholder': '例如：小兔',
  // ⚠️ 這行在 SexPicker 裡面，而 SexPicker 已經有 `const t = useTheme()` —— i18n 的 hook
  //    必須叫 tr。選項本身走 sexLabel()（sex.boy／sex.girl 已在字典裡），不要另外開 key。
  'onboard.sexLabel': '性別（選填）',
  'onboard.birthLabel': '出生日期（兩個寶寶共用）',
  // ⚠️ 括號裡講的是 maskDateInput 的行為：分隔線會自動補，使用者只要打數字。英文不能只
  //    留 "YYYYMMDD" —— 那會讓人去數字鍵盤裡翻找「-」鍵（那正是當初加遮罩要解決的事）。
  'onboard.birthPlaceholder': 'YYYYMMDD（直接打數字）',
  /** 範例日期兩版一字不動 —— 它同時在示範分隔線的樣子 */
  'onboard.birthFormatHint': '格式要像 2026-06-24',
  'onboard.birthFuture': '出生日期不能在未來',
  // ⚠️ 破折號前後的空白是原字面就有的（`${formatBabyAge(birth)} — 對嗎？`），照抄不要改成
  //    中文慣例的緊貼寫法，否則畫面會變動。{age} 由 formatBabyAge() 產生，它已經走
  //    time.ageDays／ageMonth／ageMonthDay，不需要再翻。
  'onboard.ageConfirm': '{age} — 對嗎？',
  /** 結尾是全形刪節號 …（單一字元），不是三個點 */
  'onboard.creating': '建立中…',
  'onboard.start': '開始使用',
  'onboard.needNames': '兩個寶寶的名字都要填。',
  'onboard.needBirth': '出生日期還沒填好。',
  // ⚠️ 原文在 JSX 裡跨兩行，換行＋縮排會折成一個空白，所以「重新建立 —— 不然」中間
  //    【只有一個空白】，字典值要寫成折疊後的單行。數字 4 兩版一致。
  'onboard.importHint':
    '換手機或從 Expo Go 搬到獨立 APP？先匯入備份，不要在這裡重新建立 —— 不然匯入之後會變成 4 個寶寶，而多出來的兩個沒辦法刪。',
  'onboard.importButton': '我有備份要匯入',
  /** 結尾是全形刪節號 …，與 onboard.creating 一致 */
  'onboard.importing': '匯入中…',
  // Alert 的內文是 e.message（原始錯誤字串），不翻譯也不進字典。
  // 英文的縮寫用直單引號，比照現有的 "Couldn't delete"／"Couldn't save"。
  'onboard.createFailedTitle': '建立失敗',
  /** 內文同樣是 e.message，不進字典 */
  'onboard.importFailedTitle': '匯入失敗',
  // ⚠️ 設定頁有同字面的 Alert（settings.importDoneTitle），但兩邊內文不同，
  //    各自留 key，不要跨檔共用。
  'onboard.importDoneTitle': '匯入完成',
  // ⚠️ 結尾的跳行是原字面的一部分（兩行用 + 串起來），留在字典值裡，套用時維持同樣的
  //    兩行兩 key、不要合併。中文用頓號、英文用逗號＋空白 —— 這是標點差異不是翻譯，
  //    比照 link.nameJoin。
  'onboard.importDoneBabies': '寶寶：新增 {added}、跳過 {skipped}\n',
  /** 最後一行沒有跳行。「紀錄」譯 entries，比照 error.whatRecentEvents */
  'onboard.importDoneEvents': '紀錄：新增 {added}、跳過 {skipped}',
  'onboard.importNoBabiesTitle': '匯入完成，但沒有加入寶寶',
  // ⚠️ 結尾跳行是原字面的一部分，保留。英文刻意寫成不隨單複數變形的說法
  //    （不是 "{n} babies skipped"），所以不需要 plural() 與 _one key。
  'onboard.importNoBabiesLine1': '這份備份裡的寶寶都已經存在（跳過 {n} 筆）。\n',
  // ⚠️ 結尾是兩個跳行（空一行），照抄。英文用冒號句式避開單複數（"1 entries" 那種機翻
  //    感），所以不需要 _one key。
  'onboard.importNoBabiesLine2': '紀錄新增 {n} 筆。\n\n',
  /** 最後一行沒有跳行 */
  'onboard.importNoBabiesLine3': '如果這不是你預期的結果，請確認選到的是正確的備份檔。',

  // ---- 系統通知 ----
  // ⚠️ 這個字串不顯示在 APP 裡，而是顯示在【Android 系統設定 → 通知 → 分類】。
  //    同一個 channel id 再呼叫一次 setNotificationChannelAsync 會覆蓋名稱，所以語言換過
  //    之後名稱是【追得上】的 —— 但 ensureChannel() 有 channelReady 旗標擋住第二次呼叫，
  //    等於同一次執行期間只會建一次，實際上要到下次冷啟動才會換成新語言。
  'notif.channelName': '親餵計時提醒',
  // ⚠️ 值與既有的 timer.nursingOverdue 完全相同（首頁警示橫幅）。因為命名空間分組的關係
  //    不共用 key，但兩處是【同一句話】，改動時必須一起改，否則橫幅寫一種、通知寫另一種。
  'notif.overdueTitle': '還在餵嗎？',
  // ⚠️ 原本是樣板字串 `${babyName} 的親餵已經 ${minutes} 分鐘了。…`，改成 {name} / {n}
  //    兩個內插；佔位符前後的【半形空格是刻意的】（中英數之間的間距），照抄不要吃掉。
  'notif.overdueBody':
    '{name} 的親餵已經 {n} 分鐘了。如果已經結束，記得回 APP 按「結束」，時間才會正確。',
  'notif.testTitle': '測試通知',
  'notif.testBody': '你看到這則就表示鎖屏提醒會正常送到。親餵超時的提醒長得跟這個一樣。',

  // ---- 匯入的格式檢查 ----
  'import.invalidJson': '這不是有效的 JSON 檔案',
  // ⚠️ 結尾是全形冒號 U+FF1A，是字串的一部分，英文換成半形冒號。原始字面值把換行與
  //    issues.join() 接在後面，但那是【組裝】不是文案 —— 留在程式碼裡，字典只放這句框架
  //    句，否則等於把版面規則塞進翻譯者手上。
  'import.badFormat': '這個檔案的格式不符：',
  // ⚠️ 原文用的是【半形】括號（U+0028/U+0029），不是其他中文訊息慣用的全形（）—— 照抄，
  //    不要順手改成全形。這是 zod 路徑為空時的代稱（i.path.length === 0），不是句子，
  //    所以兩邊都不加標點。
  'import.rootLevel': '(根層級)',
  // ⚠️ {message} 是 zod 函式庫自己的輸出，【不翻譯】，只是被我們的框架句包起來。
  //    項目符號是 U+00B7 MIDDLE DOT 後面接一個半形空格（跟 baby.startNursingSide 同一個
  //    字元），不是 U+2022。分隔號中文用全形冒號、英文用半形冒號＋空白。
  //    副作用：中文模式下會是「中文框架句 + 英文 zod 訊息」，這是既有行為，這批不處理。
  'import.issueLine': '· {where}：{message}',
  // ⚠️ 字面值前面那個換行是接在 issues 後面的分隔符，屬於組裝，留在程式碼裡，不要塞進
  //    字典值。中文全形括號（），英文半形 () —— 這是標點差異不是翻譯。數字兩邊必然 ≥ 1
  //    （因為 issues.length > 3 才會走到），所以英文需要單複數，見 import.moreIssues_one。
  'import.moreIssues': '（另有 {n} 個問題）',
  // ⚠️ 中文值跟複數形【刻意一模一樣】，plural() 在中文下等於 no-op；這個 key 存在只是為了
  //    讓兩本字典對齊，否則 plural() 找不到 _one 會退回複數形，英文就會出現
  //    「(1 more problems)」。
  'import.moreIssues_one': '（另有 {n} 個問題）',

  // ---- 動作鎖 ----
  // ⚠️ 跟既有的 modal.saveFailed（'存不進去' / "Couldn't save"）是【不同】字串：那個是彈窗
  //    裡單一欄位存檔失敗，這個是所有記錄按鈕共用的動作鎖攔到的失敗。中文原文本來就分得
  //    出來，英文也刻意用不同時態區隔。縮寫用直單引號 U+0027，比照 history.deleteFailed。
  'lock.saveFailedTitle': '沒有存進去',
  // ⚠️ 原始碼是兩個字串用 + 串接，但【中間沒有換行】—— 純粹是為了行寬折行，所以是一個
  //    key 不是兩個。⚠️「設定 → 匯出 JSON 備份」是【畫面上的路徑】，必須跟 settings.title
  //    與 settings.exportJson 實際採用的字串一致。英文比照既有的 error.queryHint 不加引號
  //    （中文的「」在英文版拿掉），→ 維持 U+2192 前後各一個半形空格。
  'lock.saveFailedBody':
    '這一筆沒有寫入資料庫。如果一直出現，請到「設定 → 匯出 JSON 備份」先把現有資料存出來。',

  // ---- CSV 匯出的欄位表頭 ----
  'csv.headerBaby': '寶寶',
  'csv.headerSex': '性別',
  'csv.headerDate': '日期',
  'csv.headerTime': '時間',
  'csv.headerType': '類型',
  // ⚠️ 這一欄的值來自 methodLabel()，跟 UI 的 field.method（英文是精簡的 'How'）是同一個
  //    概念但【不能共用字典值】—— UI 標籤要短是因為版面窄，CSV 欄名沒有這個限制，
  //    而讀者是醫生，寫全比較不會誤讀。
  'csv.headerMethod': '餵法',
  'csv.headerMilk': '奶種',
  // ⚠️ 單位 ml 必須留在欄名裡。toCsvRow() 填的是【純數字不帶單位】，所以單位只存在於這一
  //    格；拿掉它，Excel 直接畫圖時的圖例就沒有單位了。中文原字沒有空格（奶量ml），
  //    英文加空格是英文排版慣例，不是漏抄。
  'csv.headerAmountMl': '奶量ml',
  // ⚠️ 這一欄【不能】翻成 'Nursing min'。durationMin 同時被親餵與睡眠使用（中文才刻意從
  //    「親餵分鐘」改成「時長分鐘」）—— 英文版重蹈覆轍的話，睡眠那幾列會被標成親餵。
  //    單位 min 同樣要留著，理由同 csv.headerAmountMl。
  'csv.headerDurationMin': '時長分鐘',
  'csv.headerSide': '哪一邊',
  // ⚠️ 用 Diaper 不用 Nappy —— 不是忘了英式用語，而是整本字典的 UI 都叫 Diaper
  //    （action.diaper、type.diaper、stats.barDiapers）。CSV 欄名跟 APP 畫面上的說法對不
  //    起來的話，使用者會不知道這一欄對應哪個按鈕。字典裡唯一的 nappy 在 stool.alertBody，
  //    那句是給醫護聽的口語，情境不同。
  'csv.headerDiaperKind': '尿布類型',
  // ⚠️ 這是【加註不是翻譯】。九色大便卡是台灣兒童健康手冊裡的實體卡片，編號 1–9 只有對照
  //    那張卡才有意義；把中文原名一起放進欄名，只讀英文的照顧者才能把這欄跟手上那張卡連
  //    起來。而且這張表最後是遞給台灣的醫生看的 —— 中文原名對他也是最快的辨識路徑，
  //    兩邊都賺。做法比照 stool.compareHint1。
  'csv.headerStoolCard': '大便卡編號',
  // 這一欄的【值】是既有的 stool.csvAbnormal（異常／Abnormal），不要另外開 key。
  // 欄名與值看起來重複是刻意的：欄名要能單獨被讀懂（Excel 篩選器只顯示欄名），
  // 值則要在整列掃過去時一眼看到。
  'csv.headerStoolAbnormal': '大便卡異常',
  // ⚠️ 中文原字用的是【半形】括號 (舊)，不是全形（），已逐位元組確認，照抄不要順手改成
  //    全形。這欄是 diaperColor 舊資料的殘留（UI 已移除，只剩匯出會用到），(舊)／(old)
  //    的作用是告訴醫生這欄可能整片空白是正常的。
  'csv.headerStoolColourLegacy': '大便顏色(舊)',
  /** ⚠️ 單位 kg 要留著：值是 (weightG/1000).toFixed(2) 的純數字 */
  'csv.headerWeightKg': '體重kg',
  // 用 Length 不用 Height —— 嬰兒是躺著量的，英文臨床用語是 length；字典既有的
  // stats.height／field.height 也已經是 'Length'，保持一致。單位 cm 要留著。
  'csv.headerHeightCm': '身長cm',
  // UI 的 field.head 英文是精簡的 'Head'（版面窄），但 CSV 欄名寫全 head circumference ——
  // 這是醫生認得的標準寫法，而 'Head cm' 讀起來像頭的某個長度。單位 cm 要留著。
  'csv.headerHeadCm': '頭圍cm',
  'csv.headerNote': '備註',
  // ⚠️ 這是 throw new Error() 的訊息，不是內部錯誤 —— 設定頁直接把 e.message 丟進 Alert
  //    給使用者看，所以必須翻。⚠️ 掛在 csv.* 前綴下只是因為批次分工，實際上 shareText()
  //    同時服務 JSON 與 CSV 兩條匯出路徑，改字時兩邊都受影響。中英文都刻意不加句號，
  //    比照字典既有的錯誤訊息（history.deleteFailed 等）。
  'csv.shareUnsupported': '這台裝置不支援分享功能',
  // Android 系統分享選單的標題。⚠️ 同上，前綴是 csv.* 但 JSON 匯出也走這裡。
  // ⚠️ 這個標題【不影響檔名】—— 檔名（baby-log-*.csv）刻意維持純 ASCII，理由見 export.ts
  //    的既有註解，不要一起翻。
  'csv.shareDialogTitle': '匯出寶寶日誌',
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

  'type.feed': 'Feed',
  'type.diaper': 'Diaper',
  'type.sleep': 'Sleep',
  'type.pump': 'Pump',
  'type.growth': 'Growth',
  'method.bottle': 'Bottle',
  'method.nursing': 'Nursing',
  'milk.breast': 'Breast milk',
  'milk.formula': 'Formula',
  'milk.mixed': 'Mixed',
  'diaperKind.pee': 'Wet',
  'diaperKind.poop': 'Dirty',
  'diaperKind.both': 'Wet + dirty',
  'sex.boy': 'Boy',
  'sex.girl': 'Girl',

  'sum.sleeping': 'sleeping now',
  'sum.slept': 'slept {dur}',
  'sum.sleepNoDur': 'sleep',
  'sum.pumped': 'pumped {ml}ml',
  'sum.pumpNoAmount': 'pump',
  'sum.head': 'head {v}',
  'sum.growthEmpty': 'growth entry',
  'sum.feedPlain': 'feed',
  'sum.diaperPlain': 'diaper',

  'field.occurredAt': 'Time',
  'field.earlierBy': '{n} min earlier',
  'field.method': 'How',
  'field.milk': 'Milk',
  'field.side': 'Side',
  'field.nursingDuration': 'Nursing time',
  'field.amountDrunk': 'Amount taken',
  'field.diaperKind': 'Type',
  'field.sleepDuration': 'Slept for',
  'field.pumpAmount': 'Amount pumped',
  'field.custom': 'Custom',
  'field.minutes': 'min',
  'field.weight': 'Weight',
  'field.height': 'Length',
  'field.head': 'Head',
  'note.deductsStash': 'This will be deducted from the milk stash.',
  'note.addsStash': 'This will be added to the milk stash.',
  'note.stillSleeping': 'Still sleeping. Tap “End sleep” on Home to record the duration.',
  'note.growthUnits':
    'Stored internally as whole grams / millimetres to avoid floating-point drift.',

  // ---- 九色大便卡：加註版，不是直譯。理由寫在上面 zh 那一區 ----
  'stool.pickHint':
    'Choose “Dirty” or “Wet + dirty” to open the stool colour card and record the colour number.',
  // 「把中文原名一起寫出來」是這一批最重要的加註 —— 少了它，只讀英文的
  // 照顧者拿著手冊也找不到那一頁，整個功能對他是不可用的。
  'stool.compareHint1':
    'Get out the printed nine-colour stool card (九色大便卡). It is in the Taiwan Children’s Health Handbook (兒童健康手冊) — the baby’s health booklet. Compare against the printed card, then tap the closest number.',
  'stool.compareHint2':
    'Phone screens are not colour-calibrated (and you may have the brightness turned right down), so there are no colour patches here.',
  'stool.sectionNormal': 'Normal (7–9)',
  'stool.sectionWatch': 'Needs attention (1–6)',
  'stool.unsure': 'Not sure',
  'stool.alertTitle': 'See a doctor promptly',
  // 前兩段的醫學數字與中文版逐字對應。第三段是加註：講明專線的國別與語言
  // 限制，並給一條不需要打電話的路。
  'stool.alertBody':
    'This colour is in the range that needs attention. For biliary atresia, a Kasai procedure within 60 days of birth gives a 10-year survival rate of up to 73% — the earlier it is found, the better.\n\nTake your baby to a doctor as soon as you can, and ask the staff to assess the stool colour at the 1-month hepatitis-B vaccination visit (a routine visit on the Taiwan schedule).\n\nHelpline: (02) 2382-0886, weekdays 8:30–17:30, run by 兒童肝膽疾病防治基金會 (the children’s liver and biliary disease foundation). It is a Taiwan number and is answered in Mandarin — if you cannot use it, go straight to a paediatrician and show them the nappy.',
  'stool.inlineWarn1':
    '⚠ This number needs a doctor’s assessment. At the 1-month hepatitis-B vaccination visit, make a point of asking the staff to look at the stool colour.',
  'stool.inlineWarn2': 'Helpline (Taiwan number, Mandarin): (02) 2382-0886',
  'stool.summary': 'stool card {n}',
  'stool.csvAbnormal': 'Abnormal',

  'color.yellow': 'Yellow',
  'color.green': 'Green',
  'color.brown': 'Brown',
  'color.black': 'Black',
  'color.white': 'White',

  'modal.eventTitle': 'Entry',
  'modal.sessionTitle': 'Both babies',
  'modal.pumpHeader': 'Pump',
  'modal.savedAt': '✓ Saved {time}',
  'modal.allOptional': 'Every field is optional — each change is already saved.',
  'modal.notFoundOne': 'Entry not found',
  'modal.notFoundSession': 'Entries not found',
  'modal.deleteOne': 'Delete this entry',
  'modal.deleteTwo': 'Delete both entries',
  'modal.deleteOneAsk': 'Delete this entry?',
  'modal.deleteTwoAsk': 'Delete both entries?',
  'modal.deleteWarn':
    'An “Undo” button appears on this screen after deleting. Leave the screen and it is gone.',
  'modal.deletedOne': 'Entry deleted',
  'modal.deletedTwo': 'Both entries deleted',
  'modal.noUndoAfterLeave': 'Once you leave this screen there is no way to undo.',
  'modal.saveFailed': "Couldn't save",

  'link.bothSaved': '✓ Both saved',
  'link.hintLine1': 'Change one baby and the other follows — either direction, both ways.',
  'link.hintLine2':
    'The one you changed stops following; the card says so, and you can tap to re-link.',
  'link.hintTimeAlways': 'Time always syncs both ways',
  'link.hintSep': '; ',
  'link.hintNeverMirror': 'side and stool-card number never sync',
  // ⚠️ 開頭那個空格是刻意的。中文的「——」緊貼前字，英文的 em dash 前面要有空格，
  //    少了它畫面上會是「never sync— those are…」。
  'link.hintWhy': ' — those are per-baby observations and must not be copied.',
  'link.willFollow': 'follows the other',
  'link.wontFollow': "doesn't follow · re-link",
  'link.syncedTo': '↕ synced to {names}',
  'link.otherBaby': 'the other baby',
  'link.nameJoin': ', ',

  'common.done': 'Done',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.restore': 'Undo',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.revert': 'Discard',
  'common.ok': 'OK',
  'common.babyFallback': 'Baby',

  'splash.dbError': 'Database error: {msg}',
  'splash.preparing': 'Getting ready…',

  // ⚠️ 'Follow system' 被 settings.themeModeNote2 用彎引號引用，兩個 key 要一起改
  'mode.auto': 'Follow system',
  'mode.light': 'Light',
  'mode.dark': 'Dark',

  // 語氣沿用字典既有的「Couldn't ⋯」（見 history.deleteFailed、modal.saveFailed）
  'settings.opFailed': "Couldn't finish",
  // ⚠️ 不能出現 backed up / saved —— shareAsync 不回報使用者最後有沒有真的存檔
  'settings.exportDoneTitle': 'File created',
  // ⚠️ 刻意用「標籤: 數字」而不是「{babies} babies」：一句裡有兩個數字，plural() 一次只能
  //    處理一個，寫成 N babies 遲早會出現 1 babies 這種機器翻譯痕跡。
  'settings.exportCounts': 'Babies: {babies}, entries: {events}',
  'settings.exportVerifyNote':
    '⚠️ Opening the share sheet does not mean the file was saved. Go to wherever you sent it (cloud drive, LINE…) and check the file is really there — this is the only backup route this app has.',
  'settings.importDoneTitle': 'Import complete',
  'settings.importBabies': 'Babies: {added} added, {skipped} skipped',
  'settings.importEvents': 'Entries: {added} added, {skipped} skipped',
  'settings.importSkipNote':
    'Any id that already exists is skipped, so nothing you already have is overwritten.',
  'settings.title': 'Settings',
  'settings.sectionBaby': 'Babies',
  'settings.sectionAppearance': 'Appearance',
  // ⚠️ 引號裡必須跟 settings.exportJson 的英文值一字不差
  'settings.appearanceNote':
    'Language, colour scheme and light/dark travel with the “Export JSON backup” file, so you do not have to set them up again on a new phone.',
  // ⚠️ 刻意保留【雙語】，這不是漏翻：英文介面下的中文使用者要認得「語言」。
  //    順序是介面自己的語言擺前面，所以英文版是 Language 在前。
  'settings.langLabel': 'Language / 語言',
  // ⚠️ 這句本身就是在講加註原則，所以它自己也必須示範加註：九色大便卡的中文原名要寫進句子
  'settings.langNote1':
    'The English version is for a caregiver who only reads English. Anything specific to Taiwan — the nine-colour stool card (九色大便卡), the liver foundation helpline — carries an explanation in English rather than a literal translation, because that card lives in the baby’s health handbook and that number cannot be dialled from abroad.',
  'settings.langNote2':
    'Every screen switches now. Only the build notes at the bottom of this page deliberately stay in Chinese — they are there so you can check which bundle you are running.',
  'settings.skinLabel': 'Colour scheme',
  'settings.themeModeLabel': 'Light / dark',
  'settings.themeModeNote1':
    'Dark mode is more than a preference in this app — turning a light on in the middle of the night wakes both babies, so the dark version is a low-brightness night light, not the light version inverted.',
  // ⚠️ 引號裡是 mode.auto 的英文值
  'settings.themeModeNote2': '“Follow system” uses your phone’s own automatic dark-mode schedule.',
  'settings.sectionBackup': 'Backup',
  'settings.backupNote1':
    'In this version your data lives only on this phone. Export a JSON backup once a week and put it somewhere in the cloud.',
  'settings.backupNote2':
    'Also: right now the data sits inside the Expo Go sandbox. If the app is later installed as a standalone APK, you have to export JSON here first and import it in the new app — otherwise the data does not come with you.',
  'settings.working': 'Working…',
  // ⚠️ 這串字被 settings.appearanceNote、lock.saveFailedBody 與既有的 error.queryHint
  //    引用（'Go to Settings → Export JSON backup'），改字要三處一起改。
  'settings.exportJson': 'Export JSON backup',
  'settings.exportCsv': 'Export CSV (for the doctor)',
  'settings.importJson': 'Import from JSON',
  'settings.sectionNotifications': 'Notifications',
  // ⚠️ 兩處引號分別引用 timer.nursingOverdue 與 timer.stopNursing 的英文值
  'settings.notifyNote1':
    'When you start nursing, a “Still nursing?” reminder is scheduled for {min} minutes later; tapping “End nursing” cancels it. It is a local notification your phone schedules itself — no internet, and it never goes through a server.',
  'settings.notifyNote2':
    'The first time you start nursing, the app asks for notification permission. Saying no is fine — logging is completely unaffected; you just lose the lock-screen reminder, and the warning banner still appears inside the app.',
  // ⚠️ 加註而不是直譯：電池最佳化清單顯示的是 app.json 的中文 name「寶寶日誌」，只給英文
  //    名字會在清單裡找不到任何東西；而且目前實際要找的是 Expo Go 那一列。
  'settings.notifyNote3':
    '⚠️ Battery savers on Xiaomi / Huawei / OPPO and similar systems can delay notifications or swallow them altogether. If a reminder never arrives, go into your phone settings and exclude this app from battery optimisation — look for the Expo Go entry, because 寶寶日誌 (this app) runs inside Expo Go.',
  'settings.sendTest': 'Send a test notification',
  'settings.noPermTitle': 'No notification permission',
  'settings.noPermBody':
    'You turned notification permission down before, so you will need to switch it on by hand in your phone settings. Logging is completely unaffected.',
  'settings.testScheduledTitle': 'Sending in {sec} seconds',
  // 中文用【】強調，英文改用語序把 now 提到前面來承擔重音（Alert 不能用粗體）
  'settings.testStep1': 'Turn the screen off now, then wait.',
  'settings.testSeen': 'You see it = lock-screen reminders get through.',
  'settings.testNotSeen':
    'You do not = the battery saver swallowed it; go to your phone settings and exclude Expo Go from battery optimisation.',
  'settings.testWhy':
    'Permission being granted does not mean delivery, so the only way to be sure is to actually send one.',
  'settings.sectionAbout': 'About',
  // ⚠️ 加註而不是直譯：手機上的圖示、通知與電池清單顯示的都是「寶寶日誌」，
  //    只給英文名字會對不起來。版本號 v1 兩版一致。
  'settings.aboutName': 'Baby Daily Log (寶寶日誌) v1',
  'settings.aboutSync':
    'Your data lives only on this phone. Two people sharing one set of entries would need a sync server, which is not built yet.',
  'settings.buildTag': 'Version {tag}',
  // ⚠️ 底下接的 BUILD_NOTES 是刻意不翻譯的中文條列，所以英文介面會是「英文標題 + 中文清單」
  'settings.buildNotesHeading': 'This build should include:',
  'settings.buildMismatch':
    'If it does not match, Expo Go is still running the old JS: shake the phone to bring up the developer menu and tap Reload, or force-close Expo Go and enter the URL again.',
  'settings.errNameEmpty': 'Name cannot be blank',
  // ⚠️ 範例日期跟中文版一字不動：示範的是 ISO 格式，改成 24/06/2026 之類的在地寫法會讓
  //    使用者打出存不進去的字串。
  'settings.errBirthFormat': 'Date of birth should look like 2026-06-24',
  'settings.errBirthFuture': 'Date of birth cannot be in the future',
  'settings.namePlaceholder': 'Name',
  'settings.birthPlaceholder': 'YYYYMMDD (just type the digits)',
  'settings.saving': 'Saving…',
  // ⚠️ yet 不能省 —— 少了它讀起來像存檔失敗，那是另一回事（modal.saveFailed）
  'settings.unsaved': 'Not saved yet',

  'skin.warmwood': 'Warm Wood & Cream',
  // ⚠️ 三個 blurb 都是短語不是句子，句尾不加句點；em dash 前後各留一個空格
  'skin.warmwoodBlurb': 'Wooden floors, rattan, warm bulbs — the visual language of “home”',
  'skin.sakura': 'Cherry Blossom',
  'skin.sakuraBlurb': 'Rose pink + lavender, soft and easy on the eyes',
  'skin.seasalt': 'Sea Salt Blue',
  'skin.seasaltBlurb': 'Cool tones, low stimulation — clearest in daylight',

  'onboard.title': 'Welcome',
  'onboard.subtitle':
    'Start with a name for each baby — you can change all of this later in Settings.',
  'onboard.babyOneLabel': 'First baby',
  // ⚠️ 在地化不是翻譯：直譯成 "Little Bear" 或音譯成 "Xiao Xiong" 會被當成真的名字。
  //    與 onboard.babyTwoPlaceholder 成對，改字要一起改。
  'onboard.babyOnePlaceholder': 'e.g. Bear',
  'onboard.babyTwoLabel': 'Second baby',
  // ⚠️ 同上，與 onboard.babyOnePlaceholder 成對（熊／兔），要一眼看得出是示範不是預設值
  'onboard.babyTwoPlaceholder': 'e.g. Bunny',
  'onboard.sexLabel': 'Sex (optional)',
  'onboard.birthLabel': 'Date of birth (shared by both babies)',
  // ⚠️ 不能只留 "YYYYMMDD" —— 那會讓人去數字鍵盤裡翻找「-」鍵，而遮罩正是為了免掉這件事
  'onboard.birthPlaceholder': 'YYYYMMDD (just type the digits)',
  'onboard.birthFormatHint': 'The date should look like 2026-06-24',
  'onboard.birthFuture': 'Date of birth cannot be in the future',
  'onboard.ageConfirm': '{age} — is that right?',
  'onboard.creating': 'Creating…',
  'onboard.start': 'Get started',
  'onboard.needNames': 'Both babies need a name.',
  'onboard.needBirth': 'The date of birth is not complete yet.',
  'onboard.importHint':
    'Moving to a new phone, or from Expo Go to a standalone app? Import your backup first — do not create the babies again here, or after the import you will have 4 babies and no way to delete the extra two.',
  'onboard.importButton': 'I have a backup to import',
  'onboard.importing': 'Importing…',
  'onboard.createFailedTitle': "Couldn't create the babies",
  'onboard.importFailedTitle': 'Import failed',
  'onboard.importDoneTitle': 'Import complete',
  'onboard.importDoneBabies': 'Babies: {added} added, {skipped} skipped\n',
  'onboard.importDoneEvents': 'Entries: {added} added, {skipped} skipped',
  'onboard.importNoBabiesTitle': 'Import complete, but no babies were added',
  // ⚠️ 刻意寫成不隨單複數變形的說法（不是 "{n} babies skipped"），所以不需要 _one key
  'onboard.importNoBabiesLine1': 'Every baby in this backup is already here ({n} skipped).\n',
  // ⚠️ 冒號句式同樣是為了避開 "1 entries" 那種機翻感，所以不需要 _one key
  'onboard.importNoBabiesLine2': 'Entries added: {n}.\n\n',
  'onboard.importNoBabiesLine3':
    'If that is not what you expected, check that you picked the right backup file.',

  'notif.channelName': 'Nursing timer reminders',
  // ⚠️ 與 timer.nursingOverdue 是【同一句話】（首頁警示橫幅），改動時兩個 key 要一起改
  'notif.overdueTitle': 'Still nursing?',
  // ⚠️ 引號裡是畫面上真正的按鈕文字 “End nursing”（= timer.stopNursing 的英文值），不是
  //    中文那個簡稱「結束」；哪天按鈕文案改了，這句要跟著改。
  // ⚠️ 寫成「{name} — nursing has been running…」而不是「{name} has been nursing…」，是
  //    因為同時哺餵時呼叫端會把兩個名字併成一個字串傳進來，has/have 會對不上；
  //    這種寫法單雙都成立。
  'notif.overdueBody':
    "{name} — nursing has been running for {n} minutes. If you've already finished, open the app and tap “End nursing” so the time is recorded correctly.",
  'notif.testTitle': 'Test notification',
  'notif.testBody':
    'If you can see this, lock-screen reminders are getting through. The nursing overdue reminder looks just like this one.',

  'import.invalidJson': 'This is not a valid JSON file',
  // ⚠️ 中文結尾是全形冒號，英文換成半形冒號
  'import.badFormat': 'This file is not in the expected format:',
  'import.rootLevel': '(root level)',
  // ⚠️ {message} 是 zod 自己的輸出，不翻譯；項目符號同樣是 U+00B7＋半形空格
  'import.issueLine': '· {where}: {message}',
  'import.moreIssues': '({n} more problems)',
  // ⚠️ 沒有這個 _one，plural() 會退回複數形，畫面上就會出現 "(1 more problems)"
  'import.moreIssues_one': '({n} more problem)',

  // ⚠️ 跟 modal.saveFailed（"Couldn't save"）刻意用不同時態區隔：那個是彈窗裡單一欄位存檔
  //    失敗，這個是動作鎖攔到的整筆寫入失敗。
  'lock.saveFailedTitle': "Didn't save",
  // ⚠️ Settings → Export JSON backup 是【畫面上的路徑】，必須跟 settings.title 與
  //    settings.exportJson 一字不差。比照 error.queryHint 不加引號，→ 前後各一個半形空格。
  'lock.saveFailedBody':
    'This entry was not written to the database. If it keeps happening, go to Settings → Export JSON backup to save the data you already have.',

  'csv.headerBaby': 'Baby',
  'csv.headerSex': 'Sex',
  'csv.headerDate': 'Date',
  'csv.headerTime': 'Time',
  'csv.headerType': 'Type',
  // ⚠️ 不共用 UI 的 field.method（精簡的 'How'）：CSV 欄名沒有版面限制，而讀者是醫生
  'csv.headerMethod': 'Feeding method',
  'csv.headerMilk': 'Milk type',
  // ⚠️ 單位 ml 要留著：值是純數字，單位只存在於欄名這一格
  'csv.headerAmountMl': 'Milk amount ml',
  // ⚠️ 不能寫成 'Nursing min'：durationMin 是親餵與睡眠共用的，那樣會把睡眠那幾列標成親餵
  'csv.headerDurationMin': 'Duration min',
  'csv.headerSide': 'Side',
  // ⚠️ 用 Diaper 不用 Nappy：整本字典的 UI 都叫 Diaper，欄名要對得上畫面上的按鈕
  'csv.headerDiaperKind': 'Diaper type',
  // ⚠️ 加註不是翻譯：編號 1–9 只有對照那張實體卡才有意義，而中文原名同時也是台灣醫生
  //    最快的辨識路徑。做法比照 stool.compareHint1。
  'csv.headerStoolCard': 'Stool card no. (九色大便卡)',
  'csv.headerStoolAbnormal': 'Stool card abnormal',
  // 英式拼字 colour；(old) 是在告訴醫生這欄整片空白是正常的（diaperColor 舊資料的殘留）
  'csv.headerStoolColourLegacy': 'Stool colour (old)',
  'csv.headerWeightKg': 'Weight kg',
  // 用 Length 不用 Height：嬰兒是躺著量的，臨床英文是 length，也跟 stats.height 一致
  'csv.headerHeightCm': 'Length cm',
  // 寫全 head circumference：'Head cm' 讀起來像頭的某個長度，而醫生認得這個標準寫法
  'csv.headerHeadCm': 'Head circumference cm',
  'csv.headerNote': 'Note',
  // ⚠️ 這是 throw new Error() 的訊息，會被直接丟進 Alert 給使用者看，所以必須翻。
  //    刻意不加句號，比照 history.deleteFailed 等既有錯誤訊息。
  'csv.shareUnsupported': 'Sharing is not available on this device',
  'csv.shareDialogTitle': 'Export baby log',
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
