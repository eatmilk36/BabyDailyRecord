import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EventFields } from '../../components/EventFields';
import { SlimButton } from '../../components/SlimButton';
import {
  getSessionEvents,
  restoreEvent,
  softDeleteEvent,
  updateEvent,
  useBabies,
  type EventPatch,
} from '../../db/queries';
import type { BabyEvent } from '../../db/schema';
import { fontSize, radius, spacing } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 雙寶紀錄的補充彈窗（「都餵了」/「都換了」/「同時親餵」之後開啟）。
 *
 * ── 連動規則（實際行為，不是原本註解宣稱的行為）──
 *
 * 雙胞胎大多數時候兩邊數值一樣（都泡 120ml、都是尿），所以改一張卡時
 * 另一張自動跟著變。但這件事有幾個容易誤解的地方，原本畫面上只寫了
 * 「改上面那位，下面會自動跟著變」，而那句話有三處不準：
 *
 * 1. 連動是【雙向】的。patchAt 標記的是「你剛改的那張」，然後只要另一張
 *    還沒被標記就把值鏡射過去 —— 所以改【下面】那張會反過來蓋掉上面那張。
 * 2. occurredAt 是【無條件】同步的，就算兩張都已經標成不跟著變也一樣
 *    （同一個 session 本來就是同一個時刻，這是刻意的）。
 * 3. 「不跟著變」一旦成立就永遠回不去，而它的觸發門檻是「改任何一個欄位」。
 *
 * 現在改成：每張卡都【明講自己現在的狀態】，而且可以按一下改回跟著變。
 *
 * 永不連動的欄位：
 *   side      — 同時哺餵時左右邊必須互斥
 *   stoolCard — ⚠️ 大便卡編號是【對這一個寶寶的醫療觀察】。自動複製到
 *               另一寶等於憑空生出一筆沒人看過的觀察，而它會進到給醫生的
 *               CSV、也會觸發膽道閉鎖警示。這個欄位絕對不能連動。
 */
