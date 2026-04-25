import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getAnthropicClient,
  AI_MODEL,
  localImageToContentBlock,
  MissingApiKeyError,
} from "@/lib/ai/client";
import { getMacroSnapshot, snapshotToPromptText } from "@/lib/ai/macro-snapshot";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs"; // need fs to read screenshots
export const maxDuration = 60;

/* ─────────────────────────────────────────────────────────────────────── */
/*  Prompt                                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Tu es un coach de trading senior — discipliné, analytique, factuel.

Ton rôle : produire un résumé d'analyse pour UN trade que le user a journalé.

Tu reçois :
1. Les données structurées du trade (asset, direction, entry/exit/SL/TP, lots, résultat, émotion, stratégie, notes).
2. Optionnellement, des captures d'écran de chart annotées par le user (vision).
3. Un snapshot macro (taux Fed, CPI, 10Y, DXY, etc.).
4. Un résumé statistique de l'historique trader (winrate global, R:R moyen, etc.).

Tu produis un JSON STRICT (rien d'autre, pas de markdown, pas de \`\`\`) avec ces clés :

{
  "executive_summary": "1 paragraphe (60-90 mots) : qu'est-ce qui s'est passé, pourquoi le résultat",
  "score": 0-100,                  // qualité d'exécution
  "grade": "A+" | "A" | "B" | "C" | "D" | "F",
  "observations": [                // 3 à 6 points
    { "type": "positive" | "warning" | "negative", "text": "...", "evidence": "champ ou screenshot référencé" }
  ],
  "chart_analysis": "..." | null,  // si screenshots fournis : ce que tu vois (structure, niveaux, contexte). Sinon null.
  "macro_context": "...",          // 2-3 phrases : régime macro et son impact sur ce trade
  "suggestions": [                 // 2 à 4 actions concrètes
    "..."
  ],
  "risk_flags": [                  // problèmes critiques (sur-levier, SL absent, FOMO, etc.)
    "..."
  ]
}

Règles :
- Français, ton direct, zéro fluff, zéro émoji.
- Pas de chiffres inventés — base-toi UNIQUEMENT sur les données fournies.
- Si une donnée manque, dis-le ("notes vides", "pas de SL renseigné").
- Si screenshots fournis : décris ce que tu VOIS vraiment (chandeliers, niveaux, breakout, range).
- Score sévère mais juste : 90+ = exécution institutionnelle, 60-80 = correct, <50 = problèmes majeurs.
- Output strictement le JSON, aucun texte avant ou après.`;

/* ─────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

interface AISummaryResponse {
  executive_summary: string;
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  observations: { type: "positive" | "warning" | "negative"; text: string; evidence?: string }[];
  chart_analysis: string | null;
  macro_context: string;
  suggestions: string[];
  risk_flags: string[];
  meta: {
    model: string;
    screenshotsAnalyzed: number;
    macroPointsUsed: number;
    cached: boolean;
    tokensUsed: { input: number; output: number; cache_read?: number; cache_creation?: number };
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Handler                                                                */
/* ─────────────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    const body = await req.json().catch(() => ({}));
    const tradeId: string | undefined = body?.tradeId;
    const includeScreenshots: boolean = body?.includeScreenshots !== false; // default true

    if (!tradeId) {
      return NextResponse.json({ error: "tradeId requis" }, { status: 400 });
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: session.user.id },
      include: { screenshots: true, strategyRel: true },
    });
    if (!trade) {
      return NextResponse.json({ error: "Trade non trouvé" }, { status: 404 });
    }

    // ── Trader stats (last 50 trades) ──────────────────────────────────
    const recent = await prisma.trade.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 50,
    });
    const wins = recent.filter((t) => t.result > 0).length;
    const losses = recent.filter((t) => t.result < 0).length;
    const winRate = recent.length > 0 ? (wins / recent.length) * 100 : 0;
    const avgRR = (() => {
      const rrs = recent
        .map((t) => {
          const risk = Math.abs(t.entry - t.sl);
          const reward = Math.abs(t.tp - t.entry);
          return risk > 0 ? reward / risk : null;
        })
        .filter((x): x is number => x !== null);
      return rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
    })();

    // ── Macro snapshot (best-effort) ───────────────────────────────────
    const macro = await getMacroSnapshot().catch(() => null);
    const macroText = macro ? snapshotToPromptText(macro) : "[Macro indisponible]";

    // ── Build user content blocks ──────────────────────────────────────
    const userBlocks: Anthropic.ContentBlockParam[] = [];

    const tradePayload = {
      trade: {
        id: trade.id,
        date: trade.date.toISOString(),
        asset: trade.asset,
        direction: trade.direction,
        strategy: trade.strategyRel?.name || trade.strategy,
        entry: trade.entry,
        exit: trade.exit ?? null,
        sl: trade.sl,
        tp: trade.tp,
        lots: trade.lots,
        result: trade.result,
        rr_planned: trade.sl !== trade.entry
          ? +(Math.abs(trade.tp - trade.entry) / Math.abs(trade.entry - trade.sl)).toFixed(2)
          : null,
        emotion: trade.emotion ?? null,
        setup: trade.setup ?? null,
        tags: trade.tags ?? null,
        rating: trade.rating ?? null,
        notes: trade.notes ?? null,
        duration_min: trade.duration ?? null,
        commission: trade.commission ?? 0,
        swap: trade.swap ?? 0,
      },
      trader_stats_recent_50: {
        sample_size: recent.length,
        win_rate_pct: +winRate.toFixed(1),
        wins,
        losses,
        avg_planned_rr: +avgRR.toFixed(2),
      },
    };

    userBlocks.push({
      type: "text",
      text:
        `=== DONNÉES DU TRADE ===\n` +
        `\`\`\`json\n${JSON.stringify(tradePayload, null, 2)}\n\`\`\`\n\n` +
        `=== CONTEXTE MACRO ===\n${macroText}\n\n` +
        (includeScreenshots && trade.screenshots.length > 0
          ? `=== CAPTURES D'ÉCRAN (${trade.screenshots.length}) ===\nAnalyse les charts ci-dessous. Décris la structure, les niveaux clés, et le contexte au moment de l'entrée.`
          : `=== CAPTURES D'ÉCRAN ===\nAucun screenshot fourni — chart_analysis doit être null.`),
    });

    // ── Vision: load screenshots ───────────────────────────────────────
    let screenshotsAnalyzed = 0;
    if (includeScreenshots) {
      const SHOTS_LIMIT = 4; // cap to control tokens + latency
      for (const s of trade.screenshots.slice(0, SHOTS_LIMIT)) {
        const block = await localImageToContentBlock(s.url);
        if (block) {
          userBlocks.push(block);
          screenshotsAnalyzed++;
        }
      }
    }

    // ── Call Claude ────────────────────────────────────────────────────
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Cache the system prompt — same every call, saves ~80% on repeated analyses.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userBlocks }],
    });

    // ── Parse JSON ─────────────────────────────────────────────────────
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "Réponse IA vide" }, { status: 502 });
    }
    const raw = textBlock.text.trim();
    // Defensive: strip optional code fences
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: Omit<AISummaryResponse, "meta">;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("AI JSON parse error:", e, "raw:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "Réponse IA invalide (JSON parse failed)", raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    const out: AISummaryResponse = {
      ...parsed,
      meta: {
        model: AI_MODEL,
        screenshotsAnalyzed,
        macroPointsUsed: macro?.points.length ?? 0,
        cached: (response.usage.cache_read_input_tokens ?? 0) > 0,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cache_read: response.usage.cache_read_input_tokens ?? 0,
          cache_creation: response.usage.cache_creation_input_tokens ?? 0,
        },
      },
    };

    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json(
        {
          error: "ANTHROPIC_API_KEY non configuré sur le serveur. Ajoute la clé dans .env puis redémarre.",
          code: e.code,
        },
        { status: 503 },
      );
    }
    console.error("AI trade-summary error:", e);
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur", detail: message }, { status: 500 });
  }
}
