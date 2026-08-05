import { Alert, StyleSheet, Text, View } from 'react-native';
import type { EventPatch } from '../db/queries';
import type { BabyEvent, DiaperColor } from '../db/schema';
import {
  DIAPER_COLOR_ALERT,
  DIAPER_COLOR_LABEL,
  DIAPER_COLOR_SWATCH,
  DIAPER_KIND_LABEL,
  DURATION_PRESETS,
  METHOD_LABEL,
  MILK_LABEL,
  ML_PRESETS,
  SIDE_LABEL,
} from '../lib/labels';
import { formatClock } from '../lib/time';
import { fontSize, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { AmountPicker } from './AmountPicker';
import { Chip } from './Chip';

type Props = {
  event: BabyEvent;
  tint: string;
  onPatch: (p: EventPatch) => void;
};

/**
 * 補充 / 編輯一筆紀錄的所有欄位。單寶彈窗與雙寶彈窗共用這個元件。
 *
 * 全部欄位都是選填——這是刻意的。一筆只有時間的紀錄是完全合法的紀錄。
 * 每一次點擊都【立刻寫進資料庫】，所以沒有「儲存」按鈕，也不可能忘記存。
 */
export function EventFields({ event, tint, onPatch }: Props) {
  const t = useTheme();

  return (
    <View style={styles.wrap}>
      <TimeRow event={event} onPatch={onPatch} tint={tint} />

      {event.type === 'feed' ? (
        <>
          <Section label="餵法">
            {(['bottle', 'nursing'] as const).map((m) => (
              <Chip
                key={m}
                label={METHOD_LABEL[m]}
                tint={tint}
                selected={event.method === m}
                onPress={() => onPatch({ method: event.method === m ? null : m })}
              />
            ))}
          </Section>

          <Section label="奶種">
            {(['breast', 'formula', 'mixed'] as const).map((m) => (
              <Chip
                key={m}
                label={MILK_LABEL[m]}
                tint={tint}
                selected={event.milk === m}
                onPress={() => onPatch({ milk: event.milk === m ? null : m })}
              />
            ))}
          </Section>

          {event.method === 'nursing' ? (
            <>
              <Section label="哪一邊">
                {(['left', 'right', 'both'] as const).map((s) => (
                  <Chip
                    key={s}
                    label={SIDE_LABEL[s]}
                    tint={tint}
                    selected={event.side === s}
                    onPress={() => onPatch({ side: event.side === s ? null : s })}
                  />
                ))}
              </Section>
              <AmountPicker
                label="親餵時長"
                value={event.durationMin}
                presets={DURATION_PRESETS}
                unit="分鐘"
                tint={tint}
                onChange={(v) => onPatch({ durationMin: v ?? null })}
              />
            </>
          ) : (
            <AmountPicker
              label="實際喝掉的量"
              value={event.amountMl}
              presets={ML_PRESETS}
              unit="ml"
              tint={tint}
              onChange={(v) => onPatch({ amountMl: v ?? null })}
            />
          )}
        </>
      ) : (
        <>
          <Section label="類型">
            {(['pee', 'poop', 'both'] as const).map((k) => (
              <Chip
                key={k}
                label={DIAPER_KIND_LABEL[k]}
                tint={tint}
                selected={event.diaperKind === k}
                onPress={() =>
                  onPatch(
                    event.diaperKind === k
                      ? { diaperKind: null, diaperColor: null }
                      : { diaperKind: k },
                  )
                }
              />
            ))}
          </Section>

          {event.diaperKind === 'poop' || event.diaperKind === 'both' ? (
            <View style={styles.colorBlock}>
              <Section label="顏色（選填）">
                {(Object.keys(DIAPER_COLOR_LABEL) as DiaperColor[]).map((c) => (
                  <Chip
                    key={c}
                    label={DIAPER_COLOR_LABEL[c]}
                    swatch={DIAPER_COLOR_SWATCH[c]}
                    tint={tint}
                    selected={event.diaperColor === c}
                    onPress={() => {
                      const clearing = event.diaperColor === c;
                      onPatch({ diaperColor: clearing ? null : c });
                      // 白色/灰白色便是膽道閉鎖警訊——這是記顏色唯一的正當理由
                      const alertText = DIAPER_COLOR_ALERT[c];
                      if (!clearing && alertText) {
                        Alert.alert('請注意', alertText);
                      }
                    }}
                  />
                ))}
              </Section>
              <Text style={[styles.note, { color: t.textMuted }]}>
                對照寶寶手冊的嬰兒大便卡。白色或灰白色需要盡快就醫。
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/** 時間列：顯示發生時間，並提供「往前調」的快選（補登用）。 */
function TimeRow({
  event,
  tint,
  onPatch,
}: {
  event: BabyEvent;
  tint: string;
  onPatch: (p: EventPatch) => void;
}) {
  const t = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>發生時間</Text>
      <View style={styles.timeRow}>
        <Text style={[styles.clock, { color: t.text }]}>{formatClock(event.occurredAt)}</Text>
        <View style={styles.chips}>
          {[5, 15, 30].map((min) => (
            <Chip
              key={min}
              label={`早 ${min} 分`}
              tint={tint}
              onPress={() => onPatch({ occurredAt: event.occurredAt - min * 60_000 })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  clock: { fontSize: fontSize.xl, fontFamily: numFont.hero },
  colorBlock: { gap: spacing.sm },
  note: { fontSize: fontSize.xs, lineHeight: 18 },
});
