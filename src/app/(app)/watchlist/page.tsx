"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Bell, Search, AlertTriangle, X, Clock, Flame, BellRing, History, Newspaper, Link2, ArrowUpDown, Trophy, ThumbsDown } from "lucide-react";
import { useTranslation } from "@/i18n/context";

interface WatchItem {
  symbol: string;
  name: string;
  alertPrice?: number;
  alertDirection?: "above" | "below";
  notes?: string;
}

interface Quote {
  symbol: string;
  last: number;
  change: number;
  changepct: number;
  volume: number;
  bid: number;
  ask: number;
  high52: number;
  low52: number;
  updated: number;
  previousClose?: number;
}

interface AlertHistoryEntry {
  symbol: string;
  price: number;
  alertPrice: number;
  direction: "above" | "below";
  timestamp: number;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  symbols?: string[];
}

// ─── Correlation pairs definition ───────────────────────────────────────────
const CORRELATED_GROUPS: { symbols: string[]; coefficient: number }[] = [
  { symbols: ["EUR/USD", "GBP/USD", "EURUSD", "GBPUSD"], coefficient: 0.85 },
  { symbols: ["USD/JPY", "USD/CHF", "USDJPY", "USDCHF"], coefficient: 0.78 },
  { symbols: ["AAPL", "MSFT", "GOOGL"], coefficient: 0.72 },
  { symbols: ["NVDA", "AMD"], coefficient: 0.82 },
  { symbols: ["SPY", "QQQ"], coefficient: 0.91 },
  { symbols: ["GLD", "SLV"], coefficient: 0.88 },
  { symbols: ["AMZN", "GOOGL", "META"], coefficient: 0.68 },
  { symbols: ["XOM", "CVX"], coefficient: 0.89 },
  { symbols: ["JPM", "BAC", "GS"], coefficient: 0.80 },
  { symbols: ["BTC-USD", "ETH-USD"], coefficient: 0.87 },
];

const DEFAULT_WATCHLIST: WatchItem[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta" },
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "AMD", name: "AMD" },
];

const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple" }, { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" }, { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" }, { symbol: "META", name: "Meta" },
  { symbol: "TSLA", name: "Tesla" }, { symbol: "AMD", name: "AMD" },
  { symbol: "SPY", name: "S&P 500 ETF" }, { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "IWM", name: "Russell 2000" }, { symbol: "GLD", name: "Gold ETF" },
  { symbol: "PLTR", name: "Palantir" }, { symbol: "COIN", name: "Coinbase" },
  { symbol: "SOFI", name: "SoFi" }, { symbol: "NFLX", name: "Netflix" },
];

