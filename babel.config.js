// Drizzle 的 migration 是一堆 .sql 檔。babel-plugin-inline-import 會在打包時
// 把 .sql 檔的內容直接內嵌成字串，這樣 React Native 才讀得到它們
// （手機上沒有檔案系統可以在執行時去讀專案裡的 .sql）。
// 少了這段設定，drizzle/migrations.js 會在啟動時炸掉。
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
