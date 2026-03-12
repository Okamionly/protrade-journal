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

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.trade.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trade non trouvé" }, { status: 404 });
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        asset: body.asset,
        direction: body.direction,
        strategy: body.strategy,
        entry: body.entry,
        exit: body.exit,
        sl: body.sl,
        tp: body.tp,
        lots: body.lots,
        result: body.result,
        emotion: body.emotion,
        setup: body.setup,
        tags: body.tags,
      },
      include: { screenshots: true },
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error("PUT trade error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.trade.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trade non trouvé" }, { status: 404 });
    }

    // Delete screenshots first then trade
    await prisma.screenshot.deleteMany({ where: { tradeId: id } });
    await prisma.trade.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE trade error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
