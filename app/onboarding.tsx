import { isValid, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { SlimButton } from '../components/SlimButton';
import { createBabies } from '../db/queries';
import type { Baby } from '../db/schema';
import { importJson } from '../lib/import';
import { SEX_LABEL } from '../lib/labels';
import { DATE_INPUT_MAX_LENGTH, formatBabyAge, maskDateInput } from '../lib/time';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

/**
 * 第一次開啟：建立兩個寶寶。
 *
 * 生日刻意只輸入一次套用到兩個寶寶（雙胞胎同一天出生），少打一次字。
 * 之後在設定頁可以分別修改。
 *
 * 為什麼不用日期選擇器？那需要額外的原生模組，而這個畫面一輩子只用一次。
 * 改成一邊打字一邊即時顯示「出生 42 天」讓你自己驗證有沒有打錯——
 * 這比日期選擇器更能防止真正的錯誤（選錯年份而不自知）。
 */
export default function Onboarding() {
  const t = useTheme();
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [sexA, setSexA] = useState<Baby['sex']>(null);
  const [sexB, setSexB] = useState<Baby['sex']>(null);
  const [birth, setBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const birthValid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && isValid(parseISO(birth));
  const notFuture = birthValid && parseISO(birth).getTime() <= Date.now();
  const canSave = nameA.trim().length > 0 && nameB.trim().length > 0 && birthValid && notFuture;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await createBabies([
        { name: nameA.trim(), birthDate: birth, sex: sexA },
        { name: nameB.trim(), birthDate: birth, sex: sexB },
      ]);
      router.replace('/');
    } catch (e) {
      // 沒有 catch 的話：按鈕從「建立中…」變回「開始使用」、不導航、不提示，
      // 而 index.tsx 會因為 babies 仍為空一直把你踢回這一頁 —— 整個 APP 進不去。
      Alert.alert('建立失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  /**
   * 搬家／換手機的入口。
   *
   * 為什麼一定要放在這一頁：這個畫面是「babies 為空」時的唯一出口
   * （index.tsx 會 Redirect 過來）。原本沒有匯入入口，所以帶著備份來的人
   * 只能先手動建兩個寶寶，匯入之後就變成【4 個寶寶】—— 而且多出來的那兩個
   * 沒有任何介面可以刪掉。
   *
   * Expo Go 的沙箱跟未來獨立 APK 不是同一個，所以這條路是一定會走到的。
   */
  async function handleImport() {
    if (importing || saving) return;
    setImporting(true);
    try {
      const result = await importJson();
      if (!result) return; // 使用者取消選檔
      if (result.babiesAdded === 0) {
        Alert.alert(
          '匯入完成，但沒有加入寶寶',
          `這份備份裡的寶寶都已經存在（跳過 ${result.babiesSkipped} 筆）。\n` +
            `紀錄新增 ${result.eventsAdded} 筆。\n\n` +
            '如果這不是你預期的結果，請確認選到的是正確的備份檔。',
        );
        return;
      }
      Alert.alert(
        '匯入完成',
        `寶寶：新增 ${result.babiesAdded}、跳過 ${result.babiesSkipped}\n` +
          `紀錄：新增 ${result.eventsAdded}、跳過 ${result.eventsSkipped}`,
        [{ text: '好', onPress: () => router.replace('/') }],
      );
    } catch (e) {
      Alert.alert('匯入失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: t.text }]}>歡迎</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            先告訴我兩個寶寶的名字，之後在設定裡都可以改。
          </Text>

          <Field label="第一個寶寶" value={nameA} onChange={setNameA} placeholder="例如：小熊" />
          <SexPicker value={sexA} onChange={setSexA} />

          <Field label="第二個寶寶" value={nameB} onChange={setNameB} placeholder="例如：小兔" />
          <SexPicker value={sexB} onChange={setSexB} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textMuted }]}>出生日期（兩個寶寶共用）</Text>
            <TextInput
              value={birth}
              // 只吃數字，`-` 自動補。打 20260624 就會變成 2026-06-24
              onChangeText={(text) => setBirth(maskDateInput(text))}
              placeholder="YYYYMMDD（直接打數字）"
              placeholderTextColor={t.textMuted}
              keyboardType="number-pad"
              maxLength={DATE_INPUT_MAX_LENGTH}
              autoCapitalize="none"
              style={[
                styles.input,
                { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card },
              ]}
            />
            {birth.length > 0 ? (
              <Text
                style={[
                  styles.hint,
                  { color: birthValid && notFuture ? t.textMuted : t.warn },
                ]}
              >
                {!birthValid
                  ? '格式要像 2026-06-24'
                  : !notFuture
                    ? '出生日期不能在未來'
                    : `${formatBabyAge(birth)} — 對嗎？`}
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <SlimButton
              label={saving ? '建立中…' : '開始使用'}
              onPress={handleSave}
              disabled={!canSave || saving}
              filled
            />
          </View>

          {/* 停用時要說缺什麼。原本按鈕 disabled 卻不解釋，第一次用的人
              只會反覆戳一顆沒反應的按鈕。 */}
          {!canSave ? (
            <Text style={[styles.hint, { color: t.textMuted }]}>
              {nameA.trim().length === 0 || nameB.trim().length === 0
                ? '兩個寶寶的名字都要填。'
                : '出生日期還沒填好。'}
            </Text>
          ) : null}

          <View style={styles.importBlock}>
            <Text style={[styles.hint, { color: t.textMuted }]}>
              換手機或從 Expo Go 搬到獨立 APP？先匯入備份，不要在這裡重新建立 ——
              不然匯入之後會變成 4 個寶寶，而多出來的兩個沒辦法刪。
            </Text>
            <View style={styles.actions}>
              <SlimButton
                label={importing ? '匯入中…' : '我有備份要匯入'}
                onPress={handleImport}
                disabled={importing || saving}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * 性別（選填）。
 * 現在只是記錄，但之後做生長曲線時是必要的 —— WHO 的百分位表是分性別的。
 * 再點一次已選的選項可以取消。
 */
function SexPicker({
  value,
  onChange,
}: {
  value: Baby['sex'];
  onChange: (v: Baby['sex']) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.sexRow}>
      <Text style={[styles.label, { color: t.textMuted }]}>性別（選填）</Text>
      <View style={styles.sexChips}>
        {(['boy', 'girl'] as const).map((s) => (
          <Chip
            key={s}
            label={SEX_LABEL[s]}
            selected={value === s}
            onPress={() => onChange(value === s ? null : s)}
          />
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize.hero, fontWeight: '800' },
  subtitle: { fontSize: fontSize.sm, lineHeight: 22 },
  field: { gap: spacing.sm },
  label: { fontSize: fontSize.xs, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  hint: { fontSize: fontSize.xs },
  sexRow: { gap: spacing.sm, marginTop: -spacing.sm },
  sexChips: { flexDirection: 'row', gap: spacing.sm },
  actions: { marginTop: spacing.md, flexDirection: 'row' },
  importBlock: { marginTop: spacing.xl, gap: spacing.xs },
});
