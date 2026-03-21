"use client";

import { useState, useEffect } from "react";

interface FNGData {
  value: string;
  value_classification: string;
}

function getColor(value: number): string {
  if (value <= 24) return "#f43f5e";
  if (value <= 44) return "#f97316";
  if (value <= 55) return "#eab308";
  if (value <= 74) return "#84cc16";
  return "#10b981";
}

export default function FearGreedWidget() {
  const [data, setData] = useState<FNGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fear-greed?days=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.[0]) {
          setData(json.data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  if (!data) {
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
        Unavailable
      </div>
    );
  }

  const value = parseInt(data.value);
  const color = getColor(value);

  // Semi-circle gauge
  const radius = 42;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "8px 0",
        gap: 4,
      }}
    >
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="22"
          fontWeight="800"
          fontFamily="monospace"
        >
          {value}
        </text>
      </svg>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {data.value_classification}
      </span>
    </div>
  );
}
