"use client";

import { useMemo, useEffect, useRef } from "react";
import { useTrades } from "@/hooks/useTrades";
import { getTradingSession, type TradingSession } from "@/hooks/useAdvancedFilters";
import { useTranslation } from "@/i18n/context";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { useTheme } from "next-themes";
import { Chart, registerables, Filler } from "chart.js";
import { Clock, TrendingUp, Trophy, BarChart3, Lightbulb } from "lucide-react";

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
    // Assign to primary session
    const primary = sessions[0];
    if (map[primary]) map[primary].results.push(trade.result);
  }

  return SESSIONS.map((session) => {
    const results = map[session].results;
    const wins = results.filter((r) => r > 0).length;
    const losses = results.filter((r) => r < 0).length;
    const total = results.reduce((a, b) => a + b, 0);
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
    };
  });
}

function computeHeatmap(trades: { date: string; result: number }[]): number[][] {
  // 5 rows (weekdays Mon-Fri), 24 columns (hours 0-23)
  const grid: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));

  for (const trade of trades) {
    const d = new Date(trade.date);
    const day = d.getUTCDay(); // 0=Sun, 1=Mon...6=Sat
    if (day === 0 || day === 6) continue; // skip weekends
    const row = day - 1; // Mon=0, Tue=1, ...
    const hour = d.getUTCHours();
    grid[row][hour] += trade.result;
    counts[row][hour] += 1;
  }

  // Return average P&L per cell
  return grid.map((row, ri) =>
    row.map((val, ci) => (counts[ri][ci] > 0 ? val / counts[ri][ci] : 0))
  );
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

function HeatmapGrid({ data }: { data: number[][] }) {
  const { t } = useTranslation();
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const row of data) for (const v of row) m = Math.max(m, Math.abs(v));
    return m || 1;
  }, [data]);

  const getColor = (val: number) => {
    if (val === 0) return "bg-[--bg-secondary]";
    const intensity = Math.min(Math.abs(val) / maxAbs, 1);
    if (val > 0) {
      const alpha = (0.15 + intensity * 0.7).toFixed(2);
      return `bg-emerald-500`;
    }
    return `bg-rose-500`;
  };

  const getOpacity = (val: number) => {
    if (val === 0) return 0.1;
    return 0.15 + (Math.min(Math.abs(val) / maxAbs, 1)) * 0.75;
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
        {data.map((row, ri) => (
          <div key={ri} className="flex items-center gap-[2px] mb-[2px]">
            <div className="w-12 text-[10px] text-[--text-muted] text-right pr-2 flex-shrink-0">
              {dayLabels[ri] || WEEKDAYS[ri]}
            </div>
            {row.map((val, ci) => (
              <div
                key={ci}
                className={`flex-1 h-7 rounded-[3px] ${getColor(val)} transition-all cursor-default relative group`}
                style={{ opacity: getOpacity(val) }}
                title={`${WEEKDAYS[ri]} ${ci}:00 UTC — ${val >= 0 ? "+" : ""}${val.toFixed(1)}`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10" style={{ background: "var(--bg-card-solid)", color: "var(--text-primary)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {val >= 0 ? "+" : ""}{val.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        ))}
        {/* Session bands */}
        <div className="flex gap-[2px] mt-2 ml-12">
          {Array.from({ length: 24 }, (_, h) => {
            const sessions = [];
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

// ------- Main page -------

export default function SessionsPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { theme } = useTheme();

  const stats = useMemo(() => computeSessionStats(trades), [trades]);
  const heatmapData = useMemo(() => computeHeatmap(trades), [trades]);

  const bestSession = useMemo(() => {
    const withTrades = stats.filter((s) => s.trades > 0);
    if (withTrades.length === 0) return null;
    return withTrades.reduce((best, s) => (s.winRate > best.winRate ? s : best));
  }, [stats]);

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
                  pnl: bestSession.totalPnl >= 0 ? `+${bestSession.totalPnl.toFixed(2)}` : bestSession.totalPnl.toFixed(2),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.session} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${SESSION_COLORS[s.session].bg.replace("/15", "")} ${s.trades > 0 ? "" : "opacity-30"}`}
                style={{ backgroundColor: SESSION_COLORS[s.session].chart }}
              />
              <span className="text-sm font-semibold text-[--text-primary]">{s.session}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("tradeCount")}</span>
                <span className="font-medium text-[--text-primary]">{s.trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("winRateLabel")}</span>
                <span className={`font-medium ${s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">P&L</span>
                <span className={`font-bold ${s.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

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

      {/* Heatmap */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          {t("hourlyHeatmap")}
        </h3>
        <p className="text-xs text-[--text-muted] mb-4">{t("hourlyHeatmapDesc")}</p>
        <HeatmapGrid data={heatmapData} />
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
        </div>
      </div>
    </div>
  );
}
