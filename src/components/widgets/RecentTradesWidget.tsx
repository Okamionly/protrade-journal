"use client";

import { useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import type { Trade } from "@/hooks/useTrades";

function formatCurrency(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export default function RecentTradesWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [trades]
  );

  if (recent.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
        {t("noTradesFound")}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("date")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("asset")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("dir")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500, textAlign: "right" }}>
              {t("result")}
            </th>
          </tr>
        </thead>
        <tbody>
          {recent.map((tr) => (
            <tr key={tr.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>
                {new Date(tr.date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {tr.asset}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  color: tr.direction?.toUpperCase() === "LONG" ? "#10b981" : "#f43f5e",
                  textTransform: "uppercase",
                  fontSize: 11,
                }}
              >
                {tr.direction}
              </td>
              <td
                className="mono"
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  color: tr.result >= 0 ? "#10b981" : "#f43f5e",
                  fontWeight: 600,
                }}
              >
                {formatCurrency(tr.result)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
