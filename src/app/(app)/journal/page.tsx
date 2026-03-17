"use client";

import { useTrades, Trade } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { JournalSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Plus, Search, Camera, Trash2, Pencil, FilterX, ArrowUpDown } from "lucide-react";

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
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "result" | "rr">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const hasFilters = search || assetFilter !== "all" || directionFilter !== "all" || resultFilter !== "all" || dateFrom || dateTo || emotionFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setAssetFilter("all");
    setDirectionFilter("all");
    setResultFilter("all");
    setEmotionFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = trades.filter((t) => {
    const matchSearch = search === "" || t.asset.toLowerCase().includes(search.toLowerCase()) || (t.setup || "").toLowerCase().includes(search.toLowerCase()) || t.strategy.toLowerCase().includes(search.toLowerCase());
    const matchAsset = assetFilter === "all" || t.asset === assetFilter;
    const matchDirection = directionFilter === "all" || t.direction === directionFilter;
    const matchResult = resultFilter === "all" || (resultFilter === "win" && t.result > 0) || (resultFilter === "loss" && t.result < 0) || (resultFilter === "be" && t.result === 0);
    const matchEmotion = emotionFilter === "all" || t.emotion === emotionFilter;
    const tradeDate = new Date(t.date);
    const matchDateFrom = !dateFrom || tradeDate >= new Date(dateFrom);
    const matchDateTo = !dateTo || tradeDate <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchAsset && matchDirection && matchResult && matchEmotion && matchDateFrom && matchDateTo;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortBy === "result") cmp = a.result - b.result;
    else if (sortBy === "rr") cmp = (Number(calculateRR(a.entry, a.sl, a.tp)) || 0) - (Number(calculateRR(b.entry, b.sl, b.tp)) || 0);
    return sortDir === "desc" ? -cmp : cmp;
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm">
            <option value="all">Tous les actifs</option>
            {assets.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm">
            <option value="all">Toutes directions</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm">
            <option value="all">Tous résultats</option>
            <option value="win">Gagnants</option>
            <option value="loss">Perdants</option>
            <option value="be">Break-even</option>
          </select>
          <select value={emotionFilter} onChange={(e) => setEmotionFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm">
            <option value="all">Toutes émotions</option>
            {[...new Set(trades.map(t => t.emotion).filter((e): e is string => !!e))].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-2 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm" />
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-[--text-secondary] hover:text-white transition">
              <FilterX className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-[--text-muted]" />
            <select value={`${sortBy}-${sortDir}`} onChange={(e) => { const [s, d] = e.target.value.split("-"); setSortBy(s as "date" | "result" | "rr"); setSortDir(d as "asc" | "desc"); }} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-2 py-1 text-xs">
              <option value="date-desc">Date (récent)</option>
              <option value="date-asc">Date (ancien)</option>
              <option value="result-desc">P&L (meilleur)</option>
              <option value="result-asc">P&L (pire)</option>
              <option value="rr-desc">R:R (meilleur)</option>
              <option value="rr-asc">R:R (pire)</option>
            </select>
          </div>
          <span className="text-sm text-[--text-muted]">{filtered.length} trade{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[--text-secondary] text-sm border-b border-[--border]">
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
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-[--text-muted]">Aucun trade trouvé</td>
                </tr>
              ) : (
                sorted.map((trade) => {
                  const isWin = trade.result > 0;
                  const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                  return (
                    <tr key={trade.id} className="trade-row border-b border-[--border-subtle]">
                      <td className="py-4 mono text-[--text-secondary]">{formatDate(trade.date)}</td>
                      <td className="py-4 font-medium">{trade.asset}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">{trade.strategy}</span>
                      </td>
                      <td className="py-4 text-[--text-secondary] max-w-xs truncate">{trade.setup || "-"}</td>
                      <td className="py-4">
                        {trade.screenshots.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            <Camera className="w-3 h-3 mr-1" />{trade.screenshots.length}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-4 mono">{trade.entry} → {trade.exit || "Open"}</td>
                      <td className="py-4 mono">{trade.lots}</td>
                      <td className="py-4 mono text-[--text-secondary]">1:{rr}</td>
                      <td className={`py-4 mono font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {isWin ? "+" : ""}{trade.result}€
                      </td>
                      <td className="py-4 text-xs text-[--text-secondary]">{trade.emotion || "-"}</td>
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
