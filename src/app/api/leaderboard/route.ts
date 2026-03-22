import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Period = "week" | "month" | "all";
type Metric = "pnl" | "winrate" | "trades" | "streak";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarHash: string;
  metricValue: number;
  tradesCount: number;
  badge: "VIP" | "ADMIN" | "FREE";
  isCurrentUser: boolean;
}

function getDateFilter(period: Period): Date | null {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null; // all time
}

// Simple hash for avatar gradient (deterministic color from userId)
function avatarHash(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(6, "0").slice(0, 6);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check VIP/ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, publicProfile: true },
    });

    if (!currentUser || (currentUser.role !== "VIP" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Accès VIP requis" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as Period;
    const metric = (searchParams.get("metric") || "pnl") as Metric;

    if (!["week", "month", "all"].includes(period)) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }
    if (!["pnl", "winrate", "trades", "streak"].includes(metric)) {
      return NextResponse.json({ error: "Métrique invalide" }, { status: 400 });
    }

    const dateFilter = getDateFilter(period);

    // Get all users who opted into public profile
    const publicUsers = await prisma.user.findMany({
      where: { publicProfile: true },
      select: { id: true, name: true, role: true },
    });

    if (publicUsers.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        currentUserEntry: null,
        period,
        metric,
      });
    }

    const userIds = publicUsers.map((u) => u.id);

    // Fetch trades for all public users in the selected period
    const trades = await prisma.trade.findMany({
      where: {
        userId: { in: userIds },
        ...(dateFilter ? { date: { gte: dateFilter } } : {}),
      },
      select: {
        userId: true,
        result: true,
        commission: true,
        swap: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    // Group trades by user
    const tradesByUser: Record<string, typeof trades> = {};
    for (const t of trades) {
      if (!tradesByUser[t.userId]) tradesByUser[t.userId] = [];
      tradesByUser[t.userId].push(t);
    }

    // Calculate stats per user
    const entries: Omit<LeaderboardEntry, "rank" | "isCurrentUser">[] = [];

    for (const user of publicUsers) {
      const userTrades = tradesByUser[user.id] || [];
      const tradesCount = userTrades.length;

      if (tradesCount === 0) continue; // skip users with no trades in period

      const wins = userTrades.filter((t) => t.result > 0).length;
      const winRate = tradesCount > 0 ? (wins / tradesCount) * 100 : 0;

      const totalPnl = userTrades.reduce(
        (sum, t) => sum + t.result - (t.commission || 0) - (t.swap || 0),
        0
      );

      // Best win streak
      let bestWinStreak = 0;
      let currentStreak = 0;
      for (const t of userTrades) {
        if (t.result > 0) {
          currentStreak++;
          if (currentStreak > bestWinStreak) bestWinStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }

      let metricValue = 0;
      switch (metric) {
        case "pnl":
          metricValue = Math.round(totalPnl * 100) / 100;
          break;
        case "winrate":
          metricValue = Math.round(winRate * 100) / 100;
          break;
        case "trades":
          metricValue = tradesCount;
          break;
        case "streak":
          metricValue = bestWinStreak;
          break;
      }

      entries.push({
        userId: user.id,
        name: user.name || "Trader Anonyme",
        avatarHash: avatarHash(user.id),
        metricValue,
        tradesCount,
        badge:
          user.role === "VIP" ? "VIP" : user.role === "ADMIN" ? "ADMIN" : "FREE",
      });
    }

    // Sort descending by metric value
    entries.sort((a, b) => b.metricValue - a.metricValue);

    // Top 50
    const top50 = entries.slice(0, 50);

    // Add rank & isCurrentUser
    const leaderboard: LeaderboardEntry[] = top50.map((entry, i) => ({
      ...entry,
      rank: i + 1,
      isCurrentUser: entry.userId === session.user.id,
    }));

    // Find current user entry (even if not in top 50)
    let currentUserEntry: LeaderboardEntry | null = null;
    const currentIdx = entries.findIndex((e) => e.userId === session.user.id);
    if (currentIdx >= 0) {
      currentUserEntry = {
        ...entries[currentIdx],
        rank: currentIdx + 1,
        isCurrentUser: true,
      };
    }

    return NextResponse.json({
      leaderboard,
      currentUserEntry,
      period,
      metric,
    });
  } catch (error) {
    console.error("GET leaderboard error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
