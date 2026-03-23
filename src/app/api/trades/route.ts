import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  fireAndForget,
  checkPostTradeNotifications,
} from "@/lib/autoNotifications";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      include: { screenshots: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error("GET trades error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Liste d'IDs requise" }, { status: 400 });
    }

    // Verify all trades belong to user
    const trades = await prisma.trade.findMany({
      where: { id: { in: ids }, userId: session.user.id },
      select: { id: true },
    });

    const validIds = trades.map((t) => t.id);

    if (validIds.length === 0) {
      return NextResponse.json({ error: "Aucun trade trouvé" }, { status: 404 });
    }

    // Delete screenshots first, then trades
    await prisma.screenshot.deleteMany({ where: { tradeId: { in: validIds } } });
    await prisma.trade.deleteMany({ where: { id: { in: validIds } } });

    return NextResponse.json({ success: true, deleted: validIds.length });
  } catch (error) {
    console.error("DELETE trades (bulk) error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}

/* ── Auto-tagging helper (fire-and-forget) ──────────────────────── */

interface TradeForTag {
  id: string;
  date: Date;
  entry: number;
  sl: number;
  tp: number;
  result: number;
  tags: string | null;
}

async function autoTagTrade(
  tradeId: string,
  userId: string,
  trade: TradeForTag
) {
  const tags: string[] = [];

  // 1. R:R >= 3 → "Setup A+"
  const risk = Math.abs(trade.entry - trade.sl);
  const reward = Math.abs(trade.tp - trade.entry);
  if (risk > 0 && reward / risk >= 3) {
    tags.push("Setup A+");
  }

  // 2. London Open (7-9 UTC)
  const hourUTC = new Date(trade.date).getUTCHours();
  if (hourUTC >= 7 && hourUTC < 9) {
    tags.push("London Open");
  }

  // 3. NY Open (12-14 UTC)
  if (hourUTC >= 12 && hourUTC < 14) {
    tags.push("NY Open");
  }

  // 4 & 5. Compare with average wins/losses
  const allTrades = await prisma.trade.findMany({
    where: { userId },
    select: { result: true, date: true },
    orderBy: { date: "desc" },
  });

  const wins = allTrades.filter((t) => t.result > 0);
  const losses = allTrades.filter((t) => t.result < 0);

  if (wins.length > 0 && trade.result > 0) {
    const avgWin = wins.reduce((s, t) => s + t.result, 0) / wins.length;
    if (trade.result > avgWin * 2) {
      tags.push("Home Run");
    }
  }

  if (losses.length > 0 && trade.result < 0) {
    const avgLoss =
      Math.abs(losses.reduce((s, t) => s + t.result, 0)) / losses.length;
    if (Math.abs(trade.result) > avgLoss * 2) {
      tags.push("Bad Trade");
    }
  }

  // 6. Scalp: trade within 15 min of previous trade
  const tradeTime = new Date(trade.date).getTime();
  const previousTrade = allTrades.find(
    (t) => t.date.getTime() !== tradeTime && t.date.getTime() < tradeTime
  );
  if (
    previousTrade &&
    tradeTime - previousTrade.date.getTime() <= 15 * 60 * 1000
  ) {
    tags.push("Scalp");
  }

  if (tags.length === 0) return;

  // Merge with existing tags
  const existing = trade.tags
    ? trade.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const merged = Array.from(new Set([...existing, ...tags])).join(", ");

  await prisma.trade.update({
    where: { id: tradeId },
    data: { tags: merged },
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();

    // Validation
    if (!body.asset || !body.direction || !body.strategy || body.entry === undefined || body.sl === undefined || body.tp === undefined || body.lots === undefined) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    if (!["LONG", "SHORT"].includes(body.direction)) {
      return NextResponse.json({ error: "Direction invalide" }, { status: 400 });
    }

    const trade = await prisma.trade.create({
      data: {
        date: new Date(body.date),
        asset: body.asset,
        direction: body.direction,
        strategy: body.strategy,
        entry: parseFloat(body.entry),
        exit: body.exit ? parseFloat(body.exit) : null,
        sl: parseFloat(body.sl),
        tp: parseFloat(body.tp),
        lots: parseFloat(body.lots),
        result: parseFloat(body.result) || 0,
        commission: body.commission ? parseFloat(body.commission) : 0,
        swap: body.swap ? parseFloat(body.swap) : 0,
        maePrice: body.maePrice ? parseFloat(body.maePrice) : null,
        mfePrice: body.mfePrice ? parseFloat(body.mfePrice) : null,
        emotion: body.emotion || null,
        setup: body.setup || null,
        tags: body.tags || null,
        userId: session.user.id,
        screenshots: body.screenshots?.length
          ? {
              create: body.screenshots.map((url: string) => ({ url })),
            }
          : undefined,
      },
      include: { screenshots: true },
    });

    // Fire-and-forget: check streak, goals, review reminder
    fireAndForget(() =>
      checkPostTradeNotifications(
        session.user.id,
        trade.id,
        trade.result
      )
    );

    // Fire-and-forget: auto-tag based on trade characteristics
    fireAndForget(() => autoTagTrade(trade.id, session.user.id, trade));

    return NextResponse.json(trade);
  } catch (error) {
    console.error("POST trade error:", error);
    return NextResponse.json({ error: "Erreur lors de la création du trade" }, { status: 500 });
  }
}
