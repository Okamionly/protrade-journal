"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, BarChart3, AlertTriangle, X, Clock, Globe } from "lucide-react";

interface SectorStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
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
    { symbol: "INTC", name: "Intel", sector: "Technology", marketCap: 6 },
    { symbol: "CRM", name: "Salesforce", sector: "Technology", marketCap: 10 },
    { symbol: "ORCL", name: "Oracle", sector: "Technology", marketCap: 9 },
    { symbol: "ADBE", name: "Adobe", sector: "Technology", marketCap: 8 },
  ],
  "Consumer": [
    { symbol: "AMZN", name: "Amazon", sector: "Consumer", marketCap: 25 },
    { symbol: "TSLA", name: "Tesla", sector: "Consumer", marketCap: 20 },
    { symbol: "NFLX", name: "Netflix", sector: "Consumer", marketCap: 12 },
    { symbol: "NKE", name: "Nike", sector: "Consumer", marketCap: 8 },
    { symbol: "SBUX", name: "Starbucks", sector: "Consumer", marketCap: 7 },
    { symbol: "MCD", name: "McDonald's", sector: "Consumer", marketCap: 9 },
    { symbol: "DIS", name: "Disney", sector: "Consumer", marketCap: 8 },
  ],
  "Finance": [
    { symbol: "JPM", name: "JPMorgan", sector: "Finance", marketCap: 22 },
    { symbol: "BAC", name: "Bank of America", sector: "Finance", marketCap: 14 },
    { symbol: "GS", name: "Goldman Sachs", sector: "Finance", marketCap: 12 },
    { symbol: "V", name: "Visa", sector: "Finance", marketCap: 18 },
    { symbol: "MA", name: "Mastercard", sector: "Finance", marketCap: 15 },
    { symbol: "MS", name: "Morgan Stanley", sector: "Finance", marketCap: 10 },
    { symbol: "BLK", name: "BlackRock", sector: "Finance", marketCap: 9 },
  ],
  "Healthcare": [
    { symbol: "JNJ", name: "J&J", sector: "Healthcare", marketCap: 18 },
    { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", marketCap: 20 },
    { symbol: "PFE", name: "Pfizer", sector: "Healthcare", marketCap: 10 },
    { symbol: "ABBV", name: "AbbVie", sector: "Healthcare", marketCap: 14 },
    { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare", marketCap: 16 },
    { symbol: "MRK", name: "Merck", sector: "Healthcare", marketCap: 12 },
    { symbol: "TMO", name: "Thermo Fisher", sector: "Healthcare", marketCap: 8 },
  ],
  "Energy": [
    { symbol: "XOM", name: "ExxonMobil", sector: "Energy", marketCap: 22 },
    { symbol: "CVX", name: "Chevron", sector: "Energy", marketCap: 16 },
    { symbol: "COP", name: "ConocoPhillips", sector: "Energy", marketCap: 10 },
    { symbol: "SLB", name: "Schlumberger", sector: "Energy", marketCap: 8 },
    { symbol: "EOG", name: "EOG Resources", sector: "Energy", marketCap: 7 },
  ],
  "Industrials": [
    { symbol: "CAT", name: "Caterpillar", sector: "Industrials", marketCap: 14 },
    { symbol: "BA", name: "Boeing", sector: "Industrials", marketCap: 12 },
    { symbol: "HON", name: "Honeywell", sector: "Industrials", marketCap: 10 },
    { symbol: "UPS", name: "UPS", sector: "Industrials", marketCap: 8 },
    { symbol: "GE", name: "GE Aerospace", sector: "Industrials", marketCap: 11 },
  ],
  "Cybersecurity & Cloud": [
    { symbol: "CRWD", name: "CrowdStrike", sector: "Cybersecurity & Cloud", marketCap: 12 },
    { symbol: "ZS", name: "Zscaler", sector: "Cybersecurity & Cloud", marketCap: 8 },
    { symbol: "NET", name: "Cloudflare", sector: "Cybersecurity & Cloud", marketCap: 9 },
    { symbol: "DDOG", name: "Datadog", sector: "Cybersecurity & Cloud", marketCap: 8 },
    { symbol: "SNOW", name: "Snowflake", sector: "Cybersecurity & Cloud", marketCap: 7 },
    { symbol: "MDB", name: "MongoDB", sector: "Cybersecurity & Cloud", marketCap: 6 },
  ],
  "Indices": [
    { symbol: "SPY", name: "S&P 500", sector: "Indices", marketCap: 30 },
    { symbol: "QQQ", name: "Nasdaq 100", sector: "Indices", marketCap: 25 },
    { symbol: "DIA", name: "Dow Jones", sector: "Indices", marketCap: 20 },
    { symbol: "IWM", name: "Russell 2000", sector: "Indices", marketCap: 15 },
  ],
};

// Global markets — use simulated data since these are not available on MarketData.app
const GLOBAL_MARKETS = [
  { symbol: "DAX", name: "DAX 40", region: "Europe" },
  { symbol: "FTSE", name: "FTSE 100", region: "Europe" },
  { symbol: "CAC40", name: "CAC 40", region: "Europe" },
  { symbol: "STOXX50", name: "Euro Stoxx 50", region: "Europe" },
  { symbol: "NIKKEI", name: "Nikkei 225", region: "Asie" },
  { symbol: "HSI", name: "Hang Seng", region: "Asie" },
  { symbol: "SHANGHAI", name: "Shanghai Comp.", region: "Asie" },
  { symbol: "KOSPI", name: "KOSPI", region: "Asie" },
  { symbol: "ASX200", name: "ASX 200", region: "Asie-Pacifique" },
  { symbol: "IBOV", name: "Bovespa", region: "Amériques" },
  { symbol: "TSX", name: "TSX", region: "Amériques" },
];

function generateGlobalMarketsData() {
  return GLOBAL_MARKETS.map((m) => ({
    ...m,
    changepct: (Math.random() - 0.45) * 4,
    last: 5000 + Math.random() * 30000,
  }));
}

export default function SectorHeatmapPage() {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [view, setView] = useState<"treemap" | "table">("treemap");
  const [showGlobal, setShowGlobal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [globalData, setGlobalData] = useState<ReturnType<typeof generateGlobalMarketsData>>([]);

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
          setLastUpdated(new Date());
        }
      } else {
        throw new Error("API error");
      }
    } catch {
      setError("Impossible de charger les données. Réessayez.");
      if (Object.keys(quotes).length === 0) {
        setUsingFallback(true);
      }
    }
    // Generate global markets data (simulated)
    setGlobalData(generateGlobalMarketsData());
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enhanced color gradient — more visible and varied
  const getColor = (pct: number): string => {
    if (pct >= 5) return "bg-emerald-700";
    if (pct >= 3) return "bg-emerald-600";
    if (pct >= 2) return "bg-emerald-500";
    if (pct >= 1) return "bg-emerald-500/80";
    if (pct >= 0.5) return "bg-emerald-500/50";
    if (pct >= 0.1) return "bg-emerald-500/25";
    if (pct >= -0.1) return "bg-gray-600/40";
    if (pct >= -0.5) return "bg-rose-500/25";
    if (pct >= -1) return "bg-rose-500/50";
    if (pct >= -2) return "bg-rose-500/80";
    if (pct >= -3) return "bg-rose-500";
    if (pct >= -5) return "bg-rose-600";
    return "bg-rose-700";
  };

  const getTextColor = (pct: number) => Math.abs(pct) >= 0.5 ? "text-white" : "text-[--text-primary]";

  const sectorPerf = Object.entries(SECTORS).map(([name, stocks]) => {
    const pcts = stocks.map((s) => quotes[s.symbol]?.changepct || 0);
    const weights = stocks.map((s) => s.marketCap);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const avg = totalWeight > 0 ? pcts.reduce((s, p, i) => s + p * (weights[i] / totalWeight), 0) : 0;
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
          <p className="text-sm text-[--text-secondary]">
            Performance des secteurs en temps réel
            {lastUpdated && (
              <span className="ml-2 text-[--text-muted]">
                <Clock className="w-3 h-3 inline mr-1" />
                Dernière mise à jour: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGlobal(!showGlobal)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              showGlobal ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"
            }`}
          >
            <Globe className="w-4 h-4" /> Global
          </button>
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

      {/* Global Markets */}
      {showGlobal && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-cyan-400" />
            Marchés Mondiaux
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {globalData.map((m) => {
              const pct = m.changepct;
              const isUp = pct >= 0;
              return (
                <div
                  key={m.symbol}
                  className={`${getColor(pct)} rounded-xl p-3 transition-transform hover:scale-105 cursor-default`}
                >
                  <p className={`text-xs opacity-70 ${getTextColor(pct)}`}>{m.region}</p>
                  <p className={`text-sm font-bold ${getTextColor(pct)}`}>{m.name}</p>
                  <p className={`text-lg font-bold mono mt-1 ${getTextColor(pct)}`}>
                    {m.last.toFixed(0)}
                  </p>
                  <p className={`text-sm font-medium ${getTextColor(pct)}`}>
                    {isUp ? "+" : ""}{pct.toFixed(2)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Loading Skeleton */}
      {loading && Object.keys(quotes).length === 0 ? (
        <div className="glass rounded-2xl p-5 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[--bg-secondary]/30" />
            ))}
          </div>
        </div>
      ) : view === "treemap" ? (
        /* Treemap View */
        <div className="space-y-6">
          {displaySectors.map(({ name, avg, stocks }) => (
            <div key={name} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-[--text-primary]">{name}</h3>
                  <span className="text-xs text-[--text-muted]">({stocks.length} titres)</span>
                </div>
                <span className={`text-sm font-medium ${avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {stocks.map((stock) => {
                  const q = quotes[stock.symbol];
                  const pct = q?.changepct || 0;
                  return (
                    <div
                      key={stock.symbol}
                      className={`${getColor(pct)} rounded-xl p-3 flex flex-col justify-between transition-transform hover:scale-105 cursor-default`}
                      style={{ minHeight: `${60 + stock.marketCap * 1.2}px` }}
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
            { label: "-5%+", cls: "bg-rose-700" },
            { label: "-3%", cls: "bg-rose-600" },
            { label: "-2%", cls: "bg-rose-500" },
            { label: "-1%", cls: "bg-rose-500/50" },
            { label: "0%", cls: "bg-gray-600/40" },
            { label: "+1%", cls: "bg-emerald-500/50" },
            { label: "+2%", cls: "bg-emerald-500" },
            { label: "+3%", cls: "bg-emerald-600" },
            { label: "+5%+", cls: "bg-emerald-700" },
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
