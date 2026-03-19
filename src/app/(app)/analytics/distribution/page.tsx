"use client";

import { useTrades } from "@/hooks/useTrades";
import { useMemo, useState } from "react";
import { computeHourlyDistribution, computeDayDistribution, computeSessionDistribution, type Trade } from "@/lib/advancedStats";
import { Clock, Calendar, Globe2, Crosshair, Grid3X3 } from "lucide-react";

function BarChart({ data, labelKey, valueKey, colorFn }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string; colorFn: (v: number) => string }) {
  const maxVal = Math.max(...data.map((d) => Math.abs(d[valueKey] as number)), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const val = d[valueKey] as number;
        const pct = (Math.abs(val) / maxVal) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-medium w-20 text-right" style={{ color: "var(--text-secondary)" }}>
              {String(d[labelKey])}
            </span>
            <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: "var(--bg-hover)" }}>
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{ width: `${pct}%`, background: colorFn(val) }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold mono" style={{ color: "var(--text-primary)" }}>
                {val >= 0 ? "+" : ""}{val.toFixed(2)}€
              </span>
            </div>
            <span className="text-xs mono w-12 text-right" style={{ color: val >= 0 ? "#10b981" : "#ef4444" }}>
              {(d as Record<string, unknown>)["winRate"] !== undefined ? `${(d["winRate"] as number).toFixed(0)}%` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const HEATMAP_DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const HEATMAP_DAY_INDICES = [1, 2, 3, 4, 5]; // Mon=1 ... Fri=5

interface HeatmapCell {
  hour: number;
  day: number;
  dayLabel: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
}

function computeHourDayHeatmap(trades: Trade[]): { cells: HeatmapCell[][]; maxPnl: number; bestCell: HeatmapCell | null } {
  // cells[hour][dayIndex] where dayIndex 0=Mon, 1=Tue...4=Fri
  const grid: Record<string, { pnl: number; trades: number; wins: number }> = {};
  for (let h = 0; h < 24; h++) {
    for (let di = 0; di < 5; di++) {
      grid[`${h}-${di}`] = { pnl: 0, trades: 0, wins: 0 };
    }
  }

  trades.forEach((t) => {
    const d = new Date(t.date);
    const h = d.getHours();
    const dow = d.getDay(); // 0=Sun, 1=Mon...6=Sat
    if (dow < 1 || dow > 5) return; // skip weekends
    const di = dow - 1; // convert to 0-based Mon index
    const key = `${h}-${di}`;
    grid[key].pnl += t.result;
    grid[key].trades++;
    if (t.result > 0) grid[key].wins++;
  });

  let maxPnl = 0;
  let bestCell: HeatmapCell | null = null;

  const cells: HeatmapCell[][] = [];
  for (let h = 0; h < 24; h++) {
    const row: HeatmapCell[] = [];
    for (let di = 0; di < 5; di++) {
      const key = `${h}-${di}`;
      const g = grid[key];
      const cell: HeatmapCell = {
        hour: h,
        day: HEATMAP_DAY_INDICES[di],
        dayLabel: HEATMAP_DAYS_FR[di],
        pnl: g.pnl,
        trades: g.trades,
        wins: g.wins,
        winRate: g.trades > 0 ? (g.wins / g.trades) * 100 : 0,
      };
      row.push(cell);
      if (Math.abs(g.pnl) > maxPnl) maxPnl = Math.abs(g.pnl);
      if (g.trades > 0 && (bestCell === null || g.pnl > bestCell.pnl)) bestCell = cell;
    }
    cells.push(row);
  }

  return { cells, maxPnl, bestCell };
}

function getHeatmapColor(pnl: number, maxPnl: number): string {
  if (maxPnl === 0) return "rgba(107, 114, 128, 0.15)";
  const intensity = Math.min(Math.abs(pnl) / maxPnl, 1);
  if (pnl === 0) return "rgba(107, 114, 128, 0.15)";
  if (pnl > 0) {
    // green gradient: from subtle to vivid
    const alpha = 0.15 + intensity * 0.75;
    return `rgba(16, 185, 129, ${alpha})`;
  }
  // red gradient
  const alpha = 0.15 + intensity * 0.75;
  return `rgba(239, 68, 68, ${alpha})`;
}

export default function DistributionPage() {
  const { trades, loading } = useTrades();

  const hourly = useMemo(() => computeHourlyDistribution(trades as unknown as Trade[]), [trades]);
  const daily = useMemo(() => computeDayDistribution(trades as unknown as Trade[]), [trades]);
  const sessions = useMemo(() => computeSessionDistribution(trades as unknown as Trade[]), [trades]);

  const heatmapData = useMemo(() => computeHourDayHeatmap(trades as unknown as Trade[]), [trades]);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const colorFn = (v: number) => v >= 0 ? "#10b981" : "#ef4444";

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />)}
        </div>
      </div>
    );
  }

  // Find best/worst hour and day
  const activeHours = hourly.filter((h) => h.trades > 0);
  const bestHour = activeHours.sort((a, b) => b.pnl - a.pnl)[0];
  const worstHour = activeHours.sort((a, b) => a.pnl - b.pnl)[0];
  const activeDays = daily.filter((d) => d.trades > 0);
  const bestDay = activeDays.sort((a, b) => b.pnl - a.pnl)[0];
  const bestSession = [...sessions].sort((a, b) => b.pnl - a.pnl)[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Distribution des Trades</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Analysez quand vous tradez le mieux — par heure, jour et session.
        </p>
      </div>

      {/* Insights cards */}
      {trades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bestHour && (
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Meilleure heure</span>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "#10b981" }}>{bestHour.hour}h00</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                +{bestHour.pnl.toFixed(2)}€ • {bestHour.winRate.toFixed(0)}% WR • {bestHour.trades} trades
              </div>
            </div>
          )}
          {bestDay && (
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Meilleur jour</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "#10b981" }}>{bestDay.dayName}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                +{bestDay.pnl.toFixed(2)}€ • {bestDay.winRate.toFixed(0)}% WR • {bestDay.trades} trades
              </div>
            </div>
          )}
          {bestSession && bestSession.trades > 0 && (
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Meilleure session</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: bestSession.color }}>{bestSession.session}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {bestSession.pnl >= 0 ? "+" : ""}{bestSession.pnl.toFixed(2)}€ • {bestSession.winRate.toFixed(0)}% WR
              </div>
            </div>
          )}
          {heatmapData.bestCell && (
            <div className="metric-card rounded-2xl p-5" style={{ borderLeft: "3px solid #f59e0b" }}>
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Meilleure Fen&ecirc;tre</span>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "#10b981" }}>
                {heatmapData.bestCell.dayLabel} {heatmapData.bestCell.hour}h
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                +{heatmapData.bestCell.pnl.toFixed(2)}€ • {heatmapData.bestCell.winRate.toFixed(0)}% WR • {heatmapData.bestCell.trades} trades
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Distribution */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Globe2 className="w-5 h-5 text-cyan-400" /> Performance par Session Forex
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sessions.map((s) => (
            <div key={s.session} className="rounded-xl p-4 text-center relative" style={{ background: "var(--bg-hover)" }}>
              {s.trades > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: s.color, color: "#fff" }}
                >
                  {s.trades}
                </span>
              )}
              <div className="text-sm font-bold mb-1" style={{ color: s.color }}>{s.session}</div>
              <div className="text-xl font-bold mono" style={{ color: s.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                {s.pnl >= 0 ? "+" : ""}{s.pnl.toFixed(2)}€
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {s.trades} trades • {s.winRate.toFixed(0)}% WR
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Clock className="w-5 h-5 text-cyan-400" /> P&L par Heure
        </h3>
        {trades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade pour analyser.</p>
        ) : (
          <div className="flex items-end gap-[2px] h-48">
            {hourly.map((h) => {
              const maxPnl = Math.max(...hourly.map((x) => Math.abs(x.pnl)), 1);
              const pct = (Math.abs(h.pnl) / maxPnl) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full rounded-t transition-all cursor-default hover:opacity-80"
                    style={{ height: `${Math.max(pct, 2)}%`, background: h.pnl >= 0 ? "#10b981" : "#ef4444" }}
                    title={`${h.hour}h: ${h.pnl >= 0 ? "+" : ""}${h.pnl.toFixed(2)}€ (${h.trades} trades, ${h.winRate.toFixed(0)}% WR)`}
                  />
                  <span className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day of Week Distribution */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calendar className="w-5 h-5 text-cyan-400" /> P&L par Jour de la Semaine
        </h3>
        {trades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade pour analyser.</p>
        ) : (
          <BarChart
            data={daily.filter((d) => d.day >= 1 && d.day <= 5) as unknown as Record<string, unknown>[]}
            labelKey="dayName"
            valueKey="pnl"
            colorFn={colorFn}
          />
        )}
      </div>

      {/* Hour × Day Heatmap */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Grid3X3 className="w-5 h-5 text-cyan-400" /> Heatmap Heure &times; Jour
        </h3>
        {trades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade pour analyser.</p>
        ) : (
          <div>
            {/* Tooltip on hover */}
            {hoveredCell && (
              <div
                className="mb-3 rounded-lg px-3 py-2 text-xs inline-flex items-center gap-3"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
              >
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {hoveredCell.dayLabel} {hoveredCell.hour}h00
                </span>
                <span style={{ color: hoveredCell.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                  {hoveredCell.pnl >= 0 ? "+" : ""}{hoveredCell.pnl.toFixed(2)}€
                </span>
                <span>{hoveredCell.trades} trade{hoveredCell.trades > 1 ? "s" : ""}</span>
                {hoveredCell.trades > 0 && <span>{hoveredCell.winRate.toFixed(0)}% WR</span>}
              </div>
            )}

            {/* Grid */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: "400px" }}>
                {/* Day headers */}
                <div className="flex">
                  <div className="w-12 shrink-0" />
                  {HEATMAP_DAYS_FR.map((day) => (
                    <div key={day} className="flex-1 text-center text-xs font-semibold pb-2" style={{ color: "var(--text-secondary)" }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Hour rows */}
                {heatmapData.cells.map((row, hourIdx) => {
                  const hasData = row.some((c) => c.trades > 0);
                  return (
                    <div key={hourIdx} className="flex" style={{ marginBottom: "2px" }}>
                      <div
                        className="w-12 shrink-0 text-right pr-2 text-[11px] flex items-center justify-end"
                        style={{ color: "var(--text-muted)", height: "28px" }}
                      >
                        {hourIdx}h
                      </div>
                      {row.map((cell, di) => (
                        <div
                          key={di}
                          className="flex-1 flex items-center justify-center rounded-sm cursor-default transition-all hover:ring-1 hover:ring-white/20"
                          style={{
                            height: "28px",
                            margin: "0 1px",
                            background: cell.trades > 0 ? getHeatmapColor(cell.pnl, heatmapData.maxPnl) : "rgba(107, 114, 128, 0.08)",
                          }}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {cell.trades > 0 && (
                            <span
                              className="text-[10px] font-bold mono"
                              style={{
                                color: cell.pnl >= 0 ? "#10b981" : "#ef4444",
                                opacity: hasData ? 1 : 0.5,
                              }}
                            >
                              {cell.pnl >= 0 ? "+" : ""}{cell.pnl.toFixed(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span>Perte</span>
              <div className="flex gap-[2px]">
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.9)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.55)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(239, 68, 68, 0.25)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(107, 114, 128, 0.15)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.25)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.55)" }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.9)" }} />
              </div>
              <span>Profit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
