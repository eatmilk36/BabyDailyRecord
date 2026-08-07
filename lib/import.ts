import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { z } from 'zod';
import { db } from '../db/client';
import { babies, events } from '../db/schema';
import { EXPORT_FORMAT } from './export';

/**
 * 從 JSON 備份還原。
 *
 * 這是 Expo Go →  正式 APK 搬家的另一半，也是換手機時的救命通道。
 *
 * 規則：以 id 為準，【已存在的 id 一律跳過】，不覆蓋。
 * 這樣重複匯入同一個檔案是安全的（idempotent），也不會把你目前的資料弄壞。
 *
 * zod 在這裡的角色是守住邊界：檔案是外部來的，可能被改壞、可能是別的 APP 的
 * JSON、可能是舊版格式。與其讓壞資料寫進資料庫之後才炸掉，不如在門口就攔下來。
 */

const babySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(['boy', 'girl']).nullable().default(null),
  colorKey: z.enum(['peach', 'mint']),
  sortOrder: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable().default(null),
});

const eventSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1),
  babyId: z.string().min(1),
  sessionId: z.string().nullable().default(null),
  type: z.enum(['feed', 'diaper']),
  occurredAt: z.number().int(),
  endedAt: z.number().int().nullable().default(null),
  status: z.enum(['active', 'done']).default('done'),
  method: z.enum(['bottle', 'nursing']).nullable().default(null),
  milk: z.enum(['breast', 'formula', 'mixed']).nullable().default(null),
  amountMl: z.number().int().nullable().default(null),
  durationMin: z.number().int().nullable().default(null),
  side: z.enum(['left', 'right', 'both']).nullable().default(null),
  diaperKind: z.enum(['pee', 'poop', 'both']).nullable().default(null),
  // 九色大便卡編號 1–9，0 = 說不準
  stoolCard: z.number().int().min(0).max(9).nullable().default(null),
  diaperColor: z.enum(['yellow', 'green', 'brown', 'black', 'white']).nullable().default(null),
  payload: z.record(z.string(), z.unknown()).nullable().default(null),
  note: z.string().nullable().default(null),
  createdBy: z.string().nullable().default(null),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable().default(null),
});

const backupSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int(),
  exportedAt: z.number().int().optional(),
  babies: z.array(babySchema),
  events: z.array(eventSchema),
});

export type ImportResult = {
  babiesAdded: number;
  babiesSkipped: number;
  eventsAdded: number;
  eventsSkipped: number;
};

/** 回傳 null = 使用者取消選檔。丟出 Error = 檔案有問題。 */
export async function importJson(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || picked.assets.length === 0) return null;

  const text = await new File(picked.assets[0].uri).text();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('這不是有效的 JSON 檔案');
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('這個檔案不是寶寶日誌的備份，或格式版本不相容');
  }
  const backup = parsed.data;

  const existingBabyIds = new Set((await db.select({ id: babies.id }).from(babies)).map((r) => r.id));
  const existingEventIds = new Set((await db.select({ id: events.id }).from(events)).map((r) => r.id));

  const newBabies = backup.babies.filter((b) => !existingBabyIds.has(b.id));
  const newEvents = backup.events.filter((e) => !existingEventIds.has(e.id));

  // 分批插入，避免一次塞太多參數觸到 SQLite 的變數上限
  for (const chunk of chunked(newBabies, 200)) {
    await db.insert(babies).values(chunk);
  }
  for (const chunk of chunked(newEvents, 200)) {
    await db.insert(events).values(chunk);
  }

  return {
    babiesAdded: newBabies.length,
    babiesSkipped: backup.babies.length - newBabies.length,
    eventsAdded: newEvents.length,
    eventsSkipped: backup.events.length - newEvents.length,
  };
}

function chunked<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
