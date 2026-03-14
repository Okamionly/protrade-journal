export interface EconomicEvent {
  country: string;
  event: string;
  impact: "high" | "medium" | "low";
  date: string;
  time: string;
  actual: string;
  estimate: string;
  prev: string;
}

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "";

export async function fetchEconomicCalendar(): Promise<EconomicEvent[]> {
  if (!FINNHUB_API_KEY) return getMockCalendar();

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  try {
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return getMockCalendar();

    const json = await res.json();
    const events = json.economicCalendar || [];

    return events.map((e: Record<string, string | number>) => ({
      country: String(e.country || ""),
      event: String(e.event || ""),
      impact: e.impact === 3 ? "high" : e.impact === 2 ? "medium" : "low",
      date: String(e.date || "").slice(0, 10),
      time: String(e.time || ""),
      actual: e.actual != null && e.actual !== "" ? String(e.actual) : "-",
      estimate: e.estimate != null && e.estimate !== "" ? String(e.estimate) : "-",
      prev: e.prev != null && e.prev !== "" ? String(e.prev) : "-",
    }));
  } catch {
    return getMockCalendar();
  }
}

function getMockCalendar(): EconomicEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { country: "US", event: "Non-Farm Payrolls", impact: "high", date: today, time: "08:30", actual: "-", estimate: "180K", prev: "175K" },
    { country: "US", event: "CPI (YoY)", impact: "high", date: today, time: "08:30", actual: "-", estimate: "3.2%", prev: "3.1%" },
    { country: "EU", event: "ECB Interest Rate Decision", impact: "high", date: today, time: "07:45", actual: "-", estimate: "4.25%", prev: "4.50%" },
    { country: "US", event: "Unemployment Rate", impact: "medium", date: today, time: "08:30", actual: "-", estimate: "3.8%", prev: "3.7%" },
    { country: "GB", event: "GDP (QoQ)", impact: "medium", date: today, time: "02:00", actual: "-", estimate: "0.2%", prev: "0.3%" },
    { country: "JP", event: "BOJ Interest Rate Decision", impact: "high", date: today, time: "23:00", actual: "-", estimate: "-0.1%", prev: "-0.1%" },
    { country: "US", event: "Retail Sales (MoM)", impact: "medium", date: today, time: "08:30", actual: "-", estimate: "0.4%", prev: "0.6%" },
    { country: "EU", event: "PMI Manufacturing", impact: "low", date: today, time: "04:00", actual: "-", estimate: "47.3", prev: "46.1" },
  ];
}
