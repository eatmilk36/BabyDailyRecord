import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from './client';
import {
  babies,
  events,
  type Baby,
  type BabyEvent,
  type DiaperKind,
  type MilkKind,
  type NursingSide,
} from './schema';
import { newId } from '../lib/uuid';
import { dayKey, startOfToday } from '../lib/time';

/** 預留雲端同步用。單機版全部寫這個值。 */
export const LOCAL_FAMILY_ID = 'local';

/**
 * 一次抓進記憶體的事件數上限。
 * 雙胞胎一天約 50 筆（16 次餵 ×2 + 20 片尿布），1000 筆約覆蓋 20 天，
 * 足夠首頁、今日摘要、左右邊建議與歷史頁使用。
 */
export const RECENT_LIMIT = 1000;

/** 親餵計時超過這個分鐘數就在首頁顯示警示（防止忘記按結束） */
export const NURSING_OVERDUE_MIN = 60;

/** 距上次餵奶超過這個小時數就顯示「該餵了」 */
export const FEED_DUE_HOURS = 3;

// ---------------------------------------------------------------------------
// Live queries
//
// ⚠️ 重要：useLiveQuery 的第二個參數 deps 預設是 []，代表查詢只在元件掛載時
// 建立一次。所以【任何帶參數的查詢都必須顯式傳 deps】，否則參數變了查詢不會
// 更新（不會壞掉，但會靜默給你舊資料，這種 bug 最難查）。
//
// 為了徹底避開這個陷阱，這裡只放兩個【零參數】的查詢，其他一切都用下面的
// 純函式在記憶體裡推導。另一個好處：useLiveQuery 只監聽 query 的主表，
// 所以「一個查詢一張表」也讓變更通知的行為完全可預測。
// ---------------------------------------------------------------------------

/** 所有寶寶，依首頁固定排列順序。 */
export function useBabies() {
  const { data, error, updatedAt } = useLiveQuery(
    db.select().from(babies).where(isNull(babies.deletedAt)).orderBy(asc(babies.sortOrder)),
  );
  return { babies: data as Baby[], error, loaded: updatedAt !== undefined };
}

/** 最近的事件，新到舊。首頁與歷史頁都吃這一份。 */
export function useRecentEvents() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(events)
      .where(isNull(events.deletedAt))
      .orderBy(desc(events.occurredAt))
      .limit(RECENT_LIMIT),
  );
  return { events: data as BabyEvent[], error, loaded: updatedAt !== undefined };
}

/**
 * 某一天的事件（紀錄頁的日期導覽用），新到舊。
 *
 * ⚠️ 這是全專案唯一帶參數的 live query，所以【必須顯式傳 deps】。
 * useLiveQuery 的 deps 預設是 []，不傳的話換日期時查詢不會重跑 ——
 * 不會壞掉，但會靜默給你前一天的資料，這種 bug 最難查。
 */
export function useEventsForDay(dayStart: number) {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(events)
      .where(
        and(
          isNull(events.deletedAt),
          gte(events.occurredAt, dayStart),
          lt(events.occurredAt, dayStart + 86_400_000),
        ),
      )
      .orderBy(desc(events.occurredAt)),
    [dayStart],
  );
  return { events: data as BabyEvent[], error, loaded: updatedAt !== undefined };
}

/**
 * 母乳庫存（ml）= Σ擠出的量 − Σ（瓶餵且奶種=母奶）。
 *
 * 刻意【不存庫存欄位】，完全從紀錄推導 —— 這樣不可能出現「庫存數字和實際
 * 紀錄不一致」的 bug（那種 bug 只要漏改一處就會慢慢飄掉，而且很難發現）。
 *
 * ⚠️ 這裡必須用 SQL 聚合掃全表，不能用 useRecentEvents 的 1000 筆上限 ——
 * 庫存是從第一天累積的，用 capped 的清單算會靜默算錯。
 */
export function useMilkStashMl() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select({
        pumped: sql<number>`coalesce(sum(case when ${events.type} = 'pump' then ${events.amountMl} else 0 end), 0)`,
        used: sql<number>`coalesce(sum(case when ${events.type} = 'feed' and ${events.method} = 'bottle' and ${events.milk} = 'breast' then ${events.amountMl} else 0 end), 0)`,
      })
      .from(events)
      .where(isNull(events.deletedAt)),
  );

  const row = (data as { pumped: number; used: number }[])[0];
  return {
    pumped: row?.pumped ?? 0,
    used: row?.used ?? 0,
    stash: (row?.pumped ?? 0) - (row?.used ?? 0),
    error,
    loaded: updatedAt !== undefined,
  };
}

