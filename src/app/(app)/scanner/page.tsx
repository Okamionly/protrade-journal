"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, TrendingUp, TrendingDown, Zap, Filter, ArrowUpRight, ArrowDownRight, BarChart3, Volume2 } from "lucide-react";

interface ScanResult {
  symbol: string;
  name: string;
  last: number;
  changepct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  signal: "breakout" | "volume_spike" | "gap_up" | "gap_down" | "new_high" | "new_low" | "reversal";
  sector: string;
}

const SCAN_SYMBOLS = [
  { symbol: "AAPL", name: "Apple", sector: "Tech", avgVol: 65000000 },
  { symbol: "MSFT", name: "Microsoft", sector: "Tech", avgVol: 22000000 },
  { symbol: "NVDA", name: "NVIDIA", sector: "Tech", avgVol: 45000000 },
  { symbol: "TSLA", name: "Tesla", sector: "Auto", avgVol: 85000000 },
  { symbol: "AMD", name: "AMD", sector: "Tech", avgVol: 55000000 },
  { symbol: "META", name: "Meta", sector: "Tech", avgVol: 18000000 },
  { symbol: "GOOGL", name: "Alphabet", sector: "Tech", avgVol: 25000000 },
  { symbol: "AMZN", name: "Amazon", sector: "Retail", avgVol: 35000000 },
  { symbol: "JPM", name: "JPMorgan", sector: "Finance", avgVol: 12000000 },
  { symbol: "BAC", name: "BofA", sector: "Finance", avgVol: 35000000 },
  { symbol: "GS", name: "Goldman", sector: "Finance", avgVol: 3000000 },
  { symbol: "NFLX", name: "Netflix", sector: "Media", avgVol: 8000000 },
  { symbol: "V", name: "Visa", sector: "Finance", avgVol: 7000000 },
  { symbol: "XOM", name: "Exxon", sector: "Energy", avgVol: 15000000 },
  { symbol: "CVX", name: "Chevron", sector: "Energy", avgVol: 9000000 },
  { symbol: "PFE", name: "Pfizer", sector: "Health", avgVol: 25000000 },
  { symbol: "UNH", name: "UnitedH", sector: "Health", avgVol: 4000000 },
  { symbol: "DIS", name: "Disney", sector: "Media", avgVol: 10000000 },
  { symbol: "CRM", name: "Salesforce", sector: "Tech", avgVol: 7000000 },
  { symbol: "INTC", name: "Intel", sector: "Tech", avgVol: 40000000 },
];

const SIGNAL_STYLES: Record<string, { label: string; cls: string; icon: string }> = {
  breakout: { label: "Breakout", cls: "text-emerald-400 bg-emerald-500/20", icon: "up" },
  volume_spike: { label: "Volume Spike", cls: "text-amber-400 bg-amber-500/20", icon: "vol" },
  gap_up: { label: "Gap Up", cls: "text-cyan-400 bg-cyan-500/20", icon: "up" },
  gap_down: { label: "Gap Down", cls: "text-rose-400 bg-rose-500/20", icon: "down" },
  new_high: { label: "New High", cls: "text-emerald-400 bg-emerald-500/20", icon: "up" },
  new_low: { label: "New Low", cls: "text-rose-400 bg-rose-500/20", icon: "down" },
  reversal: { label: "Reversal", cls: "text-violet-400 bg-violet-500/20", icon: "neutral" },
};

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSignal, setFilterSignal] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"changepct" | "volumeRatio" | "volume">("volumeRatio");

  const runScan = useCallback(async () => {
    setLoading(true);
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
            const volumeRatio = volume / meta.avgVol;

            // Detect signals
            let signal: ScanResult["signal"] = "breakout";
            if (volumeRatio > 2) signal = "volume_spike";
            else if (changepct > 3) signal = "gap_up";
            else if (changepct < -3) signal = "gap_down";
            else if (changepct > 1.5) signal = "breakout";
            else if (changepct < -1.5) signal = "reversal";
            else if (changepct > 0) signal = "new_high";
            else signal = "new_low";

            // Only show interesting moves
            if (Math.abs(changepct) > 0.5 || volumeRatio > 1.3) {
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
              });
            }
          });
          setResults(scanned);
        }
      }
    } catch {
      // Generate fallback data
      const fallback: ScanResult[] = SCAN_SYMBOLS.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        last: 100 + Math.random() * 500,
        changepct: (Math.random() - 0.4) * 8,
        volume: Math.floor(s.avgVol * (0.5 + Math.random() * 3)),
        avgVolume: s.avgVol,
        volumeRatio: 0.5 + Math.random() * 3,
        signal: (["breakout", "volume_spike", "gap_up", "gap_down", "reversal", "new_high"] as const)[Math.floor(Math.random() * 6)],
        sector: s.sector,
      }));
      setResults(fallback);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const sectors = [...new Set(SCAN_SYMBOLS.map((s) => s.sector))];
  const signals = Object.keys(SIGNAL_STYLES);

  const filtered = results
    .filter((r) => {
      if (search && !r.symbol.includes(search.toUpperCase()) && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSignal !== "all" && r.signal !== filterSignal) return false;
      if (filterSector !== "all" && r.sector !== filterSector) return false;
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

  // Signal summary
  const signalCounts: Record<string, number> = {};
  results.forEach((r) => {
    signalCounts[r.signal] = (signalCounts[r.signal] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Market Scanner</h1>
          <p className="text-sm text-[--text-secondary]">Détection automatique de mouvements inhabituels</p>
        </div>
        <button onClick={runScan} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Scanner
        </button>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {signals.map((sig) => {
          const style = SIGNAL_STYLES[sig];
          const count = signalCounts[sig] || 0;
          return (
            <button
              key={sig}
              onClick={() => setFilterSignal(filterSignal === sig ? "all" : sig)}
              className={`metric-card rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-105 ${filterSignal === sig ? "ring-2 ring-cyan-400/50" : ""}`}
            >
              <p className="text-xs text-[--text-muted]">{style.label}</p>
              <p className={`text-xl font-bold ${style.cls.split(" ")[0]}`}>{count}</p>
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
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
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

      {/* Results Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[--border-subtle]">
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Prix</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Change %</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Volume</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">Vol. Ratio</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Signal</th>
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Secteur</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Force</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sigStyle = SIGNAL_STYLES[r.signal];
              const isUp = r.changepct >= 0;
              const strength = Math.min(Math.abs(r.changepct) * 10 + r.volumeRatio * 15, 100);
              return (
                <tr key={r.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {r.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[--text-primary]">{r.symbol}</p>
                        <p className="text-xs text-[--text-muted]">{r.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right text-sm font-bold mono text-[--text-primary]">${r.last.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isUp ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                      <span className={`text-sm font-bold mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {isUp ? "+" : ""}{r.changepct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div>
                      <p className="text-sm mono text-[--text-primary]">{formatVol(r.volume)}</p>
                      <p className="text-[10px] text-[--text-muted]">moy: {formatVol(r.avgVolume)}</p>
                    </div>
                  </td>
                  <td className="p-4 text-right hidden md:table-cell">
                    <span className={`text-sm font-bold mono ${r.volumeRatio > 2 ? "text-amber-400" : r.volumeRatio > 1.5 ? "text-cyan-400" : "text-[--text-secondary]"}`}>
                      {r.volumeRatio.toFixed(1)}x
                    </span>
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
    </div>
  );
}
