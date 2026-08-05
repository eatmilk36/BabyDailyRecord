import type { Config } from 'drizzle-kit';

// 這個檔案只給 drizzle-kit CLI 用（等同 EF Core 的 DbContext 設計期設定）。
// 改完 db/schema.ts 之後跑： npm run db:generate
// 它會在 drizzle/ 產生新的 .sql migration，APP 啟動時由 useMigrations 自動套用。
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo', // 產生 expo-sqlite 專用的 migrations.js 索引檔
} satisfies Config;
