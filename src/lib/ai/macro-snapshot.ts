import { FRED_SERIES } from "@/lib/market/constants";

/**
 * Compact macro snapshot used to ground AI analysis with current market regime.
 * Pulls a small set of FRED series server-side (no client fetch / no CORS).
 * Falls back gracefully if FRED is rate-limited or unreachable.
 */

const SNAPSHOT_KEYS = ["FED_RATE", "CPI", "TREASURY_10Y", "TREASURY_2Y", "DXY", "UNEMPLOYMENT"] as const;

export interface MacroPoint {
  key: string;
  label: string;
  unit: string;
  latest: number;
  previous: number;
  changePercent: number;
  asOf: string;
}

export interface MacroSnapshot {
  asOf: string;
  points: MacroPoint[];
  derived: {
    yieldCurve2s10s: number | null; // 10Y - 2Y in basis points
    realRate: number | null;        // 10Y - CPI YoY proxy
    regime: "risk-on" | "risk-off" | "mixed" | "unknown";
  };
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchOne(key: string): Promise<MacroPoint | null> {
  const meta = FRED_SERIES[key];
  if (!meta) return null;
  const apiKey = process.env.FRED_API_KEY || process.env.NEXT_PUBLIC_FRED_API_KEY;
  if (!apiKey) return null;

  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const startStr = start.toISOString().slice(0, 10);

  const url = `${FRED_BASE}?series_id=${meta.id}&api_key=${apiKey}&file_type=json&observation_start=${startStr}&sort_order=desc&limit=10`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } }); // 6h cache
    if (!res.ok) return null;
    const json = await res.json();
    const obs: { date: string; value: string }[] = json?.observations ?? [];
    const valid = obs.filter((o) => o.value && o.value !== ".");
    if (valid.length === 0) return null;
    const latestObs = valid[0];
    const prevObs = valid[1] ?? valid[0];
    const latest = parseFloat(latestObs.value);
    const previous = parseFloat(prevObs.value);
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      latest,
      previous,
      changePercent: previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0,
      asOf: latestObs.date,
    };
  } catch {
    return null;
  }
}

export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const results = await Promise.all(SNAPSHOT_KEYS.map((k) => fetchOne(k)));
  const points = results.filter((p): p is MacroPoint => p !== null);

  const findVal = (key: string) => points.find((p) => p.key === key)?.latest ?? null;
  const t10 = findVal("TREASURY_10Y");
  const t2 = findVal("TREASURY_2Y");
  const cpiPoint = points.find((p) => p.key === "CPI");
  const cpiYoY = cpiPoint ? cpiPoint.changePercent * 12 : null; // crude monthly→annual proxy

  const yieldCurve2s10s = t10 !== null && t2 !== null ? +(100 * (t10 - t2)).toFixed(1) : null;
  const realRate = t10 !== null && cpiYoY !== null ? +(t10 - cpiYoY).toFixed(2) : null;

  let regime: MacroSnapshot["derived"]["regime"] = "unknown";
  if (yieldCurve2s10s !== null && realRate !== null) {
    if (yieldCurve2s10s < 0 && realRate > 1.5) regime = "risk-off"; // inverted + tight
    else if (yieldCurve2s10s > 0 && realRate < 1) regime = "risk-on";
    else regime = "mixed";
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    points,
    derived: { yieldCurve2s10s, realRate, regime },
  };
}

/** Renders the snapshot as a compact text block for inclusion in a prompt. */
export function snapshotToPromptText(snap: MacroSnapshot): string {
  if (snap.points.length === 0) {
    return "[Aucune donnée macro disponible]";
  }
  const lines = snap.points.map((p) => {
    const arrow = p.changePercent > 0.1 ? "↑" : p.changePercent < -0.1 ? "↓" : "→";
    return `- ${p.label}: ${p.latest.toFixed(2)} ${p.unit} ${arrow} (${p.changePercent >= 0 ? "+" : ""}${p.changePercent.toFixed(2)}% vs prev, asOf ${p.asOf})`;
  });
  const derived: string[] = [];
  if (snap.derived.yieldCurve2s10s !== null) {
    derived.push(`Courbe 2s10s: ${snap.derived.yieldCurve2s10s} bps ${snap.derived.yieldCurve2s10s < 0 ? "(inversée)" : ""}`);
  }
  if (snap.derived.realRate !== null) {
    derived.push(`Taux réel approx: ${snap.derived.realRate}%`);
  }
  derived.push(`Régime: ${snap.derived.regime}`);
  return `MACRO SNAPSHOT (${snap.asOf}):\n${lines.join("\n")}\n${derived.join(" | ")}`;
}
