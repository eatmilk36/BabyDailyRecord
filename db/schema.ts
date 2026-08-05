import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * 資料模型設計說明（給未來的你）
 * ================================
 *
 * 【為什麼是「真欄位 + payload」混合式，而不是純 JSONB？】
 *
 * 原本規劃是單一 events 表 + 一個 JSON payload 裝所有細節。雙胞胎改變了計算：
 * 「分寶每日總 ml」、「這寶上次吃哪一邊」從選配變成【首頁每次渲染都要跑】的查詢。
 * 純 JSONB 會讓每支查詢都要寫 json_extract(payload,'$.side')，沒有型別保護。
 *
 * 這【不是】效能問題——雙胞胎一年約 18,000 筆，SQLite 掃這個量在毫秒級。
 * 是查詢人體工學與型別安全問題。
 *
 * 擴充性沒有損失：之後要加睡眠紀錄，只需要 occurred_at + ended_at（已經在了），
 * 特殊欄位再進 payload。
 *
 * 【為什麼 id 是 uuid 而不是自增？】
 * 之後接雲端同步時，兩台裝置各自產生的自增 id 必然撞號。uuid 現在零成本。
 *
 * 【為什麼是軟刪除？】
 * 一是同步友善，二是免費得到「5 秒內復原」——半夜按錯必備。
 */

/** 寶寶。雙胞胎就是兩筆。 */
export const babies = sqliteTable('babies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** 'YYYY-MM-DD'。雙胞胎通常同一天，但仍各存一筆 */
  birthDate: text('birth_date').notNull(),
  /** 固定代表色 key（見 theme/colors.ts）。半夜辨識靠顏色，不是讀名字 */
  colorKey: text('color_key', { enum: ['peach', 'mint'] }).notNull(),
  /** 首頁固定排列位置。位置本身也是辨識線索，所以不能讓它跳動 */
  sortOrder: integer('sort_order').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    /** 預留雲端同步用。v1 固定寫 'local' */
    familyId: text('family_id').notNull(),
    babyId: text('baby_id').notNull(),
    /**
     * 同時哺餵 / 一起換尿布時，兩筆事件共用同一個 sessionId。
     * 刻意記成兩筆而非「一筆掛兩寶」——因為兩寶的 ml/時長/左右邊都是各自的資料，
     * 硬塞成一筆之後所有查詢都要拆。sessionId 讓你之後仍能還原「這兩筆同時發生」。
     */
    sessionId: text('session_id'),
    type: text('type', { enum: ['feed', 'diaper'] }).notNull(),

    /** 事件發生時間（epoch ms）。親餵 = 開始時間，因為「上次幾小時前」算的是開始 */
    occurredAt: integer('occurred_at').notNull(),
    /** 僅親餵計時使用 */
    endedAt: integer('ended_at'),
    /**
     * 'active' = 親餵計時進行中。
     * 為什麼不用「ended_at is null」判斷？因為瓶餵和尿布的 ended_at 本來就是 null，
     * 會有歧義。獨立欄位讓「進行中」無歧義且可索引。
     */
    status: text('status', { enum: ['active', 'done'] })
      .notNull()
      .default('done'),

    // ---- 喝奶欄位 ----
    method: text('method', { enum: ['bottle', 'nursing'] }),
    milk: text('milk', { enum: ['breast', 'formula', 'mixed'] }),
    /** 實際喝掉的量。刻意不記「泡了多少」——回診時醫生問的是攝入量 */
    amountMl: integer('amount_ml'),
    durationMin: integer('duration_min'),
    side: text('side', { enum: ['left', 'right', 'both'] }),

    // ---- 尿布欄位 ----
    diaperKind: text('diaper_kind', { enum: ['pee', 'poop', 'both'] }),
    /** 對應台灣新生兒健康手冊的嬰兒大便卡。白色/灰白色是膽道閉鎖警訊，需立刻就醫 */
    diaperColor: text('diaper_color', {
      enum: ['yellow', 'green', 'brown', 'black', 'white'],
    }),

    /** 留給未來的紀錄類型（睡眠、體重、副食品…），v1 一律 null */
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    note: text('note'),
    /** 預留同步用（是誰記的）。v1 為 null */
    createdBy: text('created_by'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    /** 軟刪除 */
    deletedAt: integer('deleted_at'),
  },
  (t) => [
    // 首頁：每寶上次紀錄
    index('idx_events_baby_time').on(t.babyId, t.occurredAt),
    // 分寶摘要 / 左右邊輪替建議
    index('idx_events_baby_type_time').on(t.babyId, t.type, t.occurredAt),
    // 進行中的親餵計時
    index('idx_events_status').on(t.status),
    // 還原同時哺餵
    index('idx_events_session').on(t.sessionId),
  ],
);

export type Baby = typeof babies.$inferSelect;
export type NewBaby = typeof babies.$inferInsert;
export type BabyEvent = typeof events.$inferSelect;
export type NewBabyEvent = typeof events.$inferInsert;

export type EventType = BabyEvent['type'];
export type FeedMethod = NonNullable<BabyEvent['method']>;
export type MilkKind = NonNullable<BabyEvent['milk']>;
export type NursingSide = NonNullable<BabyEvent['side']>;
export type DiaperKind = NonNullable<BabyEvent['diaperKind']>;
export type DiaperColor = NonNullable<BabyEvent['diaperColor']>;
