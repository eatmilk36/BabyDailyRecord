import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { numFont } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { Chip } from './Chip';

type Props = {
  label: string;
  value?: number | null;
  presets: readonly number[];
  unit: string;
  tint?: string;
  onChange: (v: number | undefined) => void;
};

/**
 * 數字快選（ml 或親餵分鐘數）。
 *
 * 刻意不預設叫出鍵盤——半夜單手抱寶寶打字是災難。
 * 快選按鈕蓋掉九成情況，剩下的才用「自訂」展開輸入框。
 * 再按一次已選中的按鈕會取消（因為所有細節欄位都是可選的）。
 */
export function AmountPicker({ label, value, presets, unit, tint, onChange }: Props) {
  const t = useTheme();
  const isPreset = value != null && presets.includes(value);
  const [showCustom, setShowCustom] = useState(value != null && !isPreset);
  const [draft, setDraft] = useState(value != null && !isPreset ? String(value) : '');

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        {presets.map((p) => (
          <Chip
            key={p}
            label={`${p}`}
            tint={tint}
            selected={value === p}
            onPress={() => {
              setShowCustom(false);
              onChange(value === p ? undefined : p);
            }}
          />
        ))}
        <Chip
          label="自訂"
          tint={tint}
          selected={showCustom}
          onPress={() => {
            const next = !showCustom;
            setShowCustom(next);
            if (!next) onChange(undefined);
          }}
        />
      </View>

      {showCustom ? (
        <View style={styles.customRow}>
          <TextInput
            value={draft}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, '');
              setDraft(digits);
              onChange(digits ? Number(digits) : undefined);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card },
            ]}
          />
          <Text style={[styles.unit, { color: t.textMuted }]}>{unit}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.xs, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    minWidth: 110,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.lg,
    fontFamily: numFont.regular,
  },
  unit: { fontSize: fontSize.sm },
});
