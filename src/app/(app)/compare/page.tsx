"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  GitCompare,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Lock,
  Crown,
  Check,
} from "lucide-react";

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1 + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface PeriodStats {
  totalPnL: number;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  maxConsWins: number;
  maxConsLosses: number;
  mostTradedAsset: string;
  mostUsedStrategy: string;
  dailyPnL: Record<string, number>;
}

function computeStats(trades: Trade[]): PeriodStats {
  if (trades.length === 0) {
    return {
      totalPnL: 0, tradeCount: 0, winRate: 0, avgPnL: 0,
      bestTrade: 0, worstTrade: 0, profitFactor: 0,
      maxConsWins: 0, maxConsLosses: 0,
      mostTradedAsset: "-", mostUsedStrategy: "-", dailyPnL: {},
    };
  }

  const wins = trades.filter((tr) => tr.result > 0);
  const losses = trades.filter((tr) => tr.result < 0);
  const totalPnL = trades.reduce((s, tr) => s + tr.result, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgPnL = totalPnL / trades.length;
  const bestTrade = Math.max(...trades.map((tr) => tr.result));
  const worstTrade = Math.min(...trades.map((tr) => tr.result));
  const grossWin = wins.reduce((s, tr) => s + tr.result, 0);
  const grossLoss = Math.abs(losses.reduce((s, tr) => s + tr.result, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  let maxConsWins = 0, maxConsLosses = 0, cw = 0, cl = 0;
  for (const tr of trades) {
    if (tr.result > 0) { cw++; cl = 0; maxConsWins = Math.max(maxConsWins, cw); }
    else if (tr.result < 0) { cl++; cw = 0; maxConsLosses = Math.max(maxConsLosses, cl); }
    else { cw = 0; cl = 0; }
  }

  const assetCount: Record<string, number> = {};
  const stratCount: Record<string, number> = {};
  const dailyPnL: Record<string, number> = {};
  for (const tr of trades) {
    assetCount[tr.asset] = (assetCount[tr.asset] || 0) + 1;
    if (tr.strategy) stratCount[tr.strategy] = (stratCount[tr.strategy] || 0) + 1;
    dailyPnL[tr.date] = (dailyPnL[tr.date] || 0) + tr.result;
  }

  const mostTradedAsset = Object.entries(assetCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const mostUsedStrategy = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  return {
    totalPnL, tradeCount: trades.length, winRate, avgPnL,
    bestTrade, worstTrade, profitFactor,
    maxConsWins, maxConsLosses, mostTradedAsset, mostUsedStrategy, dailyPnL,
  };
}

function DeltaBadge({ a, b, suffix = "", invert = false }: { a: number; b: number; suffix?: string; invert?: boolean }) {
  if (a === 0 && b === 0) return <span style={{ color: "var(--text-muted)" }}>-</span>;
  const diff = b - a;
  const pct = a !== 0 ? ((diff / Math.abs(a)) * 100) : (b !== 0 ? 100 : 0);
  const improved = invert ? diff < 0 : diff > 0;
  const color = diff === 0 ? "var(--text-muted)" : improved ? "#10b981" : "#ef4444";
  const Icon = improved ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon size={16} style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>
        {diff > 0 ? "+" : ""}{pct.toFixed(1)}%{suffix}
      </span>
    </div>
  );
}

function StatRow({ label, valueA, valueB, format = "number", invert = false }: {
  label: string; valueA: number | string; valueB: number | string; format?: string; invert?: boolean;
}) {
  const fmtVal = (v: number | string) => {
    if (typeof v === "string") return v;
    if (format === "currency") return `${v >= 0 ? "+" : ""}${v.toFixed(2)} €`;
    if (format === "percent") return `${v.toFixed(1)}%`;
    if (format === "ratio") return v === Infinity ? "∞" : v.toFixed(2);
    return v.toString();
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmtVal(valueA)}</span>
      </div>
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</span>
        {typeof valueA === "number" && typeof valueB === "number" ? (
          <DeltaBadge a={valueA} b={valueB} invert={invert} />
        ) : (
          <span style={{ color: "var(--text-muted)" }}>-</span>
        )}
      </div>
      <div className="text-left">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmtVal(valueB)}</span>
      </div>
    </div>
  );
}

function BarChart({ dailyA, dailyB, noDataLabel }: { dailyA: Record<string, number>; dailyB: Record<string, number>; noDataLabel: string }) {
  const allDates = [...new Set([...Object.keys(dailyA), ...Object.keys(dailyB)])].sort();
  if (allDates.length === 0) {
    return <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>{noDataLabel}</p>;
  }
  const allVals = [...Object.values(dailyA), ...Object.values(dailyB)];
  const maxAbs = Math.max(...allVals.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-1 h-48 px-2 overflow-x-auto">
      {allDates.map((date) => {
        const vA = dailyA[date] || 0;
        const vB = dailyB[date] || 0;
        const hA = Math.abs(vA) / maxAbs * 100;
        const hB = Math.abs(vB) / maxAbs * 100;
        return (
          <div key={date} className="flex items-end gap-0.5 flex-1 min-w-[16px]" style={{ height: "100%" }}>
            <div className="flex flex-col justify-end flex-1" style={{ height: "100%" }}>
              <div
                className="rounded-t-sm w-full transition-all"
                style={{
                  height: `${Math.max(hA, 4)}%`,
                  background: vA >= 0 ? "#06b6d4" : "#06b6d480",
                  opacity: 0.85,
                }}
                title={`A: ${vA.toFixed(2)} € (${date})`}
              />
            </div>
            <div className="flex flex-col justify-end flex-1" style={{ height: "100%" }}>
              <div
                className="rounded-t-sm w-full transition-all"
                style={{
                  height: `${Math.max(hB, 4)}%`,
                  background: vB >= 0 ? "#8b5cf6" : "#8b5cf680",
                  opacity: 0.85,
                }}
                title={`B: ${vB.toFixed(2)} € (${date})`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function generateTakeaways(a: PeriodStats, b: PeriodStats, t: (key: string, params?: Record<string, string | number>) => string): string[] {
  const tips: string[] = [];
  if (a.tradeCount === 0 && b.tradeCount === 0) return [t("noDataToCompare")];

  if (a.winRate > 0 || b.winRate > 0) {
    const diff = b.winRate - a.winRate;
    if (Math.abs(diff) > 1) {
      tips.push(diff > 0
        ? t("winRateIncreased", { pct: diff.toFixed(1) })
        : t("winRateDecreased", { pct: Math.abs(diff).toFixed(1) }));
    }
  }

  if (a.tradeCount > 0 && b.tradeCount > 0) {
    const pct = ((b.tradeCount - a.tradeCount) / a.tradeCount * 100);
    if (Math.abs(pct) > 5) {
      tips.push(pct > 0
        ? t("tradedMoreThisPeriod", { pct: pct.toFixed(0) })
        : t("tradedLessThisPeriod", { pct: Math.abs(pct).toFixed(0) }));
    }
  }

  if (a.worstTrade < 0 && b.worstTrade < 0) {
    const improvePct = ((Math.abs(b.worstTrade) - Math.abs(a.worstTrade)) / Math.abs(a.worstTrade) * 100);
    if (improvePct < -10) {
      tips.push(t("betterLossManagement", { pct: improvePct.toFixed(0) }));
    }
  }

  if (b.profitFactor > a.profitFactor && a.profitFactor > 0) {
    tips.push(t("profitFactorImproved", { from: a.profitFactor.toFixed(2), to: b.profitFactor.toFixed(2) }));
  }

  if (b.avgPnL > a.avgPnL) {
    tips.push(t("avgPnlIncreased", { from: a.avgPnL.toFixed(2), to: b.avgPnL.toFixed(2) }));
  }

  if (tips.length === 0) tips.push(t("noSignificantChange"));
  return tips;
}

export default function ComparePage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const [isVip, setIsVip] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(-1);

  const [periodA, setPeriodA] = useState({ start: lastWeek.start, end: lastWeek.end });
  const [periodB, setPeriodB] = useState({ start: thisWeek.start, end: thisWeek.end });
  const [preset, setPreset] = useState<string>("week");

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "week") {
      setPeriodA(getWeekRange(-1));
      setPeriodB(getWeekRange(0));
    } else if (key === "month") {
      setPeriodA(getMonthRange(-1));
      setPeriodB(getMonthRange(0));
    }
  };

  const tradesA = useMemo(() =>
    trades.filter((tr) => tr.date >= periodA.start && tr.date <= periodA.end)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [trades, periodA]);

  const tradesB = useMemo(() =>
    trades.filter((tr) => tr.date >= periodB.start && tr.date <= periodB.end)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [trades, periodB]);

  const statsA = useMemo(() => computeStats(tradesA), [tradesA]);
  const statsB = useMemo(() => computeStats(tradesB), [tradesB]);
  const takeaways = useMemo(() => generateTakeaways(statsA, statsB, t), [statsA, statsB, t]);

  if (loading || isVip === null) {
    return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>{t("loading")}</div>;
  }

  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: `${40 + i * 10}%` }} />
                <div className="h-3 rounded" style={{ background: "var(--border)", width: `${20 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Comparez vos performances entre différentes périodes de trading
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Comparez vos performances entre périodes",
              "Identifiez vos tendances d\u2019amélioration",
              "Analyse comparative détaillée",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitCompare size={28} style={{ color: "#06b6d4" }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("comparison")}</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("compareTwoPeriodsDesc")}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("periodSelection")}</span>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "week", label: t("thisWeekVsLast") },
            { key: "month", label: t("thisMonthVsLast") },
            { key: "custom", label: t("custom") },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: preset === p.key ? "rgba(6,182,212,0.15)" : "var(--bg-hover)",
                color: preset === p.key ? "#06b6d4" : "var(--text-secondary)",
                border: preset === p.key ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>
              {t("periodA")}
            </span>
            <div className="flex gap-2">
              <input type="date" className="input-field flex-1" value={periodA.start}
                onChange={(e) => { setPeriodA((p) => ({ ...p, start: e.target.value })); setPreset("custom"); }} />
              <input type="date" className="input-field flex-1" value={periodA.end}
                onChange={(e) => { setPeriodA((p) => ({ ...p, end: e.target.value })); setPreset("custom"); }} />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
              {t("periodB")}
            </span>
            <div className="flex gap-2">
              <input type="date" className="input-field flex-1" value={periodB.start}
                onChange={(e) => { setPeriodB((p) => ({ ...p, start: e.target.value })); setPreset("custom"); }} />
              <input type="date" className="input-field flex-1" value={periodB.end}
                onChange={(e) => { setPeriodB((p) => ({ ...p, end: e.target.value })); setPreset("custom"); }} />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("detailedComparison")}</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-3 mb-2" style={{ borderBottom: "2px solid var(--border)" }}>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#06b6d4" }}>{t("periodA")}</span>
          </div>
          <div className="min-w-[80px] text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Delta</span>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>{t("periodB")}</span>
          </div>
        </div>

        <StatRow label={t("totalPnl")} valueA={statsA.totalPnL} valueB={statsB.totalPnL} format="currency" />
        <StatRow label={t("tradesCount")} valueA={statsA.tradeCount} valueB={statsB.tradeCount} />
        <StatRow label={t("winRate")} valueA={statsA.winRate} valueB={statsB.winRate} format="percent" />
        <StatRow label={t("avgPnl")} valueA={statsA.avgPnL} valueB={statsB.avgPnL} format="currency" />
        <StatRow label={t("bestTrade")} valueA={statsA.bestTrade} valueB={statsB.bestTrade} format="currency" />
        <StatRow label={t("worstTrade")} valueA={statsA.worstTrade} valueB={statsB.worstTrade} format="currency" invert />
        <StatRow label={t("profitFactor")} valueA={statsA.profitFactor} valueB={statsB.profitFactor} format="ratio" />
        <StatRow label={t("consecutiveWins")} valueA={statsA.maxConsWins} valueB={statsB.maxConsWins} />
        <StatRow label={t("consecutiveLosses")} valueA={statsA.maxConsLosses} valueB={statsB.maxConsLosses} invert />
        <StatRow label={t("mainAsset")} valueA={statsA.mostTradedAsset} valueB={statsB.mostTradedAsset} />
        <StatRow label={t("mainStrategy")} valueA={statsA.mostUsedStrategy} valueB={statsB.mostUsedStrategy} />
      </div>

      {/* Overlapping Equity Curves */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("dailyPnl")}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#06b6d4" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodA")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodB")}</span>
            </div>
          </div>
        </div>
        <BarChart dailyA={statsA.dailyPnL} dailyB={statsB.dailyPnL} noDataLabel={t("noData")} />
      </div>

      {/* Key Takeaways */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: "#10b981" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("keyTakeaways")}</span>
        </div>
        <div className="space-y-2">
          {takeaways.map((tip, i) => {
            const isPositive = tip.includes("augmenté") || tip.includes("amélioré") || tip.includes("hausse") || tip.includes("Meilleure") || tip.includes("increased") || tip.includes("improved") || tip.includes("better") || tip.includes("higher") || tip.includes("+");
            const icon = isPositive
              ? <TrendingUp size={14} style={{ color: "#10b981" }} />
              : <TrendingDown size={14} style={{ color: "#ef4444" }} />;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <div className="mt-0.5">{icon}</div>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{tip}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
