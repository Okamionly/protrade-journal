import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  VIX + SPY data endpoint — multi-source fallback chain              */
/*                                                                      */
/*  Priority order:                                                     */
/*    1. CBOE VIX CSV (free, official, no key needed)                  */
/*    2. Yahoo Finance (unreliable, rate-limited)                      */
/*    3. Mock / static fallback with "mock" flag                       */
/*                                                                      */
/*  - 10-minute in-memory cache                                         */
/*  - Returns VIX + SPY current + 30-day history                       */
/* ------------------------------------------------------------------ */

/* ---- Shared types ---- */

interface VixApiResponse {
  vix: {
    current: number;
    previousClose: number;
    changePct: number;
    high: number;
    low: number;
    open: number;
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
  termStructure: {
    label: string;
    value: number;
    symbol: string;
  }[];
  fetchedAt: string;
  source: "cboe" | "yahoo" | "mock";
  sourceDetails: string;
}

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

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: CachedData | null = null;

const FETCH_TIMEOUT = 8000;

/* ================================================================== */
/*  Source 1: CBOE VIX CSV (official, free, no API key)               */
/* ================================================================== */

interface CboeRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

async function fetchCboeVixCsv(): Promise<CboeRow[] | null> {
  try {
    const url = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/csv,*/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    // Parse header — columns: DATE, OPEN, HIGH, LOW, CLOSE
    const header = lines[0].toUpperCase().split(",").map(h => h.trim());
    const dateIdx = header.indexOf("DATE");
    const openIdx = header.indexOf("OPEN");
    const highIdx = header.indexOf("HIGH");
    const lowIdx = header.indexOf("LOW");
    const closeIdx = header.indexOf("CLOSE");

    if (dateIdx < 0 || closeIdx < 0) return null;

    const rows: CboeRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim());
      const close = parseFloat(cols[closeIdx]);
      if (isNaN(close)) continue;
      rows.push({
        date: cols[dateIdx],
        open: openIdx >= 0 ? parseFloat(cols[openIdx]) || close : close,
        high: highIdx >= 0 ? parseFloat(cols[highIdx]) || close : close,
        low: lowIdx >= 0 ? parseFloat(cols[lowIdx]) || close : close,
        close,
      });
    }

    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function parseCboeDate(dateStr: string): string {
  // CBOE dates can be MM/DD/YYYY or YYYY-MM-DD
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [m, d, y] = parts;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return dateStr;
}

async function getVixFromCboe(): Promise<{
  vix: VixApiResponse["vix"];
  sourceDetails: string;
} | null> {
  const rows = await fetchCboeVixCsv();
  if (!rows || rows.length < 5) return null;

  // Get last 60 trading days (more than we need, to be safe)
  const recent = rows.slice(-60);
  const last30 = recent.slice(-30);

  const latest = recent[recent.length - 1];
  const prevDay = recent[recent.length - 2];

  if (!latest || !prevDay) return null;

  const changePct = prevDay.close
    ? Math.round(((latest.close - prevDay.close) / prevDay.close) * 10000) / 100
    : 0;

  return {
    vix: {
      current: Math.round(latest.close * 100) / 100,
      previousClose: Math.round(prevDay.close * 100) / 100,
      changePct,
      high: Math.round(latest.high * 100) / 100,
      low: Math.round(latest.low * 100) / 100,
      open: Math.round(latest.open * 100) / 100,
      history: last30.map(r => Math.round(r.close * 100) / 100),
      dates: last30.map(r => parseCboeDate(r.date)),
    },
    sourceDetails: "CBOE VIX History CSV (official)",
  };
}

/* ================================================================== */
/*  Source 2: Yahoo Finance (existing, unreliable fallback)            */
/* ================================================================== */

async function fetchYahooChart(symbol: string): Promise<YahooChartResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
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

async function getVixFromYahoo(): Promise<{
  vix: VixApiResponse["vix"];
  spy: VixApiResponse["spy"];
  sourceDetails: string;
} | null> {
  const [vixResult, spyResult] = await Promise.all([
    fetchYahooChart("%5EVIX"),
    fetchYahooChart("SPY"),
  ]);

  if (!vixResult || !spyResult) return null;

  const vixParsed = parseYahooResult(vixResult);
  const spyParsed = parseYahooResult(spyResult);

  return {
    vix: {
      ...vixParsed,
      high: 0,
      low: 0,
      open: 0,
    },
    spy: spyParsed,
    sourceDetails: "Yahoo Finance API",
  };
}

/* ================================================================== */
/*  Source 3: SPY for secondary data (when CBOE provides VIX only)    */
/* ================================================================== */

async function getSpyFromYahoo(): Promise<VixApiResponse["spy"] | null> {
  const result = await fetchYahooChart("SPY");
  if (!result) return null;
  const parsed = parseYahooResult(result);
  return parsed;
}

/* ================================================================== */
/*  Mock / fallback data (used when all sources fail)                 */
/* ================================================================== */

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
      high: Math.round((vixCurrent + 0.5) * 100) / 100,
      low: Math.round((vixCurrent - 0.5) * 100) / 100,
      open: Math.round(vixPrev * 100) / 100,
      history: vixHistory.map(v => Math.round(v * 100) / 100),
      dates,
    },
    spy: {
      current: Math.round(spyCurrent * 100) / 100,
      previousClose: Math.round(spyPrev * 100) / 100,
      changePct: Math.round(((spyCurrent - spyPrev) / spyPrev) * 10000) / 100,
      history: spyHistory.map(v => Math.round(v * 100) / 100),
      dates,
    },
    termStructure: getMockTermStructure(vixCurrent),
    fetchedAt: now.toISOString(),
    source: "mock",
    sourceDetails: "Static mock data (all sources failed)",
  };
}

