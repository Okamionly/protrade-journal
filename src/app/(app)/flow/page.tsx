"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, TrendingUp, TrendingDown, RefreshCw, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";

interface FlowEntry {
  symbol: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  openInterest: number;
  sentiment: "bullish" | "bearish" | "neutral";
  size: "normal" | "unusual" | "sweep" | "block";
  time: string;
}

// Simulated unusual options flow (in production, powered by real API)
const generateFlow = (): FlowEntry[] => {
  const symbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META", "GOOGL", "AMZN", "SPY", "QQQ", "JPM", "BAC", "GS", "NFLX"];
  const flows: FlowEntry[] = [];
  const now = new Date();

  for (let i = 0; i < 40; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const isCall = Math.random() > 0.45;
    const basePrice = sym === "SPY" ? 580 : sym === "QQQ" ? 505 : sym === "NVDA" ? 140 : sym === "AAPL" ? 230 : sym === "MSFT" ? 450 : sym === "TSLA" ? 280 : sym === "GOOGL" ? 185 : sym === "AMZN" ? 215 : sym === "META" ? 620 : sym === "AMD" ? 165 : sym === "JPM" ? 240 : sym === "BAC" ? 42 : sym === "GS" ? 590 : 780;
    const strikeOffset = (Math.random() - 0.3) * basePrice * 0.08;
    const strike = Math.round((basePrice + strikeOffset) / 5) * 5;
    const premium = Math.round(Math.random() * 5000 + 100) * 100;
    const vol = Math.floor(Math.random() * 8000 + 200);
    const oi = Math.floor(Math.random() * 50000 + 1000);
    const sizeRoll = Math.random();
    const size: FlowEntry["size"] = sizeRoll > 0.85 ? "block" : sizeRoll > 0.7 ? "sweep" : sizeRoll > 0.4 ? "unusual" : "normal";
    const sentiment: FlowEntry["sentiment"] = isCall ? (strike > basePrice ? "bullish" : "neutral") : (strike < basePrice ? "bearish" : "neutral");
    const minutesAgo = Math.floor(Math.random() * 480);
    const time = new Date(now.getTime() - minutesAgo * 60000);
    const expDays = Math.floor(Math.random() * 60) + 1;
    const expiry = new Date(now.getTime() + expDays * 86400000).toISOString().split("T")[0];

    flows.push({
      symbol: sym,
      type: isCall ? "CALL" : "PUT",
      strike,
      expiry,
      premium,
      volume: vol,
      openInterest: oi,
      sentiment,
      size,
      time: time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    });
  }
  return flows.sort((a, b) => b.premium - a.premium);
};

const SIZE_STYLES: Record<string, { label: string; cls: string }> = {
  block: { label: "BLOCK", cls: "text-rose-400 bg-rose-500/20 border-rose-500/30" },
  sweep: { label: "SWEEP", cls: "text-amber-400 bg-amber-500/20 border-amber-500/30" },
  unusual: { label: "UNUSUAL", cls: "text-violet-400 bg-violet-500/20 border-violet-500/30" },
  normal: { label: "Normal", cls: "text-[--text-muted] bg-[--bg-secondary]/50 border-[--border-subtle]" },
};

