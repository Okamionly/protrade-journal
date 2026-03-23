"use client";

import { SharedTrade } from "@/hooks/useChat";
import { ArrowUpRight, ArrowDownRight, Copy, Clock, CheckCircle2, ImageDown, Loader2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { calculateRR } from "@/lib/utils";

/* ─── Emotion icons mapping ───────────────────────────────── */
const EMOTION_ICONS: Record<string, string> = {
  confident: "😎",
  Confiant: "😎",
  fear: "😰",
  Peur: "😰",
  greedy: "🤑",
  Cupide: "🤑",
  impatient: "⏳",
  Impatient: "⏳",
  neutralEmotion: "😐",
  Neutre: "😐",
  stressed: "😤",
  Stressé: "😤",
  frustrated: "😠",
  Frustré: "😠",
  euphoric: "🤩",
  Euphorique: "🤩",
};

/* ─── Mini Sparkline SVG ──────────────────────────────────── */
function MiniSparkline({ pnl, isWin }: { pnl: number; isWin: boolean }) {
  // Generate a mini equity curve simulation based on P&L
  const points = 12;
  const height = 28;
  const width = 80;
  const finalVal = pnl;

  // Create a realistic-looking equity path
  const values: number[] = [];
  const seed = Math.abs(pnl * 137.3) % 1000;
  let current = 0;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = Math.sin(seed + i * 2.7) * Math.abs(finalVal) * 0.3;
    current = finalVal * progress + noise * (1 - progress * 0.5);
    values.push(current);
  }
  values[values.length - 1] = finalVal;

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const pathPoints = values.map((v, i) => {
    const x = (i / (points - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const color = isWin ? "#10b981" : "#ef4444";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={`spark-${isWin ? "g" : "r"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`M0,${height} L${pathPoints.join(" L")} L${width},${height} Z`}
        fill={`url(#spark-${isWin ? "g" : "r"})`}
      />
      {/* Line */}
      <polyline
        points={pathPoints.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={parseFloat(pathPoints[pathPoints.length - 1].split(",")[1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}

/* ─── Format duration helper ──────────────────────────────── */
function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes && minutes !== 0) return null;
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return h > 0 ? `${d}j ${h}h` : `${d}j`;
}

/* ─── Trade Card Props ────────────────────────────────────── */
export interface TradeCardProps {
  trade: SharedTrade;
  variant?: "compact" | "full";
  showActions?: boolean;
}

/* ─── Compact variant (for chat messages) ─────────────────── */
function CompactTradeCard({ trade }: { trade: SharedTrade }) {
  const isWin = trade.result > 0;
  const isBuy = trade.direction?.toUpperCase() === "BUY" || trade.direction?.toUpperCase() === "LONG";

  return (
    <div
      className="rounded-xl p-2.5 mt-2 max-w-xs overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        border: `1px solid ${isWin ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {trade.asset}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{
              background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
              color: isBuy ? "#10b981" : "#ef4444",
            }}
          >
            {isBuy ? "LONG" : "SHORT"}
          </span>
        </div>
        <span
          className="mono font-bold text-sm"
          style={{ color: isWin ? "#10b981" : "#ef4444" }}
        >
          {isWin ? "+" : ""}{trade.result.toFixed(2)}€
        </span>
      </div>
    </div>
  );
}

/* ─── Full variant (for community feed) ───────────────────── */
function FullTradeCard({ trade, showActions }: { trade: SharedTrade; showActions: boolean }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const isWin = trade.result > 0;
  const isBuy = trade.direction?.toUpperCase() === "BUY" || trade.direction?.toUpperCase() === "LONG";
  const pnl = trade.result;

  let rr: string | null = trade.sl && trade.tp ? calculateRR(trade.entry, trade.sl, trade.tp) : null;
  if (!rr && trade.exit && trade.sl && trade.sl !== trade.entry) {
    const risk = Math.abs(trade.entry - trade.sl);
    const reward = Math.abs((trade.exit) - trade.entry);
    rr = (reward / risk).toFixed(1);
  }

  const emotionIcon = trade.emotion ? EMOTION_ICONS[trade.emotion] || null : null;
  const durationStr = formatDuration(trade.duration);

  const priceDiff = trade.exit != null ? trade.exit - trade.entry : null;

  const handleCopy = () => {
    const lines = [
      `${trade.asset} ${isBuy ? "LONG" : "SHORT"}`,
      `Entrée: ${trade.entry}`,
      trade.exit != null ? `Sortie: ${trade.exit}` : null,
      trade.sl ? `SL: ${trade.sl}` : null,
      trade.tp ? `TP: ${trade.tp}` : null,
      `Lots: ${trade.lots}`,
      `R:R: ${rr || "—"}`,
      `P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}€`,
      trade.strategy ? `Stratégie: ${trade.strategy}` : null,
      durationStr ? `Durée: ${durationStr}` : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = useCallback(async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;

      // Create a wrapper with premium styling for the export
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: 480px; padding: 32px;
        background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      // Clone the card
      const clone = exportRef.current.cloneNode(true) as HTMLElement;
      clone.style.margin = "0";

      // Add branding header
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 16px; padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      `;
      header.innerHTML = `
        <span style="font-size: 18px; font-weight: 800; background: linear-gradient(135deg, #06b6d4, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">MarketPhase</span>
        <span style="font-size: 10px; color: #64748b; letter-spacing: 0.05em;">TRADE CARD</span>
      `;

      // Add branding footer
      const footer = document.createElement("div");
      footer.style.cssText = `
        margin-top: 16px; padding-top: 12px; text-align: center;
        border-top: 1px solid rgba(255,255,255,0.06);
      `;
      footer.innerHTML = `
        <span style="font-size: 9px; color: #475569; letter-spacing: 0.1em;">MARKETPHASE.APP — JOURNAL DE TRADING PROFESSIONNEL</span>
      `;

      wrapper.appendChild(header);
      wrapper.appendChild(clone);
      wrapper.appendChild(footer);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: "#0f172a",
        useCORS: true,
        logging: false,
        width: 480,
      });

      document.body.removeChild(wrapper);

      // Download
      const link = document.createElement("a");
      link.download = `MarketPhase_${trade.asset}_${trade.direction}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [trade.asset, trade.direction, exporting]);

  return (
    <div
      ref={exportRef}
      className="mt-3 rounded-xl overflow-hidden relative"
      style={{
        border: `1.5px solid ${isWin ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
        background: isWin
          ? "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)"
          : "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)",
      }}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${isWin ? "#10b981" : "#ef4444"} 1px, transparent 0)`,
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative p-3.5">
        {/* Header: Asset + Direction + Emotion + Sparkline */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>
              {trade.asset}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: isBuy ? "#10b981" : "#ef4444",
                border: `1px solid ${isBuy ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              {isBuy ? "LONG" : "SHORT"}
            </span>
            {emotionIcon && (
              <span className="text-base" title={trade.emotion || ""}>{emotionIcon}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MiniSparkline pnl={pnl} isWin={isWin} />
            {isBuy ? (
              <ArrowUpRight className="w-5 h-5" style={{ color: "#10b981" }} />
            ) : (
              <ArrowDownRight className="w-5 h-5" style={{ color: "#ef4444" }} />
            )}
          </div>
        </div>

        {/* Strategy badge + Duration */}
        <div className="flex items-center gap-2 mb-3">
          {trade.strategy && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(6,182,212,0.12)",
                color: "#06b6d4",
                border: "1px solid rgba(6,182,212,0.25)",
              }}
            >
              {trade.strategy}
            </span>
          )}
          {durationStr && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              <Clock className="w-3 h-3" />
              {durationStr}
            </span>
          )}
        </div>

        {/* Price details grid */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              Entrée
            </p>
            <p className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>
              {trade.entry}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              Sortie
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>
                {trade.exit ?? "—"}
              </p>
              {priceDiff !== null && (
                <span
                  className="text-[9px] font-bold mono"
                  style={{ color: priceDiff >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(trade.entry < 10 ? 4 : 2)}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              P&L
            </p>
            <p
              className="text-sm font-bold mono"
              style={{ color: pnl >= 0 ? "#10b981" : "#ef4444" }}
            >
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}€
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              R:R
            </p>
            <p className="text-sm font-semibold mono" style={{ color: "#06b6d4" }}>
              {rr ? parseFloat(rr).toFixed(1) : "—"}
            </p>
          </div>
        </div>

        {/* Actions: Copy + Export */}
        {showActions && (
          <div className="mt-3 pt-2.5 border-t flex items-center gap-4" style={{ borderColor: isWin ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] font-medium transition-all hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier le setup
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ color: "var(--text-muted)" }}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Export...</span>
                </>
              ) : (
                <>
                  <ImageDown className="w-3.5 h-3.5" />
                  Exporter
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Export ──────────────────────────────────────────── */
export function TradeCard({ trade, variant = "full", showActions = true }: TradeCardProps) {
  if (variant === "compact") {
    return <CompactTradeCard trade={trade} />;
  }
  return <FullTradeCard trade={trade} showActions={showActions} />;
}
