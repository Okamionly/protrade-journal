import { NextResponse } from "next/server";

interface GlobalIndex {
  symbol: string;
  yahooSymbol: string;
  name: string;
  region: string;
}

const GLOBAL_INDICES: GlobalIndex[] = [
  { symbol: "SP500", yahooSymbol: "^GSPC", name: "S&P 500", region: "Americas" },
  { symbol: "DOW", yahooSymbol: "^DJI", name: "Dow Jones", region: "Americas" },
  { symbol: "NASDAQ", yahooSymbol: "^IXIC", name: "Nasdaq", region: "Americas" },
  { symbol: "FTSE", yahooSymbol: "^FTSE", name: "FTSE 100", region: "Europe" },
  { symbol: "DAX", yahooSymbol: "^GDAXI", name: "DAX 40", region: "Europe" },
  { symbol: "CAC40", yahooSymbol: "^FCHI", name: "CAC 40", region: "Europe" },
  { symbol: "STOXX50", yahooSymbol: "^STOXX50E", name: "Euro Stoxx 50", region: "Europe" },
  { symbol: "NIKKEI", yahooSymbol: "^N225", name: "Nikkei 225", region: "Asia" },
  { symbol: "HSI", yahooSymbol: "^HSI", name: "Hang Seng", region: "Asia" },
];

interface GlobalMarketResult {
  symbol: string;
  name: string;
  region: string;
  last: number;
  changepct: number;
  change: number;
  previousClose: number;
}

interface CachedData {
  data: GlobalMarketResult[];
  timestamp: number;
}

let cache: CachedData | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// No mock/fallback data — if Yahoo Finance is unreachable, we return unavailable status

async function fetchYahooQuote(index: GlobalIndex): Promise<GlobalMarketResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.yahooSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const regularMarketPrice = meta?.regularMarketPrice ?? 0;
    const previousClose = meta?.chartPreviousClose ?? meta?.previousClose ?? regularMarketPrice;

    if (regularMarketPrice === 0) return null;

    const change = regularMarketPrice - previousClose;
    const changepct = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: index.symbol,
      name: index.name,
      region: index.region,
      last: regularMarketPrice,
      changepct,
      change,
      previousClose,
    };
  } catch {
    return null;
  }
}

function getUnavailableResult(index: GlobalIndex): GlobalMarketResult {
  return {
    symbol: index.symbol,
    name: index.name,
    region: index.region,
    last: 0,
    changepct: 0,
    change: 0,
    previousClose: 0,
  };
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      s: "ok",
      data: cache.data,
      cached: true,
      live: true,
      timestamp: new Date(cache.timestamp).toISOString(),
    });
  }

  // Fetch all indices in parallel
  const results = await Promise.allSettled(
    GLOBAL_INDICES.map((idx) => fetchYahooQuote(idx))
  );

  const data: GlobalMarketResult[] = [];
  let liveCount = 0;
  let mockCount = 0;

  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      data.push(r.value);
      liveCount++;
    } else {
      // Use cached value if available, otherwise mock
      const cached = cache?.data.find((d) => d.symbol === GLOBAL_INDICES[i].symbol);
      if (cached && cached.last > 0) {
        data.push(cached);
        liveCount++; // Previously live data
      } else {
        data.push(getUnavailableResult(GLOBAL_INDICES[i]));
        mockCount++;
      }
    }
  });

  // Sort by the original order
  const symbolOrder = GLOBAL_INDICES.map((i) => i.symbol);
  data.sort((a, b) => symbolOrder.indexOf(a.symbol) - symbolOrder.indexOf(b.symbol));

  // Determine if we're serving live data
  const isLive = liveCount > 0;

  // Update cache only if we got at least some live data
  if (liveCount > 0) {
    cache = { data, timestamp: Date.now() };
  }

  return NextResponse.json({
    s: "ok",
    data,
    cached: false,
    live: isLive,
    liveCount,
    mockCount,
    timestamp: new Date().toISOString(),
  });
}
