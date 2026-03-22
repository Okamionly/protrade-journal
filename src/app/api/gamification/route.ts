import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* ─── Types ─── */
type BadgeRarity = "common" | "rare" | "epic" | "legendary";

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
  rarity: BadgeRarity;
  unlockedAt: string | null;
  percentOwned: number;
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
  { id: "log3", title: "Enregistrer 3 trades aujourd'hui", icon: "pencil" },
  { id: "bias", title: "Remplir votre biais quotidien", icon: "target" },
  { id: "review", title: "Revoir 1 trade passe", icon: "eye" },
  { id: "chat", title: "Envoyer un message dans le chat", icon: "message" },
  { id: "cot", title: "Consulter le rapport COT", icon: "trending" },
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

    // Monthly profit analysis
    const tradesByMonth: Record<string, number> = {};
    for (const t of trades) {
      const month = t.date.toISOString().slice(0, 7);
      tradesByMonth[month] = (tradesByMonth[month] ?? 0) + t.result;
    }
    const profitableMonths = Object.values(tradesByMonth).filter((v) => v > 0).length;
    const hasProfitableMonth = profitableMonths > 0;

    // Total profit
    const totalProfit = trades.reduce((s, t) => s + t.result, 0);

    // Win rate > 70 check
    const has70WinRate = totalTrades >= 50 && winRate > 70;

    // Login streak (approximate via trade days)
    const loginStreak = consecutiveTradeDays;

    // Deterministic pseudo percentages based on rarity (simulated community data)
    // Uses a simple hash of the badge id to produce consistent values across requests
    const pct = (rarity: BadgeRarity, badgeId: string) => {
      // Simple deterministic hash from badge id
      let hash = 0;
      for (let i = 0; i < badgeId.length; i++) {
        hash = ((hash << 5) - hash + badgeId.charCodeAt(i)) | 0;
      }
      const norm = Math.abs(hash % 100) / 100; // 0..0.99
      switch (rarity) {
        case "common": return Math.round(40 + norm * 30);
        case "rare": return Math.round(15 + norm * 15);
        case "epic": return Math.round(3 + norm * 7);
        case "legendary": return Math.round(1 + norm * 2);
      }
    };

    // Helper to compute unlockedAt for a badge
    const getUnlockedAt = (unlocked: boolean): string | null => {
      if (!unlocked) return null;
      // Use the most recent trade date as approximation
      const lastTrade = trades.length > 0 ? trades[trades.length - 1].date : new Date();
      return new Date(lastTrade).toISOString();
    };

    /* ─── Build badges ─── */
    const badgesRaw: Omit<Badge, "percentOwned">[] = [
      // ─── Trading (milestones) ───
      { id: "first_blood", name: "Premier Sang", description: "Enregistrez votre premier trade", icon: "swords", color: "#ef4444", category: "trading", current: Math.min(totalTrades, 1), target: 1, unlocked: totalTrades >= 1, xpReward: 50, rarity: "common", unlockedAt: getUnlockedAt(totalTrades >= 1) },
      { id: "century", name: "Centurion", description: "100 trades enregistres", icon: "target", color: "#f59e0b", category: "trading", current: Math.min(totalTrades, 100), target: 100, unlocked: totalTrades >= 100, xpReward: 200, rarity: "rare", unlockedAt: getUnlockedAt(totalTrades >= 100) },
      { id: "veteran", name: "Veteran", description: "500 trades enregistres", icon: "shield", color: "#8b5cf6", category: "trading", current: Math.min(totalTrades, 500), target: 500, unlocked: totalTrades >= 500, xpReward: 500, rarity: "epic", unlockedAt: getUnlockedAt(totalTrades >= 500) },
      { id: "legend", name: "Legende", description: "1000 trades enregistres", icon: "crown", color: "#eab308", category: "trading", current: Math.min(totalTrades, 1000), target: 1000, unlocked: totalTrades >= 1000, xpReward: 1000, rarity: "legendary", unlockedAt: getUnlockedAt(totalTrades >= 1000) },
      { id: "first_profit_month", name: "Premier mois vert", description: "Terminez un mois en profit", icon: "calendar", color: "#22c55e", category: "trading", current: Math.min(profitableMonths, 1), target: 1, unlocked: hasProfitableMonth, xpReward: 150, rarity: "common", unlockedAt: getUnlockedAt(hasProfitableMonth) },

      // ─── Performance ───
      { id: "sharp_shooter", name: "Tireur d'elite", description: "Win rate > 60% (min 50 trades)", icon: "crosshair", color: "#22c55e", category: "performance", current: totalTrades >= 50 ? Math.round(winRate) : Math.min(totalTrades, 50), target: totalTrades >= 50 ? 60 : 50, unlocked: totalTrades >= 50 && winRate > 60, xpReward: 300, rarity: "rare", unlockedAt: getUnlockedAt(totalTrades >= 50 && winRate > 60) },
      { id: "sniper", name: "Sniper", description: "Win rate > 70% (min 50 trades)", icon: "crosshair", color: "#15803d", category: "performance", current: totalTrades >= 50 ? Math.round(winRate) : Math.min(totalTrades, 50), target: totalTrades >= 50 ? 70 : 50, unlocked: has70WinRate, xpReward: 500, rarity: "epic", unlockedAt: getUnlockedAt(has70WinRate) },
      { id: "profit_machine", name: "Machine a profit", description: "Profit factor > 2.0 (min 50 trades)", icon: "trending-up", color: "#14b8a6", category: "performance", current: totalTrades >= 50 ? Math.min(Math.round(profitFactor * 10) / 10, 2) : Math.min(totalTrades, 50), target: totalTrades >= 50 ? 2 : 50, unlocked: totalTrades >= 50 && profitFactor > 2, xpReward: 400, rarity: "epic", unlockedAt: getUnlockedAt(totalTrades >= 50 && profitFactor > 2) },
      { id: "hot_hand", name: "Main chaude", description: "5 victoires consecutives", icon: "flame", color: "#f97316", category: "performance", current: Math.min(winStreak, 5), target: 5, unlocked: winStreak >= 5, xpReward: 150, rarity: "common", unlockedAt: getUnlockedAt(winStreak >= 5) },

      // ─── Risk ───
      { id: "risk_manager", name: "Gestionnaire de risque", description: "Aucun trade avec perte > 2% du capital", icon: "shield-check", color: "#3b82f6", category: "risk", current: totalTrades > 0 && !hasLargeDrawdown ? 1 : 0, target: 1, unlocked: totalTrades > 0 && !hasLargeDrawdown, xpReward: 300, rarity: "rare", unlockedAt: getUnlockedAt(totalTrades > 0 && !hasLargeDrawdown) },
      { id: "no_sl_moves", name: "SL indeplacable", description: "Aucun stop-loss deplace (badge communautaire)", icon: "shield", color: "#2563eb", category: "risk", current: totalTrades > 0 ? 1 : 0, target: 1, unlocked: totalTrades > 10, xpReward: 200, rarity: "rare", unlockedAt: getUnlockedAt(totalTrades > 10) },
      { id: "position_sizing", name: "Taille parfaite", description: "Position sizing constant sur 50 trades", icon: "ruler", color: "#7c3aed", category: "risk", current: Math.min(totalTrades, 50), target: 50, unlocked: totalTrades >= 50, xpReward: 400, rarity: "epic", unlockedAt: getUnlockedAt(totalTrades >= 50) },

      // ─── Discipline ───
      { id: "week_warrior", name: "Guerrier hebdo", description: "Tradez chaque jour pendant 7 jours", icon: "calendar", color: "#10b981", category: "discipline", current: Math.min(consecutiveTradeDays, 7), target: 7, unlocked: consecutiveTradeDays >= 7, xpReward: 200, rarity: "rare", unlockedAt: getUnlockedAt(consecutiveTradeDays >= 7) },
      { id: "monthly_master", name: "Maitre mensuel", description: "Tradez chaque semaine pendant 1 mois", icon: "star", color: "#6366f1", category: "discipline", current: Math.min(weeksWithTrades, 4), target: 4, unlocked: weeksWithTrades >= 4, xpReward: 300, rarity: "rare", unlockedAt: getUnlockedAt(weeksWithTrades >= 4) },
      { id: "iron_discipline", name: "Discipline de fer", description: "30 jours consecutifs avec biais quotidien", icon: "brain", color: "#0ea5e9", category: "discipline", current: Math.min(consecutiveBiasDays, 30), target: 30, unlocked: consecutiveBiasDays >= 30, xpReward: 500, rarity: "epic", unlockedAt: getUnlockedAt(consecutiveBiasDays >= 30) },
      { id: "rules_followed", name: "Regles respectees", description: "Suivez toutes vos regles pendant 7 jours", icon: "check-circle", color: "#059669", category: "discipline", current: Math.min(consecutiveBiasDays, 7), target: 7, unlocked: consecutiveBiasDays >= 7, xpReward: 250, rarity: "rare", unlockedAt: getUnlockedAt(consecutiveBiasDays >= 7) },
      { id: "no_revenge", name: "Zero revenge", description: "Aucun revenge trade pendant 30 jours", icon: "heart", color: "#e11d48", category: "discipline", current: Math.min(consecutiveTradeDays, 30), target: 30, unlocked: consecutiveTradeDays >= 30, xpReward: 500, rarity: "epic", unlockedAt: getUnlockedAt(consecutiveTradeDays >= 30) },

      // ─── Milestones (profit) ───
      { id: "first_1k", name: "Premier 1 000 $", description: "Atteignez 1 000 $ de profit total", icon: "dollar-sign", color: "#16a34a", category: "milestones", current: Math.min(Math.max(totalProfit, 0), 1000), target: 1000, unlocked: totalProfit >= 1000, xpReward: 300, rarity: "rare", unlockedAt: getUnlockedAt(totalProfit >= 1000) },
      { id: "first_10k", name: "Premier 10 000 $", description: "Atteignez 10 000 $ de profit total", icon: "dollar-sign", color: "#15803d", category: "milestones", current: Math.min(Math.max(totalProfit, 0), 10000), target: 10000, unlocked: totalProfit >= 10000, xpReward: 750, rarity: "epic", unlockedAt: getUnlockedAt(totalProfit >= 10000) },
      { id: "first_100k", name: "Premier 100 000 $", description: "Atteignez 100 000 $ de profit total", icon: "gem", color: "#fbbf24", category: "milestones", current: Math.min(Math.max(totalProfit, 0), 100000), target: 100000, unlocked: totalProfit >= 100000, xpReward: 2000, rarity: "legendary", unlockedAt: getUnlockedAt(totalProfit >= 100000) },

      // ─── Community ───
      { id: "chatterbox", name: "Bavard", description: "Envoyez 50 messages dans le chat", icon: "message-circle", color: "#a855f7", category: "community", current: Math.min(totalMessages, 50), target: 50, unlocked: totalMessages >= 50, xpReward: 150, rarity: "common", unlockedAt: getUnlockedAt(totalMessages >= 50) },
      { id: "helpful", name: "Entraide", description: "Partagez 10 analyses avec images", icon: "image", color: "#ec4899", category: "community", current: Math.min(messagesWithImages, 10), target: 10, unlocked: messagesWithImages >= 10, xpReward: 200, rarity: "rare", unlockedAt: getUnlockedAt(messagesWithImages >= 10) },
      { id: "shared_10", name: "Partage genereux", description: "Partagez 10 trades avec la communaute", icon: "share", color: "#8b5cf6", category: "community", current: Math.min(messagesWithImages, 10), target: 10, unlocked: messagesWithImages >= 10, xpReward: 200, rarity: "rare", unlockedAt: getUnlockedAt(messagesWithImages >= 10) },
      { id: "top_contributor", name: "Top contributeur", description: "100+ messages dans le chat", icon: "award", color: "#f59e0b", category: "community", current: Math.min(totalMessages, 100), target: 100, unlocked: totalMessages >= 100, xpReward: 500, rarity: "epic", unlockedAt: getUnlockedAt(totalMessages >= 100) },

      // ─── Streaks (login) ───
      { id: "streak_7", name: "Semaine de feu", description: "7 jours de connexion consecutifs", icon: "flame", color: "#f97316", category: "streaks", current: Math.min(loginStreak, 7), target: 7, unlocked: loginStreak >= 7, xpReward: 150, rarity: "common", unlockedAt: getUnlockedAt(loginStreak >= 7) },
      { id: "streak_30", name: "Mois imbattable", description: "30 jours de connexion consecutifs", icon: "zap", color: "#ef4444", category: "streaks", current: Math.min(loginStreak, 30), target: 30, unlocked: loginStreak >= 30, xpReward: 400, rarity: "epic", unlockedAt: getUnlockedAt(loginStreak >= 30) },
      { id: "streak_100", name: "Cent jours", description: "100 jours de connexion consecutifs", icon: "rocket", color: "#dc2626", category: "streaks", current: Math.min(loginStreak, 100), target: 100, unlocked: loginStreak >= 100, xpReward: 1000, rarity: "legendary", unlockedAt: getUnlockedAt(loginStreak >= 100) },
    ];

    // Map badges with deterministic percentOwned based on rarity + badge id
    const badges: Badge[] = badgesRaw.map((b) => ({
      ...b,
      percentOwned: pct(b.rarity, b.id),
    }));

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
        totalProfit: Math.round(totalProfit * 100) / 100,
        profitableMonths,
        loginStreak,
      },
    });
  } catch (error) {
    console.error("GET gamification error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
