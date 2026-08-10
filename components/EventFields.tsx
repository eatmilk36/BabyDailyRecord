import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import type { EventPatch } from '../db/queries';
import type { BabyEvent } from '../db/schema';
import {
  DIAPER_KIND_LABEL,
  DURATION_PRESETS,
  isStoolCardAbnormal,
  METHOD_LABEL,
  MILK_LABEL,
  ML_PRESETS,
  PUMP_PRESETS,
  SIDE_LABEL,
  SLEEP_PRESETS,
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
 * 補充 / 編輯一筆紀錄的所有欄位。所有彈窗共用這個元件。
 *
 * 全部欄位都是選填 —— 這是刻意的。一筆只有時間的紀錄是完全合法的紀錄。
 * 每一次點擊都【立刻寫進資料庫】，所以沒有「儲存」按鈕，也不可能忘記存。
 */
export function EventFields({ event, tint, onPatch }: Props) {
  return (
    <View style={styles.wrap}>
      <TimeRow event={event} onPatch={onPatch} tint={tint} />

      {event.type === 'feed' ? <FeedFields event={event} tint={tint} onPatch={onPatch} /> : null}
      {event.type === 'diaper' ? <DiaperFields event={event} tint={tint} onPatch={onPatch} /> : null}
      {event.type === 'sleep' ? <SleepFields event={event} tint={tint} onPatch={onPatch} /> : null}
      {event.type === 'pump' ? <PumpFields event={event} tint={tint} onPatch={onPatch} /> : null}
      {event.type === 'growth' ? <GrowthFields event={event} onPatch={onPatch} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------

function FeedFields({ event, tint, onPatch }: Props) {
  // hook 必須無條件呼叫，不能寫在下面的條件渲染裡
  const t = useTheme();
  return (
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

      {/* 瓶餵母奶會從母乳庫存扣掉，這裡明講，免得你看到庫存變少覺得奇怪 */}
      {event.method === 'bottle' && event.milk === 'breast' ? (
        <Text style={[styles.note, { color: t.textMuted }]}>這筆會從母乳庫存扣掉。</Text>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------

function DiaperFields({ event, tint, onPatch }: Props) {
  const t = useTheme();
  const showStool = event.diaperKind === 'poop' || event.diaperKind === 'both';

  return (
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
                  ? { diaperKind: null, stoolCard: null }
                  : // 改成純小便時要一起清掉大便卡編號。否則之前選過的編號會留在
                    // 資料庫裡：UI 上跟著 showStool 一起消失，但紀錄頁仍印「尿 · 大便卡 3 ⚠」，
                    // 匯出給醫生的 CSV 也照樣帶著膽道閉鎖警示，而你沒有任何介面能清掉它。
                    { diaperKind: k, ...(k === 'pee' ? { stoolCard: null } : null) },
              )
            }
          />
        ))}
      </Section>

      {/* 這行提示必須在 showStool 【外面】。
          從首頁按「尿布」建立的紀錄 diaperKind 是 null，大便卡整區不會出現；
          如果連「要先選便」的說明也關在門後，使用者就永遠不會知道要點哪裡才展開。 */}
      {showStool ? null : (
        <Text style={[styles.note, { color: t.textMuted }]}>
          選「便」或「尿+便」會展開九色大便卡，可以記下大便顏色編號。
        </Text>
      )}

      {showStool ? (
        <View style={styles.stoolBlock}>
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
                // 還沒選中就要看得出這一組不一樣。原本「正常 7–9」和「需要注意 1–6」
                // 的 chip 完全同色，嚴重程度只有選中後才顯現 —— 這是膽道閉鎖的篩檢介面。
                borderTint={t.warn}
                selected={event.stoolCard === n}
                onPress={() => {
                  const clearing = event.stoolCard === n;
                  onPatch({ stoolCard: clearing ? null : n });
                  // 1–6 與「說不準」都要警示：官方指引把「介於之間」也算進去
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
  );
}

// ---------------------------------------------------------------------------

function SleepFields({ event, tint, onPatch }: Props) {
  const t = useTheme();
  return (
    <>
      {event.status === 'active' ? (
        <Text style={[styles.note, { color: t.textMuted }]}>還在睡。回首頁按「結束」才會算時長。</Text>
      ) : (
        <AmountPicker
          label="睡了多久"
          value={event.durationMin}
          presets={SLEEP_PRESETS}
          unit="分鐘"
          tint={tint}
          onChange={(v) => onPatch({ durationMin: v ?? null })}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function PumpFields({ event, tint, onPatch }: Props) {
  const t = useTheme();
  return (
    <>
      <AmountPicker
        label="擠出的量"
        value={event.amountMl}
        presets={PUMP_PRESETS}
        unit="ml"
        tint={tint}
        onChange={(v) => onPatch({ amountMl: v ?? null })}
      />
      <Text style={[styles.note, { color: t.textMuted }]}>這筆會加進母乳庫存。</Text>
    </>
  );
}

// ---------------------------------------------------------------------------

function GrowthFields({ event, onPatch }: { event: BabyEvent; onPatch: (p: EventPatch) => void }) {
  const t = useTheme();
  return (
    <>
      {/* 三個都可選填 —— 回診常常只量體重 */}
      <MeasureInput
        label="體重"
        unit="kg"
        decimals={2}
        /** 存公克，顯示公斤 */
        factor={1000}
        base={event.weightG}
        onChange={(v) => onPatch({ weightG: v })}
      />
      <MeasureInput
        label="身長"
        unit="cm"
        decimals={1}
        /** 存公釐，顯示公分 */
        factor={10}
        base={event.heightMm}
        onChange={(v) => onPatch({ heightMm: v })}
      />
      <MeasureInput
        label="頭圍"
        unit="cm"
        decimals={1}
        factor={10}
        base={event.headMm}
        onChange={(v) => onPatch({ headMm: v })}
      />
      <Text style={[styles.note, { color: t.textMuted }]}>
        內部用公克／公釐這種整數存，避免浮點數累積誤差。
      </Text>
    </>
  );
}

/**
 * 有小數的測量值輸入。
 * 顯示用人看的單位（kg / cm），存用整數的最小單位（g / mm）。
 */
function MeasureInput({
  label,
  unit,
  decimals,
  factor,
  base,
  onChange,
}: {
  label: string;
  unit: string;
  decimals: number;
  factor: number;
  base: number | null;
  onChange: (v: number | null) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState(base != null ? (base / factor).toFixed(decimals) : '');

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{label}</Text>
      <View style={styles.measureRow}>
        <TextInput
          value={draft}
          onChangeText={(text) => {
            // 只留數字和一個小數點
            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setDraft(cleaned);
            const n = Number.parseFloat(cleaned);
            onChange(Number.isFinite(n) ? Math.round(n * factor) : null);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={t.textMuted}
          style={[
            styles.measureInput,
            { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card },
          ]}
        />
        <Text style={[styles.measureUnit, { color: t.textMuted }]}>{unit}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

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
  stoolBlock: { gap: spacing.md },
  note: { fontSize: fontSize.xs, lineHeight: 18 },
  alertBox: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md },
  alertText: { fontSize: fontSize.xs, fontWeight: '600', lineHeight: 19 },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  measureInput: {
    minWidth: 130,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.lg,
    fontFamily: numFont.regular,
  },
  measureUnit: { fontSize: fontSize.sm },
});
