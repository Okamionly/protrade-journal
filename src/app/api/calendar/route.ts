import { NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "d6qucn9r01qgdhqcfkrgd6qucn9r01qgdhqcfks0";

export async function GET() {
  if (!FINNHUB_API_KEY) {
    return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
  }

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  try {
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Finnhub API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
