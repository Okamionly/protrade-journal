import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") || "30";

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "CoinGecko API error" }, { status: 502 });
    }

    const data = await res.json();
    // data.prices is [[timestamp, price], ...]
    const prices = (data.prices as [number, number][]).map(([ts, price]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      price: Math.round(price),
    }));

    // Deduplicate by date (keep last entry per day)
    const byDate = new Map<string, number>();
    prices.forEach((p) => byDate.set(p.date, p.price));

    return NextResponse.json(
      Array.from(byDate.entries()).map(([date, price]) => ({ date, price }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch BTC price" }, { status: 500 });
  }
}
