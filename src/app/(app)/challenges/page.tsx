"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Trophy, Flame, Shield, Target, Zap, Award, Lock, Star,
  TrendingUp, TrendingDown, Clock, Crosshair, BarChart3,
  Crown, Gem, Medal, ArrowUpRight, ArrowDownRight, Layers,
  Sunrise, Sparkles, Swords, Plus, X, Users, Timer,
  Share2, ChevronDown, ChevronUp, CheckCircle2,
  Ban, Gift, Check,
} from "lucide-react";

/* ─── helpers ──────────────────────────────────────────── */

function uniqueDays(trades: { date: string }[]) {
  return [...new Set(trades.map((t) => t.date.slice(0, 10)))].sort();
}

function currentConsecutiveDays(trades: { date: string }[]) {
  const days = uniqueDays(trades);
  if (days.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const last = days[days.length - 1];
  const diffToday =
    (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
  if (diffToday > 1) return 0;
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diff =
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
      86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function isThisMonth(d: string) {
  const now = new Date();
  const dt = new Date(d);
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
}

function isThisWeek(d: string) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return new Date(d) >= start;
}

function isLastMonth(d: string) {
  const now = new Date();
  const dt = new Date(d);
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return dt.getMonth() === lastMonth && dt.getFullYear() === lastYear;
}

function daysRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes, expired: false };
}

