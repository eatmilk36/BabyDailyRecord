import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAllSettings, setSetting } from '../db/queries';
import type { SkinKey } from '../theme/colors';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type LangKey = 'zh-TW' | 'en';

export type AppSettings = {
  skin: SkinKey;
  themeMode: ThemeMode;
  lang: LangKey;
};

export const DEFAULT_SETTINGS: AppSettings = {
  skin: 'warmwood',
  themeMode: 'auto',
  lang: 'zh-TW',
};

type Ctx = {
  settings: AppSettings;
  /** 已經從資料庫讀完了嗎。false 時用的是預設值 */
  loaded: boolean;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
};

/**
 * ⚠️ 預設值刻意做成「沒有 Provider 也能用」。
 *
 * useTheme() 被 30 幾個元件呼叫，其中包含 app/_layout.tsx 裡在 Provider
 * 掛載【之前】就會渲染的 Splash。如果 context 沒有可用的預設值，
 * 那個畫面會直接炸掉 —— 而它正好是「資料庫壞掉」時唯一會顯示的畫面。
 */
const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  set: () => {},
});

/**
 * 偏好設定（皮膚、深淺模式、語言）。
 *
 * ── 為什麼存在 SQLite 而不是 AsyncStorage ──
 * 這個 APP 已經有 SQLite + Drizzle，多裝一個 key-value 套件只是多一個相依。
 * 而且存在同一個資料庫裡，「設定 → 匯出 JSON 備份」就順便把偏好一起帶走了 ——
 * 換手機之後皮膚與語言不用重設。
 *
 * ── 為什麼用 Context 而不是 useLiveQuery ──
 * useTheme() 幾乎每個元件都會呼叫。如果它背後是一個 live query，
 * 每個元件都會各自訂閱一次資料庫變更，那是 30 幾個訂閱做同一件事。
 * 設定的變更頻率極低，讀一次放 context 裡就夠了。
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getAllSettings()
      .then((rows) => {
        if (!alive) return;
        const next = { ...DEFAULT_SETTINGS };
        for (const r of rows) {
          if (r.key === 'skin' && isSkin(r.value)) next.skin = r.value;
          else if (r.key === 'themeMode' && isThemeMode(r.value)) next.themeMode = r.value;
          else if (r.key === 'lang' && isLang(r.value)) next.lang = r.value;
        }
        setSettings(next);
        setLoaded(true);
      })
      .catch(() => {
        // 讀不到就用預設值。偏好設定壞掉不該擋住記錄功能 ——
        // 半夜要記一筆奶的時候，皮膚是什麼顏色完全不重要。
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const set = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    // 先更新畫面再寫入：切換皮膚要立刻看到，不要等資料庫
    setSettings((prev) => ({ ...prev, [key]: value }));
    void setSetting(key, String(value)).catch(() => {
      // 寫不進去就下次開 APP 會回到舊值。不彈 Alert ——
      // 為了一個偏好設定打斷使用者不值得。
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, set }), [settings, loaded, set]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  return useContext(SettingsContext);
}

function isSkin(v: string): v is SkinKey {
  return v === 'warmwood' || v === 'sakura' || v === 'seasalt';
}
function isThemeMode(v: string): v is ThemeMode {
  return v === 'auto' || v === 'light' || v === 'dark';
}
function isLang(v: string): v is LangKey {
  return v === 'zh-TW' || v === 'en';
}
