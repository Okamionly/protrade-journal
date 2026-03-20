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
  Award,
  Flame,
  Gauge,
  PieChart,
  BarChart3,
  ChevronRight,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WidgetId =
  | "equity-curve"
  | "win-rate"
  | "today-pnl"
  | "recent-trades"
  | "calendar"
  | "best-asset"
  | "streak"
  | "daily-target"
  | "emotion-dist"
  | "quick-stats";

interface WidgetMeta {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  wide: boolean;
}

type PresetName = "scalping" | "swing" | "review";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDGETS: WidgetMeta[] = [
  { id: "equity-curve", label: "widgetEquityCurve", icon: <TrendingUp size={16} />, wide: true },
  { id: "win-rate", label: "widgetWinRate", icon: <Target size={16} />, wide: false },
  { id: "today-pnl", label: "widgetTodayPnl", icon: <DollarSign size={16} />, wide: false },
  { id: "recent-trades", label: "widgetRecentTrades", icon: <List size={16} />, wide: true },
  { id: "calendar", label: "widgetCalendar", icon: <CalendarDays size={16} />, wide: true },
  { id: "best-asset", label: "widgetBestAsset", icon: <Award size={16} />, wide: false },
  { id: "streak", label: "widgetStreak", icon: <Flame size={16} />, wide: false },
  { id: "daily-target", label: "widgetDailyTarget", icon: <Gauge size={16} />, wide: false },
  { id: "emotion-dist", label: "widgetEmotionDist", icon: <PieChart size={16} />, wide: false },
  { id: "quick-stats", label: "widgetQuickStats", icon: <BarChart3 size={16} />, wide: false },
];

const PRESETS: Record<PresetName, { label: string; widgets: WidgetId[] }> = {
  scalping: {
    label: "presetScalping",
    widgets: ["today-pnl", "recent-trades", "quick-stats", "streak"],
  },
  swing: {
    label: "presetSwing",
    widgets: ["equity-curve", "win-rate", "best-asset", "calendar"],
  },
  review: {
    label: "presetReview",
    widgets: WIDGETS.map((w) => w.id),
  },
};

