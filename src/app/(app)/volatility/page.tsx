"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, TrendingUp, TrendingDown, AlertTriangle, Gauge, BarChart3 } from "lucide-react";

interface VixData {
  last: number;
  change: number;
  changepct: number;
  high: number;
  low: number;
}

interface VolData {
  symbol: string;
  name: string;
  last: number;
  changepct: number;
  avgVolume?: number;
  volume?: number;
}

const VOL_INSTRUMENTS = [
  { symbol: "VIX", name: "CBOE Volatility Index" },
  { symbol: "UVXY", name: "Ultra VIX Short-Term" },
  { symbol: "SVXY", name: "Short VIX Short-Term" },
  { symbol: "VIXY", name: "VIX Short-Term Futures" },
];

const MARKET_ETFS = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "IWM", name: "Russell 2000" },
  { symbol: "DIA", name: "Dow Jones" },
  { symbol: "GLD", name: "Gold" },
  { symbol: "TLT", name: "20Y Treasuries" },
  { symbol: "USO", name: "Oil" },
  { symbol: "UUP", name: "US Dollar" },
];

export default function VolatilityPage() {
  const [volData, setVolData] = useState<Record<string, VolData>>({});
  const [loading, setLoading] = useState(false);

  const allSymbols = [...VOL_INSTRUMENTS, ...MARKET_ETFS].map((i) => i.symbol);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-data/quotes?symbols=${allSymbols.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok" && data.symbol) {
          const newData: Record<string, VolData> = {};
          data.symbol.forEach((sym: string, idx: number) => {
            const meta = [...VOL_INSTRUMENTS, ...MARKET_ETFS].find((i) => i.symbol === sym);
            newData[sym] = {
              symbol: sym,
              name: meta?.name || sym,
              last: data.last?.[idx] || 0,
              changepct: data.changepct?.[idx] || 0,
              volume: data.volume?.[idx] || 0,
            };
          });
          setVolData(newData);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vix = volData["VIX"];
  const vixLevel = vix ? vix.last : 0;

  const getVixZone = (v: number) => {
    if (v < 15) return { label: "Très Calme", color: "text-emerald-400", bg: "bg-emerald-500/20", zone: "low" };
    if (v < 20) return { label: "Normal", color: "text-cyan-400", bg: "bg-cyan-500/20", zone: "normal" };
    if (v < 25) return { label: "Élevé", color: "text-amber-400", bg: "bg-amber-500/20", zone: "elevated" };
    if (v < 30) return { label: "Très Élevé", color: "text-orange-400", bg: "bg-orange-500/20", zone: "high" };
    return { label: "PANIQUE", color: "text-rose-400", bg: "bg-rose-500/20", zone: "extreme" };
  };

  const vixZone = getVixZone(vixLevel);

  // Fear & Greed calculation (simplified based on VIX + market direction)
  const spy = volData["SPY"];
  const fearGreed = vix && spy
    ? Math.max(0, Math.min(100, 50 + spy.changepct * 10 - (vixLevel - 20) * 2))
    : 50;

  const getFearGreedLabel = (v: number) => {
    if (v >= 80) return { label: "Extreme Greed", color: "text-emerald-400" };
    if (v >= 60) return { label: "Greed", color: "text-emerald-300" };
    if (v >= 40) return { label: "Neutral", color: "text-cyan-400" };
    if (v >= 20) return { label: "Fear", color: "text-rose-300" };
    return { label: "Extreme Fear", color: "text-rose-400" };
  };

  const fg = getFearGreedLabel(fearGreed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Volatility Dashboard</h1>
          <p className="text-sm text-[--text-secondary]">Suivez la volatilité et le sentiment du marché</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
        </button>
      </div>

      {/* VIX Main Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`glass rounded-2xl p-6 border-2 ${vixZone.zone === "extreme" ? "border-rose-500/50 animate-pulse" : vixZone.zone === "high" ? "border-orange-500/30" : "border-[--border-subtle]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary]">VIX Index</h3>
          </div>
          <p className={`text-5xl font-bold mono ${vixZone.color}`}>{vixLevel.toFixed(2)}</p>
          {vix && (
            <p className={`text-sm mt-2 ${vix.changepct >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {vix.changepct >= 0 ? "+" : ""}{vix.changepct.toFixed(2)}% aujourd&apos;hui
            </p>
          )}
          <div className={`mt-4 px-3 py-2 rounded-xl ${vixZone.bg}`}>
            <p className={`text-sm font-medium ${vixZone.color}`}>{vixZone.label}</p>
          </div>
          {/* VIX Gauge */}
          <div className="mt-4">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all"
                style={{ left: `${Math.min(Math.max((vixLevel / 50) * 100, 2), 98)}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-[--text-muted]">
              <span>10</span><span>20</span><span>30</span><span>40</span><span>50+</span>
            </div>
          </div>
        </div>

        {/* Fear & Greed Index */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary]">Fear & Greed</h3>
          </div>
          <div className="flex items-center justify-center my-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={fearGreed >= 60 ? "#10b981" : fearGreed >= 40 ? "#06b6d4" : "#ef4444"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${fearGreed * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold mono ${fg.color}`}>{Math.round(fearGreed)}</span>
              </div>
            </div>
          </div>
          <p className={`text-center font-medium ${fg.color}`}>{fg.label}</p>
          <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow transition-all"
              style={{ left: `${fearGreed}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>
        </div>

        {/* Market Regime */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary]">Régime de Marché</h3>
          </div>
          <div className="space-y-3 mt-4">
            {[
              { label: "Risk-On", condition: vixLevel < 20 && (spy?.changepct || 0) > 0, desc: "VIX bas + SPY haussier" },
              { label: "Risk-Off", condition: vixLevel > 25 && (spy?.changepct || 0) < 0, desc: "VIX élevé + SPY baissier" },
              { label: "Indécision", condition: vixLevel >= 20 && vixLevel <= 25, desc: "Volatilité modérée" },
              { label: "Complaisance", condition: vixLevel < 15, desc: "VIX très bas — attention" },
            ].map((regime) => (
              <div
                key={regime.label}
                className={`p-3 rounded-xl border transition-all ${regime.condition ? "border-cyan-500/30 bg-cyan-500/10" : "border-[--border-subtle] bg-[--bg-secondary]/20 opacity-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${regime.condition ? "text-cyan-400" : "text-[--text-muted]"}`}>
                    {regime.condition && "● "}{regime.label}
                  </span>
                </div>
                <p className="text-xs text-[--text-muted] mt-1">{regime.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vol Instruments */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Instruments de Volatilité</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {VOL_INSTRUMENTS.map(({ symbol, name }) => {
            const d = volData[symbol];
            const pct = d?.changepct || 0;
            return (
              <div key={symbol} className="metric-card rounded-xl p-4">
                <p className="text-xs text-[--text-muted]">{name}</p>
                <p className="text-lg font-bold mono text-[--text-primary] mt-1">{d ? `$${d.last.toFixed(2)}` : "—"}</p>
                <p className={`text-sm mono ${pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {d ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inter-Market Correlation */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Inter-Marchés en Temps Réel</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MARKET_ETFS.map(({ symbol, name }) => {
            const d = volData[symbol];
            const pct = d?.changepct || 0;
            return (
              <div key={symbol} className="metric-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[--text-muted]">{name}</span>
                  {pct >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-lg font-bold mono text-[--text-primary]">{d ? `$${d.last.toFixed(2)}` : "—"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex-1 h-2 rounded-full ${pct >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                    <div
                      className={`h-full rounded-full ${pct >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.min(Math.abs(pct) * 20, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium mono ${pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Box */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-[--text-primary] mb-4">Signaux Automatiques</h3>
        <div className="space-y-3">
          {vixLevel > 30 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-sm font-medium text-rose-400">VIX en zone panique ({vixLevel.toFixed(1)}) — Marché très volatil, réduisez votre taille de position</p>
            </div>
          )}
          {vixLevel < 15 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-400">VIX très bas ({vixLevel.toFixed(1)}) — Complaisance, un spike de volatilité pourrait arriver</p>
            </div>
          )}
          {spy && volData["GLD"] && spy.changepct < -1 && volData["GLD"].changepct > 0.5 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-400">Flight to safety : SPY baisse, Gold monte — Contexte Risk-Off</p>
            </div>
          )}
          {spy && volData["TLT"] && spy.changepct > 0.5 && volData["TLT"].changepct < -0.5 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-sm font-medium text-emerald-400">Rotation equity : SPY monte, Bonds baissent — Contexte Risk-On</p>
            </div>
          )}
          {(!vix || (vixLevel >= 15 && vixLevel <= 30)) && !spy && (
            <p className="text-sm text-[--text-muted] text-center py-2">Aucun signal particulier — Marché dans les normes</p>
          )}
          {vix && vixLevel >= 15 && vixLevel <= 30 && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">VIX normal ({vixLevel.toFixed(1)}) — Conditions de trading standards</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
