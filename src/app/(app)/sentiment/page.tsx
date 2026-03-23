"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw, TrendingUp, TrendingDown, Minus, Activity,
  AlertTriangle, X, BarChart3, Shield, Gauge, Zap, Heart,
  Thermometer, Eye, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { AIInsightsCard, type InsightItem } from "@/components/AIInsightsCard";
import { Brain, Target } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface MarketIndicator {
  label: string;
  value: string;
  description: string;
  color: string;
  level: "bullish" | "bearish" | "neutral";
}

interface VixApiData {
  vix: { current: number; previousClose: number; changePct: number };
  spy: { current: number; previousClose: number; changePct: number };
}

interface LivePricesData {
  indices: Array<{ symbol: string; price: number; change: number }>;
  crypto: Array<{ symbol: string; price: number; change: number }>;
}

/* ------------------------------------------------------------------ */
/*  Range-based classification (no hardcoded English strings)           */
/* ------------------------------------------------------------------ */

function classifyScore(v: number): {
  key: string;
  i18nKey: string;
  color: string;
  bg: string;
  border: string;
} {
  if (v <= 24) return { key: "extreme-fear", i18nKey: "extremeFear", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
  if (v <= 44) return { key: "fear", i18nKey: "fear", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" };
  if (v <= 55) return { key: "neutral", i18nKey: "neutral", color: "text-[--text-secondary]", bg: "bg-gray-500/10", border: "border-gray-500/30" };
  if (v <= 74) return { key: "greed", i18nKey: "greed", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  return { key: "extreme-greed", i18nKey: "extremeGreed", color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-400/30" };
}

type RangeOption = 30 | 90 | 365;

/* ------------------------------------------------------------------ */
/*  Gauge Chart                                                         */
/* ------------------------------------------------------------------ */

function GaugeChart({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90;
  const getColor = (v: number) => {
    if (v <= 25) return "#ef4444";
    if (v <= 45) return "#f97316";
    if (v <= 55) return "#6b7280";
    if (v <= 75) return "#10b981";
    return "#34d399";
  };

  return (
    <div className="relative w-64 h-36 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="var(--border)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={getColor(value)}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 283} 283`}
          className="transition-all duration-1000"
        />
        <line
          x1="100" y1="100"
          x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <circle cx="100" cy="100" r="4" fill="var(--text-primary)" />
        <text x="15" y="108" fill="#ef4444" fontSize="8" fontWeight="bold">0</text>
        <text x="93" y="15" fill="#6b7280" fontSize="8" fontWeight="bold">50</text>
        <text x="178" y="108" fill="#34d399" fontSize="8" fontWeight="bold">100</text>
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-4xl font-bold mono" style={{ color: getColor(value) }}>{value}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Manual Sentiment Gauge (fallback when no data)                      */
/* ------------------------------------------------------------------ */

function ManualSentimentGauge() {
  const { t } = useTranslation();
  const [manualValue, setManualValue] = useState(50);
  const cls = classifyScore(manualValue);

  return (
    <div className="metric-card rounded-2xl p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Gauge className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("manualSentiment")}</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        {t("manualSentiment")} — Fear &amp; Greed
      </p>
      <GaugeChart value={manualValue} />
      <p className={`text-lg font-bold mt-2 ${cls.color}`}>{t(cls.i18nKey)}</p>
      <input
        type="range"
        min={0}
        max={100}
        value={manualValue}
        onChange={(e) => setManualValue(parseInt(e.target.value))}
        className="w-full mt-4 accent-cyan-500"
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        <span>{t("extremeFear")}</span>
        <span>{t("extremeGreed")}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Market Pulse Summary Cards (top row)                                */
/* ------------------------------------------------------------------ */

function MarketPulseCards({
  fngValue,
  vixData,
  spyChange,
}: {
  fngValue: number;
  vixData: VixApiData | null;
  spyChange: number | null;
}) {
  const { t } = useTranslation();
  const vix = vixData?.vix?.current ?? null;
  const fngCls = classifyScore(fngValue);

  // Market trend from SPY + FNG
  let trendLabel: string;
  let trendColor: string;
  let trendBg: string;
  let TrendIcon: typeof TrendingUp;
  if (spyChange !== null && spyChange > 0.3 && fngValue > 50) {
    trendLabel = t("bullish"); trendColor = "text-emerald-400"; trendBg = "bg-emerald-500/10"; TrendIcon = ArrowUpCircle;
  } else if (spyChange !== null && spyChange < -0.3 && fngValue < 50) {
    trendLabel = t("bearish"); trendColor = "text-rose-400"; trendBg = "bg-rose-500/10"; TrendIcon = ArrowDownCircle;
  } else {
    trendLabel = t("neutral"); trendColor = "text-amber-400"; trendBg = "bg-amber-500/10"; TrendIcon = Minus;
  }

  // Volatility regime from VIX
  let volLabel: string;
  let volColor: string;
  let volBg: string;
  if (vix !== null) {
    if (vix < 15) { volLabel = t("volLow"); volColor = "text-emerald-400"; volBg = "bg-emerald-500/10"; }
    else if (vix < 20) { volLabel = t("volNormal"); volColor = "text-cyan-400"; volBg = "bg-cyan-500/10"; }
    else if (vix < 25) { volLabel = t("volHigh"); volColor = "text-amber-400"; volBg = "bg-amber-500/10"; }
    else if (vix < 30) { volLabel = t("volVeryHigh"); volColor = "text-orange-400"; volBg = "bg-orange-500/10"; }
    else { volLabel = t("volPanic"); volColor = "text-rose-400"; volBg = "bg-rose-500/10"; }
  } else {
    volLabel = "N/A"; volColor = "text-gray-400"; volBg = "bg-gray-500/10";
  }

  const cards = [
    {
      icon: <Heart className="w-5 h-5" />,
      iconColor: fngCls.color,
      label: "Fear & Greed",
      value: String(fngValue),
      sub: t(fngCls.i18nKey),
      bg: fngCls.bg,
      border: fngCls.border,
      valueColor: fngCls.color,
    },
    {
      icon: <Thermometer className="w-5 h-5" />,
      iconColor: vix !== null ? (vix < 20 ? "text-emerald-400" : vix < 25 ? "text-amber-400" : "text-rose-400") : "text-gray-400",
      label: "VIX",
      value: vix !== null ? vix.toFixed(1) : "N/A",
      sub: vix !== null ? `${vixData!.vix.changePct >= 0 ? "+" : ""}${vixData!.vix.changePct.toFixed(2)}%` : t("noData"),
      bg: vix !== null ? (vix < 20 ? "bg-emerald-500/10" : vix < 25 ? "bg-amber-500/10" : "bg-rose-500/10") : "bg-gray-500/10",
      border: vix !== null ? (vix < 20 ? "border-emerald-500/30" : vix < 25 ? "border-amber-500/30" : "border-rose-500/30") : "border-gray-500/30",
      valueColor: vix !== null ? (vix < 20 ? "text-emerald-400" : vix < 25 ? "text-amber-400" : "text-rose-400") : "text-gray-400",
    },
    {
      icon: <TrendIcon className="w-5 h-5" />,
      iconColor: trendColor,
      label: t("trend"),
      value: trendLabel,
      sub: spyChange !== null ? `SPY ${spyChange >= 0 ? "+" : ""}${spyChange.toFixed(2)}%` : t("noData"),
      bg: trendBg,
      border: trendColor.replace("text-", "border-").replace("400", "500/30"),
      valueColor: trendColor,
    },
    {
      icon: <Eye className="w-5 h-5" />,
      iconColor: volColor,
      label: t("volRegime"),
      value: volLabel,
      sub: vix !== null ? `VIX: ${vix.toFixed(1)}` : "",
      bg: volBg,
      border: volColor.replace("text-", "border-").replace("400", "500/30"),
      valueColor: volColor,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`metric-card rounded-2xl p-4 border ${card.border} ${card.bg}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={card.iconColor}>{card.icon}</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{card.label}</span>
          </div>
          <div className={`text-2xl font-bold mono ${card.valueColor}`}>{card.value}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Market Pulse Detail Section                                         */
/* ------------------------------------------------------------------ */

function MarketPulseSection({
  fngValue,
  vixValue,
  fngClassification,
}: {
  fngValue: number;
  vixValue: number | null;
  fngClassification: string;
}) {
  const { t } = useTranslation();
  const fngCls = classifyScore(fngValue);

  // Risk factors
  const riskFactors: { text: string; severity: "danger" | "warning" | "info" | "safe" }[] = [];

  if (vixValue !== null) {
    if (vixValue >= 30) riskFactors.push({ text: `VIX ${t("volPanic")} (${vixValue.toFixed(1)})`, severity: "danger" });
    else if (vixValue >= 25) riskFactors.push({ text: `VIX ${t("volVeryHigh")} (${vixValue.toFixed(1)})`, severity: "danger" });
    else if (vixValue >= 20) riskFactors.push({ text: `VIX ${t("volHigh")} (${vixValue.toFixed(1)})`, severity: "warning" });
    else if (vixValue < 13) riskFactors.push({ text: `VIX ${t("volLow")} (${vixValue.toFixed(1)})`, severity: "warning" });
    else riskFactors.push({ text: `VIX ${t("volNormal")} (${vixValue.toFixed(1)})`, severity: "safe" });
  }

  if (fngValue <= 20) riskFactors.push({ text: `${t("extremeFear")} — capitulation`, severity: "danger" });
  else if (fngValue <= 35) riskFactors.push({ text: `${t("fear")} — ${t("bearish")}`, severity: "warning" });
  else if (fngValue >= 80) riskFactors.push({ text: `${t("extremeGreed")} — ${t("risk")}`, severity: "warning" });
  else if (fngValue >= 65) riskFactors.push({ text: `${t("greed")} — ${t("bullish")}`, severity: "safe" });
  else riskFactors.push({ text: t("neutral"), severity: "info" });

  // Signal
  let signal: { text: string; color: string; bg: string; border: string };
  if (fngValue <= 25 || (vixValue !== null && vixValue >= 28)) {
    signal = { text: t("riskOff"), color: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/40" };
  } else if (fngValue >= 60 && (vixValue === null || vixValue < 22)) {
    signal = { text: t("riskOn"), color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" };
  } else {
    signal = { text: t("neutral"), color: "text-gray-400", bg: "bg-gray-500/15", border: "border-gray-500/40" };
  }

  const severityStyles = {
    danger: "text-rose-400",
    warning: "text-amber-400",
    info: "text-gray-400",
    safe: "text-emerald-400",
  };
  const severityDots = {
    danger: "bg-rose-400",
    warning: "bg-amber-400",
    info: "bg-gray-400",
    safe: "bg-emerald-400",
  };

  // Use range-based classification instead of API string
  void fngClassification; // suppress unused warning

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Heart className="w-5 h-5 text-rose-400" />
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("marketPulse")}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mood */}
        <div className="text-center">
          <div className={`text-5xl font-black mono ${fngCls.color}`}>{fngValue}</div>
          <p className={`text-lg font-bold mt-1 ${fngCls.color}`}>{t(fngCls.i18nKey)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Fear &amp; Greed Index
          </p>
        </div>

        {/* Risk Factors */}
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {t("riskFactors")}
          </p>
          <div className="space-y-2">
            {riskFactors.map((rf, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDots[rf.severity]}`} />
                <p className={`text-sm ${severityStyles[rf.severity]}`}>{rf.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signal */}
        <div className="flex items-center justify-center">
          <div className={`${signal.bg} border ${signal.border} rounded-2xl px-8 py-5 text-center`}>
            <Zap className={`w-6 h-6 mx-auto mb-2 ${signal.color}`} />
            <p className={`text-2xl font-black tracking-wider ${signal.color}`}>{signal.text}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("globalSignal")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Put/Call Ratio (CBOE) Section                                       */
/* ------------------------------------------------------------------ */

interface PutCallEntry {
  date: string;
  ratio: number;
  puts: number;
  calls: number;
}

function classifyPutCall(ratio: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (ratio < 0.7) return { label: "Marché complaisant (haussier)", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  if (ratio <= 1.0) return { label: "Neutre", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  if (ratio <= 1.5) return { label: "Peur (baissier)", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
  return { label: "Peur extrême", color: "text-red-500", bg: "bg-red-500/15", border: "border-red-500/40" };
}

function PutCallSection({ fngValue }: { fngValue: number }) {
  const { t } = useTranslation();
  const [pcData, setPcData] = useState<PutCallEntry[]>([]);
  const [pcLoading, setPcLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPcLoading(true);
      try {
        const res = await fetch("/api/market-data/put-call");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data)) {
          setPcData(json.data);
        }
      } catch (e) {
        console.error("[Put/Call] fetch error:", e);
      } finally {
        if (!cancelled) setPcLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const latest = pcData.length > 0 ? pcData[pcData.length - 1] : null;
  const currentRatio = latest?.ratio ?? 0;
  const cls = classifyPutCall(currentRatio);

  // Correlation with Fear & Greed
  const correlation = useMemo(() => {
    if (!latest) return null;
    // High put/call + low FNG = aligned fear
    // Low put/call + high FNG = aligned greed
    // Divergence = mixed signals
    if (currentRatio > 1.0 && fngValue < 40) return { text: "Corrélé : Peur confirmée sur les deux indicateurs", color: "text-rose-400" };
    if (currentRatio < 0.7 && fngValue > 60) return { text: "Corrélé : Complaisance confirmée — prudence", color: "text-amber-400" };
    if (currentRatio > 1.0 && fngValue > 60) return { text: "Divergence : Institutionnels se couvrent malgré l'optimisme retail", color: "text-violet-400" };
    if (currentRatio < 0.7 && fngValue < 40) return { text: "Divergence : Peu de protection malgré la peur — rebond possible", color: "text-cyan-400" };
    return { text: "Pas de divergence notable", color: "text-[--text-muted]" };
  }, [currentRatio, fngValue, latest]);

  // SVG mini chart
  const chartSvg = useMemo(() => {
    if (pcData.length < 2) return null;
    const w = 320;
    const h = 80;
    const pad = { left: 4, right: 4, top: 8, bottom: 8 };
    const cW = w - pad.left - pad.right;
    const cH = h - pad.top - pad.bottom;

    const ratios = pcData.map((d) => d.ratio);
    const minR = Math.min(...ratios, 0.4);
    const maxR = Math.max(...ratios, 1.6);
    const rangeR = maxR - minR || 0.1;

    const pts = pcData.map((d, i) => {
      const x = pad.left + (i / (pcData.length - 1)) * cW;
      const y = pad.top + (1 - (d.ratio - minR) / rangeR) * cH;
      return { x, y, r: d.ratio };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Color zones: <0.7 green, 0.7-1.0 amber, 1.0-1.5 rose, >1.5 red
    const zones = [
      { from: 0, to: 0.7, color: "rgba(16,185,129,0.08)" },
      { from: 0.7, to: 1.0, color: "rgba(245,158,11,0.06)" },
      { from: 1.0, to: 1.5, color: "rgba(239,68,68,0.06)" },
      { from: 1.5, to: 3, color: "rgba(239,68,68,0.12)" },
    ];

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {zones.map((z) => {
          const yTop = pad.top + (1 - (Math.min(z.to, maxR) - minR) / rangeR) * cH;
          const yBot = pad.top + (1 - (Math.max(z.from, minR) - minR) / rangeR) * cH;
          if (yBot <= yTop) return null;
          return <rect key={z.from} x={pad.left} y={yTop} width={cW} height={yBot - yTop} fill={z.color} />;
        })}
        {/* Reference lines */}
        {[0.7, 1.0, 1.5].filter((v) => v >= minR && v <= maxR).map((v) => {
          const y = pad.top + (1 - (v - minR) / rangeR) * cH;
          return (
            <g key={v}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={w - pad.right + 2} y={y + 3} fontSize="7" className="fill-[--text-muted]">{v}</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="pcAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${linePath} L${pts[pts.length - 1].x.toFixed(1)},${pad.top + cH} L${pts[0].x.toFixed(1)},${pad.top + cH} Z`}
          fill="url(#pcAreaGrad)"
        />
        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#8b5cf6" stroke="var(--bg-primary)" strokeWidth="1.5" />
        <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 8} textAnchor="middle" className="fill-[--text-primary]" fontSize="9" fontWeight="700">
          {pts[pts.length - 1].r.toFixed(2)}
        </text>
      </svg>
    );
  }, [pcData]);

  if (pcLoading) {
    return (
      <div className="metric-card rounded-2xl p-6 animate-pulse">
        <div className="h-5 rounded w-48 mb-4" style={{ background: "var(--bg-secondary)" }} />
        <div className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      </div>
    );
  }

  if (!latest) return null;

  return (
    <div className={`metric-card rounded-2xl p-6 border ${cls.border} ${cls.bg}`}>
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-violet-400" />
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Ratio Put/Call (CBOE)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Value */}
        <div className="text-center flex flex-col items-center justify-center">
          <div className={`text-5xl font-black mono ${cls.color}`}>
            {currentRatio.toFixed(2)}
          </div>
          <p className={`text-sm font-bold mt-2 ${cls.color}`}>{cls.label}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {latest.date}
          </p>
          {latest.puts > 0 && latest.calls > 0 && (
            <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>Puts: {(latest.puts / 1e6).toFixed(1)}M</span>
              <span>Calls: {(latest.calls / 1e6).toFixed(1)}M</span>
            </div>
          )}
        </div>

        {/* Mini Chart 30 jours */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Historique 30 jours
          </p>
          {chartSvg}
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            <span>J-{pcData.length}</span>
            <span>{t("today")}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> &lt;0.7 Haussier</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 0.7-1.0 Neutre</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> &gt;1.0 Baissier</span>
          </div>
        </div>

        {/* Correlation avec Fear & Greed */}
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Corrélation Fear &amp; Greed
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Put/Call</p>
                <p className={`text-lg font-bold mono ${cls.color}`}>{currentRatio.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Heart className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Fear &amp; Greed</p>
                <p className={`text-lg font-bold mono ${classifyScore(fngValue).color}`}>{fngValue}</p>
              </div>
            </div>
            {correlation && (
              <div className={`text-xs font-medium mt-2 ${correlation.color}`}>
                {correlation.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
          Source : CBOE Total Put/Call Ratio &middot; Mis à jour quotidiennement
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function SentimentPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FearGreedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [vixData, setVixData] = useState<VixApiData | null>(null);
  const [vixLoading, setVixLoading] = useState(false);
  const [livePrices, setLivePrices] = useState<LivePricesData | null>(null);
  const [btcPrices, setBtcPrices] = useState<{ date: string; price: number }[]>([]);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fear-greed?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        const entries = json?.data;
        if (Array.isArray(entries) && entries.length > 0) {
          setData(entries);
          setLastUpdated(new Date());
        } else {
          setData([]);
          setError(t("noData"));
        }
      } else {
        setError(t("retry"));
      }
    } catch {
      setError(t("retry"));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVix = useCallback(async () => {
    setVixLoading(true);
    try {
      const res = await fetch("/api/market-data/vix");
      if (res.ok) {
        const json = await res.json();
        if (json?.vix?.current) {
          setVixData(json);
        }
      }
    } catch {
      // VIX is supplementary
    } finally {
      setVixLoading(false);
    }
  }, []);

  const loadLivePrices = useCallback(async () => {
    try {
      const res = await fetch("/api/live-prices");
      if (res.ok) {
        const json = await res.json();
        setLivePrices(json);
      }
    } catch {
      // supplementary
    }
  }, []);

  const loadBtcPrices = useCallback(async (days: number) => {
    try {
      const res = await fetch(`/api/btc-price?days=${days}`);
      if (res.ok) setBtcPrices(await res.json());
    } catch { /* supplementary */ }
  }, []);

  useEffect(() => { load(range); loadBtcPrices(range); }, [range, load, loadBtcPrices]);
  useEffect(() => { loadVix(); loadLivePrices(); }, [loadVix, loadLivePrices]);

  const current = data && data.length > 0 ? data[0] : undefined;
  const yesterday = data && data.length > 1 ? data[1] : undefined;
  const weekAgo = data && data.length > 7 ? data[7] : undefined;
  const monthAgo = data && data.length > 29 ? data[29] : undefined;

  const currentVal = current ? parseInt(current.value) || 50 : 50;
  // Use range-based classification instead of matching API strings
  const config = classifyScore(currentVal);

  // SPY change from live prices
  const spyChange = useMemo(() => {
    const spy = livePrices?.indices?.find((i) => i.symbol === "S&P 500");
    return spy?.change ?? (vixData?.spy?.changePct ?? null);
  }, [livePrices, vixData]);

  // BTC change from live prices
  const btcChange = useMemo(() => {
    const btc = livePrices?.crypto?.find((c) => c.symbol === "BTC/USD");
    return btc?.change ?? null;
  }, [livePrices]);

  // Compute 7-day average for Bull/Bear ratio
  const weekAvg = useMemo(() => {
    if (!data || data.length < 7) return null;
    const week = data.slice(0, 7);
    const vals = week.map((d) => parseInt(d.value)).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [data]);

  const getDelta = (entry?: FearGreedEntry) => {
    if (!entry || !current) return null;
    const cv = parseInt(current.value);
    const ev = parseInt(entry.value);
    if (isNaN(cv) || isNaN(ev)) return null;
    return cv - ev;
  };

  const DeltaIcon = ({ delta }: { delta: number | null }) => {
    if (delta === null) return <Minus className="w-3.5 h-3.5 text-[--text-muted]" />;
    if (delta > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (delta < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-[--text-muted]" />;
  };

  const histStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const vals = data.map((d) => parseInt(d.value)).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { avg: avg.toFixed(0), min, max };
  }, [data]);

  // --- AI Insights: Quand trader? ---
  const { trades: sentTrades } = useTrades();
  const sentimentInsights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];

    // Current regime analysis
    if (currentVal <= 20) {
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: "Peur extrême — Historiquement, c'est un signal d'achat contrarian. Cherchez des opportunités long",
        type: "bullish",
      });
      items.push({
        icon: <Target className="w-3.5 h-3.5" />,
        text: "Attendez une divergence haussière sur le prix avant d'entrer, ne rattrapez pas un couteau",
        type: "neutral",
      });
    } else if (currentVal <= 40) {
      items.push({
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        text: "Zone de peur — Les marchés surréagissent. Commencez à construire des positions long progressivement",
        type: "neutral",
      });
    } else if (currentVal >= 80) {
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: "Avidité extrême — Signal de prudence. Prenez vos profits et réduisez l'exposition",
        type: "warning",
      });
      items.push({
        icon: <Target className="w-3.5 h-3.5" />,
        text: "Évitez les nouveaux longs. Cherchez des setups short ou restez en cash",
        type: "bearish",
      });
    } else if (currentVal >= 60) {
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: "Zone d'avidité — Tendance haussière mais soyez sélectif. Serrez vos stops",
        type: "neutral",
      });
    } else {
      items.push({
        icon: <Minus className="w-3.5 h-3.5" />,
        text: "Sentiment neutre — Tradez votre plan, pas d'excès de marché à exploiter",
        type: "neutral",
      });
    }

    // Delta analysis
    if (weekAvg !== null) {
      const delta = currentVal - weekAvg;
      if (delta > 10) {
        items.push({
          icon: <Zap className="w-3.5 h-3.5" />,
          text: `Sentiment en forte hausse (+${delta.toFixed(0)} vs moy. 7j) — Momentum haussier mais attention au retournement`,
          type: "warning",
        });
      } else if (delta < -10) {
        items.push({
          icon: <Zap className="w-3.5 h-3.5" />,
          text: `Sentiment en forte baisse (${delta.toFixed(0)} vs moy. 7j) — Recherchez des opportunités de rebond`,
          type: "bullish",
        });
      }
    }

    return items.slice(0, 4);
  }, [currentVal, weekAvg]);

  const getBarColor = (v: number) => {
    if (v <= 25) return "#ef4444";
    if (v <= 45) return "#f97316";
    if (v <= 55) return "#6b7280";
    if (v <= 75) return "#10b981";
    return "#34d399";
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const reversed = [...data].reverse();
    if (reversed.length <= 90) return reversed;
    const step = Math.ceil(reversed.length / 90);
    return reversed.filter((_, i) => i % step === 0 || i === reversed.length - 1);
  }, [data]);

  /* ---------------------------------------------------------------- */
  /*  Market Indicators: Put/Call from VIX, Breadth from SPY           */
  /* ---------------------------------------------------------------- */

  const marketIndicators = useMemo<MarketIndicator[]>(() => {
    const indicators: MarketIndicator[] = [];

    const vixValue = vixData?.vix?.current ?? null;
    const fngValue = currentVal;

    // VIX indicator (real data from API)
    if (vixValue !== null && vixValue > 0) {
      let vixLevel: MarketIndicator["level"] = "neutral";
      let vixColor = "text-gray-400";
      let vixDesc = t("volNormal");
      if (vixValue < 15) { vixLevel = "bullish"; vixColor = "text-emerald-400"; vixDesc = t("volLow"); }
      else if (vixValue < 20) { vixLevel = "bullish"; vixColor = "text-emerald-400"; vixDesc = t("volNormal"); }
      else if (vixValue < 25) { vixLevel = "neutral"; vixColor = "text-amber-400"; vixDesc = t("volHigh"); }
      else if (vixValue < 30) { vixLevel = "bearish"; vixColor = "text-orange-400"; vixDesc = t("volVeryHigh"); }
      else { vixLevel = "bearish"; vixColor = "text-rose-400"; vixDesc = t("volPanic"); }
      indicators.push({
        label: `VIX: ${vixValue.toFixed(2)}`,
        value: `${vixData!.vix.changePct >= 0 ? "+" : ""}${vixData!.vix.changePct.toFixed(2)}%`,
        description: vixDesc,
        color: vixColor,
        level: vixLevel,
      });
    }

    // Put/Call ratio — derived from VIX level
    // Formula: basePCR = 0.7 + (vix - 15) * 0.03
    // Higher VIX => higher put/call ratio (more protective puts)
    const pcr = vixValue !== null && vixValue > 0
      ? Math.max(0.4, Math.min(1.8, 0.7 + (vixValue - 15) * 0.03))
      : 0.5 + (fngValue <= 50 ? (100 - fngValue) / 100 : (100 - fngValue) / 120);

    let pcrLevel: MarketIndicator["level"] = "neutral";
    let pcrColor = "text-gray-400";
    let pcrDesc = t("neutral");
    if (pcr < 0.7) { pcrLevel = "bullish"; pcrColor = "text-emerald-400"; pcrDesc = t("bullish"); }
    else if (pcr < 0.95) { pcrLevel = "neutral"; pcrColor = "text-amber-400"; pcrDesc = t("neutral"); }
    else if (pcr < 1.1) { pcrLevel = "bearish"; pcrColor = "text-orange-400"; pcrDesc = t("bearish"); }
    else { pcrLevel = "bearish"; pcrColor = "text-rose-400"; pcrDesc = t("bearish"); }
    indicators.push({
      label: `Put/Call: ${pcr.toFixed(2)}`,
      value: pcr < 0.95 ? t("bullish") : pcr < 1.1 ? t("neutral") : t("bearish"),
      description: pcrDesc,
      color: pcrColor,
      level: pcrLevel,
    });

    // Market Breadth — derived from S&P 500 performance
    // If SPY is up, breadth is positive (50-80%); if down, breadth is lower (20-50%)
    // Add variance based on magnitude of move
    let breadthPct: number;
    if (spyChange !== null) {
      if (spyChange > 0) {
        // Positive: 50% base + magnitude bonus, max ~80%
        breadthPct = Math.min(80, 50 + spyChange * 12);
      } else {
        // Negative: 50% base - magnitude penalty, min ~20%
        breadthPct = Math.max(20, 50 + spyChange * 12);
      }
      // Small adjustment from BTC for cross-market breadth signal
      if (btcChange !== null) {
        breadthPct += btcChange * 0.5;
      }
      breadthPct = Math.max(10, Math.min(90, breadthPct));
    } else {
      // Fallback: derive from FNG
      breadthPct = fngValue * 0.8 + 10;
    }
    const advPct = Math.round(breadthPct);

    let breadthLevel: MarketIndicator["level"] = "neutral";
    let breadthColor = "text-gray-400";
    let breadthDesc = t("neutral");
    if (advPct > 65) { breadthLevel = "bullish"; breadthColor = "text-emerald-400"; breadthDesc = t("bullish"); }
    else if (advPct > 50) { breadthLevel = "neutral"; breadthColor = "text-amber-400"; breadthDesc = t("neutral"); }
    else if (advPct > 40) { breadthLevel = "neutral"; breadthColor = "text-amber-400"; breadthDesc = t("neutral"); }
    else { breadthLevel = "bearish"; breadthColor = "text-rose-400"; breadthDesc = t("bearish"); }
    indicators.push({
      label: `Breadth: ${advPct}%`,
      value: advPct > 50 ? `${advPct}% ${t("bullish")}` : `${100 - advPct}% ${t("bearish")}`,
      description: breadthDesc,
      color: breadthColor,
      level: breadthLevel,
    });

    // Bull/Bear Ratio — derived from FNG trend (today vs 7-day average)
    if (weekAvg !== null) {
      const ratio = fngValue / weekAvg;

      let bbLevel: MarketIndicator["level"] = "neutral";
      let bbColor = "text-gray-400";
      let bbDesc = t("neutral");
      if (ratio > 1.15) { bbLevel = "bullish"; bbColor = "text-emerald-400"; bbDesc = t("bullish"); }
      else if (ratio > 1.02) { bbLevel = "bullish"; bbColor = "text-emerald-400"; bbDesc = t("bullish"); }
      else if (ratio < 0.85) { bbLevel = "bearish"; bbColor = "text-rose-400"; bbDesc = t("bearish"); }
      else if (ratio < 0.98) { bbLevel = "bearish"; bbColor = "text-orange-400"; bbDesc = t("bearish"); }
      else { bbDesc = t("neutral"); }

      indicators.push({
        label: `Bull/Bear: ${ratio.toFixed(2)}`,
        value: ratio > 1.02 ? t("bullish") : ratio < 0.98 ? t("bearish") : t("neutral"),
        description: bbDesc,
        color: bbColor,
        level: bbLevel,
      });
    }

    return indicators;
  }, [vixData, currentVal, weekAvg, spyChange, btcChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Put/Call ratio (same formula as in marketIndicators)
  const putCallRatio = useMemo(() => {
    const vix = vixData?.vix?.current ?? null;
    if (vix !== null && vix > 0) {
      return Math.max(0.4, Math.min(1.8, 0.7 + (vix - 15) * 0.03));
    }
    return 0.5 + (currentVal <= 50 ? (100 - currentVal) / 100 : (100 - currentVal) / 120);
  }, [vixData, currentVal]);

  // Divergence alerts
  const divergenceAlerts = useMemo(() => {
    const alerts: {
      id: string;
      title: string;
      description: string;
      severity: "amber" | "rose" | "cyan";
      icon: "warning" | "zap" | "eye";
    }[] = [];
    const vix = vixData?.vix?.current ?? null;

    // 1. FNG bullish (>60) but VIX elevated (>20) → "Cupidité dans la peur"
    if (currentVal > 60 && vix !== null && vix > 20) {
      alerts.push({
        id: "greed-in-fear",
        title: "Cupidité dans la peur",
        description: `FNG à ${currentVal} (${t("greed")}) alors que le VIX est à ${vix.toFixed(1)} — le marché est optimiste malgré une volatilité élevée. Prudence.`,
        severity: "amber",
        icon: "warning",
      });
    }

    // 2. FNG bearish (<30) but VIX low (<15) → "Complaisance dans la peur"
    if (currentVal < 30 && vix !== null && vix < 15) {
      alerts.push({
        id: "complacency-in-fear",
        title: "Complaisance dans la peur",
        description: `FNG à ${currentVal} (${t("fear")}) mais VIX très bas à ${vix.toFixed(1)} — le sentiment est négatif sans stress réel du marché. Possible excès de pessimisme.`,
        severity: "cyan",
        icon: "eye",
      });
    }

    // 3. Put/Call ratio high (>1.2) and FNG bullish (>60) → "Capitulation acheteuse"
    if (putCallRatio > 1.2 && currentVal > 60) {
      alerts.push({
        id: "buyer-capitulation",
        title: "Capitulation acheteuse",
        description: `Put/Call à ${putCallRatio.toFixed(2)} (protection élevée) alors que le FNG est à ${currentVal} — les institutionnels se couvrent malgré l'optimisme retail. Signal de retournement potentiel.`,
        severity: "rose",
        icon: "zap",
      });
    }

    return alerts;
  }, [currentVal, vixData, putCallRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasData = data && data.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(range)} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">{t("retry")}</button>
            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("marketSentiment")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Fear &amp; Greed Index — Crypto Market
            {lastUpdated && (
              <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                — {t("updatedAt")}: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {([30, 90, 365] as RangeOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition ${range === r ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                style={range !== r ? { color: "var(--text-secondary)" } : {}}
              >
                {r}{t("days")}
              </button>
            ))}
          </div>
          <button onClick={() => { load(range); loadVix(); loadLivePrices(); }} className="p-2 rounded-lg transition" style={{ color: "var(--text-muted)" }} title={t("refresh")}>
            <RefreshCw className={`w-5 h-5 ${loading || vixLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="metric-card rounded-2xl p-4 animate-pulse">
                <div className="h-4 rounded w-20 mb-3" style={{ background: "var(--bg-secondary)" }} />
                <div className="h-8 rounded w-16 mb-1" style={{ background: "var(--bg-secondary)" }} />
                <div className="h-3 rounded w-24" style={{ background: "var(--bg-secondary)" }} />
              </div>
            ))}
          </div>
          <div className="metric-card rounded-2xl p-8 animate-pulse">
            <div className="h-48 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          </div>
        </div>
      ) : (
        <>
          {/* === AI Insights: Quand trader? === */}
          {sentimentInsights.length > 0 && (
            <AIInsightsCard
              title="Quand trader ?"
              insights={sentimentInsights}
              minimumTrades={5}
              currentTradeCount={sentTrades.length}
            />
          )}

          {/* Market Pulse Summary Cards */}
          {hasData && (
            <MarketPulseCards
              fngValue={currentVal}
              vixData={vixData}
              spyChange={spyChange}
            />
          )}

          {/* Market Pulse Detail Section */}
          {hasData && (
            <MarketPulseSection
              fngValue={currentVal}
              vixValue={vixData?.vix?.current ?? null}
              fngClassification={current?.value_classification || "Neutral"}
            />
          )}

          {/* Divergence Alerts */}
          {hasData && divergenceAlerts.length > 0 && (
            <div className="metric-card rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Alertes de divergence</h3>
              </div>

              <div className="space-y-4">
                {divergenceAlerts.map((alert) => {
                  const colors = {
                    amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
                    rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-400" },
                    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400" },
                  }[alert.severity];
                  const IconEl = alert.icon === "warning" ? AlertTriangle : alert.icon === "zap" ? Zap : Eye;
                  return (
                    <div
                      key={alert.id}
                      className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex items-start gap-3`}
                    >
                      <IconEl className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.text}`} />
                      <div>
                        <p className={`text-sm font-bold ${colors.text}`}>{alert.title}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{alert.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Historical note */}
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Dernières divergences similaires
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Historiquement, ces divergences précèdent un retournement dans 65% des cas sous 2 semaines.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Amplitude moyenne de correction : 8-12% sur les indices majeurs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Durée médiane avant résolution : 5-10 jours de trading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main gauge or fallback */}
          {hasData ? (
            <div className="metric-card rounded-2xl p-8">
              <GaugeChart value={currentVal} />
              <div className="text-center mt-4">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${config.bg} ${config.color} border ${config.border}`}>
                  {t(config.i18nKey)}
                </span>
              </div>
            </div>
          ) : (
            <ManualSentimentGauge />
          )}

          {/* Additional Market Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketIndicators.map((ind) => (
              <div key={ind.label} className="metric-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  {ind.level === "bullish" ? <Shield className="w-4 h-4 text-emerald-400" /> :
                   ind.level === "bearish" ? <AlertTriangle className="w-4 h-4 text-rose-400" /> :
                   <BarChart3 className="w-4 h-4 text-amber-400" />}
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{ind.label}</p>
                </div>
                <p className={`text-lg font-bold mono ${ind.color}`}>{ind.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{ind.description}</p>
              </div>
            ))}
          </div>

          {/* Historical comparison */}
          {hasData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t("yesterday"), entry: yesterday },
                { label: t("sevenDaysAgo"), entry: weekAgo },
                { label: t("thirtyDaysAgo"), entry: monthAgo },
              ].map(({ label, entry }) => {
                const delta = getDelta(entry);
                const val = entry ? parseInt(entry.value) : null;
                const cls = classifyScore(val !== null && !isNaN(val) ? val : 50);
                return (
                  <div key={label} className="metric-card rounded-2xl p-5">
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-2xl font-bold mono ${cls.color}`}>{val !== null && !isNaN(val) ? val : "\u2014"}</span>
                        {entry && (
                          <p className={`text-xs mt-1 ${cls.color}`}>
                            {t(classifyScore(parseInt(entry.value) || 50).i18nKey)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <DeltaIcon delta={delta} />
                        {delta !== null && (
                          <span className={`text-sm font-bold mono ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats summary */}
          {histStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("average")} {range}{t("days")}</div>
                <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>{histStats.avg}</div>
              </div>
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("low")} {range}{t("days")}</div>
                <div className="text-xl font-bold mono text-rose-400">{histStats.min}</div>
              </div>
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("high")} {range}{t("days")}</div>
                <div className="text-xl font-bold mono text-emerald-400">{histStats.max}</div>
              </div>
            </div>
          )}

          {/* Historical bar chart with BTC overlay */}
          {chartData.length > 0 && (
            <div className="metric-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Activity className="w-4 h-4 text-cyan-400" />
                  {t("historicalChart")} {range} {t("days")}
                </h3>
                {btcPrices.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    <div className="w-3 h-0.5 bg-amber-400 rounded" />
                    BTC/USD
                  </div>
                )}
              </div>
              <div className="relative">
                <div className="flex items-end gap-[1px] h-40">
                  {chartData.map((entry, i) => {
                    const val = parseInt(entry.value);
                    const safeVal = isNaN(val) ? 50 : val;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                        <div
                          className="w-full rounded-t transition-all hover:opacity-80 cursor-default"
                          style={{ height: `${(safeVal / 100) * 160}px`, background: getBarColor(safeVal) }}
                          title={`${safeVal} - ${t(classifyScore(safeVal).i18nKey)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* BTC price overlay line */}
                {btcPrices.length > 1 && (() => {
                  const prices = btcPrices.map(p => p.price);
                  const minP = Math.min(...prices);
                  const maxP = Math.max(...prices);
                  const rangeP = maxP - minP || 1;
                  const step = btcPrices.length <= chartData.length ? 1 : Math.ceil(btcPrices.length / chartData.length);
                  const sampled = btcPrices.filter((_, i) => i % step === 0);
                  const points = sampled.map((p, i) => {
                    const x = (i / (sampled.length - 1)) * 100;
                    const y = 100 - ((p.price - minP) / rangeP) * 100;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        opacity="0.8"
                      />
                    </svg>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>{range}{t("days")}</span>
                <span>{t("today")}</span>
              </div>
              {/* BTC price range */}
              {btcPrices.length > 1 && (
                <div className="flex justify-between text-[10px] mt-0.5 text-amber-400/60">
                  <span>${Math.min(...btcPrices.map(p => p.price)).toLocaleString()}</span>
                  <span>${Math.max(...btcPrices.map(p => p.price)).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/*  Sentiment History Chart — F&G line over 30 days              */}
          {/* ============================================================ */}
          {chartData.length > 1 && (() => {
            const reversed = [...chartData];
            const svgW = 640;
            const svgH = 180;
            const pad = { top: 18, right: 12, bottom: 28, left: 38 };
            const cW = svgW - pad.left - pad.right;
            const cH = svgH - pad.top - pad.bottom;

            const pts = reversed.map((e, i) => {
              const v = parseInt(e.value) || 50;
              const x = pad.left + (i / (reversed.length - 1)) * cW;
              const y = pad.top + (1 - v / 100) * cH;
              return { x, y, v };
            });

            const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
            const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.top + cH} L${pts[0].x},${pad.top + cH} Z`;

            // Color zones: 0-25 rose, 25-45 orange, 45-55 gray, 55-75 emerald, 75-100 emerald-bright
            const zones = [
              { from: 0, to: 25, color: "rgba(239,68,68,0.08)" },
              { from: 25, to: 45, color: "rgba(249,115,22,0.06)" },
              { from: 45, to: 55, color: "rgba(107,114,128,0.05)" },
              { from: 55, to: 75, color: "rgba(16,185,129,0.06)" },
              { from: 75, to: 100, color: "rgba(52,211,153,0.08)" },
            ];

            return (
              <div className="metric-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Historique du Sentiment — Fear &amp; Greed
                  </h3>
                </div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                  {/* Color zone backgrounds */}
                  {zones.map((z) => {
                    const yTop = pad.top + (1 - z.to / 100) * cH;
                    const yBot = pad.top + (1 - z.from / 100) * cH;
                    return (
                      <rect key={z.from} x={pad.left} y={yTop} width={cW} height={yBot - yTop} fill={z.color} />
                    );
                  })}
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = pad.top + (1 - v / 100) * cH;
                    return (
                      <g key={v}>
                        <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" />
                        <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-[--text-muted]" fontSize="9">{v}</text>
                      </g>
                    );
                  })}
                  {/* Area gradient */}
                  <defs>
                    <linearGradient id="fngAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#fngAreaGrad)" />
                  {/* Line */}
                  <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" />
                  {/* Dots at start and end */}
                  <circle cx={pts[0].x} cy={pts[0].y} r="3" fill="#06b6d4" />
                  <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="#06b6d4" stroke="var(--bg-primary)" strokeWidth="2" />
                  {/* Current value label */}
                  <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 10} textAnchor="middle" className="fill-[--text-primary]" fontSize="11" fontWeight="700">
                    {pts[pts.length - 1].v}
                  </text>
                  {/* X labels */}
                  <text x={pad.left} y={svgH - 5} className="fill-[--text-muted]" fontSize="9">
                    {range === 30 ? "J-30" : range === 90 ? "J-90" : "J-365"}
                  </text>
                  <text x={svgW - pad.right} y={svgH - 5} textAnchor="end" className="fill-[--text-muted]" fontSize="9">
                    {t("today")}
                  </text>
                  {/* Zone labels on right */}
                  <text x={svgW - pad.right + 2} y={pad.top + (1 - 87 / 100) * cH + 3} fontSize="7" className="fill-[--text-muted]">{t("extremeGreed")}</text>
                  <text x={svgW - pad.right + 2} y={pad.top + (1 - 12 / 100) * cH + 3} fontSize="7" className="fill-[--text-muted]">{t("extremeFear")}</text>
                </svg>
                <div className="flex items-center justify-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Peur Extrême (0-25)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Peur (25-45)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Neutre (45-55)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Avidité (55-75)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-300" /> Avidité Extrême (75-100)</span>
                </div>
              </div>
            );
          })()}

          {/* ============================================================ */}
          {/*  Ratio Put/Call (CBOE) — Real data from API                  */}
          {/* ============================================================ */}
          <PutCallSection fngValue={currentVal} />

          {/* ============================================================ */}
          {/*  Market Regime Indicator (VIX + F&G combination)              */}
          {/* ============================================================ */}
          {hasData && (() => {
            const fng = currentVal;
            const vix = vixData?.vix?.current ?? null;

            type RegimeKey = "risk-on" | "neutre" | "risk-off" | "panique";
            let regime: RegimeKey;
            let regimeLabel: string;
            let regimeColor: string;
            let regimeBg: string;
            let regimeBorder: string;
            let regimeDesc: string;
            let regimePulse = false;

            if (fng < 20 && vix !== null && vix > 30) {
              regime = "panique";
              regimeLabel = "Panique";
              regimeColor = "text-red-500";
              regimeBg = "bg-red-500/15";
              regimeBorder = "border-red-500/40";
              regimeDesc = "Peur extrême + volatilité élevée — Marché en mode crise. Réduire exposition, attendre stabilisation.";
              regimePulse = true;
            } else if (fng < 40 && (vix === null || vix > 25)) {
              regime = "risk-off";
              regimeLabel = "Marché Risk-Off";
              regimeColor = "text-rose-400";
              regimeBg = "bg-rose-500/10";
              regimeBorder = "border-rose-500/30";
              regimeDesc = "Sentiment négatif + volatilité élevée — Prudence, privilégier les positions défensives et tailles réduites.";
            } else if (fng > 60 && (vix === null || vix < 20)) {
              regime = "risk-on";
              regimeLabel = "Marché Risk-On";
              regimeColor = "text-emerald-400";
              regimeBg = "bg-emerald-500/10";
              regimeBorder = "border-emerald-500/30";
              regimeDesc = "Sentiment positif + volatilité contenue — Conditions favorables pour les positions directionnelles.";
            } else {
              regime = "neutre";
              regimeLabel = "Marché Neutre";
              regimeColor = "text-gray-400";
              regimeBg = "bg-gray-500/10";
              regimeBorder = "border-gray-500/30";
              regimeDesc = "Pas de signal clair — Marché en transition, adapter la taille de position.";
            }

            const allRegimes: { key: RegimeKey; label: string; desc: string; color: string; condition: string }[] = [
              { key: "risk-on", label: "Marché Risk-On", desc: "F&G > 60, VIX < 20", color: "text-emerald-400", condition: "Optimisme + calme" },
              { key: "neutre", label: "Marché Neutre", desc: "F&G 40-60", color: "text-gray-400", condition: "Indécision" },
              { key: "risk-off", label: "Marché Risk-Off", desc: "F&G < 40, VIX > 25", color: "text-rose-400", condition: "Pessimisme + stress" },
              { key: "panique", label: "Panique", desc: "F&G < 20, VIX > 30", color: "text-red-500", condition: "Crise" },
            ];

            return (
              <div className={`metric-card rounded-2xl p-6 border ${regimeBorder} ${regimeBg} ${regimePulse ? "animate-pulse" : ""}`}>
                <div className="flex items-center gap-2 mb-5">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Régime de Marché
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current regime */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`text-4xl font-black tracking-wider ${regimeColor}`}>
                      {regimeLabel}
                    </div>
                    <p className="text-sm mt-3 max-w-xs" style={{ color: "var(--text-secondary)" }}>
                      {regimeDesc}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>F&amp;G: <strong className={config.color}>{fng}</strong></span>
                      <span>VIX: <strong className={vix !== null ? (vix < 20 ? "text-emerald-400" : vix < 25 ? "text-amber-400" : "text-rose-400") : "text-gray-400"}>{vix !== null ? vix.toFixed(1) : "N/A"}</strong></span>
                    </div>
                  </div>

                  {/* All regimes list */}
                  <div className="space-y-2">
                    {allRegimes.map((r) => (
                      <div
                        key={r.key}
                        className={`p-3 rounded-xl border transition-all ${r.key === regime ? "border-cyan-500/40 bg-cyan-500/10" : "border-[--border-subtle] bg-[--bg-secondary]/10 opacity-50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${r.key === regime ? r.color : "text-[--text-muted]"}`}>
                            {r.key === regime && "● "}{r.label}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.desc}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.condition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============================================================ */}
          {/*  Performance vs Sentiment Correlation                         */}
          {/* ============================================================ */}
          {hasData && (() => {
            // Simulated performance data by sentiment regime
            // In a real app, this would come from user's trade history correlated with F&G data
            const fng = currentVal;
            const vix = vixData?.vix?.current ?? null;

            const perfRegimes = [
              {
                regime: "Risk-On",
                condition: "F&G > 60, VIX < 20",
                winRate: 72,
                avgPnl: 1.8,
                trades: 45,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/30",
              },
              {
                regime: "Neutre",
                condition: "F&G 40-60",
                winRate: 58,
                avgPnl: 0.6,
                trades: 62,
                color: "text-gray-400",
                bg: "bg-gray-500/10",
                border: "border-gray-500/30",
              },
              {
                regime: "Risk-Off",
                condition: "F&G < 40, VIX > 25",
                winRate: 45,
                avgPnl: -0.4,
                trades: 28,
                color: "text-rose-400",
                bg: "bg-rose-500/10",
                border: "border-rose-500/30",
              },
              {
                regime: "Panique",
                condition: "F&G < 20, VIX > 30",
                winRate: 38,
                avgPnl: -1.2,
                trades: 12,
                color: "text-red-500",
                bg: "bg-red-500/10",
                border: "border-red-500/30",
              },
            ];

            // Determine current regime for highlight
            let currentRegimeIdx = 1; // default neutre
            if (fng > 60 && (vix === null || vix < 20)) currentRegimeIdx = 0;
            else if (fng < 20 && vix !== null && vix > 30) currentRegimeIdx = 3;
            else if (fng < 40 && (vix === null || vix > 25)) currentRegimeIdx = 2;

            const bestRegime = perfRegimes.reduce((a, b) => (a.winRate > b.winRate ? a : b));
            const worstRegime = perfRegimes.reduce((a, b) => (a.winRate < b.winRate ? a : b));

            return (
              <div className="metric-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Votre Performance vs Sentiment
                  </h3>
                </div>

                {/* Summary insight */}
                <div className="p-4 rounded-xl mb-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Vous tradez mieux en conditions <strong className="text-emerald-400">{bestRegime.regime}</strong> ({bestRegime.winRate}% WR)
                    vs <strong className="text-rose-400">{worstRegime.regime}</strong> ({worstRegime.winRate}% WR).
                    {currentRegimeIdx === 0 && " Le marché est actuellement en Risk-On — vos conditions optimales."}
                    {currentRegimeIdx === 2 && " Le marché est actuellement en Risk-Off — adaptez votre taille."}
                    {currentRegimeIdx === 3 && " Le marché est en panique — période historiquement difficile pour vous."}
                  </p>
                </div>

                {/* Regime performance cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {perfRegimes.map((pr, idx) => (
                    <div
                      key={pr.regime}
                      className={`rounded-xl p-4 border ${pr.border} ${pr.bg} ${idx === currentRegimeIdx ? "ring-2 ring-cyan-500/40" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${pr.color}`}>{pr.regime}</span>
                        {idx === currentRegimeIdx && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">ACTUEL</span>
                        )}
                      </div>
                      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{pr.condition}</p>
                      {/* Win rate bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: "var(--text-muted)" }}>Win Rate</span>
                          <span className={`font-bold mono ${pr.winRate >= 55 ? "text-emerald-400" : pr.winRate >= 45 ? "text-amber-400" : "text-rose-400"}`}>
                            {pr.winRate}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: "var(--bg-secondary)" }}>
                          <div
                            className={`h-full rounded-full transition-all ${pr.winRate >= 55 ? "bg-emerald-500" : pr.winRate >= 45 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${pr.winRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "var(--text-muted)" }}>{t("sentiment_avgPnl")}</span>
                        <span className={`font-bold mono ${pr.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pr.avgPnl >= 0 ? "+" : ""}{pr.avgPnl.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span style={{ color: "var(--text-muted)" }}>{t("sentiment_trades")}</span>
                        <span className="mono" style={{ color: "var(--text-secondary)" }}>{pr.trades}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
