"use client";

import { useState, useEffect, useCallback } from "react";

export interface Screenshot {
  id: string;
  url: string;
  tradeId: string;
}

export interface Trade {
  id: string;
  date: string;
  asset: string;
  direction: string;
  strategy: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  emotion: string | null;
  setup: string | null;
  commission: number;
  swap: number;
  tags: string | null;
  screenshots: Screenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string | null;
  balance: number;
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const addTrade = async (trade: Record<string, unknown>) => {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (res.ok) {
      const newTrade = await res.json();
      // Optimistic: add to local state immediately
      setTrades((prev) => [newTrade, ...prev]);
      return true;
    }
    return false;
  };

  const deleteTrade = async (id: string) => {
    // Optimistic: remove from local state immediately
    const previous = trades;
    setTrades((prev) => prev.filter((t) => t.id !== id));

    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (res.ok) {
      return true;
    }
    // Rollback on failure
    setTrades(previous);
    return false;
  };

  const bulkDeleteTrades = async (ids: string[]) => {
    // Optimistic: remove from local state immediately
    const previous = trades;
    setTrades((prev) => prev.filter((t) => !ids.includes(t.id)));

    const res = await fetch("/api/trades", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      return true;
    }
    // Rollback on failure
    setTrades(previous);
    return false;
  };

  const updateTrade = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/trades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      // Optimistic: update in local state
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return true;
    }
    return false;
  };

  return { trades, loading, fetchTrades, addTrade, deleteTrade, bulkDeleteTrades, updateTrade };
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/user");
    if (res.ok) setUser(await res.json());
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateBalance = async (balance: number) => {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance }),
    });
    if (res.ok) {
      setUser(await res.json());
      return true;
    }
    return false;
  };

  return { user, fetchUser, updateBalance };
}
