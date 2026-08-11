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
  activeSleep?: BabyEvent;
  suggestedSide?: NursingSide;
  stats: TodayStats;
  now: number;
  onFeed: () => void;
  onDiaper: () => void;
  onStartNursing: () => void;
  onStopNursing: () => void;
  onStartSleep: () => void;
  onStopSleep: () => void;
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
  activeSleep,
  suggestedSide,
  stats,
  now,
  onFeed,
  onDiaper,
  onStartNursing,
  onStopNursing,
  onStartSleep,
  onStopSleep,
}: Props) {
  const t = useTheme();
  const tone = t.baby[baby.colorKey];
  const feedDue = !activeNursing && isFeedDue(lastFeed, now);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone.soft,
          borderColor: t.cardBorder,
          // 左側粗色條：這是「這張卡是哪一寶」最強的訊號。
          // 卡片底色只能是【淡】的（要讓深色文字讀得下去），所以兩張卡的亮度
          // 本質上拉不開太多；一條飽和的實色卻不受這個限制，而且面積夠大，
          // 半夜眼睛沒對焦時先看到的就是它。
          borderLeftColor: tone.base,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: tone.base }]} />
        <Text style={[styles.name, { color: t.text }]}>{baby.name}</Text>
        {feedDue ? (
          <View style={[styles.badge, { backgroundColor: t.warn }]}>
            {/* 走 theme 而不是寫死白色：深色主題的 warn 是亮橘，白字只有 2.25:1 ——
                全卡片最看不清的偏偏是唯一的警示 */}
            <Text style={[styles.badgeText, { color: t.onWarn }]}>該餵了</Text>
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
          <NursingTimerBanner
            event={activeNursing}
            tint={tone.base}
            onStop={onStopNursing}
            kind="nursing"
          />
        </View>
      ) : null}

      {activeSleep ? (
        <View style={styles.block}>
          {/* 外觀、標題、按鈕文字全部由 kind 決定，呼叫端不可能組出
              「標題寫睡覺但按鈕寫結束親餵」這種不一致 */}
          <NursingTimerBanner
            event={activeSleep}
            tint={tone.base}
            onStop={onStopSleep}
            kind="sleep"
          />
        </View>
      ) : null}

      {!activeNursing || !activeSleep ? (
        <View style={[styles.block, styles.slimRow]}>
          {!activeNursing ? (
            <SlimButton
              label={suggestedSide ? `親餵 · 建議 ${SIDE_LABEL[suggestedSide]}` : '開始親餵'}
              tint={tone.base}
              // 邊框用 base 保留顏色識別，文字用 on 才讀得清楚（base 疊在 soft 上只有 1.7:1）
              labelColor={tone.on}
              onPress={onStartNursing}
            />
          ) : null}
          {!activeSleep ? (
            <SlimButton
              label="🌙 開始睡覺"
              tint={tone.base}
              labelColor={tone.on}
              onPress={onStartSleep}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        {/* 填色 = 動作（兩張卡上的「喝奶」同色，動作編碼完整保留）
            外框 = 是誰。半夜看的是最大的元素，而它原本完全沒有寶寶資訊。 */}
        <BigActionButton
          emoji="🍼"
          label="喝奶"
          color={t.feed}
          borderColor={tone.base}
          onPress={onFeed}
        />
        <BigActionButton
          emoji="💧"
          label="尿布"
          color={t.diaper}
          borderColor={tone.base}
          onPress={onDiaper}
        />
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
    // 只加左邊，不動上下——上下改了會影響卡片高度與捲動留白的估算
    borderLeftWidth: 6,
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
  badgeText: { fontSize: fontSize.xs, fontWeight: '800' },

  lastLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lastEmoji: { fontSize: 20 },
  lastBody: { flex: 1 },
  lastAgo: { fontSize: fontSize.md, fontFamily: numFont.regular },
  lastMeta: { fontSize: fontSize.xs, marginTop: 1 },
  lastEmpty: { fontSize: fontSize.sm, flex: 1 },
  accentBar: { width: 4, height: 28, borderRadius: 2 },

  block: { marginTop: spacing.xs },
  slimRow: { flexDirection: 'row', gap: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
