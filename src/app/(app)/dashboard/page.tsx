"use client";

import { useTrades, useUser } from "@/hooks/useTrades";
import { DashboardCards } from "@/components/DashboardCards";
import { EquityChart, StrategyChart } from "@/components/ChartComponents";
import { TradeForm } from "@/components/TradeForm";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Plus, Eye, Trash2, Camera } from "lucide-react";

export default function DashboardPage() {
  const { trades, loading, addTrade, deleteTrade } = useTrades();
  const { user } = useUser();
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  const recentTrades = trades.slice(0, 5);

  return (
    <>
      <DashboardCards trades={trades} balance={user?.balance ?? 25000} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Courbe d&apos;Équité</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition par Stratégie</h3>
          <StrategyChart trades={trades} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Trades Récents</h3>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Trade
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Actif</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Entrée</th>
                <th className="pb-3 font-medium">Sortie</th>
                <th className="pb-3 font-medium">Screenshots</th>
                <th className="pb-3 font-medium">R:R</th>
                <th className="pb-3 font-medium">P&L</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Aucun trade enregistré. Cliquez sur &quot;Nouveau Trade&quot; pour commencer.
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => {
                  const isWin = trade.result > 0;
                  const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                  return (
                    <tr key={trade.id} className="trade-row border-b border-gray-800">
                      <td className="py-4 mono text-gray-400">{formatDate(trade.date)}</td>
                      <td className="py-4 font-medium">{trade.asset}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-4 mono">{trade.entry}</td>
                      <td className="py-4 mono">{trade.exit || "-"}</td>
                      <td className="py-4">
                        {trade.screenshots.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            <Camera className="w-3 h-3 mr-1" />
                            {trade.screenshots.length}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="py-4 mono text-gray-400">1:{rr}</td>
                      <td className={`py-4 mono font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {isWin ? "+" : ""}{trade.result}€
                      </td>
                      <td className="py-4">
                        <button onClick={() => { if (confirm("Supprimer ce trade ?")) deleteTrade(trade.id); }} className="text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <TradeForm onSubmit={addTrade} onClose={() => setShowForm(false)} />}
    </>
  );
}
