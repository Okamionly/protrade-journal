import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Return list of user IDs the current user follows
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });

    return NextResponse.json({
      followingIds: follows.map((f) => f.followingId),
    });
  } catch (error) {
    console.error("Follow list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
