import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'si', label: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்' }
];

const LanguageContext = createContext(null);

function interpolate(text, params) {
  if (!text || typeof text !== 'string' || !params) return text;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? '')),
    text
  );
}

export function translate(lang, key, fallback, params) {
  const currentTrans = translations[lang]?.[key];
  if (currentTrans !== undefined && currentTrans !== null && currentTrans !== '') {
    return interpolate(currentTrans, params);
  }
  const enTrans = translations['en']?.[key];
  if (enTrans !== undefined && enTrans !== null && enTrans !== '') {
    return interpolate(enTrans, params);
  }
  const defaultText = fallback !== undefined ? fallback : key;
  return interpolate(defaultText, params);
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      try {
        const saved = globalThis.localStorage.getItem('catms_language');
        if (saved && (saved === 'en' || saved === 'si' || saved === 'ta')) {
          return saved;
        }
      } catch {}
    }
    return 'en';
  });

  const setLanguage = (langCode) => {
    if (!langCode || (langCode !== 'en' && langCode !== 'si' && langCode !== 'ta')) return;
    setLanguageState(langCode);
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      try {
        globalThis.localStorage.setItem('catms_language', langCode);
      } catch {}
    }
  };

  const t = (key, fallback, params) => {
    // If fallback is an object, treat it as params when fallback omitted: t('key', { role: 'Admin' })
    if (typeof fallback === 'object' && fallback !== null && params === undefined) {
      return translate(language, key, undefined, fallback);
    }
    return translate(language, key, fallback, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    let lang = 'en';
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      try {
        const saved = globalThis.localStorage.getItem('catms_language');
        if (saved && (saved === 'en' || saved === 'si' || saved === 'ta')) {
          lang = saved;
        }
      } catch {}
    }
    const t = (key, fallback, params) => {
      if (typeof fallback === 'object' && fallback !== null && params === undefined) {
        return translate(lang, key, undefined, fallback);
      }
      return translate(lang, key, fallback, params);
    };
    return {
      language: lang,
      setLanguage: () => {},
      t,
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }
  return context;
};

export default LanguageContext;
