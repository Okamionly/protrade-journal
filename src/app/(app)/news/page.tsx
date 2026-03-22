"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
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
  ChevronDown,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";

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
  { key: "all", labelKey: "all" },
  { key: "marchés", labelKey: "markets" },
  { key: "crypto", labelKey: "crypto" },
  { key: "forex", labelKey: "forex" },
  { key: "actions", labelKey: "stocks" },
  { key: "macro", labelKey: "macro" },
  { key: "commodities", labelKey: "commodities" },
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
  if (seconds < 60) return "à l\u2019instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l\u2019instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.floor(diffMin / 60)}h`;
}

function isBreakingNews(timestamp: number): boolean {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  return seconds < 1800; // less than 30 minutes
}

/** Extract top trending keywords from headlines */
function extractTrendingTopics(articles: NewsItem[], count = 8): string[] {
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

// --------------- Sentiment Analysis ---------------

const BULLISH_KEYWORDS = ["rally", "surge", "gain", "bullish", "rise", "buy", "up", "soar", "jump", "climb", "record", "high", "boom", "breakout"];
const BEARISH_KEYWORDS = ["crash", "fall", "drop", "bearish", "decline", "sell", "down", "plunge", "sink", "tumble", "low", "slump", "collapse", "recession"];

type Sentiment = "bullish" | "bearish" | "neutral";

function analyzeSentiment(headline: string): Sentiment {
  const lower = headline.toLowerCase();
  const words = lower.split(/\s+/);
  const hasBullish = words.some((w) => BULLISH_KEYWORDS.some((kw) => w.includes(kw)));
  const hasBearish = words.some((w) => BEARISH_KEYWORDS.some((kw) => w.includes(kw)));
  if (hasBullish && !hasBearish) return "bullish";
  if (hasBearish && !hasBullish) return "bearish";
  return "neutral";
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const config = {
    bullish: { emoji: "\u{1F7E2}", label: "Haussier", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    bearish: { emoji: "\u{1F534}", label: "Baissier", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
    neutral: { emoji: "\u26AA", label: "Neutre", bg: "bg-[--bg-secondary]/40", text: "text-[--text-muted]", border: "border-[--border]" },
  };
  const c = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className="text-[8px]">{c.emoji}</span> {c.label}
    </span>
  );
}

// --------------- Bookmark Helpers ---------------

const BOOKMARKS_STORAGE_KEY = "protrade_news_bookmarks";

function getBookmarkedIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveBookmarkedIds(ids: Set<number>) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore quota errors */ }
}

// --------------- Position Impact Matching ---------------

function findMatchingAssets(headline: string, tradedAssets: string[]): string[] {
  if (tradedAssets.length === 0) return [];
  const lower = headline.toLowerCase();
  return tradedAssets.filter((asset) => {
    const assetLower = asset.toLowerCase();
    // Match exact asset name or common variants
    if (lower.includes(assetLower)) return true;
    // Match base/quote currencies individually for forex pairs like EUR/USD
    const parts = assetLower.split("/");
    if (parts.length === 2) {
      return lower.includes(parts[0]) || lower.includes(parts[1]);
    }
    return false;
  });
}

// --------------- Components ---------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-[60px] h-[60px] rounded-lg bg-[--bg-secondary]/40 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-[--bg-secondary]/40 rounded w-3/4" />
        <div className="h-3 bg-[--bg-secondary]/30 rounded w-full" />
        <div className="flex gap-2">
          <div className="h-3 w-16 bg-[--bg-secondary]/30 rounded-full" />
          <div className="h-3 w-12 bg-[--bg-secondary]/20 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Filter out logos, icons, tracking pixels, and other non-article images */
function isRealImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();

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

  if (lower.includes("finnhub.io/file/finnhub")) return false;
  if (url.length < 40) return false;

  const dimMatch = lower.match(/[?&/](?:w|width|h|height)=(\d+)/);
  if (dimMatch && parseInt(dimMatch[1]) < 100) return false;
  const sizeMatch = lower.match(/\/(\d+)x(\d+)\//);
  if (sizeMatch && (parseInt(sizeMatch[1]) < 100 || parseInt(sizeMatch[2]) < 100)) return false;

  if (lower.startsWith("data:")) return false;

  return true;
}

