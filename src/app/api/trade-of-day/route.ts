import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VOTE_EMOJI = "⭐";

/**
 * GET /api/trade-of-day
 * Returns today's top 5 shared trades ranked by star-vote count, plus the current winner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Today boundaries (UTC day)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch today's shared trade messages (messages that have a tradeId)
    const tradeMessages = await prisma.chatMessage.findMany({
      where: {
        tradeId: { not: null },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        trade: {
          select: {
            id: true,
            asset: true,
            direction: true,
            result: true,
            strategy: true,
            entry: true,
            exit: true,
            sl: true,
            tp: true,
            lots: true,
            date: true,
          },
        },
        reactions: {
          where: { emoji: VOTE_EMOJI },
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Rank by star-vote count
    const ranked = tradeMessages
      .filter((m) => m.trade !== null)
      .map((m) => ({
        messageId: m.id,
        content: m.content,
        author: m.user,
        trade: m.trade!,
        votes: m.reactions.length,
        hasVoted: m.reactions.some((r) => r.userId === session.user!.id),
        createdAt: m.createdAt,
      }))
      .sort((a, b) => b.votes - a.votes || b.trade.result - a.trade.result);

    const top5 = ranked.slice(0, 5);
    const winner = top5.length > 0 ? top5[0] : null;

    return NextResponse.json({ top5, winner });
  } catch (error) {
    console.error("GET trade-of-day error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/trade-of-day
 * Cast a vote (star reaction) on a shared trade message.
 * One vote per user per day across all trades.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { tradeMessageId } = body;

    if (!tradeMessageId) {
      return NextResponse.json({ error: "tradeMessageId requis" }, { status: 400 });
    }

    // Verify message exists and has a trade
    const message = await prisma.chatMessage.findUnique({
      where: { id: tradeMessageId },
      select: { id: true, tradeId: true, createdAt: true },
    });

    if (!message || !message.tradeId) {
      return NextResponse.json({ error: "Trade partagé introuvable" }, { status: 404 });
    }

    // Check if user already voted today on ANY trade (one vote per user per day)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const existingVoteToday = await prisma.reaction.findFirst({
      where: {
        userId: session.user.id,
        emoji: VOTE_EMOJI,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    // If already voted on this same message, toggle (remove vote)
    if (existingVoteToday && existingVoteToday.messageId === tradeMessageId) {
      await prisma.reaction.delete({ where: { id: existingVoteToday.id } });
      return NextResponse.json({ action: "removed" });
    }

    // If voted on a different message today, switch vote
    if (existingVoteToday) {
      await prisma.reaction.delete({ where: { id: existingVoteToday.id } });
    }

    // Create the vote
    const reaction = await prisma.reaction.create({
      data: {
        emoji: VOTE_EMOJI,
        userId: session.user.id,
        messageId: tradeMessageId,
      },
    });

    return NextResponse.json({ action: "added", reaction });
  } catch (error) {
    console.error("POST trade-of-day error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
