"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Activity, TrendingUp, TrendingDown, Clock, Shield, Target,
  AlertTriangle, CheckSquare, Square, Smile, Frown, Meh,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Bell, Timer,
  Flame, Globe, Sun, Moon, Crosshair, ChevronRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function isToday(dateStr: string) {
  return dateStr.slice(0, 10) === today();
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function calcRR(trade: Trade): number {
  if (!trade.sl || !trade.entry) return 0;
  const risk = Math.abs(trade.entry - trade.sl);
  if (risk === 0) return 0;
  return trade.result / risk;
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

// ─── Session Detection ──────────────────────────────────────────────────────

interface SessionInfo {
  name: string;
  emoji: string;
  start: number;
  end: number;
  color: string;
}

const SESSIONS: SessionInfo[] = [
  { name: "Tokyo", emoji: "🌏", start: 0, end: 9, color: "#f59e0b" },
  { name: "London", emoji: "🌍", start: 8, end: 17, color: "#3b82f6" },
  { name: "New York", emoji: "🌎", start: 13, end: 22, color: "#10b981" },
];

function getActiveSessions(hour: number): SessionInfo[] {
  return SESSIONS.filter((s) => hour >= s.start && hour < s.end);
}

function getSessionProgress(hour: number, minute: number, session: SessionInfo): number {
  const totalMinutes = (session.end - session.start) * 60;
  const elapsed = (hour - session.start) * 60 + minute;
  return Math.max(0, Math.min(100, (elapsed / totalMinutes) * 100));
}

function getSessionTimeRemaining(hour: number, minute: number, session: SessionInfo): string {
  const endMinutes = session.end * 60;
  const currentMinutes = hour * 60 + minute;
  const remaining = endMinutes - currentMinutes;
  if (remaining <= 0) return "Terminée";
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// ─── Checklist Storage ──────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  "Plan vérifié",
  "Risque < 2%",
  "Pas de revenge trading",
  "Stop après 3 pertes",
];

function getChecklistKey(): string {
  return `warroom-checklist-${today()}`;
}

function loadChecklist(): boolean[] {
  if (typeof window === "undefined") return CHECKLIST_ITEMS.map(() => false);
  try {
    const saved = localStorage.getItem(getChecklistKey());
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return CHECKLIST_ITEMS.map(() => false);
}

// ─── Circular Gauge Component ───────────────────────────────────────────────

function CircularGauge({
  value, max, label, color, suffix = "",
}: { value: number; max: number; label: string; color: string; suffix?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="6" opacity={0.3} />
        <circle
          cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
          fill="var(--text-primary)" fontSize="14" fontWeight="700" className="mono">
          {value.toFixed(max > 10 ? 0 : 1)}{suffix}
        </text>
      </svg>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

// ─── Mini Sparkline SVG ─────────────────────────────────────────────────────

function MiniEquityCurve({ trades }: { trades: Trade[] }) {
  const last30 = trades.slice(-30);
  if (last30.length < 2) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
        <span className="text-sm">Pas assez de trades pour la courbe</span>
      </div>
    );
  }

  const cumulative: number[] = [];
  let sum = 0;
  for (const t of last30) {
    sum += t.result;
    cumulative.push(sum);
  }

  const minVal = Math.min(0, ...cumulative);
  const maxVal = Math.max(1, ...cumulative);
  const range = maxVal - minVal || 1;
  const w = 320;
  const h = 100;
  const padding = 4;

  const points = cumulative.map((v, i) => {
    const x = padding + (i / (cumulative.length - 1)) * (w - 2 * padding);
    const y = h - padding - ((v - minVal) / range) * (h - 2 * padding);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w - padding},${h - padding} L${padding},${h - padding} Z`;
  const isPositive = sum >= 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
          <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#equityFill)" />
      <path d={linePath} fill="none" stroke={isPositive ? "#22c55e" : "#ef4444"} strokeWidth="2" />
      {/* Last point dot */}
      {cumulative.length > 0 && (
        <circle
          cx={padding + ((cumulative.length - 1) / (cumulative.length - 1)) * (w - 2 * padding)}
          cy={h - padding - ((cumulative[cumulative.length - 1] - minVal) / range) * (h - 2 * padding)}
          r="3" fill={isPositive ? "#22c55e" : "#ef4444"}
        />
      )}
    </svg>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function WarRoomPage() {
  const { trades, loading } = useTrades();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodTimeline, setMoodTimeline] = useState<{ time: string; mood: string }[]>([]);

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load checklist from localStorage
  useEffect(() => {
    setChecklist(loadChecklist());
    const savedMoods = localStorage.getItem(`warroom-moods-${today()}`);
    if (savedMoods) {
      try {
        const parsed = JSON.parse(savedMoods);
        setMoodTimeline(parsed);
        if (parsed.length > 0) setCurrentMood(parsed[parsed.length - 1].mood);
      } catch { /* ignore */ }
    }
  }, []);

  const toggleChecklist = useCallback((index: number) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      localStorage.setItem(getChecklistKey(), JSON.stringify(next));
      return next;
    });
  }, []);

  const selectMood = useCallback((mood: string) => {
    setCurrentMood(mood);
    const entry = { time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), mood };
    setMoodTimeline((prev) => {
      const next = [...prev, entry];
      localStorage.setItem(`warroom-moods-${today()}`, JSON.stringify(next));
      return next;
    });
  }, []);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const todayTrades = useMemo(() => trades.filter((t) => isToday(t.date)), [trades]);
  const weekTrades = useMemo(() => trades.filter((t) => isThisWeek(t.date)), [trades]);
  const monthTrades = useMemo(() => trades.filter((t) => isThisMonth(t.date)), [trades]);

  const todayPnl = useMemo(() => todayTrades.reduce((s, t) => s + t.result, 0), [todayTrades]);
  const weekPnl = useMemo(() => weekTrades.reduce((s, t) => s + t.result, 0), [weekTrades]);
  const monthPnl = useMemo(() => monthTrades.reduce((s, t) => s + t.result, 0), [monthTrades]);

  const todayWins = useMemo(() => todayTrades.filter((t) => t.result > 0).length, [todayTrades]);
  const todayWinRate = todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : 0;

  const bestTradeToday = useMemo(
    () => todayTrades.length > 0 ? todayTrades.reduce((best, t) => t.result > best.result ? t : best) : null,
    [todayTrades]
  );
  const worstTradeToday = useMemo(
    () => todayTrades.length > 0 ? todayTrades.reduce((worst, t) => t.result < worst.result ? t : worst) : null,
    [todayTrades]
  );

  const avgRR = useMemo(() => {
    if (todayTrades.length === 0) return 0;
    const total = todayTrades.reduce((s, t) => s + calcRR(t), 0);
    return total / todayTrades.length;
  }, [todayTrades]);

  const riskExposure = useMemo(() => {
    return todayTrades.reduce((sum, t) => {
      const potentialLoss = Math.abs(t.entry - t.sl) * t.lots * 100000;
      return sum + potentialLoss;
    }, 0);
  }, [todayTrades]);

  // Overall stats
  const allWinRate = useMemo(() => {
    if (trades.length === 0) return 0;
    return (trades.filter((t) => t.result > 0).length / trades.length) * 100;
  }, [trades]);

  const profitFactor = useMemo(() => {
    const gains = trades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0);
    const losses = Math.abs(trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0));
    return losses === 0 ? gains > 0 ? 3 : 0 : gains / losses;
  }, [trades]);

  const consistencyScore = useMemo(() => {
    if (trades.length < 5) return 0;
    const results = trades.slice(-20).map((t) => t.result);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((s, r) => s + (r - mean) ** 2, 0) / results.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 10;
    return Math.max(0, Math.min(100, 100 - cv * 20));
  }, [trades]);

  const last10 = useMemo(() => [...trades].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 10), [trades]);

  const sortedTrades = useMemo(() => [...trades].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ), [trades]);

  // Session info
  const hour = currentTime.getUTCHours();
  const minute = currentTime.getUTCMinutes();
  const activeSessions = getActiveSessions(hour);

  // Alerts
  const alerts = useMemo(() => {
    const list: { icon: typeof Bell; text: string; level: "warn" | "info" | "danger" }[] = [];
    if (todayTrades.length >= 3) {
      list.push({ icon: AlertTriangle, text: "Limite de 3 trades atteinte", level: "warn" });
    }
    const losses = todayTrades.filter((t) => t.result < 0).length;
    if (losses >= 3) {
      list.push({ icon: Shield, text: "3 pertes consécutives - arrêtez de trader", level: "danger" });
    }
    if (todayPnl < -100) {
      list.push({ icon: AlertTriangle, text: `Perte journalière: ${formatPnl(todayPnl)}$`, level: "danger" });
    }
    if (activeSessions.length === 0) {
      list.push({ icon: Moon, text: "Hors session - marché peu liquide", level: "info" });
    }
    if (activeSessions.length >= 2) {
      list.push({ icon: Zap, text: "Overlap de sessions - haute volatilité", level: "info" });
    }
    return list;
  }, [todayTrades, todayPnl, activeSessions]);

  const checklistProgress = checklist.filter(Boolean).length / CHECKLIST_ITEMS.length;

  // ─── Loading State ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl" style={{ background: "var(--border)" }} />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg" style={{ background: "var(--border)" }} />)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-lg" style={{ background: "var(--border)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const moods = [
    { emoji: "😤", label: "Frustré" },
    { emoji: "😰", label: "Anxieux" },
    { emoji: "😐", label: "Neutre" },
    { emoji: "🙂", label: "Confiant" },
    { emoji: "🔥", label: "En zone" },
  ];

  return (
    <div className="p-4 space-y-3" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair size={22} style={{ color: "var(--text-primary)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>War Room</h1>
          <span className="text-xs px-2 py-0.5 rounded-full mono"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}>
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 mono text-sm" style={{ color: "var(--text-muted)" }}>
          <Clock size={14} />
          {currentTime.toLocaleTimeString("fr-FR")}
        </div>
      </div>

      {/* ═══ 1. Live P&L Banner ═══ */}
      <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>P&L Aujourd&apos;hui</div>
              <div
                className="text-3xl font-bold mono"
                style={{
                  color: todayPnl >= 0 ? "#22c55e" : "#ef4444",
                  animation: todayTrades.length > 0 ? "pulse 2s infinite" : "none",
                }}
              >
                {formatPnl(todayPnl)}$
              </div>
            </div>
            <div className="h-12 w-px" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Trades</div>
              <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>{todayTrades.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Win Rate</div>
              <div className="text-lg font-bold mono" style={{ color: todayWinRate >= 50 ? "#22c55e" : "#ef4444" }}>
                {todayWinRate.toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Semaine</div>
              <div className="text-sm font-semibold mono" style={{ color: weekPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                {formatPnl(weekPnl)}$
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Mois</div>
              <div className="text-sm font-semibold mono" style={{ color: monthPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                {formatPnl(monthPnl)}$
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. Quick Stats Row ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} style={{ color: "#f59e0b" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Risque ouvert</span>
          </div>
          <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
            {riskExposure.toFixed(0)}$
          </div>
        </div>
        <div className="glass rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={14} style={{ color: "#22c55e" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Meilleur trade</span>
          </div>
          <div className="text-lg font-bold mono" style={{ color: "#22c55e" }}>
            {bestTradeToday ? `+${bestTradeToday.result.toFixed(2)}$` : "--"}
          </div>
        </div>
        <div className="glass rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight size={14} style={{ color: "#ef4444" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pire trade</span>
          </div>
          <div className="text-lg font-bold mono" style={{ color: "#ef4444" }}>
            {worstTradeToday ? `${worstTradeToday.result.toFixed(2)}$` : "--"}
          </div>
        </div>
        <div className="glass rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} style={{ color: "#8b5cf6" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>R:R moyen</span>
          </div>
          <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
            {avgRR.toFixed(2)}R
          </div>
        </div>
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ gridAutoRows: "auto" }}>

        {/* ═══ 3. Mini Equity Curve ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Courbe Equity (30 derniers trades)
            </span>
          </div>
          <div style={{ height: "100px" }}>
            <MiniEquityCurve trades={sortedTrades} />
          </div>
        </div>

        {/* ═══ 5. Performance Gauges ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Performance</span>
          </div>
          <div className="flex justify-around">
            <CircularGauge value={allWinRate} max={100} label="Win Rate" color="#22c55e" suffix="%" />
            <CircularGauge value={Math.min(profitFactor, 3)} max={3} label="Profit Factor" color="#3b82f6" />
            <CircularGauge value={consistencyScore} max={100} label="Consistance" color="#8b5cf6" suffix="%" />
          </div>
        </div>

        {/* ═══ 4. Trade Log ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Derniers trades
            </span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: "200px" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-1 px-2">Heure</th>
                  <th className="text-left py-1 px-2">Actif</th>
                  <th className="text-left py-1 px-2">Dir.</th>
                  <th className="text-right py-1 px-2">Résultat</th>
                  <th className="text-right py-1 px-2">R:R</th>
                </tr>
              </thead>
              <tbody>
                {last10.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                      Aucun trade enregistré
                    </td>
                  </tr>
                ) : (
                  last10.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-1.5 px-2 mono" style={{ color: "var(--text-muted)" }}>
                        {formatTime(t.createdAt)}
                      </td>
                      <td className="py-1.5 px-2 font-medium" style={{ color: "var(--text-primary)" }}>
                        {t.asset}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="flex items-center gap-1" style={{
                          color: t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long"
                            ? "#22c55e" : "#ef4444"
                        }}>
                          {t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long"
                            ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right mono font-semibold" style={{
                        color: t.result >= 0 ? "#22c55e" : "#ef4444"
                      }}>
                        {formatPnl(t.result)}$
                      </td>
                      <td className="py-1.5 px-2 text-right mono" style={{ color: "var(--text-muted)" }}>
                        {calcRR(t).toFixed(1)}R
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ 6. Session Timer ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Timer size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Sessions actives</span>
          </div>
          {activeSessions.length === 0 ? (
            <div className="flex items-center gap-2 py-3" style={{ color: "var(--text-muted)" }}>
              <Moon size={16} />
              <span className="text-sm">Aucune session active</span>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => {
                const progress = getSessionProgress(hour, minute, session);
                const remaining = getSessionTimeRemaining(hour, minute, session);
                return (
                  <div key={session.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {session.emoji} {session.name}
                      </span>
                      <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>{remaining}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: session.color,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ 7. Daily Rules Checklist ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Checklist du jour</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${checklistProgress * 100}%`,
                background: checklistProgress === 1 ? "#22c55e" : "#f59e0b",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, i) => (
              <button
                key={item}
                className="flex items-center gap-2 w-full text-left text-xs py-1 hover:opacity-80 transition-opacity"
                onClick={() => toggleChecklist(i)}
                style={{ color: checklist[i] ? "var(--text-muted)" : "var(--text-primary)" }}
              >
                {checklist[i]
                  ? <CheckSquare size={14} style={{ color: "#22c55e" }} />
                  : <Square size={14} style={{ color: "var(--text-muted)" }} />}
                <span style={{ textDecoration: checklist[i] ? "line-through" : "none" }}>{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ 8. Emotion Tracker ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Smile size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Humeur</span>
          </div>
          <div className="flex justify-between mb-3">
            {moods.map((m) => (
              <button
                key={m.emoji}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all"
                style={{
                  background: currentMood === m.emoji ? "var(--border)" : "transparent",
                  transform: currentMood === m.emoji ? "scale(1.15)" : "scale(1)",
                }}
                onClick={() => selectMood(m.emoji)}
                title={m.label}
              >
                <span className="text-lg">{m.emoji}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</span>
              </button>
            ))}
          </div>
          {moodTimeline.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {moodTimeline.slice(-8).map((entry, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--text-muted)" }}>
                  {entry.time} {entry.mood}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ═══ 9. Market Sessions Timeline ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Timeline Sessions (UTC)</span>
          </div>
          <div className="relative" style={{ height: "80px" }}>
            {/* Hour markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] mono" style={{ color: "var(--text-muted)" }}>
              {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                <span key={h}>{h.toString().padStart(2, "0")}h</span>
              ))}
            </div>
            {/* Session bars */}
            {SESSIONS.map((session, idx) => {
              const left = (session.start / 24) * 100;
              const width = ((session.end - session.start) / 24) * 100;
              return (
                <div
                  key={session.name}
                  className="absolute rounded-md flex items-center px-2 text-[10px] font-medium"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${18 + idx * 20}px`,
                    height: "16px",
                    background: `${session.color}25`,
                    border: `1px solid ${session.color}50`,
                    color: session.color,
                  }}
                >
                  {session.emoji} {session.name}
                </div>
              );
            })}
            {/* Current time marker */}
            <div
              className="absolute top-3 bottom-0 w-0.5"
              style={{
                left: `${(hour / 24) * 100}%`,
                background: "#ef4444",
                zIndex: 10,
              }}
            >
              <div
                className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full"
                style={{ background: "#ef4444" }}
              />
            </div>
          </div>
        </div>

        {/* ═══ 10. Alerts & Reminders ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Alertes</span>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-2" style={{ color: "var(--text-muted)" }}>
                <CheckSquare size={14} />
                <span className="text-xs">Aucune alerte - tout est sous contrôle</span>
              </div>
            ) : (
              alerts.map((alert, i) => {
                const AlertIcon = alert.icon;
                const bgColor = alert.level === "danger" ? "#ef444415" : alert.level === "warn" ? "#f59e0b15" : "#3b82f615";
                const textColor = alert.level === "danger" ? "#ef4444" : alert.level === "warn" ? "#f59e0b" : "#3b82f6";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs p-2 rounded-lg"
                    style={{ background: bgColor, color: textColor }}
                  >
                    <AlertIcon size={14} />
                    <span>{alert.text}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
