"use client";

import { useState, useEffect, useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Clock,
  Calendar, Target, Shield, Zap, BarChart3, Award,
  Activity, Gauge, Scale, ArrowDownRight, ArrowUpRight, Timer,
  Grid3X3, Heart, Crosshair, Flame,
  Lock, Crown, Check,
  ShieldAlert, Eye, ListChecks, CircleGauge,
  ThumbsUp, ThumbsDown, Star, Ban, Info, ChevronRight,
} from "lucide-react";

const DAY_KEYS = ["daySunday", "dayMonday", "dayTuesday", "dayWednesday", "dayThursday", "dayFriday", "daySaturday"] as const;
const DAY_SHORT_KEYS = ["dayShortSun", "dayShortMon", "dayShortTue", "dayShortWed", "dayShortThu", "dayShortFri", "dayShortSat"] as const;

function bestWorst(map: Record<string, { wins: number; total: number }>) {
  const entries = Object.entries(map).filter(([, v]) => v.total > 0);
  if (!entries.length) return { best: null, worst: null };
  const sorted = entries.map(([k, v]) => ({ key: k, wr: v.total > 0 ? (v.wins / v.total) * 100 : 0, ...v }))
    .sort((a, b) => b.wr - a.wr);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function Bar({ value, max, label, compact }: { value: number; max: number; label: string; compact?: boolean }) {
  const pct = max > 0 ? Math.abs(value) / max : 0;
  const positive = value >= 0;
  const showValue = value !== 0;
  return (
    <div className={`flex flex-col items-center gap-0.5 flex-1 ${compact ? "min-w-[12px]" : "min-w-[28px]"}`}>
      <div className={`w-full ${compact ? "h-16" : "h-20"} rounded relative overflow-hidden group`} style={{ background: "var(--bg-hover)" }}>
        <div
          className={`absolute bottom-0 w-full rounded transition-all duration-700 ${positive ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
          style={{ height: `${Math.max(pct * 100, showValue ? 4 : 0)}%` }}
        />
        {showValue && (
          <div className="absolute inset-0 flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] mono font-bold px-0.5 rounded" style={{ color: positive ? "#10b981" : "#ef4444", background: "var(--bg-card-solid)" }}>
              {value >= 0 ? "+" : ""}{Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)}
            </span>
          </div>
        )}
      </div>
      {label && <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{label}</span>}
    </div>
  );
}

function ConfidenceGauge({ score }: { score: number }) {
  const clamp = Math.max(0, Math.min(100, score));
  const color = clamp >= 70 ? "bg-emerald-500" : clamp >= 40 ? "bg-amber-500" : "bg-rose-500";
  const textColor = clamp >= 70 ? "text-emerald-400" : clamp >= 40 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-3xl font-bold mono ${textColor}`}>{clamp}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>/100</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${clamp}%` }}
        />
      </div>
    </div>
  );
}

function CircularGauge({ score, size = 140 }: { score: number; size?: number }) {
  const clamp = Math.max(0, Math.min(100, score));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp / 100) * circumference;
  const color = clamp >= 70 ? "#10b981" : clamp >= 40 ? "#f59e0b" : "#ef4444";
  const textColor = clamp >= 70 ? "text-emerald-400" : clamp >= 40 ? "text-amber-400" : "text-rose-400";
  const { t } = useTranslation();
  const label = clamp >= 70 ? t("gaugeDisciplined") : clamp >= 40 ? t("gaugeImprovable") : t("gaugeCritical");

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--bg-hover)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-3xl font-bold mono ${textColor}`}>{clamp}</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>/100</span>
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </div>
  );
}

