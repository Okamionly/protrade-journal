import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { tradeId } = await req.json();

    if (!tradeId) {
      return NextResponse.json({ error: "tradeId requis" }, { status: 400 });
    }

    // Fetch the trade
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: session.user.id },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade non trouvé" }, { status: 404 });
    }

    // Fetch all user trades for pattern analysis
    const allTrades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    });

    const observations: { type: "positive" | "warning" | "negative"; text: string }[] = [];
    const suggestions: string[] = [];
    let score = 50; // Base score

    // 1. Stop loss check
    if (!trade.sl || trade.sl === 0) {
      observations.push({ type: "negative", text: "Stop loss manquant — problème de gestion du risque" });
      score -= 20;
    } else {
      observations.push({ type: "positive", text: "Stop loss défini correctement" });
      score += 5;
    }

    // 2. R:R ratio analysis
    const risk = Math.abs(trade.entry - trade.sl);
    const reward = Math.abs(trade.tp - trade.entry);
    const rr = risk > 0 ? reward / risk : 0;

    if (rr >= 2) {
      observations.push({ type: "positive", text: `Bon ratio R:R de 1:${rr.toFixed(1)}` });
      score += 15;
    } else if (rr >= 1) {
      observations.push({ type: "warning", text: `Ratio R:R acceptable de 1:${rr.toFixed(1)} — viser au moins 1:2` });
      score += 5;
    } else if (rr > 0) {
      observations.push({ type: "negative", text: `Mauvais ratio R:R de 1:${rr.toFixed(1)} — le risque dépasse le gain potentiel` });
      score -= 15;
    }

    // 3. Emotion check
    const emotionLower = (trade.emotion || "").toLowerCase();
    const dangerousEmotions = ["fomo", "revenge", "vengeance", "greed", "cupide", "euphorique", "euphoric", "frustrated", "frustré"];
    const calmEmotions = ["confident", "confiant", "neutral", "neutre"];

    if (dangerousEmotions.some((e) => emotionLower.includes(e))) {
      observations.push({ type: "negative", text: `Trading émotionnel détecté : "${trade.emotion}"` });
      score -= 15;
      suggestions.push("Attendez d'être dans un état émotionnel calme avant de trader");
    } else if (calmEmotions.some((e) => emotionLower.includes(e))) {
      observations.push({ type: "positive", text: `Bonne discipline émotionnelle : "${trade.emotion}"` });
      score += 5;
    }

    // 4. Win/loss pattern on same asset + direction
    const similarTrades = allTrades.filter(
      (t) => t.id !== trade.id && t.asset === trade.asset && t.direction === trade.direction
    );
    if (similarTrades.length >= 3) {
      const wins = similarTrades.filter((t) => t.result > 0).length;
      const winRate = (wins / similarTrades.length) * 100;
      if (winRate >= 60) {
        observations.push({
          type: "positive",
          text: `Historique favorable : ${winRate.toFixed(0)}% de wins sur ${trade.asset} ${trade.direction} (${similarTrades.length} trades)`,
        });
        score += 10;
      } else if (winRate < 40) {
        observations.push({
          type: "warning",
          text: `Historique défavorable : ${winRate.toFixed(0)}% de wins sur ${trade.asset} ${trade.direction} (${similarTrades.length} trades)`,
        });
        score -= 5;
        suggestions.push(`Votre taux de réussite sur ${trade.asset} en ${trade.direction} est bas — envisagez de revoir votre stratégie`);
      }
    }

    // 5. Session analysis
    const tradeHour = new Date(trade.date).getUTCHours();
    const isForexPair = /\/(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)/.test(trade.asset);
    const isGold = trade.asset.includes("XAU");
    const isCrypto = trade.asset.includes("BTC") || trade.asset.includes("ETH");

    if (isForexPair || isGold) {
      // London: 7-16 UTC, NY: 12-21 UTC
      const inLondon = tradeHour >= 7 && tradeHour <= 16;
      const inNY = tradeHour >= 12 && tradeHour <= 21;
      const inAsian = tradeHour >= 23 || tradeHour <= 8;

      if (inLondon || inNY) {
        observations.push({ type: "positive", text: "Trade pris pendant une session de marché active" });
        score += 5;
      } else if (inAsian && !trade.asset.includes("JPY") && !trade.asset.includes("AUD") && !trade.asset.includes("NZD")) {
        observations.push({ type: "warning", text: "Trade pris pendant la session asiatique — liquidité potentiellement plus faible" });
        score -= 5;
        suggestions.push("Envisagez de trader pendant les sessions de Londres ou New York pour plus de liquidité");
      }
    }

    if (isCrypto) {
      observations.push({ type: "positive", text: "Marché crypto actif 24/7 — pas de contrainte de session" });
    }

    // 6. Position size consistency
    const recentTrades = allTrades.slice(0, 20).filter((t) => t.id !== trade.id);
    if (recentTrades.length >= 5) {
      const avgLots = recentTrades.reduce((s, t) => s + t.lots, 0) / recentTrades.length;
      const deviation = Math.abs(trade.lots - avgLots) / avgLots;

      if (deviation > 1) {
        observations.push({
          type: "negative",
          text: `Taille de position inhabituelle (${trade.lots} lots vs moyenne de ${avgLots.toFixed(2)} lots) — possible sur-levier`,
        });
        score -= 10;
        suggestions.push("Maintenez une taille de position cohérente pour une meilleure gestion du risque");
      } else if (deviation < 0.3) {
        observations.push({ type: "positive", text: "Taille de position cohérente avec votre historique" });
        score += 5;
      }
    }

    // 7. Result analysis if trade is closed
    if (trade.exit !== null && trade.exit !== undefined) {
      if (trade.result > 0) {
        // Check if it hit TP or exited early
        const actualReward = Math.abs(trade.exit - trade.entry);
        const targetReward = Math.abs(trade.tp - trade.entry);
        const fillRate = targetReward > 0 ? (actualReward / targetReward) * 100 : 0;

        if (fillRate >= 90) {
          observations.push({ type: "positive", text: "Objectif atteint — excellente exécution" });
          score += 10;
        } else if (fillRate < 50) {
          observations.push({ type: "warning", text: `Sorti à ${fillRate.toFixed(0)}% de l'objectif — potentiel de gain non exploité` });
          suggestions.push("Essayez de laisser courir vos gains jusqu'au TP prévu");
        }
      } else if (trade.result < 0) {
        // Check if SL was respected
        const actualLoss = Math.abs(trade.exit - trade.entry);
        const plannedLoss = Math.abs(trade.sl - trade.entry);
        if (plannedLoss > 0 && actualLoss > plannedLoss * 1.1) {
          observations.push({
            type: "negative",
            text: "Perte supérieure au stop loss prévu — le SL n'a pas été respecté",
          });
          score -= 15;
          suggestions.push("Respectez toujours votre stop loss pour protéger votre capital");
        }
      }
    }

    // 8. Strategy consistency check
    const stratTrades = allTrades.filter((t) => t.strategy === trade.strategy && t.id !== trade.id);
    if (stratTrades.length >= 5) {
      const stratWins = stratTrades.filter((t) => t.result > 0).length;
      const stratWinRate = (stratWins / stratTrades.length) * 100;
      if (stratWinRate >= 55) {
        observations.push({
          type: "positive",
          text: `Stratégie "${trade.strategy}" performante : ${stratWinRate.toFixed(0)}% de winrate`,
        });
        score += 5;
      } else if (stratWinRate < 40) {
        observations.push({
          type: "warning",
          text: `Stratégie "${trade.strategy}" sous-performante : ${stratWinRate.toFixed(0)}% de winrate`,
        });
        suggestions.push(`Revoyez les conditions d'entrée de votre stratégie "${trade.strategy}"`);
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Compute grade
    let grade: string;
    if (score >= 90) grade = "A+";
    else if (score >= 80) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 60) grade = "C";
    else if (score >= 40) grade = "D";
    else grade = "F";

    return NextResponse.json({ score, grade, observations, suggestions });
  } catch (error) {
    console.error("AI trade review error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
