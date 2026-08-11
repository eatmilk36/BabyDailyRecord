import { useColorScheme } from 'react-native';
import { useSettings } from '../lib/settings';
import { palettes } from './colors';

/**
 * 目前該用哪一組色票。
 *
 * 兩個維度：
 *   皮膚（暖木／粉櫻／海鹽藍）—— 使用者在設定頁選，存在 SQLite
 *   深淺（auto／light／dark）—— auto 跟隨系統，另外兩個是手動覆寫
 *
 * C# 對照：這就像一個回傳 ThemeResource 的屬性——只是在 React 裡，
 * 系統主題或使用者設定變了它會自動讓用到它的元件重繪，你不用訂閱事件。
 *
 * ⚠️ 沒有 SettingsProvider 也要能用（useSettings 有預設值）。
 * app/_layout.tsx 裡的 Splash 會在 Provider 掛載之前渲染，
 * 而那正好是「資料庫壞掉」時唯一會顯示的畫面 —— 它不能跟著壞。
 *
 * app.json 的 userInterfaceStyle 設成 "automatic" 才會跟隨系統，
 * 設成 "light" 的話 useColorScheme() 永遠回傳 light。
 */
export function useTheme() {
  const scheme = useColorScheme();
  const { settings } = useSettings();

  const isDark =
    settings.themeMode === 'auto' ? scheme === 'dark' : settings.themeMode === 'dark';

  return palettes[settings.skin][isDark ? 'dark' : 'light'];
}

export type Theme = ReturnType<typeof useTheme>;
