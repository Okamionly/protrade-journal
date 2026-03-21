import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN")
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const now = new Date();
    const todayStart = new Date(now.toISOString().slice(0, 10));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalTrades,
      vipCount,
      adminCount,
      newUsersThisWeek,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.trade.count(),
      prisma.user.count({ where: { role: "VIP" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Active users today = users who created a trade today (best proxy without lastLogin field)
    const activeToday = await prisma.trade.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
      distinct: ["userId"],
    });

    return NextResponse.json({
      totalUsers,
      totalTrades,
      vipCount,
      adminCount,
      newUsersThisWeek,
      activeUsersToday: activeToday.length,
      recentSignups: recentSignups.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET admin/stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
