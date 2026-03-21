"use client";

import { useMemo } from "react";
import type { Trade } from "@/hooks/useTrades";

export default function CalendarMiniWidget({ trades }: { trades: Trade[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayResults = useMemo(() => {
    const map: Record<number, number> = {};
    trades.forEach((tr) => {
      const d = new Date(tr.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + tr.result;
      }
    });
    return map;
  }, [trades, year, month]);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const cells: React.ReactNode[] = [];

  dayLabels.forEach((label, i) => {
    cells.push(
      <div
        key={`h-${i}`}
        style={{
          textAlign: "center",
          fontSize: 10,
          color: "var(--text-muted)",
          fontWeight: 500,
          padding: 2,
        }}
      >
        {label}
      </div>
    );
  });

  const offset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`e-${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const res = dayResults[d];
    let bg = "transparent";
    let textColor = "var(--text-muted)";
    if (res !== undefined) {
      if (res > 0) {
        bg = "rgba(16,185,129,0.2)";
        textColor = "#10b981";
      } else if (res < 0) {
        bg = "rgba(244,63,94,0.2)";
        textColor = "#f43f5e";
      } else {
        bg = "rgba(100,100,100,0.15)";
        textColor = "var(--text-secondary)";
      }
    }
    const isCurrentDay = d === now.getDate();
    cells.push(
      <div
        key={`d-${d}`}
        style={{
          textAlign: "center",
          fontSize: 11,
          padding: 3,
          borderRadius: 4,
          backgroundColor: bg,
          color: textColor,
          fontWeight: isCurrentDay ? 700 : 400,
          border: isCurrentDay
            ? "1px solid #06b6d4"
            : "1px solid transparent",
        }}
      >
        {d}
      </div>
    );
  }

  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 8,
          textTransform: "capitalize",
        }}
      >
        {monthLabel}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