export default function FlowPage() {
  const [flows, setFlows] = useState<FlowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "CALL" | "PUT">("all");
  const [filterSize, setFilterSize] = useState<"all" | "unusual" | "sweep" | "block">("all");
  const [filterSymbol, setFilterSymbol] = useState("");

  const refreshFlow = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setFlows(generateFlow());
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    refreshFlow();
  }, [refreshFlow]);

  const filtered = flows.filter((f) => {
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterSize !== "all" && f.size !== filterSize) return false;
    if (filterSymbol && !f.symbol.includes(filterSymbol.toUpperCase())) return false;
    return true;
  });

  // Aggregated stats
  const totalCallPremium = flows.filter((f) => f.type === "CALL").reduce((s, f) => s + f.premium, 0);
  const totalPutPremium = flows.filter((f) => f.type === "PUT").reduce((s, f) => s + f.premium, 0);
  const callCount = flows.filter((f) => f.type === "CALL").length;
  const putCount = flows.filter((f) => f.type === "PUT").length;
  const pcRatio = callCount > 0 ? (putCount / callCount).toFixed(2) : "—";
  const bullishPct = flows.length > 0 ? Math.round((flows.filter((f) => f.sentiment === "bullish").length / flows.length) * 100) : 0;
  const sweepCount = flows.filter((f) => f.size === "sweep" || f.size === "block").length;

  // Top symbols by premium
  const symbolPremiums: Record<string, { calls: number; puts: number }> = {};
  flows.forEach((f) => {
    if (!symbolPremiums[f.symbol]) symbolPremiums[f.symbol] = { calls: 0, puts: 0 };
    if (f.type === "CALL") symbolPremiums[f.symbol].calls += f.premium;
    else symbolPremiums[f.symbol].puts += f.premium;
  });
  const topSymbols = Object.entries(symbolPremiums)
    .map(([sym, data]) => ({ symbol: sym, total: data.calls + data.puts, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const formatPremium = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Options Flow</h1>
          <p className="text-sm text-[--text-secondary]">Flux d&apos;options inhabituels — Suivez l&apos;argent intelligent</p>
        </div>
        <button onClick={refreshFlow} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Premium Calls</p>
          <p className="text-lg font-bold text-emerald-400 mono">{formatPremium(totalCallPremium)}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Premium Puts</p>
          <p className="text-lg font-bold text-rose-400 mono">{formatPremium(totalPutPremium)}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Put/Call Ratio</p>
          <p className={`text-lg font-bold mono ${Number(pcRatio) > 1 ? "text-rose-400" : "text-emerald-400"}`}>{pcRatio}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Bullish %</p>
          <p className={`text-lg font-bold ${bullishPct > 50 ? "text-emerald-400" : "text-rose-400"}`}>{bullishPct}%</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Sweeps/Blocks</p>
          <p className="text-lg font-bold text-amber-400">{sweepCount}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Total Ordres</p>
          <p className="text-lg font-bold text-cyan-400">{flows.length}</p>
        </div>
      </div>

      {/* Call/Put Premium Bar */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Ratio Calls vs Puts</h3>
        </div>
        <div className="h-8 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 flex items-center justify-center transition-all"
            style={{ width: `${(totalCallPremium / (totalCallPremium + totalPutPremium)) * 100}%` }}
          >
            <span className="text-xs font-bold text-white">CALLS {((totalCallPremium / (totalCallPremium + totalPutPremium)) * 100).toFixed(0)}%</span>
          </div>
          <div
            className="bg-rose-500 flex items-center justify-center transition-all"
            style={{ width: `${(totalPutPremium / (totalCallPremium + totalPutPremium)) * 100}%` }}
          >
            <span className="text-xs font-bold text-white">PUTS {((totalPutPremium / (totalCallPremium + totalPutPremium)) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Top Symbols by Premium */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Top Flow par Symbole</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topSymbols.map(({ symbol, total, calls, puts }) => (
            <div key={symbol} className="metric-card rounded-xl p-4">
              <p className="text-sm font-bold text-[--text-primary]">{symbol}</p>
              <p className="text-lg font-bold mono text-cyan-400">{formatPremium(total)}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{formatPremium(calls)}</span>
                <span className="text-rose-400 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" />{formatPremium(puts)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-rose-500/30 mt-2">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(calls / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-[--text-muted]" />
        <div className="flex gap-1">
          {(["all", "CALL", "PUT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === t ? (t === "CALL" ? "bg-emerald-500/20 text-emerald-400" : t === "PUT" ? "bg-rose-500/20 text-rose-400" : "bg-cyan-500/20 text-cyan-400") : "glass text-[--text-secondary]"}`}
            >
              {t === "all" ? "Tous" : t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "unusual", "sweep", "block"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSize(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterSize === s ? "bg-cyan-500/20 text-cyan-400" : "glass text-[--text-secondary]"}`}
            >
              {s === "all" ? "Toutes tailles" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          placeholder="Filtrer symbole..."
          className="input-field w-40 text-sm"
        />
      </div>

      {/* Flow Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[--border-subtle]">
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Heure</th>
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Type</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Strike</th>
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Expiry</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Premium</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">Volume</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">OI</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Taille</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Signal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map((f, i) => {
              const sizeStyle = SIZE_STYLES[f.size];
              return (
                <tr key={i} className="border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors">
                  <td className="p-4 text-xs text-[--text-muted] mono">{f.time}</td>
                  <td className="p-4 text-sm font-bold text-[--text-primary]">{f.symbol}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${f.type === "CALL" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm mono text-[--text-primary]">${f.strike}</td>
                  <td className="p-4 text-sm text-[--text-secondary]">{f.expiry}</td>
                  <td className="p-4 text-right text-sm font-bold mono text-cyan-400">{formatPremium(f.premium)}</td>
                  <td className="p-4 text-right text-sm mono text-[--text-secondary] hidden md:table-cell">{f.volume.toLocaleString()}</td>
                  <td className="p-4 text-right text-sm mono text-[--text-secondary] hidden lg:table-cell">{f.openInterest.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${sizeStyle.cls}`}>{sizeStyle.label}</span>
                  </td>
                  <td className="p-4 text-center">
                    {f.sentiment === "bullish" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : f.sentiment === "bearish" ? (
                      <TrendingDown className="w-4 h-4 text-rose-400 mx-auto" />
                    ) : (
                      <Activity className="w-4 h-4 text-[--text-muted] mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
