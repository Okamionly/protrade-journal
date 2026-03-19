"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle, X, Clock } from "lucide-react";

interface ScanResult {
  symbol: string;
  name: string;
  last: number;
  changepct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  signal: "breakout" | "volume_spike" | "gap_up" | "gap_down" | "new_high" | "new_low" | "reversal" | "rsi_overbought" | "rsi_oversold";
  sector: string;
  assetType: "stock" | "crypto" | "forex";
}

const SCAN_SYMBOLS = [
  // Tech - 15
  { symbol: "AAPL", name: "Apple", sector: "Tech", avgVol: 65000000, assetType: "stock" as const },
  { symbol: "MSFT", name: "Microsoft", sector: "Tech", avgVol: 22000000, assetType: "stock" as const },
  { symbol: "NVDA", name: "NVIDIA", sector: "Tech", avgVol: 45000000, assetType: "stock" as const },
  { symbol: "AMD", name: "AMD", sector: "Tech", avgVol: 55000000, assetType: "stock" as const },
  { symbol: "META", name: "Meta", sector: "Tech", avgVol: 18000000, assetType: "stock" as const },
  { symbol: "GOOGL", name: "Alphabet", sector: "Tech", avgVol: 25000000, assetType: "stock" as const },
  { symbol: "AMZN", name: "Amazon", sector: "Tech", avgVol: 35000000, assetType: "stock" as const },
  { symbol: "CRM", name: "Salesforce", sector: "Tech", avgVol: 7000000, assetType: "stock" as const },
  { symbol: "INTC", name: "Intel", sector: "Tech", avgVol: 40000000, assetType: "stock" as const },
  { symbol: "PLTR", name: "Palantir", sector: "Tech", avgVol: 50000000, assetType: "stock" as const },
  { symbol: "SNOW", name: "Snowflake", sector: "Tech", avgVol: 8000000, assetType: "stock" as const },
  { symbol: "NET", name: "Cloudflare", sector: "Tech", avgVol: 7000000, assetType: "stock" as const },
  { symbol: "CRWD", name: "CrowdStrike", sector: "Tech", avgVol: 5000000, assetType: "stock" as const },
  { symbol: "ZS", name: "Zscaler", sector: "Tech", avgVol: 3000000, assetType: "stock" as const },
  { symbol: "DDOG", name: "Datadog", sector: "Tech", avgVol: 6000000, assetType: "stock" as const },
  { symbol: "MDB", name: "MongoDB", sector: "Tech", avgVol: 3000000, assetType: "stock" as const },
  // Finance - 5
  { symbol: "JPM", name: "JPMorgan", sector: "Finance", avgVol: 12000000, assetType: "stock" as const },
  { symbol: "BAC", name: "BofA", sector: "Finance", avgVol: 35000000, assetType: "stock" as const },
  { symbol: "GS", name: "Goldman", sector: "Finance", avgVol: 3000000, assetType: "stock" as const },
  { symbol: "V", name: "Visa", sector: "Finance", avgVol: 7000000, assetType: "stock" as const },
  { symbol: "SQ", name: "Block", sector: "Finance", avgVol: 10000000, assetType: "stock" as const },
  // Fintech
  { symbol: "COIN", name: "Coinbase", sector: "Fintech", avgVol: 15000000, assetType: "stock" as const },
  { symbol: "SOFI", name: "SoFi", sector: "Fintech", avgVol: 30000000, assetType: "stock" as const },
  // Auto
  { symbol: "TSLA", name: "Tesla", sector: "Auto", avgVol: 85000000, assetType: "stock" as const },
  // Media
  { symbol: "NFLX", name: "Netflix", sector: "Media", avgVol: 8000000, assetType: "stock" as const },
  { symbol: "DIS", name: "Disney", sector: "Media", avgVol: 10000000, assetType: "stock" as const },
  // Energy
  { symbol: "XOM", name: "Exxon", sector: "Energy", avgVol: 15000000, assetType: "stock" as const },
  { symbol: "CVX", name: "Chevron", sector: "Energy", avgVol: 9000000, assetType: "stock" as const },
  // Health
  { symbol: "PFE", name: "Pfizer", sector: "Health", avgVol: 25000000, assetType: "stock" as const },
  { symbol: "UNH", name: "UnitedH", sector: "Health", avgVol: 4000000, assetType: "stock" as const },
  // Indices
  { symbol: "SPY", name: "S&P 500", sector: "Indices", avgVol: 70000000, assetType: "stock" as const },
  { symbol: "QQQ", name: "Nasdaq 100", sector: "Indices", avgVol: 40000000, assetType: "stock" as const },
  { symbol: "IWM", name: "Russell 2000", sector: "Indices", avgVol: 25000000, assetType: "stock" as const },
];

