import { NextResponse } from "next/server";

const LBMA_URLS = {
  gold_am: "https://prices.lbma.org.uk/json/gold_am.json",
  gold_pm: "https://prices.lbma.org.uk/json/gold_pm.json",
  silver: "https://prices.lbma.org.uk/json/silver.json",
};

interface LbmaEntry {
  d: string;
  v: [number | null, number | null, number | null];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") || "365"), 3650);

    const [goldAm, goldPm, silver] = await Promise.all([
      fetch(LBMA_URLS.gold_am, { next: { revalidate: 3600 } }).then((r) => r.json()),
      fetch(LBMA_URLS.gold_pm, { next: { revalidate: 3600 } }).then((r) => r.json()),
      fetch(LBMA_URLS.silver, { next: { revalidate: 3600 } }).then((r) => r.json()),
    ]);

    const sliceLast = (arr: LbmaEntry[], n: number) =>
      arr.filter((e: LbmaEntry) => e.v[0] != null && e.v[0] > 0).slice(-n);

    return NextResponse.json({
      gold_am: sliceLast(goldAm, days),
      gold_pm: sliceLast(goldPm, days),
      silver: sliceLast(silver, days),
      updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LBMA API error:", error);
    return NextResponse.json({ error: "Failed to fetch LBMA data" }, { status: 500 });
  }
}
