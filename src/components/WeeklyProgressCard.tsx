"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

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

function getNetPnl(t: Trade): number {
  return t.result - Math.abs(t.commission || 0) - Math.abs(t.swap || 0);
}

interface WeekStats {
  trades: number;
  winRate: number;
  pnl: number;
}

function computeWeekStats(trades: Trade[], start: Date, end: Date): WeekStats {
  const filtered = trades.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
  const total = filtered.length;
  const wins = filtered.filter((t) => getNetPnl(t) > 0).length;
  const pnl = filtered.reduce((s, t) => s + getNetPnl(t), 0);
  return {
    trades: total,
    winRate: total > 0 ? (wins / total) * 100 : 0,
    pnl,
  };
}

/* ═══════════════════════════════════════════════════════════
   SVG Sparkline (4-week P&L trend)
   ═══════════════════════════════════════════════════════════ */

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const W = 120;
  const H = 32;
  const PX = 4;
  const PY = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => ({
    x: PX + (i / (values.length - 1)) * (W - PX * 2),
    y: PY + (1 - (v - min) / range) * (H - PY * 2),
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const lastVal = values[values.length - 1];
  const trend = lastVal >= values[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] h-8" preserveAspectRatio="xMidYMid meet">
      {/* Zero line if applicable */}
      {min < 0 && max > 0 && (
        <line
          x1={PX}
          y1={PY + (1 - (0 - min) / range) * (H - PY * 2)}
          x2={W - PX}
          y2={PY + (1 - (0 - min) / range) * (H - PY * 2)}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="2 2"
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={trend ? "#10b981" : "#ef4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill={trend ? "#10b981" : "#ef4444"}
          stroke="var(--bg-primary)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Delta Row
   ═══════════════════════════════════════════════════════════ */

function DeltaRow({
  label,
  current,
  previous,
  format,
  higherIsBetter = true,
}: {
  label: string;
  current: number;
  previous: number;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const diff = current - previous;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 0.01;

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-[--text-muted]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs mono font-medium">{format(current)}</span>
        {!neutral && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              improved ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {improved ? (
              <ArrowUp className="w-2.5 h-2.5" />
            ) : (
              <ArrowDown className="w-2.5 h-2.5" />
            )}
            {label === "P&L"
              ? `${Math.abs(diff).toFixed(2)}\u20AC`
              : label === "Win Rate"
              ? `${Math.abs(diff).toFixed(1)}pp`
              : String(Math.abs(diff))}
          </span>
        )}
        {neutral && (
          <span className="text-[10px] text-[--text-muted]">=</span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export default function WeeklyProgressCard({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const weeks: { start: Date; end: Date; stats: WeekStats }[] = [];

    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const range = getWeekRange(d);
      weeks.unshift({
        start: range.start,
        end: range.end,
        stats: computeWeekStats(trades, range.start, range.end),
      });
    }

    const thisWeek = weeks[3].stats;
    const lastWeek = weeks[2].stats;
    const pnlValues = weeks.map((w) => w.stats.pnl);

    // Trend badge
    const recentPnls = weeks.map((w) => w.stats.pnl);
    const trend3 = recentPnls.slice(1); // last 3 including current
    const improving =
      trend3.length >= 2 &&
      trend3[trend3.length - 1] > trend3[0] &&
      thisWeek.pnl > lastWeek.pnl;
    const regressing =
      trend3.length >= 2 &&
      trend3[trend3.length - 1] < trend3[0] &&
      thisWeek.pnl < lastWeek.pnl;

    let badge: { label: string; color: string; bg: string };
    if (improving) {
      badge = {
        label: "En am\u00E9lioration",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
      };
    } else if (regressing) {
      badge = {
        label: "En r\u00E9gression",
        color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
      };
    } else {
      badge = {
        label: "Stable",
        color: "text-[--text-secondary]",
        bg: "bg-white/5 border-white/10",
      };
    }

    // Week labels for sparkline tooltip
    const weekLabels = weeks.map((w) =>
      `S${getISOWeekNumber(w.start)}`
    );

    return { thisWeek, lastWeek, pnlValues, badge, weekLabels };
  }, [trades]);

  const { thisWeek, lastWeek, pnlValues, badge } = data;

  return (
    <div className="metric-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold text-sm flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Progression hebdomadaire
        </h3>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Comparison rows */}
      <div className="space-y-0.5">
        <DeltaRow
          label="Trades"
          current={thisWeek.trades}
          previous={lastWeek.trades}
          format={(v) => String(v)}
        />
        <DeltaRow
          label="Win Rate"
          current={thisWeek.winRate}
          previous={lastWeek.winRate}
          format={(v) => `${v.toFixed(1)}%`}
        />
        <DeltaRow
          label="P&L"
          current={thisWeek.pnl}
          previous={lastWeek.pnl}
          format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}\u20AC`}
        />
      </div>

      {/* Sparkline */}
      <div className="mt-3 pt-3 border-t border-[--border-subtle] flex items-center justify-between">
        <span className="text-[10px] text-[--text-muted]">P&L 4 semaines</span>
        <Sparkline values={pnlValues} />
      </div>
    </div>
  );
}

/* ISO week number helper */
function getISOWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}
