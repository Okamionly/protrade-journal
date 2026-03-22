import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: Toggle follow/unfollow
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { userId } = await req.json();
    if (!userId || userId === session.user.id)
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({
        data: {
          followerId: session.user.id,
          followingId: userId,
        },
      });
    }

    const followerCount = await prisma.follow.count({
      where: { followingId: userId },
    });

    return NextResponse.json({
      following: !existing,
      followerCount,
    });
  } catch (error) {
    console.error("Follow toggle error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET: Get follow status + counts
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "userId requis" }, { status: 400 });

    const [following, followerCount, followingCount] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: userId,
          },
        },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return NextResponse.json({
      following: !!following,
      followerCount,
      followingCount,
    });
  } catch (error) {
    console.error("Follow status error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
