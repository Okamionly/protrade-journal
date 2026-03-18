"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, AlertTriangle, X } from "lucide-react";

interface SectorStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number; // relative weight
}

interface StockQuote {
  symbol: string;
  last: number;
  changepct: number;
}

const SECTORS: Record<string, SectorStock[]> = {
  "Technology": [
    { symbol: "AAPL", name: "Apple", sector: "Technology", marketCap: 30 },
    { symbol: "MSFT", name: "Microsoft", sector: "Technology", marketCap: 28 },
    { symbol: "NVDA", name: "NVIDIA", sector: "Technology", marketCap: 25 },
    { symbol: "GOOGL", name: "Alphabet", sector: "Technology", marketCap: 18 },
    { symbol: "META", name: "Meta", sector: "Technology", marketCap: 12 },
    { symbol: "AMD", name: "AMD", sector: "Technology", marketCap: 8 },
  ],
  "Consumer": [
    { symbol: "AMZN", name: "Amazon", sector: "Consumer", marketCap: 25 },
    { symbol: "TSLA", name: "Tesla", sector: "Consumer", marketCap: 20 },
    { symbol: "NFLX", name: "Netflix", sector: "Consumer", marketCap: 12 },
    { symbol: "NKE", name: "Nike", sector: "Consumer", marketCap: 8 },
  ],
  "Finance": [
    { symbol: "JPM", name: "JPMorgan", sector: "Finance", marketCap: 22 },
    { symbol: "BAC", name: "Bank of America", sector: "Finance", marketCap: 14 },
    { symbol: "GS", name: "Goldman Sachs", sector: "Finance", marketCap: 12 },
    { symbol: "V", name: "Visa", sector: "Finance", marketCap: 18 },
  ],
  "Healthcare": [
    { symbol: "JNJ", name: "J&J", sector: "Healthcare", marketCap: 18 },
    { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", marketCap: 20 },
    { symbol: "PFE", name: "Pfizer", sector: "Healthcare", marketCap: 10 },
    { symbol: "ABBV", name: "AbbVie", sector: "Healthcare", marketCap: 14 },
  ],
  "Energy": [
    { symbol: "XOM", name: "ExxonMobil", sector: "Energy", marketCap: 22 },
    { symbol: "CVX", name: "Chevron", sector: "Energy", marketCap: 16 },
    { symbol: "COP", name: "ConocoPhillips", sector: "Energy", marketCap: 10 },
  ],
  "Indices": [
    { symbol: "SPY", name: "S&P 500", sector: "Indices", marketCap: 30 },
    { symbol: "QQQ", name: "Nasdaq 100", sector: "Indices", marketCap: 25 },
    { symbol: "DIA", name: "Dow Jones", sector: "Indices", marketCap: 20 },
    { symbol: "IWM", name: "Russell 2000", sector: "Indices", marketCap: 15 },
  ],
};

export default function SectorHeatmapPage() {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [view, setView] = useState<"treemap" | "table">("treemap");

  const allSymbols = Object.values(SECTORS).flat().map((s) => s.symbol);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const res = await fetch(`/api/market-data/quotes?symbols=${allSymbols.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok" && data.symbol) {
          const newQuotes: Record<string, StockQuote> = {};
          data.symbol.forEach((sym: string, idx: number) => {
            newQuotes[sym] = {
              symbol: sym,
              last: data.last?.[idx] || 0,
              changepct: data.changepct?.[idx] || 0,
            };
          });
          setQuotes(newQuotes);
        }
      }
    } catch {
      setError("Impossible de charger les données. Réessayez.");
      // If we have no data yet, mark as using fallback (empty quotes shown)
      if (Object.keys(quotes).length === 0) {
        setUsingFallback(true);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getColor = (pct: number): string => {
    if (pct >= 3) return "bg-emerald-600";
    if (pct >= 2) return "bg-emerald-500";
    if (pct >= 1) return "bg-emerald-500/80";
    if (pct >= 0.5) return "bg-emerald-500/60";
    if (pct >= 0) return "bg-emerald-500/30";
    if (pct >= -0.5) return "bg-rose-500/30";
    if (pct >= -1) return "bg-rose-500/60";
    if (pct >= -2) return "bg-rose-500/80";
    if (pct >= -3) return "bg-rose-500";
    return "bg-rose-600";
  };

  const getTextColor = (pct: number) => Math.abs(pct) >= 1 ? "text-white" : "text-[--text-primary]";

  const sectorPerf = Object.entries(SECTORS).map(([name, stocks]) => {
    const pcts = stocks.map((s) => quotes[s.symbol]?.changepct || 0);
    const weights = stocks.map((s) => s.marketCap);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const avg = pcts.reduce((s, p, i) => s + p * (weights[i] / totalWeight), 0);
    return { name, avg, stocks };
  });

  const displaySectors = selectedSector ? sectorPerf.filter((s) => s.name === selectedSector) : sectorPerf;

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
            <button onClick={fetchData} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">Réessayer</button>
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
          <h1 className="text-2xl font-bold text-[--text-primary]">Heatmap Sectorielle</h1>
          <p className="text-sm text-[--text-secondary]">Performance des secteurs en temps réel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("treemap")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "treemap" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            Treemap
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "table" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            Table
          </button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sector Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSector(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedSector ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"}`}
        >
          Tous
        </button>
        {sectorPerf.map(({ name, avg }) => (
          <button
            key={name}
            onClick={() => setSelectedSector(selectedSector === name ? null : name)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedSector === name ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            {name}
            <span className={`text-xs ${avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {view === "treemap" ? (
        /* Treemap View */
        <div className="space-y-6">
          {displaySectors.map(({ name, avg, stocks }) => (
            <div key={name} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-[--text-primary]">{name}</h3>
                </div>
                <span className={`text-sm font-medium ${avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {stocks.map((stock) => {
                  const q = quotes[stock.symbol];
                  const pct = q?.changepct || 0;
                  return (
                    <div
                      key={stock.symbol}
                      className={`${getColor(pct)} rounded-xl p-3 flex flex-col justify-between transition-transform hover:scale-105 cursor-default`}
                      style={{ minHeight: `${60 + stock.marketCap * 1.5}px` }}
                    >
                      <div>
                        <p className={`text-sm font-bold ${getTextColor(pct)}`}>{stock.symbol}</p>
                        <p className={`text-xs opacity-80 ${getTextColor(pct)}`}>{stock.name}</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold mono ${getTextColor(pct)}`}>
                          {q ? `$${q.last.toFixed(2)}` : "—"}
                        </p>
                        <p className={`text-sm font-medium ${getTextColor(pct)}`}>
                          {q ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border-subtle]">
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Secteur</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Prix</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Change %</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Performance</th>
              </tr>
            </thead>
            <tbody>
              {displaySectors.flatMap(({ stocks }) => stocks).sort((a, b) => (quotes[b.symbol]?.changepct || 0) - (quotes[a.symbol]?.changepct || 0)).map((stock) => {
                const q = quotes[stock.symbol];
                const pct = q?.changepct || 0;
                return (
                  <tr key={stock.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover]">
                    <td className="p-4">
                      <p className="font-semibold text-sm text-[--text-primary]">{stock.symbol}</p>
                      <p className="text-xs text-[--text-muted]">{stock.name}</p>
                    </td>
                    <td className="p-4 text-sm text-[--text-secondary]">{stock.sector}</td>
                    <td className="p-4 text-right text-sm font-bold mono text-[--text-primary]">{q ? `$${q.last.toFixed(2)}` : "—"}</td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-medium px-2 py-1 rounded-lg ${pct >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="w-24 h-3 bg-[--bg-secondary]/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(Math.abs(pct) * 10, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Color Legend */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: "-3%+", cls: "bg-rose-600" },
            { label: "-2%", cls: "bg-rose-500" },
            { label: "-1%", cls: "bg-rose-500/60" },
            { label: "0%", cls: "bg-gray-500/30" },
            { label: "+1%", cls: "bg-emerald-500/60" },
            { label: "+2%", cls: "bg-emerald-500" },
            { label: "+3%+", cls: "bg-emerald-600" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-6 h-4 rounded ${cls}`} />
              <span className="text-xs text-[--text-muted]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
