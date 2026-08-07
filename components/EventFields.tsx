import { Alert, StyleSheet, Text, View } from 'react-native';
import type { EventPatch } from '../db/queries';
import type { BabyEvent } from '../db/schema';
import {
  DIAPER_KIND_LABEL,
  DURATION_PRESETS,
  isStoolCardAbnormal,
  METHOD_LABEL,
  MILK_LABEL,
  ML_PRESETS,
  SIDE_LABEL,
  STOOL_CARD_ABNORMAL,
  STOOL_CARD_ALERT,
  STOOL_CARD_NORMAL,
  STOOL_CARD_UNSURE,
  stoolCardLabel,
} from '../lib/labels';
import { formatClock } from '../lib/time';
import { fontSize, radius, spacing } from '../theme/colors';
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
              <Text style={[styles.note, { color: t.textMuted }]}>
                拿出寶寶手冊裡的「九色大便卡」，對照實體卡片後點下最接近的編號。
                {'\n'}
                手機螢幕沒有色彩校準（而你現在可能把亮度調到最低），所以這裡不放色塊。
              </Text>

              <Section label="正常（7–9）">
                {STOOL_CARD_NORMAL.map((n) => (
                  <Chip
                    key={n}
                    label={stoolCardLabel(n)}
                    tint={t.diaper}
                    selected={event.stoolCard === n}
                    onPress={() => onPatch({ stoolCard: event.stoolCard === n ? null : n })}
                  />
                ))}
              </Section>

              <Section label="需要注意（1–6）">
                {[...STOOL_CARD_ABNORMAL, STOOL_CARD_UNSURE].map((n) => (
                  <Chip
                    key={n}
                    label={stoolCardLabel(n)}
                    tint={t.warn}
                    selected={event.stoolCard === n}
                    onPress={() => {
                      const clearing = event.stoolCard === n;
                      onPatch({ stoolCard: clearing ? null : n });
                      // 1–6 號與「說不準」都要警示 —— 官方指引明確把「介於之間」也算進去
                      if (!clearing && isStoolCardAbnormal(n)) {
                        Alert.alert('請盡快就醫', STOOL_CARD_ALERT);
                      }
                    }}
                  />
                ))}
              </Section>

              {isStoolCardAbnormal(event.stoolCard) ? (
                <View style={[styles.alertBox, { backgroundColor: t.warnSoft, borderColor: t.warn }]}>
                  <Text style={[styles.alertText, { color: t.warn }]}>
                    ⚠ 這個編號需要就醫評估。滿 30 天打 B 肝疫苗時務必主動請醫護人員看大便顏色。
                    {'\n'}兒童肝膽疾病防治基金會：(02) 2382-0886
                  </Text>
                </View>
              ) : null}
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
  colorBlock: { gap: spacing.md },
  note: { fontSize: fontSize.xs, lineHeight: 18 },
  alertBox: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertText: { fontSize: fontSize.xs, fontWeight: '600', lineHeight: 19 },
});
