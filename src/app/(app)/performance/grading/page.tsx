"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { Award, TrendingUp, TrendingDown, Target, AlertTriangle, Star, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface TradeGrade {
  tradeId: string;
  date: string;
  asset: string;
  direction: string;
  result: number;
  emotion: string | null;
  riskReward: number | null;
  score: number;
  grade: string;
  gradeColor: string;
  rrScore: number;
  resultScore: number;
  emotionScore: number;
  timingScore: number;
}

function getEmotionScore(emotion: string | null): number {
  if (!emotion) return 10;
  const e = emotion.trim().toLowerCase();
  if (["confiant", "discipliné", "discipline"].includes(e)) return 20;
  if (["calme", "neutre"].includes(e)) return 15;
  if (["stressé", "stresse", "anxieux"].includes(e)) return 5;
  if (["fomo", "revenge"].includes(e)) return 0;
  return 10;
}

function getTimingScore(dateStr: string): number {
  const d = new Date(dateStr);
  const hour = d.getUTCHours();
  if (hour >= 8 && hour <= 12) return 20; // London
  if (hour >= 13 && hour <= 17) return 20; // New York
  if (hour >= 0 && hour <= 7) return 10; // Asia
  return 5;
}

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 95) return { grade: "A+", color: "#10b981" };
  if (score >= 85) return { grade: "A", color: "#10b981" };
  if (score >= 75) return { grade: "B+", color: "#06b6d4" };
  if (score >= 65) return { grade: "B", color: "#06b6d4" };
  if (score >= 55) return { grade: "C", color: "#f59e0b" };
  if (score >= 45) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

