import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

type Props = {
  emoji: string;
  label: string;
  /** 動作色（喝奶 = 奶油琥珀 / 尿布 = 水藍） */
  color: string;
  /**
   * 外框色 = 這顆按鈕屬於哪一個寶寶。
   *
   * 這是「大按鈕要不要各自染色」那個取捨的解法：不用二選一。
   * 填色仍然代表【動作】（兩張卡上的「喝奶」同色，所以動作編碼完整保留），
   * 外框代表【是誰】—— 兩個訊號疊在同一顆按鈕上，互不衝突。
   *
   * 起因：半夜看的是最大的元素（大按鈕），而它原本完全沒有寶寶資訊。
   */
  borderColor?: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * 主動作按鈕。
 *
 * 尺寸刻意做大（最小高度 76）：使用情境是半夜單手抱著寶寶、螢幕最暗、手在抖。
 * 觸覺回饋是必要的，不是裝飾——暗光下你需要知道「我按到了」，否則會重複按。
 *
 * 按下去的瞬間就已經寫進資料庫了，補充彈窗才浮出來。
 */
export function BigActionButton({
  emoji,
  label,
  color,
  borderColor,
  onPress,
  disabled,
}: Props) {
  const t = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: color,
          borderColor: borderColor ?? color,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View>
        <Text style={[styles.label, { color: t.inkOnAction }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emoji: { fontSize: 26 },
  label: { fontSize: fontSize.md, fontWeight: '800' },
});
