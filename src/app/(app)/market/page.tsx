"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  BarChart3,
  Activity,
  DollarSign,
  Minus,
  AlertTriangle,
  X,
  Clock,
} from "lucide-react";

interface QuoteData {
  symbol: string;
  last: number;
  change: number;
  changepct: number;
  high52: number | null;
  low52: number | null;
  volume: number;
  bid: number;
  ask: number;
}

interface CandleData {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

interface OptionsData {
  optionSymbol: string[];
  strike: number[];
  side: string[];
  bid: number[];
  ask: number[];
  last: number[];
  volume: number[];
  openInterest: number[];
  iv: number[];
  delta: number[];
  gamma: number[];
  theta: number[];
  expiration: number[];
}

const INDICES = ["SPY", "QQQ", "DIA", "IWM", "VIX"];
const POPULAR_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "JPM"];
const INDEX_NAMES: Record<string, string> = {
  SPY: "S&P 500", QQQ: "Nasdaq 100", DIA: "Dow Jones", IWM: "Russell 2000", VIX: "VIX",
};

export default function MarketPage() {
  const [indicesData, setIndicesData] = useState<QuoteData[]>([]);
  const [stocksData, setStocksData] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [searchResult, setSearchResult] = useState<QuoteData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandleData | null>(null);
  const [candleSymbol, setCandleSymbol] = useState("");
  const [optionsData, setOptionsData] = useState<OptionsData | null>(null);
  const [optionsSymbol, setOptionsSymbol] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsSide, setOptionsSide] = useState<"call" | "put">("call");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    const res = await fetch(`/api/market-data/quotes?symbols=${symbols.join(",")}`);
    if (!res.ok) throw new Error("Failed to fetch quotes");
    const data = await res.json();
    if (data.s !== "ok") throw new Error(data.errmsg || "No data");

    const quotes: QuoteData[] = [];
    for (let i = 0; i < (data.symbol?.length ?? 0); i++) {
      quotes.push({
        symbol: data.symbol[i],
        last: data.last?.[i] ?? 0,
        change: data.change?.[i] ?? 0,
        changepct: data.changepct?.[i] ?? 0,
        high52: data["52weekHigh"]?.[i] ?? null,
        low52: data["52weekLow"]?.[i] ?? null,
        volume: data.volume?.[i] ?? 0,
        bid: data.bid?.[i] ?? 0,
        ask: data.ask?.[i] ?? 0,
      });
    }
    return quotes;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [idx, stocks] = await Promise.all([
        fetchQuotes(INDICES),
        fetchQuotes(POPULAR_STOCKS),
      ]);
      setIndicesData(idx);
      setStocksData(stocks);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [fetchQuotes]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchSymbol.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    setSearchError(null);
    try {
      const quotes = await fetchQuotes([searchSymbol.trim().toUpperCase()]);
      if (quotes.length > 0) {
        setSearchResult(quotes[0]);
        await loadCandles(quotes[0].symbol);
      } else {
        setSearchError("Aucun résultat trouvé pour ce symbole.");
      }
    } catch {
      setSearchError("Symbole introuvable. Vérifiez et réessayez.");
    } finally {
      setSearchLoading(false);
    }
  };

  const loadCandles = async (symbol: string) => {
    setCandleSymbol(symbol);
    try {
      const res = await fetch(`/api/market-data/candles?symbol=${symbol}&resolution=D&countback=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok") setCandles(data);
        else setCandles(null);
      }
    } catch { setCandles(null); }
  };

  const loadOptions = async (symbol: string) => {
    setOptionsSymbol(symbol);
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/market-data/options?symbol=${symbol}&side=${optionsSide}&strikeLimit=8`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok") setOptionsData(data);
        else setOptionsData(null);
      }
    } catch { setOptionsData(null); }
    finally { setOptionsLoading(false); }
  };

  const formatVol = (v: number) => {
    if (!v) return "0";
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
  };

  const formatPrice = (p: number | null | undefined) => {
    if (p === null || p === undefined || isNaN(p)) return "—";
    return p.toFixed(2);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity className="w-6 h-6 text-cyan-400" /> Market Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Données temps réel via MarketData.app — Stocks, Indices &amp; Options
            {lastUpdated && (
              <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3 h-3 inline mr-1" />
                Dernière mise à jour: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">Réessayer</button>
            <button onClick={() => setError("")} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="metric-card rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Rechercher un symbole (ex: AAPL, TSLA, NVDA)..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="input-field w-full"
              style={{ paddingLeft: "2.75rem" }}
            />
          </div>
          <button onClick={handleSearch} className="px-6 py-2 rounded-xl bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition">
            {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Rechercher"}
          </button>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            {searchError}
          </div>
        )}

        {searchResult && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Symbole</div>
              <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{searchResult.symbol}</div>
              <div className="text-2xl font-bold mono mt-1" style={{ color: "var(--text-primary)" }}>
                ${formatPrice(searchResult.last)}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Variation</div>
              <div className={`text-xl font-bold mono ${searchResult.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {searchResult.change >= 0 ? "+" : ""}{formatPrice(searchResult.change)}
              </div>
              <div className={`text-sm mono ${searchResult.changepct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {searchResult.changepct != null ? `${(searchResult.changepct * 100).toFixed(2)}%` : "—"}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Volume</div>
              <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>{formatVol(searchResult.volume)}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Bid: ${formatPrice(searchResult.bid)} / Ask: ${formatPrice(searchResult.ask)}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>52 Semaines</div>
              <div className="text-sm">
                <span className="text-emerald-400 mono">H: ${formatPrice(searchResult.high52)}</span>
              </div>
              <div className="text-sm">
                <span className="text-rose-400 mono">L: ${formatPrice(searchResult.low52)}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => loadCandles(searchResult.symbol)} className="text-xs text-cyan-400 hover:underline">Chart</button>
                <button onClick={() => loadOptions(searchResult.symbol)} className="text-xs text-cyan-400 hover:underline">Options</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indices */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-cyan-400" /> Indices Majeurs
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {INDICES.map((_, i) => (
              <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 rounded w-20 mb-2" style={{ background: "var(--bg-hover)" }} />
                <div className="h-8 rounded w-24 mb-2" style={{ background: "var(--bg-hover)" }} />
                <div className="h-4 rounded w-16" style={{ background: "var(--bg-hover)" }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {indicesData.map((q) => {
              const pctDisplay = q.changepct != null ? (q.changepct * 100).toFixed(2) : "0.00";
              const isUp = (q.changepct ?? 0) > 0;
              const isDown = (q.changepct ?? 0) < 0;
              return (
                <div key={q.symbol} className="metric-card rounded-2xl p-5 cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition" onClick={() => { setSearchSymbol(q.symbol); setSearchResult(q); loadCandles(q.symbol); }}>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    {INDEX_NAMES[q.symbol] || q.symbol}
                  </div>
                  <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                    ${formatPrice(q.last)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {isUp ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : isDown ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Minus className="w-3.5 h-3.5 text-[--text-muted]" />}
                    <span className={`text-sm font-bold mono ${isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-[--text-muted]"}`}>
                      {isUp ? "+" : ""}{pctDisplay}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini Chart */}
      {candles && candleSymbol && (
        <div className="metric-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity className="w-4 h-4 text-cyan-400" /> {candleSymbol} — 30 derniers jours
          </h3>
          <div className="flex items-end gap-[2px] h-40">
            {candles.c.map((close, i) => {
              const open = candles.o[i];
              const isGreen = close >= open;
              const maxPrice = Math.max(...candles.h);
              const minPrice = Math.min(...candles.l);
              const range = maxPrice - minPrice || 1;
              const height = ((close - minPrice) / range) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                  <div
                    className="w-full rounded-t transition-all hover:opacity-80 cursor-default"
                    style={{
                      height: `${Math.max(height, 3)}%`,
                      background: isGreen ? "#10b981" : "#ef4444",
                    }}
                    title={`${new Date(candles.t[i] * 1000).toLocaleDateString()} O:${open?.toFixed(2)} H:${candles.h[i]?.toFixed(2)} L:${candles.l[i]?.toFixed(2)} C:${close?.toFixed(2)} V:${formatVol(candles.v[i] ?? 0)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            <span>{candles.t[0] ? new Date(candles.t[0] * 1000).toLocaleDateString() : ""}</span>
            <span>{candles.t[candles.t.length - 1] ? new Date(candles.t[candles.t.length - 1] * 1000).toLocaleDateString() : ""}</span>
          </div>
        </div>
      )}

      {/* Top Stocks */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <DollarSign className="w-5 h-5 text-cyan-400" /> Top Stocks
        </h2>
        {loading ? (
          <div className="metric-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-16 h-4 rounded" style={{ background: "var(--bg-hover)" }} />
                  <div className="flex-1 h-4 rounded" style={{ background: "var(--bg-hover)" }} />
                  <div className="w-20 h-4 rounded" style={{ background: "var(--bg-hover)" }} />
                </div>
              ))}
            </div>
          </div>
        ) : stocksData.length === 0 ? (
          <div className="metric-card rounded-2xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-50" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune donnée disponible. Vérifiez la clé API MarketData.</p>
          </div>
        ) : (
          <div className="metric-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-hover)" }}>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>Symbole</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>Prix</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>Variation</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Volume</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>52w High</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>52w Low</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...stocksData].sort((a, b) => (b.changepct || 0) - (a.changepct || 0)).map((q) => {
                  const pctDisplay = q.changepct != null ? (q.changepct * 100).toFixed(2) : "0.00";
                  const isUp = (q.changepct ?? 0) >= 0;
                  return (
                    <tr key={q.symbol} className="border-t transition hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--text-primary)" }}>{q.symbol}</td>
                      <td className="px-4 py-3 text-right mono font-medium" style={{ color: "var(--text-primary)" }}>${formatPrice(q.last)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? "+" : ""}{pctDisplay}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right mono text-sm hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>{formatVol(q.volume)}</td>
                      <td className="px-4 py-3 text-right mono text-sm hidden lg:table-cell" style={{ color: q.high52 ? "#34d399" : "var(--text-muted)" }}>{q.high52 ? `$${formatPrice(q.high52)}` : "N/A"}</td>
                      <td className="px-4 py-3 text-right mono text-sm hidden lg:table-cell" style={{ color: q.low52 ? "#f87171" : "var(--text-muted)" }}>{q.low52 ? `$${formatPrice(q.low52)}` : "N/A"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setCandleSymbol(q.symbol); loadCandles(q.symbol); }} className="text-xs text-cyan-400 hover:underline">Chart</button>
                          <button onClick={() => loadOptions(q.symbol)} className="text-xs text-cyan-400 hover:underline">Options</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Options Chain */}
      {optionsSymbol && (
        <div className="metric-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              Options Chain — {optionsSymbol}
            </h3>
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(["call", "put"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setOptionsSide(s); loadOptions(optionsSymbol); }}
                  className={`px-4 py-1.5 text-sm font-medium transition ${optionsSide === s ? (s === "call" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400") : ""}`}
                  style={optionsSide !== s ? { color: "var(--text-secondary)" } : {}}
                >
                  {s === "call" ? "Calls" : "Puts"}
                </button>
              ))}
            </div>
          </div>

          {optionsLoading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded" style={{ background: "var(--bg-hover)" }} />
              ))}
            </div>
          ) : optionsData && optionsData.strike?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-hover)" }}>
                    <th className="text-left px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>Strike</th>
                    <th className="text-right px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>Last</th>
                    <th className="text-right px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>Bid</th>
                    <th className="text-right px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>Ask</th>
                    <th className="text-right px-3 py-2 text-xs font-bold hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Vol</th>
                    <th className="text-right px-3 py-2 text-xs font-bold hidden md:table-cell" style={{ color: "var(--text-muted)" }}>OI</th>
                    <th className="text-right px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>IV</th>
                    <th className="text-right px-3 py-2 text-xs font-bold hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Delta</th>
                    <th className="text-right px-3 py-2 text-xs font-bold hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Theta</th>
                    <th className="text-right px-3 py-2 text-xs font-bold hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {optionsData.strike.map((strike, i) => (
                    <tr key={i} className="border-t transition hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2 font-bold mono" style={{ color: "var(--text-primary)" }}>${strike?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right mono" style={{ color: "var(--text-primary)" }}>${optionsData.last[i]?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right mono text-emerald-400">${optionsData.bid[i]?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right mono text-rose-400">${optionsData.ask[i]?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right mono hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>{formatVol(optionsData.volume?.[i] ?? 0)}</td>
                      <td className="px-3 py-2 text-right mono hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>{formatVol(optionsData.openInterest?.[i] ?? 0)}</td>
                      <td className="px-3 py-2 text-right mono text-cyan-400">{optionsData.iv?.[i] != null ? ((optionsData.iv[i]) * 100).toFixed(1) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right mono hidden lg:table-cell" style={{ color: "var(--text-secondary)" }}>{optionsData.delta?.[i]?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-right mono hidden lg:table-cell text-rose-400">{optionsData.theta?.[i]?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-xs hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>
                        {optionsData.expiration?.[i] ? new Date(optionsData.expiration[i] * 1000).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune donnée d&apos;options disponible.</p>
          )}
        </div>
      )}
    </div>
  );
}
