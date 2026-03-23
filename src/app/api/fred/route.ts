import { NextRequest, NextResponse } from "next/server";

const FRED_API_KEY = process.env.NEXT_PUBLIC_FRED_API_KEY || process.env.FRED_API_KEY || "";
const FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations";

// Treasury.gov fiscal data API (no key required)
const TREASURY_API = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates";

// World Bank API (no key required)
const WORLD_BANK_API = "https://api.worldbank.org/v2/country/US/indicator";

// Hardcoded recent values as last resort (updated 2025-03)
const HARDCODED_FALLBACK: Record<string, { observations: { date: string; value: string }[]; asOf: string }> = {
  DGS10: {
    asOf: "2025-03-21",
    observations: [
      { date: "2025-03-17", value: "4.31" },
      { date: "2025-03-18", value: "4.29" },
      { date: "2025-03-19", value: "4.25" },
      { date: "2025-03-20", value: "4.24" },
      { date: "2025-03-21", value: "4.25" },
    ],
  },
  DGS2: {
    asOf: "2025-03-21",
    observations: [
      { date: "2025-03-17", value: "4.04" },
      { date: "2025-03-18", value: "4.05" },
      { date: "2025-03-19", value: "3.97" },
      { date: "2025-03-20", value: "3.96" },
      { date: "2025-03-21", value: "3.95" },
    ],
  },
  FEDFUNDS: {
    asOf: "2025-03-01",
    observations: [
      { date: "2024-10-01", value: "4.83" },
      { date: "2024-11-01", value: "4.58" },
      { date: "2024-12-01", value: "4.33" },
      { date: "2025-01-01", value: "4.33" },
      { date: "2025-02-01", value: "4.33" },
    ],
  },
  UNRATE: {
    asOf: "2025-03-01",
    observations: [
      { date: "2024-10-01", value: "4.1" },
      { date: "2024-11-01", value: "4.2" },
      { date: "2024-12-01", value: "4.1" },
      { date: "2025-01-01", value: "4.0" },
      { date: "2025-02-01", value: "4.1" },
    ],
  },
};

// Map FRED series to Treasury.gov security descriptions
const TREASURY_SERIES_MAP: Record<string, string> = {
  DGS10: "Treasury Notes",
  DGS2: "Treasury Notes",
  DGS30: "Treasury Bonds",
  DGS5: "Treasury Notes",
};

// Map FRED series to World Bank indicators
const WORLD_BANK_MAP: Record<string, string> = {
  UNRATE: "SL.UEM.TOTL.ZS", // Unemployment
  FEDFUNDS: "FR.INR.RINR",   // Real interest rate
  CPIAUCSL: "FP.CPI.TOTL",   // CPI
};

async function fetchFromFred(seriesId: string, start: string): Promise<Response | null> {
  if (!FRED_API_KEY) return null;
  try {
    const url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${start}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res;
    return null;
  } catch {
    return null;
  }
}

async function fetchFromTreasury(seriesId: string): Promise<{ observations: { date: string; value: string }[] } | null> {
  const secType = TREASURY_SERIES_MAP[seriesId];
  if (!secType) return null;

  // Determine term based on series
  let termFilter = "";
  if (seriesId === "DGS2") termFilter = "&filter=security_desc:eq:Treasury Notes,avg_interest_rate_amt:gt:0,security_term:eq:2-Year";
  else if (seriesId === "DGS5") termFilter = "&filter=security_desc:eq:Treasury Notes,avg_interest_rate_amt:gt:0,security_term:eq:5-Year";
  else if (seriesId === "DGS10") termFilter = "&filter=security_desc:eq:Treasury Notes,avg_interest_rate_amt:gt:0,security_term:eq:10-Year";
  else if (seriesId === "DGS30") termFilter = "&filter=security_desc:eq:Treasury Bonds,avg_interest_rate_amt:gt:0,security_term:eq:30-Year";
  else return null;

  try {
    const url = `${TREASURY_API}?sort=-record_date&page[size]=30${termFilter}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const records = json?.data;
    if (!Array.isArray(records) || records.length === 0) return null;

    const observations = records
      .reverse()
      .map((r: { record_date: string; avg_interest_rate_amt: string }) => ({
        date: r.record_date,
        value: r.avg_interest_rate_amt,
      }));

    return { observations };
  } catch {
    return null;
  }
}

async function fetchFromWorldBank(seriesId: string): Promise<{ observations: { date: string; value: string }[] } | null> {
  const indicator = WORLD_BANK_MAP[seriesId];
  if (!indicator) return null;

  try {
    const url = `${WORLD_BANK_API}/${indicator}?format=json&per_page=10&mrv=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    // World Bank returns [metadata, data[]]
    const records = json?.[1];
    if (!Array.isArray(records) || records.length === 0) return null;

    const observations = records
      .filter((r: { value: number | null }) => r.value !== null)
      .reverse()
      .map((r: { date: string; value: number }) => ({
        date: `${r.date}-01-01`,
        value: String(r.value),
      }));

    if (observations.length === 0) return null;
    return { observations };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get("series_id");
  const start = req.nextUrl.searchParams.get("observation_start") || "2020-01-01";

  if (!seriesId) {
    return NextResponse.json({ error: "Missing series_id" }, { status: 400 });
  }

  // 1) Try FRED (primary)
  const fredRes = await fetchFromFred(seriesId, start);
  if (fredRes) {
    try {
      const data = await fredRes.json();
      return NextResponse.json(data);
    } catch {
      // fall through
    }
  }

  // 2) Try Treasury.gov (for yield series)
  const treasuryData = await fetchFromTreasury(seriesId);
  if (treasuryData) {
    return NextResponse.json({
      observations: treasuryData.observations,
      _source: "treasury.gov",
      _note: "Données Treasury.gov (fallback, taux moyens)",
    });
  }

  // 3) Try World Bank (for macro indicators)
  const worldBankData = await fetchFromWorldBank(seriesId);
  if (worldBankData) {
    return NextResponse.json({
      observations: worldBankData.observations,
      _source: "worldbank.org",
      _note: "Données World Bank (fallback, fréquence annuelle)",
    });
  }

  // 4) Hardcoded fallback
  const fallback = HARDCODED_FALLBACK[seriesId];
  if (fallback) {
    return NextResponse.json({
      observations: fallback.observations,
      _source: "hardcoded",
      _note: `Données du ${fallback.asOf} (hors ligne — clé FRED manquante)`,
    });
  }

  return NextResponse.json(
    { error: "FRED API key not configured and no fallback available for this series" },
    { status: 503 }
  );
}
