"use client";

import { useState, useEffect, useMemo } from "react";
import type { Trade } from "@/hooks/useTrades";

interface MonthlyGoal {
  targetPnl: number | null;
  targetTrades: number | null;
  targetWinRate: number | null;
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function GoalsProgressWidget({ trades }: { trades: Trade[] }) {
  const [goal, setGoal] = useState<MonthlyGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    fetch(`/api/monthly-goals?month=${month}&year=${year}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setGoal(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const monthTrades = useMemo(
    () => trades.filter((tr) => isThisMonth(tr.date)),
    [trades]
  );

  const monthPnl = useMemo(
    () => monthTrades.reduce((s, tr) => s + tr.result, 0),
    [monthTrades]
  );

  const monthWins = useMemo(
    () => monthTrades.filter((tr) => tr.result > 0).length,
    [monthTrades]
  );

  const monthWinRate = monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!goal || (!goal.targetPnl && !goal.targetTrades && !goal.targetWinRate)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontSize: 12,
          gap: 4,
          padding: "12px 0",
        }}
      >
        <span>No monthly goals set</span>
        <span style={{ fontSize: 10 }}>Set them in your profile</span>
      </div>
    );
  }

  const bars: { label: string; current: number; target: number; unit: string }[] = [];

  if (goal.targetPnl) {
    bars.push({
      label: "P&L",
      current: monthPnl,
      target: goal.targetPnl,
      unit: "$",
    });
  }
  if (goal.targetTrades) {
    bars.push({
      label: "Trades",
      current: monthTrades.length,
      target: goal.targetTrades,
      unit: "",
    });
  }
  if (goal.targetWinRate) {
    bars.push({
      label: "Win Rate",
      current: monthWinRate,
      target: goal.targetWinRate,
      unit: "%",
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "8px 0",
      }}
    >
      {bars.map((bar) => {
        const pct = Math.min(
          Math.max((bar.current / bar.target) * 100, 0),
          100
        );
        const barColor =
          pct >= 100 ? "#10b981" : pct >= 60 ? "#06b6d4" : "#f59e0b";

        return (
          <div key={bar.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {bar.label}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: barColor }}
              >
                {bar.unit === "$"
                  ? `${bar.current >= 0 ? "+" : ""}${bar.current.toFixed(0)}`
                  : bar.unit === "%"
                  ? `${bar.current.toFixed(0)}%`
                  : bar.current}
                {" / "}
                {bar.unit === "$"
                  ? `${bar.target}`
                  : bar.unit === "%"
                  ? `${bar.target}%`
                  : bar.target}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                backgroundColor: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: barColor,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
