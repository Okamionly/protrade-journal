"use client";

import { useState, useEffect, useCallback } from "react";

export interface TradingRule {
  id: string;
  text: string;
  order: number;
}

export function useTradingRules() {
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/trading-rules");
      if (res.ok) setRules(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (text: string) => {
    const res = await fetch("/api/trading-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const created = await res.json();
      setRules((prev) => [...prev, created]);
      return created;
    }
    return null;
  };

  const deleteRule = async (id: string) => {
    const previous = rules;
    setRules((prev) => prev.filter((r) => r.id !== id));
    const res = await fetch(`/api/trading-rules/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRules(previous);
      return false;
    }
    return true;
  };

  return { rules, loading, fetchRules, addRule, deleteRule };
}
