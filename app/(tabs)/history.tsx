import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventRow } from '../../components/EventRow';
import { SlimButton } from '../../components/SlimButton';
import {
  groupByDay,
  restoreEvent,
  softDeleteEvent,
  useBabies,
  useRecentEvents,
} from '../../db/queries';
import { formatDayLabel } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { fontSize, radius, spacing } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

const UNDO_WINDOW_MS = 5000;

/**
 * 紀錄頁（D2 佈局）：單一時間軸、按日分組、用顏色區分寶寶。
 *
 * 這裡不做「一鍵新增」——新增是首頁的工作。這頁是回顧與修正。
 *
 * 長按刪除後有 5 秒復原視窗。這是免費得到的功能，因為刪除是軟刪除
 * （只是寫 deleted_at），復原就只是把它設回 null。
 */
export default function History() {
  const t = useTheme();
  const now = useNow(60_000);
  const { babies } = useBabies();
  const { events, loaded } = useRecentEvents();

  const [undoId, setUndoId] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

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

  const groups = groupByDay(events);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: t.text }]}>紀錄</Text>
        <View style={styles.legend}>
          {babies.map((b) => (
            <View key={b.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: t.baby[b.colorKey].base }]} />
              <Text style={[styles.legendText, { color: t.textMuted }]}>{b.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loaded && groups.length === 0 ? (
          <Text style={[styles.empty, { color: t.textMuted }]}>
            還沒有任何紀錄。回首頁按下大按鈕就會出現在這裡。
          </Text>
        ) : null}

        {groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={[styles.dayLabel, { color: t.textMuted }]}>
              {formatDayLabel(group.key, now)}
              <Text style={styles.dayCount}>{`  ${group.items.length} 筆`}</Text>
            </Text>
            <View style={styles.rows}>
              {group.items.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  baby={babies.find((b) => b.id === e.babyId)}
                  onPress={() => router.push(`/event/${e.id}`)}
                  onLongPress={() => handleDelete(e.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {undoId ? (
        <View style={[styles.undoBar, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.undoText, { color: t.text }]}>已刪除一筆紀錄</Text>
          <View style={styles.undoButton}>
            <SlimButton label="復原" tint={t.primary} filled onPress={handleUndo} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSize.xs, fontWeight: '600' },

  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxl },
  empty: { fontSize: fontSize.sm, lineHeight: 22, marginTop: spacing.xl },
  group: { gap: spacing.sm },
  dayLabel: { fontSize: fontSize.sm, fontWeight: '800' },
  dayCount: { fontWeight: '400', fontSize: fontSize.xs },
  rows: { gap: spacing.sm },

  undoBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
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
