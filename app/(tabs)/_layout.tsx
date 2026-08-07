import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { fontSize } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 底部三個 tab。放在底部是為了拇指可及——單手抱寶寶時你只有一根拇指能動。
 * 圖示用 emoji 而不是圖示字型：不用多裝套件，而且跟溫馨風格一致。
 *
 * ⚠️ 這裡刻意【只設顏色，不設高度與內距】。
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
 */
export default function TabsLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.cardBorder,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '首頁', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: '紀錄', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📖</Text> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
      />
    </Tabs>
  );
}