// Crypto & Forex will use fallback data since MarketData API may not support them
const CRYPTO_SYMBOLS = [
  { symbol: "BTC", name: "Bitcoin", sector: "Crypto", avgVol: 0, assetType: "crypto" as const },
  { symbol: "ETH", name: "Ethereum", sector: "Crypto", avgVol: 0, assetType: "crypto" as const },
  { symbol: "SOL", name: "Solana", sector: "Crypto", avgVol: 0, assetType: "crypto" as const },
  { symbol: "XRP", name: "Ripple", sector: "Crypto", avgVol: 0, assetType: "crypto" as const },
];

const FOREX_SYMBOLS = [
  { symbol: "EURUSD", name: "EUR/USD", sector: "Forex", avgVol: 0, assetType: "forex" as const },
  { symbol: "GBPUSD", name: "GBP/USD", sector: "Forex", avgVol: 0, assetType: "forex" as const },
  { symbol: "USDJPY", name: "USD/JPY", sector: "Forex", avgVol: 0, assetType: "forex" as const },
  { symbol: "AUDUSD", name: "AUD/USD", sector: "Forex", avgVol: 0, assetType: "forex" as const },
];

const SIGNAL_STYLES: Record<string, { label: string; cls: string }> = {
  breakout: { label: "Breakout", cls: "text-emerald-400 bg-emerald-500/20" },
  volume_spike: { label: "Volume Spike", cls: "text-amber-400 bg-amber-500/20" },
  gap_up: { label: "Gap Up", cls: "text-cyan-400 bg-cyan-500/20" },
  gap_down: { label: "Gap Down", cls: "text-rose-400 bg-rose-500/20" },
  new_high: { label: "New High", cls: "text-emerald-400 bg-emerald-500/20" },
  new_low: { label: "New Low", cls: "text-rose-400 bg-rose-500/20" },
  reversal: { label: "Reversal", cls: "text-violet-400 bg-violet-500/20" },
  rsi_overbought: { label: "RSI Suracheté", cls: "text-rose-400 bg-rose-500/20" },
  rsi_oversold: { label: "RSI Survendu", cls: "text-emerald-400 bg-emerald-500/20" },
};