export default function WatchlistPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addSymbol, setAddSymbol] = useState("");
  const [addName, setAddName] = useState("");
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryEntry[]>([]);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "change" | "relStrength">("name");

  // Load items and alert history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("watchlist-items");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        } else {
          setItems(DEFAULT_WATCHLIST);
        }
      } catch {
        setItems(DEFAULT_WATCHLIST);
      }
    } else {
      setItems(DEFAULT_WATCHLIST);
    }

    const savedHistory = localStorage.getItem("watchlist-alert-history");
    if (savedHistory) {
      try {
        setAlertHistory(JSON.parse(savedHistory));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveItems = (newItems: WatchItem[]) => {
    setItems(newItems);
    localStorage.setItem("watchlist-items", JSON.stringify(newItems));
  };

  const saveAlertHistory = (history: AlertHistoryEntry[]) => {
    setAlertHistory(history);
    localStorage.setItem("watchlist-alert-history", JSON.stringify(history.slice(0, 50)));
  };

  // ─── Fetch with auto-retry (3 attempts, 5s delay) ────────────────────────
  const fetchQuotesWithRetry = useCallback(async (attempt = 0): Promise<boolean> => {
    if (items.length === 0) return true;
    setLoading(true);
    try {
      const symbols = items.map((i) => i.symbol).join(",");
      const res = await fetch(`/api/market-data/quotes?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok" && data.symbol) {
          const newQuotes: Record<string, Quote> = {};
          data.symbol.forEach((sym: string, idx: number) => {
            newQuotes[sym] = {
              symbol: sym,
              last: data.last?.[idx] || 0,
              change: data.change?.[idx] || 0,
              changepct: data.changepct?.[idx] || 0,
              volume: data.volume?.[idx] || 0,
              bid: data.bid?.[idx] || 0,
              ask: data.ask?.[idx] || 0,
              high52: data["52weekHigh"]?.[idx] || 0,
              low52: data["52weekLow"]?.[idx] || 0,
              updated: data.updated?.[idx] || 0,
              previousClose: data.prevClose?.[idx] || (data.last?.[idx] || 0) - (data.change?.[idx] || 0),
            };
          });
          setQuotes(newQuotes);
          setLastUpdated(new Date());
          setError(null);
          setRetrying(false);
          setRetryCount(0);
          setLoading(false);
          return true;
        }
      }
      throw new Error("API error");
    } catch {
      if (attempt < 2) {
        // Retry up to 3 times total (0, 1, 2)
        setRetrying(true);
        setRetryCount(attempt + 1);
        setError(null);
        setLoading(false);
        return new Promise((resolve) => {
          retryTimerRef.current = setTimeout(async () => {
            const result = await fetchQuotesWithRetry(attempt + 1);
            resolve(result);
          }, 5000);
        });
      } else {
        setError(t("quotesLoadError"));
        setRetrying(false);
        setRetryCount(0);
        setLoading(false);
        return false;
      }
    }
  }, [items]);

  const fetchQuotes = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetrying(false);
    setRetryCount(0);
    return fetchQuotesWithRetry(0);
  }, [fetchQuotesWithRetry]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(() => fetchQuotesWithRetry(0), 60000);
    return () => {
      clearInterval(interval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [fetchQuotes, fetchQuotesWithRetry]);

  // ─── Fetch News ───────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    if (items.length === 0) return;
    setNewsLoading(true);
    try {
      const symbolsParam = items.map((i) => i.symbol).join(",");
      const res = await fetch(`/api/news?symbols=${symbolsParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNews(data.slice(0, 3));
        } else if (data.articles) {
          setNews(data.articles.slice(0, 3));
        } else if (data.news) {
          setNews(data.news.slice(0, 3));
        }
      }
    } catch {
      // News is non-critical, silently fail
    }
    setNewsLoading(false);
  }, [items]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchNews]);

  const addItem = () => {
    if (!addSymbol.trim()) return;
    const sym = addSymbol.trim().toUpperCase();
    if (items.some((i) => i.symbol === sym)) return;
    saveItems([...items, { symbol: sym, name: addName || sym }]);
    setAddSymbol("");
    setAddName("");
    setShowAdd(false);
  };

  const removeItem = (symbol: string) => {
    saveItems(items.filter((i) => i.symbol !== symbol));
  };

  // ─── Alert validation: prevent negative/zero prices ───────────────────────
  const setAlert = (symbol: string) => {
    const price = parseFloat(alertPrice);
    if (isNaN(price)) {
      setAlertError(t("alertPriceInvalid"));
      return;
    }
    if (price <= 0) {
      setAlertError(t("alertPriceMustBePositive"));
      return;
    }
    setAlertError(null);
    saveItems(items.map((i) => i.symbol === symbol ? { ...i, alertPrice: price, alertDirection: alertDir } : i));
    setAlertSymbol(null);
    setAlertPrice("");
  };

  const removeAlert = (symbol: string) => {
    saveItems(items.map((i) => i.symbol === symbol ? { ...i, alertPrice: undefined, alertDirection: undefined } : i));
  };

  // Check alerts and record history
  useEffect(() => {
    const newHistory: AlertHistoryEntry[] = [];
    items.forEach((item) => {
      if (item.alertPrice && item.alertDirection && quotes[item.symbol]) {
        const q = quotes[item.symbol];
        const triggered =
          (item.alertDirection === "above" && q.last >= item.alertPrice) ||
          (item.alertDirection === "below" && q.last <= item.alertPrice);

        if (triggered) {
          // Check if we already notified recently (within 5 min)
          const recentlyNotified = alertHistory.some(
            (h) => h.symbol === item.symbol && Date.now() - h.timestamp < 300000
          );
          if (!recentlyNotified) {
            newHistory.push({
              symbol: item.symbol,
              price: q.last,
              alertPrice: item.alertPrice,
              direction: item.alertDirection,
              timestamp: Date.now(),
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              const msg = item.alertDirection === "above"
                ? t("alertNotifAbove", { symbol: item.symbol, price: q.last.toFixed(2), alertPrice: item.alertPrice })
                : t("alertNotifBelow", { symbol: item.symbol, price: q.last.toFixed(2), alertPrice: item.alertPrice });
              new Notification(t("alertNotifTitle", { symbol: item.symbol }), { body: msg });
            }
          }
        }
      }
    });
    if (newHistory.length > 0) {
      saveAlertHistory([...newHistory, ...alertHistory]);
    }
  }, [quotes, items]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Correlation detection ────────────────────────────────────────────────
  const getCorrelations = useCallback((symbol: string): { symbol: string; coefficient: number }[] => {
    const watchedSymbols = items.map((i) => i.symbol);
    const correlations: { symbol: string; coefficient: number }[] = [];
    for (const group of CORRELATED_GROUPS) {
      if (group.symbols.includes(symbol)) {
        for (const other of group.symbols) {
          if (other !== symbol && watchedSymbols.includes(other)) {
            correlations.push({ symbol: other, coefficient: group.coefficient });
          }
        }
      }
    }
    return correlations;
  }, [items]);

  const filtered = search ? items.filter((i) => i.symbol.includes(search.toUpperCase()) || i.name.toLowerCase().includes(search.toLowerCase())) : items;

  // ─── Relative Strength computation ────────────────────────────────────────
  const quotedItems = items.filter((i) => quotes[i.symbol]?.last > 0);
  const avgChangePct = quotedItems.length > 0
    ? quotedItems.reduce((sum, i) => sum + (quotes[i.symbol]?.changepct || 0), 0) / quotedItems.length
    : 0;

  const getRelStrengthBps = (symbol: string): number => {
    const q = quotes[symbol];
    if (!q || q.last <= 0) return 0;
    return Math.round((q.changepct - avgChangePct) * 100); // basis points
  };

  // Sort filtered items
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.symbol.localeCompare(b.symbol);
    if (sortBy === "change") {
      const aPct = quotes[a.symbol]?.changepct || 0;
      const bPct = quotes[b.symbol]?.changepct || 0;
      return bPct - aPct;
    }
    // relStrength
    return getRelStrengthBps(b.symbol) - getRelStrengthBps(a.symbol);
  });

  // Top / Worst performers (by relative strength in bps)
  const rankedByRelStrength = quotedItems
    .map((i) => ({ ...i, bps: getRelStrengthBps(i.symbol) }))
    .sort((a, b) => b.bps - a.bps);
  const topPerformers = rankedByRelStrength.slice(0, 3);
  const worstPerformers = rankedByRelStrength.slice(-3).reverse();

  const formatVolume = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toString();
  };

  // ─── Mini Chart sparkline (5-day direction) ───────────────────────────────
  const MiniChartSparkline = ({ quote }: { quote: Quote }) => {
    // Simulate a 5-day trend using current change direction and magnitude
    const changePct = quote.changepct;
    const prevClose = quote.previousClose || (quote.last - quote.change);
    // Generate 5 synthetic data points showing trend direction
    const base = prevClose;
    const delta = quote.last - prevClose;
    const points: number[] = [];
    // Day 1-4: interpolate with some variation, Day 5: actual price
    for (let i = 0; i < 5; i++) {
      const progress = i / 4;
      const noise = (Math.sin(i * 2.5 + changePct) * 0.3) * Math.abs(delta);
      points.push(base + delta * progress + noise);
    }
    points[4] = quote.last; // ensure last point is actual

    const minVal = Math.min(...points);
    const maxVal = Math.max(...points);
    const range = maxVal - minVal || 1;
    const isUp = delta >= 0;

    const svgPoints = points.map((p, i) => {
      const x = (i / 4) * 48;
      const y = 18 - ((p - minVal) / range) * 16;
      return `${x},${y}`;
    }).join(" ");

    const areaPoints = `${svgPoints} 48,18 0,18`;

    return (
      <svg width="48" height="20" viewBox="0 0 48 20" className="inline-block">
        <defs>
          <linearGradient id={`mcg-${quote.symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
            <stop offset="100%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#mcg-${quote.symbol})`} />
        <polyline points={svgPoints} fill="none" stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={48}
          cy={18 - ((points[4] - minVal) / range) * 16}
          r="2"
          fill={isUp ? "#10b981" : "#ef4444"}
        />
      </svg>
    );
  };

  const isStale = lastUpdated && (Date.now() - lastUpdated.getTime()) > 120000;

  // Compute trending (biggest movers)
  const trending = Object.values(quotes)
    .filter((q) => q.last > 0)
    .sort((a, b) => Math.abs(b.changepct) - Math.abs(a.changepct))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Retry Banner */}
      {retrying && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
            <span className="text-sm font-medium">
              {t("reconnecting", { attempt: retryCount + 1 })}
            </span>
          </div>
          <button onClick={fetchQuotes} className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-medium transition">
            {t("cancelAndRetry")}
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && !retrying && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchQuotes} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">{t("retry")}</button>
            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Stale Data Warning */}
      {isStale && !error && !retrying && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{t("staleData")}</span>
          </div>
          <button onClick={fetchQuotes} className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-medium transition">{t("refresh")}</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">{t("watchlistTitle")}</h1>
          <p className="text-sm text-[--text-secondary]">
            {t("watchlistSubtitle")}
            {lastUpdated && (
              <span className="ml-2 text-[--text-muted]">
                <Clock className="w-3 h-3 inline mr-1" />
                {t("lastUpdated")}: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlertHistory(!showAlertHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm ${alertHistory.length > 0 ? "text-amber-400" : "text-[--text-secondary]"}`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t("history")}</span>
            {alertHistory.length > 0 && (
              <span className="text-xs bg-amber-500/20 px-1.5 py-0.5 rounded-full">{alertHistory.length}</span>
            )}
          </button>
          <button onClick={fetchQuotes} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
            <Plus className="w-4 h-4" /> {t("addSymbol")}
          </button>
        </div>
      </div>

      {/* Alert History Panel */}
      {showAlertHistory && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[--text-primary] flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              {t("alertHistory")}
            </h3>
            {alertHistory.length > 0 && (
              <button
                onClick={() => saveAlertHistory([])}
                className="text-xs text-[--text-muted] hover:text-rose-400 transition"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
          {alertHistory.length === 0 ? (
            <p className="text-sm text-[--text-muted]">{t("noAlertTriggered")}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alertHistory.slice(0, 20).map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[--bg-hover]">
                  <div className="flex items-center gap-3">
                    <Bell className={`w-4 h-4 ${h.direction === "above" ? "text-emerald-400" : "text-rose-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-[--text-primary]">
                        {h.symbol} — ${h.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">
                        {h.direction === "above" ? t("abovePrice") : t("belowPrice")} ${h.alertPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[--text-muted]">
                    {new Date(h.timestamp).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Section */}
      {trending.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            {t("trendingMovers")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {trending.map((q) => {
              const isUp = q.changepct >= 0;
              return (
                <div key={q.symbol} className="metric-card rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-[--text-primary]">{q.symbol}</p>
                  <p className="text-lg font-bold mono text-[--text-primary]">${q.last.toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {isUp ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                    <span className={`text-sm font-bold mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {isUp ? "+" : ""}{q.changepct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top / Worst Performers Summary */}
      {rankedByRelStrength.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Performers */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-[--text-primary] flex items-center gap-2 mb-3 text-sm">
              <Trophy className="w-4 h-4 text-emerald-400" />
              {t("topPerformers")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {topPerformers.map((item) => {
                const q = quotes[item.symbol];
                return (
                  <div
                    key={item.symbol}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <span className="text-xs font-bold text-emerald-400">{item.symbol}</span>
                    <span className="text-[10px] font-medium text-emerald-300 mono">
                      {q ? `${q.changepct >= 0 ? "+" : ""}${q.changepct.toFixed(2)}%` : "—"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium mono">
                      +{item.bps} {t("bpsVsAvg")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Worst Performers */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-[--text-primary] flex items-center gap-2 mb-3 text-sm">
              <ThumbsDown className="w-4 h-4 text-rose-400" />
              {t("worstPerformers")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {worstPerformers.map((item) => {
                const q = quotes[item.symbol];
                return (
                  <div
                    key={item.symbol}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20"
                  >
                    <span className="text-xs font-bold text-rose-400">{item.symbol}</span>
                    <span className="text-[10px] font-medium text-rose-300 mono">
                      {q ? `${q.changepct >= 0 ? "+" : ""}${q.changepct.toFixed(2)}%` : "—"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-medium mono">
                      {item.bps} {t("bpsVsAvg")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search + Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchSymbol")}
            className="input-field pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[--text-muted]" />
          <span className="text-xs text-[--text-muted] whitespace-nowrap">{t("sortBy")}:</span>
          {(["name", "change", "relStrength"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                sortBy === option
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "glass text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              {option === "name" ? t("sortByName") : option === "change" ? t("sortByChange") : t("sortByRelStrength")}
            </button>
          ))}
        </div>
      </div>

      {/* Add Symbol */}
      {showAdd && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] mb-3">{t("addInstrument")}</h3>
          <div className="flex gap-3 mb-4">
            <input type="text" value={addSymbol} onChange={(e) => setAddSymbol(e.target.value.toUpperCase())} placeholder={t("symbolPlaceholder")} className="input-field w-40" />
            <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={t("namePlaceholder")} className="input-field flex-1" />
            <button onClick={addItem} className="px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm">{t("addSymbol")}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SYMBOLS.filter((p) => !items.some((i) => i.symbol === p.symbol)).map((p) => (
              <button
                key={p.symbol}
                onClick={() => saveItems([...items, p])}
                className="px-3 py-1.5 rounded-lg text-xs glass text-[--text-secondary] hover:text-[--text-primary] hover:border-cyan-500/30"
              >
                + {p.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && Object.keys(quotes).length === 0 ? (
        <div className="glass rounded-2xl p-4 animate-pulse">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[--bg-secondary]/30" />
                <div className="flex-1 h-4 bg-[--bg-secondary]/30 rounded" />
                <div className="w-20 h-4 bg-[--bg-secondary]/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Watchlist Table */
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border-subtle]">
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">{t("symbol")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">{t("price")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">{t("change")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">%</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">{t("miniChart")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">{t("volume")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden xl:table-cell">Bid/Ask</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden xl:table-cell">52W Range</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">{t("relativeStrength")}</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((item) => {
                const q = quotes[item.symbol];
                const isUp = q ? q.change >= 0 : true;
                const correlations = getCorrelations(item.symbol);
                const relBps = getRelStrengthBps(item.symbol);
                const maxAbsBps = Math.max(
                  ...items.map((i) => Math.abs(getRelStrengthBps(i.symbol))),
                  1
                );
                const barWidthPct = Math.min(Math.abs(relBps) / maxAbsBps * 100, 100);
                const isOutperforming = relBps >= 0;
                return (
                  <tr key={item.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-[--text-primary]">{item.symbol}</p>
                            {item.alertPrice && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" />
                                ${item.alertPrice}
                              </span>
                            )}
                            {correlations.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 flex items-center gap-1" title={t("correlatedWith", { symbols: correlations.map(c => c.symbol).join(", ") })}>
                                <Link2 className="w-2.5 h-2.5" />
                                {t("correlated")} ({correlations[0].coefficient.toFixed(2)})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[--text-muted]">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold mono text-[--text-primary]">{q ? `$${q.last.toFixed(2)}` : "\u2014"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-medium mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {q ? `${isUp ? "+" : ""}${q.change.toFixed(2)}` : "\u2014"}
                      </span>
                    </td>
                    <td className="p-4 text-right hidden md:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {q ? `${isUp ? "+" : ""}${q.changepct.toFixed(2)}%` : "\u2014"}
                      </span>
                    </td>
                    <td className="p-4 text-center hidden lg:table-cell">
                      {q ? <MiniChartSparkline quote={q} /> : "\u2014"}
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell">
                      <span className="text-xs text-[--text-secondary] mono">{q ? formatVolume(q.volume) : "\u2014"}</span>
                    </td>
                    <td className="p-4 text-right hidden xl:table-cell">
                      <span className="text-xs text-[--text-secondary] mono">{q ? `${q.bid.toFixed(2)} / ${q.ask.toFixed(2)}` : "\u2014"}</span>
                    </td>
                    <td className="p-4 text-right hidden xl:table-cell">
                      <span className="text-xs text-[--text-secondary] mono">{q ? `${q.low52.toFixed(0)} \u2014 ${q.high52.toFixed(0)}` : "\u2014"}</span>
                    </td>
                    {/* Relative Strength Bar */}
                    <td className="p-4 hidden md:table-cell">
                      {q && q.last > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full flex items-center gap-1">
                            <div className="flex-1 h-2 rounded-full bg-[--bg-secondary]/40 overflow-hidden relative">
                              <div
                                className={`absolute top-0 h-full rounded-full transition-all ${
                                  isOutperforming ? "bg-emerald-400 right-1/2" : "bg-rose-400 left-1/2"
                                }`}
                                style={{
                                  width: `${barWidthPct / 2}%`,
                                  ...(isOutperforming
                                    ? { right: "50%", left: `${50 - barWidthPct / 2}%` }
                                    : { left: "50%", right: `${50 - barWidthPct / 2}%` }),
                                }}
                              />
                              {/* Center line */}
                              <div className="absolute top-0 left-1/2 w-px h-full bg-[--text-muted]/30" />
                            </div>
                          </div>
                          <span className={`text-[10px] font-medium mono ${isOutperforming ? "text-emerald-400" : "text-rose-400"}`}>
                            {relBps >= 0 ? "+" : ""}{relBps} {t("bpsVsAvg")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[--text-muted]">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setAlertSymbol(item.symbol); setAlertPrice(q ? q.last.toFixed(2) : ""); setAlertError(null); }}
                          className={`p-1.5 rounded-lg hover:bg-[--bg-secondary] ${item.alertPrice ? "text-amber-400" : "text-[--text-muted]"}`}
                          title="Alerte prix"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        {item.alertPrice && (
                          <button
                            onClick={() => removeAlert(item.symbol)}
                            className="p-1.5 rounded-lg hover:bg-[--bg-secondary] text-amber-400 hover:text-amber-300"
                            title="Supprimer l'alerte"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => removeItem(item.symbol)} className="p-1.5 rounded-lg hover:bg-[--bg-secondary] text-[--text-muted] hover:text-rose-400" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedFiltered.length === 0 && (
            <div className="text-center py-12 text-[--text-muted]">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("watchlistEmpty")}</p>
              <p className="text-sm mt-1">{t("watchlistEmptyHint")}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Dernières News ═══ */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[--text-primary] flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-cyan-400" />
            {t("latestNews")}
          </h3>
          <button onClick={fetchNews} disabled={newsLoading} className="text-xs text-[--text-muted] hover:text-[--text-primary] transition">
            <RefreshCw className={`w-3 h-3 inline mr-1 ${newsLoading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
        {newsLoading && news.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-[--bg-secondary]/30" />
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="space-y-3">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl bg-[--bg-hover] hover:bg-[--bg-secondary] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--text-primary] group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.source && <span className="text-[10px] text-[--text-muted]">{item.source}</span>}
                    {item.publishedAt && (
                      <span className="text-[10px] text-[--text-muted]">
                        {new Date(item.publishedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {item.symbols && item.symbols.length > 0 && (
                      <div className="flex gap-1">
                        {item.symbols.slice(0, 3).map((s) => (
                          <span key={s} className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-[--text-muted] group-hover:text-cyan-400 mt-1 flex-shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[--text-muted]">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("noNewsAvailable")}</p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertSymbol && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setAlertSymbol(null); setAlertError(null); }}>
          <div className="glass rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[--text-primary] mb-4">{t("alertFor", { symbol: alertSymbol })}</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <select value={alertDir} onChange={(e) => setAlertDir(e.target.value as "above" | "below")} className="input-field w-40">
                  <option value="above">{t("abovePrice")}</option>
                  <option value="below">{t("belowPrice")}</option>
                </select>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => { setAlertPrice(e.target.value); setAlertError(null); }}
                  placeholder="Prix"
                  className={`input-field flex-1 ${alertError ? "border-rose-500/50" : ""}`}
                  step="0.01"
                  min="0.01"
                />
              </div>
              {/* Alert validation error message */}
              {alertError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{alertError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setAlert(alertSymbol)} className="flex-1 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm">{t("setAlert")}</button>
                <button onClick={() => { setAlertSymbol(null); setAlertError(null); }} className="px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">{t("cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
