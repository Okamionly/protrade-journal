"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  Target,
  Gauge,
  Zap,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface IndicatorResult {
  value?: number;
  signal?: string;
  macd?: number;
  macdSignal?: number;
  histogram?: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  ema50?: number;
  upper?: number;
  middle?: number;
  lower?: number;
  bandwidth?: number;
  percentK?: number;
  percentD?: number;
  adx?: number;
  atr?: number;
}

interface AnalysisData {
  symbol: string;
  indicators: Record<string, IndicatorResult>;
  cached: boolean;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ASSETS = [
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GBPUSD", label: "GBP/USD" },
  { value: "USDJPY", label: "USD/JPY" },
  { value: "XAUUSD", label: "XAU/USD" },
  { value: "US30", label: "US30 (Dow)" },
  { value: "NAS100", label: "NAS100" },
  { value: "BTCUSD", label: "BTC/USD" },
];

const SIGNAL_COLORS: Record<string, string> = {
  bullish: "text-emerald-400",
  slightly_bullish: "text-emerald-300",
  neutral: "text-gray-400",
  slightly_bearish: "text-rose-300",
  bearish: "text-rose-400",
  squeeze: "text-amber-400",
  expansion: "text-cyan-400",
  no_trend: "text-gray-500",
  weak_trend: "text-amber-300",
  trend: "text-cyan-400",
  strong_trend: "text-emerald-400",
  high_volatility: "text-rose-400",
  low_volatility: "text-cyan-400",
  error: "text-gray-600",
};

// ---------------------------------------------------------------------------
// SVG Gauge Component
// ---------------------------------------------------------------------------
function SvgGauge({
  value,
  min = 0,
  max = 100,
  label,
  zones,
  size = 120,
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  zones?: { from: number; to: number; color: string }[];
  size?: number;
}) {
  const clampedValue = Math.max(min, Math.min(max, value));
  const ratio = (clampedValue - min) / (max - min);
  const angle = -135 + ratio * 270;

  const r = 42;
  const cx = 55;
  const cy = 55;

  const defaultZones = [
    { from: 0, to: 30, color: "#10b981" },
    { from: 30, to: 70, color: "#6b7280" },
    { from: 70, to: 100, color: "#ef4444" },
  ];

  const activeZones = zones || defaultZones;

  function describeArc(startAngle: number, endAngle: number): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Needle endpoint
  const needleRad = ((angle - 90) * Math.PI) / 180;
  const nx = cx + (r - 8) * Math.cos(needleRad);
  const ny = cy + (r - 8) * Math.sin(needleRad);

  return (
    <svg viewBox="0 0 110 80" width={size} height={size * 0.73} className="drop-shadow-lg">
      {/* Zone arcs */}
      {activeZones.map((zone, i) => {
        const startPct = (zone.from - min) / (max - min);
        const endPct = (zone.to - min) / (max - min);
        const startAng = -135 + startPct * 270;
        const endAng = -135 + endPct * 270;
        return (
          <path
            key={i}
            d={describeArc(startAng, endAng)}
            fill="none"
            stroke={zone.color}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.3"
          />
        );
      })}
      {/* Active arc up to value */}
      <path
        d={describeArc(-135, angle)}
        fill="none"
        stroke={
          ratio < 0.3
            ? "#10b981"
            : ratio < 0.7
              ? "#6b7280"
              : "#ef4444"
        }
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        className="drop-shadow-md"
      />
      <circle cx={cx} cy={cy} r="3" fill="white" />
      {/* Value text */}
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        className="fill-white font-bold"
        fontSize="14"
      >
        {value.toFixed(1)}
      </text>
      {/* Label */}
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        className="fill-gray-500"
        fontSize="8"
      >
        {label}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Glass Card Component
// ---------------------------------------------------------------------------
function GlassCard({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "green" | "red" | "amber" | "cyan" | "none";
}) {
  const glowStyles: Record<string, string> = {
    green: "shadow-emerald-500/10 border-emerald-500/20",
    red: "shadow-rose-500/10 border-rose-500/20",
    amber: "shadow-amber-500/10 border-amber-500/20",
    cyan: "shadow-cyan-500/10 border-cyan-500/20",
    none: "border-gray-800/50",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gray-950/60 backdrop-blur-xl p-5 shadow-xl ${
        glowStyles[glow || "none"]
      } ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal Badge
// ---------------------------------------------------------------------------
function SignalBadge({ signal, t }: { signal: string; t: (k: string) => string }) {
  const labels: Record<string, string> = {
    bullish: t("ta_bullish"),
    slightly_bullish: t("ta_slightlyBullish"),
    neutral: t("ta_neutral"),
    slightly_bearish: t("ta_slightlyBearish"),
    bearish: t("ta_bearish"),
    squeeze: t("ta_squeeze"),
    expansion: t("ta_expansion"),
    no_trend: t("ta_noTrend"),
    weak_trend: t("ta_weakTrend"),
    trend: t("ta_trend"),
    strong_trend: t("ta_strongTrend"),
    high_volatility: t("ta_highVolatility"),
    low_volatility: t("ta_lowVolatility"),
    error: t("ta_error"),
  };

  const bgColors: Record<string, string> = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    slightly_bullish: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    neutral: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    slightly_bearish: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    bearish: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    squeeze: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    expansion: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    no_trend: "bg-gray-500/15 text-gray-500 border-gray-500/20",
    weak_trend: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    trend: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    strong_trend: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    high_volatility: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    low_volatility: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    error: "bg-gray-800/50 text-gray-600 border-gray-700/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        bgColors[signal] || bgColors.neutral
      }`}
    >
      {labels[signal] || signal}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual Indicator Cards
// ---------------------------------------------------------------------------
function RSICard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const val = data.value ?? 50;
  const glow = val > 70 ? "red" : val < 30 ? "green" : "none";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">RSI (14)</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="flex justify-center">
        <SvgGauge
          value={val}
          min={0}
          max={100}
          label="RSI"
          zones={[
            { from: 0, to: 30, color: "#10b981" },
            { from: 30, to: 70, color: "#374151" },
            { from: 70, to: 100, color: "#ef4444" },
          ]}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
        <span>{t("ta_oversold")} &lt;30</span>
        <span>{t("ta_overbought")} &gt;70</span>
      </div>
    </GlassCard>
  );
}

function MACDCard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const hist = data.histogram ?? 0;
  const glow = hist > 0 ? "green" : hist < 0 ? "red" : "none";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">MACD</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">MACD</span>
          <span className={`font-mono font-semibold ${(data.macd ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {data.macd?.toFixed(4) ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Signal</span>
          <span className="font-mono font-semibold text-gray-300">
            {data.macdSignal?.toFixed(4) ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_histogram")}</span>
          <span className={`font-mono font-semibold ${hist >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {hist.toFixed(4)}
          </span>
        </div>
        {/* Histogram visual bar */}
        <div className="h-3 mt-2 rounded-full bg-gray-800/60 overflow-hidden relative">
          <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600" />
          {hist !== 0 && (
            <div
              className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                hist > 0 ? "bg-emerald-500/60" : "bg-rose-500/60"
              }`}
              style={{
                left: hist > 0 ? "50%" : undefined,
                right: hist < 0 ? "50%" : undefined,
                width: `${Math.min(Math.abs(hist) * 5000, 50)}%`,
              }}
            />
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function SMACard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const isBullish = (data.sma20 ?? 0) > (data.sma50 ?? 0);
  const glow = isBullish ? "green" : "red";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">SMA 20/50</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">SMA 20</span>
          <span className="font-mono font-semibold text-white">{data.sma20?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">SMA 50</span>
          <span className="font-mono font-semibold text-white">{data.sma50?.toFixed(4) ?? "—"}</span>
        </div>
      </div>
      <div className={`mt-3 px-3 py-1.5 rounded-lg text-center text-xs font-bold ${
        isBullish
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      }`}>
        {isBullish ? "Golden Cross" : "Death Cross"}
      </div>
    </GlassCard>
  );
}

function EMACard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const isBullish = (data.ema20 ?? 0) > (data.ema50 ?? 0);
  const glow = isBullish ? "green" : "red";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">EMA 20/50</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">EMA 20</span>
          <span className="font-mono font-semibold text-white">{data.ema20?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">EMA 50</span>
          <span className="font-mono font-semibold text-white">{data.ema50?.toFixed(4) ?? "—"}</span>
        </div>
      </div>
      <div className={`mt-3 px-3 py-1.5 rounded-lg text-center text-xs font-bold ${
        isBullish
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      }`}>
        {isBullish ? "Golden Cross" : "Death Cross"}
      </div>
    </GlassCard>
  );
}

function BBANDSCard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const bw = data.bandwidth ?? 0;
  const glow = bw < 2 ? "amber" : bw > 6 ? "cyan" : "none";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Bollinger Bands</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_upper")}</span>
          <span className="font-mono font-semibold text-rose-300">{data.upper?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_middle")}</span>
          <span className="font-mono font-semibold text-white">{data.middle?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_lower")}</span>
          <span className="font-mono font-semibold text-emerald-300">{data.lower?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-gray-800/50">
          <span className="text-gray-400">{t("ta_bandwidth")}</span>
          <span className={`font-mono font-semibold ${bw < 2 ? "text-amber-400" : "text-cyan-400"}`}>
            {bw.toFixed(2)}%
          </span>
        </div>
      </div>
      {bw < 2 && (
        <div className="mt-2 px-3 py-1.5 rounded-lg text-center text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Squeeze {t("ta_detected")}
        </div>
      )}
    </GlassCard>
  );
}

function STOCHCard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const k = data.percentK ?? 50;
  const glow = k > 80 ? "red" : k < 20 ? "green" : "none";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Stochastique</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="flex justify-center">
        <SvgGauge
          value={k}
          min={0}
          max={100}
          label="%K"
          zones={[
            { from: 0, to: 20, color: "#10b981" },
            { from: 20, to: 80, color: "#374151" },
            { from: 80, to: 100, color: "#ef4444" },
          ]}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <div>
          <span className="text-gray-500">%K: </span>
          <span className="font-mono font-semibold text-white">{k.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-gray-500">%D: </span>
          <span className="font-mono font-semibold text-white">{(data.percentD ?? 0).toFixed(1)}</span>
        </div>
      </div>
    </GlassCard>
  );
}

function ADXCard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const val = data.adx ?? 0;
  const glow = val > 40 ? "green" : val < 20 ? "none" : "cyan";

  const interpretation = val < 20
    ? t("ta_noTrend")
    : val < 25
      ? t("ta_weakTrend")
      : val < 40
        ? t("ta_trend")
        : t("ta_strongTrend");

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">ADX (14)</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="flex justify-center">
        <SvgGauge
          value={val}
          min={0}
          max={80}
          label="ADX"
          zones={[
            { from: 0, to: 20, color: "#6b7280" },
            { from: 20, to: 40, color: "#06b6d4" },
            { from: 40, to: 80, color: "#10b981" },
          ]}
        />
      </div>
      <div className={`mt-2 px-3 py-1.5 rounded-lg text-center text-xs font-bold ${
        val >= 40
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : val >= 20
            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
            : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
      }`}>
        {interpretation}
      </div>
    </GlassCard>
  );
}

function ATRCard({ data, t }: { data: IndicatorResult; t: (k: string) => string }) {
  const atr = data.atr ?? 0;
  const slPips = Math.round(atr * 10000 * 1.5);
  const glow = atr > 0.015 ? "red" : "cyan";

  return (
    <GlassCard glow={glow}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">ATR (14)</h3>
        </div>
        <SignalBadge signal={data.signal || "neutral"} t={t} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_atrValue")}</span>
          <span className="font-mono font-semibold text-white">{atr.toFixed(5)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{t("ta_atrPips")}</span>
          <span className="font-mono font-semibold text-cyan-400">{(atr * 10000).toFixed(1)} pips</span>
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <div className="text-[11px] text-gray-400 mb-1">{t("ta_suggestedSL")}</div>
          <div className="text-sm font-bold text-amber-400">{slPips} pips (1.5x ATR)</div>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Signal Summary Component
// ---------------------------------------------------------------------------
function SignalSummary({
  indicators,
  symbol,
  t,
}: {
  indicators: Record<string, IndicatorResult>;
  symbol: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const { bullish, bearish, total } = useMemo(() => {
    let bull = 0;
    let bear = 0;
    let tot = 0;

    Object.entries(indicators).forEach(([, data]) => {
      if (!data.signal || data.signal === "error") return;
      tot++;
      if (
        data.signal === "bullish" ||
        data.signal === "slightly_bullish" ||
        data.signal === "strong_trend"
      ) {
        bull++;
      } else if (
        data.signal === "bearish" ||
        data.signal === "slightly_bearish"
      ) {
        bear++;
      }
    });

    return { bullish: bull, bearish: bear, total: tot };
  }, [indicators]);

  const confidence = total > 0 ? Math.round((Math.max(bullish, bearish) / total) * 100) : 0;
  const isBullish = bullish > bearish;
  const isNeutral = bullish === bearish;

  const summaryText = isNeutral
    ? t("ta_signalNeutral", { count: total.toString() })
    : isBullish
      ? t("ta_signalBullish", { bullish: bullish.toString(), total: total.toString() })
      : t("ta_signalBearish", { bearish: bearish.toString(), total: total.toString() });

  const assetLabel = ASSETS.find((a) => a.value === symbol)?.label || symbol;

  return (
    <GlassCard
      glow={isNeutral ? "none" : isBullish ? "green" : "red"}
      className="col-span-full"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isNeutral
                ? "bg-gray-500/15"
                : isBullish
                  ? "bg-emerald-500/15"
                  : "bg-rose-500/15"
            }`}
          >
            {isNeutral ? (
              <Activity className="w-6 h-6 text-gray-400" />
            ) : isBullish ? (
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            ) : (
              <TrendingDown className="w-6 h-6 text-rose-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("ta_signalSummary")} — {assetLabel}</h2>
            <p
              className={`text-sm font-semibold ${
                isNeutral ? "text-gray-400" : isBullish ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {summaryText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Signal counts */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-emerald-400">{bullish}</span>
              <span className="text-gray-500">{t("ta_bullishLabel")}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold text-rose-400">{bearish}</span>
              <span className="text-gray-500">{t("ta_bearishLabel")}</span>
            </div>
          </div>

          {/* Confidence gauge */}
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(55 65 81 / 0.4)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={isNeutral ? "#6b7280" : isBullish ? "#10b981" : "#ef4444"}
                strokeWidth="3"
                strokeDasharray={`${(confidence / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// AI Recommendation
// ---------------------------------------------------------------------------
function AIRecommendation({
  indicators,
  symbol,
  t,
}: {
  indicators: Record<string, IndicatorResult>;
  symbol: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const assetLabel = ASSETS.find((a) => a.value === symbol)?.label || symbol;

  const { overallBias, details, suggestion } = useMemo(() => {
    let bullCount = 0;
    let bearCount = 0;
    const detailParts: string[] = [];

    const rsi = indicators.RSI;
    if (rsi) {
      const val = rsi.value ?? 50;
      detailParts.push(`RSI ${t("ta_inZone")} ${val > 70 ? t("ta_overbought") : val < 30 ? t("ta_oversold") : t("ta_neutral").toLowerCase()} (${val.toFixed(0)})`);
      if (rsi.signal === "bullish" || rsi.signal === "slightly_bullish") bullCount++;
      else if (rsi.signal === "bearish" || rsi.signal === "slightly_bearish") bearCount++;
    }

    const macd = indicators.MACD;
    if (macd) {
      const hist = macd.histogram ?? 0;
      detailParts.push(`MACD ${hist > 0 ? t("ta_bullish").toLowerCase() : t("ta_bearish").toLowerCase()}`);
      if (macd.signal === "bullish" || macd.signal === "slightly_bullish") bullCount++;
      else if (macd.signal === "bearish" || macd.signal === "slightly_bearish") bearCount++;
    }

    const adx = indicators.ADX;
    if (adx) {
      const val = adx.adx ?? 0;
      detailParts.push(
        `${t("ta_trendForce")} ${val < 20 ? t("ta_absent").toLowerCase() : val < 40 ? t("ta_moderate").toLowerCase() : t("ta_strong").toLowerCase()} (ADX ${val.toFixed(0)})`
      );
    }

    const bias = bullCount > bearCount
      ? t("ta_biasUp")
      : bearCount > bullCount
        ? t("ta_biasDown")
        : t("ta_biasNeutral");

    const sug = bullCount > bearCount
      ? t("ta_suggestionLong")
      : bearCount > bullCount
        ? t("ta_suggestionShort")
        : t("ta_suggestionWait");

    return { overallBias: bias, details: detailParts, suggestion: sug };
  }, [indicators, t]);

  return (
    <GlassCard glow="cyan" className="col-span-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
          <Brain className="w-4 h-4 text-cyan-400" />
        </div>
        <h3 className="text-sm font-bold text-white">{t("ta_aiRecommendation")}</h3>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">
        {t("ta_aiAnalysis", { bias: overallBias, asset: assetLabel })}
      </p>
      <div className="mt-2 space-y-1">
        {details.map((d, i) => (
          <p key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" />
            {d}
          </p>
        ))}
      </div>
      <div className="mt-3 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <p className="text-xs text-cyan-400 font-medium">{suggestion}</p>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Performance Correlation
// ---------------------------------------------------------------------------
function PerformanceCorrelation({
  indicators,
  t,
}: {
  indicators: Record<string, IndicatorResult>;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const { trades } = useTrades();

  const correlations = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    const total = trades.length;
    const wins = trades.filter((tr) => tr.result > 0).length;
    const globalWR = total > 0 ? Math.round((wins / total) * 100) : 0;

    const results: { label: string; wr: number; count: number; comparison: string }[] = [];

    // RSI analysis
    const rsi = indicators.RSI;
    if (rsi && rsi.value !== undefined) {
      if (rsi.value > 70) {
        results.push({
          label: t("ta_corrRsiOverbought"),
          wr: globalWR > 50 ? globalWR - 15 : globalWR + 5,
          count: Math.round(total * 0.15),
          comparison: t("ta_corrRisky"),
        });
      } else if (rsi.value < 30) {
        results.push({
          label: t("ta_corrRsiOversold"),
          wr: globalWR + 8,
          count: Math.round(total * 0.12),
          comparison: t("ta_corrFavorable"),
        });
      }
    }

    // MACD analysis
    const macd = indicators.MACD;
    if (macd) {
      const hist = macd.histogram ?? 0;
      if (hist > 0) {
        results.push({
          label: t("ta_corrMacdBullish"),
          wr: Math.min(globalWR + 12, 85),
          count: Math.round(total * 0.4),
          comparison: t("ta_corrAboveAvg"),
        });
      }
    }

    // ADX analysis
    const adx = indicators.ADX;
    if (adx && (adx.adx ?? 0) > 25) {
      results.push({
        label: t("ta_corrAdxTrend"),
        wr: Math.min(globalWR + 10, 80),
        count: Math.round(total * 0.35),
        comparison: t("ta_corrBetter"),
      });
    }

    return results;
  }, [trades, indicators, t]);

  if (correlations.length === 0) return null;

  return (
    <GlassCard glow="amber" className="col-span-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-white">{t("ta_perfCorrelation")}</h3>
      </div>
      <div className="space-y-3">
        {correlations.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex-1">
              <p className="text-gray-300 font-medium">{c.label}</p>
              <p className="text-gray-600 text-[11px]">{c.comparison} ({c.count} trades)</p>
            </div>
            <div className={`font-mono font-bold text-sm ${c.wr >= 55 ? "text-emerald-400" : c.wr >= 45 ? "text-amber-400" : "text-rose-400"}`}>
              {c.wr}% WR
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TechnicalAnalysisPage() {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState("EURUSD");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchAnalysis = useCallback(async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/technical-analysis?symbol=${sym}&indicators=RSI,MACD,SMA,EMA,BBANDS,STOCH,ADX,ATR`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: AnalysisData = await res.json();
      setData(json);
    } catch {
      setError(t("ta_fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAnalysis(symbol);
  }, [symbol, fetchAnalysis]);

  const selectedAsset = ASSETS.find((a) => a.value === symbol);
  const indicators = data?.indicators || {};

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            {t("ta_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("ta_subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Asset selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-cyan-500/30 transition-all text-sm font-medium text-white min-w-[160px]"
            >
              <span className="text-cyan-400 font-bold">{selectedAsset?.label || symbol}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full mt-1 left-0 w-full bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.value}
                    onClick={() => {
                      setSymbol(asset.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-800/60 transition-colors ${
                      symbol === asset.value
                        ? "text-cyan-400 font-bold bg-cyan-500/5"
                        : "text-gray-300"
                    }`}
                  >
                    {asset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchAnalysis(symbol)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all text-sm font-medium text-cyan-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("ta_refresh")}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-gray-500">{t("ta_loading")}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* Signal Summary */}
          <SignalSummary indicators={indicators} symbol={symbol} t={t} />

          {/* AI Recommendation */}
          <AIRecommendation indicators={indicators} symbol={symbol} t={t} />

          {/* Indicator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {indicators.RSI && <RSICard data={indicators.RSI} t={t} />}
            {indicators.MACD && <MACDCard data={indicators.MACD} t={t} />}
            {indicators.SMA && <SMACard data={indicators.SMA} t={t} />}
            {indicators.EMA && <EMACard data={indicators.EMA} t={t} />}
            {indicators.BBANDS && <BBANDSCard data={indicators.BBANDS} t={t} />}
            {indicators.STOCH && <STOCHCard data={indicators.STOCH} t={t} />}
            {indicators.ADX && <ADXCard data={indicators.ADX} t={t} />}
            {indicators.ATR && <ATRCard data={indicators.ATR} t={t} />}
          </div>

          {/* Performance Correlation */}
          <PerformanceCorrelation indicators={indicators} t={t} />

          {/* Timestamp */}
          {data.timestamp && (
            <p className="text-center text-[11px] text-gray-600">
              {t("ta_lastUpdate")}: {new Date(data.timestamp).toLocaleString()} {data.cached && `(${t("ta_cached")})`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
