import { useColorScheme } from 'react-native';
import { palette } from './colors';

/**
 * 跟隨系統的深淺色。
 *
 * C# 對照：這就像一個回傳 ThemeResource 的屬性——只是在 React 裡，
 * 系統主題變了它會自動讓用到它的元件重繪，你不用自己訂閱事件。
 *
 * app.json 的 userInterfaceStyle 設成 "automatic" 才會跟隨系統，
 * 設成 "light" 的話 useColorScheme() 永遠回傳 light。
 */
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}

export type Theme = ReturnType<typeof useTheme>;
