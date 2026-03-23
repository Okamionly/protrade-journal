import { NextRequest, NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AVTickerSentiment {
  ticker: string;
  relevance_score: string;
  ticker_sentiment_score: string;
  ticker_sentiment_label: string;
}

interface AVNewsItem {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  source: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: AVTickerSentiment[];
}

interface AVNewsSentimentResponse {
  feed?: AVNewsItem[];
  Note?: string;
  Information?: string;
}

// ─── Normalized types ───────────────────────────────────────────────────────

interface TickerSentiment {
  ticker: string;
  relevance: number;
  score: number;
  label: string; // "Bullish" | "Somewhat-Bullish" | "Neutral" | "Somewhat-Bearish" | "Bearish"
}

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary: string;
  overallScore: number;
  overallLabel: string;
  tickers: TickerSentiment[];
}

interface NewsSentimentResponse {
  articles: NewsArticle[];
  cached: boolean;
  timestamp: string;
}

// ─── Cache (15 minutes per ticker set) ──────────────────────────────────────

const cache = new Map<string, { data: NewsSentimentResponse; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

function normalizeSentimentLabel(label: string): string {
  const map: Record<string, string> = {
    "Bullish": "Bullish",
    "Somewhat-Bullish": "Haussier modéré",
    "Neutral": "Neutre",
    "Somewhat-Bearish": "Baissier modéré",
    "Bearish": "Bearish",
  };
  return map[label] || label;
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get("tickers")?.toUpperCase().trim();

  if (!tickers) {
    return NextResponse.json(
      { error: "Paramètre 'tickers' requis (ex: ?tickers=AAPL,MSFT)" },
      { status: 400 }
    );
  }

  if (!AV_KEY) {
    return NextResponse.json(
      { error: "Clé API Alpha Vantage non configurée" },
      { status: 500 }
    );
  }

  // Normalize and validate tickers
  const tickerList = tickers.split(",").map((t) => t.trim()).filter(Boolean);
  if (tickerList.length === 0 || tickerList.length > 10) {
    return NextResponse.json(
      { error: "Fournir entre 1 et 10 tickers séparés par des virgules" },
      { status: 400 }
    );
  }

  const cacheKey = tickerList.sort().join(",");

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    const params = new URLSearchParams({
      function: "NEWS_SENTIMENT",
      tickers: tickerList.join(","),
      sort: "LATEST",
      limit: "20",
      apikey: AV_KEY,
    });

    const res = await fetch(
      `https://www.alphavantage.co/query?${params}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

    const raw: AVNewsSentimentResponse = await res.json();

    // Check for rate-limiting
    if (raw.Note || raw.Information) {
      return NextResponse.json(
        {
          error: "Limite de requêtes Alpha Vantage atteinte",
          details: raw.Note || raw.Information,
        },
        { status: 429 }
      );
    }

    const articles: NewsArticle[] = (raw.feed || []).map((item) => ({
      title: item.title,
      url: item.url,
      publishedAt: item.time_published,
      source: item.source,
      summary: item.summary,
      overallScore: item.overall_sentiment_score,
      overallLabel: normalizeSentimentLabel(item.overall_sentiment_label),
      tickers: (item.ticker_sentiment || [])
        .filter((ts) => tickerList.includes(ts.ticker))
        .map((ts) => ({
          ticker: ts.ticker,
          relevance: parseFloat(ts.relevance_score) || 0,
          score: parseFloat(ts.ticker_sentiment_score) || 0,
          label: normalizeSentimentLabel(ts.ticker_sentiment_label),
        })),
    }));

    const response: NewsSentimentResponse = {
      articles,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: response, ts: Date.now() });

    return NextResponse.json(response);
  } catch (e) {
    console.error(`[NewsSentiment] Erreur pour ${tickers}:`, e);
    return NextResponse.json(
      {
        error: "Impossible de récupérer le sentiment des actualités",
        details: e instanceof Error ? e.message : "Erreur inconnue",
      },
      { status: 502 }
    );
  }
}
