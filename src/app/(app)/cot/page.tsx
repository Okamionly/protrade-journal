"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import { fetchCotData, fetchCotDisaggregated, type CotParsed, type CotDisaggregated } from "@/lib/market/cot";
import { COT_CONTRACTS, COT_CATEGORIES } from "@/lib/market/constants";
import { RefreshCw, Search, TrendingUp, TrendingDown, ArrowLeft, AlertTriangle, Zap, BarChart3, Target, Brain } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { AIInsightsCard, type InsightItem } from "@/components/AIInsightsCard";
import { useTranslation } from "@/i18n/context";
import { useTheme } from "next-themes";

Chart.register(...registerables);

type ViewMode = "overview" | "detail";

interface CotOverviewRow {
  key: string;
  name: string;
  category: string;
  longPct: number;
  prevLongPct: number;
  shortPct: number;
  netPosition: number;
  prevNet: number;
  sentiment: "bullish" | "bearish";
  sentimentTrend: "up" | "down" | "flat";
  change: number;
  percentileRank: number; // 0-100, how current net compares to 52w history
  commNet: number;
  commPercentile: number; // commercial net percentile 0-100
  history: CotParsed[];   // full 52w history for charts
}

type SignalLevel = "extreme" | "elevated" | "normal";

// --- Signal types for the dashboard ---
type CotSignalType = "accumulation" | "extreme_position" | "reversal" | "divergence";

interface CotSignal {
  key: string;
  name: string;
  type: CotSignalType;
  direction: "bullish" | "bearish";
  conviction: number; // 1-5
  description: string;
  color: string; // tailwind color class
}

// --- FX pair mapping ---
const FX_PAIR_MAP: Record<string, string> = {
  EUR: "EUR/USD", GBP: "GBP/USD", JPY: "USD/JPY", AUD: "AUD/USD",
  CAD: "USD/CAD", CHF: "USD/CHF", NZD: "NZD/USD", MXN: "USD/MXN",
  GOLD: "XAU/USD", SILVER: "XAG/USD", OIL: "WTI", BRENT: "Brent",
};

function getSignalLevel(percentile: number): SignalLevel {
  if (percentile >= 95 || percentile <= 5) return "extreme";
  if (percentile >= 75 || percentile <= 25) return "elevated";
  return "normal";
}

function getSignalStyle(level: SignalLevel): { badge: string; dot: string; label: string; rowBg: string } {
  switch (level) {
    case "extreme":
      return {
        badge: "bg-rose-500/20 text-rose-400 border border-rose-500/40",
        dot: "bg-rose-500",
        label: "Extrême",
        rowBg: "bg-rose-500/[0.06]",
      };
    case "elevated":
      return {
        badge: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
        dot: "bg-amber-500",
        label: "Élevé",
        rowBg: "bg-amber-500/[0.04]",
      };
    default:
      return {
        badge: "bg-[--bg-secondary]/50 text-[--text-secondary] border border-[--border]",
        dot: "bg-[--text-muted]",
        label: "Normal",
        rowBg: "",
      };
  }
}

// --- Generate trading signals from COT data ---
function generateSignals(rows: CotOverviewRow[]): CotSignal[] {
  const signals: CotSignal[] = [];
  for (const r of rows) {
    const pair = FX_PAIR_MAP[r.key] || r.key;
    // Commercial accumulation signal
    if (r.commPercentile >= 70) {
      const conviction = r.commPercentile >= 90 ? 5 : r.commPercentile >= 80 ? 4 : 3;
      signals.push({
        key: r.key, name: pair, type: "accumulation", direction: "bullish", conviction,
        description: `Commerciaux accumulent des longs ${r.key}`,
        color: "emerald",
      });
    } else if (r.commPercentile <= 30) {
      const conviction = r.commPercentile <= 10 ? 5 : r.commPercentile <= 20 ? 4 : 3;
      signals.push({
        key: r.key, name: pair, type: "accumulation", direction: "bearish", conviction,
        description: `Commerciaux accumulent des shorts ${r.key}`,
        color: "rose",
      });
    }
    // Speculator extreme position → reversal signal
    if (r.percentileRank >= 90) {
      const conviction = r.percentileRank >= 97 ? 5 : r.percentileRank >= 93 ? 4 : 3;
      signals.push({
        key: r.key, name: pair, type: "extreme_position", direction: "bearish", conviction,
        description: `Spéculateurs en position extrême LONG ${r.key}`,
        color: "amber",
      });
    } else if (r.percentileRank <= 10) {
      const conviction = r.percentileRank <= 3 ? 5 : r.percentileRank <= 7 ? 4 : 3;
      signals.push({
        key: r.key, name: pair, type: "extreme_position", direction: "bullish", conviction,
        description: `Spéculateurs en position extrême SHORT ${r.key}`,
        color: "amber",
      });
    }
  }
  return signals.sort((a, b) => b.conviction - a.conviction);
}

