import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, DEFAULT_LANG, LANGUAGES } from '../i18n/index.js';

const LangContext = createContext(null);
const STORAGE_KEY = 'vb_lang';

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && LANGUAGES[saved] ? saved : DEFAULT_LANG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key, ...args) => translate(lang, key, ...args), [lang]);

  const value = useMemo(
    () => ({
      lang,
      t,
      setLang: (next) => LANGUAGES[next] && setLangState(next),
      toggle: () => setLangState((c) => (c === 'en' ? 'ny' : 'en')),
      languages: Object.values(LANGUAGES).map((l) => ({ code: l.code, name: l.name })),
    }),
    [lang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
};
