"use client";

import { useTrades, Trade } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { JournalSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Camera, Trash2, Pencil, ArrowUpDown, Download, X, Copy, Brain, Share2, Send } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { TradeCard } from "@/components/TradeCard";

import { AdvancedFilters } from "@/components/AdvancedFilters";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import { useNotificationSystem } from "@/hooks/useNotifications";

interface AIReviewResult {
  score: number;
  grade: string;
  observations: { type: "positive" | "warning" | "negative"; text: string }[];
  suggestions: string[];
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-28 h-28 mx-auto mb-4">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-gray-700/30" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>/100</span>
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalPageContent />
    </Suspense>
  );
}

function JournalPageContent() {
  const { trades, loading, addTrade, deleteTrade, bulkDeleteTrades, updateTrade } = useTrades();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { addNotification } = useNotificationSystem();
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "result" | "rr">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { applyFilters } = useAdvancedFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlDate = searchParams.get("date");
  const urlAsset = searchParams.get("asset");

  // Duplication state
  const [duplicatingTrade, setDuplicatingTrade] = useState<Trade | null>(null);

  // AI Review state
  const [aiReview, setAiReview] = useState<AIReviewResult | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewTradeId, setAiReviewTradeId] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [shareTradeId, setShareTradeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = applyFilters(trades);
    if (urlDate) {
      result = result.filter((t) => new Date(t.date).toISOString().slice(0, 10) === urlDate);
    }
    if (urlAsset) {
      result = result.filter((t) => t.asset.toLowerCase() === urlAsset.toLowerCase());
    }
    return result;
  }, [trades, applyFilters, urlDate, urlAsset]);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortBy === "result") cmp = a.result - b.result;
    else if (sortBy === "rr") cmp = (Number(calculateRR(a.entry, a.sl, a.tp)) || 0) - (Number(calculateRR(b.entry, b.sl, b.tp)) || 0);
    return sortDir === "desc" ? -cmp : cmp;
  });

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

  // CSV Export (semicolon separator for French Excel compatibility)
  const exportCSV = useCallback(() => {
    const headers = ["Date", "Asset", "Direction", "Strategy", "Setup", "Entry", "Exit", "SL", "TP", "Lots", "Commission", "Swap", "Result", "R:R", "Emotion", "Tags"];
    const escapeCSV = (val: string | number | null | undefined) => {
      const str = val == null ? "" : String(val);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = filtered.map((t) => {
      const rr = calculateRR(t.entry, t.sl, t.tp);
      return [
        t.date ? t.date.slice(0, 10) : "",
        t.asset,
        t.direction,
        t.strategy,
        t.setup ?? "",
        t.entry,
        t.exit ?? "",
        t.sl,
        t.tp,
        t.lots,
        t.commission ?? 0,
        t.swap ?? 0,
        t.result,
        rr ? `1:${rr}` : "",
        t.emotion ?? "",
        t.tags ?? "",
      ].map(escapeCSV).join(";");
    });

    const csv = [headers.join(";"), ...rows].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marketphase-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(t("csvExported"), "success");
  }, [filtered, toast, t]);

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
    if (ok) {
      toast(t("tradeCreated"), "success");
      const asset = trade.asset as string || "?";
      const result = Number(trade.result) || 0;
      const sign = result >= 0 ? "+" : "";
      addNotification(
        "TRADE_ALERT",
        "Trade enregistre",
        `${asset} ${sign}${result.toFixed(2)}€`,
        "/journal"
      );
    } else {
      toast(t("tradeCreateError"), "error");
    }
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

  const handleDuplicate = (trade: Trade) => {
    // Create a copy without date and result
    const dup = { ...trade };
    setDuplicatingTrade(dup);
  };

  const handleDuplicateSubmit = async (data: Record<string, unknown>) => {
    const ok = await addTrade(data);
    if (ok) toast(t("tradeCreated"), "success");
    else toast(t("tradeCreateError"), "error");
    return ok;
  };

  const handleAIReview = async (tradeId: string) => {
    setAiReviewTradeId(tradeId);
    setAiReview(null);
    setAiReviewLoading(true);
    try {
      const res = await fetch("/api/ai/trade-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiReview(data);
      } else {
        toast("Erreur lors de l'analyse AI", "error");
        setAiReviewTradeId(null);
      }
    } catch {
      toast("Erreur lors de l'analyse AI", "error");
      setAiReviewTradeId(null);
    } finally {
      setAiReviewLoading(false);
    }
  };

  if (loading) return <JournalSkeleton />;

  return (
    <>
      <div className="glass rounded-2xl p-6">
        {/* URL-based filter banners */}
        {(urlDate || urlAsset) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {urlDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Filtr&eacute; par date : {urlDate}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("date");
                    const qs = params.toString();
                    router.push(qs ? `/journal?${qs}` : "/journal");
                  }}
                  className="ml-1 hover:text-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {urlAsset && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Filtr&eacute; par actif : {urlAsset}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("asset");
                    const qs = params.toString();
                    router.push(qs ? `/journal?${qs}` : "/journal");
                  }}
                  className="ml-1 hover:text-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
        )}

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

        {/* Advanced Filters */}
        <Suspense fallback={null}>
          <AdvancedFilters trades={trades} />
        </Suspense>
        <div className="flex items-center gap-3 mb-4">
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
                          <button onClick={() => setEditingTrade(trade)} className="text-blue-400 hover:text-blue-300" title={t("editTrade")}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicate(trade)} className="text-cyan-400 hover:text-cyan-300" title="Dupliquer">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShareTradeId(trade.id)} className="text-emerald-400 hover:text-emerald-300 transition" title="Partager">
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleAIReview(trade.id)} className="text-purple-400 hover:text-purple-300" title="AI Review">
                            <Brain className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(trade.id)} className="text-rose-400 hover:text-rose-300" title={t("delete")}>
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

      {/* Duplicate trade form - opens TradeForm with pre-filled data but cleared date/result */}
      {duplicatingTrade && (
        <TradeForm
          onSubmit={handleDuplicateSubmit}
          onClose={() => setDuplicatingTrade(null)}
          editTrade={{
            ...duplicatingTrade,
            id: "",
            date: new Date().toISOString(),
            result: 0,
            exit: null,
          }}
        />
      )}

      {/* AI Review Modal */}
      {aiReviewTradeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Brain className="w-5 h-5 text-purple-400" />
                AI Trade Review
              </h3>
              <button onClick={() => { setAiReviewTradeId(null); setAiReview(null); }} style={{ color: "var(--text-muted)" }} className="hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiReviewLoading ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Analyse en cours...</p>
              </div>
            ) : aiReview ? (
              <div className="space-y-5">
                <ScoreGauge score={aiReview.score} />
                <div className="text-center">
                  <span className={`text-2xl font-bold ${
                    aiReview.score >= 70 ? "text-emerald-400" : aiReview.score >= 40 ? "text-yellow-400" : "text-rose-400"
                  }`}>
                    Grade: {aiReview.grade}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Observations</h4>
                  {aiReview.observations.map((obs, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                        obs.type === "positive"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : obs.type === "warning"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      <span className="mt-0.5">{obs.type === "positive" ? "+" : obs.type === "warning" ? "!" : "-"}</span>
                      <span>{obs.text}</span>
                    </div>
                  ))}
                </div>

                {aiReview.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Suggestions</h4>
                    <ul className="space-y-1.5">
                      {aiReview.suggestions.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                          <span className="text-purple-400 mt-0.5">*</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Share Trade to Community Modal */}
      {shareTradeId && (
        <ShareTradeToCommunityModal
          tradeId={shareTradeId}
          trades={trades}
          onClose={() => setShareTradeId(null)}
        />
      )}
    </>
  );
}

