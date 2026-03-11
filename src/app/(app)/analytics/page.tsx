"use client";

import { useTrades } from "@/hooks/useTrades";
import { computeStats } from "@/lib/utils";
import { WeekdayChart, EquityChart } from "@/components/ChartComponents";
import { useUser } from "@/hooks/useTrades";

export default function AnalyticsPage() {
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const stats = computeStats(trades);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Chargement...</div></div>;
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Performance par Jour de la Semaine</h3>
          <WeekdayChart trades={trades} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Courbe d&apos;Équité</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
      </div>

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
                    <td className="py-3 mono text-emerald-400">{((s.wins / s.count) * 100).toFixed(1)}%</td>
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
