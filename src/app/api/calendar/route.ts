import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  title: string;
  country: string;
  currency: string;
  impact: "high" | "medium" | "low";
  date: string;       // "2026-03-19"
  time: string;       // "14:30" or ""
  previous: string;
  forecast: string;
  actual: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
  source: string;
  lastUpdated: string;
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

let cachedResponse: CalendarResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── Country / Currency Mapping ─────────────────────────────────────────────────

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CNY: "CN", CHF: "CH",
  AUD: "AU", CAD: "CA", NZD: "NZ", SEK: "SE", NOK: "NO", DKK: "DK",
  SGD: "SG", HKD: "HK", KRW: "KR", BRL: "BR", MXN: "MX", ZAR: "ZA",
  INR: "IN", TRY: "TR", PLN: "PL", CZK: "CZ", HUF: "HU", RON: "RO",
  RUB: "RU", ILS: "IL", THB: "TH", MYR: "MY", IDR: "ID", PHP: "PH",
  TWD: "TW", CLP: "CL", COP: "CO", PEN: "PE", ARS: "AR",
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", EU: "EUR", GB: "GBP", JP: "JPY", CN: "CNY", CH: "CHF",
  AU: "AUD", CA: "CAD", NZ: "NZD", DE: "EUR", FR: "EUR", IT: "EUR",
  ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  PT: "EUR", GR: "EUR", SE: "SEK", NO: "NOK", DK: "DKK",
  SG: "SGD", HK: "HKD", KR: "KRW", BR: "BRL", MX: "MXN", ZA: "ZAR",
  IN: "INR", TR: "TRY", PL: "PLN", CZ: "CZK", HU: "HUF",
};

function mapImpact(impact: string): "high" | "medium" | "low" {
  const lower = impact.toLowerCase();
  if (lower === "high" || lower === "holiday") return "high";
  if (lower === "medium") return "medium";
  return "low";
}

// ─── Source 1: Forex Factory (Fair Economy mirror) ──────────────────────────────

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual?: string;
}

