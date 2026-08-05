# BabyDailyRecord — 規劃書

> **雙胞胎**餵奶與換尿布紀錄 APP。React Native + Expo，純本地資料，奶油暖木風格。
> 決策日期：2026-08-05

---

## 0. 前提與約束（這些是規劃的地基，不是裝飾）

| 約束 | 內容 | 對規劃的影響 |
|---|---|---|
| 開發者背景 | C#/.NET + SQL Server，**沒碰過 React** | 文件與註解全部用 C# 概念對照；避開需要 React 深度的模式 |
| **寶寶數量** | **雙胞胎，兩個都已出生、都在餵** | 多寶支援是 v1 核心而非選配：每寶獨立紀錄、獨立左右邊輪替、分寶摘要、一次記兩寶 |
| 餵法 | **混哺** —— 親餵、母奶瓶餵、配方奶都有 | 親餵計時器 + 左右邊輪替 + 瓶餵 ml 全部進 v1 |
| 使用情境 | 寶寶已出生，現在就在餵 | 第一次交付必須盡快能用 |
| 時間形態 | 新生兒父母 = 20 分鐘碎片，腦袋是糊的；**雙胞胎是雙倍** | 每步驟能在一次坐下內完成；「少一次點擊」的價值是雙倍 |
| 使用者數 | **MVP 只有 1 人 1 台裝置** | 零後端、零登入、零同步、零衝突處理 |
| 測試裝置 | Android 手機（實機）；本機無模擬器、無 `ANDROID_HOME`、`java` 不在 PATH | 全程 Expo Go，**不需要修環境** |
| 分工 | 我寫程式碼，你讀懂就好 | 交付可運行專案 + 中文註解 + 交接說明 |

---

## 1. 決策總表

| 項目 | 決定 | 為什麼（含被否決的選項） |
|---|---|---|
| 框架 | **React Native + Expo + TypeScript** | 回饋圈最短（存檔即熱更新）、不用碰 Android SDK、以後可出 iOS。否決 Kotlin+Compose（只有 Android、要先修環境、build 慢）、.NET MAUI（工具鏈不穩、溫馨 UI 難刻）、PWA（本地通知太弱） |
| 後端 | **無**（MVP 零網路程式碼） | 單人單機不需要。Supabase 移到第三階段 |
| 本地資料庫 | **expo-sqlite** | SQL 直覺完全適用；AsyncStorage/MMKV 無法查詢與統計 |
| 資料存取 | **Drizzle ORM** + `useLiveQuery` | 語法像 SQL、型別全自動推導、**`useLiveQuery` 讓資料變動自動重繪 UI → 完全不需要狀態管理程式庫**。這是最重要的一個選擇：把「React 狀態同步」這個最容易搞爛的部分，變成資料庫的問題 |
| Schema 形狀 | **混合式**：常查欄位為真欄位 + `payload` JSON 留給未來類型 | 雙胞胎讓分寶查詢變成首頁必跑。純 JSONB 會讓每支查詢都要 `json_extract` 且無型別保護 —— 詳見 §4 |
| Migration | **drizzle-kit** | 概念等同 EF Core Migrations |
| 導航 | **expo-router**（檔案式路由） | Expo 官方預設；`presentation: 'modal'` 免費提供原生底部彈窗 |
| UI 元件庫 | **不用**。`StyleSheet` + 自製 `theme.ts` | 只需要 ~9 個元件，設定任何元件庫的成本 > 自己刻。否決 RN Paper（Material 是 Google 的視覺語言，會一直跟「溫馨的家」打架）、NativeWind（要同時學 React + Tailwind）、Tamagui（config 勸退、對這規模是過度工程） |
| 驗證 | **zod** | `payload` JSON 沒有 DB 層型別保護，靠 zod 在應用層卡住 |
| 日期 | **date-fns** + `zh-TW` locale | `formatDistanceToNow` 直接產出「2 小時 15 分前」 |
| 通知 | **v1 完全不用**。守護提示做成 APP 內橫幅 | 遠端推播在 Expo Go / Android 從 SDK 53 起完全不能用（已查證官方文件）。本地通知雖可用，但 Android 13+ 權限流程 + 各家省電機制殺背景是交付風險 → 第二階段再加 |
| 執行方式 | **Expo Go** + v1 就做匯出/匯入 | 今天就能跑。已知風險：Expo Go 沙箱的資料不會跟著搬到未來的正式 APK → 用 JSON 匯出匯入解決 |
| 專案位置 | 就地清空重建 `C:\Users\a0958\AndroidStudioProjects\BabyDailyRecord` | 保留 GitHub repo 與第一個 commit。現有 Kotlin 骨架零價值（連 `MainActivity` 都沒有） |

