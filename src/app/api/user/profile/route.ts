import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        publicProfile: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Fetch trades for statistics
    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        asset: true,
        direction: true,
        entry: true,
        exit: true,
        sl: true,
        tp: true,
        lots: true,
        result: true,
        strategy: true,
        date: true,
        duration: true,
        commission: true,
        swap: true,
      },
      orderBy: { date: "asc" },
    });

    // Calculate trading statistics
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const totalPnl = trades.reduce((sum, t) => sum + t.result, 0);
    const totalCommissions = trades.reduce((sum, t) => sum + (t.commission || 0) + (t.swap || 0), 0);
    const netPnl = totalPnl - totalCommissions;

    const bestTrade = totalTrades > 0 ? Math.max(...trades.map((t) => t.result)) : 0;
    const worstTrade = totalTrades > 0 ? Math.min(...trades.map((t) => t.result)) : 0;

    const grossProfit = wins.reduce((sum, t) => sum + t.result, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.result, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Average RR ratio
    let avgRR = 0;
    const rrTrades = trades.filter((t) => t.sl && t.entry && t.exit !== null && t.exit !== undefined);
    if (rrTrades.length > 0) {
      const rrValues = rrTrades.map((t) => {
        const risk = Math.abs(t.entry - t.sl);
        const reward = Math.abs((t.exit || t.entry) - t.entry);
        return risk > 0 ? reward / risk : 0;
      });
      avgRR = rrValues.reduce((s, v) => s + v, 0) / rrValues.length;
    }

    // Trading streaks
    let currentStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;
    let bestWinStreak = 0;
    let bestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (const trade of trades) {
      if (trade.result > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        if (tempWinStreak > bestWinStreak) bestWinStreak = tempWinStreak;
      } else if (trade.result < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        if (tempLossStreak > bestLossStreak) bestLossStreak = tempLossStreak;
      } else {
        tempWinStreak = 0;
        tempLossStreak = 0;
      }
    }
    // Current streak from the end
    for (let i = trades.length - 1; i >= 0; i--) {
      const t = trades[i];
      if (i === trades.length - 1) {
        if (t.result > 0) { currentStreakType = "win"; currentStreak = 1; }
        else if (t.result < 0) { currentStreakType = "loss"; currentStreak = 1; }
        else break;
      } else {
        if (currentStreakType === "win" && t.result > 0) currentStreak++;
        else if (currentStreakType === "loss" && t.result < 0) currentStreak++;
        else break;
      }
    }

    // Favorite assets (top 3)
    const assetCounts: Record<string, number> = {};
    trades.forEach((t) => { assetCounts[t.asset] = (assetCounts[t.asset] || 0) + 1; });
    const favoriteAssets = Object.entries(assetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count, percentage: totalTrades > 0 ? Math.round((count / totalTrades) * 100) : 0 }));

    // Preferred session (based on trade hours)
    const sessionCounts = { asian: 0, london: 0, newYork: 0, overlap: 0 };
    trades.forEach((t) => {
      const hour = new Date(t.date).getUTCHours();
      if (hour >= 0 && hour < 8) sessionCounts.asian++;
      else if (hour >= 8 && hour < 13) sessionCounts.london++;
      else if (hour >= 13 && hour < 17) sessionCounts.overlap++;
      else sessionCounts.newYork++;
    });
    const preferredSession = Object.entries(sessionCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Average holding time (duration field is in minutes)
    const tradesWithDuration = trades.filter((t) => t.duration && t.duration > 0);
    const avgHoldingTime = tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((s, t) => s + (t.duration || 0), 0) / tradesWithDuration.length
      : 0;

    // Most used strategy
    const strategyCounts: Record<string, number> = {};
    trades.forEach((t) => {
      if (t.strategy) {
        strategyCounts[t.strategy] = (strategyCounts[t.strategy] || 0) + 1;
      }
    });
    const mostUsedStrategy = Object.entries(strategyCounts)
      .sort((a, b) => b[1] - a[1])[0] || null;

    // Average trade result
    const avgResult = totalTrades > 0 ? totalPnl / totalTrades : 0;

    return NextResponse.json({
      ...user,
      stats: {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100,
        totalPnl: Math.round(netPnl * 100) / 100,
        grossPnl: Math.round(totalPnl * 100) / 100,
        avgRR: Math.round(avgRR * 100) / 100,
        avgResult: Math.round(avgResult * 100) / 100,
        currentStreak,
        currentStreakType,
        bestWinStreak,
        bestLossStreak,
        favoriteAssets,
        preferredSession: preferredSession ? { session: preferredSession[0], count: preferredSession[1] } : null,
        avgHoldingTime: Math.round(avgHoldingTime),
        mostUsedStrategy: mostUsedStrategy ? { name: mostUsedStrategy[0], count: mostUsedStrategy[1] } : null,
        totalWins: wins.length,
        totalLosses: losses.length,
      },
    });
  } catch (error) {
    console.error("GET user/profile error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { name, balance, email, publicProfile } = body;

    const updateData: Record<string, unknown> = {};

    if (typeof publicProfile === "boolean") {
      updateData.publicProfile = publicProfile;
    }

    if (typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (typeof balance === "number" && balance >= 0) {
      updateData.balance = balance;
    }

    if (typeof email === "string" && email.trim().length > 0) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: "Format email invalide" }, { status: 400 });
      }
      // Check if email already taken
      const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existing && existing.id !== session.user.id) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
      }
      updateData.email = email.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        publicProfile: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH user/profile error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
