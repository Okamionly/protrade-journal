import { NextRequest, NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Normalized response types ──────────────────────────────────────────────

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
  };
  cached: boolean;
  timestamp: string;
}

// ─── Cache (1 hour per symbol) ──────────────────────────────────────────────

const cache = new Map<string, { data: FundamentalsResponse; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Helpers ────────────────────────────────────────────────────────────────

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

function parseNum(val: string | undefined): number | null {
  if (!val || val === "None" || val === "-" || val === "0") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function fetchAV(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, apikey: AV_KEY });
  const res = await fetch(`https://www.alphavantage.co/query?${qs}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  return res.json();
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

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json(
      { error: "Paramètre 'symbol' requis" },
      { status: 400 }
    );
  }

  if (!AV_KEY) {
    return NextResponse.json(
      { error: "Clé API Alpha Vantage non configurée" },
      { status: 500 }
    );
  }

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    // Fetch OVERVIEW + EARNINGS in parallel
    const [overviewRaw, earningsRaw] = await Promise.all([
      fetchAV({ function: "OVERVIEW", symbol }) as Promise<AVOverview>,
      fetchAV({ function: "EARNINGS", symbol }) as Promise<AVEarningsResponse>,
    ]);

    // Alpha Vantage returns { "Note": "..." } on rate limit
    const isRateLimited =
      (overviewRaw as Record<string, string>)["Note"] ||
      (overviewRaw as Record<string, string>)["Information"];

    let overview: CompanyOverview | null = null;
    if (!isRateLimited && overviewRaw.Symbol) {
      overview = normalizeOverview(overviewRaw);
    }

    const earnings = earningsRaw.quarterlyEarnings
      ? normalizeEarnings(earningsRaw)
      : { quarterly: [], annual: [] };

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
    return NextResponse.json(
      {
        error: "Impossible de récupérer les fondamentaux",
        details: e instanceof Error ? e.message : "Erreur inconnue",
      },
      { status: 502 }
    );
  }
}
