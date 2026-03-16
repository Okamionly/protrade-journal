import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);
    const res = await fetch(`https://api.alternative.me/fng/?limit=${days}&format=json`, {
      next: { revalidate: 300 }, // Cache 5 min
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Fear & Greed API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
