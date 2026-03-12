import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    return NextResponse.json(trade);
  } catch (error) {
    console.error("POST trade error:", error);
    return NextResponse.json({ error: "Erreur lors de la création du trade" }, { status: 500 });
  }
}