const SOURCE_GRADIENTS: Record<string, string> = {
  reuters: "from-orange-600 to-red-800",
  cnbc: "from-blue-600 to-indigo-800",
  "bbc business": "from-red-700 to-rose-900",
  "google news": "from-emerald-600 to-cyan-800",
  "investing.com": "from-green-600 to-emerald-800",
  marketwatch: "from-green-500 to-teal-800",
  "yahoo finance": "from-purple-600 to-indigo-800",
  finnhub: "from-cyan-600 to-blue-800",
  marketphase: "from-cyan-600 to-blue-800",
  default: "from-slate-600 to-gray-800",
};

function NewsRow({
  item,
  isBookmarked,
  onToggleBookmark,
  matchingAssets,
}: {
  item: NewsItem;
  isBookmarked: boolean;
  onToggleBookmark: (id: number) => void;
  matchingAssets: string[];
}) {
  const colors = getSourceColor(item.source);
  const hasImage = isRealImage(item.image);
  const gradient = SOURCE_GRADIENTS[item.source.toLowerCase()] || SOURCE_GRADIENTS.default;
  const isNew = isBreakingNews(item.datetime);
  const sentiment = analyzeSentiment(item.headline);

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group border-b border-[--border]/40 last:border-b-0 relative">
      {/* Bookmark button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(item.id); }}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors z-10"
        title={isBookmarked ? "Retirer des favoris" : "Sauvegarder"}
      >
        {isBookmarked ? (
          <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <Bookmark className="w-3.5 h-3.5 text-[--text-muted] opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </button>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 flex-1 min-w-0"
        style={{ cursor: item.url === "#" ? "default" : "pointer" }}
      >
        {/* Thumbnail */}
        <div className="w-[60px] h-[60px] rounded-lg overflow-hidden flex-shrink-0 mt-0.5">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.classList.add("bg-gradient-to-br", ...gradient.split(" "), "flex", "items-center", "justify-center");
              }}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Newspaper className="w-5 h-5 text-white/20" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Headline */}
          <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 group-hover:text-cyan-400 transition-colors pr-6">
            {isNew && (
              <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 mr-1.5 align-middle">
                NEW
              </span>
            )}
            {item.headline}
          </h3>

          {/* Summary — single line */}
          {item.summary && (
            <p className="text-[11px] text-[--text-muted] line-clamp-1 mt-0.5 leading-relaxed">{item.summary}</p>
          )}

          {/* Meta row: sentiment + source + category + time + position impact + link */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Sentiment badge */}
            <SentimentBadge sentiment={sentiment} />

            {/* Source pill */}
            <span
              className="px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wide leading-none"
              style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              {item.source}
            </span>

            {item.category && (
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wide font-medium">
                {item.category}
              </span>
            )}

            <span className="text-[10px] text-[--text-muted] flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(item.datetime)}
            </span>

            {/* Position impact badges */}
            {matchingAssets.map((asset) => (
              <span
                key={asset}
                className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
              >
                Concerne: {asset}
              </span>
            ))}

            {item.url !== "#" && (
              <ExternalLink className="w-3 h-3 text-[--text-muted] opacity-0 group-hover:opacity-60 transition-opacity ml-auto flex-shrink-0" />
            )}
          </div>
        </div>
      </a>
    </div>
  );
}

