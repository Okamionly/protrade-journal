"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { computeStats, computeStreaks, computeAssetPerformance, computeEmotionPerformance, computeMonthlyComparison } from "@/lib/utils";
import { WeekdayChart, EquityChart, MonthlyComparisonChart, EmotionChart, AdvancedEquityChart } from "@/components/ChartComponents";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useUser } from "@/hooks/useTrades";
import { useVipAccess } from "@/hooks/useVipAccess";
import { TrendingUp, TrendingDown, Zap, Flame, ArrowUpRight, ArrowDownRight, Clock, Activity, ChevronUp, ChevronDown, BarChart3, GitCompare, Tag, Crosshair, Crown, Timer, Target, AlertTriangle, Brain } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import Link from "next/link";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const { isVip } = useVipAccess();
  const [showNet, setShowNet] = useState(false);
  const stats = computeStats(trades);
  const streaks = computeStreaks(trades);
  const assetPerf = computeAssetPerformance(trades);
  const emotionPerf = computeEmotionPerformance(trades);
  const monthlyData = computeMonthlyComparison(trades);

  const advancedStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { sortino: 0, calmar: 0, recoveryTrades: 0, monthlyMomentum: [], tw: { pnl: 0, trades: 0, winRate: 0 }, lw: { pnl: 0, trades: 0, winRate: 0 }, tm: { pnl: 0, trades: 0, winRate: 0 }, lm: { pnl: 0, trades: 0, winRate: 0 }, pnlChange: () => 0 };
    }
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const results = sorted.map(t => t.result);
    const mean = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;

    // Sortino Ratio
    const downsideReturns = results.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 1
      ? downsideReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / downsideReturns.length
      : 0;
    const downsideDev = Math.sqrt(downsideVariance);
    const sortino = downsideDev > 0 ? (mean / downsideDev) * Math.sqrt(252) : 0;

    // Calmar Ratio
    const totalReturn = results.reduce((a, b) => a + b, 0);
    const daysSpan = sorted.length >= 2
      ? (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24)
      : 1;
    const annualizedReturn = daysSpan > 0 ? (totalReturn / Math.max(daysSpan, 1)) * 365 : 0;
    const calmar = stats.maxDrawdown > 0 ? annualizedReturn / stats.maxDrawdown : 0;

    // Recovery Time
    let peak = 0;
    let maxDD = 0;
    let ddStartIdx = 0;
    let ddEndIdx = 0;
    let cumulative = 0;
    sorted.forEach((tr, i) => {
      cumulative += tr.result;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) { maxDD = dd; ddEndIdx = i; }
    });
    cumulative = 0;
    let peakVal = 0;
    for (let i = 0; i <= ddEndIdx; i++) {
      cumulative += sorted[i].result;
      if (cumulative >= peakVal) { peakVal = cumulative; ddStartIdx = i; }
    }
    let recoveryTrades = -1;
    cumulative = 0;
    for (let i = 0; i < sorted.length; i++) {
      cumulative += sorted[i].result;
      if (i > ddEndIdx && cumulative >= peakVal) { recoveryTrades = i - ddEndIdx; break; }
    }

    // Monthly momentum
    const now = new Date();
    const monthMap: Record<string, number> = {};
    sorted.forEach(tr => {
      const d = new Date(tr.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + tr.result;
    });
    const monthKeys = Object.keys(monthMap).sort();
    const monthlyMomentum = monthKeys.slice(-6).map((key, i, arr) => {
      const prev = i > 0 ? monthMap[arr[i - 1]] : null;
      const cur = monthMap[key];
      const change = prev !== null && prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
      const [y, m] = key.split("-");
      const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { key, label, pnl: cur, change };
    });

    // Period-over-period comparison
    const startOfWeek = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.getFullYear(), d.getMonth(), diff);
    };
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const periodTrades = (start: Date, end: Date) => {
      return sorted.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
    };

    const periodStats = (arr: typeof trades) => {
      const pnl = arr.reduce((s, t) => s + t.result, 0);
      const w = arr.filter(t => t.result > 0).length;
      const wr = arr.length > 0 ? (w / arr.length) * 100 : 0;
      return { pnl, trades: arr.length, winRate: wr };
    };

    const tw = periodStats(periodTrades(thisWeekStart, now));
    const lw = periodStats(periodTrades(lastWeekStart, new Date(thisWeekStart.getTime() - 1)));
    const tm = periodStats(periodTrades(thisMonthStart, now));
    const lm = periodStats(periodTrades(lastMonthStart, lastMonthEnd));

    const pnlChange = (cur: number, prev: number) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : cur !== 0 ? 100 : 0;

    void ddStartIdx; // used in computation above

    return { sortino, calmar, recoveryTrades, monthlyMomentum, tw, lw, tm, lm, pnlChange };
  }, [trades, stats.maxDrawdown]);

  if (loading) return <AnalyticsSkeleton />;

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <TrendingUp className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("analytics")}</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("emptyStateMessage")}</p>
        <Link href="/journal" className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--accent-primary), #6366f1)" }}>
          {t("emptyStateCta")}
        </Link>
      </div>
    );
  }

  const getPnl = (tr: typeof trades[0]) => showNet ? tr.result - (tr.commission || 0) - (tr.swap || 0) : tr.result;

  return (
    <div className="space-y-6">
      {/* Brut/Net Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNet(!showNet)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
          style={{
            background: showNet ? "var(--accent-primary)" : "var(--bg-secondary)",
            color: showNet ? "#fff" : "var(--text-secondary)",
            border: `1px solid ${showNet ? "transparent" : "var(--border)"}`,
          }}
        >
          {showNet ? t("netFees") : t("gross")}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <h4 className="text-[--text-secondary] text-sm mb-2">{t("profitFactor")}</h4>
          <p className="text-3xl font-bold text-emerald-400 mono">
            {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          </p>
          <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(stats.profitFactor * 25, 100)}%` }} />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h4 className="text-[--text-secondary] text-sm mb-2">{t("drawdownMax")}</h4>
          <p className="text-3xl font-bold text-rose-400 mono">
            -€{stats.maxDrawdown.toFixed(2)}
          </p>
          <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${Math.min((stats.maxDrawdown / (user?.balance ?? 25000)) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h4 className="text-[--text-secondary] text-sm mb-2">{t("sharpeRatio")}</h4>
          <p className="text-3xl font-bold text-blue-400 mono">{stats.sharpeRatio.toFixed(2)}</p>
          <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(Math.abs(stats.sharpeRatio) * 30, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Sortino Ratio, Calmar Ratio, Recovery Time */}
      {(() => {
        const { sortino, calmar, recoveryTrades, monthlyMomentum, tw, lw, tm, lm, pnlChange } = advancedStats;
        return (
          <>
            {/* Sortino, Calmar, Recovery Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <h4 className="text-[--text-secondary] text-sm">{t("sortinoRatio")}</h4>
                </div>
                <p className={`text-3xl font-bold mono ${sortino >= 1 ? "text-emerald-400" : sortino >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                  {sortino.toFixed(2)}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">{t("sortinoRatio")}</p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${Math.min(Math.abs(sortino) * 25, 100)}%` }} />
                </div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-[--text-secondary] text-sm">{t("calmarRatio")}</h4>
                </div>
                <p className={`text-3xl font-bold mono ${calmar >= 1 ? "text-emerald-400" : calmar >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                  {calmar.toFixed(2)}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">{t("calmarRatio")}</p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${Math.min(Math.abs(calmar) * 20, 100)}%` }} />
                </div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-[--text-secondary] text-sm">{t("recoveryTime")}</h4>
                </div>
                <p className={`text-3xl font-bold mono ${recoveryTrades < 0 ? "text-rose-400" : recoveryTrades <= 5 ? "text-emerald-400" : "text-amber-400"}`}>
                  {recoveryTrades < 0 ? "N/R" : `${recoveryTrades} ${t("tradesLabel")}`}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">
                  {recoveryTrades < 0 ? t("drawdownNotRecovered") : t("tradesToRecoverFromDrawdown")}
                </p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className={`h-full ${recoveryTrades < 0 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: recoveryTrades < 0 ? "100%" : `${Math.min((recoveryTrades / 20) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Monthly Momentum */}
            {monthlyMomentum.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t("monthlyMomentum")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {monthlyMomentum.map(m => (
                    <div key={m.key} className="bg-[--bg-secondary]/50 rounded-xl p-4 text-center">
                      <p className="text-xs text-[--text-muted] mb-1">{m.label}</p>
                      <p className={`text-lg font-bold mono ${m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {m.pnl >= 0 ? "+" : ""}€{m.pnl.toFixed(0)}
                      </p>
                      {m.change !== null ? (
                        <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-medium ${m.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.change >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span className="mono">{m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <p className="text-xs text-[--text-muted] mt-1">-</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Period-over-Period Comparison */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <GitCompare className="w-5 h-5 text-[--text-secondary]" />
                <h3 className="text-lg font-semibold">{t("comparison")}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* This week vs last week */}
                <div className="bg-[--bg-secondary]/30 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-medium text-[--text-secondary]">{t("thisWeek")} vs {t("weeklyRecap")}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[--text-muted]">{t("thisWeek")}</p>
                      <p className={`text-xl font-bold mono ${tw.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {tw.pnl >= 0 ? "+" : ""}€{tw.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{tw.trades} trades | WR {tw.winRate.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--text-muted]">{t("vsPrevWeek")}</p>
                      <p className={`text-xl font-bold mono ${lw.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {lw.pnl >= 0 ? "+" : ""}€{lw.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{lw.trades} trades | WR {lw.winRate.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[--border-subtle]">
                    {pnlChange(tw.pnl, lw.pnl) >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    )}
                    <span className={`text-sm font-medium mono ${pnlChange(tw.pnl, lw.pnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnlChange(tw.pnl, lw.pnl) >= 0 ? "+" : ""}{pnlChange(tw.pnl, lw.pnl).toFixed(1)}% P&L
                    </span>
                    <span className="text-xs text-[--text-muted]">{t("vsPrevWeek")}</span>
                  </div>
                </div>

                {/* This month vs last month */}
                <div className="bg-[--bg-secondary]/30 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-medium text-[--text-secondary]">{t("thisMonth")} vs {t("monthlyRecap")}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[--text-muted]">{t("thisMonth")}</p>
                      <p className={`text-xl font-bold mono ${tm.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {tm.pnl >= 0 ? "+" : ""}€{tm.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{tm.trades} trades | WR {tm.winRate.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--text-muted]">{t("comparedToPrev")}</p>
                      <p className={`text-xl font-bold mono ${lm.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {lm.pnl >= 0 ? "+" : ""}€{lm.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{lm.trades} trades | WR {lm.winRate.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[--border-subtle]">
                    {pnlChange(tm.pnl, lm.pnl) >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    )}
                    <span className={`text-sm font-medium mono ${pnlChange(tm.pnl, lm.pnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnlChange(tm.pnl, lm.pnl) >= 0 ? "+" : ""}{pnlChange(tm.pnl, lm.pnl).toFixed(1)}% P&L
                    </span>
                    <span className="text-xs text-[--text-muted]">{t("comparedToPrev")}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("bestStreakW")}</p>
            <p className="text-xl font-bold text-emerald-400 mono">{streaks.bestWinStreak} {t("winsLabel")}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("worstStreakL")}</p>
            <p className="text-xl font-bold text-rose-400 mono">{streaks.worstLossStreak} {t("lossesLabel")}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            {streaks.currentStreakType === "win" ? <Flame className="w-5 h-5 text-emerald-400" /> : <Zap className="w-5 h-5 text-rose-400" />}
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("currentStreak")}</p>
            <p className={`text-xl font-bold mono ${streaks.currentStreakType === "win" ? "text-emerald-400" : streaks.currentStreakType === "loss" ? "text-rose-400" : "text-[--text-secondary]"}`}>
              {streaks.currentStreak > 0 ? `${streaks.currentStreak} ${streaks.currentStreakType === "win" ? t("winsLabel") : t("lossesLabel")}` : "-"}
            </p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("avgRR")}</p>
            <p className="text-xl font-bold text-amber-400 mono">1:{stats.avgRR}</p>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("performancePerDay")}</h3>
          <WeekdayChart trades={trades} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("equityCurve")}</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
      </div>

      {/* Advanced Equity Curve with Drawdown */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t("advancedEquityDrawdown")}</h3>
        <div className="h-80">
          <AdvancedEquityChart trades={trades} />
        </div>
        {/* Meilleur mois / Pire mois labels */}
        {(() => {
          const monthMap: Record<string, number> = {};
          trades.forEach(tr => {
            const d = new Date(tr.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthMap[key] = (monthMap[key] || 0) + tr.result;
          });
          const entries = Object.entries(monthMap);
          if (entries.length < 1) return null;
          const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);
          const worst = entries.reduce((a, b) => a[1] < b[1] ? a : b);
          const fmtMonth = (key: string) => {
            const [y, m] = key.split("-");
            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          };
          return (
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Meilleur mois: {fmtMonth(best[0])}</span>
                <span className="text-xs font-bold text-emerald-400 mono">+{best[1].toFixed(0)}€</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-rose-400 font-medium">Pire mois: {fmtMonth(worst[0])}</span>
                <span className="text-xs font-bold text-rose-400 mono">{worst[1].toFixed(0)}€</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("monthlyRecap")}</h3>
          {monthlyData.length > 0 ? (
            <MonthlyComparisonChart data={monthlyData} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">{t("noData")}</p>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("avgPnlByEmotion")}</h3>
          {emotionPerf.length > 0 ? (
            <EmotionChart data={emotionPerf} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">{t("noData")}</p>
          )}
        </div>
      </div>

      {/* R-Multiple Distribution */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t("distribution")} R-Multiple</h3>
        {(() => {
          const rMultiples = trades
            .filter(t => t.sl && t.entry !== t.sl)
            .map(t => {
              const risk = Math.abs(t.entry - t.sl);
              return risk > 0 ? t.result / risk : 0;
            })
            .filter(r => Math.abs(r) < 50);

          if (rMultiples.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-12">{t("noData")}</p>;
          }

          const buckets: Record<string, number> = {};
          for (let i = -5; i <= 5; i += 0.5) {
            buckets[i.toFixed(1)] = 0;
          }
          rMultiples.forEach(r => {
            const clamped = Math.max(-5, Math.min(5, r));
            const bucket = (Math.round(clamped * 2) / 2).toFixed(1);
            if (buckets[bucket] !== undefined) buckets[bucket]++;
          });

          const maxCount = Math.max(...Object.values(buckets), 1);

          return (
            <div className="space-y-3">
              <div className="flex items-end gap-[2px] h-40">
                {Object.entries(buckets).map(([key, count]) => {
                  const r = parseFloat(key);
                  const h = count > 0 ? Math.max((count / maxCount) * 100, 4) : 0;
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center justify-end group relative">
                      {count > 0 && (
                        <div className="absolute -top-6 text-[9px] text-[--text-muted] opacity-0 group-hover:opacity-100 transition">{count}</div>
                      )}
                      <div
                        className={`w-full rounded-t transition-all ${r >= 0 ? "bg-emerald-500" : "bg-rose-500"} hover:opacity-80`}
                        style={{ height: `${h}%` }}
                        title={`${key}R: ${count} trades`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[--text-muted]">
                <span>-5R</span>
                <span>0R</span>
                <span>+5R</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-xs text-[--text-muted]">{t("avgRR")}</p>
                  <p className={`text-lg font-bold mono ${(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">{t("best")}</p>
                  <p className="text-lg font-bold mono text-emerald-400">+{Math.max(...rMultiples).toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">{t("worstTrade")}</p>
                  <p className="text-lg font-bold mono text-rose-400">{Math.min(...rMultiples).toFixed(2)}R</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Equity by Strategy - Horizontal Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("strategyBreakdown")}</h3>
          {(() => {
            const strategies = [...new Set(trades.map(t => t.strategy))];
            if (strategies.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">{t("noData")}</p>;

            const bgColors = ["bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500"];
            const strategyEquity: Record<string, number> = {};
            strategies.forEach(s => { strategyEquity[s] = 0; });
            trades.forEach(tr => { strategyEquity[tr.strategy] += tr.result; });
            const sorted = Object.entries(strategyEquity).sort((a, b) => b[1] - a[1]);
            const maxVal = Math.max(...sorted.map(([, v]) => Math.abs(v)), 1);

            return (
              <div className="space-y-3">
                {sorted.map(([name, pnl], i) => {
                  const width = (Math.abs(pnl) / maxVal) * 100;
                  const count = trades.filter(t => t.strategy === name).length;
                  const wins = trades.filter(t => t.strategy === name && t.result > 0).length;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{name} <span className="text-[--text-muted] text-xs">({count}t, {count > 0 ? ((wins / count) * 100).toFixed(0) : 0}%)</span></span>
                        <span className={`mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-3 bg-[--bg-secondary]/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pnl >= 0 ? bgColors[i % bgColors.length] : "bg-rose-500"}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("assetBreakdown")}</h3>
          {(() => {
            const assets = [...new Set(trades.map(t => t.asset))];
            if (assets.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">{t("noData")}</p>;

            const bgColors = ["bg-blue-500", "bg-cyan-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];
            const assetEquity: Record<string, number> = {};
            assets.forEach(a => { assetEquity[a] = 0; });
            trades.forEach(tr => { assetEquity[tr.asset] += tr.result; });
            const sorted = Object.entries(assetEquity).sort((a, b) => b[1] - a[1]);
            const maxVal = Math.max(...sorted.map(([, v]) => Math.abs(v)), 1);

            return (
              <div className="space-y-3">
                {sorted.map(([name, pnl], i) => {
                  const width = (Math.abs(pnl) / maxVal) * 100;
                  const count = trades.filter(t => t.asset === name).length;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{name} <span className="text-[--text-muted] text-xs">({count}t)</span></span>
                        <span className={`mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-3 bg-[--bg-secondary]/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pnl >= 0 ? bgColors[i % bgColors.length] : "bg-rose-500"}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Performance par Asset */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t("assetBreakdown")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("asset")}</th>
                <th className="pb-3 font-medium">{t("trades")}</th>
                <th className="pb-3 font-medium">{t("winRate")}</th>
                <th className="pb-3 font-medium">{t("netProfit")}</th>
                <th className="pb-3 font-medium">{t("moyPnl")}</th>
              </tr>
            </thead>
            <tbody>
              {assetPerf.map((a) => (
                <tr key={a.asset} className="border-b border-[--border-subtle]">
                  <td className="py-3 font-medium">{a.asset}</td>
                  <td className="py-3 mono">{a.trades}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${a.winRate}%` }} />
                      </div>
                      <span className="mono text-emerald-400 text-xs">{a.winRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className={`py-3 mono font-bold ${a.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {a.totalPnL >= 0 ? "+" : ""}€{a.totalPnL.toFixed(2)}
                  </td>
                  <td className={`py-3 mono ${a.avgPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    €{a.avgPnL.toFixed(2)}
                  </td>
                </tr>
              ))}
              {assetPerf.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-[--text-muted]">{t("noData")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emotional Analysis */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t("emotionalAnalysis")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("emotionPsychology")}</th>
                <th className="pb-3 font-medium">{t("trades")}</th>
                <th className="pb-3 font-medium">{t("winRate")}</th>
                <th className="pb-3 font-medium">{t("netProfit")}</th>
                <th className="pb-3 font-medium">{t("moyPnl")}</th>
              </tr>
            </thead>
            <tbody>
              {emotionPerf.map((e) => (
                <tr key={e.emotion} className="border-b border-[--border-subtle]">
                  <td className="py-3 font-medium">{e.emotion}</td>
                  <td className="py-3 mono">{e.trades}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${e.winRate}%` }} />
                      </div>
                      <span className="mono text-emerald-400 text-xs">{e.winRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className={`py-3 mono font-bold ${e.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {e.totalPnL >= 0 ? "+" : ""}€{e.totalPnL.toFixed(2)}
                  </td>
                  <td className={`py-3 mono ${e.avgPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    €{e.avgPnL.toFixed(2)}
                  </td>
                </tr>
              ))}
              {emotionPerf.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-[--text-muted]">{t("noData")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t("strategyBreakdown")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("strategy")}</th>
                <th className="pb-3 font-medium">{t("trades")}</th>
                <th className="pb-3 font-medium">{t("winRate")}</th>
                <th className="pb-3 font-medium">{t("netProfit")}</th>
                <th className="pb-3 font-medium">{t("moyPnl")}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const strategyMap: Record<string, { count: number; wins: number; total: number }> = {};
                trades.forEach((tr) => {
                  if (!strategyMap[tr.strategy]) strategyMap[tr.strategy] = { count: 0, wins: 0, total: 0 };
                  strategyMap[tr.strategy].count++;
                  strategyMap[tr.strategy].total += getPnl(tr);
                  if (tr.result > 0) strategyMap[tr.strategy].wins++;
                });
                return Object.entries(strategyMap).map(([name, s]) => (
                  <tr key={name} className="border-b border-[--border-subtle]">
                    <td className="py-3 font-medium">{name}</td>
                    <td className="py-3 mono">{s.count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(s.wins / s.count) * 100}%` }} />
                        </div>
                        <span className="mono text-emerald-400 text-xs">{((s.wins / s.count) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className={`py-3 mono font-bold ${s.total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.total >= 0 ? "+" : ""}€{s.total.toFixed(2)}
                    </td>
                    <td className={`py-3 mono ${s.total / s.count >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      €{(s.total / s.count).toFixed(2)}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance par Tag */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-[--text-secondary]" />
          <h3 className="text-lg font-semibold">{t("performanceByTag")}</h3>
        </div>
        {(() => {
          const tagMap: Record<string, { count: number; wins: number; total: number }> = {};
          trades.forEach((tr) => {
            if (!tr.tags) return;
            tr.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(tag => {
              if (!tagMap[tag]) tagMap[tag] = { count: 0, wins: 0, total: 0 };
              tagMap[tag].count++;
              tagMap[tag].total += getPnl(tr);
              if (tr.result > 0) tagMap[tag].wins++;
            });
          });
          const entries = Object.entries(tagMap).sort((a, b) => b[1].total - a[1].total);
          if (entries.length === 0) return <p className="text-[--text-muted] text-sm text-center py-8">{t("noTagRecorded")}</p>;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                    <th className="pb-3 font-medium">{t("tagLabel")}</th>
                    <th className="pb-3 font-medium">{t("trades")}</th>
                    <th className="pb-3 font-medium">{t("winRate")}</th>
                    <th className="pb-3 font-medium">{t("pnlLabel")}</th>
                    <th className="pb-3 font-medium">{t("avgLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([tag, s]) => (
                    <tr key={tag} className="border-b border-[--border-subtle]">
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{tag}</span>
                      </td>
                      <td className="py-3 mono">{s.count}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${(s.wins / s.count) * 100}%` }} />
                          </div>
                          <span className="mono text-emerald-400 text-xs">{((s.wins / s.count) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className={`py-3 mono font-bold ${s.total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {s.total >= 0 ? "+" : ""}€{s.total.toFixed(2)}
                      </td>
                      <td className={`py-3 mono ${s.total / s.count >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        €{(s.total / s.count).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* MAE vs MFE Scatter Plot */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crosshair className="w-5 h-5 text-[--text-secondary]" />
          <h3 className="text-lg font-semibold">{t("maeMfeAnalysis")}</h3>
        </div>
        {(() => {
          const maeMfeTrades = trades.filter(tr => tr.maePrice != null && tr.mfePrice != null && tr.entry);
          if (maeMfeTrades.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-8">{t("fillMaeMfeForAnalysis")}</p>;
          }

          const points = maeMfeTrades.map(tr => {
            const mae = Math.abs(tr.entry - (tr.maePrice || tr.entry));
            const mfe = Math.abs((tr.mfePrice || tr.entry) - tr.entry);
            return { mae, mfe, result: tr.result, asset: tr.asset };
          });

          const maxMae = Math.max(...points.map(p => p.mae), 0.0001);
          const maxMfe = Math.max(...points.map(p => p.mfe), 0.0001);
          const maxAxis = Math.max(maxMae, maxMfe) * 1.1;

          return (
            <div className="space-y-4">
              <div className="relative w-full aspect-square max-w-md mx-auto" style={{ border: "1px solid var(--border)" }}>
                {/* Grid lines */}
                <div className="absolute inset-0">
                  {[0.25, 0.5, 0.75].map(pct => (
                    <div key={`h-${pct}`}>
                      <div className="absolute w-full" style={{ bottom: `${pct * 100}%`, height: "1px", background: "var(--border-subtle)" }} />
                      <div className="absolute h-full" style={{ left: `${pct * 100}%`, width: "1px", background: "var(--border-subtle)" }} />
                    </div>
                  ))}
                  {/* Diagonal line (MAE = MFE) */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="100" x2="100" y2="0" stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                  </svg>
                </div>
                {/* Points */}
                {points.map((p, i) => {
                  const x = (p.mae / maxAxis) * 100;
                  const y = (p.mfe / maxAxis) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute w-2.5 h-2.5 rounded-full transform -translate-x-1/2 translate-y-1/2 transition-all hover:scale-150"
                      style={{
                        left: `${x}%`,
                        bottom: `${y}%`,
                        background: p.result >= 0 ? "#10b981" : "#ef4444",
                        opacity: 0.7,
                      }}
                      title={`${p.asset} | MAE: ${p.mae.toFixed(5)} | MFE: ${p.mfe.toFixed(5)} | P&L: €${p.result.toFixed(2)}`}
                    />
                  );
                })}
                {/* Axis labels */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[--text-muted]">{t("maeAdverse")}</span>
                <span className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-[--text-muted]">{t("mfeFavorable")}</span>
              </div>
              <div className="flex justify-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span style={{ color: "var(--text-secondary)" }}>{t("winnerLabel")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span style={{ color: "var(--text-secondary)" }}>{t("loserLabel")}</span>
                </div>
                <span style={{ color: "var(--text-muted)" }}>{maeMfeTrades.length} trades</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                <div>
                  <p className="text-xs text-[--text-muted]">{t("avgMae")}</p>
                  <p className="text-lg font-bold mono text-rose-400">{(points.reduce((s, p) => s + p.mae, 0) / points.length).toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">{t("avgMfe")}</p>
                  <p className="text-lg font-bold mono text-emerald-400">{(points.reduce((s, p) => s + p.mfe, 0) / points.length).toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">{t("ratioMfeMae")}</p>
                  <p className="text-lg font-bold mono text-blue-400">
                    {(() => {
                      const avgMae = points.reduce((s, p) => s + p.mae, 0) / points.length;
                      const avgMfe = points.reduce((s, p) => s + p.mfe, 0) / points.length;
                      return avgMae > 0 ? (avgMfe / avgMae).toFixed(2) : "—";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Heatmap Heure × Asset */}
      <div className="glass rounded-2xl p-6 col-span-full">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[--text-secondary]" />
          <h3 className="text-lg font-semibold">{t("heatmapHourAsset")}</h3>
        </div>
        {(() => {
          // Build heatmap data: { [asset]: { [hour]: { count, wins, totalPnl } } }
          const heatmap: Record<string, Record<number, { count: number; wins: number; totalPnl: number }>> = {};
          const assetTotalCount: Record<string, number> = {};

          trades.forEach((tr) => {
            const d = new Date(tr.date);
            const hour = d.getUTCHours();
            const asset = tr.asset;
            if (!heatmap[asset]) heatmap[asset] = {};
            if (!heatmap[asset][hour]) heatmap[asset][hour] = { count: 0, wins: 0, totalPnl: 0 };
            heatmap[asset][hour].count++;
            heatmap[asset][hour].totalPnl += getPnl(tr);
            if (tr.result > 0) heatmap[asset][hour].wins++;
            assetTotalCount[asset] = (assetTotalCount[asset] || 0) + 1;
          });

          // Filter: only assets with 3+ trades
          const filteredAssets = Object.keys(heatmap)
            .filter((a) => assetTotalCount[a] >= 3)
            .sort((a, b) => assetTotalCount[b] - assetTotalCount[a]);

          if (filteredAssets.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-8">{t("notEnoughTradesForHeatmap")}</p>;
          }

          // Collect hours that have at least 1 trade across all filtered assets
          const activeHoursSet = new Set<number>();
          filteredAssets.forEach((asset) => {
            Object.keys(heatmap[asset]).forEach((h) => {
              if (heatmap[asset][Number(h)].count > 0) activeHoursSet.add(Number(h));
            });
          });
          const activeHours = Array.from(activeHoursSet).sort((a, b) => a - b);

          if (activeHours.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-8">{t("noHourlyData")}</p>;
          }

          const getCellColor = (winRate: number): string => {
            if (winRate > 55) return "rgba(16, 185, 129, 0.5)";   // green
            if (winRate >= 45) return "rgba(245, 158, 11, 0.4)";  // amber
            return "rgba(239, 68, 68, 0.45)";                      // red
          };

          const getCellTextColor = (winRate: number): string => {
            if (winRate > 55) return "#6ee7b7";
            if (winRate >= 45) return "#fcd34d";
            return "#fca5a5";
          };

          return (
            <div className="space-y-3">
              <p className="text-xs text-[--text-muted]">{t("heatmapDescription")}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: `${activeHours.length * 44 + 100}px` }}>
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-[--text-secondary] sticky left-0 z-10" style={{ background: "var(--bg-primary)" }}>Asset</th>
                      {activeHours.map((h) => (
                        <th key={h} className="py-2 px-1 font-medium text-[--text-muted] text-center" style={{ minWidth: "40px" }}>
                          {String(h).padStart(2, "0")}h
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset} className="border-t border-[--border-subtle]">
                        <td className="py-1.5 px-2 font-medium text-[--text-primary] sticky left-0 z-10 whitespace-nowrap" style={{ background: "var(--bg-primary)" }}>
                          {asset}
                          <span className="ml-1 text-[--text-muted]">({assetTotalCount[asset]})</span>
                        </td>
                        {activeHours.map((h) => {
                          const cell = heatmap[asset][h];
                          if (!cell || cell.count === 0) {
                            return (
                              <td key={h} className="py-1.5 px-1 text-center text-[--text-muted]">
                                -
                              </td>
                            );
                          }
                          const winRate = (cell.wins / cell.count) * 100;
                          const avgPnl = cell.totalPnl / cell.count;
                          return (
                            <td
                              key={h}
                              className="py-1.5 px-1 text-center mono font-semibold rounded-sm cursor-default transition-transform hover:scale-110"
                              style={{
                                background: getCellColor(winRate),
                                color: getCellTextColor(winRate),
                              }}
                              title={`${asset} a ${String(h).padStart(2, "0")}:00 UTC: ${winRate.toFixed(0)}% win rate, ${cell.count} trade${cell.count > 1 ? "s" : ""}, avg ${avgPnl >= 0 ? "+" : ""}${avgPnl.toFixed(2)}€`}
                            >
                              {winRate.toFixed(0)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-[--text-muted] mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.45)" }} />
                  <span>&lt;45%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(245, 158, 11, 0.4)" }} />
                  <span>45-55%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.5)" }} />
                  <span>&gt;55%</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══════════════════════ EQUITY CURVE SVG ═══════════════════════ */}
      {trades.length > 1 && (() => {
        const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const points: { date: Date; cumPnl: number; peak: number }[] = [];
        let cum = 0;
        let peak = 0;
        sorted.forEach((tr) => {
          cum += getPnl(tr);
          if (cum > peak) peak = cum;
          points.push({ date: new Date(tr.date), cumPnl: cum, peak });
        });

        const svgW = 900;
        const svgH = 320;
        const padL = 70;
        const padR = 20;
        const padT = 20;
        const padB = 40;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;

        const minPnl = Math.min(...points.map((p) => p.cumPnl), 0);
        const maxPnl = Math.max(...points.map((p) => p.cumPnl), 1);
        const range = maxPnl - minPnl || 1;
        const minTime = points[0].date.getTime();
        const maxTime = points[points.length - 1].date.getTime();
        const timeRange = maxTime - minTime || 1;

        const px = (d: Date) => padL + ((d.getTime() - minTime) / timeRange) * chartW;
        const py = (v: number) => padT + chartH - ((v - minPnl) / range) * chartH;

        // Equity line path
        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.date).toFixed(1)},${py(p.cumPnl).toFixed(1)}`).join(" ");

        // Drawdown fill: area between peak line and equity line where equity < peak
        let ddPath = "";
        const ddSegments: string[] = [];
        let inDD = false;
        let segStart = "";
        const peakLine: string[] = [];
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const x = px(p.date).toFixed(1);
          const yEquity = py(p.cumPnl).toFixed(1);
          const yPeak = py(p.peak).toFixed(1);
          if (p.cumPnl < p.peak) {
            if (!inDD) {
              segStart = `M${x},${yPeak} L${x},${yEquity}`;
              peakLine.length = 0;
              peakLine.push(`${x},${yPeak}`);
              inDD = true;
            } else {
              segStart += ` L${x},${yEquity}`;
              peakLine.push(`${x},${yPeak}`);
            }
          } else if (inDD) {
            // Close the DD segment
            segStart += ` L${x},${yEquity}`;
            peakLine.push(`${x},${yPeak}`);
            const peakBack = [...peakLine].reverse().map((pt) => `L${pt}`).join(" ");
            ddSegments.push(`${segStart} ${peakBack} Z`);
            inDD = false;
          }
        }
        if (inDD && peakLine.length > 0) {
          const lastX = px(points[points.length - 1].date).toFixed(1);
          const lastYP = py(points[points.length - 1].peak).toFixed(1);
          segStart += ` L${lastX},${lastYP}`;
          const peakBack = [...peakLine].reverse().map((pt) => `L${pt}`).join(" ");
          ddSegments.push(`${segStart} ${peakBack} Z`);
        }
        ddPath = ddSegments.join(" ");

        // Month labels on X axis
        const monthLabels: { x: number; label: string }[] = [];
        const seenMonths = new Set<string>();
        points.forEach((p) => {
          const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
          if (!seenMonths.has(key)) {
            seenMonths.add(key);
            monthLabels.push({
              x: px(p.date),
              label: p.date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
            });
          }
        });

        // Y axis EUR labels
        const ySteps = 5;
        const yLabels: { y: number; label: string }[] = [];
        for (let i = 0; i <= ySteps; i++) {
          const val = minPnl + (range / ySteps) * i;
          yLabels.push({ y: py(val), label: `${val >= 0 ? "+" : ""}${val.toFixed(0)}€` });
        }

        return (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{t("equityCurve")} — Courbe Détaillée</h3>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: "600px" }}>
                {/* Grid lines */}
                {yLabels.map((yl, i) => (
                  <g key={i}>
                    <line x1={padL} y1={yl.y} x2={svgW - padR} y2={yl.y} stroke="var(--border-subtle, rgba(107,114,128,0.2))" strokeWidth="0.5" />
                    <text x={padL - 8} y={yl.y + 4} textAnchor="end" fill="var(--text-muted, #6b7280)" fontSize="10" fontFamily="monospace">{yl.label}</text>
                  </g>
                ))}
                {/* Zero line */}
                {minPnl < 0 && maxPnl > 0 && (
                  <line x1={padL} y1={py(0)} x2={svgW - padR} y2={py(0)} stroke="var(--text-muted, #6b7280)" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />
                )}
                {/* Drawdown fill */}
                {ddPath && <path d={ddPath} fill="rgba(239, 68, 68, 0.15)" />}
                {/* Equity line */}
                <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
                {/* Month labels */}
                {monthLabels.map((ml, i) => (
                  <text key={i} x={ml.x} y={svgH - 8} textAnchor="middle" fill="var(--text-muted, #6b7280)" fontSize="10">{ml.label}</text>
                ))}
              </svg>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 rounded-full" style={{ background: "#10b981" }} />
                <span>Équité cumulée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.15)" }} />
                <span>Drawdown</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════ MONTHLY RETURNS TABLE ═══════════════════════ */}
      {trades.length > 0 && (() => {
        const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const monthMap: Record<string, number> = {};
        const yearSet = new Set<number>();
        sorted.forEach((tr) => {
          const d = new Date(tr.date);
          const y = d.getFullYear();
          const m = d.getMonth(); // 0-11
          yearSet.add(y);
          const key = `${y}-${m}`;
          monthMap[key] = (monthMap[key] || 0) + getPnl(tr);
        });

        const years = Array.from(yearSet).sort();
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

        // Year totals
        const yearTotals: Record<number, number> = {};
        years.forEach((y) => {
          let total = 0;
          for (let m = 0; m < 12; m++) {
            const key = `${y}-${m}`;
            total += monthMap[key] || 0;
          }
          yearTotals[y] = total;
        });

        const allVals = Object.values(monthMap).filter((v) => v !== 0);
        const maxAbs = allVals.length > 0 ? Math.max(...allVals.map(Math.abs)) : 1;

        const getCellBg = (val: number): string => {
          if (val === 0) return "transparent";
          const intensity = Math.min(Math.abs(val) / maxAbs, 1);
          if (val > 0) return `rgba(16, 185, 129, ${0.1 + intensity * 0.4})`;
          return `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`;
        };

        return (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Rendements Mensuels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-secondary)" }}>Mois</th>
                    {years.map((y) => (
                      <th key={y} className="text-center py-2 px-2 font-medium" style={{ color: "var(--text-secondary)" }}>{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((mName, mIdx) => (
                    <tr key={mIdx} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{mName}</td>
                      {years.map((y) => {
                        const key = `${y}-${mIdx}`;
                        const val = monthMap[key] || 0;
                        const hasData = monthMap[key] !== undefined;
                        return (
                          <td
                            key={y}
                            className="py-2 px-2 text-center mono font-semibold rounded-sm"
                            style={{
                              background: hasData ? getCellBg(val) : "transparent",
                              color: !hasData ? "var(--text-muted)" : val >= 0 ? "#10b981" : "#ef4444",
                            }}
                          >
                            {hasData ? `${val >= 0 ? "+" : ""}${val.toFixed(0)}€` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 px-2 font-bold" style={{ color: "var(--text-primary)" }}>Total</td>
                    {years.map((y) => {
                      const total = yearTotals[y];
                      return (
                        <td
                          key={y}
                          className="py-2 px-2 text-center mono font-bold rounded-sm"
                          style={{
                            background: getCellBg(total),
                            color: total >= 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {total >= 0 ? "+" : ""}{total.toFixed(0)}€
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════ INSIGHTS IA ═══════════════════════ */}
      {(() => {
        const insights: string[] = [];

        // Best asset by total PnL
        if (assetPerf.length > 0) {
          const best = [...assetPerf].sort((a, b) => b.totalPnL - a.totalPnL)[0];
          insights.push(`Votre actif le plus rentable est ${best.asset} avec un PnL de +€${best.totalPnL.toFixed(0)} (WR ${best.winRate.toFixed(0)}%)`);
        }

        // Best vs worst day
        const dayPnLMap: Record<number, { pnl: number; count: number }> = {};
        const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        trades.forEach(tr => {
          const dow = new Date(tr.date).getDay();
          if (!dayPnLMap[dow]) dayPnLMap[dow] = { pnl: 0, count: 0 };
          dayPnLMap[dow].pnl += tr.result;
          dayPnLMap[dow].count++;
        });
        const activeDays = Object.entries(dayPnLMap).filter(([, d]) => d.count > 0);
        if (activeDays.length >= 2) {
          const sortedDays = activeDays.sort((a, b) => b[1].pnl - a[1].pnl);
          const bestDay = dayNames[Number(sortedDays[0][0])];
          const worstDay = dayNames[Number(sortedDays[sortedDays.length - 1][0])];
          const diff = sortedDays[0][1].pnl > 0 && sortedDays[sortedDays.length - 1][1].pnl < 0
            ? Math.round(((sortedDays[0][1].pnl - sortedDays[sortedDays.length - 1][1].pnl) / Math.abs(sortedDays[sortedDays.length - 1][1].pnl)) * 100)
            : null;
          insights.push(
            diff !== null
              ? `Vous performez ${Math.abs(diff)}% mieux le ${bestDay.toLowerCase()} que le ${worstDay.toLowerCase()}`
              : `Votre meilleur jour est le ${bestDay.toLowerCase()}, le pire est le ${worstDay.toLowerCase()}`
          );
        }

        // Sortino ratio insight
        if (advancedStats.sortino > 2) {
          insights.push(`Votre Sortino ratio est excellent (${advancedStats.sortino.toFixed(1)}), bonne gestion du risque baissier`);
        } else if (advancedStats.sortino > 1) {
          insights.push(`Votre Sortino ratio est correct (${advancedStats.sortino.toFixed(1)}), marge d'amélioration sur la gestion baissière`);
        } else if (advancedStats.sortino > 0) {
          insights.push(`Votre Sortino ratio est faible (${advancedStats.sortino.toFixed(1)}) — réduisez vos pertes pour l'améliorer`);
        }

        // Emotion insight
        if (emotionPerf.length > 0) {
          const bestEmotion = [...emotionPerf]
            .filter(e => e.trades >= 3)
            .sort((a, b) => b.winRate - a.winRate)[0];
          if (bestEmotion) {
            insights.push(`L'émotion "${bestEmotion.emotion}" produit votre meilleur WR (${bestEmotion.winRate.toFixed(0)}%)`);
          }
        }

        // Profit factor quality
        if (stats.profitFactor >= 2) {
          insights.push(`Votre Profit Factor global (${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}) est au-dessus du seuil professionnel de 2.0`);
        } else if (stats.profitFactor >= 1.5) {
          insights.push(`Votre Profit Factor (${stats.profitFactor.toFixed(2)}) est correct — visez 2.0+ pour un edge solide`);
        }

        if (insights.length === 0) return null;

        return (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-[--text-primary]">Insights IA</h3>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <span className="text-purple-400 mt-0.5 text-lg">&#x2728;</span>
                  <p className="text-sm text-[--text-secondary]">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════ VIP PREMIUM ANALYTICS ═══════════════════════ */}
      {isVip && <VipAnalyticsSections trades={trades} getPnl={getPnl} />}
    </div>
  );
}

/* ─────────────────────────── VIP-Only Sections Component ─────────────────────────── */

function VipAnalyticsSections({ trades, getPnl }: { trades: ReturnType<typeof useTrades>["trades"]; getPnl: (tr: ReturnType<typeof useTrades>["trades"][0]) => number }) {

  /* ─── 1. Emotion-Performance Correlation ─── */
  const emotionHeatmap = useMemo(() => {
    const emotions = [...new Set(trades.map(t => t.emotion).filter(Boolean))] as string[];
    const map: Record<string, { total: number; wins: number; totalPnl: number }> = {};
    trades.forEach(tr => {
      const em = tr.emotion;
      if (!em) return;
      if (!map[em]) map[em] = { total: 0, wins: 0, totalPnl: 0 };
      map[em].total++;
      map[em].totalPnl += getPnl(tr);
      if (tr.result > 0) map[em].wins++;
    });
    const entries = emotions.map(em => {
      const d = map[em] || { total: 0, wins: 0, totalPnl: 0 };
      const winRate = d.total > 0 ? (d.wins / d.total) * 100 : 0;
      return { emotion: em, trades: d.total, wins: d.wins, winRate, totalPnl: d.totalPnl, avgPnl: d.total > 0 ? d.totalPnl / d.total : 0 };
    }).sort((a, b) => b.winRate - a.winRate);
    const best = entries.length > 0 ? entries[0] : null;
    const worst = entries.length > 0 ? entries[entries.length - 1] : null;
    return { entries, best, worst };
  }, [trades, getPnl]);

  /* ─── 2. Hourly Performance Analysis ─── */
  const hourlyPerf = useMemo(() => {
    const hours: Record<number, { totalPnl: number; count: number; wins: number }> = {};
    for (let h = 0; h < 24; h++) hours[h] = { totalPnl: 0, count: 0, wins: 0 };
    trades.forEach(tr => {
      const h = new Date(tr.date).getHours();
      hours[h].totalPnl += getPnl(tr);
      hours[h].count++;
      if (tr.result > 0) hours[h].wins++;
    });
    const entries = Object.entries(hours).map(([h, d]) => ({ hour: Number(h), ...d }));
    const active = entries.filter(e => e.count > 0);
    const sortedByPnl = [...active].sort((a, b) => b.totalPnl - a.totalPnl);
    const best3 = sortedByPnl.slice(0, 3);
    const worst3 = sortedByPnl.slice(-3).reverse();
    const maxAbsPnl = Math.max(...entries.map(e => Math.abs(e.totalPnl)), 1);
    return { entries, best3, worst3, maxAbsPnl };
  }, [trades, getPnl]);

  /* ─── 3. Expected Value per Strategy ─── */
  const strategyEV = useMemo(() => {
    const map: Record<string, { count: number; wins: number; winTotal: number; lossTotal: number }> = {};
    trades.forEach(tr => {
      const s = tr.strategy;
      if (!map[s]) map[s] = { count: 0, wins: 0, winTotal: 0, lossTotal: 0 };
      map[s].count++;
      const pnl = getPnl(tr);
      if (tr.result > 0) {
        map[s].wins++;
        map[s].winTotal += pnl;
      } else {
        map[s].lossTotal += Math.abs(pnl);
      }
    });
    return Object.entries(map).map(([name, d]) => {
      const winRate = d.count > 0 ? d.wins / d.count : 0;
      const avgWin = d.wins > 0 ? d.winTotal / d.wins : 0;
      const losses = d.count - d.wins;
      const avgLoss = losses > 0 ? d.lossTotal / losses : 0;
      const ev = (winRate * avgWin) - ((1 - winRate) * avgLoss);
      return { name, trades: d.count, winRate, avgWin, avgLoss, ev };
    }).sort((a, b) => b.ev - a.ev);
  }, [trades, getPnl]);

  /* ─── 4. Drawdown Recovery Analysis ─── */
  const drawdownAnalysis = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return { periods: [], equityCurve: [], maxDDPct: 0, avgRecoveryTrades: 0 };

    // Build equity curve
    let cumulative = 0;
    const equityCurve = sorted.map((tr, i) => {
      cumulative += tr.result;
      return { index: i, date: tr.date, equity: cumulative };
    });

    // Find all drawdown periods (peak to recovery)
    let peak = 0;
    let peakIdx = 0;
    let inDrawdown = false;
    let ddStart = 0;
    let ddTrough = 0;
    let ddTroughIdx = 0;
    const periods: { startIdx: number; troughIdx: number; endIdx: number; depth: number; recoveryTrades: number; startDate: string; endDate: string }[] = [];

    equityCurve.forEach((pt, i) => {
      if (pt.equity >= peak) {
        if (inDrawdown && ddTrough < peak) {
          // recovered
          periods.push({
            startIdx: ddStart,
            troughIdx: ddTroughIdx,
            endIdx: i,
            depth: peak - ddTrough,
            recoveryTrades: i - ddTroughIdx,
            startDate: sorted[ddStart].date,
            endDate: sorted[i].date,
          });
        }
        peak = pt.equity;
        peakIdx = i;
        inDrawdown = false;
      } else {
        if (!inDrawdown) {
          inDrawdown = true;
          ddStart = peakIdx;
          ddTrough = pt.equity;
          ddTroughIdx = i;
        }
        if (pt.equity < ddTrough) {
          ddTrough = pt.equity;
          ddTroughIdx = i;
        }
      }
    });

    // If still in drawdown at end
    if (inDrawdown) {
      periods.push({
        startIdx: ddStart,
        troughIdx: ddTroughIdx,
        endIdx: -1,
        depth: peak - ddTrough,
        recoveryTrades: -1,
        startDate: sorted[ddStart].date,
        endDate: "N/R",
      });
    }

    const recovered = periods.filter(p => p.recoveryTrades > 0);
    const avgRecoveryTrades = recovered.length > 0 ? recovered.reduce((s, p) => s + p.recoveryTrades, 0) / recovered.length : 0;
    const maxDDPct = periods.length > 0 ? Math.max(...periods.map(p => p.depth)) : 0;

    // Top 5 drawdowns
    const topPeriods = [...periods].sort((a, b) => b.depth - a.depth).slice(0, 5);

    return { periods: topPeriods, equityCurve, maxDDPct, avgRecoveryTrades };
  }, [trades]);

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <>
      {/* VIP Section Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Analyses Premium VIP</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* ═══ 1. Emotion-Performance Correlation Heatmap ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Correlation Emotion-Performance</h3>
        </div>
        {emotionHeatmap.entries.length > 0 ? (
          <div className="space-y-6">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {emotionHeatmap.entries.map(e => {
                const intensity = e.winRate / 100;
                const bgColor = e.winRate >= 55
                  ? `rgba(16, 185, 129, ${0.15 + intensity * 0.45})`
                  : e.winRate >= 45
                  ? `rgba(245, 158, 11, ${0.15 + intensity * 0.35})`
                  : `rgba(239, 68, 68, ${0.15 + (1 - intensity) * 0.45})`;
                const textColor = e.winRate >= 55 ? "#6ee7b7" : e.winRate >= 45 ? "#fcd34d" : "#fca5a5";
                return (
                  <div
                    key={e.emotion}
                    className="rounded-xl p-4 text-center transition-transform hover:scale-105"
                    style={{ background: bgColor }}
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{e.emotion}</p>
                    <p className="text-2xl font-bold mono" style={{ color: textColor }}>{e.winRate.toFixed(0)}%</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{e.trades} trades</p>
                    <p className={`text-xs mono font-medium mt-0.5 ${e.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {e.avgPnl >= 0 ? "+" : ""}{e.avgPnl.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Best / Worst / Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {emotionHeatmap.best && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Meilleure emotion</p>
                  <p className="text-lg font-bold text-emerald-400">{emotionHeatmap.best.emotion}</p>
                  <p className="text-sm mono text-emerald-300">{emotionHeatmap.best.winRate.toFixed(1)}% win rate</p>
                </div>
              )}
              {emotionHeatmap.worst && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                  <p className="text-xs text-rose-400 font-medium mb-1">Pire emotion</p>
                  <p className="text-lg font-bold text-rose-400">{emotionHeatmap.worst.emotion}</p>
                  <p className="text-sm mono text-rose-300">{emotionHeatmap.worst.winRate.toFixed(1)}% win rate</p>
                </div>
              )}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-xs text-blue-400 font-medium mb-1">Recommandation</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {emotionHeatmap.best && emotionHeatmap.worst && emotionHeatmap.best.winRate - emotionHeatmap.worst.winRate > 10
                    ? `Tradez de preference quand vous vous sentez "${emotionHeatmap.best.emotion}". Evitez de trader en etat "${emotionHeatmap.worst.emotion}" (${(emotionHeatmap.best.winRate - emotionHeatmap.worst.winRate).toFixed(0)}% d'ecart).`
                    : "Votre performance est stable quelle que soit votre emotion. Continuez a surveiller cette metrique."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[--text-muted] text-sm text-center py-12">Ajoutez des emotions a vos trades pour voir cette analyse.</p>
        )}
      </div>

      {/* ═══ 2. Hourly Performance Analysis ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">Performance par Heure</h3>
        </div>
        {hourlyPerf.entries.some(e => e.count > 0) ? (
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="flex items-end gap-[3px] h-48">
              {hourlyPerf.entries.map(e => {
                const hPct = e.count > 0 ? Math.max((Math.abs(e.totalPnl) / hourlyPerf.maxAbsPnl) * 100, 4) : 0;
                const isPositive = e.totalPnl >= 0;
                return (
                  <div key={e.hour} className="flex-1 flex flex-col items-center justify-end group relative">
                    {e.count > 0 && (
                      <div className="absolute -top-8 text-[9px] text-[--text-muted] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {e.totalPnl >= 0 ? "+" : ""}{e.totalPnl.toFixed(0)} ({e.count}t)
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${isPositive ? "bg-emerald-500" : "bg-rose-500"} hover:opacity-80`}
                      style={{ height: `${hPct}%`, opacity: e.count > 0 ? 0.8 : 0.15 }}
                      title={`${formatHour(e.hour)}: ${e.totalPnl >= 0 ? "+" : ""}${e.totalPnl.toFixed(2)} (${e.count} trades)`}
                    />
                    <span className="text-[9px] text-[--text-muted] mt-1">{e.hour}</span>
                  </div>
                );
              })}
            </div>

            {/* Best and Worst Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-medium mb-2">Vos meilleures heures de trading</p>
                <div className="space-y-2">
                  {hourlyPerf.best3.map((h, i) => (
                    <div key={h.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 w-4">{i + 1}.</span>
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{formatHour(h.hour)}</span>
                        <span className="text-xs text-[--text-muted]">({h.count} trades)</span>
                      </div>
                      <span className="text-sm mono font-bold text-emerald-400">+{h.totalPnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                <p className="text-xs text-rose-400 font-medium mb-2">Evitez ces heures</p>
                <div className="space-y-2">
                  {hourlyPerf.worst3.map((h, i) => (
                    <div key={h.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400 w-4">{i + 1}.</span>
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{formatHour(h.hour)}</span>
                        <span className="text-xs text-[--text-muted]">({h.count} trades)</span>
                      </div>
                      <span className="text-sm mono font-bold text-rose-400">{h.totalPnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de donnees horaires.</p>
        )}
      </div>

      {/* ═══ 3. Expected Value per Strategy ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold">Esperance de Gain par Strategie</h3>
        </div>
        {strategyEV.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                  <th className="pb-3 font-medium">Strategie</th>
                  <th className="pb-3 font-medium">Trades</th>
                  <th className="pb-3 font-medium">Win Rate</th>
                  <th className="pb-3 font-medium">Gain Moy.</th>
                  <th className="pb-3 font-medium">Perte Moy.</th>
                  <th className="pb-3 font-medium">Esperance (EV)</th>
                </tr>
              </thead>
              <tbody>
                {strategyEV.map(s => (
                  <tr key={s.name} className="border-b border-[--border-subtle]">
                    <td className="py-3 font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                    <td className="py-3 mono">{s.trades}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${s.winRate * 100}%` }} />
                        </div>
                        <span className="mono text-emerald-400 text-xs">{(s.winRate * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 mono text-emerald-400">+{s.avgWin.toFixed(2)}</td>
                    <td className="py-3 mono text-rose-400">-{s.avgLoss.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`mono font-bold px-2 py-0.5 rounded ${s.ev >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {s.ev >= 0 ? "+" : ""}{s.ev.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-[--text-muted] mt-3">
              EV = (Win Rate x Gain Moyen) - ((1 - Win Rate) x Perte Moyenne). Une EV positive signifie une strategie rentable sur le long terme.
            </p>
          </div>
        ) : (
          <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de donnees.</p>
        )}
      </div>

      {/* ═══ 4. Drawdown Recovery Analysis ═══ */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-semibold">Analyse de Drawdown et Recovery</h3>
        </div>
        {drawdownAnalysis.equityCurve.length > 0 ? (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-rose-400 font-medium mb-1">Drawdown Max</p>
                <p className="text-2xl font-bold mono text-rose-400">-{drawdownAnalysis.maxDDPct.toFixed(2)}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-400 font-medium mb-1">Recovery Moyen</p>
                <p className="text-2xl font-bold mono text-amber-400">
                  {drawdownAnalysis.avgRecoveryTrades > 0 ? `${drawdownAnalysis.avgRecoveryTrades.toFixed(0)} trades` : "N/A"}
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-400 font-medium mb-1">Periodes de Drawdown</p>
                <p className="text-2xl font-bold mono text-blue-400">{drawdownAnalysis.periods.length}</p>
              </div>
            </div>

            {/* SVG Equity Curve with Drawdowns */}
            {(() => {
              const curve = drawdownAnalysis.equityCurve;
              const minEq = Math.min(...curve.map(c => c.equity));
              const maxEq = Math.max(...curve.map(c => c.equity));
              const range = maxEq - minEq || 1;
              const w = 800;
              const h = 200;
              const pad = 10;

              const toX = (i: number) => pad + ((i / Math.max(curve.length - 1, 1)) * (w - 2 * pad));
              const toY = (eq: number) => h - pad - ((eq - minEq) / range) * (h - 2 * pad);

              const linePath = curve.map((pt, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(pt.equity).toFixed(1)}`).join(" ");

              // Build drawdown highlight rects
              const ddRects = drawdownAnalysis.periods.map((p, idx) => {
                const x1 = toX(p.startIdx);
                const x2 = toX(p.endIdx >= 0 ? p.endIdx : curve.length - 1);
                return (
                  <rect
                    key={idx}
                    x={x1}
                    y={pad}
                    width={Math.max(x2 - x1, 2)}
                    height={h - 2 * pad}
                    fill="rgba(239, 68, 68, 0.12)"
                    stroke="rgba(239, 68, 68, 0.3)"
                    strokeWidth="0.5"
                  />
                );
              });

              return (
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: "400px", maxHeight: "220px" }}>
                    {/* Grid */}
                    {[0.25, 0.5, 0.75].map(pct => (
                      <line key={pct} x1={pad} y1={toY(minEq + range * pct)} x2={w - pad} y2={toY(minEq + range * pct)} stroke="var(--border-subtle, #333)" strokeWidth="0.5" strokeDasharray="4,4" />
                    ))}
                    {/* Drawdown highlights */}
                    {ddRects}
                    {/* Equity line */}
                    <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
                    {/* Zero line */}
                    <line x1={pad} y1={toY(0)} x2={w - pad} y2={toY(0)} stroke="var(--text-muted, #666)" strokeWidth="0.5" strokeDasharray="2,2" />
                    {/* Y-axis labels */}
                    <text x={pad} y={toY(maxEq) - 4} fontSize="9" fill="var(--text-muted, #888)">{maxEq.toFixed(0)}</text>
                    <text x={pad} y={toY(minEq) + 12} fontSize="9" fill="var(--text-muted, #888)">{minEq.toFixed(0)}</text>
                  </svg>
                  <div className="flex items-center justify-center gap-4 text-xs text-[--text-muted] mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                      <span>Equity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)" }} />
                      <span>Drawdown</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Drawdown Periods Table */}
            {drawdownAnalysis.periods.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Debut</th>
                      <th className="pb-3 font-medium">Fin</th>
                      <th className="pb-3 font-medium">Profondeur</th>
                      <th className="pb-3 font-medium">Recovery (trades)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawdownAnalysis.periods.map((p, i) => (
                      <tr key={i} className="border-b border-[--border-subtle]">
                        <td className="py-3 mono font-medium">{i + 1}</td>
                        <td className="py-3 text-xs">{new Date(p.startDate).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 text-xs">{p.endDate === "N/R" ? <span className="text-rose-400">Non recupere</span> : new Date(p.endDate).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 mono font-bold text-rose-400">-{p.depth.toFixed(2)}</td>
                        <td className="py-3 mono font-bold">
                          {p.recoveryTrades >= 0 ? (
                            <span className="text-amber-400">{p.recoveryTrades} trades</span>
                          ) : (
                            <span className="text-rose-400">En cours</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de donnees.</p>
        )}
      </div>
    </>
  );
}
