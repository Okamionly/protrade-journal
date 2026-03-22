"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RefreshCw, BarChart3, AlertTriangle, X, Clock, Globe, TrendingUp, TrendingDown, Info, ArrowUpCircle, ArrowDownCircle, Eye } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";

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

interface GlobalMarketEntry {
  symbol: string;
  name: string;
  region: string;
  last: number;
  changepct: number;
  change: number;
  previousClose: number;
}

const SECTORS: Record<string, SectorStock[]> = {
  "Technologie": [
    { symbol: "AAPL", name: "Apple", sector: "Technologie", marketCap: 350 },
    { symbol: "MSFT", name: "Microsoft", sector: "Technologie", marketCap: 320 },
    { symbol: "NVDA", name: "NVIDIA", sector: "Technologie", marketCap: 300 },
    { symbol: "GOOGL", name: "Alphabet", sector: "Technologie", marketCap: 220 },
    { symbol: "META", name: "Meta", sector: "Technologie", marketCap: 160 },
    { symbol: "AMD", name: "AMD", sector: "Technologie", marketCap: 8 },
    { symbol: "INTC", name: "Intel", sector: "Technologie", marketCap: 6 },
    { symbol: "CRM", name: "Salesforce", sector: "Technologie", marketCap: 10 },
    { symbol: "ORCL", name: "Oracle", sector: "Technologie", marketCap: 9 },
    { symbol: "ADBE", name: "Adobe", sector: "Technologie", marketCap: 8 },
  ],
  "Consommation": [
    { symbol: "AMZN", name: "Amazon", sector: "Consommation", marketCap: 210 },
    { symbol: "TSLA", name: "Tesla", sector: "Consommation", marketCap: 100 },
    { symbol: "NFLX", name: "Netflix", sector: "Consommation", marketCap: 12 },
    { symbol: "NKE", name: "Nike", sector: "Consommation", marketCap: 8 },
    { symbol: "SBUX", name: "Starbucks", sector: "Consommation", marketCap: 7 },
    { symbol: "MCD", name: "McDonald's", sector: "Consommation", marketCap: 9 },
    { symbol: "DIS", name: "Disney", sector: "Consommation", marketCap: 8 },
  ],
  "Finance": [
    { symbol: "JPM", name: "JPMorgan", sector: "Finance", marketCap: 70 },
    { symbol: "BAC", name: "Bank of America", sector: "Finance", marketCap: 14 },
    { symbol: "GS", name: "Goldman Sachs", sector: "Finance", marketCap: 12 },
    { symbol: "V", name: "Visa", sector: "Finance", marketCap: 60 },
    { symbol: "MA", name: "Mastercard", sector: "Finance", marketCap: 15 },
    { symbol: "MS", name: "Morgan Stanley", sector: "Finance", marketCap: 10 },
    { symbol: "BLK", name: "BlackRock", sector: "Finance", marketCap: 9 },
  ],
  "Santé": [
    { symbol: "JNJ", name: "J&J", sector: "Santé", marketCap: 50 },
    { symbol: "UNH", name: "UnitedHealth", sector: "Santé", marketCap: 20 },
    { symbol: "PFE", name: "Pfizer", sector: "Santé", marketCap: 10 },
    { symbol: "ABBV", name: "AbbVie", sector: "Santé", marketCap: 14 },
    { symbol: "LLY", name: "Eli Lilly", sector: "Santé", marketCap: 16 },
    { symbol: "MRK", name: "Merck", sector: "Santé", marketCap: 12 },
    { symbol: "TMO", name: "Thermo Fisher", sector: "Santé", marketCap: 8 },
  ],
  "Énergie": [
    { symbol: "XOM", name: "ExxonMobil", sector: "Énergie", marketCap: 22 },
    { symbol: "CVX", name: "Chevron", sector: "Énergie", marketCap: 16 },
    { symbol: "COP", name: "ConocoPhillips", sector: "Énergie", marketCap: 10 },
    { symbol: "SLB", name: "Schlumberger", sector: "Énergie", marketCap: 8 },
    { symbol: "EOG", name: "EOG Resources", sector: "Énergie", marketCap: 7 },
  ],
  "Industrie": [
    { symbol: "CAT", name: "Caterpillar", sector: "Industrie", marketCap: 14 },
    { symbol: "BA", name: "Boeing", sector: "Industrie", marketCap: 12 },
    { symbol: "HON", name: "Honeywell", sector: "Industrie", marketCap: 10 },
    { symbol: "UPS", name: "UPS", sector: "Industrie", marketCap: 8 },
    { symbol: "GE", name: "GE Aerospace", sector: "Industrie", marketCap: 11 },
  ],
  "Cybersécurité & Cloud": [
    { symbol: "CRWD", name: "CrowdStrike", sector: "Cybersécurité & Cloud", marketCap: 12 },
    { symbol: "ZS", name: "Zscaler", sector: "Cybersécurité & Cloud", marketCap: 8 },
    { symbol: "NET", name: "Cloudflare", sector: "Cybersécurité & Cloud", marketCap: 9 },
    { symbol: "DDOG", name: "Datadog", sector: "Cybersécurité & Cloud", marketCap: 8 },
    { symbol: "SNOW", name: "Snowflake", sector: "Cybersécurité & Cloud", marketCap: 7 },
    { symbol: "MDB", name: "MongoDB", sector: "Cybersécurité & Cloud", marketCap: 6 },
  ],
  "Indices": [
    { symbol: "SPY", name: "S&P 500", sector: "Indices", marketCap: 30 },
    { symbol: "QQQ", name: "Nasdaq 100", sector: "Indices", marketCap: 25 },
    { symbol: "DIA", name: "Dow Jones", sector: "Indices", marketCap: 20 },
    { symbol: "IWM", name: "Russell 2000", sector: "Indices", marketCap: 15 },
  ],
};

