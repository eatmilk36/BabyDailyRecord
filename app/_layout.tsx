import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { db } from '../db/client';
import migrations from '../drizzle/migrations';
import { fontSize, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

/**
 * 根佈局。APP 啟動時做三件事，全部完成才顯示畫面：
 *   1. 套用資料庫 migration（等同 EF Core 的 Database.Migrate()）
 *   2. 載入數字字型
 *   3. 設定導航結構
 *
 * 補充/編輯畫面用 presentation: 'modal'——這是 expo-router 內建的原生底部彈出，
 * 所以我們不需要裝任何 bottom-sheet 套件。
 */
export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  if (error) return <Splash message={`資料庫錯誤：${error.message}`} isError />;
  if (!success || !fontsLoaded) return <Splash message="準備中…" />;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="event/[id]"
          options={{ presentation: 'modal', headerShown: true, title: '紀錄細節' }}
        />
        <Stack.Screen
          name="session/[sessionId]"
          options={{ presentation: 'modal', headerShown: true, title: '兩寶紀錄' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

function Splash({ message, isError }: { message: string; isError?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: t.bg }]}>
      {!isError ? <ActivityIndicator color={t.primary} /> : null}
      <Text style={[styles.splashText, { color: isError ? t.warn : t.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  splashText: { fontSize: fontSize.sm, textAlign: 'center' },
});
