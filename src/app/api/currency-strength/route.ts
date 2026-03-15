import { NextResponse } from "next/server";

const FALLBACK_STRENGTHS: Record<string, number> = {
  USD: 62, EUR: 55, GBP: 58, JPY: 35, AUD: 45, CAD: 48, CHF: 52, NZD: 42,
};

export async function GET() {
  // Try ExchangeRate-API first (more reliable)
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const rates = data.rates || {};
      const currencies = ["EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "USD"];
      const strengths: Record<string, number> = {};
      currencies.forEach((c) => {
        if (c === "USD") { strengths[c] = 55; return; }
        const rate = rates[c];
        if (!rate) { strengths[c] = 50; return; }
        if (c === "JPY") strengths[c] = Math.max(10, Math.min(90, 100 - (rate - 100) / 1.5));
        else strengths[c] = Math.max(10, Math.min(90, (1 / rate) * 55));
      });
      return NextResponse.json({ source: "exchangerate", strengths });
    }
  } catch {
    // continue to fallback
  }

  // Try CurrencyQuake as secondary
  try {
    const res = await fetch("https://currencyquake.com/api.php", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ source: "currencyquake", ...data });
    }
  } catch {
    // continue to fallback
  }

  // Static fallback so the page always shows data
  return NextResponse.json({ source: "fallback", strengths: FALLBACK_STRENGTHS });
}
