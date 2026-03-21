"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { Trophy, TrendingUp, TrendingDown, Target, Zap, Shield, BarChart3, Clock, Activity, Waves, Users } from "lucide-react";
import { useTranslation } from "@/i18n/context";

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#0ea5e9";
    if (s >= 40) return "#f59e0b";
    return "#ef4444";
  };
  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold mono" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-[--text-secondary] mt-2">{label}</span>
    </div>
  );
}

function getBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: "Diamond", color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-400/30" };
  if (score >= 75) return { label: "Gold", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" };
  if (score >= 60) return { label: "Silver", color: "text-[--text-secondary]", bg: "bg-gray-500/15 border-gray-400/30" };
  if (score >= 40) return { label: "Bronze", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" };
  return { label: "beginner", color: "text-[--text-muted]", bg: "bg-gray-600/15 border-gray-600/30" };
}

/* ─── SVG Line Chart: Score trend over last N trades ─── */
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

  // Y-axis ticks
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
      {/* Grid lines */}
      {yLabels.map((lbl, i) => {
        const y = PY + (1 - (lbl - min) / range) * (H - PY * 2);
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
            <text x={PX - 6} y={y + 4} textAnchor="end" className="mono" fill="var(--text-muted)" fontSize="10">{lbl}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0ea5e9" stroke="var(--bg-primary)" strokeWidth="1.5" />
      ))}
      {/* X labels (first, mid, last) */}
      {[0, Math.floor(pts.length / 2), pts.length - 1].map((idx) => (
        <text key={idx} x={pts[idx].x} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9" className="mono">
          #{idx + 1}
        </text>
      ))}
    </svg>
  );
}

/* ─── SVG Area Chart: Underwater (drawdown) plot ─── */
function UnderwaterChart({ drawdowns }: { drawdowns: number[] }) {
  const { t } = useTranslation();
  if (drawdowns.length < 2) return <p className="text-sm text-[--text-muted] text-center py-8">{t("notEnoughDrawdown")}</p>;
  const W = 600, H = 160, PX = 40, PY = 16;
  const rawMaxDD = Math.max(...drawdowns.map(Math.abs));
  if (rawMaxDD === 0) return <p className="text-sm text-emerald-400 text-center py-8">Aucun drawdown — performance parfaite</p>;
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
      {/* Zero line */}
      <line x1={PX} y1={zeroY} x2={W - PX} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Grid */}
      {yLabels.map((lbl, i) => {
        const y = PY + (Math.abs(lbl) / maxDD) * (H - PY * 2);
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <text x={PX - 6} y={y + 4} textAnchor="end" className="mono" fill="var(--text-muted)" fontSize="9">{lbl === 0 ? "0" : `${lbl}`}</text>
          </g>
        );
      })}
      {/* Area */}
      <path d={areaD} fill="url(#underwater-grad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

