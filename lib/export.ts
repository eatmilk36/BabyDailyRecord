import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dumpAll } from '../db/queries';
import type { Baby, BabyEvent } from '../db/schema';
import {
  DIAPER_COLOR_LABEL,
  DIAPER_KIND_LABEL,
  isStoolCardAbnormal,
  METHOD_LABEL,
  MILK_LABEL,
  SEX_LABEL,
  SIDE_LABEL,
  stoolCardLabel,
  TYPE_LABEL,
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

/** 完整備份（JSON）。含已軟刪除的資料，這樣還原後刪除狀態也一致。 */
export async function exportJson(): Promise<void> {
  const data = await dumpAll();
  const payload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    babies: data.babies,
    events: data.events,
  };

  await shareText(
    `baby-log-backup-${stamp()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  );
}

/** 給醫生看的表（CSV）。只含未刪除的紀錄，欄位是中文表頭。 */
export async function exportCsv(): Promise<void> {
  const { babies, events } = await dumpAll();
  const babyById = new Map(babies.map((b) => [b.id, b]));

  const rows = events
    .filter((e) => e.deletedAt == null)
    .sort((a, b) => a.occurredAt - b.occurredAt)
    .map((e) => toCsvRow(e, babyById));

  const header = [
    '寶寶',
    '性別',
    '日期',
    '時間',
    '類型',
    '餵法',
    '奶種',
    '奶量ml',
    // durationMin 同時用在親餵與睡眠，欄名不能只寫「親餵分鐘」
    '時長分鐘',
    '哪一邊',
    '尿布類型',
    '大便卡編號',
    '大便卡異常',
    '大便顏色(舊)',
    '體重kg',
    '身長cm',
    '頭圍cm',
    '備註',
  ];

  // ⚠️ '﻿' 是 UTF-8 BOM。少了它，Windows 的 Excel 開啟中文 CSV 會變亂碼。
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

  await shareText(`baby-log-${stamp()}.csv`, csv, 'text/csv');
}

function toCsvRow(e: BabyEvent, babyById: Map<string, Baby>): string[] {
  const d = new Date(e.occurredAt);
  const baby = babyById.get(e.babyId);
  return [
    baby?.name ?? e.babyId,
    baby?.sex ? SEX_LABEL[baby.sex] : '',
    format(d, 'yyyy-MM-dd'),
    format(d, 'HH:mm'),
    // 走 TYPE_LABEL，不要自己寫三元。原本是 `e.type === 'feed' ? '喝奶' : '尿布'`，
    // 於是睡眠／擠奶／生長三種全部被標成「尿布」——而這張表是要拿給醫生看的。
    TYPE_LABEL[e.type],
    e.method ? METHOD_LABEL[e.method] : '',
    e.milk ? MILK_LABEL[e.milk] : '',
    e.amountMl != null ? String(e.amountMl) : '',
    e.durationMin != null ? String(e.durationMin) : '',
    e.side ? SIDE_LABEL[e.side] : '',
    e.diaperKind ? DIAPER_KIND_LABEL[e.diaperKind] : '',
    e.stoolCard != null ? stoolCardLabel(e.stoolCard) : '',
    // 獨立一欄標出異常，醫生掃 CSV 時不用自己記 1–6 的規則
    isStoolCardAbnormal(e.stoolCard) ? '異常' : '',
    e.diaperColor ? DIAPER_COLOR_LABEL[e.diaperColor] : '',
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
 */
async function shareText(filename: string, content: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('這台裝置不支援分享功能');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: '匯出寶寶日誌' });
}

export type { Baby, BabyEvent };
