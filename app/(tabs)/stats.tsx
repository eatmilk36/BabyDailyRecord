import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { GrowthChart, type GrowthMetric } from '../../components/GrowthChart';
import { SlimButton } from '../../components/SlimButton';
import {
  growthSeriesOf,
  logGrowth,
  statsOf,
  useBabies,
  useGrowthEvents,
  useMilkStashMl,
  useRecentEvents,
} from '../../db/queries';
import { formatLength, formatMinutes, formatWeight } from '../../lib/labels';
import { dayKey, formatDayLabelMs, shiftDay, startOfToday } from '../../lib/time';
import { useActionLock } from '../../lib/useActionLock';
import { useNow } from '../../lib/useNow';
import { fontSize, radius, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';
import { numFont } from '../../theme/fonts';
import { useTheme } from '../../theme/useTheme';

const DAYS = 14;

const METRICS: { key: GrowthMetric; label: string; format: (v: number) => string }[] = [
  { key: 'weightG', label: '體重', format: formatWeight },
  { key: 'heightMm', label: '身長', format: formatLength },
  { key: 'headMm', label: '頭圍', format: formatLength },
];

/**
 * 統計頁：最近兩週的每日趨勢 + 雙胞胎生長對照 + 母乳庫存。
 *
 * 這裡放的都是「回顧型」資訊，不放任何一鍵記錄按鈕 —— 那是首頁的工作。
 */
export default function Stats() {
  const t = useTheme();
  const now = useNow(60_000);
  const insets = useSafeAreaInsets();
  const { babies } = useBabies();
  const { events } = useRecentEvents();
  const { events: growth } = useGrowthEvents();
  const { stash, pumped, used } = useMilkStashMl();
  const lock = useActionLock();

  const [metric, setMetric] = useState<GrowthMetric>('weightG');
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];

  // 最近 DAYS 天，舊到新
  const days = Array.from({ length: DAYS }, (_, i) => shiftDay(startOfToday(now), i - (DAYS - 1)));

  function handleAddGrowth(babyId: string) {
    return lock(async () => {
      const id = await logGrowth(babyId, {});
      router.push(`/event/${id}`);
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xxl },
        ]}
      >
        <Text style={[styles.title, { color: t.text }]}>統計</Text>

        {/* ---- 母乳庫存 ---- */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>母乳庫存</Text>
          <Text style={[styles.big, { color: t.primary }]}>{stash} ml</Text>
          <Text style={[styles.note, { color: t.textMuted }]}>
            擠出 {pumped} ml − 瓶餵母奶 {used} ml
            {'\n'}
            這個數字是從紀錄推導的，不是另外存的欄位，所以不會跟紀錄對不上。
          </Text>
        </View>

        {/* ---- 每日趨勢 ---- */}
        {babies.map((b) => (
          <View
            key={b.id}
            style={[
              styles.card,
              { backgroundColor: t.baby[b.colorKey].soft, borderColor: t.cardBorder },
            ]}
          >
            <View style={styles.cardHead}>
              <View style={[styles.dot, { backgroundColor: t.baby[b.colorKey].base }]} />
              <Text style={[styles.cardTitle, { color: t.text }]}>{b.name} · 最近 {DAYS} 天</Text>
            </View>

            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label="每日奶量 ml"
              values={days.map((d) => statsOf(eventsOfDay(events, d), b.id).totalMl)}
              now={now}
            />
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label="每日睡眠"
              values={days.map((d) => statsOf(eventsOfDay(events, d), b.id).sleepMin)}
              formatValue={formatMinutes}
              now={now}
            />
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label="每日尿布片數"
              values={days.map((d) => statsOf(eventsOfDay(events, d), b.id).diaperCount)}
              now={now}
            />
          </View>
        ))}

        <Text style={[styles.note, { color: t.textMuted }]}>
          趨勢只算最近 {DAYS} 天，且來源是最近 1000 筆紀錄 —— 再往前的日子可能顯示為 0。
        </Text>

        {/* ---- 生長對照 ---- */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>生長對照</Text>

          <View style={styles.chips}>
            {METRICS.map((m) => (
              <Chip
                key={m.key}
                label={m.label}
                selected={metric === m.key}
                onPress={() => setMetric(m.key)}
              />
            ))}
          </View>

          <GrowthChart
            series={babies.map((b) => ({ baby: b, points: growthSeriesOf(growth, b.id) }))}
            metric={activeMetric.key}
            format={activeMetric.format}
          />

          <Text style={[styles.note, { color: t.textMuted }]}>
            兩寶疊在同一個座標系比較。WHO 百分位需要官方的 LMS 參考表，
            那是醫療數據不能憑估計填，所以尚未加入。
          </Text>

          <View style={styles.growthButtons}>
            {babies.map((b) => (
              <SlimButton
                key={b.id}
                label={`記錄 ${b.name}`}
                tint={t.baby[b.colorKey].base}
                onPress={() => handleAddGrowth(b.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 某一天的事件（從已抓進記憶體的清單過濾，不再打 DB） */
function eventsOfDay(list: Parameters<typeof statsOf>[0], dayStart: number) {
  const key = dayKey(dayStart);
  return list.filter((e) => dayKey(e.occurredAt) === key);
}

/**
 * 每日長條圖。
 * 用 View 疊出來而不是 SVG —— 長條圖只是矩形，用 flex 反而更好控制與更省。
 */
function DayBars({
  days,
  values,
  color,
  label,
  formatValue,
  now,
}: {
  days: number[];
  values: number[];
  color: string;
  label: string;
  formatValue?: (v: number) => string;
  now: number;
}) {
  const t = useTheme();
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  // 分母是【整個視窗的天數】，不是有資料的天數。
  // 原本除以 nonZero.length 會系統性高估：14 天裡只記到 4 天共 2000 ml，
  // 會顯示「平均 500」而不是 143。這個數字是要拿給醫生看的，不能虛報。
  const avg = Math.round(total / values.length);

  return (
    <View style={styles.barsWrap}>
      <View style={styles.barsHead}>
        <Text style={[styles.barsLabel, { color: t.textMuted }]}>{label}</Text>
        <Text style={[styles.barsAvg, { color: t.text }]}>
          平均 {formatValue ? formatValue(avg) : avg}
        </Text>
      </View>

      <View style={styles.bars}>
        {values.map((v, i) => (
          <View key={days[i]} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: v > 0 ? color : t.cardBorder,
                  // 至少 2px，讓 0 的日子也看得出有這一格
                  height: Math.max(2, (v / max) * 56),
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.barsFoot}>
        <Text style={[styles.barsTick, { color: t.textMuted }]}>
          {formatDayLabelMs(days[0], now)}
        </Text>
        <Text style={[styles.barsTick, { color: t.textMuted }]}>
          {formatDayLabelMs(days[days.length - 1], now)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '800' },

  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  big: { fontSize: fontSize.hero, fontFamily: numFont.hero },
  note: { fontSize: fontSize.xs, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: spacing.sm },
  growthButtons: { flexDirection: 'row', gap: spacing.sm },

  barsWrap: { gap: spacing.xs },
  barsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  barsLabel: { fontSize: fontSize.xs, fontWeight: '700' },
  barsAvg: { fontSize: fontSize.xs, fontFamily: numFont.regular },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 56 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 2 },
  barsFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  barsTick: { fontSize: 10 },
});