const ALL_GRADES = ["A+", "A", "B+", "B", "C", "D", "F"] as const;
const GRADE_COLORS: Record<string, string> = {
  "A+": "#10b981",
  A: "#10b981",
  "B+": "#06b6d4",
  B: "#06b6d4",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full flex-1" style={{ background: "var(--bg-hover)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function GradingPage() {
  const { trades, loading } = useTrades();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const gradedTrades = useMemo<TradeGrade[]>(() => {
    return trades.map((t) => {
      const rrRaw = calculateRR(t.entry, t.sl, t.tp);
      const rr = parseFloat(rrRaw);
      const hasRR = !isNaN(rr) && rrRaw !== "-";

      const rrScore = hasRR ? Math.min(rr * 10, 30) : 15;
      const resultScore = t.result > 0 ? 30 : t.result === 0 ? 15 : 0;
      const emotionScore = getEmotionScore(t.emotion);
      const timingScore = getTimingScore(t.date);
      const score = Math.round(rrScore + resultScore + emotionScore + timingScore);
      const { grade, color } = getGrade(score);

      return {
        tradeId: t.id,
        date: t.date,
        asset: t.asset,
        direction: t.direction,
        result: t.result,
        emotion: t.emotion,
        riskReward: hasRR ? rr : null,
        score,
        grade,
        gradeColor: color,
        rrScore,
        resultScore,
        emotionScore,
        timingScore,
      };
    }).sort((a, b) => b.score - a.score);
  }, [trades]);

  const stats = useMemo(() => {
    if (gradedTrades.length === 0) return null;

    const total = gradedTrades.length;
    const avgScore = gradedTrades.reduce((s, t) => s + t.score, 0) / total;
    const avgGrade = getGrade(Math.round(avgScore));

    const distribution: Record<string, number> = {};
    ALL_GRADES.forEach((g) => (distribution[g] = 0));
    gradedTrades.forEach((t) => distribution[t.grade]++);

    const avgRR = gradedTrades.reduce((s, t) => s + t.rrScore, 0) / total;
    const avgResult = gradedTrades.reduce((s, t) => s + t.resultScore, 0) / total;
    const avgEmotion = gradedTrades.reduce((s, t) => s + t.emotionScore, 0) / total;
    const avgTiming = gradedTrades.reduce((s, t) => s + t.timingScore, 0) / total;

    // Best setup: asset+direction combo with highest avg grade
    const combos: Record<string, { total: number; count: number }> = {};
    gradedTrades.forEach((t) => {
      const key = `${t.asset} ${t.direction}`;
      if (!combos[key]) combos[key] = { total: 0, count: 0 };
      combos[key].total += t.score;
      combos[key].count++;
    });
    let bestSetup = { key: "-", avg: 0 };
    Object.entries(combos).forEach(([key, val]) => {
      const avg = val.total / val.count;
      if (avg > bestSetup.avg && val.count >= 2) bestSetup = { key, avg };
    });
    if (bestSetup.key === "-" && Object.keys(combos).length > 0) {
      const first = Object.entries(combos).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];
      if (first) bestSetup = { key: first[0], avg: first[1].total / first[1].count };
    }

    // Weakest component
    const components = [
      { label: "Risk/Reward", avg: avgRR, max: 30 },
      { label: "Résultat", avg: avgResult, max: 30 },
      { label: "Émotion", avg: avgEmotion, max: 20 },
      { label: "Timing", avg: avgTiming, max: 20 },
    ];
    const weakest = components.reduce((w, c) => (c.avg / c.max < w.avg / w.max ? c : w), components[0]);

    return { total, avgScore, avgGrade, distribution, avgRR, avgResult, avgEmotion, avgTiming, bestSetup, weakest };
  }, [gradedTrades]);

  if (loading) {
    return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>Chargement...</div>;
  }

  if (!stats || gradedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: "var(--text-muted)" }}>
        <Award size={48} />
        <p className="text-lg">Aucun trade à noter</p>
        <p className="text-sm">Ajoutez des trades pour voir leur notation.</p>
      </div>
    );
  }

  const visibleTrades = showAll ? gradedTrades : gradedTrades.slice(0, 50);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <Award size={28} />
          Notation des Trades
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          {"Évaluez la qualité de chaque trade avec un système de scoring objectif"}
        </p>
      </div>

      {/* Grade Distribution */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {ALL_GRADES.map((g) => {
          const count = stats.distribution[g];
          const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : "0";
          return (
            <div
              key={g}
              className="metric-card rounded-2xl p-4 text-center"
            >
              <div
                className="text-2xl font-bold"
                style={{ color: GRADE_COLORS[g] }}
              >
                {g}
              </div>
              <div className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                {count}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Average Grade + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Grade */}
        <div className="metric-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
          <Star size={32} style={{ color: stats.avgGrade.color }} />
          <div className="text-5xl font-black" style={{ color: stats.avgGrade.color }}>
            {stats.avgGrade.grade}
          </div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Score moyen: <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{stats.avgScore.toFixed(1)}/100</span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            sur {stats.total} trade{stats.total > 1 ? "s" : ""}
          </div>
        </div>

        {/* Breakdown */}
        <div className="metric-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Décomposition par composante
          </h2>
          <ProgressBar value={stats.avgRR} max={30} color="#06b6d4" label="Risk/Reward" />
          <ProgressBar value={stats.avgResult} max={30} color="#10b981" label="Résultat" />
          <ProgressBar value={stats.avgEmotion} max={20} color="#a855f7" label="Émotion" />
          <ProgressBar value={stats.avgTiming} max={20} color="#f59e0b" label="Timing" />
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target size={20} style={{ color: "#10b981" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Votre meilleur setup</h3>
          </div>
          <div className="text-lg font-bold" style={{ color: "#10b981" }}>
            {stats.bestSetup.key}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Score moyen: {stats.bestSetup.avg.toFixed(1)}/100 ({getGrade(Math.round(stats.bestSetup.avg)).grade})
          </div>
        </div>

        <div className="metric-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Point à améliorer</h3>
          </div>
          <div className="text-lg font-bold" style={{ color: "#f59e0b" }}>
            {stats.weakest.label}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Moyenne: {stats.weakest.avg.toFixed(1)}/{stats.weakest.max} ({((stats.weakest.avg / stats.weakest.max) * 100).toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Détail des trades ({stats.total})
          </h2>
        </div>

        {/* Table Header */}
        <div
          className="hidden md:grid grid-cols-8 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
        >
          <div>Note</div>
          <div>Date</div>
          <div>Actif</div>
          <div>Direction</div>
          <div className="text-right">P&L</div>
          <div className="text-right">R:R</div>
          <div>Émotion</div>
          <div className="text-right">Score</div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {visibleTrades.map((t) => (
            <div key={t.tradeId}>
              <div
                className="grid grid-cols-3 md:grid-cols-8 gap-2 px-4 py-3 items-center cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => setExpandedId(expandedId === t.tradeId ? null : t.tradeId)}
              >
                {/* Grade Badge */}
                <div>
                  <span
                    className="rounded-full px-3 py-1 font-bold text-sm inline-block"
                    style={{ background: `${t.gradeColor}20`, color: t.gradeColor }}
                  >
                    {t.grade}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden md:block text-sm" style={{ color: "var(--text-secondary)" }}>
                  {new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </div>

                {/* Asset */}
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {t.asset}
                </div>

                {/* Direction */}
                <div className="hidden md:flex items-center gap-1 text-sm">
                  {t.direction.toLowerCase() === "buy" || t.direction.toLowerCase() === "long" ? (
                    <TrendingUp size={14} style={{ color: "#10b981" }} />
                  ) : (
                    <TrendingDown size={14} style={{ color: "#ef4444" }} />
                  )}
                  <span style={{ color: "var(--text-secondary)" }}>{t.direction}</span>
                </div>

                {/* P&L */}
                <div
                  className="text-sm font-mono text-right"
                  style={{ color: t.result >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {t.result >= 0 ? "+" : ""}
                  {t.result.toFixed(2)}
                </div>

                {/* R:R */}
                <div className="hidden md:block text-sm font-mono text-right" style={{ color: "var(--text-secondary)" }}>
                  {t.riskReward !== null ? `${t.riskReward.toFixed(1)}` : "-"}
                </div>

                {/* Emotion */}
                <div className="hidden md:block text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t.emotion || "-"}
                </div>

                {/* Score */}
                <div className="text-right flex items-center justify-end gap-1">
                  <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t.score}
                  </span>
                  <ChevronRight
                    size={14}
                    className="transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: expandedId === t.tradeId ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === t.tradeId && (
                <div
                  className="px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3"
                  style={{ background: "var(--bg-hover)" }}
                >
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>R:R ({t.rrScore.toFixed(0)}/30)</div>
                    <MiniProgressBar value={t.rrScore} max={30} color="#06b6d4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Résultat ({t.resultScore.toFixed(0)}/30)</div>
                    <MiniProgressBar value={t.resultScore} max={30} color="#10b981" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Émotion ({t.emotionScore.toFixed(0)}/20)</div>
                    <MiniProgressBar value={t.emotionScore} max={20} color="#a855f7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Timing ({t.timingScore.toFixed(0)}/20)</div>
                    <MiniProgressBar value={t.timingScore} max={20} color="#f59e0b" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show more */}
        {!showAll && gradedTrades.length > 50 && (
          <div className="p-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowAll(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
            >
              Voir plus ({gradedTrades.length - 50} trades restants)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
