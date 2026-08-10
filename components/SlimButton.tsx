import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  tint?: string;
  /** 實色填滿（用在「結束」這種需要一眼看到的動作） */
  filled?: boolean;
  /**
   * 外框式按鈕的文字色。預設 t.text（永遠讀得清楚）。
   *
   * ⚠️ 不要為了「顏色一致」而傳 tint 進來。tint 通常是寶寶的 base 色，
   * 疊在卡片的 soft 底上實測只有 1.7～1.9:1 —— 14px 粗體需要 4.5:1，
   * 白天根本看不見按鈕上寫什麼。
   * 需要保留寶寶的顏色識別時請傳 baby[key].on，那個在深淺兩個主題下都有 8:1 以上。
   */
  labelColor?: string;
  disabled?: boolean;
};

/** 次要動作按鈕：開始親餵、兩個都餵了、結束計時。 */
export function SlimButton({ label, onPress, tint, filled, labelColor, disabled }: Props) {
  const t = useTheme();
  const accent = tint ?? t.primary;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: accent,
          backgroundColor: filled ? accent : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}
    >
      {/* 外框式的文字【不能】用 accent —— 見 labelColor 的註解。
          邊框仍然用 accent，顏色編碼靠邊框保留，可讀性靠文字色。 */}
      <Text style={[styles.label, { color: filled ? t.inkOnAction : (labelColor ?? t.text) }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  label: { fontSize: fontSize.sm, fontWeight: '700', textAlign: 'center' },
});
