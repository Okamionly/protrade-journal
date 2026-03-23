// COT Contract codes (CFTC) — All major futures
export const COT_CONTRACTS: Record<string, { name: string; code: string; category: string }> = {
  // === FOREX ===
  EUR: { name: "EURO FX", code: "099741", category: "Forex" },
  GBP: { name: "BRITISH POUND", code: "096742", category: "Forex" },
  JPY: { name: "JAPANESE YEN", code: "097741", category: "Forex" },
  AUD: { name: "AUSTRALIAN DOLLAR", code: "232741", category: "Forex" },
  CAD: { name: "CANADIAN DOLLAR", code: "090741", category: "Forex" },
  CHF: { name: "SWISS FRANC", code: "092741", category: "Forex" },
  NZD: { name: "NEW ZEALAND DOLLAR", code: "112741", category: "Forex" },
  MXN: { name: "MEXICAN PESO", code: "095741", category: "Forex" },
  BRL: { name: "BRAZILIAN REAL", code: "102741", category: "Forex" },
  RUB: { name: "RUSSIAN RUBLE", code: "089741", category: "Forex" },
  ZAR: { name: "SOUTH AFRICAN RAND", code: "122741", category: "Forex" },
  BTC: { name: "BITCOIN", code: "133741", category: "Forex" },

  // === INDICES ===
  SP500: { name: "E-MINI S&P 500", code: "13874A", category: "Indices" },
  NASDAQ: { name: "E-MINI NASDAQ 100", code: "209742", category: "Indices" },
  DOW: { name: "MINI DOW JONES ($5)", code: "124603", category: "Indices" },
  RUSSELL: { name: "E-MINI RUSSELL 2000", code: "239742", category: "Indices" },
  NIKKEI: { name: "NIKKEI 225 (YEN)", code: "240741", category: "Indices" },
  VIX: { name: "VIX FUTURES", code: "1170E1", category: "Indices" },

  // === METALS ===
  GOLD: { name: "GOLD", code: "088691", category: "Metals" },
  SILVER: { name: "SILVER", code: "084691", category: "Metals" },
  COPPER: { name: "COPPER", code: "085692", category: "Metals" },
  PLATINUM: { name: "PLATINUM", code: "076651", category: "Metals" },
  PALLADIUM: { name: "PALLADIUM", code: "075651", category: "Metals" },

  // === ENERGY ===
  OIL: { name: "CRUDE OIL (WTI)", code: "067651", category: "Energy" },
  BRENT: { name: "BRENT CRUDE OIL", code: "06765T", category: "Energy" },
  NATGAS: { name: "NATURAL GAS", code: "023651", category: "Energy" },
  GASOLINE: { name: "RBOB GASOLINE", code: "111659", category: "Energy" },
  HEATING: { name: "HEATING OIL", code: "022651", category: "Energy" },

  // === AGRICULTURE ===
  CORN: { name: "CORN", code: "002602", category: "Agriculture" },
  WHEAT: { name: "WHEAT (CBOT)", code: "001602", category: "Agriculture" },
  SOYBEANS: { name: "SOYBEANS", code: "005602", category: "Agriculture" },
  SOYOIL: { name: "SOYBEAN OIL", code: "007601", category: "Agriculture" },
  SOYMEAL: { name: "SOYBEAN MEAL", code: "026603", category: "Agriculture" },
  COTTON: { name: "COTTON NO. 2", code: "033661", category: "Agriculture" },
  SUGAR: { name: "SUGAR NO. 11", code: "080732", category: "Agriculture" },
  COFFEE: { name: "COFFEE C", code: "083731", category: "Agriculture" },
  COCOA: { name: "COCOA", code: "073732", category: "Agriculture" },
  CATTLE: { name: "LIVE CATTLE", code: "057642", category: "Agriculture" },
  HOGS: { name: "LEAN HOGS", code: "054642", category: "Agriculture" },
  LUMBER: { name: "RANDOM LENGTH LUMBER", code: "058643", category: "Agriculture" },

  // === BONDS / RATES ===
  US10Y: { name: "10-YEAR T-NOTES", code: "043602", category: "Bonds" },
  US5Y: { name: "5-YEAR T-NOTES", code: "044601", category: "Bonds" },
  US2Y: { name: "2-YEAR T-NOTES", code: "042601", category: "Bonds" },
  US30Y: { name: "U.S. TREASURY BONDS", code: "020601", category: "Bonds" },
  FEDFUNDS: { name: "30-DAY FEDERAL FUNDS", code: "045601", category: "Bonds" },
  EURODOLLAR: { name: "3-MONTH SOFR", code: "134741", category: "Bonds" },
};

export const COT_CATEGORIES = ["Tous", "Forex", "Indices", "Metals", "Energy", "Agriculture", "Bonds"] as const;

// FRED Series IDs
export const FRED_SERIES: Record<string, { id: string; label: string; unit: string; frequency: string }> = {
  GDP: { id: "GDP", label: "PIB (GDP)", unit: "Mrd $", frequency: "Trimestriel" },
  CPI: { id: "CPIAUCSL", label: "CPI (Inflation)", unit: "Index", frequency: "Mensuel" },
  CORE_CPI: { id: "CPILFESL", label: "Core CPI", unit: "Index", frequency: "Mensuel" },
  NFP: { id: "PAYEMS", label: "NFP (Emplois)", unit: "Milliers", frequency: "Mensuel" },
  UNEMPLOYMENT: { id: "UNRATE", label: "Taux Chômage", unit: "%", frequency: "Mensuel" },
  FED_RATE: { id: "FEDFUNDS", label: "Fed Funds Rate", unit: "%", frequency: "Mensuel" },
  TREASURY_10Y: { id: "DGS10", label: "Trésor 10 ans", unit: "%", frequency: "Quotidien" },
  TREASURY_2Y: { id: "DGS2", label: "Trésor 2 ans", unit: "%", frequency: "Quotidien" },
  DXY: { id: "DTWEXBGS", label: "Dollar Index (DXY)", unit: "Index", frequency: "Quotidien" },
  PCE: { id: "PCEPI", label: "PCE Inflation", unit: "Index", frequency: "Mensuel" },
  RETAIL_SALES: { id: "RSAFS", label: "Ventes au détail", unit: "M $", frequency: "Mensuel" },
  CONSUMER_SENTIMENT: { id: "UMCSENT", label: "Confiance consommateurs", unit: "Index", frequency: "Mensuel" },
  HOUSING_STARTS: { id: "HOUST", label: "Mises en chantier", unit: "Milliers", frequency: "Mensuel" },
  INITIAL_CLAIMS: { id: "ICSA", label: "Inscriptions chômage", unit: "Milliers", frequency: "Hebdomadaire" },
  ISM_MANUFACTURING: { id: "MANEMP", label: "ISM Manufacturier", unit: "Index", frequency: "Mensuel" },
  M2_MONEY_SUPPLY: { id: "M2SL", label: "Masse monétaire M2", unit: "Mrd $", frequency: "Mensuel" },
};

export const CFTC_API_BASE = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
export const CFTC_DISAGGREGATED_API_BASE = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json";
export const FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations";