---

## 2. 產品規格

### 2.1 視覺方向：奶油暖木

關鍵字是**「家」不是「寶寶」**。木頭色 + 奶油白是家的視覺語言（木地板、藤編、暖色燈泡）；粉藍是嬰兒房的語言，抹茶米白是咖啡廳的語言。

| 用途 | 淺色 | 深色（夜燈） |
|---|---|---|
| 背景 | `#FDF8F3` | `#16141A` |
| 卡片 | `#FFFFFF` | `#221F27` |
| 主色 | `#C08552` 焦糖木 | `#F2C078` 暖黃燈 |
| 喝奶 | `#E8A87C` 蜜桃 | `#F2C078` |
| 尿布 | `#7FB3A7` 薄荷 | `#8FB8A8` |
| 文字 | `#4A3F35` 暖褐 | `#EDE6DA` |

**深色模式是功能需求不是偏好** —— 半夜開燈會叫醒寶寶（而且會叫醒兩個）。深色版不是把淺色反轉，是暖色低亮度，幾乎不含藍光。

**雙胞胎需要第二層區分**：每個寶寶配一個固定的輔助色（例如小熊 = 蜜桃、小兔 = 薄荷的深淺變體）與固定的排列位置。半夜辨識靠的是位置與顏色，不是讀名字。

**字型策略**：繁體中文自訂字型檔 5–10MB（要包上萬字），會讓 APP 體積爆掉，所以**中文用系統字型**（Android 的 Noto Sans TC 本來就乾淨）。只對**數字與英文**載入圓潤字型 —— 首頁最大的視覺元素剛好是「2:15」這種數字，效果拿得到，代價約 100KB。

### 2.2 首頁佈局（方案 A2 — 雙胞胎版）

```
+-----------------------------+
| 早安        出生 3 個月 12 天|
|-----------------------------|
| 小熊                        |
| 🍼 2 小時 15 分前            |
|    13:20 · 配方 120ml       |
| 💧 40 分鐘前 · 尿            |
|   +---------+ +---------+   |
|   | 🍼 喝奶 | | 💧 尿布 |   |
|   +---------+ +---------+   |
|-----------------------------|
| 小兔                 該餵了 !|
| 🍼 3 小時 40 分前            |
|    11:55 · 親餵 右 18 分     |
|    下次建議：左              |
| 💧 1 小時 10 分前 · 便       |
|   +---------+ +---------+   |
|   | 🍼 喝奶 | | 💧 尿布 |   |
|   +---------+ +---------+   |
|-----------------------------|
|   兩個都餵了  |  兩個都換了  |
+-----------------------------+
```

**為什麼是這個佈局**：按鈕綁定寶寶，所以單一寶寶的紀錄仍然是**真一鍵、零選擇步驟**；同時哺餵／一起換尿布走底部捷徑也是一鍵。雙胞胎最痛的問題是「哪一個餵過了」，兩張卡片直接回答，「該餵了」標記不用你心算。

否決 B2 左右並排（手機切兩欄後按鈕只有約 70px 寬，暗光單手按不到）、C2 共用按鈕（每筆多一步，一天多約 36 次點擊）、D2 單一時間軸（新增要兩三步，完全放棄一鍵）—— D2 改用在「紀錄」頁。

**計時中的狀態**：任一寶寶在親餵計時中，該寶卡片替換成計時橫幅（`正在餵 · 左 · 12:34`）。超過 60 分鐘橫幅轉為警示色並顯示「還在餵嗎？」。同時哺餵時兩張卡片同時計時。

### 2.3 核心互動原則

> **半夜三點，你單手抱著哭鬧的寶寶（另一個也快醒了），另一隻手拿手機，螢幕亮度最低。**
> 任何需要填三個欄位才能存檔的介面，第五天就會被放棄。

