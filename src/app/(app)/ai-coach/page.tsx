"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Clock,
  Calendar, Target, Shield, Zap, BarChart3, Award,
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

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.abs(value) / max : 0;
  const positive = value >= 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-[28px]">
      <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
        {value >= 0 ? "+" : ""}{value.toFixed(0)}
      </span>
      <div className="w-full h-24 rounded relative overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <div
          className={`absolute bottom-0 w-full rounded transition-all duration-700 ${positive ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
          style={{ height: `${pct * 100}%` }}
        />
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
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

    return {
      dayBW: bestWorst(dayMap), hourBW: bestWorst(hourMap), assetBW: bestWorst(assetMap),
      stratBW: bestWorst(stratMap), emotionBW: bestWorst(emotionMap),
      maxConsec, todayConsec, trailingLosses, discipline,
      hourPnl, dayPnl, dayMap, hourMap,
      totalTrades: trades.length, weekTrades: weekTrades.length,
      lastEmotion: todayTrades.length > 0 ? todayTrades[todayTrades.length - 1].emotion : null,
    };
  }, [trades]);

  const insights = useMemo(() => {
    if (!analysis) return [];
    const msgs: string[] = [];
    const { dayBW, stratBW, emotionBW, assetBW, trailingLosses } = analysis;

    if (dayBW.best && dayBW.worst && dayBW.best.key !== dayBW.worst.key)
      msgs.push(`Tu gagnes ${dayBW.best.wr.toFixed(0)}% de tes trades le ${dayBW.best.key}, mais seulement ${dayBW.worst.wr.toFixed(0)}% le ${dayBW.worst.key}.`);
    if (stratBW.best && stratBW.best.total >= 2)
      msgs.push(`Ta meilleure strategie est ${stratBW.best.key} avec ${stratBW.best.wr.toFixed(0)}% de win rate.`);
    if (emotionBW.worst && emotionBW.worst.wr < 40 && emotionBW.worst.total >= 2)
      msgs.push(`Attention : tu as tendance a perdre quand tu es "${emotionBW.worst.key}" (${emotionBW.worst.wr.toFixed(0)}% WR).`);
    if (trailingLosses >= 3)
      msgs.push(`Tu es en serie de ${trailingLosses} pertes consecutives, considere une pause.`);
    if (assetBW.best && assetBW.best.total >= 2)
      msgs.push(`Ton meilleur actif est ${assetBW.best.key} avec ${assetBW.best.wr.toFixed(0)}% de win rate.`);
    if (msgs.length === 0) msgs.push("Continue a ajouter des trades pour obtenir des insights personnalises.");
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
              { icon: Zap, label: "Strategie", best: analysis.stratBW.best, worst: analysis.stratBW.worst },
              { icon: Award, label: "Emotion", best: analysis.emotionBW.best, worst: analysis.emotionBW.worst },
              { icon: TrendingDown, label: "Pertes consecutives", best: null, worst: null, custom: `Max: ${analysis.maxConsec} | En cours: ${analysis.trailingLosses}` },
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
          <div className="flex items-end gap-[2px]">
            {Array.from({ length: 24 }, (_, h) => (
              <Bar key={h} value={analysis.hourPnl[h]} max={maxHourAbs} label={h % 3 === 0 ? `${h}h` : ""} />
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
    </div>
  );
}
