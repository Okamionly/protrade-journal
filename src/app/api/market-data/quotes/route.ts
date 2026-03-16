import { NextResponse } from "next/server";

const API_KEY = process.env.MARKETDATA_API_KEY;
const BASE = "https://api.marketdata.app/v1";

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BASE}/stocks/quotes/?symbols=${encodeURIComponent(symbols)}&52week=true`,
      {
        headers: { Authorization: `Token ${API_KEY}` },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("MarketData quotes error:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
