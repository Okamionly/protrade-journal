import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Return suggested users to follow (most active traders the current user doesn't follow)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Get IDs the current user already follows
    const alreadyFollowing = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const followingIds = alreadyFollowing.map((f) => f.followingId);

    // Find users with most shared trades (ChatMessages with a tradeId) who are not followed
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [...followingIds, session.user.id] },
        banned: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            chatMessages: true,
            trades: true,
          },
        },
      },
      orderBy: {
        chatMessages: { _count: "desc" },
      },
      take: 5,
    });

    // Compute win rate for each user
    const result = await Promise.all(
      users.map(async (user) => {
        const trades = await prisma.trade.findMany({
          where: { userId: user.id },
          select: { result: true },
        });
        const totalTrades = trades.length;
        const wins = trades.filter((t) => t.result > 0).length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        return {
          id: user.id,
          name: user.name,
          handle: user.email.split("@")[0].toLowerCase(),
          role: user.role,
          winRate: Math.round(winRate * 10) / 10,
          sharedTrades: user._count.chatMessages,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Suggested users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
