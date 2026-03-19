import { NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

// In-memory cache
let cachedNews: NewsArticle[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface NewsArticle {
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

// --------------- RSS Parser (no external lib) ---------------

function parseRSS(xml: string): Array<{ title: string; link: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
    const link = content.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
    const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const source = content.match(/<source.*?>([\s\S]*?)<\/source>/)?.[1] || "";
    items.push({
      title: title.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1").trim(),
      link: link.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1").trim(),
      pubDate,
      source,
    });
  }
  return items;
}

function rssToArticles(items: Array<{ title: string; link: string; pubDate: string; source: string }>, fallbackSource: string): NewsArticle[] {
  return items.map((item, idx) => {
    const dt = item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000) - idx * 300;
    return {
      id: Date.now() + idx + Math.floor(Math.random() * 10000),
      category: categorizeHeadline(item.title),
      datetime: isNaN(dt) ? Math.floor(Date.now() / 1000) - idx * 300 : dt,
      headline: item.title,
      image: "",
      related: "",
      source: item.source || fallbackSource,
      summary: "",
      url: item.link,
    };
  });
}

// --------------- Headline categorization ---------------

function categorizeHeadline(headline: string): string {
  const h = headline.toLowerCase();
  if (/crypto|bitcoin|btc|ethereum|eth|blockchain|binance|coinbase/.test(h)) return "crypto";
  if (/forex|eur\/usd|gbp|usd\/jpy|devises|currency|dollar|euro/.test(h)) return "forex";
  if (/actions|stock|nasdaq|s&p|dow|cac\s?40|dax|bourse|equity|shares|ipo/.test(h)) return "actions";
  if (/macro|gdp|pib|inflation|fed|bce|ecb|taux|rate|employment|ch[oô]mage|recession/.test(h)) return "macro";
  if (/oil|pétrole|gold|or|commodit|matières|copper|wheat|silver|argent/.test(h)) return "commodities";
  return "marchés";
}

// --------------- Source 1: Finnhub ---------------

async function fetchFinnhub(): Promise<NewsArticle[]> {
  if (!FINNHUB_API_KEY) return [];
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid Finnhub response");
  return data.map((item: Record<string, unknown>) => ({
    id: item.id as number,
    category: categorizeHeadline((item.headline as string) || ""),
    datetime: item.datetime as number,
    headline: (item.headline as string) || "",
    image: (item.image as string) || "",
    related: (item.related as string) || "",
    source: (item.source as string) || "Finnhub",
    summary: (item.summary as string) || "",
    url: (item.url as string) || "",
  }));
}

// --------------- Source 2: CNBC RSS (reliable, 30+ articles) ---------------

async function fetchCNBCRSS(): Promise<NewsArticle[]> {
  const res = await fetch("https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPhase/1.0)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`CNBC RSS error: ${res.status}`);
  const xml = await res.text();
  const items = parseRSS(xml);
  return rssToArticles(items, "CNBC");
}

// --------------- Source 3: Google News RSS (Finance FR) ---------------

async function fetchGoogleNewsRSS(): Promise<NewsArticle[]> {
  const res = await fetch(
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtWnlHZ0pHVWlnQVAB?hl=fr&gl=FR&ceid=FR:fr",
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPhase/1.0)" },
      next: { revalidate: 300 },
    }
  );
  if (!res.ok) throw new Error(`Google News RSS error: ${res.status}`);
  const xml = await res.text();
  const items = parseRSS(xml);
  return rssToArticles(items, "Google News");
}

// --------------- Source 4: BBC Business RSS ---------------

async function fetchBBCBusinessRSS(): Promise<NewsArticle[]> {
  const res = await fetch("https://feeds.bbci.co.uk/news/business/rss.xml", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPhase/1.0)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`BBC RSS error: ${res.status}`);
  const xml = await res.text();
  const items = parseRSS(xml);
  return rssToArticles(items, "BBC Business");
}

// --------------- Source 5: Investing.com RSS ---------------