// --- Generate trading implications ---
function generateImplications(rows: CotOverviewRow[]): { pair: string; key: string; text: string; bias: "bullish" | "bearish" | "neutral"; strength: string }[] {
  const implications: { pair: string; key: string; text: string; bias: "bullish" | "bearish" | "neutral"; strength: string }[] = [];
  for (const r of rows) {
    const pair = FX_PAIR_MAP[r.key] || r.key;
    // Commercial bias
    if (r.commPercentile >= 70) {
      const strength = r.commPercentile >= 85 ? "fort" : "moyen terme";
      implications.push({
        pair, key: r.key,
        text: `${pair} : Commerciaux haussiers → Biais haussier ${strength}`,
        bias: "bullish", strength,
      });
    } else if (r.commPercentile <= 30) {
      const strength = r.commPercentile <= 15 ? "fort" : "moyen terme";
      implications.push({
        pair, key: r.key,
        text: `${pair} : Commerciaux baissiers → Biais baissier ${strength}`,
        bias: "bearish", strength,
      });
    }
    // Speculator extreme → correction risk
    if (r.percentileRank >= 90) {
      implications.push({
        pair, key: r.key,
        text: `${pair} : Spéculateurs en extrême long → Risque de correction`,
        bias: "bearish", strength: "alerte",
      });
    } else if (r.percentileRank <= 10) {
      implications.push({
        pair, key: r.key,
        text: `${pair} : Spéculateurs en extrême short → Potentiel de rebond`,
        bias: "bullish", strength: "alerte",
      });
    }
  }
  return implications;
}

