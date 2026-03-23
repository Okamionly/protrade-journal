// ─── Market Phase Detection Engine ───────────────────────────────────
// Wyckoff-inspired phase detection using SMA, ROC, ATR

export type MarketPhase = "accumulation" | "markup" | "distribution" | "markdown";

export interface PhaseResult {
  phase: MarketPhase;
  confidence: number; // 0-100
  description: string; // French
  tradingAdvice: string; // French
  signals: string[];
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function roc(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      result.push(((values[i] - values[i - period]) / values[i - period]) * 100);
    }
  }
  return result;
}

function atr(candles: Candle[], period: number): number[] {
  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trueRanges.push(c.high - c.low);
    } else {
      const prevClose = candles[i - 1].close;
      trueRanges.push(
        Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose))
      );
    }
  }
  return sma(trueRanges, period);
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

// ─── Phase descriptions ──────────────────────────────────────────────

const PHASE_META: Record<
  MarketPhase,
  { description: string; tradingAdvice: string }
> = {
  accumulation: {
    description:
      "Phase d'accumulation : le prix consolide dans un range apres une tendance baissiere. Les institutionnels accumulent des positions. La volatilite se contracte et le volume augmente sur les bougies haussieres.",
    tradingAdvice:
      "Recherchez des setups d'achat pres du bas du range. Positionnez-vous pour le breakout haussier imminent. Stop loss sous le support du range. Ratio risque/recompense optimal : 1:3 minimum.",
  },
  markup: {
    description:
      "Phase de markup : tendance haussiere confirmee. Le prix fait des plus hauts et plus bas de plus en plus hauts. La SMA20 est au-dessus de la SMA50 avec un momentum positif.",
    tradingAdvice:
      "Achetez les pullbacks vers la SMA20. Suivez la tendance avec des trailing stops. Evitez de shorter. Augmentez la taille des positions sur les signaux de continuation.",
  },
  distribution: {
    description:
      "Phase de distribution : le prix consolide dans un range apres une tendance haussiere. Les institutionnels distribuent leurs positions. La volatilite se contracte et le volume augmente sur les bougies baissieres.",
    tradingAdvice:
      "Allegez vos positions longues. Preparez des setups de vente pres du haut du range. Attention au breakdown baissier. Reduisez votre exposition globale.",
  },
  markdown: {
    description:
      "Phase de markdown : tendance baissiere confirmee. Le prix fait des plus bas de plus en plus bas. La SMA20 est sous la SMA50 avec un momentum negatif.",
    tradingAdvice:
      "Vendez les rebonds vers la SMA20. Suivez la tendance baissiere. Evitez d'acheter. Utilisez des positions reduites car la volatilite est elevee.",
  },
};

// ─── Main detection ──────────────────────────────────────────────────

