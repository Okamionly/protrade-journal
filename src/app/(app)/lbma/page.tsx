"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Clock,
  Activity,
  BarChart3,
  Minus,
  Timer,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Target,
  Award,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { LocaleProvider, useTranslation } from "@/i18n/context";
import { LOCALE_LABELS, Locale } from "@/i18n/types";

/* ─── Types ─── */
interface LbmaEntry {
  d: string;
  v: [number | null, number | null, number | null];
}

interface LbmaData {
  gold_am: LbmaEntry[];
  gold_pm: LbmaEntry[];
  silver: LbmaEntry[];
  platinum_am: LbmaEntry[];
  platinum_pm: LbmaEntry[];
  palladium_am: LbmaEntry[];
  palladium_pm: LbmaEntry[];
  updated: string;
}

type Currency = "USD" | "GBP" | "EUR";
type Period = "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";
type Metal = "gold" | "silver" | "platinum" | "palladium";

const CURRENCY_IDX: Record<Currency, number> = { USD: 0, GBP: 1, EUR: 2 };
const CURRENCY_SYMBOLS: Record<Currency, string> = { USD: "$", GBP: "£", EUR: "€" };
const PERIOD_DAYS: Record<Period, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825, MAX: 99999 };

/* ─── Fixing Schedule Data ─── */
const FIXING_SCHEDULE = [
  { metalKey: "gold" as const, emoji: "\u{1F947}", sessionKey: "amFix" as const, london: "10:30", ny: "05:30", paris: "11:30", color: "#f59e0b", londonH: 10, londonM: 30 },
  { metalKey: "gold" as const, emoji: "\u{1F947}", sessionKey: "pmFix" as const, london: "15:00", ny: "10:00", paris: "16:00", color: "#f59e0b", londonH: 15, londonM: 0 },
  { metalKey: "silver" as const, emoji: "\u{1F948}", sessionKey: "fix" as const, london: "12:00", ny: "07:00", paris: "13:00", color: "#94a3b8", londonH: 12, londonM: 0 },
  { metalKey: "platinum" as const, emoji: "⚪", sessionKey: "amFix" as const, london: "09:45", ny: "04:45", paris: "10:45", color: "#06b6d4", londonH: 9, londonM: 45 },
  { metalKey: "platinum" as const, emoji: "⚪", sessionKey: "pmFix" as const, london: "14:00", ny: "09:00", paris: "15:00", color: "#06b6d4", londonH: 14, londonM: 0 },
  { metalKey: "palladium" as const, emoji: "\u{1F49C}", sessionKey: "amFix" as const, london: "09:45", ny: "04:45", paris: "10:45", color: "#a855f7", londonH: 9, londonM: 45 },
  { metalKey: "palladium" as const, emoji: "\u{1F49C}", sessionKey: "pmFix" as const, london: "14:00", ny: "09:00", paris: "15:00", color: "#a855f7", londonH: 14, londonM: 0 },
];

