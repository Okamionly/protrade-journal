import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* ─── Types ─── */
interface Badge {
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
}

interface DailyQuest {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
}

const LEVELS = [
  { name: "Rookie", minXp: 0 },
  { name: "Trader", minXp: 100 },
  { name: "Analyst", minXp: 500 },
  { name: "Pro", minXp: 1500 },
  { name: "Expert", minXp: 5000 },
  { name: "Master", minXp: 15000 },
  { name: "Legend", minXp: 50000 },
];

/* ─── Helpers ─── */

function uniqueDays(dates: Date[]): string[] {
  return [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort();
}

function maxWinStreak(trades: { result: number; date: Date }[]): number {
  const sorted = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime());
  let best = 0;
  let current = 0;
  for (const t of sorted) {
    if (t.result > 0) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function consecutiveDaysCount(dayStrings: string[]): number {
  if (dayStrings.length === 0) return 0;
  const sorted = [...dayStrings].sort();
  let best = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
    if (diff === 1) {
      streak++;
      if (streak > best) best = streak;
    } else if (diff > 1) {
      streak = 1;
    }
  }
  return best;
}

function weeksWithTradesInMonth(tradeDays: string[]): number {
  // Count distinct ISO weeks that have at least one trade in the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recent = tradeDays.filter((d) => new Date(d) >= thirtyDaysAgo);
  const weeks = new Set(recent.map((d) => {
    const dt = new Date(d);
    const startOfYear = new Date(dt.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((dt.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${dt.getFullYear()}-W${weekNum}`;
  }));
  return weeks.size;
}

function getLevel(xp: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) level = l;
    else break;
  }
  const idx = LEVELS.indexOf(level);
  const nextLevel = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  return {
    name: level.name,
    index: idx,
    currentXp: xp,
    levelMinXp: level.minXp,
    nextLevelXp: nextLevel?.minXp ?? level.minXp,
    nextLevelName: nextLevel?.name ?? level.name,
  };
}

/* ─── Daily quests pool ─── */
const QUEST_POOL = [
  { id: "log3", title: "Log 3 trades today", icon: "pencil" },
  { id: "bias", title: "Fill your daily bias", icon: "target" },
  { id: "review", title: "Review 1 past trade", icon: "eye" },
  { id: "chat", title: "Send a message in chat", icon: "message" },
  { id: "cot", title: "Check the COT report", icon: "trending" },
];

function getDailyQuests(dateStr: string): typeof QUEST_POOL {
  // Pseudo-random but deterministic based on date
  const seed = dateStr.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  const shuffled = [...QUEST_POOL].sort((a, b) => {
    const ha = (seed * 31 + a.id.charCodeAt(0)) % 100;
    const hb = (seed * 31 + b.id.charCodeAt(0)) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

/* ─── GET handler ─── */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all data in parallel
    const [trades, dailyPlans, chatMessages, user] = await Promise.all([
      prisma.trade.findMany({
        where: { userId },
        select: { id: true, result: true, date: true, lots: true },
        orderBy: { date: "asc" },
      }),
      prisma.dailyPlan.findMany({
        where: { userId },
        select: { id: true, date: true, bias: true },
      }),
      prisma.chatMessage.findMany({
        where: { userId },
        select: { id: true, imageUrl: true, createdAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      }),
    ]);

    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const winStreak = maxWinStreak(trades);
    const tradeDays = uniqueDays(trades.map((t) => t.date));
    const consecutiveTradeDays = consecutiveDaysCount(tradeDays);
    const weeksWithTrades = weeksWithTradesInMonth(tradeDays);

    // Daily bias filled days
    const biasDays = uniqueDays(
      dailyPlans.filter((dp) => dp.bias && dp.bias.trim() !== "").map((dp) => dp.date)
    );
    const consecutiveBiasDays = consecutiveDaysCount(biasDays);

    // Profit factor
    const totalWinAmount = wins.reduce((s, t) => s + t.result, 0);
    const totalLossAmount = Math.abs(losses.reduce((s, t) => s + t.result, 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;

    // Risk manager: check if any single loss > 2% of capital
    const capital = user?.balance ?? 25000;
    const maxLossThreshold = capital * 0.02;
    const hasLargeDrawdown = trades.some((t) => t.result < 0 && Math.abs(t.result) > maxLossThreshold);

    // Chat stats
    const totalMessages = chatMessages.length;
    const messagesWithImages = chatMessages.filter((m) => m.imageUrl && m.imageUrl.trim() !== "").length;

    /* ─── Build badges ─── */
    const badges: Badge[] = [
      // Trade milestones
      { id: "first_blood", name: "First Blood", description: "Log your first trade", icon: "swords", color: "#ef4444", category: "milestones", current: Math.min(totalTrades, 1), target: 1, unlocked: totalTrades >= 1, xpReward: 100 },
      { id: "century", name: "Century", description: "100 trades logged", icon: "target", color: "#f59e0b", category: "milestones", current: Math.min(totalTrades, 100), target: 100, unlocked: totalTrades >= 100, xpReward: 100 },
      { id: "veteran", name: "Veteran", description: "500 trades logged", icon: "shield", color: "#8b5cf6", category: "milestones", current: Math.min(totalTrades, 500), target: 500, unlocked: totalTrades >= 500, xpReward: 100 },
      { id: "legend", name: "Legend", description: "1000 trades logged", icon: "crown", color: "#eab308", category: "milestones", current: Math.min(totalTrades, 1000), target: 1000, unlocked: totalTrades >= 1000, xpReward: 100 },
      // Win streaks
      { id: "hot_hand", name: "Hot Hand", description: "5 wins in a row", icon: "flame", color: "#f97316", category: "streaks", current: Math.min(winStreak, 5), target: 5, unlocked: winStreak >= 5, xpReward: 100 },
      { id: "on_fire", name: "On Fire", description: "10 wins in a row", icon: "zap", color: "#ef4444", category: "streaks", current: Math.min(winStreak, 10), target: 10, unlocked: winStreak >= 10, xpReward: 100 },
      { id: "unstoppable", name: "Unstoppable", description: "20 wins in a row", icon: "rocket", color: "#dc2626", category: "streaks", current: Math.min(winStreak, 20), target: 20, unlocked: winStreak >= 20, xpReward: 100 },
      // Consistency
      { id: "week_warrior", name: "Week Warrior", description: "Trade every day for a week", icon: "calendar", color: "#10b981", category: "consistency", current: Math.min(consecutiveTradeDays, 7), target: 7, unlocked: consecutiveTradeDays >= 7, xpReward: 100 },
      { id: "monthly_master", name: "Monthly Master", description: "Trade every week for a month", icon: "star", color: "#6366f1", category: "consistency", current: Math.min(weeksWithTrades, 4), target: 4, unlocked: weeksWithTrades >= 4, xpReward: 100 },
      { id: "iron_discipline", name: "Iron Discipline", description: "30 days with daily bias filled", icon: "brain", color: "#0ea5e9", category: "consistency", current: Math.min(consecutiveBiasDays, 30), target: 30, unlocked: consecutiveBiasDays >= 30, xpReward: 100 },
      // Performance
      { id: "sharp_shooter", name: "Sharp Shooter", description: "Win rate > 60% (min 50 trades)", icon: "crosshair", color: "#22c55e", category: "performance", current: totalTrades >= 50 ? Math.round(winRate) : Math.min(totalTrades, 50), target: totalTrades >= 50 ? 60 : 50, unlocked: totalTrades >= 50 && winRate > 60, xpReward: 100 },
      { id: "profit_machine", name: "Profit Machine", description: "Profit factor > 2.0 (min 50 trades)", icon: "trending-up", color: "#14b8a6", category: "performance", current: totalTrades >= 50 ? Math.min(Math.round(profitFactor * 10) / 10, 2) : Math.min(totalTrades, 50), target: totalTrades >= 50 ? 2 : 50, unlocked: totalTrades >= 50 && profitFactor > 2, xpReward: 100 },
      { id: "risk_manager", name: "Risk Manager", description: "No trade with loss > 2% of capital", icon: "shield-check", color: "#3b82f6", category: "performance", current: totalTrades > 0 && !hasLargeDrawdown ? 1 : 0, target: 1, unlocked: totalTrades > 0 && !hasLargeDrawdown, xpReward: 100 },
      // Social
      { id: "chatterbox", name: "Chatterbox", description: "50 chat messages", icon: "message-circle", color: "#a855f7", category: "social", current: Math.min(totalMessages, 50), target: 50, unlocked: totalMessages >= 50, xpReward: 100 },
      { id: "helpful", name: "Helpful", description: "10 chat messages with images (sharing analysis)", icon: "image", color: "#ec4899", category: "social", current: Math.min(messagesWithImages, 10), target: 10, unlocked: messagesWithImages >= 10, xpReward: 100 },
    ];

    /* ─── Calculate XP ─── */
    let xp = 0;
    // +10 per trade
    xp += totalTrades * 10;
    // +15 per daily bias filled
    xp += biasDays.length * 15;
    // +5 per win
    xp += wins.length * 5;
    // +100 per badge unlocked
    xp += badges.filter((b) => b.unlocked).length * 100;
    // +50 per 7-day streak (floor of consecutive days / 7)
    xp += Math.floor(consecutiveTradeDays / 7) * 50;

    const level = getLevel(xp);

    /* ─── Daily quests ─── */
    const today = new Date().toISOString().slice(0, 10);
    const todayQuests = getDailyQuests(today);

    const todayTrades = trades.filter((t) => t.date.toISOString().slice(0, 10) === today);
    const todayBias = dailyPlans.some((dp) => dp.date.toISOString().slice(0, 10) === today && dp.bias && dp.bias.trim() !== "");
    const todayMessages = chatMessages.some((m) => m.createdAt.toISOString().slice(0, 10) === today);

    const dailyQuests: DailyQuest[] = todayQuests.map((q) => {
      let completed = false;
      if (q.id === "log3") completed = todayTrades.length >= 3;
      if (q.id === "bias") completed = todayBias;
      if (q.id === "review") completed = todayTrades.length >= 1; // simplification
      if (q.id === "chat") completed = todayMessages;
      if (q.id === "cot") completed = false; // Can't track page visits without extra storage
      return { id: q.id, title: q.title, icon: q.icon, completed };
    });

    return NextResponse.json({
      badges,
      xp,
      level,
      dailyQuests,
      stats: {
        totalTrades,
        winRate: Math.round(winRate * 10) / 10,
        winStreak,
        profitFactor: Math.round(profitFactor * 100) / 100,
        consecutiveTradeDays,
        totalMessages,
        biasDaysFilled: biasDays.length,
      },
    });
  } catch (error) {
    console.error("GET gamification error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
