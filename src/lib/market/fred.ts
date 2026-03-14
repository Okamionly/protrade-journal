import { FRED_SERIES, FRED_API_BASE } from "./constants";

export interface FredObservation {
  date: string;
  value: number;
}

export interface FredSeriesData {
  key: string;
  label: string;
  unit: string;
  frequency: string;
  observations: FredObservation[];
  latest: number;
  previous: number;
  change: number;
  changePercent: number;
}

function getFredApiKey(): string {
  return process.env.NEXT_PUBLIC_FRED_API_KEY || "";
}

export async function fetchFredSeries(seriesKey: string, years = 5): Promise<FredSeriesData> {
  const series = FRED_SERIES[seriesKey];
  if (!series) throw new Error(`Unknown series: ${seriesKey}`);

  const apiKey = getFredApiKey();
  if (!apiKey) throw new Error("FRED API key not configured");

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  const start = startDate.toISOString().slice(0, 10);

  const url = `${FRED_API_BASE}?series_id=${series.id}&api_key=${apiKey}&file_type=json&observation_start=${start}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);

  const json = await res.json();
  const observations: FredObservation[] = (json.observations || [])
    .filter((o: { value: string }) => o.value !== ".")
    .map((o: { date: string; value: string }) => ({
      date: o.date,
      value: parseFloat(o.value),
    }));

  const latest = observations.length > 0 ? observations[observations.length - 1].value : 0;
  const previous = observations.length > 1 ? observations[observations.length - 2].value : 0;
  const change = latest - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  return {
    key: seriesKey,
    label: series.label,
    unit: series.unit,
    frequency: series.frequency,
    observations,
    latest,
    previous,
    change,
    changePercent,
  };
}

export async function fetchMultipleFredSeries(keys?: string[]): Promise<FredSeriesData[]> {
  const seriesKeys = keys || Object.keys(FRED_SERIES);
  const results = await Promise.allSettled(seriesKeys.map((k) => fetchFredSeries(k)));
  return results
    .filter((r): r is PromiseFulfilledResult<FredSeriesData> => r.status === "fulfilled")
    .map((r) => r.value);
}
