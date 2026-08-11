/**
 * 三組皮膚 × 深淺兩版。
 *
 * 深色模式在這個 APP 是【功能需求不是偏好】：半夜開燈會叫醒寶寶（而且會叫醒兩個）。
 * 所以每組的深色版都不是把淺色反轉，而是低亮度的「夜燈」。
 *
 * ── 每一組色票都必須滿足的四個硬條件 ──
 *
 * 1. baby.peach.soft 與 baby.mint.soft 要有【亮度】差，不能只有色相差。
 *    深色版尤其重要——原本兩者亮度比是 1.00:1，等於半夜兩張卡長一樣。
 *    每組深色版都拉到 1.35 以上（一個調亮、一個調暗）。
 * 2. feed / diaper 這兩個動作色【不可以】等於任何一個 baby.base。
 *    否則會出現「在 B 寶的卡片上，喝奶按鈕就是 A 寶的識別色」。
 * 3. warn 疊在 warnSoft 上要 ≥ 4.5:1（那是膽道閉鎖的就醫警示），
 *    onWarn 疊在 warn 上也要讀得清楚。
 * 4. text 疊在 card 與兩個 baby.soft 上都要 ≥ 7:1。
 */

/** 每個寶寶的固定代表色。雙胞胎半夜辨識靠顏色與位置，不是讀名字。 */
export type BabyColorKey = 'peach' | 'mint';

export const BABY_COLOR_KEYS: BabyColorKey[] = ['peach', 'mint'];

type BabyTone = {
  /** 主色：卡片標題條、名字旁的圓點 */
  base: string;
  /** 淡底：卡片背景微染色，讓兩張卡一眼分得出來 */
  soft: string;
  /** 疊在 base 上的文字色 */
  on: string;
};

type Palette = {
  bg: string;
  card: string;
  cardBorder: string;
  primary: string;
  /**
   * primary 的淡底。
   * ⚠️ 不要拿去給底部 tab 的 tabBarActiveBackgroundColor 用——那個位置必須用
   * 不隨主題變的 TAB_ACTIVE_TINT，理由見它的註解。
   */
  primarySoft: string;
  text: string;
  textMuted: string;
  /** 喝奶動作色 */
  feed: string;
  /** 尿布動作色 */
  diaper: string;
  /** 疊在 feed/diaper 實色按鈕上的文字色（兩種主題下那些色都偏亮，所以都用深墨） */
  inkOnAction: string;
  /** 警示（該餵了、計時超過 60 分） */
  warn: string;
  warnSoft: string;
  /** 疊在 warn 實色上的文字色。淺色主題的 warn 夠深所以用白字，深色主題反過來 */
  onWarn: string;
  /** modal 背後的遮罩 */
  overlay: string;
  baby: Record<BabyColorKey, BabyTone>;
};

export type SkinKey = 'warmwood' | 'sakura' | 'seasalt';

export const SKINS: { key: SkinKey; label: string; blurb: string }[] = [
  { key: 'warmwood', label: '奶油暖木', blurb: '木地板、藤編、暖色燈泡——「家」的語言' },
  { key: 'sakura', label: '粉櫻', blurb: '玫瑰粉 + 薰衣草紫，柔和不刺眼' },
  { key: 'seasalt', label: '海鹽藍', blurb: '冷色低刺激，白天看最清爽' },
];

