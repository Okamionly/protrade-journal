import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.tradingRule.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
    }

    const validCategories = ["risk", "setup", "mental", "exit"];
    const rule = await prisma.tradingRule.update({
      where: { id },
      data: {
        ...(body.text && { text: body.text.trim() }),
        ...(body.order !== undefined && { order: body.order }),
        ...(validCategories.includes(body.category) && { category: body.category }),
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("PUT trading-rule error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.tradingRule.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });
    }

    await prisma.tradingRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE trading-rule error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
