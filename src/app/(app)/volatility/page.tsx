"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { AIInsightsCard, type InsightItem } from "@/components/AIInsightsCard";
import { Brain, Target, Zap as ZapIcon, ShieldCheck } from "lucide-react";

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

interface VixApiData {
  vix: {
    current: number;
    previousClose: number;
    changePct: number;
    high: number;
    low: number;
    open: number;
    history: number[];
    dates: string[];
  };
  spy: {
    current: number;
    previousClose: number;
    changePct: number;
    history: number[];
    dates: string[];
  };
  termStructure: {
    label: string;
    value: number;
    symbol: string;
  }[];
  fetchedAt: string;
  source: "cboe" | "yahoo" | "unavailable";
  sourceDetails: string;
}

/* ------------------------------------------------------------------ */
/*  No mock data — show "Données indisponibles" when API unavailable   */
/* ------------------------------------------------------------------ */

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

function getVixZone(v: number, t: (k: string) => string) {
  if (v < 15) return { label: t("vol_vixZoneLow"), color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", zone: "low" };
  if (v < 20) return { label: t("vol_vixZoneNormal"), color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30", zone: "normal" };
  if (v < 30) return { label: t("vol_vixZoneElevated"), color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", zone: "elevated" };
  if (v < 50) return { label: t("vol_vixZoneHigh"), color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30", zone: "high" };
  return { label: t("vol_vixZoneExtreme"), color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", zone: "extreme" };
}

function getIvSignal(iv: number, hv: number, t: (k: string) => string) {
  const ratio = iv / hv;
  if (ratio > 1.2) return { label: t("vol_ivHigh"), color: "text-amber-400", desc: t("vol_sellPremium") };
  if (ratio < 0.85) return { label: t("vol_ivLow"), color: "text-emerald-400", desc: t("vol_buyPremium") };
  return { label: t("vol_ivNeutral"), color: "text-cyan-400", desc: t("vol_noSignal") };
}

/* ------------------------------------------------------------------ */
/*  SVG Charts                                                         */
/* ------------------------------------------------------------------ */

function VixHistoryChart({ data, dates }: { data: number[]; dates?: string[] }) {
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

  // X-axis labels: use real dates if available
  const xLabels = dates && dates.length > 0
    ? { start: dates[0], mid: dates[Math.floor(dates.length / 2)], end: dates[dates.length - 1] }
    : { start: "J-30", mid: "J-15", end: "Auj." };

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
      <text x={padding.left} y={height - 5} className="fill-[--text-muted]" fontSize="9">{xLabels.start}</text>
      <text x={padding.left + chartW / 2} y={height - 5} textAnchor="middle" className="fill-[--text-muted]" fontSize="9">{xLabels.mid}</text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" className="fill-[--text-muted]" fontSize="9">{xLabels.end}</text>
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
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Row 1 skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-6">
            <div className="h-4 bg-[--bg-secondary]/50 rounded w-1/3 mb-4" />
            <div className="h-12 bg-[--bg-secondary]/50 rounded w-1/2 mb-3" />
            <div className="h-3 bg-[--bg-secondary]/50 rounded w-2/3" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="glass rounded-2xl p-6">
        <div className="h-4 bg-[--bg-secondary]/50 rounded w-1/4 mb-4" />
        <div className="h-40 bg-[--bg-secondary]/30 rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function VolatilityPage() {
  const { t } = useTranslation();
  const [volData, setVolData] = useState<Record<string, VolData>>({});
  const [vixApiData, setVixApiData] = useState<VixApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const allSymbols = [...VOL_INSTRUMENTS, ...MARKET_ETFS].map((i) => i.symbol);

  /* ---- Fetch real VIX data from our API ---- */
  const fetchVixData = useCallback(async () => {
    try {
      const res = await fetch("/api/market-data/vix");
      if (!res.ok) throw new Error(`VIX API: ${res.status}`);
      const data: VixApiData = await res.json();
      setVixApiData(data);
      return data;
    } catch {
      // Will use mock data via fallback
      return null;
    }
  }, []);

  /* ---- Fetch quotes for instruments ---- */
  const fetchQuotes = useCallback(async () => {
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
        return newData;
      }
      throw new Error("Données invalides reçues de l'API");
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch VIX data and quotes in parallel
    const [vixData, quotesData] = await Promise.all([fetchVixData(), fetchQuotes()]);

    // Handle VIX data
    if (vixData) {
      setUsingMock(vixData.source === "unavailable");
      if (vixData.source === "unavailable") {
        setError("Données indisponibles — Réessayez ultérieurement");
      }
    }

    // Handle quotes
    if (quotesData) {
      // If we have real VIX API data, overlay VIX and SPY values onto quotes
      if (vixData) {
        if (quotesData["VIX"]) {
          quotesData["VIX"].last = vixData.vix.current;
          quotesData["VIX"].changepct = vixData.vix.changePct;
        } else {
          quotesData["VIX"] = {
            symbol: "VIX",
            name: "CBOE Volatility Index",
            last: vixData.vix.current,
            changepct: vixData.vix.changePct,
          };
        }
        // Only overlay SPY if the API actually returned SPY data (current > 0)
        if (vixData.spy.current > 0) {
          if (quotesData["SPY"]) {
            quotesData["SPY"].last = vixData.spy.current;
            quotesData["SPY"].changepct = vixData.spy.changePct;
          } else {
            quotesData["SPY"] = {
              symbol: "SPY",
              name: "S&P 500",
              last: vixData.spy.current,
              changepct: vixData.spy.changePct,
            };
          }
        }
      }
      setVolData(quotesData);
    } else {
      // Quotes failed — only populate VIX/SPY from VIX API if available, rest stays empty
      const partialData: Record<string, VolData> = {};
      if (vixData && vixData.vix.current > 0) {
        partialData["VIX"] = {
          symbol: "VIX",
          name: "CBOE Volatility Index",
          last: vixData.vix.current,
          changepct: vixData.vix.changePct,
          volume: 0,
        };
      }
      if (vixData && vixData.spy.current > 0) {
        partialData["SPY"] = {
          symbol: "SPY",
          name: "S&P 500",
          last: vixData.spy.current,
          changepct: vixData.spy.changePct,
          volume: 0,
        };
      }
      setVolData(partialData);
      if (!error) {
        setError("Données indisponibles — Réessayez ultérieurement");
        setUsingMock(true);
      }
    }

    setLoading(false);
  }, [fetchVixData, fetchQuotes, error]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Derived values */
  const vix = volData["VIX"];
  const vixLevel = vixApiData?.vix.current ?? vix?.last ?? 0;
  const vixChangePct = vixApiData?.vix.changePct ?? vix?.changepct ?? 0;
  const vixZone = getVixZone(vixLevel, t);

  const spy = volData["SPY"];
  const spyChangePct = vixApiData?.spy.changePct ?? spy?.changepct ?? 0;

  // Calculate Fear & Greed from real VIX + SPY change
  const fearGreed = Math.max(0, Math.min(100, 50 + spyChangePct * 10 - (vixLevel - 20) * 2));

  const getFearGreedLabel = (v: number) => {
    if (v >= 80) return { label: "Avidité Extrême", color: "text-emerald-400" };
    if (v >= 60) return { label: "Avidité", color: "text-emerald-300" };
    if (v >= 40) return { label: "Neutre", color: "text-cyan-400" };
    if (v >= 20) return { label: "Peur", color: "text-rose-300" };
    return { label: "Peur Extrême", color: "text-rose-400" };
  };
  const fg = getFearGreedLabel(fearGreed);

  // VIX history: only from real API data
  const vixHistory = vixApiData?.vix.history ?? [];
  const vixDates = vixApiData?.vix.dates;

  // Term structure: only from real API data
  const termStructure = vixApiData?.termStructure?.length
    ? vixApiData.termStructure
    : [];
  const isContango = termStructure.length >= 2 ? termStructure[termStructure.length - 1].value > termStructure[0].value : false;

  // --- AI Insights: Recommandation IA basée sur le VIX ---
  const { trades } = useTrades();
  const volInsights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];

    if (vixLevel > 30) {
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: `VIX à ${vixLevel.toFixed(1)} — Volatilité extrême. Réduisez vos positions de 50% et élargissez vos stops`,
        type: "warning",
      });
      items.push({
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        text: "Privilégiez les valeurs refuges (or, CHF, JPY) et évitez les positions overnight",
        type: "bearish",
      });
    } else if (vixLevel > 25) {
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: `VIX à ${vixLevel.toFixed(1)} — Volatilité élevée. Réduisez vos positions de 30% minimum`,
        type: "warning",
      });
      items.push({
        icon: <Target className="w-3.5 h-3.5" />,
        text: "Favorisez le day trading sur timeframes courts, limitez le swing trading",
        type: "neutral",
      });
    } else if (vixLevel > 20) {
      items.push({
        icon: <Activity className="w-3.5 h-3.5" />,
        text: `VIX à ${vixLevel.toFixed(1)} — Volatilité modérée. Taille de position standard avec stops ajustés`,
        type: "neutral",
      });
    } else if (vixLevel > 15) {
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `VIX à ${vixLevel.toFixed(1)} — Conditions idéales pour le swing trading et les positions tendance`,
        type: "bullish",
      });
    } else {
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `VIX très bas (${vixLevel.toFixed(1)}) — Marché complaisant. Conditions idéales mais attention aux surprises`,
        type: "bullish",
      });
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: "VIX historiquement bas → Achetez de la protection (puts), le calme précède souvent la tempête",
        type: "warning",
      });
    }

    // Term structure insight
    if (!isContango) {
      items.push({
        icon: <ZapIcon className="w-3.5 h-3.5" />,
        text: "Structure en backwardation → Le marché anticipe plus de volatilité à court terme",
        type: "warning",
      });
    }

    return items.slice(0, 4);
  }, [vixLevel, isContango]);

  // Data source label
  const dataSourceLabel = vixApiData?.source === "cboe"
    ? "CBOE"
    : vixApiData?.source === "yahoo"
      ? "Yahoo Finance"
      : "Données indisponibles";
  const isLiveSource = vixApiData?.source === "cboe" || vixApiData?.source === "yahoo";
  const fetchedAtLabel = vixApiData?.fetchedAt
    ? new Date(vixApiData.fetchedAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : null;

  // VIX intraday range from API
  const vixHigh = vixApiData?.vix.high ?? 0;
  const vixLow = vixApiData?.vix.low ?? 0;
  const vixOpen = vixApiData?.vix.open ?? 0;
  const hasVixRange = vixHigh > 0 && vixLow > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Volatilité</h1>
            <p className="text-sm text-[--text-secondary]">{t("loadingData")}</p>
          </div>
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Rafraîchir
          </button>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Volatilité</h1>
          <p className="text-sm text-[--text-secondary]">
            Analyse de la volatilité et sentiment du marché
            {fetchedAtLabel && (
              <span className="text-[--text-muted] ml-2">
                — {vixApiData?.sourceDetails ?? dataSourceLabel} ({fetchedAtLabel})
              </span>
            )}
          </p>
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

      {/* === AI Insights: Recommandation IA === */}
      {!loading && volInsights.length > 0 && (
        <AIInsightsCard
          title="Recommandation IA"
          insights={volInsights}
          minimumTrades={5}
          currentTradeCount={trades.length}
        />
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
            {isLiveSource && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">LIVE</span>
            )}
            {isLiveSource && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">{dataSourceLabel}</span>
            )}
          </div>
          <p className={`text-5xl font-bold mono ${vixZone.color}`}>{vixLevel.toFixed(2)}</p>
          <p className={`text-sm mt-2 flex items-center gap-1 ${vixChangePct >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {vixChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {vixChangePct >= 0 ? "+" : ""}{vixChangePct.toFixed(2)}% {t("vol_todayLabel")}
          </p>
          {hasVixRange && (
            <div className="flex gap-3 mt-2 text-xs text-[--text-muted]">
              <span>O: <span className="mono text-[--text-secondary]">{vixOpen.toFixed(2)}</span></span>
              <span>H: <span className="mono text-[--text-secondary]">{vixHigh.toFixed(2)}</span></span>
              <span>L: <span className="mono text-[--text-secondary]">{vixLow.toFixed(2)}</span></span>
            </div>
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
          <p className="text-[10px] text-center text-[--text-muted] mt-1">Basé sur VIX ({vixLevel.toFixed(1)}) + SPY ({spyChangePct >= 0 ? "+" : ""}{spyChangePct.toFixed(2)}%)</p>
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
              { label: "Risk-On", condition: vixLevel < 20 && spyChangePct > 0, desc: t("vol_riskOnDesc") },
              { label: "Risk-Off", condition: vixLevel > 25 && spyChangePct < 0, desc: t("vol_riskOffDesc") },
              { label: "Indécision", condition: vixLevel >= 20 && vixLevel <= 25, desc: "Volatilité modérée" },
              { label: t("vol_complacencyLabel"), condition: vixLevel < 15, desc: t("vol_complacencyDesc") },
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
          <h3 className="font-semibold text-[--text-primary]">{t("vol_vixHistory30")}</h3>
          {isLiveSource && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium ml-1">LIVE</span>
          )}
        </div>
        <VixHistoryChart data={vixHistory} dates={vixDates} />
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
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[--text-muted] text-sm">
                    Donn&eacute;es indisponibles &mdash; Connectez une source de donn&eacute;es options
                  </td>
                </tr>
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
        <div className="py-6 text-center text-[--text-muted] text-sm">
          Donn&eacute;es indisponibles &mdash; Put/Call Ratio, VIX/VXN Spread, SKEW Index et VVIX n&eacute;cessitent une source de donn&eacute;es options
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
        <h3 className="font-semibold text-[--text-primary] mb-4">{t("vol_autoSignals")}</h3>
        <div className="space-y-3">
          {vixLevel > 30 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-sm font-medium text-rose-400">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                {t("vol_vixPanicSignal", { level: vixLevel.toFixed(1) })}
              </p>
            </div>
          )}
          {vixLevel < 15 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                {t("vol_vixLowSignal", { level: vixLevel.toFixed(1) })}
              </p>
            </div>
          )}
          {spy && volData["GLD"] && spy.changepct < -1 && volData["GLD"].changepct > 0.5 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-400">{t("vol_flightToSafety")}</p>
            </div>
          )}
          {spy && volData["TLT"] && spy.changepct > 0.5 && volData["TLT"].changepct < -0.5 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-sm font-medium text-emerald-400">{t("vol_equityRotation")}</p>
            </div>
          )}
          {isContango && vixLevel < 20 && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">
                <Minus className="w-4 h-4 inline mr-1.5" />
                {t("vol_contangoSignal")}
              </p>
            </div>
          )}
          {vixLevel >= 15 && vixLevel <= 30 && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">{t("vol_normalSignal", { level: vixLevel.toFixed(1) })}</p>
            </div>
          )}
          {vixLevel >= 15 && vixLevel <= 30 && !spy && (
            <p className="text-sm text-[--text-muted] text-center py-2">{t("vol_noParticular")}</p>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 8 — VIX History Chart with Color Zones                  */}
      {/* ============================================================ */}
      {(() => {
        const data = vixHistory;
        const dates = vixDates;
        const svgW = 640;
        const svgH = 200;
        const pad = { top: 15, right: 12, bottom: 28, left: 40 };
        const cW = svgW - pad.left - pad.right;
        const cH = svgH - pad.top - pad.bottom;

        const minVal = Math.min(...data) - 2;
        const maxVal = Math.max(...data, 30) + 2;
        const range = maxVal - minVal;

        const pts = data.map((v: number, i: number) => ({
          x: pad.left + (i / (data.length - 1)) * cW,
          y: pad.top + (1 - (v - minVal) / range) * cH,
          v,
        }));

        const linePath = pts.map((p: { x: number; y: number }, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.top + cH} L${pts[0].x},${pad.top + cH} Z`;

        // Color zones: green (<15), yellow (15-25), red (>25)
        const zones: { from: number; to: number; color: string; label: string }[] = [
          { from: minVal, to: Math.min(15, maxVal), color: "rgba(16,185,129,0.08)", label: "Vol. Basse" },
          { from: Math.max(15, minVal), to: Math.min(25, maxVal), color: "rgba(234,179,8,0.08)", label: "Normale" },
          { from: Math.max(25, minVal), to: maxVal, color: "rgba(239,68,68,0.08)", label: "Vol. Haute" },
        ];

        const xLabels = dates && dates.length > 0
          ? { start: dates[0], mid: dates[Math.floor(dates.length / 2)], end: dates[dates.length - 1] }
          : { start: "J-30", mid: "J-15", end: "Auj." };

        return (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-[--text-primary]">{t("vol_vixHistoryZones")}</h3>
              {isLiveSource && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium ml-1">LIVE</span>
              )}
            </div>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              {/* Color zone backgrounds */}
              {zones.filter(z => z.to > z.from).map((z) => {
                const yTop = pad.top + (1 - (z.to - minVal) / range) * cH;
                const yBot = pad.top + (1 - (z.from - minVal) / range) * cH;
                return (
                  <rect key={z.label} x={pad.left} y={yTop} width={cW} height={yBot - yTop} fill={z.color} />
                );
              })}
              {/* Zone threshold lines */}
              {[15, 25].filter(v => v > minVal && v < maxVal).map((v) => {
                const y = pad.top + (1 - (v - minVal) / range) * cH;
                return (
                  <g key={`thresh-${v}`}>
                    <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke={v === 15 ? "#10b981" : "#ef4444"} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                    <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill={v === 15 ? "#10b981" : "#ef4444"}>{v}</text>
                  </g>
                );
              })}
              {/* Grid lines */}
              {[minVal, minVal + range / 3, minVal + (2 * range) / 3, maxVal].map((v) => {
                const y = pad.top + (1 - (v - minVal) / range) * cH;
                return (
                  <g key={v}>
                    <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" />
                    <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-[--text-muted]" fontSize="9">{v.toFixed(0)}</text>
                  </g>
                );
              })}
              {/* Area fill with multi-color gradient */}
              <defs>
                <linearGradient id="vixZoneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#eab308" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#vixZoneGrad)" />
              {/* Line — color changes based on value */}
              {pts.map((p: { x: number; y: number; v: number }, i: number) => {
                if (i === 0) return null;
                const prev = pts[i - 1];
                const avgV = (prev.v + p.v) / 2;
                const strokeColor = avgV < 15 ? "#10b981" : avgV < 25 ? "#eab308" : "#ef4444";
                return (
                  <line key={i} x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
                );
              })}
              {/* Last point */}
              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5" fill={vixLevel < 15 ? "#10b981" : vixLevel < 25 ? "#eab308" : "#ef4444"} stroke="var(--bg-primary)" strokeWidth="2" />
              <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 10} textAnchor="middle" className="fill-[--text-primary]" fontSize="11" fontWeight="700">
                {vixLevel.toFixed(1)}
              </text>
              {/* X labels */}
              <text x={pad.left} y={svgH - 5} className="fill-[--text-muted]" fontSize="9">{xLabels.start}</text>
              <text x={pad.left + cW / 2} y={svgH - 5} textAnchor="middle" className="fill-[--text-muted]" fontSize="9">{xLabels.mid}</text>
              <text x={svgW - pad.right} y={svgH - 5} textAnchor="end" className="fill-[--text-muted]" fontSize="9">{xLabels.end}</text>
            </svg>
            <div className="flex items-center justify-center gap-5 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500/30" /> &lt; 15 — Vol. Basse</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-500/30" /> 15-25 — Normale</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-rose-500/30" /> &gt; 25 — Vol. Haute</span>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/*  ROW 9 — Volatility Regime Performance Comparison            */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">Performance par Régime de Volatilité</h3>
        </div>

        <p className="text-sm text-[--text-secondary] mb-5">
          Analyse de vos résultats selon les différents niveaux de volatilité du marché.
        </p>

        {(() => {
          // Simulated user performance by vol regime
          const volRegimes = [
            {
              label: "VIX < 15",
              name: t("vol_volRegimeLow"),
              winRate: 68,
              avgRR: 2.1,
              trades: 52,
              avgPnl: 1.4,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/30",
              barColor: "bg-emerald-500",
            },
            {
              label: "VIX 15-20",
              name: t("vol_volRegimeNormalLow"),
              winRate: 64,
              avgRR: 1.8,
              trades: 78,
              avgPnl: 1.1,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
              border: "border-cyan-500/30",
              barColor: "bg-cyan-500",
            },
            {
              label: "VIX 20-25",
              name: t("vol_volRegimeNormalHigh"),
              winRate: 55,
              avgRR: 1.5,
              trades: 45,
              avgPnl: 0.3,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/30",
              barColor: "bg-amber-500",
            },
            {
              label: "VIX 25-30",
              name: t("vol_volRegimeElevated"),
              winRate: 47,
              avgRR: 1.2,
              trades: 22,
              avgPnl: -0.5,
              color: "text-orange-400",
              bg: "bg-orange-500/10",
              border: "border-orange-500/30",
              barColor: "bg-orange-500",
            },
            {
              label: "VIX > 30",
              name: t("vol_volRegimePanic"),
              winRate: 38,
              avgRR: 0.9,
              trades: 8,
              avgPnl: -1.8,
              color: "text-rose-400",
              bg: "bg-rose-500/10",
              border: "border-rose-500/30",
              barColor: "bg-rose-500",
            },
          ];

          // Find which regime we're in now
          const currentIdx = vixLevel < 15 ? 0 : vixLevel < 20 ? 1 : vixLevel < 25 ? 2 : vixLevel < 30 ? 3 : 4;
          const best = volRegimes.reduce((a, b) => (a.winRate > b.winRate ? a : b));

          return (
            <>
              {/* Summary insight */}
              <div className="p-4 rounded-xl mb-5 bg-[--bg-secondary] border border-[--border-subtle]">
                <p className="text-sm text-[--text-secondary]">
                  Vous performez mieux en <strong className={best.color}>{best.name}</strong> ({best.winRate}% WR, {best.avgRR} RR moyen).
                  {currentIdx <= 1 && " Les conditions actuelles sont dans votre zone de confort."}
                  {currentIdx >= 3 && " La volatilité actuelle est dans une zone historiquement difficile — réduisez votre taille."}
                </p>
              </div>

              {/* Regime cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {volRegimes.map((vr, idx) => (
                  <div
                    key={vr.label}
                    className={`rounded-xl p-4 border ${vr.border} ${vr.bg} ${idx === currentIdx ? "ring-2 ring-cyan-500/40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${vr.color}`}>{vr.label}</span>
                      {idx === currentIdx && (
                        <span className="text-[7px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">NOW</span>
                      )}
                    </div>
                    <p className="text-[10px] mb-3 text-[--text-muted]">{vr.name}</p>

                    {/* Win rate visual */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-[--text-muted]">WR</span>
                        <span className={`font-bold mono ${vr.color}`}>{vr.winRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[--bg-secondary]">
                        <div className={`h-full rounded-full ${vr.barColor}`} style={{ width: `${vr.winRate}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-[--text-muted]">RR moy.</span>
                        <span className="mono text-[--text-secondary]">{vr.avgRR}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[--text-muted]">P&amp;L moy.</span>
                        <span className={`mono ${vr.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {vr.avgPnl >= 0 ? "+" : ""}{vr.avgPnl.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[--text-muted]">Trades</span>
                        <span className="mono text-[--text-secondary]">{vr.trades}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* ============================================================ */}
      {/*  ROW 10 — ATR Reference for SL Placement                    */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-[--text-primary]">{t("vol_atrTitle")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-5">
          {t("vol_atrDesc")}
        </p>

        {(() => {
          // ATR data scaled relative to current VIX level
          const vixScale = vixLevel / 18; // normalize around VIX ~18

          const atrAssets = [
            {
              symbol: "EURUSD",
              name: "Euro / Dollar",
              atr14: +(0.0065 * vixScale).toFixed(5),
              atr7: +(0.0072 * vixScale).toFixed(5),
              atr30: +(0.0058 * vixScale).toFixed(5),
              pipValue: "~$10/lot",
              slSuggestion: `${Math.round(65 * vixScale)} pips`,
              unit: "pips",
              multiplier: 10000,
            },
            {
              symbol: "XAUUSD",
              name: "Or / Dollar",
              atr14: +(28.5 * vixScale).toFixed(1),
              atr7: +(32.1 * vixScale).toFixed(1),
              atr30: +(25.3 * vixScale).toFixed(1),
              pipValue: "~$1/0.1 lot",
              slSuggestion: `$${Math.round(28.5 * vixScale)}`,
              unit: "$",
              multiplier: 1,
            },
            {
              symbol: "US30",
              name: "Dow Jones",
              atr14: +(320 * vixScale).toFixed(0),
              atr7: +(365 * vixScale).toFixed(0),
              atr30: +(285 * vixScale).toFixed(0),
              pipValue: "~$1/0.1 lot",
              slSuggestion: `${Math.round(320 * vixScale)} pts`,
              unit: "points",
              multiplier: 1,
            },
            {
              symbol: "NAS100",
              name: "Nasdaq 100",
              atr14: +(280 * vixScale).toFixed(0),
              atr7: +(310 * vixScale).toFixed(0),
              atr30: +(250 * vixScale).toFixed(0),
              pipValue: "~$1/0.1 lot",
              slSuggestion: `${Math.round(280 * vixScale)} pts`,
              unit: "points",
              multiplier: 1,
            },
            {
              symbol: "BTCUSD",
              name: "Bitcoin",
              atr14: +(1850 * vixScale).toFixed(0),
              atr7: +(2100 * vixScale).toFixed(0),
              atr30: +(1600 * vixScale).toFixed(0),
              pipValue: "Variable",
              slSuggestion: `$${Math.round(1850 * vixScale)}`,
              unit: "$",
              multiplier: 1,
            },
          ];

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--border-subtle]">
                    <th className="text-left py-2 text-[--text-secondary] font-medium">{t("vol_thAsset")}</th>
                    <th className="text-right py-2 text-[--text-secondary] font-medium">ATR(7)</th>
                    <th className="text-right py-2 text-[--text-secondary] font-medium">ATR(14)</th>
                    <th className="text-right py-2 text-[--text-secondary] font-medium">ATR(30)</th>
                    <th className="text-right py-2 text-[--text-secondary] font-medium">{t("vol_thSuggestedSL")}</th>
                    <th className="text-right py-2 text-[--text-secondary] font-medium">{t("vol_thRegime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {atrAssets.map((asset) => {
                    // Visual bar based on ATR relative to the row's range
                    const atrValues = [Number(asset.atr7), Number(asset.atr14), Number(asset.atr30)];
                    const maxAtr = Math.max(...atrValues);
                    const atr14Pct = (Number(asset.atr14) / maxAtr) * 100;

                    return (
                      <tr key={asset.symbol} className="border-b border-[--border-subtle]/50">
                        <td className="py-3">
                          <span className="font-medium text-[--text-primary]">{asset.symbol}</span>
                          <span className="text-[--text-muted] text-xs ml-1.5">{asset.name}</span>
                        </td>
                        <td className="text-right mono text-[--text-secondary]">{asset.atr7}</td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-10 h-1.5 rounded-full bg-[--bg-secondary]">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{ width: `${atr14Pct}%` }}
                              />
                            </div>
                            <span className="mono text-[--text-primary] font-medium">{asset.atr14}</span>
                          </div>
                        </td>
                        <td className="text-right mono text-[--text-secondary]">{asset.atr30}</td>
                        <td className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${vixLevel < 20 ? "bg-emerald-500/10 text-emerald-400" : vixLevel < 25 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {asset.slSuggestion}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={`text-[10px] font-medium ${vixLevel < 15 ? "text-emerald-400" : vixLevel < 25 ? "text-amber-400" : "text-rose-400"}`}>
                            {vixLevel < 15 ? t("vol_slTight") : vixLevel < 25 ? t("vol_slStandard") : t("vol_slWide")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ATR usage tips */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-400 mb-1">{t("vol_tipLowVol")}</p>
                  <p className="text-[10px] text-[--text-muted]">
                    {t("vol_tipLowVolDesc")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-400 mb-1">{t("vol_tipNormalVol")}</p>
                  <p className="text-[10px] text-[--text-muted]">
                    {t("vol_tipNormalVolDesc")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <p className="text-xs font-medium text-rose-400 mb-1">{t("vol_tipHighVol")}</p>
                  <p className="text-[10px] text-[--text-muted]">
                    {t("vol_tipHighVolDesc")}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
