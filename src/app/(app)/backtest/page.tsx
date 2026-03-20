"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTrades, Trade } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import {
  FlaskConical, SlidersHorizontal, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Lightbulb, Zap, Target,
  ShieldCheck, Crosshair, BarChart3, ToggleLeft, ToggleRight,
  ChevronDown, Minus, Trophy,
} from "lucide-react";

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
    totalPnL: +totalPnL.toFixed(2), winRate: +winRate.toFixed(1), profitFactor: +profitFactor.toFixed(2),
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

// --- Generate Insights ---
function generateInsights(actual: Stats, simulated: Stats, config: SimConfig): string[] {
  const insights: string[] = [];
  const pnlDiff = simulated.totalPnL - actual.totalPnL;
  const pnlPct = actual.totalPnL !== 0 ? ((pnlDiff / Math.abs(actual.totalPnL)) * 100).toFixed(0) : "0";

  if (config.tpRR > 0 && pnlDiff !== 0) {
    insights.push(`En coupant à ${config.tpRR}R, tu aurais ${pnlDiff > 0 ? "gagné" : "perdu"} ${Math.abs(pnlDiff).toFixed(0)}€ ${pnlDiff > 0 ? "de plus" : "de moins"} (${pnlDiff > 0 ? "+" : ""}${pnlPct}%).`);
  }
  if (config.removeWorst > 0 && simulated.profitFactor !== actual.profitFactor) {
    insights.push(`Sans tes ${config.removeWorst} pires trades, ton profit factor passe de ${actual.profitFactor} à ${simulated.profitFactor}.`);
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

// --- Preset Scenarios ---
const PRESETS: { label: string; icon: React.ElementType; config: Partial<SimConfig> }[] = [
  { label: "Discipline parfaite", icon: ShieldCheck, config: { tpRR: 2, slModifier: -20, maxPerDay: 3 } },
  { label: "Sans revenge trading", icon: Target, config: { maxPerDay: 3 } },
  { label: "Sniper mode", icon: Crosshair, config: { tpRR: 3, maxPerDay: 2, removeWorst: 3 } },
  { label: "Best strategy only", icon: Trophy, config: {} }, // Filled dynamically
];

// --- Main Page ---
export default function BacktestPage() {
  const { trades, loading } = useTrades();
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);

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

  const simTrades = useMemo(() => simulateTrades(sortedTrades, config), [sortedTrades, config]);

  const actualStats = useMemo(() => computeStats(sortedTrades, 1), [sortedTrades]);
  const simStats = useMemo(() => computeStats(simTrades, config.sizeMultiplier), [simTrades, config.sizeMultiplier]);

  const actualEquity = useMemo(() => buildEquityCurve(sortedTrades, 1), [sortedTrades]);
  const simEquity = useMemo(() => buildEquityCurve(simTrades, config.sizeMultiplier), [simTrades, config.sizeMultiplier]);

  const insights = useMemo(() => generateInsights(actualStats, simStats, config), [actualStats, simStats, config]);

  const set = <K extends keyof SimConfig>(key: K, val: SimConfig[K]) => setConfig((c) => ({ ...c, [key]: val }));

  const applyPreset = (preset: Partial<SimConfig>) => {
    setConfig({ ...DEFAULT_CONFIG, ...preset });
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
          <FlaskConical className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>What If &mdash; Backtesting Simulator</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Simule des scénarios alternatifs sur tes trades réels</p>
        </div>
      </div>

      {/* Quick Scenarios */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const presetConfig = p.label === "Best strategy only" ? { ...p.config, strategyFilter: bestStrategy } : p.config;
          return (
            <button key={p.label} onClick={() => applyPreset(presetConfig)}
              className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:brightness-125 transition-all"
              style={{ color: "var(--text-secondary)" }}>
              <p.icon className="w-3.5 h-3.5 text-cyan-400" /> {p.label}
            </button>
          );
        })}
        <button onClick={() => setConfig(DEFAULT_CONFIG)}
          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:brightness-125 transition-all"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          Reset
        </button>
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
              format={(v) => v === 0 ? "Off" : `${v}R`} onChange={(v) => set("tpRR", v)} />

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
              <Lightbulb className="w-4 h-4 text-amber-400" /> Insights
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
              <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>Métrique</span>
              <span className="text-xs w-24 text-right" style={{ color: "var(--text-muted)" }}>Actuel</span>
              <span className="text-xs w-24 text-right font-semibold text-cyan-400">Simulé</span>
              <span className="text-xs w-20 text-right" style={{ color: "var(--text-muted)" }}>Delta</span>
            </div>
            <StatRow label="Total P&L" actual={actualStats.totalPnL} simulated={simStats.totalPnL} format={fmt} />
            <StatRow label="Win Rate" actual={actualStats.winRate} simulated={simStats.winRate} format={fmtPct} />
            <StatRow label="Profit Factor" actual={actualStats.profitFactor} simulated={simStats.profitFactor} format={fmtRatio} />
            <StatRow label="Max Drawdown" actual={actualStats.maxDrawdown} simulated={simStats.maxDrawdown} format={fmt} inverse />
            <StatRow label="Gain moyen" actual={actualStats.avgWin} simulated={simStats.avgWin} format={fmt} />
            <StatRow label="Perte moyenne" actual={actualStats.avgLoss} simulated={simStats.avgLoss} format={fmt} inverse />
            <StatRow label="Nombre de trades" actual={actualStats.totalTrades} simulated={simStats.totalTrades} format={fmtNum} />
            <StatRow label="Sharpe Ratio" actual={actualStats.sharpe} simulated={simStats.sharpe} format={fmtRatio} />

            {/* Summary banner */}
            <div className="mt-4 p-3 rounded-lg flex items-center justify-between"
              style={{ background: simStats.totalPnL >= actualStats.totalPnL ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Différence nette</span>
              <span className={`mono text-sm font-bold ${simStats.totalPnL >= actualStats.totalPnL ? "text-emerald-400" : "text-red-400"}`}>
                {(simStats.totalPnL - actualStats.totalPnL) >= 0 ? "+" : ""}{(simStats.totalPnL - actualStats.totalPnL).toFixed(2)}&euro;
              </span>
            </div>
          </div>

          {/* Equity Curve */}
          <EquityChart actual={actualEquity} simulated={simEquity} />
        </div>
      </div>
    </div>
  );
}
