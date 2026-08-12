import { StyleSheet, Text, View } from 'react-native';
import type { TodayStats } from '../db/queries';
import { plural } from '../lib/i18n';
import { formatMinutes } from '../lib/labels';
import { useT } from '../lib/useT';
import { fontSize, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

type Props = {
  stats: TodayStats;
  /** 前綴文字。首頁是「今天」，紀錄頁換成寶寶的名字 */
  label?: string;
  /**
   * 前綴是【寶寶名字】時要設 true。
   *
   * 紀錄頁把名字當 label 傳進來，而預設樣式是全 APP 最小的 12px 淡灰字 ——
   * 於是「這張卡是哪一寶」用了最不顯眼的排版，而那是雙胞胎最需要先知道的事。
   */
  prefixStrong?: boolean;
};

/**
 * 某寶某一天的摘要。
 * 雙胞胎一定要分開看——體重與攝入量的差異是回診重點。
 */
export function TodaySummary({ stats, label, prefixStrong }: Props) {
  const t = useTheme();
  const tr = useT();
  // 預設「今天」要走翻譯，所以不能寫在參數預設值裡（那時還拿不到 tr）
  const prefix = label ?? tr('summary.today');

  const items: { value: string; label: string }[] = [
    // plural()：英文的「1 feed」vs「2 feeds」。中文兩個字典值一樣所以是 no-op
    { value: String(stats.feedCount), label: tr(plural(stats.feedCount, 'summary.feeds')) },
    ...(stats.totalMl > 0 ? [{ value: String(stats.totalMl), label: tr('summary.ml') }] : []),
    ...(stats.nursingMin > 0
      ? [{ value: String(stats.nursingMin), label: tr('summary.nursingMin') }]
      : []),
    {
      value: String(stats.diaperCount),
      label: tr(plural(stats.diaperCount, 'summary.diapers')),
    },
    ...(stats.poopCount > 0
      ? [{ value: String(stats.poopCount), label: tr(plural(stats.poopCount, 'summary.poops')) }]
      : []),
    // 睡眠用「小時 分」而不是純分鐘 —— 380 分鐘要在腦裡換算，6 小時 20 分不用
    ...(stats.sleepMin > 0
      ? [{ value: formatMinutes(stats.sleepMin), label: tr('summary.sleep') }]
      : []),
  ];

  return (
    <View style={styles.row}>
      <Text
        style={[
          prefixStrong ? styles.prefixStrong : styles.prefix,
          { color: prefixStrong ? t.text : t.textMuted },
        ]}
      >
        {prefix}
      </Text>
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
  prefixStrong: { fontSize: fontSize.md, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: { fontSize: fontSize.md, fontFamily: numFont.regular },
  label: { fontSize: fontSize.xs },
});
