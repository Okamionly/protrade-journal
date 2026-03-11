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
    orderBy: { date: "desc" },
  });

  const header = "Date,Actif,Direction,Stratégie,Entrée,Sortie,Stop Loss,Take Profit,Lots,Résultat,Émotion,Setup,Tags\n";
  const rows = trades
    .map(
      (t) =>
        `${new Date(t.date).toISOString()},${t.asset},${t.direction},${t.strategy},${t.entry},${t.exit ?? ""},${t.sl},${t.tp},${t.lots},${t.result},${t.emotion ?? ""},${(t.setup ?? "").replace(/,/g, ";")},${t.tags ?? ""}`
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=protrade-export.csv",
    },
  });
}