// --- Conviction bars component ---
function ConvictionBars({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <div className="flex gap-0.5 items-end">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm transition-all ${
            i < level
              ? level >= 4 ? "bg-emerald-400" : level >= 3 ? "bg-amber-400" : "bg-[--text-muted]"
              : "bg-[--bg-secondary]/60"
          }`}
          style={{ height: `${8 + i * 3}px` }}
        />
      ))}
    </div>
  );
}

// --- SVG Historical Positioning Chart ---
function HistoricalPositioningSVG({ data }: { data: CotParsed[] }) {
  if (data.length < 2) return null;

  const W = 800;
  const H = 320;
  const PAD = { top: 30, right: 20, bottom: 40, left: 70 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Collect all net values
  const commNets = data.map((d) => d.commNet);
  const specNets = data.map((d) => d.nonCommNet);
  const retailNets = data.map((d) => d.retailNet);
  const allVals = [...commNets, ...specNets, ...retailNets];
  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const rangeY = maxY - minY || 1;

  // Compute mean and stddev for speculator net to highlight extremes
  const specMean = specNets.reduce((a, b) => a + b, 0) / specNets.length;
  const specStd = Math.sqrt(specNets.reduce((a, b) => a + (b - specMean) ** 2, 0) / specNets.length) || 1;
  const extremeHigh = specMean + 2 * specStd;
  const extremeLow = specMean - 2 * specStd;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - minY) / rangeY) * plotH;

  const makePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = rangeY / 5;
  for (let i = 0; i <= 5; i++) yTicks.push(minY + step * i);

  // X-axis labels (show ~6 dates)
  const xLabels: { i: number; label: string }[] = [];
  const xStep = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += xStep) {
    xLabels.push({ i, label: data[i].date.slice(5) });
  }

  // Extreme zones
  const ehY = toY(Math.min(extremeHigh, maxY));
  const elY = toY(Math.max(extremeLow, minY));
  const ehClipped = Math.max(PAD.top, ehY);
  const elClipped = Math.min(PAD.top + plotH, elY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 360 }}>
      {/* Extreme zones */}
      {extremeHigh < maxY && (
        <rect x={PAD.left} y={PAD.top} width={plotW} height={ehClipped - PAD.top}
          fill="rgba(239,68,68,0.06)" />
      )}
      {extremeLow > minY && (
        <rect x={PAD.left} y={elClipped} width={plotW} height={PAD.top + plotH - elClipped}
          fill="rgba(239,68,68,0.06)" />
      )}
      {/* Extreme threshold lines */}
      {extremeHigh < maxY && (
        <line x1={PAD.left} x2={PAD.left + plotW} y1={ehClipped} y2={ehClipped}
          stroke="rgba(239,68,68,0.3)" strokeDasharray="6,4" strokeWidth={1} />
      )}
      {extremeLow > minY && (
        <line x1={PAD.left} x2={PAD.left + plotW} y1={elClipped} y2={elClipped}
          stroke="rgba(239,68,68,0.3)" strokeDasharray="6,4" strokeWidth={1} />
      )}

      {/* Zero line */}
      {minY < 0 && maxY > 0 && (
        <line x1={PAD.left} x2={PAD.left + plotW} y1={toY(0)} y2={toY(0)}
          stroke="var(--text-muted)" strokeWidth={0.5} strokeDasharray="4,4" opacity={0.4} />
      )}

      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={PAD.left + plotW} y1={toY(v)} y2={toY(v)}
            stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
          <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end"
            fill="var(--text-muted)" fontSize={10} fontFamily="monospace">
            {(v / 1000).toFixed(0)}K
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - 8} textAnchor="middle"
          fill="var(--text-muted)" fontSize={10} fontFamily="monospace">
          {label}
        </text>
      ))}

      {/* Lines */}
      <path d={makePath(commNets)} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.9} />
      <path d={makePath(specNets)} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.9} />
      <path d={makePath(retailNets)} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.7} />

      {/* Legend */}
      <g transform={`translate(${PAD.left + 10}, ${PAD.top + 10})`}>
        <rect x={0} y={-8} width={220} height={52} rx={6} fill="var(--bg-primary)" opacity={0.85} />
        <circle cx={10} cy={4} r={4} fill="#10b981" /><text x={20} y={8} fill="var(--text-secondary)" fontSize={11}>Commerciaux (Net)</text>
        <circle cx={10} cy={20} r={4} fill="#ef4444" /><text x={20} y={24} fill="var(--text-secondary)" fontSize={11}>Spéculateurs (Net)</text>
        <circle cx={10} cy={36} r={4} fill="#3b82f6" /><text x={20} y={40} fill="var(--text-secondary)" fontSize={11}>Petits Traders (Net)</text>
      </g>

      {/* Axis labels */}
      <text x={PAD.left - 8} y={PAD.top - 10} fill="var(--text-muted)" fontSize={10}>Contrats</text>
    </svg>
  );
}

// --- COT Index Gauge (0-100) ---
function CotIndexGauge({ value, label }: { value: number; label: string }) {
  const clampedVal = Math.max(0, Math.min(100, value));
  const color =
    clampedVal >= 70 ? "bg-emerald-500" :
    clampedVal >= 40 ? "bg-amber-400" :
    "bg-rose-500";
  const textColor =
    clampedVal >= 70 ? "text-emerald-400" :
    clampedVal >= 40 ? "text-amber-400" :
    "text-rose-400";

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs font-bold w-14 shrink-0 text-[--text-primary]">{label}</span>
      <div className="flex-1 relative">
        <div className="h-3 rounded-full bg-[--bg-secondary]/60 overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all duration-700`}
            style={{ width: `${clampedVal}%` }}
          />
        </div>
        {/* Marker ticks at 30 and 70 */}
        <div className="absolute top-0 left-[30%] w-px h-3 bg-[--text-muted]/30" />
        <div className="absolute top-0 left-[70%] w-px h-3 bg-[--text-muted]/30" />
      </div>
      <span className={`text-xs font-mono font-bold w-10 text-right ${textColor}`}>{clampedVal}</span>
    </div>
  );
}

