import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface TradeRow {
  id: string;
  date: Date;
  asset: string;
  direction: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  strategy: string;
  commission: number | null;
  swap: number | null;
  createdAt: Date;
}

function computePublicStats(trades: TradeRow[]) {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalTrades = sorted.length;
  const wins = sorted.filter((t) => t.result > 0);
  const losses = sorted.filter((t) => t.result < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const grossProfit = wins.reduce((sum, t) => sum + t.result, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.result, 0));
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Average R:R
  const rrValues = sorted
    .filter((t) => t.exit !== null && t.sl !== 0)
    .map((t) => {
      const risk = Math.abs(t.entry - t.sl);
      if (risk === 0) return 0;
      const reward = Math.abs((t.exit ?? t.entry) - t.entry);
      return reward / risk;
    });
  const avgRR =
    rrValues.length > 0
      ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length
      : 0;

  // Favorite assets (top 3)
  const assetCount = new Map<string, number>();
  for (const t of sorted) {
    assetCount.set(t.asset, (assetCount.get(t.asset) || 0) + 1);
  }
  const favoriteAssets = Array.from(assetCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([asset, count]) => ({ asset, count }));

  // Monthly breakdown
  const monthlyMap = new Map<
    string,
    { pnl: number; trades: number; wins: number }
  >();
  for (const t of sorted) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || { pnl: 0, trades: 0, wins: 0 };
    existing.pnl += t.result;
    existing.trades++;
    if (t.result > 0) existing.wins++;
    monthlyMap.set(key, existing);
  }
  const monthlyBreakdown = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }));

  // Best month
  const bestMonth =
    monthlyBreakdown.length > 0
      ? monthlyBreakdown.reduce((best, m) => (m.pnl > best.pnl ? m : best))
      : null;

  // Equity curve (normalized to percentages for privacy)
  let cumPnL = 0;
  const equityCurve: { index: number; value: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    cumPnL += sorted[i].result;
    equityCurve.push({ index: i, value: cumPnL });
  }
  // Normalize: show shape only (0 to 100 scale)
  const maxAbs = Math.max(
    Math.abs(Math.min(...equityCurve.map((e) => e.value), 0)),
    Math.max(...equityCurve.map((e) => e.value), 1)
  );
  const normalizedCurve = equityCurve.map((e) => ({
    index: e.index,
    value: maxAbs > 0 ? (e.value / maxAbs) * 100 : 0,
  }));

  // Current streak
  let currentStreak = 0;
  let streakType: "win" | "loss" | "none" = "none";
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].result > 0) {
      if (streakType === "none") streakType = "win";
      if (streakType === "win") currentStreak++;
      else break;
    } else if (sorted[i].result < 0) {
      if (streakType === "none") streakType = "loss";
      if (streakType === "loss") currentStreak++;
      else break;
    } else {
      break;
    }
  }

  // Consecutive wins/losses max
  let maxConsWins = 0;
  let maxConsLosses = 0;
  let cw = 0;
  let cl = 0;
  for (const t of sorted) {
    if (t.result > 0) {
      cw++;
      cl = 0;
      if (cw > maxConsWins) maxConsWins = cw;
    } else if (t.result < 0) {
      cl++;
      cw = 0;
      if (cl > maxConsLosses) maxConsLosses = cl;
    } else {
      cw = 0;
      cl = 0;
    }
  }

  // Last 6 months performance
  const last6Months = monthlyBreakdown.slice(-6);

  return {
    totalTrades,
    winRate,
    profitFactor:
      profitFactor === Infinity ? 999 : profitFactor,
    avgRR,
    favoriteAssets,
    bestMonth,
    currentStreak,
    streakType,
    maxConsWins,
    maxConsLosses,
    normalizedCurve,
    last6Months,
    monthlyBreakdown,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);

    const user = await prisma.user.findFirst({
      where: { name: decodedUsername },
      select: {
        id: true,
        name: true,
        createdAt: true,
        trades: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            asset: true,
            direction: true,
            entry: true,
            exit: true,
            sl: true,
            tp: true,
            lots: true,
            result: true,
            strategy: true,
            commission: true,
            swap: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const stats = computePublicStats(user.trades as TradeRow[]);

    return NextResponse.json({
      user: {
        name: user.name,
        createdAt: user.createdAt,
        totalTrades: user.trades.length,
      },
      stats,
    });
  } catch (error) {
    console.error("Public profile error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