1. **主按鈕按下去就已經存好了。** 不是開啟表單 —— 是先寫入資料庫（時間 = 現在），然後才浮出補充彈窗。
2. **補充彈窗可以直接滑掉。** 紀錄已經在了，什麼都不填也是一筆有效紀錄。
3. **所有細節欄位都是可點的 chip 或快選鈕，沒有鍵盤輸入。** ml 用 `60 / 90 / 120 / 150 / 自訂` 快選。
4. **按錯必須能救。** 長按刪除（軟刪除 + 5 秒內可復原），點擊可編輯時間與欄位。
5. **觸覺回饋**（`expo-haptics`）。暗光下你需要知道「我按到了」。
6. **雙寶彈窗預設連動、可分別調。** 點小熊的 `120ml`，小兔自動跟著變 120（多數情況相同）；要改單獨改下面那個就好。尿布類型同理。

### 2.4 親餵設計（v1 完整支援）

**計時器**

- 存 `occurred_at`（開始時間）與 `status = 'active'`，結束時寫 `ended_at` 與 `duration_min`
- 顯示的經過時間是**每次渲染即時計算 `now - occurred_at`**，不是累加秒數 → APP 被系統殺掉重開也能正確接回
- 結束時間可手改（忘記按結束的補救）
- 超時守護：**v1 做成 APP 內橫幅**，不是推播。避開 Android 13+ 權限流程與各家省電機制殺背景，交付不延遲。推播留第二階段

**同時哺餵（tandem）**

一次操作產生**兩筆事件**（每寶各一筆），共用一個 `session_id`。不是「一筆掛兩個寶寶」—— 因為兩寶的 ml／時長／左右邊都是各自的資料，硬塞成一筆之後所有查詢都要拆。`session_id` 讓你之後仍能還原「這兩筆是同時發生的」。同時哺餵時左右邊互斥（A 左則 B 右）。

**左右邊輪替建議**

雙胞胎親餵有 2 寶 × 2 邊 = 4 種組合，半夜絕對記不住。首頁直接顯示「小兔上次吃右邊 → 下次建議：左」，一鍵接受。實作成本只是一句 `order by occurred_at desc limit 1`（因為 `side` 是真欄位，不用 `json_extract`）。

### 2.5 瓶餵設計

只記**實際喝掉的量**，不記「泡了多少」。雙胞胎泡奶常常泡 120 喝 100，但回診時醫生問的是實際攝入量，多一個欄位只會讓你半夜多想一件事。

奶種：母奶／配方／混合。餵法：瓶餵／親餵。

### 2.6 尿布設計

時間 + 類型（尿／便／兩者都有），顏色**選填**且只在選「便」時出現。

> 顏色選項對應台灣新生兒健康手冊的**嬰兒大便卡**。白色／灰白色便是膽道閉鎖的警訊，需要立刻就醫 —— 這是記顏色唯一的正當理由，不是為了好玩。

### 2.7 v1 功能範圍

**包含**

- A2 雙胞胎首頁：每寶獨立卡片（上次喝奶／上次換尿布／相對時間／該餵了提示／左右邊建議）+ 每寶自帶雙按鈕
- 底部「兩個都餵了 / 兩個都換了」捷徑
- 補充彈窗：單寶版與**雙寶版**（預設連動、可分別調）
- 親餵計時器：開始／結束、可同時掛兩寶、結束時間可改、APP 內超時橫幅
- 左右邊輪替建議
- 瓶餵 ml 快選 + 奶種
- 尿布類型 + 大便卡顏色（選填）
- 分寶今日摘要（次數 / 總 ml / 尿布片數 / 排便次數）
- 紀錄頁：單一時間軸、按日分組、顏色區分寶寶（D2 佈局）
- 編輯 / 長按刪除 / 5 秒復原
- 奶油暖木 + 深色模式（跟隨系統）
- 寶寶設定：兩個名字 + 生日 + 各自代表色
- **匯出 + 匯入 JSON**（備份，並解決 Expo Go → 正式 APK 的搬家問題）
- 匯出 CSV（給醫生看，含分寶欄位）

**第二階段**

- 計時器超時的**推播通知**（含 Android 13+ 權限流程、`SCHEDULE_EXACT_ALARM`、各家省電機制對策）
- 餵奶間隔提醒
- 統計圖表 / 24 小時圓環（資料不足一週時圖是空的）
- 分寶對照統計（雙胞胎體重與攝入量差異是回診重點）

**第三階段**

- Supabase 同步、伴侶共用、邀請碼、Realtime、離線佇列
  - schema 已預留 `family_id` / `created_by` / `updated_at` / `deleted_at`，接同步是**加一層**不是重構

---

## 3. 套件清單（真實版本，已查證）

### 執行期