export default function CotPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [view, setView] = useState<ViewMode>("overview");
  const [asset, setAsset] = useState("EUR");
  const [category, setCategory] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [overviewData, setOverviewData] = useState<CotOverviewRow[]>([]);
  const [detailData, setDetailData] = useState<CotParsed[]>([]);
  const [disaggData, setDisaggData] = useState<CotDisaggregated[]>([]);
  const [detailTab, setDetailTab] = useState<"legacy" | "managed">("legacy");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const netChartRef = useRef<HTMLCanvasElement>(null);
  const netChartInstance = useRef<Chart | null>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);

  // Load overview data for all contracts
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const keys = Object.keys(COT_CONTRACTS);
      const results = await Promise.allSettled(
        keys.map(async (key) => {
          const data = await fetchCotData(key, 52);
          return { key, data };
        })
      );

      const rows: CotOverviewRow[] = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { key, data } = result.value;
        if (data.length === 0) continue;
        const last = data[data.length - 1];
        const prev = data.length > 1 ? data[data.length - 2] : null;
        const contract = COT_CONTRACTS[key];
        const oi = last.openInterest || 1;
        const longPct = (last.nonCommLong / oi) * 100;
        const shortPct = (last.nonCommShort / oi) * 100;
        const prevLongPct = prev ? (prev.nonCommLong / (prev.openInterest || 1)) * 100 : longPct;
        const netPosition = last.nonCommNet;
        const prevNet = prev?.nonCommNet ?? netPosition;
        const changeNet = netPosition - prevNet;
        const sentiment: "bullish" | "bearish" = netPosition >= 0 ? "bullish" : "bearish";
        const sentimentTrend = changeNet > 0 ? "up" : changeNet < 0 ? "down" : "flat";

        // Compute percentile rank of current net position vs 52w history
        const allNets = data.map((d) => d.nonCommNet).sort((a, b) => a - b);
        const belowCount = allNets.filter((n) => n < netPosition).length;
        const percentileRank = allNets.length > 1 ? (belowCount / (allNets.length - 1)) * 100 : 50;

        // Compute commercial net percentile
        const commNetVal = last.commNet;
        const allCommNets = data.map((d) => d.commNet).sort((a, b) => a - b);
        const commBelowCount = allCommNets.filter((n) => n < commNetVal).length;
        const commPercentile = allCommNets.length > 1 ? (commBelowCount / (allCommNets.length - 1)) * 100 : 50;

        rows.push({
          key,
          name: contract.name,
          category: contract.category,
          longPct,
          prevLongPct,
          shortPct,
          netPosition,
          prevNet,
          sentiment,
          sentimentTrend,
          change: prevNet !== 0 ? ((netPosition - prevNet) / Math.abs(prevNet)) * 100 : 0,
          percentileRank: Math.round(percentileRank),
          commNet: commNetVal,
          commPercentile: Math.round(commPercentile),
          history: data,
        });
      }
      setOverviewData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async (key: string) => {
    setDetailLoading(true);
    try {
      const [legacy, disagg] = await Promise.allSettled([
        fetchCotData(key, 52),
        fetchCotDisaggregated(key, 52),
      ]);
      setDetailData(legacy.status === "fulfilled" ? legacy.value : []);
      setDisaggData(disagg.status === "fulfilled" ? disagg.value : []);
    } catch {
      setDetailData([]);
      setDisaggData([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (view === "detail") loadDetail(asset);
  }, [view, asset, loadDetail]);

  const filteredRows = overviewData.filter((r) => {
    const matchCategory = category === "Tous" || r.category === category;
    const matchSearch = !search || r.key.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Computed signals and implications
  const cotSignals = useMemo(() => generateSignals(overviewData), [overviewData]);
  const tradingImplications = useMemo(() => generateImplications(overviewData), [overviewData]);

  // --- AI Insights: "Comment trader le COT cette semaine" ---
  const { trades } = useTrades();
  const cotWeeklyInsights = useMemo<InsightItem[]>(() => {
    if (overviewData.length === 0) return [];
    const items: InsightItem[] = [];

    // Find strongest commercial accumulation signals
    const commBullish = overviewData
      .filter((r) => r.commPercentile >= 70)
      .sort((a, b) => b.commPercentile - a.commPercentile);
    const commBearish = overviewData
      .filter((r) => r.commPercentile <= 30)
      .sort((a, b) => a.commPercentile - b.commPercentile);

    if (commBullish.length > 0) {
      const top = commBullish[0];
      const pair = FX_PAIR_MAP[top.key] || top.key;
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `Commerciaux accumulent ${pair} longs (P${top.commPercentile}) → Biais haussier moyen terme`,
        type: "bullish",
      });
    }

    if (commBearish.length > 0) {
      const top = commBearish[0];
      const pair = FX_PAIR_MAP[top.key] || top.key;
      items.push({
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        text: `Commerciaux réduisent ${pair} (P${top.commPercentile}) → Biais baissier moyen terme`,
        type: "bearish",
      });
    }

    // Find extreme speculator positions (reversal candidates)
    const extremeLong = overviewData.filter((r) => r.percentileRank >= 90);
    const extremeShort = overviewData.filter((r) => r.percentileRank <= 10);

    if (extremeLong.length > 0) {
      const names = extremeLong.map((r) => FX_PAIR_MAP[r.key] || r.key).join(", ");
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: `Spéculateurs en extrême long sur ${names} → Risque de correction, prudence`,
        type: "warning",
      });
    }

    if (extremeShort.length > 0) {
      const names = extremeShort.map((r) => FX_PAIR_MAP[r.key] || r.key).join(", ");
      items.push({
        icon: <Zap className="w-3.5 h-3.5" />,
        text: `Spéculateurs en extrême short sur ${names} → Potentiel de short squeeze`,
        type: "bullish",
      });
    }

    // Cross-reference with user trades
    if (trades.length >= 5) {
      const tradedAssets = new Set(trades.map((t) => t.asset?.toUpperCase()));
      const matchingSignals = overviewData.filter((r) => {
        const pair = FX_PAIR_MAP[r.key] || r.key;
        return tradedAssets.has(pair.toUpperCase()) || tradedAssets.has(r.key.toUpperCase());
      });
      if (matchingSignals.length > 0) {
        const aligned = matchingSignals.filter((r) => r.commPercentile >= 60 || r.commPercentile <= 40);
        if (aligned.length > 0) {
          items.push({
            icon: <Target className="w-3.5 h-3.5" />,
            text: `${aligned.length} de vos actifs tradés ont un signal COT actif — vérifiez l'alignement`,
            type: "info",
          });
        }
      }
    }

    return items.slice(0, 4);
  }, [overviewData, trades]);

  // Detail charts
  useEffect(() => {
    if (view !== "detail" || !netChartRef.current || detailData.length === 0) return;
    if (netChartInstance.current) netChartInstance.current.destroy();

    netChartInstance.current = new Chart(netChartRef.current, {
      type: "line",
      data: {
        labels: detailData.map((d) => d.date.slice(5)),
        datasets: [
          { label: "Non-Commercials (Net)", data: detailData.map((d) => d.nonCommNet), borderColor: "#0ea5e9", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
          { label: "Commercials (Net)", data: detailData.map((d) => d.commNet), borderColor: "#10b981", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
          { label: "Retail (Net)", data: detailData.map((d) => d.retailNet), borderColor: "#f59e0b", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b" } } },
        scales: {
          y: { grid: { color: theme === "dark" || theme === "oled" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }, ticks: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b" } },
          x: { grid: { display: false }, ticks: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b", maxTicksLimit: 12 } },
        },
      },
    });
    return () => { netChartInstance.current?.destroy(); };
  }, [detailData, view, theme]);

  useEffect(() => {
    if (view !== "detail" || !barChartRef.current || detailData.length === 0) return;
    if (barChartInstance.current) barChartInstance.current.destroy();
    const last = detailData[detailData.length - 1];
    if (!last) return;

    barChartInstance.current = new Chart(barChartRef.current, {
      type: "bar",
      data: {
        labels: ["Non-Comm", "Commercials", "Retail"],
        datasets: [
          { label: "Long", data: [last.nonCommLong, last.commLong, last.retailLong], backgroundColor: "#10b981", borderRadius: 4 },
          { label: "Short", data: [last.nonCommShort, last.commShort, last.retailShort], backgroundColor: "#ef4444", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b" } } },
        scales: {
          y: { grid: { color: theme === "dark" || theme === "oled" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }, ticks: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b" } },
          x: { grid: { display: false }, ticks: { color: theme === "dark" || theme === "oled" ? "#94a3b8" : "#64748b" } },
        },
      },
    });
    return () => { barChartInstance.current?.destroy(); };
  }, [detailData, view, theme]);

  const currentContract = COT_CONTRACTS[asset];

  const openDetail = (key: string) => {
    setAsset(key);
    setView("detail");
  };

  if (view === "detail") {
    const last = detailData.length > 0 ? detailData[detailData.length - 1] : null;
    const prev = detailData.length > 1 ? detailData[detailData.length - 2] : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("overview")} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{asset} — {currentContract?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">{currentContract?.category}</span>
              <span className="mono text-xs text-[--text-muted]">CFTC #{currentContract?.code}</span>
            </div>
          </div>
          <button onClick={() => loadDetail(asset)} className="ml-auto p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${detailLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {detailLoading ? (
          <div className="glass rounded-2xl p-6 animate-pulse"><div className="h-[300px] bg-[--bg-secondary]/30 rounded" /></div>
        ) : (
          <>
            {last && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Non-Comm Net", value: last.nonCommNet, prev: prev?.nonCommNet, color: "text-cyan-400" },
                  { label: "Commercials Net", value: last.commNet, prev: prev?.commNet, color: "text-emerald-400" },
                  { label: "Retail Net", value: last.retailNet, prev: prev?.retailNet, color: "text-amber-400" },
                  { label: "Open Interest", value: last.openInterest, prev: prev?.openInterest, color: "text-purple-400" },
                ].map((m) => {
                  const chg = m.prev != null ? m.value - m.prev : 0;
                  return (
                    <div key={m.label} className="glass rounded-xl p-4">
                      <p className="text-xs text-[--text-secondary] mb-1">{m.label}</p>
                      <p className={`text-xl font-bold mono ${m.color}`}>{m.value.toLocaleString()}</p>
                      {chg !== 0 && (
                        <p className={`text-xs mono mt-1 ${chg > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {chg > 0 ? "+" : ""}{chg.toLocaleString()} {t("previous")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historical Positioning Chart (SVG) */}
            {detailData.length > 2 && (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold">Positionnement historique (52 sem.)</h3>
                </div>
                <p className="text-xs text-[--text-muted] mb-3">
                  Positions nettes par catégorie. Les zones rouges indiquent un positionnement au-delà de 2 écarts-types.
                </p>
                <HistoricalPositioningSVG data={detailData} />
              </div>
            )}

            {/* COT Index for this asset */}
            {last && (() => {
              const rowMatch = overviewData.find((r) => r.key === asset);
              if (!rowMatch) return null;
              return (
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold">Indice COT (0-100)</h3>
                  </div>
                  <p className="text-xs text-[--text-muted] mb-4">
                    0 = positionnement le plus baissier sur 52 sem. | 100 = le plus haussier.
                    {" "}30-70 = zone neutre.
                  </p>
                  <div className="space-y-3">
                    <CotIndexGauge value={rowMatch.percentileRank} label="Spéc." />
                    <CotIndexGauge value={rowMatch.commPercentile} label="Comm." />
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t("cotNetPositioning52w")}</h3>
                <div className="chart-container"><canvas ref={netChartRef} /></div>
              </div>
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t("cotLongVsShortLastWeek")}</h3>
                <div className="chart-container"><canvas ref={barChartRef} /></div>
              </div>
            </div>

            {/* Tab toggle: Legacy / Managed Money */}
            <div className="flex gap-2">
              <button
                onClick={() => setDetailTab("legacy")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  detailTab === "legacy"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] border border-[--border]"
                }`}
              >
                Legacy (Non-Comm / Comm)
              </button>
              <button
                onClick={() => setDetailTab("managed")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  detailTab === "managed"
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/50"
                    : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] border border-[--border]"
                }`}
              >
                Managed Money (Disaggregated)
              </button>
            </div>

            {detailTab === "legacy" ? (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t("cotRawDataLast10Weeks")}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                        <th className="pb-3 px-2">Date</th><th className="pb-3 px-2">NC Long</th><th className="pb-3 px-2">NC Short</th>
                        <th className="pb-3 px-2">NC Net</th><th className="pb-3 px-2">Comm Net</th><th className="pb-3 px-2">Retail Net</th><th className="pb-3 px-2">OI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.slice(-10).reverse().map((r) => (
                        <tr key={r.date} className="border-b border-[--border-subtle] hover:bg-[var(--bg-hover)]">
                          <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.date}</td>
                          <td className="py-2.5 px-2 mono">{r.nonCommLong.toLocaleString()}</td>
                          <td className="py-2.5 px-2 mono">{r.nonCommShort.toLocaleString()}</td>
                          <td className={`py-2.5 px-2 mono font-bold ${r.nonCommNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.nonCommNet.toLocaleString()}</td>
                          <td className={`py-2.5 px-2 mono ${r.commNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.commNet.toLocaleString()}</td>
                          <td className={`py-2.5 px-2 mono ${r.retailNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.retailNet.toLocaleString()}</td>
                          <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.openInterest.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-2">Managed Money — Disaggregated Report</h3>
                <p className="text-xs text-[--text-muted] mb-4">
                  Positions des fonds (Managed Money), producteurs, swap dealers et autres reportables. Source : CFTC Disaggregated.
                </p>
                {disaggData.length === 0 ? (
                  <p className="text-sm text-[--text-muted] py-4 text-center">
                    Pas de données Disaggregated disponibles pour ce contrat.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[--text-secondary] border-b border-[--border] text-xs">
                          <th className="pb-3 px-2">Date</th>
                          <th className="pb-3 px-2">MM Long</th>
                          <th className="pb-3 px-2">MM Short</th>
                          <th className="pb-3 px-2">MM Net</th>
                          <th className="pb-3 px-2">Prod Net</th>
                          <th className="pb-3 px-2">Swap Net</th>
                          <th className="pb-3 px-2">Other Net</th>
                          <th className="pb-3 px-2">OI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disaggData.slice(-10).reverse().map((r) => (
                          <tr key={r.date} className="border-b border-[--border-subtle] hover:bg-[var(--bg-hover)]">
                            <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.date}</td>
                            <td className="py-2.5 px-2 mono">{r.managedMoneyLong.toLocaleString()}</td>
                            <td className="py-2.5 px-2 mono">{r.managedMoneyShort.toLocaleString()}</td>
                            <td className={`py-2.5 px-2 mono font-bold ${r.managedMoneyNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.managedMoneyNet.toLocaleString()}
                            </td>
                            <td className={`py-2.5 px-2 mono ${r.producerNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.producerNet.toLocaleString()}
                            </td>
                            <td className={`py-2.5 px-2 mono ${r.swapDealerNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.swapDealerNet.toLocaleString()}
                            </td>
                            <td className={`py-2.5 px-2 mono ${r.otherReportableNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.otherReportableNet.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.openInterest.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // === OVERVIEW VIEW ===
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("cotReportTitle")}</h1>
          <p className="text-sm text-[--text-secondary] mt-1">{t("cotReportSubtitle")}</p>
        </div>
        <button onClick={loadOverview} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition" title={t("refresh")}>
          <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category pills + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {COT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                category === cat
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] border border-[--border]"
              }`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchSymbols")}
            className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg pl-10 pr-4 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition" />
        </div>
      </div>

      {/* === 1. COT Signals Dashboard === */}
      {!loading && cotSignals.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold">Signaux COT</h2>
            <span className="text-xs text-[--text-muted] ml-2">{cotSignals.length} signal(aux) actif(s)</span>
          </div>
          <p className="text-xs text-[--text-muted] mb-4">
            Signaux basés sur les variations de positions nettes et les lectures extrêmes (percentiles 52 sem.)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cotSignals.slice(0, 8).map((sig, idx) => {
              const bgClass =
                sig.direction === "bullish"
                  ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                  : sig.type === "extreme_position"
                    ? "border-amber-500/40 bg-amber-500/[0.08]"
                    : "border-rose-500/40 bg-rose-500/[0.08]";
              const iconColor =
                sig.direction === "bullish" ? "text-emerald-400"
                  : sig.type === "extreme_position" ? "text-amber-400"
                    : "text-rose-400";
              return (
                <button
                  key={`${sig.key}-${sig.type}-${idx}`}
                  onClick={() => openDetail(sig.key)}
                  className={`flex flex-col gap-2 p-3.5 rounded-xl border text-left transition hover:scale-[1.02] cursor-pointer ${bgClass}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {sig.direction === "bullish"
                        ? <TrendingUp className={`w-4 h-4 ${iconColor}`} />
                        : <TrendingDown className={`w-4 h-4 ${iconColor}`} />}
                      <span className="font-bold text-sm">{sig.name}</span>
                    </div>
                    <ConvictionBars level={sig.conviction} />
                  </div>
                  <p className="text-[11px] text-[--text-secondary] leading-snug">{sig.description}</p>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      sig.type === "accumulation"
                        ? "bg-cyan-500/15 text-cyan-400"
                        : sig.type === "extreme_position"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-purple-500/15 text-purple-400"
                    }`}>
                      {sig.type === "accumulation" ? "Accumulation" : sig.type === "extreme_position" ? "Extrême" : "Retournement"}
                    </span>
                    <span className={`text-[10px] font-medium ${iconColor}`}>
                      {sig.direction === "bullish" ? "Haussier" : "Baissier"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === 3. Impact Trading Section === */}
      {!loading && tradingImplications.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Impact Trading</h2>
          </div>
          <p className="text-xs text-[--text-muted] mb-4">
            Implications de trading basées sur le positionnement COT. Commerciaux net long &gt; 70e percentile = biais haussier.
          </p>
          <div className="space-y-2">
            {tradingImplications.map((imp, idx) => (
              <button
                key={`${imp.key}-${idx}`}
                onClick={() => openDetail(imp.key)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[--border] hover:bg-[var(--bg-hover)] transition text-left cursor-pointer"
              >
                <div className={`w-2 h-8 rounded-full shrink-0 ${
                  imp.bias === "bullish" ? "bg-emerald-500" : imp.bias === "bearish" ? "bg-rose-500" : "bg-[--text-muted]"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[--text-primary] truncate">{imp.text}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  imp.strength === "fort" ? "bg-emerald-500/15 text-emerald-400"
                    : imp.strength === "alerte" ? "bg-amber-500/15 text-amber-400"
                      : "bg-cyan-500/15 text-cyan-400"
                }`}>
                  {imp.strength}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === AI Insights: Comment trader le COT cette semaine === */}
      {!loading && cotWeeklyInsights.length > 0 && (
        <AIInsightsCard
          title="Comment trader le COT cette semaine"
          insights={cotWeeklyInsights}
          minimumTrades={5}
          currentTradeCount={trades.length}
        />
      )}

      {/* === 4. COT Index (0-100) === */}
      {!loading && overviewData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Indice COT (0-100)</h2>
          </div>
          <p className="text-xs text-[--text-muted] mb-4">
            Positionnement normalisé sur 52 semaines. 0 = plus baissier | 100 = plus haussier. Zone neutre : 30-70.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
            {filteredRows
              .sort((a, b) => {
                // Extremes first
                const aExt = a.percentileRank >= 80 || a.percentileRank <= 20 ? 0 : 1;
                const bExt = b.percentileRank >= 80 || b.percentileRank <= 20 ? 0 : 1;
                if (aExt !== bExt) return aExt - bExt;
                return Math.abs(b.percentileRank - 50) - Math.abs(a.percentileRank - 50);
              })
              .map((r) => (
                <div key={r.key} className="cursor-pointer hover:opacity-80 transition" onClick={() => openDetail(r.key)}>
                  <CotIndexGauge value={r.percentileRank} label={r.key} />
                </div>
              ))}
          </div>
        </div>
      )}

      {error && <div className="glass rounded-xl p-4 text-rose-400 text-sm">{error}</div>}

      {loading ? (
        <div className="glass rounded-2xl p-6 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-[--bg-secondary]/30 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[--text-secondary] border-b border-[--border] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">{t("symbol")}</th>
                  <th className="px-4 py-3">{t("cotName")}</th>
                  <th className="px-4 py-3">{t("cotCategory")}</th>
                  <th className="px-4 py-3">{t("sentiment")}</th>
                  <th className="px-4 py-3">Long%</th>
                  <th className="px-4 py-3">{t("cotPrevLong")}</th>
                  <th className="px-4 py-3">{t("cotShort")}</th>
                  <th className="px-4 py-3 text-right">{t("cotNetPos")}</th>
                  <th className="px-4 py-3 text-right">{t("cotPrevNet")}</th>
                  <th className="px-4 py-3 text-right">{t("change")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const changePct = r.change;
                  const signalLevel = getSignalLevel(r.percentileRank);
                  const signalStyle = getSignalStyle(signalLevel);
                  return (
                    <tr key={r.key}
                      onClick={() => openDetail(r.key)}
                      className={`border-b border-[--border-subtle]/50 hover:bg-[var(--bg-hover)] cursor-pointer transition ${signalStyle.rowBg}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${signalStyle.dot}`} />
                          {signalLevel !== "normal" && (
                            <span className="text-[10px] text-[--text-muted] mono" title={`Percentile 52 sem. : positionnement supérieur à ${r.percentileRank}% de l'historique`}>{r.percentileRank}%</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[--text-primary]">{r.key}</td>
                      <td className="px-4 py-3 text-[--text-secondary] text-xs">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--bg-secondary]/50 text-[--text-secondary]">{r.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                          r.sentiment === "bullish"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {t(r.sentiment)}
                        </span>
                        {r.sentimentTrend !== "flat" && (
                          <span className="ml-1.5">
                            {r.sentimentTrend === "up"
                              ? <TrendingUp className="w-3 h-3 text-emerald-400 inline" />
                              : <TrendingDown className="w-3 h-3 text-rose-400 inline" />}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(r.longPct, 100)}%` }} />
                          </div>
                          <span className="mono text-xs text-emerald-400">{r.longPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 mono text-xs text-[--text-muted]">{r.prevLongPct.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(r.shortPct, 100)}%` }} />
                          </div>
                          <span className="mono text-xs text-rose-400">{r.shortPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right mono font-bold ${r.netPosition >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {r.netPosition.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right mono text-xs text-[--text-muted]">{r.prevNet.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right mono text-xs font-medium ${changePct > 0 ? "text-emerald-400" : changePct < 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                        {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
                        {changePct !== 0 && (
                          changePct > 0
                            ? <TrendingUp className="w-3 h-3 inline ml-1" />
                            : <TrendingDown className="w-3 h-3 inline ml-1" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="p-8 text-center text-[--text-muted]">{t("noResultsWithFilters")}</div>
          )}
        </div>
      )}
    </div>
  );
}
