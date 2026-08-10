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
  const t = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  if (error) return <Splash message={`資料庫錯誤：${error.message}`} isError />;
  if (!success || !fontsLoaded) return <Splash message="準備中…" />;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/*
        ⚠️ header 與畫面底色一定要顯式走 theme。
        React Navigation 的原生 header 用的是【它自己的】主題，而這個專案沒有掛
        它的 ThemeProvider —— 所以它永遠當成淺色模式：深色模式下兩個彈窗
        （紀錄細節、兩寶紀錄）的 header 會是【純白色】，配上白色的返回箭頭與標題，
        半夜開起來是一整條刺眼的白，而深色模式在這個 APP 是功能需求不是偏好
        （開燈會吵醒兩個寶寶）。

        直接設 headerStyle / headerTintColor 而不是去掛 ThemeProvider：
        改動範圍小，而且跟這個專案其他地方「顏色一律顯式從 theme 取」的寫法一致。
        contentStyle 也要設，否則轉場動畫期間會閃一下白底。
      */}
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          headerTitleStyle: { color: t.text, fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
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
