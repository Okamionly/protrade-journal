"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { LbmaTranslations, Locale } from "./types";
import { LOCALE_DATE_MAP } from "./types";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import es from "./locales/es.json";
import de from "./locales/de.json";

const dictionaries: Record<Locale, LbmaTranslations> = {
  fr: fr as LbmaTranslations,
  en: en as LbmaTranslations,
  ar: ar as LbmaTranslations,
  es: es as LbmaTranslations,
  de: de as LbmaTranslations,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof LbmaTranslations) => string;
  dir: "ltr" | "rtl";
  dateFmt: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "lbma-locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && dictionaries[stored]) {
      setLocaleState(stored);
    }
    // Sync when Header changes locale
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && dictionaries[e.newValue as Locale]) {
        setLocaleState(e.newValue as Locale);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: keyof LbmaTranslations): string => {
    return dictionaries[locale][key] || dictionaries.fr[key] || key;
  };

  const dir = locale === "ar" ? "rtl" : "ltr";
  const dateFmt = LOCALE_DATE_MAP[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir, dateFmt }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation must be used within LocaleProvider");
  return ctx;
}
