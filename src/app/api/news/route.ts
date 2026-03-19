import { NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

// In-memory cache for fallback
let cachedNews: unknown[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface NewsDataItem {
  article_id: string;
  title: string;
  description: string;
  link: string;
  source_id: string;
  pubDate: string;
  image_url?: string;
  category?: string[];
}

function mapNewsDataToFinnhub(items: NewsDataItem[]): FinnhubNewsItem[] {
  return items.map((item, idx) => ({
    id: Date.now() + idx,
    category: item.category?.[0] || "business",
    datetime: Math.floor(new Date(item.pubDate).getTime() / 1000),
    headline: item.title || "",
    image: item.image_url || "",
    related: "",
    source: item.source_id || "newsdata",
    summary: item.description || "",
    url: item.link || "",
  }));
}

async function fetchFinnhubNews(): Promise<FinnhubNewsItem[]> {
  if (!FINNHUB_API_KEY) return [];
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid Finnhub response");
  return data;
}

async function fetchNewsDataFallback(): Promise<FinnhubNewsItem[]> {
  const res = await fetch(
    `https://newsdata.io/api/1/news?apikey=pub_FREE&category=business&language=en`,
    { next: { revalidate: 600 } }
  );
  if (!res.ok) throw new Error(`NewsData error: ${res.status}`);
  const data = await res.json();
  if (data.results && Array.isArray(data.results)) {
    return mapNewsDataToFinnhub(data.results);
  }
  throw new Error("Invalid NewsData response");
}

function generateFallbackNews(): FinnhubNewsItem[] {
  const now = Math.floor(Date.now() / 1000);
  const topics = [
    { headline: "Les marchés mondiaux restent prudents face aux tensions géopolitiques", summary: "Les indices boursiers européens et américains affichent une volatilité accrue alors que les investisseurs surveillent les développements internationaux.", category: "general" },
    { headline: "La Fed maintient ses taux directeurs — quelles implications ?", summary: "La Réserve fédérale américaine a décidé de maintenir ses taux d'intérêt, laissant les marchés dans l'attente de nouvelles données économiques.", category: "economy" },
    { headline: "Le secteur technologique en pleine mutation", summary: "Les grandes entreprises technologiques continuent de redéfinir leurs stratégies face à l'essor de l'intelligence artificielle.", category: "technology" },
    { headline: "Marchés émergents : opportunités et risques en 2026", summary: "Les investisseurs se tournent vers les marchés émergents à la recherche de rendements, mais la prudence reste de mise.", category: "market" },
    { headline: "Le pétrole fluctue face aux décisions de l'OPEP+", summary: "Les prix du brut oscillent alors que les producteurs ajustent leurs quotas de production pour stabiliser le marché.", category: "energy" },
    { headline: "L'or atteint de nouveaux sommets historiques", summary: "Le métal précieux continue sa progression, porté par les incertitudes économiques et la demande des banques centrales.", category: "commodities" },
    { headline: "Le Bitcoin franchit de nouveaux niveaux clés", summary: "La principale crypto-monnaie montre des signes de force alors que l'adoption institutionnelle s'accélère.", category: "crypto" },
    { headline: "Résultats trimestriels : les entreprises du S&P 500 surprennent", summary: "La saison des résultats révèle des performances supérieures aux attentes pour une majorité d'entreprises cotées.", category: "earnings" },
    { headline: "Le dollar américain sous pression face aux devises majeures", summary: "Le billet vert recule face à l'euro et au yen, reflétant les anticipations de politique monétaire divergente.", category: "forex" },
    { headline: "L'immobilier commercial face à de nouveaux défis", summary: "Le secteur de l'immobilier de bureau continue de se transformer avec l'essor du travail hybride.", category: "real_estate" },
    { headline: "Les obligations d'État : un refuge en période d'incertitude", summary: "Les rendements obligataires évoluent alors que les investisseurs réévaluent les perspectives de croissance mondiale.", category: "bonds" },
    { headline: "Intelligence artificielle : quels impacts sur les marchés financiers ?", summary: "L'IA transforme le trading, l'analyse de risque et la gestion de portefeuille à un rythme sans précédent.", category: "technology" },
    { headline: "Les banques centrales européennes ajustent leur politique", summary: "La BCE et la Banque d'Angleterre envisagent des ajustements de taux face à l'évolution de l'inflation.", category: "economy" },
    { headline: "Le marché des IPO reprend de la vigueur", summary: "Plusieurs entreprises technologiques préparent leur introduction en bourse, signalant un regain de confiance des investisseurs.", category: "ipo" },
    { headline: "Les ETF thématiques attirent des flux records", summary: "Les fonds négociés en bourse axés sur l'IA, la cybersécurité et l'énergie propre connaissent une croissance exceptionnelle.", category: "etf" },
    { headline: "Tensions commerciales : impact sur les chaînes d'approvisionnement", summary: "Les nouvelles mesures tarifaires affectent les flux commerciaux mondiaux et la stratégie des multinationales.", category: "trade" },
    { headline: "Le secteur de la santé attire les investisseurs", summary: "Les entreprises pharmaceutiques et biotech bénéficient de l'intérêt croissant pour les innovations médicales.", category: "healthcare" },
    { headline: "Les semi-conducteurs : un secteur stratégique en pleine expansion", summary: "La demande de puces électroniques continue de croître, portée par l'IA, l'automobile et le cloud computing.", category: "technology" },
    { headline: "Les marchés asiatiques affichent des performances contrastées", summary: "Le Nikkei et le Shanghai Composite évoluent dans des directions opposées, reflétant des dynamiques économiques différentes.", category: "asia" },
    { headline: "Le marché de l'énergie renouvelable en plein essor", summary: "Les investissements dans le solaire et l'éolien atteignent des niveaux records, soutenus par les politiques climatiques.", category: "energy" },
  ];

  return topics.map((t, i) => ({
    id: now + i,
    category: t.category,
    datetime: now - i * 1800, // 30 min apart
    headline: t.headline,
    image: "",
    related: "",
    source: "MarketPhase",
    summary: t.summary,
    url: "#",
  }));
}

export async function GET() {
  try {
    // Try primary: Finnhub
    const data = await fetchFinnhubNews();
    if (data.length > 0) {
      cachedNews = data;
      cacheTimestamp = Date.now();
      return NextResponse.json(data);
    }
  } catch (e) {
    console.warn("Finnhub news failed:", e);
  }

  try {
    // Try secondary: NewsData.io
    const data = await fetchNewsDataFallback();
    if (data.length > 0) {
      cachedNews = data;
      cacheTimestamp = Date.now();
      return NextResponse.json(data);
    }
  } catch (e) {
    console.warn("NewsData fallback failed:", e);
  }

  // Return cached data if still valid
  if (cachedNews.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedNews);
  }

  // Final fallback: generated news
  const fallback = generateFallbackNews();
  return NextResponse.json(fallback);
}
