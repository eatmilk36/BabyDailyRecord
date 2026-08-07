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
  const tint = baby ? t.baby[baby.colorKey].base : t.primary;

  async function patch(p: EventPatch) {
    if (!event) return;
    // 本地也更新 updatedAt，這樣「已儲存 HH:mm」的指示會跟著動
    setEvent({ ...event, ...p, updatedAt: Date.now() } as BabyEvent);
    await updateEvent(event.id, p);
  }

  function handleDelete() {
    if (!event) return;
    Alert.alert('刪除這筆紀錄？', '刪除後可以在紀錄頁復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await softDeleteEvent(event.id);
          router.back();
        },
      },
    ]);
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

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
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
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