async function fetchInvestingRSS(): Promise<NewsArticle[]> {
  const res = await fetch("https://www.investing.com/rss/news.rss", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPhase/1.0)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Investing.com RSS error: ${res.status}`);
  const xml = await res.text();
  const items = parseRSS(xml);
  return rssToArticles(items, "Investing.com");
}

// --------------- (removed Finviz — unreliable scraping) ---------------
function _placeholder_removed() {
  const articles: NewsArticle[] = [];
  const html = "";
  const linkRegex = /<a[^>]+class="nn-tab-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  let idx = 0;
  while ((m = linkRegex.exec(html)) !== null) {
    const url = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    if (title && url) {
      articles.push({
        id: Date.now() + idx + Math.floor(Math.random() * 100000),
        category: categorizeHeadline(title),
        datetime: Math.floor(Date.now() / 1000) - idx * 600,
        headline: title,
        image: "",
        related: "",
        source: "Finviz",
        summary: "",
        url: url.startsWith("http") ? url : `https://finviz.com${url}`,
      });
      idx++;
    }
  }
  return articles;
}

// --------------- Deduplication ---------------

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Map<string, NewsArticle>();
  for (const article of articles) {
    // Normalize title for comparison
    const key = article.headline
      .toLowerCase()
      .replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]/g, "")
      .slice(0, 60);
    if (key.length < 5) continue; // skip empty/tiny titles
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }
  return Array.from(seen.values());
}

// --------------- Fallback news ---------------

function generateFallbackNews(): NewsArticle[] {
  const now = Math.floor(Date.now() / 1000);
  const topics = [
    { headline: "Les marchés mondiaux restent prudents face aux tensions géopolitiques", summary: "Les indices boursiers européens et américains affichent une volatilité accrue.", category: "marchés" },
    { headline: "La Fed maintient ses taux directeurs — quelles implications ?", summary: "La Réserve fédérale américaine a décidé de maintenir ses taux d'intérêt.", category: "macro" },
    { headline: "Le secteur technologique en pleine mutation", summary: "Les grandes entreprises technologiques continuent de redéfinir leurs stratégies.", category: "actions" },
    { headline: "Marchés émergents : opportunités et risques en 2026", summary: "Les investisseurs se tournent vers les marchés émergents.", category: "marchés" },
    { headline: "Le pétrole fluctue face aux décisions de l'OPEP+", summary: "Les prix du brut oscillent alors que les producteurs ajustent leurs quotas.", category: "commodities" },
    { headline: "L'or atteint de nouveaux sommets historiques", summary: "Le métal précieux continue sa progression.", category: "commodities" },
    { headline: "Le Bitcoin franchit de nouveaux niveaux clés", summary: "La principale crypto-monnaie montre des signes de force.", category: "crypto" },
    { headline: "Résultats trimestriels : les entreprises du S&P 500 surprennent", summary: "La saison des résultats révèle des performances supérieures aux attentes.", category: "actions" },
    { headline: "Le dollar américain sous pression face aux devises majeures", summary: "Le billet vert recule face à l'euro et au yen.", category: "forex" },
    { headline: "L'immobilier commercial face à de nouveaux défis", summary: "Le secteur de l'immobilier de bureau continue de se transformer.", category: "marchés" },
    { headline: "Les obligations d'État : un refuge en période d'incertitude", summary: "Les rendements obligataires évoluent avec les perspectives de croissance.", category: "macro" },
    { headline: "Intelligence artificielle : impacts sur les marchés financiers", summary: "L'IA transforme le trading et la gestion de portefeuille.", category: "actions" },
    { headline: "Les banques centrales européennes ajustent leur politique", summary: "La BCE envisage des ajustements de taux face à l'inflation.", category: "macro" },
    { headline: "Le marché des IPO reprend de la vigueur", summary: "Plusieurs entreprises préparent leur introduction en bourse.", category: "actions" },
    { headline: "Les ETF thématiques attirent des flux records", summary: "Les fonds axés sur l'IA et l'énergie propre connaissent une croissance.", category: "marchés" },
    { headline: "Tensions commerciales et chaînes d'approvisionnement", summary: "Les mesures tarifaires affectent les flux commerciaux mondiaux.", category: "macro" },
    { headline: "Le secteur de la santé attire les investisseurs", summary: "Les entreprises pharma bénéficient de l'intérêt pour les innovations.", category: "actions" },
    { headline: "Les semi-conducteurs en pleine expansion", summary: "La demande de puces continue de croître avec l'IA et le cloud.", category: "actions" },
    { headline: "Les marchés asiatiques affichent des performances contrastées", summary: "Nikkei et Shanghai Composite évoluent dans des directions opposées.", category: "marchés" },
    { headline: "Le marché de l'énergie renouvelable en plein essor", summary: "Les investissements dans le solaire et l'éolien atteignent des records.", category: "commodities" },
    { headline: "EUR/USD : analyse technique de la paire majeure", summary: "La paire de devises évolue dans un canal ascendant.", category: "forex" },
    { headline: "Ethereum 2.0 et l'avenir de la DeFi", summary: "L'écosystème Ethereum attire de nouveaux développeurs.", category: "crypto" },
    { headline: "Le CAC 40 teste ses résistances historiques", summary: "L'indice parisien approche de nouveaux sommets.", category: "actions" },
    { headline: "L'inflation dans la zone euro : derniers chiffres", summary: "Les données récentes montrent un ralentissement progressif.", category: "macro" },
    { headline: "Le marché des matières premières reste volatile", summary: "Cuivre, blé et gaz naturel connaissent des variations importantes.", category: "commodities" },
    { headline: "GBP/USD : impact du Brexit sur la livre sterling", summary: "La devise britannique réagit aux données économiques.", category: "forex" },
    { headline: "Solana et les altcoins en hausse cette semaine", summary: "Les crypto-monnaies alternatives gagnent du terrain.", category: "crypto" },
    { headline: "Wall Street : analyse de la semaine boursière", summary: "Les principaux indices américains clôturent en territoire mixte.", category: "marchés" },
    { headline: "Le marché obligataire anticipe un pivot monétaire", summary: "Les taux longs baissent dans l'anticipation d'un assouplissement.", category: "macro" },
    { headline: "Les BRICS et la dédollarisation des échanges", summary: "Le groupe explore des alternatives au dollar dans le commerce.", category: "forex" },
  ];

  return topics.map((t, i) => ({
    id: now + i,
    category: t.category,
    datetime: now - i * 1800,
    headline: t.headline,
    image: "",
    related: "",
    source: "MarketPhase",
    summary: t.summary,
    url: "#",
  }));
}

