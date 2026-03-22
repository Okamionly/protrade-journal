"use client";

import { useMemo, useEffect, useRef } from "react";
import { useTrades } from "@/hooks/useTrades";
import { getTradingSession, type TradingSession } from "@/hooks/useAdvancedFilters";
import { useTranslation } from "@/i18n/context";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useTheme } from "next-themes";
import { Chart, registerables, Filler } from "chart.js";
import {
  Clock,
  TrendingUp,
  Trophy,
  BarChart3,
  Lightbulb,
  Crown,
  Zap,
  Layers,
  Target,
  ShieldCheck,
  AlertTriangle,
  Star,
} from "lucide-react";

Chart.register(...registerables, Filler);

const SESSION_COLORS: Record<TradingSession, { bg: string; text: string; chart: string; chartBg: string }> = {
  Tokyo:      { bg: "bg-rose-500/15", text: "text-rose-400", chart: "#f43f5e", chartBg: "rgba(244,63,94,0.3)" },
  London:     { bg: "bg-blue-500/15", text: "text-blue-400", chart: "#3b82f6", chartBg: "rgba(59,130,246,0.3)" },
  "New York": { bg: "bg-emerald-500/15", text: "text-emerald-400", chart: "#10b981", chartBg: "rgba(16,185,129,0.3)" },
  Sydney:     { bg: "bg-purple-500/15", text: "text-purple-400", chart: "#a855f7", chartBg: "rgba(168,85,247,0.3)" },
};