| 套件 | 版本 | 為什麼 | C# 對照 |
|---|---|---|---|
| `expo` | 57.0.10 | SDK 本體 | — |
| `react-native` | 0.86.2 | — | — |
| `react` | 19.2.8 | — | — |
| `expo-router` | 57.0.10 | 檔案式路由 + 原生 modal | ASP.NET 的慣例路由 |
| `expo-sqlite` | 57.0.1 | 本地資料庫 | LocalDB |
| `drizzle-orm` | 0.45.2 | 型別安全 query builder + `useLiveQuery` | EF Core，但語法更貼近 SQL |
| `zod` | 4.4.3 | `payload` 驗證 | FluentValidation |
| `date-fns` | 4.4.0 | 相對時間、日期分組（`zh-TW`） | `TimeSpan` + 格式化 |
| `expo-haptics` | 57.0.1 | 觸覺回饋（暗光下的確認感） | — |
| `expo-font` | 57.0.1 | 數字專用圓潤字型 | — |
| `expo-file-system` | SDK 內 | 匯出檔案寫入 | `System.IO` |
| `expo-sharing` | SDK 內 | 匯出後叫出分享選單 | — |
| `expo-document-picker` | SDK 內 | 匯入時選檔 | `OpenFileDialog` |
| `expo-notifications` | 57.0.8 | **第二階段才裝** | — |

### 開發期

| 套件 | 版本 | 為什麼 |
|---|---|---|
| `drizzle-kit` | 0.31.10 | 產生 migration SQL |
| `babel-plugin-inline-import` | 3.0.0 | **Drizzle migration 必需** —— 讓 babel 能把 `.sql` 檔內嵌進 bundle |
| `typescript` | 7.x | 已全域安裝 |

`babel.config.js` 必要設定（已查證官方文件）：

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
```

**不裝的東西與原因**：Redux / Zustand / TanStack Query（`useLiveQuery` 已取代）、任何 UI 元件庫、`react-navigation`（expo-router 已內含）、`@gorhom/bottom-sheet`（expo-router 的 modal 夠用）。

---

## 4. 資料模型

### 4.1 為什麼是「真欄位 + payload」混合式

原先規劃是純 `events` + JSONB `payload`。**雙胞胎改變了計算**：

- 「分寶每日總 ml」、「這寶上次吃哪一邊」從選配變成**首頁每次渲染都要跑**的查詢
- 純 JSONB 會讓每支查詢都要寫 `json_extract(payload, '$.side')`，沒有型別保護，且你的 SQL 直覺無處發揮
- **不是效能問題** —— 雙胞胎一年約 18,000 筆，SQLite 掃這個量在毫秒級，`json_extract` 完全撐得住。是**查詢人體工學與型別安全**問題

擴充性沒有損失：加睡眠只需要 `occurred_at` + `ended_at`（已經在了），特殊欄位再進 `payload`。

### 4.2 Schema

```ts
// db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const babies = sqliteTable('babies', {
  id:        text('id').primaryKey(),              // uuid
  name:      text('name').notNull(),
  birthDate: text('birth_date').notNull(),         // 'YYYY-MM-DD'（雙胞胎同一天，但仍各存一筆）
  colorKey:  text('color_key').notNull(),          // 'peach' | 'mint' — 半夜辨識靠顏色
  sortOrder: integer('sort_order').notNull(),      // 首頁固定排列位置（位置也是辨識線索）
  createdAt: integer('created_at').notNull(),      // epoch ms
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const events = sqliteTable(
  'events',
  {
    id:         text('id').primaryKey(),                          // uuid（之後同步不會撞號）
    familyId:   text('family_id').notNull(),                      // 預留同步；v1 固定 'local'
    babyId:     text('baby_id').notNull(),
    sessionId:  text('session_id'),                               // 同時哺餵/一起換尿布的兩筆共用
    type:       text('type', { enum: ['feed', 'diaper'] }).notNull(),

    occurredAt: integer('occurred_at').notNull(),                 // 事件發生時間（親餵 = 開始時間）
    endedAt:    integer('ended_at'),                              // 僅親餵計時使用
    status:     text('status', { enum: ['active', 'done'] }).notNull().default('done'),
                                                                  // 'active' = 計時進行中

    // 喝奶
    method:      text('method', { enum: ['bottle', 'nursing'] }),
    milk:        text('milk', { enum: ['breast', 'formula', 'mixed'] }),
    amountMl:    integer('amount_ml'),                            // 實際喝掉的量
    durationMin: integer('duration_min'),
    side:        text('side', { enum: ['left', 'right', 'both'] }),

    // 尿布
    diaperKind:  text('diaper_kind', { enum: ['pee', 'poop', 'both'] }),
    diaperColor: text('diaper_color', { enum: ['yellow', 'green', 'brown', 'black', 'white'] }),

    payload:   text('payload', { mode: 'json' }),                 // 留給未來類型（睡眠、體重…）
    note:      text('note'),
    createdBy: text('created_by'),                                // 預留同步；v1 為 null
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),                             // 軟刪除
  },
  (t) => [
    index('idx_events_baby_time').on(t.babyId, t.occurredAt),      // 首頁：每寶上次紀錄
    index('idx_events_baby_type_time').on(t.babyId, t.type, t.occurredAt), // 分寶摘要 / 左右邊建議
    index('idx_events_status').on(t.status),                      // 進行中的計時
    index('idx_events_session').on(t.sessionId),                  // 還原同時哺餵
  ],
);
```

### 設計理由逐項

| 設計 | 理由 |
|---|---|
| `id` 用 uuid 而非自增 | 之後接同步時兩台裝置各自產生的自增 id 必然撞號。uuid 現在零成本 |
| `deleted_at` 軟刪除 | 同步友善，而且**免費得到「5 秒內復原」** —— 半夜按錯必備 |
| `status` 獨立欄位而非查 `ended_at is null` | 瓶餵與尿布的 `ended_at` 本來就是 null，`status` 讓「進行中」是無歧義且可索引的 |
| `session_id` | 同時哺餵記成兩筆但仍可還原關聯 |
| `occurred_at` = 親餵**開始**時間 | 「上次幾小時前」在育兒上算的是開始時間 |
| `colorKey` / `sortOrder` 在 babies 表 | 雙胞胎辨識靠顏色與位置，不是讀名字 |

### 4.3 payload 驗證（未來類型用）

```ts
// db/payload.ts
import { z } from 'zod';

