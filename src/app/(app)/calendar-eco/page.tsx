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
} from "lucide-react";

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
  high:   { label: "\u00c9lev\u00e9",  dot: "\u{1F534}", color: "text-rose-400",   bg: "bg-rose-500/10",  border: "border-rose-500/30",  dotClass: "bg-rose-500"   },
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
    { date: dateStr(0), time: "09:00", country: "EU", currency: "EUR", event: "R\u00e9union Eurogroupe", impact: "medium" },
    { date: dateStr(0), time: "14:30", country: "US", currency: "USD", event: "Indice Empire State Manufacturing", impact: "medium", previous: "-5.7", forecast: "-2.0" },
    { date: dateStr(0), time: "03:00", country: "CN", currency: "CNY", event: "Production Industrielle (YoY)", impact: "medium", previous: "6.2%", forecast: "5.8%" },
    { date: dateStr(1), time: "10:00", country: "DE", currency: "EUR", event: "Indice ZEW - Sentiment \u00c9conomique", impact: "medium", previous: "10.3", forecast: "12.5" },
    { date: dateStr(1), time: "14:30", country: "US", currency: "USD", event: "Ventes au D\u00e9tail (MoM)", impact: "high", previous: "-0.9%", forecast: "0.6%" },
    { date: dateStr(1), time: "15:15", country: "US", currency: "USD", event: "Production Industrielle (MoM)", impact: "medium", previous: "0.5%", forecast: "0.3%" },
    { date: dateStr(2), time: "10:30", country: "GB", currency: "GBP", event: "IPC (YoY)", impact: "high", previous: "3.0%", forecast: "2.9%" },
    { date: dateStr(2), time: "14:30", country: "US", currency: "USD", event: "Permis de Construire", impact: "medium", previous: "1.473M", forecast: "1.450M" },
    { date: dateStr(2), time: "14:30", country: "CA", currency: "CAD", event: "IPC (YoY)", impact: "high", previous: "1.9%", forecast: "2.1%" },
    { date: dateStr(3), time: "13:30", country: "CH", currency: "CHF", event: "D\u00e9cision Taux BNS", impact: "high", previous: "0.50%", forecast: "0.25%" },
    { date: dateStr(3), time: "14:30", country: "US", currency: "USD", event: "Inscriptions Hebdo. au Ch\u00f4mage", impact: "medium", previous: "220K", forecast: "215K" },
    { date: dateStr(3), time: "20:00", country: "US", currency: "USD", event: "D\u00e9cision Taux Fed (FOMC)", impact: "high", previous: "4.50%", forecast: "4.50%" },
    { date: dateStr(3), time: "20:30", country: "US", currency: "USD", event: "Conf\u00e9rence de Presse FOMC - Powell", impact: "high" },
    { date: dateStr(4), time: "01:00", country: "JP", currency: "JPY", event: "D\u00e9cision Taux BOJ", impact: "high", previous: "0.50%", forecast: "0.50%" },
    { date: dateStr(4), time: "13:00", country: "GB", currency: "GBP", event: "D\u00e9cision Taux BOE", impact: "high", previous: "4.50%", forecast: "4.50%" },
    { date: dateStr(4), time: "09:00", country: "DE", currency: "EUR", event: "IPP (MoM)", impact: "low", previous: "0.2%", forecast: "0.1%" },
    { date: dateStr(7), time: "09:30", country: "DE", currency: "EUR", event: "PMI Manufacturier Flash", impact: "high", previous: "46.5", forecast: "47.0" },
    { date: dateStr(7), time: "10:00", country: "EU", currency: "EUR", event: "PMI Composite Flash Zone Euro", impact: "high", previous: "50.2", forecast: "50.5" },
    { date: dateStr(7), time: "15:45", country: "US", currency: "USD", event: "PMI Manufacturier Flash S&P", impact: "medium", previous: "52.7", forecast: "52.0" },
    { date: dateStr(8), time: "10:00", country: "DE", currency: "EUR", event: "Indice IFO du Climat des Affaires", impact: "high", previous: "85.2", forecast: "86.0" },
    { date: dateStr(8), time: "15:00", country: "US", currency: "USD", event: "Confiance des Consommateurs CB", impact: "high", previous: "98.3", forecast: "95.0" },
    { date: dateStr(9), time: "14:30", country: "US", currency: "USD", event: "Commandes de Biens Durables (MoM)", impact: "high", previous: "3.2%", forecast: "-1.0%" },
    { date: dateStr(10), time: "14:30", country: "US", currency: "USD", event: "PIB (QoQ) - 3\u00e8me estimation Q4", impact: "high", previous: "2.3%", forecast: "2.3%" },
    { date: dateStr(11), time: "14:30", country: "US", currency: "USD", event: "Indice des Prix PCE Core (MoM)", impact: "high", previous: "0.3%", forecast: "0.3%" },
    { date: dateStr(11), time: "14:30", country: "US", currency: "USD", event: "Indice des Prix PCE Core (YoY)", impact: "high", previous: "2.6%", forecast: "2.7%" },
    { date: dateStr(11), time: "16:00", country: "US", currency: "USD", event: "Sentiment Michigan - Final", impact: "medium", previous: "57.9", forecast: "57.5" },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janvier", "f\u00e9vrier", "mars", "avril", "mai", "juin", "juillet", "ao\u00fbt", "septembre", "octobre", "novembre", "d\u00e9cembre"];

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

