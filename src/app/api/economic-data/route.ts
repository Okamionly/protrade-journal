import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Alpha Vantage — Indicateurs économiques US (fallback FRED)         */
/* ------------------------------------------------------------------ */

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";
const BASE = "https://www.alphavantage.co/query";

// Cache en mémoire — 1 heure (les données économiques changent rarement)
const cache = new Map<string, { data: NormalizedIndicator[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

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

/* ---------- mapping indicateur → fonction Alpha Vantage ---------- */

interface AVConfig {
  fn: string;
  params?: string;
  name: string;
  unit: string;
  dataKey: string;
}

const INDICATOR_MAP: Record<string, AVConfig> = {
  GDP: {
    fn: "REAL_GDP",
    name: "PIB réel US",
    unit: "Mrd $",
    dataKey: "data",
  },
  CPI: {
    fn: "CPI",
    name: "Indice des prix (CPI)",
    unit: "Index",
    dataKey: "data",
  },
  INFLATION: {
    fn: "INFLATION",
    name: "Taux d'inflation annuel",
    unit: "%",
    dataKey: "data",
  },
  UNEMPLOYMENT: {
    fn: "UNEMPLOYMENT",
    name: "Taux de chômage",
    unit: "%",
    dataKey: "data",
  },
  TREASURY_10Y: {
    fn: "TREASURY_YIELD",
    params: "&maturity=10year",
    name: "Rendement Trésor 10 ans",
    unit: "%",
    dataKey: "data",
  },
  TREASURY_2Y: {
    fn: "TREASURY_YIELD",
    params: "&maturity=2year",
    name: "Rendement Trésor 2 ans",
    unit: "%",
    dataKey: "data",
  },
  FED_RATE: {
    fn: "FEDERAL_FUNDS_RATE",
    name: "Taux directeur Fed",
    unit: "%",
    dataKey: "data",
  },
  RETAIL: {
    fn: "RETAIL_SALES",
    name: "Ventes au détail",
    unit: "M $",
    dataKey: "data",
  },
  NONFARM: {
    fn: "NONFARM_PAYROLL",
    name: "Emplois non-agricoles",
    unit: "Milliers",
    dataKey: "data",
  },
};

/* ---------- fetcher unitaire ---------- */

async function fetchIndicator(key: string): Promise<NormalizedIndicator | null> {
  const cfg = INDICATOR_MAP[key];
  if (!cfg) return null;

  const url = `${BASE}?function=${cfg.fn}${cfg.params ?? ""}&apikey=${API_KEY}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const json = await res.json();

    // Alpha Vantage renvoie les données dans un tableau "data"
    const entries: { date: string; value: string }[] = json[cfg.dataKey];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    // Les données sont triées du plus récent au plus ancien
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

  // Parse les indicateurs demandés (virgule-séparés) ou renvoyer tout
  const requestedKeys = indicatorsParam
    ? indicatorsParam.split(",").map((s) => s.trim().toUpperCase())
    : Object.keys(INDICATOR_MAP);

  // Vérifier le cache
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

  // Fetch en parallèle
  const results = await Promise.allSettled(
    requestedKeys.map((key) => fetchIndicator(key))
  );

  const data: NormalizedIndicator[] = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((d): d is NormalizedIndicator => d !== null);

  if (data.length === 0) {
    return NextResponse.json(
      {
        error: "Impossible de récupérer les indicateurs économiques depuis Alpha Vantage",
        _note: "Vérifiez ALPHA_VANTAGE_API_KEY dans vos variables d'environnement",
      },
      { status: 503 }
    );
  }

  // Mise en cache
  cache.set(cacheKey, { data, ts: Date.now() });

  return NextResponse.json({
    data,
    _source: "alpha_vantage",
    _cached: false,
    _fetchedAt: new Date().toISOString(),
  });
}
