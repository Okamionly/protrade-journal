"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Compass, RefreshCw, TrendingUp, TrendingDown, Info } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useTrades, type Trade } from "@/hooks/useTrades";
import {
  detectMarketPhase,
  generateDemoCandles,
  type Candle,
  type MarketPhase,
  type PhaseResult,
} from "@/lib/marketPhaseDetector";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ASSETS = [
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GBPUSD", label: "GBP/USD" },
  { value: "XAUUSD", label: "XAU/USD (Or)" },
  { value: "US30", label: "US30 (Dow Jones)" },
  { value: "NAS100", label: "NAS100 (Nasdaq)" },
  { value: "BTCUSD", label: "BTC/USD" },
];

const PHASE_COLORS: Record<MarketPhase, { bg: string; text: string; glow: string; gradient: string }> = {
  accumulation: {
    bg: "from-blue-500/20 to-blue-600/10",
    text: "text-blue-400",
    glow: "shadow-blue-500/30",
    gradient: "from-blue-500 to-blue-400",
  },
  markup: {
    bg: "from-emerald-500/20 to-emerald-600/10",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/30",
    gradient: "from-emerald-500 to-emerald-400",
  },
  distribution: {
    bg: "from-orange-500/20 to-orange-600/10",
    text: "text-orange-400",
    glow: "shadow-orange-500/30",
    gradient: "from-orange-500 to-orange-400",
  },
  markdown: {
    bg: "from-red-500/20 to-red-600/10",
    text: "text-red-400",
    glow: "shadow-red-500/30",
    gradient: "from-red-500 to-red-400",
  },
};

const PHASE_LABELS: Record<MarketPhase, string> = {
  accumulation: "Accumulation",
  markup: "Markup",
  distribution: "Distribution",
  markdown: "Markdown",
};

/* ------------------------------------------------------------------ */
/*  SVG Phase Icons                                                    */
/* ------------------------------------------------------------------ */

function AccumulationIcon() {
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      <defs>
        <radialGradient id="accGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="45" fill="url(#accGrad)" className="animate-pulse" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#3b82f6" strokeWidth="2.5" opacity="0.9" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4">
        <animate attributeName="r" values="35;42;35" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Arrows pointing inward */}
      <g stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="20" y1="60" x2="35" y2="60"><animate attributeName="x2" values="35;40;35" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="32,55 37,60 32,65"><animate attributeName="points" values="32,55 37,60 32,65;35,55 40,60 35,65;32,55 37,60 32,65" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="100" y1="60" x2="85" y2="60"><animate attributeName="x2" values="85;80;85" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="88,55 83,60 88,65"><animate attributeName="points" values="88,55 83,60 88,65;85,55 80,60 85,65;88,55 83,60 88,65" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="60" y1="20" x2="60" y2="35"><animate attributeName="y2" values="35;40;35" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="55,32 60,37 65,32"><animate attributeName="points" values="55,32 60,37 65,32;55,35 60,40 65,35;55,32 60,37 65,32" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="60" y1="100" x2="60" y2="85"><animate attributeName="y2" values="85;80;85" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="55,88 60,83 65,88"><animate attributeName="points" values="55,88 60,83 65,88;55,85 60,80 65,85;55,88 60,83 65,88" dur="1.5s" repeatCount="indefinite" /></polyline>
      </g>
    </svg>
  );
}

