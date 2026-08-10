import { Redirect, router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BabyCard } from '../../components/BabyCard';
import { SlimButton } from '../../components/SlimButton';
import {
  activeNursingOf,
  activeSleepOf,
  allActiveNursing,
  endNursing,
  endNursingSession,
  endSleep,
  lastEventOf,
  logBoth,
  logDiaper,
  logFeed,
  logPump,
  NURSING_OVERDUE_MIN,
  startNursing,
  startNursingBoth,
  startSleep,
  suggestNextSide,
  todayStats,
  useBabies,
  useMilkStashMl,
  useRecentEvents,
} from '../../db/queries';
import type { BabyEvent } from '../../db/schema';
import { cancelTimerNotification, scheduleNursingOverdue } from '../../lib/notifications';
import { formatBabyAge, greeting } from '../../lib/time';
import { useActionLock } from '../../lib/useActionLock';
import { useNow } from '../../lib/useNow';
import { fontSize, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 首頁（A2 雙胞胎佈局）。
 *
 * 這個畫面沒有任何狀態管理程式庫。資料全部來自兩個 useLiveQuery——
 * 任何寫入資料庫的動作都會讓 SQLite 發出變更通知，這個畫面就自動重繪。
 *
 * C# 對照：想像 EF Core 的 SaveChanges() 自動觸發所有 UI 綁定更新，
 * 你不用寫 PropertyChanged、不用手動 Refresh()。
 *
 * 互動最重要的一條規則：按下按鈕的瞬間就【已經寫進資料庫】了，
 * 補充彈窗才浮出來。所以你把彈窗滑掉，紀錄還是在的。
 */
export default function Home() {
  const t = useTheme();
  const now = useNow(30_000);
  const { babies, loaded: babiesLoaded } = useBabies();
  const { events } = useRecentEvents();
  const { stash } = useMilkStashMl();
  const insets = useSafeAreaInsets();
  // 所有寫入動作共用一把鎖，防止「覺得沒反應所以再按一次」產生重複紀錄
  const lock = useActionLock();

  // 還沒建立寶寶 → 去 onboarding
  if (babiesLoaded && babies.length === 0) return <Redirect href="/onboarding" />;

  if (!babiesLoaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </SafeAreaView>
    );
  }

  const babyIds = babies.map((b) => b.id);
  const actives = allActiveNursing(events);
  // 兩寶共用同一個 sessionId 且都在計時 → 這是一場同時哺餵
  const tandemSessionId =
    actives.length >= 2 && actives[0].sessionId && actives.every((e) => e.sessionId === actives[0].sessionId)
      ? actives[0].sessionId
      : undefined;

  function handleFeed(babyId: string) {
    return lock(async () => {
      const id = await logFeed(babyId);
      router.push(`/event/${id}`);
    });
  }

  function handleDiaper(babyId: string) {
    return lock(async () => {
      const id = await logDiaper(babyId);
      router.push(`/event/${id}`);
    });
  }

  function handleStartNursing(babyId: string) {
    // 直接採用輪替建議，這樣「開始親餵」仍然是一鍵
    return lock(async () => {
      const id = await startNursing(babyId, suggestNextSide(events, babyId));
      // 排一則本地通知當守護。第一次會跳權限請求；被拒絕就只剩 APP 內橫幅，
      // 記錄本身完全不受影響，所以不擋流程也不報錯。
      const name = babies.find((b) => b.id === babyId)?.name ?? '寶寶';
      void scheduleNursingOverdue(id, NURSING_OVERDUE_MIN, name);
    });
  }

  function handleStopNursing(event: BabyEvent) {
    return lock(async () => {
      await endNursing(event.id);
      /**
       * ⚠️ 兩個 id 都要取消，缺一不可：
       *   - 單獨開始的親餵：通知 id 是【事件 id】
       *   - 同時親餵：只排一則通知，id 是【sessionId】，兩寶共用
       *
       * 原本只取消 event.id。於是同時親餵之後如果你用卡片上的
       * 「結束親餵」把兩寶各自收工（而不是按「結束同時哺餵」），
       * tandemSessionId 因為 active 少於兩筆而不再成立 ——
       * 那則 sessionId 的通知就【沒有任何路徑會取消它】，
       * 60 分鐘後照響，半夜吵醒兩個寶寶。
       *
       * 取消不存在的排程是 no-op（cancelTimerNotification 內部有 try/catch），
       * 所以多取消一個 id 沒有代價。
       */
      void cancelTimerNotification(event.id);
      if (event.sessionId) void cancelTimerNotification(event.sessionId);
      // 結束後開彈窗，讓你能立刻修正時長（忘記按結束的補救）
      router.push(`/event/${event.id}`);
    });
  }

  function handleBoth(type: 'feed' | 'diaper') {
    return lock(async () => {
      const sessionId = await logBoth(babyIds, type);
      router.push(`/session/${sessionId}`);
    });
  }

  function handleStartSleep(babyId: string) {
    return lock(async () => {
      await startSleep(babyId);
    });
  }

  function handleStopSleep(eventId: string) {
    return lock(async () => {
      await endSleep(eventId);
      // 結束後開彈窗，讓你能修正時長（忘記按醒來的補救）
      router.push(`/event/${eventId}`);
    });
  }

  function handlePump() {
    return lock(async () => {
      const id = await logPump();
      router.push(`/event/${id}`);
    });
  }

  function handleTandemNursing() {
    return lock(async () => {
      if (tandemSessionId) {
        // 通知 id 用的是 sessionId，取消時必須用同一個值 ——
        // 用別的（例如時間戳）就永遠對不上，通知照響。
        // 順手也把兩筆事件各自的 id 取消掉：這場 session 可能是先個別開始、
        // 後來才被判定成同時哺餵，那時每筆都有自己的通知。
        void cancelTimerNotification(tandemSessionId);
        for (const e of actives) void cancelTimerNotification(e.id);
        await endNursingSession(tandemSessionId);
        router.push(`/session/${tandemSessionId}`);
        return;
      }
      const sessionId = await startNursingBoth(
        babyIds,
        suggestNextSide(events, babyIds[0]) ?? 'left',
      );
      // 同時哺餵只排一則 —— 兩則同時響是噪音，而內容是一樣的。
      // 用 sessionId 當通知 id，結束時才取消得掉。
      void scheduleNursingOverdue(
        sessionId,
        NURSING_OVERDUE_MIN,
        babies.map((b) => b.name).join('、'),
      );
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* 下緣留白要含 tab bar 高度 + safe-area，否則底部的「兩個一起」那排會被 tab 切掉 */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: t.text }]}>{greeting(now)}</Text>
          {babies[0] ? (
            <Text style={[styles.age, { color: t.textMuted }]}>
              {formatBabyAge(babies[0].birthDate, now)}
            </Text>
          ) : null}
        </View>

        {babies.map((baby) => (
          <BabyCard
            key={baby.id}
            baby={baby}
            now={now}
            lastFeed={lastEventOf(events, baby.id, 'feed')}
            lastDiaper={lastEventOf(events, baby.id, 'diaper')}
            activeNursing={activeNursingOf(events, baby.id)}
            activeSleep={activeSleepOf(events, baby.id)}
            suggestedSide={suggestNextSide(events, baby.id)}
            stats={todayStats(events, baby.id, now)}
            onFeed={() => handleFeed(baby.id)}
            onDiaper={() => handleDiaper(baby.id)}
            onStartNursing={() => handleStartNursing(baby.id)}
            onStopNursing={() => {
              const active = activeNursingOf(events, baby.id);
              // 傳整個事件而不是 id —— 取消通知時需要它的 sessionId
              if (active) handleStopNursing(active);
            }}
            onStartSleep={() => handleStartSleep(baby.id)}
            onStopSleep={() => {
              const active = activeSleepOf(events, baby.id);
              if (active) handleStopSleep(active.id);
            }}
          />
        ))}

        {babies.length >= 2 ? (
          <View style={styles.bothWrap}>
            <Text style={[styles.bothLabel, { color: t.textMuted }]}>兩個一起</Text>
            <View style={styles.bothRow}>
              <SlimButton label="都餵了" tint={t.feed} onPress={() => handleBoth('feed')} />
              <SlimButton label="都換了" tint={t.diaper} onPress={() => handleBoth('diaper')} />
              <SlimButton
                label={tandemSessionId ? '結束同時哺餵' : '同時親餵'}
                tint={t.primary}
                filled={!!tandemSessionId}
                onPress={handleTandemNursing}
              />
            </View>
          </View>
        ) : null}

        {/* 擠奶不屬於任何一個寶寶，所以獨立一區。
            庫存是純推導：Σ擠出 − Σ（瓶餵母奶），不存欄位就不會有對不上的問題。 */}
        <View style={styles.bothWrap}>
          <Text style={[styles.bothLabel, { color: t.textMuted }]}>
            擠奶　母乳庫存 {stash} ml
          </Text>
          <View style={styles.bothRow}>
            <SlimButton label="🫗 記一次擠奶" tint={t.primary} onPress={handlePump} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  greeting: { fontSize: fontSize.xl, fontWeight: '800' },
  age: { fontSize: fontSize.sm },
  bothWrap: { gap: spacing.sm },
  bothLabel: { fontSize: fontSize.xs, fontWeight: '700' },
  bothRow: { flexDirection: 'row', gap: spacing.sm },
});
