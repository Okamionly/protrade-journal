import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"] as const;
type Currency = (typeof CURRENCIES)[number];

interface PairSuggestion {
  pair: string;
  direction: "LONG" | "SHORT";
  reason: string;
  delta: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (5 min)
// ---------------------------------------------------------------------------
let cachedResponse: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Core algorithm: momentum-based relative strength
// ---------------------------------------------------------------------------

/**
 * Build a complete cross-rate table from USD-based rates.
 * crossRates[A][B] = how many units of B you get for 1 unit of A.
 */
function buildCrossRates(usdRates: Record<string, number>): Record<Currency, Record<Currency, number>> {
  const cross = {} as Record<Currency, Record<Currency, number>>;
  for (const base of CURRENCIES) {
    cross[base] = {} as Record<Currency, number>;
    const baseInUsd = base === "USD" ? 1 : usdRates[base]; // units of base per 1 USD
    if (!baseInUsd) continue;
    for (const quote of CURRENCIES) {
      if (base === quote) {
        cross[base][quote] = 1;
        continue;
      }
      const quoteInUsd = quote === "USD" ? 1 : usdRates[quote]; // units of quote per 1 USD
      if (!quoteInUsd) continue;
      // 1 base = (1/baseInUsd) USD = (quoteInUsd/baseInUsd) quote
      cross[base][quote] = quoteInUsd / baseInUsd;
    }
  }
  return cross;
}

/**
 * Calculate strength scores (0-100) for each currency.
 *
 * Algorithm:
 * For each currency C, look at all 7 cross-rates C/X.
 * Compute how C performs relative to a "mid" expectation:
 *   score_C = average over all X of: log(crossRate(C,X))
 *
 * This gives a raw score where positive = C is relatively strong.
 * Then normalize all 8 raw scores to a 0-100 scale (50 = median).
 */
function computeStrengths(
  crossRates: Record<Currency, Record<Currency, number>>
): Record<Currency, number> {
  const rawScores: Record<string, number> = {};

  for (const base of CURRENCIES) {
    let sum = 0;
    let count = 0;
    for (const quote of CURRENCIES) {
      if (base === quote) continue;
      const rate = crossRates[base]?.[quote];
      if (!rate || rate <= 0) continue;
      // Use log so that symmetric pairs cancel out nicely
      sum += Math.log(rate);
      count++;
    }
    rawScores[base] = count > 0 ? sum / count : 0;
  }

  // Normalize to 0-100 scale centered at 50
  const values = Object.values(rawScores);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const strengths: Record<Currency, number> = {} as Record<Currency, number>;
  for (const c of CURRENCIES) {
    if (range === 0) {
      strengths[c] = 50;
    } else {
      // Map min->5, max->95 for visual spread
      const normalized = ((rawScores[c] - min) / range) * 90 + 5;
      strengths[c] = Math.round(normalized * 10) / 10;
    }
  }

  return strengths;
}

/**
 * Build the strength matrix: matrix[row][col] = strength(row) - strength(col)
 */
function buildMatrix(strengths: Record<Currency, number>): number[][] {
  return CURRENCIES.map((row) =>
    CURRENCIES.map((col) =>
      Math.round(((strengths[row] ?? 50) - (strengths[col] ?? 50)) * 10) / 10
    )
  );
}

/**
 * Generate 3-5 trade suggestions based on strength divergence.
 * Strongest vs weakest = LONG, weakest vs strongest = SHORT.
 */
function buildPairSuggestions(strengths: Record<Currency, number>): PairSuggestion[] {
  const sorted = CURRENCIES.slice()
    .sort((a, b) => (strengths[b] ?? 50) - (strengths[a] ?? 50));

  const suggestions: PairSuggestion[] = [];

  // Top 3 strongest vs bottom 3 weakest
  const count = 3;
  for (let i = 0; i < count; i++) {
    const strong = sorted[i];
    const weak = sorted[sorted.length - 1 - i];
    const delta = Math.round(((strengths[strong] ?? 50) - (strengths[weak] ?? 50)) * 10) / 10;

    suggestions.push({
      pair: `${strong}/${weak}`,
      direction: "LONG",
      reason: `${strong} (${(strengths[strong] ?? 50).toFixed(1)}) est fort vs ${weak} (${(strengths[weak] ?? 50).toFixed(1)}) faible`,
      delta,
    });
  }

  // Add 1-2 SHORT suggestions (weakest vs strongest, different combos)
  for (let i = 0; i < 2; i++) {
    const weak = sorted[sorted.length - 1 - i];
    const strong = sorted[i];
    if (suggestions.some((s) => s.pair === `${weak}/${strong}`)) continue;
    const delta = Math.round(((strengths[strong] ?? 50) - (strengths[weak] ?? 50)) * 10) / 10;
    suggestions.push({
      pair: `${weak}/${strong}`,
      direction: "SHORT",
      reason: `${weak} (${(strengths[weak] ?? 50).toFixed(1)}) est faible vs ${strong} (${(strengths[strong] ?? 50).toFixed(1)}) fort`,
      delta,
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------
// No fallback data — return error when API is unavailable

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET() {
  // Return cache if fresh
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse.data);
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`API responded ${res.status}`);

    const data = await res.json();
    const usdRates: Record<string, number> = data.rates ?? {};

    // Build cross-rate table
    const crossRates = buildCrossRates(usdRates);

    // Compute strengths
    const strengths = computeStrengths(crossRates);

    // Build matrix
    const matrix = buildMatrix(strengths);

    // Build pair suggestions
    const pairs = buildPairSuggestions(strengths);

    // Filter rates to only our 8 currencies
    const rates: Record<string, number> = {};
    for (const c of CURRENCIES) {
      if (c === "USD") {
        rates[c] = 1;
      } else if (usdRates[c]) {
        rates[c] = usdRates[c];
      }
    }

    const responseData = {
      strengths,
      rates,
      matrix,
      pairs,
      currencies: CURRENCIES,
      source: "exchangerate" as const,
      timestamp: Date.now(),
    };

    cachedResponse = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData);
  } catch {
    // Return error — no fake data
    return NextResponse.json(
      {
        error: "Données indisponibles",
        strengths: {},
        rates: {},
        matrix: [],
        pairs: [],
        currencies: CURRENCIES,
        source: "unavailable" as const,
        timestamp: Date.now(),
      },
      { status: 503 }
    );
  }
}