const SESSIONS: TradingSession[] = ["Tokyo", "London", "New York", "Sydney"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface SessionStats {
  session: TradingSession;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

interface HourlyCell {
  pnl: number;
  count: number;
}

interface OverlapStats {
  label: string;
  fromH: number;
  toH: number;
  trades: number;
  wins: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

function computeSessionStats(
  trades: { date: string; result: number }[]
): SessionStats[] {
  const map: Record<TradingSession, { results: number[] }> = {
    Tokyo: { results: [] },
    London: { results: [] },
    "New York": { results: [] },
    Sydney: { results: [] },
  };

  for (const trade of trades) {
    const sessions = getTradingSession(trade.date);
    if (sessions.length === 0) continue;
    const primary = sessions[0];
    if (map[primary]) map[primary].results.push(trade.result);
  }

  return SESSIONS.map((session) => {
    const results = map[session].results;
    const wins = results.filter((r) => r > 0).length;
    const losses = results.filter((r) => r < 0).length;
    const total = results.reduce((a, b) => a + b, 0);
    const grossProfit = results.filter((r) => r > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(results.filter((r) => r < 0).reduce((a, b) => a + b, 0));
    return {
      session,
      trades: results.length,
      wins,
      losses,
      winRate: results.length > 0 ? (wins / results.length) * 100 : 0,
      totalPnl: total,
      avgPnl: results.length > 0 ? total / results.length : 0,
      bestTrade: results.length > 0 ? Math.max(...results) : 0,
      worstTrade: results.length > 0 ? Math.min(...results) : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    };
  });
}

function computeHeatmapDetailed(
  trades: { date: string; result: number }[]
): { grid: number[][]; counts: number[][] } {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));

  for (const trade of trades) {
    const d = new Date(trade.date);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue;
    const row = day - 1;
    const hour = d.getUTCHours();
    grid[row][hour] += trade.result;
    counts[row][hour] += 1;
  }

  return { grid, counts };
}

function computeOverlapStats(
  trades: { date: string; result: number }[]
): { londonNy: OverlapStats; tokyoLondon: OverlapStats; nonOverlap: { trades: number; winRate: number; avgPnl: number } } {
  const londonNyTrades: number[] = [];
  const tokyoLondonTrades: number[] = [];
  const nonOverlapTrades: number[] = [];

  for (const trade of trades) {
    const d = new Date(trade.date);
    const h = d.getUTCHours();
    // London/NY overlap: 13:00-16:00 UTC
    if (h >= 13 && h < 16) {
      londonNyTrades.push(trade.result);
    }
    // Tokyo/London overlap: 07:00-09:00 UTC
    else if (h >= 7 && h < 9) {
      tokyoLondonTrades.push(trade.result);
    } else {
      nonOverlapTrades.push(trade.result);
    }
  }

  const makeStats = (label: string, fromH: number, toH: number, results: number[]): OverlapStats => {
    const wins = results.filter((r) => r > 0).length;
    const total = results.reduce((a, b) => a + b, 0);
    return {
      label,
      fromH,
      toH,
      trades: results.length,
      wins,
      winRate: results.length > 0 ? (wins / results.length) * 100 : 0,
      avgPnl: results.length > 0 ? total / results.length : 0,
      totalPnl: total,
    };
  };

  const nonWins = nonOverlapTrades.filter((r) => r > 0).length;
  const nonTotal = nonOverlapTrades.reduce((a, b) => a + b, 0);

  return {
    londonNy: makeStats("London / New York", 13, 16, londonNyTrades),
    tokyoLondon: makeStats("Tokyo / London", 7, 9, tokyoLondonTrades),
    nonOverlap: {
      trades: nonOverlapTrades.length,
      winRate: nonOverlapTrades.length > 0 ? (nonWins / nonOverlapTrades.length) * 100 : 0,
      avgPnl: nonOverlapTrades.length > 0 ? nonTotal / nonOverlapTrades.length : 0,
    },
  };
}

function computeHourlyStats(trades: { date: string; result: number }[]): {
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}[] {
  const hourMap: { results: number[] }[] = Array.from({ length: 24 }, () => ({ results: [] }));

  for (const trade of trades) {
    const d = new Date(trade.date);
    const h = d.getUTCHours();
    hourMap[h].results.push(trade.result);
  }

  return hourMap.map((bucket, hour) => {
    const wins = bucket.results.filter((r) => r > 0).length;
    const total = bucket.results.reduce((a, b) => a + b, 0);
    return {
      hour,
      trades: bucket.results.length,
      wins,
      winRate: bucket.results.length > 0 ? (wins / bucket.results.length) * 100 : 0,
      totalPnl: total,
      avgPnl: bucket.results.length > 0 ? total / bucket.results.length : 0,
    };
  });
}

// ------- Chart components -------

function SessionPieChart({ stats }: { stats: SessionStats[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: stats.map((s) => s.session),
        datasets: [
          {
            data: stats.map((s) => s.trades),
            backgroundColor: stats.map((s) => SESSION_COLORS[s.session].chart),
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: theme === "dark" ? "#94a3b8" : "#64748b",
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [stats, theme]);

  return <canvas ref={canvasRef} />;
}

function SessionBarChart({ stats }: { stats: SessionStats[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: stats.map((s) => s.session),
        datasets: [
          {
            label: "P&L",
            data: stats.map((s) => s.totalPnl),
            backgroundColor: stats.map((s) =>
              s.totalPnl >= 0 ? "rgba(16,185,129,0.6)" : "rgba(244,63,94,0.6)"
            ),
            borderColor: stats.map((s) =>
              s.totalPnl >= 0 ? "#10b981" : "#f43f5e"
            ),
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor },
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [stats, theme]);

  return <canvas ref={canvasRef} />;
}

function HeatmapGrid({
  grid,
  counts,
  goldenHours,
}: {
  grid: number[][];
  counts: number[][];
  goldenHours: { day: number; hour: number }[];
}) {
  const { t } = useTranslation();

  const avgGrid = useMemo(() => {
    return grid.map((row, ri) =>
      row.map((val, ci) => (counts[ri][ci] > 0 ? val / counts[ri][ci] : 0))
    );
  }, [grid, counts]);

  const maxAbs = useMemo(() => {
    let m = 0;
    for (const row of avgGrid) for (const v of row) m = Math.max(m, Math.abs(v));
    return m || 1;
  }, [avgGrid]);

  const isGoldenHour = (day: number, hour: number) =>
    goldenHours.some((g) => g.day === day && g.hour === hour);

  const getColor = (val: number) => {
    if (val === 0) return "bg-[--bg-secondary]";
    if (val > 0) return "bg-emerald-500";
    return "bg-rose-500";
  };

  const getOpacity = (val: number) => {
    if (val === 0) return 0.1;
    return 0.15 + Math.min(Math.abs(val) / maxAbs, 1) * 0.75;
  };

  const dayLabels = [t("heatmapMon"), t("heatmapTue"), t("heatmapWed"), t("heatmapThu"), t("heatmapFri")];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Hour labels */}
        <div className="flex gap-[2px] mb-1 ml-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-[--text-muted]">
              {i.toString().padStart(2, "0")}
            </div>
          ))}
        </div>
        {/* Rows */}
        {avgGrid.map((row, ri) => (
          <div key={ri} className="flex items-center gap-[2px] mb-[2px]">
            <div className="w-12 text-[10px] text-[--text-muted] text-right pr-2 flex-shrink-0">
              {dayLabels[ri] || WEEKDAYS[ri]}
            </div>
            {row.map((val, ci) => {
              const golden = isGoldenHour(ri, ci);
              const tradeCount = counts[ri][ci];
              return (
                <div
                  key={ci}
                  className={`flex-1 h-7 rounded-[3px] ${getColor(val)} transition-all cursor-default relative group ${golden ? "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-[--bg-card]" : ""}`}
                  style={{ opacity: getOpacity(val) }}
                >
                  {golden && (
                    <div className="absolute -top-1 -right-1 z-10">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    </div>
                  )}
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20"
                    style={{
                      background: "var(--bg-card-solid)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <div className="font-medium">
                      {WEEKDAYS[ri]} {ci.toString().padStart(2, "0")}:00 UTC
                    </div>
                    <div className={val >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      P&L: {val >= 0 ? "+" : ""}{val.toFixed(2)}
                    </div>
                    <div className="text-[--text-muted]">
                      {t("heatmapTradeCount", { count: tradeCount })}
                    </div>
                    {golden && (
                      <div className="text-amber-400 flex items-center gap-1 mt-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400" /> {t("goldenHours")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {/* Session bands */}
        <div className="flex gap-[2px] mt-2 ml-12">
          {Array.from({ length: 24 }, (_, h) => {
            const sessions: string[] = [];
            if (h >= 0 && h < 9) sessions.push("Tokyo");
            if (h >= 7 && h < 16) sessions.push("London");
            if (h >= 13 && h < 22) sessions.push("NY");
            if (h >= 22 || h < 7) sessions.push("Syd");
            return (
              <div key={h} className="flex-1 text-center">
                {sessions.map((s) => (
                  <div
                    key={s}
                    className={`text-[7px] leading-tight font-medium ${
                      s === "Tokyo" ? "text-rose-400" :
                      s === "London" ? "text-blue-400" :
                      s === "NY" ? "text-emerald-400" :
                      "text-purple-400"
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------- Section: Session Performance Comparison -------

function SessionComparisonSection({ stats, bestSession }: { stats: SessionStats[]; bestSession: SessionStats | null }) {
  const { t } = useTranslation();

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-cyan-400" />
        {t("sessionComparison")}
      </h3>
      <p className="text-xs text-[--text-muted] mb-4">{t("sessionComparisonDesc")}</p>

      {/* Best session banner */}
      {bestSession && bestSession.trades >= 3 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm font-medium text-[--text-primary]">
            {t("bestSessionCrown", {
              session: bestSession.session,
              winRate: bestSession.winRate.toFixed(0),
            })}
          </p>
        </div>
      )}

      {/* Comparison grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const isBest = bestSession?.session === s.session && s.trades >= 3;
          return (
            <div
              key={s.session}
              className={`rounded-xl p-4 border transition-all ${
                isBest
                  ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                  : "border-[--border-subtle] bg-[--bg-secondary]"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SESSION_COLORS[s.session].chart }}
                />
                <span className="text-sm font-semibold text-[--text-primary]">{s.session}</span>
                {isBest && <Crown className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("tradesLabel")}</span>
                  <span className="font-medium text-[--text-primary]">{s.trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("winRateLabel")}</span>
                  <span className={`font-medium ${s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                    {s.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("avgPnlShort")}</span>
                  <span className={s.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("profitFactorLabel")}</span>
                  <span className={`font-medium ${s.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
                    {s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("bestTradeLabel")}</span>
                  <span className="text-emerald-400">
                    {s.bestTrade > 0 ? `+${s.bestTrade.toFixed(2)}` : "-"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------- Section: Hourly P&L Heatmap with golden hours -------

function HeatmapSection({
  grid,
  counts,
  goldenHours,
}: {
  grid: number[][];
  counts: number[][];
  goldenHours: { day: number; hour: number; avgPnl: number }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
        <Clock className="w-4 h-4 text-cyan-400" />
        {t("hourlyHeatmap")}
      </h3>
      <p className="text-xs text-[--text-muted] mb-4">{t("hourlyHeatmapDesc")}</p>

      <HeatmapGrid
        grid={grid}
        counts={counts}
        goldenHours={goldenHours.map((g) => ({ day: g.day, hour: g.hour }))}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-[--text-muted]">
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-rose-500 opacity-60" />
          <span>{t("lossLabel")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-gray-700 opacity-30" />
          <span>{t("noTrades")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-emerald-500 opacity-60" />
          <span>{t("profitLabel")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span>{t("goldenHours")}</span>
        </div>
      </div>

      {/* Golden hours detail */}
      {goldenHours.length > 0 && (
        <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-[--text-primary]">{t("goldenHours")}</span>
            <span className="text-[10px] text-[--text-muted]">- {t("goldenHoursDesc")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {goldenHours.map((g, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs"
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[--text-primary] font-medium">
                  {WEEKDAYS[g.day]} {g.hour.toString().padStart(2, "0")}h
                </span>
                <span className="text-emerald-400 font-semibold">
                  +{g.avgPnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------- Section: Session Overlap Analysis -------

function OverlapSection({
  overlapData,
}: {
  overlapData: ReturnType<typeof computeOverlapStats>;
}) {
  const { t } = useTranslation();

  const overlaps = [overlapData.londonNy, overlapData.tokyoLondon];
  const overlapTotalTrades = overlaps.reduce((a, o) => a + o.trades, 0);
  const overlapAvgWR =
    overlapTotalTrades > 0
      ? overlaps.reduce((a, o) => a + o.wins, 0) / overlapTotalTrades * 100
      : 0;
  const nonOverlapWR = overlapData.nonOverlap.winRate;

  const diff = overlapTotalTrades > 0 && overlapData.nonOverlap.trades > 0
    ? overlapAvgWR - nonOverlapWR
    : null;

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-400" />
        {t("sessionOverlapTitle")}
      </h3>
      <p className="text-xs text-[--text-muted] mb-4">{t("sessionOverlapDesc")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {overlaps.map((overlap) => (
          <div
            key={overlap.label}
            className="rounded-xl p-4 border border-[--border-subtle] bg-[--bg-secondary]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-[--text-primary]">{overlap.label}</span>
            </div>
            <p className="text-[10px] text-[--text-muted] mb-3">
              {t("overlapHours", { from: overlap.fromH.toString(), to: overlap.toH.toString() })}
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("tradesLabel")}</span>
                <span className="font-medium text-[--text-primary]">{overlap.trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("winRateLabel")}</span>
                <span className={`font-medium ${overlap.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                  {overlap.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("avgPnlShort")}</span>
                <span className={overlap.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {overlap.avgPnl >= 0 ? "+" : ""}{overlap.avgPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">P&L Total</span>
                <span className={`font-bold ${overlap.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {overlap.totalPnl >= 0 ? "+" : ""}{overlap.totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overlap vs Non-overlap comparison */}
      {diff !== null ? (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border ${
            diff >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
          }`}
        >
          {diff >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <p className="text-sm font-medium text-[--text-primary]">
            {diff >= 0
              ? t("overlapBetterPerf", { pct: Math.abs(diff).toFixed(1) })
              : t("overlapWorsePerf", { pct: Math.abs(diff).toFixed(1) })}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[--text-muted] italic">{t("overlapNoData")}</p>
      )}
    </div>
  );
}

// ------- Section: Recommended Trading Windows -------

function RecommendationsSection({
  hourlyStats,
  bestSession,
}: {
  hourlyStats: ReturnType<typeof computeHourlyStats>;
  bestSession: SessionStats | null;
}) {
  const { t } = useTranslation();

  const hoursWithTrades = hourlyStats.filter((h) => h.trades >= 2);

  if (hoursWithTrades.length < 3) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          {t("recommendedWindows")}
        </h3>
        <p className="text-xs text-[--text-muted] mb-4">{t("recommendedWindowsDesc")}</p>
        <p className="text-sm text-[--text-muted] italic">{t("noRecoAvailable")}</p>
      </div>
    );
  }

  // Sort by totalPnl to find best/worst hours
  const sorted = [...hoursWithTrades].sort((a, b) => b.totalPnl - a.totalPnl);
  const bestHours = sorted.slice(0, 3);
  const worstHours = sorted.filter((h) => h.winRate < 40 && h.trades >= 2).slice(0, 3);

  const formatHourRange = (hours: typeof bestHours) =>
    hours.map((h) => `${h.hour}h-${h.hour + 1}h`).join(", ");

  const recommendations: { icon: React.ReactNode; text: string; type: "positive" | "negative" | "neutral" }[] = [];

  if (bestHours.length > 0) {
    recommendations.push({
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      text: t("bestHoursReco", { hours: formatHourRange(bestHours) }),
      type: "positive",
    });
  }

  if (worstHours.length > 0) {
    const avgWR = worstHours.reduce((a, h) => a + h.winRate, 0) / worstHours.length;
    recommendations.push({
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      text: t("avoidHoursReco", {
        hours: formatHourRange(worstHours),
        wr: avgWR.toFixed(0),
      }),
      type: "negative",
    });
  }

  if (bestSession && bestSession.trades >= 3) {
    recommendations.push({
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      text: t("recommendedSessionReco", { session: bestSession.session }),
      type: "neutral",
    });
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
        <Target className="w-4 h-4 text-cyan-400" />
        {t("recommendedWindows")}
      </h3>
      <p className="text-xs text-[--text-muted] mb-4">{t("recommendedWindowsDesc")}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {recommendations.map((reco, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 border flex items-start gap-3 ${
              reco.type === "positive"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : reco.type === "negative"
                ? "border-rose-500/20 bg-rose-500/5"
                : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">{reco.icon}</div>
            <p className="text-sm font-medium text-[--text-primary]">{reco.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------- Main page -------

export default function SessionsPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { theme } = useTheme();

  const stats = useMemo(() => computeSessionStats(trades), [trades]);

  const { grid: heatmapGrid, counts: heatmapCounts } = useMemo(
    () => computeHeatmapDetailed(trades),
    [trades]
  );

  const overlapData = useMemo(() => computeOverlapStats(trades), [trades]);
  const hourlyStats = useMemo(() => computeHourlyStats(trades), [trades]);

  const bestSession = useMemo(() => {
    const withTrades = stats.filter((s) => s.trades > 0);
    if (withTrades.length === 0) return null;
    return withTrades.reduce((best, s) => (s.winRate > best.winRate ? s : best));
  }, [stats]);

  // Golden hours: top 3 most profitable hour/day combos with at least 1 trade
  const goldenHours = useMemo(() => {
    const cells: { day: number; hour: number; avgPnl: number }[] = [];
    for (let d = 0; d < 5; d++) {
      for (let h = 0; h < 24; h++) {
        if (heatmapCounts[d][h] > 0) {
          cells.push({
            day: d,
            hour: h,
            avgPnl: heatmapGrid[d][h] / heatmapCounts[d][h],
          });
        }
      }
    }
    cells.sort((a, b) => b.avgPnl - a.avgPnl);
    return cells.slice(0, 3).filter((c) => c.avgPnl > 0);
  }, [heatmapGrid, heatmapCounts]);

  if (loading) return <AnalyticsSkeleton />;

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Clock className="w-12 h-12 text-[--text-muted]" />
        <h2 className="text-xl font-semibold text-[--text-primary]">{t("sessionAnalysis")}</h2>
        <p className="text-sm text-[--text-muted]">{t("addTradesToSee")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
          <Clock className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--text-primary]">{t("sessionAnalysis")}</h1>
          <p className="text-sm text-[--text-muted]">{t("sessionAnalysisDesc")}</p>
        </div>
      </div>

      {/* Recommendation card */}
      {bestSession && bestSession.trades >= 3 && (
        <div className="glass rounded-2xl p-4 border border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[--text-primary]">
                {t("bestSessionReco", {
                  session: bestSession.session,
                  winRate: bestSession.winRate.toFixed(0),
                })}
              </p>
              <p className="text-xs text-[--text-muted] mt-1">
                {t("bestSessionRecoDetail", {
                  count: bestSession.trades,
                  pnl:
                    bestSession.totalPnl >= 0
                      ? `+${bestSession.totalPnl.toFixed(2)}`
                      : bestSession.totalPnl.toFixed(2),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Session Performance Comparison */}
      <SessionComparisonSection stats={stats} bestSession={bestSession} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            {t("tradeDistribution")}
          </h3>
          <div className="h-64">
            <SessionPieChart stats={stats} />
          </div>
        </div>

        {/* Bar chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            {t("pnlBySession")}
          </h3>
          <div className="h-64">
            <SessionBarChart stats={stats} />
          </div>
        </div>
      </div>

      {/* Detailed table */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-cyan-400" />
          {t("sessionDetails")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-muted] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("sessionLabel")}</th>
                <th className="pb-3 font-medium">{t("tradeCount")}</th>
                <th className="pb-3 font-medium">{t("winRateLabel")}</th>
                <th className="pb-3 font-medium">{t("avgPnlLabel")}</th>
                <th className="pb-3 font-medium">{t("totalPnlLabel")}</th>
                <th className="pb-3 font-medium">{t("profitFactorLabel")}</th>
                <th className="pb-3 font-medium">{t("bestTradeLabel")}</th>
                <th className="pb-3 font-medium">{t("worstTradeLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.session} className="border-b border-[--border-subtle]">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SESSION_COLORS[s.session].chart }}
                      />
                      <span className="font-medium text-[--text-primary]">{s.session}</span>
                      {bestSession?.session === s.session && s.trades >= 3 && (
                        <Crown className="w-3 h-3 text-amber-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-[--text-secondary]">{s.trades}</td>
                  <td className="py-3">
                    <span className={`font-medium ${s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={s.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`font-bold ${s.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`font-medium ${s.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-emerald-400">
                    {s.bestTrade > 0 ? `+${s.bestTrade.toFixed(2)}` : "-"}
                  </td>
                  <td className="py-3 text-rose-400">
                    {s.worstTrade < 0 ? s.worstTrade.toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Hourly P&L Heatmap */}
      <HeatmapSection
        grid={heatmapGrid}
        counts={heatmapCounts}
        goldenHours={goldenHours}
      />

      {/* 3. Session Overlap Analysis */}
      <OverlapSection overlapData={overlapData} />

      {/* 4. Recommended Trading Windows */}
      <RecommendationsSection hourlyStats={hourlyStats} bestSession={bestSession} />
    </div>
  );
}
