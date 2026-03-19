import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Yahoo Finance VIX + SPY data endpoint                              */
/*  - Fetches ^VIX and SPY 1-month daily data                         */
/*  - 10-minute in-memory cache                                        */
/*  - Falls back to mock data if Yahoo is unreachable                  */
/* ------------------------------------------------------------------ */

interface YahooChartResult {
  meta: {
    regularMarketPrice: number;
    previousClose: number;
    symbol: string;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{
      close: (number | null)[];
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      volume: (number | null)[];
    }>;
  };
}

interface CachedData {
  data: VixApiResponse;
  timestamp: number;
}

interface VixApiResponse {
  vix: {
    current: number;
    previousClose: number;
    changePct: number;
    history: number[];
    dates: string[];
  };
  spy: {
    current: number;
    previousClose: number;
    changePct: number;
    history: number[];
    dates: string[];
  };
  fetchedAt: string;
  source: "yahoo" | "mock";
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: CachedData | null = null;

/* ---- Mock fallback data ---- */
function getMockData(): VixApiResponse {
  const now = new Date();
  const dates: string[] = [];
  const vixHistory: number[] = [];
  const spyHistory: number[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    dates.push(d.toISOString().slice(0, 10));
    vixHistory.push(18.2 + Math.sin(i * 0.3) * 3 + Math.random() * 1.5);
    spyHistory.push(580 + Math.cos(i * 0.2) * 8 + Math.random() * 3);
  }

  const vixCurrent = vixHistory[vixHistory.length - 1];
  const vixPrev = vixHistory[vixHistory.length - 2] || vixCurrent;
  const spyCurrent = spyHistory[spyHistory.length - 1];
  const spyPrev = spyHistory[spyHistory.length - 2] || spyCurrent;

  return {
    vix: {
      current: Math.round(vixCurrent * 100) / 100,
      previousClose: Math.round(vixPrev * 100) / 100,
      changePct: Math.round(((vixCurrent - vixPrev) / vixPrev) * 10000) / 100,
      history: vixHistory.map((v) => Math.round(v * 100) / 100),
      dates,
    },
    spy: {
      current: Math.round(spyCurrent * 100) / 100,
      previousClose: Math.round(spyPrev * 100) / 100,
      changePct: Math.round(((spyCurrent - spyPrev) / spyPrev) * 10000) / 100,
      history: spyHistory.map((v) => Math.round(v * 100) / 100),
      dates,
    },
    fetchedAt: now.toISOString(),
    source: "mock",
  };
}

/* ---- Fetch from Yahoo Finance ---- */
async function fetchYahooChart(symbol: string): Promise<YahooChartResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) return null;

    return result as YahooChartResult;
  } catch {
    return null;
  }
}

function parseYahooResult(result: YahooChartResult) {
  const closes: number[] = [];
  const dates: string[] = [];
  const rawCloses = result.indicators.quote[0].close;
  const timestamps = result.timestamp;

  for (let i = 0; i < timestamps.length; i++) {
    const c = rawCloses[i];
    if (c != null && !isNaN(c)) {
      closes.push(Math.round(c * 100) / 100);
      const d = new Date(timestamps[i] * 1000);
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  const current = result.meta.regularMarketPrice;
  const previousClose = result.meta.previousClose;
  const changePct = previousClose ? Math.round(((current - previousClose) / previousClose) * 10000) / 100 : 0;

  return {
    current: Math.round(current * 100) / 100,
    previousClose: Math.round(previousClose * 100) / 100,
    changePct,
    history: closes,
    dates,
  };
}

/* ---- GET handler ---- */
export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=600" },
    });
  }

  // Fetch VIX and SPY in parallel
  const [vixResult, spyResult] = await Promise.all([
    fetchYahooChart("%5EVIX"),
    fetchYahooChart("SPY"),
  ]);

  if (vixResult && spyResult) {
    const data: VixApiResponse = {
      vix: parseYahooResult(vixResult),
      spy: parseYahooResult(spyResult),
      fetchedAt: new Date().toISOString(),
      source: "yahoo",
    };

    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=600" },
    });
  }

  // Fallback to mock
  const mockData = getMockData();
  return NextResponse.json(mockData, {
    headers: { "X-Cache": "MOCK", "Cache-Control": "public, max-age=60" },
  });
}
