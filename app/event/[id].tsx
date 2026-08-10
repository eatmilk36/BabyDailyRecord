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
  getEvent,
  restoreEvent,
  softDeleteEvent,
  updateEvent,
  useBabies,
  type EventPatch,
} from '../../db/queries';
import type { BabyEvent } from '../../db/schema';
import { TYPE_LABEL } from '../../lib/labels';
import { formatClock } from '../../lib/time';
import { fontSize, radius, spacing } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';

/**
 * 單寶紀錄的補充 / 編輯彈窗。
 *
 * 這個畫面被兩種情境打開：
 *   1. 剛按下「喝奶 / 尿布」之後（紀錄【已經存好了】，這裡只是補細節）
 *   2. 從紀錄頁點某一筆進來編輯
 *
 * 兩種情境用同一個畫面，因為本質相同：改一筆已存在的紀錄。
 * 沒有「儲存」按鈕——每次點擊立刻寫進資料庫，滑掉彈窗不會掉資料。
 */
export default function EventModal() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { babies } = useBabies();
  const [event, setEvent] = useState<BabyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  // 刪除後停在這一頁顯示「復原」，而不是直接跳走
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let alive = true;
    getEvent(id)
      .then((e) => {
        if (!alive) return;
        setEvent(e ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const baby = babies.find((b) => b.id === event?.babyId);
  const tone = baby ? t.baby[baby.colorKey] : undefined;
  const tint = tone?.base ?? t.primary;

  async function patch(p: EventPatch) {
    if (!event) return;
    // 本地也更新 updatedAt，這樣「已儲存 HH:mm」的指示會跟著動
    setEvent({ ...event, ...p, updatedAt: Date.now() } as BabyEvent);
    await updateEvent(event.id, p);
  }

  /**
   * 刪除後【不跳走】，就地換成「已刪除 + 復原」。
   *
   * 原本寫的是 softDeleteEvent 之後 router.back()，而確認框跟你說
   * 「刪除後可以在紀錄頁復原」——那是假的：紀錄頁的復原 bar 由它自己的
   * local state 驅動，只有在紀錄頁長按刪除才會出現。從這裡刪掉的紀錄
   * 沒有任何復原入口，而這是整個彈窗裡唯一不可逆的動作。
   *
   * 留在原地是最低風險也最誠實的解法：復原就在你按下刪除的地方。
   */
  function handleDelete() {
    if (!event) return;
    Alert.alert('刪除這筆紀錄？', '刪除後這一頁會出現「復原」，離開這一頁就不能復原了。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await softDeleteEvent(event.id);
          setDeleted(true);
        },
      },
    ]);
  }

  async function handleRestore() {
    if (!event) return;
    await restoreEvent(event.id);
    setDeleted(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.textMuted }}>找不到這筆紀錄</Text>
      </View>
    );
  }

  if (deleted) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <View style={styles.deletedBox}>
          <Text style={[styles.deletedTitle, { color: t.text }]}>已刪除這筆紀錄</Text>
          <Text style={[styles.hint, { color: t.textMuted }]}>
            離開這一頁之後就沒有復原入口了。
          </Text>
          <View style={styles.deletedButtons}>
            <SlimButton label="復原" tint={t.primary} filled onPress={handleRestore} />
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
      {/* 染色的標題帶：原本辨識「這是哪一寶」只有一個 12pt 圓點加名字，
          而這個彈窗是你按下大按鈕後立刻浮出來的畫面 —— 如果按錯了寶寶，
          這裡是唯一一次能發現的機會，不該用最小的視覺訊號。 */}
      <View
        style={[
          styles.header,
          styles.headerBand,
          { backgroundColor: tone?.soft ?? t.card, borderLeftColor: tint },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text style={[styles.title, { color: t.text }]}>
          {/* 擠奶不屬於任何寶寶，所以找不到 baby 時不要硬寫「寶寶」 */}
          {event.type === 'pump' ? '擠奶' : `${baby?.name ?? '寶寶'} · ${TYPE_LABEL[event.type]}`}
        </Text>
      </View>
      <View style={[styles.savedBadge, { backgroundColor: `${t.diaper}26` }]}>
        <Text style={[styles.savedText, { color: t.text }]}>
          ✓ 已儲存 {formatClock(event.updatedAt)}
        </Text>
      </View>
      <Text style={[styles.hint, { color: t.textMuted }]}>
        全部欄位都可以不填，每次改動都已經存好了。
      </Text>

      <EventFields event={event} tint={tint} onPatch={patch} />

      {/* 主要動作是「完成」而不是「儲存」——資料早就存好了，這顆只是讓你知道可以走了。
          刪除刻意降級成小字：它是破壞性動作，不該是畫面上最顯眼的按鈕。 */}
      <View style={styles.footer}>
        <SlimButton label="完成" onPress={() => router.back()} filled />
      </View>
      <Pressable onPress={handleDelete} style={styles.deleteLink} hitSlop={12}>
        <Text style={[styles.deleteText, { color: t.warn }]}>刪除這筆紀錄</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deletedBox: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  deletedTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  deletedButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBand: {
    borderLeftWidth: 6,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: fontSize.lg, fontWeight: '800' },
  hint: { fontSize: fontSize.xs, lineHeight: 18 },
  savedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  savedText: { fontSize: fontSize.xs, fontWeight: '700' },
  footer: { marginTop: spacing.xl, flexDirection: 'row' },
  deleteLink: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  deleteText: { fontSize: fontSize.xs, fontWeight: '600', textDecorationLine: 'underline' },
});