/** Check if current time is within US market hours (9:30-16:00 ET, weekdays) */
function isMarketHours(): boolean {
  const now = new Date();
  // Convert to Eastern Time using Intl
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // 9:30 = 570, 16:00 = 960
  return totalMinutes >= 570 && totalMinutes < 960;
}

export default function SectorHeatmapPage() {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [previousQuotes, setPreviousQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [view, setView] = useState<"treemap" | "table">("treemap");
  const [showGlobal, setShowGlobal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [globalData, setGlobalData] = useState<GlobalMarketEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLastUpdated, setGlobalLastUpdated] = useState<Date | null>(null);
  const [globalCached, setGlobalCached] = useState(false);
  const [globalLive, setGlobalLive] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { trades } = useTrades();

  const allSymbols = Object.values(SECTORS).flat().map((s) => s.symbol);

  // Map user's trades to sectors for performance comparison
  const userSectorPerformance = useMemo(() => {
    const sectorPnl: Record<string, { totalPnl: number; tradeCount: number }> = {};
    const allStocks = Object.entries(SECTORS).flatMap(([sector, stocks]) =>
      stocks.map((s) => ({ ...s, sector }))
    );
    const symbolToSector: Record<string, string> = {};
    for (const s of allStocks) {
      symbolToSector[s.symbol.toUpperCase()] = s.sector;
    }

    for (const t of trades) {
      const asset = (t.asset || "").toUpperCase();
      const sector = symbolToSector[asset];
      if (sector) {
        if (!sectorPnl[sector]) sectorPnl[sector] = { totalPnl: 0, tradeCount: 0 };
        sectorPnl[sector].totalPnl += t.result || 0;
        sectorPnl[sector].tradeCount += 1;
      }
    }
    return sectorPnl;
  }, [trades]);

  const fetchGlobalData = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/market-data/global-indices");
      if (res.ok) {
        const json = await res.json();
        if (json.s === "ok" && Array.isArray(json.data)) {
          setGlobalData(json.data);
          setGlobalLastUpdated(new Date(json.timestamp));
          setGlobalCached(json.cached === true);
          setGlobalLive(json.live === true);
        }
      }
    } catch {
      // Keep existing data if fetch fails
    } finally {
      setGlobalLoading(false);
    }
  }, []);

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
          setQuotes((currentQuotes) => {
            if (Object.keys(currentQuotes).length > 0) {
              setPreviousQuotes({ ...currentQuotes });
            }
            return newQuotes;
          });
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
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
    fetchGlobalData();
  }, [fetchData, fetchGlobalData]);

  // Auto-refresh every 60 seconds during market hours (9:30-16:00 ET on weekdays)
  useEffect(() => {
    const startAutoRefresh = () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
      autoRefreshRef.current = setInterval(() => {
        if (isMarketHours()) {
          fetchData();
          fetchGlobalData();
        }
      }, 60000);
    };

    startAutoRefresh();

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [fetchData, fetchGlobalData]);

  // Enhanced color gradient
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

  // Sector rotation: compare current avg to previous period avg
  const sectorRotation = sectorPerf.map(({ name, avg, stocks }) => {
    const prevPcts = stocks.map((s) => previousQuotes[s.symbol]?.changepct || 0);
    const weights = stocks.map((s) => s.marketCap);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const prevAvg = totalWeight > 0 ? prevPcts.reduce((s, p, i) => s + p * (weights[i] / totalWeight), 0) : 0;
    const delta = avg - prevAvg;
    let direction: "in" | "out" | "stable" = "stable";
    if (delta > 0.15) direction = "in";
    else if (delta < -0.15) direction = "out";
    return { name, avg, prevAvg, delta, direction };
  });

  // Top 3 biggest movers today ("Secteurs a surveiller")
  const topMovers = [...sectorPerf]
    .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
    .slice(0, 3);

  const displaySectors = selectedSector ? sectorPerf.filter((s) => s.name === selectedSector) : sectorPerf;

  // Momentum indicator: compare current changepct vs previous period
  const getMomentumIndicator = (symbol: string): { label: string; color: string } | null => {
    const current = quotes[symbol]?.changepct;
    const previous = previousQuotes[symbol]?.changepct;
    if (current === undefined || previous === undefined) return null;
    const diff = current - previous;
    if (diff > 1) return { label: "\u25B2\u25B2", color: "text-emerald-300" }; // strong up
    if (diff > 0.2) return { label: "\u25B2", color: "text-emerald-400" }; // moderate up
    if (diff < -0.2) return { label: "\u25BC", color: "text-rose-400" }; // declining
    return null;
  };

  // Market Breadth calculation
  const hasSectorData = Object.keys(quotes).length > 0;
  const positiveSectors = sectorPerf.filter((s) => s.avg >= 0).length;
  const negativeSectors = sectorPerf.filter((s) => s.avg < 0).length;
  const totalSectors = sectorPerf.length;
  const breadthRatio = totalSectors > 0 ? positiveSectors / totalSectors : 0;
  // Key sectors are Technology, Finance, Consumer - divergence if most are up but these key ones are down
  const keySectorNames = ["Technologie", "Finance", "Consommation"];
  const keySectorsDown = sectorPerf.filter((s) => keySectorNames.includes(s.name) && s.avg < 0);
  const hasBreadthDivergence = breadthRatio >= 0.6 && keySectorsDown.length >= 2;

  // Group global data by region
  const globalByRegion = globalData.reduce<Record<string, GlobalMarketEntry[]>>((acc, entry) => {
    if (!acc[entry.region]) acc[entry.region] = [];
    acc[entry.region].push(entry);
    return acc;
  }, {});

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
            {isMarketHours() && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-refresh
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
          <button onClick={() => { fetchData(); fetchGlobalData(); }} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">
            <RefreshCw className={`w-4 h-4 ${loading || globalLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Global Markets */}
      {showGlobal && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[--text-primary] flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Marchés Mondiaux
              {globalLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
              {globalLive && !globalLoading && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
              {!globalLive && !globalLoading && globalData.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  MOCK
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {globalCached && (
                <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Cache
                </span>
              )}
              {globalLastUpdated && (
                <span className="text-xs text-[--text-muted] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Dernière mise à jour: {globalLastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {globalData.length === 0 && !globalLoading && (
            <p className="text-sm text-[--text-muted] text-center py-4">
              Aucune donnée disponible. Les marchés sont peut-être fermés.
            </p>
          )}

          {Object.entries(globalByRegion).map(([region, entries]) => (
            <div key={region} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-[--text-muted]">{region}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {entries.map((m) => {
                  const pct = m.changepct;
                  const isUp = pct >= 0;
                  const hasData = m.last > 0;
                  return (
                    <div
                      key={m.symbol}
                      className={`${hasData ? getColor(pct) : "bg-gray-600/20"} rounded-xl p-3 transition-transform hover:scale-105 cursor-default`}
                    >
                      <p className={`text-sm font-bold ${hasData ? getTextColor(pct) : "text-[--text-muted]"}`}>{m.name}</p>
                      {hasData ? (
                        <>
                          <p className={`text-lg font-bold mono mt-1 ${getTextColor(pct)}`}>
                            {m.last.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm font-medium ${getTextColor(pct)}`}>
                            {isUp ? "+" : ""}{pct.toFixed(2)}%
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-[--text-muted] mt-1">Indisponible</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-[--text-muted] mt-3 text-center">
            Données via Yahoo Finance — Rafraîchissement auto toutes les 60s pendant heures de marché — Cache 10 min
          </p>
        </div>
      )}

      {/* Market Breadth Summary */}
      {hasSectorData && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-[--text-primary] text-sm">Ampleur du marché</h3>
            </div>
            <span className={`text-sm font-medium ${breadthRatio >= 0.5 ? "text-emerald-400" : "text-rose-400"}`}>
              {positiveSectors}/{totalSectors} secteurs en hausse
            </span>
          </div>
          <div className="w-full h-3 bg-[--bg-secondary]/50 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${breadthRatio >= 0.5 ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: `${breadthRatio * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-[--text-muted]">
            <span>{negativeSectors} en baisse</span>
            <span>{positiveSectors} en hausse</span>
          </div>
          {hasBreadthDivergence && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-400">
                Divergence de breadth — Secteurs clés ({keySectorsDown.map(s => s.name).join(", ")}) en baisse malgré une majorité de secteurs positifs
              </span>
            </div>
          )}
        </div>
      )}

      {/* Secteurs à surveiller */}
      {hasSectorData && topMovers.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-[--text-primary] text-sm">Secteurs à surveiller</h3>
            <span className="text-[10px] text-[--text-muted]">Top 3 mouvements du jour</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topMovers.map(({ name, avg }, idx) => {
              const isUp = avg >= 0;
              const userPerf = userSectorPerformance[name];
              return (
                <div
                  key={name}
                  className={`rounded-xl p-3 border ${
                    idx === 0
                      ? isUp ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
                      : "bg-[--bg-secondary]/30 border-[--border]/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-[--text-primary]">{name}</span>
                    {idx === 0 && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        Plus fort mouvement
                      </span>
                    )}
                  </div>
                  <p className={`text-lg font-bold mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {isUp ? "+" : ""}{avg.toFixed(2)}%
                  </p>
                  {userPerf && (
                    <p className="text-[10px] text-[--text-muted] mt-1">
                      Votre P&L: <span className={userPerf.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {userPerf.totalPnl >= 0 ? "+" : ""}{userPerf.totalPnl.toFixed(2)}$
                      </span> ({userPerf.tradeCount} trade{userPerf.tradeCount > 1 ? "s" : ""})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector Rotation Indicator */}
      {hasSectorData && Object.keys(previousQuotes).length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary] text-sm">Rotation sectorielle</h3>
            <span className="text-[10px] text-[--text-muted]">Flux entrants/sortants basés sur les variations récentes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sectorRotation.map(({ name, direction, delta }) => (
              <div
                key={name}
                className={`rounded-xl px-3 py-2 border flex items-center gap-2 ${
                  direction === "in"
                    ? "bg-emerald-500/10 border-emerald-500/25"
                    : direction === "out"
                    ? "bg-rose-500/10 border-rose-500/25"
                    : "bg-[--bg-secondary]/20 border-[--border]/20"
                }`}
              >
                {direction === "in" ? (
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : direction === "out" ? (
                  <ArrowDownCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center text-[--text-muted] text-xs">—</span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[--text-primary] truncate">{name}</p>
                  <p className={`text-[10px] font-medium ${
                    direction === "in" ? "text-emerald-400" : direction === "out" ? "text-rose-400" : "text-[--text-muted]"
                  }`}>
                    {direction === "in" ? "Flux entrant" : direction === "out" ? "Flux sortant" : "Stable"}
                    <span className="ml-1 text-[--text-muted]">({delta >= 0 ? "+" : ""}{delta.toFixed(2)}%)</span>
                  </p>
                </div>
              </div>
            ))}
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
                  {userSectorPerformance[name] && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      userSectorPerformance[name].totalPnl >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                    }`}>
                      Votre P&L: {userSectorPerformance[name].totalPnl >= 0 ? "+" : ""}{userSectorPerformance[name].totalPnl.toFixed(2)}$
                      <span className="text-[--text-muted] ml-1">({userSectorPerformance[name].tradeCount})</span>
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${avg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {stocks.map((stock) => {
                  const q = quotes[stock.symbol];
                  const pct = q?.changepct || 0;
                  const momentum = getMomentumIndicator(stock.symbol);
                  return (
                    <div
                      key={stock.symbol}
                      className={`${getColor(pct)} rounded-xl p-3 flex flex-col justify-between transition-transform hover:scale-105 cursor-default relative group`}
                      style={{ minHeight: `${60 + stock.marketCap * 0.15}px` }}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-bold ${getTextColor(pct)}`}>{stock.symbol}</p>
                          <div className="flex items-center gap-1">
                            {momentum && (
                              <span className={`text-xs font-bold ${momentum.color}`} title="Momentum vs période précédente">
                                {momentum.label}
                              </span>
                            )}
                            {/* Volume context badge - no volume data available from API */}
                            <span className="relative">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[--text-muted] cursor-help flex items-center gap-0.5">
                                <Info className="w-2.5 h-2.5" />
                                Vol
                              </span>
                              <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block w-36 p-1.5 rounded-lg bg-[--bg-primary] border border-[--border-subtle] text-[10px] text-[--text-muted] shadow-lg z-10 text-center">
                                Volume non disponible — confirmez le volume sur votre broker
                              </span>
                            </span>
                          </div>
                        </div>
                        <p className={`text-xs opacity-80 ${getTextColor(pct)}`}>{stock.name}</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold mono ${getTextColor(pct)}`}>
                          {q ? `$${q.last.toFixed(2)}` : "\u2014"}
                        </p>
                        <p className={`text-sm font-medium ${getTextColor(pct)}`}>
                          {q ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "\u2014"}
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
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Variation %</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Momentum</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Volume</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Performance</th>
              </tr>
            </thead>
            <tbody>
              {displaySectors.flatMap(({ stocks }) => stocks).sort((a, b) => (quotes[b.symbol]?.changepct || 0) - (quotes[a.symbol]?.changepct || 0)).map((stock) => {
                const q = quotes[stock.symbol];
                const pct = q?.changepct || 0;
                const momentum = getMomentumIndicator(stock.symbol);
                return (
                  <tr key={stock.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover]">
                    <td className="p-4">
                      <p className="font-semibold text-sm text-[--text-primary]">{stock.symbol}</p>
                      <p className="text-xs text-[--text-muted]">{stock.name}</p>
                    </td>
                    <td className="p-4 text-sm text-[--text-secondary]">{stock.sector}</td>
                    <td className="p-4 text-right text-sm font-bold mono text-[--text-primary]">{q ? `$${q.last.toFixed(2)}` : "\u2014"}</td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-medium px-2 py-1 rounded-lg ${pct >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {momentum ? (
                        <span className={`text-sm font-bold ${momentum.color}`}>{momentum.label}</span>
                      ) : (
                        <span className="text-xs text-[--text-muted]">--</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[--text-muted] cursor-help" title="Volume non disponible — confirmez sur votre broker">
                        N/A
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
