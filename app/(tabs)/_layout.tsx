import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { fontSize } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 底部三個 tab。放在底部是為了拇指可及——單手抱寶寶時你只有一根拇指能動。
 * 圖示用 emoji 而不是圖示字型：不用多裝套件，而且跟溫馨風格一致。
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
          height: 64,
          paddingBottom: 8,
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