function formatCountdown(endDate: string) {
  const { days, hours, minutes, expired } = daysRemaining(endDate);
  if (expired) return "Termine";
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getEndOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getEndOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getEndOfTwoWeeks() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/* ─── localStorage helpers ──────────────────────────────── */

interface ChallengeProgress {
  id: string;
  completedAt?: string;
  bestProgress: number;
  streakDays: number;
  lastUpdated: string;
}

interface CustomChallenge {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  duration: "week" | "month" | "2weeks";
  createdAt: string;
  endDate: string;
  iconName: string;
  color: string;
}

interface CompletedChallenge {
  id: string;
  name: string;
  completedAt: string;
  badge: string;
  color: string;
  iconName: string;
  shared: boolean;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

/* ─── types ────────────────────────────────────────────── */

interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconName: string;
  current: number;
  target: number;
  color: string;
  gradient: string;
  endDate: string;
  participants: number;
  reward: string;
  type: string;
  milestones: number[];
}

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

/* ─── tabs ─────────────────────────────────────────────── */

type TabId = "actifs" | "completes" | "classement" | "creer";

/* ─── page ─────────────────────────────────────────────── */

export default function ChallengesPage() {
  const { trades, loading } = useTrades();
  const [activeTab, setActiveTab] = useState<TabId>("actifs");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // localStorage state
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [customChallenges, setCustomChallenges] = useState<CustomChallenge[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress>>({});

  // Load from localStorage on mount
  useEffect(() => {
    setCompletedChallenges(loadFromStorage<CompletedChallenge[]>("ptj-completed-challenges", []));
    setCustomChallenges(loadFromStorage<CustomChallenge[]>("ptj-custom-challenges", []));
    setProgressMap(loadFromStorage<Record<string, ChallengeProgress>>("ptj-challenge-progress", {}));
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (completedChallenges.length > 0) saveToStorage("ptj-completed-challenges", completedChallenges);
  }, [completedChallenges]);
  useEffect(() => {
    saveToStorage("ptj-custom-challenges", customChallenges);
  }, [customChallenges]);
  useEffect(() => {
    saveToStorage("ptj-challenge-progress", progressMap);
  }, [progressMap]);

  const sorted = useMemo(
    () => [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [trades]
  );

  /* ── challenge computations ── */
  const challenges: ActiveChallenge[] = useMemo(() => {
    const monthTrades = sorted.filter((t) => isThisMonth(t.date));
    const weekTrades = sorted.filter((t) => isThisWeek(t.date));

    // Semaine rentable - profitable 5 consecutive days
    const weekDays = uniqueDays(weekTrades);
    let profitableDaysInRow = 0;
    let bestProfitStreak = 0;
    for (const day of weekDays) {
      const dayTrades = weekTrades.filter((t) => t.date.slice(0, 10) === day);
      const dayPnL = dayTrades.reduce((s, t) => s + t.result, 0);
      if (dayPnL > 0) {
        profitableDaysInRow++;
        if (profitableDaysInRow > bestProfitStreak) bestProfitStreak = profitableDaysInRow;
      } else {
        profitableDaysInRow = 0;
      }
    }

    // R:R Master - avg R:R > 2:1 this week
    const weekRRs = weekTrades
      .map((t) => parseFloat(calculateRR(t.entry, t.sl, t.tp)))
      .filter((rr) => !isNaN(rr));
    const avgRR = weekRRs.length > 0 ? weekRRs.reduce((s, r) => s + r, 0) / weekRRs.length : 0;
    const rrProgress = Math.min(avgRR / 2, 1) * 100;

    // Discipline parfaite - follow all items for 10 trades (trades with emotion set & tags)
    const disciplinedTrades = sorted.filter(
      (t) => t.emotion && t.emotion !== "" && t.tags && t.tags !== ""
    ).length;

    // Zero revenge - no revenge trades for a month (trades tagged "revenge")
    const monthWithRevenge = monthTrades.filter(
      (t) => t.tags && t.tags.toLowerCase().includes("revenge")
    );
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysSoFar = new Date().getDate();
    const zeroRevengeProgress = monthWithRevenge.length === 0 ? daysSoFar : 0;

    // Sniper - win rate > 70% with min 10 trades
    const wins = weekTrades.filter((t) => t.result > 0).length;
    const weekWinRate = weekTrades.length >= 10 ? (wins / weekTrades.length) * 100 : (weekTrades.length > 0 ? (wins / weekTrades.length) * 100 : 0);
    const sniperQualified = weekTrades.length >= 10;

    // Consistance - max 1% drawdown per day for 2 weeks
    const twoWeekTrades = sorted.filter((t) => {
      const d = new Date(t.date);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return d >= twoWeeksAgo;
    });
    const twoWeekDays = uniqueDays(twoWeekTrades);
    let consistentDays = 0;
    for (const day of twoWeekDays) {
      const dayTrades = twoWeekTrades.filter((t) => t.date.slice(0, 10) === day);
      const dayLoss = dayTrades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0);
      if (Math.abs(dayLoss) <= 50) {
        consistentDays++;
      }
    }

    const consDays = currentConsecutiveDays(sorted);

    // Win streak
    let winStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].result > 0) winStreak++;
      else break;
    }

    // Monthly profit
    const monthProfit = monthTrades.reduce((s, t) => s + t.result, 0);

    // Sniper high RR
    const sniperTrades = monthTrades.filter((t) => {
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      return !isNaN(rr) && rr > 3 && t.result > 0;
    }).length;

    // Unique assets
    const weekAssets = new Set(weekTrades.map((t) => t.asset));

    return [
      {
        id: "semaine-rentable",
        title: "Semaine rentable",
        description: "Etre profitable pendant 5 jours consecutifs",
        icon: <TrendingUp size={20} />,
        iconName: "TrendingUp",
        current: bestProfitStreak,
        target: 5,
        color: "#10b981",
        gradient: "from-emerald-500/20 to-emerald-600/5",
        endDate: getEndOfWeek(),
        participants: 247,
        reward: "Badge Semaine Verte",
        type: "weekly",
        milestones: [1, 2, 3, 4, 5],
      },
      {
        id: "rr-master",
        title: "R:R Master",
        description: "Obtenir un R:R moyen > 2:1 sur la semaine",
        icon: <Target size={20} />,
        iconName: "Target",
        current: Math.round(rrProgress),
        target: 100,
        color: "#f59e0b",
        gradient: "from-amber-500/20 to-amber-600/5",
        endDate: getEndOfWeek(),
        participants: 183,
        reward: "Badge R:R Elite",
        type: "weekly",
        milestones: [25, 50, 75, 100],
      },
      {
        id: "discipline-parfaite",
        title: "Discipline parfaite",
        description: "Remplir toutes les infos pour 10 trades (emotion + tags)",
        icon: <CheckCircle2 size={20} />,
        iconName: "CheckCircle2",
        current: Math.min(disciplinedTrades, 10),
        target: 10,
        color: "#8b5cf6",
        gradient: "from-violet-500/20 to-violet-600/5",
        endDate: getEndOfMonth(),
        participants: 312,
        reward: "Badge Discipline",
        type: "monthly",
        milestones: [2, 5, 8, 10],
      },
      {
        id: "zero-revenge",
        title: "Zero revenge",
        description: "Aucun trade de revenge pendant un mois entier",
        icon: <Ban size={20} />,
        iconName: "Ban",
        current: zeroRevengeProgress,
        target: daysInMonth,
        color: "#ef4444",
        gradient: "from-red-500/20 to-red-600/5",
        endDate: getEndOfMonth(),
        participants: 156,
        reward: "Badge Zero Tilt",
        type: "monthly",
        milestones: [7, 14, 21, daysInMonth],
      },
      {
        id: "sniper-challenge",
        title: "Sniper",
        description: `Win rate > 70% avec min 10 trades (actuel: ${weekTrades.length} trades, ${weekWinRate.toFixed(0)}%)`,
        icon: <Crosshair size={20} />,
        iconName: "Crosshair",
        current: sniperQualified ? Math.round(Math.min(weekWinRate / 70 * 100, 100)) : Math.min(weekTrades.length, 10) * 10,
        target: 100,
        color: "#ec4899",
        gradient: "from-pink-500/20 to-pink-600/5",
        endDate: getEndOfWeek(),
        participants: 198,
        reward: "Badge Sniper Elite",
        type: "weekly",
        milestones: [25, 50, 75, 100],
      },
      {
        id: "consistance",
        title: "Consistance",
        description: "Max 50\u20AC de perte par jour pendant 2 semaines",
        icon: <Shield size={20} />,
        iconName: "Shield",
        current: Math.min(consistentDays, 14),
        target: 14,
        color: "#06b6d4",
        gradient: "from-cyan-500/20 to-cyan-600/5",
        endDate: getEndOfTwoWeeks(),
        participants: 134,
        reward: "Badge Consistance",
        type: "biweekly",
        milestones: [3, 7, 10, 14],
      },
      {
        id: "consistency-king",
        title: "Consistency King",
        description: "Trader 5 jours consecutifs",
        icon: <Crown size={20} />,
        iconName: "Crown",
        current: Math.min(consDays, 5),
        target: 5,
        color: "#f59e0b",
        gradient: "from-amber-500/20 to-amber-600/5",
        endDate: getEndOfWeek(),
        participants: 289,
        reward: "Badge Roi de la Consistance",
        type: "weekly",
        milestones: [1, 2, 3, 4, 5],
      },
      {
        id: "profit-target",
        title: "Profit Target",
        description: "500\u20AC de profit ce mois",
        icon: <Gem size={20} />,
        iconName: "Gem",
        current: Math.min(Math.max(monthProfit, 0), 500),
        target: 500,
        color: "#10b981",
        gradient: "from-emerald-500/20 to-emerald-600/5",
        endDate: getEndOfMonth(),
        participants: 421,
        reward: "Badge Objectif Atteint",
        type: "monthly",
        milestones: [100, 250, 400, 500],
      },
    ];
  }, [sorted]);

  // Track completions automatically
  useEffect(() => {
    const newCompleted = [...completedChallenges];
    const newProgress = { ...progressMap };
    let changed = false;

    challenges.forEach((c) => {
      const done = c.current >= c.target;
      const alreadyCompleted = completedChallenges.some((cc) => cc.id === c.id);

      // Update progress
      if (!newProgress[c.id] || c.current > (newProgress[c.id]?.bestProgress ?? 0)) {
        newProgress[c.id] = {
          id: c.id,
          bestProgress: c.current,
          streakDays: (newProgress[c.id]?.streakDays ?? 0) + (done ? 1 : 0),
          lastUpdated: new Date().toISOString(),
          ...(done ? { completedAt: new Date().toISOString() } : {}),
        };
        changed = true;
      }

      if (done && !alreadyCompleted) {
        newCompleted.push({
          id: c.id,
          name: c.title,
          completedAt: new Date().toISOString(),
          badge: c.reward,
          color: c.color,
          iconName: c.iconName,
          shared: false,
        });
        changed = true;
      }
    });

    if (changed) {
      setCompletedChallenges(newCompleted);
      setProgressMap(newProgress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges]);

  /* ── XP system ── */
  const { xp, level, title: levelTitle, xpInLevel, xpForLevel } = useMemo(() => {
    let total = 0;
    sorted.forEach((t) => {
      total += 10;
      if (t.result > 0) total += 25;
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      if (!isNaN(rr) && rr > 2) total += 50;
    });
    const completed = challenges.filter((c) => c.current >= c.target).length;
    total += completed * 100;
    total += completedChallenges.length * 50;

    const lvl = Math.floor(total / 500) + 1;
    const titles: [number, string][] = [
      [50, "Legende"], [36, "Master"], [21, "Expert"],
      [11, "Trader"], [6, "Apprenti"], [1, "Debutant"],
    ];
    const t = titles.find(([min]) => lvl >= min)?.[1] || "Debutant";
    const inLevel = total % 500;
    return { xp: total, level: lvl, title: t, xpInLevel: inLevel, xpForLevel: 500 };
  }, [sorted, challenges, completedChallenges]);

  /* ── badges ── */
  const badges: Badge[] = useMemo(() => {
    const wins = sorted.filter((t) => t.result > 0).length;
    const totalPnL = sorted.reduce((s, t) => s + t.result, 0);
    const winRate = sorted.length > 0 ? (wins / sorted.length) * 100 : 0;
    const grossWins = sorted.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0);
    const grossLosses = Math.abs(sorted.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0));
    const pf = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
    const months: Record<string, number> = {};
    sorted.forEach((t) => {
      const key = t.date.slice(0, 7);
      months[key] = (months[key] || 0) + t.result;
    });
    const bestMonth = Math.max(0, ...Object.values(months));
    const diamondScore = pf > 2 && winRate > 55;

    // Challenge-based badges
    const challengeBadges: Badge[] = completedChallenges.map((cc) => ({
      id: `challenge-${cc.id}`,
      title: cc.badge,
      description: `Challenge "${cc.name}" complete`,
      icon: getIconForName(cc.iconName, 20),
      unlocked: true,
      color: cc.color,
    }));

    return [
      { id: "first-trade", title: "Premier Trade", description: "Passer votre premier trade", icon: <Zap size={20} />, unlocked: sorted.length >= 1, color: "#f59e0b" },
      { id: "10-trades", title: "10 Trades", description: "Completer 10 trades", icon: <BarChart3 size={20} />, unlocked: sorted.length >= 10, color: "#3b82f6" },
      { id: "50-trades", title: "50 Trades", description: "Completer 50 trades", icon: <BarChart3 size={20} />, unlocked: sorted.length >= 50, color: "#8b5cf6" },
      { id: "100-trades", title: "Centurion", description: "Completer 100 trades", icon: <Trophy size={20} />, unlocked: sorted.length >= 100, color: "#f97316" },
      { id: "first-win", title: "Premier Gain", description: "Gagner votre premier trade", icon: <Star size={20} />, unlocked: wins >= 1, color: "#10b981" },
      { id: "10-wins", title: "10 Victoires", description: "Gagner 10 trades", icon: <Star size={20} />, unlocked: wins >= 10, color: "#06b6d4" },
      { id: "winrate-60", title: "Win Rate > 60%", description: "Atteindre 60% de win rate", icon: <TrendingUp size={20} />, unlocked: winRate > 60 && sorted.length >= 10, color: "#10b981" },
      { id: "pf-2", title: "Profit Factor > 2", description: "Profit factor superieur a 2", icon: <Gem size={20} />, unlocked: pf > 2 && sorted.length >= 10, color: "#ec4899" },
      { id: "diamond", title: "Diamant", description: "PF > 2 et Win Rate > 55%", icon: <Sparkles size={20} />, unlocked: diamondScore && sorted.length >= 20, color: "#a855f7" },
      { id: "1000-profit", title: "1000\u20AC Profit", description: "Accumuler 1000\u20AC de profit", icon: <Award size={20} />, unlocked: totalPnL >= 1000, color: "#f59e0b" },
      { id: "best-month", title: "Mois Record", description: "Mois avec 500\u20AC+ de profit", icon: <Medal size={20} />, unlocked: bestMonth >= 500, color: "#ef4444" },
      ...challengeBadges,
    ];
  }, [sorted, completedChallenges]);

  /* ── streaks ── */
  const streaks = useMemo(() => {
    let curWin = 0, curLoss = 0, bestWin = 0, bestLoss = 0;
    sorted.forEach((t) => {
      if (t.result > 0) { curWin++; curLoss = 0; if (curWin > bestWin) bestWin = curWin; }
      else if (t.result < 0) { curLoss++; curWin = 0; if (curLoss > bestLoss) bestLoss = curLoss; }
      else { curWin = 0; curLoss = 0; }
    });

    // Challenge streak - how many challenges completed in a row (consecutive months)
    const challengeStreak = completedChallenges.length;

    return {
      currentWin: curWin,
      currentLoss: curLoss,
      bestWin,
      bestLoss,
      consecutiveDays: currentConsecutiveDays(sorted),
      challengeStreak,
    };
  }, [sorted, completedChallenges]);

  /* ── monthly progress ── */
  const monthly = useMemo(() => {
    const mTrades = sorted.filter((t) => isThisMonth(t.date));
    const lmTrades = sorted.filter((t) => isLastMonth(t.date));
    const mWins = mTrades.filter((t) => t.result > 0).length;
    const lmWins = lmTrades.filter((t) => t.result > 0).length;
    const mWinRate = mTrades.length > 0 ? (mWins / mTrades.length) * 100 : 0;
    const lmWinRate = lmTrades.length > 0 ? (lmWins / lmTrades.length) * 100 : 0;
    const mPnL = mTrades.reduce((s, t) => s + t.result, 0);
    const lmPnL = lmTrades.reduce((s, t) => s + t.result, 0);
    return {
      trades: mTrades.length,
      lastTrades: lmTrades.length,
      winRate: mWinRate,
      lastWinRate: lmWinRate,
      pnl: mPnL,
      lastPnl: lmPnL,
    };
  }, [sorted]);

  /* ── leaderboard (simulated) ── */
  const leaderboard = useMemo(() => {
    const names = [
      "TraderPro_FR", "AlphaVortex", "SwingKing", "ScalpMaster42",
      "ZenTrader", "FxWolf", "PipHunter", "TrendRider",
      "RiskManager", "MomentumX", "PatientTrader", "LevelUpFX",
    ];
    return challenges.map((c) => ({
      challengeId: c.id,
      challengeName: c.title,
      entries: names.map((name, i) => ({
        rank: i + 1,
        name,
        progress: Math.max(0, Math.min(100, 100 - i * 8 + Math.floor(Math.random() * 10))),
        isYou: i === 2,
      })).sort((a, b) => b.progress - a.progress).map((e, i) => ({ ...e, rank: i + 1 })),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges.length]);

  /* ── custom challenge creation ── */
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    description: "",
    type: "trades",
    target: 10,
    duration: "week" as "week" | "month" | "2weeks",
    color: "#3b82f6",
  });

  const handleCreateChallenge = useCallback(() => {
    if (!newChallenge.name.trim()) return;
    const endDate = newChallenge.duration === "week"
      ? getEndOfWeek()
      : newChallenge.duration === "2weeks"
        ? getEndOfTwoWeeks()
        : getEndOfMonth();
    const custom: CustomChallenge = {
      id: `custom-${Date.now()}`,
      name: newChallenge.name,
      description: newChallenge.description || `Challenge personnalise: ${newChallenge.name}`,
      type: newChallenge.type,
      target: newChallenge.target,
      duration: newChallenge.duration,
      createdAt: new Date().toISOString(),
      endDate,
      iconName: "Star",
      color: newChallenge.color,
    };
    setCustomChallenges((prev) => [...prev, custom]);
    setNewChallenge({ name: "", description: "", type: "trades", target: 10, duration: "week", color: "#3b82f6" });
    setShowCreateModal(false);
  }, [newChallenge]);

  const handleDeleteCustomChallenge = useCallback((id: string) => {
    setCustomChallenges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /* ── share handler ── */
  const handleShare = useCallback(async (challenge: CompletedChallenge) => {
    const text = `J'ai complete le challenge "${challenge.name}" sur ProTrade Journal ! ${challenge.badge}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ProTrade Journal - Challenge", text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedId(challenge.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
      setCompletedChallenges((prev) =>
        prev.map((c) => (c.id === challenge.id ? { ...c, shared: true } : c))
      );
    } catch {
      // user cancelled share
    }
  }, []);

  /* ─── render ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: "var(--border)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const pctBar = (current: number, target: number) => Math.min((current / target) * 100, 100);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "actifs", label: "Challenges Actifs", icon: <Target size={16} /> },
    { id: "completes", label: "Completes", icon: <Trophy size={16} /> },
    { id: "classement", label: "Classement", icon: <Crown size={16} /> },
    { id: "creer", label: "Creer", icon: <Plus size={16} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Trophy className="text-amber-500" size={28} />
            Challenges & Gamification
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Relevez des defis, gagnez de l&apos;XP et debloquez des badges
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass" style={{ border: "1px solid var(--border)" }}>
            <Flame size={16} className="text-orange-500" />
            <span className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {streaks.challengeStreak} streak
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass" style={{ border: "1px solid var(--border)" }}>
            <Sparkles size={16} className="text-amber-500" />
            <span className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {badges.filter((b) => b.unlocked).length}/{badges.length} Badges
            </span>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mono text-lg">
              {level}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{levelTitle}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Niveau {level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {xp.toLocaleString()} XP
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {xpInLevel}/{xpForLevel} XP vers niveau {level + 1}
            </p>
          </div>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
            style={{ width: `${(xpInLevel / xpForLevel) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>+10/trade  +25/win  +50/R:R&gt;2  +100/challenge</span>
          <span>{xpForLevel - xpInLevel} XP restants</span>
        </div>
      </div>

      {/* Streak Counter */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Flame size={20} className="text-red-500" />
          Compteur de Streaks
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Win Streak", value: streaks.currentWin, icon: <TrendingUp size={18} />, color: "#10b981", active: streaks.currentWin >= 3 },
            { label: "Loss Streak", value: streaks.currentLoss, icon: <TrendingDown size={18} />, color: "#ef4444", active: false },
            { label: "Meilleur Win", value: streaks.bestWin, icon: <Crown size={18} />, color: "#f59e0b", active: false },
            { label: "Jours Consecutifs", value: streaks.consecutiveDays, icon: <Clock size={18} />, color: "#8b5cf6", active: streaks.consecutiveDays >= 3 },
            { label: "Challenges Streak", value: streaks.challengeStreak, icon: <Trophy size={18} />, color: "#ec4899", active: streaks.challengeStreak >= 2 },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4" style={{ border: `1px solid ${s.active ? s.color + "60" : "var(--border)"}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                {s.active && <Flame size={14} className="text-orange-500 animate-pulse" />}
              </div>
              <div className="flex items-center gap-2">
                <div style={{ color: s.color }}>{s.icon}</div>
                <span className="mono text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "creer") setShowCreateModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20"
                : "glass hover:scale-[1.02]"
            }`}
            style={{
              border: `1px solid ${activeTab === tab.id ? "#f59e0b40" : "var(--border)"}`,
              color: activeTab === tab.id ? "#f59e0b" : "var(--text-secondary)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Active Challenges */}
      {activeTab === "actifs" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {challenges.map((c) => {
              const pct = pctBar(c.current, c.target);
              const done = c.current >= c.target;
              const nearDone = pct >= 80 && !done;
              const isExpanded = expandedChallenge === c.id;
              const remaining = formatCountdown(c.endDate);
              const milestonesHit = c.milestones.filter(
                (m) => (c.current / c.target) * (c.milestones[c.milestones.length - 1] || c.target) >= m
              ).length;

              return (
                <div
                  key={c.id}
                  className={`glass rounded-xl p-4 bg-gradient-to-br ${c.gradient} transition-all duration-300 hover:scale-[1.02] cursor-pointer ${nearDone ? "ring-1 ring-amber-500/30" : ""}`}
                  style={{ border: `1px solid ${done ? c.color : "var(--border)"}` }}
                  onClick={() => setExpandedChallenge(isExpanded ? null : c.id)}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${c.color}20`, color: c.color }}
                      >
                        {c.icon}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {c.title}
                      </span>
                    </div>
                    {done ? (
                      <div className="flex items-center gap-1">
                        <Trophy size={14} className="text-amber-500" />
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    ) : (
                      isExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>

                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{c.description}</p>

                  {/* Countdown & Participants */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Timer size={12} style={{ color: "var(--text-muted)" }} />
                      <span className="mono text-[11px]" style={{ color: daysRemaining(c.endDate).days < 2 ? "#ef4444" : "var(--text-muted)" }}>
                        {remaining}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} style={{ color: "var(--text-muted)" }} />
                      <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {c.participants}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with milestones */}
                  <div className="relative w-full h-2.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                    {/* Milestone markers */}
                    {c.milestones.map((m, i) => {
                      const mPct = (m / c.milestones[c.milestones.length - 1]) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 w-0.5 h-full"
                          style={{ left: `${mPct}%`, backgroundColor: "var(--bg-primary)", opacity: 0.6 }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between mt-1.5">
                    <span className="mono text-xs font-medium" style={{ color: c.color }}>
                      {c.current}/{c.target}
                    </span>
                    <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {Math.round(pct)}%
                    </span>
                  </div>

                  {/* Reward badge */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <Gift size={12} style={{ color: c.color }} />
                    <span className="text-[11px] font-medium" style={{ color: c.color }}>{c.reward}</span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Jalons atteints:</span>
                        <span className="mono text-xs font-medium" style={{ color: c.color }}>
                          {milestonesHit}/{c.milestones.length}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {c.milestones.map((m, i) => {
                          const hit = (c.current / c.target) * (c.milestones[c.milestones.length - 1] || c.target) >= m;
                          return (
                            <div
                              key={i}
                              className="flex-1 h-1.5 rounded-full"
                              style={{ backgroundColor: hit ? c.color : "var(--bg-primary)" }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Type: {c.type === "weekly" ? "Hebdomadaire" : c.type === "monthly" ? "Mensuel" : "Bimensuel"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom challenges */}
            {customChallenges.map((cc) => {
              const remaining = formatCountdown(cc.endDate);
              const { expired } = daysRemaining(cc.endDate);
              return (
                <div
                  key={cc.id}
                  className="glass rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] relative"
                  style={{ border: `1px solid ${cc.color}40` }}
                >
                  <button
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                    onClick={() => handleDeleteCustomChallenge(cc.id)}
                  >
                    <X size={12} className="text-red-400" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${cc.color}20`, color: cc.color }}
                    >
                      <Star size={20} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {cc.name}
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{cc.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Timer size={12} style={{ color: "var(--text-muted)" }} />
                      <span className="mono text-[11px]" style={{ color: expired ? "#ef4444" : "var(--text-muted)" }}>
                        {remaining}
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cc.color}20`, color: cc.color }}>
                      Personnalise
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Objectif: {cc.target} {cc.type}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab: Completed Challenges */}
      {activeTab === "completes" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <CheckCircle2 size={20} className="text-emerald-500" />
            Challenges Completes ({completedChallenges.length})
          </h2>
          {completedChallenges.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center" style={{ border: "1px solid var(--border)" }}>
              <Trophy size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Aucun challenge complete pour le moment
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Completez vos premiers challenges pour les voir apparaitre ici !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedChallenges.map((cc) => (
                <div
                  key={cc.id + cc.completedAt}
                  className="glass rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]"
                  style={{ border: `1px solid ${cc.color}40` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${cc.color}20`, color: cc.color }}
                      >
                        {getIconForName(cc.iconName, 20)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{cc.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {new Date(cc.completedAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${cc.color}10` }}>
                    <Gift size={14} style={{ color: cc.color }} />
                    <span className="text-xs font-medium" style={{ color: cc.color }}>{cc.badge}</span>
                  </div>
                  <button
                    onClick={() => handleShare(cc)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {copiedId === cc.id ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        Copie !
                      </>
                    ) : (
                      <>
                        <Share2 size={14} />
                        Partager
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Badges Gallery within completed tab */}
          <h2 className="text-lg font-semibold mt-8 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Award size={20} className="text-purple-500" />
            Galerie de Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`glass rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 ${
                  b.unlocked ? "hover:scale-105" : "opacity-40 grayscale"
                }`}
                style={{ border: `1px solid ${b.unlocked ? b.color + "40" : "var(--border)"}` }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2 relative"
                  style={{
                    backgroundColor: b.unlocked ? `${b.color}20` : "var(--bg-primary)",
                    color: b.unlocked ? b.color : "var(--text-muted)",
                  }}
                >
                  {b.unlocked ? b.icon : <Lock size={20} />}
                </div>
                <span className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {b.title}
                </span>
                <span className="text-[10px] mt-1 leading-tight" style={{ color: "var(--text-muted)" }}>
                  {b.description}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === "classement" && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Crown size={20} className="text-amber-500" />
            Classement par Challenge
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {leaderboard.slice(0, 6).map((lb) => (
              <div key={lb.challengeId} className="glass rounded-xl p-5" style={{ border: "1px solid var(--border)" }}>
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Trophy size={16} className="text-amber-500" />
                  {lb.challengeName}
                </h3>
                <div className="space-y-2.5">
                  {lb.entries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        entry.isYou ? "ring-1 ring-amber-500/30" : ""
                      }`}
                      style={{
                        backgroundColor: entry.isYou ? "var(--bg-primary)" : "transparent",
                      }}
                    >
                      <span
                        className="mono text-xs font-bold w-6 text-center"
                        style={{
                          color: entry.rank === 1 ? "#f59e0b" : entry.rank === 2 ? "#94a3b8" : entry.rank === 3 ? "#cd7f32" : "var(--text-muted)",
                        }}
                      >
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                      <span className="text-sm flex-1" style={{ color: entry.isYou ? "#f59e0b" : "var(--text-primary)" }}>
                        {entry.isYou ? "Vous" : entry.name}
                      </span>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${entry.progress}%`,
                            backgroundColor: entry.isYou ? "#f59e0b" : entry.rank <= 3 ? "#10b981" : "var(--text-muted)",
                          }}
                        />
                      </div>
                      <span className="mono text-xs font-medium w-10 text-right" style={{ color: "var(--text-muted)" }}>
                        {entry.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Create / Custom Challenges */}
      {activeTab === "creer" && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Plus size={20} className="text-blue-500" />
            Creer un Challenge Personnalise
          </h2>

          <div className="glass rounded-xl p-6" style={{ border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nom du challenge
                </label>
                <input
                  type="text"
                  value={newChallenge.name}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: 20 trades ce mois"
                  className="w-full px-3 py-2.5 rounded-lg text-sm glass"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Decrivez votre challenge..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm glass"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Type d&apos;objectif
                </label>
                <select
                  value={newChallenge.type}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm glass"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-primary)",
                  }}
                >
                  <option value="trades">Nombre de trades</option>
                  <option value="winrate">Win rate (%)</option>
                  <option value="profit">Profit (EUR)</option>
                  <option value="rr">R:R moyen</option>
                  <option value="streak">Jours consecutifs</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Objectif
                </label>
                <input
                  type="number"
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, target: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm glass"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Duree
                </label>
                <select
                  value={newChallenge.duration}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, duration: e.target.value as "week" | "month" | "2weeks" }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm glass"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-primary)",
                  }}
                >
                  <option value="week">1 semaine</option>
                  <option value="2weeks">2 semaines</option>
                  <option value="month">1 mois</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Couleur
                </label>
                <div className="flex gap-2">
                  {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewChallenge((p) => ({ ...p, color }))}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        backgroundColor: color,
                        border: newChallenge.color === color ? "2px solid white" : "2px solid transparent",
                        transform: newChallenge.color === color ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleCreateChallenge}
              disabled={!newChallenge.name.trim()}
              className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${newChallenge.color}, ${newChallenge.color}cc)`,
              }}
            >
              <Plus size={16} />
              Creer le challenge
            </button>
          </div>

          {/* List existing custom challenges */}
          {customChallenges.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mt-6" style={{ color: "var(--text-secondary)" }}>
                Vos challenges personnalises ({customChallenges.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customChallenges.map((cc) => {
                  const remaining = formatCountdown(cc.endDate);
                  const { expired } = daysRemaining(cc.endDate);
                  return (
                    <div
                      key={cc.id}
                      className="glass rounded-xl p-4 relative"
                      style={{ border: `1px solid ${cc.color}40` }}
                    >
                      <button
                        className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                        onClick={() => handleDeleteCustomChallenge(cc.id)}
                      >
                        <X size={14} className="text-red-400" />
                      </button>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${cc.color}20`, color: cc.color }}
                        >
                          <Star size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cc.name}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{cc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>Objectif: {cc.target} {cc.type}</span>
                        <span className="flex items-center gap-1">
                          <Timer size={12} />
                          <span style={{ color: expired ? "#ef4444" : "inherit" }}>{remaining}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* Monthly Progress (always shown at bottom) */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 size={20} className="text-blue-500" />
          Progression Mensuelle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Trades", current: monthly.trades, target: 30, last: monthly.lastTrades, format: (v: number) => `${v}`, color: "#3b82f6" },
            { label: "Win Rate", current: monthly.winRate, target: 100, last: monthly.lastWinRate, format: (v: number) => `${v.toFixed(1)}%`, color: "#10b981" },
            { label: "P&L", current: monthly.pnl, target: 500, last: monthly.lastPnl, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}\u20AC`, color: monthly.pnl >= 0 ? "#10b981" : "#ef4444" },
          ].map((m) => {
            const diff = m.current - m.last;
            const pctDiff = m.last > 0 ? ((diff / m.last) * 100) : 0;
            const up = diff >= 0;
            return (
              <div key={m.label} className="glass rounded-xl p-5" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                  <div className="flex items-center gap-1">
                    {up ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
                    <span className="mono text-xs font-medium" style={{ color: up ? "#10b981" : "#ef4444" }}>
                      {pctDiff !== 0 ? `${up ? "+" : ""}${pctDiff.toFixed(0)}%` : "-"}
                    </span>
                  </div>
                </div>
                <p className="mono text-xl font-bold mb-3" style={{ color: m.color }}>{m.format(m.current)}</p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max((m.current / m.target) * 100, 0), 100)}%`, backgroundColor: m.color }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Objectif: {m.format(m.target)} {m.label === "P&L" ? "ce mois" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─── icon resolver for serialized icon names ──────────── */

function getIconForName(name: string, size: number): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    TrendingUp: <TrendingUp size={size} />,
    Target: <Target size={size} />,
    CheckCircle2: <CheckCircle2 size={size} />,
    Ban: <Ban size={size} />,
    Crosshair: <Crosshair size={size} />,
    Shield: <Shield size={size} />,
    Crown: <Crown size={size} />,
    Gem: <Gem size={size} />,
    Star: <Star size={size} />,
    Trophy: <Trophy size={size} />,
    Flame: <Flame size={size} />,
    Zap: <Zap size={size} />,
    Award: <Award size={size} />,
  };
  return icons[name] || <Star size={size} />;
}
