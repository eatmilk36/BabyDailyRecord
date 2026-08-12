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
import { SEX_LABEL } from '../../lib/labels';
import { DATE_INPUT_MAX_LENGTH, formatBabyAge, maskDateInput } from '../../lib/time';
import { LANGS } from '../../lib/i18n';
import { useSettings, type ThemeMode } from '../../lib/settings';
import { fontSize, radius, SKINS, spacing, TAB_BAR_HEIGHT } from '../../theme/colors';

const THEME_MODES: { key: ThemeMode; label: string }[] = [
  { key: 'auto', label: '跟隨系統' },
  { key: 'light', label: '淺色' },
  { key: 'dark', label: '深色' },
];
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
  const { settings, set } = useSettings();
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
    await run(kind === 'json' ? '匯出JSON' : '匯出CSV', async () => {
      const r = kind === 'json' ? await exportJson() : await exportCsv();
      Alert.alert(
        '檔案已產生',
        [
          r.filename,
          '',
          `寶寶 ${r.babies} 筆、紀錄 ${r.events} 筆`,
          '',
          '⚠️ 分享選單開過不等於存好了。請到你選的目的地（雲端硬碟、LINE…）' +
            '確認檔案真的在那裡 —— 這是這個 APP 唯一的備份途徑。',
        ].join('\n'),
      );
    });
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

        <Section title="外觀">
          <Text style={[styles.note, { color: t.textMuted }]}>
            語言、皮膚與深淺模式會跟著「匯出 JSON 備份」一起帶走，換手機不用重設。
          </Text>

          <Text style={[styles.subLabel, { color: t.textMuted }]}>語言 / Language</Text>
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
          <Text style={[styles.note, { color: t.textMuted }]}>
            英文版是給只讀英文的照顧者用的。台灣特有的內容（九色大便卡、
            兒童肝膽疾病防治基金會專線）在英文版會加上說明，不是直譯 ——
            因為那張卡在寶寶手冊裡、那支電話在國外打不通。
            {'\n'}
            翻譯還在分批進行，目前只有一部分畫面切得動。
          </Text>

          <Text style={[styles.subLabel, { color: t.textMuted }]}>皮膚</Text>
          <View style={styles.chipRow}>
            {SKINS.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                tint={t.primary}
                selected={settings.skin === s.key}
                onPress={() => set('skin', s.key)}
              />
            ))}
          </View>
          <Text style={[styles.note, { color: t.textMuted }]}>
            {SKINS.find((s) => s.key === settings.skin)?.blurb}
          </Text>

          <Text style={[styles.subLabel, { color: t.textMuted }]}>深淺模式</Text>
          <View style={styles.chipRow}>
            {THEME_MODES.map((m) => (
              <Chip
                key={m.key}
                label={m.label}
                tint={t.primary}
                selected={settings.themeMode === m.key}
                onPress={() => set('themeMode', m.key)}
              />
            ))}
          </View>
          <Text style={[styles.note, { color: t.textMuted }]}>
            深色模式在這個 APP 不只是偏好 —— 半夜開燈會吵醒兩個寶寶，
            所以深色版是低亮度的「夜燈」，不是把淺色反過來。
            {'\n'}
            「跟隨系統」會照你手機的自動深色排程走。
          </Text>
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
              onPress={() => handleExport('json')}
            />
          </View>
          <View style={styles.buttonRow}>
            <SlimButton
              label={busy === '匯出CSV' ? '處理中…' : '匯出 CSV（給醫生看）'}
              tint={t.primary}
              disabled={!!busy}
              onPress={() => handleExport('csv')}
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
            {/* ⚠️ 原本這顆叫「測試通知權限」，而它只讀權限旗標然後回答
                「超時提醒會正常運作」—— 那是【假的安心感】。權限只決定
                允不允許，不決定送不送到；真正會讓這個功能失效的是省電機制。
                改成實際發一則，讓你自己看它有沒有出現在鎖屏上。 */}
            <SlimButton
              label={busy === '通知' ? '處理中…' : '發送測試通知'}
              tint={t.primary}
              disabled={!!busy}
              onPress={() =>
                run('通知', async () => {
                  const ok = await sendTestNotification();
                  if (!ok) {
                    Alert.alert(
                      '沒有通知權限',
                      '你之前拒絕過通知權限，要到系統設定裡手動開啟。記錄功能完全不受影響。',
                    );
                    return;
                  }
                  Alert.alert(
                    `${TEST_NOTIFICATION_DELAY_SEC} 秒後會送出`,
                    [
                      '現在請【把螢幕關掉】，然後等一下。',
                      '',
                      '看到通知 = 鎖屏提醒會正常送到。',
                      '沒看到 = 被省電機制吃掉了，要去系統設定把 Expo Go 排除在電池最佳化之外。',
                      '',
                      '權限有開不代表送得到，所以只能用實際送一則來確認。',
                    ].join('\n'),
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

  const problem = !nameOk
    ? '名字不能空白'
    : !birthValid
      ? '生日格式要像 2026-06-24'
      : !notFuture
        ? '生日不能在未來'
        : null;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await updateBaby(baby.id, { name: name.trim(), birthDate: birth });
    } catch (e) {
      Alert.alert('存不進去', e instanceof Error ? e.message : String(e));
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
      Alert.alert('存不進去', e instanceof Error ? e.message : String(e));
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
        placeholder="名字"
        placeholderTextColor={t.textMuted}
        style={[styles.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.card }]}
      />
      <TextInput
        value={birth}
        onChangeText={(text) => setBirth(maskDateInput(text))}
        onBlur={() => {
          if (dirty && canSave) void save();
        }}
        placeholder="YYYYMMDD（直接打數字）"
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
            {saving ? '儲存中…' : '尚未儲存'}
          </Text>
          <View style={styles.dirtyButtons}>
            <SlimButton
              label="儲存"
              tint={t.primary}
              filled
              disabled={!canSave || saving}
              onPress={save}
            />
            <SlimButton label="還原" tint={t.textMuted} disabled={saving} onPress={revert} />
          </View>
        </View>
      ) : null}

      {/* 性別（選填）。之後做生長曲線時是必要的 —— WHO 百分位表是分性別的 */}
      <View style={styles.sexChips}>
        {(['boy', 'girl'] as const).map((s) => (
          <Chip
            key={s}
            label={SEX_LABEL[s]}
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