/* ─── Benchmark comparison bar ─── */
function BenchmarkBar({ label, userValue, medianValue, unit, higherIsBetter = true }: {
  label: string; userValue: number; medianValue: number; unit: string; higherIsBetter?: boolean;
}) {
  const { t } = useTranslation();
  const maxVal = Math.max(userValue, medianValue, 0.01) * 1.2;
  const userPct = Math.max(0, Math.min((userValue / maxVal) * 100, 100));
  const medianPct = Math.max(0, Math.min((medianValue / maxVal) * 100, 100));
  const isBetter = higherIsBetter ? userValue >= medianValue : userValue <= medianValue;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[--text-secondary]">{label}</span>
        <span className={`text-xs font-semibold mono ${isBetter ? "text-emerald-400" : "text-rose-400"}`}>
          {userValue.toFixed(unit === "%" ? 1 : 2)}{unit}
        </span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        {/* Median marker */}
        <div className="absolute top-0 h-full w-0.5 bg-amber-400 z-10 rounded" style={{ left: `${medianPct}%` }} title={`Median: ${medianValue}${unit}`} />
        {/* User bar */}
        <div className={`h-full rounded-full transition-all duration-700 ${isBetter ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
          style={{ width: `${userPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-[--text-muted]">
        <span>{t("benchmarkYou")}: {userValue.toFixed(unit === "%" ? 1 : 2)}{unit}</span>
        <span>{t("benchmarkMedian")}: {medianValue.toFixed(unit === "%" ? 1 : 2)}{unit}</span>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  if (loading) return <div className="flex items-center justify-center h-64 text-[--text-secondary]">{t("loading")}</div>;

  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
  const expectancy = trades.length > 0 ? trades.reduce((s, t) => s + t.result, 0) / trades.length : 0;

  const rrs = trades.map((tr) => {
    const rr = calculateRR(tr.entry, tr.sl, tr.tp);
    const rrNum = parseFloat(rr);
    return tr.result > 0 && !isNaN(rrNum) ? rrNum : -1;
  });
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
  trades.forEach((t) => {
    runningPnL += t.result;
    if (runningPnL > peak) peak = runningPnL;
    const dd = peak - runningPnL;
    if (dd > maxDD) maxDD = dd;
  });

  // Streaks
  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  sorted.forEach((t, i) => {
    if (i === 0) { currentStreak = t.result > 0 ? 1 : -1; tempStreak = currentStreak; return; }
    if (t.result > 0 && tempStreak > 0) tempStreak++;
    else if (t.result < 0 && tempStreak < 0) tempStreak--;
    else tempStreak = t.result > 0 ? 1 : -1;
    if (tempStreak > maxWinStreak) maxWinStreak = tempStreak;
    if (tempStreak < maxLossStreak) maxLossStreak = tempStreak;
  });

  // Recovery Factor = total profit / max drawdown
  const totalProfit = trades.reduce((s, t) => s + t.result, 0);
  const recoveryFactor = maxDD > 0 ? totalProfit / maxDD : totalProfit > 0 ? Infinity : 0;

  // Rolling score over last 30 trades (compute sub-scores at each window edge)
  const chronoTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    const wRRs = window.map((tr) => { const rr = calculateRR(tr.entry, tr.sl, tr.tp); const rrNum = parseFloat(rr); return tr.result > 0 && !isNaN(rrNum) ? rrNum : -1; });
    const wAvgRR = wRRs.reduce((s, r) => s + r, 0) / wRRs.length;
    let wPeak = 0, wMaxDD = 0, wRun = 0;
    window.forEach((t) => { wRun += t.result; if (wRun > wPeak) wPeak = wRun; const dd = wPeak - wRun; if (dd > wMaxDD) wMaxDD = dd; });
    const wWRS = Math.min(wWR * 1.5, 100);
    const wRRS = Math.min(wAvgRR > 0 ? wAvgRR * 30 : 0, 100);
    const wPFS = Math.min(wPF * 25, 100);
    const wDDS = wMaxDD > 0 ? Math.max(0, 100 - (wMaxDD / Math.max(wPeak, 1)) * 100) : 80;
    scoreTrendData.push(Math.round(wWRS * 0.25 + wRRS * 0.20 + wPFS * 0.25 + 50 * 0.15 + wDDS * 0.15));
  }

  // Underwater plot: drawdown at each trade from high watermark
  const underwaterData: number[] = [];
  let uwPeak = 0, uwRunning = 0;
  chronoTrades.forEach((t) => {
    uwRunning += t.result;
    if (uwRunning > uwPeak) uwPeak = uwRunning;
    underwaterData.push(uwRunning - uwPeak); // always <= 0
  });

  // Sub-scores (each 0-100)
  const winRateScore = Math.min(winRate * 1.5, 100);
  const rrScore = Math.min(avgRR > 0 ? avgRR * 30 : 0, 100);
  const pfScore = Math.min(profitFactor * 25, 100);
  const ddScore = maxDD > 0 ? Math.max(0, 100 - (maxDD / Math.max(peak, 1)) * 100) : 80;

  const overallScore = trades.length < 5 ? 0 : Math.round(
    winRateScore * 0.25 + rrScore * 0.20 + pfScore * 0.25 + Math.min(consistencyScore, 100) * 0.15 + ddScore * 0.15
  );

  const badge = getBadge(overallScore);

  const stats = [
    { icon: Target, label: "Win Rate", value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
    { icon: TrendingUp, label: "Avg Win", value: `+€${avgWin.toFixed(2)}`, color: "text-emerald-400" },
    { icon: TrendingDown, label: "Avg Loss", value: `-€${avgLoss.toFixed(2)}`, color: "text-rose-400" },
    { icon: Zap, label: "Profit Factor", value: profitFactor.toFixed(2), color: profitFactor >= 1.5 ? "text-emerald-400" : profitFactor >= 1 ? "text-amber-400" : "text-rose-400" },
    { icon: BarChart3, label: "Expectancy", value: `€${expectancy.toFixed(2)}`, color: expectancy >= 0 ? "text-emerald-400" : "text-rose-400" },
    { icon: Shield, label: "Max Drawdown", value: `€${maxDD.toFixed(2)}`, color: "text-rose-400" },
    { icon: Clock, label: "Total Trades", value: String(trades.length), color: "text-cyan-400" },
    { icon: Trophy, label: "Best Streak", value: `${maxWinStreak}W / ${Math.abs(maxLossStreak)}L`, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          {t("performanceScore")}
        </h1>
        <p className="text-sm text-[--text-secondary] mt-1">{t("completeAnalysis")}</p>
      </div>

      {/* Main score */}
      <div className="glass rounded-2xl p-8 flex flex-col items-center">
        <div className="relative w-48 h-48 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#0ea5e9" : overallScore >= 40 ? "#f59e0b" : "#ef4444"}
              strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 - (overallScore / 100) * 2 * Math.PI * 45}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold mono">{overallScore}</span>
            <span className="text-xs text-[--text-secondary]">/ 100</span>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold border ${badge.bg} ${badge.color}`}>
          {badge.label === "beginner" ? t("beginner") : badge.label}
        </span>
        {trades.length < 5 && <p className="text-xs text-[--text-muted] mt-3">{t("min5Trades")}</p>}
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={Math.round(winRateScore)} label="Win Rate" />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={Math.round(rrScore)} label="Risk/Reward" />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={Math.round(pfScore)} label="Profit Factor" />
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col items-center">
          <ScoreGauge score={Math.round(Math.min(consistencyScore, 100))} label="Consistency" />
        </div>
      </div>

      {/* Stats grid */}
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

      {/* Current streak */}
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

      {/* Recovery Factor */}
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

      {/* Score Trend Chart */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">{t("scoreTrend")}</h3>
        </div>
        <ScoreTrendChart dataPoints={scoreTrendData} />
      </div>

      {/* Underwater Plot */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Waves className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold">{t("drawdownHWM")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-3">
          {t("drawdownDesc")}
        </p>
        <UnderwaterChart drawdowns={underwaterData} />
      </div>

      {/* Benchmark Comparison */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">{t("benchmarkComparison")}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-4">
          {t("benchmarkDesc")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BenchmarkBar label="Win Rate" userValue={winRate} medianValue={45} unit="%" higherIsBetter />
          <BenchmarkBar label="Profit Factor" userValue={profitFactor} medianValue={1.2} unit="" higherIsBetter />
          <BenchmarkBar label="R:R Moyen" userValue={avgRR} medianValue={0.8} unit="" higherIsBetter />
          <BenchmarkBar label="Max Drawdown (€)" userValue={maxDD} medianValue={500} unit="" higherIsBetter={false} />
          <BenchmarkBar label="Espérance (€)" userValue={expectancy} medianValue={5} unit="" higherIsBetter />
          <BenchmarkBar label="Facteur de Récupération" userValue={recoveryFactor === Infinity ? 10 : recoveryFactor} medianValue={1.5} unit="" higherIsBetter />
        </div>
        <div className="mt-4 pt-3 border-t border-[--border-subtle] flex items-center gap-2">
          <div className="w-3 h-0.5 bg-amber-400 rounded" />
          <span className="text-[10px] text-[--text-muted]">{t("benchmarkLegend")}</span>
        </div>
      </div>
    </div>
  );
}