/**
 * 所有生長紀錄，舊到新（畫曲線要按時間遞增）。
 * 用專用查詢而不是共用的最近 1000 筆：生長紀錄筆數少但跨好幾個月，
 * 很容易被日常的餵奶尿布紀錄擠出那 1000 筆之外。
 */
export function useGrowthEvents() {
  const { data, error, updatedAt } = useLiveQuery(
    db
      .select()
      .from(events)
      .where(and(isNull(events.deletedAt), eq(events.type, 'growth')))
      .orderBy(asc(events.occurredAt)),
  );
  return { events: data as BabyEvent[], error, loaded: updatedAt !== undefined };
}

// ---------------------------------------------------------------------------
// 推導（純函式）
// 全部假設傳進來的 list 是【新到舊】排序，也就是 useRecentEvents 的輸出。
// ---------------------------------------------------------------------------

/** 某寶最後一筆某類型的紀錄（不含正在進行中的計時）。 */
export function lastEventOf(
  list: BabyEvent[],
  babyId: string,
  type: BabyEvent['type'],
): BabyEvent | undefined {
  return list.find((e) => e.babyId === babyId && e.type === type && e.status === 'done');
}

/** 某寶正在進行中的親餵計時。 */
export function activeNursingOf(list: BabyEvent[], babyId: string): BabyEvent | undefined {
  return list.find((e) => e.babyId === babyId && e.status === 'active' && e.type === 'feed');
}

/** 某寶正在睡（進行中的睡眠紀錄）。 */
export function activeSleepOf(list: BabyEvent[], babyId: string): BabyEvent | undefined {
  return list.find((e) => e.babyId === babyId && e.status === 'active' && e.type === 'sleep');
}

export type GrowthPoint = {
  at: number;
  weightG: number | null;
  heightMm: number | null;
  headMm: number | null;
};

/** 某寶的生長序列，舊到新。傳進來的清單要是 useGrowthEvents 的輸出（已遞增排序）。 */
export function growthSeriesOf(list: BabyEvent[], babyId: string): GrowthPoint[] {
  return list
    .filter((e) => e.babyId === babyId && e.type === 'growth')
    .map((e) => ({
      at: e.occurredAt,
      weightG: e.weightG,
      heightMm: e.heightMm,
      headMm: e.headMm,
    }));
}

/** 全部進行中的親餵計時（同時哺餵會有兩筆）。 */
export function allActiveNursing(list: BabyEvent[]): BabyEvent[] {
  return list.filter((e) => e.status === 'active');
}

/**
 * 左右邊輪替建議。
 *
 * 雙胞胎親餵有 2 寶 × 2 邊 = 4 種組合，半夜絕對記不住。
 * 規則很簡單：找這寶上次親餵吃哪一邊，建議另一邊。沒紀錄就不建議。
 */
export function suggestNextSide(list: BabyEvent[], babyId: string): NursingSide | undefined {
  const last = list.find(
    (e) =>
      e.babyId === babyId &&
      e.type === 'feed' &&
      e.method === 'nursing' &&
      (e.side === 'left' || e.side === 'right'),
  );
  if (!last) return undefined;
  return last.side === 'left' ? 'right' : 'left';
}

export type TodayStats = {
  feedCount: number;
  totalMl: number;
  nursingMin: number;
  diaperCount: number;
  poopCount: number;
  /** 睡眠總分鐘（只算已結束的，進行中的不列入以免數字一直跳） */
  sleepMin: number;
  sleepCount: number;
};

/**
 * 某寶在【傳進來的這批事件】裡的統計，不再自己過濾日期。
 * 這樣同一個函式可以算「今天」也可以算「紀錄頁選定的那一天」。
 */
export function statsOf(list: BabyEvent[], babyId: string): TodayStats {
  const mine = list.filter((e) => e.babyId === babyId);

  const feeds = mine.filter((e) => e.type === 'feed');
  const sleeps = mine.filter((e) => e.type === 'sleep' && e.status === 'done');

  return {
    feedCount: feeds.filter((e) => e.status === 'done').length,
    // 只加喝奶的量 —— 擠奶也用 amountMl，不篩 type 會把擠出的量算進攝入量
    totalMl: feeds.reduce((sum, e) => sum + (e.amountMl ?? 0), 0),
    nursingMin: feeds.reduce((sum, e) => sum + (e.durationMin ?? 0), 0),
    diaperCount: mine.filter((e) => e.type === 'diaper').length,
    poopCount: mine.filter(
      (e) => e.type === 'diaper' && (e.diaperKind === 'poop' || e.diaperKind === 'both'),
    ).length,
    sleepMin: sleeps.reduce((sum, e) => sum + (e.durationMin ?? 0), 0),
    sleepCount: sleeps.length,
  };
}

