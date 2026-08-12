import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useT } from '../../lib/useT';
import { fontSize, radius, spacing, TAB_ACTIVE_TINT } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 底部四個 tab。放在底部是為了拇指可及——單手抱寶寶時你只有一根拇指能動。
 * 圖示用 emoji 而不是圖示字型：不用多裝套件，而且跟溫馨風格一致。
 *
 * ⚠️ 這裡刻意【不設高度與內距】。
 *
 * 踩過的坑：原本為了避免 tab 文字被 Android 手勢導覽列蓋住，我手動寫了
 *   height: 64 + insets.bottom
 *   paddingBottom: 8 + insets.bottom
 * 但 @react-navigation/bottom-tabs 本來就會自己套用底部 safe-area inset。
 * 手動再加一次等於【重複計算】：整條 bar 被撐高、可點擊區域跟看得到的
 * 圖示錯位，實機上就變成「看得到 tab 但點了沒反應」。
 *
 * 交給它自己算，兩個問題（被切掉、點不到）就都不會發生。
 * 各畫面 ScrollView 的下緣留白仍用 theme 的 TAB_BAR_HEIGHT 當估值——
 * 那只是空白，估多了無害。
 *
 * ⚠️ 為什麼不能只靠 tabBarActiveTintColor：
 * 圖示是 emoji，而 emoji【不吃 tintColor】——它永遠是全彩的。
 * 所以選中與沒選中唯一的差別只剩那行 12px 標籤的顏色，實機上幾乎看不出來。
 * 這裡改用三個同時生效的訊號：
 *   1. 選中的那一格【整格上淡底色】（tabBarActiveBackgroundColor）
 *   2. emoji 選中時放大、沒選中時降透明度（用 tabBarIcon 的 focused）
 *   3. 標籤選中時加粗
 * 三個都不涉及尺寸覆寫，所以不會重蹈上面那個坑。
 */

/** 產生一個 tab 的 options。四個 tab 的差異只有 emoji 和標題。 */
function tabOptions(emoji: string, title: string) {
  return {
    title,
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <Text style={focused ? styles.iconOn : styles.iconOff}>{emoji}</Text>
    ),
    tabBarLabel: ({ focused, color, children }: { focused: boolean; color: string; children: string }) => (
      <Text style={[focused ? styles.labelOn : styles.labelOff, { color }]}>{children}</Text>
    ),
  };
}

export default function TabsLayout() {
  const t = useTheme();
  const tr = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        // 選中整格上淡底色。這是分辨選中與否最強的訊號，
        // 因為它不依賴顏色對比也不依賴字級——是一整塊面積。
        // 這兩個值都【不能】隨主題變——原因見 theme/colors.ts 的 TAB_ACTIVE_TINT 註解。
        // 簡單說：它們套在會被記憶化的 tab item 上，用主題色會在切換深／淺色後殘留舊色。
        tabBarActiveBackgroundColor: TAB_ACTIVE_TINT,
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.cardBorder,
        },
        // 只設圓角、裁切與左右留白，【不動高度與上下內距】——
        // 這三個都不影響垂直版面計算，所以不會重蹈「看得到卻點不到」那個坑。
        //
        // overflow: 'hidden' 是必要的，不是保險：
        // BottomTabItem 把 activeBackgroundColor 套在【內層】pressable 上，
        // 而內層用的是它自己算的 borderRadius（非 material variant 時是 0）。
        // 外層 View 預設 overflow: 'visible'，所以只設 borderRadius 的話
        // 色塊仍然是方的、圓角完全看不出來。要外層裁切才會變成圓角。
        //
        // 左右留白只加水平方向：加垂直方向會縮小可點擊高度。
        tabBarItemStyle: {
          borderRadius: radius.md,
          overflow: 'hidden',
          marginHorizontal: spacing.xs,
        },
      }}
    >
      <Tabs.Screen name="index" options={tabOptions('🏠', tr('tab.home'))} />
      <Tabs.Screen name="history" options={tabOptions('📖', tr('tab.history'))} />
      <Tabs.Screen name="stats" options={tabOptions('📊', tr('tab.stats'))} />
      <Tabs.Screen name="settings" options={tabOptions('⚙️', tr('tab.settings'))} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // emoji 不吃顏色，所以用「大小 + 透明度」來表達選中狀態
  iconOn: { fontSize: 22 },
  iconOff: { fontSize: 19, opacity: 0.45 },
  labelOn: { fontSize: fontSize.xs, fontWeight: '800' },
  labelOff: { fontSize: fontSize.xs, fontWeight: '600', opacity: 0.8 },
});
