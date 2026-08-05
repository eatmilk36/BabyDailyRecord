/**
 * Drizzle 的 migration 是 .sql 檔，由 babel-plugin-inline-import 在打包時
 * 內嵌成字串（見 babel.config.js）。TypeScript 不認識 .sql，這裡補上型別宣告。
 */
declare module '*.sql' {
  const content: string;
  export default content;
}
