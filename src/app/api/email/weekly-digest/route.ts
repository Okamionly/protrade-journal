import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* ── Helper: format currency ──────────────────────────────────────── */
function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}€`;
}

/* ── Helper: color for P&L ────────────────────────────────────────── */
function pnlColor(n: number): string {
  return n >= 0 ? "#10b981" : "#ef4444";
}

/* ── GET: preview weekly digest HTML ──────────────────────────────── */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch trades from the last 7 days
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        date: { gte: weekAgo, lte: now },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        asset: true,
        direction: true,
        result: true,
        date: true,
        strategy: true,
      },
    });

    // Compute stats
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const breakeven = trades.filter((t) => t.result === 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const totalPnl = trades.reduce((s, t) => s + t.result, 0);
    const bestTrade = trades.length > 0 ? trades.reduce((best, t) => (t.result > best.result ? t : best), trades[0]) : null;
    const worstTrade = trades.length > 0 ? trades.reduce((worst, t) => (t.result < worst.result ? t : worst), trades[0]) : null;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.result, 0) / losses.length : 0;

    // Assets traded
    const assetCounts: Record<string, number> = {};
    trades.forEach((t) => {
      assetCounts[t.asset] = (assetCounts[t.asset] || 0) + 1;
    });
    const topAssets = Object.entries(assetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Improvement tips based on stats
    const tips: string[] = [];
    if (winRate < 50 && totalTrades >= 3) {
      tips.push("Votre taux de réussite est en dessous de 50%. Revoyez vos critères d'entrée.");
    }
    if (avgLoss !== 0 && Math.abs(avgLoss) > avgWin && totalTrades >= 3) {
      tips.push("Vos pertes moyennes dépassent vos gains moyens. Pensez à resserrer vos stop-loss.");
    }
    if (totalTrades === 0) {
      tips.push("Aucun trade cette semaine. Restez discipliné et suivez votre plan de trading.");
    }
    if (winRate >= 60 && totalTrades >= 5) {
      tips.push("Excellent taux de réussite ! Continuez à suivre votre stratégie.");
    }
    if (totalTrades > 20) {
      tips.push("Beaucoup de trades cette semaine. Assurez-vous de ne pas sur-trader.");
    }
    if (tips.length === 0) {
      tips.push("Continuez à journaliser chaque trade pour améliorer votre performance.");
    }

    const weekStart = weekAgo.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
    const weekEnd = now.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Résumé hebdomadaire - ProTrade Journal</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="text-align:center;padding:30px 20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px 16px 0 0;border:1px solid #334155;">
      <h1 style="margin:0;color:#06b6d4;font-size:24px;">📊 Résumé Hebdomadaire</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">${weekStart} — ${weekEnd}</p>
    </div>

    <!-- Main stats -->
    <div style="background:#1e293b;padding:24px;border-left:1px solid #334155;border-right:1px solid #334155;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px;text-align:center;width:33%;">
            <div style="font-size:28px;font-weight:700;color:${pnlColor(totalPnl)};">${fmt(totalPnl)}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">P&L Total</div>
          </td>
          <td style="padding:12px;text-align:center;width:33%;">
            <div style="font-size:28px;font-weight:700;color:#f1f5f9;">${totalTrades}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Trades</div>
          </td>
          <td style="padding:12px;text-align:center;width:33%;">
            <div style="font-size:28px;font-weight:700;color:${winRate >= 50 ? "#10b981" : "#ef4444"};">${winRate.toFixed(1)}%</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Win Rate</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Win/Loss/BE breakdown -->
    <div style="background:#1e293b;padding:0 24px 20px;border-left:1px solid #334155;border-right:1px solid #334155;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px;text-align:center;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin-right:6px;"></span>
            <span style="color:#10b981;font-weight:600;">${wins.length} gains</span>
          </td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:6px;"></span>
            <span style="color:#ef4444;font-weight:600;">${losses.length} pertes</span>
          </td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#94a3b8;margin-right:6px;"></span>
            <span style="color:#94a3b8;font-weight:600;">${breakeven.length} BE</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Best & Worst -->
    ${bestTrade || worstTrade ? `
    <div style="background:#1e293b;padding:0 24px 20px;border-left:1px solid #334155;border-right:1px solid #334155;">
      <table style="width:100%;border-collapse:collapse;">
        ${bestTrade ? `
        <tr>
          <td style="padding:10px 16px;background:#10b98120;border-radius:8px;">
            <div style="font-size:11px;color:#10b981;text-transform:uppercase;letter-spacing:1px;">Meilleur trade</div>
            <div style="color:#f1f5f9;font-weight:600;margin-top:4px;">${bestTrade.asset} ${bestTrade.direction} — ${fmt(bestTrade.result)}</div>
          </td>
        </tr>` : ""}
        ${worstTrade ? `
        <tr>
          <td style="padding:10px 16px;background:#ef444420;border-radius:8px;${bestTrade ? "padding-top:16px;" : ""}">
            <div style="font-size:11px;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Pire trade</div>
            <div style="color:#f1f5f9;font-weight:600;margin-top:4px;">${worstTrade.asset} ${worstTrade.direction} — ${fmt(worstTrade.result)}</div>
          </td>
        </tr>` : ""}
      </table>
    </div>` : ""}

    <!-- Top assets -->
    ${topAssets.length > 0 ? `
    <div style="background:#1e293b;padding:16px 24px 20px;border-left:1px solid #334155;border-right:1px solid #334155;">
      <div style="font-size:13px;color:#94a3b8;margin-bottom:10px;font-weight:600;">Actifs les plus tradés</div>
      ${topAssets.map(([asset, count]) => `
      <div style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;background:#334155;border-radius:20px;font-size:12px;color:#f1f5f9;">
        ${asset} <span style="color:#94a3b8;">(${count})</span>
      </div>`).join("")}
    </div>` : ""}

    <!-- Tips -->
    <div style="background:#1e293b;padding:20px 24px;border-left:1px solid #334155;border-right:1px solid #334155;">
      <div style="font-size:13px;color:#06b6d4;margin-bottom:10px;font-weight:600;">💡 Conseils d'amélioration</div>
      ${tips.map((tip) => `
      <div style="padding:8px 12px;margin-bottom:6px;background:#0f172a;border-radius:8px;font-size:13px;color:#cbd5e1;border-left:3px solid #06b6d4;">
        ${tip}
      </div>`).join("")}
    </div>

    <!-- CTA -->
    <div style="background:#1e293b;padding:24px;text-align:center;border-left:1px solid #334155;border-right:1px solid #334155;">
      <a href="${process.env.NEXTAUTH_URL || "https://app.protrade.com"}/dashboard"
         style="display:inline-block;padding:12px 32px;background:#06b6d4;color:#0f172a;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
        Voir mon tableau de bord
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;background:#0f172a;border-radius:0 0 16px 16px;border:1px solid #334155;border-top:none;">
      <p style="margin:0;color:#64748b;font-size:12px;">ProTrade Journal — Votre journal de trading intelligent</p>
      <p style="margin:6px 0 0;color:#475569;font-size:11px;">Cet email est un aperçu. L'envoi automatique sera disponible prochainement.</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du résumé" },
      { status: 500 }
    );
  }
}
