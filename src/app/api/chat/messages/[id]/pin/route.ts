import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Admin check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const { id } = await params;

    const message = await prisma.chatMessage.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: { isPinned: !message.isPinned },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PIN message error:", error);
    return NextResponse.json({ error: "Erreur lors de l'épinglage" }, { status: 500 });
  }
}