// --------------- Main GET handler ---------------

export async function GET() {
  // Check cache first
  if (cachedNews.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedNews);
  }

  const allArticles: NewsArticle[] = [];

  // Source 1: Finnhub (primary)
  try {
    const data = await fetchFinnhub();
    if (data.length > 0) allArticles.push(...data);
  } catch (e) {
    console.warn("[News] Finnhub failed:", e);
  }

  // Source 2: CNBC RSS (reliable, 30+ articles)
  try {
    const data = await fetchCNBCRSS();
    if (data.length > 0) allArticles.push(...data);
  } catch (e) {
    console.warn("[News] CNBC RSS failed:", e);
  }

  // Source 3: Google News RSS (FR finance)
  try {
    const data = await fetchGoogleNewsRSS();
    if (data.length > 0) allArticles.push(...data);
  } catch (e) {
    console.warn("[News] Google News RSS failed:", e);
  }

  // Source 4: BBC Business RSS
  try {
    const data = await fetchBBCBusinessRSS();
    if (data.length > 0) allArticles.push(...data);
  } catch (e) {
    console.warn("[News] BBC Business failed:", e);
  }

  // Source 5: Investing.com RSS
  try {
    const data = await fetchInvestingRSS();
    if (data.length > 0) allArticles.push(...data);
  } catch (e) {
    console.warn("[News] Investing.com failed:", e);
  }

  if (allArticles.length > 0) {
    // Deduplicate and sort by date descending
    const deduped = deduplicateArticles(allArticles);
    const sorted = deduped.sort((a, b) => b.datetime - a.datetime);

    cachedNews = sorted;
    cacheTimestamp = Date.now();
    return NextResponse.json(sorted);
  }

  // Final fallback: generated news
  const fallback = generateFallbackNews();
  cachedNews = fallback;
  cacheTimestamp = Date.now();
  return NextResponse.json(fallback);
}
