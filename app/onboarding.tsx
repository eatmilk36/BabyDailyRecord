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
import { sexLabel } from '../lib/labels';
import { DATE_INPUT_MAX_LENGTH, formatBabyAge, maskDateInput } from '../lib/time';
import { useT } from '../lib/useT';
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
  // ⚠️ 這一頁的三個元件都已經把主題物件命名為 t，所以翻譯函式一律叫 tr。
  //    順手寫成 const t = useT() 會把主題蓋掉，t.bg／t.text 全變成 undefined，整頁樣式炸掉。
  const tr = useT();
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
      // 內文是原始錯誤訊息，刻意不翻譯也不進字典 —— 那是要拿去查的技術字串，翻了反而對不上。
      Alert.alert(tr('onboard.createFailedTitle'), e instanceof Error ? e.message : String(e));
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
        // ⚠️ 換行是【字典值本身】帶的（Line1 尾一個、Line2 尾兩個、Line3 沒有），
        //    所以這裡維持一行一個 key 的 + 串接。改成 [...].join('\n') 會多出／少掉換行，
        //    Line2 後面那個空行也會消失。
        Alert.alert(
          tr('onboard.importNoBabiesTitle'),
          tr('onboard.importNoBabiesLine1', { n: result.babiesSkipped }) +
            tr('onboard.importNoBabiesLine2', { n: result.eventsAdded }) +
            tr('onboard.importNoBabiesLine3'),
        );
        return;
      }
      Alert.alert(
        tr('onboard.importDoneTitle'),
        tr('onboard.importDoneBabies', {
          added: result.babiesAdded,
          skipped: result.babiesSkipped,
        }) +
          tr('onboard.importDoneEvents', {
            added: result.eventsAdded,
            skipped: result.eventsSkipped,
          }),
        // 「好」用共用的 common.ok，不另外開 onboard.* 的 key —— 同一個字面在字典裡開兩份，
        // 改天只改到其中一份就會兩邊不一致。
        [{ text: tr('common.ok'), onPress: () => router.replace('/') }],
      );
    } catch (e) {
      Alert.alert(tr('onboard.importFailedTitle'), e instanceof Error ? e.message : String(e));
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
          <Text style={[styles.title, { color: t.text }]}>{tr('onboard.title')}</Text>
          {/* 原本是跨行縮排的 JSX 文字節點（React 會折成單一空白），換成 tr() 之後就是
              字典裡那個折疊好的單行值，畫面寬度不變。 */}
          <Text style={[styles.subtitle, { color: t.textMuted }]}>{tr('onboard.subtitle')}</Text>

          {/* Field 的 label／placeholder 是 props，所以在呼叫端翻好再傳進去，
              Field 自己不必知道 i18n 的存在。 */}
          <Field
            label={tr('onboard.babyOneLabel')}
            value={nameA}
            onChange={setNameA}
            placeholder={tr('onboard.babyOnePlaceholder')}
          />
          <SexPicker value={sexA} onChange={setSexA} />

          <Field
            label={tr('onboard.babyTwoLabel')}
            value={nameB}
            onChange={setNameB}
            placeholder={tr('onboard.babyTwoPlaceholder')}
          />
          <SexPicker value={sexB} onChange={setSexB} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('onboard.birthLabel')}</Text>
            <TextInput
              value={birth}
              // 只吃數字，`-` 自動補。打 20260624 就會變成 2026-06-24
              onChangeText={(text) => setBirth(maskDateInput(text))}
              // placeholder 的括號講的就是上面這行遮罩的行為，兩本字典都要保住「只要打數字」
              // 這句 —— 少了它，使用者會在數字鍵盤上找不存在的「-」鍵。
              placeholder={tr('onboard.birthPlaceholder')}
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
                {/* formatBabyAge() 自己已經走 time.ageDays／ageMonth／ageMonthDay，
                    所以 onboard.ageConfirm 只包外面那句反問，年齡直接當 {age} 內插進去。 */}
                {!birthValid
                  ? tr('onboard.birthFormatHint')
                  : !notFuture
                    ? tr('onboard.birthFuture')
                    : tr('onboard.ageConfirm', { age: formatBabyAge(birth) })}
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <SlimButton
              label={saving ? tr('onboard.creating') : tr('onboard.start')}
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
                ? tr('onboard.needNames')
                : tr('onboard.needBirth')}
            </Text>
          ) : null}

          <View style={styles.importBlock}>
            {/* 同樣是原本跨行縮排的文字節點，「重新建立 ——」與「不然」之間那個空白是
                React 折出來的，字典值已經是折疊後的單行。 */}
            <Text style={[styles.hint, { color: t.textMuted }]}>{tr('onboard.importHint')}</Text>
            <View style={styles.actions}>
              <SlimButton
                label={importing ? tr('onboard.importing') : tr('onboard.importButton')}
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
  // ⚠️ 這裡的 t 也是主題，翻譯函式同樣叫 tr（見 Onboarding 的說明）。
  const tr = useT();
  return (
    <View style={styles.sexRow}>
      <Text style={[styles.label, { color: t.textMuted }]}>{tr('onboard.sexLabel')}</Text>
      <View style={styles.sexChips}>
        {/* 選項文字走 sexLabel()，字典裡已經是 sex.boy／sex.girl，不要在 onboard.* 再開一份 */}
        {(['boy', 'girl'] as const).map((s) => (
          <Chip
            key={s}
            label={sexLabel(s)}
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
