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
  disabled?: boolean;
};

/** 次要動作按鈕：開始親餵、兩個都餵了、結束計時。 */
export function SlimButton({ label, onPress, tint, filled, disabled }: Props) {
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
      <Text style={[styles.label, { color: filled ? t.inkOnAction : accent }]}>{label}</Text>
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
