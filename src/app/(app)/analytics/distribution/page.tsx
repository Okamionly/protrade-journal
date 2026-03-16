"use client";

import { useTrades } from "@/hooks/useTrades";
import { useMemo } from "react";
import { computeHourlyDistribution, computeDayDistribution, computeSessionDistribution, type Trade } from "@/lib/advancedStats";
import { Clock, Calendar, Globe2 } from "lucide-react";

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

export default function DistributionPage() {
  const { trades, loading } = useTrades();

  const hourly = useMemo(() => computeHourlyDistribution(trades as unknown as Trade[]), [trades]);
  const daily = useMemo(() => computeDayDistribution(trades as unknown as Trade[]), [trades]);
  const sessions = useMemo(() => computeSessionDistribution(trades as unknown as Trade[]), [trades]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      )}

      {/* Session Distribution */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Globe2 className="w-5 h-5 text-cyan-400" /> Performance par Session Forex
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sessions.map((s) => (
            <div key={s.session} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
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
    </div>
  );
}
