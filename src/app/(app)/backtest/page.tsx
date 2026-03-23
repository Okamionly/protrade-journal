"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTrades, Trade } from "@/hooks/useTrades";

import {
  FlaskConical, SlidersHorizontal, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Lightbulb, Zap, Target,
  ShieldCheck, Crosshair, BarChart3, ToggleLeft, ToggleRight,
  ChevronDown, Minus, Trophy, Clock, Brain, Flame, Rocket,
  CalendarClock,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";

// --- Types ---
interface SimConfig {
  tpRR: number;
  slModifier: number;
  maxPerDay: number;
  removeLosing: boolean;
  strategyFilter: string;
  removeWorst: number;
  sizeMultiplier: number;
}

interface Stats {
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  sharpe: number;
}

const DEFAULT_CONFIG: SimConfig = {
  tpRR: 0, slModifier: 0, maxPerDay: 10, removeLosing: false,
  strategyFilter: "all", removeWorst: 0, sizeMultiplier: 1,
};

// --- Helpers ---
function computeStats(trades: Trade[], sizeMultiplier: number): Stats {
  if (trades.length === 0) return { totalPnL: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0, avgWin: 0, avgLoss: 0, totalTrades: 0, sharpe: 0 };
  const results = trades.map((t) => t.result * sizeMultiplier);
  const wins = results.filter((r) => r > 0);
  const losses = results.filter((r) => r < 0);
  const totalPnL = results.reduce((a, b) => a + b, 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  let peak = 0, maxDD = 0, cum = 0;
  for (const r of results) { cum += r; if (cum > peak) peak = cum; const dd = peak - cum; if (dd > maxDD) maxDD = dd; }
  const mean = totalPnL / results.length;
  const variance = results.length > 1 ? results.reduce((s, r) => s + (r - mean) ** 2, 0) / (results.length - 1) : 0;
  const sharpe = Math.sqrt(variance) > 0 ? (mean / Math.sqrt(variance)) * Math.sqrt(252) : 0;
  return {
    totalPnL: +totalPnL.toFixed(2), winRate: +winRate.toFixed(1), profitFactor: profitFactor === Infinity ? Infinity : isNaN(profitFactor) ? 0 : +profitFactor.toFixed(2),
    maxDrawdown: +maxDD.toFixed(2), avgWin: wins.length > 0 ? +(grossWins / wins.length).toFixed(2) : 0,
    avgLoss: losses.length > 0 ? +(grossLosses / losses.length).toFixed(2) : 0, totalTrades: trades.length, sharpe: +sharpe.toFixed(2),
  };
}

function simulateTrades(trades: Trade[], config: SimConfig): Trade[] {
  let filtered = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Strategy filter
  if (config.strategyFilter !== "all") {
    filtered = filtered.filter((t) => t.strategy === config.strategyFilter);
  }

  // Max per day
  if (config.maxPerDay < 10) {
    const dayCount: Record<string, number> = {};
    filtered = filtered.filter((t) => {
      const d = t.date?.slice(0, 10) || "";
      dayCount[d] = (dayCount[d] || 0) + 1;
      return dayCount[d] <= config.maxPerDay;
    });
  }

  // SL modifier: adjust result proportionally
  if (config.slModifier !== 0) {
    filtered = filtered.map((t) => {
      if (!t.sl || t.sl === 0) return t;
      const risk = Math.abs(t.entry - t.sl);
      const newRisk = risk * (1 + config.slModifier / 100);
      const newSl = t.direction === "LONG" ? t.entry - newRisk : t.entry + newRisk;
      // If trade would have been stopped out with tighter SL, result becomes the loss
      if (config.slModifier < 0 && t.result < 0) {
        const ratio = newRisk / (risk || 1);
        return { ...t, sl: newSl, result: t.result * ratio };
      }
      return { ...t, sl: newSl };
    });
  }

  // TP at X R:R — cap winning trades
  if (config.tpRR > 0) {
    filtered = filtered.map((t) => {
      const risk = Math.abs(t.entry - t.sl);
      if (risk === 0) return t;
      const maxReward = risk * config.tpRR;
      if (t.result > 0 && t.result > maxReward * t.lots) {
        return { ...t, result: +(maxReward * t.lots).toFixed(2) };
      }
      return t;
    });
  }

  // Remove losing days
  if (config.removeLosing) {
    const dayPnl: Record<string, number> = {};
    filtered.forEach((t) => { const d = t.date?.slice(0, 10) || ""; dayPnl[d] = (dayPnl[d] || 0) + t.result; });
    filtered = filtered.filter((t) => (dayPnl[t.date?.slice(0, 10) || ""] || 0) >= 0);
  }

  // Remove worst N trades
  if (config.removeWorst > 0) {
    const sorted = [...filtered].sort((a, b) => a.result - b.result);
    const worstIds = new Set(sorted.slice(0, config.removeWorst).map((t) => t.id));
    filtered = filtered.filter((t) => !worstIds.has(t.id));
  }

  return filtered;
}

function buildEquityCurve(trades: Trade[], sizeMultiplier: number): number[] {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let cum = 0;
  return sorted.map((t) => { cum += t.result * sizeMultiplier; return +cum.toFixed(2); });
}

// --- SVG Equity Chart ---
function EquityChart({ actual, simulated }: { actual: number[]; simulated: number[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "oled";
  const all = [...actual, ...simulated];
  if (all.length === 0) return <div className="h-64 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>Aucun trade</div>;
  const maxLen = Math.max(actual.length, simulated.length);
  const minY = Math.min(...all, 0);
  const maxY = Math.max(...all, 0);
  const range = maxY - minY || 1;
  const pad = 40;
  const w = 600, h = 260;
  const toX = (i: number) => pad + (i / (maxLen - 1 || 1)) * (w - pad * 2);
  const toY = (v: number) => h - pad - ((v - minY) / range) * (h - pad * 2);

  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // High water mark
  const hwm: number[] = [];
  let peak = 0;
  for (const v of simulated) { if (v > peak) peak = v; hwm.push(peak); }

  const gridStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const zeroStroke = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const legendBg = isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.85)";

  return (
    <div className="glass p-5 rounded-xl">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <BarChart3 className="w-4 h-4 text-cyan-400" /> Courbe d&apos;Equity
      </h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = h - pad - f * (h - pad * 2);
          const val = minY + f * range;
          return (
            <g key={f}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke={gridStroke} strokeWidth="0.5" />
              <text x={pad - 5} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{val.toFixed(0)}</text>
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={pad} y1={toY(0)} x2={w - pad} y2={toY(0)} stroke={zeroStroke} strokeWidth="0.5" strokeDasharray="4,3" />
        {/* HWM */}
        {hwm.length > 1 && <path d={makePath(hwm)} fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="1" strokeDasharray="3,3" />}
        {/* Actual */}
        {actual.length > 1 && <path d={makePath(actual)} fill="none" stroke={isDark ? "rgba(156,163,175,0.6)" : "rgba(100,116,139,0.7)"} strokeWidth="1.5" />}
        {/* Simulated */}
        {simulated.length > 1 && <path d={makePath(simulated)} fill="none" stroke="#06b6d4" strokeWidth="2" />}
        {/* Legend */}
        <rect x={w - 170} y={8} width={155} height={36} rx={6} fill={legendBg} stroke="var(--border)" strokeWidth="0.5" />
        <line x1={w - 160} y1={20} x2={w - 140} y2={20} stroke={isDark ? "rgba(156,163,175,0.6)" : "rgba(100,116,139,0.7)"} strokeWidth="1.5" />
        <text x={w - 135} y={23} fontSize="9" fill="var(--text-secondary)">Actuel</text>
        <line x1={w - 160} y1={35} x2={w - 140} y2={35} stroke="#06b6d4" strokeWidth="2" />
        <text x={w - 135} y={38} fontSize="9" fill="var(--text-secondary)">Simulé</text>
      </svg>
    </div>
  );
}

// --- Slider Component ---
function Slider({ label, icon: Icon, value, min, max, step, format, onChange }: {
  label: string; icon: React.ElementType; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <Icon className="w-3.5 h-3.5 text-cyan-400" /> {label}
        </span>
        <span className="mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #06b6d4 ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%)` }}
      />
    </div>
  );
}

// --- Stat Row ---
function StatRow({ label, actual, simulated, format, inverse }: {
  label: string; actual: number; simulated: number; format: (v: number) => string; inverse?: boolean;
}) {
  const isBetter = inverse ? simulated < actual : simulated > actual;
  const isWorse = inverse ? simulated > actual : simulated < actual;
  const delta = actual !== 0 ? ((simulated - actual) / Math.abs(actual)) * 100 : 0;
  return (
    <div className="flex items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="mono text-xs w-24 text-right" style={{ color: "var(--text-muted)" }}>{format(actual)}</span>
      <span className={`mono text-xs w-24 text-right font-semibold ${isBetter ? "text-emerald-400" : isWorse ? "text-red-400" : ""}`}
        style={!isBetter && !isWorse ? { color: "var(--text-primary)" } : undefined}>
        {format(simulated)}
      </span>
      <span className="mono text-xs w-20 text-right flex items-center justify-end gap-0.5">
        {delta !== 0 && !isNaN(delta) && isFinite(delta) && (
          <>
            {isBetter ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
            <span className={isBetter ? "text-emerald-400" : "text-red-400"}>{Math.abs(delta).toFixed(1)}%</span>
          </>
        )}
        {(delta === 0 || isNaN(delta) || !isFinite(delta)) && <Minus className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
      </span>
    </div>
  );
}

// --- Confidence Score ---
function getConfidenceInfo(tradeCount: number): { label: string; pct: number; color: string; bgColor: string } {
  if (tradeCount >= 100) return { label: "backtestReliabilityExcellent", pct: 95, color: "#22c55e", bgColor: "rgba(34,197,94,0.12)" };
  if (tradeCount >= 50) return { label: "backtestReliabilityGood", pct: 82, color: "#16a34a", bgColor: "rgba(22,163,74,0.10)" };
  if (tradeCount >= 30) return { label: "backtestReliabilityModerate", pct: 68, color: "#f59e0b", bgColor: "rgba(245,158,11,0.10)" };
  if (tradeCount >= 10) return { label: "backtestReliabilityLow", pct: 40 + (tradeCount - 10) * (20 / 20), color: "#f97316", bgColor: "rgba(249,115,22,0.10)" };
  return { label: "backtestReliabilityVeryLow", pct: Math.max(5, tradeCount * 2), color: "#ef4444", bgColor: "rgba(239,68,68,0.10)" };
}

function ConfidenceScore({ tradeCount }: { tradeCount: number }) {
  const { t } = useTranslation();
  const { label: labelKey, pct, color, bgColor } = getConfidenceInfo(tradeCount);
  const label = t(labelKey);
  const showWarning = tradeCount < 30;

  return (
    <div className="glass p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <ShieldCheck className="w-4 h-4" style={{ color }} /> Score de Confiance
        </h3>
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{ color, background: bgColor }}
        >
          {label} — {Math.round(pct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Basé sur {tradeCount} trade{tradeCount !== 1 ? "s" : ""} simulé{tradeCount !== 1 ? "s" : ""}
        </span>
        <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
          {Math.round(pct)}% / 100%
        </span>
      </div>

      {showWarning && (
        <div
          className="flex items-start gap-2 text-xs p-2.5 rounded-lg leading-relaxed"
          style={{ background: bgColor, color }}
        >
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Attention : résultats basés sur seulement {tradeCount} trade{tradeCount !== 1 ? "s" : ""}.
            Augmentez l&apos;échantillon pour des résultats fiables.
          </span>
        </div>
      )}
    </div>
  );
}

// --- Generate Insights ---
function generateInsights(actual: Stats, simulated: Stats, config: SimConfig): string[] {
  const insights: string[] = [];
  const pnlDiff = simulated.totalPnL - actual.totalPnL;
  const pnlPct = actual.totalPnL !== 0 ? ((pnlDiff / Math.abs(actual.totalPnL)) * 100).toFixed(0) : "0";

  if (config.tpRR > 0 && pnlDiff !== 0) {
    insights.push(`En coupant à ${config.tpRR}R, tu aurais ${pnlDiff > 0 ? "gagné" : "perdu"} ${Math.abs(pnlDiff).toFixed(0)}€ ${pnlDiff > 0 ? "de plus" : "de moins"} (${pnlDiff > 0 ? "+" : ""}${pnlPct}%).`);
  }
  if (config.removeWorst > 0 && simulated.profitFactor !== actual.profitFactor) {
    const fmtPF = (pf: number) => pf === Infinity ? "∞" : isNaN(pf) ? "0" : pf.toFixed(2);
    insights.push(`Sans tes ${config.removeWorst} pires trades, ton profit factor passe de ${fmtPF(actual.profitFactor)} à ${fmtPF(simulated.profitFactor)}.`);
  }
  if (config.removeLosing && simulated.winRate !== actual.winRate) {
    insights.push(`Sans les jours rouges, ton win rate passe de ${actual.winRate}% à ${simulated.winRate}%.`);
  }
  if (config.maxPerDay < 10) {
    const tradeDiff = actual.totalTrades - simulated.totalTrades;
    if (tradeDiff > 0) insights.push(`Limiter à ${config.maxPerDay} trades/jour supprime ${tradeDiff} trades (souvent du revenge trading).`);
  }
  if (config.strategyFilter !== "all") {
    insights.push(`En ne gardant que "${config.strategyFilter}", tu aurais un Sharpe de ${simulated.sharpe} vs ${actual.sharpe}.`);
  }
  if (simulated.maxDrawdown < actual.maxDrawdown) {
    const ddImprove = ((actual.maxDrawdown - simulated.maxDrawdown) / actual.maxDrawdown * 100).toFixed(0);
    insights.push(`Le drawdown max diminue de ${ddImprove}%, passant de ${actual.maxDrawdown}€ à ${simulated.maxDrawdown}€.`);
  }
  if (config.sizeMultiplier !== 1) {
    insights.push(`Avec un multiplicateur de ${config.sizeMultiplier}x, le P&L passe de ${actual.totalPnL}€ à ${simulated.totalPnL}€.`);
  }
  if (insights.length === 0) {
    insights.push("Ajuste les paramètres pour découvrir des scénarios alternatifs.");
  }
  return insights.slice(0, 5);
}

// --- Scenario Preset Types ---
type ScenarioPresetId = "sniper" | "discipline" | "best-strategy" | "no-emotions" | "optimal-hours";

interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  icon: React.ElementType;
  description: string;
  /** Custom filter applied BEFORE the normal SimConfig pipeline */
  filterFn?: (trades: Trade[], allTrades: Trade[]) => Trade[];
  config: Partial<SimConfig>;
}

const NEGATIVE_EMOTIONS = ["stressé", "frustré", "tilt", "peur", "colère", "anxieux", "ennui"];

function isNegativeEmotion(emotion: string | null): boolean {
  if (!emotion) return false;
  return NEGATIVE_EMOTIONS.some((e) => emotion.toLowerCase().includes(e));
}

/** Find trades that are "revenge" — taken within 15 min of a losing trade */
function findRevengeTrades(trades: Trade[]): Set<string> {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const revengeIds = new Set<string>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.result < 0) {
      const diffMs = new Date(curr.date).getTime() - new Date(prev.date).getTime();
      if (diffMs >= 0 && diffMs <= 15 * 60 * 1000) {
        revengeIds.add(curr.id);
      }
    }
  }
  return revengeIds;
}

/** Find the best 4 hours based on total P&L */
function findBestHours(trades: Trade[], count: number = 4): number[] {
  const hourPnl: Record<number, number> = {};
  trades.forEach((t) => {
    const h = new Date(t.date).getHours();
    hourPnl[h] = (hourPnl[h] || 0) + t.result;
  });
  return Object.entries(hourPnl)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([h]) => +h);
}

/** Compute R:R for a trade */
function getTradeRR(t: Trade): number {
  const risk = Math.abs(t.entry - t.sl);
  if (risk === 0 || t.result <= 0) return 0;
  return t.result / (risk * t.lots || 1);
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "sniper",
    label: "backtestSniperMode",
    icon: Crosshair,
    description: "backtestSniperDesc",
    filterFn: (trades) => trades.filter((t) => t.result <= 0 || getTradeRR(t) >= 2),
    config: {},
  },
  {
    id: "discipline",
    label: "backtestDiscipline",
    icon: Flame,
    description: "backtestDisciplineDesc",
    filterFn: (trades) => {
      const revengeIds = findRevengeTrades(trades);
      return trades.filter((t) => !revengeIds.has(t.id));
    },
    config: {},
  },
  {
    id: "best-strategy",
    label: "backtestBestStrategy",
    icon: Trophy,
    description: "backtestBestStrategyDesc",
    config: {}, // strategyFilter set dynamically
  },
  {
    id: "no-emotions",
    label: "backtestNoEmotions",
    icon: Brain,
    description: "backtestNoEmotionsDesc",
    filterFn: (trades) => trades.filter((t) => !isNegativeEmotion(t.emotion)),
    config: {},
  },
  {
    id: "optimal-hours",
    label: "backtestOptimalHours",
    icon: CalendarClock,
    description: "backtestOptimalHoursDesc",
    filterFn: (trades, allTrades) => {
      const bestHours = findBestHours(allTrades, 4);
      return trades.filter((t) => bestHours.includes(new Date(t.date).getHours()));
    },
    config: {},
  },
];

// --- Impact Summary Component ---
function ImpactSummary({
  actualStats,
  simStats,
  removedCount,
  totalCount,
}: {
  actualStats: Stats;
  simStats: Stats;
  removedCount: number;
  totalCount: number;
}) {
  const pnlDiff = simStats.totalPnL - actualStats.totalPnL;
  const pnlPct = actualStats.totalPnL !== 0 ? ((pnlDiff / Math.abs(actualStats.totalPnL)) * 100) : 0;
  const wrDiff = simStats.winRate - actualStats.winRate;

  const items: { label: string; value: string; isBiggest: boolean }[] = [];

  const pnlStr = `P&L: ${actualStats.totalPnL >= 0 ? "+" : ""}${actualStats.totalPnL.toFixed(0)}€ → ${simStats.totalPnL >= 0 ? "+" : ""}${simStats.totalPnL.toFixed(0)}€ (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(0)}%)`;
  const wrStr = `Win Rate: ${actualStats.winRate.toFixed(0)}% → ${simStats.winRate.toFixed(0)}% (${wrDiff >= 0 ? "+" : ""}${wrDiff.toFixed(0)}pp)`;
  const removedStr = `Trades supprimés: ${removedCount} (sur ${totalCount})`;

  // Determine biggest improvement
  const improvements = [
    { key: "pnl", magnitude: Math.abs(pnlPct) },
    { key: "wr", magnitude: Math.abs(wrDiff) },
  ];
  const biggest = improvements.sort((a, b) => b.magnitude - a.magnitude)[0].key;

  items.push({ label: pnlStr, value: "pnl", isBiggest: biggest === "pnl" && pnlDiff > 0 });
  items.push({ label: wrStr, value: "wr", isBiggest: biggest === "wr" && wrDiff > 0 });
  items.push({ label: removedStr, value: "removed", isBiggest: false });

  return (
    <div className="glass p-4 rounded-xl space-y-2">
      <h3 className="text-xs font-semibold flex items-center gap-2 mb-2" style={{ color: "var(--text-primary)" }}>
        <Rocket className="w-4 h-4 text-cyan-400" /> Impact du Scénario
      </h3>
      {items.map((item) => (
        <div
          key={item.value}
          className="flex items-center gap-2 text-xs mono py-1.5 px-3 rounded-lg"
          style={{
            color: item.isBiggest ? "#22c55e" : "var(--text-secondary)",
            background: item.isBiggest ? "rgba(34,197,94,0.1)" : "transparent",
            fontWeight: item.isBiggest ? 600 : 400,
          }}
        >
          {item.isBiggest && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {item.label}
        </div>
      ))}
    </div>
  );
}

// --- Projection Component ---
function ProjectionPanel({
  simStats,
  actualStats,
  trades,
}: {
  simStats: Stats;
  actualStats: Stats;
  trades: Trade[];
}) {
  // Calculate the time span of trades in months
  if (trades.length < 2) return null;
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const months = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

  const monthlyPnl = simStats.totalPnL / months;
  const projectedAnnual = monthlyPnl * 12;
  const target = 10000;
  const monthsToTarget = monthlyPnl > 0 ? target / monthlyPnl : Infinity;

  // Only show if scenario is better
  if (simStats.totalPnL <= actualStats.totalPnL) return null;

  return (
    <div className="glass p-4 rounded-xl space-y-3">
      <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <Clock className="w-4 h-4 text-amber-400" /> Si j&apos;avais... Projections
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs py-1.5">
          <span style={{ color: "var(--text-secondary)" }}>P&L mensuel simulé</span>
          <span className="mono font-semibold text-emerald-400">
            {monthlyPnl >= 0 ? "+" : ""}{monthlyPnl.toFixed(0)}€/mois
          </span>
        </div>
        <div className="flex items-center justify-between text-xs py-1.5">
          <span style={{ color: "var(--text-secondary)" }}>A ce rythme sur 12 mois</span>
          <span className="mono font-semibold text-emerald-400">
            {projectedAnnual >= 0 ? "+" : ""}{projectedAnnual.toFixed(0)}€
          </span>
        </div>
        {isFinite(monthsToTarget) && monthsToTarget > 0 && (
          <div className="flex items-center justify-between text-xs py-1.5">
            <span style={{ color: "var(--text-secondary)" }}>Objectif {target.toLocaleString("fr-FR")}€ atteint en</span>
            <span className="mono font-semibold text-amber-400">
              {monthsToTarget.toFixed(1)} mois
            </span>
          </div>
        )}
      </div>
      <div className="text-xs p-2.5 rounded-lg leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", color: "var(--text-muted)" }}>
        Projection linéaire basée sur le P&L simulé. Les résultats passés ne garantissent pas les performances futures.
      </div>
    </div>
  );
}

// --- Main Page ---
export default function BacktestPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [activeScenario, setActiveScenario] = useState<ScenarioPresetId | null>(null);

  const strategies = useMemo(() => [...new Set(trades.map((t) => t.strategy).filter(Boolean))].sort(), [trades]);

  // Find best strategy for "Best strategy only" preset
  const bestStrategy = useMemo(() => {
    const stratPnl: Record<string, number> = {};
    trades.forEach((t) => { if (t.strategy) stratPnl[t.strategy] = (stratPnl[t.strategy] || 0) + t.result; });
    const entries = Object.entries(stratPnl);
    return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : "all";
  }, [trades]);

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [trades]
  );

  // Apply scenario pre-filter
  const scenarioFilteredTrades = useMemo(() => {
    if (!activeScenario) return sortedTrades;
    const preset = SCENARIO_PRESETS.find((p) => p.id === activeScenario);
    if (!preset?.filterFn) return sortedTrades;
    return preset.filterFn(sortedTrades, sortedTrades);
  }, [sortedTrades, activeScenario]);

  const simTrades = useMemo(() => simulateTrades(scenarioFilteredTrades, config), [scenarioFilteredTrades, config]);

  const actualStats = useMemo(() => computeStats(sortedTrades, 1), [sortedTrades]);
  const simStats = useMemo(() => computeStats(simTrades, config.sizeMultiplier), [simTrades, config.sizeMultiplier]);

  const actualEquity = useMemo(() => buildEquityCurve(sortedTrades, 1), [sortedTrades]);
  const simEquity = useMemo(() => buildEquityCurve(simTrades, config.sizeMultiplier), [simTrades, config.sizeMultiplier]);

  const insights = useMemo(() => generateInsights(actualStats, simStats, config), [actualStats, simStats, config]);

  const removedCount = actualStats.totalTrades - simStats.totalTrades;

  const set = <K extends keyof SimConfig>(key: K, val: SimConfig[K]) => setConfig((c) => ({ ...c, [key]: val }));

  const applyScenario = (preset: ScenarioPreset) => {
    const isActive = activeScenario === preset.id;
    if (isActive) {
      // Toggle off
      setActiveScenario(null);
      setConfig(DEFAULT_CONFIG);
      return;
    }
    setActiveScenario(preset.id);
    const dynamicConfig = { ...preset.config };
    if (preset.id === "best-strategy") {
      dynamicConfig.strategyFilter = bestStrategy;
    }
    setConfig({ ...DEFAULT_CONFIG, ...dynamicConfig });
  };

  const resetAll = () => {
    setActiveScenario(null);
    setConfig(DEFAULT_CONFIG);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}€`;
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const fmtNum = (v: number) => `${v}`;
  const fmtRatio = (v: number) => (isFinite(v) ? v.toFixed(2) : "\∞");

  // ---- AI Backtest Insight ----
  const aiBacktestInsight = useMemo(() => {
    if (actualStats.totalTrades < 5) return null;

    const pnlDiff = simStats.totalPnL - actualStats.totalPnL;
    const pctImprovement = actualStats.totalPnL !== 0
      ? ((pnlDiff) / Math.abs(actualStats.totalPnL)) * 100
      : 0;

    // Annualized projection (12 months)
    const tradeDays = sortedTrades.length > 1
      ? (new Date(sortedTrades[sortedTrades.length - 1].date).getTime() - new Date(sortedTrades[0].date).getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    const months = Math.max(tradeDays / 30, 1);
    const annualizedImprovement = pnlDiff > 0 ? (pnlDiff / months) * 12 : 0;
    const annualizedPct = actualStats.totalPnL !== 0
      ? ((annualizedImprovement) / Math.abs(actualStats.totalPnL)) * 100
      : 0;

    // Find biggest impact factor
    let biggestImpact = "la configuration actuelle";
    if (config.removeLosing) biggestImpact = "la suppression des revenge trades";
    else if (config.removeWorst > 0) biggestImpact = `la suppression des ${config.removeWorst} pires trades`;
    else if (config.maxPerDay < 10) biggestImpact = `la limite a ${config.maxPerDay} trades/jour`;
    else if (config.strategyFilter !== "all") biggestImpact = `le filtrage par strategie (${config.strategyFilter})`;
    else if (config.tpRR > 0) biggestImpact = `l'ajustement du TP a ${config.tpRR}R`;

    return {
      pctImprovement: Math.round(pctImprovement),
      annualizedPct: Math.round(annualizedPct),
      biggestImpact,
      isPositive: pnlDiff > 0,
    };
  }, [actualStats, simStats, sortedTrades, config]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
          <FlaskConical className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Simulateur What-If</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Simule des scénarios alternatifs sur tes trades réels</p>
        </div>
      </div>

      {/* Scenario Presets */}
      <div>
        <h2 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Zap className="w-3.5 h-3.5" /> Scénarios rapides
        </h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_PRESETS.map((p) => {
            const isActive = activeScenario === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyScenario(p)}
                title={t(p.description)}
                className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                style={{
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  background: isActive ? "rgba(6,182,212,0.25)" : "var(--bg-secondary)",
                  border: isActive ? "1px solid rgba(6,182,212,0.5)" : "1px solid var(--border)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <p.icon className="w-3.5 h-3.5" style={{ color: isActive ? "#06b6d4" : "var(--text-muted)" }} />
                {t(p.label)}
              </button>
            );
          })}
          <button
            onClick={resetAll}
            className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:brightness-125 transition-all"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Main Layout: Controls (left) + Results (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass p-5 rounded-xl">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" /> Paramètres de Simulation
            </h2>

            <Slider label="Take Profit à X R:R" icon={Target} value={config.tpRR} min={0} max={5} step={0.5}
              format={(v) => v === 0 ? "Désactivé" : `${v}R`} onChange={(v) => set("tpRR", v)} />

            <Slider label="Modificateur Stop Loss" icon={ShieldCheck} value={config.slModifier} min={-50} max={50} step={5}
              format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={(v) => set("slModifier", v)} />

            <Slider label="Max trades / jour" icon={Zap} value={config.maxPerDay} min={1} max={10} step={1}
              format={(v) => `${v}`} onChange={(v) => set("maxPerDay", v)} />

            <Slider label="Retirer les N pires trades" icon={TrendingDown} value={config.removeWorst} min={0} max={10} step={1}
              format={(v) => `${v}`} onChange={(v) => set("removeWorst", v)} />

            <Slider label="Multiplicateur de position" icon={TrendingUp} value={config.sizeMultiplier} min={0.5} max={3} step={0.25}
              format={(v) => `${v}x`} onChange={(v) => set("sizeMultiplier", v)} />

            {/* Toggle: Remove losing days */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <Minus className="w-3.5 h-3.5 text-cyan-400" /> Retirer jours perdants
              </span>
              <button onClick={() => set("removeLosing", !config.removeLosing)} className="transition-colors">
                {config.removeLosing
                  ? <ToggleRight className="w-7 h-7 text-cyan-400" />
                  : <ToggleLeft className="w-7 h-7" style={{ color: "var(--text-muted)" }} />}
              </button>
            </div>

            {/* Strategy filter */}
            <div className="mt-2">
              <span className="text-xs flex items-center gap-1.5 mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> Stratégie uniquement
              </span>
              <select value={config.strategyFilter} onChange={(e) => set("strategyFilter", e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 glass appearance-none cursor-pointer"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                <option value="all">Toutes les stratégies</option>
                {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Insights */}
          <div className="glass p-5 rounded-xl">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Lightbulb className="w-4 h-4 text-amber-400" /> Analyses
            </h2>
            <div className="space-y-2">
              {insights.map((text, i) => (
                <div key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <span className="text-amber-400 mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Comparison Panel */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Comparaison des Résultats
              </h2>
            </div>
            {/* Column headers */}
            <div className="flex items-center pb-2 border-b mb-1" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>{t("backtestMetric")}</span>
              <span className="text-xs w-24 text-right" style={{ color: "var(--text-muted)" }}>{t("backtestActual")}</span>
              <span className="text-xs w-24 text-right font-semibold text-cyan-400">{t("backtestSimulated")}</span>
              <span className="text-xs w-20 text-right" style={{ color: "var(--text-muted)" }}>{t("backtestDifference")}</span>
            </div>
            <StatRow label={t("backtestTotalPnl")} actual={actualStats.totalPnL} simulated={simStats.totalPnL} format={fmt} />
            <StatRow label={t("backtestWinRate")} actual={actualStats.winRate} simulated={simStats.winRate} format={fmtPct} />
            <StatRow label={t("backtestProfitFactor")} actual={actualStats.profitFactor} simulated={simStats.profitFactor} format={fmtRatio} />
            <StatRow label={t("backtestMaxDrawdown")} actual={actualStats.maxDrawdown} simulated={simStats.maxDrawdown} format={fmt} inverse />
            <StatRow label={t("backtestAvgWin")} actual={actualStats.avgWin} simulated={simStats.avgWin} format={fmt} />
            <StatRow label={t("backtestAvgLoss")} actual={actualStats.avgLoss} simulated={simStats.avgLoss} format={fmt} inverse />
            <StatRow label={t("backtestTradeCount")} actual={actualStats.totalTrades} simulated={simStats.totalTrades} format={fmtNum} />
            <StatRow label={t("backtestSharpeRatio")} actual={actualStats.sharpe} simulated={simStats.sharpe} format={fmtRatio} />

            {/* Summary banner */}
            <div className="mt-4 p-3 rounded-lg flex items-center justify-between"
              style={{ background: simStats.totalPnL >= actualStats.totalPnL ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("backtestNetDifference")}</span>
              <span className={`mono text-sm font-bold ${simStats.totalPnL >= actualStats.totalPnL ? "text-emerald-400" : "text-red-400"}`}>
                {(simStats.totalPnL - actualStats.totalPnL) >= 0 ? "+" : ""}{(simStats.totalPnL - actualStats.totalPnL).toFixed(2)}&euro;
              </span>
            </div>
          </div>

          {/* Impact Summary — shown when a scenario is active or config differs from default */}
          {(activeScenario || removedCount > 0 || simStats.totalPnL !== actualStats.totalPnL) && (
            <ImpactSummary
              actualStats={actualStats}
              simStats={simStats}
              removedCount={removedCount}
              totalCount={actualStats.totalTrades}
            />
          )}

          {/* Projections — shown when simulation is better */}
          <ProjectionPanel
            simStats={simStats}
            actualStats={actualStats}
            trades={sortedTrades}
          />

          {/* Confidence Score */}
          <ConfidenceScore tradeCount={simStats.totalTrades} />

          {/* ====== AI Backtest Insight ====== */}
          {aiBacktestInsight && aiBacktestInsight.isPositive && (
            <div className="glass rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]" style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #818cf8 100%)",
              }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                    <Brain className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Insight IA Backtest</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <Rocket className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      Ce scenario ameliorerait votre P&amp;L de <strong>{aiBacktestInsight.annualizedPct}%</strong> sur 12 mois
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <Target className="w-4 h-4 mt-0.5 text-violet-400 flex-shrink-0" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      Impact principal : <strong>{aiBacktestInsight.biggestImpact}</strong> a le plus grand effet
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Equity Curve */}
          <EquityChart actual={actualEquity} simulated={simEquity} />
        </div>
      </div>
    </div>
  );
}
