import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, TAB_BAR_HEIGHT } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 底部三個 tab。放在底部是為了拇指可及——單手抱寶寶時你只有一根拇指能動。
 * 圖示用 emoji 而不是圖示字型：不用多裝套件，而且跟溫馨風格一致。
 *
 * ⚠️ 高度必須加上 insets.bottom：Android 的手勢導覽列會疊在畫面最底部，
 * 寫死高度的話 tab 文字會被那條白色手勢條蓋住（實機截圖抓到的）。
 */
export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.cardBorder,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
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