/* ─── Helpers ─── */
function formatPrice(val: number | null, currency: Currency): string {
  if (val == null) return "N/A";
  return `${CURRENCY_SYMBOLS[currency]}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctChange(current: number, prev: number): number {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
}

function formatDate(d: string, locale: string): string {
  return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/** Get current London (Europe/London) time components */
function getLondonNow(): { h: number; m: number; s: number; dayOfWeek: number } {
  const now = new Date();
  const londonStr = now.toLocaleString("en-GB", { timeZone: "Europe/London", hour12: false });
  // format: DD/MM/YYYY, HH:MM:SS
  const timePart = londonStr.split(", ")[1] || "00:00:00";
  const [hStr, mStr, sStr] = timePart.split(":");
  const londonDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return { h: parseInt(hStr), m: parseInt(mStr), s: parseInt(sStr) || 0, dayOfWeek: londonDate.getDay() };
}

function getNextFixing(): { metalKey: string; sessionKey: string; london: string; ny: string; secondsLeft: number; isNow: boolean } {
  const lon = getLondonNow();
  const nowMinutes = lon.h * 60 + lon.m;
  const nowSeconds = nowMinutes * 60 + lon.s;
  const isWeekday = lon.dayOfWeek >= 1 && lon.dayOfWeek <= 5;

  // Sort schedule by London time
  const sorted = [...FIXING_SCHEDULE].sort((a, b) => (a.londonH * 60 + a.londonM) - (b.londonH * 60 + b.londonM));

  // Check if any fixing is happening right now (within 5 minutes)
  for (const f of sorted) {
    const fMinutes = f.londonH * 60 + f.londonM;
    if (isWeekday && nowMinutes >= fMinutes && nowMinutes < fMinutes + 5) {
      return { metalKey: f.metalKey, sessionKey: f.sessionKey, london: f.london, ny: f.ny, secondsLeft: 0, isNow: true };
    }
  }

  // Find next upcoming fixing
  if (isWeekday) {
    for (const f of sorted) {
      const fSeconds = (f.londonH * 60 + f.londonM) * 60;
      if (fSeconds > nowSeconds) {
        return { metalKey: f.metalKey, sessionKey: f.sessionKey, london: f.london, ny: f.ny, secondsLeft: fSeconds - nowSeconds, isNow: false };
      }
    }
  }

  // Next is tomorrow (or Monday if weekend)
  const first = sorted[0];
  const firstSeconds = (first.londonH * 60 + first.londonM) * 60;
  let daysUntil = 1;
  if (lon.dayOfWeek === 5) daysUntil = 3; // Friday -> Monday
  else if (lon.dayOfWeek === 6) daysUntil = 2; // Saturday -> Monday
  else if (lon.dayOfWeek === 0) daysUntil = 1; // Sunday -> Monday
  const secondsLeft = (daysUntil * 86400) - nowSeconds + firstSeconds;
  return { metalKey: first.metalKey, sessionKey: first.sessionKey, london: first.london, ny: first.ny, secondsLeft, isNow: false };
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

/* ─── Mini SVG Chart ─── */
function SparkLine({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Full Area Chart ─── */
function AreaChart({
  data,
  currency,
  height = 300,
  dateFmt,
  notEnoughDataLabel,
}: {
  data: LbmaEntry[];
  currency: Currency;
  height?: number;
  dateFmt: string;
  notEnoughDataLabel: string;
}) {
  const idx = CURRENCY_IDX[currency];
  const prices = data.map((e) => e.v[idx] ?? 0).filter((v) => v > 0);
  if (prices.length < 2) return <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>{notEnoughDataLabel}</div>;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 900;
  const h = height;
  const padY = 24;
  const padX = 70;
  const padRight = 10;
  const padBottom = 28;
  const chartW = w - padX - padRight;
  const chartTop = padY;
  const chartBottom = h - padBottom;
  const chartH = chartBottom - chartTop;

  const points = prices.map((v, i) => {
    const x = padX + (i / (prices.length - 1)) * chartW;
    const y = chartBottom - ((v - min) / range) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "#10b981" : "#ef4444";

  // Y-axis labels (5 ticks)
  const yLabels = Array.from({ length: 5 }, (_, i) => {
    const val = min + (range * i) / 4;
    const y = chartBottom - (i / 4) * chartH;
    return { val, y };
  });

  // X-axis labels (5 evenly spaced)
  const xLabels = Array.from({ length: 5 }, (_, i) => {
    const dataIdx = Math.floor((i / 4) * (data.length - 1));
    const x = padX + (dataIdx / (data.length - 1)) * chartW;
    return { date: data[dataIdx]?.d, x };
  });

  // Hover state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const chartRelX = (relX * w - padX) / chartW;
          const dataIdx = Math.round(chartRelX * (prices.length - 1));
          setHoverIdx(Math.min(Math.max(dataIdx, 0), prices.length - 1));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines — span the chart area only */}
        {yLabels.map(({ y }, i) => (
          <line key={i} x1={padX} y1={y} x2={w - padRight} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}
        {/* Area */}
        <polygon points={`${padX},${chartBottom} ${points} ${padX + chartW},${chartBottom}`} fill="url(#areaGrad)" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <>
            <line
              x1={padX + (hoverIdx / (prices.length - 1)) * chartW}
              y1={chartTop}
              x2={padX + (hoverIdx / (prices.length - 1)) * chartW}
              y2={chartBottom}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={padX + (hoverIdx / (prices.length - 1)) * chartW}
              cy={chartBottom - ((prices[hoverIdx] - min) / range) * chartH}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}
        {/* Y-axis labels — right-aligned before the chart area */}
        {yLabels.map(({ val, y }, i) => (
          <text key={i} x={padX - 8} y={y + 4} fill="var(--text-muted)" fontSize="11" fontFamily="monospace" textAnchor="end">
            {CURRENCY_SYMBOLS[currency]}{val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </text>
        ))}
        {/* X-axis labels — anchor first/last to avoid overflow */}
        {xLabels.map(({ date, x }, i) => {
          const anchor = i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle";
          return (
            <text key={i} x={x} y={h - 4} fill="var(--text-muted)" fontSize="10" textAnchor={anchor} fontFamily="monospace">
              {date ? new Date(date).toLocaleDateString(dateFmt, { month: "short", year: "2-digit" }) : ""}
            </text>
          );
        })}
      </svg>
      {/* Hover tooltip — flips side when cursor is near the right edge */}
      {hoverIdx !== null && data[hoverIdx] && (() => {
        const hoverRatio = hoverIdx / (prices.length - 1);
        const isRight = hoverRatio > 0.65;
        return (
          <div
            className="absolute top-2 glass rounded-lg px-3 py-2 text-xs pointer-events-none"
            style={{
              border: "1px solid var(--border)",
              ...(isRight ? { left: "12px" } : { right: "12px" }),
            }}
          >
            <div style={{ color: "var(--text-muted)" }}>{formatDate(data[hoverIdx].d, dateFmt)}</div>
            <div className="font-bold mono" style={{ color }}>{formatPrice(prices[hoverIdx], currency)}</div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Spread Bar Chart (last 5 days) ─── */
function SpreadBars({ spreads, currency, dateFmt }: { spreads: { date: string; spread: number }[]; currency: Currency; dateFmt: string }) {
  if (spreads.length === 0) return null;
  const maxAbs = Math.max(...spreads.map((s) => Math.abs(s.spread)), 1);
  const barH = 32;
  const totalH = spreads.length * barH;
  const midX = 140;
  const maxBarW = 80;
  const svgW = 320;

  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} className="w-full" style={{ minHeight: totalH }}>
      {/* Center line */}
      <line x1={midX} y1="0" x2={midX} y2={totalH} stroke="var(--border)" strokeWidth="1" strokeDasharray="2,2" />
      {spreads.map((s, i) => {
        const barW = (Math.abs(s.spread) / maxAbs) * maxBarW;
        const x = s.spread >= 0 ? midX : midX - barW;
        const color = s.spread >= 0 ? "#10b981" : "#ef4444";
        const y = i * barH;
        return (
          <g key={i}>
            <rect x={x} y={y + 6} width={barW} height={barH - 12} rx="3" fill={color} opacity="0.7" />
            <text x="4" y={y + barH / 2 + 3} fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="start">
              {new Date(s.date).toLocaleDateString(dateFmt, { day: "2-digit", month: "short" })}
            </text>
            <text
              x={s.spread >= 0 ? midX + barW + 6 : midX - barW - 6}
              y={y + barH / 2 + 3}
              fill={color}
              fontSize="10"
              fontFamily="monospace"
              textAnchor={s.spread >= 0 ? "start" : "end"}
            >
              {s.spread >= 0 ? "+" : ""}{formatPrice(s.spread, currency)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Multi-Metal Price History (30 days overlay) ─── */
function MultiMetalChart({
  goldData,
  silverData,
  platData,
  pallData,
  currency,
  dateFmt,
}: {
  goldData: number[];
  silverData: number[];
  platData: number[];
  pallData: number[];
  currency: Currency;
  dateFmt: string;
}) {
  const [hoveredMetal, setHoveredMetal] = useState<string | null>(null);
  const metals = [
    { key: "gold", data: goldData, color: "#f59e0b", label: "Or" },
    { key: "silver", data: silverData, color: "#94a3b8", label: "Argent" },
    { key: "platinum", data: platData, color: "#06b6d4", label: "Platine" },
    { key: "palladium", data: pallData, color: "#a855f7", label: "Palladium" },
  ];

  // Normalize all to 0-100 scale for overlay
  const normalize = (data: number[]) => {
    if (data.length < 2) return data;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map((v) => ((v - min) / range) * 100);
  };

  const w = 900;
  const h = 200;
  const padX = 10;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {metals.map((m) => (
          <button
            key={m.key}
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition"
            style={{
              color: hoveredMetal === null || hoveredMetal === m.key ? m.color : "var(--text-muted)",
              background: hoveredMetal === m.key ? `${m.color}15` : "transparent",
            }}
            onMouseEnter={() => setHoveredMetal(m.key)}
            onMouseLeave={() => setHoveredMetal(null)}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            {m.label}
            {m.data.length >= 2 && (
              <span className={m.data[m.data.length - 1] >= m.data[0] ? "text-emerald-400" : "text-rose-400"}>
                {((m.data[m.data.length - 1] - m.data[0]) / m.data[0] * 100).toFixed(1)}%
              </span>
            )}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
        {metals.map((m) => {
          const norm = normalize(m.data);
          if (norm.length < 2) return null;
          const points = norm.map((v, i) => `${padX + (i / (norm.length - 1)) * chartW},${padY + chartH - (v / 100) * chartH}`).join(" ");
          const isActive = hoveredMetal === null || hoveredMetal === m.key;
          return (
            <polyline
              key={m.key}
              points={points}
              fill="none"
              stroke={m.color}
              strokeWidth={hoveredMetal === m.key ? "3" : "2"}
              strokeLinejoin="round"
              opacity={isActive ? 1 : 0.15}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Price Alerts ─── */
interface PriceAlert {
  id: string;
  metal: Metal;
  condition: "above" | "below";
  price: number;
  currency: Currency;
  active: boolean;
  triggered: boolean;
}

function PriceAlerts({ currency, currentPrices }: { currency: Currency; currentPrices: Record<Metal, number | null> }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMetal, setNewMetal] = useState<Metal>("gold");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [newPrice, setNewPrice] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const prevPricesRef = useRef<Record<Metal, number | null>>({ gold: null, silver: null, platinum: null, palladium: null });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lbma-price-alerts");
      if (saved) setAlerts(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("lbma-price-alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Check alerts against current prices
  useEffect(() => {
    const prev = prevPricesRef.current;
    setAlerts((prev2) =>
      prev2.map((alert) => {
        if (!alert.active || alert.triggered) return alert;
        const price = currentPrices[alert.metal];
        if (price == null) return alert;
        const wasTriggered =
          (alert.condition === "above" && price >= alert.price) ||
          (alert.condition === "below" && price <= alert.price);
        if (wasTriggered) {
          const metalLabels: Record<Metal, string> = { gold: "Or", silver: "Argent", platinum: "Platine", palladium: "Palladium" };
          setToastMsg(`${metalLabels[alert.metal]} ${alert.condition === "above" ? "au-dessus de" : "en-dessous de"} ${CURRENCY_SYMBOLS[alert.currency]}${alert.price}`);
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );
    prevPricesRef.current = { ...currentPrices };
  }, [currentPrices]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const addAlert = () => {
    const p = parseFloat(newPrice);
    if (isNaN(p) || p <= 0) return;
    setAlerts((prev) => [
      ...prev,
      { id: Date.now().toString(), metal: newMetal, condition: newCondition, price: p, currency, active: true, triggered: false },
    ]);
    setNewPrice("");
    setShowAdd(false);
  };

  const removeAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const toggleAlert = (id: string) =>
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active, triggered: false } : a));

  const metalLabels: Record<Metal, string> = { gold: "Or", silver: "Argent", platinum: "Platine", palladium: "Palladium" };
  const metalColors: Record<Metal, string> = { gold: "#f59e0b", silver: "#94a3b8", platinum: "#06b6d4", palladium: "#a855f7" };

  return (
    <div className="glass rounded-2xl p-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 glass rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
          style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)" }}>
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Alerte : {toastMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Bell className="w-4 h-4 text-amber-400" />
          Alertes de Prix
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-80 transition"
          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <Plus className="w-3 h-3" /> Nouvelle alerte
        </button>
      </div>

      {/* Add alert form */}
      {showAdd && (
        <div className="flex items-end gap-3 mb-4 flex-wrap p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
          <div>
            <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: "var(--text-muted)" }}>Metal</label>
            <select
              value={newMetal}
              onChange={(e) => setNewMetal(e.target.value as Metal)}
              className="rounded-lg px-2 py-1.5 text-xs"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              {(["gold", "silver", "platinum", "palladium"] as Metal[]).map((m) => (
                <option key={m} value={m}>{metalLabels[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: "var(--text-muted)" }}>Condition</label>
            <select
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
              className="rounded-lg px-2 py-1.5 text-xs"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              <option value="above">Au-dessus de</option>
              <option value="below">En-dessous de</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: "var(--text-muted)" }}>Prix ({CURRENCY_SYMBOLS[currency]})</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="ex: 2400"
              className="rounded-lg px-2 py-1.5 text-xs w-28"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", outline: "none" }}
              onKeyDown={(e) => e.key === "Enter" && addAlert()}
            />
          </div>
          <button
            onClick={addAlert}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            Ajouter
          </button>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
          Aucune alerte configuree. Ajoutez-en une pour etre notifie quand un seuil est atteint.
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                background: alert.triggered ? "rgba(245,158,11,0.08)" : "var(--bg-secondary)",
                border: alert.triggered ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                opacity: alert.active ? 1 : 0.5,
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: metalColors[alert.metal] }} />
              <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                {metalLabels[alert.metal]} {alert.condition === "above" ? ">" : "<"} {CURRENCY_SYMBOLS[alert.currency]}{alert.price.toLocaleString()}
              </span>
              {alert.triggered && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                  Declenchee
                </span>
              )}
              <button onClick={() => toggleAlert(alert.id)} className="hover:opacity-70 transition">
                {alert.active ? <Bell className="w-3.5 h-3.5 text-amber-400" /> : <BellOff className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
              </button>
              <button onClick={() => removeAlert(alert.id)} className="hover:opacity-70 transition">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Trade Impact on Gold ─── */
function TradeImpactSection({ goldDirection }: { goldDirection: "up" | "down" | "flat" }) {
  const { trades } = useTrades();
  const goldTrades = useMemo(() => {
    return trades.filter((t) => {
      const a = t.asset.toUpperCase();
      return a.includes("XAUUSD") || a.includes("GOLD") || a.includes("XAU");
    });
  }, [trades]);

  if (goldTrades.length === 0) return null;

  const totalTrades = goldTrades.length;
  const wins = goldTrades.filter((t) => t.result > 0).length;
  const losses = goldTrades.filter((t) => t.result < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnl = goldTrades.reduce((sum, t) => sum + t.result, 0);
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  // Trades aligned with current gold direction
  const alignedTrades = goldTrades.filter((t) => {
    if (goldDirection === "up") return t.direction.toLowerCase() === "long" || t.direction.toLowerCase() === "buy";
    if (goldDirection === "down") return t.direction.toLowerCase() === "short" || t.direction.toLowerCase() === "sell";
    return false;
  });
  const alignedWins = alignedTrades.filter((t) => t.result > 0).length;
  const alignedWinRate = alignedTrades.length > 0 ? (alignedWins / alignedTrades.length) * 100 : 0;

  const directionLabels = { up: "haussiere", down: "baissiere", flat: "neutre" };

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <Target className="w-4 h-4 text-amber-400" />
        Impact sur vos Trades
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Tendance actuelle de l&apos;or : <span className={goldDirection === "up" ? "text-emerald-400" : goldDirection === "down" ? "text-rose-400" : ""} style={{ fontWeight: 600 }}>{directionLabels[goldDirection]}</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="metric-card rounded-xl p-4">
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Trades XAUUSD</div>
          <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>{totalTrades}</div>
        </div>
        <div className="metric-card rounded-xl p-4">
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Win Rate</div>
          <div className="text-xl font-bold mono" style={{ color: winRate >= 50 ? "#10b981" : "#ef4444" }}>{winRate.toFixed(1)}%</div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{wins}W / {losses}L</div>
        </div>
        <div className="metric-card rounded-xl p-4">
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>P&L Total</div>
          <div className={`text-xl font-bold mono ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}$
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Moy: {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(2)}$</div>
        </div>
        <div className="metric-card rounded-xl p-4">
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>
            WR en tendance {directionLabels[goldDirection]}
          </div>
          <div className="text-xl font-bold mono" style={{ color: alignedWinRate >= 50 ? "#10b981" : alignedTrades.length === 0 ? "var(--text-muted)" : "#ef4444" }}>
            {alignedTrades.length > 0 ? `${alignedWinRate.toFixed(1)}%` : "N/A"}
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {alignedTrades.length > 0 ? `${alignedTrades.length} trades alignes` : "Aucun trade aligne"}
          </div>
        </div>
      </div>
      {/* Quick insight */}
      {alignedTrades.length > 0 && (
        <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: alignedWinRate >= 50 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${alignedWinRate >= 50 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <Award className="w-4 h-4" style={{ color: alignedWinRate >= 50 ? "#10b981" : "#ef4444" }} />
          <span className="text-xs" style={{ color: "var(--text-primary)" }}>
            {alignedWinRate >= 60
              ? "Excellent ! Vous performez bien quand l'or suit cette tendance."
              : alignedWinRate >= 50
              ? "Performance correcte dans cette direction. Continuez a suivre votre plan."
              : "Attention : votre win rate baisse quand vous tradez dans cette direction."}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Countdown Component ─── */
function FixingCountdown() {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(getNextFixing());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getNextFixing());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tt = t as (key: string) => string;
  const metalLabel = tt(countdown.metalKey);
  const sessionLabel = tt(countdown.sessionKey);

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {countdown.isNow ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          ) : (
            <Timer className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {countdown.isNow ? (
              <>{t("fixingInProgress")} : <span className="text-emerald-400 font-bold">{metalLabel} {sessionLabel}</span></>
            ) : (
              <>{t("nextFixing")} : <span className="text-amber-400 font-bold">{metalLabel} {sessionLabel}</span> {t("inWord")} <span className="mono font-bold text-amber-400">{formatCountdown(countdown.secondsLeft)}</span></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{t("londonGmt")} {countdown.london} GMT</span>
          <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{t("nyEst")} {countdown.ny} EST</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Inner Content Component ─── */
function LBMAContent() {
  const { t, locale, setLocale, dir, dateFmt } = useTranslation();

  const [data, setData] = useState<LbmaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [period, setPeriod] = useState<Period>("1Y");
  const [metal, setMetal] = useState<Metal>("gold");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lbma?days=3650");
      if (!res.ok) throw new Error(t("apiError"));
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const idx = CURRENCY_IDX[currency];

  // Filter data by period
  const filteredData = useMemo(() => {
    if (!data) return { gold_am: [], gold_pm: [], silver: [], platinum_am: [], platinum_pm: [], palladium_am: [], palladium_pm: [] };
    const maxDays = PERIOD_DAYS[period];
    const filterByPeriod = (arr: LbmaEntry[]) => arr.slice(-maxDays);
    return {
      gold_am: filterByPeriod(data.gold_am),
      gold_pm: filterByPeriod(data.gold_pm),
      silver: filterByPeriod(data.silver),
      platinum_am: filterByPeriod(data.platinum_am),
      platinum_pm: filterByPeriod(data.platinum_pm),
      palladium_am: filterByPeriod(data.palladium_am),
      palladium_pm: filterByPeriod(data.palladium_pm),
    };
  }, [data, period]);

  // Current prices helpers
  const latest = (arr: LbmaEntry[] | undefined) => arr?.length ? arr[arr.length - 1] : null;
  const prev = (arr: LbmaEntry[] | undefined) => arr?.length && arr.length >= 2 ? arr[arr.length - 2] : null;

  const currentGoldAm = latest(data?.gold_am);
  const currentGoldPm = latest(data?.gold_pm);
  const currentSilver = latest(data?.silver);
  const currentPlatAm = latest(data?.platinum_am);
  const currentPlatPm = latest(data?.platinum_pm);
  const currentPallAm = latest(data?.palladium_am);
  const currentPallPm = latest(data?.palladium_pm);

  const prevGoldAm = prev(data?.gold_am);
  const prevGoldPm = prev(data?.gold_pm);
  const prevSilver = prev(data?.silver);
  const prevPlatAm = prev(data?.platinum_am);
  const prevPlatPm = prev(data?.platinum_pm);
  const prevPallAm = prev(data?.palladium_am);
  const prevPallPm = prev(data?.palladium_pm);

  // Gold/Silver ratio
  const gsRatio = currentGoldPm?.v[idx] && currentSilver?.v[idx]
    ? (currentGoldPm.v[idx]! / currentSilver.v[idx]!).toFixed(1)
    : "N/A";

  // Sparkline data
  const goldSparkline = useMemo(
    () => (data?.gold_pm || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );
  const silverSparkline = useMemo(
    () => (data?.silver || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );
  const platSparkline = useMemo(
    () => (data?.platinum_pm || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );
  const pallSparkline = useMemo(
    () => (data?.palladium_pm || []).slice(-30).map((e) => e.v[idx] ?? 0).filter((v) => v > 0),
    [data, idx]
  );

  // AM/PM Spread analysis
  const spreadData = useMemo(() => {
    if (!data) return { gold: [], platinum: [], palladium: [] };
    const calcSpreads = (am: LbmaEntry[], pm: LbmaEntry[]) => {
      const pmMap = new Map(pm.map((e) => [e.d, e.v[idx]]));
      return am.slice(-5).map((e) => {
        const amVal = e.v[idx];
        const pmVal = pmMap.get(e.d);
        return { date: e.d, spread: amVal != null && pmVal != null ? amVal - pmVal : 0 };
      }).filter((s) => s.spread !== 0);
    };
    return {
      gold: calcSpreads(data.gold_am, data.gold_pm),
      platinum: calcSpreads(data.platinum_am, data.platinum_pm),
      palladium: calcSpreads(data.palladium_am, data.palladium_pm),
    };
  }, [data, idx]);

  // Export CSV
  const handleExport = () => {
    if (!data) return;
    const sourceMap: Record<Metal, LbmaEntry[]> = {
      gold: data.gold_pm,
      silver: data.silver,
      platinum: data.platinum_pm,
      palladium: data.palladium_pm,
    };
    const source = sourceMap[metal];
    const rows = source.slice(-365).map((e) => `${e.d},${e.v[0] ?? ""},${e.v[1] ?? ""},${e.v[2] ?? ""}`);
    const csv = `\uFEFFDate,USD,GBP,EUR\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lbma_${metal}_prices.csv`;
    a.click();
  };

  // Chart data for selected metal
  const chartDataMap: Record<Metal, LbmaEntry[]> = {
    gold: filteredData.gold_pm,
    silver: filteredData.silver,
    platinum: filteredData.platinum_pm,
    palladium: filteredData.palladium_pm,
  };
  const chartData = chartDataMap[metal];

  // Stats
  const allPrices = chartData.map((e) => e.v[idx] ?? 0).filter((v) => v > 0);
  const periodHigh = allPrices.length ? Math.max(...allPrices) : 0;
  const periodLow = allPrices.length ? Math.min(...allPrices) : 0;
  const periodAvg = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
  const periodChange = allPrices.length >= 2 ? pctChange(allPrices[allPrices.length - 1], allPrices[0]) : 0;

  const metalLabels: Record<Metal, string> = { gold: t("goldPmFix"), silver: t("silverFix"), platinum: t("platPmFix"), palladium: t("pallPmFix") };

  // Price card helper
  function PriceCard({
    label,
    timeLabel,
    timeBadgeColor,
    current,
    previous,
    sparkline,
    sparkColor,
  }: {
    label: string;
    timeLabel: string;
    timeBadgeColor: string;
    current: LbmaEntry | null;
    previous: LbmaEntry | null;
    sparkline: number[];
    sparkColor: string;
  }) {
    const curVal = current?.v[idx] ?? null;
    const prevVal = previous?.v[idx] ?? null;
    const change = curVal != null && prevVal != null ? pctChange(curVal, prevVal) : null;
    return (
      <div className="metric-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${timeBadgeColor}20`, color: timeBadgeColor }}>
            {timeLabel}
          </span>
        </div>
        <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
          {formatPrice(curVal, currency)}
        </div>
        {change != null && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change.toFixed(2)}%
          </div>
        )}
        <div className="mt-2">
          <SparkLine data={sparkline} color={sparkColor} height={40} />
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          {current?.d ? formatDate(current.d, dateFmt) : ""}
        </div>
      </div>
    );
  }

  // Spread interpretation
  function spreadInterpretation(spread: number): { text: string; color: string } {
    if (spread > 0) return { text: t("nySells"), color: "#ef4444" };
    if (spread < 0) return { text: t("nyBuys"), color: "#10b981" };
    return { text: t("neutral"), color: "var(--text-muted)" };
  }

  return (
    <div dir={dir} className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            {t("title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("subtitle")}
            {data?.updated && (
              <span className="ml-2 opacity-60">
                <Clock className="w-3 h-3 inline -mt-0.5" /> {t("updatedAt")} : {new Date(data.updated).toLocaleTimeString(dateFmt, { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency selector */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-medium transition ${currency === c ? "bg-amber-500/20 text-amber-400" : ""}`}
                style={currency !== c ? { color: "var(--text-secondary)" } : {}}
              >
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-sm hover:bg-[var(--bg-hover)] transition" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-sm hover:bg-[var(--bg-hover)] transition" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 text-rose-400 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Countdown to next fixing */}
      <FixingCountdown />

      {/* Skeleton Loader */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 rounded w-20 mb-3" style={{ background: "var(--bg-hover)" }} />
                <div className="h-8 rounded w-28 mb-2" style={{ background: "var(--bg-hover)" }} />
                <div className="h-3 rounded w-16" style={{ background: "var(--bg-hover)" }} />
              </div>
            ))}
          </div>
          <div className="metric-card rounded-2xl p-6 animate-pulse">
            <div className="h-[300px] rounded-xl" style={{ background: "var(--bg-hover)" }} />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Price Cards — Row 1: Gold AM, Gold PM, Silver, Ratio */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PriceCard
              label={t("goldAmLabel")}
              timeLabel="10:30 LON"
              timeBadgeColor="#f59e0b"
              current={currentGoldAm}
              previous={prevGoldAm}
              sparkline={goldSparkline}
              sparkColor="#f59e0b"
            />
            <PriceCard
              label={t("goldPmLabel")}
              timeLabel="15:00 LON"
              timeBadgeColor="#f59e0b"
              current={currentGoldPm}
              previous={prevGoldPm}
              sparkline={goldSparkline}
              sparkColor="#f59e0b"
            />
            <PriceCard
              label={t("silverLabel")}
              timeLabel="12:00 LON"
              timeBadgeColor="#94a3b8"
              current={currentSilver}
              previous={prevSilver}
              sparkline={silverSparkline}
              sparkColor="#94a3b8"
            />
            {/* Gold/Silver Ratio */}
            <div className="metric-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("ratioLabel")}</span>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {gsRatio}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {Number(gsRatio) > 80 ? t("silverUndervalued") : Number(gsRatio) < 60 ? t("goldUndervalued") : t("neutralZone")}
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.max((Number(gsRatio) || 70) / 120 * 100, 10), 95)}%`,
                    background: Number(gsRatio) > 80 ? "#f59e0b" : Number(gsRatio) < 60 ? "#94a3b8" : "#06b6d4",
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>30</span>
                <span>70</span>
                <span>120</span>
              </div>
            </div>
          </div>

          {/* Price Cards — Row 2: Platinum AM, Platinum PM, Palladium AM, Palladium PM */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PriceCard
              label={t("platAmLabel")}
              timeLabel="09:45 LON"
              timeBadgeColor="#06b6d4"
              current={currentPlatAm}
              previous={prevPlatAm}
              sparkline={platSparkline}
              sparkColor="#06b6d4"
            />
            <PriceCard
              label={t("platPmLabel")}
              timeLabel="14:00 LON"
              timeBadgeColor="#06b6d4"
              current={currentPlatPm}
              previous={prevPlatPm}
              sparkline={platSparkline}
              sparkColor="#06b6d4"
            />
            <PriceCard
              label={t("pallAmLabel")}
              timeLabel="09:45 LON"
              timeBadgeColor="#a855f7"
              current={currentPallAm}
              previous={prevPallAm}
              sparkline={pallSparkline}
              sparkColor="#a855f7"
            />
            <PriceCard
              label={t("pallPmLabel")}
              timeLabel="14:00 LON"
              timeBadgeColor="#a855f7"
              current={currentPallPm}
              previous={prevPallPm}
              sparkline={pallSparkline}
              sparkColor="#a855f7"
            />
          </div>

          {/* AM/PM Spread Analysis */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              <Activity className="w-4 h-4 inline -mt-0.5 mr-2 text-cyan-400" />
              {t("spreadTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gold Spread */}
              {(() => {
                const lastGoldSpread = spreadData.gold.length ? spreadData.gold[spreadData.gold.length - 1].spread : 0;
                const interp = spreadInterpretation(lastGoldSpread);
                return (
                  <div className="metric-card rounded-xl p-4">
                    <div className="text-xs font-medium mb-2" style={{ color: "#f59e0b" }}>{t("spreadGold")}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
                        {lastGoldSpread >= 0 ? "+" : ""}{formatPrice(lastGoldSpread, currency)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: interp.color, background: `${interp.color}15` }}>
                        {interp.text}
                      </span>
                    </div>
                    <div style={{ minHeight: 160 }}>
                      <SpreadBars spreads={spreadData.gold} currency={currency} dateFmt={dateFmt} />
                    </div>
                  </div>
                );
              })()}
              {/* Platinum Spread */}
              {(() => {
                const lastPlatSpread = spreadData.platinum.length ? spreadData.platinum[spreadData.platinum.length - 1].spread : 0;
                const interp = spreadInterpretation(lastPlatSpread);
                return (
                  <div className="metric-card rounded-xl p-4">
                    <div className="text-xs font-medium mb-2" style={{ color: "#06b6d4" }}>{t("spreadPlatinum")}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
                        {lastPlatSpread >= 0 ? "+" : ""}{formatPrice(lastPlatSpread, currency)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: interp.color, background: `${interp.color}15` }}>
                        {interp.text}
                      </span>
                    </div>
                    <div style={{ minHeight: 160 }}>
                      <SpreadBars spreads={spreadData.platinum} currency={currency} dateFmt={dateFmt} />
                    </div>
                  </div>
                );
              })()}
              {/* Palladium Spread */}
              {(() => {
                const lastPallSpread = spreadData.palladium.length ? spreadData.palladium[spreadData.palladium.length - 1].spread : 0;
                const interp = spreadInterpretation(lastPallSpread);
                return (
                  <div className="metric-card rounded-xl p-4">
                    <div className="text-xs font-medium mb-2" style={{ color: "#a855f7" }}>{t("spreadPalladium")}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
                        {lastPallSpread >= 0 ? "+" : ""}{formatPrice(lastPallSpread, currency)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: interp.color, background: `${interp.color}15` }}>
                        {interp.text}
                      </span>
                    </div>
                    <div style={{ minHeight: 160 }}>
                      <SpreadBars spreads={spreadData.palladium} currency={currency} dateFmt={dateFmt} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Chart Section */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {([
                    { key: "gold" as Metal, label: t("gold"), activeColor: "bg-amber-500/20 text-amber-400" },
                    { key: "silver" as Metal, label: t("silver"), activeColor: "bg-slate-400/20 text-slate-300" },
                    { key: "platinum" as Metal, label: t("platinum"), activeColor: "bg-cyan-500/20 text-cyan-400" },
                    { key: "palladium" as Metal, label: t("palladium"), activeColor: "bg-purple-500/20 text-purple-400" },
                  ]).map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMetal(m.key)}
                      className={`px-4 py-2 text-sm font-medium transition ${metal === m.key ? m.activeColor : ""}`}
                      style={metal !== m.key ? { color: "var(--text-secondary)" } : {}}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("history")} {metalLabels[metal]} — {currency}
                </h3>
              </div>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {(["1M", "3M", "6M", "1Y", "5Y", "MAX"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium transition ${period === p ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                    style={period !== p ? { color: "var(--text-secondary)" } : {}}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <AreaChart data={chartData} currency={currency} height={300} dateFmt={dateFmt} notEnoughDataLabel={t("notEnoughData")} />

            {/* Period Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{t("high")}</div>
                <div className="text-sm font-bold mono text-emerald-400">{formatPrice(periodHigh, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{t("low")}</div>
                <div className="text-sm font-bold mono text-rose-400">{formatPrice(periodLow, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{t("average")}</div>
                <div className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>{formatPrice(periodAvg, currency)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{t("change")}</div>
                <div className={`text-sm font-bold mono flex items-center gap-1 ${periodChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {periodChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {periodChange >= 0 ? "+" : ""}{periodChange.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Metal 30-Day Overlay Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Comparatif 30 Jours (Normalise)
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Performance relative de chaque metal sur les 30 derniers jours
            </p>
            <MultiMetalChart
              goldData={goldSparkline}
              silverData={silverSparkline}
              platData={platSparkline}
              pallData={pallSparkline}
              currency={currency}
              dateFmt={dateFmt}
            />
          </div>

          {/* Trade Impact */}
          <TradeImpactSection goldDirection={goldSparkline.length >= 2 ? (goldSparkline[goldSparkline.length - 1] > goldSparkline[0] ? "up" : goldSparkline[goldSparkline.length - 1] < goldSparkline[0] ? "down" : "flat") : "flat"} />

          {/* Price Alerts */}
          <PriceAlerts
            currency={currency}
            currentPrices={{
              gold: currentGoldPm?.v[idx] ?? null,
              silver: currentSilver?.v[idx] ?? null,
              platinum: currentPlatPm?.v[idx] ?? null,
              palladium: currentPallPm?.v[idx] ?? null,
            }}
          />

          {/* Data Table — Last 30 entries */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("latestQuotes")} — {metalLabels[metal]}
              </h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {chartData.length} {t("entriesShown")}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: "var(--bg-card)" }}>
                  <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-3 text-left">{t("date")}</th>
                    <th className="px-4 py-3 text-right">USD ($)</th>
                    <th className="px-4 py-3 text-right">GBP (£)</th>
                    <th className="px-4 py-3 text-right">EUR (€)</th>
                    <th className="px-4 py-3 text-right">{t("variation")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chartData].reverse().slice(0, 30).map((entry, i, arr) => {
                    const prev = arr[i + 1];
                    const change = prev?.v[0] ? pctChange(entry.v[0]!, prev.v[0]!) : 0;
                    return (
                      <tr
                        key={entry.d}
                        className="hover:bg-[var(--bg-hover)] transition"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>
                          {formatDate(entry.d, dateFmt)}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-primary)" }}>
                          {entry.v[0] != null ? `$${entry.v[0].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-secondary)" }}>
                          {entry.v[1] != null ? `£${entry.v[1].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-secondary)" }}>
                          {entry.v[2] != null ? `€${entry.v[2].toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {change !== 0 ? (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                            </span>
                          ) : (
                            <Minus className="w-3 h-3 inline" style={{ color: "var(--text-muted)" }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixing Schedule Table */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              <Clock className="w-4 h-4 inline -mt-0.5 mr-2 text-amber-400" />
              {t("scheduleTitle")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-3 text-left">{t("metal")}</th>
                    <th className="px-4 py-3 text-left">{t("session")}</th>
                    <th className="px-4 py-3 text-center">{t("london")} (GMT)</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: "var(--text-primary)" }}>{t("newYork")} (EST)</th>
                    <th className="px-4 py-3 text-center">{t("paris")} (CET)</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXING_SCHEDULE.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[var(--bg-hover)] transition"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: row.color }}>
                        {row.emoji} {t(row.metalKey)}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                        {t(row.sessionKey)}
                      </td>
                      <td className="px-4 py-3 text-center mono" style={{ color: "var(--text-primary)" }}>
                        {row.london}
                      </td>
                      <td className="px-4 py-3 text-center mono font-bold" style={{ color: "var(--text-primary)" }}>
                        {row.ny}
                      </td>
                      <td className="px-4 py-3 text-center mono" style={{ color: "var(--text-secondary)" }}>
                        {row.paris}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─── Main Page ─── */
export default function LBMAPage() {
  return (
    <LocaleProvider>
      <LBMAContent />
    </LocaleProvider>
  );
}
