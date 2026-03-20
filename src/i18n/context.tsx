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

const SUPPORTED_LOCALES: Locale[] = ["fr", "en", "ar", "es", "de"];

/**
 * Detect locale from browser navigator.language(s).
 * Maps language codes like "fr-FR" -> "fr", "en-US" -> "en", "ar-SA" -> "ar", etc.
 * Returns "en" as fallback.
 */
function detectBrowserLocale(): Locale {
  try {
    const languages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

    for (const lang of languages) {
      // Extract primary language tag (before the hyphen)
      const primary = lang.split("-")[0].toLowerCase() as Locale;
      if (SUPPORTED_LOCALES.includes(primary)) {
        return primary;
      }
    }
  } catch {
    // SSR or navigator not available
  }
  return "en";
}

/**
 * Try geo-based detection as a secondary signal via /api/geo.
 * Called only once on first visit when no stored locale exists.
 */
async function detectGeoLocale(): Promise<Locale | null> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.locale && SUPPORTED_LOCALES.includes(data.locale)) {
        return data.locale as Locale;
      }
    }
  } catch {
    // Network error or API unavailable — ignore
  }
  return null;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
      // User already has a saved preference — use it
      setLocaleState(stored);
    } else {
      // First visit: auto-detect language
      const browserLocale = detectBrowserLocale();
      setLocaleState(browserLocale);
      localStorage.setItem(STORAGE_KEY, browserLocale);

      // Also try geo-based detection as a refinement (async)
      detectGeoLocale().then((geoLocale) => {
        if (geoLocale) {
          // Geo detection gives a more accurate result — update if different
          // Only override if browser detection was the generic "en" fallback
          const currentStored = localStorage.getItem(STORAGE_KEY) as Locale;
          if (currentStored === "en" && geoLocale !== "en") {
            setLocaleState(geoLocale);
            localStorage.setItem(STORAGE_KEY, geoLocale);
          }
        }
      });
    }

    // Sync when Header/Sidebar changes locale
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

  const t = (key: string, params?: Record<string, string | number>): string => {
    let val = dictionaries[locale][key] || dictionaries.fr[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return val;
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
