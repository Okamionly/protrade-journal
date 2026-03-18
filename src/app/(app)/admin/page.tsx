import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  // Stats
  const [
    totalUsers,
    totalTrades,
    vipCount,
    tradesToday,
    activeUsersRaw,
    allUsers,
    recentTrades,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count(),
    prisma.user.count({ where: { role: "VIP" } }),
    prisma.trade.count({
      where: {
        createdAt: {
          gte: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
    }),
    prisma.trade.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        createdAt: true,
        _count: { select: { trades: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trade.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        date: true,
        asset: true,
        direction: true,
        result: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    totalTrades,
    activeUsers: activeUsersRaw.length,
    tradesToday,
    vipCount,
    estimatedRevenue: vipCount * 9.99,
  };

  const usersData = allUsers.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    tradeCount: u._count.trades,
  }));

  const recentTradesData = recentTrades.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    asset: t.asset,
    direction: t.direction,
    result: t.result,
    createdAt: t.createdAt.toISOString(),
    userName: t.user.name || t.user.email,
  }));

  return (
    <AdminDashboard
      stats={stats}
      users={usersData}
      recentTrades={recentTradesData}
    />
  );
}