async function fetchForexFactory(): Promise<CalendarEvent[]> {
  const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPhase/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Forex Factory error: ${res.status}`);
  const data: FFEvent[] = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid FF response");

  return data.map((item) => {
    const currency = item.country || "";
    const country = CURRENCY_TO_COUNTRY[currency] || currency;

    // Parse the date - FF uses various formats like "03-19-2026" or ISO
    let dateStr = "";
    let timeStr = "";
    if (item.date) {
      try {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
          const hours = d.getUTCHours();
          const mins = d.getUTCMinutes();
          if (hours !== 0 || mins !== 0) {
            timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
          }
        }
      } catch {
        // fallback: try manual parse
        const parts = item.date.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (parts) {
          dateStr = `${parts[3]}-${parts[1]}-${parts[2]}`;
        }
      }
    }

    return {
      title: item.title || "",
      country,
      currency,
      impact: mapImpact(item.impact || "low"),
      date: dateStr,
      time: timeStr,
      previous: item.previous || "",
      forecast: item.forecast || "",
      actual: item.actual || "",
    };
  }).filter((e) => e.title && e.date);
}

// ─── Source 2: Finnhub Calendar ─────────────────────────────────────────────────

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

async function fetchFinnhubCalendar(): Promise<CalendarEvent[]> {
  if (!FINNHUB_API_KEY) return [];

  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setDate(to.getDate() + 7);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${FINNHUB_API_KEY}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`Finnhub calendar error: ${res.status}`);
  const data = await res.json();

  if (!data?.economicCalendar || !Array.isArray(data.economicCalendar)) return [];

  return data.economicCalendar.map((item: Record<string, unknown>) => {
    const country = (item.country as string) || "";
    const currency = COUNTRY_TO_CURRENCY[country] || "";
    const impact = (item.impact as number) || 0;

    return {
      title: (item.event as string) || "",
      country,
      currency,
      impact: impact >= 3 ? "high" : impact >= 2 ? "medium" : "low",
      date: (item.date as string) || "",
      time: (item.time as string) || "",
      previous: String(item.prev ?? ""),
      forecast: String(item.estimate ?? ""),
      actual: String(item.actual ?? ""),
    };
  }).filter((e: CalendarEvent) => e.title && e.date);
}

// ─── Fallback: Enhanced static data ─────────────────────────────────────────────

function generateStaticEvents(): CalendarEvent[] {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day === 0 ? 7 : day) - 1));

  function dateStr(offset: number): string {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  return [
    // Monday
    { title: "Indice Empire State Manufacturing", country: "US", currency: "USD", impact: "medium", date: dateStr(0), time: "14:30", previous: "-5.7", forecast: "-2.0", actual: "" },
    { title: "Production Industrielle (YoY)", country: "CN", currency: "CNY", impact: "medium", date: dateStr(0), time: "03:00", previous: "6.2%", forecast: "5.8%", actual: "" },
    { title: "Réunion Eurogroupe", country: "EU", currency: "EUR", impact: "medium", date: dateStr(0), time: "09:00", previous: "", forecast: "", actual: "" },

    // Tuesday
    { title: "Indice ZEW - Sentiment Économique", country: "DE", currency: "EUR", impact: "medium", date: dateStr(1), time: "10:00", previous: "10.3", forecast: "12.5", actual: "" },
    { title: "Ventes au Détail (MoM)", country: "US", currency: "USD", impact: "high", date: dateStr(1), time: "14:30", previous: "-0.9%", forecast: "0.6%", actual: "" },
    { title: "Production Industrielle (MoM)", country: "US", currency: "USD", impact: "medium", date: dateStr(1), time: "15:15", previous: "0.5%", forecast: "0.3%", actual: "" },

    // Wednesday
    { title: "IPC (YoY)", country: "GB", currency: "GBP", impact: "high", date: dateStr(2), time: "10:30", previous: "3.0%", forecast: "2.9%", actual: "" },
    { title: "Permis de Construire", country: "US", currency: "USD", impact: "medium", date: dateStr(2), time: "14:30", previous: "1.473M", forecast: "1.450M", actual: "" },
    { title: "IPC (YoY)", country: "CA", currency: "CAD", impact: "high", date: dateStr(2), time: "14:30", previous: "1.9%", forecast: "2.1%", actual: "" },

    // Thursday
    { title: "Décision Taux Fed (FOMC)", country: "US", currency: "USD", impact: "high", date: dateStr(3), time: "20:00", previous: "4.50%", forecast: "4.50%", actual: "" },
    { title: "Conférence de Presse FOMC", country: "US", currency: "USD", impact: "high", date: dateStr(3), time: "20:30", previous: "", forecast: "", actual: "" },
    { title: "Inscriptions Hebdo. au Chômage", country: "US", currency: "USD", impact: "medium", date: dateStr(3), time: "14:30", previous: "220K", forecast: "215K", actual: "" },
    { title: "Décision Taux BNS", country: "CH", currency: "CHF", impact: "high", date: dateStr(3), time: "13:30", previous: "0.50%", forecast: "0.25%", actual: "" },

    // Friday
    { title: "Décision Taux BOJ", country: "JP", currency: "JPY", impact: "high", date: dateStr(4), time: "01:00", previous: "0.50%", forecast: "0.50%", actual: "" },
    { title: "Décision Taux BOE", country: "GB", currency: "GBP", impact: "high", date: dateStr(4), time: "13:00", previous: "4.50%", forecast: "4.50%", actual: "" },
    { title: "IPP (MoM)", country: "DE", currency: "EUR", impact: "low", date: dateStr(4), time: "09:00", previous: "0.2%", forecast: "0.1%", actual: "" },
    { title: "Ventes au Détail (MoM)", country: "CA", currency: "CAD", impact: "medium", date: dateStr(4), time: "14:30", previous: "1.6%", forecast: "0.4%", actual: "" },

    // Next Monday
    { title: "PMI Manufacturier Flash", country: "DE", currency: "EUR", impact: "high", date: dateStr(7), time: "09:30", previous: "46.5", forecast: "47.0", actual: "" },
    { title: "PMI Composite Flash Zone Euro", country: "EU", currency: "EUR", impact: "high", date: dateStr(7), time: "10:00", previous: "50.2", forecast: "50.5", actual: "" },
    { title: "PMI Manufacturier Flash S&P", country: "US", currency: "USD", impact: "medium", date: dateStr(7), time: "15:45", previous: "52.7", forecast: "52.0", actual: "" },

    // Next Tuesday
    { title: "Indice IFO du Climat des Affaires", country: "DE", currency: "EUR", impact: "high", date: dateStr(8), time: "10:00", previous: "85.2", forecast: "86.0", actual: "" },
    { title: "Confiance des Consommateurs CB", country: "US", currency: "USD", impact: "high", date: dateStr(8), time: "15:00", previous: "98.3", forecast: "95.0", actual: "" },

    // Next Wednesday
    { title: "Commandes de Biens Durables (MoM)", country: "US", currency: "USD", impact: "high", date: dateStr(9), time: "14:30", previous: "3.2%", forecast: "-1.0%", actual: "" },

    // Next Thursday
    { title: "PIB (QoQ) - 3ème estimation Q4", country: "US", currency: "USD", impact: "high", date: dateStr(10), time: "14:30", previous: "2.3%", forecast: "2.3%", actual: "" },
    { title: "Inscriptions Hebdo. au Chômage", country: "US", currency: "USD", impact: "medium", date: dateStr(10), time: "14:30", previous: "215K", forecast: "218K", actual: "" },

    // Next Friday
    { title: "Indice des Prix PCE Core (MoM)", country: "US", currency: "USD", impact: "high", date: dateStr(11), time: "14:30", previous: "0.3%", forecast: "0.3%", actual: "" },
    { title: "Indice des Prix PCE Core (YoY)", country: "US", currency: "USD", impact: "high", date: dateStr(11), time: "14:30", previous: "2.6%", forecast: "2.7%", actual: "" },
    { title: "Sentiment Michigan - Final", country: "US", currency: "USD", impact: "medium", date: dateStr(11), time: "16:00", previous: "57.9", forecast: "57.5", actual: "" },
  ];
}

// ─── Main GET handler ───────────────────────────────────────────────────────────

export async function GET() {
  // Return cache if fresh
  if (cachedResponse && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse);
  }

  let events: CalendarEvent[] = [];
  let source = "static";

  // Try Forex Factory first (best free source for economic calendar)
  try {
    const ffEvents = await fetchForexFactory();
    if (ffEvents.length > 0) {
      events = ffEvents;
      source = "forexfactory";
    }
  } catch (e) {
    console.warn("[Calendar] Forex Factory failed:", e);
  }

  // If FF failed or returned empty, try Finnhub
  if (events.length === 0) {
    try {
      const fhEvents = await fetchFinnhubCalendar();
      if (fhEvents.length > 0) {
        events = fhEvents;
        source = "finnhub";
      }
    } catch (e) {
      console.warn("[Calendar] Finnhub calendar failed:", e);
    }
  }

  // Final fallback: static data
  if (events.length === 0) {
    events = generateStaticEvents();
    source = "static";
  }

  // Sort events by date then time
  events.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.time.localeCompare(b.time);
  });

  const response: CalendarResponse = {
    events,
    source,
    lastUpdated: new Date().toISOString(),
  };

  cachedResponse = response;
  cacheTimestamp = Date.now();

  return NextResponse.json(response);
}
