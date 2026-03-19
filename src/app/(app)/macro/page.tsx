"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Landmark,
  BarChart3,
  DollarSign,
  Globe,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { fetchMultipleFredSeries, type FredSeriesData } from "@/lib/market/fred";

/* ------------------------------------------------------------------ */
/*  Hardcoded macro data for March 2026                                */
/* ------------------------------------------------------------------ */

const CENTRAL_BANK_RATES = [
  { bank: "Fed (US)", rate: "4.25 – 4.50%", value: 4.375, prev: 4.625, trend: "down" as const, flag: "🇺🇸", color: "text-cyan-400", nextMeeting: "19 mars 2026" },
  { bank: "BCE (EU)", rate: "2.65%", value: 2.65, prev: 2.90, trend: "down" as const, flag: "🇪🇺", color: "text-blue-400", nextMeeting: "17 avr. 2026" },
  { bank: "BoE (UK)", rate: "4.50%", value: 4.50, prev: 4.75, trend: "down" as const, flag: "🇬🇧", color: "text-purple-400", nextMeeting: "8 mai 2026" },
  { bank: "BoJ (JP)", rate: "0.50%", value: 0.50, prev: 0.25, trend: "up" as const, flag: "🇯🇵", color: "text-rose-400", nextMeeting: "28 avr. 2026" },
  { bank: "PBoC (CN)", rate: "3.10%", value: 3.10, prev: 3.10, trend: "flat" as const, flag: "🇨🇳", color: "text-amber-400", nextMeeting: "20 avr. 2026" },
  { bank: "RBA (AU)", rate: "3.85%", value: 3.85, prev: 4.10, trend: "down" as const, flag: "🇦🇺", color: "text-emerald-400", nextMeeting: "6 mai 2026" },
];

const INFLATION_DATA = [
  { country: "US", flag: "🇺🇸", label: "CPI US", current: 2.8, previous: 3.0, target: 2.0, yoy: 2.8 },
  { country: "EU", flag: "🇪🇺", label: "HICP EU", current: 2.4, previous: 2.6, target: 2.0, yoy: 2.4 },
  { country: "UK", flag: "🇬🇧", label: "CPI UK", current: 3.0, previous: 3.2, target: 2.0, yoy: 3.0 },
  { country: "JP", flag: "🇯🇵", label: "CPI Japon", current: 2.6, previous: 2.8, target: 2.0, yoy: 2.6 },
  { country: "CN", flag: "🇨🇳", label: "CPI Chine", current: 0.6, previous: 0.5, target: 3.0, yoy: 0.6 },
];

const BOND_YIELDS = {
  us: [
    { tenor: "2A", value: 4.12, prev: 4.25, change: -0.13 },
    { tenor: "5A", value: 4.08, prev: 4.18, change: -0.10 },
    { tenor: "10A", value: 4.25, prev: 4.30, change: -0.05 },
    { tenor: "30A", value: 4.52, prev: 4.55, change: -0.03 },
  ],
  de: [
    { tenor: "2A", value: 2.35, prev: 2.45, change: -0.10 },
    { tenor: "10A", value: 2.68, prev: 2.75, change: -0.07 },
  ],
  uk: [
    { tenor: "2A", value: 4.18, prev: 4.28, change: -0.10 },
    { tenor: "10A", value: 4.42, prev: 4.48, change: -0.06 },
  ],
};

const DXY_DATA = {
  value: 104.2,
  change: -0.35,
  changePct: -0.34,
  high52w: 108.5,
  low52w: 99.2,
  correlations: [
    { asset: "Or (XAU)", correlation: -0.82, desc: "Inverse forte" },
    { asset: "EUR/USD", correlation: -0.95, desc: "Inverse très forte" },
    { asset: "S&P 500", correlation: -0.35, desc: "Inverse faible" },
    { asset: "Pétrole (WTI)", correlation: -0.42, desc: "Inverse modérée" },
  ],
};