// ─── Skeleton Components ─────────────────────────────────────────────────────────

function SkeletonUpcoming() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-[--bg-secondary]/40 rounded" />
        <div className="h-4 w-40 bg-[--bg-secondary]/40 rounded" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0 rounded-xl border border-[--border]/30 p-3 min-w-[200px]">
            <div className="h-3 w-12 bg-[--bg-secondary]/40 rounded mb-2" />
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 bg-[--bg-secondary]/30 rounded" />
              <div className="h-3 w-8 bg-[--bg-secondary]/30 rounded" />
            </div>
            <div className="h-3 w-full bg-[--bg-secondary]/30 rounded mb-1" />
            <div className="h-3 w-2/3 bg-[--bg-secondary]/30 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonWeekGrid() {
  return (
    <div className="grid grid-cols-5 gap-3">
      {[1, 2, 3, 4, 5].map((col) => (
        <div key={col} className="glass rounded-2xl overflow-hidden animate-pulse">
          <div className="px-3 py-2.5 border-b border-[--border]/50 bg-[--bg-secondary]/30">
            <div className="h-3 w-8 bg-[--bg-secondary]/40 rounded mb-1" />
            <div className="h-6 w-6 bg-[--bg-secondary]/40 rounded" />
          </div>
          <div className="divide-y divide-[--border-subtle]/20">
            {[1, 2, 3].map((row) => (
              <div key={row} className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2.5 w-10 bg-[--bg-secondary]/30 rounded" />
                  <div className="w-1.5 h-1.5 bg-[--bg-secondary]/30 rounded-full" />
                </div>
                <div className="h-3 w-full bg-[--bg-secondary]/30 rounded mb-1" />
                <div className="h-3 w-2/3 bg-[--bg-secondary]/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonDayTable() {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="h-4 w-full bg-[--bg-secondary]/30 rounded mb-3" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-[--border]/20">
            <div className="h-3 w-12 bg-[--bg-secondary]/30 rounded" />
            <div className="flex gap-1">{[1, 2, 3].map((d) => <div key={d} className="w-2.5 h-2.5 bg-[--bg-secondary]/30 rounded-full" />)}</div>
            <div className="h-3 w-8 bg-[--bg-secondary]/30 rounded" />
            <div className="h-3 w-10 bg-[--bg-secondary]/30 rounded" />
            <div className="h-3 flex-1 bg-[--bg-secondary]/30 rounded" />
            <div className="h-3 w-14 bg-[--bg-secondary]/30 rounded" />
            <div className="h-3 w-14 bg-[--bg-secondary]/20 rounded" />
            <div className="h-3 w-14 bg-[--bg-secondary]/20 rounded" />
          </div>
        ))}
      </div>
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

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (impactFilter === "high" && e.impact !== "high") return false;
      if (impactFilter === "medium+" && e.impact === "low") return false;
      if (countryFilter.length > 0 && !countryFilter.includes(e.country)) return false;
      if (currencyFilter.length > 0 && !currencyFilter.includes(e.currency)) return false;
      return true;
    });
  }, [events, impactFilter, countryFilter, currencyFilter]);

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

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Calendrier Économique
          </h1>
          <p className="text-sm text-[--text-secondary] mt-1 flex items-center gap-2">
            Événements macro-économiques et publications à venir
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
            className="p-2 rounded-lg hover:bg-white/5 transition"
            title="Rafra\u00eechir"
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
                  : "text-[--text-secondary] hover:bg-white/5"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" /> Semaine
            </button>
            <button
              onClick={() => { setViewMode("day"); setSelectedDay(todayStr()); }}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === "day"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-secondary] hover:bg-white/5"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Jour
            </button>
          </div>
        </div>
      </div>

      {/* ── Upcoming Events Widget ───────────────────────────────── */}
      {loading ? (
        <SkeletonUpcoming />
      ) : upcomingEvents.length > 0 ? (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-[--text-primary]">Prochains événements</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcomingEvents.map((e, i) => {
              const countdown = getCountdownFr(e.date, e.time);
              const cfg = IMPACT_CONFIG[e.impact];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 rounded-xl border p-3 min-w-[200px] ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[--text-primary]">{e.time}</span>
                    {countdown && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                        {countdown}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{COUNTRY_FLAGS[e.country] || ""}</span>
                    <span className="text-xs text-[--text-secondary] font-medium">{e.currency}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                  </div>
                  <p className="text-xs font-medium text-[--text-primary] leading-tight line-clamp-2">
                    {e.event}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="glass rounded-xl p-3 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-[--text-muted]" />

        {/* Impact filter */}
        <div className="flex gap-1">
          {([
            { key: "all" as ImpactFilter, label: "Tous" },
            { key: "high" as ImpactFilter, label: "\u{1F534} \u00c9lev\u00e9" },
            { key: "medium+" as ImpactFilter, label: "\u{1F7E1} Moyen+" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setImpactFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                impactFilter === key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[--border]" />

        {/* Country filter */}
        <div className="relative">
          <button
            onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowCurrencyDropdown(false); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[--border] text-[--text-secondary] hover:border-[--text-muted] transition flex items-center gap-1.5"
          >
            <Eye className="w-3 h-3" />
            Pays {countryFilter.length > 0 && `(${countryFilter.length})`}
          </button>
          {showCountryDropdown && (
            <div className="absolute top-full mt-1 left-0 z-50 glass rounded-xl border border-[--border] p-2 min-w-[180px] shadow-xl">
              {countryFilter.length > 0 && (
                <button
                  onClick={() => setCountryFilter([])}
                  className="w-full text-left px-2 py-1 text-[10px] text-cyan-400 hover:bg-white/5 rounded mb-1"
                >
                  Réinitialiser
                </button>
              )}
              {ALL_COUNTRIES.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={countryFilter.includes(c)}
                    onChange={() => toggleCountry(c)}
                    className="rounded text-cyan-500 border-[--border] bg-transparent"
                  />
                  <span className="text-sm">{COUNTRY_FLAGS[c]}</span>
                  <span className="text-xs text-[--text-primary]">{c}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Currency filter */}
        <div className="relative">
          <button
            onClick={() => { setShowCurrencyDropdown(!showCurrencyDropdown); setShowCountryDropdown(false); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[--border] text-[--text-secondary] hover:border-[--text-muted] transition flex items-center gap-1.5"
          >
            Devise {currencyFilter.length > 0 && `(${currencyFilter.length})`}
          </button>
          {showCurrencyDropdown && (
            <div className="absolute top-full mt-1 left-0 z-50 glass rounded-xl border border-[--border] p-2 min-w-[140px] shadow-xl">
              {currencyFilter.length > 0 && (
                <button
                  onClick={() => setCurrencyFilter([])}
                  className="w-full text-left px-2 py-1 text-[10px] text-cyan-400 hover:bg-white/5 rounded mb-1"
                >
                  Réinitialiser
                </button>
              )}
              {ALL_CURRENCIES.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={currencyFilter.includes(c)}
                    onChange={() => toggleCurrency(c)}
                    className="rounded text-cyan-500 border-[--border] bg-transparent"
                  />
                  <span className="text-xs font-mono text-[--text-primary]">{c}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-[--text-muted] ml-auto">
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

      {/* ── Week View ────────────────────────────────────────────── */}
      {viewMode === "week" && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-lg hover:bg-white/5 transition text-[--text-secondary]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-[--text-primary]">
              Semaine du {formatDateHeader(weekDates[0])} au {new Date(weekDates[4] + "T00:00:00").getDate()} {MONTHS_FR[new Date(weekDates[4] + "T00:00:00").getMonth()]}
            </h2>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 rounded-lg hover:bg-white/5 transition text-[--text-secondary]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week grid */}
          {loading ? (
            <SkeletonWeekGrid />
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {weekDates.map((date) => {
                const evts = eventsByDate[date] || [];
                const today = isToday(date);
                const highCount = evts.filter((e) => e.impact === "high").length;

                return (
                  <div
                    key={date}
                    className={`glass rounded-2xl overflow-hidden flex flex-col ${
                      today ? "ring-1 ring-cyan-500/50" : ""
                    }`}
                  >
                    {/* Day header */}
                    <div
                      className={`px-3 py-2.5 border-b border-[--border]/50 sticky top-0 z-10 cursor-pointer hover:bg-white/5 transition ${
                        today ? "bg-cyan-500/10" : "bg-[--bg-secondary]/30"
                      }`}
                      onClick={() => { setViewMode("day"); setSelectedDay(date); }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-bold ${today ? "text-cyan-400" : "text-[--text-primary]"}`}>
                            {DAYS_SHORT[new Date(date + "T00:00:00").getDay()]}
                          </p>
                          <p className={`text-lg font-bold ${today ? "text-cyan-400" : "text-[--text-primary]"}`}>
                            {new Date(date + "T00:00:00").getDate()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {today && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                          {highCount > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full">
                              {highCount} {"\u{1F534}"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Events list */}
                    <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-[--border-subtle]/20">
                      {evts.length === 0 ? (
                        <div className="p-3 text-center text-[10px] text-[--text-muted]">
                          Aucun événement
                        </div>
                      ) : (
                        evts.map((e, i) => {
                          const cfg = IMPACT_CONFIG[e.impact];
                          const verdict = compareActualForecast(e.actual, e.forecast);
                          return (
                            <div
                              key={i}
                              className={`px-3 py-2 hover:bg-white/5 transition ${
                                e.impact === "high" ? "bg-rose-500/[0.03]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold mono text-[--text-secondary]">
                                  {e.time}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                                <span className="text-xs">{COUNTRY_FLAGS[e.country]}</span>
                              </div>
                              <p className="text-[11px] font-medium text-[--text-primary] leading-tight mb-1">
                                {e.event}
                              </p>
                              {(e.previous || e.forecast || e.actual) && (
                                <div className="flex items-center gap-2 text-[10px]">
                                  {e.actual && (
                                    <span
                                      className={`font-bold ${
                                        verdict === "better"
                                          ? "text-emerald-400"
                                          : verdict === "worse"
                                          ? "text-rose-400"
                                          : "text-[--text-secondary]"
                                      }`}
                                    >
                                      A: {e.actual}
                                    </span>
                                  )}
                                  {e.forecast && (
                                    <span className="text-[--text-muted]">P: {e.forecast}</span>
                                  )}
                                  {e.previous && (
                                    <span className="text-[--text-muted]">Préc: {e.previous}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Day View ─────────────────────────────────────────────── */}
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
              className="p-2 rounded-lg hover:bg-white/5 transition text-[--text-secondary]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
              {isToday(selectedDay) && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
              {formatDateHeader(selectedDay)}
            </h2>
            <button
              onClick={() => {
                const d = new Date(selectedDay + "T00:00:00");
                d.setDate(d.getDate() + 1);
                setSelectedDay(d.toISOString().slice(0, 10));
              }}
              className="p-2 rounded-lg hover:bg-white/5 transition text-[--text-secondary]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day events table */}
          {loading ? (
            <SkeletonDayTable />
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              {dayEvents.length === 0 ? (
                <div className="p-8 text-center text-[--text-muted]">
                  Aucun événement pour cette journée
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[--text-muted] text-xs uppercase tracking-wider border-b border-[--border]/50">
                        <th className="px-4 py-3 w-16">Heure</th>
                        <th className="px-4 py-3 w-16">Impact</th>
                        <th className="px-4 py-3 w-20">Pays</th>
                        <th className="px-4 py-3 w-16">Devise</th>
                        <th className="px-4 py-3">Événement</th>
                        <th className="px-4 py-3 text-right w-24">Actuel</th>
                        <th className="px-4 py-3 text-right w-24">Prévision</th>
                        <th className="px-4 py-3 text-right w-24">Précédent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEvents.map((e, i) => {
                        const cfg = IMPACT_CONFIG[e.impact];
                        const verdict = compareActualForecast(e.actual, e.forecast);
                        const countdown = getCountdownFr(e.date, e.time);

                        return (
                          <tr
                            key={i}
                            className={`border-b border-[--border-subtle]/30 transition hover:bg-white/5 ${
                              e.impact === "high" ? "bg-rose-500/[0.03]" : i % 2 === 1 ? "bg-white/[0.01]" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="mono text-xs font-bold text-[--text-primary]">
                                  {e.time || "\u2014"}
                                </span>
                                {countdown && (
                                  <span className="text-[10px] text-amber-400 font-medium">
                                    {countdown}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map((dot) => (
                                  <span
                                    key={dot}
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      (e.impact === "high" && dot <= 3) ||
                                      (e.impact === "medium" && dot <= 2) ||
                                      (e.impact === "low" && dot <= 1)
                                        ? cfg.dotClass
                                        : "bg-[--bg-secondary]"
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{COUNTRY_FLAGS[e.country] || ""}</span>
                                <span className="text-xs font-semibold bg-[--bg-secondary] px-1.5 py-0.5 rounded text-[--text-secondary]">
                                  {e.country}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-[--text-secondary]">
                                {e.currency}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-[--text-primary]">
                                {e.event}
                              </span>
                              {e.impact === "high" && (
                                <p className="text-[10px] text-[--text-muted] mt-0.5">
                                  Forte volatilité attendue
                                </p>
                              )}
                            </td>
                            <td
                              className={`px-4 py-3 text-right mono text-xs font-bold ${
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
                            </td>
                            <td className="px-4 py-3 text-right mono text-xs text-[--text-secondary]">
                              {e.forecast || "\u2014"}
                            </td>
                            <td className="px-4 py-3 text-right mono text-xs text-[--text-muted]">
                              {e.previous || "\u2014"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Day summary card */}
          {!loading && dayEvents.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Résumé du jour
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[--text-primary]">{dayEvents.length}</p>
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider">
                    Événements
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-400">
                    {dayEvents.filter((e) => e.impact === "high").length}
                  </p>
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider">
                    Impact élevé
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {[...new Set(dayEvents.map((e) => e.currency))].length}
                  </p>
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider">
                    Devises
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
