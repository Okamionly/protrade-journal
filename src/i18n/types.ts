export interface LbmaTranslations {
  [key: string]: string;
}

export type Locale = "fr" | "en" | "ar" | "es" | "de";

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
  es: "ES",
  de: "DE",
};

export const LOCALE_DATE_MAP: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-SA",
  es: "es-ES",
  de: "de-DE",
};