const PMI_DATA = [
  { country: "US", flag: "🇺🇸", manufacturing: 52.1, services: 54.3, composite: 53.5 },
  { country: "EU", flag: "🇪🇺", manufacturing: 47.8, services: 51.2, composite: 50.2 },
  { country: "UK", flag: "🇬🇧", manufacturing: 48.5, services: 53.1, composite: 51.6 },
  { country: "CN", flag: "🇨🇳", manufacturing: 50.8, services: 52.5, composite: 51.9 },
  { country: "JP", flag: "🇯🇵", manufacturing: 49.2, services: 53.8, composite: 52.1 },
  { country: "DE", flag: "🇩🇪", manufacturing: 45.3, services: 50.8, composite: 48.9 },
];

/* ------------------------------------------------------------------ */
/*  Yield Curve SVG                                                    */
/* ------------------------------------------------------------------ */

function YieldCurveChart({ data }: { data: { tenor: string; value: number; prev: number }[] }) {
  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = [...data.map((d) => d.value), ...data.map((d) => d.prev)];
  const min = Math.min(...allValues) - 0.15;
  const max = Math.max(...allValues) + 0.15;

  const pointsCurrent = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + (1 - (d.value - min) / (max - min)) * chartH,
  }));

  const pointsPrev = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + (1 - (d.prev - min) / (max - min)) * chartH,
  }));

  const pathCurrent = pointsCurrent.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const pathPrev = pointsPrev.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const isInverted = data.length >= 2 && data[0].value > data[data.length - 1].value;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {[min, (min + max) / 2, max].map((v) => {
          const y = padding.top + (1 - (v - min) / (max - min)) * chartH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
              <text x={padding.left - 5} y={y + 4} textAnchor="end" className="fill-[--text-muted]" fontSize="10">{v.toFixed(2)}%</text>
            </g>
          );
        })}
        {/* Previous curve (dashed) */}
        <path d={pathPrev} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        {/* Current curve */}
        <path d={pathCurrent} fill="none" stroke={isInverted ? "#f59e0b" : "#0ea5e9"} strokeWidth="2.5" strokeLinejoin="round" />
        {pointsCurrent.map((p, i) => (
          <g key={data[i].tenor}>
            <circle cx={p.x} cy={p.y} r="4" fill={isInverted ? "#f59e0b" : "#0ea5e9"} />
            <text x={p.x} y={padding.top + chartH + 20} textAnchor="middle" className="fill-[--text-muted]" fontSize="10">{data[i].tenor}</text>
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-[--text-secondary]" fontSize="9" fontWeight="600">{data[i].value.toFixed(2)}%</text>
          </g>
        ))}
      </svg>
      {isInverted && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">Courbe inversée — Signal de récession potentielle</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inflation Trend Mini-Chart (sparkline-style)                       */
/* ------------------------------------------------------------------ */

function InflationSparkline({ current, previous, target }: { current: number; previous: number; target: number }) {
  // Simple 3-point sparkline: prev, midpoint, current
  const points = [previous, (previous + current) / 2, current];
  const min = Math.min(...points, target) - 0.3;
  const max = Math.max(...points, target) + 0.3;
  const w = 60;
  const h = 24;

  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: (1 - (v - min) / (max - min)) * h,
  }));

  const targetY = (1 - (target - min) / (max - min)) * h;
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[60px] h-[24px]">
      <line x1="0" y1={targetY} x2={w} y2={targetY} stroke="#10b981" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
      <path d={path} fill="none" stroke={current > target ? "#f59e0b" : "#10b981"} strokeWidth="1.5" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2" fill={current > target ? "#f59e0b" : "#10b981"} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function MacroPage() {
  const [fredData, setFredData] = useState<FredSeriesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFred = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMultipleFredSeries();
      if (data.length === 0) {
        setError("Aucune donnée FRED récupérée — vérifiez la clé API.");
      }
      setFredData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des données FRED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFred();
  }, []);

  // Map FRED data for quick access
  const fredMap: Record<string, FredSeriesData> = {};
  fredData.forEach((s) => { fredMap[s.key] = s; });

  const usYieldInverted = BOND_YIELDS.us[0].value > BOND_YIELDS.us[BOND_YIELDS.us.length - 1].value;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Macro</h1>
          <p className="text-sm text-[--text-secondary]">Indicateurs macroéconomiques mondiaux — Mars 2026</p>
        </div>
        <button onClick={loadFred} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm hover:text-[--text-primary] transition">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir FRED
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-400">{error}</p>
          </div>
          <p className="text-xs text-[--text-muted] mt-1 ml-6">Les données statiques de mars 2026 sont affichées ci-dessous.</p>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 1 — Central Bank Rates                              */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Landmark className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-[--text-primary]">Taux Directeurs</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CENTRAL_BANK_RATES.map((cb) => (
            <div key={cb.bank} className="metric-card rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{cb.flag}</p>
              <p className="text-xs text-[--text-muted] font-medium">{cb.bank}</p>
              <p className={`text-xl font-bold mono mt-1 ${cb.color}`}>{cb.rate}</p>
              <div className="flex items-center justify-center gap-1 mt-1.5">
                {cb.trend === "down" && <ArrowDownRight className="w-3 h-3 text-emerald-400" />}
                {cb.trend === "up" && <ArrowUpRight className="w-3 h-3 text-rose-400" />}
                {cb.trend === "flat" && <Minus className="w-3 h-3 text-[--text-muted]" />}
                <span className={`text-[10px] font-medium ${cb.trend === "down" ? "text-emerald-400" : cb.trend === "up" ? "text-rose-400" : "text-[--text-muted]"}`}>
                  {cb.trend === "down" ? "Baisse" : cb.trend === "up" ? "Hausse" : "Stable"}
                </span>
              </div>
              <p className="text-[10px] text-[--text-muted] mt-2">Prochain : {cb.nextMeeting}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2 — Inflation Tracker                               */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-[--text-primary]">Inflation (CPI YoY)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {INFLATION_DATA.map((inf) => {
            const diff = inf.current - inf.previous;
            const aboveTarget = inf.current > inf.target;
            return (
              <div key={inf.country} className="metric-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{inf.flag}</span>
                    <span className="text-xs font-medium text-[--text-secondary]">{inf.label}</span>
                  </div>
                  <InflationSparkline current={inf.current} previous={inf.previous} target={inf.target} />
                </div>
                <p className={`text-2xl font-bold mono ${aboveTarget ? "text-amber-400" : "text-emerald-400"}`}>
                  {inf.current.toFixed(1)}%
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[--text-muted]">Préc. {inf.previous.toFixed(1)}%</span>
                  <span className={`text-[10px] font-medium flex items-center gap-0.5 ${diff <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {diff <= 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                  </span>
                </div>
                {/* Target line */}
                <div className="mt-2 relative">
                  <div className="h-1.5 rounded-full bg-[--bg-secondary]">
                    <div
                      className={`h-full rounded-full ${aboveTarget ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min((inf.current / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-0 w-0.5 h-1.5 bg-emerald-300"
                    style={{ left: `${(inf.target / 5) * 100}%` }}
                    title={`Cible : ${inf.target}%`}
                  />
                </div>
                <p className="text-[10px] text-[--text-muted] mt-1">Cible : {inf.target}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 3 — Bond Yields + Yield Curve                       */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Table */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-[--text-primary]">Rendements Obligataires</h2>
          </div>

          {/* US Yields */}
          <h3 className="text-xs font-medium text-[--text-muted] mb-2 uppercase tracking-wider">Trésor US</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {BOND_YIELDS.us.map((b) => (
              <div key={`us-${b.tenor}`} className="metric-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-[--text-muted]">{b.tenor}</p>
                <p className="text-lg font-bold mono text-[--text-primary]">{b.value.toFixed(2)}%</p>
                <p className={`text-[10px] mono ${b.change < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {b.change > 0 ? "+" : ""}{b.change.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* DE Yields */}
          <h3 className="text-xs font-medium text-[--text-muted] mb-2 uppercase tracking-wider">Bund Allemand</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {BOND_YIELDS.de.map((b) => (
              <div key={`de-${b.tenor}`} className="metric-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-[--text-muted]">{b.tenor}</p>
                <p className="text-lg font-bold mono text-[--text-primary]">{b.value.toFixed(2)}%</p>
                <p className={`text-[10px] mono ${b.change < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {b.change > 0 ? "+" : ""}{b.change.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* UK Yields */}
          <h3 className="text-xs font-medium text-[--text-muted] mb-2 uppercase tracking-wider">Gilt UK</h3>
          <div className="grid grid-cols-2 gap-3">
            {BOND_YIELDS.uk.map((b) => (
              <div key={`uk-${b.tenor}`} className="metric-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-[--text-muted]">{b.tenor}</p>
                <p className="text-lg font-bold mono text-[--text-primary]">{b.value.toFixed(2)}%</p>
                <p className={`text-[10px] mono ${b.change < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {b.change > 0 ? "+" : ""}{b.change.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Yield Curve Chart */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-[--text-primary]">Courbe de Taux US</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-[--text-muted]">
                <span className="w-4 h-0.5 bg-[--text-muted] inline-block" style={{ borderTop: "1.5px dashed var(--text-muted)" }} /> Préc.
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-4 h-0.5 bg-cyan-400 inline-block" /> Actuel
              </span>
            </div>
          </div>
          <YieldCurveChart data={BOND_YIELDS.us} />
          <div className="mt-4 p-3 rounded-xl bg-[--bg-secondary]/30 border border-[--border-subtle]">
            <p className="text-xs text-[--text-secondary]">
              <strong>Spread 2A–10A :</strong>{" "}
              <span className={`mono font-medium ${usYieldInverted ? "text-amber-400" : "text-cyan-400"}`}>
                {(BOND_YIELDS.us[2].value - BOND_YIELDS.us[0].value).toFixed(2)}%
              </span>
              {usYieldInverted ? " — Inversion (attention récession)" : " — Normal (pente positive)"}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 4 — Dollar Index (DXY)                              */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-[--text-primary]">Dollar Index (DXY)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DXY level */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-4xl font-bold mono text-[--text-primary]">{DXY_DATA.value.toFixed(1)}</p>
              <p className={`text-sm mt-1 flex items-center gap-1 ${DXY_DATA.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {DXY_DATA.changePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {DXY_DATA.changePct >= 0 ? "+" : ""}{DXY_DATA.changePct.toFixed(2)}% ({DXY_DATA.change >= 0 ? "+" : ""}{DXY_DATA.change.toFixed(2)})
              </p>
            </div>
            {/* 52W Range */}
            <div className="mt-4">
              <p className="text-xs text-[--text-muted] mb-1">Range 52 semaines</p>
              <div className="relative h-2 rounded-full bg-[--bg-secondary]">
                <div
                  className="absolute h-full rounded-full bg-cyan-500/30"
                  style={{
                    left: "0%",
                    width: "100%",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full border-2 border-[--bg-card-solid] shadow"
                  style={{
                    left: `${((DXY_DATA.value - DXY_DATA.low52w) / (DXY_DATA.high52w - DXY_DATA.low52w)) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[--text-muted]">
                <span>{DXY_DATA.low52w}</span>
                <span>{DXY_DATA.high52w}</span>
              </div>
            </div>
            {/* Trend */}
            <div className={`mt-3 px-3 py-2 rounded-xl ${DXY_DATA.changePct >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <p className={`text-xs font-medium ${DXY_DATA.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                Tendance : {DXY_DATA.changePct >= 0 ? "Dollar fort — Pression baissière sur les matières premières" : "Dollar faible — Support pour l'or et les marchés émergents"}
              </p>
            </div>
          </div>

          {/* Correlations */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-medium text-[--text-muted] mb-3 uppercase tracking-wider">Corrélations DXY</h3>
            <div className="grid grid-cols-2 gap-3">
              {DXY_DATA.correlations.map((c) => (
                <div key={c.asset} className="metric-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[--text-primary]">{c.asset}</span>
                    <span className={`text-xs font-medium ${c.correlation > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {c.correlation > 0 ? "+" : ""}{c.correlation.toFixed(2)}
                    </span>
                  </div>
                  {/* Correlation bar */}
                  <div className="relative h-2 rounded-full bg-[--bg-secondary]">
                    <div className="absolute left-1/2 top-0 w-px h-full bg-[--text-muted]/30" />
                    {c.correlation < 0 ? (
                      <div
                        className="absolute h-full rounded-l-full bg-rose-500/70"
                        style={{
                          right: "50%",
                          width: `${Math.abs(c.correlation) * 50}%`,
                        }}
                      />
                    ) : (
                      <div
                        className="absolute h-full rounded-r-full bg-emerald-500/70"
                        style={{
                          left: "50%",
                          width: `${Math.abs(c.correlation) * 50}%`,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-[--text-muted] mt-1.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 5 — Global PMI                                      */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-[--text-primary]">PMI Global</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[--bg-secondary] text-[--text-muted] ml-2">Au-dessus de 50 = expansion</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border-subtle]">
                <th className="text-left py-2 text-[--text-secondary] font-medium">Pays</th>
                <th className="text-center py-2 text-[--text-secondary] font-medium">Manufacturier</th>
                <th className="text-center py-2 text-[--text-secondary] font-medium">Services</th>
                <th className="text-center py-2 text-[--text-secondary] font-medium">Composite</th>
              </tr>
            </thead>
            <tbody>
              {PMI_DATA.map((row) => (
                <tr key={row.country} className="border-b border-[--border-subtle]/50">
                  <td className="py-3">
                    <span className="mr-2">{row.flag}</span>
                    <span className="font-medium text-[--text-primary]">{row.country}</span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold mono ${row.manufacturing >= 50 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {row.manufacturing >= 50 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.manufacturing.toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold mono ${row.services >= 50 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {row.services >= 50 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.services.toFixed(1)}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold mono ${row.composite >= 50 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {row.composite.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 6 — FRED Data (live if available)                   */}
      {/* ============================================================ */}
      {fredData.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-[--text-primary]">Données FRED (en direct)</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="metric-card rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-[--bg-secondary]/50 rounded w-1/2 mb-3" />
                  <div className="h-7 bg-[--bg-secondary]/50 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fredData.map((s) => (
                <div key={s.key} className="metric-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[--text-secondary] font-medium">{s.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[--bg-secondary] text-[--text-muted]">{s.frequency}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-bold mono text-[--text-primary]">{s.latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-[--text-muted]">{s.unit}</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${s.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {s.change > 0 ? <TrendingUp className="w-3 h-3" /> : s.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span className="mono">{s.change >= 0 ? "+" : ""}{s.change.toFixed(2)} ({s.changePercent.toFixed(2)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 7 — Summary / Macro Outlook                         */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold text-[--text-primary] mb-4">Résumé Macro — Mars 2026</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-sm text-cyan-400">
              <Landmark className="w-4 h-4 inline mr-1.5" />
              <strong>Politique monétaire :</strong> Cycle de baisse des taux en cours (Fed, BCE, BoE). BoJ en hausse graduelle.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400">
              <Activity className="w-4 h-4 inline mr-1.5" />
              <strong>Inflation :</strong> En baisse mais encore au-dessus des cibles dans la plupart des pays développés.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-400">
              <Globe className="w-4 h-4 inline mr-1.5" />
              <strong>PMI :</strong> Services en expansion. Manufacturier sous pression en Europe (DE en contraction).
            </p>
          </div>
          {usYieldInverted && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-400">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                <strong>Courbe des taux :</strong> Inversion 2A/10A US — signal historique de récession.
              </p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-[--bg-secondary]/30 border border-[--border-subtle]">
            <p className="text-sm text-[--text-secondary]">
              <DollarSign className="w-4 h-4 inline mr-1.5" />
              <strong>Dollar :</strong> DXY à {DXY_DATA.value} — {DXY_DATA.changePct < 0 ? "en baisse, favorable aux actifs risqués" : "en hausse, pression sur les marchés émergents"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
