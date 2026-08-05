import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

/**
 * 資料庫連線。
 *
 * ⚠️ enableChangeListener: true 是【必須】的——少了它，useLiveQuery 不會自動重繪。
 * 這一個參數就是整個 APP 不需要 Redux / Zustand / TanStack Query 的原因：
 * 寫入資料庫 → SQLite 發出變更事件 → useLiveQuery 收到 → 用到它的元件自動重新渲染。
 *
 * C# 對照：想像 EF Core 幫你把 SaveChanges() 自動接到所有 UI 綁定上，
 * 你不用自己發 PropertyChanged。
 */
const expoDb = openDatabaseSync('baby.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

export { expoDb };
