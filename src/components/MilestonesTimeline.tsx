"use client";

import { useMemo } from "react";
import { CheckCircle } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   Milestone definitions
   ═══════════════════════════════════════════════════════════ */

interface MilestoneResult {
  icon: string;
  name: string;
  description: string;
  achieved: boolean;
  dateAchieved: string | null;
  progress: number; // 0-100
  progressLabel: string;
}

function getWeekKey(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wn = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${wn}`;
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeMilestones(trades: Trade[]): MilestoneResult[] {
  if (trades.length === 0) {
    return defaultMilestones();
  }

  const chrono = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Weekly P&L
  const weeklyPnL: Record<string, number> = {};
  chrono.forEach((t) => {
    const k = getWeekKey(new Date(t.date));
    weeklyPnL[k] = (weeklyPnL[k] || 0) + t.result;
  });
  const weekKeys = Object.keys(weeklyPnL).sort();

  // Monthly P&L
  const monthlyPnL: Record<string, number> = {};
  chrono.forEach((t) => {
    const k = getMonthKey(new Date(t.date));
    monthlyPnL[k] = (monthlyPnL[k] || 0) + t.result;
  });
  const monthKeys = Object.keys(monthlyPnL).sort();

  // Win rate over all trades
  const wins = trades.filter((t) => t.result > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  // Profit factor over all trades
  const grossProfit = trades
    .filter((t) => t.result > 0)
    .reduce((s, t) => s + t.result, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Performance score (simplified - matches page logic)
  const computeOverallScore = (): number => {
    if (trades.length < 5) return 0;
    const wr = winRate;
    const avgRRs = trades
      .map((tr) => {
        const rr = calculateRR(tr.entry, tr.sl, tr.tp);
        const rrNum = parseFloat(rr);
        return tr.result > 0 && !isNaN(rrNum) ? rrNum : null;
      })
      .filter((r): r is number => r !== null);
    const avgRR = avgRRs.length > 0 ? avgRRs.reduce((s, r) => s + r, 0) / avgRRs.length : 0;
    const wrScore = Math.min(wr * 1.5, 100);
    const rrScore = Math.min(avgRR > 0 ? avgRR * 30 : 0, 100);
    const pfScore = Math.min(profitFactor === Infinity ? 100 : profitFactor * 25, 100);
    let peak = 0, maxDD = 0, run = 0;
    chrono.forEach((t) => {
      run += t.result;
      if (run > peak) peak = run;
      const dd = peak - run;
      if (dd > maxDD) maxDD = dd;
    });
    const ddScore = maxDD > 0 ? Math.max(0, 100 - (maxDD / Math.max(peak, 1)) * 100) : 80;
    return Math.round(wrScore * 0.25 + rrScore * 0.25 + pfScore * 0.25 + ddScore * 0.25);
  };
  const overallScore = computeOverallScore();

  // First profitable week
  const firstProfitableWeek = weekKeys.find((k) => weeklyPnL[k] > 0) ?? null;
  const firstProfitableWeekDate = firstProfitableWeek
    ? findFirstTradeDate(chrono, (t) => getWeekKey(new Date(t.date)) === firstProfitableWeek)
    : null;

  // First profitable month
  const firstProfitableMonth = monthKeys.find((k) => monthlyPnL[k] > 0) ?? null;
  const firstProfitableMonthDate = firstProfitableMonth
    ? findFirstTradeDate(chrono, (t) => getMonthKey(new Date(t.date)) === firstProfitableMonth)
    : null;

  // 3 consecutive profitable months
  let maxConsecProfitMonths = 0;
  let consecProfitMonths = 0;
  let thirdConsecMonthKey: string | null = null;
  for (const k of monthKeys) {
    if (monthlyPnL[k] > 0) {
      consecProfitMonths++;
      if (consecProfitMonths >= 3 && !thirdConsecMonthKey) {
        thirdConsecMonthKey = k;
      }
      if (consecProfitMonths > maxConsecProfitMonths) maxConsecProfitMonths = consecProfitMonths;
    } else {
      consecProfitMonths = 0;
    }
  }
  const threeConsecDate = thirdConsecMonthKey
    ? findFirstTradeDate(chrono, (t) => getMonthKey(new Date(t.date)) === thirdConsecMonthKey)
    : null;

  // Date helpers for trade count milestones
  const dateOfNthTrade = (n: number): string | null =>
    chrono.length >= n ? formatDateShort(new Date(chrono[n - 1].date)) : null;

  const milestones: MilestoneResult[] = [
    {
      icon: "\uD83C\uDFAF", // target
      name: "Premier trade enregistr\u00E9",
      description: "Vous avez enregistr\u00E9 votre premier trade",
      achieved: trades.length >= 1,
      dateAchieved: dateOfNthTrade(1),
      progress: Math.min((trades.length / 1) * 100, 100),
      progressLabel: `${Math.min(trades.length, 1)}/1`,
    },
    {
      icon: "\uD83D\uDCCA", // chart
      name: "10 trades",
      description: "Vous commencez \u00E0 avoir des donn\u00E9es",
      achieved: trades.length >= 10,
      dateAchieved: dateOfNthTrade(10),
      progress: Math.min((trades.length / 10) * 100, 100),
      progressLabel: `${Math.min(trades.length, 10)}/10`,
    },
    {
      icon: "\uD83D\uDCAF", // 100
      name: "100 trades",
      description: "\u00C9chantillon significatif atteint",
      achieved: trades.length >= 100,
      dateAchieved: dateOfNthTrade(100),
      progress: Math.min((trades.length / 100) * 100, 100),
      progressLabel: `${Math.min(trades.length, 100)}/100`,
    },
    {
      icon: "\uD83C\uDFC6", // trophy
      name: "500 trades",
      description: "Trader s\u00E9rieux",
      achieved: trades.length >= 500,
      dateAchieved: dateOfNthTrade(500),
      progress: Math.min((trades.length / 500) * 100, 100),
      progressLabel: `${Math.min(trades.length, 500)}/500`,
    },
    {
      icon: "\uD83D\uDD25", // fire
      name: "Premi\u00E8re semaine profitable",
      description: "Une semaine cl\u00F4tur\u00E9e en positif",
      achieved: firstProfitableWeek !== null,
      dateAchieved: firstProfitableWeekDate,
      progress: firstProfitableWeek ? 100 : weekKeys.length > 0 ? 50 : 0,
      progressLabel: firstProfitableWeek ? "1/1" : "0/1",
    },
    {
      icon: "\uD83D\uDCB0", // money bag
      name: "Premier mois profitable",
      description: "Un mois cl\u00F4tur\u00E9 en positif",
      achieved: firstProfitableMonth !== null,
      dateAchieved: firstProfitableMonthDate,
      progress: firstProfitableMonth ? 100 : monthKeys.length > 0 ? 50 : 0,
      progressLabel: firstProfitableMonth ? "1/1" : "0/1",
    },
    {
      icon: "\u2B50", // star
      name: "Win rate > 60% sur 50+ trades",
      description: "Excellente pr\u00E9cision confirm\u00E9e",
      achieved: winRate > 60 && trades.length >= 50,
      dateAchieved: winRate > 60 && trades.length >= 50 ? formatDateShort(new Date()) : null,
      progress:
        trades.length < 50
          ? (trades.length / 50) * 100
          : Math.min((winRate / 60) * 100, 100),
      progressLabel:
        trades.length < 50
          ? `${trades.length}/50 trades`
          : `WR ${winRate.toFixed(1)}%/60%`,
    },
    {
      icon: "\uD83D\uDCC8", // chart increasing
      name: "Profit factor > 2 sur 30+ trades",
      description: "Rentabilit\u00E9 solide d\u00E9montr\u00E9e",
      achieved: profitFactor > 2 && trades.length >= 30,
      dateAchieved: profitFactor > 2 && trades.length >= 30 ? formatDateShort(new Date()) : null,
      progress:
        trades.length < 30
          ? (trades.length / 30) * 100
          : Math.min(((profitFactor === Infinity ? 5 : profitFactor) / 2) * 100, 100),
      progressLabel:
        trades.length < 30
          ? `${trades.length}/30 trades`
          : `PF ${profitFactor === Infinity ? "\u221E" : profitFactor.toFixed(2)}/2.00`,
    },
    {
      icon: "\uD83C\uDF96\uFE0F", // military medal
      name: "Score de performance > 80",
      description: "Niveau d'excellence atteint",
      achieved: overallScore > 80,
      dateAchieved: overallScore > 80 ? formatDateShort(new Date()) : null,
      progress: Math.min((overallScore / 80) * 100, 100),
      progressLabel: `${overallScore}/80`,
    },
    {
      icon: "\uD83C\uDFC5", // medal
      name: "3 mois cons\u00E9cutifs profitables",
      description: "Consistance remarquable",
      achieved: maxConsecProfitMonths >= 3,
      dateAchieved: threeConsecDate,
      progress: Math.min((maxConsecProfitMonths / 3) * 100, 100),
      progressLabel: `${Math.min(maxConsecProfitMonths, 3)}/3`,
    },
  ];

  return milestones;
}

function findFirstTradeDate(
  chrono: Trade[],
  pred: (t: Trade) => boolean
): string | null {
  const found = chrono.find(pred);
  return found ? formatDateShort(new Date(found.date)) : null;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function defaultMilestones(): MilestoneResult[] {
  const names = [
    { icon: "\uD83C\uDFAF", name: "Premier trade enregistr\u00E9", desc: "Enregistrez votre premier trade" },
    { icon: "\uD83D\uDCCA", name: "10 trades", desc: "Vous commencez \u00E0 avoir des donn\u00E9es" },
    { icon: "\uD83D\uDCAF", name: "100 trades", desc: "\u00C9chantillon significatif atteint" },
    { icon: "\uD83C\uDFC6", name: "500 trades", desc: "Trader s\u00E9rieux" },
    { icon: "\uD83D\uDD25", name: "Premi\u00E8re semaine profitable", desc: "Une semaine en positif" },
    { icon: "\uD83D\uDCB0", name: "Premier mois profitable", desc: "Un mois en positif" },
    { icon: "\u2B50", name: "Win rate > 60% sur 50+ trades", desc: "Pr\u00E9cision confirm\u00E9e" },
    { icon: "\uD83D\uDCC8", name: "Profit factor > 2 sur 30+ trades", desc: "Rentabilit\u00E9 solide" },
    { icon: "\uD83C\uDF96\uFE0F", name: "Score de performance > 80", desc: "Excellence atteinte" },
    { icon: "\uD83C\uDFC5", name: "3 mois cons\u00E9cutifs profitables", desc: "Consistance" },
  ];
  return names.map((m) => ({
    icon: m.icon,
    name: m.name,
    description: m.desc,
    achieved: false,
    dateAchieved: null,
    progress: 0,
    progressLabel: "0",
  }));
}

/* ═══════════════════════════════════════════════════════════
   Timeline Component
   ═══════════════════════════════════════════════════════════ */

export default function MilestonesTimeline({ trades }: { trades: Trade[] }) {
  const milestones = useMemo(() => computeMilestones(trades), [trades]);

  const achievedCount = milestones.filter((m) => m.achieved).length;
  const nextMilestone = milestones.find((m) => !m.achieved);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDFC6"}</span>
          Jalons
        </h3>
        <span className="text-xs text-[--text-muted]">
          {achievedCount}/{milestones.length} d\u00E9bloqu\u00E9s
        </span>
      </div>

      {nextMilestone && (
        <p className="text-xs text-[--text-secondary] mb-4">
          Prochain : <span className="font-medium">{nextMilestone.icon} {nextMilestone.name}</span>
          {" \u2014 "}{nextMilestone.progressLabel}
        </p>
      )}

      {/* Vertical timeline */}
      <div className="relative ml-4">
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1;
          return (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connecting line */}
              {!isLast && (
                <div
                  className="absolute left-[11px] top-[28px] w-0.5 bottom-0"
                  style={{
                    background: m.achieved
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(255, 255, 255, 0.06)",
                  }}
                />
              )}

              {/* Node circle */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  m.achieved
                    ? "bg-emerald-500/20 border border-emerald-400/50"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {m.achieved ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[10px] grayscale opacity-50">{m.icon}</span>
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-xl p-3 border transition-all ${
                  m.achieved
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm ${m.achieved ? "" : "grayscale opacity-60"}`}>
                      {m.icon}
                    </span>
                    <span
                      className={`text-sm font-medium truncate ${
                        m.achieved ? "text-emerald-400" : "text-[--text-secondary]"
                      }`}
                    >
                      {m.name}
                    </span>
                  </div>
                  {m.achieved && m.dateAchieved ? (
                    <span className="text-[10px] text-emerald-400/70 whitespace-nowrap">
                      {m.dateAchieved}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[--text-muted] whitespace-nowrap">
                      Pas encore
                    </span>
                  )}
                </div>

                <p
                  className={`text-[10px] mt-1 ${
                    m.achieved ? "text-[--text-secondary]" : "text-[--text-muted]"
                  }`}
                >
                  {m.description}
                </p>

                {/* Progress bar for unachieved */}
                {!m.achieved && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/50 transition-all duration-500"
                        style={{ width: `${Math.max(m.progress, 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[--text-muted] mt-1 block">
                      {m.progressLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
