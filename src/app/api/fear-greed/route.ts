import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Fear & Greed Index API                                             */
/*  - Primary: alternative.me crypto FNG                               */
/*  - Fallback: composite calculation from VIX + SPY + BTC             */
/*  - 1-hour in-memory cache (FNG updates daily)                       */
/* ------------------------------------------------------------------ */

interface CachedFNG {
  data: { data: Array<{ value: string; value_classification: string; timestamp: string }> };
  ts: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let fngCache: CachedFNG | null = null;

/** Classify a 0-100 score into a sentiment label */
function classifyScore(score: number): string {
  if (score <= 24) return "Extreme Fear";
  if (score <= 44) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 74) return "Greed";
  return "Extreme Greed";
}

/** Calculate composite FNG from VIX, SPY change%, BTC change% */
async function calculateFallbackFNG(): Promise<{
  value: string;
  value_classification: string;
  timestamp: string;
} | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const [vixRes, pricesRes] = await Promise.all([
      fetch(`${baseUrl}/api/market-data/vix`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      fetch(`${baseUrl}/api/live-prices`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
    ]);

    let vixLevel = 20; // default
    let spyChange = 0;
    let btcChange = 0;

    if (vixRes?.ok) {
      const vixData = await vixRes.json();
      vixLevel = vixData?.vix?.current ?? 20;
    }

    if (pricesRes?.ok) {
      const pricesData = await pricesRes.json();
      const spy = pricesData?.indices?.find((i: { symbol: string }) => i.symbol === "S&P 500");
      const btc = pricesData?.crypto?.find((c: { symbol: string }) => c.symbol === "BTC/USD");
      spyChange = spy?.change ?? 0;
      btcChange = btc?.change ?? 0;
    }

    // Formula: score = 50 + (spy_change * 8) - (vix - 20) * 1.5 + (btc_change * 2)
    const raw = 50 + (spyChange * 8) - (vixLevel - 20) * 1.5 + (btcChange * 2);
    const score = Math.round(Math.max(0, Math.min(100, raw)));

    return {
      value: String(score),
      value_classification: classifyScore(score),
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);

  // Check cache (1-hour TTL)
  if (fngCache && Date.now() - fngCache.ts < CACHE_TTL) {
    // Return cached data, sliced to requested days
    const sliced = {
      ...fngCache.data,
      data: fngCache.data.data.slice(0, days),
    };
    return NextResponse.json(sliced, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=3600" },
    });
  }

  // Try the alternative.me API first
  try {
    const res = await fetch(
      `https://api.alternative.me/fng/?limit=${days}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        // Cache the full response
        fngCache = { data, ts: Date.now() };
        return NextResponse.json(data, {
          headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=3600" },
        });
      }
    }
  } catch {
    // API unreachable, fall through to fallback
  }

  // Fallback: calculate composite FNG
  const fallback = await calculateFallbackFNG();

  if (fallback) {
    const fallbackData = { data: [fallback] };
    // Cache fallback for shorter period (30 min)
    fngCache = { data: fallbackData, ts: Date.now() - CACHE_TTL / 2 };
    return NextResponse.json(fallbackData, {
      headers: { "X-Cache": "CALCULATED", "Cache-Control": "public, max-age=1800" },
    });
  }

  // Last resort: return cached data even if stale
  if (fngCache) {
    const sliced = {
      ...fngCache.data,
      data: fngCache.data.data.slice(0, days),
    };
    return NextResponse.json(sliced, {
      headers: { "X-Cache": "STALE", "Cache-Control": "public, max-age=300" },
    });
  }

  return NextResponse.json(
    { error: "Fear & Greed data unavailable" },
    { status: 503 }
  );
}
