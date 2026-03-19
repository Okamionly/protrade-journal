import { NextResponse } from "next/server";

interface GlobalIndex {
  symbol: string;
  yahooSymbol: string;
  name: string;
  region: string;
}

const GLOBAL_INDICES: GlobalIndex[] = [
  { symbol: "SP500", yahooSymbol: "^GSPC", name: "S&P 500", region: "Ameriques" },
  { symbol: "DOW", yahooSymbol: "^DJI", name: "Dow Jones", region: "Ameriques" },
  { symbol: "NASDAQ", yahooSymbol: "^IXIC", name: "Nasdaq", region: "Ameriques" },
  { symbol: "FTSE", yahooSymbol: "^FTSE", name: "FTSE 100", region: "Europe" },
  { symbol: "DAX", yahooSymbol: "^GDAXI", name: "DAX 40", region: "Europe" },
  { symbol: "CAC40", yahooSymbol: "^FCHI", name: "CAC 40", region: "Europe" },
  { symbol: "NIKKEI", yahooSymbol: "^N225", name: "Nikkei 225", region: "Asie" },
  { symbol: "HSI", yahooSymbol: "^HSI", name: "Hang Seng", region: "Asie" },
  { symbol: "SHANGHAI", yahooSymbol: "000001.SS", name: "Shanghai Comp.", region: "Asie" },
];

interface CachedData {
  data: GlobalMarketResult[];
  timestamp: number;
}

interface GlobalMarketResult {
  symbol: string;
  name: string;
  region: string;
  last: number;
  changepct: number;
  change: number;
  previousClose: number;
}

let cache: CachedData | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

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

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      s: "ok",
      data: cache.data,
      cached: true,
      timestamp: new Date(cache.timestamp).toISOString(),
    });
  }

  // Fetch all indices in parallel
  const results = await Promise.allSettled(
    GLOBAL_INDICES.map((idx) => fetchYahooQuote(idx))
  );

  const data: GlobalMarketResult[] = [];
  const fallbackNeeded: GlobalIndex[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      data.push(r.value);
    } else {
      fallbackNeeded.push(GLOBAL_INDICES[i]);
    }
  });

  // For failed fetches, use cached data if available, otherwise use mock fallback
  for (const idx of fallbackNeeded) {
    const cached = cache?.data.find((d) => d.symbol === idx.symbol);
    if (cached) {
      data.push(cached);
    } else {
      // Last resort: static fallback with 0% change
      data.push({
        symbol: idx.symbol,
        name: idx.name,
        region: idx.region,
        last: 0,
        changepct: 0,
        change: 0,
        previousClose: 0,
      });
    }
  }

  // Sort by the original order
  const symbolOrder = GLOBAL_INDICES.map((i) => i.symbol);
  data.sort((a, b) => symbolOrder.indexOf(a.symbol) - symbolOrder.indexOf(b.symbol));

  // Update cache
  cache = { data, timestamp: Date.now() };

  return NextResponse.json({
    s: "ok",
    data,
    cached: false,
    timestamp: new Date().toISOString(),
  });
}