export function detectMarketPhase(candles: Candle[]): PhaseResult {
  if (candles.length < 52) {
    return {
      phase: "accumulation",
      confidence: 10,
      description: "Donnees insuffisantes pour une analyse fiable (minimum 52 bougies requises).",
      tradingAdvice: "Attendez plus de donnees avant de prendre une decision.",
      signals: ["Donnees insuffisantes"],
    };
  }

  const closes = candles.map((c) => c.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const roc14 = roc(closes, 14);
  const atr14 = atr(candles, 14);

  const currentSMA20 = last(sma20);
  const currentSMA50 = last(sma50);
  const currentROC = last(roc14);
  const currentATR = last(atr14);

  // Average ATR over longer period for comparison
  const validATR = atr14.filter((v) => !isNaN(v));
  const avgATR = validATR.reduce((a, b) => a + b, 0) / validATR.length;

  // Is price in a range? (ATR contracting)
  const isRange = currentATR < 0.7 * avgATR;

  // SMA crossover direction
  const smaAbove = currentSMA20 > currentSMA50;
  const prevSMA20_5 = sma20[sma20.length - 6];
  const prevSMA50_5 = sma50[sma50.length - 6];
  const wasSMAAbove = !isNaN(prevSMA20_5) && !isNaN(prevSMA50_5) && prevSMA20_5 > prevSMA50_5;
  const crossingUp = smaAbove && !wasSMAAbove;
  const crossingDown = !smaAbove && wasSMAAbove;

  // Higher highs / lower lows
  const recentHighs = lastN(candles, 10).map((c) => c.high);
  const olderHighs = candles.slice(-20, -10).map((c) => c.high);
  const higherHighs =
    recentHighs.length > 0 &&
    olderHighs.length > 0 &&
    Math.max(...recentHighs) > Math.max(...olderHighs);
  const lowerLows =
    recentHighs.length > 0 &&
    olderHighs.length > 0 &&
    Math.min(...lastN(candles, 10).map((c) => c.low)) <
      Math.min(...candles.slice(-20, -10).map((c) => c.low));

  // Volume analysis (only if volume data is available)
  const hasVolume = candles.some((c) => c.volume && c.volume > 0);
  let volumeUpBias = false;
  let volumeDownBias = false;

  if (hasVolume) {
    const recent = lastN(candles, 10);
    const upCandles = recent.filter((c) => c.close > c.open);
    const downCandles = recent.filter((c) => c.close <= c.open);
    const avgUpVol =
      upCandles.length > 0
        ? upCandles.reduce((s, c) => s + (c.volume || 0), 0) / upCandles.length
        : 0;
    const avgDownVol =
      downCandles.length > 0
        ? downCandles.reduce((s, c) => s + (c.volume || 0), 0) / downCandles.length
        : 0;
    volumeUpBias = avgUpVol > avgDownVol * 1.2;
    volumeDownBias = avgDownVol > avgUpVol * 1.2;
  }

  const expandingATR = currentATR > avgATR;

  // ─── Score each phase ──────────────────────────────────────────────
  const scores: Record<MarketPhase, { score: number; signals: string[] }> = {
    accumulation: { score: 0, signals: [] },
    markup: { score: 0, signals: [] },
    distribution: { score: 0, signals: [] },
    markdown: { score: 0, signals: [] },
  };

  // Accumulation: range + after downtrend + volume up bias
  if (isRange) {
    scores.accumulation.score += 25;
    scores.accumulation.signals.push("ATR contracte (range detecte)");
    scores.distribution.score += 25;
    scores.distribution.signals.push("ATR contracte (range detecte)");
  }
  if (!smaAbove || crossingUp) {
    scores.accumulation.score += 20;
    scores.accumulation.signals.push("SMA20 sous/croisant SMA50");
  }
  if (crossingUp) {
    scores.accumulation.score += 15;
    scores.accumulation.signals.push("Croisement haussier en cours");
  }
  if (volumeUpBias) {
    scores.accumulation.score += 20;
    scores.accumulation.signals.push("Volume superieur sur bougies haussiere");
  }

  // Markup: SMA20 > SMA50 + positive ROC + expanding ATR + higher highs
  if (smaAbove) {
    scores.markup.score += 25;
    scores.markup.signals.push("SMA20 > SMA50");
  }
  if (currentROC > 0) {
    scores.markup.score += 20;
    scores.markup.signals.push(`ROC14 positif (${currentROC.toFixed(2)}%)`);
  }
  if (expandingATR && !isRange) {
    scores.markup.score += 15;
    scores.markup.signals.push("ATR en expansion");
  }
  if (higherHighs) {
    scores.markup.score += 20;
    scores.markup.signals.push("Plus hauts croissants");
  }

  // Distribution: range + after uptrend + volume down bias
  if (smaAbove || crossingDown) {
    scores.distribution.score += 20;
    scores.distribution.signals.push("SMA20 au-dessus/croisant SMA50");
  }
  if (crossingDown) {
    scores.distribution.score += 15;
    scores.distribution.signals.push("Croisement baissier en cours");
  }
  if (volumeDownBias) {
    scores.distribution.score += 20;
    scores.distribution.signals.push("Volume superieur sur bougies baissieres");
  }

  // Markdown: SMA20 < SMA50 + negative ROC + expanding ATR + lower lows
  if (!smaAbove) {
    scores.markdown.score += 25;
    scores.markdown.signals.push("SMA20 < SMA50");
  }
  if (currentROC < 0) {
    scores.markdown.score += 20;
    scores.markdown.signals.push(`ROC14 negatif (${currentROC.toFixed(2)}%)`);
  }
  if (expandingATR && !isRange) {
    scores.markdown.score += 15;
    scores.markdown.signals.push("ATR en expansion");
  }
  if (lowerLows) {
    scores.markdown.score += 20;
    scores.markdown.signals.push("Plus bas decroissants");
  }

  // Find winner
  const entries = Object.entries(scores) as [MarketPhase, { score: number; signals: string[] }][];
  entries.sort((a, b) => b[1].score - a[1].score);

  const [topPhase, topData] = entries[0];
  const confidence = Math.min(100, Math.max(10, topData.score));

  return {
    phase: topPhase,
    confidence,
    description: PHASE_META[topPhase].description,
    tradingAdvice: PHASE_META[topPhase].tradingAdvice,
    signals: topData.signals,
  };
}

// ─── Generate mock candle data for demo purposes ─────────────────────

export function generateDemoCandles(phase: MarketPhase, count: number = 60): Candle[] {
  const candles: Candle[] = [];
  let price = 1800; // e.g. XAUUSD base
  const now = new Date();

  for (let i = count; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    let change: number;
    const noise = (Math.random() - 0.5) * 10;

    switch (phase) {
      case "accumulation":
        change = (Math.random() - 0.48) * 8 + noise * 0.3;
        break;
      case "markup":
        change = (Math.random() - 0.3) * 12 + noise * 0.5;
        break;
      case "distribution":
        change = (Math.random() - 0.52) * 8 + noise * 0.3;
        break;
      case "markdown":
        change = (Math.random() - 0.7) * 12 + noise * 0.5;
        break;
    }

    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.abs(noise) * 0.5;
    const low = Math.min(open, close) - Math.abs(noise) * 0.5;
    const volume = Math.floor(50000 + Math.random() * 50000);

    candles.push({
      date: date.toISOString().split("T")[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return candles;
}
