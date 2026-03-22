"use client";

import { useTrades } from "@/hooks/useTrades";
import { Flame } from "lucide-react";
import { useTranslation } from "@/i18n/context";
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value: number, max: number): string {
  if (value === 0) return "bg-[--bg-secondary]/50";
  const intensity = Math.min(Math.abs(value) / Math.max(max, 1), 1);
  if (value > 0) {
    if (intensity > 0.7) return "bg-emerald-500";
    if (intensity > 0.4) return "bg-emerald-500/60";
    return "bg-emerald-500/30";
  }
  if (intensity > 0.7) return "bg-rose-500";
  if (intensity > 0.4) return "bg-rose-500/60";
  return "bg-rose-500/30";
}

export default function HeatmapPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  const DAYS_FR = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
  const MONTHS_FR = [t("monthJanShort"), t("monthFebShort"), t("monthMarShort"), t("monthAprShort"), t("monthMayShort"), t("monthJunShort"), t("monthJulShort"), t("monthAugShort"), t("monthSepShort"), t("monthOctShort"), t("monthNovShort"), t("monthDecShort")];

  if (loading) return <div className="flex items-center justify-center h-64 text-[--text-secondary]">{t("loading")}</div>;

  // Calendar heatmap - last 365 days
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const dailyPnL: Record<string, number> = {};
  const dailyCount: Record<string, number> = {};
  trades.forEach((t) => {
    const d = new Date(t.date).toISOString().slice(0, 10);
    dailyPnL[d] = (dailyPnL[d] || 0) + t.result;
    dailyCount[d] = (dailyCount[d] || 0) + 1;
  });

  const maxPnL = Math.max(...Object.values(dailyPnL).map(Math.abs), 1);

  // Generate weeks for GitHub-style calendar
  const weeks: { date: Date; pnl: number; count: number }[][] = [];
  let currentWeek: { date: Date; pnl: number; count: number }[] = [];
  const d = new Date(yearAgo);
  d.setDate(d.getDate() - d.getDay()); // Start on Sunday

  while (d <= today) {
    const key = d.toISOString().slice(0, 10);
    currentWeek.push({ date: new Date(d), pnl: dailyPnL[key] || 0, count: dailyCount[key] || 0 });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // Hour heatmap
  const hourPnL: Record<number, number> = {};
  const hourCount: Record<number, number> = {};
  trades.forEach((t) => {
    const h = new Date(t.date).getHours();
    hourPnL[h] = (hourPnL[h] || 0) + t.result;
    hourCount[h] = (hourCount[h] || 0) + 1;
  });
  const maxHourPnL = Math.max(...Object.values(hourPnL).map(Math.abs), 1);

  // Day of week heatmap
  const dayPnL: Record<number, number> = {};
  const dayCount: Record<number, number> = {};
  trades.forEach((t) => {
    const dow = new Date(t.date).getDay();
    dayPnL[dow] = (dayPnL[dow] || 0) + t.result;
    dayCount[dow] = (dayCount[dow] || 0) + 1;
  });
  const maxDayPnL = Math.max(...Object.values(dayPnL).map(Math.abs), 1);

  // Monthly breakdown
  const monthPnL: Record<string, number> = {};
  trades.forEach((t) => {
    const key = new Date(t.date).toISOString().slice(0, 7);
    monthPnL[key] = (monthPnL[key] || 0) + t.result;
  });
  const sortedMonths = Object.entries(monthPnL).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const maxMonthPnL = Math.max(...sortedMonths.map(([, v]) => Math.abs(v)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-400" />
          Performance Heatmap
        </h1>
        <p className="text-sm text-[--text-secondary] mt-1">Visualise tes patterns de trading</p>
      </div>

      {/* GitHub-style calendar */}
      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="font-semibold mb-4">{t("annualCalendar")}</h3>
        <div className="flex gap-[3px] min-w-[700px]">
          <div className="flex flex-col gap-[3px] mr-1">
            {DAYS_FR.map((d, i) => (
              <div key={i} className="h-[14px] text-[9px] text-[--text-muted] flex items-center">{i % 2 === 1 ? d : ""}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div key={di}
                  className={`w-[14px] h-[14px] rounded-sm ${getColor(day.pnl, maxPnL)} transition hover:brightness-125 outline-offset-1 hover:outline hover:outline-1 hover:outline-white/40 cursor-pointer`}
                  title={`${day.date.toLocaleDateString("fr-FR")}: ${day.pnl > 0 ? "+" : ""}€${day.pnl.toFixed(0)} (${day.count} trades)`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-[--text-muted]">
          <span>{t("lessLabel")}</span>
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <div className="w-3 h-3 rounded-sm bg-rose-500/40" />
          <div className="w-3 h-3 rounded-sm bg-[--bg-secondary]/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/40" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>{t("moreLabel")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hour heatmap */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">{t("perfByHourHeatmap")}</h3>
          <div className="grid grid-cols-12 gap-1">
            {HOURS.map((h) => (
              <div key={h} className="flex flex-col items-center">
                <div
                  className={`w-full aspect-square rounded ${getColor(hourPnL[h] || 0, maxHourPnL)} transition`}
                  title={`${h}h: ${(hourPnL[h] || 0) > 0 ? "+" : ""}€${(hourPnL[h] || 0).toFixed(0)} (${hourCount[h] || 0} trades)`}
                />
                <span className="text-[9px] text-[--text-muted] mt-1">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day of week */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">{t("perfByDayHeatmap")}</h3>
          <div className="space-y-2">
            {DAYS_FR.map((name, i) => {
              const pnl = dayPnL[i] || 0;
              const count = dayCount[i] || 0;
              const width = maxDayPnL > 0 ? (Math.abs(pnl) / maxDayPnL) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-[--text-secondary] w-8">{name}</span>
                  <div className="flex-1 h-7 bg-[--bg-secondary]/30 rounded-lg overflow-hidden relative">
                    <div className={`h-full rounded-lg ${pnl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"}`} style={{ width: `${width}%` }} />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnl > 0 ? "+" : ""}€{pnl.toFixed(0)} ({count})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly bars */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-4">{t("monthlyPnl")}</h3>
        <div className="flex items-end gap-2 h-40">
          {sortedMonths.map(([month, pnl]) => {
            const height = (Math.abs(pnl) / maxMonthPnL) * 100;
            const [y, m] = month.split("-");
            return (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: "120px" }}>
                  <div className={`w-full rounded-t-lg ${pnl >= 0 ? "bg-emerald-500/60" : "bg-rose-500/60"} transition hover:opacity-80`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${MONTHS_FR[parseInt(m) - 1]} ${y}: ${pnl > 0 ? "+" : ""}€${pnl.toFixed(0)}`} />
                </div>
                <span className="text-[10px] text-[--text-muted] mt-1">{MONTHS_FR[parseInt(m) - 1]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
