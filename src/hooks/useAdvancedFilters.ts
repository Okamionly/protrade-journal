"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Trade } from "./useTrades";
import { calculateRR } from "@/lib/utils";

export type TradingSession = "Tokyo" | "London" | "New York" | "Sydney";

export interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  assets: string[];
  direction: string;       // "ALL" | "LONG" | "SHORT"
  result: string;          // "ALL" | "WIN" | "LOSS" | "BE"
  strategies: string[];
  emotions: string[];
  tags: string[];
  minPnl: string;
  maxPnl: string;
  minRR: string;
  maxRR: string;
  session: string;         // "ALL" | TradingSession
  search: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilters;
  createdAt: string;
}

const PRESETS_STORAGE_KEY = "protrade-filter-presets";

const DEFAULT_FILTERS: AdvancedFilters = {
  dateFrom: "",
  dateTo: "",
  assets: [],
  direction: "ALL",
  result: "ALL",
  strategies: [],
  emotions: [],
  tags: [],
  minPnl: "",
  maxPnl: "",
  minRR: "",
  maxRR: "",
  session: "ALL",
  search: "",
};

const EMOTION_OPTIONS = [
  "DISCIPLINED",
  "FOMO",
  "REVENGE",
  "FEAR",
  "CONFIDENT",
  "GREEDY",
  "PATIENT",
  "IMPULSIVE",
  "CALM",
  "FRUSTRATED",
];

/**
 * Determine which trading session a trade belongs to based on its UTC entry hour.
 * A trade can belong to multiple sessions (overlap), but we return the primary one.
 */
export function getTradingSession(dateStr: string): TradingSession[] {
  const d = new Date(dateStr);
  const h = d.getUTCHours();
  const sessions: TradingSession[] = [];

  // Tokyo: 00:00-09:00 UTC
  if (h >= 0 && h < 9) sessions.push("Tokyo");
  // London: 07:00-16:00 UTC
  if (h >= 7 && h < 16) sessions.push("London");
  // New York: 13:00-22:00 UTC
  if (h >= 13 && h < 22) sessions.push("New York");
  // Sydney: 22:00-07:00 UTC
  if (h >= 22 || h < 7) sessions.push("Sydney");

  if (sessions.length === 0) sessions.push("Tokyo"); // fallback
  return sessions;
}

export function getPrimarySession(dateStr: string): TradingSession {
  const sessions = getTradingSession(dateStr);
  return sessions[0];
}

