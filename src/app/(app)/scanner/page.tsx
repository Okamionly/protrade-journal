"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, RefreshCw, TrendingUp, TrendingDown, Minus,
  ArrowUpDown, Filter, ChevronDown, ChevronUp, X,
  Zap, BarChart3, Clock, Radio, Activity,
  Star, Bell, CheckCircle, XCircle, History,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { AIInsightsCard, type InsightItem } from "@/components/AIInsightsCard";
import { Brain, AlertTriangle, Target, TrendingUp as TrendUp, TrendingDown as TrendDown } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PriceItem {
  symbol: string;
  price: number;
  change: number; // percent
}

interface LivePricesResponse {
  forex: PriceItem[];
  crypto: PriceItem[];
  commodities: PriceItem[];
  indices: PriceItem[];
  timestamp: number;
}

interface CurrencyStrengthResponse {
  strengths: Record<string, number>;
  pairs: { pair: string; direction: "LONG" | "SHORT"; reason: string; delta: number }[];
  timestamp: number;
}

type InstrumentType = "all" | "forex" | "crypto" | "commodities" | "indices";
type SignalType = "all" | "buy" | "sell" | "neutral";
type SortKey = "symbol" | "price" | "change" | "signal" | "strength";
type SortDir = "asc" | "desc";

interface ScannerRow {
  symbol: string;
  price: number;
  change: number;
  type: InstrumentType;
  signal: "buy" | "sell" | "neutral";
  strength: number; // 0-100
  volumeLevel: "high" | "medium" | "low";
}

// ─── Signal Generation Helpers ──────────────────────────────────────────────

function computeSignal(change: number, strength: number): "buy" | "sell" | "neutral" {
  if (strength >= 65 && change > 0.05) return "buy";
  if (strength <= 35 && change < -0.05) return "sell";
  if (change > 0.3 && strength >= 55) return "buy";
  if (change < -0.3 && strength <= 45) return "sell";
  return "neutral";
}

function computeStrength(
  change: number,
  currencyStrengths: Record<string, number>,
  symbol: string,
  type: string
): number {
  // Base strength from change momentum
  let base = 50 + change * 8;

  // Incorporate currency strength data for forex pairs
  if (type === "forex") {
    const parts = symbol.split("/");
    if (parts.length === 2) {
      const baseStr = currencyStrengths[parts[0]] ?? 50;
      const quoteStr = currencyStrengths[parts[1]] ?? 50;
      const delta = baseStr - quoteStr;
      base = 50 + delta * 0.5 + change * 5;
    }
  }

  // Clamp
  return Math.round(Math.max(0, Math.min(100, base)));
}

function computeVolume(change: number): "high" | "medium" | "low" {
  const absChange = Math.abs(change);
  if (absChange > 1.5) return "high";
  if (absChange > 0.4) return "medium";
  return "low";
}

// ─── Signal History & Accuracy Tracking ─────────────────────────────────────

interface SignalRecord {
  symbol: string;
  signal: "buy" | "sell";
  priceAtSignal: number;
  timestamp: number;
  priceAfter?: number;
  correct?: boolean;
  resolved: boolean;
}

