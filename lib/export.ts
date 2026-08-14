import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dumpAll } from '../db/queries';
import type { Baby, BabyEvent } from '../db/schema';
import { t } from './i18n';
import {
  diaperColorLabel,
  diaperKindLabel,
  isStoolCardAbnormal,
  methodLabel,
  milkLabel,
  sexLabel,
  sideLabel,
  stoolCardLabel,
  typeLabel,
} from './labels';

/**
 * 匯出備份。
 *
 * ⚠️ 為什麼這個功能在 v1 就必須有：
 * Expo Go 裡的 SQLite 資料存在 Expo Go 自己的沙箱。等你之後把 APP 裝成
 * 獨立的 APK（自己的圖示、不用開 Expo Go），那是不同的 package name、
 * 不同的沙箱——這段期間記的所有真實資料【不會】自動跟著過去。
 * 匯出 + 匯入就是那次搬家的通道。
 *
 * 建議每週也手動匯出一次丟到雲端硬碟，因為單機版沒有其他備份。
 */

export const EXPORT_FORMAT = 'BabyDailyRecord';
export const EXPORT_VERSION = 1;

/**
 * 匯出的結果。回傳給呼叫端做【成功回饋】用。
 *
 * ⚠️ shareAsync 沒辦法告訴我們使用者最後有沒有真的存檔（Android 的分享選單
 * 不回報結果）。所以「成功」的定義只到「檔案產生了、分享選單開過了」——
 * 回饋文案必須誠實到這個程度，不能宣稱備份已經完成。
 */
export type ExportResult = {
  filename: string;
  babies: number;
  events: number;
};

/** 完整備份（JSON）。含已軟刪除的資料，這樣還原後刪除狀態也一致。 */
export async function exportJson(): Promise<ExportResult> {
  const data = await dumpAll();
  const payload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    babies: data.babies,
    events: data.events,
  };

  const filename = `baby-log-backup-${stamp()}.json`;
  await shareText(filename, JSON.stringify(payload, null, 2), 'application/json');
  return { filename, babies: data.babies.length, events: data.events.length };
}

/** 給醫生看的表（CSV）。只含未刪除的紀錄，表頭跟著 APP 語言走。 */
export async function exportCsv(): Promise<ExportResult> {
  const { babies, events } = await dumpAll();
  const babyById = new Map(babies.map((b) => [b.id, b]));

  const rows = events
    .filter((e) => e.deletedAt == null)
    .sort((a, b) => a.occurredAt - b.occurredAt)
    .map((e) => toCsvRow(e, babyById));

  // 表頭【跟著 APP 語言走】，所以英文模式匯出的 CSV 會整張變英文——連遞給台灣醫生的
  // 那一份也是。這是刻意的取捨：值早就走字典了，若表頭留中文就變成「中文表頭 + 英文值」，
  // 讀者得在兩套詞彙之間換檔，比全英文更難讀。全英文至少是一致的，而使用者切成英文
  // 本來就是他自己的選擇。真要中文表格，切回中文再匯出一次即可。
  //
  // ⚠️ 這個陣列必須留在函式體內，不可提到模組層級。模組層級的 const 只會在 import 時
  //    求值一次，那時 currentLang 還是預設的 zh-TW——使用者切成英文後匯出仍會拿到中文表頭。
  const header = [
    t('csv.headerBaby'),
    t('csv.headerSex'),
    t('csv.headerDate'),
    t('csv.headerTime'),
    t('csv.headerType'),
    t('csv.headerMethod'),
    t('csv.headerMilk'),
    t('csv.headerAmountMl'),
    // durationMin 同時用在親餵與睡眠，欄名不能只寫「親餵分鐘」／'Nursing min'，
    // 否則睡眠那幾列會被標成親餵
    t('csv.headerDurationMin'),
    t('csv.headerSide'),
    t('csv.headerDiaperKind'),
    t('csv.headerStoolCard'),
    t('csv.headerStoolAbnormal'),
    t('csv.headerStoolColourLegacy'),
    t('csv.headerWeightKg'),
    t('csv.headerHeightCm'),
    t('csv.headerHeadCm'),
    t('csv.headerNote'),
  ];

  // ⚠️ '﻿' 是 UTF-8 BOM。少了它，Windows 的 Excel 開啟中文 CSV 會變亂碼。
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

  const filename = `baby-log-${stamp()}.csv`;
  await shareText(filename, csv, 'text/csv');
  return { filename, babies: babies.length, events: rows.length };
}

function toCsvRow(e: BabyEvent, babyById: Map<string, Baby>): string[] {
  const d = new Date(e.occurredAt);
  const baby = babyById.get(e.babyId);
  return [
    baby?.name ?? e.babyId,
    baby?.sex ? sexLabel(baby.sex) : '',
    format(d, 'yyyy-MM-dd'),
    format(d, 'HH:mm'),
    // 走 typeLabel()，不要自己寫三元。原本是 `e.type === 'feed' ? '喝奶' : '尿布'`，
    // 於是睡眠／擠奶／生長三種全部被標成「尿布」——而這張表是要拿給醫生看的。
    typeLabel(e.type),
    e.method ? methodLabel(e.method) : '',
    e.milk ? milkLabel(e.milk) : '',
    e.amountMl != null ? String(e.amountMl) : '',
    e.durationMin != null ? String(e.durationMin) : '',
    e.side ? sideLabel(e.side) : '',
    e.diaperKind ? diaperKindLabel(e.diaperKind) : '',
    e.stoolCard != null ? stoolCardLabel(e.stoolCard) : '',
    // 獨立一欄標出異常，醫生掃 CSV 時不用自己記 1–6 的規則
    isStoolCardAbnormal(e.stoolCard) ? t('stool.csvAbnormal') : '',
    e.diaperColor ? diaperColorLabel(e.diaperColor) : '',
    // 生長紀錄的三個量測。原本完全沒有欄位，等於「生長紀錄匯出後是空白列」。
    // 用純數字不帶單位，欄名已經寫了 kg/cm，這樣 Excel 才能直接畫圖。
    e.weightG != null ? (e.weightG / 1000).toFixed(2) : '',
    e.heightMm != null ? (e.heightMm / 10).toFixed(1) : '',
    e.headMm != null ? (e.headMm / 10).toFixed(1) : '',
    e.note ?? '',
  ];
}

/** CSV 逃脫：含逗號、引號或換行的欄位要用引號包起來，內部引號要重複兩次。 */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function stamp(): string {
  return format(new Date(), 'yyyyMMdd-HHmm');
}

/**
 * 寫進快取目錄再叫出系統分享選單（LINE、Gmail、Google Drive…）。
 * 檔名刻意用純 ASCII，避免 Android 各家檔案管理 App 對中文檔名的處理差異。
 *
 * ⚠️ 這裡兩個字串的 key 掛在 csv.* 前綴下只是因為 i18n 搬遷的批次分工，
 *    但 exportJson() 與 exportCsv() 都會走到這個函式——改字時 JSON 那條路徑也會跟著變。
 */
async function shareText(filename: string, content: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    // ⚠️ 這句是【使用者看得到】的字，不是內部日誌：設定頁的 catch 直接把 e.message
    //    丟進 Alert。所以要翻，而且錯誤訊息刻意不加句號（比照 history.deleteFailed）。
    throw new Error(t('csv.shareUnsupported'));
  }
  // ⚠️ 只有分享選單的標題跟著語言走，檔名不翻——理由見上面的 ASCII 註解。
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: t('csv.shareDialogTitle') });
}

export type { Baby, BabyEvent };
