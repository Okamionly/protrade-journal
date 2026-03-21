"use client";

import { useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import type { Trade } from "@/hooks/useTrades";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatCurrency(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export default function PnlTodayWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const todayTrades = useMemo(() => trades.filter((tr) => isToday(tr.date)), [trades]);
  const todayPnl = useMemo(() => todayTrades.reduce((s, tr) => s + tr.result, 0), [todayTrades]);
  const color = todayPnl >= 0 ? "#10b981" : "#f43f5e";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "16px 0",
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}
      >
        {formatCurrency(todayPnl)}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
        {todayTrades.length} {t("today").toLowerCase()} trade{todayTrades.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
