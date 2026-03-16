"use client";

import { useTrades } from "@/hooks/useTrades";
import { computeStats, computeStreaks, computeAssetPerformance, computeEmotionPerformance, computeMonthlyComparison } from "@/lib/utils";
import { WeekdayChart, EquityChart, MonthlyComparisonChart, EmotionChart, AdvancedEquityChart } from "@/components/ChartComponents";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useUser } from "@/hooks/useTrades";
import { TrendingUp, TrendingDown, Zap, Flame } from "lucide-react";

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
          <h4 className="text-gray-400 text-sm mb-2">Profit Factor</h4>
          <p className="text-3xl font-bold text-emerald-400 mono">
            {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          </p>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(stats.profitFactor * 25, 100)}%` }} />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h4 className="text-gray-400 text-sm mb-2">Drawdown Max</h4>
          <p className="text-3xl font-bold text-rose-400 mono">
            -€{stats.maxDrawdown.toFixed(2)}
          </p>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${Math.min((stats.maxDrawdown / (user?.balance ?? 25000)) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h4 className="text-gray-400 text-sm mb-2">Sharpe Ratio</h4>
          <p className="text-3xl font-bold text-blue-400 mono">{stats.sharpeRatio.toFixed(2)}</p>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(Math.abs(stats.sharpeRatio) * 30, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Meilleure série</p>
            <p className="text-xl font-bold text-emerald-400 mono">{streaks.bestWinStreak} wins</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Pire série</p>
            <p className="text-xl font-bold text-rose-400 mono">{streaks.worstLossStreak} losses</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            {streaks.currentStreakType === "win" ? <Flame className="w-5 h-5 text-emerald-400" /> : <Zap className="w-5 h-5 text-rose-400" />}
          </div>
          <div>
            <p className="text-xs text-gray-400">Série en cours</p>
            <p className={`text-xl font-bold mono ${streaks.currentStreakType === "win" ? "text-emerald-400" : streaks.currentStreakType === "loss" ? "text-rose-400" : "text-gray-400"}`}>
              {streaks.currentStreak > 0 ? `${streaks.currentStreak} ${streaks.currentStreakType === "win" ? "wins" : "losses"}` : "-"}
            </p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">R:R Moyen</p>
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
            <p className="text-gray-500 text-sm text-center py-12">Pas assez de données</p>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">P&L Moyen par Émotion</h3>
          {emotionPerf.length > 0 ? (
            <EmotionChart data={emotionPerf} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-12">Pas assez de données</p>
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
            return <p className="text-gray-500 text-sm text-center py-12">Pas assez de données</p>;
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
                        <div className="absolute -top-6 text-[9px] text-gray-500 opacity-0 group-hover:opacity-100 transition">{count}</div>
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
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>-5R</span>
                <span>0R</span>
                <span>+5R</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">R moyen</p>
                  <p className={`text-lg font-bold mono ${(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Meilleur</p>
                  <p className="text-lg font-bold mono text-emerald-400">+{Math.max(...rMultiples).toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pire</p>
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
            if (strategies.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Pas assez de données</p>;

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
                        <span className="font-medium">{name} <span className="text-gray-500 text-xs">({count}t, {count > 0 ? ((wins / count) * 100).toFixed(0) : 0}%)</span></span>
                        <span className={`mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
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
            if (assets.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Pas assez de données</p>;

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
                        <span className="font-medium">{name} <span className="text-gray-500 text-xs">({count}t)</span></span>
                        <span className={`mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
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
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Win Rate</th>
                <th className="pb-3 font-medium">P&L Total</th>
                <th className="pb-3 font-medium">P&L Moyen</th>
              </tr>
            </thead>
            <tbody>
              {assetPerf.map((a) => (
                <tr key={a.asset} className="border-b border-gray-800">
                  <td className="py-3 font-medium">{a.asset}</td>
                  <td className="py-3 mono">{a.trades}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">Aucun trade</td></tr>
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
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 font-medium">Émotion</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Win Rate</th>
                <th className="pb-3 font-medium">P&L Total</th>
                <th className="pb-3 font-medium">P&L Moyen</th>
              </tr>
            </thead>
            <tbody>
              {emotionPerf.map((e) => (
                <tr key={e.emotion} className="border-b border-gray-800">
                  <td className="py-3 font-medium">{e.emotion}</td>
                  <td className="py-3 mono">{e.trades}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">Aucun trade</td></tr>
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
              <tr className="text-left text-gray-400 border-b border-gray-700">
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
                  <tr key={name} className="border-b border-gray-800">
                    <td className="py-3 font-medium">{name}</td>
                    <td className="py-3 mono">{s.count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
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
