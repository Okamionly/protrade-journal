"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface DailyPlan {
  bias: string | null;
  notes: string | null;
  pairs: string | null;
}

export default function DailyBiasWidget() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/daily-plan?date=${today}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPlan(data);
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

  const filled = plan && (plan.bias || plan.notes || plan.pairs);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 8,
        padding: "12px 0",
      }}
    >
      {filled ? (
        <>
          <CheckCircle size={28} color="#10b981" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#10b981",
            }}
          >
            Bias filled
          </span>
          {plan?.bias && (
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color:
                  plan.bias.toLowerCase() === "bullish"
                    ? "#10b981"
                    : plan.bias.toLowerCase() === "bearish"
                    ? "#f43f5e"
                    : "#eab308",
                textTransform: "uppercase",
              }}
            >
              {plan.bias}
            </span>
          )}
          {plan?.pairs && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {plan.pairs}
            </span>
          )}
        </>
      ) : (
        <>
          <AlertCircle size={28} color="#f59e0b" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#f59e0b",
            }}
          >
            No bias today
          </span>
        </>
      )}

      <Link
        href="/daily-bias"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "#06b6d4",
          textDecoration: "none",
          marginTop: 4,
        }}
      >
        <ExternalLink size={10} />
        {filled ? "View plan" : "Fill your bias"}
      </Link>
    </div>
  );
}
