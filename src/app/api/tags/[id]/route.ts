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

    const existing = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tag introuvable" }, { status: 404 });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim().toLowerCase() }),
        ...(body.color && { color: body.color }),
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("PUT tag error:", error);
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

    const existing = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tag introuvable" }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE tag error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