/* ================================================================== */
/*  VIX Futures Term Structure (estimated from spot + contango model) */
/* ================================================================== */

function estimateTermStructure(spotVix: number): VixApiResponse["termStructure"] {
  // VIX futures typically trade at a premium to spot (contango)
  // Mean-reverting model: futures converge toward long-run VIX mean (~19-20)
  const longRunMean = 20;
  const months = [
    { label: "VIX (spot)", symbol: "^VIX", months: 0 },
    { label: "VX1 (1M)", symbol: "VX1", months: 1 },
    { label: "VX2 (2M)", symbol: "VX2", months: 2 },
    { label: "VX3 (3M)", symbol: "VX3", months: 3 },
    { label: "VX4 (4M)", symbol: "VX4", months: 4 },
    { label: "VX5 (5M)", symbol: "VX5", months: 5 },
    { label: "VX6 (6M)", symbol: "VX6", months: 6 },
  ];

  return months.map(m => {
    if (m.months === 0) {
      return { label: m.label, value: Math.round(spotVix * 100) / 100, symbol: m.symbol };
    }
    // Mean-reversion: VIX futures ~ spot + (mean - spot) * (1 - e^(-speed * t))
    const speed = 0.15;
    const t = m.months;
    const futureValue = spotVix + (longRunMean - spotVix) * (1 - Math.exp(-speed * t));
    // Add small contango premium
    const premium = 0.3 * t;
    return {
      label: m.label,
      value: Math.round((futureValue + premium) * 100) / 100,
      symbol: m.symbol,
    };
  });
}

function getMockTermStructure(spotVix: number) {
  return estimateTermStructure(spotVix);
}

/* ================================================================== */
/*  GET handler — fallback chain                                       */
/* ================================================================== */

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Source": cache.data.source, "Cache-Control": "public, max-age=600" },
    });
  }

  const now = new Date().toISOString();
  let response: VixApiResponse | null = null;

  /* ---- Source 1: CBOE CSV for VIX + Yahoo for SPY ---- */
  try {
    const cboeVix = await getVixFromCboe();
    if (cboeVix) {
      // CBOE only gives VIX; try Yahoo for SPY
      const spy = await getSpyFromYahoo();
      const spyData = spy ?? {
        current: 0,
        previousClose: 0,
        changePct: 0,
        history: [] as number[],
        dates: [] as string[],
      };

      response = {
        vix: cboeVix.vix,
        spy: spyData,
        termStructure: estimateTermStructure(cboeVix.vix.current),
        fetchedAt: now,
        source: "cboe",
        sourceDetails: spy
          ? "VIX: CBOE official CSV | SPY: Yahoo Finance"
          : "VIX: CBOE official CSV | SPY: unavailable",
      };
    }
  } catch {
    // Continue to next source
  }

  /* ---- Source 2: Yahoo Finance for both VIX + SPY ---- */
  if (!response) {
    try {
      const yahooData = await getVixFromYahoo();
      if (yahooData) {
        response = {
          vix: yahooData.vix,
          spy: yahooData.spy,
          termStructure: estimateTermStructure(yahooData.vix.current),
          fetchedAt: now,
          source: "yahoo",
          sourceDetails: yahooData.sourceDetails,
        };
      }
    } catch {
      // Continue to mock
    }
  }

  /* ---- Source 3: Mock fallback ---- */
  if (!response) {
    response = getMockData();
  }

  // Cache real data for longer, mock data for less
  const isMock = response.source === "mock";
  cache = { data: response, timestamp: Date.now() };

  return NextResponse.json(response, {
    headers: {
      "X-Cache": "MISS",
      "X-Source": response.source,
      "Cache-Control": isMock ? "public, max-age=60" : "public, max-age=600",
    },
  });
}
