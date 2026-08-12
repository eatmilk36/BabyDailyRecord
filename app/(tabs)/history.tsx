import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRow } from '../../components/EventRow';
import { QueryError } from '../../components/QueryError';
import { SlimButton } from '../../components/SlimButton';
import { TodaySummary } from '../../components/TodaySummary';
import {
  restoreEvent,
  softDeleteEvent,
  statsOf,
  useBabies,
  useEventsForDay,
} from '../../db/queries';
import type { BabyEvent } from '../../db/schema';
import { summarizeEvent } from '../../lib/labels';
import { formatClock, formatDayLabelMs, isSameDay, shiftDay, startOfToday } from '../../lib/time';
import { useT } from '../../lib/useT';
import { useNow } from '../../lib/useNow';
import { fontSize, radius, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

const UNDO_WINDOW_MS = 5000;

/**
 * 紀錄頁：一次看一天，可以往前往後翻。
 *
 * 為什麼是「單日 + 導覽」而不是「一路往下捲」？
 * 往下捲只能回顧最近幾天，而回診時醫生問的是「上週三喝多少」——
 * 那需要能跳到特定某天，並且看到那天的分寶總量。
 *
 * 長按刪除後有 5 秒復原視窗（軟刪除讓這件事是免費的）。
 */
export default function History() {
  const t = useTheme();
  const tr = useT();
  const now = useNow(60_000);
  const insets = useSafeAreaInsets();
  const { babies, error: babiesError } = useBabies();

  const todayStart = startOfToday(now);
  const [dayStart, setDayStart] = useState(todayStart);
  const { events, loaded, error: eventsError } = useEventsForDay(dayStart);

  /**
   * 過了午夜要自動跟著跳到新的今天。
   *
   * 原本 dayStart 只在 mount 時算一次，所以半夜停在紀錄頁不動，
   * 午夜一過畫面就永遠卡在「昨天」——而你半夜新記的紀錄都算在新的一天，
   * 完全不會出現在畫面上。這正好發生在這個 APP 使用最密集的時段。
   *
   * 只在「使用者本來就停在今天」時才跟著跳；如果他手動翻到別天，不要動他。
   */
  const prevToday = useRef(todayStart);
  useEffect(() => {
    if (todayStart !== prevToday.current) {
      const wasOnToday = prevToday.current;
      setDayStart((d) => (d === wasOnToday ? todayStart : d));
      prevToday.current = todayStart;
    }
  }, [todayStart]);

  /**
   * 復原是一個【佇列】，不是單一個 id。
   *
   * 原本只記一筆：連續刪兩筆時第二筆會覆蓋第一筆的 undoId，
   * 而且 timer 也被重設，所以第一筆永遠救不回來，畫面上還說「已刪除一筆紀錄」。
   * 半夜捲動清單誤觸長按會連續刪，這不是罕見情境。
   */
  const [undo, setUndo] = useState<{ id: string; label: string }[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const atToday = isSameDay(dayStart, now);

  /**
   * 長按刪除加確認框。
   *
   * ⚠️ 原本長按【直接刪】，沒有任何提示。而這是一個要捲動的清單，
   * 手指停在某一列上稍久一點就會觸發 —— 半夜單手捲動時尤其容易。
   *
   * 確認框上寫出【刪的是哪一筆】，因為一列的內容是「06:16 · 親餵 母奶 18 分」，
   * 光說「刪除這筆紀錄？」你不知道自己按到的是哪一列。
   */
  function handleDelete(e: BabyEvent, babyName?: string) {
    const label = `${formatClock(e.occurredAt)} · ${babyName ? `${babyName} · ` : ''}${summarizeEvent(e)}`;
    Alert.alert(tr('history.deleteConfirm'), label, [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await softDeleteEvent(e.id);
          } catch (err) {
            Alert.alert(tr('history.deleteFailed'), err instanceof Error ? err.message : String(err));
            return;
          }
          setUndo((prev) => [...prev, { id: e.id, label }]);
          if (undoTimer.current) clearTimeout(undoTimer.current);
          undoTimer.current = setTimeout(() => setUndo([]), UNDO_WINDOW_MS);
        },
      },
    ]);
  }

  async function handleUndo() {
    if (undo.length === 0) return;
    try {
      for (const u of undo) await restoreEvent(u.id);
    } catch (err) {
      Alert.alert(tr('history.undoFailed'), err instanceof Error ? err.message : String(err));
      return;
    }
    setUndo([]);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: t.text }]}>{tr('history.title')}</Text>

        <View style={styles.dateNav}>
          <Arrow label="‹" onPress={() => setDayStart(shiftDay(dayStart, -1))} />
          {/* 日期文字本身可以點 → 回到今天。原本只有右邊那個小「今天」連結
              可以按，而換日一次只能一天，回到今天要按很多次箭頭。 */}
          <Pressable
            onPress={() => setDayStart(todayStart)}
            disabled={atToday}
            hitSlop={12}
            style={styles.dateLabelPress}
          >
            <Text style={[styles.dateLabel, { color: t.text }]}>
              {formatDayLabelMs(dayStart, now)}
            </Text>
            {!atToday ? (
              <Text style={[styles.todayLink, { color: t.primary }]}>
                {tr('history.backToToday')}
              </Text>
            ) : null}
          </Pressable>
          {/* 不能往未來翻 */}
          <Arrow
            label="›"
            disabled={atToday}
            onPress={() => setDayStart(shiftDay(dayStart, 1))}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xxl },
        ]}
      >
        {/* 查詢失敗時 loaded 永遠是 false，所以下面那個「今天還沒有紀錄」
            的空狀態被 `loaded &&` 擋住，events.map 也印不出東西 ——
            結果是標題底下一片【全白】，比顯示錯誤更難診斷。 */}
        <QueryError error={babiesError} what="error.whatBabies" />
        <QueryError error={eventsError} what="error.whatDayEvents" />

        {/* 分寶單日總結——回診時醫生問的就是這幾個數字 */}
        {babies.map((b) => (
          <View
            key={b.id}
            style={[
              styles.summaryCard,
              {
                backgroundColor: t.baby[b.colorKey].soft,
                borderColor: t.cardBorder,
                // 跟首頁與統計頁一致的左側粗色條
                borderLeftColor: t.baby[b.colorKey].base,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: t.baby[b.colorKey].base }]} />
            <View style={styles.summaryBody}>
              {/* prefixStrong：名字要用正常字級的粗體，不是 12px 淡灰字。
                  雙胞胎最需要先知道的就是「這張卡是哪一寶」。 */}
              <TodaySummary stats={statsOf(events, b.id)} label={b.name} prefixStrong />
            </View>
          </View>
        ))}

        {loaded && events.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: t.textMuted }]}>
              {tr(atToday ? 'history.emptyToday' : 'history.emptyOther')}
            </Text>
            {!atToday ? (
              <View style={styles.emptyAction}>
                <SlimButton
                  label={tr('history.returnToday')}
                  tint={t.primary}
                  onPress={() => setDayStart(startOfToday())}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.rows}>
          {events.map((e) => {
            const baby = babies.find((b) => b.id === e.babyId);
            return (
              <EventRow
                key={e.id}
                event={e}
                baby={baby}
                onPress={() => router.push(`/event/${e.id}`)}
                onLongPress={() => handleDelete(e, baby?.name)}
              />
            );
          })}
        </View>
      </ScrollView>

      {undo.length > 0 ? (
        <View
          style={[
            styles.undoBar,
            {
              backgroundColor: t.card,
              borderColor: t.cardBorder,
              bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.sm,
            },
          ]}
        >
          {/* 說出刪掉的是哪一筆。原本只寫「已刪除一筆紀錄」，
              而且連續刪兩筆時第一筆會被靜默覆蓋。 */}
          <View style={styles.undoBody}>
            <Text style={[styles.undoText, { color: t.text }]}>
              {undo.length === 1
                ? tr('history.deletedOne')
                : tr('history.deletedMany', { n: undo.length })}
            </Text>
            <Text style={[styles.undoDetail, { color: t.textMuted }]} numberOfLines={1}>
              {undo[undo.length - 1].label}
            </Text>
          </View>
          <View style={styles.undoButton}>
            <SlimButton
              label={undo.length === 1 ? tr('common.restore') : tr('history.undoAll')}
              tint={t.primary}
              filled
              onPress={handleUndo}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Arrow({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      style={({ pressed }) => [
        styles.arrow,
        { borderColor: t.cardBorder, opacity: disabled ? 0.25 : pressed ? 0.5 : 1 },
      ]}
    >
      <Text style={[styles.arrowText, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800' },

  dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  arrow: {
    // 40 → 44（可觸及性底線）。半夜單手翻日期點不準很煩
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: fontSize.lg, fontWeight: '800', lineHeight: 24 },
  // 44 是可觸及性底線。整個日期區塊都可點，不只右邊那個小連結。
  dateLabelPress: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dateLabel: { fontSize: fontSize.md, fontWeight: '800', textAlign: 'center' },
  todayLink: { fontSize: fontSize.xs, fontWeight: '700', marginTop: 1 },

  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  summaryBody: { flex: 1 },

  emptyWrap: { marginTop: spacing.lg, gap: spacing.md },
  empty: { fontSize: fontSize.sm, lineHeight: 22 },
  emptyAction: { flexDirection: 'row' },

  rows: { gap: spacing.sm, marginTop: spacing.xs },

  undoBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  undoBody: { flex: 1 },
  undoText: { fontSize: fontSize.sm, fontWeight: '800' },
  undoDetail: { fontSize: fontSize.xs, marginTop: 1 },
  undoButton: { width: 108 },
});
