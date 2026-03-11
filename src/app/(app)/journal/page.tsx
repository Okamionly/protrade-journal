"use client";

import { useTrades } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Plus, Search, Camera, Trash2 } from "lucide-react";

export default function JournalPage() {
  const { trades, loading, addTrade, deleteTrade } = useTrades();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");

  const filtered = trades.filter((t) => {
    const matchSearch = search === "" || t.asset.toLowerCase().includes(search.toLowerCase()) || (t.setup || "").toLowerCase().includes(search.toLowerCase()) || t.strategy.toLowerCase().includes(search.toLowerCase());
    const matchAsset = assetFilter === "all" || t.asset === assetFilter;
    return matchSearch && matchAsset;
  });

  const assets = [...new Set(trades.map((t) => t.asset))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Chargement...</div></div>;
  }

  return (
    <>
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Historique Complet</h3>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm"
              />
            </div>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">Tous les actifs</option>
              {assets.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Trade
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Actif</th>
                <th className="pb-3 font-medium">Direction</th>
                <th className="pb-3 font-medium">Stratégie</th>
                <th className="pb-3 font-medium">Setup</th>
                <th className="pb-3 font-medium">Screenshots</th>
                <th className="pb-3 font-medium">Entrée/Sortie</th>
                <th className="pb-3 font-medium">Lots</th>
                <th className="pb-3 font-medium">R:R</th>
                <th className="pb-3 font-medium">Résultat</th>
                <th className="pb-3 font-medium">Émotion</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-gray-500">Aucun trade trouvé</td>
                </tr>
              ) : (
                filtered.map((trade) => {
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
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">{trade.strategy}</span>
                      </td>
                      <td className="py-4 text-gray-400 max-w-xs truncate">{trade.setup || "-"}</td>
                      <td className="py-4">
                        {trade.screenshots.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            <Camera className="w-3 h-3 mr-1" />{trade.screenshots.length}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-4 mono">{trade.entry} → {trade.exit || "Open"}</td>
                      <td className="py-4 mono">{trade.lots}</td>
                      <td className="py-4 mono text-gray-400">1:{rr}</td>
                      <td className={`py-4 mono font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {isWin ? "+" : ""}{trade.result}€
                      </td>
                      <td className="py-4 text-xs text-gray-400">{trade.emotion || "-"}</td>
                      <td className="py-4">
                        <button onClick={() => deleteTrade(trade.id)} className="text-rose-400 hover:text-rose-300">
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