// v1 的 feed / diaper 欄位已提升為真欄位，payload 目前只留擴充位
export const eventPayload = z.record(z.string(), z.unknown()).nullable();
```

---

## 5. 專案結構

```
BabyDailyRecord/
├── app/                          # expo-router：檔案即路由
│   ├── _layout.tsx               # 根：跑 migration、載字型、theme
│   ├── onboarding.tsx            # 首次開啟：兩個寶寶的名字、生日、代表色
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 底部三個 tab（拇指可及）
│   │   ├── index.tsx             # 首頁（A2 雙胞胎版）
│   │   ├── history.tsx           # 紀錄（D2 時間軸，顏色分寶寶，按日分組）
│   │   └── settings.tsx          # 設定 / 匯出 / 匯入
│   ├── event/[id].tsx            # 單寶補充 & 編輯（modal）
│   └── session/[sessionId].tsx   # 雙寶補充（modal，連動 + 可分別調）
├── components/
│   ├── BabyCard.tsx              # 一個寶寶的完整卡片（上次紀錄 + 建議 + 雙按鈕）
│   ├── NursingTimerBanner.tsx    # 計時中橫幅（含超時警示）
│   ├── BigActionButton.tsx
│   ├── BothButtonsRow.tsx        # 「兩個都餵了 / 兩個都換了」
│   ├── Chip.tsx
│   ├── AmountPicker.tsx          # ml 快選（含連動）
│   ├── SideSuggestion.tsx        # 左右邊輪替建議
│   ├── EventRow.tsx
│   └── TodaySummary.tsx          # 分寶摘要
├── db/
│   ├── schema.ts
│   ├── payload.ts                # zod
│   ├── client.ts                 # openDatabaseSync({ enableChangeListener: true }) + drizzle
│   └── queries.ts                # 所有查詢集中在此（你的 SQL 直覺在這裡發揮）
├── drizzle/                      # drizzle-kit 產生的 migration（勿手改）
├── theme/
│   ├── colors.ts                 # 淺色 / 深色兩組 + 每寶代表色
│   └── useTheme.ts               # useColorScheme() → 對應色票
├── lib/
│   ├── time.ts                   # 「2 小時 15 分前」、日期分組、計時器經過時間
│   ├── export.ts                 # JSON / CSV 匯出
│   ├── import.ts                 # JSON 匯入（重複 id 跳過）
│   └── uuid.ts
├── assets/fonts/                 # 僅數字/英文字型
├── babel.config.js
├── drizzle.config.ts
└── app.json
```

**關鍵設定**（已查證 Drizzle 官方文件）：

```ts
// db/client.ts
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

