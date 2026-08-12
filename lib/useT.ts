import { useCallback } from 'react';
import { DICTS, interpolate, type I18nKey, type Params } from './i18n';
import { useSettings } from './settings';

/**
 * 元件用的翻譯函式。
 *
 * 回傳的 t 依賴 settings.lang，所以語言一換，用到它的畫面全部重繪。
 *
 * ⚠️ 這個檔案存在的唯一理由是【切開循環相依】：
 *   lib/i18n.ts      只有字典與純函式，不 import settings
 *   lib/settings.tsx import setCurrentLang（單向）
 *   lib/useT.ts      import 兩邊，而且沒有人 import 它回來
 *
 * 非元件的程式碼（lib/labels.ts 的 summarizeEvent、lib/export.ts 的 CSV 表頭）
 * 請用 lib/i18n.ts 匯出的模組層級 t()。
 */
export function useT() {
  const { settings } = useSettings();
  return useCallback(
    (key: I18nKey, params?: Params) => interpolate(DICTS[settings.lang][key], params),
    [settings.lang],
  );
}
