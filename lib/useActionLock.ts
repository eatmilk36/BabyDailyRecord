import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

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
    } catch (e) {
      /**
       * ⚠️ 這個 catch 是必要的，而且放在這裡是刻意的。
       *
       * 原本只有 try/finally。而 SlimButton 與 BigActionButton 都是直接
       * 呼叫 onPress() 並【丟棄回傳的 Promise】（onPress 的型別是
       * `() => void`，所以 TypeScript 也不會抗議）。兩件事加起來：
       * 任何寫入失敗都變成 RN 的 unhandled rejection ——
       * 沒有 Alert、沒有紅畫面、沒有導航到彈窗，按下去就是
       * 【只有震動，什麼都沒發生】，而且 700ms 冷卻後可以無限重按依然沒反應。
       *
       * 放在鎖裡而不是每個 handler 裡：所有記錄按鈕都經過這裡，
       * 一處補上就全部覆蓋，而且不可能有人漏寫。
       */
      Alert.alert(
        '沒有存進去',
        `${e instanceof Error ? e.message : String(e)}\n\n` +
          '這一筆沒有寫入資料庫。如果一直出現，請到「設定 → 匯出 JSON 備份」' +
          '先把現有資料存出來。',
      );
    } finally {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        busy.current = false;
      }, COOLDOWN_MS);
    }
  }, []);
}
