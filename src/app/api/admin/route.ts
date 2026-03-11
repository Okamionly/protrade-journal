import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "protrade-admin-2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      balance: true,
      createdAt: true,
      _count: {
        select: { trades: true },
      },
      trades: {
        select: {
          id: true,
          date: true,
          asset: true,
          direction: true,
          strategy: true,
          entry: true,
          exit: true,
          sl: true,
          tp: true,
          lots: true,
          result: true,
          emotion: true,
          tags: true,
          createdAt: true,
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    totalUsers: users.length,
    totalTrades: users.reduce((sum, u) => sum + u._count.trades, 0),
    totalProfit: users.reduce(
      (sum, u) => sum + u.trades.reduce((s, t) => s + t.result, 0),
      0
    ),
  };

  return NextResponse.json({ users, stats });
}
