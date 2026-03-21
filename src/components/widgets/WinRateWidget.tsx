"use client";

import type { Trade } from "@/hooks/useTrades";

export default function WinRateWidget({ trades }: { trades: Trade[] }) {
  const wins = trades.filter((tr) => tr.result > 0).length;
  const total = trades.length;
  const rate = total > 0 ? (wins / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 50 ? "#10b981" : "#f43f5e";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 0",
      }}
    >
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary)"
          fontSize="18"
          fontWeight="700"
          fontFamily="monospace"
        >
          {rate.toFixed(0)}%
        </text>
      </svg>
      <span
        style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}
      >
        {wins}W / {total - wins}L on {total}
      </span>
    </div>
  );
}
