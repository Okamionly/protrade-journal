import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete all related data in order (respecting foreign keys)
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { userId } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.tradingRule.deleteMany({ where: { userId } }),
      prisma.monthlyGoal.deleteMany({ where: { userId } }),
      prisma.dailyPlan.deleteMany({ where: { userId } }),
      prisma.tradeTag.deleteMany({ where: { trade: { userId } } }),
      prisma.screenshot.deleteMany({ where: { trade: { userId } } }),
      prisma.trade.deleteMany({ where: { userId } }),
      prisma.tag.deleteMany({ where: { userId } }),
      prisma.strategy.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ message: "Compte supprimé avec succès" });
  } catch (error) {
    console.error("POST user/delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