/** Source filter dropdown */
function SourceDropdown({
  sources,
  sourceFilter,
  setSourceFilter,
}: {
  sources: string[];
  sourceFilter: string;
  setSourceFilter: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { t: tInner } = useTranslation();
  const activeLabel = sourceFilter === "all" ? tInner("allSources") : sourceFilter;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[--border] hover:border-[--text-muted] transition bg-[--bg-secondary]/30"
      >
        <Filter className="w-3 h-3 text-[--text-muted]" />
        <span className="truncate max-w-[140px]">{activeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-[--text-muted] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 max-h-72 overflow-y-auto glass rounded-xl border border-[--border] p-1.5 shadow-2xl">
          <button
            onClick={() => { setSourceFilter("all"); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              sourceFilter === "all"
                ? "bg-cyan-500/15 text-cyan-400"
                : "text-[--text-secondary] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {tInner("allSources")}
          </button>
          {sources.map((src) => {
            const c = getSourceColor(src);
            const active = sourceFilter.toLowerCase() === src.toLowerCase();
            return (
              <button
                key={src}
                onClick={() => { setSourceFilter(active ? "all" : src); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  active ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.text }}
                />
                <span style={{ color: active ? c.text : "var(--text-secondary)" }}>
                  {src}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------- Main Page ---------------

export default function NewsPage() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    setBookmarkedIds(getBookmarkedIds());
  }, []);

  const toggleBookmark = useCallback((id: number) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveBookmarkedIds(next);
      return next;
    });
  }, []);

  // Get unique traded assets from user's trades
  const { trades } = useTrades();
  const tradedAssets = useMemo(() => {
    const assets = new Set<string>();
    trades.forEach((trade) => {
      if (trade.asset) assets.add(trade.asset);
    });
    return [...assets];
  }, [trades]);

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
          setError(t("noNewsAvailable"));
        } else {
          setError(t("unexpectedApiFormat"));
        }
      } else {
        setError(t("cannotLoadNews"));
      }
    } catch {
      setError(t("cannotLoadNewsCheckConnection"));
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
      if (showSavedOnly && !bookmarkedIds.has(item.id)) return false;
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
  }, [news, categoryFilter, sourceFilter, searchQuery, showSavedOnly, bookmarkedIds]);

  // --------------- Render ---------------

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition"
            >
              {t("retry")}
            </button>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header — compact */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold">{t("newsFeed")}</h1>
          {lastUpdatedText && (
            <span className="text-[10px] text-[--text-muted] hidden sm:inline">
              &mdash; {lastUpdatedText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[--text-muted] hidden sm:inline flex items-center gap-1">
            <Zap className="w-3 h-3 inline" /> Auto 5min
          </span>
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition"
            title={t("refresh")}
          >
            <RefreshCw className={`w-4 h-4 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Trending — compact single line */}
      {trendingTopics.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          {trendingTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSearchQuery(topic)}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              #{topic}
            </button>
          ))}
        </div>
      )}

      {/* Search + Source filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--text-muted]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search")}
            className="input-field pl-9 pr-8 w-full text-xs py-1.5"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-hover)] transition"
            >
              <X className="w-3 h-3 text-[--text-muted]" />
            </button>
          )}
        </div>
        <SourceDropdown sources={sources} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} />
      </div>

      {/* Category tabs + Saved filter */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
        {/* Saved articles tab */}
        <button
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
            showSavedOnly
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
              : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
          }`}
        >
          <BookmarkCheck className="w-3 h-3" />
          Mes articles sauvegardes ({bookmarkedIds.size})
        </button>

        <div className="w-px bg-[--border] mx-1 flex-shrink-0" />

        {CATEGORY_TABS.map((tab) => {
          const count = tab.key === "all" ? news.length : news.filter((n) => n.category === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 ${
                categoryFilter === tab.key && !showSavedOnly
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
              }`}
            >
              {t(tab.labelKey)} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass rounded-xl divide-y divide-[--border]/40">
          {Array.from({ length: 15 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-[--text-muted]">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{t("noNewsFound")}</p>
          {searchQuery && (
            <p className="text-xs mt-1">
              {t("tryOtherKeyword")}
            </p>
          )}
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setSourceFilter("all");
              setShowSavedOnly(false);
            }}
            className="mt-3 px-4 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition"
          >
            {t("reset")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[--text-muted]">
              {filtered.length} article{filtered.length > 1 ? "s" : ""}
              {(categoryFilter !== "all" || sourceFilter !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setSourceFilter("all");
                  }}
                  className="ml-2 text-cyan-400 hover:underline"
                >
                  {t("clearFilters")}
                </button>
              )}
            </p>
          </div>

          {/* Vertical news feed */}
          <div className="glass rounded-xl overflow-hidden">
            {filtered.map((item) => (
              <NewsRow
                key={item.id}
                item={item}
                isBookmarked={bookmarkedIds.has(item.id)}
                onToggleBookmark={toggleBookmark}
                matchingAssets={findMatchingAssets(item.headline, tradedAssets)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
