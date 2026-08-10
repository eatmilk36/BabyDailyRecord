import * as Notifications from 'expo-notifications';
import { LogBox, Platform } from 'react-native';

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

let channelReady = false;

/**
 * Android 13+ 必須【先有通知頻道】才能請求權限，順序錯了權限對話框不會出現。
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '親餵計時提醒',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
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
      title: '還在餵嗎？',
      body: `${babyName} 的親餵已經 ${minutes} 分鐘了。如果已經結束，記得回 APP 按「結束」，時間才會正確。`,
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
      title: '測試通知',
      body: '你看到這則就表示鎖屏提醒會正常送到。親餵超時的提醒長得跟這個一樣。',
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
