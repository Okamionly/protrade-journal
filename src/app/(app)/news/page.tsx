"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  RefreshCw,
  ExternalLink,
  Clock,
  AlertTriangle,
  X,
  Search,
  Newspaper,
  TrendingUp,
  Filter,
  Zap,
} from "lucide-react";

// --------------- Types ---------------

interface NewsItem {
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

// --------------- Constants ---------------

const CATEGORY_TABS = [
  { key: "all", label: "Tous" },
  { key: "marchés", label: "March\u00e9s" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "actions", label: "Actions" },
  { key: "macro", label: "Macro" },
  { key: "commodities", label: "Commodities" },
] as const;

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "yahoo finance": { bg: "rgba(115, 59, 214, 0.15)", text: "#a78bfa", border: "rgba(115, 59, 214, 0.3)" },
  "google news": { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  finviz: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  bloomberg: { bg: "rgba(251, 146, 60, 0.15)", text: "#fb923c", border: "rgba(251, 146, 60, 0.3)" },
  reuters: { bg: "rgba(251, 113, 133, 0.15)", text: "#fb7185", border: "rgba(251, 113, 133, 0.3)" },
  cnbc: { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
  finnhub: { bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
  marketphase: { bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
  marketwatch: { bg: "rgba(34, 197, 94, 0.15)", text: "#4ade80", border: "rgba(34, 197, 94, 0.3)" },
  "bbc business": { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
  "investing.com": { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
};

const DEFAULT_SOURCE_COLOR = { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" };

function getSourceColor(source: string) {
  return SOURCE_COLORS[source.toLowerCase()] || DEFAULT_SOURCE_COLOR;
}

// --------------- Helpers ---------------

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "\u00e0 l\u2019instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "\u00e0 l\u2019instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.floor(diffMin / 60)}h`;
}

/** Extract top trending keywords from headlines */
function extractTrendingTopics(articles: NewsItem[], count = 5): string[] {
  const stopWords = new Set([
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "au", "aux",
    "pour", "par", "sur", "dans", "avec", "est", "sont", "a", "ont", "que", "qui",
    "ce", "sa", "son", "ses", "se", "ne", "pas", "plus", "the", "of", "and", "to",
    "in", "for", "is", "on", "at", "by", "an", "it", "as", "its", "be", "has",
    "was", "are", "from", "or", "but", "not", "this", "that", "with", "will",
    "face", "new", "says", "after", "over", "how", "why", "what", "amid",
  ]);
  const wordCounts = new Map<string, number>();

  for (const article of articles) {
    const words = article.headline
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }

  return Array.from(wordCounts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
}

// --------------- Components ---------------

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-20 bg-[--bg-secondary]/40 rounded-full" />
        <div className="h-4 w-12 bg-[--bg-secondary]/30 rounded" />
        <div className="ml-auto h-4 w-16 bg-[--bg-secondary]/30 rounded" />
      </div>
      <div className="h-5 bg-[--bg-secondary]/40 rounded w-full mb-2" />
      <div className="h-5 bg-[--bg-secondary]/30 rounded w-3/4 mb-3" />
      <div className="h-4 bg-[--bg-secondary]/20 rounded w-full mb-1" />
      <div className="h-4 bg-[--bg-secondary]/20 rounded w-2/3" />
    </div>
  );
}

/** Filter out logos, icons, tracking pixels, and other non-article images */
function isRealImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();

  // Known bad patterns: logos, icons, tracking pixels, sprites
  const badPatterns = [
    "logo", "icon", "favicon", "brand", "sprite",
    "pixel", "tracker", "1x1", "blank",
    "badge", "avatar", "placeholder", "spacer",
    "widget", "button", "banner-ad", "ad-",
    "ads/", "adserver", "doubleclick",
  ];
  for (const pattern of badPatterns) {
    if (lower.includes(pattern)) return false;
  }

  // Finnhub default image
  if (lower.includes("finnhub.io/file/finnhub")) return false;

  // Filter very short URLs (likely not real images)
  if (url.length < 40) return false;

  // Filter tiny images by URL dimensions if visible (e.g. ?w=50&h=50, /50x50/, etc.)
  const dimMatch = lower.match(/[?&/](?:w|width|h|height)=(\d+)/);
  if (dimMatch && parseInt(dimMatch[1]) < 100) return false;
  const sizeMatch = lower.match(/\/(\d+)x(\d+)\//);
  if (sizeMatch && (parseInt(sizeMatch[1]) < 100 || parseInt(sizeMatch[2]) < 100)) return false;

  // Filter data URIs that are too small
  if (lower.startsWith("data:")) return false;

  return true;
}

const SOURCE_GRADIENTS: Record<string, string> = {
  reuters: "from-orange-600 via-orange-700 to-red-800",
  cnbc: "from-blue-600 via-blue-700 to-indigo-800",
  "bbc business": "from-red-700 via-red-800 to-rose-900",
  "google news": "from-emerald-600 via-teal-700 to-cyan-800",
  "investing.com": "from-green-600 via-green-700 to-emerald-800",
  "marketwatch": "from-green-500 via-emerald-600 to-teal-800",
  "yahoo finance": "from-purple-600 via-violet-700 to-indigo-800",
  finnhub: "from-cyan-600 via-cyan-700 to-blue-800",
  marketphase: "from-cyan-600 via-teal-700 to-blue-800",
  default: "from-slate-600 via-slate-700 to-gray-800",
};

function NewsCard({ item }: { item: NewsItem }) {
  const colors = getSourceColor(item.source);
  const hasImage = isRealImage(item.image);
  const gradient = SOURCE_GRADIENTS[item.source.toLowerCase()] || SOURCE_GRADIENTS.default;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group block"
      style={{ cursor: item.url === "#" ? "default" : "pointer" }}
    >
      {/* Image or gradient header */}
      <div className="relative h-40 overflow-hidden">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-[0.07]">
              <div className="absolute top-2 left-4 w-24 h-24 border border-white rounded-full" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-white rounded-full" />
              <div className="absolute top-8 right-8 w-12 h-12 border border-white rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-1 z-10">
              <Newspaper className="w-8 h-8 text-white/25" />
              <span className="text-white/20 font-black text-sm uppercase tracking-[0.2em]">
                {item.source}
              </span>
            </div>
          </div>
        )}
        {/* Time badge overlay */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(item.datetime)}
        </div>
      </div>

      <div className="p-4">
      {/* Top row: source badge + category */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {item.source}
        </span>
        {item.category && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase text-[--text-muted] bg-[--bg-secondary]/40 border border-[--border]">
            {item.category}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
        {item.headline}
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="text-xs text-[--text-secondary] line-clamp-2 mb-3">{item.summary}</p>
      )}

      {/* Read link */}
      {item.url !== "#" && (
        <div className="flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3" />
          Lire l&apos;article
        </div>
      )}
      </div>
    </a>
  );
}

// --------------- Main Page ---------------

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --------------- Fetch ---------------

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNews(data);
          setLastUpdated(new Date());
        } else if (Array.isArray(data) && data.length === 0) {
          setError("Aucune actualit\u00e9 disponible.");
        } else {
          setError("Format de r\u00e9ponse inattendu de l\u2019API.");
        }
      } else {
        setError("Impossible de charger les actualit\u00e9s. R\u00e9essayez.");
      }
    } catch {
      setError("Impossible de charger les actualit\u00e9s. V\u00e9rifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  // Update "last updated" text every 30s
  useEffect(() => {
    const tick = () => setLastUpdatedText(formatLastUpdated(lastUpdated));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // --------------- Derived data ---------------

  const sources = useMemo(() => {
    const s = [...new Set(news.map((n) => n.source))].filter(Boolean).sort();
    return s;
  }, [news]);

  const trendingTopics = useMemo(() => extractTrendingTopics(news), [news]);

  const filtered = useMemo(() => {
    return news.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && item.source.toLowerCase() !== sourceFilter.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.headline.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [news, categoryFilter, sourceFilter, searchQuery]);

  // --------------- Render ---------------

  return (
    <div className="space-y-5">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition"
            >
              Réessayer
            </button>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-cyan-400" />
            Fil d&apos;Actualités
          </h1>
          <p className="text-sm text-[--text-secondary] mt-1">
            Actualités financières multi-sources en temps réel
            {lastUpdatedText && (
              <span className="ml-2 text-[--text-muted]">
                &mdash; Dernière mise à jour: {lastUpdatedText}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--text-muted] hidden sm:inline flex items-center gap-1">
            <Zap className="w-3 h-3 inline" /> Auto-refresh 5min
          </span>
          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-white/5 transition"
            title="Rafra\u00eechir"
          >
            <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Trending Topics */}
      {trendingTopics.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
              Tendances
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSearchQuery(topic)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition cursor-pointer"
              >
                #{topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par mot-cl\u00e9 (titre, r\u00e9sum\u00e9, source)..."
          className="input-field pl-10 w-full"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5 text-[--text-muted]" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_TABS.map((tab) => {
          const count = tab.key === "all" ? news.length : news.filter((n) => n.category === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                categoryFilter === tab.key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Source filter pills */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <Filter className="w-3.5 h-3.5 text-[--text-muted]" />
        <button
          onClick={() => setSourceFilter("all")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
            sourceFilter === "all"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
              : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
          }`}
        >
          Toutes
        </button>
        {sources.map((src) => {
          const colors = getSourceColor(src);
          const isActive = sourceFilter.toLowerCase() === src.toLowerCase();
          return (
            <button
              key={src}
              onClick={() => setSourceFilter(isActive ? "all" : src)}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition border"
              style={{
                background: isActive ? colors.bg : "transparent",
                color: isActive ? colors.text : "var(--text-secondary)",
                borderColor: isActive ? colors.border : "var(--border)",
              }}
            >
              {src}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-[--text-muted]">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune actualité trouvée</p>
          {searchQuery && (
            <p className="text-sm mt-1">
              Essayez un autre mot-clé ou supprimez le filtre de recherche.
            </p>
          )}
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setSourceFilter("all");
            }}
            className="mt-3 px-4 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-[--text-muted]">
            {filtered.length} article{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""}
            {(categoryFilter !== "all" || sourceFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setSourceFilter("all");
                }}
                className="ml-2 text-cyan-400 hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
