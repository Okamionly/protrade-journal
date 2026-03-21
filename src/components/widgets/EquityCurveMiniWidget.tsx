"use client";

import { useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import type { Trade } from "@/hooks/useTrades";

function formatCurrency(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export default function EquityCurveMiniWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const sorted = useMemo(
    () =>
      [...trades].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [trades]
  );

  const cumulative = useMemo(() => {
    let sum = 0;
    return sorted.map((tr) => {
      sum += tr.result;
      return sum;
    });
  }, [sorted]);

  if (cumulative.length < 2) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 120,
          color: "var(--text-muted)",
        }}
      >
        {t("notEnoughData")}
      </div>
    );
  }

  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 1;
  const w = 100;
  const h = 60;

  const points = cumulative.map((v, i) => {
    const x = (i / (cumulative.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const lastVal = cumulative[cumulative.length - 1];
  const color = lastVal >= 0 ? "#10b981" : "#f43f5e";

  return (
    <div style={{ padding: "8px 0" }}>
      <svg
        viewBox={`-2 -2 ${w + 4} ${h + 4}`}
        style={{ width: "100%", height: 120 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="eq-grad-mini" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${h} ${points.join(" ")} ${w},${h}`}
          fill="url(#eq-grad-mini)"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span className="mono" style={{ color, fontSize: 14 }}>
          {formatCurrency(lastVal)}
        </span>
      </div>
    </div>
  );
}
