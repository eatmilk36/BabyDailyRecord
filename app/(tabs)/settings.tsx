import { isValid, parseISO } from 'date-fns';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlimButton } from '../../components/SlimButton';
import { updateBaby, useBabies } from '../../db/queries';
import type { Baby } from '../../db/schema';
import { exportCsv, exportJson } from '../../lib/export';
import { importJson } from '../../lib/import';
import { formatBabyAge } from '../../lib/time';
import { fontSize, radius, spacing } from '../../theme/colors';
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <Section title="關於">
          <Text style={[styles.note, { color: t.textMuted }]}>
            寶寶日誌 v1{'\n'}
            親餵計時器的「超時提醒」目前只在打開 APP 時顯示橫幅。
            鎖屏也會推播的通知版留在第二階段——那需要處理 Android 的通知權限
            與各家手機的省電機制。
          </Text>
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
        onChangeText={setBirth}
        onEndEditing={() => {
          if (birthValid && birth !== baby.birthDate) updateBaby(baby.id, { birthDate: birth });
          else if (!birthValid) setBirth(baby.birthDate);
        }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={t.textMuted}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />
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

  babyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  babyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  babyAge: { fontSize: fontSize.xs, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
});
