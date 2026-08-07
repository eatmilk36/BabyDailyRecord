/**
 * 奶油暖木色票。
 *
 * 設計立場：關鍵字是「家」不是「寶寶」——木頭色 + 奶油白是家的視覺語言
 * （木地板、藤編、暖色燈泡）。粉藍是嬰兒房的語言，抹茶米白是咖啡廳的語言。
 *
 * 深色模式在這個 APP 是【功能需求不是偏好】：半夜開燈會叫醒寶寶（而且會叫醒兩個）。
 * 所以深色版不是把淺色反轉，而是暖色低亮度的「夜燈」，幾乎不含藍光。
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
  /** primary 的淡底。目前用在底部 tab 的「選中整格上色」 */
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
  /** modal 背後的遮罩 */
  overlay: string;
  baby: Record<BabyColorKey, BabyTone>;
};

export const palette: { light: Palette; dark: Palette } = {
  light: {
    bg: '#FDF8F3',
    card: '#FFFFFF',
    cardBorder: '#F0E6DA',
    primary: '#C08552',
    primarySoft: '#F3E3D0',
    text: '#4A3F35',
    textMuted: '#8C7B6B',
    feed: '#E8A87C',
    diaper: '#7FB3A7',
    inkOnAction: '#3D2E20',
    warn: '#D9754A',
    warnSoft: '#FBE9E1',
    overlay: 'rgba(74, 63, 53, 0.35)',
    baby: {
      peach: { base: '#E8A87C', soft: '#FCF1E8', on: '#5C3A21' },
      mint: { base: '#7FB3A7', soft: '#E9F3F0', on: '#25453E' },
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
    feed: '#F2C078',
    diaper: '#8FB8A8',
    inkOnAction: '#1F1A14',
    warn: '#E89B6C',
    warnSoft: '#3A2A22',
    overlay: 'rgba(0, 0, 0, 0.6)',
    baby: {
      peach: { base: '#F2C078', soft: '#2C2419', on: '#F7E4C6' },
      mint: { base: '#8FB8A8', soft: '#1D2724', on: '#D6E8E1' },
    },
  },
};

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

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  /** 首頁「2 小時 15 分前」那種主視覺數字 */
  hero: 38,
} as const;
