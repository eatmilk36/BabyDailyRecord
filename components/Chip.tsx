import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** 選中時的強調色，預設用主色 */
  tint?: string;
  /** 左邊的小色塊（大便卡顏色用） */
  swatch?: string;
  /**
   * 未選中時的邊框色，用來暗示這一組選項的性質。
   *
   * 目前唯一的用途是九色大便卡：「正常 7–9」和「需要注意 1–6」原本長得
   * 一模一樣（都是中性外框），嚴重程度只有選中後才看得出來——那是膽道閉鎖
   * 的篩檢介面，不該這樣。傳 t.warn 進來讓需要注意的那組在【還沒選】的時候
   * 就看得出不一樣。
   */
  borderTint?: string;
};

/**
 * 可點的標籤。所有細節欄位都用這個，沒有鍵盤輸入。
 *
 * 選中樣式刻意做成「外框 + 20% 底色」而不是實色填滿：
 * 因為 tint 會是各種深淺的顏色（大便卡有白色也有黑色），
 * 實色填滿就得為每個顏色算對比的文字色，外框式則在深淺兩種主題下都讀得清楚。
 */
export function Chip({ label, selected, onPress, tint, swatch, borderTint }: Props) {
  const t = useTheme();
  const accent = tint ?? t.primary;
  // 未選中的邊框改用 textMuted（或呼叫端指定的 borderTint）。
  // 原本用 t.cardBorder，實測對背景只有 1.23:1（淺色）/ 1.18:1（深色）——
  // 等於完全看不出「這裡可以點」，整排選項看起來像說明文字。
  // textMuted 是 4.1:1 / 5.3:1，符合非文字元件 3:1 的門檻。
  const resting = borderTint ?? t.textMuted;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: selected ? accent : resting,
          // 寬度固定 2：原本 1 ↔ 2 會讓 chip 在選中瞬間長大 1px，
          // 一整排 chip 同時位移很礙眼。選中狀態靠顏色 + 20% 底色就夠明顯了。
          borderWidth: 2,
          // hex + '33' = 20% 透明度，RN 支援 8 碼 hex
          backgroundColor: selected ? `${accent}33` : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {swatch ? (
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: t.cardBorder }]} />
      ) : null}
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    // 44 是可觸及性的底線。原本 40，而九色大便卡的個位數字 chip 更只有約 33px 寬
    // ——半夜單手操作點不準，而點錯編號在這個介面是有醫療意義的。
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
