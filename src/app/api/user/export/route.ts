import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, trades, strategies, tags, dailyPlans, monthlyGoals, tradingRules] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, balance: true, createdAt: true },
        }),
        prisma.trade.findMany({
          where: { userId },
          include: { screenshots: true, tradeTags: { include: { tag: true } } },
          orderBy: { date: "desc" },
        }),
        prisma.strategy.findMany({ where: { userId } }),
        prisma.tag.findMany({ where: { userId } }),
        prisma.dailyPlan.findMany({ where: { userId }, orderBy: { date: "desc" } }),
        prisma.monthlyGoal.findMany({ where: { userId } }),
        prisma.tradingRule.findMany({ where: { userId }, orderBy: { order: "asc" } }),
      ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      trades,
      strategies,
      tags,
      dailyPlans,
      monthlyGoals,
      tradingRules,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="marketphase-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("GET user/export error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
