import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete trade-related data in order (respecting foreign keys)
    await prisma.$transaction([
      prisma.tradeTag.deleteMany({ where: { trade: { userId } } }),
      prisma.screenshot.deleteMany({ where: { trade: { userId } } }),
      prisma.chatMessage.deleteMany({ where: { tradeId: { not: null }, trade: { userId } } }),
      prisma.trade.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ message: "Tous les trades ont été supprimés" });
  } catch (error) {
    console.error("DELETE user/delete-trades error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
