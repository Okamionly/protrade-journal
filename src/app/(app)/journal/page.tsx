"use client";

import { useTrades, Trade } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { JournalSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Camera, Trash2, Pencil, FilterX, ArrowUpDown, Download, X } from "lucide-react";
import { useTranslation } from "@/i18n/context";

export default function JournalPage() {
  const { trades, loading, addTrade, deleteTrade, bulkDeleteTrades, updateTrade } = useTrades();
  const { toast } = useToast();
  const { t } = useTranslation();
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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // Selection helpers
  const filteredIds = useMemo(() => new Set(sorted.map((t) => t.id)), [sorted]);
  const allFilteredSelected = sorted.length > 0 && sorted.every((t) => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allFilteredSelected, filteredIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // CSV Export
  const exportCSV = useCallback(() => {
    const headers = [t("dateCol"), t("assetCol"), t("directionCol"), t("entry"), t("exit"), t("resultCol"), t("emotionCol"), t("strategyCol"), "Commission", "Swap"];
    const escapeCSV = (val: string | number | null | undefined) => {
      const str = val == null ? "" : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = sorted.map((t) => [
      formatDate(t.date),
      t.asset,
      t.direction,
      t.entry,
      t.exit ?? "",
      t.result,
      t.emotion ?? "",
      t.strategy,
      t.commission ?? 0,
      t.swap ?? 0,
    ].map(escapeCSV).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trades_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(t("csvExported"), "success");
  }, [sorted, toast, t]);

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const ok = await bulkDeleteTrades(ids);
    if (ok) {
      toast(t("tradeDeleted"), "success");
      setSelectedIds(new Set());
    } else {
      toast(t("deleteError"), "error");
    }
    setBulkDeleting(false);
    setShowDeleteModal(false);
  };

  const handleAddTrade = async (trade: Record<string, unknown>) => {
    const ok = await addTrade(trade);
    if (ok) toast(t("tradeCreated"), "success");
    else toast(t("tradeCreateError"), "error");
    return ok;
  };

  const handleUpdateTrade = async (trade: Record<string, unknown>) => {
    if (!editingTrade) return false;
    const ok = await updateTrade(editingTrade.id, trade);
    if (ok) toast(t("tradeEdited"), "success");
    else toast(t("tradeEditError"), "error");
    return ok;
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      const ok = await deleteTrade(id);
      if (ok) toast(t("tradeDeleted"), "success");
      else toast(t("tradeDeleteError"), "error");
    }
  };

  if (loading) return <JournalSkeleton />;

  return (
    <>
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t("fullHistory")}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
            >
              <Download className="w-4 h-4" />
              {t("exportCsv")}
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              {t("newTrade")}
            </button>
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
            <input
              type="text"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg pl-10 pr-4 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
            />
          </div>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]">
            <option value="all">{t("allAssets")}</option>
            {assets.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]">
            <option value="all">{t("allDirections")}</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]">
            <option value="all">{t("allResults")}</option>
            <option value="win">{t("winnersFilter")}</option>
            <option value="loss">{t("losersFilter")}</option>
            <option value="be">{t("breakeven")}</option>
          </select>
          <select value={emotionFilter} onChange={(e) => setEmotionFilter(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]">
            <option value="all">{t("allEmotions")}</option>
            {[...new Set(trades.map(t => t.emotion).filter((e): e is string => !!e))].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-2 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]" />
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-[--text-secondary] hover:text-[--text-primary] transition">
              <FilterX className="w-4 h-4" />
              {t("reset")}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-[--text-muted]" />
            <select value={`${sortBy}-${sortDir}`} onChange={(e) => { const [s, d] = e.target.value.split("-"); setSortBy(s as "date" | "result" | "rr"); setSortDir(d as "asc" | "desc"); }} className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-2 py-1 text-xs">
              <option value="date-desc">{t("sortByDate")}</option>
              <option value="date-asc">Date (asc)</option>
              <option value="result-desc">{t("sortByResult")} ↓</option>
              <option value="result-asc">{t("sortByResult")} ↑</option>
              <option value="rr-desc">R:R ↓</option>
              <option value="rr-asc">R:R ↑</option>
            </select>
          </div>
          <span className="text-sm text-[--text-muted]">{filtered.length} trade{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[--text-secondary] text-sm border-b border-[--border]">
                <th className="pb-3 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    disabled={sorted.length === 0}
                    className="w-4 h-4 rounded border-[--border] accent-blue-500 cursor-pointer"
                    title={t("selectAll")}
                  />
                </th>
                <th className="pb-3 font-medium">{t("dateCol")}</th>
                <th className="pb-3 font-medium">{t("assetCol")}</th>
                <th className="pb-3 font-medium">{t("directionCol")}</th>
                <th className="pb-3 font-medium">{t("strategyCol")}</th>
                <th className="pb-3 font-medium">{t("setupCol")}</th>
                <th className="pb-3 font-medium">{t("screenshotsCol")}</th>
                <th className="pb-3 font-medium">{t("entryExitCol")}</th>
                <th className="pb-3 font-medium">{t("lotsCol")}</th>
                <th className="pb-3 font-medium">{t("rrCol")}</th>
                <th className="pb-3 font-medium">{t("resultCol")}</th>
                <th className="pb-3 font-medium">{t("emotionCol")}</th>
                <th className="pb-3 font-medium">{t("actionsCol")}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-[--text-muted]">{t("noTradesFound")}</td>
                </tr>
              ) : (
                sorted.map((trade) => {
                  const isWin = trade.result > 0;
                  const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                  const isSelected = selectedIds.has(trade.id);
                  return (
                    <tr key={trade.id} className={`trade-row border-b border-[--border-subtle] ${isSelected ? "bg-blue-500/10" : ""}`}>
                      <td className="py-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(trade.id)}
                          className="w-4 h-4 rounded border-[--border] accent-blue-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="py-4 mono">{trade.entry} → {trade.exit || t("open")}</td>
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

      {/* Floating action bar for bulk actions */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-6 py-3 flex items-center gap-4 shadow-2xl border border-[--border] animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedIds.size} trade{selectedIds.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
          >
            <Trash2 className="w-4 h-4" />
            {t("delete")} {selectedIds.size} trade{selectedIds.size > 1 ? "s" : ""}
          </button>
          <button
            onClick={clearSelection}
            className="text-[--text-muted] hover:text-[--text-primary] transition"
            title={t("cancelSelection")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation modal for bulk delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-[--border]">
            <h3 className="text-lg font-semibold mb-3">{t("confirmDeletion")}</h3>
            <p className="text-sm text-[--text-secondary] mb-6">
              {t("confirmDeleteMsg")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition disabled:opacity-50"
              >
                {bulkDeleting ? t("deleting") : `${t("delete")} ${selectedIds.size} trade${selectedIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && <TradeForm onSubmit={handleAddTrade} onClose={() => setShowForm(false)} />}
      {editingTrade && <TradeForm onSubmit={handleUpdateTrade} onClose={() => setEditingTrade(null)} editTrade={editingTrade} />}
    </>
  );
}
