"use client";

import { useState, useMemo, useCallback } from "react";
import { Trade, useTrades } from "@/hooks/useTrades";
import { formatDate } from "@/lib/utils";
import {
  X,
  ChevronRight,
  SkipForward,
  CheckCircle2,
  ClipboardEdit,
} from "lucide-react";

/* ── Emotion pills (same as TradeForm) ─────────────────────────── */

const EMOTION_OPTIONS = [
  { key: "confident",  emoji: "\u{1F60E}", label: "Confiant",   bgActive: "bg-emerald-500/20", borderActive: "border-emerald-500" },
  { key: "neutral",    emoji: "\u{1F610}", label: "Neutre",     bgActive: "bg-gray-500/20",    borderActive: "border-gray-500" },
  { key: "stressed",   emoji: "\u{1F630}", label: "Stressé",    bgActive: "bg-amber-500/20",   borderActive: "border-amber-500" },
  { key: "frustrated", emoji: "\u{1F624}", label: "Frustré",    bgActive: "bg-rose-500/20",    borderActive: "border-rose-500" },
  { key: "euphoric",   emoji: "\u{1F929}", label: "Euphorique", bgActive: "bg-purple-500/20",  borderActive: "border-purple-500" },
  { key: "fear",       emoji: "\u{1F631}", label: "Peur",       bgActive: "bg-blue-500/20",    borderActive: "border-blue-500" },
  { key: "fomo",       emoji: "\u{1F525}", label: "FOMO",       bgActive: "bg-orange-500/20",  borderActive: "border-orange-500" },
  { key: "boredom",    emoji: "\u{1F4A4}", label: "Ennui",      bgActive: "bg-gray-600/20",    borderActive: "border-gray-600" },
] as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getUnreviewedTrades(trades: Trade[]): Trade[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return trades.filter((t) => {
    const d = new Date(t.date);
    return d >= sevenDaysAgo && !t.setup && !t.emotion;
  });
}

/* ── Component ─────────────────────────────────────────────────── */

interface BatchRecapProps {
  open: boolean;
  onClose: () => void;
}

export function BatchRecap({ open, onClose }: BatchRecapProps) {
  const { trades, updateTrade } = useTrades();

  const unreviewedTrades = useMemo(() => getUnreviewedTrades(trades), [trades]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [setupInput, setSetupInput] = useState("");
  const [annotatedCount, setAnnotatedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const total = unreviewedTrades.length;
  const currentTrade = unreviewedTrades[currentIndex] as Trade | undefined;
  const isFinished = currentIndex >= total;

  const resetFields = useCallback(() => {
    setSelectedEmotion("");
    setSetupInput("");
  }, []);

  const goNext = useCallback(() => {
    resetFields();
    setCurrentIndex((i) => i + 1);
  }, [resetFields]);

  const handleSave = useCallback(async () => {
    if (!currentTrade) return;
    if (!selectedEmotion && !setupInput.trim()) {
      goNext();
      return;
    }
    setSaving(true);
    const data: Record<string, unknown> = {};
    if (selectedEmotion) data.emotion = selectedEmotion;
    if (setupInput.trim()) data.setup = setupInput.trim();

    // Keep existing fields that PUT expects
    data.asset = currentTrade.asset;
    data.direction = currentTrade.direction;
    data.strategy = currentTrade.strategy;
    data.entry = currentTrade.entry;
    data.exit = currentTrade.exit;
    data.sl = currentTrade.sl;
    data.tp = currentTrade.tp;
    data.lots = currentTrade.lots;
    data.result = currentTrade.result;
    data.tags = currentTrade.tags;

    await updateTrade(currentTrade.id, data);
    setAnnotatedCount((c) => c + 1);
    setSaving(false);
    goNext();
  }, [currentTrade, selectedEmotion, setupInput, updateTrade, goNext]);

  const handleClose = useCallback(() => {
    setCurrentIndex(0);
    setAnnotatedCount(0);
    resetFields();
    onClose();
  }, [onClose, resetFields]);

  if (!open) return null;

  const progressPct = total > 0 ? Math.round(((currentIndex) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <ClipboardEdit className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Annoter mes trades
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>{Math.min(currentIndex + 1, total)} / {total}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-secondary)" }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #f59e0b, #f97316)" }}
            />
          </div>
        </div>

        {/* Finished state */}
        {isFinished ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: "#34d399" }} />
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Terminé !
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {annotatedCount} trade{annotatedCount > 1 ? "s" : ""} annoté{annotatedCount > 1 ? "s" : ""}
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#fff",
              }}
            >
              Fermer
            </button>
          </div>
        ) : currentTrade ? (
          <>
            {/* Trade card */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    {currentTrade.asset}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-semibold"
                    style={{
                      background: currentTrade.direction === "LONG" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                      color: currentTrade.direction === "LONG" ? "#34d399" : "#f87171",
                    }}
                  >
                    {currentTrade.direction}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDate(currentTrade.date)}
                </span>
              </div>
              <div
                className="text-xl font-bold"
                style={{
                  color: currentTrade.result >= 0 ? "#34d399" : "#f87171",
                }}
              >
                {currentTrade.result >= 0 ? "+" : ""}
                {currentTrade.result.toFixed(2)} €
              </div>
            </div>

            {/* Emotion selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                Émotion ressentie
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map((opt) => {
                  const isActive = selectedEmotion === opt.label;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setSelectedEmotion(isActive ? "" : opt.label)
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isActive
                          ? `${opt.bgActive} ${opt.borderActive}`
                          : "border-transparent hover:bg-white/5"
                      }`}
                      style={{
                        borderColor: isActive ? undefined : "transparent",
                      }}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Setup / notes */}
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                Setup / Notes
              </label>
              <input
                type="text"
                value={setupInput}
                onChange={(e) => setSetupInput(e.target.value)}
                placeholder="ex: Break de structure H1, FVG..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition hover:bg-white/5"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <SkipForward className="w-4 h-4" />
                Passer
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#fff",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "..." : "Suivant"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── Hook for dashboard: count of unreviewed trades ────────────── */

export function useUnreviewedCount(trades: Trade[]): number {
  return useMemo(() => getUnreviewedTrades(trades).length, [trades]);
}
