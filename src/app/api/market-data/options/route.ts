import { NextResponse } from "next/server";

const API_KEY = process.env.MARKETDATA_API_KEY;
const BASE = "https://api.marketdata.app/v1";

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const expiration = searchParams.get("expiration") || "all";
  const side = searchParams.get("side");
  const strikeLimit = searchParams.get("strikeLimit") || "10";

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  try {
    let url = `${BASE}/options/chain/${encodeURIComponent(symbol)}/?expiration=${expiration}&strikeLimit=${strikeLimit}`;
    if (side) url += `&side=${side}`;

    const res = await fetch(url, {
      headers: { Authorization: `Token ${API_KEY}` },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("MarketData options error:", error);
    return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 });
  }
}
