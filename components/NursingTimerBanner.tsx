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

export type TimerKind = 'nursing' | 'sleep';

type Props = {
  event: BabyEvent;
  tint: string;
  onStop: () => void;
  kind: TimerKind;
};

/**
 * 每種計時的完整外觀與文案。
 *
 * ⚠️ 為什麼收成一個表、而不是像原本那樣讓呼叫端各自傳 title / overdueTitle /
 * overdueMin：因為原本兩種計時的差別【只有標題那三個字】，而兩顆按鈕都寫「結束」。
 * 同一張卡片上同時出現親餵中和睡眠中的時候，你會看到兩個外觀一致、
 * 按鈕字一樣的橫幅——半夜按錯就把親餵當睡眠結束掉，時長全錯。
 *
 * 現在每種計時有三個彼此獨立的辨識訊號：emoji、標題、以及【按鈕自己說它要結束什麼】。
 */
const KIND: Record<
  TimerKind,
  { icon: string; title: string; overdueTitle: string; stopLabel: string; overdueMin: number | null }
> = {
  nursing: {
    icon: '🍼',
    title: '正在餵',
    overdueTitle: '還在餵嗎？',
    stopLabel: '結束親餵',
    overdueMin: NURSING_OVERDUE_MIN,
  },
  sleep: {
    icon: '🌙',
    title: '正在睡',
    // 睡眠不做超時警示：寶寶睡 3 小時是好事，不該被標紅
    overdueTitle: '正在睡',
    stopLabel: '結束睡眠',
    overdueMin: null,
  },
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
export function NursingTimerBanner({ event, tint, onStop, kind }: Props) {
  const t = useTheme();
  const now = useNow(1000);
  const spec = KIND[kind];
  const elapsedMin = Math.floor((now - event.occurredAt) / 60000);
  const overdue = spec.overdueMin != null && elapsedMin >= spec.overdueMin;

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
          {spec.icon} {overdue ? spec.overdueTitle : spec.title}
          {event.side ? ` · ${SIDE_LABEL[event.side]}` : ''}
        </Text>
        <Text style={[styles.elapsed, { color: overdue ? t.warn : t.text }]}>
          {formatElapsed(event.occurredAt, now)}
        </Text>
        <Text style={[styles.meta, { color: t.textMuted }]}>
          {formatClock(event.occurredAt)} 開始
        </Text>
      </View>
      <View style={styles.right}>
        {/* 按鈕自己說它要結束什麼。原本兩種計時的按鈕都只寫「結束」，
            兩個橫幅同時出現時無從分辨 —— 這是這個元件最重要的一處改動。 */}
        <SlimButton label={spec.stopLabel} onPress={onStop} tint={overdue ? t.warn : tint} filled />
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
  // 放大到容得下「結束親餵」四個字（14px × 4 ≈ 56px + SlimButton 左右各 12 內距）
  right: { width: 112 },
  title: { fontSize: fontSize.sm, fontWeight: '700' },
  elapsed: { fontSize: fontSize.xl, fontFamily: numFont.hero, marginTop: 2 },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
});
