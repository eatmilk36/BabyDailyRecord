import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../lib/useT';
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
  const tr = useT();
  const isPreset = value != null && presets.includes(value);
  /** 有值、但不是任何一個快選按鈕的數字 → 一定要把輸入框打開才看得到它 */
  const hasCustomValue = value != null && !isPreset;

  /**
   * ⚠️ showCustom 與 draft 原本都是 useState 【只初始化一次】。
   *
   * 於是雙寶連動把 amountMl=135 傳進另一張卡時，那張卡的 showCustom 仍然是
   * 掛載當時算出來的 false —— 結果是：沒有 chip 被選中、沒有輸入框、
   * 【135 完全不存在於畫面上】。使用者會以為沒有連動成功而手動再填一次，
   * 把正確的值蓋掉。畫面在說謊，而且說的是會導致資料錯誤的謊。
   *
   * 現在 showCustom 由 props 推導（manualOpen 只是「使用者主動展開」的疊加），
   * draft 也跟著外部的 value 走。
   */
  const [manualOpen, setManualOpen] = useState(false);
  const showCustom = manualOpen || hasCustomValue;
  const [draft, setDraft] = useState(hasCustomValue ? String(value) : '');

  useEffect(() => {
    // 自己打字時 value 會等於剛打的數字，setDraft 是 no-op；
    // 只有【外部】改動（連動、或從紀錄頁開啟既有紀錄）才會真的更新。
    setDraft(value == null ? '' : String(value));
  }, [value]);

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
              setManualOpen(false);
              onChange(value === p ? undefined : p);
            }}
          />
        ))}
        <Chip
          label={tr('field.custom')}
          tint={tint}
          selected={showCustom}
          onPress={() => {
            if (showCustom) {
              setManualOpen(false);
              onChange(undefined);
            } else {
              setManualOpen(true);
            }
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
