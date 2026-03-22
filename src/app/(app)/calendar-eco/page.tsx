"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Filter,
  Eye,
  Columns3,
  List,
  Timer,
  RefreshCw,
  Wifi,
  WifiOff,
  StickyNote,
  X,
  AlertCircle,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface EcoEvent {
  date: string;        // "2026-03-19"
  time: string;        // "14:30"
  country: string;     // "US"
  currency: string;    // "USD"
  event: string;
  impact: "high" | "medium" | "low";
  previous?: string;
  forecast?: string;
  actual?: string;
}

interface CalendarAPIEvent {
  title: string;
  country: string;
  currency: string;
  impact: "high" | "medium" | "low";
  date: string;
  time: string;
  previous: string;
  forecast: string;
  actual: string;
}

interface CalendarAPIResponse {
  events: CalendarAPIEvent[];
  source: string;
  lastUpdated: string;
}

// ─── Country flags ──────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", EU: "\u{1F1EA}\u{1F1FA}", GB: "\u{1F1EC}\u{1F1E7}", JP: "\u{1F1EF}\u{1F1F5}", CN: "\u{1F1E8}\u{1F1F3}", CH: "\u{1F1E8}\u{1F1ED}",
  AU: "\u{1F1E6}\u{1F1FA}", CA: "\u{1F1E8}\u{1F1E6}", DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", NZ: "\u{1F1F3}\u{1F1FF}",
};

const IMPACT_CONFIG = {
  high:   { label: "Élevé",  dot: "\u{1F534}", color: "text-rose-400",   bg: "bg-rose-500/10",  border: "border-rose-500/30",  dotClass: "bg-rose-500"   },
  medium: { label: "Moyen",  dot: "\u{1F7E1}", color: "text-amber-400",  bg: "bg-amber-500/10", border: "border-amber-500/30", dotClass: "bg-amber-500"  },
  low:    { label: "Faible", dot: "\u{1F7E2}", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dotClass: "bg-emerald-500" },
};

// ─── Static fallback dataset ────────────────────────────────────────────────────

