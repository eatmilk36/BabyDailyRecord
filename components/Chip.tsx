import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** 選中時的強調色，預設用主色 */
  tint?: string;
  /** 左邊的小色塊（大便卡顏色用） */
  swatch?: string;
};

/**
 * 可點的標籤。所有細節欄位都用這個，沒有鍵盤輸入。
 *
 * 選中樣式刻意做成「外框 + 20% 底色」而不是實色填滿：
 * 因為 tint 會是各種深淺的顏色（大便卡有白色也有黑色），
 * 實色填滿就得為每個顏色算對比的文字色，外框式則在深淺兩種主題下都讀得清楚。
 */
export function Chip({ label, selected, onPress, tint, swatch }: Props) {
  const t = useTheme();
  const accent = tint ?? t.primary;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: selected ? accent : t.cardBorder,
          borderWidth: selected ? 2 : 1,
          // hex + '33' = 20% 透明度，RN 支援 8 碼 hex
          backgroundColor: selected ? `${accent}33` : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {swatch ? (
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: t.cardBorder }]} />
      ) : null}
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minHeight: 40,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