function loadSignalHistory(): SignalRecord[] {
  try {
    const s = localStorage.getItem("scanner-signal-history");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveSignalHistory(records: SignalRecord[]) {
  // Keep last 500
  localStorage.setItem("scanner-signal-history", JSON.stringify(records.slice(-500)));
}

function loadFavorites(): string[] {
  try {
    const s = localStorage.getItem("scanner-favorites");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem("scanner-favorites", JSON.stringify(favs));
}

// ─── Signal Strength Bars (1-5) ─────────────────────────────────────────────

// ─── Social Sentiment Section ───────────────────────────────────────────────

interface SocialSentimentEntry {
  symbol: string;
  reddit: { mention: number; positiveScore: number; negativeScore: number; score: number };
  twitter: { mention: number; positiveScore: number; negativeScore: number; score: number };
}

function SocialSentimentSection() {
  const [data, setData] = useState<SocialSentimentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/market-data/social-sentiment");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data)) {
          setData(json.data);
        }
      } catch (e) {
        console.error("[Social Sentiment] fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 animate-pulse" style={{ border: "1px solid var(--border)" }}>
        <div className="h-5 rounded w-56 mb-4" style={{ background: "var(--bg-secondary)" }} />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  // Sort by total mentions (reddit + twitter) descending, take top 5
  const sorted = [...data].sort((a, b) => {
    const aMentions = a.reddit.mention + a.twitter.mention;
    const bMentions = b.reddit.mention + b.twitter.mention;
    return bMentions - aMentions;
  }).slice(0, 5);

  const maxMentions = Math.max(...sorted.map((s) => s.reddit.mention + s.twitter.mention), 1);
  const HIGH_BUZZ_THRESHOLD = maxMentions * 0.7;

  return (
    <div className="glass rounded-xl p-5" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-violet-400" />
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Sentiment Social (Reddit + Twitter)
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 font-bold uppercase tracking-wider">
          7j
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {sorted.map((entry) => {
          const totalMentions = entry.reddit.mention + entry.twitter.mention;
          const avgPositive = ((entry.reddit.positiveScore + entry.twitter.positiveScore) / 2);
          const avgNegative = ((entry.reddit.negativeScore + entry.twitter.negativeScore) / 2);
          const netScore = avgPositive - avgNegative;
          const isHighBuzz = totalMentions >= HIGH_BUZZ_THRESHOLD;

          // Trend: positive = up, negative = down
          const trendUp = netScore > 0.02;
          const trendDown = netScore < -0.02;

          return (
            <div
              key={entry.symbol}
              className="rounded-xl p-3 relative"
              style={{
                background: isHighBuzz ? "rgba(139,92,246,0.08)" : "var(--bg-secondary)",
                border: isHighBuzz ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--border-subtle)",
              }}
            >
              {/* Buzz badge */}
              {isHighBuzz && (
                <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                  {"\uD83D\uDD25"} Buzz
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{entry.symbol}</span>
                {trendUp && <TrendingUp size={14} style={{ color: "rgb(16,185,129)" }} />}
                {trendDown && <TrendingDown size={14} style={{ color: "rgb(239,68,68)" }} />}
                {!trendUp && !trendDown && <Minus size={14} style={{ color: "var(--text-muted)" }} />}
              </div>

              {/* Mention count */}
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                <span className="font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{totalMentions.toLocaleString()}</span> mentions
              </div>

              {/* Sentiment bar */}
              <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div
                  className="h-full rounded-l-full"
                  style={{
                    width: `${(avgPositive / (avgPositive + avgNegative || 1)) * 100}%`,
                    background: "rgb(16,185,129)",
                    minWidth: "4px",
                  }}
                />
                <div
                  className="h-full rounded-r-full"
                  style={{
                    width: `${(avgNegative / (avgPositive + avgNegative || 1)) * 100}%`,
                    background: "rgb(239,68,68)",
                    minWidth: "4px",
                  }}
                />
              </div>

              {/* Scores */}
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span style={{ color: "rgb(16,185,129)" }}>+{(avgPositive * 100).toFixed(0)}%</span>
                <span style={{ color: "rgb(239,68,68)" }}>-{(avgNegative * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1"><TrendingUp size={10} style={{ color: "rgb(16,185,129)" }} /> Positif</span>
          <span className="flex items-center gap-1"><TrendingDown size={10} style={{ color: "rgb(239,68,68)" }} /> Négatif</span>
          <span className="flex items-center gap-1">{"\uD83D\uDD25"} Buzz élevé</span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Source : Finnhub Social Sentiment
        </span>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<InstrumentType>("all");
  const [signalFilter, setSignalFilter] = useState<SignalType>("all");
  const [minStrength, setMinStrength] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("strength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Detail panel
  const [selectedRow, setSelectedRow] = useState<ScannerRow | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Signal history & accuracy
  const [signalHistory, setSignalHistory] = useState<SignalRecord[]>(() => loadSignalHistory());
  const [showAccuracy, setShowAccuracy] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; symbol: string; signal: string }[]>([]);
  const prevRowsRef = useRef<ScannerRow[]>([]);

  // AV News Sentiment
  const [avSentiment, setAvSentiment] = useState<Record<string, { score: number; label: string }>>({});

  // Auto-refresh
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalHistoryRef = useRef(signalHistory);
  signalHistoryRef.current = signalHistory;

  // ─── Fetch data ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [pricesRes, strengthRes] = await Promise.all([
        fetch("/api/live-prices"),
        fetch("/api/currency-strength"),
      ]);

      if (!pricesRes.ok) throw new Error("Erreur lors du chargement des prix");

      const prices: LivePricesResponse = await pricesRes.json();
      const strengths: CurrencyStrengthResponse = strengthRes.ok
        ? await strengthRes.json()
        : { strengths: {}, pairs: [], timestamp: Date.now() };

      const newRows: ScannerRow[] = [];

      // Process forex
      for (const item of prices.forex) {
        const str = computeStrength(item.change, strengths.strengths, item.symbol, "forex");
        newRows.push({
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          type: "forex",
          signal: computeSignal(item.change, str),
          strength: str,
          volumeLevel: computeVolume(item.change),
        });
      }

      // Process crypto
      for (const item of prices.crypto) {
        const str = computeStrength(item.change, strengths.strengths, item.symbol, "crypto");
        newRows.push({
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          type: "crypto",
          signal: computeSignal(item.change, str),
          strength: str,
          volumeLevel: computeVolume(item.change),
        });
      }

      // Process commodities
      for (const item of prices.commodities) {
        const str = computeStrength(item.change, strengths.strengths, item.symbol, "commodities");
        newRows.push({
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          type: "commodities",
          signal: computeSignal(item.change, str),
          strength: str,
          volumeLevel: computeVolume(item.change),
        });
      }

      // Process indices
      for (const item of prices.indices) {
        const str = computeStrength(item.change, strengths.strengths, item.symbol, "indices");
        newRows.push({
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          type: "indices",
          signal: computeSignal(item.change, str),
          strength: str,
          volumeLevel: computeVolume(item.change),
        });
      }

      // Incorporate currency strength pair suggestions as additional signal boost
      for (const suggestion of strengths.pairs) {
        const matchingRow = newRows.find((r) => r.symbol === suggestion.pair || r.symbol.replace("/", "") === suggestion.pair.replace("/", ""));
        if (matchingRow) {
          if (suggestion.direction === "LONG" && suggestion.delta > 15) {
            matchingRow.signal = "buy";
            matchingRow.strength = Math.min(100, matchingRow.strength + 10);
          } else if (suggestion.direction === "SHORT" && suggestion.delta > 15) {
            matchingRow.signal = "sell";
            matchingRow.strength = Math.min(100, matchingRow.strength + 10);
          }
        }
      }

      setRows(newRows);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // ─── Fetch AV News Sentiment for stock-like symbols ──────────────────────
  useEffect(() => {
    if (rows.length === 0) return;
    // Only fetch for symbols that look like stock tickers (indices, no slashes)
    const stockSymbols = rows
      .filter((r) => r.type === "indices" || (!r.symbol.includes("/") && !r.symbol.includes("BTC") && !r.symbol.includes("ETH")))
      .map((r) => r.symbol.replace("^", "").replace("$", ""))
      .slice(0, 5); // Limit to 5 to avoid rate limits
    if (stockSymbols.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/news-sentiment?tickers=${stockSymbols.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || data.error) return;
        // Aggregate sentiment per ticker from all articles
        const sentMap: Record<string, { totalScore: number; count: number }> = {};
        for (const article of data.articles || []) {
          for (const ts of article.tickers || []) {
            if (!sentMap[ts.ticker]) sentMap[ts.ticker] = { totalScore: 0, count: 0 };
            sentMap[ts.ticker].totalScore += ts.score;
            sentMap[ts.ticker].count++;
          }
        }
        const result: Record<string, { score: number; label: string }> = {};
        for (const [ticker, { totalScore, count }] of Object.entries(sentMap)) {
          const avg = totalScore / count;
          const label = avg > 0.15 ? "Bullish" : avg < -0.15 ? "Bearish" : "Neutral";
          result[ticker] = { score: Math.round(avg * 100) / 100, label };
        }
        if (!cancelled) setAvSentiment(result);
      } catch (e) {
        console.warn("[AV Sentiment] Erreur:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [rows.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Favorites persistence ───────────────────────────────────────────────
  useEffect(() => { saveFavorites(favorites); }, [favorites]);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]);
  }, []);

  // ─── Signal history tracking & toast notifications ──────────────────────
  useEffect(() => {
    if (rows.length === 0) return;

    // Record new signals
    const now = Date.now();
    const newRecords: SignalRecord[] = [];
    for (const row of rows) {
      if (row.signal === "neutral") continue;
      // Only record if strong enough (strength >= 60)
      if (row.strength < 60) continue;
      // Check if we already have an unresolved record for this symbol+signal
      const existing = signalHistoryRef.current.find((r) => r.symbol === row.symbol && r.signal === row.signal && !r.resolved && (now - r.timestamp < 3600000));
      if (!existing) {
        newRecords.push({
          symbol: row.symbol,
          signal: row.signal,
          priceAtSignal: row.price,
          timestamp: now,
          resolved: false,
        });
      }
    }

    // Resolve old signals (>30min old) by comparing price direction
    const updated = signalHistoryRef.current.map((record) => {
      if (record.resolved) return record;
      if (now - record.timestamp < 1800000) return record; // wait 30min
      const currentRow = rows.find((r) => r.symbol === record.symbol);
      if (!currentRow) return record;
      const priceAfter = currentRow.price;
      const correct = record.signal === "buy"
        ? priceAfter > record.priceAtSignal
        : priceAfter < record.priceAtSignal;
      return { ...record, priceAfter, correct, resolved: true };
    });

    const hasResolved = updated.some((r, i) => r !== signalHistoryRef.current[i]);
    if (newRecords.length > 0 || hasResolved) {
      const combined = [...updated, ...newRecords].slice(-500);
      setSignalHistory(combined);
      saveSignalHistory(combined);
    }

    // Toast for new strong signals on favorited assets
    const prev = prevRowsRef.current;
    if (prev.length > 0) {
      for (const row of rows) {
        if (!favorites.includes(row.symbol)) continue;
        if (row.signal === "neutral" || row.strength < 65) continue;
        const prevRow = prev.find((r) => r.symbol === row.symbol);
        if (prevRow && (prevRow.signal !== row.signal || (prevRow.strength < 65 && row.strength >= 65))) {
          setToasts((t) => [...t, {
            id: `${row.symbol}-${Date.now()}`,
            message: `${row.symbol} : signal ${row.signal === "buy" ? "ACHAT" : "VENTE"} fort (${row.strength}/100)`,
            symbol: row.symbol,
            signal: row.signal,
          }]);
        }
      }
    }
    prevRowsRef.current = rows;
  }, [rows, favorites]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  // ─── Accuracy stats ────────────────────────────────────────────────────
  const accuracyStats = useMemo(() => {
    const resolved = signalHistory.filter((r) => r.resolved);
    const correct = resolved.filter((r) => r.correct).length;
    const total = resolved.length;
    const rate = total > 0 ? (correct / total) * 100 : 0;
    // Per-signal breakdown
    const buyResolved = resolved.filter((r) => r.signal === "buy");
    const buyCorrect = buyResolved.filter((r) => r.correct).length;
    const sellResolved = resolved.filter((r) => r.signal === "sell");
    const sellCorrect = sellResolved.filter((r) => r.correct).length;
    return { total, correct, rate, buyTotal: buyResolved.length, buyCorrect, sellTotal: sellResolved.length, sellCorrect };
  }, [signalHistory]);

  // ─── Sort & Filter ────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const filteredRows = useMemo(() => {
    let result = rows;

    if (showOnlyFavorites) {
      result = result.filter((r) => favorites.includes(r.symbol));
    }
    if (typeFilter !== "all") {
      result = result.filter((r) => r.type === typeFilter);
    }
    if (signalFilter !== "all") {
      result = result.filter((r) => r.signal === signalFilter);
    }
    if (minStrength > 0) {
      result = result.filter((r) => r.strength >= minStrength);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.symbol.toLowerCase().includes(q));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "change":
          cmp = a.change - b.change;
          break;
        case "signal": {
          const order = { buy: 2, neutral: 1, sell: 0 };
          cmp = order[a.signal] - order[b.signal];
          break;
        }
        case "strength":
          cmp = a.strength - b.strength;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [rows, typeFilter, signalFilter, minStrength, searchQuery, sortKey, sortDir, showOnlyFavorites, favorites]);

  // --- AI Insights: Vos meilleurs signaux ---
  const { trades: scanTrades } = useTrades();
  const scannerInsights = useMemo<InsightItem[]>(() => {
    if (scanTrades.length < 5 || rows.length === 0) return [];
    const items: InsightItem[] = [];

    // Find scanner symbols the user has traded
    const tradedSymbols = new Map<string, { wins: number; total: number; pnl: number }>();
    for (const trade of scanTrades) {
      const sym = trade.asset?.toUpperCase();
      if (!sym) continue;
      const existing = tradedSymbols.get(sym) || { wins: 0, total: 0, pnl: 0 };
      existing.total++;
      if (trade.result > 0) existing.wins++;
      existing.pnl += trade.result || 0;
      tradedSymbols.set(sym, existing);
    }

    // Cross-reference with active scanner signals
    const buySignals = rows.filter((r) => r.signal === "buy" && r.strength >= 60);
    const sellSignals = rows.filter((r) => r.signal === "sell" && r.strength >= 60);

    // Find matching buy signals on user's good assets
    const goodMatches = buySignals.filter((r) => {
      const stats = tradedSymbols.get(r.symbol.toUpperCase());
      return stats && stats.total >= 2 && (stats.wins / stats.total) > 0.5;
    });

    if (goodMatches.length > 0) {
      items.push({
        icon: <TrendUp className="w-3.5 h-3.5" />,
        text: `Signal BUY sur ${goodMatches.slice(0, 3).map((r) => r.symbol).join(", ")} — Actif(s) où vous performez bien`,
        type: "bullish",
      });
    }

    // Warn about sell signals on user's assets
    const badMatches = sellSignals.filter((r) => tradedSymbols.has(r.symbol.toUpperCase()));
    if (badMatches.length > 0) {
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: `Signal SELL sur ${badMatches.slice(0, 3).map((r) => r.symbol).join(", ")} — Vérifiez vos positions ouvertes`,
        type: "warning",
      });
    }

    // Best signal type analysis from history
    if (signalHistory.length >= 5) {
      const buyAccuracy = signalHistory.filter((s) => s.signal === "buy");
      const sellAccuracy = signalHistory.filter((s) => s.signal === "sell");
      const buyWins = buyAccuracy.filter((s) => s.correct === true).length;
      const sellWins = sellAccuracy.filter((s) => s.correct === true).length;

      if (buyAccuracy.length >= 3 && sellAccuracy.length >= 3) {
        const buyWr = (buyWins / buyAccuracy.length) * 100;
        const sellWr = (sellWins / sellAccuracy.length) * 100;
        const best = buyWr > sellWr ? "BUY" : "SELL";
        const bestWr = Math.max(buyWr, sellWr);
        items.push({
          icon: <Target className="w-3.5 h-3.5" />,
          text: `Vos signaux ${best} ont un taux de réussite de ${bestWr.toFixed(0)}% — Concentrez-vous sur ce type`,
          type: bestWr > 55 ? "bullish" : "neutral",
        });
      }
    }

    // Count strong signals
    const strongSignals = rows.filter((r) => r.strength >= 75 && r.signal !== "neutral");
    if (strongSignals.length > 0) {
      items.push({
        icon: <Zap className="w-3.5 h-3.5" />,
        text: `${strongSignals.length} signaux forts (force > 75) détectés en ce moment`,
        type: "info",
      });
    }

    return items.slice(0, 4);
  }, [scanTrades, rows, signalHistory]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const signalLabel = (s: "buy" | "sell" | "neutral") => {
    switch (s) {
      case "buy": return t("scanner_signalBuy");
      case "sell": return t("scanner_signalSell");
      case "neutral": return t("scanner_signalNeutral");
    }
  };

  const signalColor = (s: "buy" | "sell" | "neutral") => {
    switch (s) {
      case "buy": return "rgb(16,185,129)";
      case "sell": return "rgb(239,68,68)";
      case "neutral": return "rgb(245,158,11)";
    }
  };

  const signalBg = (s: "buy" | "sell" | "neutral") => {
    switch (s) {
      case "buy": return "rgba(16,185,129,0.12)";
      case "sell": return "rgba(239,68,68,0.12)";
      case "neutral": return "rgba(245,158,11,0.12)";
    }
  };

  const SignalIcon = ({ signal }: { signal: "buy" | "sell" | "neutral" }) => {
    if (signal === "buy") return <TrendingUp size={14} style={{ color: signalColor(signal) }} />;
    if (signal === "sell") return <TrendingDown size={14} style={{ color: signalColor(signal) }} />;
    return <Minus size={14} style={{ color: signalColor(signal) }} />;
  };

  const typeLabel = (t: InstrumentType) => {
    switch (t) {
      case "forex": return "Forex";
      case "crypto": return "Crypto";
      case "commodities": return "Matières";
      case "indices": return "Indices";
      default: return "Tous";
    }
  };

  const volumeIcon = (v: "high" | "medium" | "low") => {
    const config = {
      high: { label: t("scannerVolHigh"), color: "rgb(16,185,129)", bg: "rgba(16,185,129,0.1)" },
      medium: { label: t("scannerVolMedium"), color: "rgb(245,158,11)", bg: "rgba(245,158,11,0.1)" },
      low: { label: t("scannerVolLow"), color: "var(--text-muted)", bg: "var(--bg-secondary)" },
    };
    const c = config[v];
    return (
      <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ color: c.color, background: c.bg }}>
        {c.label}
      </span>
    );
  };

  const strengthBar = (value: number) => {
    const color = value >= 65 ? "rgb(16,185,129)" : value <= 35 ? "rgb(239,68,68)" : "rgb(245,158,11)";
    return (
      <div className="flex items-center gap-2">
        <div style={{ width: 48, height: 6, borderRadius: 3, background: "var(--bg-secondary)" }}>
          <div style={{ width: `${value}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.3s" }} />
        </div>
        <span className="text-xs tabular-nums" style={{ color, minWidth: 24 }}>{value}</span>
      </div>
    );
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes("JPY") || symbol.includes("S&P") || symbol.includes("DXY")) {
      return price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("XAU")) {
      return price.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return price.toLocaleString("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 5 });
  };

  // Active filter count
  const activeFilterCount = [
    typeFilter !== "all",
    signalFilter !== "all",
    minStrength > 0,
    showOnlyFavorites,
  ].filter(Boolean).length;

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const buyCount = rows.filter((r) => r.signal === "buy").length;
    const sellCount = rows.filter((r) => r.signal === "sell").length;
    const avgStrength = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.strength, 0) / rows.length) : 0;
    return { total: rows.length, buyCount, sellCount, avgStrength };
  }, [rows]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const SortHeader = ({ label, sortKeyName, className = "" }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <th
      className={`text-left text-xs font-semibold cursor-pointer select-none ${className}`}
      style={{ color: "var(--text-secondary)", padding: "10px 12px" }}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName ? (
          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} style={{ opacity: 0.3 }} />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ pointerEvents: "none" }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
            style={{
              border: `1px solid ${toast.signal === "buy" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
              background: toast.signal === "buy" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              pointerEvents: "auto",
            }}
          >
            <Bell className="w-4 h-4" style={{ color: toast.signal === "buy" ? "rgb(16,185,129)" : "rgb(239,68,68)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Search className="w-7 h-7 text-cyan-400" />
            {t("scanner_title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t("scanner_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Clock size={12} />
              {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className="glass rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{
              color: showOnlyFavorites ? "#f59e0b" : "var(--text-secondary)",
              border: showOnlyFavorites ? "1px solid rgba(245,158,11,0.3)" : "1px solid var(--border)",
              background: showOnlyFavorites ? "rgba(245,158,11,0.08)" : undefined,
            }}
          >
            <Star size={14} fill={showOnlyFavorites ? "#f59e0b" : "none"} />
            {t("scanner_myFavorites")}{favorites.length > 0 ? ` (${favorites.length})` : ""}
          </button>
          <button
            onClick={() => setShowAccuracy(!showAccuracy)}
            className="glass rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{
              color: showAccuracy ? "rgb(6,182,212)" : "var(--text-secondary)",
              border: showAccuracy ? "1px solid rgba(6,182,212,0.3)" : "1px solid var(--border)",
              background: showAccuracy ? "rgba(6,182,212,0.08)" : undefined,
            }}
          >
            <History size={14} />
            {t("scanner_accuracy")}
          </button>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="glass rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("scanner_refresh")}
          </button>
        </div>
      </div>

      {/* === AI Insights: Vos meilleurs signaux === */}
      {scannerInsights.length > 0 && (
        <AIInsightsCard
          title="Vos meilleurs signaux"
          insights={scannerInsights}
          minimumTrades={5}
          currentTradeCount={scanTrades.length}
        />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Radio size={14} className="text-cyan-400" />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("scanner_instruments")}</span>
          </div>
          <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{stats.total}</div>
        </div>
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: "rgb(16,185,129)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("scanner_buySignals")}</span>
          </div>
          <div className="text-xl font-bold tabular-nums" style={{ color: "rgb(16,185,129)" }}>{stats.buyCount}</div>
        </div>
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} style={{ color: "rgb(239,68,68)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("scanner_sellSignals")}</span>
          </div>
          <div className="text-xl font-bold tabular-nums" style={{ color: "rgb(239,68,68)" }}>{stats.sellCount}</div>
        </div>
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-amber-400" />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("scanner_avgStrength")}</span>
          </div>
          <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{stats.avgStrength}</div>
        </div>
      </div>

      {/* Signal Accuracy Panel */}
      {showAccuracy && (
        <div className="glass rounded-xl p-4" style={{ border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <History size={16} className="text-cyan-400" />
              {t("scanner_historicalAccuracy")}
            </h3>
            {signalHistory.length > 0 && (
              <button
                onClick={() => { setSignalHistory([]); saveSignalHistory([]); }}
                className="text-[10px] flex items-center gap-1 hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={10} /> {t("scanner_resetHistory")}
              </button>
            )}
          </div>
          {accuracyStats.total === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
              {t("scanner_noSignals")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>{t("scanner_accuracyRate")}</div>
                <div className="text-xl font-bold mono" style={{ color: accuracyStats.rate >= 50 ? "rgb(16,185,129)" : "rgb(239,68,68)" }}>
                  {accuracyStats.rate.toFixed(1)}%
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{accuracyStats.correct}/{accuracyStats.total} corrects</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Signaux Achat</div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} style={{ color: "rgb(16,185,129)" }} />
                  <span className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                    {accuracyStats.buyTotal > 0 ? `${((accuracyStats.buyCorrect / accuracyStats.buyTotal) * 100).toFixed(0)}%` : "N/A"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>({accuracyStats.buyCorrect}/{accuracyStats.buyTotal})</span>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Signaux Vente</div>
                <div className="flex items-center gap-2">
                  <XCircle size={14} style={{ color: "rgb(239,68,68)" }} />
                  <span className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                    {accuracyStats.sellTotal > 0 ? `${((accuracyStats.sellCorrect / accuracyStats.sellTotal) * 100).toFixed(0)}%` : "N/A"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>({accuracyStats.sellCorrect}/{accuracyStats.sellTotal})</span>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>En Attente</div>
                <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                  {signalHistory.filter((r) => !r.resolved).length}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>non resolus</div>
              </div>
            </div>
          )}
          {/* Recent resolved signals */}
          {accuracyStats.total > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: "var(--text-muted)" }}>Derniers signaux resolus</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {signalHistory
                  .filter((r) => r.resolved)
                  .slice(-8)
                  .reverse()
                  .map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.correct ? (
                        <CheckCircle size={12} style={{ color: "rgb(16,185,129)" }} />
                      ) : (
                        <XCircle size={12} style={{ color: "rgb(239,68,68)" }} />
                      )}
                      <span className="font-medium w-16" style={{ color: "var(--text-primary)" }}>{r.symbol}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: r.signal === "buy" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: r.signal === "buy" ? "rgb(16,185,129)" : "rgb(239,68,68)" }}>
                        {r.signal === "buy" ? "ACHAT" : "VENTE"}
                      </span>
                      <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                        {r.priceAtSignal.toFixed(2)} → {r.priceAfter?.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signal Distribution Visual */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Buy/Sell/Neutral bar */}
          <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-cyan-400" />
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Distribution des Signaux</span>
            </div>
            <div className="w-full h-6 rounded-full overflow-hidden flex" style={{ background: "var(--bg-secondary)" }}>
              {stats.buyCount > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                  style={{ width: `${(stats.buyCount / stats.total) * 100}%`, background: "rgb(16,185,129)" }}
                >
                  {stats.buyCount}
                </div>
              )}
              {(stats.total - stats.buyCount - stats.sellCount) > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] font-bold transition-all duration-500"
                  style={{ width: `${((stats.total - stats.buyCount - stats.sellCount) / stats.total) * 100}%`, background: "rgba(148,163,184,0.3)", color: "var(--text-muted)" }}
                >
                  {stats.total - stats.buyCount - stats.sellCount}
                </div>
              )}
              {stats.sellCount > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                  style={{ width: `${(stats.sellCount / stats.total) * 100}%`, background: "rgb(239,68,68)" }}
                >
                  {stats.sellCount}
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "rgb(16,185,129)" }}>● Achat ({Math.round((stats.buyCount / stats.total) * 100)}%)</span>
              <span>● Neutre ({Math.round(((stats.total - stats.buyCount - stats.sellCount) / stats.total) * 100)}%)</span>
              <span style={{ color: "rgb(239,68,68)" }}>● Vente ({Math.round((stats.sellCount / stats.total) * 100)}%)</span>
            </div>
          </div>

          {/* Top signals strength ranking */}
          <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Top Signaux par Force</span>
            </div>
            <div className="space-y-2">
              {filteredRows
                .filter((r) => r.signal !== "neutral")
                .sort((a, b) => b.strength - a.strength)
                .slice(0, 5)
                .map((r, i) => (
                  <div key={r.symbol} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-4" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                    <SignalIcon signal={r.signal} />
                    <span className="text-xs font-bold flex-shrink-0 w-16" style={{ color: "var(--text-primary)" }}>{r.symbol}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${r.strength}%`,
                          background: r.signal === "buy"
                            ? "linear-gradient(90deg, rgb(16,185,129), rgb(52,211,153))"
                            : "linear-gradient(90deg, rgb(239,68,68), rgb(248,113,113))",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: signalColor(r.signal) }}>
                      {r.strength}
                    </span>
                  </div>
                ))}
              {filteredRows.filter((r) => r.signal !== "neutral").length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Aucun signal actif</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters bar */}
      <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("scanner_searchPlaceholder")}
              className="w-full rounded-lg pl-9 pr-3 py-2 text-sm"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                outline: "none",
              }}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="glass rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{
              color: activeFilterCount > 0 ? "rgb(6,182,212)" : "var(--text-secondary)",
              border: activeFilterCount > 0 ? "1px solid rgba(6,182,212,0.3)" : "1px solid var(--border)",
              background: activeFilterCount > 0 ? "rgba(6,182,212,0.08)" : undefined,
            }}
          >
            <Filter size={14} />
            {t("scanner_filters")}
            {activeFilterCount > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: "rgba(6,182,212,0.2)", color: "rgb(6,182,212)" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 flex flex-wrap gap-4" style={{ borderTop: "1px solid var(--border)" }}>
            {/* Type filter */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Type
              </label>
              <div className="flex gap-1.5">
                {(["all", "forex", "crypto", "commodities", "indices"] as InstrumentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: typeFilter === t ? "rgba(6,182,212,0.15)" : "var(--bg-secondary)",
                      color: typeFilter === t ? "rgb(6,182,212)" : "var(--text-secondary)",
                      border: typeFilter === t ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                    }}
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>
            </div>

            {/* Signal filter */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Signal
              </label>
              <div className="flex gap-1.5">
                {(["all", "buy", "sell", "neutral"] as SignalType[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSignalFilter(s)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: signalFilter === s
                        ? s === "buy" ? "rgba(16,185,129,0.12)"
                          : s === "sell" ? "rgba(239,68,68,0.12)"
                          : s === "neutral" ? "rgba(245,158,11,0.12)"
                          : "rgba(6,182,212,0.15)"
                        : "var(--bg-secondary)",
                      color: signalFilter === s
                        ? s === "buy" ? "rgb(16,185,129)"
                          : s === "sell" ? "rgb(239,68,68)"
                          : s === "neutral" ? "rgb(245,158,11)"
                          : "rgb(6,182,212)"
                        : "var(--text-secondary)",
                      border: signalFilter === s ? `1px solid ${signalColor(s === "all" ? "neutral" : s)}33` : "1px solid transparent",
                    }}
                  >
                    {s === "all" ? t("scanner_all") : signalLabel(s as "buy" | "sell" | "neutral")}
                  </button>
                ))}
              </div>
            </div>

            {/* Min strength */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Force min: {minStrength}
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={minStrength}
                onChange={(e) => setMinStrength(Number(e.target.value))}
                className="w-32 accent-cyan-400"
              />
            </div>

            {/* Reset */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setSignalFilter("all");
                  setMinStrength(0);
                }}
                className="self-end text-xs flex items-center gap-1 hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={12} /> Reinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-4 flex items-center gap-3"
          style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
          <Zap size={16} style={{ color: "rgb(239,68,68)" }} />
          <span className="text-sm" style={{ color: "rgb(239,68,68)" }}>{error}</span>
          <button onClick={() => fetchData()} className="ml-auto text-xs underline" style={{ color: "rgb(239,68,68)" }}>
            Reessayer
          </button>
        </div>
      )}

      {/* Social Sentiment (Reddit + Twitter) */}
      <SocialSentimentSection />

      {/* Main table */}
      <div className="glass rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw size={24} className="animate-spin text-cyan-400" />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des données...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Search size={24} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun instrument ne correspond aux filtres</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-xs font-semibold" style={{ color: "var(--text-secondary)", padding: "10px 6px", width: 30 }} />
                  <SortHeader label="Symbole" sortKeyName="symbol" />
                  <SortHeader label="Prix" sortKeyName="price" className="text-right" />
                  <SortHeader label="Variation %" sortKeyName="change" className="text-right" />
                  <th className="text-left text-xs font-semibold px-3 py-2.5" style={{ color: "var(--text-secondary)", padding: "10px 12px" }}>Volume</th>
                  <SortHeader label="Signal" sortKeyName="signal" />
                  <SortHeader label="Force" sortKeyName="strength" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.symbol}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedRow(selectedRow?.symbol === row.symbol ? null : row)}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: selectedRow?.symbol === row.symbol ? "rgba(6,182,212,0.04)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRow?.symbol !== row.symbol) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedRow?.symbol === row.symbol ? "rgba(6,182,212,0.04)" : "transparent";
                    }}
                  >
                    <td style={{ padding: "10px 6px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(row.symbol); }}
                        className="hover:opacity-70 transition"
                      >
                        <Star
                          size={14}
                          fill={favorites.includes(row.symbol) ? "#f59e0b" : "none"}
                          style={{ color: favorites.includes(row.symbol) ? "#f59e0b" : "var(--text-muted)" }}
                        />
                      </button>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium rounded px-1.5 py-0.5"
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-muted)",
                          }}>
                          {typeLabel(row.type).slice(0, 3).toUpperCase()}
                        </span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{row.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums font-medium" style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                      {formatPrice(row.price, row.symbol)}
                    </td>
                    <td className="text-right tabular-nums font-semibold" style={{
                      padding: "10px 12px",
                      color: row.change > 0 ? "rgb(16,185,129)" : row.change < 0 ? "rgb(239,68,68)" : "var(--text-muted)",
                    }}>
                      {row.change === 0 ? "—" : `${row.change > 0 ? "+" : ""}${row.change.toFixed(2)}%`}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {volumeIcon(row.volumeLevel)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            background: signalBg(row.signal),
                            color: signalColor(row.signal),
                          }}>
                          <SignalIcon signal={row.signal} />
                          {signalLabel(row.signal)}
                        </span>
                        {avSentiment[row.symbol] && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border"
                            style={{
                              background: avSentiment[row.symbol].label === "Bullish" ? "rgba(16,185,129,0.1)"
                                : avSentiment[row.symbol].label === "Bearish" ? "rgba(239,68,68,0.1)"
                                : "rgba(245,158,11,0.1)",
                              color: avSentiment[row.symbol].label === "Bullish" ? "rgb(16,185,129)"
                                : avSentiment[row.symbol].label === "Bearish" ? "rgb(239,68,68)"
                                : "rgb(245,158,11)",
                              borderColor: avSentiment[row.symbol].label === "Bullish" ? "rgba(16,185,129,0.3)"
                                : avSentiment[row.symbol].label === "Bearish" ? "rgba(239,68,68,0.3)"
                                : "rgba(245,158,11,0.3)",
                            }}
                            title={`Alpha Vantage Sentiment: ${avSentiment[row.symbol].score}`}
                          >
                            AV: {avSentiment[row.symbol].label === "Bullish" ? t("sentiment_bullish")
                              : avSentiment[row.symbol].label === "Bearish" ? t("sentiment_bearish")
                              : t("sentiment_neutral")}
                            {" "}({avSentiment[row.symbol].score.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {strengthBar(row.strength)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row count */}
        {filteredRows.length > 0 && (
          <div className="px-4 py-2 text-xs flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <span>{filteredRows.length} instrument{filteredRows.length > 1 ? "s" : ""} affiche{filteredRows.length > 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <RefreshCw size={10} />
              Actualisation auto toutes les 30s
            </span>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedRow && (
        <div className="glass rounded-xl p-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart3 size={18} className="text-cyan-400" />
              {selectedRow.symbol}
            </h2>
            <button onClick={() => setSelectedRow(null)} className="hover:opacity-70">
              <X size={18} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Prix actuel</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatPrice(selectedRow.price, selectedRow.symbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Variation</span>
              <span className="text-lg font-bold tabular-nums" style={{
                color: selectedRow.change > 0 ? "rgb(16,185,129)" : selectedRow.change < 0 ? "rgb(239,68,68)" : "var(--text-muted)",
              }}>
                {selectedRow.change === 0 ? "—" : `${selectedRow.change > 0 ? "+" : ""}${selectedRow.change.toFixed(2)}%`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Signal</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold"
                style={{ color: signalColor(selectedRow.signal) }}>
                <SignalIcon signal={selectedRow.signal} />
                {signalLabel(selectedRow.signal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Force</span>
              {strengthBar(selectedRow.strength)}
            </div>
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Type</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{typeLabel(selectedRow.type)}</span>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Volume</span>
                <div className="flex items-center gap-2">
                  {volumeIcon(selectedRow.volumeLevel)}
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {selectedRow.volumeLevel === "high" ? t("scanner_volumeHigh") : selectedRow.volumeLevel === "medium" ? t("scanner_volumeMedium") : t("scanner_volumeLow")}
                  </span>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>{t("scanner_recommendation")}</span>
                <span className="text-sm font-medium" style={{ color: signalColor(selectedRow.signal) }}>
                  {selectedRow.signal === "buy" && selectedRow.strength >= 65
                    ? t("scanner_strongBuyOpportunity")
                    : selectedRow.signal === "sell" && selectedRow.strength >= 65
                    ? t("scanner_strongSellPressure")
                    : selectedRow.signal === "buy"
                    ? t("scanner_moderateBullish")
                    : selectedRow.signal === "sell"
                    ? t("scanner_moderateBearish")
                    : t("scanner_noDirection")}
                </span>
              </div>
            </div>

            {/* AV Sentiment in detail panel */}
            {avSentiment[selectedRow.symbol] && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                    {t("sentiment_avBadge")} (Alpha Vantage)
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border"
                      style={{
                        background: avSentiment[selectedRow.symbol].label === "Bullish" ? "rgba(16,185,129,0.12)"
                          : avSentiment[selectedRow.symbol].label === "Bearish" ? "rgba(239,68,68,0.12)"
                          : "rgba(245,158,11,0.12)",
                        color: avSentiment[selectedRow.symbol].label === "Bullish" ? "rgb(16,185,129)"
                          : avSentiment[selectedRow.symbol].label === "Bearish" ? "rgb(239,68,68)"
                          : "rgb(245,158,11)",
                        borderColor: avSentiment[selectedRow.symbol].label === "Bullish" ? "rgba(16,185,129,0.3)"
                          : avSentiment[selectedRow.symbol].label === "Bearish" ? "rgba(239,68,68,0.3)"
                          : "rgba(245,158,11,0.3)",
                      }}
                    >
                      {avSentiment[selectedRow.symbol].label === "Bullish" ? t("sentiment_bullish")
                        : avSentiment[selectedRow.symbol].label === "Bearish" ? t("sentiment_bearish")
                        : t("sentiment_neutral")}
                    </span>
                    <span className="text-xs tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                      {t("sentiment_score")}: {avSentiment[selectedRow.symbol].score.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {loading && rows.length > 0 && (
        <div className="fixed bottom-4 right-4 glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)", zIndex: 50 }}>
          <RefreshCw size={12} className="animate-spin text-cyan-400" />
          {t("scanner_updating")}
        </div>
      )}
    </div>
  );
}
