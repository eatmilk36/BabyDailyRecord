import { StyleSheet, Text, View } from 'react-native';
import { isFeedDue, type TodayStats } from '../db/queries';
import type { Baby, BabyEvent, NursingSide } from '../db/schema';
import { SIDE_LABEL, summarizeEvent } from '../lib/labels';
import { formatAgo, formatClock } from '../lib/time';
import { fontSize, radius, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { BigActionButton } from './BigActionButton';
import { NursingTimerBanner } from './NursingTimerBanner';
import { SlimButton } from './SlimButton';
import { TodaySummary } from './TodaySummary';

type Props = {
  baby: Baby;
  lastFeed?: BabyEvent;
  lastDiaper?: BabyEvent;
  activeNursing?: BabyEvent;
  suggestedSide?: NursingSide;
  stats: TodayStats;
  now: number;
  onFeed: () => void;
  onDiaper: () => void;
  onStartNursing: () => void;
  onStopNursing: () => void;
};

/**
 * 一個寶寶的完整卡片（A2 佈局的核心）。
 *
 * 為什麼按鈕要綁在各自的卡片上，而不是共用一組按鈕再選寶寶？
 * 因為那樣每一筆紀錄都會多一步。雙胞胎一天約 32 次餵 + 20 片尿布，
 * 多一步就是一天多 50 次點擊——在你最沒空的時候。
 *
 * 卡片微微染上寶寶的代表色，是為了讓半夜辨識靠「顏色 + 位置」而不是讀名字。
 */
export function BabyCard({
  baby,
  lastFeed,
  lastDiaper,
  activeNursing,
  suggestedSide,
  stats,
  now,
  onFeed,
  onDiaper,
  onStartNursing,
  onStopNursing,
}: Props) {
  const t = useTheme();
  const tone = t.baby[baby.colorKey];
  const feedDue = !activeNursing && isFeedDue(lastFeed, now);

  return (
    <View style={[styles.card, { backgroundColor: tone.soft, borderColor: t.cardBorder }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: tone.base }]} />
        <Text style={[styles.name, { color: t.text }]}>{baby.name}</Text>
        {feedDue ? (
          <View style={[styles.badge, { backgroundColor: t.warn }]}>
            <Text style={styles.badgeText}>該餵了</Text>
          </View>
        ) : null}
      </View>

      <LastLine
        emoji="🍼"
        event={lastFeed}
        now={now}
        emptyText="還沒有喝奶紀錄"
        accent={t.feed}
      />
      <LastLine
        emoji="💧"
        event={lastDiaper}
        now={now}
        emptyText="還沒有尿布紀錄"
        accent={t.diaper}
      />

      {activeNursing ? (
        <View style={styles.block}>
          <NursingTimerBanner event={activeNursing} tint={tone.base} onStop={onStopNursing} />
        </View>
      ) : (
        <View style={styles.block}>
          <SlimButton
            label={
              suggestedSide
                ? `開始親餵 · 建議 ${SIDE_LABEL[suggestedSide]}`
                : '開始親餵'
            }
            tint={tone.base}
            onPress={onStartNursing}
          />
        </View>
      )}

      <View style={styles.buttonRow}>
        <BigActionButton emoji="🍼" label="喝奶" color={t.feed} onPress={onFeed} />
        <BigActionButton emoji="💧" label="尿布" color={t.diaper} onPress={onDiaper} />
      </View>

      <TodaySummary stats={stats} />
    </View>
  );
}

function LastLine({
  emoji,
  event,
  now,
  emptyText,
  accent,
}: {
  emoji: string;
  event?: BabyEvent;
  now: number;
  emptyText: string;
  accent: string;
}) {
  const t = useTheme();

  if (!event) {
    return (
      <View style={styles.lastLine}>
        <Text style={styles.lastEmoji}>{emoji}</Text>
        <Text style={[styles.lastEmpty, { color: t.textMuted }]}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.lastLine}>
      <Text style={styles.lastEmoji}>{emoji}</Text>
      <View style={styles.lastBody}>
        <Text style={[styles.lastAgo, { color: t.text }]}>{formatAgo(event.occurredAt, now)}</Text>
        <Text style={[styles.lastMeta, { color: t.textMuted }]}>
          {formatClock(event.occurredAt)} · {summarizeEvent(event)}
        </Text>
      </View>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: fontSize.lg, fontWeight: '800', flex: 1 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '800' },

  lastLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lastEmoji: { fontSize: 20 },
  lastBody: { flex: 1 },
  lastAgo: { fontSize: fontSize.md, fontFamily: numFont.regular },
  lastMeta: { fontSize: fontSize.xs, marginTop: 1 },
  lastEmpty: { fontSize: fontSize.sm, flex: 1 },
  accentBar: { width: 4, height: 28, borderRadius: 2 },

  block: { marginTop: spacing.xs },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
