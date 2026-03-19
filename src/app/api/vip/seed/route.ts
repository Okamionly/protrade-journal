import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// One-time seed endpoint for VIP content
// Secured by a simple key to prevent abuse
const SEED_KEY = process.env.VIP_SEED_KEY || "marketphase-seed-2026";

// ─── Standardized GLD Analysis ───
const GLD_ANALYSIS = `## GLD — Analyse Post-Clôture

### Macro Niveaux Clés

| Niveau | Prix | Type | Importance |
|--------|------|------|------------|
| R3 | 305.50 | Résistance majeure | Extension fibonacci 161.8% |
| R2 | 298.75 | Résistance | Sommet du canal ascendant |
| R1 | 294.20 | Résistance mineure | Pivot hebdomadaire |
| **Pivot** | **290.80** | **Pivot mensuel** | **Zone de bataille** |
| S1 | 286.40 | Support mineur | MA20 daily |
| S2 | 281.50 | Support | Base du canal |
| S3 | 275.00 | Support majeur | MA50 + fibonacci 38.2% |

---

### Macro à Venir

- **FOMC Minutes** — Mercredi 20h00 : Tonalité hawkish attendue, risque de pression sur l'or
- **PCE Core** — Vendredi 14h30 : Indicateur d'inflation préféré de la Fed, consensus +2.8% YoY
- **Jobless Claims** — Jeudi 14h30 : Marché du travail toujours tendu, 218K attendu
- **PMI Services** — Mercredi 15h45 : Indicateur avancé de l'activité économique

---

### Événements Impactants

1. **Tensions géopolitiques Moyen-Orient** — Facteur haussier pour l'or (valeur refuge)
2. **Rendements US 10Y en hausse** — Pression baissière, coût d'opportunité augmente
3. **Dollar index (DXY) stable** — Corrélation inverse forte (-0.82)
4. **Achats des banques centrales** — Demande physique record (Chine, Inde, Turquie)

---

### Contexte Macro Global

Le marché de l'or navigue entre des forces contradictoires. D'un côté, les tensions géopolitiques et les achats massifs des banques centrales soutiennent les prix. De l'autre, la politique monétaire restrictive de la Fed et les rendements obligataires élevés créent une résistance naturelle.

**Facteurs haussiers :**
- Demande physique record des banques centrales
- Incertitudes géopolitiques (Moyen-Orient, Taïwan)
- Inflation persistante (hedge naturel)
- Dédollarisation progressive (BRICS)

**Facteurs baissiers :**
- Taux réels positifs (Fed funds > inflation)
- Dollar index fort (corrélation inverse)
- ETF gold: outflows modérés cette semaine
- Positionnement spéculatif étendu sur le COMEX

---

### Scénarios

**Scénario haussier (55% probabilité):**
- Cassure de R1 (294.20) avec volume
- Target: R2 à 298.75 puis extension vers 305
- Catalyseur: FOMC dovish / escalade géopolitique

**Scénario baissier (30% probabilité):**
- Rejet sous R1, retour vers le pivot 290.80
- Cassure de S1 (286.40) ouvre la voie vers 281.50
- Catalyseur: PCE fort / Dollar en hausse

**Scénario range (15% probabilité):**
- Consolidation entre S1 (286.40) et R1 (294.20)
- Volume décroissant, attente du FOMC

---

### Calendrier des Événements

| Date | Heure | Événement | Impact |
|------|-------|-----------|--------|
| Mer 20 | 15:45 | PMI Services US | Moyen |
| Mer 20 | 20:00 | FOMC Minutes | Élevé |
| Jeu 21 | 14:30 | Jobless Claims | Moyen |
| Ven 22 | 14:30 | PCE Core MoM | Élevé |
| Ven 22 | 16:00 | Confiance Michigan | Moyen |

---

### Connexions Inter-Marchés

| Actif | Corrélation | Signal |
|-------|-------------|--------|
| DXY (Dollar) | -0.82 | Stable → Neutre pour l'or |
| US10Y (Rendements) | -0.74 | En hausse → Pression baissière |
| SPY (Actions) | -0.31 | Faiblement corrélé |
| SLV (Argent) | +0.88 | Sous-performe → Divergence négative |
| VIX (Volatilité) | +0.45 | En hausse → Support pour l'or |
| BTC (Bitcoin) | +0.22 | Corrélation faible mais croissante |

---

### Synthèse

**Biais : HAUSSIER PRUDENT**

L'or maintient sa tendance haussière structurelle mais fait face à des vents contraires à court terme (rendements US, dollar stable). La demande physique des banques centrales reste le principal moteur. Le FOMC de mercredi sera le catalyseur clé de la semaine.

**Niveaux à surveiller :**
- Break au-dessus de 294.20 → continuation haussière
- Support critique à 286.40 (MA20)
- Invalidation du biais sous 281.50

---

### Préparation pour Demain

- **Pre-market :** Surveiller le DXY et les rendements US 10Y à l'ouverture asiatique
- **Ordre conditionnel :** Long au-dessus de 294.20 avec SL 291.00 et TP 298.75 (R:R 1:2.5)
- **Alerte :** Si PCE surprend à la hausse, abandonner le biais haussier
- **Risk management :** Max 2% du capital par trade sur l'or cette semaine (volatilité FOMC)
`;

