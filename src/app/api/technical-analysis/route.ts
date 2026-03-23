import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface IndicatorResult {
  value?: number;
  signal?: string;
  macd?: number;
  macdSignal?: number;
  histogram?: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  ema50?: number;
  upper?: number;
  middle?: number;
  lower?: number;
  bandwidth?: number;
  percentK?: number;
  percentD?: number;
  atr?: number;
  adx?: number;
  raw?: Record<string, unknown>;
}

interface CachedData {
  data: Record<string, IndicatorResult>;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (30 min per symbol)
// ---------------------------------------------------------------------------
const cache = new Map<string, CachedData>();
const CACHE_TTL = 30 * 60 * 1000;

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";
const BASE_URL = "https://www.alphavantage.co/query";

// ---------------------------------------------------------------------------
// Alpha Vantage fetcher helpers
// ---------------------------------------------------------------------------

async function fetchIndicator(
  fn: string,
  symbol: string,
  extra: Record<string, string> = {}
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    function: fn,
    symbol,
    interval: "daily",
    series_type: "close",
    apikey: API_KEY,
    ...extra,
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Alpha Vantage returns error messages when rate limited
    if (json["Note"] || json["Error Message"] || json["Information"]) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

function getLatestValue(
  data: Record<string, unknown> | null,
  metaKey: string
): Record<string, string> | null {
  if (!data) return null;
  // Find the "Technical Analysis: XXX" key
  const analysisKey = Object.keys(data).find(
    (k) => k.startsWith("Technical Analysis") || k === metaKey
  );
  if (!analysisKey || typeof data[analysisKey] !== "object") return null;

  const series = data[analysisKey] as Record<string, Record<string, string>>;
  const dates = Object.keys(series).sort().reverse();
  return dates.length > 0 ? series[dates[0]] : null;
}

function getLatestTwoValues(
  data: Record<string, unknown> | null,
  metaKey: string
): [Record<string, string> | null, Record<string, string> | null] {
  if (!data) return [null, null];
  const analysisKey = Object.keys(data).find(
    (k) => k.startsWith("Technical Analysis") || k === metaKey
  );
  if (!analysisKey || typeof data[analysisKey] !== "object") return [null, null];

  const series = data[analysisKey] as Record<string, Record<string, string>>;
  const dates = Object.keys(series).sort().reverse();
  return [
    dates.length > 0 ? series[dates[0]] : null,
    dates.length > 1 ? series[dates[1]] : null,
  ];
}

// ---------------------------------------------------------------------------
// Parse individual indicators
// ---------------------------------------------------------------------------

async function parseRSI(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("RSI", symbol, { time_period: "14" });
  const latest = getLatestValue(data, "Technical Analysis: RSI");
  if (!latest) return { value: 0, signal: "neutral" };

  const val = parseFloat(latest["RSI"]);
  let signal = "neutral";
  if (val > 70) signal = "bearish";
  else if (val < 30) signal = "bullish";
  else if (val > 60) signal = "slightly_bearish";
  else if (val < 40) signal = "slightly_bullish";

  return { value: Math.round(val * 100) / 100, signal };
}

async function parseMACD(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("MACD", symbol);
  const [latest, prev] = getLatestTwoValues(data, "Technical Analysis: MACD");
  if (!latest) return { macd: 0, macdSignal: 0, histogram: 0, signal: "neutral" };

  const macd = parseFloat(latest["MACD"]);
  const sig = parseFloat(latest["MACD_Signal"]);
  const hist = parseFloat(latest["MACD_Hist"]);

  let signal = "neutral";
  if (prev) {
    const prevHist = parseFloat(prev["MACD_Hist"]);
    if (hist > 0 && prevHist <= 0) signal = "bullish";
    else if (hist < 0 && prevHist >= 0) signal = "bearish";
    else if (hist > 0 && hist > prevHist) signal = "bullish";
    else if (hist < 0 && hist < prevHist) signal = "bearish";
    else if (hist > 0) signal = "slightly_bullish";
    else if (hist < 0) signal = "slightly_bearish";
  } else {
    signal = hist > 0 ? "bullish" : hist < 0 ? "bearish" : "neutral";
  }

  return {
    macd: Math.round(macd * 10000) / 10000,
    macdSignal: Math.round(sig * 10000) / 10000,
    histogram: Math.round(hist * 10000) / 10000,
    signal,
  };
}

async function parseSMA(symbol: string): Promise<IndicatorResult> {
  const [data20, data50] = await Promise.all([
    fetchIndicator("SMA", symbol, { time_period: "20" }),
    fetchIndicator("SMA", symbol, { time_period: "50" }),
  ]);

  const v20 = getLatestValue(data20, "Technical Analysis: SMA");
  const v50 = getLatestValue(data50, "Technical Analysis: SMA");

  if (!v20 || !v50) return { sma20: 0, sma50: 0, signal: "neutral" };

  const sma20 = parseFloat(v20["SMA"]);
  const sma50 = parseFloat(v50["SMA"]);
  const signal = sma20 > sma50 ? "bullish" : sma20 < sma50 ? "bearish" : "neutral";

  return {
    sma20: Math.round(sma20 * 10000) / 10000,
    sma50: Math.round(sma50 * 10000) / 10000,
    signal,
  };
}

async function parseEMA(symbol: string): Promise<IndicatorResult> {
  const [data20, data50] = await Promise.all([
    fetchIndicator("EMA", symbol, { time_period: "20" }),
    fetchIndicator("EMA", symbol, { time_period: "50" }),
  ]);

  const v20 = getLatestValue(data20, "Technical Analysis: EMA");
  const v50 = getLatestValue(data50, "Technical Analysis: EMA");

  if (!v20 || !v50) return { ema20: 0, ema50: 0, signal: "neutral" };

  const ema20 = parseFloat(v20["EMA"]);
  const ema50 = parseFloat(v50["EMA"]);
  const signal = ema20 > ema50 ? "bullish" : ema20 < ema50 ? "bearish" : "neutral";

  return {
    ema20: Math.round(ema20 * 10000) / 10000,
    ema50: Math.round(ema50 * 10000) / 10000,
    signal,
  };
}

async function parseBBANDS(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("BBANDS", symbol, { time_period: "20" });
  const latest = getLatestValue(data, "Technical Analysis: BBANDS");
  if (!latest) return { upper: 0, middle: 0, lower: 0, bandwidth: 0, signal: "neutral" };

  const upper = parseFloat(latest["Real Upper Band"]);
  const middle = parseFloat(latest["Real Middle Band"]);
  const lower = parseFloat(latest["Real Lower Band"]);
  const bandwidth = ((upper - lower) / middle) * 100;

  let signal = "neutral";
  if (bandwidth < 2) signal = "squeeze";
  else if (bandwidth > 6) signal = "expansion";

  return {
    upper: Math.round(upper * 10000) / 10000,
    middle: Math.round(middle * 10000) / 10000,
    lower: Math.round(lower * 10000) / 10000,
    bandwidth: Math.round(bandwidth * 100) / 100,
    signal,
  };
}

async function parseSTOCH(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("STOCH", symbol);
  const latest = getLatestValue(data, "Technical Analysis: STOCH");
  if (!latest) return { percentK: 0, percentD: 0, signal: "neutral" };

  const k = parseFloat(latest["SlowK"]);
  const d = parseFloat(latest["SlowD"]);

  let signal = "neutral";
  if (k > 80 && d > 80) signal = "bearish";
  else if (k < 20 && d < 20) signal = "bullish";
  else if (k > d && k < 80) signal = "slightly_bullish";
  else if (k < d && k > 20) signal = "slightly_bearish";

  return {
    percentK: Math.round(k * 100) / 100,
    percentD: Math.round(d * 100) / 100,
    signal,
  };
}

async function parseADX(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("ADX", symbol, { time_period: "14" });
  const latest = getLatestValue(data, "Technical Analysis: ADX");
  if (!latest) return { adx: 0, signal: "neutral" };

  const adx = parseFloat(latest["ADX"]);

  let signal = "neutral";
  if (adx < 20) signal = "no_trend";
  else if (adx < 25) signal = "weak_trend";
  else if (adx < 40) signal = "trend";
  else signal = "strong_trend";

  return { adx: Math.round(adx * 100) / 100, signal };
}

async function parseATR(symbol: string): Promise<IndicatorResult> {
  const data = await fetchIndicator("ATR", symbol, { time_period: "14" });
  const latest = getLatestValue(data, "Technical Analysis: ATR");
  if (!latest) return { atr: 0, signal: "neutral" };

  const atr = parseFloat(latest["ATR"]);

  let signal = "neutral";
  if (atr > 0.015) signal = "high_volatility";
  else if (atr < 0.005) signal = "low_volatility";

  return {
    atr: Math.round(atr * 100000) / 100000,
    signal,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
const INDICATOR_PARSERS: Record<string, (sym: string) => Promise<IndicatorResult>> = {
  RSI: parseRSI,
  MACD: parseMACD,
  SMA: parseSMA,
  EMA: parseEMA,
  BBANDS: parseBBANDS,
  STOCH: parseSTOCH,
  ADX: parseADX,
  ATR: parseATR,
};

const ALL_INDICATORS = Object.keys(INDICATOR_PARSERS);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "EURUSD").toUpperCase();
  const requestedIndicators = searchParams.get("indicators")
    ? searchParams.get("indicators")!.split(",").map((s) => s.trim().toUpperCase())
    : ALL_INDICATORS;

  // Validate indicators
  const validIndicators = requestedIndicators.filter((i) => INDICATOR_PARSERS[i]);

  // Check cache
  const cacheKey = `${symbol}:${validIndicators.sort().join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      symbol,
      indicators: cached.data,
      cached: true,
      timestamp: cached.timestamp,
    });
  }

  // Fetch all indicators in parallel
  const results: Record<string, IndicatorResult> = {};
  const promises = validIndicators.map(async (name) => {
    try {
      results[name] = await INDICATOR_PARSERS[name](symbol);
    } catch {
      results[name] = { signal: "error" };
    }
  });

  await Promise.all(promises);

  // Cache result
  cache.set(cacheKey, { data: results, timestamp: Date.now() });

  return NextResponse.json({
    symbol,
    indicators: results,
    cached: false,
    timestamp: Date.now(),
  });
}
