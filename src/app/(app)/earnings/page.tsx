"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTrades } from "@/hooks/useTrades";
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, BarChart3, Clock, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/context";

interface EarningsEvent {
  symbol: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  hour: string; // "bmo", "amc", "dmh"
}

interface EarningsResponse {
  earnings: EarningsEvent[];
  source: "live" | "fallback";
  lastUpdated: string;
}

function formatRevenue(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

export default function EarningsCalendarPage() {
  const { t } = useTranslation();
  const { trades } = useTrades();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [earningsData, setEarningsData] = useState<EarningsEvent[]>([]);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const TIME_LABELS: Record<string, { label: string; color: string }> = {
    bmo: { label: t("beforeOpen"), color: "text-amber-400 bg-amber-500/20" },
    amc: { label: t("afterClose"), color: "text-violet-400 bg-violet-500/20" },
    dmh: { label: t("duringSession"), color: "text-cyan-400 bg-cyan-500/20" },
  };

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/earnings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EarningsResponse = await res.json();
      setEarningsData(data.earnings);
      setDataSource(data.source);
      setLastUpdated(data.lastUpdated);
    } catch (e) {
      console.error("[Earnings] Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const weekLabel = `${weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${weekDays[4].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  // Check if user trades any of the earnings symbols
  const tradedSymbols = new Set(trades.map((tr) => tr.asset.toUpperCase()));

  const earningsByDate = useMemo(() => {
    const map: Record<string, EarningsEvent[]> = {};
    earningsData.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [earningsData]);

  const alertEarnings = useMemo(
    () => earningsData.filter((e) => tradedSymbols.has(e.symbol)),
    [earningsData, tradedSymbols]
  );

  const thisWeekEarnings = weekDays.flatMap((d) => {
    const dateStr = d.toISOString().split("T")[0];
    return earningsByDate[dateStr] || [];
  });

  if (loading && earningsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-[--text-secondary]">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[--text-primary]">{t("earningsCalendar")}</h1>
            {dataSource === "live" ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Fallback
              </span>
            )}
          </div>
          <p className="text-sm text-[--text-secondary]">{t("earningsDesc")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEarnings}
            disabled={loading}
            className="p-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] disabled:opacity-50"
            title={t("refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "calendar" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            {t("calendar")}
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === "list" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary]"}`}
          >
            {t("list")}
          </button>
        </div>
      </div>

      {/* Alerts for traded symbols */}
      {alertEarnings.length > 0 && (
        <div className="glass rounded-2xl p-5 border-2 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-400">{t("attentionEarnings")}</h3>
          </div>
          <div className="space-y-2">
            {alertEarnings.map((e, idx) => (
              <div key={`alert-${e.symbol}-${e.date}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[--text-primary]">{e.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[--text-secondary]">{new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                  {TIME_LABELS[e.hour] && (
                    <span className={`text-xs px-2 py-1 rounded-lg ${TIME_LABELS[e.hour].color}`}>{TIME_LABELS[e.hour].label}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">{t("thisWeek")}</p>
          <p className="text-2xl font-bold text-cyan-400">{thisWeekEarnings.length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">{t("beforeOpen")}</p>
          <p className="text-2xl font-bold text-amber-400">{thisWeekEarnings.filter((e) => e.hour === "bmo").length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">{t("afterClose")}</p>
          <p className="text-2xl font-bold text-violet-400">{thisWeekEarnings.filter((e) => e.hour === "amc").length}</p>
        </div>
        <div className="metric-card rounded-xl p-4 text-center">
          <p className="text-xs text-[--text-muted]">{t("yourInstruments")}</p>
          <p className="text-2xl font-bold text-rose-400">{alertEarnings.length}</p>
        </div>
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
                <button onClick={() => setWeekOffset(0)} className="text-xs px-3 py-1.5 rounded-lg glass text-[--text-secondary] hover:text-[--text-primary]">{t("thisWeek")}</button>
                <button onClick={() => setWeekOffset((p) => p - 1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronLeft className="w-5 h-5 text-[--text-secondary]" /></button>
                <button onClick={() => setWeekOffset((p) => p + 1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronRight className="w-5 h-5 text-[--text-secondary]" /></button>
              </div>
            </div>

            {/* Week Grid — Clean vertical layout */}
            <div className="space-y-3">
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split("T")[0];
                const dayEarnings = earningsByDate[dateStr] || [];
                const isToday = day.toDateString() === today.toDateString();

                return (
                  <div key={dateStr} className={`rounded-xl p-4 transition-colors ${isToday ? "bg-cyan-500/8 border border-cyan-500/25" : "bg-[--bg-secondary]/30 border border-[--border-subtle]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-semibold ${isToday ? "text-cyan-400" : "text-[--text-primary]"}`}>
                        {day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                        {isToday && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{t("today")}</span>}
                      </p>
                      <span className="text-[11px] text-[--text-muted]">{dayEarnings.length} {dayEarnings.length !== 1 ? t("results") : t("result")}</span>
                    </div>
                    {dayEarnings.length === 0 ? (
                      <p className="text-xs text-[--text-muted] py-1 italic">{t("noEarningsThisDay")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {dayEarnings.map((e, idx) => {
                          const isTraded = tradedSymbols.has(e.symbol);
                          return (
                            <div key={`${e.symbol}-${e.hour}-${idx}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isTraded ? "bg-amber-500/15 border border-amber-500/30" : "bg-[--bg-card]/60 border border-[--border-subtle]"}`}>
                              <span className="font-bold text-[--text-primary]">{e.symbol}</span>
                              {TIME_LABELS[e.hour] && (
                                <span className={`px-1 py-0.5 rounded text-[9px] ${TIME_LABELS[e.hour].color}`}>
                                  {e.hour.toUpperCase()}
                                </span>
                              )}
                              {e.epsEstimate != null && (
                                <span className="text-[--text-muted] text-[10px]">${e.epsEstimate}</span>
                              )}
                              {e.epsActual != null && (
                                <span className={`text-[10px] font-semibold ${e.epsActual >= (e.epsEstimate ?? 0) ? "text-emerald-400" : "text-rose-400"}`}>
                                  → ${e.epsActual}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">{t("symbol")}</th>
                <th className="text-left text-xs font-semibold text-[--text-muted] p-4">{t("date")}</th>
                <th className="text-center text-xs font-semibold text-[--text-muted] p-4">{t("timing")}</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">EPS Est.</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">EPS Actual</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Revenue Est.</th>
                <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Revenue Actual</th>
              </tr>
            </thead>
            <tbody>
              {earningsData.sort((a, b) => a.date.localeCompare(b.date)).map((e, idx) => {
                const isTraded = tradedSymbols.has(e.symbol);
                const timeInfo = TIME_LABELS[e.hour];
                const epsBeat = e.epsActual != null && e.epsEstimate != null ? e.epsActual >= e.epsEstimate : null;
                return (
                  <tr key={`${e.symbol}-${e.date}-${idx}`} className={`border-b border-[--border-subtle] hover:bg-[--bg-hover] ${isTraded ? "bg-amber-500/5" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isTraded && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-bold text-sm text-[--text-primary]">{e.symbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[--text-primary]">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className="p-4 text-center">
                      {timeInfo && (
                        <span className={`text-xs px-2 py-1 rounded-lg ${timeInfo.color}`}>{timeInfo.label}</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-sm font-medium mono text-[--text-primary]">
                      {e.epsEstimate != null ? `$${e.epsEstimate}` : "—"}
                    </td>
                    <td className={`p-4 text-right text-sm font-medium mono ${epsBeat === true ? "text-emerald-400" : epsBeat === false ? "text-rose-400" : "text-[--text-muted]"}`}>
                      {e.epsActual != null ? `$${e.epsActual}` : "—"}
                    </td>
                    <td className="p-4 text-right text-sm mono text-[--text-secondary]">
                      {formatRevenue(e.revenueEstimate)}
                    </td>
                    <td className="p-4 text-right text-sm mono text-[--text-secondary]">
                      {formatRevenue(e.revenueActual)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend + Attribution */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[--text-muted]">BMO = {t("bmoLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-[--text-muted]">AMC = {t("amcLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[--text-muted]">= {t("youTradeThis")}</span>
          </div>
        </div>
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-[--border-subtle]">
          <span className="text-[10px] text-[--text-muted] tracking-wide">
            Powered by <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2">Finnhub</a>
            {lastUpdated && (
              <> &middot; {t("updatedAt")} {new Date(lastUpdated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
