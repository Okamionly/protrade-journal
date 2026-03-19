import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface FinnhubEarning {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string; // "bmo", "amc", "dmh", ""
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface EarningsEvent {
  symbol: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  hour: string; // "bmo", "amc", "dmh"
}

interface EarningsResponse {
  earnings: EarningsEvent[];
  source: "live" | "fallback";
  lastUpdated: string;
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

let cachedResponse: EarningsResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Finnhub Fetch ──────────────────────────────────────────────────────────────

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

async function fetchFinnhubEarnings(): Promise<EarningsEvent[]> {
  if (!FINNHUB_API_KEY) throw new Error("No Finnhub API key configured");

  const today = new Date();
  const dayOfWeek = today.getDay();
  // Start of current week (Monday)
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
  // End of next week (Friday + 7)
  const endFriday = new Date(monday);
  endFriday.setDate(monday.getDate() + 11); // Monday + 11 = next Friday

  const fromStr = monday.toISOString().slice(0, 10);
  const toStr = endFriday.toISOString().slice(0, 10);

  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${toStr}&token=${FINNHUB_API_KEY}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) throw new Error(`Finnhub earnings error: ${res.status}`);
  const data = await res.json();

  if (!data?.earningsCalendar || !Array.isArray(data.earningsCalendar)) {
    throw new Error("Invalid Finnhub earnings response");
  }

  return data.earningsCalendar.map((item: FinnhubEarning) => ({
    symbol: item.symbol || "",
    date: item.date || "",
    epsEstimate: item.epsEstimate ?? null,
    epsActual: item.epsActual ?? null,
    revenueEstimate: item.revenueEstimate ?? null,
    revenueActual: item.revenueActual ?? null,
    hour: (item.hour || "").toLowerCase(),
  })).filter((e: EarningsEvent) => e.symbol && e.date);
}

// ─── Fallback Data ──────────────────────────────────────────────────────────────

function generateFallbackEarnings(): EarningsEvent[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));

  function dateStr(offset: number): string {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  return [
    { symbol: "AAPL", date: dateStr(3), epsEstimate: 2.35, epsActual: null, revenueEstimate: 94.3e9, revenueActual: null, hour: "amc" },
    { symbol: "MSFT", date: dateStr(3), epsEstimate: 3.22, epsActual: null, revenueEstimate: 68.7e9, revenueActual: null, hour: "amc" },
    { symbol: "NVDA", date: dateStr(2), epsEstimate: 0.89, epsActual: null, revenueEstimate: 38.5e9, revenueActual: null, hour: "amc" },
    { symbol: "GOOGL", date: dateStr(1), epsEstimate: 2.12, epsActual: null, revenueEstimate: 96.1e9, revenueActual: null, hour: "amc" },
    { symbol: "AMZN", date: dateStr(4), epsEstimate: 1.36, epsActual: null, revenueEstimate: 187.3e9, revenueActual: null, hour: "amc" },
    { symbol: "META", date: dateStr(2), epsEstimate: 6.73, epsActual: null, revenueEstimate: 47.2e9, revenueActual: null, hour: "amc" },
    { symbol: "TSLA", date: dateStr(7), epsEstimate: 0.78, epsActual: null, revenueEstimate: 25.6e9, revenueActual: null, hour: "amc" },
    { symbol: "JPM", date: dateStr(7), epsEstimate: 4.85, epsActual: null, revenueEstimate: 42.1e9, revenueActual: null, hour: "bmo" },
    { symbol: "NFLX", date: dateStr(8), epsEstimate: 5.67, epsActual: null, revenueEstimate: 10.5e9, revenueActual: null, hour: "amc" },
    { symbol: "AMD", date: dateStr(9), epsEstimate: 0.93, epsActual: null, revenueEstimate: 7.5e9, revenueActual: null, hour: "amc" },
  ];
}

// ─── Main GET handler ───────────────────────────────────────────────────────────

export async function GET() {
  // Return cache if fresh
  if (cachedResponse && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse);
  }

  let earnings: EarningsEvent[] = [];
  let source: "live" | "fallback" = "fallback";

  try {
    const liveEarnings = await fetchFinnhubEarnings();
    if (liveEarnings.length > 0) {
      earnings = liveEarnings;
      source = "live";
    }
  } catch (e) {
    console.warn("[Earnings] Finnhub earnings fetch failed:", e);
  }

  // Fallback to static data
  if (earnings.length === 0) {
    earnings = generateFallbackEarnings();
    source = "fallback";
  }

  // Sort by date
  earnings.sort((a, b) => a.date.localeCompare(b.date));

  const response: EarningsResponse = {
    earnings,
    source,
    lastUpdated: new Date().toISOString(),
  };

  cachedResponse = response;
  cacheTimestamp = Date.now();

  return NextResponse.json(response);
}
