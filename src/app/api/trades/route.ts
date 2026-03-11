import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id },
    include: { screenshots: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(trades);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const trade = await prisma.trade.create({
    data: {
      date: new Date(body.date),
      asset: body.asset,
      direction: body.direction,
      strategy: body.strategy,
      entry: body.entry,
      exit: body.exit || null,
      sl: body.sl,
      tp: body.tp,
      lots: body.lots,
      result: body.result,
      emotion: body.emotion || null,
      setup: body.setup || null,
      tags: body.tags || null,
      userId: session.user.id,
      screenshots: body.screenshots?.length
        ? {
            create: body.screenshots.map((url: string) => ({ url })),
          }
        : undefined,
    },
    include: { screenshots: true },
  });

  return NextResponse.json(trade);
}
