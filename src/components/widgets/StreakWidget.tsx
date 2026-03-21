"use client";

import { useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { Flame } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

export default function StreakWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();

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
      } else {
        break;
      }
    }
    return { count, type };
  }, [trades]);

  const color =
    streak.type === "win"
      ? "#10b981"
      : streak.type === "loss"
      ? "#f43f5e"
      : "var(--text-muted)";

  const label =
    streak.type === "win"
      ? t("consecutiveWins")
      : streak.type === "loss"
      ? t("consecutiveLosses")
      : t("noStreak");

  const emoji = streak.type === "win" && streak.count >= 3 ? " \uD83D\uDD25" : streak.type === "loss" && streak.count >= 3 ? " \u2744\uFE0F" : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 4,
        padding: "12px 0",
      }}
    >
      <Flame size={28} color={color} />
      <span
        className="mono"
        style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}
      >
        {streak.count}{emoji}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}
