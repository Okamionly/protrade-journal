"use client";

import { useTrades, Trade } from "@/hooks/useTrades";
import { TradeForm } from "@/components/TradeForm";
import { JournalSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { calculateRR, formatDate } from "@/lib/utils";
import React, { useState, useMemo, useCallback, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Camera, Trash2, Pencil, ArrowUpDown, Download, X, Copy, Brain, Share2, Send, Tag, FileText, LayoutGrid, List, Image } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { TradeCard } from "@/components/TradeCard";

import { AdvancedFilters } from "@/components/AdvancedFilters";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import { useNotificationSystem } from "@/hooks/useNotifications";

/* ── Tag system constants ── */
const PRESET_TAGS: { label: string; color: string; bg: string; border: string }[] = [
  { label: "Setup A+", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)" },
  { label: "Breakout", color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)" },
  { label: "Reversal", color: "#f472b6", bg: "rgba(244,114,182,0.15)", border: "rgba(244,114,182,0.3)" },
  { label: "News", color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.3)" },
  { label: "Scalp", color: "#60a5fa", bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.3)" },
  { label: "Swing", color: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.3)" },
];

function getTagStyle(tagLabel: string) {
  const preset = PRESET_TAGS.find((t) => t.label.toLowerCase() === tagLabel.toLowerCase());
  if (preset) return preset;
  // fallback color for custom tags
  return { label: tagLabel, color: "#94a3b8", bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)" };
}

/* ── Tag Badge Component ── */
function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const style = getTagStyle(tag);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
    >
      {tag}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:opacity-70 transition">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

/* ── Quick Tag Picker (dropdown on + click) ── */
function QuickTagPicker({
  currentTags,
  onAddTag,
  onClose,
}: {
  currentTags: string[];
  onAddTag: (tag: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [customTag, setCustomTag] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const availableTags = PRESET_TAGS.filter((t) => !currentTags.includes(t.label));

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full mt-1 left-0 w-52 rounded-xl border border-[--border] bg-[--bg-card] shadow-2xl backdrop-blur-xl overflow-hidden"
    >
      <div className="p-2 space-y-1">
        {availableTags.map((t) => (
          <button
            key={t.label}
            onClick={() => { onAddTag(t.label); onClose(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[--bg-hover] transition text-left"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="border-t border-[--border] p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = customTag.trim();
            if (v && !currentTags.includes(v)) { onAddTag(v); onClose(); }
          }}
          className="flex gap-1"
        >
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder={t("journalCustomTag")}
            maxLength={30}
            className="flex-1 bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-2 py-1.5 text-xs text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!customTag.trim()}
            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition disabled:opacity-40"
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Notes Tooltip ── */
function NotesTooltip({ notes }: { notes: string }) {
  const preview = notes.length > 100 ? notes.slice(0, 100) + "..." : notes;
  return (
    <div className="absolute z-50 bottom-full mb-2 left-0 w-64 p-3 rounded-lg border border-[--border] bg-[--bg-card] shadow-xl text-xs text-[--text-secondary] whitespace-pre-wrap">
      {preview}
    </div>
  );
}

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

  // Tag picker state
  const [tagPickerTradeId, setTagPickerTradeId] = useState<string | null>(null);

  // View mode: "cards" (default) or "table"
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Notes expand state
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // Bulk action modals
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showBulkStrategyModal, setShowBulkStrategyModal] = useState(false);
  const [bulkStrategyValue, setBulkStrategyValue] = useState("");

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
  }, [filtered, toast]); // eslint-disable-line react-hooks/exhaustive-deps

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
        t("journalTradeRegistered"),
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

  // Tag management
  const handleAddTag = async (tradeId: string, newTag: string) => {
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return;
    const existing = (trade.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (existing.includes(newTag)) return;
    const updated = [...existing, newTag].join(", ");
    const ok = await updateTrade(tradeId, { tags: updated });
    if (ok) toast(t("journalTagAdded"), "success");
  };

  const handleRemoveTag = async (tradeId: string, tagToRemove: string) => {
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return;
    const existing = (trade.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
    const updated = existing.filter((t) => t !== tagToRemove).join(", ");
    await updateTrade(tradeId, { tags: updated || null });
  };

  // Bulk add tag
  const handleBulkAddTag = async (tag: string) => {
    let successCount = 0;
    for (const id of selectedIds) {
      const trade = trades.find((t) => t.id === id);
      if (!trade) continue;
      const existing = (trade.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (existing.includes(tag)) continue;
      const updated = [...existing, tag].join(", ");
      const ok = await updateTrade(id, { tags: updated });
      if (ok) successCount++;
    }
    if (successCount > 0) toast(t("journalTagAddedBulk", { tag, count: String(successCount) }), "success");
    setShowBulkTagModal(false);
  };

  // Bulk change strategy
  const handleBulkChangeStrategy = async () => {
    if (!bulkStrategyValue.trim()) return;
    let successCount = 0;
    for (const id of selectedIds) {
      const ok = await updateTrade(id, { strategy: bulkStrategyValue.trim() });
      if (ok) successCount++;
    }
    if (successCount > 0) toast(t("journalStrategyUpdated", { count: String(successCount) }), "success");
    setShowBulkStrategyModal(false);
    setBulkStrategyValue("");
  };

  // Export selected trades as CSV
  const exportSelectedCSV = useCallback(() => {
    const selectedTrades = sorted.filter((t) => selectedIds.has(t.id));
    if (selectedTrades.length === 0) return;
    const headers = ["Date", "Asset", "Direction", "Strategy", "Setup", "Entry", "Exit", "SL", "TP", "Lots", "Commission", "Swap", "Result", "R:R", "Emotion", "Tags"];
    const escapeCSV = (val: string | number | null | undefined) => {
      const str = val == null ? "" : String(val);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const rows = selectedTrades.map((t) => {
      const rr = calculateRR(t.entry, t.sl, t.tp);
      return [t.date ? t.date.slice(0, 10) : "", t.asset, t.direction, t.strategy, t.setup ?? "", t.entry, t.exit ?? "", t.sl, t.tp, t.lots, t.commission ?? 0, t.swap ?? 0, t.result, rr ? `1:${rr}` : "", t.emotion ?? "", t.tags ?? ""].map(escapeCSV).join(";");
    });
    const csv = [headers.join(";"), ...rows].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `protrade-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(t("journalSelectionExportedCsv"), "success");
  }, [sorted, selectedIds, toast]);

  // Unique strategies for bulk modal
  const uniqueStrategies = useMemo(() => [...new Set(trades.map((t) => t.strategy))].sort(), [trades]);

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
        toast(t("journalAiAnalysisError"), "error");
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
                {t("journalFilteredByDate")} : {urlDate}
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
                {t("journalFilteredByAsset")} : {urlAsset}
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
        {/* Sort bar + view toggle */}
        <div className="flex items-center gap-3 mb-5">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-[--border] overflow-hidden">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "cards"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-secondary]/50"
              }`}
              title="Vue liste"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "table"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-secondary]/50"
              }`}
              title="Vue tableau"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>

          {/* Select all checkbox */}
          <label className="flex items-center gap-2 text-xs text-[--text-muted] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              disabled={sorted.length === 0}
              className="w-4 h-4 rounded border-[--border] accent-blue-500 cursor-pointer"
            />
            {t("selectAll")}
          </label>

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

        {/* ── CARD VIEW ── */}
        {viewMode === "cards" && (
          sorted.length === 0 ? (
            <div className="py-12 text-center text-[--text-muted]">{t("noTradesFound")}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sorted.map((trade) => {
                const isWin = trade.result > 0;
                const isBreakeven = trade.result === 0;
                const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                const isSelected = selectedIds.has(trade.id);
                const tradeTags = (trade.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
                const hasNotes = !!trade.setup;
                const isNoteExpanded = expandedNoteId === trade.id;
                const dateObj = new Date(trade.date);
                const dateStr = dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <div
                    key={trade.id}
                    className={`glass rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-black/10 border ${
                      isSelected
                        ? "border-blue-500/50 ring-1 ring-blue-500/30"
                        : "border-[--border] hover:border-[--border-hover]"
                    }`}
                  >
                    {/* ── Header: direction + asset + date + checkbox ── */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${
                            trade.direction === "LONG"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {trade.direction === "LONG" ? "\u{1F7E2}" : "\u{1F534}"} {trade.direction}
                        </span>
                        <span className="text-lg font-bold text-[--text-primary]">{trade.asset}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[--text-muted]">{dateStr} &bull; {timeStr}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(trade.id)}
                          className="w-4 h-4 rounded border-[--border] accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* ── Price grid: Entry/Exit, SL/TP, Lots ── */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[--text-muted] text-xs w-16">Entr\u00e9e</span>
                        <span className="mono font-medium text-[--text-primary]">{trade.entry}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[--text-muted] text-xs w-16">Sortie</span>
                        <span className="mono font-medium text-[--text-primary]">{trade.exit || t("open")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[--text-muted] text-xs w-16">SL</span>
                        <span className="mono text-rose-400/80">{trade.sl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[--text-muted] text-xs w-16">TP</span>
                        <span className="mono text-emerald-400/80">{trade.tp}</span>
                      </div>
                    </div>

                    {/* ── P&L + R:R + Lots row ── */}
                    <div className="flex items-center gap-4 mb-4 flex-wrap">
                      <span
                        className={`text-xl font-bold mono ${
                          isBreakeven ? "text-[--text-muted]" : isWin ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isWin ? "+" : ""}{trade.result.toFixed(2)}€
                      </span>
                      <span className="text-sm text-[--text-secondary] mono">R:R 1:{rr}</span>
                      <span className="text-sm text-[--text-muted]">{trade.lots} lots</span>
                    </div>

                    {/* ── Strategy + Emotion badges ── */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                        {trade.strategy}
                      </span>
                      {trade.emotion && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium border border-purple-500/20">
                          {trade.emotion}
                        </span>
                      )}
                      {/* Screenshot badge */}
                      {trade.screenshots.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium border border-amber-500/20">
                          <Image className="w-3 h-3" />{trade.screenshots.length}
                        </span>
                      )}
                    </div>

                    {/* ── Tags ── */}
                    {(tradeTags.length > 0 || true) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {tradeTags.map((tag, tagIdx) => (
                          <TagBadge key={`${tag}-${tagIdx}`} tag={tag} onRemove={() => handleRemoveTag(trade.id, tag)} />
                        ))}
                        <div className="relative">
                          <button
                            onClick={() => setTagPickerTradeId(tagPickerTradeId === trade.id ? null : trade.id)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                            title={t("journalAddTag")}
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          {tagPickerTradeId === trade.id && (
                            <QuickTagPicker
                              currentTags={tradeTags}
                              onAddTag={(tag) => handleAddTag(trade.id, tag)}
                              onClose={() => setTagPickerTradeId(null)}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Notes (expandable) ── */}
                    {hasNotes && (
                      <div className="mb-3">
                        <button
                          onClick={() => setExpandedNoteId(isNoteExpanded ? null : trade.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{trade.setup}</span>
                        </button>
                        {isNoteExpanded && (
                          <div className="mt-2 rounded-lg bg-[--bg-secondary]/50 border border-[--border] p-3 text-xs text-[--text-secondary] whitespace-pre-wrap">
                            {trade.setup}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Action buttons row ── */}
                    <div className="flex items-center gap-1 pt-3 border-t border-[--border-subtle]">
                      <button onClick={() => setEditingTrade(trade)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-400 hover:bg-blue-500/10 transition" title={t("editTrade")}>
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Modifier</span>
                      </button>
                      <button onClick={() => handleDuplicate(trade)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/10 transition" title={t("journalDuplicate")}>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dupliquer</span>
                      </button>
                      <button onClick={() => setShareTradeId(trade.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition" title={t("journalShare")}>
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Partager</span>
                      </button>
                      <button onClick={() => handleAIReview(trade.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-purple-400 hover:bg-purple-500/10 transition" title="AI Review">
                        <Brain className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI Review</span>
                      </button>
                      <div className="ml-auto">
                        <button onClick={() => handleDelete(trade.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition" title={t("delete")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── TABLE VIEW (compact, for power users) ── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto max-h-[75vh] overflow-y-auto rounded-xl border border-[--border]">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 40, minWidth: 40 }} />
                <col style={{ width: 100, minWidth: 100 }} />
                <col style={{ width: 110, minWidth: 110 }} />
                <col style={{ width: 80, minWidth: 80 }} />
                <col style={{ width: 120, minWidth: 120 }} />
                <col style={{ width: 100, minWidth: 100 }} />
                <col style={{ width: 100, minWidth: 100 }} />
                <col style={{ width: 60, minWidth: 60 }} />
                <col style={{ width: 70, minWidth: 70 }} />
                <col style={{ width: 100, minWidth: 100 }} />
                <col style={{ width: 100, minWidth: 100 }} />
                <col />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="text-[10px] uppercase tracking-widest font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 40, minWidth: 40 }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      disabled={sorted.length === 0}
                      className="w-3.5 h-3.5 rounded border-[--border] accent-blue-500 cursor-pointer"
                      title={t("selectAll")}
                    />
                  </th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 100, minWidth: 100 }}>{t("dateCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 110, minWidth: 110 }}>{t("assetCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 80, minWidth: 80 }}>{t("directionCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 120, minWidth: 120 }}>{t("strategyCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 100, minWidth: 100 }}>{t("entryCol") || "Entry"}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 100, minWidth: 100 }}>{t("exitCol") || "Exit"}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 60, minWidth: 60 }}>{t("lotsCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 70, minWidth: 70 }}>{t("rrCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 100, minWidth: 100 }}>{t("resultCol")}</th>
                  <th className="py-3 px-3 text-center" style={{ borderRight: "1px solid var(--border)", width: 100, minWidth: 100 }}>{t("emotionCol")}</th>
                  <th className="py-3 px-3 text-center">{t("actionsCol")}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-[--text-muted]">{t("noTradesFound")}</td>
                  </tr>
                ) : (
                  sorted.map((trade, rowIndex) => {
                    const isWin = trade.result > 0;
                    const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                    const isSelected = selectedIds.has(trade.id);
                    const hasNotes = !!trade.setup;
                    const isNoteExpanded = expandedNoteId === trade.id;
                    const tradeTags = (trade.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
                    const zebraClass = rowIndex % 2 === 1 ? "bg-[--bg-secondary]/20" : "";
                    const emotionEmoji: Record<string, string> = { confident: "\u{1F60E}", calm: "\u{1F60C}", anxious: "\u{1F630}", fearful: "\u{1F628}", greedy: "\u{1F911}", frustrated: "\u{1F624}", euphoric: "\u{1F929}", neutral: "\u{1F610}", doubtful: "\u{1F914}", focused: "\u{1F3AF}", stressed: "\u{1F625}", impatient: "\u23F1\uFE0F", revenge: "\u{1F621}", bored: "\u{1F971}", happy: "\u{1F604}", sad: "\u{1F614}" };
                    const tradeDate = new Date(trade.date);
                    const shortDate = tradeDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    const fullDate = tradeDate.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                    const cellBorder = { borderRight: "1px solid var(--border)" } as const;
                    return (
                      <React.Fragment key={trade.id}>
                        <tr
                          className={`trade-row transition-colors duration-150 hover:bg-[--bg-secondary]/50 cursor-pointer ${isSelected ? "bg-blue-500/10" : zebraClass}`}
                          style={{ borderBottom: "1px solid var(--border)" }}
                          onClick={(e) => {
                            // Expand row on click (unless clicking checkbox/button)
                            const target = e.target as HTMLElement;
                            if (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.closest("button")) return;
                            setExpandedNoteId(isNoteExpanded ? null : trade.id);
                          }}
                        >
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 40, minWidth: 40 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(trade.id)}
                              className="w-3.5 h-3.5 rounded border-[--border] accent-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap" style={{ ...cellBorder, width: 100, minWidth: 100 }} title={fullDate}>
                            <span className="text-xs text-[--text-secondary]">{shortDate}</span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap" style={{ ...cellBorder, width: 110, minWidth: 110 }}>
                            <span className="font-semibold text-sm text-[--text-primary]">{trade.asset}</span>
                          </td>
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 80, minWidth: 80 }}>
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 120, minWidth: 120 }}>
                            <span className="text-xs text-blue-400 font-medium truncate block">{trade.strategy}</span>
                          </td>
                          <td className="py-3 px-3 text-center mono text-xs" style={{ ...cellBorder, width: 100, minWidth: 100 }}>{trade.entry}</td>
                          <td className="py-3 px-3 text-center mono text-xs" style={{ ...cellBorder, width: 100, minWidth: 100 }}>{trade.exit || <span className="text-[--text-muted]">{t("open")}</span>}</td>
                          <td className="py-3 px-3 text-center mono text-xs" style={{ ...cellBorder, width: 60, minWidth: 60 }}>{trade.lots}</td>
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 70, minWidth: 70 }}>
                            <span className="mono text-xs font-semibold text-[--text-secondary]">1:{rr}</span>
                          </td>
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 100, minWidth: 100 }}>
                            <span className={`text-sm font-bold mono whitespace-nowrap ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                              {isWin ? "+" : ""}{trade.result.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center" style={{ ...cellBorder, width: 100, minWidth: 100 }}>
                            {trade.emotion ? (
                              <span className="inline-flex items-center justify-center gap-1 text-xs text-[--text-secondary]" title={trade.emotion}>
                                <span>{emotionEmoji[trade.emotion.toLowerCase()] || "\u{1F610}"}</span>
                                <span className="capitalize hidden xl:inline">{trade.emotion}</span>
                              </span>
                            ) : <span className="text-[--text-muted]">-</span>}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setEditingTrade(trade)} className="text-blue-400 hover:text-blue-300 transition p-1 rounded hover:bg-blue-500/10" title={t("editTrade")}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDuplicate(trade)} className="text-cyan-400 hover:text-cyan-300 transition p-1 rounded hover:bg-cyan-500/10" title={t("journalDuplicate")}>
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleAIReview(trade.id)} className="text-purple-400 hover:text-purple-300 transition p-1 rounded hover:bg-purple-500/10" title="AI Review">
                                <Brain className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(trade.id)} className="text-rose-400 hover:text-rose-300 transition p-1 rounded hover:bg-rose-500/10" title={t("delete")}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded detail row (shows notes, tags, screenshots, setup on click) */}
                        {isNoteExpanded && (
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            <td colSpan={12} className="px-4 py-3" style={{ background: "var(--bg-secondary)", opacity: 0.85 }}>
                              <div className="flex flex-wrap gap-4 text-xs">
                                {/* Notes / Setup */}
                                {hasNotes && (
                                  <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-amber-400 font-medium">
                                      <FileText className="w-3.5 h-3.5" />
                                      {t("journalTradeNotes")}
                                    </div>
                                    <div className="rounded-lg bg-[--bg-card]/60 border border-[--border] p-3 text-[--text-secondary] whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">
                                      {trade.setup}
                                    </div>
                                  </div>
                                )}
                                {/* Tags */}
                                <div className="min-w-[150px]">
                                  <div className="flex items-center gap-1.5 mb-1.5 text-cyan-400 font-medium">
                                    <Tag className="w-3.5 h-3.5" />
                                    Tags
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {tradeTags.length > 0 ? tradeTags.map((tag, tagIdx) => (
                                      <TagBadge key={`${tag}-${tagIdx}`} tag={tag} onRemove={() => handleRemoveTag(trade.id, tag)} />
                                    )) : <span className="text-[--text-muted]">-</span>}
                                    <div className="relative">
                                      <button
                                        onClick={() => setTagPickerTradeId(tagPickerTradeId === trade.id ? null : trade.id)}
                                        className="w-5 h-5 rounded flex items-center justify-center text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                                        title={t("journalAddTag")}
                                      >
                                        <Tag className="w-3 h-3" />
                                      </button>
                                      {tagPickerTradeId === trade.id && (
                                        <QuickTagPicker
                                          currentTags={tradeTags}
                                          onAddTag={(tag) => handleAddTag(trade.id, tag)}
                                          onClose={() => setTagPickerTradeId(null)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Screenshots */}
                                {trade.screenshots.length > 0 && (
                                  <div className="min-w-[100px]">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-blue-400 font-medium">
                                      <Camera className="w-3.5 h-3.5" />
                                      Screenshots
                                    </div>
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                                      <Camera className="w-3 h-3 mr-1" />{trade.screenshots.length}
                                    </span>
                                  </div>
                                )}
                                {/* Share button in expanded row */}
                                <div className="flex items-end">
                                  <button onClick={() => setShareTradeId(trade.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition" title={t("journalShare")}>
                                    <Share2 className="w-3.5 h-3.5" />
                                    {t("journalShare")}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating action bar for bulk actions */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-5 py-3 flex items-center gap-3 shadow-2xl border border-[--border] animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedIds.size} trade{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="w-px h-6 bg-[--border]" />
          <button
            onClick={exportSelectedCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
            title={t("journalExportSelection")}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("journalExport")}</span>
          </button>
          <button
            onClick={() => setShowBulkTagModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition"
            title={t("journalAddTag")}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tag</span>
          </button>
          <button
            onClick={() => setShowBulkStrategyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
            title={t("journalChangeStrategy", { count: String(selectedIds.size) })}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("journalChangeStrategyBtn")}</span>
          </button>
          <div className="w-px h-6 bg-[--border]" />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("delete")}</span>
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

      {/* Bulk Add Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border border-[--border] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2 text-[--text-primary]">
                <Tag className="w-5 h-5 text-amber-400" />
                {t("journalAddTagBulk", { count: String(selectedIds.size) })}
              </h3>
              <button onClick={() => setShowBulkTagModal(false)} className="text-[--text-muted] hover:text-[--text-primary] transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESET_TAGS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleBulkAddTag(t.label)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition text-left"
                  style={{ color: t.color, background: t.bg, border: `1px solid ${t.border}` }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBulkTagModal(false)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
            >
              {t("journalCancel")}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Change Strategy Modal */}
      {showBulkStrategyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border border-[--border] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2 text-[--text-primary]">
                <Pencil className="w-5 h-5 text-blue-400" />
                {t("journalChangeStrategy", { count: String(selectedIds.size) })}
              </h3>
              <button onClick={() => { setShowBulkStrategyModal(false); setBulkStrategyValue(""); }} className="text-[--text-muted] hover:text-[--text-primary] transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <select
                value={bulkStrategyValue}
                onChange={(e) => setBulkStrategyValue(e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:border-cyan-500/50 transition"
              >
                <option value="">{t("journalChooseStrategy")}</option>
                {uniqueStrategies.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                value={bulkStrategyValue}
                onChange={(e) => setBulkStrategyValue(e.target.value)}
                placeholder={t("journalOrNewStrategy")}
                maxLength={50}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkStrategyModal(false); setBulkStrategyValue(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
              >
                {t("journalCancel")}
              </button>
              <button
                onClick={handleBulkChangeStrategy}
                disabled={!bulkStrategyValue.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {t("journalApply")}
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
                {t("journalAiReview")}
              </h3>
              <button onClick={() => { setAiReviewTradeId(null); setAiReview(null); }} style={{ color: "var(--text-muted)" }} className="hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiReviewLoading ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("journalAnalyzing")}</p>
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
                  <h4 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("journalObservations")}</h4>
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
                    <h4 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("journalSuggestions")}</h4>
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
  const { t } = useTranslation();

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
        toast(t("journalCommunityNotFound"), "error");
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
        toast(t("journalShared"), "success");
        setTimeout(onClose, 1200);
      } else {
        toast(t("journalShareError"), "error");
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
            {t("journalShareToCommunity")}
          </h3>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live preview label */}
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          {t("journalPreviewInFeed")}
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
          placeholder={t("journalAddComment")}
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
            {t("journalCancel")}
          </button>
          <button
            onClick={handleShare}
            disabled={sending || sent}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {sent ? (
              t("journalShared")
            ) : sending ? (
              t("journalSending")
            ) : (
              <>
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                {t("journalShareToCommunity")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
