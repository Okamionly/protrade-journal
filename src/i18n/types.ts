export interface LbmaTranslations {
  title: string;
  subtitle: string;
  updatedAt: string;
  refresh: string;
  csv: string;
  fixingInProgress: string;
  nextFixing: string;
  inWord: string;

  // Metals
  gold: string;
  silver: string;
  platinum: string;
  palladium: string;

  // Sessions
  amFix: string;
  pmFix: string;
  fix: string;

  // Price cards
  goldAmLabel: string;
  goldPmLabel: string;
  silverLabel: string;
  platAmLabel: string;
  platPmLabel: string;
  pallAmLabel: string;
  pallPmLabel: string;
  ratioLabel: string;

  // Ratio
  silverUndervalued: string;
  goldUndervalued: string;
  neutralZone: string;

  // Spread
  spreadTitle: string;
  spreadGold: string;
  spreadPlatinum: string;
  spreadPalladium: string;
  nySells: string;
  nyBuys: string;
  neutral: string;

  // Chart
  history: string;
  high: string;
  low: string;
  average: string;
  change: string;
  notEnoughData: string;

  // Table
  latestQuotes: string;
  entriesShown: string;
  date: string;
  variation: string;

  // Schedule
  scheduleTitle: string;
  metal: string;
  session: string;
  london: string;
  newYork: string;
  paris: string;

  // Errors
  apiError: string;
  unknownError: string;

  // Cities in countdown
  londonGmt: string;
  nyEst: string;

  // Metalabels for chart
  goldPmFix: string;
  silverFix: string;
  platPmFix: string;
  pallPmFix: string;
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
