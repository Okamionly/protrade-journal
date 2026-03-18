import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || (currentUser.role !== "VIP" && currentUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Accès réservé aux membres VIP" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const post = await prisma.vipPost.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, email: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("GET vip/posts/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, type, content, scriptCode, imageUrl, published } = body;

    const post = await prisma.vipPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content }),
        ...(scriptCode !== undefined && { scriptCode }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(published !== undefined && { published }),
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("PATCH vip/posts/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.vipPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE vip/posts/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
