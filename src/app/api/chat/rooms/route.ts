import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rooms = await prisma.chatRoom.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const formatted = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      order: room.order,
      messageCount: room._count.messages,
      lastActivity: room.messages[0]?.createdAt || null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET rooms error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-admin-secret");
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const room = await prisma.chatRoom.create({
      data: {
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        order: body.order || 0,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("POST room error:", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
