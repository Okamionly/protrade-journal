"use client";

import { useTrades } from "@/hooks/useTrades";
import { computeStats, computeStreaks, computeAssetPerformance, computeEmotionPerformance, computeMonthlyComparison } from "@/lib/utils";
import { WeekdayChart, EquityChart, MonthlyComparisonChart, EmotionChart, AdvancedEquityChart } from "@/components/ChartComponents";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useUser } from "@/hooks/useTrades";
import { TrendingUp, TrendingDown, Zap, Flame, ArrowUpRight, ArrowDownRight, Clock, Activity, ChevronUp, ChevronDown, BarChart3, GitCompare } from "lucide-react";

export default function AnalyticsPage() {
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const stats = computeStats(trades);
  const streaks = computeStreaks(trades);
  const assetPerf = computeAssetPerformance(trades);
  const emotionPerf = computeEmotionPerformance(trades);
  const monthlyData = computeMonthlyComparison(trades);

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <h4 className="text-[--text-secondary] text-sm mb-2">Profit Factor</h4>
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
          <h4 className="text-[--text-secondary] text-sm mb-2">Sharpe Ratio</h4>
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
        sorted.forEach((t, i) => {
          cumulative += t.result;
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
        sorted.forEach(t => {
          const d = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[key] = (monthMap[key] || 0) + t.result;
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
                <p className="text-xs text-[--text-muted] mt-1">Rendement / risque baissier</p>
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
                <p className="text-xs text-[--text-muted] mt-1">Rendement annualisé / drawdown max</p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${Math.min(Math.abs(calmar) * 20, 100)}%` }} />
                </div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-[--text-secondary] text-sm">Temps de Récupération</h4>
                </div>
                <p className={`text-3xl font-bold mono ${recoveryTrades < 0 ? "text-rose-400" : recoveryTrades <= 5 ? "text-emerald-400" : "text-amber-400"}`}>
                  {recoveryTrades < 0 ? "N/R" : `${recoveryTrades} trades`}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">
                  {recoveryTrades < 0 ? "Drawdown non récupéré" : "Trades pour récupérer du drawdown max"}
                </p>
                <div className="mt-2 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                  <div className={`h-full ${recoveryTrades < 0 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: recoveryTrades < 0 ? "100%" : `${Math.min((recoveryTrades / 20) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Monthly Momentum */}
            {monthlyMomentum.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Momentum Mensuel</h3>
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
                <h3 className="text-lg font-semibold">Comparaison Période</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* This week vs last week */}
                <div className="bg-[--bg-secondary]/30 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-medium text-[--text-secondary]">Cette semaine vs Semaine dernière</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[--text-muted]">Cette semaine</p>
                      <p className={`text-xl font-bold mono ${tw.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {tw.pnl >= 0 ? "+" : ""}€{tw.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{tw.trades} trades | WR {tw.winRate.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--text-muted]">Semaine dernière</p>
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
                    <span className="text-xs text-[--text-muted]">vs semaine précédente</span>
                  </div>
                </div>

                {/* This month vs last month */}
                <div className="bg-[--bg-secondary]/30 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-medium text-[--text-secondary]">Ce mois vs Mois dernier</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[--text-muted]">Ce mois</p>
                      <p className={`text-xl font-bold mono ${tm.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {tm.pnl >= 0 ? "+" : ""}€{tm.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-[--text-muted]">{tm.trades} trades | WR {tm.winRate.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--text-muted]">Mois dernier</p>
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
                    <span className="text-xs text-[--text-muted]">vs mois précédent</span>
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
            <p className="text-xs text-[--text-secondary]">Meilleure série</p>
            <p className="text-xl font-bold text-emerald-400 mono">{streaks.bestWinStreak} wins</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">Pire série</p>
            <p className="text-xl font-bold text-rose-400 mono">{streaks.worstLossStreak} losses</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            {streaks.currentStreakType === "win" ? <Flame className="w-5 h-5 text-emerald-400" /> : <Zap className="w-5 h-5 text-rose-400" />}
          </div>
          <div>
            <p className="text-xs text-[--text-secondary]">Série en cours</p>
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
            <p className="text-xs text-[--text-secondary]">R:R Moyen</p>
            <p className="text-xl font-bold text-amber-400 mono">1:{stats.avgRR}</p>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Performance par Jour</h3>
          <WeekdayChart trades={trades} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Courbe d&apos;Équité</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
      </div>

      {/* Advanced Equity Curve with Drawdown */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Equity Avancée + Drawdown</h3>
        <div className="h-80">
          <AdvancedEquityChart trades={trades} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Comparaison Mensuelle</h3>
          {monthlyData.length > 0 ? (
            <MonthlyComparisonChart data={monthlyData} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de données</p>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">P&L Moyen par Émotion</h3>
          {emotionPerf.length > 0 ? (
            <EmotionChart data={emotionPerf} />
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de données</p>
          )}
        </div>
      </div>

      {/* R-Multiple Distribution */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Distribution R-Multiple</h3>
        {(() => {
          const rMultiples = trades
            .filter(t => t.sl && t.entry !== t.sl)
            .map(t => {
              const risk = Math.abs(t.entry - t.sl);
              return risk > 0 ? t.result / risk : 0;
            })
            .filter(r => Math.abs(r) < 50);

          if (rMultiples.length === 0) {
            return <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de données</p>;
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
                  <p className="text-xs text-[--text-muted]">R moyen</p>
                  <p className={`text-lg font-bold mono ${(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">Meilleur</p>
                  <p className="text-lg font-bold mono text-emerald-400">+{Math.max(...rMultiples).toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-xs text-[--text-muted]">Pire</p>
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
          <h3 className="text-lg font-semibold mb-4">Equity par Stratégie</h3>
          {(() => {
            const strategies = [...new Set(trades.map(t => t.strategy))];
            if (strategies.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de données</p>;

            const bgColors = ["bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500"];
            const strategyEquity: Record<string, number> = {};
            strategies.forEach(s => { strategyEquity[s] = 0; });
            trades.forEach(t => { strategyEquity[t.strategy] += t.result; });
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
          <h3 className="text-lg font-semibold mb-4">Equity par Asset</h3>
          {(() => {
            const assets = [...new Set(trades.map(t => t.asset))];
            if (assets.length === 0) return <p className="text-[--text-muted] text-sm text-center py-12">Pas assez de données</p>;

            const bgColors = ["bg-blue-500", "bg-cyan-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500"];
            const assetEquity: Record<string, number> = {};
            assets.forEach(a => { assetEquity[a] = 0; });
            trades.forEach(t => { assetEquity[t.asset] += t.result; });
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
        <h3 className="text-lg font-semibold mb-4">Performance par Asset</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Win Rate</th>
                <th className="pb-3 font-medium">P&L Total</th>
                <th className="pb-3 font-medium">P&L Moyen</th>
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
                <tr><td colSpan={5} className="py-6 text-center text-[--text-muted]">Aucun trade</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analyse émotionnelle */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Analyse Émotionnelle</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">Émotion</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Win Rate</th>
                <th className="pb-3 font-medium">P&L Total</th>
                <th className="pb-3 font-medium">P&L Moyen</th>
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
                <tr><td colSpan={5} className="py-6 text-center text-[--text-muted]">Aucun trade</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance par Stratégie */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Performance par Stratégie</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                <th className="pb-3 font-medium">Stratégie</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Win Rate</th>
                <th className="pb-3 font-medium">P&L Total</th>
                <th className="pb-3 font-medium">P&L Moyen</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const strategyMap: Record<string, { count: number; wins: number; total: number }> = {};
                trades.forEach((t) => {
                  if (!strategyMap[t.strategy]) strategyMap[t.strategy] = { count: 0, wins: 0, total: 0 };
                  strategyMap[t.strategy].count++;
                  strategyMap[t.strategy].total += t.result;
                  if (t.result > 0) strategyMap[t.strategy].wins++;
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
    </div>
  );
}