function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function useAdvancedFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) setPresets(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const savePreset = useCallback((name: string) => {
    const currentFilters: AdvancedFilters = {
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
      assets: parseArrayParam(searchParams.get("assets")),
      direction: searchParams.get("direction") || "ALL",
      result: searchParams.get("result") || "ALL",
      strategies: parseArrayParam(searchParams.get("strategies")),
      emotions: parseArrayParam(searchParams.get("emotions")),
      tags: parseArrayParam(searchParams.get("tags")),
      minPnl: searchParams.get("minPnl") || "",
      maxPnl: searchParams.get("maxPnl") || "",
      minRR: searchParams.get("minRR") || "",
      maxRR: searchParams.get("maxRR") || "",
      session: searchParams.get("session") || "ALL",
      search: searchParams.get("search") || "",
    };
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };
    const updated = [...presets, preset];
    setPresets(updated);
    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    return preset;
  }, [searchParams, presets]);

  const deletePreset = useCallback((id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, [presets]);

  const loadPreset = useCallback((preset: FilterPreset) => {
    const params = new URLSearchParams();
    const f = preset.filters;
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    if (f.assets.length > 0) params.set("assets", f.assets.join(","));
    if (f.direction !== "ALL") params.set("direction", f.direction);
    if (f.result !== "ALL") params.set("result", f.result);
    if (f.strategies.length > 0) params.set("strategies", f.strategies.join(","));
    if (f.emotions.length > 0) params.set("emotions", f.emotions.join(","));
    if (f.tags.length > 0) params.set("tags", f.tags.join(","));
    if (f.minPnl) params.set("minPnl", f.minPnl);
    if (f.maxPnl) params.set("maxPnl", f.maxPnl);
    if (f.minRR) params.set("minRR", f.minRR);
    if (f.maxRR) params.set("maxRR", f.maxRR);
    if (f.session !== "ALL") params.set("session", f.session);
    if (f.search) params.set("search", f.search);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname]);

  const filters: AdvancedFilters = useMemo(() => ({
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    assets: parseArrayParam(searchParams.get("assets")),
    direction: searchParams.get("direction") || "ALL",
    result: searchParams.get("result") || "ALL",
    strategies: parseArrayParam(searchParams.get("strategies")),
    emotions: parseArrayParam(searchParams.get("emotions")),
    tags: parseArrayParam(searchParams.get("tags")),
    minPnl: searchParams.get("minPnl") || "",
    maxPnl: searchParams.get("maxPnl") || "",
    minRR: searchParams.get("minRR") || "",
    maxRR: searchParams.get("maxRR") || "",
    session: searchParams.get("session") || "ALL",
    search: searchParams.get("search") || "",
  }), [searchParams]);

  const setFilter = useCallback(<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (Array.isArray(value)) {
      if (value.length === 0) params.delete(key);
      else params.set(key, value.join(","));
    } else if (value === "" || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const resetAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.assets.length > 0) count++;
    if (filters.direction !== "ALL") count++;
    if (filters.result !== "ALL") count++;
    if (filters.strategies.length > 0) count++;
    if (filters.emotions.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.minPnl) count++;
    if (filters.maxPnl) count++;
    if (filters.minRR) count++;
    if (filters.maxRR) count++;
    if (filters.session !== "ALL") count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const applyFilters = useCallback((trades: Trade[]): Trade[] => {
    return trades.filter((trade) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          trade.asset.toLowerCase().includes(q) ||
          trade.strategy.toLowerCase().includes(q) ||
          (trade.setup || "").toLowerCase().includes(q) ||
          (trade.tags || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date range
      if (filters.dateFrom) {
        if (new Date(trade.date) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        if (new Date(trade.date) > new Date(filters.dateTo + "T23:59:59")) return false;
      }

      // Assets
      if (filters.assets.length > 0 && !filters.assets.includes(trade.asset)) return false;

      // Direction
      if (filters.direction !== "ALL" && trade.direction !== filters.direction) return false;

      // Result
      if (filters.result !== "ALL") {
        if (filters.result === "WIN" && trade.result <= 0) return false;
        if (filters.result === "LOSS" && trade.result >= 0) return false;
        if (filters.result === "BE" && trade.result !== 0) return false;
      }

      // Strategies
      if (filters.strategies.length > 0 && !filters.strategies.includes(trade.strategy)) return false;

      // Emotions
      if (filters.emotions.length > 0) {
        if (!trade.emotion || !filters.emotions.includes(trade.emotion)) return false;
      }

      // Tags
      if (filters.tags.length > 0) {
        const tradeTags = (trade.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        if (!filters.tags.some((tag) => tradeTags.includes(tag))) return false;
      }

      // Min/Max P&L
      if (filters.minPnl && trade.result < parseFloat(filters.minPnl)) return false;
      if (filters.maxPnl && trade.result > parseFloat(filters.maxPnl)) return false;

      // Min/Max RR
      if (filters.minRR || filters.maxRR) {
        const rrStr = calculateRR(trade.entry, trade.sl, trade.tp);
        const rr = rrStr === "-" ? 0 : parseFloat(rrStr);
        if (filters.minRR && rr < parseFloat(filters.minRR)) return false;
        if (filters.maxRR && rr > parseFloat(filters.maxRR)) return false;
      }

      // Session
      if (filters.session !== "ALL") {
        const sessions = getTradingSession(trade.date);
        if (!sessions.includes(filters.session as TradingSession)) return false;
      }

      return true;
    });
  }, [filters]);

  return {
    filters,
    setFilter,
    resetAll,
    activeFilterCount,
    applyFilters,
    EMOTION_OPTIONS,
    DEFAULT_FILTERS,
    presets,
    savePreset,
    deletePreset,
    loadPreset,
  };
}
