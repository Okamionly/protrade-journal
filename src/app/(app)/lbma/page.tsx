"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Clock,
  Activity,
  BarChart3,
  Minus,
} from "lucide-react";

/* ─── Types ─── */
interface LbmaEntry {
  d: string;
  v: [number | null, number | null, number | null];
}

interface LbmaData {
  gold_am: LbmaEntry[];
  gold_pm: LbmaEntry[];
  silver: LbmaEntry[];
  updated: string;
}

type Currency = "USD" | "GBP" | "EUR";
type Period = "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";
type Metal = "gold" | "silver";

const CURRENCY_IDX: Record<Currency, number> = { USD: 0, GBP: 1, EUR: 2 };
const CURRENCY_SYMBOLS: Record<Currency, string> = { USD: "$", GBP: "£", EUR: "€" };
const PERIOD_DAYS: Record<Period, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825, MAX: 99999 };

/* ─── Helpers ─── */
function formatPrice(val: number | null, currency: Currency): string {
  if (val == null) return "N/A";
  return `${CURRENCY_SYMBOLS[currency]}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctChange(current: number, prev: number): number {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Mini SVG Chart ─── */
function SparkLine({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Full Area Chart ─── */
function AreaChart({
  data,
  currency,
  height = 300,
}: {
  data: LbmaEntry[];
  currency: Currency;
  height?: number;
}) {
  const idx = CURRENCY_IDX[currency];
  const prices = data.map((e) => e.v[idx] ?? 0).filter((v) => v > 0);
  if (prices.length < 2) return <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Pas assez de données</div>;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 900;
  const h = height;
  const padY = 20;

  const points = prices.map((v, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return `${x},${y}`;
  }).join(" ");

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "#10b981" : "#ef4444";

  // Y-axis labels
  const yLabels = Array.from({ length: 5 }, (_, i) => {
    const val = min + (range * i) / 4;
    const y = h - padY - (i / 4) * (h - padY * 2);
    return { val, y };
  });

  // X-axis labels (5 evenly spaced)
  const xLabels = Array.from({ length: 5 }, (_, i) => {
    const dataIdx = Math.floor((i / 4) * (data.length - 1));
    const x = (dataIdx / (data.length - 1)) * w;
    return { date: data[dataIdx]?.d, x };
  });

  // Hover state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * prices.length;
          setHoverIdx(Math.min(Math.max(Math.round(x), 0), prices.length - 1));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yLabels.map(({ y }, i) => (
          <line key={i} x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}
        {/* Area */}
        <polygon points={`0,${h - padY} ${points} ${w},${h - padY}`} fill="url(#areaGrad)" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {/* Hover line */}
        {hoverIdx !== null && (
          <>
            <line
              x1={(hoverIdx / (prices.length - 1)) * w}
              y1={padY}
              x2={(hoverIdx / (prices.length - 1)) * w}
              y2={h - padY}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={(hoverIdx / (prices.length - 1)) * w}
              cy={h - padY - ((prices[hoverIdx] - min) / range) * (h - padY * 2)}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}
        {/* Y labels */}
        {yLabels.map(({ val, y }, i) => (
          <text key={i} x="5" y={y - 5} fill="var(--text-muted)" fontSize="11" fontFamily="monospace">
            {CURRENCY_SYMBOLS[currency]}{val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </text>
        ))}
        {/* X labels */}
        {xLabels.map(({ date, x }, i) => (
          <text key={i} x={x} y={h - 2} fill="var(--text-muted)" fontSize="10" textAnchor="middle" fontFamily="monospace">
            {date ? new Date(date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) : ""}
          </text>
        ))}
      </svg>
      {/* Hover tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="absolute top-2 right-2 glass rounded-lg px-3 py-2 text-xs pointer-events-none"
          style={{ border: "1px solid var(--border)" }}
        >
          <div style={{ color: "var(--text-muted)" }}>{formatDate(data[hoverIdx].d)}</div>
          <div className="font-bold mono" style={{ color }}>{formatPrice(prices[hoverIdx], currency)}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function LBMAPage() {
  const [data, setData] = useState<LbmaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [period, setPeriod] = useState<Period>("1Y");
  const [metal, setMetal] = useState<Metal>("gold");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lbma?days=3650");
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const idx = CURRENCY_IDX[currency];

  // Filter data by period
  const filteredData = useMemo(() => {
    if (!data) return { gold_am: [], gold_pm: [], silver: [] };
    const maxDays = PERIOD_DAYS[period];
    const filterByPeriod = (arr: LbmaEntry[]) => arr.slice(-maxDays);
    return {
      gold_am: filterByPeriod(data.gold_am),
      gold_pm: filterByPeriod(data.gold_pm),
      silver: filterByPeriod(data.silver),
    };
  }, [data, period]);

  // Current prices
  const currentGoldAm = data?.gold_am?.length ? data.gold_am[data.gold_am.length - 1] : null;
  const currentGoldPm = data?.gold_pm?.length ? data.gold_pm[data.gold_pm.length - 1] : null;
  const currentSilver = data?.silver?.length ? data.silver[data.silver.length - 1] : null;
  const prevGoldAm = data?.gold_am?.length && data.gold_am.length >= 2 ? data.gold_am[data.gold_am.length - 2] : null;
  const prevGoldPm = data?.gold_pm?.length && data.gold_pm.length >= 2 ? data.gold_pm[data.gold_pm.length - 2] : null;
  const prevSilver = data?.silver?.length && data.silver.length >= 2 ? data.silver[data.silver.length - 2] : null;

  // Gold/Silver ratio
  const gsRatio = currentGoldPm?.v[idx] && currentSilver?.v[idx]
    ? (currentGoldPm.v[idx]! / currentSilver.v[idx]!).toFixed(1)
    : "N/A";

  // Sparkline data
  const goldSparkline = useMemo(
    () => (data?.gold_pm || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );
  const silverSparkline = useMemo(
    () => (data?.silver || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );

  // Export CSV
  const handleExport = () => {
    if (!data) return;
    const source = metal === "gold" ? data.gold_pm : data.silver;
    const rows = source.slice(-365).map((e) => `${e.d},${e.v[0] ?? ""},${e.v[1] ?? ""},${e.v[2] ?? ""}`);
    const csv = `\uFEFFDate,USD,GBP,EUR\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lbma_${metal}_prices.csv`;
    a.click();
  };

  // Stats
  const chartData = metal === "gold" ? filteredData.gold_pm : filteredData.silver;
  const allPrices = chartData.map((e) => e.v[idx] ?? 0).filter((v) => v > 0);
  const periodHigh = allPrices.length ? Math.max(...allPrices) : 0;
  const periodLow = allPrices.length ? Math.min(...allPrices) : 0;
  const periodAvg = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
  const periodChange = allPrices.length >= 2 ? pctChange(allPrices[allPrices.length - 1], allPrices[0]) : 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            LBMA Métaux Précieux
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Données officielles — London Bullion Market Association
            {data?.updated && (
              <span className="ml-2 opacity-60">
                <Clock className="w-3 h-3 inline -mt-0.5" /> Mis à jour : {new Date(data.updated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency selector */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-medium transition ${currency === c ? "bg-amber-500/20 text-amber-400" : ""}`}
                style={currency !== c ? { color: "var(--text-secondary)" } : {}}
              >
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-sm hover:bg-[var(--bg-hover)] transition" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-sm hover:bg-[var(--bg-hover)] transition" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 text-rose-400 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Skeleton Loader */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 rounded w-20 mb-3" style={{ background: "var(--bg-hover)" }} />
                <div className="h-8 rounded w-28 mb-2" style={{ background: "var(--bg-hover)" }} />
                <div className="h-3 rounded w-16" style={{ background: "var(--bg-hover)" }} />
              </div>
            ))}
          </div>
          <div className="metric-card rounded-2xl p-6 animate-pulse">
            <div className="h-[300px] rounded-xl" style={{ background: "var(--bg-hover)" }} />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Price Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gold AM */}
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Or — Fixing AM</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">10:30 LON</span>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {formatPrice(currentGoldAm?.v[idx] ?? null, currency)}
              </div>
              {prevGoldAm && currentGoldAm && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${pctChange(currentGoldAm.v[idx]!, prevGoldAm.v[idx]!) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {pctChange(currentGoldAm.v[idx]!, prevGoldAm.v[idx]!) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {pctChange(currentGoldAm.v[idx]!, prevGoldAm.v[idx]!).toFixed(2)}%
                </div>
              )}
              <div className="mt-2">
                <SparkLine data={goldSparkline} color="#f59e0b" height={40} />
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                {currentGoldAm?.d ? formatDate(currentGoldAm.d) : ""}
              </div>
            </div>

            {/* Gold PM */}
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Or — Fixing PM</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">15:00 LON</span>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {formatPrice(currentGoldPm?.v[idx] ?? null, currency)}
              </div>
              {prevGoldPm && currentGoldPm && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${pctChange(currentGoldPm.v[idx]!, prevGoldPm.v[idx]!) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {pctChange(currentGoldPm.v[idx]!, prevGoldPm.v[idx]!) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {pctChange(currentGoldPm.v[idx]!, prevGoldPm.v[idx]!).toFixed(2)}%
                </div>
              )}
              <div className="mt-2">
                <SparkLine data={goldSparkline} color="#f59e0b" height={40} />
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                {currentGoldPm?.d ? formatDate(currentGoldPm.d) : ""}
              </div>
            </div>

            {/* Silver */}
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Argent — Fixing</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-400/15 text-slate-400 font-medium">12:00 LON</span>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {formatPrice(currentSilver?.v[idx] ?? null, currency)}
              </div>
              {prevSilver && currentSilver && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${pctChange(currentSilver.v[idx]!, prevSilver.v[idx]!) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {pctChange(currentSilver.v[idx]!, prevSilver.v[idx]!) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {pctChange(currentSilver.v[idx]!, prevSilver.v[idx]!).toFixed(2)}%
                </div>
              )}
              <div className="mt-2">
                <SparkLine data={silverSparkline} color="#94a3b8" height={40} />
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                {currentSilver?.d ? formatDate(currentSilver.d) : ""}
              </div>
            </div>

            {/* Gold/Silver Ratio */}
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ratio Or/Argent</span>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {gsRatio}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {Number(gsRatio) > 80 ? "Argent sous-évalué" : Number(gsRatio) < 60 ? "Or sous-évalué" : "Zone neutre"}
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.max((Number(gsRatio) || 70) / 120 * 100, 10), 95)}%`,
                    background: Number(gsRatio) > 80 ? "#f59e0b" : Number(gsRatio) < 60 ? "#94a3b8" : "#06b6d4",
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>30</span>
                <span>70</span>
                <span>120</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setMetal("gold")}
                    className={`px-4 py-2 text-sm font-medium transition ${metal === "gold" ? "bg-amber-500/20 text-amber-400" : ""}`}
                    style={metal !== "gold" ? { color: "var(--text-secondary)" } : {}}
                  >
                    🥇 Or
                  </button>
                  <button
                    onClick={() => setMetal("silver")}
                    className={`px-4 py-2 text-sm font-medium transition ${metal === "silver" ? "bg-slate-400/20 text-slate-300" : ""}`}
                    style={metal !== "silver" ? { color: "var(--text-secondary)" } : {}}
                  >
                    🥈 Argent
                  </button>
                </div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Historique {metal === "gold" ? "Or (PM Fix)" : "Argent"} — {currency}
                </h3>
              </div>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {(["1M", "3M", "6M", "1Y", "5Y", "MAX"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium transition ${period === p ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                    style={period !== p ? { color: "var(--text-secondary)" } : {}}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <AreaChart data={chartData} currency={currency} height={300} />

            {/* Period Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>Plus haut</div>
                <div className="text-sm font-bold mono text-emerald-400">{formatPrice(periodHigh, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>Plus bas</div>
                <div className="text-sm font-bold mono text-rose-400">{formatPrice(periodLow, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>Moyenne</div>
                <div className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>{formatPrice(periodAvg, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>Variation</div>
                <div className={`text-sm font-bold mono flex items-center gap-1 ${periodChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {periodChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {periodChange >= 0 ? "+" : ""}{periodChange.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Data Table — Last 30 entries */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Dernières cotations — {metal === "gold" ? "Or" : "Argent"}
              </h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {chartData.length} entrées affichées
              </span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: "var(--bg-card)" }}>
                  <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">USD ($)</th>
                    <th className="px-4 py-3 text-right">GBP (£)</th>
                    <th className="px-4 py-3 text-right">EUR (€)</th>
                    <th className="px-4 py-3 text-right">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chartData].reverse().slice(0, 30).map((entry, i, arr) => {
                    const prev = arr[i + 1];
                    const change = prev?.v[0] ? pctChange(entry.v[0]!, prev.v[0]!) : 0;
                    return (
                      <tr
                        key={entry.d}
                        className="hover:bg-[var(--bg-hover)] transition"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>
                          {formatDate(entry.d)}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-primary)" }}>
                          {entry.v[0] != null ? `$${entry.v[0].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-secondary)" }}>
                          {entry.v[1] != null ? `£${entry.v[1].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-secondary)" }}>
                          {entry.v[2] != null ? `€${entry.v[2].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {change !== 0 ? (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                            </span>
                          ) : (
                            <Minus className="w-3 h-3 inline" style={{ color: "var(--text-muted)" }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixing Schedule Info */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              <Clock className="w-4 h-4 inline -mt-0.5 mr-2 text-amber-400" />
              Horaires des Fixings LBMA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="metric-card rounded-xl p-4">
                <div className="text-xs font-medium text-amber-400 mb-1">🥇 Or — AM Fix</div>
                <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>10:30</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Londres (UTC+0/+1) → 5:30 AM New York
                </div>
              </div>
              <div className="metric-card rounded-xl p-4">
                <div className="text-xs font-medium text-amber-400 mb-1">🥇 Or — PM Fix</div>
                <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>15:00</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Londres (UTC+0/+1) → 10:00 AM New York
                </div>
              </div>
              <div className="metric-card rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 mb-1">🥈 Argent — Fix</div>
                <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>12:00</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Londres (UTC+0/+1) → 7:00 AM New York
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
