import { StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

type Props = {
  /** useLiveQuery 回傳的 error。undefined 就不渲染任何東西 */
  error?: unknown;
  /** 「讀取<什麼>時出錯」，例如「寶寶資料」、「今天的紀錄」 */
  what: string;
};

/**
 * 資料讀取失敗的橫幅。
 *
 * ── 為什麼需要這個元件 ──
 * db/queries.ts 的每一個 hook 都回傳 error，但原本【沒有任何畫面在讀它】。
 * 而 drizzle 的 useLiveQuery 在查詢失敗時是 `query.then(handleData).catch(setError)`
 * ——錯誤只寫進 state，不會 throw。結果是：
 *
 *   - data 永遠停在 []
 *   - updatedAt 永遠 undefined，所以我們的 `loaded` 永遠是 false
 *
 * 於是首頁變成一顆【永遠轉不停的 spinner】、紀錄頁連「今天還沒有紀錄」
 * 的空狀態都不顯示（那行字被 `loaded &&` 擋住）而變成一片全白，
 * 統計頁則渲染出一個排版完整、文案通順、看起來就是「還沒記過資料」的畫面。
 *
 * 三種症狀都不像出錯，所以使用者不會回報，而診斷資訊明明已經在 error 裡了。
 * 這是這個專案最難查的一類 bug —— 不是因為複雜，是因為它不出聲。
 *
 * 順便給一句可執行的建議：如果資料庫真的有問題，最該做的第一件事是先備份。
 */
export function QueryError({ error, what }: Props) {
  const t = useTheme();
  if (!error) return null;

  const message = error instanceof Error ? error.message : String(error);

  return (
    <View style={[styles.box, { backgroundColor: t.warnSoft, borderColor: t.warn }]}>
      <Text style={[styles.title, { color: t.warn }]}>⚠ 讀取{what}時出錯</Text>
      <Text style={[styles.detail, { color: t.warn }]}>{message}</Text>
      <Text style={[styles.detail, { color: t.warn }]}>
        這個畫面上的數字可能不完整或全部是 0，不要當成真的。
        {'\n'}
        請先到「設定 → 匯出 JSON 備份」把資料存出來，再截圖這段訊息。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { fontSize: fontSize.sm, fontWeight: '800' },
  detail: { fontSize: fontSize.xs, lineHeight: 18 },
});
