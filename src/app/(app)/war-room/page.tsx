"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Activity, TrendingUp, TrendingDown, Clock, Shield, Target,
  AlertTriangle, CheckSquare, Square, Smile, Frown, Meh,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Bell, Timer,
  Flame, Globe, Sun, Moon, Crosshair, ChevronRight, Settings, X,
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

// ─── DST-Aware Session Detection ────────────────────────────────────────────

interface SessionInfo {
  name: string;
  emoji: string;
  start: number; // UTC hour
  end: number;   // UTC hour
  color: string;
}

/**
 * Check if US DST is active (second Sunday of March to first Sunday of November)
 */
function isUsDst(date: Date): boolean {
  const year = date.getFullYear();
  // Second Sunday of March
  const marchFirst = new Date(year, 2, 1);
  const marchFirstDay = marchFirst.getDay();
  const secondSunday = marchFirstDay === 0 ? 8 : 8 + (7 - marchFirstDay);
  const dstStart = new Date(year, 2, secondSunday, 2, 0, 0);
  // First Sunday of November
  const novFirst = new Date(year, 10, 1);
  const novFirstDay = novFirst.getDay();
  const firstSundayNov = novFirstDay === 0 ? 1 : 1 + (7 - novFirstDay);
  const dstEnd = new Date(year, 10, firstSundayNov, 2, 0, 0);
  return date >= dstStart && date < dstEnd;
}

/**
 * Check if EU DST is active (last Sunday of March to last Sunday of October)
 */
function isEuDst(date: Date): boolean {
  const year = date.getFullYear();
  // Last Sunday of March
  const marchLast = new Date(year, 2, 31);
  const daysBack = marchLast.getDay();
  const lastSundayMarch = new Date(year, 2, 31 - daysBack, 1, 0, 0);
  // Last Sunday of October
  const octLast = new Date(year, 9, 31);
  const daysBackOct = octLast.getDay();
  const lastSundayOct = new Date(year, 9, 31 - daysBackOct, 1, 0, 0);
  return date >= lastSundayMarch && date < lastSundayOct;
}

function getSessions(date: Date): SessionInfo[] {
  const usDst = isUsDst(date);
  const euDst = isEuDst(date);

  // Tokyo: standard 00:00-09:00 UTC (Japan doesn't observe DST)
  const tokyoStart = 0;
  const tokyoEnd = 9;

  // London: standard 08:00-17:00 UTC; during EU DST: 07:00-16:00 UTC
  const londonStart = euDst ? 7 : 8;
  const londonEnd = euDst ? 16 : 17;

  // New York: standard 13:00-22:00 UTC; during US DST: 12:00-21:00 UTC
  const nyStart = usDst ? 12 : 13;
  const nyEnd = usDst ? 21 : 22;

  return [
    { name: "Tokyo", emoji: "\ud83c\udf0f", start: tokyoStart, end: tokyoEnd, color: "#f59e0b" },
    { name: "London", emoji: "\ud83c\udf0d", start: londonStart, end: londonEnd, color: "#3b82f6" },
    { name: "New York", emoji: "\ud83c\udf0e", start: nyStart, end: nyEnd, color: "#10b981" },
  ];
}

