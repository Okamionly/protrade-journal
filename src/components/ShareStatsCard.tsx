"use client";

import { useRef, useState } from "react";
import { X, Download, TrendingUp } from "lucide-react";
import html2canvas from "html2canvas";

interface ShareStatsCardProps {
  open: boolean;
  onClose: () => void;
  stats: {
    period: "week" | "month";
    winRate: number;
    pnl: number;
    tradesCount: number;
    bestTrade: number;
    streak: number;
    streakType: "win" | "loss" | "none";
  };
}

export function ShareStatsCard({ open, onClose, stats }: ShareStatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">(stats.period);

  if (!open) return null;

  const periodLabel = period === "week" ? "Cette semaine" : "Ce mois";

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `marketphase-stats-${period}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // silent fail
    }
    setDownloading(false);
  };

  // Circular progress bar SVG params
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (stats.winRate / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal wrapper */}
      <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* The card (9:16 ratio, displayed at manageable size) */}
        <div
          ref={cardRef}
          style={{
            width: 360,
            height: 640,
            background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4c1d95 100%)",
            borderRadius: 24,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background circles */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(139, 92, 246, 0.15)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(59, 130, 246, 0.12)",
              filter: "blur(40px)",
            }}
          />

          {/* Top section: Logo + Period */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp style={{ width: 20, height: 20, color: "white" }} />
              </div>
              <span style={{ color: "white", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
                MarketPhase
              </span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600 }}>
                {periodLabel}
              </span>
            </div>
          </div>

          {/* Center: Win Rate circle */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
              <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
                {/* Background circle */}
                <circle
                  cx={70}
                  cy={70}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={10}
                />
                {/* Progress circle */}
                <circle
                  cx={70}
                  cy={70}
                  r={radius}
                  fill="none"
                  stroke={stats.winRate >= 50 ? "#34d399" : "#fbbf24"}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  {stats.winRate.toFixed(0)}%
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Win Rate
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                width: "100%",
              }}
            >
              {/* P&L */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  P&L Total
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stats.pnl >= 0 ? "#34d399" : "#f87171",
                    fontFamily: "monospace",
                  }}
                >
                  {stats.pnl >= 0 ? "+" : ""}{stats.pnl.toFixed(2)}
                </div>
              </div>

              {/* Trades */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Trades
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "monospace" }}>
                  {stats.tradesCount}
                </div>
              </div>

              {/* Best Trade */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Meilleur trade
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stats.bestTrade > 0 ? "#34d399" : "rgba(255,255,255,0.4)",
                    fontFamily: "monospace",
                  }}
                >
                  {stats.bestTrade > 0 ? `+${stats.bestTrade.toFixed(0)}` : "---"}
                </div>
              </div>

              {/* Streak */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Serie en cours
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stats.streakType === "win" ? "#34d399" : stats.streakType === "loss" ? "#f87171" : "rgba(255,255,255,0.4)",
                    fontFamily: "monospace",
                  }}
                >
                  {stats.streak > 0
                    ? `${stats.streak} ${stats.streakType === "win" ? "W" : "L"}`
                    : "---"}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Watermark */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}>
                marketphase.vercel.app
              </span>
            </div>
          </div>
        </div>

        {/* Actions below card */}
        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                period === "week"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                period === "month"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              Mois
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Export..." : "Telecharger"}
          </button>
        </div>
      </div>
    </div>
  );
}