function generateStaticFallback(): EcoEvent[] {
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
    { date: dateStr(0), time: "09:00", country: "EU", currency: "EUR", event: "Réunion Eurogroupe", impact: "medium" },
    { date: dateStr(0), time: "14:30", country: "US", currency: "USD", event: "Indice Empire State Manufacturing", impact: "medium", previous: "-5.7", forecast: "-2.0" },
    { date: dateStr(0), time: "03:00", country: "CN", currency: "CNY", event: "Production Industrielle (YoY)", impact: "medium", previous: "6.2%", forecast: "5.8%" },
    { date: dateStr(1), time: "10:00", country: "DE", currency: "EUR", event: "Indice ZEW - Sentiment Économique", impact: "medium", previous: "10.3", forecast: "12.5" },
    { date: dateStr(1), time: "14:30", country: "US", currency: "USD", event: "Ventes au Détail (MoM)", impact: "high", previous: "-0.9%", forecast: "0.6%" },
    { date: dateStr(1), time: "15:15", country: "US", currency: "USD", event: "Production Industrielle (MoM)", impact: "medium", previous: "0.5%", forecast: "0.3%" },
    { date: dateStr(2), time: "10:30", country: "GB", currency: "GBP", event: "IPC (YoY)", impact: "high", previous: "3.0%", forecast: "2.9%" },
    { date: dateStr(2), time: "14:30", country: "US", currency: "USD", event: "Permis de Construire", impact: "medium", previous: "1.473M", forecast: "1.450M" },
    { date: dateStr(2), time: "14:30", country: "CA", currency: "CAD", event: "IPC (YoY)", impact: "high", previous: "1.9%", forecast: "2.1%" },
    { date: dateStr(3), time: "13:30", country: "CH", currency: "CHF", event: "Décision Taux BNS", impact: "high", previous: "0.50%", forecast: "0.25%" },
    { date: dateStr(3), time: "14:30", country: "US", currency: "USD", event: "Inscriptions Hebdo. au Chômage", impact: "medium", previous: "220K", forecast: "215K" },
    { date: dateStr(3), time: "20:00", country: "US", currency: "USD", event: "Décision Taux Fed (FOMC)", impact: "high", previous: "4.50%", forecast: "4.50%" },
    { date: dateStr(3), time: "20:30", country: "US", currency: "USD", event: "Conférence de Presse FOMC - Powell", impact: "high" },
    { date: dateStr(4), time: "01:00", country: "JP", currency: "JPY", event: "Décision Taux BOJ", impact: "high", previous: "0.50%", forecast: "0.50%" },
    { date: dateStr(4), time: "13:00", country: "GB", currency: "GBP", event: "Décision Taux BOE", impact: "high", previous: "4.50%", forecast: "4.50%" },
    { date: dateStr(4), time: "09:00", country: "DE", currency: "EUR", event: "IPP (MoM)", impact: "low", previous: "0.2%", forecast: "0.1%" },
    { date: dateStr(7), time: "09:30", country: "DE", currency: "EUR", event: "PMI Manufacturier Flash", impact: "high", previous: "46.5", forecast: "47.0" },
    { date: dateStr(7), time: "10:00", country: "EU", currency: "EUR", event: "PMI Composite Flash Zone Euro", impact: "high", previous: "50.2", forecast: "50.5" },
    { date: dateStr(7), time: "15:45", country: "US", currency: "USD", event: "PMI Manufacturier Flash S&P", impact: "medium", previous: "52.7", forecast: "52.0" },
    { date: dateStr(8), time: "10:00", country: "DE", currency: "EUR", event: "Indice IFO du Climat des Affaires", impact: "high", previous: "85.2", forecast: "86.0" },
    { date: dateStr(8), time: "15:00", country: "US", currency: "USD", event: "Confiance des Consommateurs CB", impact: "high", previous: "98.3", forecast: "95.0" },
    { date: dateStr(9), time: "14:30", country: "US", currency: "USD", event: "Commandes de Biens Durables (MoM)", impact: "high", previous: "3.2%", forecast: "-1.0%" },
    { date: dateStr(10), time: "14:30", country: "US", currency: "USD", event: "PIB (QoQ) - 3ème estimation Q4", impact: "high", previous: "2.3%", forecast: "2.3%" },
    { date: dateStr(11), time: "14:30", country: "US", currency: "USD", event: "Indice des Prix PCE Core (MoM)", impact: "high", previous: "0.3%", forecast: "0.3%" },
    { date: dateStr(11), time: "14:30", country: "US", currency: "USD", event: "Indice des Prix PCE Core (YoY)", impact: "high", previous: "2.6%", forecast: "2.7%" },
    { date: dateStr(11), time: "16:00", country: "US", currency: "USD", event: "Sentiment Michigan - Final", impact: "medium", previous: "57.9", forecast: "57.5" },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekDates(baseDate: string): string[] {
  const d = new Date(baseDate + "T00:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day === 0 ? 7 : day) - 1));
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    dates.push(cur.toISOString().slice(0, 10));
  }
  return dates;
}

function shiftWeek(baseDate: string, dir: number): string {
  const d = new Date(baseDate + "T00:00:00");
  d.setDate(d.getDate() + dir * 7);
  return d.toISOString().slice(0, 10);
}

function getCountdownFr(eventDate: string, eventTime: string): string | null {
  if (!eventTime) return null;
  const [h, m] = eventTime.split(":").map(Number);
  const target = new Date(eventDate + "T00:00:00");
  target.setHours(h, m, 0, 0);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return `Dans ${days}j`;
  }
  if (hours > 0) return `Dans ${hours}h ${mins}min`;
  return `Dans ${mins}min`;
}

function compareActualForecast(actual?: string, forecast?: string): "better" | "worse" | "inline" | null {
  if (!actual || !forecast || actual === "-" || forecast === "-") return null;
  const a = parseFloat(actual.replace(/[^0-9.\-]/g, ""));
  const f = parseFloat(forecast.replace(/[^0-9.\-]/g, ""));
  if (isNaN(a) || isNaN(f)) return null;
  if (a > f) return "better";
  if (a < f) return "worse";
  return "inline";
}

// ─── Quick Filter type ───────────────────────────────────────────────────────────

type QuickFilter = "tous" | "high_only" | "today" | "this_week";

// ─── Event Notes (localStorage) ──────────────────────────────────────────────────

function getEventNoteKey(date: string, event: string): string {
  return `eco_note_${date}_${event.replace(/\s+/g, "_").slice(0, 40)}`;
}

function getEventNote(date: string, event: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(getEventNoteKey(date, event)) || "";
}

