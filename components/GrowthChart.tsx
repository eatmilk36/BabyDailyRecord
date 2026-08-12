import { format as formatDate } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type { GrowthPoint } from '../db/queries';
import type { Baby } from '../db/schema';
import { useT } from '../lib/useT';
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
 * ── 為什麼一定要標刻度與日期 ──
 * 原本刻意不標，理由是「手機寬度有限」。但 y 軸是從【最小值】起跳的，
 * 所以 20 公克的差異會被畫成一條橫跨整張圖的陡升線；而 x 軸完全沒有日期，
 * 你看不出這條線代表一週還是三個月。沒有刻度的折線圖只能看出「有沒有上升」，
 * 而這張圖的用途是【拿給醫生看】—— 那需要知道量級。
 *
 * 折衷做法：只標上下兩條基準線的數值（兩個數字，不是完整刻度軸）
 * 加上左右兩端的日期。這樣不會擠，但量級與時間跨度都讀得出來。
 */
export function GrowthChart({ series, metric, format, height = 160 }: Props) {
  const t = useTheme();
  const tr = useT();

  const withData = series
    .map((s) => ({
      ...s,
      pts: s.points.filter((p) => p[metric] != null) as (GrowthPoint & { [k: string]: number })[],
    }))
    .filter((s) => s.pts.length > 0);

  if (withData.length === 0) {
    return (
      <Text style={[styles.empty, { color: t.textMuted }]}>{tr('growth.empty')}</Text>
    );
  }

  // 所有點放在同一個座標系才能比較 —— 分開縮放會讓「差距」看起來是假的
  const allValues = withData.flatMap((s) => s.pts.map((p) => p[metric] as number));
  const allTimes = withData.flatMap((s) => s.pts.map((p) => p.at));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);

  /**
   * ⚠️ 橫軸至少要有 7 天的跨度。
   *
   * 原本是 spanT = maxT - minT，於是「同一次回診先量哥哥、30 秒後量弟弟」
   * 這個【最常見的第一筆資料】會讓 spanT = 30000ms，兩顆點各自貼在圖的
   * 最左與最右邊緣 —— 畫面看起來像「兩寶體重在一段時間內差距拉開」，
   * 實際上只是兩筆相差 30 秒的同一次量測。同一份資料的視覺結論還會隨
   * 輸入順序與間隔漂移。
   *
   * 補一個下限並把資料【居中】，30 秒前後的兩個點就會挨在一起。
   */
  const MIN_SPAN_MS = 7 * 24 * 60 * 60 * 1000;
  const spanT = Math.max(maxT - minT, MIN_SPAN_MS);
  const domainT0 = (minT + maxT) / 2 - spanT / 2;

  /**
   * ⚠️ 縱軸也要有下限，而且要居中。
   *
   * 原本 y 從 minV 起跳、spanV = maxV - minV || 1：
   *   - 只有一個點或兩點同值時，spanV = 1，點會塌在【下方基準線上】
   *     跟軸線糊在一起，看起來像圖沒畫出來
   *   - 兩點差 20g 時，那 20g 會撐滿整個圖高
   * 下限取「4% 或 1」，並把資料居中，斜率才會反映真實量級。
   */
  const spanV = Math.max(maxV - minV, Math.max(1, maxV * 0.04));
  const domainV0 = (minV + maxV) / 2 - spanV / 2;

  const W = 320;
  const H = height;
  const pad = 12;
  // 左邊留出標數值的空間
  const padLeft = 52;

  const x = (at: number) => padLeft + ((at - domainT0) / spanT) * (W - padLeft - pad);
  const y = (v: number) => H - pad - ((v - domainV0) / spanV) * (H - pad * 2);

  const shortDate = (ms: number) => formatDate(new Date(ms), 'M/d');

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* 上下兩條基準線 + 它們各自的數值。只有兩個數字，不是完整刻度軸 ——
            但足以讓人知道這條線的斜率代表 20 公克還是 2 公斤。 */}
        <Line x1={padLeft} y1={pad} x2={W - pad} y2={pad} stroke={t.cardBorder} strokeWidth={1} />
        <Line
          x1={padLeft}
          y1={H - pad}
          x2={W - pad}
          y2={H - pad}
          stroke={t.cardBorder}
          strokeWidth={1}
        />
        <SvgText x={0} y={pad + 4} fontSize={10} fill={t.textMuted}>
          {format(domainV0 + spanV)}
        </SvgText>
        <SvgText x={0} y={H - pad + 4} fontSize={10} fill={t.textMuted}>
          {format(domainV0)}
        </SvgText>

        {/* 日期軸畫在 SVG 裡，這樣它跟資料點用的是同一個座標系，不會對不齊。
            原本圖上完全沒有時間資訊 —— 你看不出這條線代表一週還是三個月，
            而那決定了同樣的斜率是正常還是異常。 */}
        <SvgText x={padLeft} y={H - 1} fontSize={9} fill={t.textMuted}>
          {shortDate(domainT0)}
        </SvgText>
        <SvgText x={W - pad} y={H - 1} fontSize={9} fill={t.textMuted} textAnchor="end">
          {shortDate(domainT0 + spanT)}
        </SvgText>

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

      {/* 兩寶最新測量的差距 —— 回診時醫生問的就是這個。
          ⚠️ 但要講清楚是不是同一天量的：原本只印一個數字，而如果哥哥今天量、
          弟弟上週量，那個「差距」混了兩個日期，卻看起來像同時的比較。 */}
      {withData.length === 2 ? <Delta a={withData[0]} b={withData[1]} metric={metric} format={format} /> : null}
    </View>
  );
}

type WithPts = { baby: Baby; pts: (GrowthPoint & { [k: string]: number })[] };

/**
 * 兩寶最新測量的差距。
 *
 * ⚠️ 一定要說明是不是同一天量的。原本只印一個數字，但「最新」對兩寶來說
 * 可能是不同的日期 —— 哥哥今天量、弟弟上週量，那個差距混了一週的成長，
 * 卻看起來像同時的比較。而這正是回診時會被拿來討論的數字。
 */
function Delta({
  a,
  b,
  metric,
  format,
}: {
  a: WithPts;
  b: WithPts;
  metric: GrowthMetric;
  format: (v: number) => string;
}) {
  const t = useTheme();
  const tr = useT();
  const la = a.pts[a.pts.length - 1];
  const lb = b.pts[b.pts.length - 1];
  const diff = Math.abs((la[metric] as number) - (lb[metric] as number));
  const day = (ms: number) => formatDate(new Date(ms), 'yyyy-MM-dd');
  const short = (ms: number) => formatDate(new Date(ms), 'M/d');
  const sameDay = day(la.at) === day(lb.at);

  return (
    <Text style={[styles.delta, { color: sameDay ? t.textMuted : t.warn }]}>
      {sameDay
        ? tr('growth.deltaSameDay', { value: format(diff), date: short(la.at) })
        : tr('growth.deltaDiffDay', {
            value: format(diff),
            a: a.baby.name,
            aDate: short(la.at),
            b: b.baby.name,
            bDate: short(lb.at),
          })}
    </Text>
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
