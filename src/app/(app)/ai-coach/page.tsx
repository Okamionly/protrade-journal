"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Clock,
  Calendar, Target, Shield, Zap, BarChart3, Award,
  Activity, Gauge, Scale, ArrowDownRight, ArrowUpRight, Timer,
  Grid3X3, Heart, Crosshair, Flame,
} from "lucide-react";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

export default function AICoachPage() {
  const { trades, loading } = useTrades();

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
      ? "Conditions favorables"
      : confidenceScore >= 40
        ? "Conditions neutres"
        : "Conditions defavorables";

    // --- Position Sizing ---
    let sizingAdvice: { label: string; detail: string; color: string };
    if (trailingLosses >= 4) {
      sizingAdvice = { label: "Pause recommandee", detail: `${trailingLosses} pertes consecutives. Arretez de trader.`, color: "text-rose-400" };
    } else if (trailingLosses >= 2) {
      sizingAdvice = { label: "Reduire le risque (0.5-1%)", detail: `${trailingLosses} pertes consecutives. Reduisez la taille.`, color: "text-amber-400" };
    } else {
      sizingAdvice = { label: "Risque normal (1-2%)", detail: trailingWins > 0 ? `Serie de ${trailingWins} gain(s). Restez discipline.` : "Aucune serie en cours.", color: "text-emerald-400" };
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
    };
  }, [trades]);

  const insights = useMemo(() => {
    if (!analysis) return [];
    const msgs: string[] = [];
    const { dayBW, stratBW, emotionBW, assetBW, trailingLosses } = analysis;

    if (dayBW.best && dayBW.worst && dayBW.best.key !== dayBW.worst.key)
      msgs.push(`Tu gagnes ${dayBW.best.wr.toFixed(0)}% de tes trades le ${dayBW.best.key}, mais seulement ${dayBW.worst.wr.toFixed(0)}% le ${dayBW.worst.key}.`);
    if (stratBW.best && stratBW.best.total >= 2)
      msgs.push(`Ta meilleure stratégie est ${stratBW.best.key} avec ${stratBW.best.wr.toFixed(0)}% de win rate.`);
    if (emotionBW.worst && emotionBW.worst.wr < 40 && emotionBW.worst.total >= 2)
      msgs.push(`Attention : tu as tendance à perdre quand tu es "${emotionBW.worst.key}" (${emotionBW.worst.wr.toFixed(0)}% WR).`);
    if (trailingLosses >= 3)
      msgs.push(`Tu es en série de ${trailingLosses} pertes consécutives, considère une pause.`);
    if (assetBW.best && assetBW.best.total >= 2)
      msgs.push(`Ton meilleur actif est ${assetBW.best.key} avec ${assetBW.best.wr.toFixed(0)}% de win rate.`);
    if (msgs.length === 0) msgs.push("Continue à ajouter des trades pour obtenir des insights personnalisés.");
    return msgs;
  }, [analysis]);

  const alerts = useMemo(() => {
    if (!analysis) return [];
    const a: { msg: string; level: "warn" | "danger" }[] = [];
    if (analysis.todayConsec >= 3) a.push({ msg: `${analysis.todayConsec} pertes consecutives aujourd'hui. Fais une pause.`, level: "danger" });
    if (analysis.trailingLosses >= 3) a.push({ msg: `Serie de ${analysis.trailingLosses} pertes en cours.`, level: "danger" });
    const now = new Date();
    const curDay = DAYS[now.getDay()];
    if (analysis.dayBW.worst && analysis.dayBW.worst.key === curDay && analysis.dayBW.worst.wr < 40)
      a.push({ msg: `${curDay} est ton pire jour (${analysis.dayBW.worst.wr.toFixed(0)}% WR). Sois prudent.`, level: "warn" });
    if (analysis.lastEmotion) {
      const neg = ["Anxious", "Fearful", "Frustrated", "Angry", "Revenge", "FOMO", "Impatient"];
      if (neg.includes(analysis.lastEmotion))
        a.push({ msg: `Emotion negative detectee : "${analysis.lastEmotion}". Verifie ton etat mental.`, level: "warn" });
    }
    // Overtrading alert
    if (analysis.recentOvertradingDays > 0)
      a.push({ msg: `Overtrading detecte : ${analysis.recentOvertradingDays} jour(s) avec 5+ trades cette semaine.`, level: "warn" });
    // Performance decay alert
    if (analysis.performanceDecay && analysis.prev2wCount >= 3)
      a.push({ msg: `Performance en baisse : WR ${analysis.wrChange > 0 ? "+" : ""}${analysis.wrChange.toFixed(0)}% vs les 2 semaines precedentes.`, level: "danger" });
    return a;
  }, [analysis]);

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>Chargement...</div>
  );

  if (!analysis) return (
    <div className="p-6 space-y-4 text-center" style={{ color: "var(--text-muted)" }}>
      <Brain size={48} className="mx-auto opacity-40" />
      <p>Ajoute des trades pour activer l&apos;AI Coach.</p>
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
            Analyse automatique de {analysis.totalTrades} trades
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`glass flex items-center gap-3 p-3 rounded-lg border ${a.level === "danger" ? "border-rose-500/40 bg-rose-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
              <AlertTriangle size={18} className={a.level === "danger" ? "text-rose-400" : "text-amber-400"} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{a.msg}</span>
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Confidence Score Predictif</h2>
          </div>
          <ConfidenceGauge score={analysis.confidenceScore} />
          <div className="mt-3 text-center">
            <span className={`text-sm font-medium ${
              analysis.confidenceScore >= 70 ? "text-emerald-400" :
              analysis.confidenceScore >= 40 ? "text-amber-400" : "text-rose-400"
            }`}>
              {analysis.confidenceLabel}
            </span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            {[
              { label: "Jour actuel", val: analysis.dayMap[DAYS[new Date().getDay()]] ? `${((analysis.dayMap[DAYS[new Date().getDay()]].wins / analysis.dayMap[DAYS[new Date().getDay()]].total) * 100).toFixed(0)}% WR` : "N/A" },
              { label: "Heure actuelle", val: analysis.hourMap[new Date().getHours().toString()] ? `${((analysis.hourMap[new Date().getHours().toString()].wins / analysis.hourMap[new Date().getHours().toString()].total) * 100).toFixed(0)}% WR` : "N/A" },
              { label: "Serie", val: analysis.trailingWins > 0 ? `+${analysis.trailingWins} gains` : analysis.trailingLosses > 0 ? `-${analysis.trailingLosses} pertes` : "Neutre" },
              { label: "Emotion", val: analysis.lastEmotion || "N/A" },
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Position Sizing Recommande</h2>
          </div>
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className={`text-center p-4 rounded-lg w-full ${
              analysis.trailingLosses >= 4 ? "bg-rose-500/10 border border-rose-500/30" :
              analysis.trailingLosses >= 2 ? "bg-amber-500/10 border border-amber-500/30" :
              "bg-emerald-500/10 border border-emerald-500/30"
            }`}>
              <div className={`text-lg font-bold ${analysis.sizingAdvice.color}`}>
                {analysis.sizingAdvice.label}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {analysis.sizingAdvice.detail}
              </p>
            </div>
            <div className="w-full space-y-2 text-xs mt-2">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Serie de gains</span>
                <span className="mono text-emerald-400">{analysis.trailingWins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Serie de pertes</span>
                <span className="mono text-rose-400">{analysis.trailingLosses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)" }}>Max consecutives</span>
                <span className="mono" style={{ color: "var(--text-secondary)" }}>{analysis.maxConsec}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best Trading Window */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Meilleure Fenetre de Trading</h2>
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Detection d&apos;Overtrading</h2>
          </div>
          {analysis.highVolDayCount > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Jours 5+ trades</div>
                  <div className="text-xl font-bold mono text-amber-400 mt-1">{analysis.highVolDayCount}</div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>WR {analysis.highVolWR.toFixed(0)}%</div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Jours normaux</div>
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
                        Jours avec 5+ trades : WR {analysis.highVolWR.toFixed(0)}% | Jours normaux : WR {analysis.normalWR.toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                      <span style={{ color: "var(--text-secondary)" }}>
                        Pas de perte de performance sur les jours a volume eleve.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <TrendingUp size={24} className="opacity-40" />
              <span className="text-sm">Aucun jour avec 5+ trades detecte.</span>
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
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>2 dernieres semaines</div>
                  <div className={`text-xl font-bold mono mt-1 ${analysis.last2wWR >= analysis.prev2wWR ? "text-emerald-400" : "text-rose-400"}`}>
                    {analysis.last2wWR.toFixed(0)}%
                  </div>
                  <div className="text-xs mono mt-1" style={{ color: "var(--text-secondary)" }}>
                    {analysis.last2wCount} trades
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>2 semaines precedentes</div>
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
                    Alerte : ta performance est en baisse significative. Analyse tes récents trades et ajuste ta stratégie.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <BarChart3 size={24} className="opacity-40" />
              <span className="text-sm">Pas assez de données (min. 4 semaines).</span>
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Score Discipline</h2>
          </div>
          <div className={`text-5xl font-bold mono ${discColor}`}>{analysis.discipline}</div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>sur 100 (7 derniers jours)</span>
          <div className="w-full space-y-1.5 mt-2 text-xs">
            {[
              { label: "Win Rate", val: Math.min(100, Math.round(analysis.weekTrades > 0 ? (trades.filter(t => new Date(t.date) >= new Date(Date.now() - 7 * 86400000) && t.result > 0).length / analysis.weekTrades) * 100 : 50)) },
              { label: "Stop Loss", val: Math.round(analysis.weekTrades > 0 ? (trades.filter(t => new Date(t.date) >= new Date(Date.now() - 7 * 86400000) && t.sl && t.sl > 0).length / Math.max(1, analysis.weekTrades)) * 100 : 100) },
              { label: "Emotions", val: Math.round(analysis.weekTrades > 0 ? (1 - trades.filter(t => new Date(t.date) >= new Date(Date.now() - 7 * 86400000) && ["Anxious", "Fearful", "Frustrated", "Angry", "Revenge", "FOMO", "Impatient"].includes(t.emotion || "")).length / Math.max(1, analysis.weekTrades)) * 100 : 80) },
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Detection de Patterns</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { icon: Calendar, label: "Meilleur jour", best: analysis.dayBW.best, worst: analysis.dayBW.worst },
              { icon: Clock, label: "Meilleure heure", best: analysis.hourBW.best ? { ...analysis.hourBW.best, key: `${analysis.hourBW.best.key}h` } : null, worst: analysis.hourBW.worst ? { ...analysis.hourBW.worst, key: `${analysis.hourBW.worst.key}h` } : null },
              { icon: BarChart3, label: "Meilleur actif", best: analysis.assetBW.best, worst: analysis.assetBW.worst },
              { icon: Zap, label: "Stratégie", best: analysis.stratBW.best, worst: analysis.stratBW.worst },
              { icon: Award, label: "Emotion", best: analysis.emotionBW.best, worst: analysis.emotionBW.worst },
              { icon: TrendingDown, label: "Pertes consécutives", best: null, worst: null, custom: `Max: ${analysis.maxConsec} | En cours: ${analysis.trailingLosses}` },
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
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Insights AI</h2>
        </div>
        <div className="space-y-2">
          {insights.map((msg, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
              <Zap size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{msg}</span>
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>P&L par Heure</h2>
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
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>P&L par Jour</h2>
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
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Heatmap Horaire — P&L par Jour &times; Heure</h2>
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
            <text x={60} y={168} fontSize="7" fill="var(--text-muted)">Perte</text>
            <rect x={85} y={161} width={14} height={8} rx={2} fill="rgba(239, 68, 68, 0.7)" />
            <rect x={101} y={161} width={14} height={8} rx={2} fill="rgba(239, 68, 68, 0.3)" />
            <rect x={117} y={161} width={14} height={8} rx={2} fill="var(--bg-hover)" />
            <rect x={133} y={161} width={14} height={8} rx={2} fill="rgba(16, 185, 129, 0.3)" />
            <rect x={149} y={161} width={14} height={8} rx={2} fill="rgba(16, 185, 129, 0.7)" />
            <text x={168} y={168} fontSize="7" fill="var(--text-muted)">Gain</text>
          </svg>
        </div>
      </div>

      {/* === NEW: Emotion Timeline === */}
      <div className="metric-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-cyan-400" size={18} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Timeline Emotionnelle</h2>
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
            <span className="text-sm">Aucune emotion enregistree. Ajoute des emotions a tes trades.</span>
          </div>
        )}
      </div>

      {/* === NEW: Forward Projection + Trade Management Quality === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forward Projection */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Projection Forward</h2>
          </div>
          {analysis.dailyPnlArr.length >= 3 ? (
            <div className="space-y-4">
              <div className={`text-center p-4 rounded-lg border ${
                analysis.avgDailyPnl >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>P&L journalier moyen (14j)</div>
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
                        <span className="font-semibold text-rose-400">A ce rythme</span>, drawdown estime de{" "}
                        <span className="mono font-bold text-rose-400">&euro;{analysis.projectedDrawdown.toFixed(0)}</span>{" "}
                        dans <span className="mono font-bold text-rose-400">30 jours</span>.
                        {analysis.daysToDrawdown && analysis.daysToDrawdown > 0 && (
                          <span> Profits actuels (&euro;{analysis.totalPnl.toFixed(0)}) epuises dans ~<span className="mono font-bold text-rose-400">{analysis.daysToDrawdown} jours</span>.</span>
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
                    <span>Il y a 14j</span><span>Aujourd&apos;hui</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Projection positive : <span className="mono font-bold text-emerald-400">+&euro;{(analysis.avgDailyPnl * 30).toFixed(0)}</span> sur les 30 prochains jours.
                        Continue comme ca !
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
                    <span>Il y a 14j</span><span>Aujourd&apos;hui</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <Flame size={24} className="opacity-40" />
              <span className="text-sm">Min. 3 jours de trading pour la projection.</span>
            </div>
          )}
        </div>

        {/* Trade Management Quality Score */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crosshair className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Qualité de Gestion des Trades</h2>
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
                    <span style={{ color: "var(--text-muted)" }}>Score global</span>
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
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Capture TP moy.</div>
                  <div className={`text-lg font-bold mono mt-1 ${analysis.avgTpCapture >= 70 ? "text-emerald-400" : analysis.avgTpCapture >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {analysis.avgTpCapture.toFixed(0)}%
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>TP atteints</div>
                  <div className="text-lg font-bold mono mt-1 text-emerald-400">
                    {analysis.tpReachedCount}
                  </div>
                  <div className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                    /{analysis.managedTradesCount}
                  </div>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Sorties prematurees</div>
                  <div className="text-lg font-bold mono mt-1 text-amber-400">
                    {analysis.prematureExitCount}
                  </div>
                </div>
              </div>

              {/* TP Capture Distribution - mini bar chart */}
              {analysis.tpCaptures.length > 0 && (
                <div>
                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Distribution de capture TP</div>
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
                      ? "Tu coupes trop souvent tes gains avant le TP. Laisse courir tes winners."
                      : analysis.avgTpCapture < 50
                        ? "Ta capture TP moyenne est faible. Ajuste tes niveaux de sortie."
                        : analysis.mgmtScore >= 70
                          ? "Excellente gestion ! Tu laisses bien courir tes gains."
                          : "Gestion correcte. Travaille a maximiser la capture de tes TP."
                    }
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4" style={{ color: "var(--text-muted)" }}>
              <Crosshair size={24} className="opacity-40" />
              <span className="text-sm">Renseigne TP et prix de sortie pour analyser ta gestion.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* === Emotion Timeline SVG Component === */
function EmotionTimelineChart({ data }: { data: { date: string; emotion: string; result: number; asset: string }[] }) {
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
      <text x={4} y={10} fontSize="7" fill="var(--text-muted)">Gains</text>
      <text x={4} y={chartH - 2} fontSize="7" fill="var(--text-muted)">Pertes</text>
    </svg>
  );
}
