"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";

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
  maePrice: number | null;
  mfePrice: number | null;
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

interface TradesContextValue {
  trades: Trade[];
  loading: boolean;
  fetchTrades: () => Promise<void>;
  addTrade: (trade: Record<string, unknown>) => Promise<boolean>;
  deleteTrade: (id: string) => Promise<boolean>;
  bulkDeleteTrades: (ids: string[]) => Promise<boolean>;
  updateTrade: (id: string, data: Record<string, unknown>) => Promise<boolean>;
}

const TradesContext = createContext<TradesContextValue | null>(null);

const STALE_TIME = 30_000;

export function TradesProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedAt = useRef(0);

  const fetchTrades = useCallback(async () => {
    if (
      Date.now() - lastFetchedAt.current < STALE_TIME &&
      lastFetchedAt.current > 0
    ) {
      return;
    }
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
        lastFetchedAt.current = Date.now();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const addTrade = useCallback(
    async (trade: Record<string, unknown>) => {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (res.ok) {
        const newTrade = await res.json();
        setTrades((prev) => [newTrade, ...prev]);
        lastFetchedAt.current = Date.now();
        return true;
      }
      return false;
    },
    [],
  );

  const tradesRef = useRef<Trade[]>(trades);
  tradesRef.current = trades;

  const deleteTrade = useCallback(
    async (id: string) => {
      const previous = tradesRef.current;
      setTrades((prev) => prev.filter((t) => t.id !== id));

      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      if (res.ok) {
        lastFetchedAt.current = Date.now();
        return true;
      }
      // Rollback on failure
      setTrades(previous);
      return false;
    },
    [],
  );

  const bulkDeleteTrades = useCallback(
    async (ids: string[]) => {
      const previous = tradesRef.current;
      setTrades((prev) => prev.filter((t) => !ids.includes(t.id)));

      const res = await fetch("/api/trades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        lastFetchedAt.current = Date.now();
        return true;
      }
      // Rollback on failure
      setTrades(previous);
      return false;
    },
    [],
  );

  const updateTrade = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/trades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
        lastFetchedAt.current = Date.now();
        return true;
      }
      return false;
    },
    [],
  );

  return (
    <TradesContext.Provider
      value={{
        trades,
        loading,
        fetchTrades,
        addTrade,
        deleteTrade,
        bulkDeleteTrades,
        updateTrade,
      }}
    >
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) {
    throw new Error("useTrades must be used within TradesProvider");
  }
  return ctx;
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
