import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { GrowthChart, type GrowthMetric } from '../../components/GrowthChart';
import { QueryError } from '../../components/QueryError';
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
import { plural, type I18nKey } from '../../lib/i18n';
import { formatLength, formatMinutes, formatWeight } from '../../lib/labels';
import { useT } from '../../lib/useT';
import type { BabyEvent } from '../../db/schema';
import { dayKey, formatDayLabelMs, shiftDay, startOfToday } from '../../lib/time';
import { useActionLock } from '../../lib/useActionLock';
import { useNow } from '../../lib/useNow';
import { fontSize, radius, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';
import { numFont } from '../../theme/fonts';
import { useTheme } from '../../theme/useTheme';

const DAYS = 14;

const METRICS: { key: GrowthMetric; label: I18nKey; format: (v: number) => string }[] = [
  { key: 'weightG', label: 'stats.weight', format: formatWeight },
  { key: 'heightMm', label: 'stats.height', format: formatLength },
  { key: 'headMm', label: 'stats.head', format: formatLength },
];

/**
 * 統計頁：最近兩週的每日趨勢 + 雙胞胎生長對照 + 母乳庫存。
 *
 * 這裡放的都是「回顧型」資訊，不放任何一鍵記錄按鈕 —— 那是首頁的工作。
 */
export default function Stats() {
  const t = useTheme();
  const tr = useT();
  const now = useNow(60_000);
  const insets = useSafeAreaInsets();
  const { babies, error: babiesError } = useBabies();
  const { events, error: eventsError } = useRecentEvents();
  const { events: growth, error: growthError } = useGrowthEvents();
  const { stash, pumped, used, error: stashError } = useMilkStashMl();
  const lock = useActionLock();

  const [metric, setMetric] = useState<GrowthMetric>('weightG');
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];

  // 最近 DAYS 天，舊到新
  const days = Array.from({ length: DAYS }, (_, i) => shiftDay(startOfToday(now), i - (DAYS - 1)));

  /**
   * 一次把事件分到日期桶裡，再每寶每天算一次 statsOf。
   *
   * ⚠️ 原本是每張圖、每一天都重掃一遍全部事件，而每次都呼叫 date-fns 的
   * format()：14 天 × 3 張圖 × 2 寶 × 1000 筆 ≈ 8 萬次昂貴呼叫，
   * 而且 useNow(60_000) 每分鐘讓整包重跑一次 —— 切到這一頁會明顯卡一下，
   * 之後每分鐘再卡一次。現在每筆事件只算一次 dayKey。
   */
  const dayKeys = days.map(dayKey);
  const buckets = new Map<string, BabyEvent[]>();
  for (const e of events) {
    const k = dayKey(e.occurredAt);
    const arr = buckets.get(k);
    if (arr) arr.push(e);
    else buckets.set(k, [e]);
  }
  const perBaby = babies.map((b) => ({
    baby: b,
    stats: dayKeys.map((k) => statsOf(buckets.get(k) ?? [], b.id)),
  }));

  /**
   * 長條圖的最大值【跨寶共用】。
   *
   * 原本每個 DayBars 各自 Math.max 自己的 values，所以兩寶的圖上下並排
   * 卻不能互相比較 —— 一寶最高 60ml 和一寶最高 200ml 的柱子會畫成一樣高，
   * 而「兩寶差多少」正是雙胞胎回診時最想看的東西。
   */
  const sharedMax = {
    ml: Math.max(1, ...perBaby.flatMap((p) => p.stats.map((s) => s.totalMl))),
    nursing: Math.max(1, ...perBaby.flatMap((p) => p.stats.map((s) => s.nursingMin))),
    sleep: Math.max(1, ...perBaby.flatMap((p) => p.stats.map((s) => s.sleepMin))),
    diaper: Math.max(1, ...perBaby.flatMap((p) => p.stats.map((s) => s.diaperCount))),
  };

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
        <Text style={[styles.title, { color: t.text }]}>{tr('stats.title')}</Text>

        {/* 這一頁失敗時最危險：babies=[] 讓趨勢卡與記錄按鈕整批消失、
            stash 被 `?? 0` 填成 0、growth=[] 讓曲線顯示「還沒有這項測量的紀錄」。
            三個 fallback 疊起來是一個排版完整、文案通順、看起來就是
            「功能有但還沒記過資料」的畫面 —— 完全看不出查詢其實失敗了。 */}
        <QueryError error={babiesError} what="error.whatBabies" />
        <QueryError error={eventsError} what="error.whatRecentEvents" />
        <QueryError error={growthError} what="error.whatGrowth" />
        <QueryError error={stashError} what="error.whatStash" />

        {/* ---- 母乳庫存 ---- */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr('stats.milkStash')}</Text>
          {/* stash = 擠出 − 瓶餵母奶，所以【可以是負的】：你在開始用這個 APP
              之前就有的冷凍庫存，或有幾次擠奶忘了記，都會讓瓶餵量大於擠出量。
              原本直接印負數，而旁邊還寫著「不會跟紀錄對不上」—— 看起來像壞了。
              現在庫存顯示 0，把差額當成獨立的一句話講清楚。 */}
          <Text style={[styles.big, { color: t.primary }]}>{Math.max(0, stash)} ml</Text>
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('stats.stashBreakdown', { pumped, used })}
          </Text>
          {stash < 0 ? (
            <View style={[styles.warnBox, { backgroundColor: t.warnSoft, borderColor: t.warn }]}>
              <Text style={[styles.warnText, { color: t.warn }]}>
                {tr('stats.stashNegativeTitle', { n: -stash })}
                {'\n'}
                {tr('stats.stashNegativeWhy')}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.note, { color: t.textMuted }]}>{tr('stats.stashNote')}</Text>
        </View>

        {/* ---- 每日趨勢 ---- */}
        {perBaby.map(({ baby: b, stats }) => (
          <View
            key={b.id}
            style={[
              styles.card,
              {
                backgroundColor: t.baby[b.colorKey].soft,
                borderColor: t.cardBorder,
                borderLeftColor: t.baby[b.colorKey].base,
              },
              styles.cardEdge,
            ]}
          >
            <View style={styles.cardHead}>
              <View style={[styles.dot, { backgroundColor: t.baby[b.colorKey].base }]} />
              <Text style={[styles.cardTitle, { color: t.text }]}>
                {tr('stats.recentDays', { name: b.name, days: DAYS })}
              </Text>
            </View>

            {/* 欄名一定要寫「瓶餵」。totalMl 只加 amountMl，而親餵沒有 ml ——
                原本叫「每日奶量」，純親餵的日子會顯示 0，看起來像那天沒餵過。 */}
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label={tr('stats.barBottleMl')}
              values={stats.map((s) => s.totalMl)}
              max={sharedMax.ml}
              now={now}
            />
            {/* 親餵記的是時間不是毫升，所以必須有自己的一張圖，
                否則「每日奶量」那張對純親餵的人永遠是空的 */}
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label={tr('stats.barNursingTime')}
              values={stats.map((s) => s.nursingMin)}
              max={sharedMax.nursing}
              formatValue={formatMinutes}
              now={now}
            />
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label={tr('stats.barSleep')}
              values={stats.map((s) => s.sleepMin)}
              max={sharedMax.sleep}
              formatValue={formatMinutes}
              now={now}
            />
            <DayBars
              days={days}
              color={t.baby[b.colorKey].base}
              label={tr('stats.barDiapers')}
              values={stats.map((s) => s.diaperCount)}
              max={sharedMax.diaper}
              now={now}
            />
          </View>
        ))}

        <Text style={[styles.note, { color: t.textMuted }]}>
          {tr('stats.sharedScaleNote')}
          {'\n'}
          {tr('stats.windowNote', { days: DAYS })}
        </Text>

        {/* ---- 生長對照 ---- */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr('stats.growthTitle')}</Text>

          <View style={styles.chips}>
            {METRICS.map((m) => (
              <Chip
                key={m.key}
                label={tr(m.label)}
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

          <Text style={[styles.note, { color: t.textMuted }]}>{tr('stats.whoNote')}</Text>

          <View style={styles.growthButtons}>
            {babies.map((b) => (
              <SlimButton
                key={b.id}
                label={tr('stats.logGrowth', { name: b.name })}
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

/**
 * 每日長條圖。
 * 用 View 疊出來而不是 SVG —— 長條圖只是矩形，用 flex 反而更好控制與更省。
 */
function DayBars({
  days,
  values,
  color,
  label,
  max,
  formatValue,
  now,
}: {
  days: number[];
  values: number[];
  color: string;
  label: string;
  /** 縱軸最大值。由呼叫端【跨寶】算好傳進來，兩寶才能互相比較 */
  max: number;
  formatValue?: (v: number) => string;
  now: number;
}) {
  const t = useTheme();
  const tr = useT();
  const total = values.reduce((a, b) => a + b, 0);
  const daysWithData = values.filter((v) => v > 0).length;
  // 分母是【整個視窗的天數】，不是有資料的天數。
  // 原本除以 nonZero.length 會系統性高估：14 天裡只記到 4 天共 2000 ml，
  // 會顯示「平均 500」而不是 143。這個數字是要拿給醫生看的，不能虛報。
  // 標籤把分母寫出來，讀的人才知道 0 的日子有被算進去。
  const avg = Math.round(total / values.length);

  return (
    <View style={styles.barsWrap}>
      <View style={styles.barsHead}>
        <Text style={[styles.barsLabel, { color: t.textMuted }]}>{label}</Text>
        {/* 分母寫出來，並補上「有記錄幾天」——這樣兩種算法的答案你都推得出來：
            除以 14 天（這裡顯示的，誠實但會被沒記錄的日子拉低）
            除以有記錄的天數（自己心算：平均 × 14 ÷ 有記錄天數）
            不挑邊站，因為哪個才對取決於你那 14 天是不是真的每天都在記。 */}
        <Text style={[styles.barsAvg, { color: t.text }]}>
          {tr('stats.avg', { days: DAYS, value: formatValue ? formatValue(avg) : avg })}
          <Text style={{ color: t.textMuted }}>
            {tr(plural(daysWithData, 'stats.daysWithData'), { n: daysWithData })}
          </Text>
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
  // 跟首頁的寶寶卡一致：左側粗色條是「這是哪一寶」最強的訊號
  cardEdge: { borderLeftWidth: 6 },
  warnBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  warnText: { fontSize: fontSize.xs, lineHeight: 18 },
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
