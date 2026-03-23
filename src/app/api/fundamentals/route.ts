import { NextRequest, NextResponse } from "next/server";
import { canMakeRequest, recordRequest } from "@/lib/alphaVantageRateLimit";

// --- Types ---

interface AVOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  EPS: string;
  DividendPerShare: string;
  DividendYield: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  RevenuePerShareTTM: string;
  Beta: string;
  AnalystTargetPrice: string;
  AnalystRatingStrongBuy: string;
  AnalystRatingBuy: string;
  AnalystRatingHold: string;
  AnalystRatingSell: string;
  AnalystRatingStrongSell: string;
  [key: string]: string | undefined;
}

interface AVQuarterlyEarning {
  fiscalDateEnding: string;
  reportedDate: string;
  reportedEPS: string;
  estimatedEPS: string;
  surprise: string;
  surprisePercentage: string;
}

interface AVAnnualEarning {
  fiscalDateEnding: string;
  reportedEPS: string;
}

interface AVEarningsResponse {
  symbol: string;
  annualEarnings: AVAnnualEarning[];
  quarterlyEarnings: AVQuarterlyEarning[];
}

// --- Normalized response types ---

interface CompanyOverview {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: string;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  dividendPerShare: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  movingAvg50: number | null;
  movingAvg200: number | null;
  profitMargin: number | null;
  beta: number | null;
  analystTargetPrice: number | null;
  revenueTTM: number | null;
}

interface QuarterlyEarning {
  fiscalDate: string;
  reportedDate: string;
  epsActual: number | null;
  epsEstimate: number | null;
  surprise: number | null;
  surprisePercent: number | null;
}

interface AnnualEarning {
  fiscalDate: string;
  eps: number | null;
}

interface FundamentalsResponse {
  overview: CompanyOverview | null;
  earnings: {
    quarterly: QuarterlyEarning[];
    annual: AnnualEarning[];
  } | null;
  cached: boolean;
  timestamp: string;
  demo?: boolean;
}

// --- Cache (6 hours per symbol) ---

const cache = new Map<string, { data: FundamentalsResponse; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// --- No hardcoded fallback data — return error when API unavailable ---

// --- Helpers ---

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

function parseNum(val: string | undefined): number | null {
  if (!val || val === "None" || val === "-" || val === "0") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function fetchAV(params: Record<string, string>): Promise<unknown> {
  if (!canMakeRequest()) return null;
  recordRequest();

  const qs = new URLSearchParams({ ...params, apikey: AV_KEY });
  const res = await fetch(`https://www.alphavantage.co/query?${qs}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const json = await res.json();

  // Check for rate limit
  if (
    (json as Record<string, string>)["Note"] ||
    (json as Record<string, string>)["Information"]
  ) {
    return null;
  }

  return json;
}

function normalizeOverview(raw: AVOverview): CompanyOverview {
  return {
    symbol: raw.Symbol || "",
    name: raw.Name || "",
    sector: raw.Sector || "",
    industry: raw.Industry || "",
    exchange: raw.Exchange || "",
    currency: raw.Currency || "",
    marketCap: parseNum(raw.MarketCapitalization),
    peRatio: parseNum(raw.PERatio),
    eps: parseNum(raw.EPS),
    dividendPerShare: parseNum(raw.DividendPerShare),
    dividendYield: parseNum(raw.DividendYield),
    week52High: parseNum(raw["52WeekHigh"]),
    week52Low: parseNum(raw["52WeekLow"]),
    movingAvg50: parseNum(raw["50DayMovingAverage"]),
    movingAvg200: parseNum(raw["200DayMovingAverage"]),
    profitMargin: parseNum(raw.ProfitMargin),
    beta: parseNum(raw.Beta),
    analystTargetPrice: parseNum(raw.AnalystTargetPrice),
    revenueTTM: parseNum(raw.RevenueTTM),
  };
}

function normalizeEarnings(raw: AVEarningsResponse) {
  const quarterly: QuarterlyEarning[] = (raw.quarterlyEarnings || [])
    .slice(0, 8)
    .map((q) => ({
      fiscalDate: q.fiscalDateEnding,
      reportedDate: q.reportedDate,
      epsActual: parseNum(q.reportedEPS),
      epsEstimate: parseNum(q.estimatedEPS),
      surprise: parseNum(q.surprise),
      surprisePercent: parseNum(q.surprisePercentage),
    }));

  const annual: AnnualEarning[] = (raw.annualEarnings || [])
    .slice(0, 5)
    .map((a) => ({
      fiscalDate: a.fiscalDateEnding,
      eps: parseNum(a.reportedEPS),
    }));

  return { quarterly, annual };
}

// --- GET handler ---

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json(
      { error: "Param\u00e8tre 'symbol' requis" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  // If no API key or rate limited, return error or expired cache
  if (!AV_KEY || !canMakeRequest()) {
    if (cached) {
      return NextResponse.json({ ...cached.data, cached: true, rateLimited: true });
    }
    return NextResponse.json(
      { error: "Données indisponibles", overview: null, earnings: null, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }

  try {
    // Fetch OVERVIEW + EARNINGS sequentially to respect rate limits
    const overviewRaw = await fetchAV({ function: "OVERVIEW", symbol }) as AVOverview | null;
    const earningsRaw = await fetchAV({ function: "EARNINGS", symbol }) as AVEarningsResponse | null;

    let overview: CompanyOverview | null = null;
    if (overviewRaw && overviewRaw.Symbol) {
      overview = normalizeOverview(overviewRaw);
    }

    const earnings = earningsRaw && earningsRaw.quarterlyEarnings
      ? normalizeEarnings(earningsRaw)
      : null;

    const response: FundamentalsResponse = {
      overview,
      earnings,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    cache.set(symbol, { data: response, ts: Date.now() });

    return NextResponse.json(response);
  } catch (e) {
    console.error(`[Fundamentals] Erreur pour ${symbol}:`, e);

    // Return error — no fake data
    if (cached) {
      return NextResponse.json({ ...cached.data, cached: true });
    }
    return NextResponse.json(
      { error: "Données indisponibles", overview: null, earnings: null, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
