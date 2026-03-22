import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const LIKE_EMOJI = "\u2764\uFE0F";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId requis" }, { status: 400 });
    }

    // Check message exists
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    // Toggle: if reaction exists, remove it; otherwise, create it
    const existing = await prisma.reaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId: session.user.id,
          messageId,
          emoji: LIKE_EMOJI,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: {
          emoji: LIKE_EMOJI,
          userId: session.user.id,
          messageId,
        },
      });
    }

    // Return current count and liked state
    const count = await prisma.reaction.count({
      where: { messageId, emoji: LIKE_EMOJI },
    });

    return NextResponse.json({ liked: !existing, count });
  } catch (error) {
    console.error("POST like error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "messageId requis" }, { status: 400 });
    }

    const count = await prisma.reaction.count({
      where: { messageId, emoji: LIKE_EMOJI },
    });

    const userReaction = await prisma.reaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId: session.user.id,
          messageId,
          emoji: LIKE_EMOJI,
        },
      },
    });

    return NextResponse.json({ liked: !!userReaction, count });
  } catch (error) {
    console.error("GET like error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