// ─── Sniper Oscillator v3 Pine Script ───
const SNIPER_OSCILLATOR_V3 = `//@version=6
indicator("Sniper Oscillator v3 — MarketPhase", overlay=false, max_bars_back=500)

// ═══════════════════════════════════════════
// INPUTS
// ═══════════════════════════════════════════
grp_main = "Paramètres principaux"
rsiLen    = input.int(14, "RSI Length", minval=2, group=grp_main)
stochLen  = input.int(14, "Stochastic Length", minval=2, group=grp_main)
smoothK   = input.int(3,  "Smooth %K", minval=1, group=grp_main)
smoothD   = input.int(3,  "Smooth %D", minval=1, group=grp_main)
mfiLen    = input.int(14, "MFI Length", minval=2, group=grp_main)

grp_div   = "Divergences"
showDiv   = input.bool(true, "Afficher divergences", group=grp_div)
divLookback = input.int(5, "Lookback pivots", minval=2, maxval=20, group=grp_div)

grp_style = "Style"
bullColor = input.color(color.new(#00E676, 0), "Couleur haussière", group=grp_style)
bearColor = input.color(color.new(#FF1744, 0), "Couleur baissière", group=grp_style)
neutColor = input.color(color.new(#FFD740, 0), "Couleur neutre", group=grp_style)

// ═══════════════════════════════════════════
// CALCULS
// ═══════════════════════════════════════════

// --- RSI ---
rsiValue = ta.rsi(close, rsiLen)

// --- Stochastic RSI ---
stochRsi  = ta.stoch(rsiValue, rsiValue, rsiValue, stochLen)
k         = ta.sma(stochRsi, smoothK)
d         = ta.sma(k, smoothD)

// --- MFI (Money Flow Index) ---
mfiValue  = ta.mfi(hlc3, mfiLen)

// --- Composite oscillator (average) ---
composite = (rsiValue + k + mfiValue) / 3.0

// --- Signal line (EMA du composite) ---
signalLine = ta.ema(composite, 9)

// --- Histogram ---
histogram = composite - signalLine

// ═══════════════════════════════════════════
// ZONES
// ═══════════════════════════════════════════
overbought = 70.0
oversold   = 30.0
midline    = 50.0

// ═══════════════════════════════════════════
// DIVERGENCES
// ═══════════════════════════════════════════
pivotHigh = ta.pivothigh(composite, divLookback, divLookback)
pivotLow  = ta.pivotlow(composite, divLookback, divLookback)

// Bullish divergence: price makes lower low, oscillator makes higher low
var float prevPriceLow = na
var float prevOscLow   = na
var int   prevLowBar   = na

bullDiv = false
bearDiv = false

if not na(pivotLow)
    if not na(prevPriceLow)
        priceLow = low[divLookback]
        oscLow   = pivotLow
        if priceLow < prevPriceLow and oscLow > prevOscLow
            bullDiv := true
    prevPriceLow := low[divLookback]
    prevOscLow   := pivotLow
    prevLowBar   := bar_index - divLookback

// Bearish divergence: price makes higher high, oscillator makes lower high
var float prevPriceHigh = na
var float prevOscHigh   = na

if not na(pivotHigh)
    if not na(prevPriceHigh)
        priceHigh = high[divLookback]
        oscHigh   = pivotHigh
        if priceHigh > prevPriceHigh and oscHigh < prevOscHigh
            bearDiv := true
    prevPriceHigh := high[divLookback]
    prevOscHigh   := pivotHigh

// ═══════════════════════════════════════════
// COULEURS
// ═══════════════════════════════════════════
compColor = composite > overbought ? bearColor : composite < oversold ? bullColor : composite > midline ? color.new(bullColor, 40) : composite < midline ? color.new(bearColor, 40) : neutColor

histColor = histogram >= 0 ? (histogram > histogram[1] ? bullColor : color.new(bullColor, 60)) : (histogram < histogram[1] ? bearColor : color.new(bearColor, 60))

// ═══════════════════════════════════════════
// PLOTS
// ═══════════════════════════════════════════

// Background zones
bgcolor(composite > overbought ? color.new(bearColor, 92) : composite < oversold ? color.new(bullColor, 92) : na)

// Zone lines
hline(overbought, "Surachat", color=color.new(bearColor, 70), linestyle=hline.style_dashed)
hline(oversold,   "Survente",  color=color.new(bullColor, 70), linestyle=hline.style_dashed)
hline(midline,    "Milieu",    color=color.new(color.gray, 80), linestyle=hline.style_dotted)

// Histogram
plot(histogram, "Histogram", style=plot.style_columns, color=histColor, linewidth=2)

// Composite & Signal
plot(composite,  "Composite",  color=compColor, linewidth=2)
plot(signalLine, "Signal",     color=color.new(color.white, 30), linewidth=1)

// Divergence markers
plotshape(showDiv and bullDiv ? composite[divLookback] : na, "Bull Div", shape.labelup,   location.absolute, bullColor, offset=-divLookback, size=size.tiny, text="DIV+")
plotshape(showDiv and bearDiv ? composite[divLookback] : na, "Bear Div", shape.labeldown, location.absolute, bearColor, offset=-divLookback, size=size.tiny, text="DIV-")

// ═══════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════
alertcondition(ta.crossover(composite, oversold),  "Sortie zone survente",  "Sniper: Composite sort de la zone de survente")
alertcondition(ta.crossunder(composite, overbought), "Entrée zone surachat", "Sniper: Composite entre en zone de surachat")
alertcondition(bullDiv, "Divergence haussière", "Sniper: Divergence haussière détectée")
alertcondition(bearDiv, "Divergence baissière", "Sniper: Divergence baissière détectée")
alertcondition(ta.crossover(composite, signalLine), "Cross haussier", "Sniper: Composite croise au-dessus du signal")
alertcondition(ta.crossunder(composite, signalLine), "Cross baissier", "Sniper: Composite croise en-dessous du signal")
`;

