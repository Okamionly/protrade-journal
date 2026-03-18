"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { Trophy, TrendingUp, TrendingDown, Target, Zap, Shield, BarChart3, Clock } from "lucide-react";

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
  return { label: "Débutant", color: "text-[--text-muted]", bg: "bg-gray-600/15 border-gray-600/30" };
}

export default function PerformancePage() {
  const { trades, loading } = useTrades();

  if (loading) return <div className="flex items-center justify-center h-64 text-[--text-secondary]">Chargement...</div>;

  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
  const expectancy = trades.length > 0 ? trades.reduce((s, t) => s + t.result, 0) / trades.length : 0;

  const rrs = trades.map((t) => {
    const rr = calculateRR(t.entry, t.sl, t.tp);
    return t.result > 0 ? parseFloat(rr) : -1;
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
  const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  sorted.forEach((t, i) => {
    if (i === 0) { currentStreak = t.result > 0 ? 1 : -1; tempStreak = currentStreak; return; }
    if (t.result > 0 && tempStreak > 0) tempStreak++;
    else if (t.result < 0 && tempStreak < 0) tempStreak--;
    else tempStreak = t.result > 0 ? 1 : -1;
    if (tempStreak > maxWinStreak) maxWinStreak = tempStreak;
    if (tempStreak < maxLossStreak) maxLossStreak = tempStreak;
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
          Score de Performance
        </h1>
        <p className="text-sm text-[--text-secondary] mt-1">Analyse complète de ta performance de trading</p>
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
          {badge.label}
        </span>
        {trades.length < 5 && <p className="text-xs text-[--text-muted] mt-3">Minimum 5 trades requis pour le score</p>}
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
        <h3 className="font-semibold mb-3">Série actuelle</h3>
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-bold mono ${currentStreak > 0 ? "text-emerald-400" : currentStreak < 0 ? "text-rose-400" : "text-[--text-secondary]"}`}>
            {Math.abs(currentStreak)}
          </span>
          <span className="text-sm text-[--text-secondary]">
            {currentStreak > 0 ? "trades gagnants d'affilée" : currentStreak < 0 ? "trades perdants d'affilée" : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
