"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Gauge,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VolData {
  symbol: string;
  name: string;
  last: number;
  changepct: number;
  volume?: number;
}

/* ------------------------------------------------------------------ */
/*  Mock / fallback data (used when API unavailable)                   */
/* ------------------------------------------------------------------ */

const MOCK_VIX_HISTORY = [
  18.2, 17.8, 19.1, 20.3, 19.7, 18.5, 17.9, 18.8, 21.2, 22.5,
  21.8, 20.4, 19.6, 18.3, 17.5, 16.9, 17.4, 18.1, 19.5, 20.8,
  21.3, 20.1, 19.2, 18.7, 19.8, 20.6, 21.4, 20.9, 19.4, 18.6,
];

const MOCK_IV_HV_DATA = [
  { asset: "SPY", name: "S&P 500", iv: 18.5, hv: 15.2, ivRank: 42, ivPercentile: 38 },
  { asset: "QQQ", name: "Nasdaq 100", iv: 22.1, hv: 19.8, ivRank: 55, ivPercentile: 51 },
  { asset: "IWM", name: "Russell 2000", iv: 24.3, hv: 21.7, ivRank: 48, ivPercentile: 44 },
  { asset: "AAPL", name: "Apple", iv: 26.8, hv: 22.4, ivRank: 35, ivPercentile: 30 },
  { asset: "TSLA", name: "Tesla", iv: 58.2, hv: 52.1, ivRank: 62, ivPercentile: 58 },
  { asset: "NVDA", name: "Nvidia", iv: 48.5, hv: 44.3, ivRank: 45, ivPercentile: 40 },
  { asset: "GLD", name: "Or", iv: 14.2, hv: 12.8, ivRank: 28, ivPercentile: 22 },
  { asset: "TLT", name: "Obligations 20A", iv: 16.7, hv: 14.9, ivRank: 52, ivPercentile: 48 },
];

const MOCK_TERM_STRUCTURE = [
  { label: "VIX (spot)", value: 18.6 },
  { label: "VX1 (1M)", value: 19.8 },
  { label: "VX2 (2M)", value: 20.5 },
  { label: "VX3 (3M)", value: 21.1 },
  { label: "VX4 (4M)", value: 21.6 },
  { label: "VX5 (5M)", value: 22.0 },
  { label: "VX6 (6M)", value: 22.3 },
];

