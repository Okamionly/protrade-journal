import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_EMOJIS = ["👍", "❤️", "🔥", "💰", "📈", "📉", "🎯", "💪", "😂", "🤔", "👀", "⚡", "💎", "🚀", "✅", "❌", "🏆", "😱", "🤝", "👏"];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId et emoji requis" }, { status: 400 });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Emoji non autorisé" }, { status: 400 });
    }

    // Check message exists
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    // Toggle: if reaction exists, remove it; otherwise, create it
    const existing = await prisma.reaction.findUnique({
      where: { userId_messageId_emoji: { userId: session.user.id, messageId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        userId: session.user.id,
        messageId,
      },
    });

    return NextResponse.json({ action: "added", reaction });
  } catch (error) {
    console.error("POST reaction error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "messageId requis" }, { status: 400 });
    }

    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Group by emoji
    const grouped: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user.name || "Anonyme");
      if (r.userId === session.user.id) grouped[r.emoji].hasReacted = true;
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("GET reactions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
