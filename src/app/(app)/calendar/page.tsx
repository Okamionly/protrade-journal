"use client";

import { useTrades } from "@/hooks/useTrades";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Flame, Calendar, BarChart3, Clock, Target, ArrowRight, ArrowUpRight, ArrowDownRight, Zap, Award, Camera } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";

interface HoverInfo {
  day: number;
  rect: DOMRect;
}

export default function PnLCalendarPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();
  const router = useRouter();
  const calendarRef = useRef<HTMLDivElement>(null);

  const MONTH_NAMES = [t("monthJan"), t("monthFeb"), t("monthMar"), t("monthApr"), t("monthMay"), t("monthJun"), t("monthJul"), t("monthAug"), t("monthSep"), t("monthOct"), t("monthNov"), t("monthDec")];
  const DAY_NAMES = [t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun")];
  const DAY_FULL = [t("dayMonFull"), t("dayTueFull"), t("dayWedFull"), t("dayThuFull"), t("dayFriFull"), t("daySatFull"), t("daySunFull")];
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; trades: typeof trades } | null>(null);
  const [view, setView] = useState<"month" | "year">("month");
  const [hoveredDay, setHoveredDay] = useState<HoverInfo | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { setCurrentDate(new Date()); }, []);

  const year = currentDate?.getFullYear() ?? new Date().getFullYear();
  const month = currentDate?.getMonth() ?? new Date().getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Group trades by day for current month (memoized)
  const monthTrades = useMemo(() => trades.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [trades, year, month]);

  // Previous month trades for comparison
  const prevMonthTrades = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return trades.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === py && d.getMonth() === pm;
    });
  }, [trades, year, month]);

  const tradesByDay = useMemo(() => {
    const byDay: Record<number, typeof trades> = {};
    monthTrades.forEach((t) => {
      const day = new Date(t.date).getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(t);
    });
    return byDay;
  }, [monthTrades]);

  // Monthly stats
  const stats = useMemo(() => {
    const totalPnl = monthTrades.reduce((s, t) => s + t.result, 0);
    const prevPnl = prevMonthTrades.reduce((s, t) => s + t.result, 0);
    const dayPnls: Record<number, number> = {};
    monthTrades.forEach((t) => {
      const day = new Date(t.date).getDate();
      dayPnls[day] = (dayPnls[day] || 0) + t.result;
    });
    const dayEntries = Object.entries(dayPnls);
    const winDays = dayEntries.filter(([, v]) => v > 0).length;
    const lossDays = dayEntries.filter(([, v]) => v < 0).length;
    const bestDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => (+a[1] > +b[1] ? a : b)) : null;
    const worstDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => (+a[1] < +b[1] ? a : b)) : null;
    const maxAbs = dayEntries.length > 0 ? Math.max(...dayEntries.map(([, v]) => Math.abs(+v)), 1) : 1;

    // Streak calculation
    let currentStreak = 0;
    let maxStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    const sortedDays = [...dayEntries].sort((a, b) => +a[0] - +b[0]);
    for (const [, pnl] of sortedDays) {
      if (+pnl > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); currentLossStreak = 0; }
      else { currentLossStreak++; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); currentStreak = 0; }
    }

    // Day of week breakdown
    const dowPnl: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCount: number[] = [0, 0, 0, 0, 0, 0, 0];
    monthTrades.forEach((t) => {
      const d = new Date(t.date);
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      dowPnl[dow] += t.result;
      dowCount[dow]++;
    });

    // Hour breakdown
    const hourPnl: Record<number, number> = {};
    const hourCount: Record<number, number> = {};
    monthTrades.forEach((t) => {
      const h = new Date(t.date).getHours();
      hourPnl[h] = (hourPnl[h] || 0) + t.result;
      hourCount[h] = (hourCount[h] || 0) + 1;
    });

    // Win rate
    const wins = monthTrades.filter(t => t.result > 0).length;
    const winRate = monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0;

    // Avg win / avg loss
    const winTrades = monthTrades.filter(t => t.result > 0);
    const lossTrades = monthTrades.filter(t => t.result <= 0);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.result, 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.result, 0) / lossTrades.length : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : avgWin > 0 ? Infinity : 0;

    // Cumulative P&L by day
    const cumulativePnl: { day: number; pnl: number; cumulative: number }[] = [];
    let runningTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayP = dayPnls[d] || 0;
      if (dayPnls[d] !== undefined) {
        runningTotal += dayP;
        cumulativePnl.push({ day: d, pnl: dayP, cumulative: runningTotal });
      }
    }

    // Weekly breakdown
    const weeks: { weekNum: number; pnl: number; trades: number; wins: number }[] = [];
    let weekStart = 1;
    while (weekStart <= daysInMonth) {
      const weekStartDate = new Date(year, month, weekStart);
      const dayOfWeek = weekStartDate.getDay() === 0 ? 7 : weekStartDate.getDay();
      const weekEnd = Math.min(weekStart + (7 - dayOfWeek), daysInMonth);
      let weekPnl = 0;
      let weekTradesCount = 0;
      let weekWins = 0;
      for (let d = weekStart; d <= weekEnd; d++) {
        const dt = tradesByDay[d] || [];
        weekPnl += dt.reduce((s, t) => s + t.result, 0);
        weekTradesCount += dt.length;
        weekWins += dt.filter(t => t.result > 0).length;
      }
      weeks.push({ weekNum: weeks.length + 1, pnl: weekPnl, trades: weekTradesCount, wins: weekWins });
      weekStart = weekEnd + 1;
    }

    return {
      totalPnl, prevPnl, winDays, lossDays, bestDay, worstDay, maxAbs,
      maxStreak, maxLossStreak, dowPnl, dowCount, hourPnl, hourCount,
      tradingDays: dayEntries.length, winRate, avgWin, avgLoss, profitFactor,
      cumulativePnl, weeks,
    };
  }, [monthTrades, prevMonthTrades, daysInMonth, year, month, tradesByDay]);

  // Year view data — enhanced with daily breakdown for heatmap
  const yearData = useMemo(() => {
    if (view !== "year") return [];
    return Array.from({ length: 12 }, (_, m) => {
      const mt = trades.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const pnl = mt.reduce((s, t) => s + t.result, 0);
      const wins = mt.filter(t => t.result > 0).length;

      // Build daily PnL map for heatmap
      const dailyPnl: Record<number, number> = {};
      mt.forEach((t) => {
        const day = new Date(t.date).getDate();
        dailyPnl[day] = (dailyPnl[day] || 0) + t.result;
      });

      return { month: m, pnl, count: mt.length, winRate: mt.length > 0 ? (wins / mt.length) * 100 : 0, dailyPnl };
    });
  }, [trades, year, view]);

  // Compute max daily PnL across the year for consistent heatmap coloring
  const yearMaxDailyPnl = useMemo(() => {
    if (view !== "year" || yearData.length === 0) return 1;
    let maxAbs = 1;
    yearData.forEach((md) => {
      Object.values(md.dailyPnl).forEach((v) => {
        if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
      });
    });
    return maxAbs;
  }, [yearData, view]);

  const changeMonth = (delta: number) => setCurrentDate(new Date(year, month + delta, 1));
  const changeYear = (delta: number) => setCurrentDate(new Date(year + delta, month, 1));

  const getPnlIntensity = (pnl: number) => {
    const ratio = Math.min(Math.abs(pnl) / stats.maxAbs, 1);
    const opacity = 0.1 + ratio * 0.5;
    return pnl >= 0
      ? `rgba(16, 185, 129, ${opacity})`
      : `rgba(239, 68, 68, ${opacity})`;
  };

  // Comparison vs previous month
  const pnlDelta = stats.totalPnl - stats.prevPnl;

  // Build calendar rows with week summaries
  const calendarRows = useMemo(() => {
    const rows: { days: (number | null)[]; weekPnl: number; weekTrades: number }[] = [];
    let currentRow: (number | null)[] = [];

    // Fill offset
    for (let i = 0; i < startOffset; i++) {
      currentRow.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentRow.push(day);
      if (currentRow.length === 7) {
        // Calculate week stats
        let wPnl = 0;
        let wTrades = 0;
        currentRow.forEach((d) => {
          if (d !== null) {
            const dt = tradesByDay[d] || [];
            wPnl += dt.reduce((s, t) => s + t.result, 0);
            wTrades += dt.length;
          }
        });
        rows.push({ days: currentRow, weekPnl: wPnl, weekTrades: wTrades });
        currentRow = [];
      }
    }

    // Fill remainder
    if (currentRow.length > 0) {
      let wPnl = 0;
      let wTrades = 0;
      currentRow.forEach((d) => {
        if (d !== null) {
          const dt = tradesByDay[d] || [];
          wPnl += dt.reduce((s, t) => s + t.result, 0);
          wTrades += dt.length;
        }
      });
      while (currentRow.length < 7) currentRow.push(null);
      rows.push({ days: currentRow, weekPnl: wPnl, weekTrades: wTrades });
    }

    return rows;
  }, [startOffset, daysInMonth, tradesByDay]);

  // Hover popover data
  const hoverData = useMemo(() => {
    if (!hoveredDay) return null;
    const dayTrades = tradesByDay[hoveredDay.day] || [];
    if (dayTrades.length === 0) return null;

    const totalPnl = dayTrades.reduce((s, t) => s + t.result, 0);
    const wins = dayTrades.filter(t => t.result > 0).length;
    const winRate = (wins / dayTrades.length) * 100;
    const sorted = [...dayTrades].sort((a, b) => b.result - a.result);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return { count: dayTrades.length, totalPnl, winRate, best, worst };
  }, [hoveredDay, tradesByDay]);

  // Capture calendar as PNG
  const handleCapture = useCallback(async () => {
    if (!calendarRef.current || capturing) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: "#0f1117",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `pnl-calendar-${MONTH_NAMES[month]}-${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // silently fail
    } finally {
      setCapturing(false);
    }
  }, [capturing, month, year, MONTH_NAMES]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[--text-secondary]">{t("loading")}</div></div>;
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <TrendingUp className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>P&L Calendar</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("emptyStateMessage")}</p>
        <Link href="/journal" className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--accent-primary), #6366f1)" }}>
          {t("emptyStateCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={calendarRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">P&L Calendar</h1>
          <p className="text-sm text-[--text-secondary]">{t("visualizePerf")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium glass text-[--text-secondary] hover:text-[--text-primary] transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {capturing ? t("calCapturing") : t("calCapture")}
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "month" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"}`}
          >
            {t("viewMonth")}
          </button>
          <button
            onClick={() => setView("year")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "year" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"}`}
          >
            {t("viewYear")}
          </button>
        </div>
      </div>

      {/* Monthly Stats Cards — Enhanced */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden col-span-2 sm:col-span-1">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">{t("pnlMonth")}</p>
          <p className={`text-lg font-bold mono truncate ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toFixed(0)}€
          </p>
          {stats.prevPnl !== 0 && (
            <p className={`text-[9px] font-medium flex items-center justify-center gap-0.5 ${pnlDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {pnlDelta >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              vs M-1
            </p>
          )}
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">Trades</p>
          <p className="text-lg font-bold text-cyan-400">{monthTrades.length}</p>
          <p className="text-[9px] text-[--text-muted]">
            <span className="text-emerald-400">{monthTrades.filter(t => t.result > 0).length}W</span>
            {" / "}
            <span className="text-rose-400">{monthTrades.filter(t => t.result <= 0).length}L</span>
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">Win Rate</p>
          <p className={`text-lg font-bold mono ${stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.winRate.toFixed(0)}%
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">Profit Factor</p>
          <p className={`text-lg font-bold mono ${stats.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">{t("bestDay")}</p>
          <p className="text-xs sm:text-base font-bold text-emerald-400 mono truncate">
            {stats.bestDay ? `+${(+stats.bestDay[1]).toFixed(0)}€` : "—"}
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">{t("worstDay")}</p>
          <p className="text-xs sm:text-base font-bold text-rose-400 mono truncate">
            {stats.worstDay ? `${(+stats.worstDay[1]).toFixed(0)}€` : "—"}
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">{t("streakW")}</p>
          <p className="text-xs sm:text-base font-bold text-amber-400 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4" /> {stats.maxStreak}
          </p>
        </div>
        <div className="metric-card rounded-xl p-3 text-center overflow-hidden">
          <p className="text-[10px] text-[--text-muted] mb-1 truncate">Avg W/L</p>
          <p className="text-[11px] font-bold mono truncate">
            <span className="text-emerald-400">{stats.avgWin.toFixed(0)}€</span>
            <span className="text-[--text-muted] mx-0.5">/</span>
            <span className="text-rose-400">{stats.avgLoss.toFixed(0)}€</span>
          </p>
        </div>
      </div>

      {view === "month" ? (
        <>
          {/* Cumulative P&L Mini Chart */}
          {stats.cumulativePnl.length > 1 && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[--text-primary]">Equity Curve du mois</h3>
              </div>
              <div className="relative h-32">
                <svg viewBox={`0 0 ${stats.cumulativePnl.length * 40} 120`} className="w-full h-full" preserveAspectRatio="none">
                  {(() => {
                    const vals = stats.cumulativePnl.map(p => p.cumulative);
                    const maxVal = Math.max(...vals.map(Math.abs), 1);
                    const zeroY = 60;
                    const points = stats.cumulativePnl.map((p, i) => {
                      const x = i * 40 + 20;
                      const y = zeroY - (p.cumulative / maxVal) * 50;
                      return `${x},${y}`;
                    }).join(" ");
                    const fillPoints = `${20},${zeroY} ${points} ${(stats.cumulativePnl.length - 1) * 40 + 20},${zeroY}`;
                    const finalPnl = stats.cumulativePnl[stats.cumulativePnl.length - 1].cumulative;
                    const color = finalPnl >= 0 ? "#10b981" : "#ef4444";

                    return (
                      <>
                        <line x1="0" y1={zeroY} x2={stats.cumulativePnl.length * 40} y2={zeroY} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
                        <polygon points={fillPoints} fill={color} opacity="0.1" />
                        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {stats.cumulativePnl.map((p, i) => {
                          const x = i * 40 + 20;
                          const y = zeroY - (p.cumulative / maxVal) * 50;
                          return (
                            <circle key={i} cx={x} cy={y} r="3" fill={p.cumulative >= 0 ? "#10b981" : "#ef4444"} stroke="var(--bg-card-solid)" strokeWidth="1.5" />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                {/* Day labels */}
                <div className="flex justify-between mt-1">
                  {stats.cumulativePnl.map((p) => (
                    <span key={p.day} className="text-[8px] mono text-[--text-muted]" style={{ width: 40, textAlign: "center" }}>
                      {p.day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Weekly Breakdown */}
          {stats.weeks.length > 0 && stats.weeks.some(w => w.trades > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {stats.weeks.map((w) => {
                const wr = w.trades > 0 ? (w.wins / w.trades) * 100 : 0;
                return (
                  <div key={w.weekNum} className="metric-card rounded-xl p-3">
                    <p className="text-[10px] text-[--text-muted] mb-1">Semaine {w.weekNum}</p>
                    <p className={`text-lg font-bold mono ${w.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {w.pnl >= 0 ? "+" : ""}{w.pnl.toFixed(0)}€
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-[--text-muted]">{w.trades} trades</span>
                      {w.trades > 0 && (
                        <span className={`text-[9px] font-medium ${wr >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                          {wr.toFixed(0)}% WR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Calendar Grid with Week Summary */}
          <div className="glass rounded-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[--text-primary]">
                  {MONTH_NAMES[month]} {year}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(new Date())} className="text-xs px-3 py-1.5 rounded-lg glass text-[--text-secondary] hover:text-[--text-primary]">{t("todayBtn")}</button>
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronLeft className="w-5 h-5 text-[--text-secondary]" /></button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronRight className="w-5 h-5 text-[--text-secondary]" /></button>
              </div>
            </div>

            {/* Day headers + week summary header */}
            <div className="grid gap-2 text-center mb-3" style={{ gridTemplateColumns: "repeat(7, 1fr) 80px" }}>
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-xs font-semibold text-[--text-muted] py-2">{d}</div>
              ))}
              <div className="text-xs font-semibold text-[--text-muted] py-2">{t("calWeekShort")}</div>
            </div>

            {/* Calendar rows with week summary */}
            {calendarRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid gap-2 mb-2" style={{ gridTemplateColumns: "repeat(7, 1fr) 80px" }}>
                {row.days.map((day, colIdx) => {
                  if (day === null) {
                    return <div key={`empty-${rowIdx}-${colIdx}`} className="aspect-square" />;
                  }
                  const dayTrades = tradesByDay[day] || [];
                  const hasTrade = dayTrades.length > 0;
                  const dayPnl = dayTrades.reduce((s, t) => s + t.result, 0);
                  const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                  const wins = dayTrades.filter(t => t.result > 0).length;
                  const losses = dayTrades.length - wins;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay({ day, trades: dayTrades })}
                      onMouseEnter={(e) => {
                        if (hasTrade) {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setHoveredDay({ day, rect });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`calendar-day aspect-square rounded-xl border p-1.5 sm:p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 ${
                        isToday ? "ring-2 ring-cyan-400/50" : ""
                      } ${hasTrade ? "border-transparent" : "border-[--border-subtle] bg-[--bg-secondary]/20"}`}
                      style={hasTrade ? { background: getPnlIntensity(dayPnl), borderColor: dayPnl >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)" } : undefined}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-xs sm:text-sm font-medium ${isToday ? "text-cyan-400" : hasTrade ? (dayPnl >= 0 ? "text-emerald-300" : "text-rose-300") : "text-[--text-muted]"}`}>
                          {day}
                        </span>
                        {hasTrade && (
                          <span className="text-[8px] mono" style={{ color: "var(--text-muted)" }}>
                            {dayTrades.length}t
                          </span>
                        )}
                      </div>
                      {hasTrade && (
                        <div className="text-right">
                          <p className={`text-[10px] sm:text-xs font-bold mono ${dayPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {dayPnl >= 0 ? "+" : ""}{dayPnl.toFixed(0)}€
                          </p>
                          <p className="text-[8px] sm:text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                            <span className="text-emerald-400">{wins}W</span>
                            <span className="mx-0.5">/</span>
                            <span className="text-rose-400">{losses}L</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Week Summary Cell */}
                <div
                  className={`rounded-xl border p-1.5 flex flex-col items-center justify-center text-center ${
                    row.weekTrades > 0
                      ? row.weekPnl >= 0
                        ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                        : "border-rose-500/20 bg-rose-500/[0.07]"
                      : "border-[--border-subtle] bg-[--bg-secondary]/10"
                  }`}
                >
                  {row.weekTrades > 0 ? (
                    <>
                      <p className={`text-xs font-bold mono ${row.weekPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.weekPnl >= 0 ? "+" : ""}{row.weekPnl.toFixed(0)}€
                      </p>
                      <p className="text-[8px] text-[--text-muted]">{row.weekTrades}t</p>
                    </>
                  ) : (
                    <p className="text-[9px] text-[--text-muted]">—</p>
                  )}
                </div>
              </div>
            ))}

            {/* Hover Popover */}
            {hoveredDay && hoverData && (() => {
              const { rect } = hoveredDay;
              const popoverWidth = 240;
              const popoverHeight = 160;
              const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
              const showAbove = rect.bottom + popoverHeight + 10 > viewportHeight;
              const top = showAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;
              const left = Math.max(8, Math.min(rect.left + rect.width / 2 - popoverWidth / 2, (typeof window !== "undefined" ? window.innerWidth : 1200) - popoverWidth - 8));

              return (
                <div
                  className="fixed z-[60] rounded-xl border border-[--border-subtle] p-3 shadow-xl"
                  style={{
                    top,
                    left,
                    width: popoverWidth,
                    background: "var(--bg-card-solid, #1a1b23)",
                    pointerEvents: "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[--text-primary]">
                      {hoveredDay.day} {MONTH_NAMES[month]}
                    </span>
                    <span className="text-[10px] text-[--text-muted]">{hoverData.count} {t("calHoverTrades")}</span>
                  </div>
                  <div className={`text-lg font-bold mono mb-2 ${hoverData.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {hoverData.totalPnl >= 0 ? "+" : ""}{hoverData.totalPnl.toFixed(2)}€
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[--text-muted]">{t("calHoverWinRate")}</span>
                      <span className={`font-medium mono ${hoverData.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                        {hoverData.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400/70">{t("calHoverBest")}</span>
                      <span className="text-emerald-400 mono font-medium">
                        {hoverData.best.asset} +{hoverData.best.result.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400/70">{t("calHoverWorst")}</span>
                      <span className="text-rose-400 mono font-medium">
                        {hoverData.worst.asset} {hoverData.worst.result.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[--border-subtle]">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500/40" />
                <span className="text-xs text-[--text-muted]">{t("winningDay")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-500/30 border border-rose-500/40" />
                <span className="text-xs text-[--text-muted]">{t("losingDay")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded ring-2 ring-cyan-400/50 bg-[--bg-secondary]/20" />
                <span className="text-xs text-[--text-muted]">{t("todayBtn")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[--text-muted]">
                {`Intensité = amplitude du P&L`}
              </div>
            </div>
          </div>

          {/* Day of Week + Hour Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[--text-primary]">{t("perfByDay")}</h3>
              </div>
              <div className="space-y-3">
                {DAY_FULL.map((dayName, idx) => {
                  const pnl = stats.dowPnl[idx];
                  const count = stats.dowCount[idx];
                  const maxDow = Math.max(...stats.dowPnl.map(Math.abs), 1);
                  const width = Math.abs(pnl) / maxDow * 100;
                  return (
                    <div key={dayName} className="flex items-center gap-3">
                      <span className="text-sm text-[--text-secondary] w-20 shrink-0">{dayName}</span>
                      <div className="flex-1 h-7 bg-[--bg-secondary]/50 rounded-lg overflow-hidden relative">
                        {count > 0 && (
                          <div
                            className={`h-full rounded-lg ${pnl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"}`}
                            style={{ width: `${Math.max(width, 5)}%` }}
                          />
                        )}
                        <span className={`absolute inset-0 flex items-center px-3 text-xs font-medium mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {count > 0 ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}€ (${count} trades)` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hour Performance */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[--text-primary]">{t("perfByHour")}</h3>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {Object.entries(stats.hourPnl)
                  .sort(([a], [b]) => +a - +b)
                  .map(([hour, pnl]) => {
                    const count = stats.hourCount[+hour] || 0;
                    const maxH = Math.max(...Object.values(stats.hourPnl).map(Math.abs), 1);
                    const width = Math.abs(pnl) / maxH * 100;
                    return (
                      <div key={hour} className="flex items-center gap-3">
                        <span className="text-sm text-[--text-secondary] w-12 shrink-0">{hour}:00</span>
                        <div className="flex-1 h-6 bg-[--bg-secondary]/50 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full rounded-lg ${pnl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"}`}
                            style={{ width: `${Math.max(width, 5)}%` }}
                          />
                          <span className={`absolute inset-0 flex items-center px-3 text-[11px] font-medium mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}€ ({count})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(stats.hourPnl).length === 0 && (
                  <p className="text-sm text-[--text-muted] text-center py-4">{t("noHourData")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Best / Worst Day Cards */}
          {(stats.bestDay || stats.worstDay) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.bestDay && (
                <div className="metric-card rounded-xl p-4 border-l-4 border-emerald-400">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-[--text-muted]">{t("bestDayOfMonth")}</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-400 mono">+{(+stats.bestDay[1]).toFixed(2)}€</p>
                  <p className="text-xs text-[--text-secondary]">
                    {new Date(year, month, +stats.bestDay[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
              )}
              {stats.worstDay && (
                <div className="metric-card rounded-xl p-4 border-l-4 border-rose-400">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-rose-400" />
                    <p className="text-xs text-[--text-muted]">{t("worstDayOfMonth")}</p>
                  </div>
                  <p className="text-lg font-bold text-rose-400 mono">{(+stats.worstDay[1]).toFixed(2)}€</p>
                  <p className="text-xs text-[--text-secondary]">
                    {new Date(year, month, +stats.worstDay[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Year View — Enhanced with Daily Heatmap */
        <div className="glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-[--text-primary]">{t("calYearHeatmapTitle")} {year}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeYear(-1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronLeft className="w-5 h-5 text-[--text-secondary]" /></button>
              <button onClick={() => changeYear(1)} className="p-2 hover:bg-[--bg-secondary] rounded-lg"><ChevronRight className="w-5 h-5 text-[--text-secondary]" /></button>
            </div>
          </div>

          {/* 4x3 Mini Month Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {yearData.map(({ month: m, pnl, count, winRate, dailyPnl }) => {
              const dim = new Date(year, m + 1, 0).getDate();
              const fd = new Date(year, m, 1).getDay();
              const so = fd === 0 ? 6 : fd - 1;

              return (
                <div
                  key={m}
                  className="rounded-xl border border-[--border-subtle] p-3 cursor-pointer hover:border-cyan-500/30 transition-all"
                  onClick={() => { setCurrentDate(new Date(year, m, 1)); setView("month"); }}
                >
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[--text-primary]">{MONTH_NAMES[m]}</span>
                    <span className={`text-xs font-bold mono ${count > 0 ? (pnl >= 0 ? "text-emerald-400" : "text-rose-400") : "text-[--text-muted]"}`}>
                      {count > 0 ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}€` : "—"}
                    </span>
                  </div>

                  {/* Day name headers */}
                  <div className="grid grid-cols-7 gap-[2px] mb-1">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                      <div key={`${m}-hdr-${i}`} className="text-center text-[7px] text-[--text-muted] leading-none">{d}</div>
                    ))}
                  </div>

                  {/* Day squares heatmap */}
                  <div className="grid grid-cols-7 gap-[2px]">
                    {Array.from({ length: so }).map((_, i) => (
                      <div key={`${m}-pad-${i}`} className="aspect-square rounded-[2px]" />
                    ))}
                    {Array.from({ length: dim }).map((_, i) => {
                      const day = i + 1;
                      const dp = dailyPnl[day];
                      let bg = "var(--bg-secondary)";
                      if (dp !== undefined) {
                        const ratio = Math.min(Math.abs(dp) / yearMaxDailyPnl, 1);
                        const opacity = 0.2 + ratio * 0.6;
                        bg = dp >= 0
                          ? `rgba(16, 185, 129, ${opacity})`
                          : `rgba(239, 68, 68, ${opacity})`;
                      }
                      return (
                        <div
                          key={`${m}-d-${day}`}
                          className="aspect-square rounded-[2px]"
                          style={{ background: bg }}
                          title={dp !== undefined ? `${day} ${MONTH_NAMES[m]}: ${dp >= 0 ? "+" : ""}${dp.toFixed(0)}€` : undefined}
                        />
                      );
                    })}
                  </div>

                  {/* Mini footer stats */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-[--border-subtle]">
                    <span className="text-[9px] text-[--text-muted]">{count} trade{count !== 1 ? "s" : ""}</span>
                    {count > 0 && (
                      <span className={`text-[9px] font-bold ${winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                        {winRate.toFixed(0)}% WR
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[--border-subtle]">
            <span className="text-[10px] text-[--text-muted]">Perte</span>
            <div className="flex gap-[2px]">
              {[0.2, 0.4, 0.6, 0.8].map((o) => (
                <div key={`loss-${o}`} className="w-3 h-3 rounded-[2px]" style={{ background: `rgba(239, 68, 68, ${o})` }} />
              ))}
            </div>
            <div className="w-3 h-3 rounded-[2px]" style={{ background: "var(--bg-secondary)" }} />
            <div className="flex gap-[2px]">
              {[0.2, 0.4, 0.6, 0.8].map((o) => (
                <div key={`win-${o}`} className="w-3 h-3 rounded-[2px]" style={{ background: `rgba(16, 185, 129, ${o})` }} />
              ))}
            </div>
            <span className="text-[10px] text-[--text-muted]">Gain</span>
          </div>

          {/* Year Total */}
          <div className="mt-4 pt-4 border-t border-[--border-subtle] flex justify-between items-center">
            <span className="text-sm text-[--text-secondary]">{t("totalYear")} {year}</span>
            <span className={`text-xl font-bold mono ${yearData.reduce((s, d) => s + d.pnl, 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {yearData.reduce((s, d) => s + d.pnl, 0) >= 0 ? "+" : ""}{yearData.reduce((s, d) => s + d.pnl, 0).toFixed(2)}€
            </span>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (() => {
        const dt = selectedDay.trades;
        const sorted = [...dt].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totalPnl = dt.reduce((s, t) => s + t.result, 0);
        const wins = dt.filter(t => t.result > 0).length;
        const wr = dt.length > 0 ? (wins / dt.length) * 100 : 0;
        const avgRR = dt.length > 0 ? dt.reduce((s, t) => {
          if (t.entry && t.sl && t.tp && t.sl !== t.entry) {
            return s + Math.abs((t.tp - t.entry) / (t.entry - t.sl));
          }
          return s;
        }, 0) / dt.length : 0;

        // Mini equity curve for the day
        let cumPnl = 0;
        const dayEquity = sorted.map(t => {
          cumPnl += t.result;
          return cumPnl;
        });

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
            <div className="glass rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[--text-primary]">
                    {new Date(year, month, selectedDay.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </h3>
                  {dt.length > 0 && (
                    <p className={`text-lg font-bold mono mt-1 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}€
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dt.length > 0 && (
                    <button
                      onClick={() => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay.day).padStart(2, "0")}`;
                        setSelectedDay(null);
                        router.push(`/journal?date=${dateStr}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                    >
                      Voir les trades
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-secondary] hover:text-[--text-primary]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {dt.length === 0 ? (
                <p className="text-[--text-muted] text-center py-8">{t("noTradeThisDay")}</p>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="metric-card rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[--text-muted]">Trades</p>
                      <p className="text-lg font-bold text-cyan-400 mono">{dt.length}</p>
                    </div>
                    <div className="metric-card rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[--text-muted]">Win Rate</p>
                      <p className={`text-lg font-bold mono ${wr >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{wr.toFixed(0)}%</p>
                    </div>
                    <div className="metric-card rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[--text-muted]">{t("avgRRShort")}</p>
                      <p className="text-lg font-bold text-cyan-400 mono">{avgRR > 0 ? `1:${avgRR.toFixed(1)}` : "—"}</p>
                    </div>
                    <div className="metric-card rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[--text-muted]">{t("resultLabel")}</p>
                      <p className="text-sm font-bold mono">
                        <span className="text-emerald-400">{wins}W</span>
                        <span className="text-[--text-muted] mx-1">/</span>
                        <span className="text-rose-400">{dt.length - wins}L</span>
                      </p>
                    </div>
                  </div>

                  {/* Mini day equity curve */}
                  {dayEquity.length > 1 && (
                    <div className="mb-5 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                      <p className="text-[10px] font-medium mb-2 text-[--text-muted]">Progression intraday</p>
                      <div className="h-16">
                        <svg viewBox={`0 0 ${dayEquity.length * 30} 60`} className="w-full h-full" preserveAspectRatio="none">
                          {(() => {
                            const maxE = Math.max(...dayEquity.map(Math.abs), 1);
                            const pts = dayEquity.map((v, i) => `${i * 30 + 15},${30 - (v / maxE) * 25}`).join(" ");
                            const color = totalPnl >= 0 ? "#10b981" : "#ef4444";
                            return (
                              <>
                                <line x1="0" y1="30" x2={dayEquity.length * 30} y2="30" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                                <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Trade List */}
                  <div className="space-y-2.5">
                    {sorted.map((trade) => {
                      const isWin = trade.result > 0;
                      const time = new Date(trade.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                      const rr = trade.entry && trade.sl && trade.tp && trade.sl !== trade.entry
                        ? Math.abs((trade.tp - trade.entry) / (trade.entry - trade.sl))
                        : null;
                      return (
                        <div key={trade.id} className={`p-4 rounded-xl border ${isWin ? "border-emerald-500/20 bg-emerald-500/[0.07]" : "border-rose-500/20 bg-rose-500/[0.07]"}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs mono text-[--text-muted] w-12">{time}</span>
                              <span className="font-bold text-[--text-primary]">{trade.asset}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                                {trade.direction}
                              </span>
                              {trade.strategy && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{trade.strategy}</span>
                              )}
                            </div>
                            <span className={`text-lg font-bold mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                              {isWin ? "+" : ""}{trade.result.toFixed(2)}€
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            {trade.entry && (
                              <span className="flex items-center gap-1 text-[--text-secondary]">
                                <span className="mono">{trade.entry}</span>
                                <ArrowRight className="w-3 h-3 text-[--text-muted]" />
                                <span className="mono">{trade.exit}</span>
                              </span>
                            )}
                            {trade.sl && <span className="text-rose-400/70 mono">SL {trade.sl}</span>}
                            {trade.tp && <span className="text-emerald-400/70 mono">TP {trade.tp}</span>}
                            {rr !== null && (
                              <span className="flex items-center gap-1 text-cyan-400">
                                <Target className="w-3 h-3" />
                                <span className="mono">1:{rr.toFixed(1)}</span>
                              </span>
                            )}
                            <span className="text-[--text-muted] mono">{trade.lots} lots</span>
                          </div>
                          {trade.emotion && (
                            <div className="mt-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-[--bg-hover] text-[--text-secondary]">{trade.emotion}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
