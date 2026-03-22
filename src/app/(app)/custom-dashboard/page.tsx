"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";
import {
  LayoutDashboard,
  Settings2,
  X,
  TrendingUp,
  Target,
  DollarSign,
  List,
  CalendarDays,
  Flame,
  BarChart3,
  Globe,
  Activity,
  Compass,
  Trophy,
  MessageSquare,
  Plus,
  RotateCcw,
  Lock,
  Crown,
  Check,
  Timer,
  Gauge,
  Star,
  ClipboardCheck,
  Lightbulb,
  Calendar,
} from "lucide-react";

import { WidgetWrapper } from "@/components/widgets";
import { PnlTodayWidget } from "@/components/widgets";
import { WinRateWidget } from "@/components/widgets";
import { RecentTradesWidget } from "@/components/widgets";
import { EquityCurveMiniWidget } from "@/components/widgets";
import { CalendarMiniWidget } from "@/components/widgets";
import { TradingSessionsWidget } from "@/components/widgets";
import { QuickStatsWidget } from "@/components/widgets";
import { StreakWidget } from "@/components/widgets";
import { FearGreedWidget } from "@/components/widgets";
import { DailyBiasWidget } from "@/components/widgets";
import { GoalsProgressWidget } from "@/components/widgets";
import { ChatPreviewWidget } from "@/components/widgets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WidgetId =
  | "pnl-today"
  | "win-rate"
  | "recent-trades"
  | "equity-curve"
  | "calendar-mini"
  | "sessions-clock"
  | "quick-stats"
  | "streak"
  | "fear-greed"
  | "daily-bias"
  | "goals-progress"
  | "chat-preview"
  | "fomc-countdown"
  | "fear-greed-gauge"
  | "trade-du-jour"
  | "regles-du-jour"
  | "astuce"
  | "calendrier-mini";

type WidgetSize = "small" | "large";

interface WidgetMeta {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  defaultSize: WidgetSize;
  /** true = widget does NOT need trades prop (fetches own data) */
  standalone: boolean;
}

interface LayoutItem {
  id: WidgetId;
  size: WidgetSize;
}

// ---------------------------------------------------------------------------
// FOMC 2026 dates
// ---------------------------------------------------------------------------

const FOMC_DATES_2026 = [
  "2026-01-28", "2026-03-18", "2026-05-06", "2026-06-17",
  "2026-07-29", "2026-09-16", "2026-11-04", "2026-12-16",
];

function getNextFOMC(): { date: Date; label: string } {
  const now = new Date();
  for (const d of FOMC_DATES_2026) {
    const fDate = new Date(d + "T18:00:00Z");
    if (fDate > now) return { date: fDate, label: d };
  }
  // fallback: first of next year
  return { date: new Date("2027-01-27T18:00:00Z"), label: "2027-01-27" };
}

// ---------------------------------------------------------------------------
// Inline New Widget Components
// ---------------------------------------------------------------------------

function FomcCountdownWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const next = getNextFOMC();
  const diff = next.date.getTime() - now.getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  const hours = Math.max(0, Math.floor((diff % 86_400_000) / 3_600_000));
  const dateStr = next.date.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: "100%" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: days <= 7 ? "#f59e0b" : "#06b6d4" }}>{days}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>jours</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: days <= 7 ? "#f59e0b" : "#06b6d4" }}>{hours}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>heures</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{dateStr}</div>
    </div>
  );
}

