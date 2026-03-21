"use client";

import { useState, useEffect, useCallback } from "react";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  current: number;
  target: number;
  unlocked: boolean;
  xpReward: number;
  rarity: BadgeRarity;
  unlockedAt: string | null;
  percentOwned: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
}

export interface LevelInfo {
  name: string;
  index: number;
  currentXp: number;
  levelMinXp: number;
  nextLevelXp: number;
  nextLevelName: string;
}

export interface GamificationData {
  badges: Badge[];
  xp: number;
  level: LevelInfo;
  dailyQuests: DailyQuest[];
  stats: {
    totalTrades: number;
    winRate: number;
    winStreak: number;
    profitFactor: number;
    consecutiveTradeDays: number;
    totalMessages: number;
    biasDaysFilled: number;
    totalProfit: number;
    profitableMonths: number;
    loginStreak: number;
  };
}

export function useGamification() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gamification");
      if (!res.ok) throw new Error("Failed to fetch gamification data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
