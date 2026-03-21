"use client";

import { useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { computeStats, computeStreaks, computeAssetPerformance, computeEmotionPerformance, computeMonthlyComparison } from "@/lib/utils";
import { WeekdayChart, EquityChart, MonthlyComparisonChart, EmotionChart, AdvancedEquityChart } from "@/components/ChartComponents";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useUser } from "@/hooks/useTrades";
import { TrendingUp, TrendingDown, Zap, Flame, ArrowUpRight, ArrowDownRight, Clock, Activity, ChevronUp, ChevronDown, BarChart3, GitCompare, Tag, Crosshair } from "lucide-react";
import { useTranslation } from "@/i18n/context";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const [showNet, setShowNet] = useState(false);
  const stats = computeStats(trades);
  const streaks = computeStreaks(trades);
  const assetPerf = computeAssetPerformance(trades);
  const emotionPerf = computeEmotionPerformance(trades);
  const monthlyData = computeMonthlyComparison(trades);

  if (loading) return <AnalyticsSkeleton />;

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <TrendingUp className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("analytics")}</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour voir vos analytics.</p>
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
          {showNet ? "Net (- frais)" : "Brut"}
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
          <h4 className="text-[--text-secondary] text-sm mb-2">Drawdown Max</h4>
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
        const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const results = sorted.map(t => t.result);
        const mean = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;

        // Sortino Ratio: uses only downside deviation
        const downsideReturns = results.filter(r => r < 0);
        const downsideVariance = downsideReturns.length > 1
          ? downsideReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / downsideReturns.length
          : 0;
        const downsideDev = Math.sqrt(downsideVariance);
        const sortino = downsideDev > 0 ? (mean / downsideDev) * Math.sqrt(252) : 0;

        // Calmar Ratio: annualized return / max drawdown
        const totalReturn = results.reduce((a, b) => a + b, 0);
        const daysSpan = sorted.length >= 2
          ? (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24)
          : 1;
        const annualizedReturn = daysSpan > 0 ? (totalReturn / Math.max(daysSpan, 1)) * 365 : 0;
        const calmar = stats.maxDrawdown > 0 ? annualizedReturn / stats.maxDrawdown : 0;

        // Recovery Time: trades to recover from max drawdown
        let peak = 0;
        let maxDD = 0;
        let ddStartIdx = 0;
        let ddEndIdx = 0;
        let cumulative = 0;
        sorted.forEach((tr, i) => {
          cumulative += tr.result;
          if (cumulative > peak) {
            peak = cumulative;
          }
          const dd = peak - cumulative;
          if (dd > maxDD) {
            maxDD = dd;
            ddEndIdx = i;
          }
        });
        // Find where peak was before this drawdown
        cumulative = 0;
        let peakVal = 0;
        for (let i = 0; i <= ddEndIdx; i++) {
          cumulative += sorted[i].result;
          if (cumulative >= peakVal) {
            peakVal = cumulative;
            ddStartIdx = i;
          }
        }
        // Find recovery: next time cumulative >= peakVal after ddEndIdx
        let recoveryTrades = -1;
        cumulative = 0;
        for (let i = 0; i < sorted.length; i++) {
          cumulative += sorted[i].result;
          if (i > ddEndIdx && cumulative >= peakVal) {
            recoveryTrades = i - ddEndIdx;
            break;
          }
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
          return sorted.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
          });
        };

        const thisWeekTrades = periodTrades(thisWeekStart, now);
        const lastWeekTrades = periodTrades(lastWeekStart, new Date(thisWeekStart.getTime() - 1));
        const thisMonthTrades = periodTrades(thisMonthStart, now);
        const lastMonthTrades = periodTrades(lastMonthStart, lastMonthEnd);

        const periodStats = (arr: typeof trades) => {
          const pnl = arr.reduce((s, t) => s + t.result, 0);
          const w = arr.filter(t => t.result > 0).length;
          const wr = arr.length > 0 ? (w / arr.length) * 100 : 0;
          return { pnl, trades: arr.length, winRate: wr };
        };

        const tw = periodStats(thisWeekTrades);
        const lw = periodStats(lastWeekTrades);
        const tm = periodStats(thisMonthTrades);
        const lm = periodStats(lastMonthTrades);

        const pnlChange = (cur: number, prev: number) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : cur !== 0 ? 100 : 0;

        return (
          <>
            {/* Sortino, Calmar, Recovery Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <h4 className="text-[--text-secondary] text-sm">Sortino Ratio</h4>
                </div>
                <p className={`text-3xl font-bold mono ${sortino >= 1 ? "text-emerald-400" : sortino >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                  {sortino.toFixed(2)}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">Sortino Ratio</p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${Math.min(Math.abs(sortino) * 25, 100)}%` }} />
                </div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-[--text-secondary] text-sm">Calmar Ratio</h4>
                </div>
                <p className={`text-3xl font-bold mono ${calmar >= 1 ? "text-emerald-400" : calmar >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                  {calmar.toFixed(2)}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">Calmar Ratio</p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${Math.min(Math.abs(calmar) * 20, 100)}%` }} />
                </div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-[--text-secondary] text-sm">Recovery Time</h4>
                </div>
                <p className={`text-3xl font-bold mono ${recoveryTrades < 0 ? "text-rose-400" : recoveryTrades <= 5 ? "text-emerald-400" : "text-amber-400"}`}>
                  {recoveryTrades < 0 ? "N/R" : `${recoveryTrades} trades`}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">
                  {recoveryTrades < 0 ? "Drawdown not recovered" : "Trades to recover from max drawdown"}
                </p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className={`h-full ${recoveryTrades < 0 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: recoveryTrades < 0 ? "100%" : `${Math.min((recoveryTrades / 20) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Monthly Momentum */}
            {monthlyMomentum.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Momentum</h3>
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
            <p className="text-xl font-bold text-emerald-400 mono">{streaks.bestWinStreak} wins</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("worstStreakL")}</p>
            <p className="text-xl font-bold text-rose-400 mono">{streaks.worstLossStreak} losses</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            {streaks.currentStreakType === "win" ? <Flame className="w-5 h-5 text-emerald-400" /> : <Zap className="w-5 h-5 text-rose-400" />}
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">{t("currentStreak")}</p>
            <p className={`text-xl font-bold mono ${streaks.currentStreakType === "win" ? "text-emerald-400" : streaks.currentStreakType === "loss" ? "text-rose-400" : "text-[--text-secondary]"}`}>
              {streaks.currentStreak > 0 ? `${streaks.currentStreak} ${streaks.currentStreakType === "win" ? "wins" : "losses"}` : "-"}
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
          <h3 className="text-lg font-semibold mb-4">Performance / Day</h3>
          <WeekdayChart trades={trades} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("equityCurve")}</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
      </div>

      {/* Advanced Equity Curve with Drawdown */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Advanced Equity + Drawdown</h3>
        <div className="h-80">
          <AdvancedEquityChart trades={trades} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("monthlyRecap")}</h3>
          {monthlyData.length > 0 ? (
            <MonthlyComparisonChart data={monthlyData} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">No data</p>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Avg P&L by Emotion</h3>
          {emotionPerf.length > 0 ? (
            <EmotionChart data={emotionPerf} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">No data</p>
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
            return <p className="text-[--text-muted] text-sm text-center py-12">No data</p>;
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
            if (strategies.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">No data</p>;

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
            if (assets.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">No data</p>;

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
                <th className="pb-3 font-medium">Moy. P&L</th>
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
        <h3 className="text-lg font-semibold mb-4">Emotional Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("emotionPsychology")}</th>
                <th className="pb-3 font-medium">{t("trades")}</th>
                <th className="pb-3 font-medium">{t("winRate")}</th>
                <th className="pb-3 font-medium">{t("netProfit")}</th>
                <th className="pb-3 font-medium">Moy. P&L</th>
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
                <th className="pb-3 font-medium">Moy. P&L</th>
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
          <h3 className="text-lg font-semibold">Performance par Tag</h3>
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
          if (entries.length === 0) return <p className="text-[--text-muted] text-sm text-center py-8">Aucun tag enregistré</p>;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                    <th className="pb-3 font-medium">Tag</th>
                    <th className="pb-3 font-medium">{t("trades")}</th>
                    <th className="pb-3 font-medium">{t("winRate")}</th>
                    <th className="pb-3 font-medium">P&L</th>
                    <th className="pb-3 font-medium">Avg</th>
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
          <h3 className="text-lg font-semibold">MAE vs MFE Analysis</h3>
        </div>
        {(() => {
          const maeMfeTrades = trades.filter(tr => tr.maePrice != null && tr.mfePrice != null && tr.entry);
          if (maeMfeTrades.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-8">Renseignez MAE/MFE dans vos trades pour voir l&apos;analyse.</p>;
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
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[--text-muted]">MAE (Adverse)</span>
                <span className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-[--text-muted]">MFE (Favorable)</span>
              </div>
              <div className="flex justify-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span style={{ color: "var(--text-secondary)" }}>Gagnant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span style={{ color: "var(--text-secondary)" }}>Perdant</span>
                </div>
                <span style={{ color: "var(--text-muted)" }}>{maeMfeTrades.length} trades</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                <div>
                  <p className="text-xs text-[--text-muted]">MAE moyen</p>
                  <p className="text-lg font-bold mono text-rose-400">{(points.reduce((s, p) => s + p.mae, 0) / points.length).toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">MFE moyen</p>
                  <p className="text-lg font-bold mono text-emerald-400">{(points.reduce((s, p) => s + p.mfe, 0) / points.length).toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">Ratio MFE/MAE</p>
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
    </div>
  );
}
