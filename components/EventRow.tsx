import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Baby, BabyEvent } from '../db/schema';
import { summarizeEvent, TYPE_EMOJI } from '../lib/labels';
import { formatClock } from '../lib/time';
import { useT } from '../lib/useT';
import { fontSize, radius, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

type Props = {
  event: BabyEvent;
  baby?: Baby;
  onPress: () => void;
  onLongPress: () => void;
};

/**
 * 歷史紀錄的一列。
 * 點擊 = 編輯，長按 = 刪除（刪除是軟刪除，所以刪完可以復原）。
 */
export function EventRow({ event, baby, onPress, onLongPress }: Props) {
  const t = useTheme();
  const tr = useT();
  const tone = baby ? t.baby[baby.colorKey] : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onLongPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? t.cardBorder : t.card,
          borderColor: t.cardBorder,
          // 左側粗色條：原本分辨「這是哪一寶」只靠一個 10×10 的圓點，
          // 整列完全沒有顏色。跟首頁的寶寶卡用同一套視覺語言，
          // 一整頁紀錄捲下來時可以靠顏色分組而不是逐列讀名字。
          borderLeftColor: tone?.base ?? t.cardBorder,
        },
      ]}
    >
      <Text style={[styles.time, { color: t.textMuted }]}>{formatClock(event.occurredAt)}</Text>

      <View style={[styles.dot, { backgroundColor: tone?.base ?? t.textMuted }]} />
      <Text style={[styles.baby, { color: t.text }]} numberOfLines={1}>
        {/* 擠奶沒有寶寶，顯示「媽媽」比顯示「—」清楚 */}
        {baby?.name ?? tr(event.type === 'pump' ? 'history.mother' : 'history.noBaby')}
      </Text>

      <Text style={styles.emoji}>{TYPE_EMOJI[event.type]}</Text>
      {/* 兩行而不是一行：生長紀錄是「3.10 kg · 50.2 cm · 頭圍 35.0 cm」，
          一行一定裝不下，結果頭圍永遠看不到 —— 而那是回診會問的三個數字之一。
          只有真的需要時才會佔到第二行，短的摘要不會多佔空間。 */}
      <Text style={[styles.summary, { color: t.text }]} numberOfLines={2}>
        {summarizeEvent(event)}
        {event.status === 'active' ? ` · ${tr('history.inProgress')}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 5,
  },
  time: { fontSize: fontSize.sm, fontFamily: numFont.regular, width: 46 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  /**
   * 固定寬度是刻意的：一整頁紀錄捲下來時，欄位對齊比「名字完整」更有助於掃視。
   * 56 → 76 是因為 56 連 3–4 個中文字都放不下（實測長一點的名字會截成「BearBe…」）。
   * 真正辨識哪一寶靠的是左側色條，名字是輔助，所以超長名字截斷可以接受。
   */
  baby: { fontSize: fontSize.sm, fontWeight: '700', width: 76 },
  emoji: { fontSize: 16 },
  summary: { fontSize: fontSize.sm, flex: 1 },
});