const expo = openDatabaseSync('baby.db', { enableChangeListener: true }); // ← 沒有這個，useLiveQuery 不會動
export const db = drizzle(expo);
```

---

## 6. 實作順序

每一步結束時你都能在手機上**看到東西**。步驟 3 之後就可以開始記真實資料。

| # | 內容 | 你會看到 |
|---|---|---|
| 0 | 清掉 Kotlin/Gradle，`create-expo-app`，裝套件，babel 設定 | 掃 QR code，手機上出現空白 APP |
| 1 | `theme/` + A2 首頁靜態版（假資料，兩個寶寶） | 奶油暖木的雙胞胎首頁，按鈕還沒作用 |
| 2 | Drizzle schema + migration + onboarding（建兩個寶寶） | 輸入兩個名字生日，首頁顯示真名字與天數 |
| 3 | 四顆按鈕真的寫入 + `useLiveQuery` | **可以開始用了** —— 按下去，卡片時間自己更新 |
| 4 | 單寶補充彈窗（ml / 奶種 / 左右邊 / 尿布類型 / 顏色） | 按完可以順手加細節 |
| 5 | 「兩個都」捷徑 + 雙寶連動彈窗 | 同時哺餵一鍵記兩筆 |
| 6 | 親餵計時器（可同時掛兩寶）+ APP 內超時橫幅 + 左右邊建議 | 親餵完整可用 |
| 7 | 紀錄頁（D2 時間軸、按日分組、顏色分寶）+ 長按刪除 + 復原 + 編輯 | 按錯有救了 |
| 8 | 分寶今日摘要 + 深色模式 + 觸覺回饋 + 數字字型 | 半夜不刺眼 |
| 9 | 設定頁：寶寶資料、匯出 JSON/CSV、匯入 JSON | 資料不會白記 |
| — | **v1 完成** | |
| 10 | 計時器超時推播通知（Android 權限 + 省電機制對策） | 第二階段 |
| 11 | 統計圖表 / 分寶對照 | 資料累積一週後才有意義 |
| 12 | Supabase 同步 + 伴侶共用 | 第三階段 |

---

## 7. 你要做的三件事

1. **手機從 Play Store 裝 Expo Go**
2. **手機和電腦連同一個 Wi-Fi**（Metro 靠區域網路連線）
3. 什麼都不用裝在電腦上 —— **不需要修 `java` 或 `ANDROID_HOME`**，Expo Go 不經過本機 Android SDK

另外我需要你給我：**兩個寶寶的名字**（或暫時的暱稱），這樣步驟 2 的 onboarding 我可以直接填好預設值。

---

## 8. 已知風險

| 風險 | 影響 | 對策 |
|---|---|---|
| Expo Go 沙箱資料不會搬到未來的正式 APK | **真實紀錄可能白記** | v1 就做 JSON 匯出 + 匯入，轉 APK 時搬一次 |
| 忘記按「結束計時」 | 出現「餵了 6 小時」的髒資料 | APP 內超時橫幅 + 結束時間可手改。第二階段加推播 |
| Android 定製系統（小米/華為/OPPO）省電機制殺背景通知 | 第二階段的推播守護可能不觸發 | v1 完全不依賴通知，所以不是 v1 風險 |
| 雙寶連動彈窗誤植 | 小兔的 ml 被小熊的值蓋掉 | 連動只在「使用者尚未手動改過下面那格」時生效，改過就停止連動 |
| 沒有 React 經驗 | 交接時可能看不懂 | 所有檔案中文註解 + C# 概念對照；`useLiveQuery` 已消掉最難的狀態管理 |
| 單機無備份 | 手機掉了資料就沒了 | 匯出功能 + 建議每週手動匯出一次到雲端硬碟。第三階段接 Supabase 徹底解決 |

---

## 9. 實作結果與偏離規劃之處

v1 已實作完成（步驟 0–9）。`npx tsc --noEmit` 全綠，`npx expo export --platform android` 打包成功（1780 模組 / 3.9MB）。

### 規劃時不知道、實作時才發現的事

| 發現 | 影響 | 處理 |
|---|---|---|
| **`useLiveQuery` 的 `deps` 預設是 `[]`** | 帶參數的查詢在參數變動時**不會**重新查——不會壞掉，但會靜默給舊資料，是最難查的那種 bug。（讀 `node_modules/drizzle-orm/expo-sqlite/query.js` 原始碼確認） | 改成**兩個零參數 live query**（`useBabies` / `useRecentEvents`）+ 純函式在記憶體推導所有衍生值。徹底避開陷阱，且資料量小（1000 筆上限）完全撐得住 |
| `useLiveQuery` 只監聽 query 的**主表** | join 查詢不會在次表變動時重跑 | 同上，一個查詢一張表，變更通知行為完全可預測 |
| Expo SDK 57 把 react 釘在 19.2.3，但 expo-router 的 web 相依拉進 react-dom 19.2.8 | 一般 `npm install` 會 ERESOLVE 失敗 | 加 `.npmrc` 設 `legacy-peer-deps=true`（`expo install` 內部本來就忽略此衝突） |
| SDK 57 空白模板沒有 `babel.config.js`，`babel-preset-expo` 不在頂層 | 我加了 babel 設定後 Metro 找不到 preset，打包直接死 | 把 `babel-preset-expo` 裝成直接依賴 |
| `@expo-google-fonts/nunito` 的 index 會 require 全部 16 種字重 | 會多打包約 2MB | 改用子路徑匯入 `@expo-google-fonts/nunito/700Bold`，實測資產清單只有兩個字重共 **264KB** |
| **`expo-router` 自帶 `MaterialSymbols_400Regular.ttf`（962KB）** | APP 體積裡有這 1MB，不是我們加的 | 沒處理（要拿掉得動 expo-router 內部） |
| **Drizzle 的 `enum` 只是 TypeScript 層約束** | 產生的 SQL 沒有 `CHECK`，資料庫不會擋非法值 | 這正是匯入邊界那層 zod 存在的理由；所有寫入也都集中在 `db/queries.ts` |
| 需要密碼學等級 uuid | Hermes 沒有可靠的 `crypto.randomUUID` | 加裝 `expo-crypto` |

### 規劃沒寫清楚、實作時定案的設計

- **親餵入口**：每張寶寶卡上一顆細長的「開始親餵 · 建議 左」按鈕（採用輪替建議，所以開始計時仍是一鍵）。計時中該按鈕替換成計時橫幅。
- **底部捷徑做了三顆**：「都餵了」「都換了」「同時親餵」。同時親餵進行中時第三顆變成「結束同時哺餵」（實色）。
- **沒有「儲存」按鈕**：補充彈窗每次點擊立刻寫進資料庫，所以滑掉彈窗不可能掉資料。
- **結束親餵後自動開彈窗**：讓你能立刻修正時長，這是「忘記按結束」的補救動線。
- **CSV 加了 UTF-8 BOM**：少了它 Windows 的 Excel 開中文 CSV 會變亂碼。
- **匯出檔名用純 ASCII**：避免 Android 各家檔案管理 App 對中文檔名處理不一致。
- **匯入以 id 為準、已存在一律跳過**：所以重複匯入同一個檔案是安全的。

### 模擬器實測（Pixel 8 Pro / Android 17 API 37）

已用 adb 驅動 UI 走完 onboarding → 記錄 → 補充彈窗 → 歷史頁，逐步截圖驗證。

**已驗證通過**

- onboarding 三欄驗證與即時年齡回饋（輸入 2026-06-24 正確算出「1 個月 12 天」）
- 一鍵記錄真的先寫入資料庫，補充彈窗才浮出
- **`useLiveQuery` 的核心主張成立**：彈窗選完 配方/120ml 返回首頁，卡片自動變成「剛剛 · 08:15 · 配方 120ml」，全程沒有任何手動 refresh、沒有狀態管理程式庫
- 分寶隔離正確（改小熊不影響小兔）
- 歷史頁按日分組、寶寶顏色圖例
- SQLite 跨 APP 重啟持久化（關掉 Expo Go 再開，資料與相對時間都正確）
- 中文字型與 Nunito 數字字型都正常渲染

**實測抓到並修掉的三個 bug**（打包與 `tsc` 都抓不到這類問題）

| bug | 原因 | 修法 |
|---|---|---|
| 底部 tab 文字被 Android 手勢導覽列蓋住 | `tabBarStyle` 寫死 `height: 64`，沒加 safe-area inset | `app/(tabs)/_layout.tsx` 改用 `useSafeAreaInsets()`，高度與下緣留白都加上 `insets.bottom` |
| 全新安裝就顯示兩個紅色「該餵了」 | `isFeedDue(undefined)` 回傳 `true`。零筆紀錄代表「沒有資訊」不代表「該餵了」，而警示看久了會被無視 | 改為回傳 `false` |
| **連點兩次按鈕產生兩筆重複紀錄** | `onPress` → `await logFeed()` → `router.push()` 之間沒有重入保護，而這段空窗期畫面看起來毫無反應，人的自然反應就是再按一次 | 新增 `lib/useActionLock.ts`（ref 鎖 + 700ms 冷卻），首頁所有寫入動作共用一把鎖。已用 150ms 間隔連點兩次實測確認只產生一筆 |

**仍未驗證**（模擬器測不出來，要真手機）

觸覺回饋強度、深色模式的實際觀感、匯出的系統分享選單、`expo-document-picker` 回傳的 content URI 能否被 `new File()` 讀取、各家 Android 定製系統的行為差異。

### 模擬器開發的兩個環境坑（實測踩到）

**1. `--localhost` 模式在這台機器上會壞掉，因為 Metro 只綁 IPv6**

`npx expo start --localhost` 時 Node 把 `localhost` 解析成 IPv6，Metro 只綁 `::1`：

| 測試 | 結果 |
|---|---|
| `http://127.0.0.1:8081/status`（IPv4） | ❌ 連不上 |
| `http://[::1]:8081/status`（IPv6） | ✅ 200 |
| `adb reverse tcp:8081 tcp:8081` | 存在，但轉發到 **IPv4** `127.0.0.1:8081` |

