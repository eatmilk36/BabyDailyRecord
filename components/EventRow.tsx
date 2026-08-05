import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Baby, BabyEvent } from '../db/schema';
import { summarizeEvent } from '../lib/labels';
import { formatClock } from '../lib/time';
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
        { backgroundColor: pressed ? t.cardBorder : t.card, borderColor: t.cardBorder },
      ]}
    >
      <Text style={[styles.time, { color: t.textMuted }]}>{formatClock(event.occurredAt)}</Text>

      <View style={[styles.dot, { backgroundColor: tone?.base ?? t.textMuted }]} />
      <Text style={[styles.baby, { color: t.text }]} numberOfLines={1}>
        {baby?.name ?? '—'}
      </Text>

      <Text style={styles.emoji}>{event.type === 'feed' ? '🍼' : '💧'}</Text>
      <Text style={[styles.summary, { color: t.text }]} numberOfLines={1}>
        {summarizeEvent(event)}
        {event.status === 'active' ? ' · 進行中' : ''}
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
  },
  time: { fontSize: fontSize.sm, fontFamily: numFont.regular, width: 46 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  baby: { fontSize: fontSize.sm, fontWeight: '700', width: 56 },
  emoji: { fontSize: 16 },
  summary: { fontSize: fontSize.sm, flex: 1 },
});
