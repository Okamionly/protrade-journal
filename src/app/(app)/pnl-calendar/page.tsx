"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  BarChart3,
  Clock,
  X,
} from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function PnLCalendarPage() {
  const { trades } = useTrades();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Group trades by day
  const tradesByDay = useMemo(() => {
    const map: Record<string, typeof trades> = {};
    trades.forEach((t) => {
      const key = new Date(t.date).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [trades]);

  // PnL by day
  const pnlByDay = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(tradesByDay).forEach(([day, dayTrades]) => {
      map[day] = dayTrades.reduce((s, t) => s + t.result, 0);
    });
    return map;
  }, [tradesByDay]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    const days: (number | null)[] = [];

    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month]);

  // Month stats
  const monthStats = useMemo(() => {
    const monthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalPnl = monthTrades.reduce((s, t) => s + t.result, 0);
    const wins = monthTrades.filter((t) => t.result > 0).length;
    const losses = monthTrades.filter((t) => t.result < 0).length;
    const winRate = monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0;
    const tradingDays = new Set(monthTrades.map((t) => new Date(t.date).toISOString().split("T")[0])).size;
    const greenDays = Object.entries(pnlByDay).filter(([day, pnl]) => {
      const d = new Date(day);
      return d.getFullYear() === year && d.getMonth() === month && pnl > 0;
    }).length;
    const redDays = Object.entries(pnlByDay).filter(([day, pnl]) => {
      const d = new Date(day);
      return d.getFullYear() === year && d.getMonth() === month && pnl < 0;
    }).length;
    const bestDay = Object.entries(pnlByDay)
      .filter(([day]) => { const d = new Date(day); return d.getFullYear() === year && d.getMonth() === month; })
      .sort((a, b) => b[1] - a[1])[0];
    const worstDay = Object.entries(pnlByDay)
      .filter(([day]) => { const d = new Date(day); return d.getFullYear() === year && d.getMonth() === month; })
      .sort((a, b) => a[1] - b[1])[0];

    return { totalPnl, wins, losses, winRate, tradingDays, greenDays, redDays, bestDay, worstDay, totalTrades: monthTrades.length };
  }, [trades, year, month, pnlByDay]);

  // Day of week stats
  const dowStats = useMemo(() => {
    const stats: Record<number, { pnl: number; count: number }> = {};
    for (let i = 0; i < 7; i++) stats[i] = { pnl: 0, count: 0 };

    trades.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dow = (d.getDay() + 6) % 7;
        stats[dow].pnl += t.result;
        stats[dow].count++;
      }
    });
    return stats;
  }, [trades, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getDateKey = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const maxAbsPnl = useMemo(() => {
    const vals = Object.entries(pnlByDay)
      .filter(([day]) => { const d = new Date(day); return d.getFullYear() === year && d.getMonth() === month; })
      .map(([, v]) => Math.abs(v));
    return Math.max(...vals, 1);
  }, [pnlByDay, year, month]);

  const selectedDayTrades = selectedDay ? (tradesByDay[selectedDay] || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            <Calendar className="inline w-6 h-6 mr-2 text-cyan-400" />
            P&L Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Visualisez votre performance jour par jour
          </p>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition">
          Aujourd&apos;hui
        </button>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "P&L du Mois", value: `${monthStats.totalPnl >= 0 ? "+" : ""}${monthStats.totalPnl.toFixed(2)}€`, color: monthStats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400", icon: monthStats.totalPnl >= 0 ? TrendingUp : TrendingDown },
          { label: "Trades", value: monthStats.totalTrades, color: "text-cyan-400", icon: BarChart3 },
          { label: "Win Rate", value: `${monthStats.winRate.toFixed(1)}%`, color: monthStats.winRate >= 50 ? "text-emerald-400" : "text-red-400", icon: Target },
          { label: "Jours Verts", value: `${monthStats.greenDays} / ${monthStats.tradingDays}`, color: "text-emerald-400", icon: TrendingUp },
          { label: "Jours Rouges", value: `${monthStats.redDays} / ${monthStats.tradingDays}`, color: "text-red-400", icon: TrendingDown },
        ].map((s, i) => (
          <div key={i} className="metric-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
            </div>
            <p className={`text-lg font-bold mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <ChevronRight className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: "var(--text-muted)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;

            const key = getDateKey(day);
            const pnl = pnlByDay[key];
            const hasTrades = pnl !== undefined;
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            // Color intensity based on PnL magnitude
            let bg = "transparent";
            let textColor = "var(--text-muted)";
            if (hasTrades) {
              const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
              const alpha = 0.15 + intensity * 0.45;
              bg = pnl >= 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
              textColor = "var(--text-primary)";
            }

            return (
              <button
                key={key}
                onClick={() => hasTrades && setSelectedDay(key)}
                className={`calendar-day aspect-square rounded-lg flex flex-col items-center justify-center relative ${
                  isToday ? "ring-2 ring-cyan-400" : ""
                } ${hasTrades ? "cursor-pointer" : "cursor-default"}`}
                style={{ background: bg }}
              >
                <span className="text-xs font-medium" style={{ color: textColor }}>{day}</span>
                {hasTrades && (
                  <span className={`text-[10px] font-bold mono ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}€
                  </span>
                )}
                {hasTrades && (
                  <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>
                    {tradesByDay[key]?.length}t
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day of Week Performance */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          <Clock className="inline w-5 h-5 mr-2 text-cyan-400" />
          Performance par Jour
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => {
            const stat = dowStats[i];
            return (
              <div key={d} className="metric-card rounded-xl p-3 text-center">
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>{d}</p>
                <p className={`text-sm font-bold mono ${stat.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stat.pnl >= 0 ? "+" : ""}{stat.pnl.toFixed(0)}€
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stat.count} trades</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best / Worst Day */}
      {(monthStats.bestDay || monthStats.worstDay) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthStats.bestDay && (
            <div className="metric-card rounded-xl p-4 border-l-4 border-emerald-400">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Meilleur Jour</p>
              <p className="text-lg font-bold text-emerald-400 mono">+{monthStats.bestDay[1].toFixed(2)}€</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {new Date(monthStats.bestDay[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          )}
          {monthStats.worstDay && (
            <div className="metric-card rounded-xl p-4 border-l-4 border-red-400">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pire Jour</p>
              <p className="text-lg font-bold text-red-400 mono">{monthStats.worstDay[1].toFixed(2)}€</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {new Date(monthStats.worstDay[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {new Date(selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:bg-[var(--bg-hover)]">
                <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="metric-card rounded-lg p-3 flex-1 text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>P&L</p>
                <p className={`text-xl font-bold mono ${(pnlByDay[selectedDay] || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(pnlByDay[selectedDay] || 0) >= 0 ? "+" : ""}{(pnlByDay[selectedDay] || 0).toFixed(2)}€
                </p>
              </div>
              <div className="metric-card rounded-lg p-3 flex-1 text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Trades</p>
                <p className="text-xl font-bold text-cyan-400 mono">{selectedDayTrades.length}</p>
              </div>
              <div className="metric-card rounded-lg p-3 flex-1 text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Win Rate</p>
                <p className="text-xl font-bold text-cyan-400 mono">
                  {selectedDayTrades.length > 0 ? ((selectedDayTrades.filter((t) => t.result > 0).length / selectedDayTrades.length) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {selectedDayTrades.map((t) => (
                <div key={t.id} className="metric-card rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t.asset}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${t.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {t.direction}
                    </span>
                    {t.strategy && (
                      <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>{t.strategy}</span>
                    )}
                  </div>
                  <span className={`font-bold mono text-sm ${t.result >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.result >= 0 ? "+" : ""}{t.result.toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