結果就是 adb 通道把請求送到一個沒人在聽的位址，Expo Go 顯示「Something went wrong」，而 Metro 端完全看不到任何打包請求。

解法是強迫 Node 優先解析 IPv4。已包成 npm script，不用每次記：

```
npm run emu
```
（= `cross-env NODE_OPTIONS=--dns-result-order=ipv4first expo start --localhost --android`）

驗證：Metro 改綁 `127.0.0.1`，`Android Bundled 2545ms (1943 modules)` 走 adb reverse 成功。

**2. adb server 會卡死，症狀會偽裝成別的問題**

`adb devices` 無回應時，Expo 的 `--localhost` 模式（需要先跑 `adb reverse`）會停在「Starting Metro Bundler」不動，並每 10 秒重試堆積 adb 行程（實測累積到 51 個）。真正的錯誤是 `adb start-server` 回 `protocol fault (couldn't read status): connection reset`。

處理方式：
```
taskkill /F /IM adb.exe /T
adb start-server
adb devices          # 等它從 authorizing 變成 device
```

### 模擬器打不出中文（已查證，不是設定問題）

- 這台模擬器只裝了 Gboard 英文版與語音輸入，**沒有任何中文輸入法**
- Gboard 內建 **145 種鍵盤佈局，但 `zh_*` 是零** —— 中文佈局要從 Google 下載語言包，需要在模擬器裡登入 Google 帳號
- **用電腦鍵盤打中文架構上不可能**：Windows 的注音/拼音在 Windows 上組字，模擬器收到的是原始按鍵事件而非組好的字

