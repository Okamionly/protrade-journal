"use client";

import { useState, useEffect } from "react";
import { fetchEconomicCalendar, type EconomicEvent } from "@/lib/market/calendar";
import { RefreshCw } from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", EU: "\u{1F1EA}\u{1F1FA}", GB: "\u{1F1EC}\u{1F1E7}", JP: "\u{1F1EF}\u{1F1F5}",
  CA: "\u{1F1E8}\u{1F1E6}", AU: "\u{1F1E6}\u{1F1FA}", NZ: "\u{1F1F3}\u{1F1FF}", CH: "\u{1F1E8}\u{1F1ED}",
  CN: "\u{1F1E8}\u{1F1F3}", DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}",
};

const IMPACT_DOTS: Record<string, string> = {
  high: "\u25CF\u25CF\u25CF",
  medium: "\u25CF\u25CF\u25CB",
  low: "\u25CF\u25CB\u25CB",
};

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

  const countries = [...new Set(events.map((e) => e.country))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Calendrier \u00C9conomique</h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
          className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm">
          <option value="all">Tous pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>{COUNTRY_FLAGS[c] || ""} {c}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["all", "high", "medium", "low"] as const).map((imp) => (
            <button key={imp} onClick={() => setImpactFilter(imp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${impactFilter === imp
                ? imp === "high" ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                  : imp === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                  : imp === "low" ? "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "text-gray-400 hover:text-white border border-transparent"}`}>
              {imp === "all" ? "Tous" : imp === "high" ? "High" : imp === "medium" ? "Medium" : "Low"}
            </button>
          ))}
        </div>
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
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Pays</th>
                  <th className="px-4 py-3">Impact</th>
                  <th className="px-4 py-3">Événement</th>
                  <th className="px-4 py-3 text-right">Précédent</th>
                  <th className="px-4 py-3 text-right">Prévision</th>
                  <th className="px-4 py-3 text-right">Actuel</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i} className={`border-b border-gray-800 transition ${e.impact === "high" ? "bg-rose-500/5" : ""} hover:bg-white/5`}>
                    <td className="px-4 py-3 mono text-gray-400 text-xs">{e.date}</td>
                    <td className="px-4 py-3 mono text-gray-400 text-xs">{e.time || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{COUNTRY_FLAGS[e.country] || ""}</span>
                      <span className="text-xs text-gray-400 ml-1">{e.country}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${e.impact === "high" ? "text-rose-400" : e.impact === "medium" ? "text-amber-400" : "text-gray-500"}`}>
                        {IMPACT_DOTS[e.impact]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{e.event}</td>
                    <td className="px-4 py-3 text-right mono text-gray-400">{e.prev}</td>
                    <td className="px-4 py-3 text-right mono text-gray-400">{e.estimate}</td>
                    <td className="px-4 py-3 text-right mono font-bold">{e.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">Aucun événement avec ces filtres</div>
          )}
        </div>
      )}
    </div>
  );
}
