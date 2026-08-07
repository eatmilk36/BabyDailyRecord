import { StyleSheet, Text, View } from 'react-native';
import type { TodayStats } from '../db/queries';
import { formatMinutes } from '../lib/labels';
import { fontSize, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

type Props = {
  stats: TodayStats;
  /** 前綴文字。首頁是「今天」，紀錄頁換成該日日期 */
  label?: string;
};

/**
 * 某寶某一天的摘要。
 * 雙胞胎一定要分開看——體重與攝入量的差異是回診重點。
 */
export function TodaySummary({ stats, label = '今天' }: Props) {
  const t = useTheme();

  const items: { value: string; label: string }[] = [
    { value: String(stats.feedCount), label: '次奶' },
    ...(stats.totalMl > 0 ? [{ value: String(stats.totalMl), label: 'ml' }] : []),
    ...(stats.nursingMin > 0 ? [{ value: String(stats.nursingMin), label: '分親餵' }] : []),
    { value: String(stats.diaperCount), label: '片尿布' },
    ...(stats.poopCount > 0 ? [{ value: String(stats.poopCount), label: '次便' }] : []),
    // 睡眠用「小時 分」而不是純分鐘 —— 380 分鐘要在腦裡換算，6 小時 20 分不用
    ...(stats.sleepMin > 0 ? [{ value: formatMinutes(stats.sleepMin), label: '睡' }] : []),
  ];

  return (
    <View style={styles.row}>
      <Text style={[styles.prefix, { color: t.textMuted }]}>{label}</Text>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={styles.item}>
          <Text style={[styles.value, { color: t.text }]}>{it.value}</Text>
          <Text style={[styles.label, { color: t.textMuted }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
  prefix: { fontSize: fontSize.xs, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: { fontSize: fontSize.md, fontFamily: numFont.regular },
  label: { fontSize: fontSize.xs },
});
