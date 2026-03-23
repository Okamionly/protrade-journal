import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CommodityItem {
  commodity: string;
  price: number;
  date: string;
  change: number; // percent
  history: number[]; // last 10 prices for sparkline
}

// ---------------------------------------------------------------------------
// 1-hour in-memory cache
// ---------------------------------------------------------------------------
let cache: { data: CommodityItem[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Commodity definitions
// ---------------------------------------------------------------------------
const COMMODITIES: {
  fn: string;
  name: string;
  key: string; // JSON top-level key in AV response
  valueField: string;
}[] = [
  { fn: "WTI", name: "WTI", key: "data", valueField: "value" },
  { fn: "BRENT", name: "Brent", key: "data", valueField: "value" },
  { fn: "NATURAL_GAS", name: "Gaz naturel", key: "data", valueField: "value" },
  { fn: "COPPER", name: "Cuivre", key: "data", valueField: "value" },
  { fn: "WHEAT", name: "Blé", key: "data", valueField: "value" },
  { fn: "CORN", name: "Maïs", key: "data", valueField: "value" },
  { fn: "COTTON", name: "Coton", key: "data", valueField: "value" },
  { fn: "SUGAR", name: "Sucre", key: "data", valueField: "value" },
  { fn: "COFFEE", name: "Café", key: "data", valueField: "value" },
];

// ---------------------------------------------------------------------------
// Fetch a single commodity from Alpha Vantage
// ---------------------------------------------------------------------------
async function fetchCommodity(
  fn: string,
  name: string,
  key: string,
  valueField: string
): Promise<CommodityItem | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=${fn}&interval=monthly&apikey=${AV_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();

    const entries: Record<string, string>[] = json[key];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    // Filter out entries with "." as value (no data)
    const valid = entries.filter(
      (e) => e[valueField] && e[valueField] !== "." && !isNaN(parseFloat(e[valueField]))
    );
    if (valid.length === 0) return null;

    const latest = valid[0];
    const price = parseFloat(parseFloat(latest[valueField]).toFixed(2));
    const date = latest["date"] ?? "";

    // Calculate change from previous data point
    let change = 0;
    if (valid.length >= 2) {
      const prev = parseFloat(valid[1][valueField]);
      if (prev > 0) {
        change = parseFloat((((price - prev) / prev) * 100).toFixed(2));
      }
    }

    // History: last 10 prices (newest first -> reversed for chart)
    const history = valid
      .slice(0, 10)
      .map((e) => parseFloat(e[valueField]))
      .reverse();

    return { commodity: name, price, date, change, history };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function GET() {
  // Return cache if still fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  if (!AV_KEY) {
    return NextResponse.json(
      { error: "ALPHA_VANTAGE_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Fetch all commodities in parallel
  const results = await Promise.all(
    COMMODITIES.map((c) => fetchCommodity(c.fn, c.name, c.key, c.valueField))
  );

  const data = results.filter((r): r is CommodityItem => r !== null);

  // Populate cache
  cache = { data, ts: Date.now() };

  return NextResponse.json(data);
}
