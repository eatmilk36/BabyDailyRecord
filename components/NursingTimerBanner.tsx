import { StyleSheet, Text, View } from 'react-native';
import type { BabyEvent } from '../db/schema';
import { NURSING_OVERDUE_MIN } from '../db/queries';
import { SIDE_LABEL } from '../lib/labels';
import { formatClock, formatElapsed } from '../lib/time';
import { useNow } from '../lib/useNow';
import { fontSize, radius, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { SlimButton } from './SlimButton';

type Props = {
  event: BabyEvent;
  tint: string;
  onStop: () => void;
  /** 進行中的標題，預設「正在餵」 */
  title?: string;
  /** 超時後的標題，預設「還在餵嗎？」 */
  overdueTitle?: string;
  /**
   * 超過幾分鐘算超時。預設 NURSING_OVERDUE_MIN（60）。
   * 傳 null 表示不做超時警示 —— 睡眠就用這個，寶寶睡 3 小時是好事不是異常。
   */
  overdueMin?: number | null;
};

/**
 * 親餵計時中的橫幅。
 *
 * ⚠️ 經過時間是【每秒用當下時間重算 now - occurredAt】，不是累加計數器。
 * 這代表 APP 被 Android 系統殺掉、你重開之後計時仍然正確，
 * 因為真相存在資料庫裡（occurredAt + status='active'），不在記憶體。
 *
 * 超過 60 分鐘轉成警示色並問「還在餵嗎？」——這是 v1 的忘記按結束守護機制。
 * （推播通知版留到第二階段，因為那要處理 Android 13+ 權限與各家省電機制。）
 */
export function NursingTimerBanner({
  event,
  tint,
  onStop,
  title = '正在餵',
  overdueTitle = '還在餵嗎？',
  overdueMin = NURSING_OVERDUE_MIN,
}: Props) {
  const t = useTheme();
  const now = useNow(1000);
  const elapsedMin = Math.floor((now - event.occurredAt) / 60000);
  const overdue = overdueMin != null && elapsedMin >= overdueMin;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: overdue ? t.warnSoft : `${tint}26`,
          borderColor: overdue ? t.warn : tint,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.title, { color: overdue ? t.warn : t.text }]}>
          {overdue ? overdueTitle : title}
          {event.side ? ` · ${SIDE_LABEL[event.side]}` : ''}
        </Text>
        <Text style={[styles.elapsed, { color: overdue ? t.warn : t.text }]}>
          {formatElapsed(event.occurredAt, now)}
        </Text>
        <Text style={[styles.meta, { color: t.textMuted }]}>
          {formatClock(event.occurredAt)} 開始
        </Text>
        {/* 睡眠沒有超時警示：寶寶睡 3 小時是好事，不該被標紅 */}
      </View>
      <View style={styles.right}>
        <SlimButton label="結束" onPress={onStop} tint={overdue ? t.warn : tint} filled />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  left: { flex: 1 },
  right: { width: 92 },
  title: { fontSize: fontSize.sm, fontWeight: '700' },
  elapsed: { fontSize: fontSize.xl, fontFamily: numFont.hero, marginTop: 2 },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
});
