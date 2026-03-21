"use client";

import { useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import type { Trade } from "@/hooks/useTrades";

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function formatCurrency(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export default function QuickStatsWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const weekTrades = trades.filter((tr) => isThisWeek(tr.date));
    const weekCount = weekTrades.length;
    const weekPnl = weekTrades.reduce((s, tr) => s + tr.result, 0);
    const avgPnl = trades.length > 0 ? trades.reduce((s, tr) => s + tr.result, 0) / trades.length : 0;

    // Best asset by total P&L
    const assetMap: Record<string, number> = {};
    trades.forEach((tr) => {
      assetMap[tr.asset] = (assetMap[tr.asset] || 0) + tr.result;
    });
    let bestAsset = "-";
    let bestTotal = -Infinity;
    Object.entries(assetMap).forEach(([asset, total]) => {
      if (total > bestTotal) {
        bestTotal = total;
        bestAsset = asset;
      }
    });

    return { weekCount, weekPnl, avgPnl, bestAsset };
  }, [trades]);

  const items = [
    {
      label: t("thisWeek"),
      value: String(stats.weekCount),
      sub: formatCurrency(stats.weekPnl),
      color: stats.weekPnl >= 0 ? "#10b981" : "#f43f5e",
    },
    {
      label: "Avg P&L",
      value: formatCurrency(stats.avgPnl),
      sub: `${trades.length} trades`,
      color: stats.avgPnl >= 0 ? "#10b981" : "#f43f5e",
    },
    {
      label: "Best",
      value: stats.bestAsset,
      sub: "",
      color: "#06b6d4",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: "100%",
        padding: "12px 0",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: item.color,
              lineHeight: 1,
            }}
          >
            {item.value}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            {item.label}
          </span>
          {item.sub && (
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--text-muted)" }}
            >
              {item.sub}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
