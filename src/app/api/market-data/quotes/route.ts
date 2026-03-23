import { NextResponse } from "next/server";

const MARKETDATA_API_KEY = process.env.MARKETDATA_API_KEY;
const MARKETDATA_BASE = "https://api.marketdata.app/v1";

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

// Simple in-memory cache for Finnhub results (60s TTL)
const finnhubCache: { data: Record<string, unknown> | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

interface FinnhubQuote {
  c: number;  // current price
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  d: number;  // change
  dp: number; // change percent
}

async function fetchFromMarketData(symbols: string): Promise<Response | null> {
  if (!MARKETDATA_API_KEY) return null;
  try {
    const res = await fetch(
      `${MARKETDATA_BASE}/stocks/quotes/?symbols=${encodeURIComponent(symbols)}&52week=true`,
      {
        headers: { Authorization: `Token ${MARKETDATA_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) return res;
    console.warn(`MarketData.app returned ${res.status}`);
    return null;
  } catch (e) {
    console.warn("MarketData.app fetch error:", e);
    return null;
  }
}

async function fetchFromFinnhub(symbols: string[]): Promise<Record<string, unknown> | null> {
  if (!FINNHUB_API_KEY) return null;

  // Check cache
  const now = Date.now();
  const cacheKey = symbols.sort().join(",");
  if (finnhubCache.data && now - finnhubCache.ts < CACHE_TTL) {
    // Verify cache has all requested symbols
    const cached = finnhubCache.data as { symbol?: string[] };
    if (cached.symbol) {
      const cachedSymbols = new Set(cached.symbol);
      if (symbols.every((s) => cachedSymbols.has(s))) {
        return finnhubCache.data;
      }
    }
  }

  try {
    // Fetch quotes for each symbol from Finnhub
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_API_KEY}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const q: FinnhubQuote = await res.json();
        // Finnhub returns all zeros for unknown symbols
        if (q.c === 0 && q.h === 0 && q.l === 0) return null;
        return { symbol: sym, quote: q };
      })
    );

    const validResults = results
      .filter(
        (r): r is PromiseFulfilledResult<{ symbol: string; quote: FinnhubQuote } | null> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      .filter((r): r is { symbol: string; quote: FinnhubQuote } => r !== null);

    if (validResults.length === 0) return null;

    // Build MarketData.app-compatible response format (parallel arrays)
    const data: Record<string, unknown> = {
      s: "ok",
      symbol: validResults.map((r) => r.symbol),
      last: validResults.map((r) => r.quote.c),
      change: validResults.map((r) => r.quote.d),
      changepct: validResults.map((r) => r.quote.dp),
      volume: validResults.map(() => 0), // Finnhub quote endpoint doesn't return volume
      bid: validResults.map((r) => r.quote.c),   // Approximate
      ask: validResults.map((r) => r.quote.c),   // Approximate
      high: validResults.map((r) => r.quote.h),
      low: validResults.map((r) => r.quote.l),
      open: validResults.map((r) => r.quote.o),
      previousClose: validResults.map((r) => r.quote.pc),
      "52weekHigh": validResults.map(() => null), // Not available from Finnhub quote
      "52weekLow": validResults.map(() => null),
      _source: "finnhub",
    };

    // Update cache
    finnhubCache.data = data;
    finnhubCache.ts = now;

    return data;
  } catch (e) {
    console.warn("Finnhub fetch error:", e);
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  // 1) Try MarketData.app (primary)
  const mdRes = await fetchFromMarketData(symbols);
  if (mdRes) {
    try {
      const data = await mdRes.json();
      return NextResponse.json(data);
    } catch {
      // fall through to Finnhub
    }
  }

  // 2) Try Finnhub (fallback)
  const symbolList = symbols.split(",").map((s) => s.trim()).filter(Boolean);
  const finnhubData = await fetchFromFinnhub(symbolList);
  if (finnhubData) {
    return NextResponse.json(finnhubData);
  }

  // 3) All sources failed
  return NextResponse.json(
    { error: "All quote sources unavailable", s: "error" },
    { status: 503 }
  );
}