const SHARE_TEMPLATES = [
  { label: "Setup du jour", text: "Setup du jour" },
  { label: "Trade de la semaine", text: "Trade de la semaine" },
  { label: "Analyse technique", text: "Analyse technique" },
];

function ShareTradeToCommunityModal({ tradeId, trades, onClose }: { tradeId: string; trades: Trade[]; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) return null;

  const isWin = trade.result > 0;

  const handleShare = async () => {
    setSending(true);
    try {
      const roomsRes = await fetch("/api/chat/rooms");
      if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
      const rooms = await roomsRes.json();
      const community = rooms.find((r: { name: string }) => r.name === "Communauté" || r.name === "community");
      if (!community) {
        toast("Salon communautaire non trouvé", "error");
        setSending(false);
        return;
      }

      const content = comment
        ? `${comment}\n\n📊 Trade partagé : ${trade.asset} ${trade.direction} — ${isWin ? "+" : ""}${trade.result}€`
        : `📊 Trade partagé : ${trade.asset} ${trade.direction} — ${isWin ? "+" : ""}${trade.result}€`;

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: community.id,
          content,
          tradeId: trade.id,
        }),
      });

      if (res.ok) {
        setSent(true);
        toast("Trade partagé dans la communauté !", "success");
        setTimeout(onClose, 1200);
      } else {
        toast("Erreur lors du partage", "error");
      }
    } catch {
      toast("Erreur lors du partage", "error");
    } finally {
      setSending(false);
    }
  };

  // Build a SharedTrade-compatible object for the TradeCard preview
  const sharedTrade = {
    id: trade.id,
    asset: trade.asset,
    direction: trade.direction,
    strategy: trade.strategy,
    entry: trade.entry,
    exit: trade.exit,
    sl: trade.sl,
    tp: trade.tp,
    lots: trade.lots,
    result: trade.result,
    date: trade.date,
    emotion: trade.emotion,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 max-w-md w-full border border-[--border] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Partager dans la communauté
          </h3>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live preview label */}
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Aperçu dans le fil
        </p>

        {/* Trade card preview using shared component */}
        <TradeCard trade={sharedTrade} variant="full" showActions={false} />

        {/* Quick templates */}
        <div className="flex gap-2 mt-4 mb-2 flex-wrap">
          {SHARE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => setComment((prev) => prev ? `${prev} ${tpl.text}` : tpl.text)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition hover:opacity-80"
              style={{
                borderColor: "rgba(6,182,212,0.3)",
                color: "#06b6d4",
                background: "rgba(6,182,212,0.08)",
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ajouter un commentaire, votre analyse, votre raisonnement..."
          rows={3}
          maxLength={500}
          className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50 transition resize-none mb-1"
        />
        <p className="text-[10px] text-right mb-4" style={{ color: "var(--text-muted)" }}>
          {comment.length}/500
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
          >
            Annuler
          </button>
          <button
            onClick={handleShare}
            disabled={sending || sent}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {sent ? (
              "Partagé !"
            ) : sending ? (
              "Envoi..."
            ) : (
              <>
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                Partager dans la communauté
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
