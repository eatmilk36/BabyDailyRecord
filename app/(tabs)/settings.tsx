import { isValid, parseISO } from 'date-fns';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { SlimButton } from '../../components/SlimButton';
import { NURSING_OVERDUE_MIN, updateBaby, useBabies } from '../../db/queries';
import { BUILD_NOTES, BUILD_TAG } from '../../lib/build';
import { ensureNotificationPermission } from '../../lib/notifications';
import type { Baby } from '../../db/schema';
import { exportCsv, exportJson } from '../../lib/export';
import { importJson } from '../../lib/import';
import { SEX_LABEL } from '../../lib/labels';
import { DATE_INPUT_MAX_LENGTH, formatBabyAge, maskDateInput } from '../../lib/time';
import { fontSize, radius, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 設定頁：寶寶資料 + 備份。
 *
 * 備份區塊在這個 APP 不是可選功能。單機版沒有雲端，而且 Expo Go 的資料沙箱
 * 跟未來的正式 APK 不是同一個——所以「匯出/匯入」就是你唯一的搬家與保命通道。
 */
export default function Settings() {
  const t = useTheme();
  const { babies } = useBabies();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      Alert.alert('失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    await run('匯入', async () => {
      const result = await importJson();
      if (!result) return; // 使用者取消
      Alert.alert(
        '匯入完成',
        [
          `寶寶：新增 ${result.babiesAdded}、跳過 ${result.babiesSkipped}`,
          `紀錄：新增 ${result.eventsAdded}、跳過 ${result.eventsSkipped}`,
          '',
          '已存在的 id 一律跳過，不會覆蓋現有資料。',
        ].join('\n'),
      );
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* 下緣留白要含 tab bar 高度 + safe-area。這頁是唯一漏掉的，
          結果頁尾的「測試通知權限」按鈕和「關於」文字被不透明的 tab bar 永久蓋住，
          而且已經捲到底沒辦法再往上捲。 */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: t.text }]}>設定</Text>

        <Section title="寶寶">
          {babies.map((baby) => (
            <BabyEditor key={baby.id} baby={baby} />
          ))}
        </Section>

        <Section title="備份">
          <Text style={[styles.note, { color: t.textMuted }]}>
            這個版本資料只存在這台手機。建議每週匯出一次 JSON 丟到雲端硬碟。
            {'\n\n'}
            另外：現在資料存在 Expo Go 的沙箱裡。之後如果把 APP 裝成獨立的 APK，
            要先在這裡匯出 JSON、再到新 APP 匯入，資料才會跟著搬過去。
          </Text>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === '匯出JSON' ? '處理中…' : '匯出 JSON 備份'}
              tint={t.primary}
              filled
              disabled={!!busy}
              onPress={() => run('匯出JSON', exportJson)}
            />
          </View>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === '匯出CSV' ? '處理中…' : '匯出 CSV（給醫生看）'}
              tint={t.primary}
              disabled={!!busy}
              onPress={() => run('匯出CSV', exportCsv)}
            />
          </View>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === '匯入' ? '處理中…' : '從 JSON 匯入'}
              tint={t.diaper}
              disabled={!!busy}
              onPress={handleImport}
            />
          </View>
        </Section>

        <Section title="通知">
          <Text style={[styles.note, { color: t.textMuted }]}>
            開始親餵時會排一則 {NURSING_OVERDUE_MIN} 分鐘後的「還在餵嗎？」提醒，按結束就會取消。
            這是手機自己排的本地通知，不需要網路也不經過任何伺服器。
            {'\n\n'}
            第一次開始親餵時會請求通知權限。拒絕也沒關係，記錄完全不受影響，
            只是少了鎖屏提醒、仍然會在 APP 內顯示警示橫幅。
            {'\n\n'}
            ⚠️ 小米／華為／OPPO 等系統的省電機制可能延遲或吃掉通知。
            若提醒沒出現，去系統設定把「寶寶日誌」（Expo Go）排除在電池最佳化之外。
          </Text>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === '通知' ? '處理中…' : '測試通知權限'}
              tint={t.primary}
              disabled={!!busy}
              onPress={() =>
                run('通知', async () => {
                  const ok = await ensureNotificationPermission();
                  Alert.alert(
                    ok ? '通知權限正常' : '沒有通知權限',
                    ok
                      ? '超時提醒會正常運作。'
                      : '你之前拒絕過通知權限，要到系統設定裡手動開啟。記錄功能不受影響。',
                  );
                })
              }
            />
          </View>
        </Section>

        <Section title="關於">
          <Text style={[styles.note, { color: t.textMuted }]}>
            寶寶日誌 v1{'\n'}
            資料只存在這台手機。兩人共用同一份紀錄需要一個同步伺服器，尚未實作。
          </Text>

          {/* 版本標記。Expo Go 不會自己更新 bundle，所以「我看到的是新版還是舊版」
              沒辦法從畫面猜。這一行就是答案。 */}
          <View style={[styles.buildBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.buildTag, { color: t.text }]}>版本 {BUILD_TAG}</Text>
            <Text style={[styles.note, { color: t.textMuted }]}>
              這一版應該有：
              {'\n'}
              {BUILD_NOTES.map((n) => `· ${n}`).join('\n')}
              {'\n\n'}
              對不上就是 Expo Go 還在跑舊的 JS：搖手機叫出開發者選單按 Reload，
              或強制關閉 Expo Go 後重新輸入網址載入。
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function BabyEditor({ baby }: { baby: Baby }) {
  const t = useTheme();
  const tone = t.baby[baby.colorKey];
  const [name, setName] = useState(baby.name);
  const [birth, setBirth] = useState(baby.birthDate);

  const birthValid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && isValid(parseISO(birth));

  return (
    <View style={[styles.babyCard, { backgroundColor: tone.soft, borderColor: t.cardBorder }]}>
      <View style={styles.babyHeader}>
        <View style={[styles.dot, { backgroundColor: tone.base }]} />
        <Text style={[styles.babyAge, { color: t.textMuted }]}>
          {birthValid ? formatBabyAge(birth) : '生日格式不正確'}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== baby.name) updateBaby(baby.id, { name: trimmed });
          else setName(baby.name);
        }}
        placeholder="名字"
        placeholderTextColor={t.textMuted}
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />
      <TextInput
        value={birth}
        onChangeText={(text) => setBirth(maskDateInput(text))}
        onEndEditing={() => {
          if (birthValid && birth !== baby.birthDate) updateBaby(baby.id, { birthDate: birth });
          else if (!birthValid) setBirth(baby.birthDate);
        }}
        placeholder="YYYYMMDD（直接打數字）"
        placeholderTextColor={t.textMuted}
        keyboardType="number-pad"
        maxLength={DATE_INPUT_MAX_LENGTH}
        autoCapitalize="none"
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />

      {/* 性別（選填）。之後做生長曲線時是必要的 —— WHO 百分位表是分性別的 */}
      <View style={styles.sexChips}>
        {(['boy', 'girl'] as const).map((s) => (
          <Chip
            key={s}
            label={SEX_LABEL[s]}
            tint={tone.base}
            selected={baby.sex === s}
            onPress={() => updateBaby(baby.id, { sex: baby.sex === s ? null : s })}
          />
        ))}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontSize: fontSize.xl, fontWeight: '800' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800' },
  note: { fontSize: fontSize.xs, lineHeight: 19 },
  buttonRow: { flexDirection: 'row' },
  buildBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  buildTag: { fontSize: fontSize.sm, fontWeight: '800' },

  babyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  babyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  babyAge: { fontSize: fontSize.xs, fontWeight: '600' },
  sexChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
});
