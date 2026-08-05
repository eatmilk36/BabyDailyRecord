import { isValid, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlimButton } from '../components/SlimButton';
import { createBabies } from '../db/queries';
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
  const [birth, setBirth] = useState('');
  const [saving, setSaving] = useState(false);

  const birthValid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && isValid(parseISO(birth));
  const notFuture = birthValid && parseISO(birth).getTime() <= Date.now();
  const canSave = nameA.trim().length > 0 && nameB.trim().length > 0 && birthValid && notFuture;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await createBabies([
        { name: nameA.trim(), birthDate: birth },
        { name: nameB.trim(), birthDate: birth },
      ]);
      router.replace('/');
    } finally {
      setSaving(false);
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
          <Field label="第二個寶寶" value={nameB} onChange={setNameB} placeholder="例如：小兔" />

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  actions: { marginTop: spacing.md, flexDirection: 'row' },
});
