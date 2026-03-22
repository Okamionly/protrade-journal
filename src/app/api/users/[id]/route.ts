import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Return user public profile
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user)
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    // Trade stats
    const trades = await prisma.trade.findMany({
      where: { userId: id },
      select: { result: true },
    });
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.result > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnl = trades.reduce((s, t) => s + t.result, 0);

    // Follow status
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: id,
        },
      },
    });

    // Recent shared trades in community
    const recentSharedTrades = await prisma.chatMessage.findMany({
      where: {
        userId: id,
        tradeId: { not: null },
      },
      include: {
        trade: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      handle: user.email.split("@")[0].toLowerCase(),
      role: user.role,
      joinDate: user.createdAt,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing: !!isFollowing,
      stats: {
        totalTrades,
        winRate: Math.round(winRate * 10) / 10,
        totalPnl: Math.round(totalPnl * 100) / 100,
      },
      recentSharedTrades: recentSharedTrades.map((m) => ({
        id: m.id,
        content: m.content,
        trade: m.trade,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
