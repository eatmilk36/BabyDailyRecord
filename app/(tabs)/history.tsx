import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRow } from '../../components/EventRow';
import { SlimButton } from '../../components/SlimButton';
import { TodaySummary } from '../../components/TodaySummary';
import {
  restoreEvent,
  softDeleteEvent,
  statsOf,
  useBabies,
  useEventsForDay,
} from '../../db/queries';
import { formatDayLabelMs, isSameDay, shiftDay, startOfToday } from '../../lib/time';
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
  const now = useNow(60_000);
  const insets = useSafeAreaInsets();
  const { babies } = useBabies();

  const [dayStart, setDayStart] = useState(() => startOfToday());
  const { events, loaded } = useEventsForDay(dayStart);

  const [undoId, setUndoId] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const atToday = isSameDay(dayStart, now);

  async function handleDelete(id: string) {
    await softDeleteEvent(id);
    setUndoId(id);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoId(null), UNDO_WINDOW_MS);
  }

  async function handleUndo() {
    if (!undoId) return;
    await restoreEvent(undoId);
    setUndoId(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: t.text }]}>紀錄</Text>

        <View style={styles.dateNav}>
          <Arrow label="‹" onPress={() => setDayStart(shiftDay(dayStart, -1))} />
          <Text style={[styles.dateLabel, { color: t.text }]}>
            {formatDayLabelMs(dayStart, now)}
          </Text>
          {/* 不能往未來翻 */}
          <Arrow
            label="›"
            disabled={atToday}
            onPress={() => setDayStart(shiftDay(dayStart, 1))}
          />
          {!atToday ? (
            <Pressable onPress={() => setDayStart(startOfToday())} hitSlop={8}>
              <Text style={[styles.todayLink, { color: t.primary }]}>今天</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xxl },
        ]}
      >
        {/* 分寶單日總結——回診時醫生問的就是這幾個數字 */}
        {babies.map((b) => (
          <View
            key={b.id}
            style={[
              styles.summaryCard,
              { backgroundColor: t.baby[b.colorKey].soft, borderColor: t.cardBorder },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: t.baby[b.colorKey].base }]} />
            <View style={styles.summaryBody}>
              <TodaySummary stats={statsOf(events, b.id)} label={b.name} />
            </View>
          </View>
        ))}

        {loaded && events.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: t.textMuted }]}>
              {atToday ? '今天還沒有紀錄。回首頁按下大按鈕就會出現在這裡。' : '這天沒有紀錄。'}
            </Text>
            {!atToday ? (
              <View style={styles.emptyAction}>
                <SlimButton label="回到今天" tint={t.primary} onPress={() => setDayStart(startOfToday())} />
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.rows}>
          {events.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              baby={babies.find((b) => b.id === e.babyId)}
              onPress={() => router.push(`/event/${e.id}`)}
              onLongPress={() => handleDelete(e.id)}
            />
          ))}
        </View>
      </ScrollView>

      {undoId ? (
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
          <Text style={[styles.undoText, { color: t.text }]}>已刪除一筆紀錄</Text>
          <View style={styles.undoButton}>
            <SlimButton label="復原" tint={t.primary} filled onPress={handleUndo} />
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
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: fontSize.lg, fontWeight: '800', lineHeight: 24 },
  dateLabel: { fontSize: fontSize.md, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  todayLink: { fontSize: fontSize.sm, fontWeight: '700' },

  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
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
  undoText: { flex: 1, fontSize: fontSize.sm, fontWeight: '600' },
  undoButton: { width: 96 },
});