/** 奶油暖木（預設）。木頭色 + 奶油白是家的視覺語言，不是嬰兒房的粉藍。 */
const warmwood: { light: Palette; dark: Palette } = {
  light: {
    bg: '#FDF8F3',
    card: '#FFFFFF',
    cardBorder: '#F0E6DA',
    primary: '#C08552',
    primarySoft: '#F3E3D0',
    text: '#4A3F35',
    textMuted: '#8C7B6B',
    // ⚠️ 動作色【不可以】跟任何一個 baby.base 相同——見下方 baby 的註解。
    feed: '#E9C07A', // 奶油琥珀（奶）
    diaper: '#7FB6D0', // 水藍（跟 💧 的藍色水滴一致）
    inkOnAction: '#3D2E20',
    // 從 #D9754A 加深。舊值疊在 warnSoft 上只有 2.7:1，而那是膽道閉鎖的就醫警示；
    // 加深後對 warnSoft 是 5.5:1、白字疊上去是 6.4:1，兩個問題一起解。
    warn: '#9C4423',
    warnSoft: '#FBE9E1',
    onWarn: '#FFFFFF',
    overlay: 'rgba(74, 63, 53, 0.35)',
    baby: {
      // 兩張卡的 soft 底色刻意拉開【亮度】而不只是色相：
      // 舊值 #FCF1E8 / #E9F3F0 的亮度比是 1.03:1，半夜等於沒有差別。
      peach: { base: '#E8A87C', soft: '#FBEADA', on: '#5C3A21' },
      mint: { base: '#7FB3A7', soft: '#D5E8E1', on: '#25453E' },
    },
  },
  dark: {
    bg: '#16141A',
    card: '#221F27',
    cardBorder: '#302B36',
    primary: '#F2C078',
    primarySoft: '#3A2E1D',
    text: '#EDE6DA',
    textMuted: '#9C9288',
    feed: '#F0CE8E', // 奶油琥珀
    diaper: '#8FBFD8', // 水藍
    inkOnAction: '#1F1A14',
    warn: '#E89B6C',
    warnSoft: '#3A2A22',
    // 深色主題的 warn 是亮橘，白字只有 2.25:1，所以疊深墨
    onWarn: '#1F1A14',
    overlay: 'rgba(0, 0, 0, 0.6)',
    baby: {
      // 深色模式的亮度分離比淺色更重要，因為半夜就是在用深色。
      // 舊值 #2C2419 / #1D2724 的亮度比是 1.00:1 —— 兩張卡在夜裡完全一樣，
      // 「雙胞胎靠顏色與位置辨識」這個設計前提在最需要它的時候是失效的。
      // 新值把 peach 調亮、mint 調暗，亮度比拉到 1.44:1，再加上暖／冷色相差異。
      peach: { base: '#F2C078', soft: '#42331F', on: '#F7E4C6' },
      mint: { base: '#8FB8A8', soft: '#131C1A', on: '#D6E8E1' },
    },
  },
};

/**
 * 粉櫻。玫瑰粉 + 薰衣草紫。
 * 兩寶的識別色改成【粉 vs 紫】——色相差夠大，而深色版靠亮度再分一次。
 */
const sakura: { light: Palette; dark: Palette } = {
  light: {
    bg: '#FFF7F8',
    card: '#FFFFFF',
    cardBorder: '#F1DFE4',
    primary: '#B05A76',
    primarySoft: '#F8E3EA',
    text: '#463138',
    textMuted: '#87707A',
    // 動作色刻意留在暖黃／水藍：它們不屬於粉或紫，所以不會跟任何一寶撞色
    feed: '#E9C07A',
    diaper: '#7FB6D0',
    inkOnAction: '#3D2A30',
    warn: '#9E3A46',
    warnSoft: '#FBE2E6',
    onWarn: '#FFFFFF',
    overlay: 'rgba(70, 49, 56, 0.35)',
    baby: {
      peach: { base: '#DE8098', soft: '#FBE0E8', on: '#57202E' },
      mint: { base: '#9184C4', soft: '#DFDAF0', on: '#2B2350' },
    },
  },
  dark: {
    bg: '#17131A',
    card: '#241E28',
    cardBorder: '#342B39',
    primary: '#E89EB6',
    primarySoft: '#3A2430',
    text: '#EFE3E8',
    textMuted: '#A08E97',
    feed: '#F0CE8E',
    diaper: '#8FBFD8',
    inkOnAction: '#1F1418',
    warn: '#E8909C',
    warnSoft: '#3A2228',
    onWarn: '#1F1418',
    overlay: 'rgba(0, 0, 0, 0.6)',
    baby: {
      // 粉調亮、紫調暗 —— 亮度比約 1.36:1
      peach: { base: '#E89EB6', soft: '#43242F', on: '#F9DDE6' },
      mint: { base: '#A99BD6', soft: '#15121E', on: '#E2DCF5' },
    },
  },
};

/**
 * 海鹽藍。冷色低刺激。
 * ⚠️ 這一組最容易踩到「動作色跟主色撞在一起」——整組都是藍，
 * 所以尿布的動作色改用【青綠】而不是水藍，跟主色與識別色都拉開。
 */
