"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Trophy,
  TrendingUp,
  Heart,
  Award,
} from "lucide-react";
import html2canvas from "html2canvas";
import type { Trade } from "@/hooks/useTrades";

/* ── Gradient palette for each slide ───────────────────── */
const SLIDE_GRADIENTS = [
  "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
  "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)",
  "linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #ea580c 100%)",
  "linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #8b5cf6 100%)",
  "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%)",
];

interface TradingWrappedProps {
  open: boolean;
  onClose: () => void;
  trades: Trade[];
}

/* ── Helper: get month trades ──────────────────────────── */
function getMonthTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  return trades.filter((t) => {
    const d = new Date(t.date);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });
}

export function TradingWrapped({ open, onClose, trades }: TradingWrappedProps) {
  const [slide, setSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const monthTrades = useMemo(() => getMonthTrades(trades), [trades]);

  /* ── Slide 1: Month in numbers ───────────────────────── */
  const totalTrades = monthTrades.length;
  const totalPnL = useMemo(
    () => monthTrades.reduce((s, t) => s + t.result, 0),
    [monthTrades]
  );
  const wins = useMemo(
    () => monthTrades.filter((t) => t.result > 0).length,
    [monthTrades]
  );
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  /* ── Slide 2: Best day ───────────────────────────────── */
  const bestDay = useMemo(() => {
    const dayMap: Record<string, number> = {};
    monthTrades.forEach((t) => {
      const dStr = new Date(t.date).toISOString().slice(0, 10);
      dayMap[dStr] = (dayMap[dStr] || 0) + t.result;
    });
    let best = { date: "", pnl: -Infinity };
    Object.entries(dayMap).forEach(([date, pnl]) => {
      if (pnl > best.pnl) best = { date, pnl };
    });
    return best.date ? best : null;
  }, [monthTrades]);

  /* ── Slide 3: Favorite asset ─────────────────────────── */
  const favAsset = useMemo((): { asset: string; count: number; pnl: number; wr: number } | null => {
    const assetMap: Record<string, { count: number; pnl: number; wins: number }> = {};
    monthTrades.forEach((t) => {
      if (!assetMap[t.asset])
        assetMap[t.asset] = { count: 0, pnl: 0, wins: 0 };
      assetMap[t.asset].count++;
      assetMap[t.asset].pnl += t.result;
      if (t.result > 0) assetMap[t.asset].wins++;
    });
    let best: { asset: string; count: number; pnl: number; wr: number } | null = null;
    Object.entries(assetMap).forEach(([asset, data]) => {
      if (!best || data.count > best.count) {
        best = {
          asset,
          count: data.count,
          pnl: data.pnl,
          wr: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        };
      }
    });
    return best;
  }, [monthTrades]);

  /* ── Slide 4: Dominant emotion ───────────────────────── */
  const dominantEmotion = useMemo((): { emotion: string; count: number } | null => {
    const emotionMap: Record<string, number> = {};
    monthTrades.forEach((t) => {
      if (t.emotion) {
        emotionMap[t.emotion] = (emotionMap[t.emotion] || 0) + 1;
      }
    });
    let best: { emotion: string; count: number } | null = null;
    Object.entries(emotionMap).forEach(([emotion, count]) => {
      if (!best || count > best.count) best = { emotion, count };
    });
    return best;
  }, [monthTrades]);

  /* ── Slide 5: Performance score ──────────────────────── */
  const score = useMemo(() => {
    if (totalTrades === 0) return { value: 0, grade: "N/A" };
    let pts = 0;
    // Win rate component (0-40)
    pts += Math.min(winRate, 100) * 0.4;
    // Consistency: trades count bonus (0-20)
    pts += Math.min(totalTrades / 40, 1) * 20;
    // Profitability (0-30)
    if (totalPnL > 0) pts += Math.min(totalPnL / 500, 1) * 30;
    // Streak bonus (0-10)
    const sorted = [...monthTrades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    for (const tr of sorted) {
      if (tr.result > 0) streak++;
      else break;
    }
    pts += Math.min(streak / 5, 1) * 10;

    const value = Math.round(Math.min(pts, 100));
    const grade =
      value >= 90
        ? "S"
        : value >= 80
        ? "A"
        : value >= 65
        ? "B"
        : value >= 50
        ? "C"
        : value >= 30
        ? "D"
        : "F";
    return { value, grade };
  }, [totalTrades, winRate, totalPnL, monthTrades]);

  const TOTAL_SLIDES = 5;

  const handlePrev = () => setSlide((s) => Math.max(0, s - 1));
  const handleNext = () => setSlide((s) => Math.min(TOTAL_SLIDES - 1, s + 1));

  const handleExport = useCallback(async () => {
    if (!slideRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `marketphase-recap-slide-${slide + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // silent fail
    } finally {
      setExporting(false);
    }
  }, [slide]);

  if (!open) return null;

  const now = new Date();
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const formatPnl = (v: number) =>
    `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const slideIcons = [BarChart3, Trophy, TrendingUp, Heart, Award];
  const SlideIcon = slideIcons[slide];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md mx-4"
        style={{ maxHeight: "90vh" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 rounded-full hover:bg-white/10 transition z-10"
          style={{ color: "#fff" }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Slide card */}
        <div
          ref={slideRef}
          className="rounded-3xl overflow-hidden transition-all duration-500"
          style={{
            background: SLIDE_GRADIENTS[slide],
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 32px",
            position: "relative",
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: "#fff" }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-5"
            style={{ background: "#fff" }}
          />

          {/* Slide icon */}
          <div className="flex items-center gap-2 mb-6">
            <SlideIcon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Mon Récap &middot; {monthLabel}
            </span>
          </div>

          {/* ── SLIDE 1: Month in numbers ─── */}
          {slide === 0 && (
            <div>
              <h2
                className="text-2xl font-black mb-8"
                style={{ color: "#fff" }}
              >
                Votre mois en chiffres
              </h2>
              <div className="space-y-5">
                <div>
                  <div
                    className="text-sm mb-1"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Total trades
                  </div>
                  <div
                    className="text-4xl font-black mono"
                    style={{ color: "#fff" }}
                  >
                    {totalTrades}
                  </div>
                </div>
                <div>
                  <div
                    className="text-sm mb-1"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    P&L du mois
                  </div>
                  <div
                    className="text-4xl font-black mono"
                    style={{
                      color: totalPnL >= 0 ? "#34d399" : "#f87171",
                    }}
                  >
                    {formatPnl(totalPnL)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-sm mb-1"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Win Rate
                  </div>
                  <div
                    className="text-4xl font-black mono"
                    style={{ color: "#fff" }}
                  >
                    {winRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SLIDE 2: Best day ─────────── */}
          {slide === 1 && (
            <div>
              <h2
                className="text-2xl font-black mb-8"
                style={{ color: "#fff" }}
              >
                Votre meilleur jour
              </h2>
              {bestDay ? (
                <div>
                  <div
                    className="text-sm mb-2"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {formatDate(bestDay.date)}
                  </div>
                  <div
                    className="text-5xl font-black mono mb-4"
                    style={{ color: "#34d399" }}
                  >
                    {formatPnl(bestDay.pnl)}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                  >
                    <Trophy className="w-4 h-4" />
                    Meilleur jour du mois
                  </div>
                </div>
              ) : (
                <p style={{ color: "rgba(255,255,255,0.5)" }}>
                  Aucun trade ce mois-ci
                </p>
              )}
            </div>
          )}

          {/* ── SLIDE 3: Favorite asset ───── */}
          {slide === 2 && (
            <div>
              <h2
                className="text-2xl font-black mb-8"
                style={{ color: "#fff" }}
              >
                Votre actif pr&eacute;f&eacute;r&eacute;
              </h2>
              {favAsset ? (
                <div>
                  <div
                    className="text-5xl font-black mono mb-4"
                    style={{ color: "#fff" }}
                  >
                    {favAsset.asset}
                  </div>
                  <div className="space-y-2">
                    <div
                      className="flex justify-between text-sm"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      <span>Trades</span>
                      <span className="font-bold">{favAsset.count}</span>
                    </div>
                    <div
                      className="flex justify-between text-sm"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      <span>P&L</span>
                      <span
                        className="font-bold mono"
                        style={{
                          color: favAsset.pnl >= 0 ? "#34d399" : "#f87171",
                        }}
                      >
                        {formatPnl(favAsset.pnl)}
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-sm"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      <span>Win Rate</span>
                      <span className="font-bold">
                        {favAsset.wr.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "rgba(255,255,255,0.5)" }}>
                  Aucun trade ce mois-ci
                </p>
              )}
            </div>
          )}

          {/* ── SLIDE 4: Dominant emotion ─── */}
          {slide === 3 && (
            <div>
              <h2
                className="text-2xl font-black mb-8"
                style={{ color: "#fff" }}
              >
                Votre &eacute;motion dominante
              </h2>
              {dominantEmotion ? (
                <div>
                  <div
                    className="text-5xl font-black mb-4"
                    style={{ color: "#fff" }}
                  >
                    {dominantEmotion.emotion}
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Ressentie {dominantEmotion.count} fois ce mois-ci
                  </div>
                </div>
              ) : (
                <div>
                  <p
                    className="text-lg mb-2"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Aucune émotion enregistrée
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Ajoutez vos émotions à vos trades pour débloquer cette stat
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SLIDE 5: Score ────────────── */}
          {slide === 4 && (
            <div className="text-center">
              <h2
                className="text-2xl font-black mb-8"
                style={{ color: "#fff" }}
              >
                Votre score
              </h2>
              <div
                className="relative inline-flex items-center justify-center mb-6"
                style={{ width: 160, height: 160 }}
              >
                {/* Background circle */}
                <svg
                  width="160"
                  height="160"
                  viewBox="0 0 160 160"
                  className="absolute"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={
                      score.value >= 80
                        ? "#34d399"
                        : score.value >= 50
                        ? "#fbbf24"
                        : "#f87171"
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(score.value / 100) * 440} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <div className="text-center z-10">
                  <div
                    className="text-5xl font-black"
                    style={{ color: "#fff" }}
                  >
                    {score.grade}
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {score.value}/100
                  </div>
                </div>
              </div>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {score.value >= 80
                  ? "Performance exceptionnelle !"
                  : score.value >= 50
                  ? "Bonne performance, continuez !"
                  : totalTrades === 0
                  ? "Ajoutez des trades pour voir votre score"
                  : "Restez discipliné, le progrès viendra"}
              </p>
            </div>
          )}

          {/* Watermark */}
          <div
            className="absolute bottom-4 right-6 text-[10px] font-bold tracking-wider uppercase"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            MarketPhase
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 px-2">
          <button
            onClick={handlePrev}
            disabled={slide === 0}
            className="p-2 rounded-full transition disabled:opacity-30"
            style={{ color: "#fff", background: "rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === slide ? 20 : 8,
                  height: 8,
                  background:
                    i === slide ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={slide === TOTAL_SLIDES - 1}
            className="p-2 rounded-full transition disabled:opacity-30"
            style={{ color: "#fff", background: "rgba(255,255,255,0.1)" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition hover:opacity-90"
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Download className="w-4 h-4" />
          {exporting ? "Export en cours..." : "Partager cette slide"}
        </button>
      </div>
    </div>
  );
}