const STORAGE_KEY = "protrade-dashboard-widgets";
const DAILY_TARGET = 500; // default daily target in currency units

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatCurrency(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Widget Components
// ---------------------------------------------------------------------------

function EquityCurveWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [trades]
  );

  const cumulative = useMemo(() => {
    let sum = 0;
    return sorted.map((t) => {
      sum += t.result;
      return sum;
    });
  }, [sorted]);

  if (cumulative.length < 2) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "var(--text-muted)" }}>
        {t("notEnoughData")}
      </div>
    );
  }

  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 1;
  const w = 100;
  const h = 60;

  const points = cumulative.map((v, i) => {
    const x = (i / (cumulative.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const lastVal = cumulative[cumulative.length - 1];
  const color = lastVal >= 0 ? "#10b981" : "#f43f5e";

  return (
    <div style={{ padding: "8px 0" }}>
      <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} style={{ width: "100%", height: 120 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${h} ${points.join(" ")} ${w},${h}`}
          fill="url(#eq-grad)"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span className="mono" style={{ color, fontSize: 14 }}>
          {formatCurrency(lastVal)}
        </span>
      </div>
    </div>
  );
}

function WinRateWidget({ trades }: { trades: Trade[] }) {
  const wins = trades.filter((t) => t.result > 0).length;
  const total = trades.length;
  const rate = total > 0 ? (wins / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 50 ? "#10b981" : "#f43f5e";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0" }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary)"
          fontSize="18"
          fontWeight="700"
          fontFamily="monospace"
        >
          {rate.toFixed(0)}%
        </text>
      </svg>
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
        {wins}G / {total - wins}P sur {total}
      </span>
    </div>
  );
}

function TodayPnlWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const todayPnl = useMemo(
    () => trades.filter((t) => isToday(t.date)).reduce((s, t) => s + t.result, 0),
    [trades]
  );
  const color = todayPnl >= 0 ? "#10b981" : "#f43f5e";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "16px 0" }}>
      <span className="mono" style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>
        {formatCurrency(todayPnl)}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
        {t("today")}
      </span>
    </div>
  );
}

function RecentTradesWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [trades]
  );

  if (recent.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
        {t("noTradesFound")}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("date")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("asset")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500 }}>{t("dir")}</th>
            <th style={{ padding: "4px 8px", fontWeight: 500, textAlign: "right" }}>{t("result")}</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>
                {new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </td>
              <td style={{ padding: "6px 8px", color: "var(--text-primary)", fontWeight: 600 }}>
                {t.asset}
              </td>
              <td style={{ padding: "6px 8px", color: t.direction === "long" ? "#10b981" : "#f43f5e", textTransform: "uppercase", fontSize: 11 }}>
                {t.direction}
              </td>
              <td className="mono" style={{ padding: "6px 8px", textAlign: "right", color: t.result >= 0 ? "#10b981" : "#f43f5e", fontWeight: 600 }}>
                {formatCurrency(t.result)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarWidget({ trades }: { trades: Trade[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayResults = useMemo(() => {
    const map: Record<number, number> = {};
    trades.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + t.result;
      }
    });
    return map;
  }, [trades, year, month]);

  const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];

  const cells: React.ReactNode[] = [];

  dayLabels.forEach((label, i) => {
    cells.push(
      <div
        key={`h-${i}`}
        style={{
          textAlign: "center",
          fontSize: 10,
          color: "var(--text-muted)",
          fontWeight: 500,
          padding: 2,
        }}
      >
        {label}
      </div>
    );
  });

  const offset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`e-${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const res = dayResults[d];
    let bg = "transparent";
    let textColor = "var(--text-muted)";
    if (res !== undefined) {
      if (res > 0) {
        bg = "rgba(16,185,129,0.2)";
        textColor = "#10b981";
      } else if (res < 0) {
        bg = "rgba(244,63,94,0.2)";
        textColor = "#f43f5e";
      } else {
        bg = "rgba(100,100,100,0.15)";
        textColor = "var(--text-secondary)";
      }
    }
    const isCurrentDay = d === now.getDate();
    cells.push(
      <div
        key={`d-${d}`}
        style={{
          textAlign: "center",
          fontSize: 11,
          padding: 3,
          borderRadius: 4,
          backgroundColor: bg,
          color: textColor,
          fontWeight: isCurrentDay ? 700 : 400,
          border: isCurrentDay ? "1px solid #06b6d4" : "1px solid transparent",
        }}
      >
        {d}
      </div>
    );
  }

  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, textTransform: "capitalize" }}>
        {monthLabel}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {cells}
      </div>
    </div>
  );
}

function BestAssetWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const best = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    trades.forEach((t) => {
      if (!map[t.asset]) map[t.asset] = { total: 0, count: 0 };
      map[t.asset].total += t.result;
      map[t.asset].count += 1;
    });
    let bestAsset = "";
    let bestTotal = -Infinity;
    Object.entries(map).forEach(([asset, data]) => {
      if (data.total > bestTotal) {
        bestTotal = data.total;
        bestAsset = asset;
      }
    });
    if (!bestAsset) return null;
    return { asset: bestAsset, total: map[bestAsset].total, count: map[bestAsset].count };
  }, [trades]);

  if (!best) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
        {t("noData")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, padding: "12px 0" }}>
      <Award size={28} color="#06b6d4" />
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{best.asset}</span>
      <span className="mono" style={{ fontSize: 16, color: "#10b981", fontWeight: 600 }}>
        {formatCurrency(best.total)}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {best.count} trade{best.count > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function StreakWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const streak = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (sorted.length === 0) return { count: 0, type: "none" as const };

    const firstResult = sorted[0].result;
    if (firstResult === 0) return { count: 0, type: "none" as const };
    const type = firstResult > 0 ? ("win" as const) : ("loss" as const);
    let count = 0;
    for (const t of sorted) {
      if ((type === "win" && t.result > 0) || (type === "loss" && t.result < 0)) {
        count++;
      } else {
        break;
      }
    }
    return { count, type };
  }, [trades]);

  const color = streak.type === "win" ? "#10b981" : streak.type === "loss" ? "#f43f5e" : "var(--text-muted)";
  const label =
    streak.type === "win"
      ? t("consecutiveWins")
      : streak.type === "loss"
      ? t("consecutiveLosses")
      : t("noStreak");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 4, padding: "12px 0" }}>
      <Flame size={28} color={color} />
      <span className="mono" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>
        {streak.count}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{label}</span>
    </div>
  );
}

function DailyTargetWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const todayPnl = useMemo(
    () => trades.filter((t) => isToday(t.date)).reduce((s, t) => s + t.result, 0),
    [trades]
  );

  const pct = Math.min(Math.max((todayPnl / DAILY_TARGET) * 100, 0), 100);
  const barColor = pct >= 100 ? "#10b981" : pct >= 50 ? "#06b6d4" : "#f59e0b";

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 8, padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("dailyTarget", { target: DAILY_TARGET })}</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: barColor }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 10,
          borderRadius: 5,
          backgroundColor: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 5,
            backgroundColor: barColor,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <span className="mono" style={{ fontSize: 14, color: "var(--text-primary)" }}>
          {formatCurrency(todayPnl)}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}> / {DAILY_TARGET}</span>
      </div>
    </div>
  );
}

const EMOTION_COLORS: Record<string, string> = {
  confiant: "#10b981",
  calme: "#06b6d4",
  neutre: "#6b7280",
  stressé: "#f59e0b",
  anxieux: "#f97316",
  frustré: "#f43f5e",
  euphorique: "#8b5cf6",
  impatient: "#ec4899",
};

function EmotionDistWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach((t) => {
      if (t.emotion) {
        const e = t.emotion.toLowerCase();
        map[e] = (map[e] || 0) + 1;
      }
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    return { entries, total };
  }, [trades]);

  if (data.entries.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
        {t("noEmotionRecorded")}
      </div>
    );
  }

  // Build pie chart arcs
  const cx = 50,
    cy = 50,
    r = 40;
  let startAngle = -90;
  const arcs: React.ReactNode[] = [];

  data.entries.forEach(([emotion, count], i) => {
    const sliceAngle = (count / data.total) * 360;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const color = EMOTION_COLORS[emotion] || `hsl(${(i * 47) % 360}, 60%, 55%)`;

    if (data.entries.length === 1) {
      arcs.push(<circle key={emotion} cx={cx} cy={cy} r={r} fill={color} />);
    } else {
      arcs.push(
        <path
          key={emotion}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={color}
        />
      );
    }

    startAngle = endAngle;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <svg width="80" height="80" viewBox="0 0 100 100">
        {arcs}
        <circle cx={cx} cy={cy} r={20} fill="var(--bg-primary)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {data.entries.slice(0, 5).map(([emotion, count], i) => {
          const color = EMOTION_COLORS[emotion] || `hsl(${(i * 47) % 360}, 60%, 55%)`;
          return (
            <div key={emotion} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", textTransform: "capitalize", flex: 1 }}>{emotion}</span>
              <span className="mono" style={{ color: "var(--text-muted)" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickStatsWidget({ trades }: { trades: Trade[] }) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const today = trades.filter((t) => isToday(t.date)).length;
    const week = trades.filter((t) => isThisWeek(t.date)).length;
    const month = trades.filter((t) => isThisMonth(t.date)).length;
    return { today, week, month };
  }, [trades]);

  const items = [
    { label: t("today"), value: stats.today },
    { label: t("thisWeek"), value: stats.week },
    { label: t("thisMonth"), value: stats.month },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: "100%", padding: "12px 0" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: "#06b6d4", lineHeight: 1 }}>
            {item.value}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget Renderer Map
// ---------------------------------------------------------------------------

const WIDGET_RENDERERS: Record<WidgetId, React.FC<{ trades: Trade[] }>> = {
  "equity-curve": EquityCurveWidget,
  "win-rate": WinRateWidget,
  "today-pnl": TodayPnlWidget,
  "recent-trades": RecentTradesWidget,
  calendar: CalendarWidget,
  "best-asset": BestAssetWidget,
  streak: StreakWidget,
  "daily-target": DailyTargetWidget,
  "emotion-dist": EmotionDistWidget,
  "quick-stats": QuickStatsWidget,
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomDashboardPage() {
  const { t } = useTranslation();
  const { trades } = useTrades();
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetId[];
        setActiveWidgets(parsed);
      } else {
        // default: all widgets
        setActiveWidgets(WIDGETS.map((w) => w.id));
      }
    } catch {
      setActiveWidgets(WIDGETS.map((w) => w.id));
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWidgets));
    }
  }, [activeWidgets, hydrated]);

  const toggleWidget = useCallback((id: WidgetId) => {
    setActiveWidgets((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }, []);

  const applyPreset = useCallback((name: PresetName) => {
    setActiveWidgets([...PRESETS[name].widgets]);
  }, []);

  if (!hydrated) {
    return null;
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {t("customDashboard")}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Presets */}
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.borderColor = "#06b6d4";
                (e.target as HTMLElement).style.color = "#06b6d4";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--border)";
                (e.target as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              <Zap size={12} />
              {t(PRESETS[name].label)}
            </button>
          ))}

          {/* Toggle Panel Button */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: "1px solid #06b6d4",
              backgroundColor: panelOpen ? "rgba(6,182,212,0.15)" : "transparent",
              color: "#06b6d4",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s ease",
            }}
          >
            <Settings2 size={14} />
            {t("widgets")}
          </button>
        </div>
      </div>

      {/* Widget Toggle Panel (Sidebar) */}
      {panelOpen && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 300,
              backgroundColor: "var(--bg-primary)",
              borderLeft: "1px solid var(--border)",
              zIndex: 50,
              padding: 24,
              overflowY: "auto",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                {t("configureWidgets")}
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {WIDGETS.map((w) => {
                const active = activeWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      backgroundColor: active ? "rgba(6,182,212,0.08)" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ color: active ? "#06b6d4" : "var(--text-muted)" }}>
                      {w.icon}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: active ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      {t(w.label)}
                    </span>
                    {active ? (
                      <Eye size={14} color="#06b6d4" />
                    ) : (
                      <EyeOff size={14} color="var(--text-muted)" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Presets in panel */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 1 }}>
                {t("presets")}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {(Object.keys(PRESETS) as PresetName[]).map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      applyPreset(name);
                      setPanelOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      width: "100%",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#06b6d4";
                      (e.target as HTMLElement).style.color = "#06b6d4";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = "var(--border)";
                      (e.target as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    <ChevronRight size={12} />
                    {t(PRESETS[name].label)}
                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 11 }}>
                      {t("nWidgets", { count: PRESETS[name].widgets.length })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Widget Grid */}
      {activeWidgets.length === 0 ? (
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
            {t("noActiveWidgets")}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {activeWidgets.map((id) => {
            const meta = WIDGETS.find((w) => w.id === id);
            if (!meta) return null;
            const Renderer = WIDGET_RENDERERS[id];

            return (
              <div
                key={id}
                className="glass"
                style={{
                  gridColumn: meta.wide ? "span 2" : "span 1",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  minHeight: 140,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Widget Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "#06b6d4" }}>{meta.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flex: 1 }}>
                    {t(meta.label)}
                  </span>
                </div>

                {/* Widget Body */}
                <div style={{ flex: 1 }}>
                  <Renderer trades={trades} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive overrides for wide widgets on small screens */}
      <style>{`
        @media (max-width: 700px) {
          .glass[style*="span 2"] {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
