"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, BarChart3, Clock } from "lucide-react";

interface EarningsEvent {
  symbol: string;
  name: string;
  date: string;
  time: "BMO" | "AMC" | "DMH"; // Before Market Open, After Market Close, During Market Hours
  epsEstimate?: number;
  revenueEstimate?: string;
  sector: string;
}

// Sample upcoming earnings data (updated weekly in production)
const EARNINGS_DATA: EarningsEvent[] = [
  { symbol: "AAPL", name: "Apple", date: "2026-03-19", time: "AMC", epsEstimate: 2.35, revenueEstimate: "94.3B", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", date: "2026-03-19", time: "AMC", epsEstimate: 3.22, revenueEstimate: "68.7B", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA", date: "2026-03-20", time: "AMC", epsEstimate: 0.89, revenueEstimate: "38.5B", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet", date: "2026-03-20", time: "AMC", epsEstimate: 2.12, revenueEstimate: "96.1B", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon", date: "2026-03-21", time: "AMC", epsEstimate: 1.36, revenueEstimate: "187.3B", sector: "Consumer" },
  { symbol: "META", name: "Meta", date: "2026-03-21", time: "AMC", epsEstimate: 6.73, revenueEstimate: "47.2B", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla", date: "2026-03-24", time: "AMC", epsEstimate: 0.78, revenueEstimate: "25.6B", sector: "Consumer" },
  { symbol: "JPM", name: "JPMorgan", date: "2026-03-24", time: "BMO", epsEstimate: 4.85, revenueEstimate: "42.1B", sector: "Finance" },
  { symbol: "BAC", name: "Bank of America", date: "2026-03-25", time: "BMO", epsEstimate: 0.82, revenueEstimate: "26.8B", sector: "Finance" },
  { symbol: "NFLX", name: "Netflix", date: "2026-03-25", time: "AMC", epsEstimate: 5.67, revenueEstimate: "10.5B", sector: "Consumer" },
  { symbol: "AMD", name: "AMD", date: "2026-03-26", time: "AMC", epsEstimate: 0.93, revenueEstimate: "7.5B", sector: "Technology" },
  { symbol: "JNJ", name: "Johnson & Johnson", date: "2026-03-26", time: "BMO", epsEstimate: 2.56, revenueEstimate: "22.3B", sector: "Healthcare" },
  { symbol: "V", name: "Visa", date: "2026-03-27", time: "AMC", epsEstimate: 2.68, revenueEstimate: "9.4B", sector: "Finance" },
  { symbol: "UNH", name: "UnitedHealth", date: "2026-03-27", time: "BMO", epsEstimate: 7.05, revenueEstimate: "100.2B", sector: "Healthcare" },
  { symbol: "XOM", name: "ExxonMobil", date: "2026-03-28", time: "BMO", epsEstimate: 2.12, revenueEstimate: "87.6B", sector: "Energy" },
  { symbol: "PFE", name: "Pfizer", date: "2026-03-28", time: "BMO", epsEstimate: 0.48, revenueEstimate: "14.8B", sector: "Healthcare" },
  { symbol: "GS", name: "Goldman Sachs", date: "2026-03-31", time: "BMO", epsEstimate: 11.32, revenueEstimate: "13.2B", sector: "Finance" },
  { symbol: "COP", name: "ConocoPhillips", date: "2026-03-31", time: "BMO", epsEstimate: 2.45, revenueEstimate: "15.1B", sector: "Energy" },
];

const TIME_LABELS: Record<string, { label: string; color: string }> = {
  BMO: { label: "Avant Ouverture", color: "text-amber-400 bg-amber-500/20" },
  AMC: { label: "Après Clôture", color: "text-violet-400 bg-violet-500/20" },
  DMH: { label: "En Session", color: "text-cyan-400 bg-cyan-500/20" },
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: "text-blue-400 bg-blue-500/20",
  Consumer: "text-emerald-400 bg-emerald-500/20",
  Finance: "text-amber-400 bg-amber-500/20",
  Healthcare: "text-rose-400 bg-rose-500/20",
  Energy: "text-orange-400 bg-orange-500/20",
};

export default function EarningsCalendarPage() {
  const { trades } = useTrades();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const weekLabel = `${weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${weekDays[4].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  const filtered = useMemo(() => {
    let data = EARNINGS_DATA;
    if (filterSector) data = data.filter((e) => e.sector === filterSector);
    return data;
  }, [filterSector]);

  // Check if user trades any of the earnings symbols
  const tradedSymbols = new Set(trades.map((t) => t.asset.toUpperCase()));
  const alertEarnings = filtered.filter((e) => tradedSymbols.has(e.symbol));

  const earningsByDate = useMemo(() => {
    const map: Record<string, EarningsEvent[]> = {};
    filtered.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filtered]);

  const sectors = [...new Set(EARNINGS_DATA.map((e) => e.sector))];

  const thisWeekEarnings = weekDays.flatMap((d) => {
    const dateStr = d.toISOString().split("T")[0];
    return earningsByDate[dateStr] || [];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Earnings Calendar</h1>
          <p className="text-sm text-[--text-secondary]">Résultats d&apos;entreprises à venir et impact sur vos trades</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "calendar" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            Calendrier
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "list" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            Liste
          </button>
        </div>
      </div>

      {/* Alerts for traded symbols */}
      {alertEarnings.length > 0 && (
        <div className="glass rounded-2xl p-5 border-2 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-400">Attention — Earnings sur vos instruments</h3>
          </div>
          <div className="space-y-2">
            {alertEarnings.map((e) => (
              <div key={e.symbol} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[--text-primary]">{e.symbol}</span>
                  <span className="text-sm text-[--text-secondary]">{e.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[--text-secondary]">{new Date(e.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${TIME_LABELS[e.time].color}`}>{TIME_LABELS[e.time].label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Cette Semaine</p>
          <p className="text-2xl font-bold text-cyan-400">{thisWeekEarnings.length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Avant Ouverture</p>
          <p className="text-2xl font-bold text-amber-400">{thisWeekEarnings.filter((e) => e.time === "BMO").length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Après Clôture</p>
          <p className="text-2xl font-bold text-violet-400">{thisWeekEarnings.filter((e) => e.time === "AMC").length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">Vos Instruments</p>
          <p className="text-2xl font-bold text-rose-400">{alertEarnings.length}</p>
        </div>
      </div>

      {/* Sector Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterSector(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${!filterSector ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
        >
          Tous
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => setFilterSector(filterSector === sector ? null : sector)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${filterSector === sector ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            {sector}
          </button>
        ))}
      </div>

      {view === "calendar" ? (
        <>
          {/* Week Navigation */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[--text-primary]">{weekLabel}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(0)} className="text-xs px-3 py-1.5 rounded-lg glass text-[--text-secondary] hover:text-[--text-primary]">Cette semaine</button>
                <button onClick={() => setWeekOffset((p) => p - 1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronLeft className="w-5 h-5 text-[--text-secondary]" /></button>
                <button onClick={() => setWeekOffset((p) => p + 1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronRight className="w-5 h-5 text-[--text-secondary]" /></button>
              </div>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-5 gap-3">
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split("T")[0];
                const dayEarnings = earningsByDate[dateStr] || [];
                const isToday = day.toDateString() === today.toDateString();

                return (
                  <div key={dateStr} className={`rounded-xl border p-4 min-h-[200px] ${isToday ? "ring-2 ring-cyan-400/50 border-cyan-500/30" : "border-[--border-subtle]"}`}>
                    <p className={`text-sm font-semibold mb-3 ${isToday ? "text-cyan-400" : "text-[--text-primary]"}`}>
                      {day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                    </p>
                    <div className="space-y-2">
                      {dayEarnings.map((e) => {
                        const isTraded = tradedSymbols.has(e.symbol);
                        return (
                          <div key={e.symbol} className={`p-2.5 rounded-lg text-xs ${isTraded ? "bg-amber-500/15 border border-amber-500/30" : "bg-[--bg-secondary]/50"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[--text-primary]">{e.symbol}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${TIME_LABELS[e.time].color}`}>
                                {e.time}
                              </span>
                            </div>
                            <p className="text-[--text-muted] mt-0.5">{e.name}</p>
                            {e.epsEstimate && (
                              <p className="text-[--text-secondary] mt-1">EPS: ${e.epsEstimate}</p>
                            )}
                          </div>
                        );
                      })}
                      {dayEarnings.length === 0 && (
                        <p className="text-xs text-[--text-muted] text-center py-4">Aucun</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border-subtle]">
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Entreprise</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Date</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Timing</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">EPS Est.</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Revenue Est.</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Secteur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
                const isTraded = tradedSymbols.has(e.symbol);
                const sectorStyle = SECTOR_COLORS[e.sector] || "text-gray-400 bg-gray-500/20";
                return (
                  <tr key={e.symbol + e.date} className={`border-b border-[--border-subtle] hover:bg-[--bg-hover] ${isTraded ? "bg-amber-500/5" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isTraded && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-bold text-sm text-[--text-primary]">{e.symbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[--text-secondary]">{e.name}</td>
                    <td className="p-4 text-sm text-[--text-primary]">
                      {new Date(e.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-lg ${TIME_LABELS[e.time].color}`}>{TIME_LABELS[e.time].label}</span>
                    </td>
                    <td className="p-4 text-right text-sm font-medium mono text-[--text-primary]">${e.epsEstimate}</td>
                    <td className="p-4 text-right text-sm mono text-[--text-secondary]">{e.revenueEstimate}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-lg ${sectorStyle}`}>{e.sector}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[--text-muted]">BMO = Avant l&apos;ouverture</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-[--text-muted]">AMC = Après la clôture</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[--text-muted]">= Vous tradez cet instrument</span>
          </div>
        </div>
      </div>
    </div>
  );
}
