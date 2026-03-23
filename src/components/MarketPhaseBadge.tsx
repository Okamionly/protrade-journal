"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import {
  detectMarketPhase,
  generateDemoCandles,
  type MarketPhase,
  type PhaseResult,
} from "@/lib/marketPhaseDetector";

// ─── Phase visual config ─────────────────────────────────────────────
const PHASE_CONFIG: Record<
  MarketPhase,
  { label: string; color: string; bg: string; border: string; biasHint: string }
> = {
  accumulation: {
    label: "Accumulation",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.1)",
    border: "rgba(129,140,248,0.3)",
    biasHint: "Biais neutre/haussier recommandé",
  },
  markup: {
    label: "Markup",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
    biasHint: "Biais haussier recommandé",
  },
  distribution: {
    label: "Distribution",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    biasHint: "Prudence, possible retournement",
  },
  markdown: {
    label: "Markdown",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    biasHint: "Biais baissier recommandé",
  },
};

/** Hook to get current detected phase (memoized, uses demo candles) */
export function useMarketPhase(): PhaseResult {
  return useMemo(() => {
    const candles = generateDemoCandles("markup", 80);
    return detectMarketPhase(candles);
  }, []);
}

// ─── 1. Compact Badge (Dashboard header) ─────────────────────────────
export function MarketPhaseBadgeCompact() {
  const phase = useMarketPhase();
  const cfg = PHASE_CONFIG[phase.phase];

  return (
    <Link
      href="/market-phase"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      title={`Phase Marché: ${cfg.label} (${phase.confidence}%)`}
    >
      <Activity className="w-3.5 h-3.5" />
      Phase: {cfg.label}
    </Link>
  );
}

// ─── 2. Card (War Room) ──────────────────────────────────────────────
export function MarketPhaseCard() {
  const phase = useMarketPhase();
  const cfg = PHASE_CONFIG[phase.phase];

  return (
    <div
      className="glass rounded-xl p-4"
      style={{ border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} style={{ color: cfg.color }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Phase Actuelle
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-lg font-bold"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span
          className="text-[10px] mono px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {phase.confidence}%
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {phase.description.split(".")[0]}.
      </p>
      <Link
        href="/market-phase"
        className="text-xs font-medium transition hover:opacity-80"
        style={{ color: cfg.color }}
      >
        Voir les détails →
      </Link>
    </div>
  );
}

// ─── 3. Info Pill (Daily Bias) ───────────────────────────────────────
export function MarketPhasePill() {
  const phase = useMarketPhase();
  const cfg = PHASE_CONFIG[phase.phase];

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Activity size={14} style={{ color: cfg.color }} />
      <span style={{ color: "var(--text-secondary)" }}>
        Phase actuelle:{" "}
        <span className="font-bold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        {" → "}
        <span style={{ color: "var(--text-muted)" }}>{cfg.biasHint}</span>
      </span>
      <Link
        href="/market-phase"
        className="ml-auto font-medium hover:opacity-80 transition"
        style={{ color: cfg.color }}
      >
        Détails
      </Link>
    </div>
  );
}

// ─── 4. AI Coach Section ─────────────────────────────────────────────
interface PhaseCoachProps {
  /** win rates by phase from trade analysis, e.g. { markup: 65, distribution: 42 } */
  phaseWinRates?: Record<string, number>;
}

export function MarketPhaseCoachSection({ phaseWinRates }: PhaseCoachProps) {
  const phase = useMarketPhase();
  const cfg = PHASE_CONFIG[phase.phase];

  const currentWR = phaseWinRates?.[phase.phase];

  return (
    <div
      className="glass rounded-xl p-4"
      style={{ border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} style={{ color: cfg.color }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Contexte de Phase
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
        <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
          Confiance: {phase.confidence}%
        </span>
      </div>

      {currentWR !== undefined && (
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          Votre WR en phase{" "}
          <span className="font-bold" style={{ color: cfg.color }}>{cfg.label}</span>:{" "}
          <span className="font-bold mono">{currentWR.toFixed(0)}%</span>
        </p>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {phase.tradingAdvice.split(".")[0]}.
      </p>

      <Link
        href="/market-phase"
        className="inline-block mt-3 text-xs font-medium transition hover:opacity-80"
        style={{ color: cfg.color }}
      >
        Analyse complète →
      </Link>
    </div>
  );
}
