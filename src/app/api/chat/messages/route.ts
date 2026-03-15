import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const cursor = searchParams.get("cursor");
    const after = searchParams.get("after");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    if (!roomId) {
      return NextResponse.json({ error: "roomId requis" }, { status: 400 });
    }

    // If "after" is provided, fetch only newer messages (for polling)
    if (after) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          roomId,
          createdAt: { gt: new Date(after) },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          trade: {
            select: {
              id: true,
              asset: true,
              direction: true,
              strategy: true,
              entry: true,
              exit: true,
              lots: true,
              result: true,
              date: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      return NextResponse.json({ messages, nextCursor: null });
    }

    // Regular pagination with cursor
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        trade: {
          select: {
            id: true,
            asset: true,
            direction: true,
            strategy: true,
            entry: true,
            exit: true,
            lots: true,
            result: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const last = messages.pop();
      nextCursor = last!.id;
    }

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.roomId || !body.content?.trim()) {
      return NextResponse.json({ error: "roomId et contenu requis" }, { status: 400 });
    }

    if (body.content.length > 1000) {
      return NextResponse.json({ error: "Message trop long (max 1000 caractères)" }, { status: 400 });
    }

    // Verify room exists
    const room = await prisma.chatRoom.findUnique({ where: { id: body.roomId } });
    if (!room) {
      return NextResponse.json({ error: "Salon non trouvé" }, { status: 404 });
    }

    // If tradeId provided, verify ownership
    if (body.tradeId) {
      const trade = await prisma.trade.findFirst({
        where: { id: body.tradeId, userId: session.user.id },
      });
      if (!trade) {
        return NextResponse.json({ error: "Trade non trouvé ou non autorisé" }, { status: 403 });
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: body.content.trim(),
        imageUrl: body.imageUrl || null,
        userId: session.user.id,
        roomId: body.roomId,
        tradeId: body.tradeId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        trade: {
          select: {
            id: true,
            asset: true,
            direction: true,
            strategy: true,
            entry: true,
            exit: true,
            lots: true,
            result: true,
            date: true,
          },
        },
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("POST message error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
