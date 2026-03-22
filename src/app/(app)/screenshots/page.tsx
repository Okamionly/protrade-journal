"use client";

import { useTrades } from "@/hooks/useTrades";
import type { Trade, Screenshot } from "@/hooks/useTrades";
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Camera, ChevronLeft, ChevronRight, StickyNote, ArrowLeftRight } from "lucide-react";
import { useTranslation } from "@/i18n/context";

/* ── Types ── */
type FilterType = "all" | "win" | "loss";

interface ScreenshotItem {
  src: string;
  screenshotId: string;
  trade: Trade;
  indexInTrade: number;
}

/* ── localStorage helpers for notes ── */
const NOTES_KEY = "protrade-screenshot-notes";

function loadNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveNote(id: string, text: string) {
  const notes = loadNotes();
  if (text.trim()) {
    notes[id] = text;
  } else {
    delete notes[id];
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/* ── Main page ── */
export default function ScreenshotsPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<FilterType>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [beforeAfterTradeId, setBeforeAfterTradeId] = useState<string | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  /* ── Build screenshot list ── */
  const allScreenshots = useMemo<ScreenshotItem[]>(() => {
    const items: ScreenshotItem[] = [];
    trades.forEach((trade) => {
      if (trade.screenshots?.length > 0) {
        const shouldInclude =
          filter === "all" ||
          (filter === "win" && trade.result > 0) ||
          (filter === "loss" && trade.result < 0);
        if (shouldInclude) {
          trade.screenshots.forEach((s, idx) => {
            items.push({
              src: s.url,
              screenshotId: s.id,
              trade,
              indexInTrade: idx,
            });
          });
        }
      }
    });
    return items;
  }, [trades, filter]);

  /* ── Filter counts ── */
  const counts = useMemo(() => {
    let all = 0, wins = 0, losses = 0;
    trades.forEach((trade) => {
      if (trade.screenshots?.length > 0) {
        const n = trade.screenshots.length;
        all += n;
        if (trade.result > 0) wins += n;
        else if (trade.result < 0) losses += n;
      }
    });
    return { all, wins, losses };
  }, [trades]);

  /* ── Strategy performance ── */
  const sortedStrats = useMemo(() => {
    const stratPerf: Record<string, { wins: number; total: number; profit: number }> = {};
    trades.forEach((tr) => {
      if (tr.screenshots?.length > 0) {
        if (!stratPerf[tr.strategy]) stratPerf[tr.strategy] = { wins: 0, total: 0, profit: 0 };
        stratPerf[tr.strategy].total++;
        stratPerf[tr.strategy].profit += tr.result;
        if (tr.result > 0) stratPerf[tr.strategy].wins++;
      }
    });
    return Object.entries(stratPerf)
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 3);
  }, [trades]);

  /* ── Lightbox navigation ── */
  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null && prev < allScreenshots.length - 1 ? prev + 1 : prev
    );
  }, [allScreenshots.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goNext, goPrev, closeLightbox]);

  /* ── Note handlers ── */
  const handleNoteChange = (screenshotId: string, text: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      if (text.trim()) next[screenshotId] = text;
      else delete next[screenshotId];
      return next;
    });
    saveNote(screenshotId, text);
  };

  /* ── Before/After data ── */
  const beforeAfterData = useMemo(() => {
    if (!beforeAfterTradeId) return null;
    const trade = trades.find((t) => t.id === beforeAfterTradeId);
    if (!trade || !trade.screenshots || trade.screenshots.length < 2) return null;
    return {
      trade,
      before: trade.screenshots[0],
      after: trade.screenshots[trade.screenshots.length - 1],
    };
  }, [beforeAfterTradeId, trades]);

  /* ── Trades with 2+ screenshots (for before/after) ── */
  const tradesWithMultipleScreenshots = useMemo(
    () => trades.filter((t) => t.screenshots && t.screenshots.length >= 2),
    [trades]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[--text-secondary]">{t("loading")}</div>
      </div>
    );
  }

  const currentItem = lightboxIndex !== null ? allScreenshots[lightboxIndex] : null;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const riskReward = (tr: Trade) => {
    if (!tr.entry || !tr.sl || !tr.tp) return null;
    const risk = Math.abs(tr.entry - tr.sl);
    const reward = Math.abs(tr.tp - tr.entry);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold">{t("screenshotLibrary")}</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-[--accent]/20 text-[--accent] border border-[--accent]/40"
                  : "bg-[--bg-secondary]/50 border border-[--border] text-[--text-secondary] hover:border-[--accent]/30"
              }`}
            >
              Tous
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-white/10">
                {counts.all}
              </span>
            </button>
            <button
              onClick={() => setFilter("win")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === "win"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-[--bg-secondary]/50 border border-[--border] text-[--text-secondary] hover:border-emerald-500/30"
              }`}
            >
              Gagnants
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                {counts.wins}
              </span>
            </button>
            <button
              onClick={() => setFilter("loss")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === "loss"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-[--bg-secondary]/50 border border-[--border] text-[--text-secondary] hover:border-rose-500/30"
              }`}
            >
              Perdants
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-400">
                {counts.losses}
              </span>
            </button>
          </div>
        </div>

        {/* ── Gallery Grid ── */}
        {allScreenshots.length === 0 ? (
          <div className="text-center py-12 text-[--text-muted]">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noScreenshot")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allScreenshots.map((item, i) => (
              <div
                key={`${item.screenshotId}-${i}`}
                className="group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-[--accent]/50 transition-all duration-300 cursor-pointer bg-[--bg-secondary]/30"
                onClick={() => setLightboxIndex(i)}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={item.src}
                    alt={`Setup ${item.trade.asset}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Note indicator */}
                  {notes[item.screenshotId] && (
                    <div className="absolute top-2 right-2 bg-yellow-500/80 rounded-full p-1" title="Notes">
                      <StickyNote className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{item.trade.asset}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.trade.direction?.toLowerCase() === "long" || item.trade.direction?.toLowerCase() === "buy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {item.trade.direction}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[--text-muted]">{formatDate(item.trade.date)}</p>
                    <p
                      className={`text-sm font-bold ${
                        item.trade.result > 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {item.trade.result > 0 ? "+" : ""}
                      {item.trade.result.toFixed(2)}&euro;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Before/After Section ── */}
      {tradesWithMultipleScreenshots.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Avant / Apres
            </h3>
            <select
              value={beforeAfterTradeId ?? ""}
              onChange={(e) => setBeforeAfterTradeId(e.target.value || null)}
              className="bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-4 py-2 text-sm"
            >
              <option value="">Selectionner un trade...</option>
              {tradesWithMultipleScreenshots.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.asset} - {formatDate(tr.date)} ({tr.screenshots.length} captures)
                </option>
              ))}
            </select>
          </div>

          {beforeAfterData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative rounded-xl overflow-hidden border border-[--border]">
                <div className="absolute top-2 left-2 z-10 bg-blue-500/80 text-white text-xs font-bold px-2 py-1 rounded">
                  AVANT (Entree)
                </div>
                <img
                  src={beforeAfterData.before.url}
                  alt="Avant"
                  className="w-full aspect-video object-cover"
                />
              </div>
              <div className="relative rounded-xl overflow-hidden border border-[--border]">
                <div className="absolute top-2 left-2 z-10 bg-orange-500/80 text-white text-xs font-bold px-2 py-1 rounded">
                  APRES (Sortie)
                </div>
                <img
                  src={beforeAfterData.after.url}
                  alt="Apres"
                  className="w-full aspect-video object-cover"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-center gap-6 text-sm py-2">
                <span className="text-[--text-secondary]">
                  {beforeAfterData.trade.asset} &bull;{" "}
                  <span
                    className={
                      beforeAfterData.trade.direction?.toLowerCase() === "long" ||
                      beforeAfterData.trade.direction?.toLowerCase() === "buy"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {beforeAfterData.trade.direction}
                  </span>
                </span>
                <span
                  className={`font-bold ${
                    beforeAfterData.trade.result > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {beforeAfterData.trade.result > 0 ? "+" : ""}
                  {beforeAfterData.trade.result.toFixed(2)}&euro;
                </span>
                <span className="text-[--text-muted]">
                  {beforeAfterData.trade.screenshots.length} captures
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-8">
              Selectionnez un trade avec plusieurs screenshots pour comparer avant/apres.
            </p>
          )}
        </div>
      )}

      {/* ── Visual Analysis ── */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">{t("visualAnalysis")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[--bg-secondary]/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-[--text-secondary] mb-2">
              {t("mostProfitableSetups")}
            </h4>
            <div className="space-y-2">
              {sortedStrats.length > 0 ? (
                sortedStrats.map(([name, stats]) => (
                  <div
                    key={name}
                    className="flex justify-between items-center p-2 bg-[--bg-secondary]/50 rounded-lg"
                  >
                    <span className="text-sm">{name}</span>
                    <span
                      className={`text-sm font-bold ${
                        stats.profit > 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {stats.profit > 0 ? "+" : ""}
                      {stats.profit}&euro;
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[--text-muted] text-sm">Pas assez de donnees</p>
              )}
            </div>
          </div>
          <div className="bg-[--bg-secondary]/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-[--text-secondary] mb-2">
              {t("commonVisualErrors")}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-[--bg-secondary]/50 rounded-lg">
                <span className="text-yellow-500">&#9888;</span>
                <span className="text-sm">{t("earlyBreakoutEntry")}</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-[--bg-secondary]/50 rounded-lg">
                <span className="text-yellow-500">&#9888;</span>
                <span className="text-sm">{t("tightSLVolatility")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-screen Lightbox ── */}
      {currentItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-20 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Left arrow */}
          {lightboxIndex !== null && lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right arrow */}
          {lightboxIndex !== null && lightboxIndex < allScreenshots.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors md:right-[340px]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center p-4 md:pr-[320px]">
            <img
              src={currentItem.src}
              alt={`Setup ${currentItem.trade.asset}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Side info panel */}
          <div className="hidden md:flex flex-col w-[320px] bg-[--bg-primary]/80 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
            {/* Counter */}
            <p className="text-[--text-muted] text-xs mb-4">
              {(lightboxIndex ?? 0) + 1} / {allScreenshots.length}
            </p>

            {/* Asset & Direction */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">{currentItem.trade.asset}</h2>
              <span
                className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                  currentItem.trade.direction?.toLowerCase() === "long" ||
                  currentItem.trade.direction?.toLowerCase() === "buy"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {currentItem.trade.direction}
              </span>
            </div>

            {/* Date */}
            <p className="text-sm text-[--text-secondary] mb-6">
              {formatDate(currentItem.trade.date)}
            </p>

            {/* Trade details */}
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Entree</span>
                <span className="text-white font-medium">{currentItem.trade.entry}</span>
              </div>
              {currentItem.trade.exit !== null && (
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Sortie</span>
                  <span className="text-white font-medium">{currentItem.trade.exit}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[--text-muted]">SL</span>
                <span className="text-white font-medium">{currentItem.trade.sl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">TP</span>
                <span className="text-white font-medium">{currentItem.trade.tp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">P&L</span>
                <span
                  className={`font-bold ${
                    currentItem.trade.result > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {currentItem.trade.result > 0 ? "+" : ""}
                  {currentItem.trade.result.toFixed(2)}&euro;
                </span>
              </div>
              {riskReward(currentItem.trade) && (
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">R:R</span>
                  <span className="text-white font-medium">
                    1:{riskReward(currentItem.trade)}
                  </span>
                </div>
              )}
              {currentItem.trade.strategy && (
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Strategie</span>
                  <span className="text-white font-medium">{currentItem.trade.strategy}</span>
                </div>
              )}
              {currentItem.trade.emotion && (
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Emotion</span>
                  <span className="text-white font-medium">{currentItem.trade.emotion}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t border-white/10 mb-4" />

            {/* Notes */}
            <label className="text-sm font-medium text-[--text-secondary] mb-2 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={notes[currentItem.screenshotId] ?? ""}
              onChange={(e) => handleNoteChange(currentItem.screenshotId, e.target.value)}
              placeholder="Ajoutez vos observations sur ce setup..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[--accent]/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Mobile info (shown below image on small screens) */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{currentItem.trade.asset}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    currentItem.trade.direction?.toLowerCase() === "long" ||
                    currentItem.trade.direction?.toLowerCase() === "buy"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {currentItem.trade.direction}
                </span>
              </div>
              <span
                className={`font-bold ${
                  currentItem.trade.result > 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {currentItem.trade.result > 0 ? "+" : ""}
                {currentItem.trade.result.toFixed(2)}&euro;
              </span>
            </div>
            <p className="text-xs text-white/50">
              {(lightboxIndex ?? 0) + 1} / {allScreenshots.length} &bull;{" "}
              {formatDate(currentItem.trade.date)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