/** 某寶今天的統計（首頁用）。雙胞胎最重要的就是分開看。 */
export function todayStats(
  list: BabyEvent[],
  babyId: string,
  now: number = Date.now(),
): TodayStats {
  const from = startOfToday(now);
  return statsOf(
    list.filter((e) => e.occurredAt >= from),
    babyId,
  );
}

/**
 * 距上次餵奶是否已超過 FEED_DUE_HOURS。
 *
 * 沒有任何紀錄時回傳 false 而不是 true：零筆紀錄代表「沒有資訊」，
 * 不代表「該餵了」。一裝好 APP 就看到兩個紅色警示只是噪音，
 * 而警示看久了會被無視，那才是真正的損失。
 */
export function isFeedDue(last: BabyEvent | undefined, now: number = Date.now()): boolean {
  if (!last) return false;
  return now - last.occurredAt >= FEED_DUE_HOURS * 3600_000;
}

export type DayGroup = { key: string; items: BabyEvent[] };

/** 依日期分組（新到舊）。歷史頁用。 */
export function groupByDay(list: BabyEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | undefined;

  for (const e of list) {
    const key = dayKey(e.occurredAt);
    if (!current || current.key !== key) {
      current = { key, items: [] };
      groups.push(current);
    }
    current.items.push(e);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 寫入
// 所有寫入都集中在這裡，這樣「哪裡會改資料」永遠只有一個答案。
// C# 對照：把這個檔案當成 Repository 層。
// ---------------------------------------------------------------------------

export async function createBabies(
  input: { name: string; birthDate: string; sex?: Baby['sex'] }[],
): Promise<void> {
  const now = Date.now();
  const colors: Baby['colorKey'][] = ['peach', 'mint'];

  await db.insert(babies).values(
    input.map((b, i) => ({
      id: newId(),
      name: b.name,
      birthDate: b.birthDate,
      sex: b.sex ?? null,
      colorKey: colors[i % colors.length],
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function updateBaby(
  id: string,
  patch: Partial<Pick<Baby, 'name' | 'birthDate' | 'sex' | 'colorKey' | 'sortOrder'>>,
): Promise<void> {
  await db
    .update(babies)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(babies.id, id));
}

type FeedFields = {
  method?: BabyEvent['method'];
  milk?: MilkKind;
  amountMl?: number;
  durationMin?: number;
  side?: NursingSide;
};

/**
 * 一鍵記錄喝奶。
 * 注意順序：先寫入資料庫（時間 = 現在），才浮出補充彈窗。
 * 所以使用者把彈窗滑掉也已經存好了——這是整個 APP 最重要的互動原則。
 */
export async function logFeed(babyId: string, fields: FeedFields = {}): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId,
    type: 'feed',
    occurredAt: now,
    status: 'done',
    createdAt: now,
    updatedAt: now,
    ...fields,
  });
  return id;
}

export async function logDiaper(
  babyId: string,
  fields: { diaperKind?: DiaperKind; diaperColor?: BabyEvent['diaperColor'] } = {},
): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId,
    type: 'diaper',
    occurredAt: now,
    status: 'done',
    createdAt: now,
    updatedAt: now,
    ...fields,
  });
  return id;
}

/**
 * 「兩個都餵了」/「兩個都換了」。
 * 產生【兩筆】事件、共用一個 sessionId。回傳 sessionId 讓補充彈窗一次編輯兩筆。
 */
export async function logBoth(
  babyIds: string[],
  type: BabyEvent['type'],
): Promise<string> {
  const now = Date.now();
  const sessionId = newId();

  await db.insert(events).values(
    babyIds.map((babyId) => ({
      id: newId(),
      familyId: LOCAL_FAMILY_ID,
      babyId,
      sessionId,
      type,
      occurredAt: now,
      status: 'done' as const,
      createdAt: now,
      updatedAt: now,
    })),
  );
  return sessionId;
}

/** 開始親餵計時（單寶）。 */
export async function startNursing(babyId: string, side?: NursingSide): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId,
    type: 'feed',
    method: 'nursing',
    milk: 'breast',
    side,
    occurredAt: now,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * 同時哺餵：一次開兩個計時器，左右邊互斥。
 * firstSide 是第一個寶寶吃的邊，第二個自動拿另一邊。
 */
