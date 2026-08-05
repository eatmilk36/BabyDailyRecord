import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventFields } from '../../components/EventFields';
import { SlimButton } from '../../components/SlimButton';
import {
  getSessionEvents,
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
 * ── 連動規則 ──
 * 雙胞胎大多數時候兩邊數值一樣（都泡 120ml、都是尿），所以改上面那寶時
 * 下面那寶自動跟著變。但一旦你【手動改過】下面那寶，它就脫離連動，
 * 之後改上面不會再覆蓋它——因為雙胞胎常常一個吃得多一個吃得少，
 * 而體重與攝入量的差異正是回診重點，不能被連動蓋掉。
 *
 * 兩個欄位刻意不連動：
 *   occurredAt — 反過來，一定同步（同一個 session 就是同一個時刻）
 *   side       — 永不連動（同時哺餵時左右邊必須互斥）
 */
export default function SessionModal() {
  const t = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { babies } = useBabies();
  const [items, setItems] = useState<BabyEvent[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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

  function handleDeleteAll() {
    Alert.alert('刪除這兩筆紀錄？', '刪除後可以在紀錄頁復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          for (const e of items) await softDeleteEvent(e.id);
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

  if (items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.textMuted }}>找不到這組紀錄</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.hint, { color: t.textMuted }]}>
        改上面那位，下面會自動跟著變。手動改過下面那位之後就各自獨立。
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
              { backgroundColor: tone?.soft ?? t.card, borderColor: t.cardBorder },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: tint }]} />
              <Text style={[styles.title, { color: t.text }]}>{baby?.name ?? '寶寶'}</Text>
              {touched[event.id] ? (
                <Text style={[styles.badge, { color: t.textMuted }]}>已獨立</Text>
              ) : null}
            </View>

            <EventFields event={event} tint={tint} onPatch={(p) => patchAt(index, p)} />
          </View>
        );
      })}

      <View style={styles.footer}>
        <SlimButton label="刪除這兩筆" tint={t.warn} onPress={handleDeleteAll} />
      </View>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hint: { fontSize: fontSize.xs, lineHeight: 18 },
  block: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: fontSize.lg, fontWeight: '800', flex: 1 },
  badge: { fontSize: fontSize.xs, fontWeight: '700' },
  footer: { flexDirection: 'row' },
});
