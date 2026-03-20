import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return NextResponse.json(null, { status: 400 });

    const plans = await prisma.dailyPlan.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(from + "T00:00:00.000Z"),
          lte: new Date(to + "T23:59:59.999Z"),
        },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        bias: true,
        pairs: true,
        grade: true,
        notes: true,
        review: true,
        keyLevels: true,
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET daily-plan/history error:", error);
    return NextResponse.json(null, { status: 500 });
  }
}
