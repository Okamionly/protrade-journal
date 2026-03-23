import { NextRequest, NextResponse } from "next/server";
import { canMakeRequest, recordRequest } from "@/lib/alphaVantageRateLimit";

/* ------------------------------------------------------------------ */
/*  Alpha Vantage — Indicateurs economiques US                         */
/* ------------------------------------------------------------------ */

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";
const BASE = "https://www.alphavantage.co/query";

// Cache en memoire — 6 heures
const cache = new Map<string, { data: NormalizedIndicator[]; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

/* ---------- types ---------- */

export interface NormalizedIndicator {
  indicator: string;
  name: string;
  value: number;
  previousValue: number | null;
  date: string;
  previousDate: string | null;
  unit: string;
  change: number | null;
  changePercent: number | null;
}

/* ---------- mapping indicateur -> fonction Alpha Vantage ---------- */

interface AVConfig {
  fn: string;
  params?: string;
  name: string;
  unit: string;
  dataKey: string;
}

const INDICATOR_MAP: Record<string, AVConfig> = {
  GDP: { fn: "REAL_GDP", name: "PIB r\u00e9el US", unit: "Mrd $", dataKey: "data" },
  CPI: { fn: "CPI", name: "Indice des prix (CPI)", unit: "Index", dataKey: "data" },
  INFLATION: { fn: "INFLATION", name: "Taux d'inflation annuel", unit: "%", dataKey: "data" },
  UNEMPLOYMENT: { fn: "UNEMPLOYMENT", name: "Taux de ch\u00f4mage", unit: "%", dataKey: "data" },
  TREASURY_10Y: { fn: "TREASURY_YIELD", params: "&maturity=10year", name: "Rendement Tr\u00e9sor 10 ans", unit: "%", dataKey: "data" },
  TREASURY_2Y: { fn: "TREASURY_YIELD", params: "&maturity=2year", name: "Rendement Tr\u00e9sor 2 ans", unit: "%", dataKey: "data" },
  FED_RATE: { fn: "FEDERAL_FUNDS_RATE", name: "Taux directeur Fed", unit: "%", dataKey: "data" },
  RETAIL: { fn: "RETAIL_SALES", name: "Ventes au d\u00e9tail", unit: "M $", dataKey: "data" },
  NONFARM: { fn: "NONFARM_PAYROLL", name: "Emplois non-agricoles", unit: "Milliers", dataKey: "data" },
};

/* ---------- No hardcoded fallback data ---------- */

/* ---------- fetcher unitaire ---------- */

async function fetchIndicator(key: string): Promise<NormalizedIndicator | null> {
  const cfg = INDICATOR_MAP[key];
  if (!cfg) return null;

  if (!canMakeRequest()) return null;
  recordRequest();

  const url = `${BASE}?function=${cfg.fn}${cfg.params ?? ""}&apikey=${API_KEY}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const json = await res.json();

    // Check for rate limit
    if (json["Note"] || json["Error Message"] || json["Information"]) {
      return null;
    }

    const entries: { date: string; value: string }[] = json[cfg.dataKey];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const latest = entries[0];
    const previous = entries.length > 1 ? entries[1] : null;

    const val = parseFloat(latest.value);
    const prevVal = previous ? parseFloat(previous.value) : null;

    if (isNaN(val)) return null;

    const change = prevVal !== null && !isNaN(prevVal) ? val - prevVal : null;
    const changePercent =
      change !== null && prevVal !== null && prevVal !== 0
        ? (change / Math.abs(prevVal)) * 100
        : null;

    return {
      indicator: key,
      name: cfg.name,
      value: val,
      previousValue: prevVal !== null && !isNaN(prevVal) ? prevVal : null,
      date: latest.date,
      previousDate: previous?.date ?? null,
      unit: cfg.unit,
      change: change !== null ? Math.round(change * 1000) / 1000 : null,
      changePercent: changePercent !== null ? Math.round(changePercent * 100) / 100 : null,
    };
  } catch {
    return null;
  }
}

/* ---------- route handler ---------- */

export async function GET(req: NextRequest) {
  const indicatorsParam = req.nextUrl.searchParams.get("indicators");

  const requestedKeys = indicatorsParam
    ? indicatorsParam.split(",").map((s) => s.trim().toUpperCase())
    : Object.keys(INDICATOR_MAP);

  // Check cache
  const cacheKey = requestedKeys.sort().join(",");
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      data: cached.data,
      _source: "alpha_vantage",
      _cached: true,
      _cachedAt: new Date(cached.ts).toISOString(),
    });
  }

  // If rate limited, return cached or unavailable
  if (!canMakeRequest()) {
    if (cached) {
      return NextResponse.json({
        data: cached.data,
        _source: "alpha_vantage",
        _cached: true,
        _cachedAt: new Date(cached.ts).toISOString(),
        _rateLimited: true,
      });
    }
    return NextResponse.json(
      { error: "Données indisponibles", data: [], _source: "unavailable" },
      { status: 503 }
    );
  }

  // Fetch sequentially to respect rate limits
  const data: NormalizedIndicator[] = [];

  for (const key of requestedKeys) {
    const result = await fetchIndicator(key);
    if (result) {
      data.push(result);
    }
    // Skip failed indicators — no fake data
  }

  if (data.length === 0) {
    return NextResponse.json(
      { error: "Données indisponibles", data: [], _source: "unavailable" },
      { status: 503 }
    );
  }

  // Cache result
  cache.set(cacheKey, { data, ts: Date.now() });

  return NextResponse.json({
    data,
    _source: "alpha_vantage",
    _cached: false,
    _fetchedAt: new Date().toISOString(),
  });
}
