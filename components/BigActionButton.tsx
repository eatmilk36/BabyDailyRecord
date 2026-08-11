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
   * 左側粗色條 = 這顆按鈕屬於哪一個寶寶。
   *
   * 這是「大按鈕要不要各自染色」那個取捨的解法：不用二選一。
   * 填色仍然代表【動作】（兩張卡上的「喝奶」同色，動作編碼完整保留），
   * 左側色條代表【是誰】—— 兩個訊號疊在同一顆按鈕上，互不衝突。
   *
   * ⚠️ 第一版用 3px 的【整圈外框】，實機驗證發現看不出來：
   * 蜜桃色 #E8A87C 跟喝奶填色 #E9C07A 太接近，薄荷色在奶油底上也讀不出來。
   * 改成左側 8px 的實色條 —— 跟卡片、紀錄列、摘要卡、彈窗用同一套語言，
   * 而且色條夠寬、邊界夠硬，不依賴前後景的色相差。
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
          borderLeftColor: borderColor ?? color,
          borderLeftWidth: borderColor ? 8 : 0,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emoji: { fontSize: 26 },
  label: { fontSize: fontSize.md, fontWeight: '800' },
});
