"use client";

import { useTrades, Trade } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { JournalSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Plus, Search, Camera, Trash2, Pencil, FilterX } from "lucide-react";

export default function JournalPage() {
  const { trades, loading, addTrade, deleteTrade, updateTrade } = useTrades();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = search || assetFilter !== "all" || directionFilter !== "all" || resultFilter !== "all" || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch("");
    setAssetFilter("all");
    setDirectionFilter("all");
    setResultFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = trades.filter((t) => {
    const matchSearch = search === "" || t.asset.toLowerCase().includes(search.toLowerCase()) || (t.setup || "").toLowerCase().includes(search.toLowerCase()) || t.strategy.toLowerCase().includes(search.toLowerCase());
    const matchAsset = assetFilter === "all" || t.asset === assetFilter;
    const matchDirection = directionFilter === "all" || t.direction === directionFilter;
    const matchResult = resultFilter === "all" || (resultFilter === "win" && t.result > 0) || (resultFilter === "loss" && t.result < 0) || (resultFilter === "be" && t.result === 0);
    const tradeDate = new Date(t.date);
    const matchDateFrom = !dateFrom || tradeDate >= new Date(dateFrom);
    const matchDateTo = !dateTo || tradeDate <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchAsset && matchDirection && matchResult && matchDateFrom && matchDateTo;
  });

  const assets = [...new Set(trades.map((t) => t.asset))];

  const handleAddTrade = async (trade: Record<string, unknown>) => {
    const ok = await addTrade(trade);
    if (ok) toast("Trade créé avec succès", "success");
    else toast("Erreur lors de la création", "error");
    return ok;
  };

  const handleUpdateTrade = async (trade: Record<string, unknown>) => {
    if (!editingTrade) return false;
    const ok = await updateTrade(editingTrade.id, trade);
    if (ok) toast("Trade modifié avec succès", "success");
    else toast("Erreur lors de la modification", "error");
    return ok;
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce trade ?")) {
      const ok = await deleteTrade(id);
      if (ok) toast("Trade supprimé", "success");
      else toast("Erreur lors de la suppression", "error");
    }
  };

  if (loading) return <JournalSkeleton />;

  return (
    <>
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Historique Complet</h3>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Trade
          </button>
        </div>

        {/* Filtres avancés */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="all">Tous les actifs</option>
            {assets.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="all">Toutes directions</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="all">Tous résultats</option>
            <option value="win">Gagnants</option>
            <option value="loss">Perdants</option>
            <option value="be">Break-even</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-2 text-sm" placeholder="Du" />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Au" />
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition">
              <FilterX className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} trade{filtered.length !== 1 ? "s" : ""}</span>
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
                        <div className="flex gap-2">
                          <button onClick={() => setEditingTrade(trade)} className="text-blue-400 hover:text-blue-300">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(trade.id)} className="text-rose-400 hover:text-rose-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <TradeForm onSubmit={handleAddTrade} onClose={() => setShowForm(false)} />}
      {editingTrade && <TradeForm onSubmit={handleUpdateTrade} onClose={() => setEditingTrade(null)} editTrade={editingTrade} />}
    </>
  );
}