export async function startNursingBoth(
  babyIds: string[],
  firstSide: NursingSide = 'left',
): Promise<string> {
  const now = Date.now();
  const sessionId = newId();
  const other: NursingSide = firstSide === 'left' ? 'right' : 'left';

  await db.insert(events).values(
    babyIds.map((babyId, i) => ({
      id: newId(),
      familyId: LOCAL_FAMILY_ID,
      babyId,
      sessionId,
      type: 'feed' as const,
      method: 'nursing' as const,
      milk: 'breast' as const,
      side: i === 0 ? firstSide : other,
      occurredAt: now,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    })),
  );
  return sessionId;
}

/** 結束計時：寫入結束時間並換算成分鐘。 */
export async function endNursing(eventId: string): Promise<void> {
  const now = Date.now();
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const row = rows[0];
  if (!row) return;

  await db
    .update(events)
    .set({
      endedAt: now,
      status: 'done',
      durationMin: Math.max(1, Math.round((now - row.occurredAt) / 60000)),
      updatedAt: now,
    })
    .where(eq(events.id, eventId));
}

/** 結束一整個同時哺餵 session（兩寶一起停）。 */
export async function endNursingSession(sessionId: string): Promise<void> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.sessionId, sessionId), isNull(events.deletedAt)));

  for (const row of rows) {
    if (row.status === 'active') await endNursing(row.id);
  }
}

/**
 * 擠奶事件用的 babyId。
 *
 * 擠奶是媽媽做的事，不屬於任何一個寶寶，但 babyId 是 NOT NULL。
 * SQLite 沒辦法用 ALTER 移除 NOT NULL（要整表重建，對已有真實資料的
 * 手機是不必要的風險），所以用一個哨兵值表示「屬於家庭而非某個寶寶」。
 *
 * 好處是所有 `e.babyId === babyId` 的篩選都自然排除它 —— 擠奶不會被算進
 * 任一寶的攝入量，這正是我們要的。
 */
export const SHARED_BABY_ID = 'shared';

/** 開始睡眠計時。結束時用 endSleep。 */
export async function startSleep(babyId: string): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId,
    type: 'sleep',
    occurredAt: now,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** 結束睡眠。與 endNursing 是同一套邏輯（寫 endedAt 並換算分鐘）。 */
export const endSleep = endNursing;

/** 擠奶。不屬於任何寶寶，所以用 SHARED_BABY_ID。 */
export async function logPump(amountMl?: number): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId: SHARED_BABY_ID,
    type: 'pump',
    occurredAt: now,
    status: 'done',
    amountMl: amountMl ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** 生長紀錄（體重／身長／頭圍，都可選填）。 */
export async function logGrowth(
  babyId: string,
  m: { weightG?: number | null; heightMm?: number | null; headMm?: number | null },
): Promise<string> {
  const now = Date.now();
  const id = newId();
  await db.insert(events).values({
    id,
    familyId: LOCAL_FAMILY_ID,
    babyId,
    type: 'growth',
    occurredAt: now,
    status: 'done',
    weightG: m.weightG ?? null,
    heightMm: m.heightMm ?? null,
    headMm: m.headMm ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export type EventPatch = Partial<
  Pick<
    BabyEvent,
    | 'occurredAt'
    | 'endedAt'
    | 'method'
    | 'milk'
    | 'amountMl'
    | 'durationMin'
    | 'side'
    | 'diaperKind'
    | 'stoolCard'
    | 'diaperColor'
    | 'weightG'
    | 'heightMm'
    | 'headMm'
    | 'note'
  >
>;

export async function updateEvent(id: string, patch: EventPatch): Promise<void> {
  await db
    .update(events)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(events.id, id));
}

/** 軟刪除。因為是軟的，所以「5 秒內復原」是免費的。 */
export async function softDeleteEvent(id: string): Promise<void> {
  const now = Date.now();
  await db.update(events).set({ deletedAt: now, updatedAt: now }).where(eq(events.id, id));
}

export async function restoreEvent(id: string): Promise<void> {
  await db
    .update(events)
    .set({ deletedAt: null, updatedAt: Date.now() })
    .where(eq(events.id, id));
}

/** 讀單筆（補充/編輯彈窗用，不需要 live）。 */
export async function getEvent(id: string): Promise<BabyEvent | undefined> {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0];
}

/** 讀一個 session 的所有事件（雙寶彈窗用）。 */
export async function getSessionEvents(sessionId: string): Promise<BabyEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.sessionId, sessionId), isNull(events.deletedAt)))
    .orderBy(asc(events.createdAt));
}

/** 匯出用：全部資料（含已刪除，這樣還原後刪除狀態也一致）。 */
export async function dumpAll(): Promise<{ babies: Baby[]; events: BabyEvent[] }> {
  return {
    babies: await db.select().from(babies),
    events: await db.select().from(events),
  };
}
