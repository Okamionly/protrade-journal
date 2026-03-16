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
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const goal = await prisma.monthlyGoal.findUnique({
      where: { userId_month_year: { userId: session.user.id, month, year } },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("GET monthly-goals error:", error);
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
    const { month, year, targetPnl, targetTrades, targetWinRate } = body;

    if (!month || !year) {
      return NextResponse.json({ error: "Mois et année requis" }, { status: 400 });
    }

    const goal = await prisma.monthlyGoal.upsert({
      where: { userId_month_year: { userId: session.user.id, month, year } },
      update: {
        targetPnl: targetPnl ?? null,
        targetTrades: targetTrades ?? null,
        targetWinRate: targetWinRate ?? null,
      },
      create: {
        month,
        year,
        targetPnl: targetPnl ?? null,
        targetTrades: targetTrades ?? null,
        targetWinRate: targetWinRate ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("POST monthly-goals error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
