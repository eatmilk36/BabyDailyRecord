import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { fontSize, spacing } from '../../theme/colors';
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
    setEvent({ ...event, ...p } as BabyEvent);
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
          {baby?.name ?? '寶寶'} · {event.type === 'feed' ? '喝奶' : '尿布'}
        </Text>
      </View>
      <Text style={[styles.hint, { color: t.textMuted }]}>
        全部欄位都可以不填。改動會立刻存好，直接關掉就行。
      </Text>

      <EventFields event={event} tint={tint} onPatch={patch} />

      <View style={styles.footer}>
        <SlimButton label="刪除這筆" tint={t.warn} onPress={handleDelete} />
      </View>
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
  footer: { marginTop: spacing.xl, flexDirection: 'row' },
});
