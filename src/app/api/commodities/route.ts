import { NextResponse } from "next/server";
import { canMakeRequest, recordRequest } from "@/lib/alphaVantageRateLimit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CommodityItem {
  commodity: string;
  price: number;
  date: string;
  change: number;
  history: number[];
  isFallback?: boolean;
}

// ---------------------------------------------------------------------------
// 6-hour in-memory cache
// ---------------------------------------------------------------------------
let cache: { data: CommodityItem[]; ts: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Commodity definitions for Alpha Vantage
// ---------------------------------------------------------------------------
const COMMODITIES = [
  { fn: "WTI", name: "WTI", key: "data", valueField: "value" },
  { fn: "BRENT", name: "Brent", key: "data", valueField: "value" },
  { fn: "NATURAL_GAS", name: "Gaz naturel", key: "data", valueField: "value" },
  { fn: "COPPER", name: "Cuivre", key: "data", valueField: "value" },
  { fn: "WHEAT", name: "Bl\u00e9", key: "data", valueField: "value" },
  { fn: "CORN", name: "Ma\u00efs", key: "data", valueField: "value" },
  { fn: "COTTON", name: "Coton", key: "data", valueField: "value" },
  { fn: "SUGAR", name: "Sucre", key: "data", valueField: "value" },
  { fn: "COFFEE", name: "Caf\u00e9", key: "data", valueField: "value" },
];

// ---------------------------------------------------------------------------
// Fetch a single commodity from Alpha Vantage (with rate limiting)
// ---------------------------------------------------------------------------
async function fetchCommodity(
  fn: string,
  name: string,
  key: string,
  valueField: string
): Promise<CommodityItem | null> {
  if (!canMakeRequest()) return null;

  try {
    recordRequest();
    const url = `https://www.alphavantage.co/query?function=${fn}&interval=monthly&apikey=${AV_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();

    if (json["Note"] || json["Error Message"] || json["Information"]) {
      return null;
    }

    const entries: Record<string, string>[] = json[key];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const valid = entries.filter(
      (e) => e[valueField] && e[valueField] !== "." && !isNaN(parseFloat(e[valueField]))
    );
    if (valid.length === 0) return null;

    const latest = valid[0];
    const price = parseFloat(parseFloat(latest[valueField]).toFixed(2));
    const date = latest["date"] ?? "";

    let change = 0;
    if (valid.length >= 2) {
      const prev = parseFloat(valid[1][valueField]);
      if (prev > 0) {
        change = parseFloat((((price - prev) / prev) * 100).toFixed(2));
      }
    }

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

  // If no API key, return unavailable
  if (!AV_KEY) {
    return NextResponse.json({ error: "Donn\u00e9es indisponibles", commodities: [] }, { status: 503 });
  }

  // Check rate limit before attempting any fetches
  if (!canMakeRequest()) {
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json({ error: "Donn\u00e9es indisponibles", commodities: [] }, { status: 503 });
  }

  // Fetch commodities sequentially to respect rate limits
  const results: CommodityItem[] = [];
  for (const c of COMMODITIES) {
    if (!canMakeRequest()) break;
    const item = await fetchCommodity(c.fn, c.name, c.key, c.valueField);
    if (item) results.push(item);
  }

  if (results.length > 0) {
    cache = { data: results, ts: Date.now() };
    return NextResponse.json(results);
  }

  // All fetches failed - use cache or return unavailable
  if (cache) {
    return NextResponse.json(cache.data);
  }
  return NextResponse.json({ error: "Donn\u00e9es indisponibles", commodities: [] }, { status: 503 });
}
