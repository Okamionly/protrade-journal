import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PriceItem {
  symbol: string;
  price: number;
  change: number; // percent
}

interface LivePricesResponse {
  forex: PriceItem[];
  crypto: PriceItem[];
  commodities: PriceItem[];
  indices: PriceItem[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// 5-minute in-memory cache
// ---------------------------------------------------------------------------
let cache: { data: LivePricesResponse; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Store previous forex rates so we can compute session change %
let prevForexRates: Record<string, number> = {};
// Store session-open prices (first fetch of the day) for daily change calculation
let sessionOpenRates: Record<string, number> = {};
let sessionOpenDate = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function safeFetch(url: string): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Alpha Vantage fallback for individual forex pairs
// ---------------------------------------------------------------------------
const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? "";

async function fetchForexPairAlphaVantage(
  from: string,
  to: string
): Promise<{ rate: number } | null> {
  if (!AV_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`;
    const res = await safeFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rateStr =
      data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
    if (!rateStr) return null;
    return { rate: parseFloat(rateStr) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Forex (open.er-api.com  free, no key — Alpha Vantage fallback)
// ---------------------------------------------------------------------------
async function fetchForex(): Promise<{
  pairs: PriceItem[];
  rates: Record<string, number>;
}> {
  // --- Primary source: open.er-api.com ---
  let r: Record<string, number> = {};
  let primaryOk = false;

  try {
    const res = await safeFetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    r = data.rates ?? {};
    if (Object.keys(r).length > 0) primaryOk = true;
  } catch {
    // primary failed
  }

  // --- Fallback: Alpha Vantage CURRENCY_EXCHANGE_RATE ---
  if (!primaryOk && AV_KEY) {
    const avPairs: { from: string; to: string; key: string }[] = [
      { from: "EUR", to: "USD", key: "EUR" },
      { from: "GBP", to: "USD", key: "GBP" },
      { from: "USD", to: "JPY", key: "JPY" },
      { from: "AUD", to: "USD", key: "AUD" },
      { from: "USD", to: "CAD", key: "CAD" },
      { from: "USD", to: "CHF", key: "CHF" },
      { from: "NZD", to: "USD", key: "NZD" },
    ];
    const results = await Promise.all(
      avPairs.map((p) => fetchForexPairAlphaVantage(p.from, p.to))
    );
    results.forEach((res, i) => {
      if (!res) return;
      const p = avPairs[i];
      // AV returns the rate as from->to, we need USD-based rates like open.er-api
      if (p.from === "USD") {
        // USD/JPY -> JPY rate
        r[p.key] = res.rate;
      } else {
        // EUR/USD -> EUR = 1/rate (since open.er uses USD base)
        r[p.key] = 1 / res.rate;
      }
    });
  }

  if (Object.keys(r).length === 0) {
    return { pairs: [], rates: {} };
  }

  const defs: { symbol: string; value: () => number; decimals: number }[] = [
    { symbol: "EUR/USD", value: () => 1 / (r.EUR || 1), decimals: 4 },
    { symbol: "GBP/USD", value: () => 1 / (r.GBP || 1), decimals: 4 },
    { symbol: "USD/JPY", value: () => r.JPY || 149, decimals: 2 },
    { symbol: "AUD/USD", value: () => 1 / (r.AUD || 1), decimals: 4 },
    { symbol: "USD/CAD", value: () => r.CAD || 1.36, decimals: 4 },
    { symbol: "USD/CHF", value: () => r.CHF || 0.88, decimals: 4 },
    { symbol: "NZD/USD", value: () => 1 / (r.NZD || 1), decimals: 4 },
    { symbol: "EUR/GBP", value: () => (r.GBP || 1) / (r.EUR || 1), decimals: 4 },
    { symbol: "EUR/JPY", value: () => (r.JPY || 149) / (r.EUR || 1), decimals: 2 },
    { symbol: "GBP/JPY", value: () => (r.JPY || 149) / (r.GBP || 1), decimals: 2 },
  ];

  // Track session-open prices for daily change
  const today = new Date().toISOString().slice(0, 10);
  if (sessionOpenDate !== today) {
    sessionOpenDate = today;
    sessionOpenRates = {};
  }

  const pairs: PriceItem[] = defs.map((d) => {
    const price = parseFloat(d.value().toFixed(d.decimals));
    // Store session-open price on first fetch of the day
    if (!sessionOpenRates[d.symbol]) {
      sessionOpenRates[d.symbol] = price;
    }
    // Calculate change from session open (more meaningful than prev tick)
    const openPrice = sessionOpenRates[d.symbol];
    let change = 0;
    if (openPrice && openPrice !== 0) {
      change = parseFloat((((price - openPrice) / openPrice) * 100).toFixed(2));
    }
    // Fallback: use prev tick change if session-open gives 0
    if (change === 0) {
      const prev = prevForexRates[d.symbol];
      if (prev && prev !== 0 && prev !== price) {
        change = parseFloat((((price - prev) / prev) * 100).toFixed(2));
      }
    }
    return { symbol: d.symbol, price, change };
  });

  // Update stored rates for next diff
  defs.forEach((d) => {
    prevForexRates[d.symbol] = parseFloat(d.value().toFixed(d.decimals));
  });

  return { pairs, rates: r };
}

// ---------------------------------------------------------------------------
// Bitcoin  (CoinGecko free endpoint, no key)
// ---------------------------------------------------------------------------
async function fetchCrypto(): Promise<PriceItem[]> {
  try {
    const res = await safeFetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: PriceItem[] = [];
    if (data.bitcoin) {
      items.push({
        symbol: "BTC/USD",
        price: Math.round(data.bitcoin.usd ?? 0),
        change: parseFloat((data.bitcoin.usd_24h_change ?? 0).toFixed(2)),
      });
    }
    if (data.ethereum) {
      items.push({
        symbol: "ETH/USD",
        price: Math.round(data.ethereum.usd ?? 0),
        change: parseFloat((data.ethereum.usd_24h_change ?? 0).toFixed(2)),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Gold XAU/USD
// We try gold-api.com first; fall back to exchange-rate XAU if available.
// ---------------------------------------------------------------------------
async function fetchGold(
  forexRates: Record<string, number>
): Promise<PriceItem[]> {
  // Attempt 1: metals.live API (free, no key, real-time spot)
  try {
    const res = await safeFetch("https://api.metals.live/v1/spot");
    if (res.ok) {
      const data = await res.json();
      const gold = Array.isArray(data) ? data.find((m: { metal: string }) => m.metal === "gold") : null;
      if (gold?.price) {
        return [
          {
            symbol: "XAU/USD",
            price: parseFloat((gold.price as number).toFixed(1)),
            change: 0, // spot API doesn't return change
          },
        ];
      }
    }
  } catch {
    // continue
  }

  // Attempt 2: gold-api.com (free, no key)
  try {
    const res = await safeFetch("https://api.gold-api.com/price/XAU");
    if (res.ok) {
      const data = await res.json();
      if (data.price) {
        return [
          {
            symbol: "XAU/USD",
            price: parseFloat((data.price as number).toFixed(1)),
            change: parseFloat((data.ch ?? data.chp ?? 0).toFixed(2)),
          },
        ];
      }
    }
  } catch {
    // continue
  }

  // Attempt 3: derive from exchange-rate API if it returned XAU
  if (forexRates.XAU && forexRates.XAU > 0) {
    const price = parseFloat((1 / forexRates.XAU).toFixed(1));
    return [{ symbol: "XAU/USD", price, change: 0 }];
  }

  // Attempt 4: Yahoo Finance GLD ETF (tracks gold at ~1/10 oz price)
  try {
    const res = await safeFetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GLD?interval=1d&range=1d"
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        const gldPrice = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? gldPrice;
        const change = prevClose ? parseFloat((((gldPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        return [{ symbol: "XAU/USD", price: parseFloat((gldPrice * 10).toFixed(1)), change }];
      }
    }
  } catch {
    // continue
  }

  return [];
}

// ---------------------------------------------------------------------------
// S&P 500 approximation via Yahoo Finance SPY chart
// ---------------------------------------------------------------------------
async function fetchSP500(): Promise<PriceItem[]> {
  try {
    const res = await safeFetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1d"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return [];
    const price = Math.round(meta.regularMarketPrice ?? 0);
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change =
      prevClose !== 0
        ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
        : 0;
    // SPY tracks S&P 500 at ~1/10 scale; multiply for approximate index value
    return [
      {
        symbol: "S&P 500",
        price: Math.round(price * 10),
        change,
      },
    ];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// DXY approximation
// ICE DXY weights: EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%
// Formula: DXY = 50.14348112 * (EURUSD^-0.576) * (USDJPY^0.136) * (GBPUSD^-0.119)
//          * (USDCAD^0.091) * (USDSEK^0.042) * (USDCHF^0.036)
// ---------------------------------------------------------------------------
function calcDXY(rates: Record<string, number>): PriceItem | null {
  const eur = rates.EUR;
  const jpy = rates.JPY;
  const gbp = rates.GBP;
  const cad = rates.CAD;
  const sek = rates.SEK;
  const chf = rates.CHF;
  if (!eur || !jpy || !gbp || !cad || !sek || !chf) return null;

  const eurusd = 1 / eur;
  const usdjpy = jpy;
  const gbpusd = 1 / gbp;
  const usdcad = cad;
  const usdsek = sek;
  const usdchf = chf;

  const dxy =
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(usdjpy, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(usdcad, 0.091) *
    Math.pow(usdsek, 0.042) *
    Math.pow(usdchf, 0.036);

  const price = parseFloat(dxy.toFixed(2));

  // Compute change from previous cached value
  const prev = prevForexRates["DXY"];
  let change = 0;
  if (prev && prev !== 0) {
    change = parseFloat((((price - prev) / prev) * 100).toFixed(2));
  }
  prevForexRates["DXY"] = price;

  return { symbol: "DXY", price, change };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function GET() {
  // Return cache if still fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  // Fire all fetches in parallel
  const [forexResult, crypto, sp500] = await Promise.all([
    fetchForex(),
    fetchCrypto(),
    fetchSP500(),
  ]);

  const { pairs: forex, rates } = forexResult;

  // Gold needs forex rates as fallback input
  const commodities = await fetchGold(rates);

  // DXY from forex rates
  const dxy = calcDXY(rates);

  const indices: PriceItem[] = [];
  if (sp500.length > 0) indices.push(...sp500);
  if (dxy) indices.push(dxy);

  const result: LivePricesResponse = {
    forex,
    crypto,
    commodities,
    indices,
    timestamp: Date.now(),
  };

  // Populate cache
  cache = { data: result, ts: Date.now() };

  return NextResponse.json(result);
}
