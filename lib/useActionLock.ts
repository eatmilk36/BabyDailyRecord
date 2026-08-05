import { useCallback, useEffect, useRef } from 'react';

/** 解鎖前的冷卻時間。要蓋過 modal 推入的轉場動畫，否則動畫期間還能再按到底層按鈕。 */
const COOLDOWN_MS = 700;

/**
 * 防止重複送出的動作鎖。
 *
 * 為什麼需要：所有「記錄」按鈕都是 async——先 await 寫入資料庫，再 router.push
 * 開補充彈窗。這段空窗期畫面看起來【毫無反應】，而使用情境是半夜、螢幕最暗、
 * 手在抖，人的自然反應就是再按一次。結果就是兩筆一模一樣的紀錄。
 *
 * 實測就是這樣產生兩筆 08:15 的餵奶紀錄的。
 *
 * 用 ref 而不是 useState：鎖的狀態不需要觸發重繪，而且 useState 的更新是
 * 非同步排程的——第二次點擊可能在 state 更新前就進來了，鎖根本來不及生效。
 *
 * C# 對照：這相當於在事件處理器開頭放一個 if (_busy) return; _busy = true;
 * 只是 finally 裡多了一段冷卻延遲。
 */
export function useActionLock() {
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
    } finally {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        busy.current = false;
      }, COOLDOWN_MS);
    }
  }, []);
}