function FearGreedGaugeWidget() {
  // Simulated Fear & Greed index based on day-of-year seed
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const value = ((dayOfYear * 17 + 31) % 100);
  const label = value < 25 ? "Peur extr\u00eame" : value < 45 ? "Peur" : value < 55 ? "Neutre" : value < 75 ? "Cupidit\u00e9" : "Cupidit\u00e9 extr\u00eame";
  const color = value < 25 ? "#ef4444" : value < 45 ? "#f97316" : value < 55 ? "#eab308" : value < 75 ? "#22c55e" : "#16a34a";

  const angle = -90 + (value / 100) * 180;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, height: "100%" }}>
      <svg viewBox="0 0 120 70" width="120" height="70">
        {/* background arc */}
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
        {/* colored arc segments */}
        <path d="M10 60 A50 50 0 0 1 35 18" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
        <path d="M35 18 A50 50 0 0 1 60 10" fill="none" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
        <path d="M60 10 A50 50 0 0 1 85 18" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" />
        <path d="M85 18 A50 50 0 0 1 110 60" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" />
        {/* needle */}
        <line
          x1="60" y1="60"
          x2={60 + 40 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 40 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="3" fill={color} />
      </svg>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

function TradeDuJourWidget() {
  // Simulated community trade of the day
  const trades = [
    { pair: "EUR/USD", dir: "Long", pips: "+42", user: "TraderPro88" },
    { pair: "GBP/JPY", dir: "Short", pips: "+67", user: "FxMaster" },
    { pair: "NAS100", dir: "Long", pips: "+120", user: "ScalpKing" },
    { pair: "XAU/USD", dir: "Long", pips: "+38", user: "GoldHunter" },
    { pair: "USD/CAD", dir: "Short", pips: "+29", user: "MapleFx" },
  ];
  const dayIdx = new Date().getDate() % trades.length;
  const t = trades[dayIdx];
  const isLong = t.dir === "Long";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t.pair}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
          background: isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: isLong ? "#22c55e" : "#ef4444",
        }}>
          {t.dir}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>par {t.user}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{t.pips} pips</span>
      </div>
    </div>
  );
}

function ReglesDuJourWidget() {
  const [checks, setChecks] = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("protrade-regles-du-jour");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === new Date().toDateString() && Array.isArray(parsed.checks)) {
          setChecks(parsed.checks);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const toggle = (i: number) => {
    setChecks(prev => {
      const next = [...prev];
      next[i] = !next[i];
      localStorage.setItem("protrade-regles-du-jour", JSON.stringify({ date: new Date().toDateString(), checks: next }));
      return next;
    });
  };

  const rules = [
    "Respecter le stop-loss",
    "Max 3 trades/jour",
    "Attendre confirmation",
    "Risk/reward min 1:2",
    "Pas de revenge trading",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      {rules.map((r, i) => (
        <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: checks[i] ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checks[i] ? "line-through" : "none" }}>
          <input
            type="checkbox"
            checked={checks[i]}
            onChange={() => toggle(i)}
            style={{ accentColor: "#06b6d4", width: 14, height: 14, cursor: "pointer" }}
          />
          {r}
        </label>
      ))}
    </div>
  );
}

function AstuceWidget() {
  const tips = [
    "Ne tradez jamais sans stop-loss. La gestion du risque est la cl\u00e9.",
    "Tenez un journal de trading pour identifier vos erreurs r\u00e9currentes.",
    "Attendez toujours la confirmation avant d\u2019entrer en position.",
    "La patience est votre meilleur alli\u00e9. Les meilleures opportunit\u00e9s viennent \u00e0 ceux qui attendent.",
    "Respectez votre plan de trading. L\u2019\u00e9motion est l\u2019ennemi du trader.",
    "Un ratio risque/r\u00e9compense de 1:2 minimum est essentiel.",
    "Le march\u00e9 sera l\u00e0 demain. Prot\u00e9gez votre capital aujourd\u2019hui.",
    "Analysez vos pertes autant que vos gains. Chaque trade est une le\u00e7on.",
    "Ne risquez jamais plus de 1-2% de votre capital par trade.",
    "Backtest avant de trader en r\u00e9el. La confiance vient de la pr\u00e9paration.",
    "Les sessions London et New York offrent le plus de volatilit\u00e9 en Forex.",
    "Utilisez plusieurs timeframes pour confirmer votre analyse.",
    "\u00c9vitez de trader pendant les annonces \u00e9conomiques majeures si vous d\u00e9butez.",
    "Prenez des pauses r\u00e9guli\u00e8res. Le surmenage m\u00e8ne \u00e0 de mauvaises d\u00e9cisions.",
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const tip = tips[dayOfYear % tips.length];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: "100%" }}>
      <Lightbulb size={20} style={{ color: "#f59e0b", flexShrink: 0 }} />
      <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>{tip}</p>
    </div>
  );
}

