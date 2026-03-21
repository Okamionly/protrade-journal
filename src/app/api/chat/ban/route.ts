import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Admin check
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    // Cannot ban yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Impossible de vous bannir vous-même" }, { status: 400 });
    }

    // Cannot ban other admins
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, banned: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json({ error: "Impossible de bannir un administrateur" }, { status: 400 });
    }

    // Toggle ban
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { banned: !targetUser.banned },
      select: { id: true, name: true, banned: true },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      action: updated.banned ? "banned" : "unbanned",
    });
  } catch (error) {
    console.error("POST ban error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
