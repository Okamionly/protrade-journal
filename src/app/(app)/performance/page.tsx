"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import {
  Trophy, TrendingUp, TrendingDown, Target, Zap, Shield, BarChart3,
  Clock, Activity, Waves, Users, Award, Star, Flame, Lock,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, Lightbulb,
  Medal, ChevronRight
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import MilestonesTimeline from "@/components/MilestonesTimeline";

/* ═══════════════════════════════════════════════════════════
   Helper: Score Gauge (SVG donut arc)
   ═══════════════════════════════════════════════════════════ */
function ScoreGauge({ score, label, size = "sm" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#0ea5e9";
    if (s >= 40) return "#f59e0b";
    return "#ef4444";
  };
  const color = getColor(score);
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animatedScore / 100) * circumference;
  const isLg = size === "lg";

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${isLg ? "w-48 h-48" : "w-28 h-28"}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={isLg ? 10 : 8} />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={isLg ? 10 : 8} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold mono ${isLg ? "text-5xl" : "text-2xl"}`} style={{ color }}>{animatedScore}</span>
          {isLg && <span className="text-xs text-[--text-secondary]">/ 100</span>}
        </div>
      </div>
      <span className="text-xs text-[--text-secondary] mt-2">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Helper: Progress bar for category scores
   ═══════════════════════════════════════════════════════════ */
function CategoryBar({ label, score, icon: Icon, details }: {
  label: string; score: number; icon: React.ElementType; details: string;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    // Small delay so it animates visibly after mount
    const timer = setTimeout(() => setBarWidth(Math.max(score, 2)), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return { bar: "bg-emerald-500/70", text: "text-emerald-400" };
    if (s >= 60) return { bar: "bg-sky-500/70", text: "text-sky-400" };
    if (s >= 40) return { bar: "bg-amber-500/70", text: "text-amber-400" };
    return { bar: "bg-rose-500/70", text: "text-rose-400" };
  };
  const colors = getColor(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors.text}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-xs sm:text-sm font-bold mono whitespace-nowrap ${colors.text}`}>{score}/100</span>
      </div>
      <div className="relative h-2.5 rounded-full" style={{ background: "var(--bg-secondary)" }}>
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bar}`}
          style={{ width: `${barWidth}%` }} />
      </div>
      <p className="text-[10px] text-[--text-muted]">{details}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Helper: Rank badge
   ═══════════════════════════════════════════════════════════ */
function getRankBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: "Diamond", color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-400/30" };
  if (score >= 75) return { label: "Gold", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" };
  if (score >= 60) return { label: "Silver", color: "text-[--text-secondary]", bg: "bg-gray-500/15 border-gray-400/30" };
  if (score >= 40) return { label: "Bronze", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" };
  return { label: "beginner", color: "text-[--text-muted]", bg: "bg-gray-600/15 border-gray-600/30" };
}

/* ═══════════════════════════════════════════════════════════
   SVG Line Chart: Score trend over last N trades
   ═══════════════════════════════════════════════════════════ */
function ScoreTrendChart({ dataPoints }: { dataPoints: number[] }) {
  const { t } = useTranslation();
  if (dataPoints.length < 2) return <p className="text-sm text-[--text-muted] text-center py-8">{t("notEnoughTrend")}</p>;
  const W = 600, H = 200, PX = 40, PY = 20;
  const min = Math.min(...dataPoints), max = Math.max(...dataPoints);
  const range = max - min || 1;
  const pts = dataPoints.map((v, i) => ({
    x: PX + (i / (dataPoints.length - 1)) * (W - PX * 2),
    y: PY + (1 - (v - min) / range) * (H - PY * 2),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const gradientId = "score-trend-grad";
  const areaD = `${pathD} L${pts[pts.length - 1].x},${H - PY} L${pts[0].x},${H - PY} Z`;
  const ticks = 5;
  const yLabels = Array.from({ length: ticks }, (_, i) => Math.round(min + (range * i) / (ticks - 1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yLabels.map((lbl, i) => {
        const y = PY + (1 - (lbl - min) / range) * (H - PY * 2);
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
            <text x={PX - 6} y={y + 4} textAnchor="end" className="mono" fill="var(--text-muted)" fontSize="10">{lbl}</text>
          </g>
        );
      })}
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0ea5e9" stroke="var(--bg-primary)" strokeWidth="1.5" />
      ))}
      {[0, Math.floor(pts.length / 2), pts.length - 1].map((idx) => (
        <text key={idx} x={pts[idx].x} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9" className="mono">
          #{idx + 1}
        </text>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SVG Area Chart: Underwater (drawdown) plot
   ═══════════════════════════════════════════════════════════ */
function UnderwaterChart({ drawdowns }: { drawdowns: number[] }) {
  const { t } = useTranslation();
  if (drawdowns.length < 2) return <p className="text-sm text-[--text-muted] text-center py-8">{t("notEnoughDrawdown")}</p>;
  const W = 600, H = 160, PX = 40, PY = 16;
  const rawMaxDD = Math.max(...drawdowns.map(Math.abs));
  if (rawMaxDD === 0) return <p className="text-sm text-emerald-400 text-center py-8">{t("perfPerfectDD")}</p>;
  const maxDD = rawMaxDD;
  const pts = drawdowns.map((v, i) => ({
    x: PX + (i / (drawdowns.length - 1)) * (W - PX * 2),
    y: PY + (Math.abs(v) / maxDD) * (H - PY * 2),
  }));
  const zeroY = PY;
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `M${pts[0].x},${zeroY} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${zeroY} Z`;
  const ticks = 4;
  const yLabels = Array.from({ length: ticks }, (_, i) => -Math.round((maxDD * i) / (ticks - 1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="underwater-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <line x1={PX} y1={zeroY} x2={W - PX} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {yLabels.map((lbl, i) => {
        const y = PY + (Math.abs(lbl) / maxDD) * (H - PY * 2);
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <text x={PX - 6} y={y + 4} textAnchor="end" className="mono" fill="var(--text-muted)" fontSize="9">{lbl === 0 ? "0" : `${lbl}`}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#underwater-grad)" />
      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Benchmark comparison bar
   ═══════════════════════════════════════════════════════════ */
function BenchmarkBar({ label, userValue, medianValue, unit, higherIsBetter = true }: {
  label: string; userValue: number; medianValue: number; unit: string; higherIsBetter?: boolean;
}) {
  const { t } = useTranslation();
  const fmtVal = (v: number) => v === Infinity ? "∞" : isNaN(v) ? "0" : v.toFixed(unit === "%" ? 1 : 2);
  const cappedUser = userValue === Infinity ? medianValue * 5 : isNaN(userValue) ? 0 : userValue;
  const maxVal = Math.max(cappedUser, medianValue, 0.01) * 1.2;
  const userPct = Math.max(0, Math.min((cappedUser / maxVal) * 100, 100));
  const medianPct = Math.max(0, Math.min((medianValue / maxVal) * 100, 100));
  const isBetter = higherIsBetter ? userValue >= medianValue : userValue <= medianValue;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[--text-secondary]">{label}</span>
        <span className={`text-xs font-semibold mono ${isBetter ? "text-emerald-400" : "text-rose-400"}`}>
          {fmtVal(userValue)}{unit}
        </span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 h-full w-0.5 bg-amber-400 z-10 rounded" style={{ left: `${medianPct}%` }} title={`Median: ${medianValue}${unit}`} />
        <div className={`h-full rounded-full transition-all duration-700 ${isBetter ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
          style={{ width: `${userPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-[--text-muted]">
        <span>{t("benchmarkYou")}: {fmtVal(userValue)}{unit}</span>
        <span>{t("benchmarkMedian")}: {fmtVal(medianValue)}{unit}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Achievement Badge Card
   ═══════════════════════════════════════════════════════════ */
function AchievementBadge({ icon: Icon, title, description, progress, target, unlocked }: {
  icon: React.ElementType; title: string; description: string; progress: number; target: number; unlocked: boolean;
}) {
  const pct = Math.min((progress / target) * 100, 100);
  return (
    <div className={`glass rounded-2xl p-4 border transition-all duration-300 ${unlocked
      ? "border-amber-400/40 bg-amber-500/5"
      : "border-transparent opacity-70"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${unlocked
          ? "bg-amber-500/20"
          : "bg-white/5"
        }`}>
          {unlocked
            ? <Icon className="w-5 h-5 text-amber-400" />
            : <Lock className="w-4 h-4 text-[--text-muted]" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${unlocked ? "text-amber-400" : ""}`}>{title}</span>
            {unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          </div>
          <p className="text-[10px] text-[--text-muted] mt-0.5">{description}</p>
          {!unlocked && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-amber-500/50 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[9px] text-[--text-muted] mt-1 block">{progress}/{target}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Period Comparison Card
   ═══════════════════════════════════════════════════════════ */
function ComparisonRow({ label, current, previous, unit, higherIsBetter = true }: {
  label: string; current: number; previous: number; unit: string; higherIsBetter?: boolean;
}) {
  const fmtVal = (v: number) => v === Infinity ? "∞" : isNaN(v) ? "0" : v.toFixed(unit === "%" ? 1 : 2);
  const safeCurrent = current === Infinity ? 9999 : isNaN(current) ? 0 : current;
  const safePrevious = previous === Infinity ? 9999 : isNaN(previous) ? 0 : previous;
  const diff = safeCurrent - safePrevious;
  const pctChange = safePrevious !== 0 ? ((safeCurrent - safePrevious) / Math.abs(safePrevious)) * 100 : safeCurrent > 0 ? 100 : 0;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = diff === 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[--border-subtle] last:border-0">
      <span className="text-xs text-[--text-secondary]">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-xs text-[--text-muted] mono">{fmtVal(previous)}{unit}</span>
        <ChevronRight className="w-3 h-3 text-[--text-muted]" />
        <span className="text-xs font-semibold mono">{fmtVal(current)}{unit}</span>
        {!neutral && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${improved ? "text-emerald-400" : "text-rose-400"}`}>
            {improved ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(pctChange).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function PerformancePage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  /* ─── Core metrics (memoized) ─── */
  const metrics = useMemo(() => {
    if (trades.length === 0) return null;

    const chronoTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
    const expectancy = trades.length > 0 ? trades.reduce((s, t) => s + t.result, 0) / trades.length : 0;

    const rrs = trades
      .map((tr) => {
        const rr = calculateRR(tr.entry, tr.sl, tr.tp);
        const rrNum = parseFloat(rr);
        return tr.result > 0 && !isNaN(rrNum) ? rrNum : null;
      })
      .filter((r): r is number => r !== null);
    const avgRR = rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;

    // Consistency: std deviation of daily results
    const dailyResults: Record<string, number> = {};
    trades.forEach((t) => {
      const d = new Date(t.date).toISOString().slice(0, 10);
      dailyResults[d] = (dailyResults[d] || 0) + t.result;
    });
    const dailyValues = Object.values(dailyResults);
    const dailyMean = dailyValues.length > 0 ? dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length : 0;
    const dailyStd = dailyValues.length > 0 ? Math.sqrt(dailyValues.reduce((s, v) => s + Math.pow(v - dailyMean, 2), 0) / dailyValues.length) : 0;
    const consistencyScore = dailyStd > 0 ? Math.max(0, 100 - (dailyStd / Math.max(Math.abs(dailyMean), 1)) * 20) : 50;

    // Max drawdown
    let peak = 0, maxDD = 0, runningPnL = 0;
    chronoTrades.forEach((t) => {
      runningPnL += t.result;
      if (runningPnL > peak) peak = runningPnL;
      const dd = peak - runningPnL;
      if (dd > maxDD) maxDD = dd;
    });

    // Streaks
    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0;
    chronoTrades.forEach((t, i) => {
      if (i === 0) { currentStreak = t.result > 0 ? 1 : -1; tempStreak = currentStreak; return; }
      if (t.result > 0 && tempStreak > 0) tempStreak++;
      else if (t.result < 0 && tempStreak < 0) tempStreak--;
      else tempStreak = t.result > 0 ? 1 : -1;
      if (tempStreak > maxWinStreak) maxWinStreak = tempStreak;
      if (tempStreak < maxLossStreak) maxLossStreak = tempStreak;
    });

    const totalProfit = trades.reduce((s, t) => s + t.result, 0);
    const recoveryFactor = maxDD > 0 ? totalProfit / maxDD : totalProfit > 0 ? Infinity : 0;

    // ── SL usage: trades that have a defined stop-loss
    const slUsageRate = trades.length > 0
      ? (trades.filter((t) => t.sl !== 0 && t.sl !== t.entry).length / trades.length) * 100
      : 0;

    // ── Risk per trade (simplified: result as % of a hypothetical base capital)
    // Since we don't have account balance per trade, estimate from avg loss relative to peak equity
    const avgRiskPct = peak > 0 ? (avgLoss / peak) * 100 : 0;

    // ══════════════════════════════════════════
    //  4 CATEGORY SCORES (each 0-100)
    // ══════════════════════════════════════════

    // 1. DISCIPLINE (25%)
    // SL usage (40%), consistency (30%), streak discipline (30%)
    const slScore = Math.min(slUsageRate * 1.1, 100);
    const streakDiscipline = Math.max(0, 100 - Math.abs(maxLossStreak) * 15); // penalize long loss streaks
    const disciplineScore = Math.round(
      slScore * 0.40 + Math.min(consistencyScore, 100) * 0.30 + streakDiscipline * 0.30
    );

    // 2. RISK MANAGEMENT (25%)
    // Max drawdown (40%), avg risk per trade (30%), recovery factor (30%)
    const ddScore = maxDD > 0 ? Math.max(0, 100 - (maxDD / Math.max(peak, 1)) * 100) : 80;
    const riskPerTradeScore = avgRiskPct <= 1 ? 100 : avgRiskPct <= 2 ? 80 : avgRiskPct <= 5 ? 50 : Math.max(0, 100 - avgRiskPct * 5);
    const recoveryScore = recoveryFactor === Infinity ? 100 : Math.min(recoveryFactor * 25, 100);
    const riskMgmtScore = Math.round(
      ddScore * 0.40 + riskPerTradeScore * 0.30 + recoveryScore * 0.30
    );

    // 3. PROFITABILITY (25%)
    // Profit factor (35%), win rate (35%), avg R:R (30%)
    const winRateScore = Math.min(winRate * 1.5, 100);
    const rrScore = Math.min(avgRR > 0 ? avgRR * 30 : 0, 100);
    const pfScore = Math.min(profitFactor === Infinity ? 100 : profitFactor * 25, 100);
    const profitabilityScore = Math.round(
      pfScore * 0.35 + winRateScore * 0.35 + rrScore * 0.30
    );

    // 4. GROWTH (25%)
    // Equity curve slope (50%), improving metrics (50%)
    // Slope: linear regression on cumulative PnL
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let cumulPnL = 0;
    chronoTrades.forEach((t, i) => {
      cumulPnL += t.result;
      sumX += i;
      sumY += cumulPnL;
      sumXY += i * cumulPnL;
      sumX2 += i * i;
    });
    const n = chronoTrades.length;
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const slopeScore = slope > 0 ? Math.min(slope * 10, 100) : Math.max(0, 50 + slope * 5);

    // Improving metrics: compare last half vs first half win rate & PF
    const halfIdx = Math.floor(chronoTrades.length / 2);
    const firstHalf = chronoTrades.slice(0, halfIdx);
    const secondHalf = chronoTrades.slice(halfIdx);
    const fhWR = firstHalf.length > 0 ? (firstHalf.filter((t) => t.result > 0).length / firstHalf.length) * 100 : 0;
    const shWR = secondHalf.length > 0 ? (secondHalf.filter((t) => t.result > 0).length / secondHalf.length) * 100 : 0;
    const improvingScore = shWR >= fhWR ? Math.min(60 + (shWR - fhWR) * 2, 100) : Math.max(0, 60 - (fhWR - shWR) * 2);

    const growthScore = Math.round(slopeScore * 0.50 + improvingScore * 0.50);

    // OVERALL SCORE
    const overallScore = trades.length < 5 ? 0 : Math.round(
      disciplineScore * 0.25 + riskMgmtScore * 0.25 + profitabilityScore * 0.25 + growthScore * 0.25
    );

    // ── Rolling score over last 30 trades
    const last30 = chronoTrades.slice(-30);
    const scoreTrendData: number[] = [];
    for (let i = 5; i <= last30.length; i++) {
      const window = last30.slice(0, i);
      const wWins = window.filter((t) => t.result > 0);
      const wLosses = window.filter((t) => t.result < 0);
      const wWR = (wWins.length / window.length) * 100;
      const wAvgWin = wWins.length > 0 ? wWins.reduce((s, t) => s + t.result, 0) / wWins.length : 0;
      const wAvgLoss = wLosses.length > 0 ? Math.abs(wLosses.reduce((s, t) => s + t.result, 0) / wLosses.length) : 0;
      const wPF = wAvgLoss > 0 ? (wAvgWin * wWins.length) / (wAvgLoss * wLosses.length) : 0;
      const wRRs = window.map((tr) => { const rr = calculateRR(tr.entry, tr.sl, tr.tp); const rrNum = parseFloat(rr); return tr.result > 0 && !isNaN(rrNum) ? rrNum : null; }).filter((r): r is number => r !== null);
      const wAvgRR = wRRs.length > 0 ? wRRs.reduce((s, r) => s + r, 0) / wRRs.length : 0;
      let wPeak = 0, wMaxDD = 0, wRun = 0;
      window.forEach((t) => { wRun += t.result; if (wRun > wPeak) wPeak = wRun; const dd = wPeak - wRun; if (dd > wMaxDD) wMaxDD = dd; });
      const wWRS = Math.min(wWR * 1.5, 100);
      const wRRS = Math.min(wAvgRR > 0 ? wAvgRR * 30 : 0, 100);
      const wPFS = Math.min(wPF * 25, 100);
      const wDDS = wMaxDD > 0 ? Math.max(0, 100 - (wMaxDD / Math.max(wPeak, 1)) * 100) : 80;
      scoreTrendData.push(Math.round(wWRS * 0.25 + wRRS * 0.25 + wPFS * 0.25 + wDDS * 0.25));
    }

    // ── Underwater plot data
    const underwaterData: number[] = [];
    let uwPeak = 0, uwRunning = 0;
    chronoTrades.forEach((t) => {
      uwRunning += t.result;
      if (uwRunning > uwPeak) uwPeak = uwRunning;
      underwaterData.push(uwRunning - uwPeak);
    });

    // ══════════════════════════════════════════
    //  BADGES / ACHIEVEMENTS
    // ══════════════════════════════════════════

    // "Discipline de fer" — 10 consecutive trades with SL
    let consecutiveSL = 0, maxConsecutiveSL = 0;
    chronoTrades.forEach((t) => {
      if (t.sl !== 0 && t.sl !== t.entry) { consecutiveSL++; if (consecutiveSL > maxConsecutiveSL) maxConsecutiveSL = consecutiveSL; }
      else consecutiveSL = 0;
    });

    // "Gestionnaire de risque" — never exceeded 2% risk in a month
    // Approximate: check if avg risk pct < 2
    const riskBadgeUnlocked = avgRiskPct <= 2 && trades.length >= 10;

    // "Machine à profits" — 3 consecutive profitable weeks
    const weeklyPnL: Record<string, number> = {};
    chronoTrades.forEach((t) => {
      const d = new Date(t.date);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${weekNum}`;
      weeklyPnL[key] = (weeklyPnL[key] || 0) + t.result;
    });
    const weeklyValues = Object.values(weeklyPnL);
    let consecutiveProfitWeeks = 0, maxConsecutiveProfitWeeks = 0;
    weeklyValues.forEach((v) => {
      if (v > 0) { consecutiveProfitWeeks++; if (consecutiveProfitWeeks > maxConsecutiveProfitWeeks) maxConsecutiveProfitWeeks = consecutiveProfitWeeks; }
      else consecutiveProfitWeeks = 0;
    });

    // "Sniper" — Win rate > 70% over 20+ trades
    const sniperUnlocked = winRate >= 70 && trades.length >= 20;

    // "Marathon" — 50+ trades logged
    const marathonUnlocked = trades.length >= 50;

    // "Comeback King" — Recovery factor > 3
    const comebackUnlocked = recoveryFactor >= 3 && recoveryFactor !== Infinity;

    const badges = [
      {
        icon: Shield, title: t("perfBadgeDiscipline"), description: t("perfBadgeDisciplineDesc"),
        progress: Math.min(maxConsecutiveSL, 10), target: 10, unlocked: maxConsecutiveSL >= 10
      },
      {
        icon: Lock, title: t("perfBadgeRisk"), description: t("perfBadgeRiskDesc"),
        progress: riskBadgeUnlocked ? 1 : 0, target: 1, unlocked: riskBadgeUnlocked
      },
      {
        icon: Flame, title: t("perfBadgeProfitMachine"), description: t("perfBadgeProfitMachineDesc"),
        progress: Math.min(maxConsecutiveProfitWeeks, 3), target: 3, unlocked: maxConsecutiveProfitWeeks >= 3
      },
      {
        icon: Target, title: t("perfBadgeSniper"), description: t("perfBadgeSniperDesc"),
        progress: trades.length >= 20 ? Math.round(winRate) : trades.length, target: trades.length >= 20 ? 70 : 20,
        unlocked: sniperUnlocked
      },
      {
        icon: Medal, title: t("perfBadgeMarathon"), description: t("perfBadgeMarathonDesc"),
        progress: Math.min(trades.length, 50), target: 50, unlocked: marathonUnlocked
      },
      {
        icon: TrendingUp, title: t("perfBadgeComeback"), description: t("perfBadgeComebackDesc"),
        progress: Math.min(Math.round(recoveryFactor === Infinity ? 0 : recoveryFactor * 10), 30), target: 30,
        unlocked: comebackUnlocked
      },
    ];

    // ══════════════════════════════════════════
    //  PERIOD COMPARISON (current month vs previous)
    // ══════════════════════════════════════════
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthTrades = chronoTrades.filter((t) => new Date(t.date) >= currentMonthStart);
    const prevMonthTrades = chronoTrades.filter((t) => {
      const d = new Date(t.date);
      return d >= prevMonthStart && d < currentMonthStart;
    });

    const computePeriodMetrics = (trs: typeof trades) => {
      const w = trs.filter((t) => t.result > 0);
      const l = trs.filter((t) => t.result < 0);
      const wr = trs.length > 0 ? (w.length / trs.length) * 100 : 0;
      const aW = w.length > 0 ? w.reduce((s, t) => s + t.result, 0) / w.length : 0;
      const aL = l.length > 0 ? Math.abs(l.reduce((s, t) => s + t.result, 0) / l.length) : 0;
      const pf = aL > 0 ? (aW * w.length) / (aL * l.length) : 0;
      const total = trs.reduce((s, t) => s + t.result, 0);
      return { winRate: wr, profitFactor: pf, totalPnL: total, trades: trs.length };
    };

    const currentPeriod = computePeriodMetrics(currentMonthTrades);
    const previousPeriod = computePeriodMetrics(prevMonthTrades);

    // ── Recommendations
    const categories = [
      { key: "discipline" as const, score: disciplineScore, label: t("perfCatDiscipline") },
      { key: "riskMgmt" as const, score: riskMgmtScore, label: t("perfCatRisk") },
      { key: "profitability" as const, score: profitabilityScore, label: t("perfCatProfit") },
      { key: "growth" as const, score: growthScore, label: t("perfCatGrowth") },
    ];
    const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
    const recommendations: Record<string, string[]> = {
      discipline: [t("perfRecDiscipline1"), t("perfRecDiscipline2"), t("perfRecDiscipline3")],
      riskMgmt: [t("perfRecRisk1"), t("perfRecRisk2"), t("perfRecRisk3")],
      profitability: [t("perfRecProfit1"), t("perfRecProfit2"), t("perfRecProfit3")],
      growth: [t("perfRecGrowth1"), t("perfRecGrowth2"), t("perfRecGrowth3")],
    };

    return {
      chronoTrades, wins, losses, winRate, avgWin, avgLoss, profitFactor, expectancy, avgRR,
      consistencyScore, maxDD, peak, currentStreak, maxWinStreak, maxLossStreak,
      totalProfit, recoveryFactor, slUsageRate, avgRiskPct,
      disciplineScore, riskMgmtScore, profitabilityScore, growthScore, overallScore,
      scoreTrendData, underwaterData,
      badges, weakest, recommendations,
      currentPeriod, previousPeriod,
      winRateScore: Math.round(Math.min(winRate * 1.5, 100)),
      rrScore: Math.round(Math.min(avgRR > 0 ? avgRR * 30 : 0, 100)),
      pfScore: Math.round(Math.min(profitFactor === Infinity ? 100 : profitFactor * 25, 100)),
      ddScore: Math.round(maxDD > 0 ? Math.max(0, 100 - (maxDD / Math.max(peak, 1)) * 100) : 80),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  if (loading) return <div className="flex items-center justify-center h-64 text-[--text-secondary]">{t("loading")}</div>;

  if (!metrics || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Trophy className="w-12 h-12 text-[--text-muted]" />
        <p className="text-[--text-secondary]">{t("perfNoTrades")}</p>
      </div>
    );
  }

  const {
    winRate, avgWin, avgLoss, profitFactor, expectancy, avgRR,
    maxDD, peak, currentStreak, maxWinStreak, maxLossStreak,
    totalProfit, recoveryFactor,
    disciplineScore, riskMgmtScore, profitabilityScore, growthScore, overallScore,
    scoreTrendData, underwaterData,
    badges, weakest, recommendations,
    currentPeriod, previousPeriod,
  } = metrics;

  const rankBadge = getRankBadge(overallScore);

  const stats = [
    { icon: Target, label: t("perfWinRate"), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
    { icon: TrendingUp, label: t("perfAvgWin"), value: `+€${avgWin.toFixed(2)}`, color: "text-emerald-400" },
    { icon: TrendingDown, label: t("perfAvgLoss"), value: avgLoss > 0 ? `-€${avgLoss.toFixed(2)}` : "€0.00", color: avgLoss > 0 ? "text-rose-400" : "text-gray-400" },
    { icon: Zap, label: t("perfProfitFactor"), value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2), color: profitFactor >= 1.5 ? "text-emerald-400" : profitFactor >= 1 ? "text-amber-400" : "text-rose-400" },
    { icon: BarChart3, label: t("perfExpectancy"), value: `€${expectancy.toFixed(2)}`, color: expectancy >= 0 ? "text-emerald-400" : "text-rose-400" },
    { icon: Shield, label: t("perfMaxDrawdownEuro"), value: `€${maxDD.toFixed(2)}`, color: "text-rose-400" },
    { icon: Clock, label: t("perfTotalTrades"), value: String(trades.length), color: "text-cyan-400" },
    { icon: Trophy, label: t("perfBestStreak"), value: `${maxWinStreak}W / ${Math.abs(maxLossStreak)}L`, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          {t("performanceScore")}
        </h1>
        <p className="text-sm text-[--text-secondary] mt-1">{t("completeAnalysis")}</p>
      </div>

      {/* ═══ 1. Main Overall Score Gauge ═══ */}
      <div className="glass rounded-2xl p-8 flex flex-col items-center">
        <ScoreGauge score={overallScore} label="" size="lg" />
        <span className={`mt-4 px-4 py-2 rounded-full text-sm font-bold border ${rankBadge.bg} ${rankBadge.color}`}>
          {rankBadge.label === "beginner" ? t("beginner") : rankBadge.label}
        </span>
        {/* Tendance indicator: current month score vs previous month */}
        {(() => {
          const curPnl = currentPeriod.totalPnL;
          const prevPnl = previousPeriod.totalPnL;
          if (previousPeriod.trades === 0 && currentPeriod.trades === 0) return null;
          const improving = curPnl > prevPnl;
          const stable = curPnl === prevPnl;
          return (
            <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              stable ? "bg-gray-500/10 text-[--text-muted]" : improving ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}>
              {stable ? (
                <Activity className="w-3.5 h-3.5" />
              ) : improving ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>Tendance: {stable ? "Stable" : improving ? "En hausse" : "En baisse"} vs mois dernier</span>
            </div>
          );
        })()}
        {trades.length < 5 && <p className="text-xs text-[--text-muted] mt-3">{t("min5Trades")}</p>}
      </div>

      {/* ═══ 2. Category Breakdown with Progress Bars ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">{t("perfCategoryBreakdown")}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CategoryBar
            label={t("perfCatDiscipline")}
            score={disciplineScore}
            icon={Shield}
            details={t("perfCatDisciplineDetail")}
          />
          <CategoryBar
            label={t("perfCatRisk")}
            score={riskMgmtScore}
            icon={Lock}
            details={t("perfCatRiskDetail")}
          />
          <CategoryBar
            label={t("perfCatProfit")}
            score={profitabilityScore}
            icon={Zap}
            details={t("perfCatProfitDetail")}
          />
          <CategoryBar
            label={t("perfCatGrowth")}
            score={growthScore}
            icon={TrendingUp}
            details={t("perfCatGrowthDetail")}
          />
        </div>
      </div>

      {/* ═══ Sub-scores (original gauges) ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={metrics.winRateScore} label={t("perfWinRate")} />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={metrics.rrScore} label={t("perfRiskReward")} />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={metrics.pfScore} label={t("perfProfitFactor")} />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={metrics.ddScore} label={t("perfDrawdown")} />
        </div>
      </div>

      {/* ═══ Stats grid ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-[--text-muted]" />
              <span className="text-xs text-[--text-secondary]">{s.label}</span>
            </div>
            <span className={`text-xl font-bold mono ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ═══ 5. Recommendations ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">{t("perfRecommendations")}</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-[--text-secondary]">
            {t("perfWeakestCategory")}: <strong className="text-amber-400">{weakest.label}</strong> ({weakest.score}/100)
          </span>
        </div>
        <ul className="space-y-2">
          {recommendations[weakest.key]?.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[--text-secondary]">
              <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ═══ 6. Badges / Achievements ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">{t("perfAchievements")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-4">{t("perfAchievementsDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b, i) => (
            <AchievementBadge key={i} icon={b.icon} title={b.title} description={b.description}
              progress={b.progress} target={b.target} unlocked={b.unlocked} />
          ))}
        </div>
      </div>

      {/* ═══ 7. Period Comparison ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">{t("perfPeriodComparison")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-4">{t("perfPeriodComparisonDesc")}</p>
        {previousPeriod.trades === 0 ? (
          <p className="text-sm text-[--text-muted] text-center py-4">{t("perfNoPreviousPeriod")}</p>
        ) : (
          <div>
            <ComparisonRow label={t("perfWinRate")} current={currentPeriod.winRate} previous={previousPeriod.winRate} unit="%" />
            <ComparisonRow label={t("perfProfitFactor")} current={currentPeriod.profitFactor} previous={previousPeriod.profitFactor} unit="" />
            <ComparisonRow label={t("perfPnL")} current={currentPeriod.totalPnL} previous={previousPeriod.totalPnL} unit="€" />
            <ComparisonRow label={t("perfTotalTrades")} current={currentPeriod.trades} previous={previousPeriod.trades} unit="" />
          </div>
        )}
      </div>

      {/* ═══ Current streak ═══ */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-3">{t("currentStreakLabel")}</h3>
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-bold mono ${currentStreak > 0 ? "text-emerald-400" : currentStreak < 0 ? "text-rose-400" : "text-[--text-secondary]"}`}>
            {Math.abs(currentStreak)}
          </span>
          <span className="text-sm text-[--text-secondary]">
            {currentStreak > 0 ? t("winningTradesInRow") : currentStreak < 0 ? t("losingTradesInRow") : "—"}
          </span>
        </div>
      </div>

      {/* ═══ Recovery Factor ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">{t("recoveryFactorLabel")}</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className={`text-4xl font-bold mono ${recoveryFactor >= 3 ? "text-emerald-400" : recoveryFactor >= 1.5 ? "text-amber-400" : "text-rose-400"}`}>
              {recoveryFactor === Infinity ? "∞" : recoveryFactor.toFixed(2)}
            </span>
            <span className="text-xs text-[--text-muted] mt-1">{t("totalProfitLabel")} / {t("maxDrawdownLabel")}</span>
          </div>
          <div className="flex-1 space-y-2 text-xs text-[--text-secondary]">
            <div className="flex justify-between">
              <span>{t("totalProfitLabel")}</span>
              <span className={`mono font-semibold ${totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalProfit >= 0 ? "+" : ""}€{totalProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("maxDrawdownLabel")}</span>
              <span className="mono font-semibold text-rose-400">€{maxDD.toFixed(2)}</span>
            </div>
            <div className="mt-2 text-[10px] text-[--text-muted]">
              {recoveryFactor >= 3
                ? t("excellentRecovery")
                : recoveryFactor >= 1.5
                ? t("correctRecovery")
                : t("weakRecovery")}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4. Score Trend Chart ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">{t("scoreTrend")}</h3>
        </div>
        <ScoreTrendChart dataPoints={scoreTrendData} />
      </div>

      {/* ═══ Underwater Plot ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Waves className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold">{t("drawdownHWM")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-3">{t("drawdownDesc")}</p>
        <UnderwaterChart drawdowns={underwaterData} />
      </div>

      {/* ═══ Benchmark Comparison ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">{t("benchmarkComparison")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-4">{t("benchmarkDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BenchmarkBar label={t("perfWinRate")} userValue={winRate} medianValue={45} unit="%" higherIsBetter />
          <BenchmarkBar label={t("perfProfitFactor")} userValue={profitFactor} medianValue={1.2} unit="" higherIsBetter />
          <BenchmarkBar label={t("perfAvgRR")} userValue={avgRR} medianValue={0.8} unit="" higherIsBetter />
          <BenchmarkBar label={t("perfMaxDrawdownEuro")} userValue={maxDD} medianValue={500} unit="" higherIsBetter={false} />
          <BenchmarkBar label={t("perfExpectancy")} userValue={expectancy} medianValue={5} unit="" higherIsBetter />
          <BenchmarkBar label={t("recoveryFactorLabel")} userValue={recoveryFactor === Infinity ? 10 : recoveryFactor} medianValue={1.5} unit="" higherIsBetter />
        </div>
        <div className="mt-4 pt-3 border-t border-[--border-subtle] flex items-center gap-2">
          <div className="w-3 h-0.5 bg-amber-400 rounded" />
          <span className="text-[10px] text-[--text-muted]">{t("benchmarkLegend")}</span>
        </div>
      </div>

      {/* ═══ Jalons (Milestones Timeline) ═══ */}
      <MilestonesTimeline trades={trades} />
    </div>
  );
}