function CalendrierMiniWidget({ trades }: { trades: Trade[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start

  // Build daily P&L map
  const dailyPnl = useMemo(() => {
    const map: Record<number, number> = {};
    trades.forEach(t => {
      const d = new Date(t.date || t.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + (t.result ?? 0);
      }
    });
    return map;
  }, [trades, year, month]);

  const monthName = now.toLocaleDateString("fr-FR", { month: "long" });
  const days = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div style={{ fontSize: 10, height: "100%" }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--text-primary)", marginBottom: 4, textTransform: "capitalize" }}>
        {monthName} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, textAlign: "center" }}>
        {days.map((d, i) => (
          <div key={i} style={{ color: "var(--text-muted)", fontWeight: 600, paddingBottom: 2 }}>{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const pnl = dailyPnl[day];
          const isToday = day === now.getDate();
          let bg = "transparent";
          if (pnl !== undefined) {
            bg = pnl > 0 ? "rgba(34,197,94,0.25)" : pnl < 0 ? "rgba(239,68,68,0.25)" : "rgba(234,179,8,0.15)";
          }
          return (
            <div
              key={day}
              style={{
                borderRadius: 4,
                padding: "2px 0",
                background: bg,
                color: isToday ? "#06b6d4" : "var(--text-secondary)",
                fontWeight: isToday ? 700 : 400,
                border: isToday ? "1px solid #06b6d4" : "1px solid transparent",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDGETS: WidgetMeta[] = [
  { id: "pnl-today", label: "widgetTodayPnl", icon: <DollarSign size={16} />, defaultSize: "small", standalone: false },
  { id: "win-rate", label: "widgetWinRate", icon: <Target size={16} />, defaultSize: "small", standalone: false },
  { id: "recent-trades", label: "widgetRecentTrades", icon: <List size={16} />, defaultSize: "large", standalone: false },
  { id: "equity-curve", label: "widgetEquityCurve", icon: <TrendingUp size={16} />, defaultSize: "large", standalone: false },
  { id: "calendar-mini", label: "widgetCalendar", icon: <CalendarDays size={16} />, defaultSize: "large", standalone: false },
  { id: "sessions-clock", label: "widgetSessions", icon: <Globe size={16} />, defaultSize: "small", standalone: true },
  { id: "quick-stats", label: "widgetQuickStats", icon: <BarChart3 size={16} />, defaultSize: "small", standalone: false },
  { id: "streak", label: "widgetStreak", icon: <Flame size={16} />, defaultSize: "small", standalone: false },
  { id: "fear-greed", label: "widgetFearGreed", icon: <Activity size={16} />, defaultSize: "small", standalone: true },
  { id: "daily-bias", label: "widgetDailyBias", icon: <Compass size={16} />, defaultSize: "small", standalone: true },
  { id: "goals-progress", label: "widgetGoals", icon: <Trophy size={16} />, defaultSize: "small", standalone: false },
  { id: "chat-preview", label: "widgetChat", icon: <MessageSquare size={16} />, defaultSize: "small", standalone: true },
  // --- New widgets ---
  { id: "fomc-countdown", label: "Prochain FOMC", icon: <Timer size={16} />, defaultSize: "small", standalone: true },
  { id: "fear-greed-gauge", label: "Fear & Greed", icon: <Gauge size={16} />, defaultSize: "small", standalone: true },
  { id: "trade-du-jour", label: "Trade du Jour", icon: <Star size={16} />, defaultSize: "small", standalone: true },
  { id: "regles-du-jour", label: "R\u00e8gles du Jour", icon: <ClipboardCheck size={16} />, defaultSize: "small", standalone: true },
  { id: "astuce", label: "Astuce", icon: <Lightbulb size={16} />, defaultSize: "small", standalone: true },
  { id: "calendrier-mini", label: "Calendrier Mini", icon: <Calendar size={16} />, defaultSize: "small", standalone: false },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "pnl-today", size: "small" },
  { id: "win-rate", size: "small" },
  { id: "streak", size: "small" },
  { id: "sessions-clock", size: "small" },
  { id: "equity-curve", size: "large" },
  { id: "recent-trades", size: "large" },
  { id: "calendar-mini", size: "large" },
  { id: "quick-stats", size: "small" },
];

const STORAGE_KEY = "protrade-dashboard-v3";

// ---------------------------------------------------------------------------
// Migration helper: convert v2 (WidgetId[]) to v3 (LayoutItem[])
// ---------------------------------------------------------------------------

function migrateLayout(raw: unknown): LayoutItem[] | null {
  if (!Array.isArray(raw)) return null;
  const validIds = new Set(WIDGETS.map((w) => w.id));
  // Check if v2 format (string[])
  if (raw.length > 0 && typeof raw[0] === "string") {
    const items: LayoutItem[] = (raw as string[])
      .filter((id) => validIds.has(id as WidgetId))
      .map((id) => {
        const meta = WIDGETS.find((w) => w.id === id);
        return { id: id as WidgetId, size: meta?.defaultSize ?? "small" };
      });
    return items.length > 0 ? items : null;
  }
  // v3 format
  const items: LayoutItem[] = (raw as LayoutItem[])
    .filter((item) => item && validIds.has(item.id))
    .map((item) => ({ id: item.id, size: item.size === "large" ? "large" : "small" }));
  return items.length > 0 ? items : null;
}

// ---------------------------------------------------------------------------
// Widget Renderers
// ---------------------------------------------------------------------------

function WidgetRenderer({ id, trades }: { id: WidgetId; trades: Trade[] }) {
  switch (id) {
    case "pnl-today":
      return <PnlTodayWidget trades={trades} />;
    case "win-rate":
      return <WinRateWidget trades={trades} />;
    case "recent-trades":
      return <RecentTradesWidget trades={trades} />;
    case "equity-curve":
      return <EquityCurveMiniWidget trades={trades} />;
    case "calendar-mini":
      return <CalendarMiniWidget trades={trades} />;
    case "sessions-clock":
      return <TradingSessionsWidget />;
    case "quick-stats":
      return <QuickStatsWidget trades={trades} />;
    case "streak":
      return <StreakWidget trades={trades} />;
    case "fear-greed":
      return <FearGreedWidget />;
    case "daily-bias":
      return <DailyBiasWidget />;
    case "goals-progress":
      return <GoalsProgressWidget trades={trades} />;
    case "chat-preview":
      return <ChatPreviewWidget />;
    // New widgets
    case "fomc-countdown":
      return <FomcCountdownWidget />;
    case "fear-greed-gauge":
      return <FearGreedGaugeWidget />;
    case "trade-du-jour":
      return <TradeDuJourWidget />;
    case "regles-du-jour":
      return <ReglesDuJourWidget />;
    case "astuce":
      return <AstuceWidget />;
    case "calendrier-mini":
      return <CalendrierMiniWidget trades={trades} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomDashboardPage() {
  const { t } = useTranslation();
  const { trades } = useTrades();
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  // Load from localStorage (with v2 migration)
  useEffect(() => {
    try {
      // Try v3 first
      const storedV3 = localStorage.getItem(STORAGE_KEY);
      if (storedV3) {
        const parsed = JSON.parse(storedV3);
        const migrated = migrateLayout(parsed);
        setLayout(migrated ?? [...DEFAULT_LAYOUT]);
      } else {
        // Try migrating from v2
        const storedV2 = localStorage.getItem("protrade-dashboard-v2");
        if (storedV2) {
          const parsed = JSON.parse(storedV2);
          const migrated = migrateLayout(parsed);
          setLayout(migrated ?? [...DEFAULT_LAYOUT]);
        } else {
          setLayout([...DEFAULT_LAYOUT]);
        }
      }
    } catch {
      setLayout([...DEFAULT_LAYOUT]);
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  }, [layout, hydrated]);

  const addWidget = useCallback((id: WidgetId) => {
    const meta = WIDGETS.find((w) => w.id === id);
    setLayout((prev) =>
      prev.some((item) => item.id === id) ? prev : [...prev, { id, size: meta?.defaultSize ?? "small" }]
    );
  }, []);

  const removeWidget = useCallback((id: WidgetId) => {
    setLayout((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const moveWidget = useCallback((index: number, direction: "up" | "down") => {
    setLayout((prev) => {
      const next = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const toggleSize = useCallback((index: number) => {
    setLayout((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], size: next[index].size === "large" ? "small" : "large" };
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout([...DEFAULT_LAYOUT]);
  }, []);

  // Available widgets not yet in layout
  const availableWidgets = useMemo(
    () => WIDGETS.filter((w) => !layout.some((item) => item.id === w.id)),
    [layout]
  );

  if (!hydrated || isVip === null) {
    return null;
  }

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
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalit&eacute; VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Cr&eacute;ez un tableau de bord enti&egrave;rement personnalis&eacute;
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Cr\u00e9ez votre tableau de bord personnalis\u00e9",
              "Widgets drag & drop",
              "Layouts illimit\u00e9s",
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

  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: "24px 24px 48px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LayoutDashboard size={22} color="#06b6d4" />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("customDashboard")}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              setEditMode(!editMode);
              if (editMode) setCatalogOpen(false);
            }}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              border: editMode ? "1px solid #06b6d4" : "1px solid var(--border)",
              backgroundColor: editMode ? "rgba(6,182,212,0.15)" : "transparent",
              color: editMode ? "#06b6d4" : "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s ease",
            }}
          >
            <Settings2 size={14} />
            {editMode ? t("done") || "Termin\u00e9" : t("edit") || "\u00c9diter"}
          </button>

          {/* Add Widget Button (visible in edit mode) */}
          {editMode && (
            <>
              <button
                onClick={() => setCatalogOpen(true)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: "1px solid #10b981",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <Plus size={14} />
                {t("addWidget") || "Ajouter un widget"}
              </button>

              <button
                onClick={resetLayout}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <RotateCcw size={14} />
                {t("resetDefault") || "R\u00e9initialiser"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode indicator */}
      {editMode && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: 8,
            backgroundColor: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.2)",
            fontSize: 12,
            color: "#06b6d4",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Settings2 size={14} />
          Mode \u00e9dition : r\u00e9ordonnez, redimensionnez ou retirez des widgets. Cliquez sur &laquo;&nbsp;Ajouter un widget&nbsp;&raquo; pour en ajouter.
        </div>
      )}

      {/* Widget Catalog Modal */}
      {catalogOpen && (
        <>
          <div
            onClick={() => setCatalogOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(520px, 90vw)",
              maxHeight: "80vh",
              overflowY: "auto",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              zIndex: 50,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Catalogue de widgets
              </h2>
              <button
                onClick={() => setCatalogOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {availableWidgets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Tous les widgets sont d\u00e9j\u00e0 actifs !
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {availableWidgets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      addWidget(w.id);
                      if (availableWidgets.length <= 1) setCatalogOpen(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "16px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#06b6d4";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(6,182,212,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ color: "#06b6d4" }}>{w.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        textAlign: "center",
                      }}
                    >
                      {w.label}
                    </span>
                    <Plus size={14} color="#10b981" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Widget Grid */}
      {layout.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            gap: 12,
          }}
        >
          <LayoutDashboard size={40} color="var(--text-muted)" />
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Aucun widget actif. Passez en mode \u00e9dition pour ajouter des widgets.
          </p>
          {editMode && (
            <button
              onClick={() => setCatalogOpen(true)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid #10b981",
                backgroundColor: "rgba(16,185,129,0.1)",
                color: "#10b981",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
              }}
            >
              <Plus size={14} />
              Ajouter un widget
            </button>
          )}
        </div>
      ) : (
        <div
          className="widget-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {layout.map((item, index) => {
            const meta = WIDGETS.find((w) => w.id === item.id);
            if (!meta) return null;
            const isWide = item.size === "large";

            return (
              <WidgetWrapper
                key={item.id}
                title={meta.label.startsWith("widget") ? (t(meta.label) || meta.label) : meta.label}
                icon={meta.icon}
                wide={isWide}
                editMode={editMode}
                onRemove={editMode ? () => removeWidget(item.id) : undefined}
                onMoveUp={editMode && index > 0 ? () => moveWidget(index, "up") : undefined}
                onMoveDown={
                  editMode && index < layout.length - 1
                    ? () => moveWidget(index, "down")
                    : undefined
                }
                onToggleSize={editMode ? () => toggleSize(index) : undefined}
              >
                <WidgetRenderer id={item.id} trades={trades} />
              </WidgetWrapper>
            );
          })}
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        .widget-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .widget-card.widget-wide {
          grid-column: span 2 !important;
        }
        @media (max-width: 1024px) {
          .widget-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .widget-card.widget-wide {
            grid-column: span 2 !important;
          }
        }
        @media (max-width: 640px) {
          .widget-grid {
            grid-template-columns: 1fr !important;
          }
          .widget-card.widget-wide {
            grid-column: span 1 !important;
          }
        }
        /* Glass card dark mode support */
        @media (prefers-color-scheme: dark) {
          .widget-card {
            --widget-bg: rgba(17, 24, 39, 0.8) !important;
          }
        }
        :root[class*="dark"] .widget-card,
        .dark .widget-card {
          --widget-bg: rgba(17, 24, 39, 0.8) !important;
        }
        .widget-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
}
