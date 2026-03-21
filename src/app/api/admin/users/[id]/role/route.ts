import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_ROLES = ["USER", "VIP", "ADMIN"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (currentUser?.role !== "ADMIN")
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role))
      return NextResponse.json(
        { error: "Rôle invalide. Valeurs acceptées : USER, VIP, ADMIN" },
        { status: 400 }
      );

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("PATCH admin/users/[id]/role error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