function MarkupIcon() {
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      <defs>
        <linearGradient id="mkGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
        </linearGradient>
        <filter id="mkGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="60,15 80,55 60,45 40,55" fill="url(#mkGrad)" filter="url(#mkGlow)">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
      </polygon>
      <polygon points="60,15 80,55 60,45 40,55" fill="none" stroke="#34d399" strokeWidth="2">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="1.5s" repeatCount="indefinite" />
      </polygon>
      {/* Trail lines */}
      <line x1="60" y1="55" x2="60" y2="105" stroke="#10b981" strokeWidth="2" opacity="0.3" />
      <line x1="50" y1="65" x2="50" y2="95" stroke="#10b981" strokeWidth="1" opacity="0.15" />
      <line x1="70" y1="65" x2="70" y2="95" stroke="#10b981" strokeWidth="1" opacity="0.15" />
      {/* Particles */}
      <circle cx="45" cy="80" r="2" fill="#34d399" opacity="0.5">
        <animate attributeName="cy" values="80;50;80" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="70" r="1.5" fill="#34d399" opacity="0.3">
        <animate attributeName="cy" values="70;40;70" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function DistributionIcon() {
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      <defs>
        <radialGradient id="distGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="45" fill="url(#distGrad)" className="animate-pulse" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#f97316" strokeWidth="2.5" opacity="0.9" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.4">
        <animate attributeName="r" values="38;48;38" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Arrows pointing outward */}
      <g stroke="#fb923c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="40" y1="60" x2="20" y2="60"><animate attributeName="x2" values="20;15;20" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="25,55 20,60 25,65"><animate attributeName="points" values="25,55 20,60 25,65;20,55 15,60 20,65;25,55 20,60 25,65" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="80" y1="60" x2="100" y2="60"><animate attributeName="x2" values="100;105;100" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="95,55 100,60 95,65"><animate attributeName="points" values="95,55 100,60 95,65;100,55 105,60 100,65;95,55 100,60 95,65" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="60" y1="40" x2="60" y2="20"><animate attributeName="y2" values="20;15;20" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="55,25 60,20 65,25"><animate attributeName="points" values="55,25 60,20 65,25;55,20 60,15 65,20;55,25 60,20 65,25" dur="1.5s" repeatCount="indefinite" /></polyline>
        <line x1="60" y1="80" x2="60" y2="100"><animate attributeName="y2" values="100;105;100" dur="1.5s" repeatCount="indefinite" /></line>
        <polyline points="55,95 60,100 65,95"><animate attributeName="points" values="55,95 60,100 65,95;55,100 60,105 65,100;55,95 60,100 65,95" dur="1.5s" repeatCount="indefinite" /></polyline>
      </g>
    </svg>
  );
}

function MarkdownIcon() {
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      <defs>
        <linearGradient id="mdGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
        </linearGradient>
        <filter id="mdGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="60,105 80,65 60,75 40,65" fill="url(#mdGrad)" filter="url(#mdGlow)">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
      </polygon>
      <polygon points="60,105 80,65 60,75 40,65" fill="none" stroke="#f87171" strokeWidth="2">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,3;0,0" dur="1.5s" repeatCount="indefinite" />
      </polygon>
      {/* Trail lines */}
      <line x1="60" y1="15" x2="60" y2="65" stroke="#ef4444" strokeWidth="2" opacity="0.3" />
      <line x1="50" y1="25" x2="50" y2="55" stroke="#ef4444" strokeWidth="1" opacity="0.15" />
      <line x1="70" y1="25" x2="70" y2="55" stroke="#ef4444" strokeWidth="1" opacity="0.15" />
      {/* Particles falling */}
      <circle cx="45" cy="40" r="2" fill="#f87171" opacity="0.5">
        <animate attributeName="cy" values="40;70;40" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="50" r="1.5" fill="#f87171" opacity="0.3">
        <animate attributeName="cy" values="50;80;50" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const PHASE_ICONS: Record<MarketPhase, () => JSX.Element> = {
  accumulation: AccumulationIcon,
  markup: MarkupIcon,
  distribution: DistributionIcon,
  markdown: MarkdownIcon,
};

/* ------------------------------------------------------------------ */
/*  Confidence Gauge SVG                                               */
/* ------------------------------------------------------------------ */

function ConfidenceGauge({ value, phase }: { value: number; phase: MarketPhase }) {
  const radius = 80;
  const strokeW = 12;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colorMap: Record<MarketPhase, string> = {
    accumulation: "#3b82f6",
    markup: "#10b981",
    distribution: "#f97316",
    markdown: "#ef4444",
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-56 h-32">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorMap[phase]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorMap[phase]} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d={`M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Value text */}
        <text x="100" y="90" textAnchor="middle" className="fill-white text-3xl font-bold" fontSize="32">
          {value}%
        </text>
        <text x="100" y="110" textAnchor="middle" className="fill-white/50 text-xs" fontSize="11">
          Confiance
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase History Timeline                                             */
/* ------------------------------------------------------------------ */

function PhaseTimeline({ history }: { history: { date: string; phase: MarketPhase }[] }) {
  const barColors: Record<MarketPhase, string> = {
    accumulation: "bg-blue-500",
    markup: "bg-emerald-500",
    distribution: "bg-orange-500",
    markdown: "bg-red-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden">
        {history.map((h, i) => (
          <div
            key={i}
            className={`flex-1 ${barColors[h.phase]} opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-zinc-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-zinc-700">
                {h.date} &mdash; {PHASE_LABELS[h.phase]}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{history[0]?.date}</span>
        <span>{history[history.length - 1]?.date}</span>
      </div>
      <div className="flex gap-4 flex-wrap">
        {(["accumulation", "markup", "distribution", "markdown"] as MarketPhase[]).map((p) => (
          <div key={p} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className={`w-3 h-3 rounded-sm ${barColors[p]}`} />
            {PHASE_LABELS[p]}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Performance by Phase Component                                     */
/* ------------------------------------------------------------------ */

function PerformanceByPhase({
  trades,
  phaseHistory,
}: {
  trades: Trade[];
  phaseHistory: { date: string; phase: MarketPhase }[];
}) {
  const stats = useMemo(() => {
    const map: Record<MarketPhase, { wins: number; losses: number; total: number; pnl: number }> = {
      accumulation: { wins: 0, losses: 0, total: 0, pnl: 0 },
      markup: { wins: 0, losses: 0, total: 0, pnl: 0 },
      distribution: { wins: 0, losses: 0, total: 0, pnl: 0 },
      markdown: { wins: 0, losses: 0, total: 0, pnl: 0 },
    };

    for (const trade of trades) {
      const tradeDate = trade.date.split("T")[0];
      const dayPhase = phaseHistory.find((h) => h.date === tradeDate);
      if (!dayPhase) continue;
      const p = dayPhase.phase;
      map[p].total++;
      map[p].pnl += trade.result;
      if (trade.result > 0) map[p].wins++;
      else map[p].losses++;
    }

    return map;
  }, [trades, phaseHistory]);

  const hasData = Object.values(stats).some((s) => s.total > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucun trade dans l&apos;historique pour ces phases.</p>
        <p className="text-xs mt-1">Ajoutez des trades pour voir votre performance par phase.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {(["accumulation", "markup", "distribution", "markdown"] as MarketPhase[]).map((phase) => {
        const s = stats[phase];
        const wr = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0;
        const colors = PHASE_COLORS[phase];
        return (
          <div
            key={phase}
            className={`rounded-xl p-4 bg-gradient-to-br ${colors.bg} border border-white/5`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${colors.gradient}`} />
              <span className={`text-sm font-medium ${colors.text}`}>{PHASE_LABELS[phase]}</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {s.total > 0 ? `${wr}%` : "N/A"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {s.total} trade{s.total !== 1 ? "s" : ""} &middot;{" "}
              <span className={s.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                {s.pnl >= 0 ? "+" : ""}
                {s.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MarketPhasePage() {
  const { t } = useTranslation();
  const { trades } = useTrades();

  const [selectedAsset, setSelectedAsset] = useState("XAUUSD");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PhaseResult | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<{ date: string; phase: MarketPhase }[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);

  const fetchCandles = useCallback(async (symbol: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market-data/candles?symbol=${encodeURIComponent(symbol)}&resolution=D&countback=90`
      );
      if (res.ok) {
        const data = await res.json();
        // MarketData API returns arrays: t (timestamps), o, h, l, c, v
        if (data.t && Array.isArray(data.t)) {
          const parsed: Candle[] = data.t.map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString().split("T")[0],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v?.[i] ?? 0,
          }));
          setCandles(parsed);
          return parsed;
        }
      }
    } catch {
      // Fall through to demo data
    }

    // Fallback: generate demo candles
    const phases: MarketPhase[] = ["accumulation", "markup", "distribution", "markdown"];
    const randomPhase = phases[Math.floor(Math.random() * phases.length)];
    const demo = generateDemoCandles(randomPhase, 90);
    setCandles(demo);
    return demo;
  }, []);

  const analyze = useCallback(
    async (symbol: string) => {
      const data = await fetchCandles(symbol);
      if (data.length > 0) {
        const phaseResult = detectMarketPhase(data);
        setResult(phaseResult);

        // Build 30-day phase history by running detection on sliding windows
        const history: { date: string; phase: MarketPhase }[] = [];
        for (let i = Math.max(52, data.length - 30); i <= data.length; i++) {
          const window = data.slice(0, i);
          const r = detectMarketPhase(window);
          history.push({ date: data[i - 1].date, phase: r.phase });
        }
        setPhaseHistory(history);
      }
      setLoading(false);
    },
    [fetchCandles]
  );

  useEffect(() => {
    analyze(selectedAsset);
  }, [selectedAsset, analyze]);

  const handleRefresh = () => analyze(selectedAsset);

  const PhaseIcon = result ? PHASE_ICONS[result.phase] : null;
  const colors = result ? PHASE_COLORS[result.phase] : PHASE_COLORS.accumulation;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg ${colors.glow}`}>
            <Compass className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t("marketPhase_title") || "Phase de March\u00e9"}
            </h1>
            <p className="text-sm text-zinc-400">
              {t("marketPhase_subtitle") || "D\u00e9tection Wyckoff en temps r\u00e9el"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Asset Selector */}
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-zinc-800/80 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm"
          >
            {ASSETS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-300 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-zinc-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
            </div>
            <span className="text-zinc-400 text-sm">Analyse en cours...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Phase Indicator + Confidence */}
          <div className="space-y-6">
            {/* Phase Card */}
            <div
              className={`relative rounded-2xl p-6 bg-gradient-to-br ${colors.bg} border border-white/10 backdrop-blur-xl shadow-2xl ${colors.glow} overflow-hidden`}
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-2">{PhaseIcon && <PhaseIcon />}</div>
                <h2 className={`text-3xl font-bold ${colors.text} mb-1`}>
                  {PHASE_LABELS[result.phase]}
                </h2>
                <p className="text-sm text-zinc-400">
                  {selectedAsset} &middot; Analyse {candles.length} bougies
                </p>
              </div>
            </div>

            {/* Confidence Gauge */}
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 text-center">
                {t("marketPhase_confidence") || "Niveau de confiance"}
              </h3>
              <ConfidenceGauge value={result.confidence} phase={result.phase} />
            </div>

            {/* Signals */}
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                {t("marketPhase_signals") || "Signaux d\u00e9tect\u00e9s"}
              </h3>
              <ul className="space-y-2">
                {result.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${colors.gradient} shrink-0`} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Middle Column: Description + Advice */}
          <div className="space-y-6">
            {/* Description */}
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-400">
                  {t("marketPhase_description") || "Description de la phase"}
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.description}</p>
            </div>

            {/* Trading Advice */}
            <div
              className={`rounded-2xl p-6 bg-gradient-to-br ${colors.bg} border border-white/10 backdrop-blur-xl`}
            >
              <div className="flex items-center gap-2 mb-4">
                {result.phase === "markup" || result.phase === "accumulation" ? (
                  <TrendingUp className={`w-4 h-4 ${colors.text}`} />
                ) : (
                  <TrendingDown className={`w-4 h-4 ${colors.text}`} />
                )}
                <h3 className={`text-sm font-medium ${colors.text}`}>
                  {t("marketPhase_advice") || "Conseils de trading"}
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.tradingAdvice}</p>
            </div>

            {/* Phase History */}
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                {t("marketPhase_history") || "Historique des phases (30 jours)"}
              </h3>
              {phaseHistory.length > 0 ? (
                <PhaseTimeline history={phaseHistory} />
              ) : (
                <p className="text-xs text-zinc-500">Aucun historique disponible.</p>
              )}
            </div>
          </div>

          {/* Right Column: Performance by Phase */}
          <div className="space-y-6">
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                {t("marketPhase_performance") || "Votre performance par phase"}
              </h3>
              <PerformanceByPhase trades={trades} phaseHistory={phaseHistory} />
            </div>

            {/* Wyckoff Cycle Illustration */}
            <div className="rounded-2xl p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                {t("marketPhase_cycle") || "Cycle de Wyckoff"}
              </h3>
              <svg viewBox="0 0 300 140" className="w-full">
                {/* Cycle curve */}
                <path
                  d="M 20 100 Q 50 100 75 80 Q 100 60 125 30 Q 140 15 155 30 Q 175 55 195 80 Q 210 95 225 100 Q 250 105 275 110"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                />
                {/* Phase regions */}
                <rect x="15" y="75" width="60" height="50" rx="4" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                <text x="45" y="105" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold">Accumulation</text>
                <rect x="80" y="15" width="60" height="50" rx="4" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <text x="110" y="45" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">Markup</text>
                <rect x="145" y="25" width="60" height="50" rx="4" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.3)" strokeWidth="1" />
                <text x="175" y="55" textAnchor="middle" fill="#fb923c" fontSize="9" fontWeight="bold">Distribution</text>
                <rect x="215" y="80" width="60" height="50" rx="4" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" strokeWidth="1" />
                <text x="245" y="110" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">Markdown</text>
                {/* Current phase highlight */}
                {result.phase === "accumulation" && (
                  <rect x="15" y="75" width="60" height="50" rx="4" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
                {result.phase === "markup" && (
                  <rect x="80" y="15" width="60" height="50" rx="4" fill="none" stroke="#10b981" strokeWidth="2">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
                {result.phase === "distribution" && (
                  <rect x="145" y="25" width="60" height="50" rx="4" fill="none" stroke="#f97316" strokeWidth="2">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
                {result.phase === "markdown" && (
                  <rect x="215" y="80" width="60" height="50" rx="4" fill="none" stroke="#ef4444" strokeWidth="2">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