export default function AICoachPage() {
  const { t } = useTranslation();
  const DAYS = DAY_KEYS.map((k) => t(k));
  const DAYS_SHORT = DAY_SHORT_KEYS.map((k) => t(k));
  const { trades, loading } = useTrades();
  const [isVip, setIsVip] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  const analysis = useMemo(() => {
    if (!trades.length) return null;

    const dayMap: Record<string, { wins: number; total: number; pnl: number }> = {};
    const hourMap: Record<string, { wins: number; total: number; pnl: number }> = {};
    const assetMap: Record<string, { wins: number; total: number; pnl: number }> = {};
    const stratMap: Record<string, { wins: number; total: number; pnl: number }> = {};
    const emotionMap: Record<string, { wins: number; total: number; pnl: number }> = {};

    for (const t of trades) {
      const d = new Date(t.date);
      const day = DAYS[d.getDay()];
      const hour = d.getHours().toString();

      for (const [map, key] of [
        [dayMap, day], [hourMap, hour], [assetMap, t.asset],
        [stratMap, t.strategy || "N/A"], [emotionMap, t.emotion || "N/A"],
      ] as [Record<string, { wins: number; total: number; pnl: number }>, string][]) {
        if (!map[key]) map[key] = { wins: 0, total: 0, pnl: 0 };
        map[key].total++;
        map[key].pnl += t.result;
        if (t.result > 0) map[key].wins++;
      }
    }

    // Consecutive losses
    let maxConsec = 0, curConsec = 0, todayConsec = 0;
    const today = new Date().toDateString();
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const t of sorted) {
      if (t.result < 0) { curConsec++; maxConsec = Math.max(maxConsec, curConsec); }
      else curConsec = 0;
    }
    const todayTrades = sorted.filter(t => new Date(t.date).toDateString() === today);
    let tc = 0;
    for (const t of todayTrades) { if (t.result < 0) tc++; else tc = 0; }
    todayConsec = tc;

    // Trailing consecutive losses (current streak)
    let trailingLosses = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].result < 0) trailingLosses++;
      else break;
    }

    // Trailing consecutive wins (current streak)
    let trailingWins = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].result > 0) trailingWins++;
      else break;
    }

    // Discipline score
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
    const weekWins = weekTrades.filter(t => t.result > 0).length;
    const weekWR = weekTrades.length > 0 ? (weekWins / weekTrades.length) * 100 : 50;
    const slUsage = weekTrades.length > 0 ? (weekTrades.filter(t => t.sl && t.sl > 0).length / weekTrades.length) * 100 : 100;
    const negEmotions = ["Anxious", "Fearful", "Frustrated", "Angry", "Revenge", "FOMO", "Impatient"];
    const emotionScore = weekTrades.length > 0
      ? (1 - weekTrades.filter(t => negEmotions.includes(t.emotion || "")).length / weekTrades.length) * 100 : 80;
    const discipline = Math.round(weekWR * 0.3 + slUsage * 0.3 + emotionScore * 0.4);

    // P&L by hour and day
    const hourPnl: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourPnl[i] = 0;
    const dayPnl: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayPnl[i] = 0;
    for (const t of trades) {
      const d = new Date(t.date);
      hourPnl[d.getHours()] += t.result;
      dayPnl[d.getDay()] += t.result;
    }

    // --- Overtrading Detection ---
    const tradesByDate: Record<string, { wins: number; total: number }> = {};
    for (const t of trades) {
      const dateKey = new Date(t.date).toDateString();
      if (!tradesByDate[dateKey]) tradesByDate[dateKey] = { wins: 0, total: 0 };
      tradesByDate[dateKey].total++;
      if (t.result > 0) tradesByDate[dateKey].wins++;
    }
    const highVolDays = Object.values(tradesByDate).filter(d => d.total > 5);
    const normalDays = Object.values(tradesByDate).filter(d => d.total <= 5);
    const highVolWins = highVolDays.reduce((s, d) => s + d.wins, 0);
    const highVolTotal = highVolDays.reduce((s, d) => s + d.total, 0);
    const normalWins = normalDays.reduce((s, d) => s + d.wins, 0);
    const normalTotal = normalDays.reduce((s, d) => s + d.total, 0);
    const highVolWR = highVolTotal > 0 ? (highVolWins / highVolTotal) * 100 : 0;
    const normalWR = normalTotal > 0 ? (normalWins / normalTotal) * 100 : 0;
    const highVolDayCount = highVolDays.length;
    const normalDayCount = normalDays.length;
    // Check if recent overtrading (last 7 days)
    const recentDates = weekTrades.map(t => new Date(t.date).toDateString());
    const recentDateCounts: Record<string, number> = {};
    for (const d of recentDates) { recentDateCounts[d] = (recentDateCounts[d] || 0) + 1; }
    const recentOvertradingDays = Object.values(recentDateCounts).filter(c => c > 5).length;

    // --- Performance Decay ---
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
    const last2w = trades.filter(t => new Date(t.date) >= twoWeeksAgo);
    const prev2w = trades.filter(t => { const d = new Date(t.date); return d >= fourWeeksAgo && d < twoWeeksAgo; });
    const last2wWR = last2w.length > 0 ? (last2w.filter(t => t.result > 0).length / last2w.length) * 100 : 0;
    const prev2wWR = prev2w.length > 0 ? (prev2w.filter(t => t.result > 0).length / prev2w.length) * 100 : 0;
    const last2wPnl = last2w.reduce((s, t) => s + t.result, 0);
    const prev2wPnl = prev2w.reduce((s, t) => s + t.result, 0);
    const wrChange = last2wWR - prev2wWR;
    const pnlChange = last2wPnl - prev2wPnl;
    const performanceDecay = wrChange < -10;

    // --- Best Trading Window ---
    const hourWinData: Record<number, { wins: number; total: number; pnl: number }> = {};
    for (let i = 0; i < 24; i++) hourWinData[i] = { wins: 0, total: 0, pnl: 0 };
    for (const t of trades) {
      const h = new Date(t.date).getHours();
      hourWinData[h].total++;
      hourWinData[h].pnl += t.result;
      if (t.result > 0) hourWinData[h].wins++;
    }
    // Find best 2-3 hour consecutive window (only hours with trades)
    let bestWindowStart = 0;
    let bestWindowWR = 0;
    let bestWindowPnl = 0;
    let bestWindowLen = 2;
    for (let len = 2; len <= 3; len++) {
      for (let start = 0; start <= 23; start++) {
        let wWins = 0, wTotal = 0, wPnl = 0;
        for (let j = 0; j < len; j++) {
          const h = (start + j) % 24;
          wWins += hourWinData[h].wins;
          wTotal += hourWinData[h].total;
          wPnl += hourWinData[h].pnl;
        }
        if (wTotal >= 3) {
          const wr = (wWins / wTotal) * 100;
          if (wr > bestWindowWR || (wr === bestWindowWR && wPnl > bestWindowPnl)) {
            bestWindowWR = wr;
            bestWindowPnl = wPnl;
            bestWindowStart = start;
            bestWindowLen = len;
          }
        }
      }
    }
    const bestWindowEnd = (bestWindowStart + bestWindowLen) % 24;

    // --- Confidence Score ---
    const now = new Date();
    const currentHour = now.getHours().toString();
    const currentDay = DAYS[now.getDay()];
    const dayWR = dayMap[currentDay] ? (dayMap[currentDay].wins / dayMap[currentDay].total) * 100 : 50;
    const hourWR = hourMap[currentHour] ? (hourMap[currentHour].wins / hourMap[currentHour].total) * 100 : 50;
    // Streak factor: winning streak boosts, losing streak penalizes
    const streakFactor = trailingWins > 0 ? Math.min(15, trailingWins * 5) : -(Math.min(30, trailingLosses * 10));
    // Emotion factor
    const lastEmotion = todayTrades.length > 0 ? todayTrades[todayTrades.length - 1].emotion : null;
    const emotionPenalty = lastEmotion && negEmotions.includes(lastEmotion) ? -15 : 0;
    const confidenceScore = Math.max(0, Math.min(100, Math.round(
      dayWR * 0.3 + hourWR * 0.3 + 50 * 0.1 + streakFactor + emotionPenalty + 20
    )));
    const confidenceLabel = confidenceScore >= 70
      ? "coachConditionsFavorable"
      : confidenceScore >= 40
        ? "coachConditionsNeutral"
        : "coachConditionsUnfavorable";

    // --- Position Sizing ---
    let sizingAdvice: { labelKey: string; detailKey: string; detailParams: Record<string, string | number>; color: string };
    if (trailingLosses >= 4) {
      sizingAdvice = { labelKey: "coachSizingPause", detailKey: "coachSizingPauseDetail", detailParams: { count: trailingLosses }, color: "text-rose-400" };
    } else if (trailingLosses >= 2) {
      sizingAdvice = { labelKey: "coachSizingReduce", detailKey: "coachSizingReduceDetail", detailParams: { count: trailingLosses }, color: "text-amber-400" };
    } else {
      sizingAdvice = { labelKey: "coachSizingNormal", detailKey: trailingWins > 0 ? "coachSizingNormalWinDetail" : "coachSizingNormalNoStreakDetail", detailParams: { count: trailingWins }, color: "text-emerald-400" };
    }

    // --- Heatmap Horaire: P&L by day-of-week x hour ---
    const heatmapData: Record<string, Record<number, { pnl: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) {
      heatmapData[d] = {};
      for (let h = 0; h < 24; h++) heatmapData[d][h] = { pnl: 0, count: 0 };
    }
    for (const t of trades) {
      const dt = new Date(t.date);
      heatmapData[dt.getDay()][dt.getHours()].pnl += t.result;
      heatmapData[dt.getDay()][dt.getHours()].count++;
    }
    const heatmapMax = Math.max(
      ...Object.values(heatmapData).flatMap(row => Object.values(row).map(c => Math.abs(c.pnl))),
      1
    );

    // --- Emotion Timeline ---
    const emotionTimeline: { date: string; emotion: string; result: number; asset: string }[] = sorted
      .filter(t => t.emotion)
      .map(t => ({
        date: t.date,
        emotion: t.emotion || "N/A",
        result: t.result,
        asset: t.asset,
      }));

    // --- Forward Projection ---
    // Calculate daily P&L over last 14 days for projection
    const last14d = sorted.filter(t => new Date(t.date) >= new Date(Date.now() - 14 * 86400000));
    const dailyPnlMap: Record<string, number> = {};
    for (const t of last14d) {
      const dk = new Date(t.date).toISOString().slice(0, 10);
      dailyPnlMap[dk] = (dailyPnlMap[dk] || 0) + t.result;
    }
    const dailyPnlArr = Object.values(dailyPnlMap);
    const avgDailyPnl = dailyPnlArr.length > 0 ? dailyPnlArr.reduce((s, v) => s + v, 0) / dailyPnlArr.length : 0;
    // Running balance for drawdown projection
    const totalPnl = trades.reduce((s, t) => s + t.result, 0);
    // Project drawdown: if losing money, estimate days to reach a projected drawdown level
    const projectedDrawdown = avgDailyPnl < 0 ? Math.abs(avgDailyPnl * 30) : 0;
    const daysToDrawdown = avgDailyPnl < 0 && totalPnl > 0
      ? Math.round(totalPnl / Math.abs(avgDailyPnl))
      : null;

    // --- Trade Management Quality Score ---
    // Measures how well exits align with TP targets vs premature exits
    const managedTrades = trades.filter(t => t.tp > 0 && t.exit !== null && t.exit !== 0 && t.entry > 0);
    let tpReachedCount = 0;
    let prematureExitCount = 0;
    let avgTpCapture = 0;
    const tpCaptures: number[] = [];

    for (const t of managedTrades) {
      const isLong = t.direction === "Long" || t.direction === "long" || t.direction === "BUY";
      const entryPrice = t.entry;
      const exitPrice = t.exit!;
      const tpPrice = t.tp;

      // Distance to TP from entry
      const tpDistance = isLong ? tpPrice - entryPrice : entryPrice - tpPrice;
      // Actual move from entry to exit
      const actualMove = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;

      if (tpDistance > 0) {
        const capture = Math.min(100, Math.max(0, (actualMove / tpDistance) * 100));
        tpCaptures.push(capture);
        if (capture >= 90) tpReachedCount++;
        else if (t.result > 0 && capture < 60) prematureExitCount++;
      }
    }
    avgTpCapture = tpCaptures.length > 0 ? tpCaptures.reduce((s, v) => s + v, 0) / tpCaptures.length : 0;
    const mgmtScore = managedTrades.length > 0
      ? Math.round(Math.min(100, avgTpCapture * 0.6 + (tpReachedCount / managedTrades.length) * 100 * 0.4))
      : 0;
    const mgmtGrade = mgmtScore >= 80 ? "A" : mgmtScore >= 65 ? "B" : mgmtScore >= 50 ? "C" : mgmtScore >= 35 ? "D" : "F";

    // =========================================================
    // === SECTION: Alerte Comportement (Behavior Alerts) ===
    // =========================================================
    type BehaviorAlert = { type: string; severity: "red" | "amber" | "blue"; description: string; recommendation: string };
    const behaviorAlerts: BehaviorAlert[] = [];

    // Revenge Trading: 2+ losing trades within 30 minutes of each other
    const sortedByTime = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let revengeCount = 0;
    for (let i = 1; i < sortedByTime.length; i++) {
      if (sortedByTime[i].result < 0 && sortedByTime[i - 1].result < 0) {
        const gap = Math.abs(new Date(sortedByTime[i].date).getTime() - new Date(sortedByTime[i - 1].date).getTime());
        if (gap <= 30 * 60 * 1000) revengeCount++;
      }
    }
    if (revengeCount > 0) {
      behaviorAlerts.push({
        type: "revenge",
        severity: "red",
        description: `${revengeCount} instance${revengeCount > 1 ? "s" : ""} de revenge trading d\u00e9tect\u00e9e${revengeCount > 1 ? "s" : ""} (2+ pertes en moins de 30 min)`,
        recommendation: "Apr\u00e8s une perte, attendez au moins 30 minutes avant de reprendre un trade. Respirez, analysez, puis agissez.",
      });
    }

    // Overtrading: More than avg * 1.5 trades in a day
    const dailyCounts = Object.values(tradesByDate).map(d => d.total);
    const avgDailyTrades = dailyCounts.length > 0 ? dailyCounts.reduce((s, v) => s + v, 0) / dailyCounts.length : 0;
    const overtradingThreshold = Math.max(5, Math.ceil(avgDailyTrades * 1.5));
    const overtradingDays = Object.entries(tradesByDate).filter(([, v]) => v.total > overtradingThreshold);
    if (overtradingDays.length > 0) {
      behaviorAlerts.push({
        type: "overtrading",
        severity: "amber",
        description: `${overtradingDays.length} jour${overtradingDays.length > 1 ? "s" : ""} d\u2019overtrading (>${overtradingThreshold} trades/jour, votre moyenne est ${avgDailyTrades.toFixed(1)})`,
        recommendation: `Fixez une limite de ${overtradingThreshold} trades par jour maximum. La qualit\u00e9 prime sur la quantit\u00e9.`,
      });
    }

    // Tilt Detection: 3+ consecutive losses with increasing lot sizes
    let tiltCount = 0;
    for (let i = 2; i < sortedByTime.length; i++) {
      if (
        sortedByTime[i].result < 0 &&
        sortedByTime[i - 1].result < 0 &&
        sortedByTime[i - 2].result < 0 &&
        sortedByTime[i].lots > sortedByTime[i - 1].lots &&
        sortedByTime[i - 1].lots > sortedByTime[i - 2].lots
      ) {
        tiltCount++;
      }
    }
    if (tiltCount > 0) {
      behaviorAlerts.push({
        type: "tilt",
        severity: "red",
        description: `Tilt d\u00e9tect\u00e9 : ${tiltCount} s\u00e9quence${tiltCount > 1 ? "s" : ""} de 3+ pertes cons\u00e9cutives avec lots croissants`,
        recommendation: "Ne jamais augmenter la taille apr\u00e8s une perte. R\u00e9duisez vos lots ou arr\u00eatez de trader apr\u00e8s 2 pertes cons\u00e9cutives.",
      });
    }

    // Weekend Holdover: Trades opened on Friday not closed
    const fridayOpenTrades = trades.filter(tr => {
      const d = new Date(tr.date);
      return d.getDay() === 5 && (tr.exit === null || tr.exit === 0);
    });
    if (fridayOpenTrades.length > 0) {
      behaviorAlerts.push({
        type: "weekend",
        severity: "blue",
        description: `${fridayOpenTrades.length} trade${fridayOpenTrades.length > 1 ? "s" : ""} ouvert${fridayOpenTrades.length > 1 ? "s" : ""} le vendredi sans cl\u00f4ture`,
        recommendation: "Le risque de gap du week-end est r\u00e9el. Cl\u00f4turez vos positions avant la fermeture du vendredi.",
      });
    }

    // =========================================================
    // === SECTION: Pattern Intelligence ===
    // =========================================================

    // Best day by WR and by P&L
    const dayEntries = Object.entries(dayMap).filter(([, v]) => v.total >= 2);
    const bestDayWR = dayEntries.length > 0
      ? dayEntries.reduce((best, [k, v]) => {
          const wr = v.total > 0 ? (v.wins / v.total) * 100 : 0;
          return wr > best.wr ? { day: k, wr, total: v.total } : best;
        }, { day: "", wr: -1, total: 0 })
      : null;
    const bestDayPnl = dayEntries.length > 0
      ? dayEntries.reduce((best, [k, v]) => v.pnl > best.pnl ? { day: k, pnl: v.pnl, total: v.total } : best, { day: "", pnl: -Infinity, total: 0 })
      : null;

    // Best hour
    const hourEntries = Object.entries(hourMap).filter(([, v]) => v.total >= 2);
    const bestHourWR = hourEntries.length > 0
      ? hourEntries.reduce((best, [k, v]) => {
          const wr = v.total > 0 ? (v.wins / v.total) * 100 : 0;
          return wr > best.wr ? { hour: k, wr, total: v.total } : best;
        }, { hour: "", wr: -1, total: 0 })
      : null;

    // Best asset (highest profit factor)
    const assetEntries = Object.entries(assetMap).filter(([, v]) => v.total >= 3);
    let bestAssetPF: { asset: string; pf: number; total: number } | null = null;
    for (const [asset, data] of assetEntries) {
      const assetTrades = trades.filter(tr => tr.asset === asset);
      const grossProfit = assetTrades.filter(tr => tr.result > 0).reduce((s, tr) => s + tr.result, 0);
      const grossLoss = Math.abs(assetTrades.filter(tr => tr.result < 0).reduce((s, tr) => s + tr.result, 0));
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
      if (!bestAssetPF || pf > bestAssetPF.pf) {
        bestAssetPF = { asset, pf, total: data.total };
      }
    }

    // Worst emotional state (lowest win rate)
    const emotionEntries = Object.entries(emotionMap).filter(([k, v]) => v.total >= 2 && k !== "N/A");
    const worstEmotion = emotionEntries.length > 0
      ? emotionEntries.reduce((worst, [k, v]) => {
          const wr = v.total > 0 ? (v.wins / v.total) * 100 : 100;
          return wr < worst.wr ? { emotion: k, wr, total: v.total } : worst;
        }, { emotion: "", wr: 101, total: 0 })
      : null;

    // Average holding time: winners vs losers
    const winningTrades = trades.filter(tr => tr.result > 0 && tr.exit !== null && tr.exit !== 0);
    const losingTrades = trades.filter(tr => tr.result < 0 && tr.exit !== null && tr.exit !== 0);
    // Use createdAt vs date as proxy for holding time (both are timestamps)
    const avgHoldWin = winningTrades.length > 0
      ? winningTrades.reduce((s, tr) => {
          const open = new Date(tr.date).getTime();
          const close = new Date(tr.createdAt).getTime();
          return s + Math.abs(close - open);
        }, 0) / winningTrades.length
      : 0;
    const avgHoldLoss = losingTrades.length > 0
      ? losingTrades.reduce((s, tr) => {
          const open = new Date(tr.date).getTime();
          const close = new Date(tr.createdAt).getTime();
          return s + Math.abs(close - open);
        }, 0) / losingTrades.length
      : 0;
    const formatDuration = (ms: number) => {
      if (ms === 0) return "N/A";
      const minutes = Math.round(ms / 60000);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours < 24) return `${hours}h${mins > 0 ? `${mins}m` : ""}`;
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    };

    // =========================================================
    // === SECTION: Plan d'Action Hebdomadaire ===
    // =========================================================
    const actionRecommendations: string[] = [];
    const actionStrengths: string[] = [];
    let actionRule = "";

    // Recommendations based on data
    if (bestDayWR) {
      const worstDayEntry = dayEntries.reduce((w, [k, v]) => {
        const wr = v.total > 0 ? (v.wins / v.total) * 100 : 100;
        return wr < w.wr ? { day: k, wr, total: v.total } : w;
      }, { day: "", wr: 101, total: 0 });
      if (worstDayEntry.wr < 45 && worstDayEntry.total >= 3) {
        actionRecommendations.push(`\u00c9vitez de trader le ${worstDayEntry.day} \u2014 votre WR est ${worstDayEntry.wr.toFixed(0)}%`);
      }
    }
    if (worstEmotion && worstEmotion.wr < 40) {
      actionRecommendations.push(`Quand vous \u00eates "${worstEmotion.emotion}", ne tradez pas \u2014 WR de ${worstEmotion.wr.toFixed(0)}%`);
    }
    if (revengeCount > 0) {
      actionRecommendations.push("R\u00e8gle anti-revenge : attendez 30 min apr\u00e8s chaque perte avant de re-trader");
    }
    if (slUsage < 80) {
      actionRecommendations.push(`Placez toujours un SL \u2014 seulement ${slUsage.toFixed(0)}% de vos trades en ont un`);
    }
    if (bestHourWR && bestHourWR.wr > 0) {
      const worstHourEntry = hourEntries.reduce((w, [k, v]) => {
        const wr = v.total > 0 ? (v.wins / v.total) * 100 : 100;
        return wr < w.wr ? { hour: k, wr, total: v.total } : w;
      }, { hour: "", wr: 101, total: 0 });
      if (worstHourEntry.wr < 40 && worstHourEntry.total >= 3) {
        actionRecommendations.push(`\u00c9vitez de trader \u00e0 ${worstHourEntry.hour}h \u2014 WR de ${worstHourEntry.wr.toFixed(0)}%`);
      }
    }
    // Fallback recommendations
    while (actionRecommendations.length < 3) {
      if (actionRecommendations.length === 0) actionRecommendations.push("Revoyez votre journal chaque soir pour identifier vos erreurs r\u00e9currentes");
      else if (actionRecommendations.length === 1) actionRecommendations.push("Prenez une capture d\u2019\u00e9cran de chaque setup avant d\u2019entrer en position");
      else actionRecommendations.push("Notez votre \u00e9motion avant chaque trade pour am\u00e9liorer votre conscience");
    }

    // Strengths
    if (bestAssetPF && bestAssetPF.pf > 1.5) {
      actionStrengths.push(`Continuez \u00e0 trader ${bestAssetPF.asset} \u2014 PF de ${bestAssetPF.pf.toFixed(1)}`);
    }
    if (bestDayWR && bestDayWR.wr >= 60) {
      actionStrengths.push(`Votre meilleur jour est ${bestDayWR.day} (${bestDayWR.wr.toFixed(0)}% WR) \u2014 concentrez-y vos efforts`);
    }
    if (bestHourWR && bestHourWR.wr >= 60) {
      actionStrengths.push(`Cr\u00e9neau optimal : ${bestHourWR.hour}h avec ${bestHourWR.wr.toFixed(0)}% WR`);
    }
    if (slUsage >= 90) {
      actionStrengths.push("Excellente discipline SL \u2014 continuez \u00e0 toujours prot\u00e9ger vos positions");
    }
    // Fallback strengths
    while (actionStrengths.length < 2) {
      if (actionStrengths.length === 0) actionStrengths.push("Vous maintenez un journal de trading r\u00e9gulier \u2014 c\u2019est un excellent r\u00e9flexe");
      else actionStrengths.push("Continuez \u00e0 analyser vos trades pour progresser");
    }

    // Weekly rule
    if (overtradingDays.length > 0) {
      actionRule = `Maximum ${overtradingThreshold} trades par jour cette semaine`;
    } else if (revengeCount > 0) {
      actionRule = "Z\u00e9ro revenge trading cette semaine \u2014 pause obligatoire apr\u00e8s chaque perte";
    } else if (slUsage < 100) {
      actionRule = "100% de vos trades doivent avoir un Stop Loss cette semaine";
    } else {
      actionRule = "Maintenez votre discipline et suivez votre plan de trading chaque jour";
    }

    // =========================================================
    // === SECTION: Score de Discipline (new weighted gauge) ===
    // =========================================================
    const slPct = weekTrades.length > 0 ? (weekTrades.filter(tr => tr.sl && tr.sl > 0).length / weekTrades.length) * 100 : 100;
    // Position size consistency: std deviation of lots / mean
    const weekLots = weekTrades.map(tr => tr.lots).filter(l => l > 0);
    const meanLots = weekLots.length > 0 ? weekLots.reduce((s, v) => s + v, 0) / weekLots.length : 0;
    const stdLots = weekLots.length > 1
      ? Math.sqrt(weekLots.reduce((s, v) => s + (v - meanLots) ** 2, 0) / (weekLots.length - 1))
      : 0;
    const lotConsistencyPct = meanLots > 0 ? Math.max(0, 100 - (stdLots / meanLots) * 100) : 100;

    // No revenge trading days (from past 7 days)
    let revengeFreeDays = 0;
    const last7Dates = [...new Set(weekTrades.map(tr => new Date(tr.date).toDateString()))];
    for (const dateStr of last7Dates) {
      const dayTrs = weekTrades
        .filter(tr => new Date(tr.date).toDateString() === dateStr)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let hasRevenge = false;
      for (let i = 1; i < dayTrs.length; i++) {
        if (dayTrs[i].result < 0 && dayTrs[i - 1].result < 0) {
          const gap = Math.abs(new Date(dayTrs[i].date).getTime() - new Date(dayTrs[i - 1].date).getTime());
          if (gap <= 30 * 60 * 1000) { hasRevenge = true; break; }
        }
      }
      if (!hasRevenge) revengeFreeDays++;
    }
    const revengeFreePct = last7Dates.length > 0 ? (revengeFreeDays / last7Dates.length) * 100 : 100;

    // Bias following: check if direction matches a hypothetical bias (use day performance as proxy)
    // Since we don't have an explicit daily bias field, we use the percentage of trades that are winners as a proxy
    const biasFollowPct = weekWR; // proxy: win rate itself shows alignment with correct direction

    const disciplineScoreV2 = Math.round(
      slPct * 0.30 +
      biasFollowPct * 0.20 +
      lotConsistencyPct * 0.20 +
      revengeFreePct * 0.30
    );

    return {
      dayBW: bestWorst(dayMap), hourBW: bestWorst(hourMap), assetBW: bestWorst(assetMap),
      stratBW: bestWorst(stratMap), emotionBW: bestWorst(emotionMap),
      maxConsec, todayConsec, trailingLosses, trailingWins, discipline,
      hourPnl, dayPnl, dayMap, hourMap,
      totalTrades: trades.length, weekTrades: weekTrades.length,
      lastEmotion,
      // Overtrading
      highVolDayCount, highVolWR, normalWR, highVolTotal, normalTotal, normalDayCount, recentOvertradingDays,
      // Performance Decay
      last2wWR, prev2wWR, wrChange, pnlChange, performanceDecay,
      last2wCount: last2w.length, prev2wCount: prev2w.length,
      // Best Window
      bestWindowStart, bestWindowEnd, bestWindowWR, bestWindowPnl, bestWindowLen,
      // Confidence
      confidenceScore, confidenceLabel,
      // Position Sizing
      sizingAdvice,
      // Heatmap Horaire
      heatmapData, heatmapMax,
      // Emotion Timeline
      emotionTimeline,
      // Forward Projection
      avgDailyPnl, totalPnl, projectedDrawdown, daysToDrawdown, dailyPnlArr,
      // Trade Management Quality
      mgmtScore, mgmtGrade, avgTpCapture, tpReachedCount, prematureExitCount,
      managedTradesCount: managedTrades.length, tpCaptures,
      // NEW: Behavior Alerts
      behaviorAlerts,
      // NEW: Pattern Intelligence
      bestDayWR, bestDayPnl, bestHourWR, bestAssetPF, worstEmotion,
      avgHoldWin: formatDuration(avgHoldWin), avgHoldLoss: formatDuration(avgHoldLoss),
      // NEW: Weekly Action Plan
      actionRecommendations: actionRecommendations.slice(0, 3),
      actionStrengths: actionStrengths.slice(0, 2),
      actionRule,
      // NEW: Discipline Score V2
      disciplineScoreV2, slPct, biasFollowPct, lotConsistencyPct, revengeFreePct,
    };
  }, [trades]);

  const insights = useMemo(() => {
    if (!analysis) return [];
    const msgs: { key: string; params?: Record<string, string | number> }[] = [];
    const { dayBW, stratBW, emotionBW, assetBW, trailingLosses } = analysis;

    if (dayBW.best && dayBW.worst && dayBW.best.key !== dayBW.worst.key)
      msgs.push({ key: "coachInsightDay", params: { bestDay: dayBW.best.key, bestWr: dayBW.best.wr.toFixed(0), worstDay: dayBW.worst.key, worstWr: dayBW.worst.wr.toFixed(0) } });
    if (stratBW.best && stratBW.best.total >= 2)
      msgs.push({ key: "coachInsightStrategy", params: { strat: stratBW.best.key, wr: stratBW.best.wr.toFixed(0) } });
    if (emotionBW.worst && emotionBW.worst.wr < 40 && emotionBW.worst.total >= 2)
      msgs.push({ key: "coachInsightEmotion", params: { emotion: emotionBW.worst.key, wr: emotionBW.worst.wr.toFixed(0) } });
    if (trailingLosses >= 3)
      msgs.push({ key: "coachInsightLossStreak", params: { count: trailingLosses } });
    if (assetBW.best && assetBW.best.total >= 2)
      msgs.push({ key: "coachInsightAsset", params: { asset: assetBW.best.key, wr: assetBW.best.wr.toFixed(0) } });
    if (msgs.length === 0) msgs.push({ key: "coachInsightEmpty" });
    return msgs;
  }, [analysis]);

  const alerts = useMemo(() => {
    if (!analysis) return [];
    const a: { msgKey: string; params?: Record<string, string | number>; level: "warn" | "danger" }[] = [];
    if (analysis.todayConsec >= 3) a.push({ msgKey: "coachAlertTodayLosses", params: { count: analysis.todayConsec }, level: "danger" });
    if (analysis.trailingLosses >= 3) a.push({ msgKey: "coachAlertLossStreak", params: { count: analysis.trailingLosses }, level: "danger" });
    const now = new Date();
    const curDay = DAYS[now.getDay()];
    if (analysis.dayBW.worst && analysis.dayBW.worst.key === curDay && analysis.dayBW.worst.wr < 40)
      a.push({ msgKey: "coachAlertWorstDay", params: { day: curDay, wr: analysis.dayBW.worst.wr.toFixed(0) }, level: "warn" });
    if (analysis.lastEmotion) {
      const neg = ["Anxious", "Fearful", "Frustrated", "Angry", "Revenge", "FOMO", "Impatient"];
      if (neg.includes(analysis.lastEmotion))
        a.push({ msgKey: "coachAlertNegativeEmotion", params: { emotion: analysis.lastEmotion }, level: "warn" });
    }
    // Overtrading alert
    if (analysis.recentOvertradingDays > 0)
      a.push({ msgKey: "coachAlertOvertrading", params: { count: analysis.recentOvertradingDays }, level: "warn" });
    // Performance decay alert
    if (analysis.performanceDecay && analysis.prev2wCount >= 3)
      a.push({ msgKey: "coachAlertPerfDecay", params: { change: `${analysis.wrChange > 0 ? "+" : ""}${analysis.wrChange.toFixed(0)}` }, level: "danger" });
    return a;
  }, [analysis]);

  if (loading || isVip === null) return (
    <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>{t("loading")}</div>
  );

  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: `${40 + i * 10}%` }} />
                <div className="h-3 rounded" style={{ background: "var(--border)", width: `${20 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "var(--bg-card)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Votre coach IA personnel pour améliorer vos performances de trading
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Analyse IA personnalisée de vos trades",
              "Détection automatique de vos erreurs récurrentes",
              "Recommandations d\u2019amélioration ciblées",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return (
    <div className="p-6 space-y-4 text-center" style={{ color: "var(--text-muted)" }}>
      <Brain size={48} className="mx-auto opacity-40" />
      <p>{t("coachAddTrades")}</p>
    </div>
  );

  const maxHourAbs = Math.max(...Object.values(analysis.hourPnl).map(Math.abs), 1);
  const maxDayAbs = Math.max(...Object.values(analysis.dayPnl).map(Math.abs), 1);
  const discColor = analysis.discipline >= 75 ? "text-emerald-400" : analysis.discipline >= 50 ? "text-cyan-400" : "text-rose-400";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>AI Trade Coach</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("coachAutoAnalysis", { count: analysis.totalTrades })}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`glass flex items-center gap-3 p-3 rounded-lg border ${a.level === "danger" ? "border-rose-500/40 bg-rose-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
              <AlertTriangle size={18} className={a.level === "danger" ? "text-rose-400" : "text-amber-400"} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t(a.msgKey, a.params)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confidence Score + Position Sizing + Best Window */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confidence Score Predictif */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachConfidenceScore")}</h2>
          </div>
          <ConfidenceGauge score={analysis.confidenceScore} />
          <div className="mt-3 text-center">
            <span className={`text-sm font-medium ${
              analysis.confidenceScore >= 70 ? "text-emerald-400" :
              analysis.confidenceScore >= 40 ? "text-amber-400" : "text-rose-400"
            }`}>
              {t(analysis.confidenceLabel)}
            </span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            {[
              { label: t("coachCurrentDay"), val: analysis.dayMap[DAYS[new Date().getDay()]] ? `${((analysis.dayMap[DAYS[new Date().getDay()]].wins / analysis.dayMap[DAYS[new Date().getDay()]].total) * 100).toFixed(0)}% WR` : "N/A" },
              { label: t("coachCurrentHour"), val: analysis.hourMap[new Date().getHours().toString()] ? `${((analysis.hourMap[new Date().getHours().toString()].wins / analysis.hourMap[new Date().getHours().toString()].total) * 100).toFixed(0)}% WR` : "N/A" },
              { label: t("coachStreak"), val: analysis.trailingWins > 0 ? `+${analysis.trailingWins} ${t("coachWins")}` : analysis.trailingLosses > 0 ? `-${analysis.trailingLosses} ${t("coachLosses")}` : t("coachNeutral") },
              { label: t("coachEmotion"), val: analysis.lastEmotion || "N/A" },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="mono" style={{ color: "var(--text-secondary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Position Sizing Recommande */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachPositionSizing")}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className={`text-center p-4 rounded-lg w-full ${
              analysis.trailingLosses >= 4 ? "bg-rose-500/10 border border-rose-500/30" :
              analysis.trailingLosses >= 2 ? "bg-amber-500/10 border border-amber-500/30" :
              "bg-emerald-500/10 border border-emerald-500/30"
            }`}>
              <div className={`text-lg font-bold ${analysis.sizingAdvice.color}`}>
                {t(analysis.sizingAdvice.labelKey)}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {t(analysis.sizingAdvice.detailKey, analysis.sizingAdvice.detailParams)}
              </p>
            </div>
            <div className="w-full space-y-2 text-xs mt-2">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>{t("coachWinStreak")}</span>
                <span className="mono text-emerald-400">{analysis.trailingWins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>{t("coachLossStreak")}</span>
                <span className="mono text-rose-400">{analysis.trailingLosses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>{t("coachMaxConsec")}</span>
                <span className="mono" style={{ color: "var(--text-secondary)" }}>{analysis.maxConsec}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best Trading Window */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachBestWindow")}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className="text-center p-4 rounded-lg w-full bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-lg font-bold text-cyan-400 mono">
                {analysis.bestWindowStart}h - {analysis.bestWindowEnd}h
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {analysis.bestWindowWR.toFixed(0)}% WR | {analysis.bestWindowPnl >= 0 ? "+" : ""}&euro;{analysis.bestWindowPnl.toFixed(0)}
              </p>
            </div>
            <div className="w-full space-y-2 text-xs mt-2">
              {[
                { h: analysis.bestWindowStart, data: analysis.hourMap[analysis.bestWindowStart.toString()] },
                { h: (analysis.bestWindowStart + 1) % 24, data: analysis.hourMap[((analysis.bestWindowStart + 1) % 24).toString()] },
                ...(analysis.bestWindowLen === 3 ? [{ h: (analysis.bestWindowStart + 2) % 24, data: analysis.hourMap[((analysis.bestWindowStart + 2) % 24).toString()] }] : []),
              ].map(({ h, data }) => (
                <div key={h} className="flex items-center justify-between">
                  <span style={{ color: "var(--text-muted)" }}>{h}h00</span>
                  <span className="mono" style={{ color: "var(--text-secondary)" }}>
                    {data ? `${data.total} trades | ${data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : 0}% WR` : "0 trades"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overtrading Detection + Performance Decay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overtrading Detection */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachOvertradingDetect")}</h2>
          </div>
          {analysis.highVolDayCount > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachHighVolDays")}</div>
                  <div className="text-xl font-bold mono text-amber-400 mt-1">{analysis.highVolDayCount}</div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>WR {analysis.highVolWR.toFixed(0)}%</div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachNormalDays")}</div>
                  <div className="text-xl font-bold mono text-emerald-400 mt-1">{analysis.normalDayCount}</div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>WR {analysis.normalWR.toFixed(0)}%</div>
                </div>
              </div>
              <div className="p-3 rounded-lg text-xs" style={{ background: "var(--bg-hover)" }}>
                <div className="flex items-center gap-2">
                  {analysis.highVolWR < analysis.normalWR ? (
                    <>
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <span style={{ color: "var(--text-secondary)" }}>
                        {t("coachOvertradingWrCompare", { highWr: analysis.highVolWR.toFixed(0), normalWr: analysis.normalWR.toFixed(0) })}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                      <span style={{ color: "var(--text-secondary)" }}>
                        {t("coachNoOvertradingLoss")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <TrendingUp size={24} className="opacity-40" />
              <span className="text-sm">{t("coachNoHighVolDay")}</span>
            </div>
          )}
        </div>

        {/* Performance Decay */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            {analysis.wrChange >= 0 ? (
              <ArrowUpRight className="text-emerald-400" size={18} />
            ) : (
              <ArrowDownRight className="text-rose-400" size={18} />
            )}
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Performance Decay</h2>
          </div>
          {analysis.prev2wCount >= 3 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachLast2w")}</div>
                  <div className={`text-xl font-bold mono mt-1 ${analysis.last2wWR >= analysis.prev2wWR ? "text-emerald-400" : "text-rose-400"}`}>
                    {analysis.last2wWR.toFixed(0)}%
                  </div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>
                    {analysis.last2wCount} trades
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachPrev2w")}</div>
                  <div className="text-xl font-bold mono mt-1" style={{ color: "var(--text-secondary)" }}>
                    {analysis.prev2wWR.toFixed(0)}%
                  </div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>
                    {analysis.prev2wCount} trades
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-lg text-xs border ${
                analysis.performanceDecay ? "border-rose-500/30 bg-rose-500/10" :
                analysis.wrChange >= 0 ? "border-emerald-500/30 bg-emerald-500/10" :
                "border-amber-500/30 bg-amber-500/10"
              }`}>
                <div className="flex items-center gap-2">
                  {analysis.wrChange >= 0 ? (
                    <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-400 shrink-0" />
                  )}
                  <span style={{ color: "var(--text-secondary)" }}>
                    Win Rate : {analysis.wrChange >= 0 ? "+" : ""}{analysis.wrChange.toFixed(1)}% | P&L : {analysis.pnlChange >= 0 ? "+" : ""}&euro;{analysis.pnlChange.toFixed(0)}
                  </span>
                </div>
              </div>
              {analysis.performanceDecay && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 text-xs">
                  <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {t("coachPerfDecayAlert")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <BarChart3 size={24} className="opacity-40" />
              <span className="text-sm">{t("coachNotEnoughDataWeeks")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Discipline Score + Pattern Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Discipline Score */}
        <div className="metric-card p-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachDisciplineScore")}</h2>
          </div>
          <div className={`text-5xl font-bold mono ${discColor}`}>{analysis.discipline}</div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachDisciplineLast7d")}</span>
          <div className="w-full space-y-1.5 mt-2 text-xs">
            {[
              { label: t("winRate"), val: Math.min(100, Math.round(analysis.weekTrades > 0 ? (trades.filter(tr => new Date(tr.date) >= new Date(Date.now() - 7 * 86400000) && tr.result > 0).length / analysis.weekTrades) * 100 : 50)) },
              { label: t("stopLoss"), val: Math.round(analysis.weekTrades > 0 ? (trades.filter(tr => new Date(tr.date) >= new Date(Date.now() - 7 * 86400000) && tr.sl && tr.sl > 0).length / Math.max(1, analysis.weekTrades)) * 100 : 100) },
              { label: t("coachEmotion"), val: Math.round(analysis.weekTrades > 0 ? (1 - trades.filter(tr => new Date(tr.date) >= new Date(Date.now() - 7 * 86400000) && ["Anxious", "Fearful", "Frustrated", "Angry", "Revenge", "FOMO", "Impatient"].includes(tr.emotion || "")).length / Math.max(1, analysis.weekTrades)) * 100 : 80) },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }} className="w-16">{label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                  <div className={`h-full rounded-full ${val >= 60 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${val}%` }} />
                </div>
                <span className="mono w-8 text-right" style={{ color: "var(--text-secondary)" }}>{val}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Detection */}
        <div className="metric-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachPatternDetect")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { icon: Calendar, label: t("coachBestDay"), best: analysis.dayBW.best, worst: analysis.dayBW.worst },
              { icon: Clock, label: t("coachBestHour"), best: analysis.hourBW.best ? { ...analysis.hourBW.best, key: `${analysis.hourBW.best.key}h` } : null, worst: analysis.hourBW.worst ? { ...analysis.hourBW.worst, key: `${analysis.hourBW.worst.key}h` } : null },
              { icon: BarChart3, label: t("coachBestAsset"), best: analysis.assetBW.best, worst: analysis.assetBW.worst },
              { icon: Zap, label: t("coachStrategy"), best: analysis.stratBW.best, worst: analysis.stratBW.worst },
              { icon: Award, label: t("coachEmotion"), best: analysis.emotionBW.best, worst: analysis.emotionBW.worst },
              { icon: TrendingDown, label: t("consecutiveLosses"), best: null, worst: null, custom: `Max: ${analysis.maxConsec} | ${t("coachOngoing")}: ${analysis.trailingLosses}` },
            ].map(({ icon: Icon, label, best, worst, custom }) => (
              <div key={label} className="glass rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <Icon size={13} /> {label}
                </div>
                {custom ? (
                  <div className="mono" style={{ color: "var(--text-secondary)" }}>{custom}</div>
                ) : (
                  <>
                    {best && (
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 mono">{best.key}</span>
                        <span style={{ color: "var(--text-muted)" }}>{best.wr.toFixed(0)}%</span>
                      </div>
                    )}
                    {worst && worst.key !== best?.key && (
                      <div className="flex items-center gap-1">
                        <TrendingDown size={12} className="text-rose-400" />
                        <span className="text-rose-400 mono">{worst.key}</span>
                        <span style={{ color: "var(--text-muted)" }}>{worst.wr.toFixed(0)}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="metric-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="text-cyan-400" size={18} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachAiInsights")}</h2>
        </div>
        <div className="space-y-2">
          {insights.map((msg, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
              <Zap size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t(msg.key, msg.params)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L by Hour */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachPnlByHour")}</h2>
          </div>
          <div className="flex items-end gap-[1px]">
            {Array.from({ length: 24 }, (_, h) => (
              <Bar key={h} value={analysis.hourPnl[h]} max={maxHourAbs} label={h % 4 === 0 ? `${h}h` : ""} compact />
            ))}
          </div>
        </div>

        {/* P&L by Day */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachPnlByDay")}</h2>
          </div>
          <div className="flex items-end gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <Bar key={d} value={analysis.dayPnl[d]} max={maxDayAbs} label={DAYS_SHORT[d]} />
            ))}
          </div>
        </div>
      </div>

      {/* === NEW: Heatmap Horaire === */}
      <div className="metric-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="text-cyan-400" size={18} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachHeatmap")}</h2>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 540 170" className="w-full" style={{ minWidth: 480 }}>
            {/* Hour labels */}
            {Array.from({ length: 24 }, (_, h) => (
              <text key={`hl-${h}`} x={60 + h * 20 + 10} y={12} textAnchor="middle" fontSize="7" fill="var(--text-muted)" className="mono">
                {h}h
              </text>
            ))}
            {/* Day rows */}
            {[1, 2, 3, 4, 5, 6, 0].map((d, ri) => (
              <g key={`row-${d}`}>
                <text x={52} y={24 + ri * 20 + 12} textAnchor="end" fontSize="8" fill="var(--text-muted)">{DAYS_SHORT[d]}</text>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = analysis.heatmapData[d][h];
                  const intensity = analysis.heatmapMax > 0 ? Math.min(1, Math.abs(cell.pnl) / analysis.heatmapMax) : 0;
                  const fillColor = cell.count === 0
                    ? "var(--bg-hover)"
                    : cell.pnl >= 0
                      ? `rgba(16, 185, 129, ${0.15 + intensity * 0.7})`
                      : `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`;
                  return (
                    <g key={`cell-${d}-${h}`}>
                      <rect
                        x={60 + h * 20} y={20 + ri * 20}
                        width={18} height={18} rx={3}
                        fill={fillColor}
                        stroke="var(--bg-card-solid)" strokeWidth={1}
                      >
                        <title>
                          {DAYS_SHORT[d]} {h}h — {cell.count} trade{cell.count !== 1 ? "s" : ""} | {cell.pnl >= 0 ? "+" : ""}{cell.pnl.toFixed(0)}&euro;
                        </title>
                      </rect>
                      {cell.count > 0 && (
                        <text
                          x={60 + h * 20 + 9} y={20 + ri * 20 + 12}
                          textAnchor="middle" fontSize="6"
                          fill={cell.pnl >= 0 ? "#6ee7b7" : "#fca5a5"}
                          className="mono"
                        >
                          {cell.pnl >= 0 ? "+" : ""}{Math.abs(cell.pnl) >= 1000 ? `${(cell.pnl / 1000).toFixed(1)}k` : cell.pnl.toFixed(0)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
            {/* Legend */}
            <text x={60} y={168} fontSize="7" fill="var(--text-muted)">{t("loss")}</text>
            <rect x={85} y={161} width={14} height={8} rx={2} fill="rgba(239, 68, 68, 0.7)" />
            <rect x={101} y={161} width={14} height={8} rx={2} fill="rgba(239, 68, 68, 0.3)" />
            <rect x={117} y={161} width={14} height={8} rx={2} fill="var(--bg-hover)" />
            <rect x={133} y={161} width={14} height={8} rx={2} fill="rgba(16, 185, 129, 0.3)" />
            <rect x={149} y={161} width={14} height={8} rx={2} fill="rgba(16, 185, 129, 0.7)" />
            <text x={168} y={168} fontSize="7" fill="var(--text-muted)">{t("gain")}</text>
          </svg>
        </div>
      </div>

      {/* === NEW: Emotion Timeline === */}
      <div className="metric-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-cyan-400" size={18} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachEmotionTimeline")}</h2>
        </div>
        {analysis.emotionTimeline.length > 0 ? (
          <div className="space-y-3">
            {/* SVG timeline chart */}
            <div className="overflow-x-auto">
              <EmotionTimelineChart data={analysis.emotionTimeline} />
            </div>
            {/* Emotion legend */}
            <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {Object.entries(
                analysis.emotionTimeline.reduce<Record<string, { wins: number; total: number }>>((acc, t) => {
                  if (!acc[t.emotion]) acc[t.emotion] = { wins: 0, total: 0 };
                  acc[t.emotion].total++;
                  if (t.result > 0) acc[t.emotion].wins++;
                  return acc;
                }, {})
              ).sort((a, b) => b[1].total - a[1].total).map(([emo, data]) => (
                <span key={emo} className="glass rounded px-2 py-1">
                  {emo}: <span className="mono" style={{ color: data.wins / data.total >= 0.5 ? "#10b981" : "#ef4444" }}>
                    {((data.wins / data.total) * 100).toFixed(0)}% WR
                  </span>
                  <span style={{ color: "var(--text-muted)" }}> ({data.total})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
            <Heart size={24} className="opacity-40" />
            <span className="text-sm">{t("coachNoEmotionHint")}</span>
          </div>
        )}
      </div>

      {/* === NEW: Forward Projection + Trade Management Quality === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forward Projection */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachForwardProjection")}</h2>
          </div>
          {analysis.dailyPnlArr.length >= 3 ? (
            <div className="space-y-4">
              <div className={`text-center p-4 rounded-lg border ${
                analysis.avgDailyPnl >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("coachAvgDailyPnl")}</div>
                <div className={`text-2xl font-bold mono ${analysis.avgDailyPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {analysis.avgDailyPnl >= 0 ? "+" : ""}&euro;{analysis.avgDailyPnl.toFixed(1)}
                </div>
              </div>

              {analysis.avgDailyPnl < 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-semibold text-rose-400">{t("coachAtThisRate")}</span>, {t("coachEstimatedDrawdown", { dd: analysis.projectedDrawdown.toFixed(0) })}{" "}
                        {analysis.daysToDrawdown && analysis.daysToDrawdown > 0 && (
                          <span> {t("coachProfitsExhausted", { pnl: analysis.totalPnl.toFixed(0), days: analysis.daysToDrawdown })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Mini daily P&L bars */}
                  <div className="flex items-end gap-1 h-12">
                    {analysis.dailyPnlArr.slice(-14).map((v, i) => {
                      const max = Math.max(...analysis.dailyPnlArr.map(Math.abs), 1);
                      const pct = Math.abs(v) / max;
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end h-full">
                          <div
                            className={`w-full rounded-sm ${v >= 0 ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                            style={{ height: `${Math.max(pct * 100, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <span>{t("coachDaysAgo14")}</span><span>{t("today")}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {t("coachPositiveProjection", { amount: (analysis.avgDailyPnl * 30).toFixed(0) })}
                      </div>
                    </div>
                  </div>
                  {/* Mini daily P&L bars */}
                  <div className="flex items-end gap-1 h-12">
                    {analysis.dailyPnlArr.slice(-14).map((v, i) => {
                      const max = Math.max(...analysis.dailyPnlArr.map(Math.abs), 1);
                      const pct = Math.abs(v) / max;
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end h-full">
                          <div
                            className={`w-full rounded-sm ${v >= 0 ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                            style={{ height: `${Math.max(pct * 100, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <span>{t("coachDaysAgo14")}</span><span>{t("today")}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <Flame size={24} className="opacity-40" />
              <span className="text-sm">{t("coachMin3DaysProjection")}</span>
            </div>
          )}
        </div>

        {/* Trade Management Quality Score */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crosshair className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t("coachTradeMgmtQuality")}</h2>
          </div>
          {analysis.managedTradesCount > 0 ? (
            <div className="space-y-4">
              {/* Grade + Score */}
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-bold mono ${
                  analysis.mgmtScore >= 70 ? "text-emerald-400" :
                  analysis.mgmtScore >= 50 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {analysis.mgmtGrade}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-muted)" }}>{t("coachGlobalScore")}</span>
                    <span className="mono" style={{ color: "var(--text-secondary)" }}>{analysis.mgmtScore}/100</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        analysis.mgmtScore >= 70 ? "bg-emerald-500" :
                        analysis.mgmtScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${analysis.mgmtScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachAvgTpCapture")}</div>
                  <div className={`text-lg font-bold mono mt-1 ${analysis.avgTpCapture >= 70 ? "text-emerald-400" : analysis.avgTpCapture >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {analysis.avgTpCapture.toFixed(0)}%
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachTpReached")}</div>
                  <div className="text-lg font-bold mono mt-1 text-emerald-400">
                    {analysis.tpReachedCount}
                  </div>
                  <div className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                    /{analysis.managedTradesCount}
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("coachPrematureExits")}</div>
                  <div className="text-lg font-bold mono mt-1 text-amber-400">
                    {analysis.prematureExitCount}
                  </div>
                </div>
              </div>

              {/* TP Capture Distribution - mini bar chart */}
              {analysis.tpCaptures.length > 0 && (
                <div>
                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t("coachTpCaptureDistrib")}</div>
                  <div className="flex items-end gap-[2px] h-10">
                    {(() => {
                      const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
                      for (const c of analysis.tpCaptures) {
                        const idx = Math.min(4, Math.floor(c / 20));
                        buckets[idx]++;
                      }
                      const maxB = Math.max(...buckets, 1);
                      return buckets.map((b, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full rounded-sm relative overflow-hidden" style={{ height: 40, background: "var(--bg-hover)" }}>
                            <div
                              className={`absolute bottom-0 w-full rounded-sm ${
                                i >= 4 ? "bg-emerald-500/60" : i >= 3 ? "bg-emerald-500/40" : i >= 2 ? "bg-amber-500/40" : "bg-rose-500/40"
                              }`}
                              style={{ height: `${(b / maxB) * 100}%` }}
                            />
                          </div>
                          <span className="text-[8px] mono" style={{ color: "var(--text-muted)" }}>{i * 20}-{(i + 1) * 20}%</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Advice */}
              <div className="p-3 rounded-lg text-xs" style={{ background: "var(--bg-hover)" }}>
                <div className="flex items-start gap-2">
                  <Target size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {analysis.prematureExitCount > analysis.tpReachedCount
                      ? t("coachAdvicePrematureExit")
                      : analysis.avgTpCapture < 50
                        ? t("coachAdviceLowTpCapture")
                        : analysis.mgmtScore >= 70
                          ? t("coachAdviceExcellent")
                          : t("coachAdviceGood")
                    }
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <Crosshair size={24} className="opacity-40" />
              <span className="text-sm">{t("coachFillTpHint")}</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          === SECTION: Alerte Comportement ===
          ========================================================= */}
      {analysis.behaviorAlerts.length > 0 && (
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Alerte Comportement</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 mono">
              {analysis.behaviorAlerts.length} alerte{analysis.behaviorAlerts.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {analysis.behaviorAlerts.map((alert, i) => {
              const severityStyles = {
                red: { border: "border-rose-500/40", bg: "bg-rose-500/10", icon: "text-rose-400", badge: "bg-rose-500/20 text-rose-400" },
                amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", icon: "text-amber-400", badge: "bg-amber-500/20 text-amber-400" },
                blue: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", icon: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-400" },
              }[alert.severity];
              const IconComp = alert.severity === "red" ? Ban : alert.severity === "amber" ? AlertTriangle : Info;
              return (
                <div key={i} className={`rounded-lg p-4 border ${severityStyles.border} ${severityStyles.bg}`}>
                  <div className="flex items-start gap-3">
                    <IconComp size={18} className={`${severityStyles.icon} shrink-0 mt-0.5`} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${severityStyles.badge}`}>
                          {alert.severity === "red" ? t("severityCritical") : alert.severity === "amber" ? t("severityWarning") : t("severityInfo")}
                        </span>
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {alert.type === "revenge" ? "Revenge Trading" : alert.type === "overtrading" ? "Overtrading" : alert.type === "tilt" ? "Tilt" : "Week-end"}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{alert.description}</p>
                      <div className="flex items-start gap-2 p-2 rounded" style={{ background: "var(--bg-hover)" }}>
                        <ChevronRight size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{alert.recommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          === SECTION: Pattern Intelligence ===
          ========================================================= */}
      <div className="metric-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="text-cyan-400" size={18} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Pattern Intelligence</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Best Day WR */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Calendar size={13} /> Meilleur jour (WR)
            </div>
            {analysis.bestDayWR ? (
              <div>
                <span className="text-emerald-400 mono font-semibold">{analysis.bestDayWR.day}</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{analysis.bestDayWR.wr.toFixed(0)}% ({analysis.bestDayWR.total} trades)</span>
              </div>
            ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pas assez de donn\u00e9es</span>}
          </div>

          {/* Best Day P&L */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Calendar size={13} /> Meilleur jour (P&L)
            </div>
            {analysis.bestDayPnl ? (
              <div>
                <span className="text-emerald-400 mono font-semibold">{analysis.bestDayPnl.day}</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>+&euro;{analysis.bestDayPnl.pnl.toFixed(0)}</span>
              </div>
            ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pas assez de donn\u00e9es</span>}
          </div>

          {/* Best Hour */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Clock size={13} /> Meilleure heure
            </div>
            {analysis.bestHourWR ? (
              <div>
                <span className="text-emerald-400 mono font-semibold">{analysis.bestHourWR.hour}h</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{analysis.bestHourWR.wr.toFixed(0)}% WR ({analysis.bestHourWR.total} trades)</span>
              </div>
            ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pas assez de donn\u00e9es</span>}
          </div>

          {/* Best Asset PF */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Star size={13} /> Meilleur actif (PF)
            </div>
            {analysis.bestAssetPF ? (
              <div>
                <span className="text-emerald-400 mono font-semibold">{analysis.bestAssetPF.asset}</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>PF {analysis.bestAssetPF.pf.toFixed(1)} ({analysis.bestAssetPF.total} trades)</span>
              </div>
            ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pas assez de donn\u00e9es</span>}
          </div>

          {/* Worst Emotion */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Heart size={13} /> Pire \u00e9motion (WR)
            </div>
            {analysis.worstEmotion ? (
              <div>
                <span className="text-rose-400 mono font-semibold">{analysis.worstEmotion.emotion}</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{analysis.worstEmotion.wr.toFixed(0)}% WR ({analysis.worstEmotion.total} trades)</span>
              </div>
            ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pas assez de donn\u00e9es</span>}
          </div>

          {/* Avg Hold Time */}
          <div className="glass rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Timer size={13} /> Dur\u00e9e moyenne
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <ThumbsUp size={11} className="text-emerald-400" />
                <span className="text-xs mono text-emerald-400">{analysis.avgHoldWin}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>gagnants</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown size={11} className="text-rose-400" />
                <span className="text-xs mono text-rose-400">{analysis.avgHoldLoss}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>perdants</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          === SECTION: Plan d'Action + Score de Discipline ===
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan d'Action Hebdomadaire */}
        <div className="metric-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Plan d&apos;Action Hebdomadaire</h2>
          </div>
          <div className="space-y-4">
            {/* Recommendations */}
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-400" />
                <span style={{ color: "var(--text-muted)" }}>\u00c0 am\u00e9liorer cette semaine</span>
              </div>
              <div className="space-y-2">
                {analysis.actionRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-400 text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-emerald-400" />
                <span style={{ color: "var(--text-muted)" }}>Points forts \u00e0 maintenir</span>
              </div>
              <div className="space-y-2">
                {analysis.actionStrengths.map((str, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20">
                      <Check size={12} className="text-emerald-400" />
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{str}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Rule */}
            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-semibold uppercase text-cyan-400 mb-0.5">R\u00e8gle de la semaine</div>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{analysis.actionRule}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score de Discipline V2 */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CircleGauge className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Score de Discipline</h2>
          </div>
          <div className="flex flex-col items-center relative">
            <CircularGauge score={analysis.disciplineScoreV2} />
          </div>
          <div className="w-full space-y-2 mt-4 text-xs">
            {[
              { label: "Stop Loss (%)", val: analysis.slPct, weight: "30%" },
              { label: "Biais directionnel", val: analysis.biasFollowPct, weight: "20%" },
              { label: "Consistance lots", val: analysis.lotConsistencyPct, weight: "20%" },
              { label: "Sans revenge trading", val: analysis.revengeFreePct, weight: "30%" },
            ].map(({ label, val, weight }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span className="mono" style={{ color: "var(--text-secondary)" }}>{Math.round(val)}% <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>({weight})</span></span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${val >= 70 ? "bg-emerald-500" : val >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* === Emotion Timeline SVG Component === */
function EmotionTimelineChart({ data }: { data: { date: string; emotion: string; result: number; asset: string }[] }) {
  const { t } = useTranslation();
  const EMOTION_COLORS: Record<string, string> = {
    Confident: "#10b981", Calm: "#06b6d4", Focused: "#3b82f6", Disciplined: "#8b5cf6",
    Happy: "#22c55e", Neutral: "#94a3b8", Excited: "#f59e0b",
    Anxious: "#f97316", Fearful: "#ef4444", Frustrated: "#dc2626", Angry: "#b91c1c",
    Revenge: "#991b1b", FOMO: "#ea580c", Impatient: "#d97706", Greedy: "#ca8a04",
  };

  const maxAbs = Math.max(...data.map(d => Math.abs(d.result)), 1);
  const last40 = data.slice(-40);
  const width = Math.max(600, last40.length * 22);
  const chartH = 100;
  const midY = chartH / 2;

  return (
    <svg viewBox={`0 0 ${width} ${chartH + 30}`} className="w-full" style={{ minWidth: 400 }}>
      {/* Zero line */}
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="var(--text-muted)" strokeWidth={0.5} strokeDasharray="4 2" opacity={0.4} />
      {/* Bars + emotion dots */}
      {last40.map((d, i) => {
        const x = 10 + i * ((width - 20) / last40.length);
        const barW = Math.max(6, ((width - 20) / last40.length) - 4);
        const normalized = (d.result / maxAbs) * (midY - 8);
        const barH = Math.abs(normalized);
        const isPos = d.result >= 0;
        const barY = isPos ? midY - barH : midY;
        const color = EMOTION_COLORS[d.emotion] || "#94a3b8";
        const dateStr = new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

        return (
          <g key={i}>
            <rect
              x={x} y={barY} width={barW} height={Math.max(barH, 2)} rx={2}
              fill={isPos ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}
            >
              <title>{dateStr} — {d.emotion} | {d.asset} | {d.result >= 0 ? "+" : ""}{d.result.toFixed(0)}&euro;</title>
            </rect>
            {/* Emotion dot */}
            <circle
              cx={x + barW / 2} cy={isPos ? barY - 5 : barY + barH + 5} r={4}
              fill={color} opacity={0.9}
            >
              <title>{d.emotion}</title>
            </circle>
            {/* Date label (sparse) */}
            {(i % Math.max(1, Math.floor(last40.length / 10)) === 0) && (
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="7" fill="var(--text-muted)" className="mono">
                {dateStr}
              </text>
            )}
          </g>
        );
      })}
      {/* Labels */}
      <text x={4} y={10} fontSize="7" fill="var(--text-muted)">{t("chartGains")}</text>
      <text x={4} y={chartH - 2} fontSize="7" fill="var(--text-muted)">{t("chartLosses")}</text>
    </svg>
  );
}
