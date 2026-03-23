import { NextResponse } from "next/server";

// ============================================================
// Types
// ============================================================

interface TrumpNewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "bullish" | "bearish" | "neutral";
  imageUrl: string;
}

// ============================================================
// Cache (5 min)
// ============================================================

let cachedArticles: TrumpNewsArticle[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

// ============================================================
// Sentiment analysis (keyword-based)
// ============================================================

const BULLISH_KEYWORDS = [
  "deal", "accord", "agreement", "rally", "surge", "boost", "gain",
  "optimism", "positive", "growth", "recovery", "ease", "relief",
  "suspend", "pause", "reduce", "lower", "cut", "stimulus",
  "negotiation", "compromise", "peace", "haussier", "hausse",
  "reprise", "amelioration", "assouplissement",
];

const BEARISH_KEYWORDS = [
  "tariff", "tarifs", "sanction", "war", "guerre", "threat", "menace",
  "crash", "plunge", "fear", "risk", "escalate", "retaliation",
  "ban", "restrict", "penalty", "punish", "tax", "duty", "levy",
  "recession", "slowdown", "decline", "sell-off", "selloff",
  "baissier", "baisse", "chute", "effondrement", "represailles",
  "tension", "conflit", "crise",
];

function analyzeSentiment(title: string): "bullish" | "bearish" | "neutral" {
  const lower = title.toLowerCase();
  let bullScore = 0;
  let bearScore = 0;

  for (const kw of BULLISH_KEYWORDS) {
    if (lower.includes(kw)) bullScore++;
  }
  for (const kw of BEARISH_KEYWORDS) {
    if (lower.includes(kw)) bearScore++;
  }

  if (bearScore > bullScore) return "bearish";
  if (bullScore > bearScore) return "bullish";
  return "neutral";
}

// ============================================================
// MarketAux sentiment: use API's entity sentiment_score when available
// Map: score > 0.3 = bullish, score < -0.3 = bearish, else neutral
// ============================================================

function marketAuxSentiment(item: Record<string, unknown>): "bullish" | "bearish" | "neutral" {
  try {
    const entities = item.entities as Array<{ sentiment_score?: number }> | undefined;
    if (entities && entities.length > 0) {
      // Average sentiment across all entities in the article
      const scores = entities
        .map((e) => e.sentiment_score)
        .filter((s): s is number => typeof s === "number");
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg > 0.3) return "bullish";
        if (avg < -0.3) return "bearish";
        return "neutral";
      }
    }
  } catch {
    // fall through to keyword fallback
  }
  // Fallback: keyword-based (should rarely trigger for MarketAux)
  return analyzeSentiment((item.title as string) || "");
}

// ============================================================
// Source 1: MarketAux
// ============================================================

async function fetchMarketAux(): Promise<TrumpNewsArticle[]> {
  const apiKey = process.env.MARKETAUX_API_KEY || "demo";
  const url = `https://api.marketaux.com/v1/news/all?filter_entities=true&search=trump+tariff+trade+sanctions&language=en&api_token=${apiKey}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: Record<string, unknown>) => ({
      title: (item.title as string) || "",
      description: (item.description as string)?.slice(0, 300) || "",
      url: (item.url as string) || "",
      source: "MarketAux",
      publishedAt: (item.published_at as string) || new Date().toISOString(),
      sentiment: marketAuxSentiment(item),
      imageUrl: (item.image_url as string) || "",
    }));
  } catch {
    console.warn("[trump-news] MarketAux fetch failed");
    return [];
  }
}

// ============================================================
// Source 2: Finnhub (reuse pattern from /api/news)
// ============================================================

async function fetchFinnhub(): Promise<TrumpNewsArticle[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const trumpKeywords = ["trump", "tariff", "tarifs", "trade war", "sanctions", "douane", "guerre commerciale", "droits de douane"];

    return data
      .filter((item: Record<string, unknown>) => {
        const text = `${item.headline} ${item.summary}`.toLowerCase();
        return trumpKeywords.some((kw) => text.includes(kw));
      })
      .slice(0, 15)
      .map((item: Record<string, unknown>) => ({
        title: (item.headline as string) || "",
        description: ((item.summary as string) || "").slice(0, 300),
        url: (item.url as string) || "",
        source: "Finnhub",
        publishedAt: item.datetime
          ? new Date((item.datetime as number) * 1000).toISOString()
          : new Date().toISOString(),
        sentiment: analyzeSentiment((item.headline as string) || ""),
        imageUrl: (item.image as string) || "",
      }));
  } catch {
    console.warn("[trump-news] Finnhub fetch failed");
    return [];
  }
}

// ============================================================
// Source 3: NewsData.io
// ============================================================

async function fetchNewsData(): Promise<TrumpNewsArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY || "pub_demo";
  const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=trump+tariff+trade&language=en,fr`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: Record<string, unknown>) => ({
      title: (item.title as string) || "",
      description: ((item.description as string) || "").slice(0, 300),
      url: (item.link as string) || "",
      source: "NewsData",
      publishedAt: (item.pubDate as string) || new Date().toISOString(),
      sentiment: analyzeSentiment((item.title as string) || ""),
      imageUrl: (item.image_url as string) || "",
    }));
  } catch {
    console.warn("[trump-news] NewsData fetch failed");
    return [];
  }
}

// ============================================================
// Deduplication (title similarity)
// ============================================================

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

function deduplicateArticles(articles: TrumpNewsArticle[]): TrumpNewsArticle[] {
  const kept: TrumpNewsArticle[] = [];
  const normalizedKept: string[] = [];

  for (const article of articles) {
    const norm = normalizeTitle(article.title);
    if (norm.length < 5) continue;

    let isDuplicate = false;
    for (const existing of normalizedKept) {
      if (titleSimilarity(norm, existing) > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(article);
      normalizedKept.push(norm);
    }
  }

  return kept;
}

// ============================================================
// GET handler
// ============================================================

export async function GET() {
  // Return cache if fresh
  if (cachedArticles.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({ articles: cachedArticles });
  }

  // Fetch all sources in parallel
  const [marketaux, finnhub, newsdata] = await Promise.allSettled([
    fetchMarketAux(),
    fetchFinnhub(),
    fetchNewsData(),
  ]);

  const all: TrumpNewsArticle[] = [];

  if (marketaux.status === "fulfilled") all.push(...marketaux.value);
  if (finnhub.status === "fulfilled") all.push(...finnhub.value);
  if (newsdata.status === "fulfilled") all.push(...newsdata.value);

  // Deduplicate
  const deduped = deduplicateArticles(all);

  // Sort by date descending
  const sorted = deduped.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });

  cachedArticles = sorted;
  cacheTimestamp = Date.now();

  return NextResponse.json({ articles: sorted });
}