export default function SessionModal() {
  const t = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { babies } = useBabies();
  const [items, setItems] = useState<BabyEvent[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  // 刪除後停在這一頁顯示「復原」，而不是直接跳走
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let alive = true;
    getSessionEvents(sessionId)
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  async function patchAt(index: number, p: EventPatch) {
    const target = items[index];
    if (!target) return;

    const nextTouched = { ...touched, [target.id]: true };
    const updates: { id: string; patch: EventPatch }[] = [{ id: target.id, patch: p }];

    const mirror = pickMirrorFields(p);
    const timeSync: EventPatch = p.occurredAt !== undefined ? { occurredAt: p.occurredAt } : {};

    items.forEach((e, i) => {
      if (i === index) return;
      const other: EventPatch = { ...timeSync };
      if (!nextTouched[e.id]) Object.assign(other, mirror);
      if (Object.keys(other).length > 0) updates.push({ id: e.id, patch: other });
    });

    setTouched(nextTouched);
    setItems((prev) =>
      prev.map((e) => {
        const u = updates.find((x) => x.id === e.id);
        return u ? ({ ...e, ...u.patch } as BabyEvent) : e;
      }),
    );

    for (const u of updates) await updateEvent(u.id, u.patch);
  }

  /**
   * 把一張卡改回「會跟著另一位變」。
   *
   * 原本 touched 只會變 true、永遠回不去，而它的觸發門檻是「改任何一個欄位」——
   * 一次誤觸就永久脫離連動，而且畫面上沒有任何辦法救回來。
   */
  function relink(id: string) {
    setTouched((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  /**
   * 跟單寶彈窗一樣：刪除後【留在這一頁】顯示「復原」。
   * 原本承諾「可以在紀錄頁復原」是假的——紀錄頁的復原 bar 由它自己的
   * local state 驅動，而且它一次只記得一筆，這裡刪的是兩筆，
   * 就算跳過去也只救得回一筆。
   */
  function handleDeleteAll() {
    Alert.alert('刪除這兩筆紀錄？', '刪除後這一頁會出現「復原」，離開這一頁就不能復原了。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          for (const e of items) await softDeleteEvent(e.id);
          setDeleted(true);
        },
      },
    ]);
  }

  async function handleRestoreAll() {
    for (const e of items) await restoreEvent(e.id);
    setDeleted(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.textMuted }}>找不到這組紀錄</Text>
      </View>
    );
  }

  if (deleted) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <View style={styles.deletedBox}>
          <Text style={[styles.deletedTitle, { color: t.text }]}>已刪除這兩筆紀錄</Text>
          <Text style={[styles.hint, { color: t.textMuted }]}>
            離開這一頁之後就沒有復原入口了。
          </Text>
          <View style={styles.deletedButtons}>
            <SlimButton label="復原" tint={t.primary} filled onPress={handleRestoreAll} />
            <SlimButton label="關閉" tint={t.textMuted} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.savedBadge, { backgroundColor: `${t.diaper}26` }]}>
        <Text style={[styles.savedText, { color: t.text }]}>✓ 兩筆都已儲存</Text>
      </View>
      <Text style={[styles.hint, { color: t.textMuted }]}>
        改其中一位，另一位會自動跟著變（不分上下，兩邊都會）。
        {'\n'}
        改過的那一位就不再跟著變，卡片上會標出來，可以按一下改回去。
        {'\n'}
        <Text style={{ fontWeight: '800' }}>時間永遠兩邊同步</Text>
        ；<Text style={{ fontWeight: '800' }}>左右邊與大便卡編號永遠不連動</Text>
        —— 那是各自的觀察，不該被複製。
      </Text>

      {items.map((event, index) => {
        const baby = babies.find((b) => b.id === event.babyId);
        const tone = baby ? t.baby[baby.colorKey] : undefined;
        const tint = tone?.base ?? t.primary;

        return (
          <View
            key={event.id}
            style={[
              styles.block,
              {
                backgroundColor: tone?.soft ?? t.card,
                borderColor: t.cardBorder,
                // 這個彈窗兩寶上下並排，而「改上面下面會跟著變」的行為只有在你
                // 分得出哪個是哪個時才安全。左側粗色條跟首頁用同一套語言。
                borderLeftColor: tone?.base ?? t.primary,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: tint }]} />
              <Text style={[styles.title, { color: t.text }]}>{baby?.name ?? '寶寶'}</Text>
              {/* 兩種狀態【都要】顯示。
                  原本只在 touched 時顯示「已獨立」，所以沒標記的那張卡上
                  看不出「我會被另一張蓋掉」—— 而那正是使用者需要知道的事。
                  而且「已獨立」貼在你剛改的那張，跟使用者感知的「另一張跟著變了」
                  剛好相反，讀起來像貼錯了。 */}
              {touched[event.id] ? (
                <Pressable onPress={() => relink(event.id)} hitSlop={10}>
                  <Text style={[styles.badge, { color: t.primary }]}>不跟著變 · 改回去</Text>
                </Pressable>
              ) : (
                <Text style={[styles.badge, { color: t.textMuted }]}>會跟著另一位變</Text>
              )}
            </View>

            <EventFields event={event} tint={tint} onPatch={(p) => patchAt(index, p)} />
          </View>
        );
      })}

      {/* 同 event/[id]：主要動作是「完成」，刪除降級成小字 */}
      <View style={styles.footer}>
        <SlimButton label="完成" onPress={() => router.back()} filled />
      </View>
      <Pressable onPress={handleDeleteAll} style={styles.deleteLink} hitSlop={12}>
        <Text style={[styles.deleteText, { color: t.warn }]}>刪除這兩筆紀錄</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * 會連動到另一寶的欄位。
 * 刻意不含 side（同時哺餵左右邊必須互斥）與 occurredAt（那個是無條件同步）。
 * 寫成明確的逐項複製而不是動態迴圈，是為了保住型別檢查。
 */
function pickMirrorFields(p: EventPatch): EventPatch {
  const out: EventPatch = {};
  if ('method' in p) out.method = p.method;
  if ('milk' in p) out.milk = p.milk;
  if ('amountMl' in p) out.amountMl = p.amountMl;
  if ('durationMin' in p) out.durationMin = p.durationMin;
  if ('diaperKind' in p) out.diaperKind = p.diaperKind;
  if ('diaperColor' in p) out.diaperColor = p.diaperColor;
  return out;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deletedBox: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  deletedTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  deletedButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hint: { fontSize: fontSize.xs, lineHeight: 18 },
  block: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: fontSize.lg, fontWeight: '800', flex: 1 },
  badge: { fontSize: fontSize.xs, fontWeight: '700' },
  savedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  savedText: { fontSize: fontSize.xs, fontWeight: '700' },
  footer: { flexDirection: 'row' },
  deleteLink: { alignSelf: 'center', paddingVertical: spacing.md },
  deleteText: { fontSize: fontSize.xs, fontWeight: '600', textDecorationLine: 'underline' },
});
