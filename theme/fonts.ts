/**
 * 字型策略。
 *
 * 繁體中文自訂字型檔一個要 5–10MB（因為要包上萬字），塞進 APP 會讓體積爆掉。
 * 所以【中文一律用系統字型】（Android 的 Noto Sans TC 本來就很乾淨）。
 *
 * 只對【數字與英文】載入圓潤字型 Nunito——而首頁最大的視覺元素剛好就是
 * 「2:15」這種數字，溫馨的圓潤感拿得到，代價只有兩個字重約 265KB。
 *
 * ⚠️ 一定要從子路徑匯入（'@expo-google-fonts/nunito/700Bold'）。
 * 從 '@expo-google-fonts/nunito' 匯入會把 16 種字重全部打包進去，約 2MB。
 */
export const numFont = {
  /** 卡片裡的數字 */
  regular: 'Nunito_700Bold',
  /** 首頁主視覺數字 */
  hero: 'Nunito_800ExtraBold',
} as const;
