import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const isVipOrAdmin = currentUser.role === "VIP" || currentUser.role === "PRO" || currentUser.role === "ADMIN";

    if (isVipOrAdmin) {
      // VIP/ADMIN: return full published posts
      const posts = await prisma.vipPost.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true, email: true } },
        },
      });
      return NextResponse.json(posts);
    } else {
      // Regular USER: return only titles, type, date (no content/scriptCode)
      const posts = await prisma.vipPost.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          imageUrl: true,
        },
      });
      return NextResponse.json(posts);
    }
  } catch (error) {
    console.error("GET vip/posts error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { title, type, content, scriptCode, imageUrl, published } = body;

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: "Titre, type et contenu requis" },
        { status: 400 }
      );
    }

    const post = await prisma.vipPost.create({
      data: {
        title,
        type,
        content,
        scriptCode: scriptCode || null,
        imageUrl: imageUrl || null,
        published: published ?? false,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST vip/posts error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
