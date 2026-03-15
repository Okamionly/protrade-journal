import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) return NextResponse.json(null, { status: 400 });

    const date = new Date(dateStr + "T00:00:00.000Z");
    const plan = await prisma.dailyPlan.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("GET daily-plan error:", error);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const date = new Date(body.date + "T00:00:00.000Z");

    const plan = await prisma.dailyPlan.upsert({
      where: { userId_date: { userId: session.user.id, date } },
      update: {
        bias: body.bias || null,
        notes: body.notes || null,
        pairs: body.pairs || null,
        keyLevels: body.keyLevels || null,
        review: body.review || null,
        grade: body.grade || null,
      },
      create: {
        date,
        userId: session.user.id,
        bias: body.bias || null,
        notes: body.notes || null,
        pairs: body.pairs || null,
        keyLevels: body.keyLevels || null,
        review: body.review || null,
        grade: body.grade || null,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("POST daily-plan error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
