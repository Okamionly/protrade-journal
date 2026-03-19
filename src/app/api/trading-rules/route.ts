import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rules = await prisma.tradingRule.findMany({
      where: { userId: session.user.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET trading-rules error:", error);
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
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    const count = await prisma.tradingRule.count({ where: { userId: session.user.id } });

    const validCategories = ["risk", "setup", "mental", "exit"];
    const category = validCategories.includes(body.category) ? body.category : "setup";

    const rule = await prisma.tradingRule.create({
      data: {
        text: body.text.trim(),
        category,
        order: count,
        userId: session.user.id,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("POST trading-rule error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
