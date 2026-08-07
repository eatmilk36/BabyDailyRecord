import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { GrowthPoint } from '../db/queries';
import type { Baby } from '../db/schema';
import { fontSize, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export type GrowthMetric = 'weightG' | 'heightMm' | 'headMm';

type Series = { baby: Baby; points: GrowthPoint[] };

type Props = {
  series: Series[];
  metric: GrowthMetric;
  /** 把底層整數（g / mm）換成顯示值的函式 */
  format: (v: number) => string;
  height?: number;
};

/**
 * 雙胞胎生長對照曲線。
 *
 * 為什麼是「兩寶疊圖」而不是「WHO 百分位」：
 * WHO 百分位需要官方的 LMS 參考表（3 種測量 × 2 性別 × 0–24 月）。那是醫療
 * 數據，不能憑印象填，所以先不做。而對雙胞胎來說，兩寶互相對照其實更直接 ——
 * 回診時醫生盯的正是兩個之間的差距有沒有擴大。
 *
 * 刻意不畫 y 軸刻度線與數字：手機寬度有限，畫太多會擠成一團。
 * 改成在圖下方列出每次測量的實際數值與差距 —— 那才是要拿給醫生看的東西。
 */
export function GrowthChart({ series, metric, format, height = 160 }: Props) {
  const t = useTheme();

  const withData = series
    .map((s) => ({
      ...s,
      pts: s.points.filter((p) => p[metric] != null) as (GrowthPoint & { [k: string]: number })[],
    }))
    .filter((s) => s.pts.length > 0);

  if (withData.length === 0) {
    return (
      <Text style={[styles.empty, { color: t.textMuted }]}>
        還沒有這項測量的紀錄。量過之後這裡會出現曲線。
      </Text>
    );
  }

  // 所有點放在同一個座標系才能比較 —— 分開縮放會讓「差距」看起來是假的
  const allValues = withData.flatMap((s) => s.pts.map((p) => p[metric] as number));
  const allTimes = withData.flatMap((s) => s.pts.map((p) => p.at));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);

  // 只有一個點或全部同值時給一個假的跨度，避免除以零
  const spanV = maxV - minV || 1;
  const spanT = maxT - minT || 1;

  const W = 320;
  const H = height;
  const pad = 12;

  const x = (at: number) => pad + ((at - minT) / spanT) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - minV) / spanV) * (H - pad * 2);

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* 上下兩條淡淡的基準線，給眼睛一個參考，但不標數字 */}
        <Line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke={t.cardBorder} strokeWidth={1} />
        <Line
          x1={pad}
          y1={H - pad}
          x2={W - pad}
          y2={H - pad}
          stroke={t.cardBorder}
          strokeWidth={1}
        />

        {withData.map((s) => {
          const color = t.baby[s.baby.colorKey].base;
          const pointsAttr = s.pts
            .map((p) => `${x(p.at).toFixed(1)},${y(p[metric] as number).toFixed(1)}`)
            .join(' ');
          return (
            <React.Fragment key={s.baby.id}>
              {s.pts.length > 1 ? (
                <Polyline points={pointsAttr} fill="none" stroke={color} strokeWidth={2.5} />
              ) : null}
              {s.pts.map((p) => (
                <Circle
                  key={p.at}
                  cx={x(p.at)}
                  cy={y(p[metric] as number)}
                  r={4}
                  fill={color}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        {withData.map((s) => {
          const last = s.pts[s.pts.length - 1];
          return (
            <View key={s.baby.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: t.baby[s.baby.colorKey].base }]} />
              <Text style={[styles.legendName, { color: t.text }]}>{s.baby.name}</Text>
              <Text style={[styles.legendValue, { color: t.text }]}>
                {format(last[metric] as number)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 兩寶最新測量的差距 —— 回診時醫生問的就是這個 */}
      {withData.length === 2 ? (
        <Text style={[styles.delta, { color: t.textMuted }]}>
          最新差距{' '}
          {format(
            Math.abs(
              (withData[0].pts[withData[0].pts.length - 1][metric] as number) -
                (withData[1].pts[withData[1].pts.length - 1][metric] as number),
            ),
          )}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  empty: { fontSize: fontSize.xs, lineHeight: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontSize: fontSize.xs, fontWeight: '700' },
  legendValue: { fontSize: fontSize.sm, fontFamily: numFont.regular },
  delta: { fontSize: fontSize.xs, fontWeight: '600' },
});
