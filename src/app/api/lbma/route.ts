import { NextResponse } from "next/server";

const LBMA_URLS = {
  gold_am: "https://prices.lbma.org.uk/json/gold_am.json",
  gold_pm: "https://prices.lbma.org.uk/json/gold_pm.json",
  silver: "https://prices.lbma.org.uk/json/silver.json",
  platinum_am: "https://prices.lbma.org.uk/json/platinum_am.json",
  platinum_pm: "https://prices.lbma.org.uk/json/platinum_pm.json",
  palladium_am: "https://prices.lbma.org.uk/json/palladium_am.json",
  palladium_pm: "https://prices.lbma.org.uk/json/palladium_pm.json",
};

interface LbmaEntry {
  d: string;
  v: [number | null, number | null, number | null];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") || "365"), 3650);

    const [goldAm, goldPm, silver, platAm, platPm, pallAm, pallPm] = await Promise.all(
      Object.values(LBMA_URLS).map((url) =>
        fetch(url, { next: { revalidate: 3600 } })
          .then((r) => r.json())
          .catch(() => [])
      )
    );

    const sliceLast = (arr: LbmaEntry[], n: number) =>
      arr.filter((e: LbmaEntry) => e.v[0] != null && e.v[0] > 0).slice(-n);

    return NextResponse.json({
      gold_am: sliceLast(goldAm, days),
      gold_pm: sliceLast(goldPm, days),
      silver: sliceLast(silver, days),
      platinum_am: sliceLast(platAm, days),
      platinum_pm: sliceLast(platPm, days),
      palladium_am: sliceLast(pallAm, days),
      palladium_pm: sliceLast(pallPm, days),
      updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LBMA API error:", error);
    return NextResponse.json({ error: "Failed to fetch LBMA data" }, { status: 500 });
  }
}