可行做法：
1. **剪貼簿貼上**（已實測可行）：Windows 複製中文 → 點模擬器欄位 → Ctrl+V。模擬器與主機共用剪貼簿
2. 在模擬器登入 Google，讓 Gboard 下載中文語言包
3. 用實體手機（自己的中文鍵盤直接可用）

**待討論的設計取捨**

兩張寶寶卡的大按鈕顏色完全相同（喝奶=蜜桃、尿布=薄荷），所以半夜辨識寶寶只靠「卡片底色 + 名字 + 垂直位置」。若改成按鈕也染上寶寶色，辨識寶寶會更快，但會失去「喝奶 vs 尿布」的動作色編碼（也就更容易按錯類型）。兩種錯誤哪個更痛，要實際用過才知道。

---

## 10. 與此規劃無關的待辦

**GitHub 推送仍然卡住**，與 APP 開發無關但沒解決：

- 遠端已改為 `https://eatmilk36@github.com/eatmilk36/BabyDailyRecord.git`
- 初始 commit `d596795` 已建立（Kotlin 骨架，36 檔案）
- 電腦的憑證管理員只存了 `jeterhsu-code`，該帳號對 `eatmilk36/BabyDailyRecord` **無寫入權限**（403）
- 解法二選一：用 `eatmilk36` 重新登入（跑 `! git push -u origin master` 讓 GCM 彈窗），或到 GitHub 把 `jeterhsu-code` 加為 collaborator
