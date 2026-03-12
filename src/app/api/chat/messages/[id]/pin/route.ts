import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "protrade-admin-2026";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secret = req.headers.get("x-admin-secret");
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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
