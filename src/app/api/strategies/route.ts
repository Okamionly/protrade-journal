import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const strategies = await prisma.strategy.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { trades: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(strategies);
  } catch (error) {
    console.error("GET strategies error:", error);
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
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const strategy = await prisma.strategy.create({
      data: {
        name: body.name.trim(),
        color: body.color || "#0ea5e9",
        description: body.description || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(strategy);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Cette stratégie existe déjà" }, { status: 409 });
    }
    console.error("POST strategy error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