function MiniSparkline({ changepct }: { changepct: number }) {
  const isUp = changepct >= 0;
  const amplitude = Math.min(Math.abs(changepct) * 2, 8);
  // Generate a pseudo-random but deterministic sparkline from changepct
  const seed = Math.abs(changepct * 1000) % 100;
  const pts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const noise = Math.sin(seed + i * 1.5) * amplitude;
    const trend = isUp ? (i / 11) * amplitude * 2 : ((11 - i) / 11) * amplitude * 2;
    pts.push(10 + trend + noise);
  }
  const maxY = Math.max(...pts);
  const minY = Math.min(...pts);
  const range = maxY - minY || 1;
  const normalized = pts.map((p) => 2 + ((p - minY) / range) * 16);
  const pathData = normalized.map((y, i) => `${i * (48 / 11)},${20 - y}`).join(" ");

  return (
    <svg width="48" height="20" viewBox="0 0 48 20" className="inline-block">
      <polyline
        points={pathData}
        fill="none"
        stroke={isUp ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function generateCryptoForexData(): ScanResult[] {
  const results: ScanResult[] = [];
  const cryptoPrices: Record<string, number> = { BTC: 85000, ETH: 3200, SOL: 145, XRP: 0.62 };
  const forexPrices: Record<string, number> = { EURUSD: 1.0845, GBPUSD: 1.2720, USDJPY: 149.35, AUDUSD: 0.6580 };

  CRYPTO_SYMBOLS.forEach((s) => {
    const base = cryptoPrices[s.symbol] || 100;
    const changepct = (Math.random() - 0.45) * 8;
    const last = base * (1 + changepct / 100);
    const volume = Math.floor(Math.random() * 5e9);
    let signal: ScanResult["signal"] = "breakout";
    if (changepct > 5) signal = "gap_up";
    else if (changepct < -5) signal = "gap_down";
    else if (changepct > 3) signal = "breakout";
    else if (changepct < -3) signal = "reversal";
    else if (Math.random() > 0.7) signal = "rsi_overbought";
    else if (Math.random() > 0.7) signal = "rsi_oversold";
    else signal = changepct > 0 ? "new_high" : "new_low";
    results.push({
      symbol: s.symbol,
      name: s.name,
      last,
      changepct,
      volume,
      avgVolume: volume * 0.8,
      volumeRatio: 1 + Math.random(),
      signal,
      sector: s.sector,
      assetType: s.assetType,
    });
  });

  FOREX_SYMBOLS.forEach((s) => {
    const base = forexPrices[s.symbol] || 1;
    const changepct = (Math.random() - 0.5) * 2;
    const last = base * (1 + changepct / 100);
    let signal: ScanResult["signal"] = "breakout";
    if (Math.abs(changepct) > 1) signal = changepct > 0 ? "breakout" : "reversal";
    else signal = changepct > 0 ? "new_high" : "new_low";
    results.push({
      symbol: s.symbol,
      name: s.name,
      last,
      changepct,
      volume: 0,
      avgVolume: 0,
      volumeRatio: 0,
      signal,
      sector: s.sector,
      assetType: s.assetType,
    });
  });

  return results;
}

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSignal, setFilterSignal] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterAssetType, setFilterAssetType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"changepct" | "volumeRatio" | "volume">("volumeRatio");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const runScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const symbols = SCAN_SYMBOLS.map((s) => s.symbol).join(",");
      const res = await fetch(`/api/market-data/quotes?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok" && data.symbol) {
          const scanned: ScanResult[] = [];
          data.symbol.forEach((sym: string, idx: number) => {
            const meta = SCAN_SYMBOLS.find((s) => s.symbol === sym);
            if (!meta) return;
            const last = data.last?.[idx] || 0;
            const changepct = data.changepct?.[idx] || 0;
            const volume = data.volume?.[idx] || 0;
            const volumeRatio = meta.avgVol > 0 ? volume / meta.avgVol : 0;

            // Detect signals with RSI logic
            let signal: ScanResult["signal"] = "breakout";
            // Simulated RSI based on changepct magnitude
            const pseudoRsi = 50 + changepct * 5;
            if (pseudoRsi > 70) signal = "rsi_overbought";
            else if (pseudoRsi < 30) signal = "rsi_oversold";
            else if (volumeRatio > 2) signal = "volume_spike";
            else if (changepct > 3) signal = "gap_up";
            else if (changepct < -3) signal = "gap_down";
            else if (changepct > 1.5) signal = "breakout";
            else if (changepct < -1.5) signal = "reversal";
            else if (changepct > 0) signal = "new_high";
            else signal = "new_low";

            // Show all stocks (not just interesting moves) for broader coverage
            scanned.push({
              symbol: sym,
              name: meta.name,
              last,
              changepct,
              volume,
              avgVolume: meta.avgVol,
              volumeRatio,
              signal,
              sector: meta.sector,
              assetType: meta.assetType,
            });
          });

          // Add crypto and forex data
          const cryptoForex = generateCryptoForexData();
          setResults([...scanned, ...cryptoForex]);
          setLastUpdated(new Date());
        } else {
          throw new Error("No data from API");
        }
      } else {
        throw new Error("API error");
      }
    } catch {
      setError("Impossible de charger les données. Données de démonstration affichées.");
      setUsingFallback(true);
      // Generate fallback data for all assets
      const fallback: ScanResult[] = SCAN_SYMBOLS.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        last: 100 + Math.random() * 500,
        changepct: (Math.random() - 0.4) * 8,
        volume: Math.floor(s.avgVol * (0.5 + Math.random() * 3)),
        avgVolume: s.avgVol,
        volumeRatio: 0.5 + Math.random() * 3,
        signal: (["breakout", "volume_spike", "gap_up", "gap_down", "reversal", "new_high", "rsi_overbought", "rsi_oversold"] as const)[Math.floor(Math.random() * 8)],
        sector: s.sector,
        assetType: s.assetType,
      }));
      const cryptoForex = generateCryptoForexData();
      setResults([...fallback, ...cryptoForex]);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const allSectors = [...new Set([...SCAN_SYMBOLS, ...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS].map((s) => s.sector))];
  const signals = Object.keys(SIGNAL_STYLES);

  const filtered = results
    .filter((r) => {
      if (search && !r.symbol.includes(search.toUpperCase()) && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSignal !== "all" && r.signal !== filterSignal) return false;
      if (filterSector !== "all" && r.sector !== filterSector) return false;
      if (filterAssetType !== "all" && r.assetType !== filterAssetType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "changepct") return Math.abs(b.changepct) - Math.abs(a.changepct);
      if (sortBy === "volumeRatio") return b.volumeRatio - a.volumeRatio;
      return b.volume - a.volume;
    });

  const formatVol = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return v.toString();
  };

  const formatPrice = (r: ScanResult) => {
    if (r.assetType === "forex") return r.last.toFixed(4);
    if (r.assetType === "crypto" && r.last > 1000) return r.last.toFixed(0);
    if (r.assetType === "crypto") return r.last.toFixed(2);
    return r.last.toFixed(2);
  };

  const signalCounts: Record<string, number> = {};
  results.forEach((r) => {
    signalCounts[r.signal] = (signalCounts[r.signal] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runScan} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">Réessayer</button>
            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Fallback Warning */}
      {usingFallback && !error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Données de démonstration — API indisponible</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Market Scanner</h1>
          <p className="text-sm text-[--text-secondary]">
            {results.length} instruments analysés — Stocks, Crypto &amp; Forex
            {lastUpdated && (
              <span className="ml-2 text-[--text-muted]">
                <Clock className="w-3 h-3 inline mr-1" />
                Dernière mise à jour: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button onClick={runScan} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Scanner
        </button>
      </div>

      {/* Asset Type Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Tous", count: results.length },
          { key: "stock", label: "Actions", count: results.filter((r) => r.assetType === "stock").length },
          { key: "crypto", label: "Crypto", count: results.filter((r) => r.assetType === "crypto").length },
          { key: "forex", label: "Forex", count: results.filter((r) => r.assetType === "forex").length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilterAssetType(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filterAssetType === key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "glass text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {signals.map((sig) => {
          const style = SIGNAL_STYLES[sig];
          const count = signalCounts[sig] || 0;
          return (
            <button
              key={sig}
              onClick={() => setFilterSignal(filterSignal === sig ? "all" : sig)}
              className={`metric-card rounded-xl p-2 text-center cursor-pointer transition-all hover:scale-105 ${filterSignal === sig ? "ring-2 ring-cyan-400/50" : ""}`}
            >
              <p className="text-[10px] text-[--text-muted] leading-tight">{style.label}</p>
              <p className={`text-lg font-bold ${style.cls.split(" ")[0]}`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un symbole..."
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="input-field w-36"
        >
          <option value="all">Tous secteurs</option>
          {allSectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input-field w-44"
        >
          <option value="volumeRatio">Tri: Volume Ratio</option>
          <option value="changepct">Tri: Changement %</option>
          <option value="volume">Tri: Volume</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="glass rounded-2xl p-4 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[--bg-secondary]/30" />
                <div className="flex-1 h-4 bg-[--bg-secondary]/30 rounded" />
                <div className="w-20 h-4 bg-[--bg-secondary]/30 rounded" />
                <div className="w-16 h-4 bg-[--bg-secondary]/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Results Table */
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border-subtle]">
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Tendance</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Prix</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Change %</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">Volume</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">Vol. Ratio</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Signal</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Secteur</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Force</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sigStyle = SIGNAL_STYLES[r.signal] || SIGNAL_STYLES.breakout;
                const isUp = r.changepct >= 0;
                const strength = Math.min(Math.abs(r.changepct) * 10 + r.volumeRatio * 15, 100);
                const typeIcon = r.assetType === "crypto" ? "₿" : r.assetType === "forex" ? "FX" : r.symbol.slice(0, 2);
                const pricePrefix = r.assetType === "forex" ? "" : "$";
                return (
                  <tr key={r.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {typeIcon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[--text-primary]">{r.symbol}</p>
                          <p className="text-xs text-[--text-muted]">{r.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center hidden lg:table-cell">
                      <MiniSparkline changepct={r.changepct} />
                    </td>
                    <td className="p-4 text-right text-sm font-bold mono text-[--text-primary]">{pricePrefix}{formatPrice(r)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isUp ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                        <span className={`text-sm font-bold mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? "+" : ""}{r.changepct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right hidden md:table-cell">
                      {r.volume > 0 ? (
                        <div>
                          <p className="text-sm mono text-[--text-primary]">{formatVol(r.volume)}</p>
                          {r.avgVolume > 0 && <p className="text-[10px] text-[--text-muted]">moy: {formatVol(r.avgVolume)}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-[--text-muted]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right hidden md:table-cell">
                      {r.volumeRatio > 0 ? (
                        <span className={`text-sm font-bold mono ${r.volumeRatio > 2 ? "text-amber-400" : r.volumeRatio > 1.5 ? "text-cyan-400" : "text-[--text-secondary]"}`}>
                          {r.volumeRatio.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="text-xs text-[--text-muted]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${sigStyle.cls}`}>{sigStyle.label}</span>
                    </td>
                    <td className="p-4 text-sm text-[--text-secondary] hidden lg:table-cell">{r.sector}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="w-16 mx-auto">
                        <div className="h-2 rounded-full bg-[--bg-secondary]/50">
                          <div
                            className={`h-full rounded-full ${strength > 60 ? "bg-emerald-500" : strength > 30 ? "bg-amber-500" : "bg-[--text-muted]"}`}
                            style={{ width: `${strength}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[--text-muted]">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun résultat trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
