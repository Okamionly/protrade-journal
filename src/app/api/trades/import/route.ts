import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { trades } = await req.json();
    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: "Aucun trade à importer" }, { status: 400 });
    }

    if (trades.length > 5000) {
      return NextResponse.json({ error: "Maximum 5000 trades par import" }, { status: 400 });
    }

    const data = trades
      .filter((t: Record<string, unknown>) => t.date && t.direction)
      .map((t: Record<string, unknown>) => ({
        date: new Date(t.date as string),
        asset: String(t.asset || "UNKNOWN"),
        direction: String(t.direction),
        strategy: String(t.strategy || "Import CSV"),
        entry: parseFloat(String(t.entry || 0)),
        exit: t.exit ? parseFloat(String(t.exit)) : null,
        sl: parseFloat(String(t.sl || 0)),
        tp: parseFloat(String(t.tp || 0)),
        lots: parseFloat(String(t.lots || 0)),
        result: parseFloat(String(t.result || 0)),
        commission: parseFloat(String(t.commission || 0)),
        swap: parseFloat(String(t.swap || 0)),
        tags: t.tags ? String(t.tags) : null,
        emotion: null,
        setup: null,
        userId: session.user.id,
      }));

    const result = await prisma.trade.createMany({ data });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error("Import trades error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 });
  }
}