function getActiveSessions(hour: number, sessions: SessionInfo[]): SessionInfo[] {
  return sessions.filter((s) => hour >= s.start && hour < s.end);
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
  if (remaining <= 0) return "Termin\u00e9e";
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * Determine which session a trade falls into based on its date/time (UTC hour)
 */
function getTradeSession(trade: Trade, sessions: SessionInfo[]): string {
  const d = new Date(trade.date);
  const h = d.getUTCHours();
  for (const s of sessions) {
    if (h >= s.start && h < s.end) return s.name;
  }
  return "Hors session";
}

// ─── Checklist Storage ──────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  "Plan v\u00e9rifi\u00e9",
  "Risque < 2%",
  "Pas de revenge trading",
  "Stop apr\u00e8s 3 pertes",
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

// ─── Alert Settings Storage ─────────────────────────────────────────────────

interface AlertSettings {
  maxTrades: number;
  maxLosses: number;
  dailyProfitTarget: number;
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  maxTrades: 3,
  maxLosses: 3,
  dailyProfitTarget: 200,
};

function loadAlertSettings(): AlertSettings {
  if (typeof window === "undefined") return DEFAULT_ALERT_SETTINGS;
  try {
    const saved = localStorage.getItem("warroom-alert-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_ALERT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_ALERT_SETTINGS;
}

function saveAlertSettings(settings: AlertSettings): void {
  localStorage.setItem("warroom-alert-settings", JSON.stringify(settings));
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
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load checklist, moods, and alert settings from localStorage
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
    const settings = loadAlertSettings();
    setAlertSettings(settings);
    setTempSettings(settings);
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

  const openSettingsModal = useCallback(() => {
    setTempSettings({ ...alertSettings });
    setShowSettingsModal(true);
  }, [alertSettings]);

  const saveSettings = useCallback(() => {
    setAlertSettings(tempSettings);
    saveAlertSettings(tempSettings);
    setShowSettingsModal(false);
  }, [tempSettings]);

  // ─── DST-aware sessions ───────────────────────────────────────────────
  const sessions = useMemo(() => getSessions(currentTime), [currentTime]);

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

  // ─── Fix: sort by `date` instead of `createdAt` ──────────────────────
  const last10 = useMemo(() => [...trades].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10), [trades]);

  const sortedTrades = useMemo(() => [...trades].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ), [trades]);

  // Session info (DST-aware)
  const hour = currentTime.getUTCHours();
  const minute = currentTime.getUTCMinutes();
  const activeSessions = getActiveSessions(hour, sessions);

  // ─── Alerts with customizable thresholds ──────────────────────────────
  const alerts = useMemo(() => {
    const list: { icon: typeof Bell; text: string; level: "warn" | "info" | "danger" }[] = [];
    if (todayTrades.length >= alertSettings.maxTrades) {
      list.push({ icon: AlertTriangle, text: `Limite de ${alertSettings.maxTrades} trades atteinte`, level: "warn" });
    }
    const losses = todayTrades.filter((t) => t.result < 0).length;
    if (losses >= alertSettings.maxLosses) {
      list.push({ icon: Shield, text: `${alertSettings.maxLosses} pertes - arr\u00eatez de trader`, level: "danger" });
    }
    if (todayPnl < -(alertSettings.dailyProfitTarget * 0.5)) {
      list.push({ icon: AlertTriangle, text: `Perte journali\u00e8re: ${formatPnl(todayPnl)}$`, level: "danger" });
    }
    if (todayPnl >= alertSettings.dailyProfitTarget) {
      list.push({ icon: Target, text: `Objectif journalier atteint: ${formatPnl(todayPnl)}$ / ${alertSettings.dailyProfitTarget}$`, level: "info" });
    }
    if (activeSessions.length === 0) {
      list.push({ icon: Moon, text: "Hors session - march\u00e9 peu liquide", level: "info" });
    }
    if (activeSessions.length >= 2) {
      list.push({ icon: Zap, text: "Overlap de sessions - haute volatilit\u00e9", level: "info" });
    }
    return list;
  }, [todayTrades, todayPnl, activeSessions, alertSettings]);

  const checklistProgress = checklist.filter(Boolean).length / CHECKLIST_ITEMS.length;

  // ─── Performance par Session ──────────────────────────────────────────
  const sessionPerformance = useMemo(() => {
    const perf: Record<string, { pnl: number; trades: number; wins: number }> = {
      "Tokyo": { pnl: 0, trades: 0, wins: 0 },
      "London": { pnl: 0, trades: 0, wins: 0 },
      "New York": { pnl: 0, trades: 0, wins: 0 },
      "Hors session": { pnl: 0, trades: 0, wins: 0 },
    };
    for (const t of trades) {
      const sessionName = getTradeSession(t, sessions);
      if (!perf[sessionName]) perf[sessionName] = { pnl: 0, trades: 0, wins: 0 };
      perf[sessionName].pnl += t.result;
      perf[sessionName].trades += 1;
      if (t.result > 0) perf[sessionName].wins += 1;
    }
    return perf;
  }, [trades, sessions]);

  // ─── Emotion-Performance Correlation ──────────────────────────────────
  const emotionStats = useMemo(() => {
    const emotionPnl: Record<string, { total: number; count: number }> = {};
    for (const t of trades) {
      if (t.emotion) {
        if (!emotionPnl[t.emotion]) emotionPnl[t.emotion] = { total: 0, count: 0 };
        emotionPnl[t.emotion].total += t.result;
        emotionPnl[t.emotion].count += 1;
      }
    }

    const entries = Object.entries(emotionPnl).map(([emotion, data]) => ({
      emotion,
      avg: data.count > 0 ? data.total / data.count : 0,
      count: data.count,
    }));

    if (entries.length === 0) return null;

    entries.sort((a, b) => b.avg - a.avg);
    const best = entries[0];
    const worst = entries[entries.length - 1];

    const total = entries.reduce((s, e) => s + e.count, 0);
    const bestPct = total > 0 ? Math.round((best.count / total) * 100) : 0;
    const worstPct = total > 0 ? Math.round((worst.count / total) * 100) : 0;

    return { best, worst, bestPct, worstPct };
  }, [trades]);

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
    { emoji: "\ud83d\ude24", label: "Frustr\u00e9" },
    { emoji: "\ud83d\ude30", label: "Anxieux" },
    { emoji: "\ud83d\ude10", label: "Neutre" },
    { emoji: "\ud83d\ude42", label: "Confiant" },
    { emoji: "\ud83d\udd25", label: "En zone" },
  ];

  const sessionColors: Record<string, string> = {
    "Tokyo": "#f59e0b",
    "London": "#3b82f6",
    "New York": "#10b981",
    "Hors session": "#6b7280",
  };

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
          {/* DST indicator */}
          {(isUsDst(currentTime) || isEuDst(currentTime)) && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              DST {isUsDst(currentTime) && "US"}{isUsDst(currentTime) && isEuDst(currentTime) && "/"}{isEuDst(currentTime) && "EU"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openSettingsModal}
            className="p-2 rounded-lg hover:bg-[--bg-secondary] transition"
            style={{ color: "var(--text-muted)" }}
            title="Param\u00e8tres des alertes"
          >
            <Settings size={16} />
          </button>
          <div className="flex items-center gap-2 mono text-sm" style={{ color: "var(--text-muted)" }}>
            <Clock size={14} />
            {currentTime.toLocaleTimeString("fr-FR")}
          </div>
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
              <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
                {todayTrades.length}
                <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/{alertSettings.maxTrades}</span>
              </div>
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

        {/* ═══ 4. Trade Log (sorted by date) ═══ */}
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
                  <th className="text-left py-1 px-2">Date</th>
                  <th className="text-left py-1 px-2">Actif</th>
                  <th className="text-left py-1 px-2">Dir.</th>
                  <th className="text-right py-1 px-2">R&eacute;sultat</th>
                  <th className="text-right py-1 px-2">R:R</th>
                </tr>
              </thead>
              <tbody>
                {last10.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                      Aucun trade enregistr&eacute;
                    </td>
                  </tr>
                ) : (
                  last10.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-1.5 px-2 mono" style={{ color: "var(--text-muted)" }}>
                        {formatTime(t.date)}
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

        {/* ═══ 6. Session Timer (DST-aware) ═══ */}
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
                        <span className="ml-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                          ({session.start.toString().padStart(2, "0")}h-{session.end.toString().padStart(2, "0")}h UTC)
                        </span>
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

        {/* ═══ 9. Market Sessions Timeline (DST-aware) ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Timeline Sessions (UTC)
              {(isUsDst(currentTime) || isEuDst(currentTime)) && (
                <span className="ml-2 text-[10px] text-amber-400 font-normal">
                  DST actif: {isUsDst(currentTime) && "US"}{isUsDst(currentTime) && isEuDst(currentTime) && " + "}{isEuDst(currentTime) && "EU"}
                </span>
              )}
            </span>
          </div>
          <div className="relative" style={{ height: "80px" }}>
            {/* Hour markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] mono" style={{ color: "var(--text-muted)" }}>
              {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                <span key={h}>{h.toString().padStart(2, "0")}h</span>
              ))}
            </div>
            {/* Session bars */}
            {sessions.map((session, idx) => {
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Alertes</span>
            </div>
            <button
              onClick={openSettingsModal}
              className="p-1 rounded hover:bg-[--bg-secondary] transition"
              style={{ color: "var(--text-muted)" }}
              title="Configurer les seuils"
            >
              <Settings size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-2" style={{ color: "var(--text-muted)" }}>
                <CheckSquare size={14} />
                <span className="text-xs">Aucune alerte - tout est sous contr&ocirc;le</span>
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

        {/* ═══ 11. Performance par Session ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Performance par Session</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(sessionPerformance).map(([name, data]) => {
              const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
              const color = sessionColors[name] || "#6b7280";
              return (
                <div key={name} className="rounded-lg p-3" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-medium" style={{ color }}>{name}</span>
                  </div>
                  <div className="text-lg font-bold mono" style={{ color: data.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                    {formatPnl(data.pnl)}$
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.trades} trades</span>
                    <span className="text-[10px] mono" style={{ color: winRate >= 50 ? "#22c55e" : "#ef4444" }}>
                      {winRate.toFixed(0)}% WR
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ 12. Emotion-Performance Correlation ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Smile size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Corr&eacute;lation &Eacute;motion-Performance
            </span>
          </div>
          {emotionStats ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "#22c55e10", border: "1px solid #22c55e30" }}>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight size={12} style={{ color: "#22c55e" }} />
                  <span className="text-xs font-medium" style={{ color: "#22c55e" }}>Vos meilleurs trades</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {emotionStats.best.emotion}
                  </span>
                  <span className="text-xs mono" style={{ color: "#22c55e" }}>
                    {emotionStats.bestPct}% ({emotionStats.best.count} trades, moy. {formatPnl(emotionStats.best.avg)}$)
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "#ef444410", border: "1px solid #ef444430" }}>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight size={12} style={{ color: "#ef4444" }} />
                  <span className="text-xs font-medium" style={{ color: "#ef4444" }}>Vos pires trades</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {emotionStats.worst.emotion}
                  </span>
                  <span className="text-xs mono" style={{ color: "#ef4444" }}>
                    {emotionStats.worstPct}% ({emotionStats.worst.count} trades, moy. {formatPnl(emotionStats.worst.avg)}$)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3" style={{ color: "var(--text-muted)" }}>
              <Meh size={16} />
              <span className="text-sm">Ajoutez des \u00e9motions \u00e0 vos trades pour voir la corr\u00e9lation</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Settings Modal ═══ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                <Settings size={16} className="inline mr-2" style={{ color: "var(--text-secondary)" }} />
                Param\u00e8tres des alertes
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded-lg hover:bg-[--bg-secondary] transition" style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Max trades par jour
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tempSettings.maxTrades}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxTrades: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-lg text-sm mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Max pertes par jour
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tempSettings.maxLosses}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxLosses: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-lg text-sm mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Objectif profit journalier ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={tempSettings.dailyProfitTarget}
                  onChange={(e) => setTempSettings({ ...tempSettings, dailyProfitTarget: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-lg text-sm mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveSettings}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
