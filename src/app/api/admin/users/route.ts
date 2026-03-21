import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (currentUser?.role !== "ADMIN")
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        balance: u.balance,
        createdAt: u.createdAt.toISOString(),
        tradeCount: u._count.trades,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET admin/users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (currentUser?.role !== "ADMIN")
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");
    if (!userId)
      return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // Prevent self-deletion
    if (userId === session.user.id)
      return NextResponse.json(
        { error: "Impossible de supprimer votre propre compte" },
        { status: 400 }
      );

    // Delete all related data in order
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { userId } }),
      prisma.tradeTag.deleteMany({ where: { trade: { userId } } }),
      prisma.screenshot.deleteMany({ where: { trade: { userId } } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.trade.deleteMany({ where: { userId } }),
      prisma.dailyPlan.deleteMany({ where: { userId } }),
      prisma.strategy.deleteMany({ where: { userId } }),
      prisma.tag.deleteMany({ where: { userId } }),
      prisma.monthlyGoal.deleteMany({ where: { userId } }),
      prisma.tradingRule.deleteMany({ where: { userId } }),
      prisma.vipPost.deleteMany({ where: { authorId: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE admin/users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
