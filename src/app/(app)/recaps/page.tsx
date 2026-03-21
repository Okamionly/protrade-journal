"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { getTradingSession, type TradingSession } from "@/hooks/useAdvancedFilters";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  ClipboardCopy,
  Check,
  BookOpen,
  Target,
  Clock,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";

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

function periodKey(period: Period, range: { start: Date; end: Date }): string {
  return `recap_${period}_${range.start.toISOString().slice(0, 10)}`;
}

interface MonthlyGoals {
  pnl: number | null;
  trades: number | null;
  winRate: number | null;
}

const SESSION_COLORS: Record<TradingSession, string> = {
  Tokyo: "#f43f5e",
  London: "#3b82f6",
  "New York": "#10b981",
  Sydney: "#a855f7",
};

export default function RecapsPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  const DAYS_FR_FULL = [t("daySunFull"), t("dayMonFull"), t("dayTueFull"), t("dayWedFull"), t("dayThuFull"), t("dayFriFull"), t("daySatFull")];
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

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
  const pKey = periodKey(period, range);

  // localStorage state for lessons & plan
  const [lessons, setLessons] = useState("");
  const [plan, setPlan] = useState("");

  // Monthly goals
  const [goals, setGoals] = useState<MonthlyGoals>({ pnl: null, trades: null, winRate: null });
  const [goalDraft, setGoalDraft] = useState<{ pnl: string; trades: string; winRate: string }>({ pnl: "", trades: "", winRate: "" });

  // Load from localStorage when period changes
  useEffect(() => {
    try {
      setLessons(localStorage.getItem(`${pKey}_lessons`) || "");
      setPlan(localStorage.getItem(`${pKey}_plan`) || "");

      // Load monthly goals
      const monthKey = `goals_${range.start.getFullYear()}_${range.start.getMonth()}`;
      const stored = localStorage.getItem(monthKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setGoals(parsed);
        setGoalDraft({
          pnl: parsed.pnl !== null ? String(parsed.pnl) : "",
          trades: parsed.trades !== null ? String(parsed.trades) : "",
          winRate: parsed.winRate !== null ? String(parsed.winRate) : "",
        });
      } else {
        setGoals({ pnl: null, trades: null, winRate: null });
        setGoalDraft({ pnl: "", trades: "", winRate: "" });
      }
    } catch {
      // ignore localStorage errors
    }
  }, [pKey, range.start]);

  const saveLessons = useCallback((v: string) => {
    setLessons(v);
    try { localStorage.setItem(`${pKey}_lessons`, v); } catch { /* */ }
  }, [pKey]);

  const savePlan = useCallback((v: string) => {
    setPlan(v);
    try { localStorage.setItem(`${pKey}_plan`, v); } catch { /* */ }
  }, [pKey]);

  const saveGoals = () => {
    const newGoals: MonthlyGoals = {
      pnl: goalDraft.pnl ? parseFloat(goalDraft.pnl) : null,
      trades: goalDraft.trades ? parseInt(goalDraft.trades) : null,
      winRate: goalDraft.winRate ? parseFloat(goalDraft.winRate) : null,
    };
    setGoals(newGoals);
    const monthKey = `goals_${range.start.getFullYear()}_${range.start.getMonth()}`;
    try { localStorage.setItem(monthKey, JSON.stringify(newGoals)); } catch { /* */ }
    setShowGoalEditor(false);
  };

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

  // Compute profit factor helper
  const computePF = (tradeList: Trade[]) => {
    const grossProfit = tradeList.filter(t => t.result > 0).reduce((s, t) => s + t.result, 0);
    const grossLoss = Math.abs(tradeList.filter(t => t.result < 0).reduce((s, t) => s + t.result, 0));
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  };

  // Compute avg R:R helper
  const computeAvgRR = (tradeList: Trade[]) => {
    const withRR = tradeList.filter(t => t.sl > 0 && t.tp > 0 && t.entry > 0);
    if (withRR.length === 0) return null;
    const sum = withRR.reduce((acc, t) => {
      const risk = Math.abs(t.entry - t.sl);
      const reward = Math.abs(t.tp - t.entry);
      return acc + (risk > 0 ? reward / risk : 0);
    }, 0);
    return sum / withRR.length;
  };

  const stats = useMemo(() => {
    const total = periodTrades.length;
    const wins = periodTrades.filter((t) => t.result > 0).length;
    const losses = periodTrades.filter((t) => t.result < 0).length;
    const pnl = periodTrades.reduce((s, t) => s + t.result, 0);
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgWin = wins > 0 ? periodTrades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0) / wins : 0;
    const avgLoss = losses > 0 ? periodTrades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0) / losses : 0;
    const profitFactor = computePF(periodTrades);
    const avgRR = computeAvgRR(periodTrades);

    const prevTotal = prevTrades.length;
    const prevPnl = prevTrades.reduce((s, t) => s + t.result, 0);
    const prevWins = prevTrades.filter((t) => t.result > 0).length;
    const prevWinRate = prevTotal > 0 ? (prevWins / prevTotal) * 100 : 0;
    const prevPF = computePF(prevTrades);
    const prevAvgRR = computeAvgRR(prevTrades);

    const sorted = [...periodTrades].sort((a, b) => b.result - a.result);
    const top3 = sorted.slice(0, 3);
    const worst3 = sorted.slice(-3).reverse();

    const byStrategy: Record<string, { pnl: number; count: number; wins: number }> = {};
    periodTrades.forEach((t) => {
      if (!byStrategy[t.strategy]) byStrategy[t.strategy] = { pnl: 0, count: 0, wins: 0 };
      byStrategy[t.strategy].pnl += t.result;
      byStrategy[t.strategy].count++;
      if (t.result > 0) byStrategy[t.strategy].wins++;
    });

    return {
      total, wins, losses, pnl, winRate, avgWin, avgLoss,
      profitFactor, avgRR,
      prevTotal, prevPnl, prevWinRate, prevPF, prevAvgRR,
      top3, worst3, byStrategy,
    };
  }, [periodTrades, prevTrades]);

  // Session performance
  const sessionStats = useMemo(() => {
    const sessions: TradingSession[] = ["Tokyo", "London", "New York", "Sydney"];
    const map: Record<TradingSession, { results: number[] }> = {
      Tokyo: { results: [] },
      London: { results: [] },
      "New York": { results: [] },
      Sydney: { results: [] },
    };

    for (const trade of periodTrades) {
      const s = getTradingSession(trade.date);
      if (s.length > 0 && map[s[0]]) {
        map[s[0]].results.push(trade.result);
      }
    }

    return sessions.map((session) => {
      const results = map[session].results;
      const count = results.length;
      const wins = results.filter((r) => r > 0).length;
      const totalPnl = results.reduce((a, b) => a + b, 0);
      const winRate = count > 0 ? (wins / count) * 100 : 0;
      const avgPnl = count > 0 ? totalPnl / count : 0;
      return { session, count, wins, winRate, totalPnl, avgPnl };
    }).filter(s => s.count > 0);
  }, [periodTrades]);

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
    return bins;
  }, [periodTrades]);

  const pnlDelta = stats.pnl - stats.prevPnl;
  const wrDelta = stats.winRate - stats.prevWinRate;
  const pfDelta = stats.profitFactor !== Infinity && stats.prevPF !== Infinity
    ? stats.profitFactor - stats.prevPF
    : null;

  // Export to clipboard
  const exportRecap = async () => {
    const lines = [
      `=== RECAP ${period === "week" ? "SEMAINE" : "MOIS"} ===`,
      `${formatDateFr(range.start)} - ${formatDateFr(range.end)}`,
      "",
      `P&L: ${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}\u20AC`,
      `Trades: ${stats.total} (${stats.wins}W / ${stats.losses}L)`,
      `Win Rate: ${stats.winRate.toFixed(1)}%`,
      `Profit Factor: ${stats.profitFactor === Infinity ? "\u221E" : stats.profitFactor.toFixed(2)}`,
      stats.avgRR !== null ? `R:R Moyen: ${stats.avgRR.toFixed(2)}` : "",
      "",
      `--- Comparaison vs pr\u00E9c\u00E9dent ---`,
      `P&L delta: ${pnlDelta >= 0 ? "+" : ""}${pnlDelta.toFixed(2)}\u20AC`,
      `Win rate delta: ${wrDelta >= 0 ? "+" : ""}${wrDelta.toFixed(1)}pp`,
      "",
    ];

    if (stats.top3.length > 0) {
      lines.push("--- Top 3 trades ---");
      stats.top3.forEach((t, i) => lines.push(`#${i + 1} ${t.asset} (${t.strategy}): +${t.result.toFixed(2)}\u20AC`));
      lines.push("");
    }
    if (stats.worst3.length > 0) {
      lines.push("--- Pires 3 trades ---");
      stats.worst3.forEach((t, i) => lines.push(`#${i + 1} ${t.asset} (${t.strategy}): ${t.result.toFixed(2)}\u20AC`));
      lines.push("");
    }

    if (Object.keys(stats.byStrategy).length > 0) {
      lines.push("--- Par strat\u00E9gie ---");
      Object.entries(stats.byStrategy)
        .sort(([, a], [, b]) => b.pnl - a.pnl)
        .forEach(([name, data]) => {
          const wr = data.count > 0 ? ((data.wins / data.count) * 100).toFixed(0) : "0";
          lines.push(`${name}: ${data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}\u20AC (${data.count} trades, ${wr}% WR)`);
        });
      lines.push("");
    }

    if (sessionStats.length > 0) {
      lines.push("--- Par session ---");
      sessionStats.forEach(s => {
        lines.push(`${s.session}: ${s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(2)}\u20AC (${s.count} trades, ${s.winRate.toFixed(0)}% WR)`);
      });
      lines.push("");
    }

    if (lessons.trim()) {
      lines.push("--- Le\u00E7ons ---");
      lines.push(lessons.trim());
      lines.push("");
    }
    if (plan.trim()) {
      lines.push("--- Plan ---");
      lines.push(plan.trim());
      lines.push("");
    }

    try {
      await navigator.clipboard.writeText(lines.filter(l => l !== undefined).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Recaps</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("recapSummary")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportRecap}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: copied ? "#10b981" : "var(--text-secondary)" }}
          >
            {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            {copied ? t("recapCopied") : t("recapExportClipboard")}
          </button>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => { setPeriod("week"); setOffset(0); }}
              className={`px-4 py-2 text-sm font-medium transition ${period === "week" ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={period !== "week" ? { color: "var(--text-secondary)" } : {}}
            >
              {t("weekLabel")}
            </button>
            <button
              onClick={() => { setPeriod("month"); setOffset(0); }}
              className={`px-4 py-2 text-sm font-medium transition ${period === "month" ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={period !== "month" ? { color: "var(--text-secondary)" } : {}}
            >
              {t("monthLabel")}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setOffset(offset + 1)} className="p-2 rounded-xl hover:bg-white/5 transition" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatDateFr(range.start)} — {formatDateFr(range.end)}
          </span>
        </div>
        <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} className="p-2 rounded-xl disabled:opacity-30 hover:bg-white/5 transition" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary cards - 6 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "P&L",
            value: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}\u20AC`,
            delta: pnlDelta,
            deltaFmt: `${pnlDelta >= 0 ? "+" : ""}${pnlDelta.toFixed(2)}\u20AC`,
            color: stats.pnl >= 0 ? "#10b981" : "#ef4444",
          },
          {
            label: "Trades",
            value: stats.total,
            delta: stats.total - stats.prevTotal,
            deltaFmt: `${stats.total - stats.prevTotal >= 0 ? "+" : ""}${stats.total - stats.prevTotal}`,
            color: "var(--text-primary)",
          },
          {
            label: "Win Rate",
            value: `${stats.winRate.toFixed(1)}%`,
            delta: wrDelta,
            deltaFmt: `${wrDelta >= 0 ? "+" : ""}${wrDelta.toFixed(1)}pp`,
            color: stats.winRate >= 50 ? "#10b981" : "#f59e0b",
          },
          {
            label: t("recapProfitFactor"),
            value: stats.profitFactor === Infinity ? "\u221E" : stats.profitFactor.toFixed(2),
            delta: pfDelta,
            deltaFmt: pfDelta !== null ? `${pfDelta >= 0 ? "+" : ""}${pfDelta.toFixed(2)}` : null,
            color: stats.profitFactor >= 1.5 ? "#10b981" : stats.profitFactor >= 1 ? "#f59e0b" : "#ef4444",
          },
          {
            label: t("recapAvgRR"),
            value: stats.avgRR !== null ? stats.avgRR.toFixed(2) : "-",
            delta: stats.avgRR !== null && stats.prevAvgRR !== null ? stats.avgRR - stats.prevAvgRR : null,
            deltaFmt: stats.avgRR !== null && stats.prevAvgRR !== null ? `${(stats.avgRR - stats.prevAvgRR) >= 0 ? "+" : ""}${(stats.avgRR - stats.prevAvgRR).toFixed(2)}` : null,
            color: stats.avgRR !== null && stats.avgRR >= 2 ? "#10b981" : stats.avgRR !== null && stats.avgRR >= 1 ? "#f59e0b" : "var(--text-secondary)",
          },
          {
            label: t("avgGain"),
            value: `${stats.avgWin.toFixed(2)}\u20AC`,
            delta: null,
            deltaFmt: null,
            color: "#10b981",
          },
        ].map((card) => (
          <div key={card.label} className="metric-card rounded-2xl p-4">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{card.label}</div>
            <div className="text-xl font-bold mono" style={{ color: card.color }}>{card.value}</div>
            {card.delta !== null && card.deltaFmt !== null && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                {card.delta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                <span style={{ color: card.delta >= 0 ? "#10b981" : "#ef4444" }}>
                  {card.deltaFmt}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{t("vsPrevious")}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <TrendingUp className="w-5 h-5 text-cyan-400" /> {t("recapComparisonTitle")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Metric</th>
                <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("recapPrevPeriod")}</th>
                <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("recapCurrentPeriod")}</th>
                <th className="text-right p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("recapDelta")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "P&L", prev: `${stats.prevPnl >= 0 ? "+" : ""}${stats.prevPnl.toFixed(2)}\u20AC`, curr: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}\u20AC`, delta: pnlDelta, deltaStr: `${pnlDelta >= 0 ? "+" : ""}${pnlDelta.toFixed(2)}\u20AC` },
                { label: "Trades", prev: String(stats.prevTotal), curr: String(stats.total), delta: stats.total - stats.prevTotal, deltaStr: `${stats.total - stats.prevTotal >= 0 ? "+" : ""}${stats.total - stats.prevTotal}` },
                { label: "Win Rate", prev: `${stats.prevWinRate.toFixed(1)}%`, curr: `${stats.winRate.toFixed(1)}%`, delta: wrDelta, deltaStr: `${wrDelta >= 0 ? "+" : ""}${wrDelta.toFixed(1)}pp` },
                { label: "Profit Factor", prev: stats.prevPF === Infinity ? "\u221E" : stats.prevPF.toFixed(2), curr: stats.profitFactor === Infinity ? "\u221E" : stats.profitFactor.toFixed(2), delta: pfDelta ?? 0, deltaStr: pfDelta !== null ? `${pfDelta >= 0 ? "+" : ""}${pfDelta.toFixed(2)}` : "-" },
              ].map((row) => (
                <tr key={row.label} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-2 font-medium" style={{ color: "var(--text-primary)" }}>{row.label}</td>
                  <td className="p-2 text-center mono" style={{ color: "var(--text-secondary)" }}>{row.prev}</td>
                  <td className="p-2 text-center mono font-bold" style={{ color: "var(--text-primary)" }}>{row.curr}</td>
                  <td className="p-2 text-right mono font-bold" style={{ color: row.delta >= 0 ? "#10b981" : "#ef4444" }}>{row.deltaStr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily P&L Chart */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-cyan-400" /> {t("dailyPnl")}
        </h3>
        {dailyPnl.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
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

      {/* Top/Worst trades */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingUp className="w-5 h-5 text-emerald-400" /> {t("recapBestTrades")}
          </h3>
          {stats.top3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
          ) : (
            <div className="space-y-2">
              {stats.top3.map((tr, i) => (
                <div key={tr.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#10b981" }}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{tr.asset}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-solid)", color: "var(--text-muted)" }}>{tr.direction}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Link href="/playbook" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>{tr.strategy}</Link>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(tr.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <span className="font-bold mono" style={{ color: "#10b981" }}>+{tr.result.toFixed(2)}\u20AC</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worst 3 */}
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingDown className="w-5 h-5 text-rose-400" /> {t("recapWorstTrades")}
          </h3>
          {stats.worst3.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
          ) : (
            <div className="space-y-2">
              {stats.worst3.map((tr, i) => (
                <div key={tr.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                  <span className="text-lg font-bold" style={{ color: "#ef4444" }}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{tr.asset}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-solid)", color: "var(--text-muted)" }}>{tr.direction}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Link href="/playbook" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>{tr.strategy}</Link>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(tr.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <span className="font-bold mono" style={{ color: "#ef4444" }}>{tr.result.toFixed(2)}\u20AC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strategy Performance Breakdown */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{t("perfByStrategy")}</h3>
        {Object.keys(stats.byStrategy).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("recapNoData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Strat\u00E9gie</th>
                  <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Trades</th>
                  <th className="text-center p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Win Rate</th>
                  <th className="text-right p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byStrategy)
                  .sort(([, a], [, b]) => b.pnl - a.pnl)
                  .map(([name, data]) => {
                    const wr = data.count > 0 ? (data.wins / data.count) * 100 : 0;
                    return (
                      <tr key={name} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="p-2">
                          <Link href="/playbook" className="font-medium hover:underline" style={{ color: "var(--text-primary)" }}>{name}</Link>
                        </td>
                        <td className="p-2 text-center mono" style={{ color: "var(--text-secondary)" }}>{data.count}</td>
                        <td className="p-2 text-center mono" style={{ color: wr >= 50 ? "#10b981" : "#f59e0b" }}>{wr.toFixed(0)}%</td>
                        <td className="p-2 text-right mono font-bold" style={{ color: data.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                          {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(2)}\u20AC
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Performance */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Clock className="w-5 h-5 text-blue-400" /> {t("recapSessionPerf")}
        </h3>
        {sessionStats.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessionStats.map((s) => (
              <div key={s.session} className="p-4 rounded-xl" style={{ background: "var(--bg-hover)", borderLeft: `3px solid ${SESSION_COLORS[s.session]}` }}>
                <div className="text-sm font-semibold mb-2" style={{ color: SESSION_COLORS[s.session] }}>{s.session}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Trades</div>
                    <div className="font-bold mono" style={{ color: "var(--text-primary)" }}>{s.count}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Win Rate</div>
                    <div className="font-bold mono" style={{ color: s.winRate >= 50 ? "#10b981" : "#f59e0b" }}>{s.winRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>P&L</div>
                    <div className="font-bold mono" style={{ color: s.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
                      {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(2)}\u20AC
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Moy.</div>
                    <div className="font-bold mono" style={{ color: s.avgPnl >= 0 ? "#10b981" : "#ef4444" }}>
                      {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}\u20AC
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day of Week Analysis */}
      <div className="metric-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calendar className="w-5 h-5 text-purple-400" /> {t("dayOfWeekAnalysis")}
        </h3>
        {periodTrades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
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
          <PieChart className="w-5 h-5 text-amber-400" /> {t("tradeDistribution")}
        </h3>
        {periodTrades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("noTradeThisPeriod")}</p>
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

      {/* Goals Progress (monthly only) */}
      {period === "month" && (
        <div className="metric-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Target className="w-5 h-5 text-cyan-400" /> {t("recapGoalsTitle")}
            </h3>
            <button
              onClick={() => setShowGoalEditor(!showGoalEditor)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/5 transition"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              {showGoalEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {t("recapSetGoals")}
            </button>
          </div>

          {showGoalEditor && (
            <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: "var(--bg-hover)" }}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>{t("recapGoalMonthlyPnl")}</label>
                  <input
                    type="number"
                    value={goalDraft.pnl}
                    onChange={(e) => setGoalDraft({ ...goalDraft, pnl: e.target.value })}
                    placeholder={t("recapGoalPnlPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--bg-card-solid)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>{t("recapGoalMonthlyTrades")}</label>
                  <input
                    type="number"
                    value={goalDraft.trades}
                    onChange={(e) => setGoalDraft({ ...goalDraft, trades: e.target.value })}
                    placeholder={t("recapGoalTradesPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--bg-card-solid)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>{t("recapGoalWinRate")}</label>
                  <input
                    type="number"
                    value={goalDraft.winRate}
                    onChange={(e) => setGoalDraft({ ...goalDraft, winRate: e.target.value })}
                    placeholder={t("recapGoalWinRatePlaceholder")}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--bg-card-solid)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <button
                onClick={saveGoals}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
              >
                <Save className="w-4 h-4" /> {t("recapSaveGoals")}
              </button>
            </div>
          )}

          {(goals.pnl !== null || goals.trades !== null || goals.winRate !== null) ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {goals.pnl !== null && (
                <GoalProgressBar
                  label={t("recapGoalMonthlyPnl")}
                  current={stats.pnl}
                  target={goals.pnl}
                  unit="\u20AC"
                  isCurrency
                />
              )}
              {goals.trades !== null && (
                <GoalProgressBar
                  label={t("recapGoalMonthlyTrades")}
                  current={stats.total}
                  target={goals.trades}
                  unit=""
                />
              )}
              {goals.winRate !== null && (
                <GoalProgressBar
                  label={t("recapGoalWinRate")}
                  current={stats.winRate}
                  target={goals.winRate}
                  unit="%"
                />
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("recapSetGoals")}</p>
          )}
        </div>
      )}

      {/* Lessons & Plan */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <BookOpen className="w-5 h-5 text-amber-400" /> {t("recapLessonsTitle")}
          </h3>
          <textarea
            value={lessons}
            onChange={(e) => saveLessons(e.target.value)}
            placeholder={t("recapLessonsPlaceholder")}
            rows={5}
            className="w-full rounded-xl p-3 text-sm resize-y"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        <div className="metric-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Target className="w-5 h-5 text-cyan-400" /> {t("recapPlanTitle")}
          </h3>
          <textarea
            value={plan}
            onChange={(e) => savePlan(e.target.value)}
            placeholder={t("recapPlanPlaceholder")}
            rows={5}
            className="w-full rounded-xl p-3 text-sm resize-y"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Goal progress bar component
function GoalProgressBar({
  label,
  current,
  target,
  unit,
  isCurrency = false,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  isCurrency?: boolean;
}) {
  const pct = target !== 0 ? Math.min((current / target) * 100, 100) : 0;
  const reached = current >= target;
  const displayCurrent = isCurrency ? `${current >= 0 ? "+" : ""}${current.toFixed(2)}` : current.toFixed(unit === "%" ? 1 : 0);
  const displayTarget = isCurrency ? target.toFixed(2) : target.toFixed(unit === "%" ? 1 : 0);

  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--bg-hover)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
        {reached && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
            Atteint !
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-lg font-bold mono" style={{ color: reached ? "#10b981" : "var(--text-primary)" }}>
          {displayCurrent}{unit}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          / {displayTarget}{unit}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card-solid)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(pct, 0)}%`,
            background: reached
              ? "#10b981"
              : pct >= 75
                ? "#f59e0b"
                : "var(--accent, #06b6d4)",
          }}
        />
      </div>
      <div className="text-right mt-1">
        <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
