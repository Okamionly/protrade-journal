import { NextRequest, NextResponse } from "next/server";

const FRED_API_KEY = process.env.NEXT_PUBLIC_FRED_API_KEY || process.env.FRED_API_KEY || "fbc067585f9c2ab426adc843d3b5a30b";
const FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations";

export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get("series_id");
  const start = req.nextUrl.searchParams.get("observation_start") || "2020-01-01";

  if (!seriesId) {
    return NextResponse.json({ error: "Missing series_id" }, { status: 400 });
  }

  if (!FRED_API_KEY) {
    return NextResponse.json({ error: "FRED API key not configured" }, { status: 500 });
  }

  try {
    const url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${start}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `FRED API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
