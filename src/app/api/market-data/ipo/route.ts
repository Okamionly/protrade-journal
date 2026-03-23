import { NextResponse } from "next/server";

// ============================================================
// Finnhub IPO Calendar
// GET /api/market-data/ipo
// Returns upcoming IPOs for the next ~2 months
// ============================================================

export interface IpoEvent {
  name: string;
  symbol: string;
  date: string;
  exchange: string;
  price: string;
  numberOfShares: number | null;
  totalSharesValue: number | null;
  status: string;
}

interface CachedIpo {
  data: IpoEvent[];
  ts: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let ipoCache: CachedIpo | null = null;

interface FinnhubIpoItem {
  name?: string;
  symbol?: string;
  date?: string;
  exchange?: string;
  price?: string;
  numberOfShares?: number;
  totalSharesValue?: number;
  status?: string;
}

export async function GET() {
  // Return cache if fresh
  if (ipoCache && Date.now() - ipoCache.ts < CACHE_TTL) {
    return NextResponse.json({ ipos: ipoCache.data }, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=3600" },
    });
  }

  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ error: "Finnhub API key not configured" }, { status: 500 });
  }

  // Fetch IPOs from today to ~2 months ahead
  const now = new Date();
  const from = now.toISOString().split("T")[0];
  const toDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const to = toDate.toISOString().split("T")[0];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Finnhub API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const raw: FinnhubIpoItem[] = data?.ipoCalendar || [];

    const ipos: IpoEvent[] = raw
      .filter((item) => item.date && item.name)
      .map((item) => ({
        name: item.name || "",
        symbol: item.symbol || "",
        date: item.date || "",
        exchange: item.exchange || "",
        price: item.price || "TBD",
        numberOfShares: item.numberOfShares ?? null,
        totalSharesValue: item.totalSharesValue ?? null,
        status: item.status || "",
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30);

    ipoCache = { data: ipos, ts: Date.now() };

    return NextResponse.json({ ipos }, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch IPO calendar" }, { status: 502 });
  }
}
