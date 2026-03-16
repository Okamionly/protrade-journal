"use client";

import { useState, useEffect, useCallback } from "react";

export interface Strategy {
  id: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
  _count?: { trades: number };
}

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch("/api/strategies");
      if (res.ok) {
        setStrategies(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const addStrategy = async (data: { name: string; color: string; description?: string }) => {
    const res = await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setStrategies((prev) => [{ ...created, _count: { trades: 0 } }, ...prev]);
      return created;
    }
    const err = await res.json();
    throw new Error(err.error || "Erreur");
  };

  const updateStrategy = async (id: string, data: Partial<{ name: string; color: string; description: string }>) => {
    const res = await fetch(`/api/strategies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      return true;
    }
    return false;
  };

  const deleteStrategy = async (id: string) => {
    const previous = strategies;
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    const res = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setStrategies(previous);
      return false;
    }
    return true;
  };

  return { strategies, loading, fetchStrategies, addStrategy, updateStrategy, deleteStrategy };
}