function setEventNote(date: string, event: string, note: string): void {
  if (typeof window === "undefined") return;
  const key = getEventNoteKey(date, event);
  if (note.trim()) {
    localStorage.setItem(key, note);
  } else {
    localStorage.removeItem(key);
  }
}

// ─── Next Event Countdown ────────────────────────────────────────────────────────

function getNextEventCountdown(events: EcoEvent[]): { label: string; event: EcoEvent } | null {
  const now = new Date();
  let closest: { diff: number; event: EcoEvent } | null = null;

  for (const e of events) {
    if (!e.time) continue;
    const [h, m] = e.time.split(":").map(Number);
    const target = new Date(e.date + "T00:00:00");
    target.setHours(h, m, 0, 0);
    const diff = target.getTime() - now.getTime();
    if (diff > 0 && (!closest || diff < closest.diff)) {
      closest = { diff, event: e };
    }
  }

  if (!closest) return null;
  const hours = Math.floor(closest.diff / (1000 * 60 * 60));
  const mins = Math.floor((closest.diff % (1000 * 60 * 60)) / (1000 * 60));
  let label: string;
  if (hours > 48) {
    label = `${Math.floor(hours / 24)}j ${hours % 24}h`;
  } else if (hours > 0) {
    label = `${hours}h ${mins}min`;
  } else {
    label = `${mins}min`;
  }
  return { label, event: closest.event };
}

// ─── Skeleton Components ─────────────────────────────────────────────────────────

