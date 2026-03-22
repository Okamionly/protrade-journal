import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST() {
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

    // Check if demo user already exists
    const existing = await prisma.user.findUnique({
      where: { email: "demo@marketphase.com" },
    });

    if (existing) {
      return NextResponse.json({
        message: "L'utilisateur demo existe déjà. Seed ignoré.",
      });
    }

    const demoPassword = process.env.DEMO_PASSWORD || crypto.randomUUID().slice(0, 12);
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    const demoUser = await prisma.user.create({
      data: {
        email: "demo@marketphase.com",
        password: hashedPassword,
        name: "Trader Demo",
        role: "USER",
        balance: 25000,
      },
    });

    const assets = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD"];
    const directions = ["LONG", "SHORT"];
    const strategies = ["Breakout", "Pullback", "Reversal", "Scalping", "Swing"];
    const emotions = ["Confiant", "Neutre", "Stressé", "Euphorique", "Frustré"];

    const trades = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const entry = 1.0500 + Math.random() * 0.05;
      const isWin = Math.random() > 0.4;
      const pips = (Math.random() * 50 + 5) * (isWin ? 1 : -1);
      const result = Math.round(pips * (Math.random() * 5 + 1) * 100) / 100;

      trades.push({
        date,
        asset: assets[Math.floor(Math.random() * assets.length)],
        direction,
        strategy: strategies[Math.floor(Math.random() * strategies.length)],
        entry: Math.round(entry * 10000) / 10000,
        exit: Math.round((entry + pips * 0.0001) * 10000) / 10000,
        sl: Math.round((entry - 0.002) * 10000) / 10000,
        tp: Math.round((entry + 0.004) * 10000) / 10000,
        lots: [0.1, 0.2, 0.5, 1.0][Math.floor(Math.random() * 4)],
        result,
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        userId: demoUser.id,
      });
    }

    await prisma.trade.createMany({ data: trades });

    const response: Record<string, string> = {
      message: `Seed terminé : utilisateur demo créé avec ${trades.length} trades.`,
    };
    if (!process.env.DEMO_PASSWORD) {
      response.generatedPassword = demoPassword;
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error("POST admin/seed error:", error);
    return NextResponse.json({ error: "Erreur lors du seed" }, { status: 500 });
  }
}