const SNIPER_DESCRIPTION = `## Sniper Oscillator v3 — Indicateur MarketPhase

### Description

Le **Sniper Oscillator v3** est un oscillateur composite conçu pour identifier les zones de retournement avec une précision accrue. Il combine trois indicateurs de momentum en un seul signal unifié :

1. **RSI** (Relative Strength Index) — Momentum classique
2. **Stochastic RSI** — Momentum du momentum (sensibilité accrue)
3. **MFI** (Money Flow Index) — Pression volume-prix

### Caractéristiques

- **Oscillateur composite** (0-100) : moyenne pondérée de RSI + Stoch RSI + MFI
- **Ligne de signal** : EMA(9) du composite pour filtrer le bruit
- **Histogramme** : différence composite - signal (momentum du momentum)
- **Divergences automatiques** : détection haussière et baissière avec labels
- **Zones colorées** : surachat (>70) en rouge, survente (<30) en vert
- **6 alertes configurables** : cross, divergences, zones extrêmes

### Utilisation

| Signal | Action | Condition |
|--------|--------|-----------|
| Composite < 30 + cross signal | LONG | Zone survente + momentum haussier |
| Composite > 70 + cross signal | SHORT | Zone surachat + momentum baissier |
| DIV+ (label vert) | LONG | Divergence haussière prix/oscillateur |
| DIV- (label rouge) | SHORT | Divergence baissière prix/oscillateur |
| Histogramme vert croissant | Confirme LONG | Momentum accélère à la hausse |
| Histogramme rouge décroissant | Confirme SHORT | Momentum accélère à la baisse |

### Timeframes recommandés

- **Scalping** : M5-M15 (réduire RSI à 8, Stoch à 8)
- **Intraday** : M30-H1 (paramètres par défaut)
- **Swing** : H4-D1 (augmenter RSI à 21, Stoch à 21)

### Paramètres

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| RSI Length | 14 | Période du RSI |
| Stochastic Length | 14 | Période du Stochastique |
| Smooth %K | 3 | Lissage de la ligne %K |
| Smooth %D | 3 | Lissage de la ligne %D |
| MFI Length | 14 | Période du Money Flow Index |
| Divergence Lookback | 5 | Nombre de pivots pour détecter les divergences |
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key } = body;

    if (key !== SEED_KEY) {
      return NextResponse.json({ error: "Invalid seed key" }, { status: 403 });
    }

    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "No admin user found" }, { status: 404 });
    }

    // Check if posts already exist to avoid duplicates
    const existing = await prisma.vipPost.count();

    const results: string[] = [];

    // Seed Sniper Oscillator v3 indicator
    const existingIndicator = await prisma.vipPost.findFirst({
      where: { title: { contains: "Sniper Oscillator" } },
    });

    if (!existingIndicator) {
      await prisma.vipPost.create({
        data: {
          title: "Sniper Oscillator v3 — Indicateur MarketPhase",
          type: "indicator",
          content: SNIPER_DESCRIPTION,
          scriptCode: SNIPER_OSCILLATOR_V3,
          imageUrl: "/screenshots/sniper-indicator.jpg",
          published: true,
          authorId: admin.id,
        },
      });
      results.push("Created: Sniper Oscillator v3 indicator");
    } else {
      // Update existing with full Pine Script
      await prisma.vipPost.update({
        where: { id: existingIndicator.id },
        data: {
          content: SNIPER_DESCRIPTION,
          scriptCode: SNIPER_OSCILLATOR_V3,
          imageUrl: "/screenshots/sniper-indicator.jpg",
          published: true,
        },
      });
      results.push("Updated: Sniper Oscillator v3 indicator");
    }

    // Seed GLD Analysis
    const existingAnalysis = await prisma.vipPost.findFirst({
      where: { title: { contains: "GLD" } },
    });

    if (!existingAnalysis) {
      await prisma.vipPost.create({
        data: {
          title: "GLD — Analyse Post-Clôture",
          type: "macro",
          content: GLD_ANALYSIS,
          published: true,
          authorId: admin.id,
        },
      });
      results.push("Created: GLD Analysis");
    } else {
      await prisma.vipPost.update({
        where: { id: existingAnalysis.id },
        data: {
          title: "GLD — Analyse Post-Clôture",
          content: GLD_ANALYSIS,
          published: true,
        },
      });
      results.push("Updated: GLD Analysis");
    }

    return NextResponse.json({
      success: true,
      existing_posts: existing,
      results,
    });
  } catch (error) {
    console.error("VIP seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