const seasalt: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F5FAFB',
    card: '#FFFFFF',
    cardBorder: '#DBE8EC',
    primary: '#3B7787',
    primarySoft: '#DCEDF1',
    text: '#2E3E44',
    textMuted: '#6C7E86',
    feed: '#E8C87F',
    diaper: '#59A18C',
    inkOnAction: '#222E33',
    warn: '#9B4030',
    warnSoft: '#FAE3DE',
    onWarn: '#FFFFFF',
    overlay: 'rgba(46, 62, 68, 0.35)',
    baby: {
      peach: { base: '#DD7458', soft: '#FBE0D8', on: '#571F12' },
      mint: { base: '#6A9FC4', soft: '#D5E6F2', on: '#1C3A50' },
    },
  },
  dark: {
    bg: '#10171A',
    card: '#1B252A',
    cardBorder: '#28373E',
    primary: '#7FC0D0',
    primarySoft: '#1E3138',
    text: '#DFEBEF',
    textMuted: '#8A9BA3',
    feed: '#F0CE8E',
    diaper: '#79C4AC',
    inkOnAction: '#101619',
    warn: '#E89078',
    warnSoft: '#38221C',
    onWarn: '#101619',
    overlay: 'rgba(0, 0, 0, 0.6)',
    baby: {
      // 珊瑚調亮、天藍調暗 —— 亮度比約 1.40:1
      peach: { base: '#EF9478', soft: '#3C241D', on: '#FBDDD2' },
      mint: { base: '#7FB0D6', soft: '#101A22', on: '#D6E6F5' },
    },
  },
};

export const palettes: Record<SkinKey, { light: Palette; dark: Palette }> = {
  warmwood,
  sakura,
  seasalt,
};

/**
 * @deprecated 舊的單一色票入口。留著只是為了不一次改壞太多檔案，
 * 新程式碼請用 useTheme()。
 */
export const palette = warmwood;

/** 間距刻度。全專案只用這些數字，不要出現 magic number。 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** 圓角。溫馨感很大一部分來自「圓」——這裡刻意比一般 APP 更圓。 */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

/**
 * 底部 tab bar 高度的【估值】，只用來算各畫面 ScrollView 的下緣留白。
 *
 * ⚠️ 不要拿它去覆寫 tabBarStyle 的 height。
 * @react-navigation/bottom-tabs 會自己套用底部 safe-area inset，手動再設一次
 * 會重複計算，導致可點擊區域與看得到的圖示錯位（實機上「看得到卻點不到」）。
 *
 * 這裡只是估值，用來讓捲動內容不被 tab 遮住（首頁「兩個一起」那排曾被切掉）。
 * 估多了只是多一點空白，無害。
 */
export const TAB_BAR_HEIGHT = 64;

/**
 * 底部 tab「選中那一格」的底色。
 *
 * ⚠️ 刻意是【半透明、且不分深淺主題】的單一個值，這不是偷懶。
 *
 * tabBarActiveBackgroundColor / tabBarInactiveBackgroundColor 是套在【每個 tab
 * item】上的，而 React Navigation 的 item 是延遲渲染 + 記憶化的。用會隨主題變的
 * 顏色，切換深／淺色模式後沒被造訪過的 tab 會保留舊主題的色值——實機上就是
 * 「首頁跟紀錄變淺色了，統計跟設定還是深色」。
 *
 * 半透明色沒有這個問題：它疊在 tabBarStyle 的背景上，而那一層會正常跟著主題更新。
 * 值本身不隨主題改變，所以沒有東西會過期。
 *
 * ⚠️ 有三組皮膚之後這個值【也不能跟著皮膚變】——同樣的記憶化問題，
 * 換皮膚後沒被造訪過的 tab 會留著舊皮膚的顏色。所以改用中性灰：
 * 22% 的灰疊在淺色背景上會壓暗、疊在深色背景上會提亮，三組皮膚都成立。
 *
 * 代價是失去了暖木的性格。可接受 —— 選中狀態還有另外兩個會正常重繪的訊號
 * （emoji 放大、標籤加粗），底色只是第三個。
 */
export const TAB_ACTIVE_TINT = 'rgba(127, 127, 127, 0.22)';

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  /** 首頁「2 小時 15 分前」那種主視覺數字 */
  hero: 38,
} as const;
