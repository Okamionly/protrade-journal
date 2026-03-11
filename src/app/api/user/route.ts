import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, balance: true },
  });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      balance: body.balance !== undefined ? body.balance : undefined,
      name: body.name !== undefined ? body.name : undefined,
    },
    select: { id: true, email: true, name: true, balance: true },
  });

  return NextResponse.json(user);
}
