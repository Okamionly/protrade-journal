"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight, BarChart3, PieChart } from "lucide-react";
import Link from "next/link";

type Period = "week" | "month";

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.getFullYear(), d.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const DAYS_FR_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function RecapsPage() {
  const { trades, loading } = useTrades();
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);

  const currentDate = useMemo(() => {
    const d = new Date();
    if (period === "week") {
      d.setDate(d.getDate() - offset * 7);
    } else {
      d.setMonth(d.getMonth() - offset);
    }
    return d;
  }, [period, offset]);

  const range = period === "week" ? getWeekRange(currentDate) : getMonthRange(currentDate);

  const periodTrades = useMemo(() => {
    return trades.filter((t) => {
      const d = new Date(t.date);
      return d >= range.start && d <= range.end;
    });
  }, [trades, range.start, range.end]);

  const prevRange = useMemo(() => {
    const d = new Date(currentDate);
    if (period === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    return period === "week" ? getWeekRange(d) : getMonthRange(d);
  }, [currentDate, period]);

  const prevTrades = useMemo(() => {
    return trades.filter((t) => {
      const d = new Date(t.date);
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [trades, prevRange.start, prevRange.end]);

  const stats = useMemo(() => {
    const total = periodTrades.length;
    const wins = periodTrades.filter((t) => t.result > 0).length;
    const losses = periodTrades.filter((t) => t.result < 0).length;
    const pnl = periodTrades.reduce((s, t) => s + t.result, 0);
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgWin = wins > 0 ? periodTrades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0) / wins : 0;
    const avgLoss = losses > 0 ? periodTrades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0) / losses : 0;

    const prevPnl = prevTrades.reduce((s, t) => s + t.result, 0);
    const prevWinRate = prevTrades.length > 0 ? (prevTrades.filter((t) => t.result > 0).length / prevTrades.length) * 100 : 0;

    const sorted = [...periodTrades].sort((a, b) => b.result - a.result);
    const top3 = sorted.slice(0, 3);
    const worst3 = sorted.slice(-3).reverse();

    const byStrategy: Record<string, { pnl: number; count: number }> = {};
    periodTrades.forEach((t) => {
      if (!byStrategy[t.strategy]) byStrategy[t.strategy] = { pnl: 0, count: 0 };
      byStrategy[t.strategy].pnl += t.result;
      byStrategy[t.strategy].count++;
    });

    return { total, wins, losses, pnl, winRate, avgWin, avgLoss, prevPnl, prevWinRate, top3, worst3, byStrategy };
  }, [periodTrades, prevTrades]);

  // Daily P&L chart data
  const dailyPnl = useMemo(() => {
    const byDay: Record<string, number> = {};
    periodTrades.forEach((t) => {
      const dayKey = new Date(t.date).toISOString().slice(0, 10);
      byDay[dayKey] = (byDay[dayKey] || 0) + t.result;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({ date, pnl }));
  }, [periodTrades]);

  // Day-of-week analysis
  const dayOfWeekAnalysis = useMemo(() => {
    const days: Record<number, { pnl: number; count: number; wins: number }> = {};
    for (let d = 1; d <= 5; d++) days[d] = { pnl: 0, count: 0, wins: 0 };

    periodTrades.forEach((t) => {
      const d = new Date(t.date).getDay();
      if (d >= 1 && d <= 5) {
        days[d].pnl += t.result;
        days[d].count++;
        if (t.result > 0) days[d].wins++;
      }
    });

    return [1, 2, 3, 4, 5].map((d) => ({
      day: d,
      dayName: DAYS_FR_FULL[d],
      avgPnl: days[d].count > 0 ? days[d].pnl / days[d].count : 0,
      totalPnl: days[d].pnl,
      count: days[d].count,
      winRate: days[d].count > 0 ? (days[d].wins / days[d].count) * 100 : 0,
    }));
  }, [periodTrades]);

  // Trade distribution histogram
  const histogram = useMemo(() => {
    const bins = [
      { label: "<-100\u20AC", min: -Infinity, max: -100, count: 0 },
      { label: "-100/-50", min: -100, max: -50, count: 0 },
      { label: "-50/0", min: -50, max: 0, count: 0 },
      { label: "0/50", min: 0, max: 50, count: 0 },
      { label: "50/100", min: 50, max: 100, count: 0 },
      { label: ">100\u20AC", min: 100, max: Infinity, count: 0 },
    ];
    periodTrades.forEach((t) => {
      for (const bin of bins) {
        if (t.result >= bin.min && t.result < bin.max) {
          bin.count++;
          break;
        }
      }
    });
    // Edge: result === max of last bin (Infinity won't match, handle >100)
    return bins;
  }, [periodTrades]);

  const pnlDelta = stats.pnl - stats.prevPnl;
  const wrDelta = stats.winRate - stats.prevWinRate;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />)}
        </div>
      </div>
    );
  }

  // SVG chart helpers
  const maxAbsDailyPnl = Math.max(...dailyPnl.map((d) => Math.abs(d.pnl)), 1);
  const maxHistCount = Math.max(...histogram.map((b) => b.count), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Recaps</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Resume de vos performances par periode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => { setPeriod("week"); setOffset(0); }}
              className={`px-4 py-2 text-sm font-medium transition ${period === "week" ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={period !== "week" ? { color: "var(--text-secondary)" } : {}}
            >
              Semaine
            </button>
            <button
              onClick={() => { setPeriod("month"); setOffset(0); }}
              className={`px-4 py-2 text-sm font-medium transition ${period === "month" ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={period !== "month" ? { color: "var(--text-secondary)" } : {}}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setOffset(offset + 1)} className="p-2 rounded-xl" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatDateFr(range.start)} — {formatDateFr(range.end)}
          </span>
        </div>
        <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} className="p-2 rounded-xl disabled:opacity-30" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "P&L", value: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}\u20AC`, delta: pnlDelta, color: stats.pnl >= 0 ? "#10b981" : "#ef4444" },
          { label: "Trades", value: stats.total, delta: stats.total - prevTrades.length, color: "var(--text-primary)" },
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, delta: wrDelta, color: stats.winRate >= 50 ? "#10b981" : "#f59e0b" },
          { label: "Gain moy.", value: `${stats.avgWin.toFixed(2)}\u20AC`, delta: null, color: "#10b981" },
        ].map((card) => (
          <div key={card.label} className="metric-card rounded-2xl p-5">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{card.label}</div>
            <div className="text-2xl font-bold mono" style={{ color: card.color }}>{card.value}</div>
            {card.delta !== null && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                {card.delta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                <span style={{ color: card.delta >= 0 ? "#10b981" : "#ef4444" }}>
                  {card.delta >= 0 ? "+" : ""}{typeof card.delta === "number" && card.label === "P&L" ? `${card.delta.toFixed(2)}\u20AC` : card.label === "Win Rate" ? `${card.delta.toFixed(1)}pp` : card.delta}
                </span>
                <span style={{ color: "var(--text-muted)" }}>vs precedent</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Daily P&L Chart */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-cyan-400" /> P&L Journalier
        </h3>
        {dailyPnl.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette periode</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(dailyPnl.length * 60, 200)} 180`} className="w-full" style={{ minWidth: `${dailyPnl.length * 60}px`, maxHeight: "200px" }}>
              {/* Zero line */}
              <line x1="0" y1="90" x2={dailyPnl.length * 60} y2="90" stroke="rgba(128,128,128,0.3)" strokeWidth="1" strokeDasharray="4,4" />
              {dailyPnl.map((d, i) => {
                const barHeight = (Math.abs(d.pnl) / maxAbsDailyPnl) * 80;
                const x = i * 60 + 10;
                const barWidth = 40;
                const isPositive = d.pnl >= 0;
                const y = isPositive ? 90 - barHeight : 90;
                const shortDate = d.date.slice(5); // MM-DD
                return (
                  <g key={d.date}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx="4"
                      fill={isPositive ? "#10b981" : "#ef4444"}
                      opacity="0.75"
                    >
                      <title>{`${d.date}: ${d.pnl >= 0 ? "+" : ""}${d.pnl.toFixed(2)}\u20AC`}</title>
                    </rect>
                    <text
                      x={x + barWidth / 2}
                      y={isPositive ? y - 4 : y + barHeight + 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isPositive ? "#10b981" : "#ef4444"}
                      fontFamily="monospace"
                    >
                      {d.pnl >= 0 ? "+" : ""}{d.pnl.toFixed(0)}\u20AC
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="175"
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(128,128,128,0.6)"
                    >
                      {shortDate}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Day of Week Analysis */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calendar className="w-5 h-5 text-purple-400" /> Analyse par jour de la semaine
        </h3>
        {periodTrades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette periode</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Jour</th>
                  <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Trades</th>
                  <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Win Rate</th>
                  <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>P&L Moyen</th>
                  <th className="text-right p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>P&L Total</th>
                </tr>
              </thead>
              <tbody>
                {dayOfWeekAnalysis.map((d) => (
                  <tr key={d.day} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="p-2 font-medium" style={{ color: "var(--text-primary)" }}>{d.dayName}</td>
                    <td className="p-2 text-center mono" style={{ color: "var(--text-secondary)" }}>{d.count}</td>
                    <td className="p-2 text-center mono" style={{ color: d.winRate >= 50 ? "#10b981" : d.count > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                      {d.count > 0 ? `${d.winRate.toFixed(0)}%` : "-"}
                    </td>
                    <td className="p-2 text-center mono font-bold" style={{ color: d.avgPnl >= 0 ? "#10b981" : "#ef4444" }}>
                      {d.count > 0 ? `${d.avgPnl >= 0 ? "+" : ""}${d.avgPnl.toFixed(2)}\u20AC` : "-"}
                    </td>
                    <td className="p-2 text-right mono font-bold" style={{ color: d.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
                      {d.count > 0 ? `${d.totalPnl >= 0 ? "+" : ""}${d.totalPnl.toFixed(2)}\u20AC` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade Distribution Histogram */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <PieChart className="w-5 h-5 text-amber-400" /> Distribution des trades
        </h3>
        {periodTrades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette periode</p>
        ) : (
          <div className="w-full">
            <svg viewBox="0 0 420 160" className="w-full" style={{ maxHeight: "180px" }}>
              {histogram.map((bin, i) => {
                const barHeight = maxHistCount > 0 ? (bin.count / maxHistCount) * 100 : 0;
                const x = i * 70 + 5;
                const barWidth = 55;
                const y = 120 - barHeight;
                const isLoss = i < 3;
                return (
                  <g key={bin.label}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx="4"
                      fill={isLoss ? "#ef4444" : "#10b981"}
                      opacity="0.65"
                    >
                      <title>{`${bin.label}: ${bin.count} trades`}</title>
                    </rect>
                    <text
                      x={x + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isLoss ? "#ef4444" : "#10b981"}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {bin.count}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="140"
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(128,128,128,0.7)"
                    >
                      {bin.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Top/Worst trades + Strategy breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Top 3 trades</h3>
          {stats.top3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette periode</p>
          ) : (
            <div className="space-y-2">
              {stats.top3.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#10b981" }}>#{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{t.asset}</span>
                    <Link href="/playbook" className="text-xs ml-2 hover:underline" style={{ color: "var(--text-muted)" }}>{t.strategy}</Link>
                  </div>
                  <span className="font-bold mono" style={{ color: "#10b981" }}>+{t.result.toFixed(2)}\u20AC</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worst 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Pires 3 trades</h3>
          {stats.worst3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette periode</p>
          ) : (
            <div className="space-y-2">
              {stats.worst3.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#ef4444" }}>#{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{t.asset}</span>
                    <Link href="/playbook" className="text-xs ml-2 hover:underline" style={{ color: "var(--text-muted)" }}>{t.strategy}</Link>
                  </div>
                  <span className="font-bold mono" style={{ color: "#ef4444" }}>{t.result.toFixed(2)}\u20AC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By Strategy */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Performance par strategie</h3>
        {Object.keys(stats.byStrategy).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune donnee</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.byStrategy)
              .sort(([, a], [, b]) => b.pnl - a.pnl)
              .map(([name, data]) => (
                <div key={name} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <Link href="/playbook" className="font-medium text-sm flex-1 hover:underline" style={{ color: "var(--text-primary)" }}>
                    {name}
                  </Link>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.count} trades</span>
                  <span className="font-bold mono text-sm" style={{ color: data.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(2)}\u20AC
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
