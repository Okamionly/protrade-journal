"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type Period = "week" | "month";

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
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
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Recaps</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Résumé de vos performances par période.
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
          { label: "P&L", value: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}€`, delta: pnlDelta, color: stats.pnl >= 0 ? "#10b981" : "#ef4444" },
          { label: "Trades", value: stats.total, delta: stats.total - prevTrades.length, color: "var(--text-primary)" },
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, delta: wrDelta, color: stats.winRate >= 50 ? "#10b981" : "#f59e0b" },
          { label: "Gain moy.", value: `${stats.avgWin.toFixed(2)}€`, delta: null, color: "#10b981" },
        ].map((card) => (
          <div key={card.label} className="metric-card rounded-2xl p-5">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{card.label}</div>
            <div className="text-2xl font-bold mono" style={{ color: card.color }}>{card.value}</div>
            {card.delta !== null && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                {card.delta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                <span style={{ color: card.delta >= 0 ? "#10b981" : "#ef4444" }}>
                  {card.delta >= 0 ? "+" : ""}{typeof card.delta === "number" && card.label === "P&L" ? `${card.delta.toFixed(2)}€` : card.label === "Win Rate" ? `${card.delta.toFixed(1)}pp` : card.delta}
                </span>
                <span style={{ color: "var(--text-muted)" }}>vs précédent</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top/Worst trades + Strategy breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Top 3 trades</h3>
          {stats.top3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette période</p>
          ) : (
            <div className="space-y-2">
              {stats.top3.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#10b981" }}>#{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{t.asset}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{t.strategy}</span>
                  </div>
                  <span className="font-bold mono" style={{ color: "#10b981" }}>+{t.result.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worst 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Pires 3 trades</h3>
          {stats.worst3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade cette période</p>
          ) : (
            <div className="space-y-2">
              {stats.worst3.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#ef4444" }}>#{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{t.asset}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{t.strategy}</span>
                  </div>
                  <span className="font-bold mono" style={{ color: "#ef4444" }}>{t.result.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By Strategy */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Performance par stratégie</h3>
        {Object.keys(stats.byStrategy).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune donnée</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.byStrategy)
              .sort(([, a], [, b]) => b.pnl - a.pnl)
              .map(([name, data]) => (
                <div key={name} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="font-medium text-sm flex-1" style={{ color: "var(--text-primary)" }}>{name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.count} trades</span>
                  <span className="font-bold mono text-sm" style={{ color: data.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(2)}€
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
