import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { t } from './i18n';

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
      /**
       * ⚠️ 這裡【不能】改用 useT()，雖然這是一個 hook，看起來比較「一致」。
       *
       * 這個 useCallback 的 deps 是 []，而且必須是 []：鎖的狀態放在 ref 裡，
       * callback 的 identity 要穩定，否則每次重繪都換一顆新的 onPress。
       * useT() 回傳的 tr 會被【永久凍結在第一次 render 的語言】——
       * 使用者切成英文之後，這個 Alert 還是會跳中文。要修就得把 tr 塞進 deps，
       * 那等於為了一句錯誤訊息拆掉這個 hook 存在的前提。
       *
       * 而模組層級的 t() 每次呼叫都現讀 currentLang（由 SettingsProvider 同步），
       * 在這裡是正確的：Alert 是一次性的，文字在「按下去的那一刻」才決定，
       * 沒有任何東西需要因為語言改變而重畫。
       */
      Alert.alert(
        t('lock.saveFailedTitle'),
        // e.message 前面那段換行是【組裝】不是文案，所以留在程式碼裡，不進字典。
        `${e instanceof Error ? e.message : String(e)}\n\n` + t('lock.saveFailedBody'),
      );
    } finally {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        busy.current = false;
      }, COOLDOWN_MS);
    }
  }, []);
}