function SkeletonUpcoming() {
  return (
    <div className="glass rounded-2xl p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-[--bg-secondary]/40 rounded" />
        <div className="h-3 w-32 bg-[--bg-secondary]/40 rounded" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 rounded-lg border border-[--border]/30 p-2 min-w-[180px]">
            <div className="h-3 w-12 bg-[--bg-secondary]/40 rounded mb-1.5" />
            <div className="h-3 w-full bg-[--bg-secondary]/30 rounded mb-1" />
            <div className="h-3 w-2/3 bg-[--bg-secondary]/30 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-[--border]/50 bg-[--bg-secondary]/20">
        <div className="h-4 w-48 bg-[--bg-secondary]/40 rounded" />
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[--border]/20">
          <div className="h-3 w-10 bg-[--bg-secondary]/30 rounded" />
          <div className="flex gap-0.5">{[1, 2, 3].map((d) => <div key={d} className="w-2 h-2 bg-[--bg-secondary]/30 rounded-full" />)}</div>
          <div className="h-3 w-14 bg-[--bg-secondary]/30 rounded" />
          <div className="h-3 flex-1 bg-[--bg-secondary]/30 rounded" />
          <div className="h-3 w-14 bg-[--bg-secondary]/20 rounded" />
          <div className="h-3 w-14 bg-[--bg-secondary]/20 rounded" />
          <div className="h-3 w-14 bg-[--bg-secondary]/20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────────

type ViewMode = "week" | "day";
type ImpactFilter = "all" | "high" | "medium+";
const ALL_COUNTRIES = ["US", "EU", "GB", "JP", "CN", "CH", "AU", "CA", "DE", "FR", "NZ"];
const ALL_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD", "CAD", "NZD"];

export default function CalendarEcoPage() {
  const [events, setEvents] = useState<EcoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [baseDate, setBaseDate] = useState(todayStr());
  const [selectedDay, setSelectedDay] = useState(todayStr());
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [, setTick] = useState(0);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("tous");
  const [noteModal, setNoteModal] = useState<{ date: string; event: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const { trades } = useTrades();

  // Extract currencies the user actively trades
  const userTradedCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    for (const t of trades) {
      const asset = (t.asset || "").toUpperCase();
      // Extract currencies from forex pairs (e.g. EURUSD -> EUR, USD)
      if (asset.length === 6 && !asset.includes("/")) {
        currencies.add(asset.slice(0, 3));
        currencies.add(asset.slice(3, 6));
      } else if (asset.includes("/")) {
        const parts = asset.split("/");
        parts.forEach((p) => currencies.add(p.trim()));
      }
      // Also check if asset matches a known currency index/pair
      const knownCurrencies = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD", "CAD", "NZD"];
      for (const c of knownCurrencies) {
        if (asset.includes(c)) currencies.add(c);
      }
    }
    return currencies;
  }, [trades]);

  // ─── Fetch calendar data ────────────────────────────────────────────────

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data: CalendarAPIResponse = await res.json();
        if (data.events && data.events.length > 0) {
          const mapped: EcoEvent[] = data.events.map((e) => ({
            date: e.date,
            time: e.time || "",
            country: e.country || "",
            currency: e.currency || "",
            event: e.title,
            impact: e.impact,
            previous: e.previous || undefined,
            forecast: e.forecast || undefined,
            actual: e.actual || undefined,
          }));
          setEvents(mapped);
          setDataSource(data.source || "api");
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("[Calendar] API fetch failed:", e);
    }

    // Fallback to static data
    setEvents(generateStaticFallback());
    setDataSource("static");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Refresh countdown timers every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Week dates
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  // Filtered events (includes quick filter logic)
  const filteredEvents = useMemo(() => {
    const today = todayStr();
    const weekStart = getWeekDates(today);
    const weekDateSet = new Set(weekStart);

    return events.filter((e) => {
      // Quick filter
      if (quickFilter === "high_only" && e.impact !== "high") return false;
      if (quickFilter === "today" && e.date !== today) return false;
      if (quickFilter === "this_week" && !weekDateSet.has(e.date)) return false;

      // Existing filters
      if (impactFilter === "high" && e.impact !== "high") return false;
      if (impactFilter === "medium+" && e.impact === "low") return false;
      if (countryFilter.length > 0 && !countryFilter.includes(e.country)) return false;
      if (currencyFilter.length > 0 && !currencyFilter.includes(e.currency)) return false;
      return true;
    });
  }, [events, impactFilter, countryFilter, currencyFilter, quickFilter]);

  // Upcoming events (next 5 from now)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter((e) => {
        if (!e.time) return false;
        const [h, m] = e.time.split(":").map(Number);
        const d = new Date(e.date + "T00:00:00");
        d.setHours(h, m, 0, 0);
        return d.getTime() > now.getTime();
      })
      .sort((a, b) => {
        const da = new Date(a.date + "T" + a.time);
        const db = new Date(b.date + "T" + b.time);
        return da.getTime() - db.getTime();
      })
      .slice(0, 5);
  }, [filteredEvents]);

  // Events grouped by date for week view
  const eventsByDate = useMemo(() => {
    const map: Record<string, EcoEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [filteredEvents]);

  // Week view: sorted dates that fall within the week
  const weekViewDates = useMemo(() => {
    return weekDates.filter((d) => eventsByDate[d] && eventsByDate[d].length > 0);
  }, [weekDates, eventsByDate]);

  // Day view events
  const dayEvents = useMemo(() => {
    return (eventsByDate[selectedDay] || []);
  }, [eventsByDate, selectedDay]);

  const navigateWeek = (dir: number) => setBaseDate(shiftWeek(baseDate, dir));
  const goToToday = () => {
    setBaseDate(todayStr());
    setSelectedDay(todayStr());
  };

  const toggleCountry = (c: string) => {
    setCountryFilter((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleCurrency = (c: string) => {
    setCurrencyFilter((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  // ─── Render an event row (shared between week and day views) ─────────
  const renderEventRow = (e: EcoEvent, i: number, showDate?: boolean) => {
    const cfg = IMPACT_CONFIG[e.impact];
    const verdict = compareActualForecast(e.actual, e.forecast);
    const countdown = getCountdownFr(e.date, e.time);

    return (
      <tr
        key={`${e.date}-${i}`}
        className={`border-b border-[--border]/20 transition hover:bg-[var(--bg-hover)] group ${
          e.impact === "high" ? "bg-rose-500/[0.03]" : ""
        }`}
      >
        {/* Time */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="mono text-xs font-bold text-[--text-primary]">
              {e.time || "\u2014"}
            </span>
            {countdown && (
              <span className="text-[10px] text-amber-400 font-medium leading-tight">
                {countdown}
              </span>
            )}
          </div>
        </td>

        {/* Currency + flag */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{COUNTRY_FLAGS[e.country] || ""}</span>
            <span className="text-[11px] font-semibold text-[--text-secondary]">
              {e.currency}
            </span>
          </div>
        </td>

        {/* Impact */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className={`w-2 h-2 rounded-full ${
                  (e.impact === "high" && dot <= 3) ||
                  (e.impact === "medium" && dot <= 2) ||
                  (e.impact === "low" && dot <= 1)
                    ? cfg.dotClass
                    : "bg-[--bg-secondary]/50"
                }`}
              />
            ))}
          </div>
        </td>

        {/* Event name + badges */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium text-[--text-primary] ${e.impact === "high" ? "font-semibold" : ""}`}>
              {e.event}
            </span>
            {userTradedCurrencies.has(e.currency) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 whitespace-nowrap">
                <AlertCircle className="w-2.5 h-2.5" />
                Concerne vos positions
              </span>
            )}
            <button
              onClick={() => {
                setNoteModal({ date: e.date, event: e.event });
                setNoteText(getEventNote(e.date, e.event));
              }}
              className={`p-0.5 rounded transition hover:bg-[var(--bg-hover)] flex-shrink-0 ${
                getEventNote(e.date, e.event) ? "text-amber-400" : "text-[--text-muted] opacity-0 group-hover:opacity-100"
              }`}
              title="Note personnelle"
            >
              <StickyNote className="w-3 h-3" />
            </button>
          </div>
        </td>

        {/* Previous */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <span className="mono text-xs text-[--text-muted]">
            {e.previous || "\u2014"}
          </span>
        </td>

        {/* Forecast */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <span className="mono text-xs text-[--text-secondary]">
            {e.forecast || "\u2014"}
          </span>
        </td>

        {/* Actual */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <span
            className={`mono text-xs font-bold ${
              verdict === "better"
                ? "text-emerald-400"
                : verdict === "worse"
                ? "text-rose-400"
                : e.actual
                ? "text-[--text-primary]"
                : "text-[--text-muted]"
            }`}
          >
            {e.actual || "\u2014"}
          </span>
        </td>
      </tr>
    );
  };

  // ─── Render a mobile card for an event ───────────────────────────────
  const renderEventCard = (e: EcoEvent, i: number) => {
    const cfg = IMPACT_CONFIG[e.impact];
    const verdict = compareActualForecast(e.actual, e.forecast);
    const countdown = getCountdownFr(e.date, e.time);

    return (
      <div
        key={`${e.date}-${i}`}
        className={`px-3 py-2.5 border-b border-[--border]/20 hover:bg-[var(--bg-hover)] transition ${
          e.impact === "high" ? "bg-rose-500/[0.03]" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="mono text-xs font-bold text-[--text-primary]">{e.time || "\u2014"}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`w-1.5 h-1.5 rounded-full ${
                    (e.impact === "high" && dot <= 3) ||
                    (e.impact === "medium" && dot <= 2) ||
                    (e.impact === "low" && dot <= 1)
                      ? cfg.dotClass
                      : "bg-[--bg-secondary]/50"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm leading-none">{COUNTRY_FLAGS[e.country] || ""}</span>
              <span className="text-[10px] font-semibold text-[--text-secondary]">{e.currency}</span>
            </div>
          </div>
          {countdown && (
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
              {countdown}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className={`text-[11px] font-medium text-[--text-primary] leading-tight ${e.impact === "high" ? "font-semibold" : ""}`}>
            {e.event}
          </p>
          {userTradedCurrencies.has(e.currency) && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 whitespace-nowrap flex-shrink-0">
              Vos positions
            </span>
          )}
          <button
            onClick={() => {
              setNoteModal({ date: e.date, event: e.event });
              setNoteText(getEventNote(e.date, e.event));
            }}
            className={`p-0.5 rounded transition flex-shrink-0 ${
              getEventNote(e.date, e.event) ? "text-amber-400" : "text-[--text-muted]"
            }`}
          >
            <StickyNote className="w-3 h-3" />
          </button>
        </div>
        {(e.previous || e.forecast || e.actual) && (
          <div className="flex items-center gap-3 mt-1 text-[10px]">
            <span className="text-[--text-muted]">Préc: {e.previous || "\u2014"}</span>
            <span className="text-[--text-secondary]">Prév: {e.forecast || "\u2014"}</span>
            {e.actual && (
              <span
                className={`font-bold ${
                  verdict === "better" ? "text-emerald-400" : verdict === "worse" ? "text-rose-400" : "text-[--text-primary]"
                }`}
              >
                Act: {e.actual}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render a date header row ───────────────────────────────────────
  const renderDateHeader = (date: string, eventCount: number, highCount: number) => {
    const today = isToday(date);
    return (
      <tr key={`header-${date}`}>
        <td
          colSpan={7}
          className={`sticky top-0 z-10 px-3 py-2 border-b border-[--border]/50 ${
            today
              ? "bg-cyan-500/10 backdrop-blur-sm"
              : "bg-[--bg-secondary]/40 backdrop-blur-sm"
          }`}
        >
          <div className="flex items-center gap-2">
            {today && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />}
            <span className={`text-xs font-bold uppercase tracking-wider ${today ? "text-cyan-400" : "text-[--text-primary]"}`}>
              {formatDateHeader(date)}
            </span>
            <span className="text-[10px] text-[--text-muted]">
              {eventCount} événement{eventCount > 1 ? "s" : ""}
            </span>
            {highCount > 0 && (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full ml-auto">
                {highCount} impact élevé
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ─── Mobile date header ─────────────────────────────────────────────
  const renderMobileDateHeader = (date: string, eventCount: number, highCount: number) => {
    const today = isToday(date);
    return (
      <div
        key={`mheader-${date}`}
        className={`sticky top-0 z-10 px-3 py-2 border-b border-[--border]/50 ${
          today
            ? "bg-cyan-500/10 backdrop-blur-sm"
            : "bg-[--bg-secondary]/40 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center gap-2">
          {today && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />}
          <span className={`text-xs font-bold uppercase tracking-wider ${today ? "text-cyan-400" : "text-[--text-primary]"}`}>
            {formatDateHeader(date)}
          </span>
          <span className="text-[10px] text-[--text-muted]">
            {eventCount} évt{eventCount > 1 ? "s" : ""}
          </span>
          {highCount > 0 && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full ml-auto">
              {highCount}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Calendrier Économique
          </h1>
          <p className="text-sm text-[--text-secondary] mt-1 flex items-center gap-2">
            Événements macro-économiques et publications
            {dataSource && !loading && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[--bg-secondary]/50 border border-[--border]">
                {dataSource === "static" ? (
                  <><WifiOff className="w-3 h-3 text-amber-400" /> Données statiques</>
                ) : (
                  <><Wifi className="w-3 h-3 text-emerald-400" /> {dataSource === "forexfactory" ? "Forex Factory" : dataSource === "finnhub" ? "Finnhub" : dataSource}</>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCalendar}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition"
          >
            Aujourd&apos;hui
          </button>
          <div className="flex border border-[--border] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === "week"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-secondary] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" /> Semaine
            </button>
            <button
              onClick={() => { setViewMode("day"); setSelectedDay(todayStr()); }}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === "day"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-secondary] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Jour
            </button>
          </div>
        </div>
      </div>

      {/* ── Countdown to Next Event ──────────────────────────────── */}
      {(() => {
        const next = getNextEventCountdown(events);
        if (!next) return null;
        const cfg = IMPACT_CONFIG[next.event.impact];
        return (
          <div className={`glass rounded-xl px-4 py-2.5 flex items-center gap-3 ${cfg.bg} border ${cfg.border}`}>
            <Clock className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
            <span className="text-xs font-semibold text-[--text-primary]">
              Prochain événement dans{" "}
              <span className="text-amber-400 font-bold">{next.label}</span>
            </span>
            <span className="text-[10px] text-[--text-secondary]">
              {COUNTRY_FLAGS[next.event.country] || ""} {next.event.currency} — {next.event.event}
            </span>
            <span className="ml-auto text-[10px] font-bold text-[--text-muted]">
              {next.event.time}
            </span>
          </div>
        );
      })()}

      {/* ── Quick Filter Pills ─────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "tous" as QuickFilter, label: "Tous" },
          { key: "high_only" as QuickFilter, label: "Impact élevé seulement" },
          { key: "today" as QuickFilter, label: "Aujourd\u2019hui" },
          { key: "this_week" as QuickFilter, label: "Cette semaine" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setQuickFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quickFilter === key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : "glass text-[--text-secondary] hover:text-[--text-primary] border border-[--border]"
            }`}
          >
            {label}
          </button>
        ))}
        {userTradedCurrencies.size > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <AlertCircle className="w-3 h-3" />
            {userTradedCurrencies.size} devise{userTradedCurrencies.size > 1 ? "s" : ""} suivie{userTradedCurrencies.size > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Upcoming Events (compact horizontal strip) ─────────── */}
      {loading ? (
        <SkeletonUpcoming />
      ) : upcomingEvents.length > 0 ? (
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-semibold text-[--text-primary]">Prochains événements</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {upcomingEvents.map((e, i) => {
              const countdown = getCountdownFr(e.date, e.time);
              const cfg = IMPACT_CONFIG[e.impact];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 rounded-lg border px-3 py-2 min-w-[170px] max-w-[220px] ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{COUNTRY_FLAGS[e.country] || ""}</span>
                      <span className="text-[10px] font-semibold text-[--text-secondary]">{e.currency}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[--text-primary]">{e.time}</span>
                      {countdown && (
                        <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded-full leading-none">
                          {countdown}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-[--text-primary] leading-tight line-clamp-2">
                    {e.event}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Filter Toolbar ────────────────────────────────────────── */}
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-[--text-muted]" />

        {/* Impact filter */}
        <div className="flex gap-1">
          {([
            { key: "all" as ImpactFilter, label: "Tous" },
            { key: "high" as ImpactFilter, label: "\u{1F534} Élevé" },
            { key: "medium+" as ImpactFilter, label: "\u{1F7E1} Moyen+" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setImpactFilter(key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                impactFilter === key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[--border]" />

        {/* Currency filter */}
        <div className="flex gap-1 flex-wrap">
          {ALL_CURRENCIES.map((c) => {
            const isActive = currencyFilter.includes(c);
            const flagKey = ALL_COUNTRIES.find((co) => {
              if (c === "USD") return co === "US";
              if (c === "EUR") return co === "EU";
              if (c === "GBP") return co === "GB";
              if (c === "JPY") return co === "JP";
              if (c === "CNY") return co === "CN";
              if (c === "CHF") return co === "CH";
              if (c === "AUD") return co === "AU";
              if (c === "CAD") return co === "CA";
              if (c === "NZD") return co === "NZ";
              return false;
            });
            return (
              <button
                key={c}
                onClick={() => toggleCurrency(c)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "text-[--text-muted] hover:text-[--text-primary] border border-transparent hover:border-[--border]"
                }`}
              >
                <span className="text-xs leading-none">{flagKey ? COUNTRY_FLAGS[flagKey] : ""}</span>
                {c}
              </button>
            );
          })}
          {currencyFilter.length > 0 && (
            <button
              onClick={() => setCurrencyFilter([])}
              className="px-2 py-0.5 rounded text-[10px] text-cyan-400 hover:bg-[var(--bg-hover)] transition"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <span className="text-[10px] text-[--text-muted] ml-auto whitespace-nowrap">
          {filteredEvents.length} événements
        </span>
      </div>

      {/* ── Close dropdowns on outside click ──────────────────────── */}
      {(showCountryDropdown || showCurrencyDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowCountryDropdown(false); setShowCurrencyDropdown(false); }}
        />
      )}

      {/* ── Week View (vertical table with date group headers) ────── */}
      {viewMode === "week" && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition text-[--text-secondary]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-[--text-primary]">
              Semaine du {formatDateHeader(weekDates[0])} au {new Date(weekDates[4] + "T00:00:00").getDate()} {MONTHS_FR[new Date(weekDates[4] + "T00:00:00").getMonth()]}
            </h2>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition text-[--text-secondary]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Vertical table */}
          {loading ? (
            <SkeletonTable />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[--text-muted] border-b border-[--border]/50 bg-[--bg-secondary]/20">
                        <th className="px-3 py-2 w-[70px]">Heure</th>
                        <th className="px-3 py-2 w-[80px]">Devise</th>
                        <th className="px-3 py-2 w-[60px]">Impact</th>
                        <th className="px-3 py-2">Événement</th>
                        <th className="px-3 py-2 text-right w-[80px]">Précédent</th>
                        <th className="px-3 py-2 text-right w-[80px]">Prévision</th>
                        <th className="px-3 py-2 text-right w-[80px]">Actuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekDates.map((date) => {
                        const evts = eventsByDate[date] || [];
                        if (evts.length === 0) return null;
                        const highCount = evts.filter((e) => e.impact === "high").length;
                        return [
                          renderDateHeader(date, evts.length, highCount),
                          ...evts.map((e, i) => renderEventRow(e, i)),
                        ];
                      })}
                      {weekDates.every((d) => !eventsByDate[d] || eventsByDate[d].length === 0) && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-[--text-muted] text-sm">
                            Aucun événement pour cette semaine
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden glass rounded-2xl overflow-hidden">
                {weekDates.map((date) => {
                  const evts = eventsByDate[date] || [];
                  if (evts.length === 0) return null;
                  const highCount = evts.filter((e) => e.impact === "high").length;
                  return (
                    <div key={`m-${date}`}>
                      {renderMobileDateHeader(date, evts.length, highCount)}
                      {evts.map((e, i) => renderEventCard(e, i))}
                    </div>
                  );
                })}
                {weekDates.every((d) => !eventsByDate[d] || eventsByDate[d].length === 0) && (
                  <div className="px-4 py-8 text-center text-[--text-muted] text-sm">
                    Aucun événement pour cette semaine
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Day View (vertical table for a single day) ────────────── */}
      {viewMode === "day" && (
        <>
          {/* Day navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const d = new Date(selectedDay + "T00:00:00");
                d.setDate(d.getDate() - 1);
                setSelectedDay(d.toISOString().slice(0, 10));
              }}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition text-[--text-secondary]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
              {isToday(selectedDay) && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
              {formatDateHeader(selectedDay)}
              {dayEvents.length > 0 && (
                <span className="text-[10px] text-[--text-muted] font-normal">
                  ({dayEvents.length} événement{dayEvents.length > 1 ? "s" : ""})
                </span>
              )}
            </h2>
            <button
              onClick={() => {
                const d = new Date(selectedDay + "T00:00:00");
                d.setDate(d.getDate() + 1);
                setSelectedDay(d.toISOString().slice(0, 10));
              }}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition text-[--text-secondary]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day events */}
          {loading ? (
            <SkeletonTable />
          ) : dayEvents.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-[--text-muted]">
              Aucun événement pour cette journée
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[--text-muted] border-b border-[--border]/50 bg-[--bg-secondary]/20">
                        <th className="px-3 py-2 w-[70px]">Heure</th>
                        <th className="px-3 py-2 w-[80px]">Devise</th>
                        <th className="px-3 py-2 w-[60px]">Impact</th>
                        <th className="px-3 py-2">Événement</th>
                        <th className="px-3 py-2 text-right w-[80px]">Précédent</th>
                        <th className="px-3 py-2 text-right w-[80px]">Prévision</th>
                        <th className="px-3 py-2 text-right w-[80px]">Actuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEvents.map((e, i) => renderEventRow(e, i))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden glass rounded-2xl overflow-hidden">
                {dayEvents.map((e, i) => renderEventCard(e, i))}
              </div>

              {/* Day summary */}
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-4 justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[--text-primary]">{dayEvents.length}</p>
                    <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Événements</p>
                  </div>
                  <div className="w-px h-8 bg-[--border]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-rose-400">
                      {dayEvents.filter((e) => e.impact === "high").length}
                    </p>
                    <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Impact élevé</p>
                  </div>
                  <div className="w-px h-8 bg-[--border]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-400">
                      {[...new Set(dayEvents.map((e) => e.currency))].length}
                    </p>
                    <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Devises</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Note Modal ────────────────────────────────────────────── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
          <div
            className="glass rounded-2xl p-5 w-full max-w-md mx-4 border border-[--border] shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-[--text-primary]">Note personnelle</h3>
              </div>
              <button onClick={() => setNoteModal(null)} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition">
                <X className="w-4 h-4 text-[--text-muted]" />
              </button>
            </div>
            <p className="text-[10px] text-[--text-muted] mb-3 truncate">{noteModal.event}</p>
            <textarea
              value={noteText}
              onChange={(ev) => setNoteText(ev.target.value)}
              placeholder="Ajoutez votre note pour cet événement..."
              className="w-full h-24 rounded-xl bg-[--bg-secondary]/50 border border-[--border] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] resize-none focus:outline-none focus:border-cyan-500/50 transition"
            />
            <div className="flex justify-end gap-2 mt-3">
              {noteText.trim() && (
                <button
                  onClick={() => {
                    setEventNote(noteModal.date, noteModal.event, "");
                    setNoteText("");
                    setNoteModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Supprimer
                </button>
              )}
              <button
                onClick={() => {
                  setEventNote(noteModal.date, noteModal.event, noteText);
                  setNoteModal(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
