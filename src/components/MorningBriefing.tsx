"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Sunrise, Flame, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

const TRADING_QUOTES = [
  "Le marché récompense la patience et la discipline.",
  "Un bon trader sait quand ne pas trader.",
  "Protégez votre capital, les opportunités reviendront.",
  "Le plan de trading est votre meilleur allié.",
  "Chaque trade est une leçon, gagnant ou perdant.",
  "La régularité bat l'intensité sur le long terme.",
  "Gérez le risque d'abord, le profit suivra.",
  "Votre journal est le miroir de votre progression.",
  "La discipline transforme un bon setup en profit.",
  "Tradez ce que vous voyez, pas ce que vous espérez.",
];

function getDailyQuote(): string {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return TRADING_QUOTES[seed % TRADING_QUOTES.length];
}

function getDismissKey(): string {
  const now = new Date();
  return `briefing-dismissed-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

interface MorningBriefingProps {
  trades: Trade[];
  userName: string | null;
}

export function MorningBriefing({ trades, userName }: MorningBriefingProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const key = getDismissKey();
    const wasDismissed = localStorage.getItem(key) === "1";
    setDismissed(wasDismissed);
  }, []);

  const isBeforeNoon = useMemo(() => {
    return new Date().getHours() < 12;
  }, []);

  const yesterdayPnL = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const yTrades = trades.filter(
      (t) => new Date(t.date).toISOString().slice(0, 10) === yStr
    );
    return yTrades.reduce((s, t) => s + t.result, 0);
  }, [trades]);

  const streak = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (sorted.length === 0) return { count: 0, type: "none" as const };
    const firstResult = sorted[0].result;
    if (firstResult === 0) return { count: 0, type: "none" as const };
    const type = firstResult > 0 ? ("win" as const) : ("loss" as const);
    let count = 0;
    for (const tr of sorted) {
      if ((type === "win" && tr.result > 0) || (type === "loss" && tr.result < 0)) {
        count++;
      } else break;
    }
    return { count, type };
  }, [trades]);

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(), "1");
    setDismissed(true);
  };

  if (!mounted || dismissed || !isBeforeNoon) return null;

  const displayName = userName || "Trader";
  const quote = getDailyQuote();

  return (
    <div
      className="rounded-2xl p-5 mb-6 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500"
      style={{
        background:
          "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 40%, rgba(99,102,241,0.06) 100%)",
        border: "1px solid rgba(251,191,36,0.2)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Sunrise accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b, #818cf8)",
        }}
      />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: "var(--text-muted)" }}
        title="Masquer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Greeting */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(251,191,36,0.2)" }}
        >
          <Sunrise className="w-4 h-4" style={{ color: "#fbbf24" }} />
        </div>
        <span className="text-base font-bold" style={{ color: "#fbbf24" }}>
          Bonjour {displayName} 👋
        </span>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-3">
        {/* Yesterday P&L */}
        <div className="flex items-center gap-1.5">
          {yesterdayPnL >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span style={{ color: "var(--text-secondary)" }}>
            Hier :{" "}
            <span
              className="font-bold mono"
              style={{ color: yesterdayPnL >= 0 ? "#10b981" : "#ef4444" }}
            >
              {yesterdayPnL >= 0 ? "+" : ""}
              {yesterdayPnL.toFixed(2)}
            </span>
          </span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <Flame
            className="w-3.5 h-3.5"
            style={{
              color:
                streak.type === "win"
                  ? "#10b981"
                  : streak.type === "loss"
                  ? "#ef4444"
                  : "var(--text-muted)",
            }}
          />
          <span style={{ color: "var(--text-secondary)" }}>
            Série :{" "}
            <span
              className="font-bold"
              style={{
                color:
                  streak.type === "win"
                    ? "#10b981"
                    : streak.type === "loss"
                    ? "#ef4444"
                    : "var(--text-muted)",
              }}
            >
              {streak.count > 0
                ? `${streak.count} ${streak.type === "win" ? "victoire" : "défaite"}${streak.count > 1 ? "s" : ""}`
                : "Aucune"}
            </span>
          </span>
        </div>

        {/* Eco calendar hint */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
          <span style={{ color: "var(--text-secondary)" }}>
            Consultez le calendrier éco
          </span>
        </div>
      </div>

      {/* Quote */}
      <p
        className="text-xs italic"
        style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
      >
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
