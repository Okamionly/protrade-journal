import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const plans = await prisma.dailyPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    });

    const header = "Date,Biais,Paires,Niveaux clés,Notes,Review,Note\n";
    const rows = plans
      .map((p) => {
        const date = new Date(p.date).toISOString().split("T")[0];
        const bias = (p.bias ?? "").replace(/,/g, ";").replace(/\n/g, " ");
        const pairs = (p.pairs ?? "").replace(/,/g, ";").replace(/\n/g, " ");
        const keyLevels = (p.keyLevels ?? "").replace(/,/g, ";").replace(/\n/g, " ");
        const notes = (p.notes ?? "").replace(/,/g, ";").replace(/\n/g, " ");
        const review = (p.review ?? "").replace(/,/g, ";").replace(/\n/g, " ");
        const grade = p.grade ?? "";
        return `${date},${bias},${pairs},${keyLevels},${notes},${review},${grade}`;
      })
      .join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=marketphase-plans-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    console.error("GET daily-plan/export error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
