import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { trades: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("GET tags error:", error);
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

    const tag = await prisma.tag.create({
      data: {
        name: body.name.trim().toLowerCase(),
        color: body.color || "#6b7280",
        userId: session.user.id,
      },
    });

    return NextResponse.json(tag);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ce tag existe déjà" }, { status: 409 });
    }
    console.error("POST tag error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
