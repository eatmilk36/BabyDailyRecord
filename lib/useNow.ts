import { useEffect, useState } from 'react';

/**
 * 每隔一段時間回傳新的「現在」，讓相對時間與計時器會自己跳動。
 *
 * C# 對照：這相當於一個 DispatcherTimer，只是回傳值變了 React 會自動重繪用到它的元件。
 *
 * 為什麼首頁用 30 秒、計時器用 1 秒？
 * 首頁顯示的是「2 小時 15 分前」——每秒重繪整個畫面只為了改一個分鐘數是浪費電，
 * 而電力在你抱著寶寶沒空充電的時候是真的資源。
 */
export function useNow(intervalMs = 30_000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);

  return now;
}
