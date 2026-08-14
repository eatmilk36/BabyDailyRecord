import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { z } from 'zod';
import { db } from '../db/client';
import { babies, events } from '../db/schema';
import { EXPORT_FORMAT } from './export';
// ⚠️ 這是純模組（沒有 React），所以用模組層級的 t() 而不是 useT()。
// 沒有循環相依：lib/i18n.ts 不 import 專案內的任何模組（理由見它開頭的註解）。
import { plural, t } from './i18n';

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
  // ⚠️ 這裡【必須】跟 db/schema.ts 的 type enum 完全一致。
  // 少一個就等於「自己匯出的備份匯不回來」——因為 zod 會讓整份檔案驗證失敗，
  // 使用者看到的是「這個檔案不是寶寶日誌的備份」，而備份是單機版唯一的保命通道。
  // 曾經漏掉 sleep / pump / growth 三種，只要備份裡有任何一筆就整份被拒。
  type: z.enum(['feed', 'diaper', 'sleep', 'pump', 'growth']),
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
  // 生長紀錄的三個量測。zod 的 object 預設會【剝掉】沒宣告的欄位，
  // 所以漏掉這三個不會報錯，只會讓匯入後的生長紀錄變成三個 null——
  // 靜默掉資料比整份被拒還難發現。
  weightG: z.number().int().nullable().default(null),
  heightMm: z.number().int().nullable().default(null),
  headMm: z.number().int().nullable().default(null),
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
    // ⚠️ 這幾句 Error 訊息【會原封不動顯示給使用者】——onboarding 與設定頁都是
    //    Alert.alert('匯入失敗', e.message)，所以它們是文案不是內部日誌，必須翻。
    throw new Error(t('import.invalidJson'));
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    // 一定要講【哪裡】不合。原本只說「這個檔案不是寶寶日誌的備份」，
    // 結果真正的原因是 schema 漏了 sleep/pump/growth 三種 type，
    // 而那句話讓人以為是選錯檔案，完全查不到真因。
    const issues = parsed.error.issues.slice(0, 3).map((i) => {
      const where = i.path.length > 0 ? i.path.join('.') : t('import.rootLevel');
      // ⚠️ {message} 是 zod 函式庫自己吐出來的英文訊息，【不翻譯】——我們只翻包在外面的框架句。
      //    副作用是中文模式會看到「中文框架句 + 英文 zod 訊息」，這是既有行為，這批不處理。
      return t('import.issueLine', { where, message: i.message });
    });
    const extra = parsed.error.issues.length - 3;
    // plural()：英文要分「1 more problem」與「2 more problems」；中文兩個字典值一樣，等於 no-op。
    // ⚠️ 前面那個 '\n' 是接在 issues 後面的分隔換行，屬於【組裝】不是文案，所以留在程式碼裡。
    const more = extra > 0 ? '\n' + t(plural(extra, 'import.moreIssues'), { n: extra }) : '';
    // ⚠️ 同理，這裡的換行與 join('\n') 也不進字典——字典只放句子，版面規則留在程式碼，
    //    否則等於把排版交到翻譯者手上。
    throw new Error(`${t('import.badFormat')}\n${issues.join('\n')}${more}`);
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
