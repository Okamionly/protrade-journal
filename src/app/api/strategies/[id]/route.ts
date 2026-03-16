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

    const existing = await prisma.strategy.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Stratégie introuvable" }, { status: 404 });
    }

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.color && { color: body.color }),
        ...(body.description !== undefined && { description: body.description || null }),
      },
    });

    return NextResponse.json(strategy);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ce nom existe déjà" }, { status: 409 });
    }
    console.error("PUT strategy error:", error);
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

    const existing = await prisma.strategy.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Stratégie introuvable" }, { status: 404 });
    }

    await prisma.strategy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE strategy error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
