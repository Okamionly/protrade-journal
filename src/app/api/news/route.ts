import { NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

export async function GET() {
  if (!FINNHUB_API_KEY) {
    return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Finnhub news error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
