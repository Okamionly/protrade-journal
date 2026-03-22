import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, asset, direction, entry, exit, sl, tp, lots, strategy, emotion, notes, date } = body;

    // --- Validation ---
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 401 });
    }

    const requiredFields: Record<string, unknown> = { asset, direction, entry, sl, tp, lots };
    const missing = Object.entries(requiredFields)
      .filter(([, v]) => v === undefined || v === null || v === "")
      .map(([k]) => k);

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Champs requis manquants: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (!["LONG", "SHORT", "long", "short", "BUY", "SELL", "buy", "sell"].includes(direction)) {
      return NextResponse.json(
        { error: "Direction invalide. Valeurs acceptées: LONG, SHORT, BUY, SELL" },
        { status: 400 }
      );
    }

    const numEntry = Number(entry);
    const numExit = exit !== undefined && exit !== null ? Number(exit) : null;
    const numSl = Number(sl);
    const numTp = Number(tp);
    const numLots = Number(lots);

    if ([numEntry, numSl, numTp, numLots].some((v) => isNaN(v))) {
      return NextResponse.json(
        { error: "Les champs entry, sl, tp et lots doivent être des nombres valides" },
        { status: 400 }
      );
    }

    if (numExit !== null && isNaN(numExit)) {
      return NextResponse.json(
        { error: "Le champ exit doit être un nombre valide" },
        { status: 400 }
      );
    }

    // --- Authenticate via API key ---
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // --- Normalize direction ---
    const normalizedDir = ["LONG", "long", "BUY", "buy"].includes(direction) ? "LONG" : "SHORT";

    // --- Calculate result if exit is provided ---
    let result = 0;
    if (numExit !== null) {
      result = normalizedDir === "LONG"
        ? (numExit - numEntry) * numLots
        : (numEntry - numExit) * numLots;
    }

    // --- Create trade ---
    const trade = await prisma.trade.create({
      data: {
        date: date ? new Date(date) : new Date(),
        asset: String(asset).toUpperCase(),
        direction: normalizedDir,
        strategy: strategy || "Webhook",
        entry: numEntry,
        exit: numExit,
        sl: numSl,
        tp: numTp,
        lots: numLots,
        result: Math.round(result * 100) / 100,
        emotion: emotion || null,
        notes: notes || null,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tradeId: trade.id,
        message: "Trade enregistré avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST webhook/trade error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
