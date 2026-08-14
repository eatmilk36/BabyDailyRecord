import * as Notifications from 'expo-notifications';
import { LogBox, Platform } from 'react-native';
import { getCurrentLang, t, type LangKey } from './i18n';

/**
 * 靜音 expo-notifications 在 Expo Go 的固定抱怨。
 *
 * 它在 warnOfExpoGoPushUsage.js 用 console.error 印一次，條件是
 * `__DEV__ && isRunningInExpoGo()`。因為是 console.error，RN 會在畫面下方
 * 蓋一條紅色錯誤提示，測試時很干擾 —— 但它講的是【遠端推播】被移除，
 * 而 SDK 54 官方文件明寫：
 *
 *   "Push notifications (remote notifications) functionality provided by
 *    expo-notifications is unavailable in Expo Go on Android from SDK 53.
 *    Local notifications (in-app notifications) remain available in Expo Go."
 *
 * 這個 APP 只用本地排程通知（scheduleNotificationAsync + TIME_INTERVAL），
 * 完全沒有呼叫 getExpoPushTokenAsync，所以這條警告對我們不成立。
 *
 * 只在 __DEV__ 靜音，而且只精準比對這一句 —— 不會順手蓋掉別的錯誤。
 */
if (__DEV__) {
  LogBox.ignoreLogs([
    /expo-notifications: Android Push notifications \(remote notifications\)/,
  ]);
}

/**
 * 親餵計時的超時提醒（本地通知）。
 *
 * 為什麼是「本地」而不是伺服器推播：這個提醒的資料全在手機上（計時什麼時候
 * 開始的），所以由手機自己排程就夠了。**完全不需要任何後端**。
 * （Android 上的遠端推播從 Expo SDK 53 起在 Expo Go 也不能用，那是另一回事。）
 *
 * 這解決的是「忘記按結束」—— 原本只有開 APP 才看得到警示橫幅，而你忘記按結束
 * 的時候通常正是沒在看 APP 的時候。鎖屏也會響才真的有用。
 */

const CHANNEL_ID = 'nursing-timer';

/**
 * 預設 expo-notifications 在 APP 前景時【不顯示】通知。
 * 這裡改成照樣顯示 —— 你可能正開著 APP 在別的頁面。
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 上次建立頻道時用的語言；null = 這次執行還沒建過。
 *
 * ⚠️ 原本是 `let channelReady = false`，改成記【語言】是 i18n 逼出來的：頻道名稱不顯示在
 *    APP 裡，而是顯示在【Android 系統設定 → 通知 → 分類】。用同一個 channel id 再呼叫一次
 *    setNotificationChannelAsync 是【更新】既有頻道的名稱，不是多建一個，所以名稱本來是
 *    追得上語言的 —— 但只記一個 boolean 的話，同一次執行期間只會建一次，在 APP 內切語言後
 *    系統設定裡仍是舊語言，要到下次冷啟動才更新。記語言就能在切語言後的第一次排程順手改掉。
 */
let channelLang: LangKey | null = null;

/**
 * Android 13+ 必須【先有通知頻道】才能請求權限，順序錯了權限對話框不會出現。
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // ⚠️ 先把語言取出來存成區域變數再 await：await 期間使用者仍可能切語言，
  //    若最後才讀一次 getCurrentLang() 會把新語言記成「已建立」，那次更新就永久漏掉。
  const lang = getCurrentLang();
  if (channelLang === lang) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: t('notif.channelName'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  // ⚠️ 成功之後才記；中間丟例外就維持原值，下次呼叫會再試一次。
  channelLang = lang;
}

/** 回傳是否拿到權限。使用者拒絕過且不能再問時回 false。 */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * 排一則「還在餵嗎？」的提醒。
 *
 * 用【事件 id 當通知 id】，所以取消時不需要另外存一份對應關係 ——
 * 少一份狀態就少一個會不同步的地方。
 *
 * ⚠️ title/body 是在【排程當下】就組好字串交給 OS 存起來的。使用者排程之後才切語言，
 *    這則【已排程】的通知不會跟著變，仍會用排程當下的語言送出來 —— 這是系統行為不是 bug，
 *    而且實際影響很小：這則只排 60 分鐘，按下結束就會被 cancelTimerNotification 取消。
 * ⚠️ 模組層級 t() 讀的 currentLang 要等 SettingsProvider 從資料庫讀出設定後才同步，
 *    所以冷啟動後【立刻】按開始親餵的那個極短視窗內，排出去的通知可能還是預設的 zh-TW。
 *    與 splash.* 兩個 key 的處境相同（見 lib/i18n.ts 的註解），可接受，不必為此加同步機制。
 */
export async function scheduleNursingOverdue(
  eventId: string,
  minutes: number,
  babyName: string,
): Promise<boolean> {
  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: eventId,
    content: {
      // ⚠️ notif.overdueTitle 的值與 timer.nursingOverdue（首頁警示橫幅）完全相同，
      //    只因命名空間分組才各留一份；哪天要改，兩個 key 必須一起改，
      //    否則橫幅寫一種、通知寫另一種。
      title: t('notif.overdueTitle'),
      // ⚠️ 這裡刻意【不】用 plural()：{n} 來自 db/queries.ts 的常數 NURSING_OVERDUE_MIN = 60，
      //    兩個呼叫端都直接傳這個常數，n === 1 走不到。為了一個到不了的分支把整段長句複製成
      //    _one 版本，維護成本大於收益。哪天分鐘數變成可設定，再補 notif.overdueBody_one
      //    並改成 t(plural(minutes, 'notif.overdueBody'), { name: babyName, n: minutes })。
      // ⚠️ 同時哺餵時呼叫端會把兩個名字併成一個字串傳進 babyName，所以英文版寫成
      //    「{name} — nursing has been running…」而不是「{name} has been nursing…」，
      //    這樣單雙都成立、不會 has/have 對不上。
      body: t('notif.overdueBody', { name: babyName, n: minutes }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

/** 測試通知的固定 id。重複測試會覆蓋前一則，不會累積。 */
const TEST_ID = 'test-notification';

/** 測試通知延遲幾秒。要夠久讓你來得及鎖屏，又不要久到你以為壞了。 */
export const TEST_NOTIFICATION_DELAY_SEC = 8;

/**
 * 發一則真正的測試通知。
 *
 * ⚠️ 為什麼不能只檢查權限旗標：權限只決定「允不允許」，不決定「送不送到」。
 * 小米／華為／OPPO 的省電機制會延遲甚至直接吃掉排程通知，而那正是這個
 * 功能最可能失效的原因。只讀權限旗標然後回答「超時提醒會正常運作」
 * 是給了假的安心感 —— 使用者真正需要知道的是「它會不會出現在我的鎖屏上」，
 * 而那件事只能靠實際送一則來回答。
 *
 * 回傳 false = 連權限都沒有（那就不必談送達了）。
 */
export async function sendTestNotification(): Promise<boolean> {
  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ID,
    content: {
      // ⚠️ 同樣是排程當下就把字串交給 OS，但這則只延遲幾秒，切語言的時間差在這裡不成問題。
      title: t('notif.testTitle'),
      body: t('notif.testBody'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: TEST_NOTIFICATION_DELAY_SEC,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

/** 結束計時時取消提醒。沒排過或已經觸發過都會丟例外，那不是錯誤。 */
export async function cancelTimerNotification(eventId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(eventId);
  } catch {
    // 沒有這則排程（沒排過／已觸發／權限被拒），忽略
  }
}
