"use client";

import { useState, useEffect } from "react";
import { fetchEconomicCalendar, type EconomicEvent } from "@/lib/market/calendar";
import { RefreshCw, Info } from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", EU: "\u{1F1EA}\u{1F1FA}", GB: "\u{1F1EC}\u{1F1E7}", JP: "\u{1F1EF}\u{1F1F5}",
  CA: "\u{1F1E8}\u{1F1E6}", AU: "\u{1F1E6}\u{1F1FA}", NZ: "\u{1F1F3}\u{1F1FF}", CH: "\u{1F1E8}\u{1F1ED}",
  CN: "\u{1F1E8}\u{1F1F3}", DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", IN: "\u{1F1EE}\u{1F1F3}",
  KR: "\u{1F1F0}\u{1F1F7}", BR: "\u{1F1E7}\u{1F1F7}", MX: "\u{1F1F2}\u{1F1FD}", ZA: "\u{1F1FF}\u{1F1E6}",
  SE: "\u{1F1F8}\u{1F1EA}", NO: "\u{1F1F3}\u{1F1F4}", TR: "\u{1F1F9}\u{1F1F7}", PL: "\u{1F1F5}\u{1F1F1}",
  CZ: "\u{1F1E8}\u{1F1FF}", HU: "\u{1F1ED}\u{1F1FA}", RU: "\u{1F1F7}\u{1F1FA}", SG: "\u{1F1F8}\u{1F1EC}",
};

const IMPACT_CONFIG = {
  high: { label: "Élevé", dot: "bg-rose-500", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  medium: { label: "Moyen", dot: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  low: { label: "Faible", dot: "bg-gray-500", text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
};

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function CalendarEcoPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEconomicCalendar();
      setEvents(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter((e) => {
    if (countryFilter !== "all" && e.country !== countryFilter) return false;
    if (impactFilter !== "all" && e.impact !== impactFilter) return false;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, EconomicEvent[]>>((acc, e) => {
    const key = e.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  const countries = [...new Set(events.map((e) => e.country))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendrier Économique</h1>
          <p className="text-sm text-gray-400 mt-1">Événements macro et publications à venir</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(["all", "high", "medium", "low"] as const).map((imp) => {
            const config = imp !== "all" ? IMPACT_CONFIG[imp] : null;
            const isActive = impactFilter === imp;
            return (
              <button key={imp} onClick={() => setImpactFilter(imp)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                  isActive
                    ? imp === "all"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                      : `${config!.bg} ${config!.text} border ${config!.border}`
                    : "text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
                }`}>
                {config && <span className={`w-2 h-2 rounded-full ${config.dot}`} />}
                {imp === "all" ? "Tous" : config!.label}
              </button>
            );
          })}
        </div>

        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
          className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none transition">
          <option value="all">Tous pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>{COUNTRY_FLAGS[c] || ""} {c}</option>
          ))}
        </select>

        <span className="text-xs text-gray-500 ml-auto">{filtered.length} événements</span>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-700/30 rounded" />
            ))}
          </div>
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-gray-500">Aucun événement avec ces filtres</div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="glass rounded-2xl overflow-hidden">
              {/* Day header */}
              <div className={`px-4 py-3 border-b border-gray-700/50 ${isToday(date) ? "bg-cyan-500/5" : ""}`}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {isToday(date) && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                  <span className={isToday(date) ? "text-cyan-400" : "text-gray-300"}>
                    {formatDayHeader(date)}
                  </span>
                  <span className="text-xs text-gray-500 font-normal ml-auto">{grouped[date].length} événements</span>
                </h3>
              </div>

              {/* Events table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800/50">
                      <th className="px-4 py-2 w-16">Heure</th>
                      <th className="px-4 py-2 w-16">Impact</th>
                      <th className="px-4 py-2 w-16">Pays</th>
                      <th className="px-4 py-2">Événement</th>
                      <th className="px-4 py-2 text-right w-20">Actuel</th>
                      <th className="px-4 py-2 text-right w-20">Prévision</th>
                      <th className="px-4 py-2 text-right w-20">Précédent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[date].map((e, i) => {
                      const config = IMPACT_CONFIG[e.impact];
                      const hasActual = e.actual !== "-" && e.actual !== "";
                      const hasForecast = e.estimate !== "-" && e.estimate !== "";
                      const actualVsForecast = hasActual && hasForecast
                        ? parseFloat(e.actual) > parseFloat(e.estimate) ? "better"
                          : parseFloat(e.actual) < parseFloat(e.estimate) ? "worse" : "inline"
                        : null;

                      return (
                        <tr key={i} className={`border-b border-gray-800/30 transition hover:bg-white/5 ${e.impact === "high" ? "bg-rose-500/[0.03]" : ""}`}>
                          <td className="px-4 py-2.5 mono text-xs text-gray-400">{e.time || "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((dot) => (
                                <span key={dot} className={`w-2 h-2 rounded-full ${
                                  (e.impact === "high" && dot <= 3) || (e.impact === "medium" && dot <= 2) || (e.impact === "low" && dot <= 1)
                                    ? config.dot : "bg-gray-700"
                                }`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{COUNTRY_FLAGS[e.country] || ""}</span>
                              <span className="text-xs font-medium text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded">{e.country}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-200 flex items-center gap-1.5">
                            {e.event}
                            <Info className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help flex-shrink-0" />
                          </td>
                          <td className={`px-4 py-2.5 text-right mono text-xs font-bold ${
                            actualVsForecast === "better" ? "text-emerald-400"
                              : actualVsForecast === "worse" ? "text-rose-400"
                              : hasActual ? "text-white" : "text-gray-600"
                          }`}>
                            {e.actual}
                          </td>
                          <td className="px-4 py-2.5 text-right mono text-xs text-gray-400">{e.estimate}</td>
                          <td className="px-4 py-2.5 text-right mono text-xs text-gray-500">{e.prev}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
