import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ─── Real GLD Analysis — loaded from analyst file ───
const GLD_ANALYSIS = `# GLD — ANALYSE POST-CLÔTURE 360°
## Mercredi 19 Mars 2026 | Clôture US 22h Paris

---

**Actif :** GLD (SPDR Gold Shares) | **Close :** $427.36
**Gold Futures (GC) :** ~$4,588 | **Ratio GLD→GC :** 10.74
**Session :** Post-FOMC Day (Fed a maintenu 3.50-3.75% le 18/03)

---

# ÉTAPE 1 & 2 — ANALYSE DES 8 CAPTURES

---

## CAPTURE 1 — INTERVAL MAP 4 GRECS

### PANEL 1 — Interval Map DEX (Delta Exposure)
**CHAPITRE :** Positionnement directionnel des dealers
**LEÇON :** Le delta positif massif à $425 a agi comme un aimant haussier toute la journée
**LECTURE :** Deux niveaux DEX verts dominants : $425 (fort) et $420 (très fort). Le prix a ouvert ~$419, chuté à ~$417, puis a été aspiré vers le haut par la concentration de delta positif à $425. Cassure explosive au-dessus de $425 à partir de 14h30 ET.
**INTERPRÉTATION :** Les dealers avaient une exposition delta nette positive concentrée à $420 et $425. Quand le prix est passé au-dessus de $425, les dealers ont dû acheter du sous-jacent pour couvrir leur delta négatif accru → boucle de rétroaction positive → rally auto-alimenté jusqu'à $428+.
**NIVEAUX :**

| Niveau | Type | Description |
|--------|------|-------------|
| $429 | DEX vert faible | Aimant haut de range |
| $425 | DEX vert fort | Aimant principal — TENU et dépassé |
| $420 | DEX vert majeur | Support/plancher de la session |
| $417 | Neutre | Low de session (pas de DEX) |

**FENÊTRE SNIPER :** VALIDÉE — Le rebond depuis $417-420 vers $425+ était le trade de la journée.
**PIÈGE RETAIL :** Le drop initial à $417 à l'ouverture a piégé les shorts qui ont vendu le gap down post-FOMC.
**À RETENIR :**
1. Le DEX vert à $420 a marqué le plancher exact de la session
2. Le DEX vert à $425 a été l'aimant principal — le prix y est revenu puis l'a dépassé
3. Pas de résistance DEX significative au-dessus de $426 → voie libre pour le rally

### PANEL 2 — Interval Map CHEX (Charm Exposure)
**CHAPITRE :** Érosion temporelle et impact sur le positionnement
**LEÇON :** Le charm négatif à $425 a créé une pression vendeuse passive que le marché a finalement absorbée
**NIVEAUX :**

| Niveau | Type | Description |
|--------|------|-------------|
| $425-426 | CHEX rouge | Pression vendeuse temporelle (charm négatif) |
| $420 | CHEX vert | Support charm (puts en decay) |

**À RETENIR :**
1. Le charm négatif à $425 a créé une résistance temporelle pendant la matinée
2. Le charm positif à $420 a renforcé le support
3. L'absorption du charm négatif en fin de journée = signal de force

### PANEL 3 — Interval Map GEX (Gamma Exposure)
**CHAPITRE :** Zones d'accélération et de freinage des dealers
**LEÇON :** Le GEX positif à $429 est un MUR DE RÉSISTANCE gamma — le GEX négatif entre $420-$424 a AMPLIFIÉ les mouvements
**NIVEAUX :**

| Niveau | Type | Description |
|--------|------|-------------|
| $429 | GEX vert MASSIF | MUR gamma — résistance forte |
| $425-426 | GEX vert | Zone de stabilisation |
| $424 | GEX rouge | Flip zone — en-dessous = amplification |
| $420-421 | GEX rouge | Zone volatile |
| $419 | GEX rouge | Plancher GEX négatif |

**FENÊTRE SNIPER :** Le flip GEX à $424-425 a été la zone clé. Passage au-dessus = passage de l'amplification à la stabilisation.
**PIÈGE RETAIL :** Trader dans la zone $420-424 sans comprendre le GEX négatif = whipsaw garanti.
**À RETENIR :**
1. $429 = MUR GEX gamma → résistance clé pour le 20/03
2. Le flip GEX à $424-425 = niveau pivot
3. Le GEX négatif $419-424 a amplifié le rally une fois la direction établie

### PANEL 4 — Interval Map VEX (Vanna Exposure)
**CHAPITRE :** Impact de la volatilité implicite sur le positionnement
**LEÇON :** Le VEX négatif à $420 signale que la compression de vol a retiré du support
**NIVEAUX :**

| Niveau | Type | Description |
|--------|------|-------------|
| $425-426 | VEX vert | Compression vol = achat dealers |
| $420 | VEX rouge MASSIF | Compression vol = vente dealers |
| $417 | VEX rouge | Pression baissière si vol baisse |

**À RETENIR :**
1. $420 = danger zone VEX si l'IV continue de baisser
2. $425+ = safe zone VEX avec compression de vol
3. La dynamique IV-prix a été le moteur principal du mouvement intraday

---

## CAPTURE 2 — FLOW ANALYSIS

### PANEL 1 — Net Flow (Premium)
**CHAPITRE :** Flux de premium options
**LEÇON :** Les puts ont dominé le flow en premium 2:1 — MAIS ce n'est PAS bearish
**LECTURE :** Calls $328.7M vs Puts $707.3M. Ratio Puts/Calls en premium = 2.15:1.
**INTERPRÉTATION :** Le flow de puts massif n'est pas nécessairement bearish. En contexte post-FOMC avec le prix en rally, ces puts sont probablement : (1) des hedges institutionnels protégeant les longs futures/actions, (2) des ventes de puts (short puts) par des dealers, (3) des spreads.
**PIÈGE RETAIL :** Lire "$707M de puts" et conclure "bearish" → ERREUR classique. Le context (prix en hausse simultanée) est essentiel.
**À RETENIR :**
1. Put/Call premium ratio 2.15:1 = hedging massif, pas selling pressure
2. Les institutions achètent de la protection en même temps qu'elles sont longues
3. Flux de puts pendant un rally = signe de CONFIANCE institutionnelle

### PANEL 2 — Net Drift (Premium)
**LEÇON :** Le call drift négatif persistant signale une accumulation méthodique de shorts calls
**À RETENIR :**
1. Call drift -$54M = income strategy (covered calls) → résistance passive au-dessus
2. Put drift crash à 14h30 = catalyseur du rally
3. Le net drift combiné est bearish en surface mais bullish en contexte

### PANEL 3 — Heat Map GEX
**LEÇON :** Le GEX concentré sur Jun 18 (+$46.63M) signale des positions massives à moyen terme
**À RETENIR :**
1. Jun 18 (+$46.63M GEX) = expiration clé avec gamma positif
2. MVC $440 pour le 20/03 = très au-dessus du prix → call heavy
3. Apr 17 et May 15 = zones de danger gamma négatif

### PANEL 4 — Heat Map VEX
**LEÇON :** Le VEX négatif dominant signale que la compression de vol va continuer à impacter le positionnement
**À RETENIR :**
1. VEX négatif sur la majorité des expirations = sensibilité à la vol
2. Compression de vol post-FOMC = pression vendeuse VEX
3. Un retour de la vol (géopolitique?) inverserait le VEX → bullish

---

## CAPTURE 3 — DARK POOL / EQUITIES

### PANEL 1 — Stock Price/Time
**LEÇON :** Rally de type "V-recovery" classique post-FOMC
**LECTURE :** Open ~$419, Low ~$417 (9h30-10h), consolidation $420-$425 (10h-14h30), breakout explosif $425→$428+ (14h30-16h). Close $427.36.

### PANEL 2 — Dark Pool Levels (Top 50)
**LEÇON :** ACCUMULATION MASSIVE à $422-$424 — les institutions ont construit des positions pendant la consolidation

| Rang | Prix | Notionnel | % Volume | Signal |
|------|------|-----------|----------|--------|
| 43 | $422.45 | $57.74M | 7.51% | MÉGA accumulation |
| 16 | $423.50 | $48.90M | 6.34% | Accumulation forte |
| 3 | $424.96 | $42.47M | 5.49% | Accumulation |
| 1 | $426.41 | $30.14M | 3.88% | Close level buying |
| 22 | $423.38 | $24.34M | 3.16% | Accumulation |
| 50 | $418.89 | $26.97M | 3.54% | Dip buying |
| 35 | $423.10 | $24.78M | 3.22% | Accumulation |
| 47 | $420 | $15.24M | 1.99% | Support DP |

**SIGNAL MAJEUR :** $57.74M à $422.45 + $48.90M à $423.50 = plus de $106M d'accumulation dark pool dans une zone de $1.
**FENÊTRE SNIPER :** $422-424 = la zone d'accumulation DP. Demain, si le prix revient vers $423-424, c'est un support DP béton.
**PIÈGE RETAIL :** Vendre à $423 pendant la consolidation = vendre dans les mains des institutions.

### PANEL 3 — Equity Prints
**LEÇON :** La majorité des prints sont rouges (at bid) = accumulation passive
**LECTURE :** Block buy à $427.35 à 16h16 (après la clôture) = achat institutionnel au close → confiance dans la direction.

### PANEL 4 — Dark Flow
**LEÇON :** Notionnel total dark flow $4.26B = volume institutionnel massif sur GLD

---

## CAPTURE 4 — VOLATILITY ANALYSIS

### PANEL 1 — Volatility Drift (ARV vs IV)
**LEÇON :** IV à 2x l'ARV = prime de vol élevée, opportunities de vente de vol
**LECTURE :** ARV (Actual Realized Vol) : 6.08%. IV (Implied Vol) : 12.40%. Ratio IV/ARV = 2.04x.
**À RETENIR :**
1. IV/ARV = 2.04x → options surévaluées
2. Opportunité de vente de vol (iron condors, strangles vendus)
3. La compression post-FOMC est encore en cours

### PANEL 2 — IV Rank
**LEÇON :** IV Rank à 47.55% = zone médiane, ni cheap ni extrême

### PANEL 3 — Volatility Skew
**LEÇON :** Skew put extrême (275-340% vs 115-125%) = demande massive de protection downside

### PANEL 4 — Term Structure
**LEÇON :** Backwardation sévère au matin, puis aplatissement = la volatilité front-month s'est effondrée
**À RETENIR :**
1. Backwardation → contango = normalisation post-événement
2. L'IV front-month écrasée = plus de marge de manoeuvre pour le prix
3. Opportunity pour vendre des options à court terme à IV encore élevée

---

## CAPTURE 5 — EXPOSURE

### Net Charm Exposure by Strike
**LEÇON :** Charm positif le matin puis négatif massif l'après-midi = flip du positionnement temporel

### Net Vanna Exposure by Expiration
**LEÇON :** VEX positif MASSIF de 13h à 15h = les dealers ont dû acheter pendant le rally

### Net Vanna Exposure by Strike
**LEÇON :** VEX négatif sous le prix, positif au-dessus = setup bullish classique

---

## CAPTURE 6 — OPEN INTEREST

### OI by Expiration
**LEÇON :** Les calls dominent massivement les puts en OI → positionnement bullish structurel

### Max Pain / Time
**LEÇON :** Max pain varie entre $375 et $470 selon les expirations → le prix actuel ($427) est au milieu

### OI Change Table
**LEÇON :** OI builds massifs sur les calls $470-$515 = paris haussiers agressifs
**LECTURE :** Changements OI majeurs : $470C +117,042%, $485C +60,140%, $475C +198,310%

---

## CAPTURE 7 — STATISTICS

### Contract Statistics
**LEÇON :** Premium puts dominant mais volume quasi-égal = hedging, pas directional
**LECTURE :** Premium : Puts $707.34M (68.27%) vs Calls $528.73M (31.73%). Volume : 591.25K calls (50.38%) vs 582.25K puts (49.62%).

### Contract Trade Side Statistics
**LEÇON :** 71.92% des calls exécutés au Ask = achats agressifs de calls

---

## CAPTURE 8 — EXPOSURE BY STRIKE + EXPOSITION

### Exposures by Expiration (DEX, CHEX, GEX, VEX)
**LEÇON :** La décomposition par expiration montre un positionnement bullish structurel

### Exposures by Strike (DEX, CHEX, GEX, VEX)
**LEÇON :** Tous les Greeks par strike confirment : le positionnement est asymétriquement bullish au-dessus du prix

---

# ÉTAPE 3 — TABLEAUX CHIFFRÉS

## Tableau Récapitulatif des Niveaux GPS

| Niveau GLD | Type | Grec | Force | Description |
|------------|------|------|-------|-------------|
| $429 | MUR | GEX+ | ★★★★★ | Résistance gamma majeure |
| $427.36 | CLOSE | - | - | Prix de clôture |
| $426.41 | AIMANT | DEX+/DP | ★★★ | DP $30.14M + DEX positif |
| $425-426 | AIMANT | DEX+/GEX+/VEX+ | ★★★★ | Cluster multi-grec bullish |
| $424.96 | SUPPORT | DP | ★★★ | DP $42.47M |
| $424 | FLIP | GEX | ★★★★ | GEX flip zone |
| $423.50 | SUPPORT | DP | ★★★★ | DP $48.90M |
| $422.45 | SUPPORT MAJEUR | DP | ★★★★★ | DP $57.74M = support béton |
| $420 | MUR | DEX+/VEX-/DP | ★★★★★ | Support multi-grec + DP $15M |
| $418.89 | SUPPORT | DP | ★★★ | DP $26.97M |
| $417 | LOW | VEX- | ★★★ | Low de session + VEX négatif |

## Tableau Flux

| Métrique | Valeur | Signal |
|----------|--------|--------|
| Net Flow Calls | $328.7M | Bullish |
| Net Flow Puts | $707.3M | Hedging |
| Net Drift Calls | -$54.05M | Selling |
| Net Drift Puts | -$31.72M | Neutre |
| P/C Ratio (Premium) | 2.15:1 | Hedging |
| P/C Ratio (Volume) | 0.98:1 | Balanced |
| Dark Flow Notional | $4.26B | Institutional |

## Tableau Volatilité

| Métrique | Valeur | Signal |
|----------|--------|--------|
| ARV | 6.08% | Neutre |
| IV | 12.40% | Élevé |
| IV/ARV Ratio | 2.04x | Options chères |
| IV Rank (365d) | 47.55% | Médian |
| Skew Put | 275-340% | Demand intense |
| Skew Call | 115-125% | Relativement cheap |
| Term Structure | Backwardation→Contango | Normalisation |

---

# ÉTAPE 4 — BILAN DE SESSION

## BILAN DE LA JOURNÉE

- **Open → Close :** ~$419 → $427.36 (+$8.36, +2.0%)
- **High/Low de session :** ~$428.50 / ~$417.00
- **Range total :** $11.50 (2.7%)
- **Volume total options :** 1,173,500 contrats (591K calls + 582K puts)
- **Net Flow final :** Calls $328.7M vs Puts $707.3M
- **Dark Pool :** ACCUMULATION MASSIVE à $422-$424 ($106M+ dans $1 de range)
- **IV en fin de session vs début :** Compression massive (115% → 25-30% front-month)

## CE QUI A CHANGÉ AUJOURD'HUI

- **$420 DEX/VEX :** A tenu comme support parfait
- **$425 DEX/GEX :** A d'abord résisté puis a cassé vers le haut
- **$429 GEX MUR :** N'a PAS été testé (high ~$428.50) → intact pour demain
- **Scénario validé :** Scénario A (bullish) — le flush initial à $417 puis recovery au-dessus de $425
- **Nouveaux niveaux :** Accumulation DP massive à $422-$424 = nouveau support béton

## LEÇON DU JOUR

- **Bien fonctionné :** L'analyse des niveaux DEX ($420 support, $425 aimant) et GEX ($424 flip) a été parfaitement précise
- **Raté :** La violence du drop initial à $417 n'était pas anticipée dans son amplitude
- **Note de qualité :** 7.5/10

---

# ÉTAPE 5 — CE QUE LE RETAIL NE VOIT PAS

1. **Le flux de puts massif ($707M) n'est PAS bearish** — C'est du hedging institutionnel. Le retail voit "$707M de puts" et vend. Les institutions achètent des puts pour protéger leurs longs.
2. **L'accumulation DP à $422-424 ($106M+)** — Le retail ne voit pas les dark pools. Les institutions ont construit des positions PENDANT la consolidation.
3. **Le mécanisme VEX du rally** — La compression de vol post-FOMC a FORCÉ les dealers à acheter (VEX positif au-dessus de $425).
4. **Le GEX flip à $424** — Au-dessus de $424, les dealers stabilisent. En-dessous, ils amplifient.
5. **Le skew put à 300%+** — Les institutions paient cher pour la protection, signe de CONFIANCE dans le long.

---

# ÉTAPE 6 — MODULE OPTIONS

## Bilan Options du Jour

- **Stratégie du jour validée :** Long GLD avec protection put
- **Call premium @ Ask = 71.92%** → Achats agressifs de calls
- **Put/Call volume ratio quasi 1:1** avec premium puts 2:1 → Options chères sur le put side
- **IV Crush post-FOMC massif** → Les vendeurs d'options ont gagné
- **VEX positif a amplifié le rally** → Les positions longues vanna ont surperformé

## Stratégie Recommandée pour Demain

1. **Bull Put Spread** $420/$417 (exp. 21/03 ou 28/03) — Profite du support DP à $420 et du IV crush continu
2. **Call Debit Spread** $428/$432 (exp. 28/03) — Si breakout au-dessus de $429 (mur GEX)
3. **ÉVITER** les naked calls au-dessus de $429 (mur GEX = risque de pin)
4. **Iron Condor** $417/$420 / $429/$432 si range day attendu

---

# ÉTAPE 7 — PRÉPARATION LENDEMAIN

## PLAN LASER LENDEMAIN (CFD basé sur future + GLD)

- **Biais overnight :** BULLISH modéré
  - Raison : Accumulation DP massive, IV crush favorable, clôture sur les highs, FOMC digéré
  - Risque : $429 GEX wall = résistance majeure, géopolitique (US-Iran)

## GPS DU 20 MARS 2026 (à coller sur le chart)

**Biais : BULLISH** (modéré, avec prudence sur $429)

**Aimants :**
- $425 (DEX+, GEX+, VEX+) — aimant magnétique si pullback
- $429 (GEX+ massif) — target bull si momentum continue

**Murs :**
- $429 : MUR GEX GAMMA ★★★★★ — Résistance #1
- $422.45-$423.50 : MUR DP ($106M+) — Support #1
- $420 : MUR DEX/VEX/DP — Support #2 ultime

**Zones à surveiller en pré-market :**
- Si gap up > $428 → watch $429 pour rejection
- Si flat open $426-428 → watch réaction à $425 (pullback buy)
- Si gap down < $425 → watch $422-424 (DP support)

**Scénario A (BULL — 60% prob.) :**
- Trigger : Open > $426, pullback tenu à $425
- Invalidation : Cassure sous $424 en volume
- TP1 : $429 (mur GEX) | TP2 : $432 (si cassure $429 avec volume)
- SL : $423.50

**Scénario B (BEAR — 25% prob.) :**
- Trigger : Open < $425 ou rejection de $429 avec volume
- Invalidation : Reprise de $426 avec momentum
- TP1 : $423.50 (DP support) | TP2 : $420 (support majeur)
- SL : $427.50

**No-trade zone :** $425-$427 (congestion, pas de edge clair)

**Risque :** Max 1% du capital par trade. Post-FOMC = vol encore élevée.

---

# ÉTAPE 8 — ANALYSE MACRO & CATALYSEURS

## CONTEXTE MACRO GLOBAL

**Bull Case Gold :**
- Fed maintient 3.50-3.75%, dot plot montre 1 cut en 2026
- US-Iran conflit escalade → risk-off → or refuge
- Tarifs universels 10% (Section 122) → inflation → or bénéficie
- Banques centrales accumulent 585 tonnes/trimestre (JPM)
- DXY à 100.15 = dollar faible
- VIX 25.09 (+12%) = stress marché

**Bear Case Gold :**
- Taux réels encore élevés (10Y @ 4.26%)
- Oil à $120 → Fed cannot cut → non-yielding assets underperform
- Dollar en hausse récente
- Gold a perdu $310 vs la veille → correction technique possible

## CALENDRIER MACRO

**Semaine du 17-21 Mars 2026 :**

| Date | Heure (ET/Paris) | Événement | Impact Gold | Importance |
|------|-------------------|-----------|-------------|------------|
| Mar 18 | 14h/20h | FOMC Decision PASSÉ | Hold = neutre/bull | ★★★★★ |
| Mar 18 | 14h30/20h30 | Powell Press Conf PASSÉ | Dovish tone | ★★★★★ |
| Mar 20 | 8h30/14h30 | Jobless Claims | Si élevé = gold bull | ★★★ |
| Mar 20 | 10h/16h | Existing Home Sales | Faible impact gold | ★★ |
| Mar 21 | 10h/16h | Leading Indicators | Si faible = recession fears | ★★ |

**Semaine du 24-28 Mars 2026 :**

| Date | Heure (ET/Paris) | Événement | Impact Gold | Importance |
|------|-------------------|-----------|-------------|------------|
| Mar 24 | 9h45/15h45 | PMI Flash Mar | Si faible = gold bull | ★★★ |
| Mar 25 | 10h/16h | Consumer Confidence | Si faible = gold bull | ★★★ |
| Mar 26 | 8h30/14h30 | Durable Goods | Neutre | ★★★ |
| Mar 27 | 8h30/14h30 | GDP Q4 Final | Si révisé en baisse = gold bull | ★★★★ |
| Mar 28 | 8h30/14h30 | PCE Price Index | Si élevé = Fed hawkish = gold bear | ★★★★★ |

## SCÉNARIOS MACRO

**Scénario BULL (50% prob.) :** La Fed maintient les taux, le conflit US-Iran s'intensifie, les tarifs créent de l'inflation → gold cible $4,800-$5,000 (GC) sur 2-4 semaines.
- Cible GLD : $440-$465

**Scénario BEAR (20% prob.) :** Dollar renforcé par le flight-to-safety, oil $120 empêche les coupes de taux, gold corrige → $4,200-$4,400 (GC).
- Cible GLD : $400-$415

**Scénario RANGE (30% prob.) :** Marché digère FOMC, attend les données de la semaine prochaine → gold oscille $4,450-$4,700 (GC).
- Cible GLD : $420-$435

## CONSENSUS ANALYSTES

| Banque | Cible EOY 2026 (GC) | Cible GLD equiv. | Biais |
|--------|---------------------|-------------------|-------|
| J.P. Morgan | $6,300 | ~$587 | Ultra-bull |
| Goldman Sachs | $5,400 | ~$503 | Bull |
| JPM (upside) | $8,000-$8,500 | ~$745-$791 | Extrême |
| Consensus | $5,000-$5,500 | ~$465-$512 | Bull |

---

# ÉTAPE 9 — CONVERSION NIVEAUX GLD → GOLD FUTURES (GC)

## Calcul du Ratio

- **Gold Futures (GC) :** ~$4,588 (close estimé 19/03/2026)
- **GLD :** $427.36
- **Ratio :** $4,588 / $427.36 = **10.74**

## TABLE DE CONVERSION COMPLÈTE

| Niveau GLD | Niveau GC Future | Type | Description |
|------------|-----------------|------|-------------|
| $432 | $4,640 | TP2 Bull | Target extended si cassure $429 |
| $429 | $4,607 | MUR | GEX gamma wall — résistance #1 |
| $428.50 | $4,602 | HIGH | High de session |
| $427.36 | $4,590 | CLOSE | Prix de clôture |
| $426.41 | $4,580 | AIMANT | DP $30M + DEX+ |
| $425 | $4,565 | AIMANT | Cluster multi-grec bullish |
| $424.96 | $4,564 | SUPPORT | DP $42M |
| $424 | $4,554 | FLIP | GEX flip zone |
| $423.50 | $4,549 | SUPPORT | DP $49M — SL scénario A |
| $422.45 | $4,537 | SUPPORT BÉTON | DP $57.74M — MÉGA support |
| $420 | $4,511 | MUR | Support multi-grec ultime |
| $418.89 | $4,499 | SUPPORT | DP $27M |
| $417 | $4,479 | LOW | Low de session + VEX- |

## GPS FUTURES — 20 MARS 2026

**Biais : BULLISH modéré**

**Aimants :**
- $4,565 (≈GLD $425) — aimant si pullback
- $4,607 (≈GLD $429) — target bull

**Murs :**
- $4,607 : MUR GAMMA ★★★★★ — Résistance #1
- $4,537-$4,549 : MUR DP — Support #1
- $4,511 : MUR MULTI-GREC — Support #2 ultime

**Scénario A FUTURES (BULL — 60%) :**
- Trigger : Open > $4,575, pullback tenu à $4,565
- TP1 : $4,607 | TP2 : $4,640
- SL : $4,549

**Scénario B FUTURES (BEAR — 25%) :**
- Trigger : Open < $4,565 ou rejection de $4,607
- TP1 : $4,549 | TP2 : $4,511
- SL : $4,600

---

*Rapport du 19/03/2026 à 22h00 Paris | Source données : QuantData v3*
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

export async function POST() {
  try {
    // Require admin session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin requis" }, { status: 403 });
    }

    const admin = user;

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
          title: "GLD — Analyse Post-Clôture 360° | 19 Mars 2026",
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
          title: "GLD — Analyse Post-Clôture 360° | 19 Mars 2026",
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
