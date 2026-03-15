import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://currencyquake.com/api.php", {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      // Fallback: calculate from ExchangeRate-API
      const fallbackRes = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!fallbackRes.ok) return NextResponse.json({ error: "API error" }, { status: 500 });
      const data = await fallbackRes.json();
      const rates = data.rates || {};
      // Simple strength: inverse of rate vs USD (higher rate = weaker)
      const currencies = ["EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "USD"];
      const strengths: Record<string, number> = {};
      currencies.forEach((c) => {
        if (c === "USD") { strengths[c] = 50; return; }
        const rate = rates[c];
        if (!rate) { strengths[c] = 50; return; }
        // Normalize: lower rate = stronger (for EUR, GBP), higher = weaker (for JPY)
        if (c === "JPY") strengths[c] = Math.max(0, Math.min(100, 100 - (rate - 100) / 2));
        else strengths[c] = Math.max(0, Math.min(100, (1 / rate) * 50));
      });
      return NextResponse.json({ source: "exchangerate", strengths });
    }
    const data = await res.json();
    return NextResponse.json({ source: "currencyquake", ...data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
