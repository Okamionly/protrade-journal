import { NextResponse } from "next/server";

// ============================================================
// Finnhub Social Sentiment — Reddit + Twitter mentions & scores
// GET /api/market-data/social-sentiment
// ============================================================

const SYMBOLS = ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT"];
const CACHE_TTL = 15 * 60 * 1000; // 15 min

interface SocialSentimentEntry {
  symbol: string;
  reddit: { mention: number; positiveScore: number; negativeScore: number; score: number };
  twitter: { mention: number; positiveScore: number; negativeScore: number; score: number };
}

interface CachedData {
  data: SocialSentimentEntry[];
  ts: number;
}

let cache: CachedData | null = null;

function getDateRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return { from, to };
}

interface FinnhubSocialData {
  reddit?: Array<{
    mention: number;
    positiveScore: number;
    negativeScore: number;
    score: number;
  }>;
  twitter?: Array<{
    mention: number;
    positiveScore: number;
    negativeScore: number;
    score: number;
  }>;
}

async function fetchSymbolSentiment(symbol: string, apiKey: string): Promise<SocialSentimentEntry | null> {
  const { from } = getDateRange();
  const url = `https://finnhub.io/api/v1/stock/social-sentiment?symbol=${symbol}&from=${from}&token=${apiKey}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data: FinnhubSocialData = await res.json();

    // Aggregate last 7 days
    const redditArr = data.reddit || [];
    const twitterArr = data.twitter || [];

    const sumArr = (arr: Array<{ mention: number; positiveScore: number; negativeScore: number; score: number }>) => {
      if (arr.length === 0) return { mention: 0, positiveScore: 0, negativeScore: 0, score: 0 };
      const total = arr.reduce(
        (acc, d) => ({
          mention: acc.mention + (d.mention || 0),
          positiveScore: acc.positiveScore + (d.positiveScore || 0),
          negativeScore: acc.negativeScore + (d.negativeScore || 0),
          score: acc.score + (d.score || 0),
        }),
        { mention: 0, positiveScore: 0, negativeScore: 0, score: 0 }
      );
      return {
        mention: total.mention,
        positiveScore: Math.round((total.positiveScore / arr.length) * 1000) / 1000,
        negativeScore: Math.round((total.negativeScore / arr.length) * 1000) / 1000,
        score: Math.round((total.score / arr.length) * 1000) / 1000,
      };
    };

    return {
      symbol,
      reddit: sumArr(redditArr),
      twitter: sumArr(twitterArr),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data }, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=900" },
    });
  }

  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
  }

  const results = await Promise.allSettled(
    SYMBOLS.map((s) => fetchSymbolSentiment(s, apiKey))
  );

  const data: SocialSentimentEntry[] = results
    .filter((r): r is PromiseFulfilledResult<SocialSentimentEntry | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is SocialSentimentEntry => v !== null);

  cache = { data, ts: Date.now() };

  return NextResponse.json({ data }, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=900" },
  });
}
