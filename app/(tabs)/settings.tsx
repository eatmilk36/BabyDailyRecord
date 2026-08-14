import { isValid, parseISO } from 'date-fns';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { SlimButton } from '../../components/SlimButton';
import { NURSING_OVERDUE_MIN, updateBaby, useBabies } from '../../db/queries';
import { BUILD_NOTES, BUILD_TAG } from '../../lib/build';
import { sendTestNotification, TEST_NOTIFICATION_DELAY_SEC } from '../../lib/notifications';
import type { Baby } from '../../db/schema';
import { exportCsv, exportJson } from '../../lib/export';
import { importJson } from '../../lib/import';
import { sexLabel } from '../../lib/labels';
import { DATE_INPUT_MAX_LENGTH, formatBabyAge, maskDateInput } from '../../lib/time';
import { LANGS, type I18nKey } from '../../lib/i18n';
import { useT } from '../../lib/useT';
import { useSettings, type ThemeMode } from '../../lib/settings';
import { fontSize, radius, SKINS, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';

/**
 * 深淺模式的三個選項。
 *
 * ⚠️ 存的是【字典 key】不是中文字面值 —— 模組層級的常數在檔案第一次被 import
 * 時就求值完畢，當下語言的字會被永久烘死在陣列裡，之後切語言這三張 Chip
 * 不會跟著變。字面值留在字典，渲染當下才 tr(m.labelKey)。（SKINS 同理。）
 */
const THEME_MODES: { key: ThemeMode; labelKey: I18nKey }[] = [
  { key: 'auto', labelKey: 'mode.auto' },
  { key: 'light', labelKey: 'mode.light' },
  { key: 'dark', labelKey: 'mode.dark' },
];
import { useTheme } from '../../theme/useTheme';

/**
 * busy 用的內部識別碼。
 *
 * ⚠️ 這裡放的是【狀態值】不是顯示文字，兩者必須分開。原本是拿中文按鈕字
 * 當識別碼（busy === '匯出JSON'），如果順手把那串字也搬進字典、改成
 * busy === tr('settings.exportJson')，語言一切換比較就對不起來 ——
 * 送出時存的是中文、比較時拿到的是英文，按鈕永遠不會顯示「處理中…」；
 * 反方向則會卡在「處理中…」出不來。
 * 定成 union 而不是 string，是為了讓打錯字在 tsc 就爆。
 */
type BusyJob = 'exportJson' | 'exportCsv' | 'import' | 'notify';

/**
 * 設定頁：寶寶資料 + 備份。
 *
 * 備份區塊在這個 APP 不是可選功能。單機版沒有雲端，而且 Expo Go 的資料沙箱
 * 跟未來的正式 APK 不是同一個——所以「匯出/匯入」就是你唯一的搬家與保命通道。
 */
export default function Settings() {
  const t = useTheme();
  const tr = useT();
  const { babies } = useBabies();
  const insets = useSafeAreaInsets();
  const { settings, set } = useSettings();
  const [busy, setBusy] = useState<BusyJob | null>(null);

  // 皮膚壞掉（例如匯入了一份舊備份、裡面的 skin 值已經不存在）時退回第一組，
  // 而不是讓底下那行說明整段消失。順便讓 tr() 拿到的一定是 I18nKey 不是 undefined。
  const skin = SKINS.find((s) => s.key === settings.skin) ?? SKINS[0];

  async function run(job: BusyJob, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(job);
    try {
      await fn();
    } catch (e) {
      // 四件事共用這個標題，所以不能寫死是哪一件
      Alert.alert(tr('settings.opFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  /**
   * 匯出後給明確回饋。
   *
   * ⚠️ 原本按下去之後【什麼都不會發生】—— 系統分享選單關掉，畫面回到設定頁，
   * 沒有任何訊息。而這是單機版唯一的保命通道，使用者無從得知它到底通了沒。
   *
   * 但回饋必須誠實：shareAsync 不回報使用者最後有沒有真的存檔（Android 的
   * 分享選單沒有這個 API）。所以文案只能講到「檔案產生了、選單開過了」，
   * 並明確提醒去目的地確認 —— 不能宣稱「備份完成」。
   */
  async function handleExport(kind: 'json' | 'csv') {
    await run(kind === 'json' ? 'exportJson' : 'exportCsv', async () => {
      const r = kind === 'json' ? await exportJson() : await exportCsv();
      Alert.alert(
        tr('settings.exportDoneTitle'),
        [
          // 檔名是使用者要去目的地認的字串，不進字典
          r.filename,
          '',
          tr('settings.exportCounts', { babies: r.babies, events: r.events }),
          '',
          tr('settings.exportVerifyNote'),
        ].join('\n'),
      );
    });
  }

  async function handleImport() {
    await run('import', async () => {
      const result = await importJson();
      if (!result) return; // 使用者取消
      Alert.alert(
        tr('settings.importDoneTitle'),
        [
          tr('settings.importBabies', { added: result.babiesAdded, skipped: result.babiesSkipped }),
          tr('settings.importEvents', { added: result.eventsAdded, skipped: result.eventsSkipped }),
          '',
          tr('settings.importSkipNote'),
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
        <Text style={[styles.title, { color: t.text }]}>{tr('settings.title')}</Text>

        <Section title={tr('settings.sectionBaby')}>
          {babies.map((baby) => (
            <BabyEditor key={baby.id} baby={baby} />
          ))}
        </Section>

        <Section title={tr('settings.sectionAppearance')}>
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.appearanceNote')}
          </Text>

          {/* ⚠️ 這個標籤在兩本字典裡都是雙語，不是漏翻 —— 介面還不是你的語言時，
              這是唯一要讓你找得到的那一行 */}
          <Text style={[styles.subLabel, { color: t.textMuted }]}>{tr('settings.langLabel')}</Text>
          <View style={styles.chipRow}>
            {LANGS.map((l) => (
              <Chip
                key={l.key}
                label={l.label}
                tint={t.primary}
                selected={settings.lang === l.key}
                onPress={() => set('lang', l.key)}
              />
            ))}
          </View>
          {/* langNote2 講的是「只有版本更新說明保持中文」—— 那個例外是永久的
              （lib/build.ts 刻意不翻譯），所以這段文案不會過幾週又變成假的 */}
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.langNote1')}
            {'\n'}
            {tr('settings.langNote2')}
          </Text>

          <Text style={[styles.subLabel, { color: t.textMuted }]}>{tr('settings.skinLabel')}</Text>
          <View style={styles.chipRow}>
            {SKINS.map((s) => (
              <Chip
                key={s.key}
                label={tr(s.labelKey)}
                tint={t.primary}
                selected={settings.skin === s.key}
                onPress={() => set('skin', s.key)}
              />
            ))}
          </View>
          <Text style={[styles.note, { color: t.textMuted }]}>{tr(skin.blurbKey)}</Text>

          <Text style={[styles.subLabel, { color: t.textMuted }]}>
            {tr('settings.themeModeLabel')}
          </Text>
          <View style={styles.chipRow}>
            {THEME_MODES.map((m) => (
              <Chip
                key={m.key}
                label={tr(m.labelKey)}
                tint={t.primary}
                selected={settings.themeMode === m.key}
                onPress={() => set('themeMode', m.key)}
              />
            ))}
          </View>
          {/* ⚠️ themeModeNote2 引號裡是 mode.auto 的字面值。改其中一個就要改另一個，
              否則說明會指向一顆畫面上叫別的名字的按鈕 */}
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.themeModeNote1')}
            {'\n'}
            {tr('settings.themeModeNote2')}
          </Text>
        </Section>

        <Section title={tr('settings.sectionBackup')}>
          {/* 兩段之間的空行是排版不是字，所以 {'\n\n'} 留在 JSX 裡不進字典 */}
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.backupNote1')}
            {'\n\n'}
            {tr('settings.backupNote2')}
          </Text>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === 'exportJson' ? tr('settings.working') : tr('settings.exportJson')}
              tint={t.primary}
              filled
              disabled={!!busy}
              onPress={() => handleExport('json')}
            />
          </View>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === 'exportCsv' ? tr('settings.working') : tr('settings.exportCsv')}
              tint={t.primary}
              disabled={!!busy}
              onPress={() => handleExport('csv')}
            />
          </View>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === 'import' ? tr('settings.working') : tr('settings.importJson')}
              tint={t.diaper}
              disabled={!!busy}
              onPress={handleImport}
            />
          </View>
        </Section>

        <Section title={tr('settings.sectionNotifications')}>
          {/* ⚠️ {min} 由 NURSING_OVERDUE_MIN 帶入，不要在字典裡寫死 60 ——
              常數改了文案要跟著改，這種漏改沒有人會發現 */}
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.notifyNote1', { min: NURSING_OVERDUE_MIN })}
            {'\n\n'}
            {tr('settings.notifyNote2')}
            {'\n\n'}
            {tr('settings.notifyNote3')}
          </Text>
          <View style={styles.buttonRow}>
            {/* ⚠️ 原本這顆叫「測試通知權限」，而它只讀權限旗標然後回答
                「超時提醒會正常運作」—— 那是【假的安心感】。權限只決定
                允不允許，不決定送不送到；真正會讓這個功能失效的是省電機制。
                改成實際發一則，讓你自己看它有沒有出現在鎖屏上。 */}
            <SlimButton
              label={busy === 'notify' ? tr('settings.working') : tr('settings.sendTest')}
              tint={t.primary}
              disabled={!!busy}
              onPress={() =>
                run('notify', async () => {
                  const ok = await sendTestNotification();
                  if (!ok) {
                    Alert.alert(tr('settings.noPermTitle'), tr('settings.noPermBody'));
                    return;
                  }
                  Alert.alert(
                    tr('settings.testScheduledTitle', { sec: TEST_NOTIFICATION_DELAY_SEC }),
                    [
                      tr('settings.testStep1'),
                      '',
                      tr('settings.testSeen'),
                      tr('settings.testNotSeen'),
                      '',
                      tr('settings.testWhy'),
                    ].join('\n'),
                  );
                })
              }
            />
          </View>
        </Section>

        <Section title={tr('settings.sectionAbout')}>
          <Text style={[styles.note, { color: t.textMuted }]}>
            {tr('settings.aboutName')}
            {'\n'}
            {tr('settings.aboutSync')}
          </Text>

          {/* 版本標記。Expo Go 不會自己更新 bundle，所以「我看到的是新版還是舊版」
              沒辦法從畫面猜。這一行就是答案。 */}
          <View style={[styles.buildBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            {/* ⚠️ 只有「版本」兩個字會翻譯，BUILD_TAG 與 BUILD_NOTES 原樣帶入 ——
                lib/build.ts 是拿來核對 bundle 版本的中文說明，刻意永遠不翻譯。
                所以英文介面這裡會是「英文標題 + 中文清單」，這不是壞掉，
                理由已經寫在上面外觀區的 settings.langNote2 告訴使用者了。 */}
            <Text style={[styles.buildTag, { color: t.text }]}>
              {tr('settings.buildTag', { tag: BUILD_TAG })}
            </Text>
            <Text style={[styles.note, { color: t.textMuted }]}>
              {tr('settings.buildNotesHeading')}
              {'\n'}
              {BUILD_NOTES.map((n) => `· ${n}`).join('\n')}
              {'\n\n'}
              {tr('settings.buildMismatch')}
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 一個寶寶的名字／生日／性別編輯。
 *
 * ── 為什麼要有「尚未儲存」這一排 ──
 * 原本名字與生日只在 onEndEditing 寫入，而且無效時【靜默還原成舊值】。
 * 兩個後果：
 *   1. 在 Android 上點旁邊的 Chip 或直接切 tab，onEndEditing 不一定會觸發
 *      （這頁的 ScrollView 設了 keyboardShouldPersistTaps="handled"），
 *      改到一半的名字就這樣消失，而且畫面上沒有任何跡象。
 *   2. 生日打錯格式時直接被換回舊值，你連自己打了什麼都看不到，無從修正。
 *
 * 現在：離開欄位仍然會自動存（常見情況照樣一氣呵成），但
 *   - 只要 local 與資料庫不一致就顯示「尚未儲存」＋儲存／還原按鈕
 *   - 無效時【保留你打的字】並在下面說明哪裡不合，不再偷偷換掉
 */
function BabyEditor({ baby }: { baby: Baby }) {
  const t = useTheme();
  const tr = useT();
  const tone = t.baby[baby.colorKey];
  const [name, setName] = useState(baby.name);
  const [birth, setBirth] = useState(baby.birthDate);
  const [saving, setSaving] = useState(false);

  const birthValid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && isValid(parseISO(birth));
  // 這個檢查 onboarding 有、設定頁原本漏了 —— 年份打錯（2062）會靜靜存進去，
  // 然後年齡顯示變成負的
  const notFuture = birthValid && parseISO(birth).getTime() <= Date.now();
  const nameOk = name.trim().length > 0;

  const dirty = name.trim() !== baby.name || birth !== baby.birthDate;
  const canSave = nameOk && birthValid && notFuture;

  // ⚠️ 範例日期在兩本字典裡【必須完全一樣】：那示範的是要照著打的 ISO 格式，
  // 換成在地寫法會讓使用者打出存不進去的字串
  const problem = !nameOk
    ? tr('settings.errNameEmpty')
    : !birthValid
      ? tr('settings.errBirthFormat')
      : !notFuture
        ? tr('settings.errBirthFuture')
        : null;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await updateBaby(baby.id, { name: name.trim(), birthDate: birth });
    } catch (e) {
      Alert.alert(tr('modal.saveFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function revert() {
    setName(baby.name);
    setBirth(baby.birthDate);
  }

  async function setSex(s: Baby['sex']) {
    try {
      await updateBaby(baby.id, { sex: baby.sex === s ? null : s });
    } catch (e) {
      // 原本是 fire-and-forget：寫入失敗時 Chip 不會變成選中樣式，
      // 但有觸覺回饋，所以完全分不出「沒反應」和「存了但沒重繪」
      Alert.alert(tr('modal.saveFailed'), e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View
      style={[
        styles.babyCard,
        { backgroundColor: tone.soft, borderColor: t.cardBorder, borderLeftColor: tone.base },
      ]}
    >
      <View style={styles.babyHeader}>
        <View style={[styles.dot, { backgroundColor: tone.base }]} />
        <Text style={[styles.babyAge, { color: t.textMuted }]}>
          {canSave ? formatBabyAge(birth) : (problem ?? '')}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        // onBlur 比 onEndEditing 可靠（onEndEditing 在部分互動下不會觸發）。
        // 無效時【不做任何事】——保留使用者打的字，讓下面的提示告訴他哪裡不合。
        onBlur={() => {
          if (dirty && canSave) void save();
        }}
        placeholder={tr('settings.namePlaceholder')}
        placeholderTextColor={t.textMuted}
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />
      <TextInput
        value={birth}
        onChangeText={(text) => setBirth(maskDateInput(text))}
        onBlur={() => {
          if (dirty && canSave) void save();
        }}
        // YYYYMMDD 兩本字典都不翻譯：那是要照著打的格式本身
        placeholder={tr('settings.birthPlaceholder')}
        placeholderTextColor={t.textMuted}
        keyboardType="number-pad"
        maxLength={DATE_INPUT_MAX_LENGTH}
        autoCapitalize="none"
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />

      {problem ? <Text style={[styles.problem, { color: t.warn }]}>{problem}</Text> : null}

      {/* 只要跟資料庫不一致就顯示。這是原本整個機制唯一缺的東西：
          一個「你的修改還沒進去」的可見訊號。 */}
      {dirty ? (
        <View style={styles.dirtyRow}>
          <Text style={[styles.dirtyText, { color: t.warn }]}>
            {saving ? tr('settings.saving') : tr('settings.unsaved')}
          </Text>
          <View style={styles.dirtyButtons}>
            <SlimButton
              label={tr('common.save')}
              tint={t.primary}
              filled
              disabled={!canSave || saving}
              onPress={save}
            />
            {/* ⚠️ 是 common.revert（"Discard"，丟掉還沒存的修改）不是 common.restore
                （「復原」／"Undo"，那是刪掉之後的復原，語意不同） */}
            <SlimButton
              label={tr('common.revert')}
              tint={t.textMuted}
              disabled={saving}
              onPress={revert}
            />
          </View>
        </View>
      ) : null}

      {/* 性別（選填）。之後做生長曲線時是必要的 —— WHO 百分位表是分性別的 */}
      <View style={styles.sexChips}>
        {(['boy', 'girl'] as const).map((s) => (
          <Chip
            key={s}
            label={sexLabel(s)}
            tint={tone.base}
            selected={baby.sex === s}
            onPress={() => void setSex(s)}
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
  subLabel: { fontSize: fontSize.xs, fontWeight: '800', marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonRow: { flexDirection: 'row' },
  buildBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  buildTag: { fontSize: fontSize.sm, fontWeight: '800' },

  babyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    // 跟首頁／紀錄頁／統計頁一致的左側粗色條
    borderLeftWidth: 6,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  problem: { fontSize: fontSize.xs, fontWeight: '700' },
  dirtyRow: { gap: spacing.sm, marginTop: spacing.xs },
  dirtyText: { fontSize: fontSize.xs, fontWeight: '800' },
  dirtyButtons: { flexDirection: 'row', gap: spacing.sm },
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