const MOCK_FEAR_INDICATORS = {
  putCallRatio: 0.92,
  putCallSignal: "Neutre" as const,
  vixVxnSpread: -2.4,
  skewIndex: 138.5,
  vvix: 94.2,
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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
  { symbol: "GLD", name: "Or" },
  { symbol: "TLT", name: "Obligations 20A" },
  { symbol: "USO", name: "Pétrole" },
  { symbol: "UUP", name: "Dollar US" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getVixZone(v: number) {
  if (v < 15) return { label: "Volatilité Basse", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", zone: "low" };
  if (v < 20) return { label: "Normal", color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30", zone: "normal" };
  if (v < 30) return { label: "Élevée", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", zone: "elevated" };
  if (v < 50) return { label: "Haute", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30", zone: "high" };
  return { label: "Extrême", color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", zone: "extreme" };
}

function getIvSignal(iv: number, hv: number) {
  const ratio = iv / hv;
  if (ratio > 1.2) return { label: "IV Élevée", color: "text-amber-400", desc: "Vendre premium" };
  if (ratio < 0.85) return { label: "IV Basse", color: "text-emerald-400", desc: "Acheter premium" };
  return { label: "Neutre", color: "text-cyan-400", desc: "Pas de signal" };
}

/* ------------------------------------------------------------------ */
/*  SVG Charts                                                         */
/* ------------------------------------------------------------------ */

function VixHistoryChart({ data }: { data: number[] }) {
  const width = 600;
  const height = 160;
  const padding = { top: 15, right: 10, bottom: 25, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const min = Math.min(...data) - 1;
  const max = Math.max(...data) + 1;

  const points = data.map((v, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + (1 - (v - min) / (max - min)) * chartH;
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  const gridLines = [min, min + (max - min) / 3, min + (2 * (max - min)) / 3, max];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {gridLines.map((v) => {
        const y = padding.top + (1 - (v - min) / (max - min)) * chartH;
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end" className="fill-[--text-muted]" fontSize="10">{v.toFixed(0)}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <defs>
        <linearGradient id="vixGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#vixGradient)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#0ea5e9" />
      {/* X labels */}
      <text x={padding.left} y={height - 5} className="fill-[--text-muted]" fontSize="9">J-30</text>
      <text x={padding.left + chartW / 2} y={height - 5} textAnchor="middle" className="fill-[--text-muted]" fontSize="9">J-15</text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" className="fill-[--text-muted]" fontSize="9">Auj.</text>
    </svg>
  );
}

function TermStructureChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 600;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + (1 - (d.value - min) / (max - min)) * chartH,
    label: d.label,
    value: d.value,
  }));

  const isContango = data[data.length - 1].value > data[0].value;
  const color = isContango ? "#0ea5e9" : "#f59e0b";
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {[min, (min + max) / 2, max].map((v) => {
        const y = padding.top + (1 - (v - min) / (max - min)) * chartH;
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end" className="fill-[--text-muted]" fontSize="10">{v.toFixed(1)}</text>
          </g>
        );
      })}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} />
          <text x={p.x} y={padding.top + chartH + 18} textAnchor="middle" className="fill-[--text-muted]" fontSize="8">{p.label}</text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-[--text-secondary]" fontSize="9" fontWeight="600">{p.value.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function VolatilityPage() {
  const [volData, setVolData] = useState<Record<string, VolData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const allSymbols = [...VOL_INSTRUMENTS, ...MARKET_ETFS].map((i) => i.symbol);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market-data/quotes?symbols=${allSymbols.join(",")}`);
      if (!res.ok) throw new Error(`Erreur API : ${res.status}`);
      const data = await res.json();
      if (data.s === "ok" && data.symbol) {
        const newData: Record<string, VolData> = {};
        data.symbol.forEach((sym: string, idx: number) => {
          const meta = [...VOL_INSTRUMENTS, ...MARKET_ETFS].find((i) => i.symbol === sym);
          newData[sym] = {
            symbol: sym,
            name: meta?.name || sym,
            last: data.last?.[idx] ?? 0,
            changepct: data.changepct?.[idx] ?? 0,
            volume: data.volume?.[idx] ?? 0,
          };
        });
        setVolData(newData);
        setUsingMock(false);
      } else {
        throw new Error("Données invalides reçues de l'API");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setUsingMock(true);
      // Load mock data as fallback
      const mockData: Record<string, VolData> = {};
      [...VOL_INSTRUMENTS, ...MARKET_ETFS].forEach((item) => {
        mockData[item.symbol] = {
          symbol: item.symbol,
          name: item.name,
          last: item.symbol === "VIX" ? 18.6 : item.symbol === "SPY" ? 582.4 : item.symbol === "QQQ" ? 498.7 : item.symbol === "IWM" ? 215.3 : item.symbol === "DIA" ? 428.1 : item.symbol === "GLD" ? 298.5 : item.symbol === "TLT" ? 91.2 : item.symbol === "USO" ? 72.8 : item.symbol === "UUP" ? 27.1 : item.symbol === "UVXY" ? 28.4 : item.symbol === "SVXY" ? 58.7 : item.symbol === "VIXY" ? 14.3 : 100,
          changepct: item.symbol === "VIX" ? 3.2 : item.symbol === "SPY" ? -0.45 : item.symbol === "QQQ" ? -0.62 : item.symbol === "GLD" ? 0.8 : Math.random() * 4 - 2,
          volume: 0,
        };
      });
      setVolData(mockData);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Derived values */
  const vix = volData["VIX"];
  const vixLevel = vix?.last ?? 18.6;
  const vixZone = getVixZone(vixLevel);

  const spy = volData["SPY"];
  const fearGreed = vix && spy
    ? Math.max(0, Math.min(100, 50 + spy.changepct * 10 - (vixLevel - 20) * 2))
    : 50;

  const getFearGreedLabel = (v: number) => {
    if (v >= 80) return { label: "Avidité Extrême", color: "text-emerald-400" };
    if (v >= 60) return { label: "Avidité", color: "text-emerald-300" };
    if (v >= 40) return { label: "Neutre", color: "text-cyan-400" };
    if (v >= 20) return { label: "Peur", color: "text-rose-300" };
    return { label: "Peur Extrême", color: "text-rose-400" };
  };
  const fg = getFearGreedLabel(fearGreed);

  const termStructure = MOCK_TERM_STRUCTURE.map((t, i) => ({
    ...t,
    value: i === 0 ? vixLevel : t.value + (vixLevel - 18.6),
  }));
  const isContango = termStructure[termStructure.length - 1].value > termStructure[0].value;

  const fear = MOCK_FEAR_INDICATORS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Volatilité</h1>
          <p className="text-sm text-[--text-secondary]">Analyse de la volatilité et sentiment du marché</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm hover:text-[--text-primary] transition">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-400">{error}</p>
          </div>
          {usingMock && (
            <p className="text-xs text-[--text-muted] mt-1 ml-6">Affichage des données de démonstration</p>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  ROW 1 — VIX Dashboard + Fear & Greed + Market Regime        */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VIX Main Card */}
        <div className={`glass rounded-2xl p-6 border-2 transition-all ${vixZone.zone === "extreme" ? "border-rose-500/50 animate-pulse" : vixZone.zone === "high" ? "border-orange-500/30" : "border-[--border-subtle]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary]">VIX Index</h3>
          </div>
          <p className={`text-5xl font-bold mono ${vixZone.color}`}>{vixLevel.toFixed(2)}</p>
          {vix && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${vix.changepct >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {vix.changepct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {vix.changepct >= 0 ? "+" : ""}{vix.changepct.toFixed(2)}% aujourd&apos;hui
            </p>
          )}
          <div className={`mt-4 px-3 py-2 rounded-xl ${vixZone.bg}`}>
            <p className={`text-sm font-medium ${vixZone.color}`}>{vixZone.label}</p>
          </div>
          {/* VIX Gauge */}
          <div className="mt-4">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 relative overflow-hidden">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all"
                style={{ left: `${Math.min(Math.max((vixLevel / 60) * 100, 2), 98)}%`, transform: "translate(-50%, -50%)" }}
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
            <h3 className="font-semibold text-[--text-primary]">Fear &amp; Greed</h3>
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
          <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative overflow-hidden">
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
              { label: "Risk-On", condition: vixLevel < 20 && (spy?.changepct ?? 0) > 0, desc: "VIX bas + SPY haussier" },
              { label: "Risk-Off", condition: vixLevel > 25 && (spy?.changepct ?? 0) < 0, desc: "VIX élevé + SPY baissier" },
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

      {/* ============================================================ */}
      {/*  ROW 2 — VIX History Chart                                   */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">VIX — 30 Derniers Jours</h3>
        </div>
        <VixHistoryChart data={MOCK_VIX_HISTORY} />
      </div>

      {/* ============================================================ */}
      {/*  ROW 3 — IV vs HV + Term Structure                          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Implied vs Historical Volatility */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-[--text-primary]">Volatilité Implicite vs Historique</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border-subtle]">
                  <th className="text-left py-2 text-[--text-secondary] font-medium">Actif</th>
                  <th className="text-right py-2 text-[--text-secondary] font-medium">IV</th>
                  <th className="text-right py-2 text-[--text-secondary] font-medium">HV</th>
                  <th className="text-right py-2 text-[--text-secondary] font-medium">IV Rank</th>
                  <th className="text-right py-2 text-[--text-secondary] font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_IV_HV_DATA.map((row) => {
                  const signal = getIvSignal(row.iv, row.hv);
                  return (
                    <tr key={row.asset} className="border-b border-[--border-subtle]/50">
                      <td className="py-2.5">
                        <span className="font-medium text-[--text-primary]">{row.asset}</span>
                        <span className="text-[--text-muted] text-xs ml-1.5">{row.name}</span>
                      </td>
                      <td className="text-right mono text-[--text-primary]">{row.iv.toFixed(1)}%</td>
                      <td className="text-right mono text-[--text-primary]">{row.hv.toFixed(1)}%</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-[--bg-secondary]">
                            <div
                              className={`h-full rounded-full ${row.ivRank > 60 ? "bg-amber-500" : row.ivRank < 30 ? "bg-emerald-500" : "bg-cyan-500"}`}
                              style={{ width: `${row.ivRank}%` }}
                            />
                          </div>
                          <span className="mono text-xs text-[--text-secondary]">{row.ivRank}</span>
                        </div>
                      </td>
                      <td className={`text-right text-xs font-medium ${signal.color}`}>{signal.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volatility Term Structure */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-[--text-primary]">Structure par Terme</h3>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isContango ? "bg-cyan-500/20 text-cyan-400" : "bg-amber-500/20 text-amber-400"}`}>
              {isContango ? "Contango" : "Backwardation"}
            </span>
          </div>
          <TermStructureChart data={termStructure} />
          <p className="text-xs text-[--text-muted] mt-3">
            {isContango
              ? "Contango : les contrats à terme sont au-dessus du spot — marché stable, pas de panique attendue."
              : "Backwardation : les contrats à terme sont sous le spot — signal de stress, volatilité à court terme élevée."}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 4 — Fear Indicators                                     */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Indicateurs de Peur</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Put/Call Ratio */}
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-[--text-muted] mb-1">Put/Call Ratio</p>
            <p className={`text-2xl font-bold mono ${fear.putCallRatio > 1 ? "text-rose-400" : fear.putCallRatio < 0.7 ? "text-emerald-400" : "text-cyan-400"}`}>
              {fear.putCallRatio.toFixed(2)}
            </p>
            <p className="text-xs text-[--text-muted] mt-1">
              {fear.putCallRatio > 1 ? "Bearish — Plus de puts" : fear.putCallRatio < 0.7 ? "Bullish — Plus de calls" : "Neutre"}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-[--bg-secondary]">
              <div
                className={`h-full rounded-full transition-all ${fear.putCallRatio > 1 ? "bg-rose-500" : fear.putCallRatio < 0.7 ? "bg-emerald-500" : "bg-cyan-500"}`}
                style={{ width: `${Math.min(fear.putCallRatio * 50, 100)}%` }}
              />
            </div>
          </div>

          {/* VIX/VXN Spread */}
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-[--text-muted] mb-1">VIX / VXN Spread</p>
            <p className={`text-2xl font-bold mono ${fear.vixVxnSpread > 0 ? "text-amber-400" : "text-cyan-400"}`}>
              {fear.vixVxnSpread > 0 ? "+" : ""}{fear.vixVxnSpread.toFixed(1)}
            </p>
            <p className="text-xs text-[--text-muted] mt-1">
              {fear.vixVxnSpread > 0 ? "SPX plus stressé que NDX" : "NDX plus stressé que SPX"}
            </p>
          </div>

          {/* SKEW Index */}
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-[--text-muted] mb-1">SKEW Index</p>
            <p className={`text-2xl font-bold mono ${fear.skewIndex > 140 ? "text-amber-400" : fear.skewIndex > 130 ? "text-cyan-400" : "text-emerald-400"}`}>
              {fear.skewIndex.toFixed(1)}
            </p>
            <p className="text-xs text-[--text-muted] mt-1">
              {fear.skewIndex > 140 ? "Risque de tail event élevé" : fear.skewIndex > 130 ? "Normal" : "Risque faible"}
            </p>
          </div>

          {/* VVIX */}
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-[--text-muted] mb-1">VVIX (Vol of VIX)</p>
            <p className={`text-2xl font-bold mono ${fear.vvix > 110 ? "text-rose-400" : fear.vvix > 90 ? "text-amber-400" : "text-cyan-400"}`}>
              {fear.vvix.toFixed(1)}
            </p>
            <p className="text-xs text-[--text-muted] mt-1">
              {fear.vvix > 110 ? "Incertitude extrême" : fear.vvix > 90 ? "Incertitude modérée" : "Calme"}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 5 — Vol Instruments                                     */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Instruments de Volatilité</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {VOL_INSTRUMENTS.map(({ symbol, name }) => {
            const d = volData[symbol];
            const pct = d?.changepct ?? 0;
            return (
              <div key={symbol} className="metric-card rounded-xl p-4">
                <p className="text-xs text-[--text-muted]">{name}</p>
                <p className="text-lg font-bold mono text-[--text-primary] mt-1">{d ? `$${d.last.toFixed(2)}` : "—"}</p>
                <p className={`text-sm mono flex items-center gap-1 ${pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {d ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 6 — Inter-Market                                        */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Inter-Marchés</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MARKET_ETFS.map(({ symbol, name }) => {
            const d = volData[symbol];
            const pct = d?.changepct ?? 0;
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

      {/* ============================================================ */}
      {/*  ROW 7 — Signals                                             */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-[--text-primary] mb-4">Signaux Automatiques</h3>
        <div className="space-y-3">
          {vixLevel > 30 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-sm font-medium text-rose-400">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                VIX en zone panique ({vixLevel.toFixed(1)}) — Marché très volatil, réduisez votre taille de position
              </p>
            </div>
          )}
          {vixLevel < 15 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                VIX très bas ({vixLevel.toFixed(1)}) — Complaisance, un spike de volatilité pourrait arriver
              </p>
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
          {isContango && vixLevel < 20 && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">
                <Minus className="w-4 h-4 inline mr-1.5" />
                Structure en Contango + VIX normal — Conditions favorables pour les stratégies short vol
              </p>
            </div>
          )}
          {vixLevel >= 15 && vixLevel <= 30 && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">VIX normal ({vixLevel.toFixed(1)}) — Conditions de trading standards</p>
            </div>
          )}
          {vixLevel >= 15 && vixLevel <= 30 && !spy && (
            <p className="text-sm text-[--text-muted] text-center py-2">Aucun signal particulier — Marché dans les normes</p>
          )}
        </div>
      </div>
    </div>
  );
}
