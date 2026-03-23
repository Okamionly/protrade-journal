"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Activity, TrendingUp, TrendingDown, Clock, Shield, Target,
  AlertTriangle, CheckSquare, Square, Smile, Meh,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Bell, Timer,
  Globe, Moon, Crosshair, Settings, X, Plus, Trash2,
  ChevronDown, ChevronUp, Newspaper, Tv, Layers,
  ExternalLink, RefreshCw, Radio,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { MarketPhaseCard } from "@/components/MarketPhaseBadge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  image: string;
  related: string;
}

interface PriceItem {
  symbol: string;
  price: number;
  change: number;
}

interface LivePricesResponse {
  forex: PriceItem[];
  crypto: PriceItem[];
  commodities: PriceItem[];
  indices: PriceItem[];
  timestamp: number;
}

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

function timeAgo(timestamp: number, labels = { now: "maintenant", min: "min", h: "h", d: "j" }): string {
  const now2 = Math.floor(Date.now() / 1000);
  const diff = now2 - timestamp;
  if (diff < 60) return labels.now;
  if (diff < 3600) return `${Math.floor(diff / 60)}${labels.min}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${labels.h}`;
  return `${Math.floor(diff / 86400)}${labels.d}`;
}

// ─── Collapsible Section Hook ───────────────────────────────────────────────

function useCollapsible(key: string, defaultOpen = true): [boolean, () => void] {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`warroom-collapse-${key}`);
    if (saved !== null) setIsOpen(saved === "true");
  }, [key]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(`warroom-collapse-${key}`, String(next));
      return next;
    });
  }, [key]);

  return [isOpen, toggle];
}

// ─── Collapsible Section Component ──────────────────────────────────────────

function CollapsibleSection({
  title, icon: Icon, children, sectionKey, defaultOpen = true, badge,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  children: React.ReactNode;
  sectionKey: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, toggle] = useCollapsible(sectionKey, defaultOpen);

  return (
    <div className="glass rounded-xl" style={{ border: "1px solid var(--border)" }}>
      <button
        className="flex items-center justify-between w-full p-4 text-left"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {title}
          </span>
          {badge}
        </div>
        {isOpen
          ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
          : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── DST-Aware Session Detection ────────────────────────────────────────────

interface SessionInfo {
  name: string;
  emoji: string;
  start: number; // UTC hour
  end: number;   // UTC hour
  color: string;
}

function isUsDst(date: Date): boolean {
  const year = date.getFullYear();
  const marchFirst = new Date(year, 2, 1);
  const marchFirstDay = marchFirst.getDay();
  const secondSunday = marchFirstDay === 0 ? 8 : 8 + (7 - marchFirstDay);
  const dstStart = new Date(year, 2, secondSunday, 2, 0, 0);
  const novFirst = new Date(year, 10, 1);
  const novFirstDay = novFirst.getDay();
  const firstSundayNov = novFirstDay === 0 ? 1 : 1 + (7 - novFirstDay);
  const dstEnd = new Date(year, 10, firstSundayNov, 2, 0, 0);
  return date >= dstStart && date < dstEnd;
}

function isEuDst(date: Date): boolean {
  const year = date.getFullYear();
  const marchLast = new Date(year, 2, 31);
  const daysBack = marchLast.getDay();
  const lastSundayMarch = new Date(year, 2, 31 - daysBack, 1, 0, 0);
  const octLast = new Date(year, 9, 31);
  const daysBackOct = octLast.getDay();
  const lastSundayOct = new Date(year, 9, 31 - daysBackOct, 1, 0, 0);
  return date >= lastSundayMarch && date < lastSundayOct;
}

function getSessions(date: Date): SessionInfo[] {
  const usDst = isUsDst(date);
  const euDst = isEuDst(date);

  const sydneyStart = isAuDst(date) ? 21 : 22;
  const sydneyEnd = isAuDst(date) ? 6 : 7;
  const tokyoStart = 0;
  const tokyoEnd = 9;
  const londonStart = euDst ? 7 : 8;
  const londonEnd = euDst ? 16 : 17;
  const nyStart = usDst ? 12 : 13;
  const nyEnd = usDst ? 21 : 22;

  return [
    { name: "Sydney", emoji: "🇦🇺", start: sydneyStart, end: sydneyEnd, color: "#8b5cf6" },
    { name: "Tokyo", emoji: "\ud83c\udf0f", start: tokyoStart, end: tokyoEnd, color: "#f59e0b" },
    { name: "London", emoji: "\ud83c\udf0d", start: londonStart, end: londonEnd, color: "#3b82f6" },
    { name: "New York", emoji: "\ud83c\udf0e", start: nyStart, end: nyEnd, color: "#10b981" },
  ];
}

// ─── ICT Killzones & Silver Bullet Windows ──────────────────────────────────

interface KillzoneInfo {
  name: string;
  type: "killzone" | "silver_bullet";
  startUtc: number; // UTC hour (fractional)
  endUtc: number;
  color: string;
  description: string;
}

function getKillzones(date: Date): KillzoneInfo[] {
  const usDst = isUsDst(date);
  const estOffset = usDst ? 4 : 5; // EST/EDT offset from UTC

  // ICT Killzones (EST times → UTC)
  const londonOpenKzStart = 2 + estOffset;  // 02:00 EST
  const londonOpenKzEnd = 5 + estOffset;    // 05:00 EST
  const nyAmKzStart = 7 + estOffset;        // 07:00 EST (NY AM Open)
  const nyAmKzEnd = 10 + estOffset;         // 10:00 EST
  const londonCloseKzStart = 10 + estOffset; // 10:00 EST
  const londonCloseKzEnd = 12 + estOffset;   // 12:00 EST
  const nyPmKzStart = 13.5 + estOffset;     // 13:30 EST (NY PM)
  const nyPmKzEnd = 16 + estOffset;         // 16:00 EST

  // ICT Silver Bullet windows (EST times → UTC)
  const londonSbStart = 3 + estOffset;  // 03:00 EST
  const londonSbEnd = 4 + estOffset;    // 04:00 EST
  const nyAmSbStart = 10 + estOffset;   // 10:00 EST
  const nyAmSbEnd = 11 + estOffset;     // 11:00 EST
  const nyPmSbStart = 14 + estOffset;   // 14:00 EST
  const nyPmSbEnd = 15 + estOffset;     // 15:00 EST

  return [
    { name: "London Open KZ", type: "killzone", startUtc: londonOpenKzStart, endUtc: londonOpenKzEnd, color: "#3b82f6", description: "London Open Killzone — haute volatilité, manipulation fréquente" },
    { name: "NY AM KZ", type: "killzone", startUtc: nyAmKzStart, endUtc: nyAmKzEnd, color: "#10b981", description: "New York AM Killzone — mouvement directionnel majeur" },
    { name: "London Close KZ", type: "killzone", startUtc: londonCloseKzStart, endUtc: londonCloseKzEnd, color: "#f59e0b", description: "London Close — retournements fréquents, prise de liquidité" },
    { name: "NY PM KZ", type: "killzone", startUtc: nyPmKzStart, endUtc: nyPmKzEnd, color: "#ef4444", description: "New York PM Killzone — dernier mouvement du jour" },
    { name: "London SB", type: "silver_bullet", startUtc: londonSbStart, endUtc: londonSbEnd, color: "#60a5fa", description: "Silver Bullet London — FVG entre 03:00-04:00 EST" },
    { name: "NY AM SB", type: "silver_bullet", startUtc: nyAmSbStart, endUtc: nyAmSbEnd, color: "#34d399", description: "Silver Bullet NY AM — FVG entre 10:00-11:00 EST" },
    { name: "NY PM SB", type: "silver_bullet", startUtc: nyPmSbStart, endUtc: nyPmSbEnd, color: "#f87171", description: "Silver Bullet NY PM — FVG entre 14:00-15:00 EST" },
  ];
}

function getActiveSessions(hour: number, sessions: SessionInfo[]): SessionInfo[] {
  return sessions.filter((s) => {
    if (s.start > s.end) {
      // Overnight session (e.g., Sydney 21-06)
      return hour >= s.start || hour < s.end;
    }
    return hour >= s.start && hour < s.end;
  });
}

function getSessionProgress(hour: number, minute: number, session: SessionInfo): number {
  const isOvernight = session.start > session.end;
  const totalMinutes = isOvernight
    ? ((24 - session.start) + session.end) * 60
    : (session.end - session.start) * 60;
  const elapsed = isOvernight
    ? (hour >= session.start ? (hour - session.start) * 60 + minute : (24 - session.start + hour) * 60 + minute)
    : (hour - session.start) * 60 + minute;
  return Math.max(0, Math.min(100, (elapsed / totalMinutes) * 100));
}

function getSessionTimeRemaining(hour: number, minute: number, session: SessionInfo, finishedLabel = "Terminée"): string {
  const isOvernight = session.start > session.end;
  const currentMinutes = hour * 60 + minute;
  const endMinutes = session.end * 60;
  let remaining: number;
  if (isOvernight) {
    remaining = hour >= session.start
      ? ((24 - hour) * 60 - minute) + endMinutes
      : endMinutes - currentMinutes;
  } else {
    remaining = endMinutes - currentMinutes;
  }
  if (remaining <= 0) return finishedLabel;
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function getTradeSession(trade: Trade, sessions: SessionInfo[]): string {
  const d = new Date(trade.date);
  const h = d.getUTCHours();
  for (const s of sessions) {
    if (h >= s.start && h < s.end) return s.name;
  }
  return "Hors session";
}

function isAuDst(date: Date): boolean {
  const year = date.getFullYear();
  // AU DST: first Sunday in October to first Sunday in April (southern hemisphere)
  const octFirst = new Date(year, 9, 1);
  const octDay = octFirst.getDay();
  const firstSunOct = octDay === 0 ? 1 : 1 + (7 - octDay);
  const dstStart = new Date(year, 9, firstSunOct, 2, 0, 0);
  const aprFirst = new Date(year, 3, 1);
  const aprDay = aprFirst.getDay();
  const firstSunApr = aprDay === 0 ? 1 : 1 + (7 - aprDay);
  const dstEnd = new Date(year, 3, firstSunApr, 3, 0, 0);
  // Southern hemisphere: DST from Oct to Apr (crosses year boundary)
  return date >= dstStart || date < dstEnd;
}

// ─── Correlation Data ───────────────────────────────────────────────────────

interface CorrelationPair {
  pair1: string;
  pair2: string;
  direction: "positive" | "inverse" | "neutral";
  strength: "strong" | "moderate" | "weak";
}

const STATIC_CORRELATIONS: CorrelationPair[] = [
  { pair1: "EUR/USD", pair2: "GBP/USD", direction: "positive", strength: "strong" },
  { pair1: "EUR/USD", pair2: "USD/JPY", direction: "inverse", strength: "moderate" },
  { pair1: "EUR/USD", pair2: "XAU/USD", direction: "positive", strength: "moderate" },
  { pair1: "GBP/USD", pair2: "USD/JPY", direction: "inverse", strength: "moderate" },
  { pair1: "GBP/USD", pair2: "XAU/USD", direction: "positive", strength: "weak" },
  { pair1: "USD/JPY", pair2: "XAU/USD", direction: "inverse", strength: "weak" },
];

// ─── Live Stream Links ──────────────────────────────────────────────────────

const LIVE_STREAMS = [
  { name: "Bloomberg TV", url: "https://www.youtube.com/watch?v=dp8PhLsUcFE", color: "#1a1a2e", icon: "B", embedId: "dp8PhLsUcFE" },
  { name: "CNBC Live", url: "https://www.youtube.com/watch?v=9NyxcX3rhQs", color: "#005596", icon: "C", embedId: "9NyxcX3rhQs" },
  { name: "Fox Business", url: "https://www.youtube.com/watch?v=2-TJMg_0uKU", color: "#003366", icon: "F", embedId: "2-TJMg_0uKU" },
  { name: "Yahoo Finance", url: "https://www.youtube.com/watch?v=sZhCdLBQShw", color: "#6001d2", icon: "Y", embedId: "sZhCdLBQShw" },
];

// ─── Règles du Jour Storage ─────────────────────────────────────────────────

const DEFAULT_RULES = [
  "J'ai vérifié le calendrier économique",
  "J'ai défini mon biais du jour",
  "Mon risque max par trade est défini",
  "J'ai identifié mes niveaux clés",
  "Je suis dans un état émotionnel neutre",
];

function getRulesKey(): string {
  return "warroom-custom-rules";
}

function getChecklistKey(): string {
  return `warroom-checklist-${today()}`;
}

function loadCustomRules(): string[] {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const saved = localStorage.getItem(getRulesKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_RULES;
}

function saveCustomRules(rules: string[]): void {
  localStorage.setItem(getRulesKey(), JSON.stringify(rules));
}

function loadChecklist(rulesCount?: number): boolean[] {
  const count = rulesCount ?? DEFAULT_RULES.length;
  if (typeof window === "undefined") return Array(count).fill(false);
  try {
    const saved = localStorage.getItem(getChecklistKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      // Pad or trim to match rules count
      if (parsed.length < count) return [...parsed, ...Array(count - parsed.length).fill(false)];
      if (parsed.length > count) return parsed.slice(0, count);
      return parsed;
    }
  } catch { /* ignore */ }
  return Array(count).fill(false);
}

// ─── Session Countdown Helpers ──────────────────────────────────────────────

interface SessionCountdown {
  name: string;
  emoji: string;
  color: string;
  minutesUntil: number;
  type: "open" | "close";
}

function getUpcomingSessionCountdowns(now: Date, sessions: SessionInfo[]): SessionCountdown[] {
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const nowMinutes = utcH * 60 + utcM;
  const countdowns: SessionCountdown[] = [];

  for (const s of sessions) {
    const openMin = s.start * 60;
    const closeMin = s.end * 60;

    // Minutes until open (handle wrap-around midnight)
    let untilOpen = openMin - nowMinutes;
    if (untilOpen < 0) untilOpen += 1440;
    // Only show if session is NOT currently active
    const isActive =
      s.start < s.end
        ? nowMinutes >= openMin && nowMinutes < closeMin
        : nowMinutes >= openMin || nowMinutes < closeMin;

    if (!isActive && untilOpen > 0 && untilOpen <= 720) {
      countdowns.push({
        name: s.name,
        emoji: s.emoji,
        color: s.color,
        minutesUntil: untilOpen,
        type: "open",
      });
    }
  }

  countdowns.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return countdowns.slice(0, 2);
}

function formatCountdown(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  return `${m}min`;
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

// ─── FOMC Countdown Timer ────────────────────────────────────────────────────

const FOMC_DATES_2026 = [
  new Date(Date.UTC(2026, 0, 28, 19, 0)), // Jan 27-28 (decision day 2, 14:00 EST = 19:00 UTC)
  new Date(Date.UTC(2026, 2, 18, 18, 0)), // Mar 17-18 (projections)
  new Date(Date.UTC(2026, 3, 29, 18, 0)), // Apr 28-29
  new Date(Date.UTC(2026, 5, 17, 18, 0)), // Jun 16-17 (projections)
  new Date(Date.UTC(2026, 6, 29, 18, 0)), // Jul 28-29
  new Date(Date.UTC(2026, 8, 16, 18, 0)), // Sep 15-16 (projections)
  new Date(Date.UTC(2026, 9, 28, 18, 0)), // Oct 27-28
  new Date(Date.UTC(2026, 11, 9, 19, 0)), // Dec 8-9 (projections)
];

const FOMC_DISPLAY_LABELS = [
  "27-28 Janvier", "17-18 Mars ★", "28-29 Avril", "16-17 Juin ★",
  "28-29 Juillet", "15-16 Septembre ★", "27-28 Octobre", "8-9 Décembre ★",
];

function getNextFomc(now: Date): { date: Date; label: string } | null {
  for (let i = 0; i < FOMC_DATES_2026.length; i++) {
    if (FOMC_DATES_2026[i].getTime() > now.getTime()) {
      return { date: FOMC_DATES_2026[i], label: FOMC_DISPLAY_LABELS[i] };
    }
  }
  return null; // All 2026 dates passed
}

function FomcCountdown({ now }: { now: Date }) {
  const next = useMemo(() => getNextFomc(now), [now]);

  if (!next) return null;

  const diff = next.date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const isImminent = days <= 3;

  return (
    <div
      className="glass rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(99, 102, 241, 0.3)",
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "#fff",
              }}
            >
              F
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Prochain FOMC
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {next.label} 2026
              </div>
            </div>
          </div>
          <a
            href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] flex items-center gap-1 hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            Source: CME FedWatch <ExternalLink size={8} />
          </a>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-3 mb-3">
          {[
            { value: days, unit: "j" },
            { value: hours, unit: "h" },
            { value: minutes, unit: "m" },
            { value: seconds, unit: "s" },
          ].map((item, i) => (
            <div key={i} className="flex items-baseline gap-0.5">
              <span
                className="text-2xl font-bold mono"
                style={{
                  color: isImminent ? "#f59e0b" : "var(--text-primary)",
                }}
              >
                {item.value.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {item.unit}
              </span>
              {i < 3 && (
                <span className="text-lg ml-1" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
                  :
                </span>
              )}
            </div>
          ))}
          {isImminent && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium ml-auto">
              IMMINENT
            </span>
          )}
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
            }}
          >
            <Target size={10} />
            <span className="font-medium">Taux actuel: 4.25-4.50%</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
            style={{
              background: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              color: "#a78bfa",
            }}
          >
            <TrendingUp size={10} />
            <span className="font-medium">Le marché anticipe: Maintien</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market Status Grid ─────────────────────────────────────────────────────

interface MarketStatusInfo {
  flag: string;
  name: string;
  exchange: string;
  openUtc: number;  // UTC hour
  closeUtc: number; // UTC hour
}

const MAJOR_MARKETS: MarketStatusInfo[] = [
  { flag: "\ud83c\uddfa\ud83c\uddf8", name: "NYSE", exchange: "New York", openUtc: 14.5, closeUtc: 21 },
  { flag: "\ud83c\uddec\ud83c\udde7", name: "LSE", exchange: "Londres", openUtc: 8, closeUtc: 16.5 },
  { flag: "\ud83c\uddef\ud83c\uddf5", name: "TSE", exchange: "Tokyo", openUtc: 0, closeUtc: 6 },
  { flag: "\ud83c\udded\ud83c\uddf0", name: "HKSE", exchange: "Hong Kong", openUtc: 1.5, closeUtc: 8 },
];

function MarketStatusGrid({ now }: { now: Date }) {
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const utcDay = now.getUTCDay();
  const isWeekend = utcDay === 0 || utcDay === 6;

  function getStatus(m: MarketStatusInfo): { isOpen: boolean; progress: number; timeLabel: string } {
    if (isWeekend) {
      return { isOpen: false, progress: 0, timeLabel: "Week-end" };
    }

    const { openUtc, closeUtc } = m;
    let isOpen: boolean;
    let progress: number;
    let timeLabel: string;

    if (openUtc < closeUtc) {
      // Normal session (e.g., LSE 08:00-16:30)
      isOpen = utcH >= openUtc && utcH < closeUtc;
      if (isOpen) {
        const elapsed = utcH - openUtc;
        const total = closeUtc - openUtc;
        progress = (elapsed / total) * 100;
        const remaining = (closeUtc - utcH) * 60;
        const rH = Math.floor(remaining / 60);
        const rM = Math.floor(remaining % 60);
        timeLabel = `Ferme dans ${rH}h${rM.toString().padStart(2, "0")}m`;
      } else {
        progress = 0;
        const untilOpen = utcH < openUtc ? (openUtc - utcH) * 60 : (24 - utcH + openUtc) * 60;
        const uH = Math.floor(untilOpen / 60);
        const uM = Math.floor(untilOpen % 60);
        timeLabel = `Ouvre dans ${uH}h${uM.toString().padStart(2, "0")}m`;
      }
    } else {
      // Overnight session (e.g., TSE 00:00-06:00 UTC)
      isOpen = utcH >= openUtc || utcH < closeUtc;
      if (isOpen) {
        const totalDuration = (24 - openUtc + closeUtc);
        const elapsed = utcH >= openUtc ? (utcH - openUtc) : (24 - openUtc + utcH);
        progress = (elapsed / totalDuration) * 100;
        const remaining = utcH >= openUtc
          ? ((24 - utcH) + closeUtc) * 60
          : (closeUtc - utcH) * 60;
        const rH = Math.floor(remaining / 60);
        const rM = Math.floor(remaining % 60);
        timeLabel = `Ferme dans ${rH}h${rM.toString().padStart(2, "0")}m`;
      } else {
        progress = 0;
        const untilOpen = (openUtc - utcH) * 60;
        const uH = Math.floor(untilOpen / 60);
        const uM = Math.floor(untilOpen % 60);
        timeLabel = `Ouvre dans ${uH}h${uM.toString().padStart(2, "0")}m`;
      }
    }

    return { isOpen, progress: Math.max(0, Math.min(100, progress)), timeLabel };
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {MAJOR_MARKETS.map((m) => {
        const { isOpen, progress, timeLabel } = getStatus(m);
        const accentColor = isOpen ? "#22c55e" : "#6b7280";

        return (
          <div
            key={m.name}
            className="rounded-xl p-3"
            style={{
              background: isOpen ? "rgba(34, 197, 94, 0.06)" : "var(--bg-secondary)",
              border: `1px solid ${isOpen ? "rgba(34, 197, 94, 0.2)" : "var(--border)"}`,
            }}
          >
            {/* Header: flag + name + badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{m.flag}</span>
                <div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {m.name}
                  </div>
                  <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {m.exchange}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: accentColor,
                    boxShadow: isOpen ? "0 0 6px rgba(34, 197, 94, 0.5)" : "none",
                    animation: isOpen ? "pulse 2s ease-in-out infinite" : "none",
                  }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: accentColor }}
                >
                  {isOpen ? "Ouvert" : "Fermé"}
                </span>
              </div>
            </div>

            {/* Time info */}
            <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              {timeLabel}
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{
                height: "4px",
                background: "var(--border)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: isOpen
                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                    : "var(--text-muted)",
                  opacity: isOpen ? 1 : 0.3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── UTC Offset Options ─────────────────────────────────────────────────────

const UTC_OFFSETS = [
  { label: "UTC-5 (EST)", value: -5 },
  { label: "UTC-4 (EDT)", value: -4 },
  { label: "UTC+0 (GMT)", value: 0 },
  { label: "UTC+1 (CET)", value: 1 },
  { label: "UTC+2 (EET)", value: 2 },
  { label: "UTC+3 (MSK)", value: 3 },
  { label: "UTC+8 (SGT)", value: 8 },
  { label: "UTC+9 (JST)", value: 9 },
];

function detectUtcOffset(): number {
  const offsetMin = new Date().getTimezoneOffset();
  return -offsetMin / 60;
}

function loadUtcOffset(): number {
  if (typeof window === "undefined") return 0;
  const saved = localStorage.getItem("war-room-utc-offset");
  if (saved !== null) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed)) return parsed;
  }
  return detectUtcOffset();
}

// ─── ICT Killzone Definitions (UTC-based) ───────────────────────────────────

interface IctKillzone {
  name: string;
  startUtc: number;
  endUtc: number;
  color: string;
  bgColor: string;
}

const ICT_KILLZONES: IctKillzone[] = [
  { name: "Asian KZ", startUtc: 0, endUtc: 2, color: "#60a5fa", bgColor: "#60a5fa" },
  { name: "London KZ", startUtc: 7, endUtc: 9, color: "#22c55e", bgColor: "#22c55e" },
  { name: "NY AM KZ", startUtc: 12, endUtc: 14, color: "#f97316", bgColor: "#f97316" },
  { name: "NY PM KZ (London Close)", startUtc: 15, endUtc: 16, color: "#eab308", bgColor: "#eab308" },
];

// ─── Enhanced Session Timeline (with Killzones & UTC Offset) ────────────────

function ForexSessionTimeline({
  sessions, hour, minute, second, sessionPerformance, killzones,
}: {
  sessions: SessionInfo[];
  hour: number;
  minute: number;
  second: number;
  currentTime?: Date;
  sessionPerformance: Record<string, { pnl: number; trades: number; wins: number }>;
  killzones: KillzoneInfo[];
}) {
  const [utcOffset, setUtcOffset] = useState(0);

  useEffect(() => {
    setUtcOffset(loadUtcOffset());
  }, []);

  const handleOffsetChange = (val: number) => {
    setUtcOffset(val);
    localStorage.setItem("war-room-utc-offset", String(val));
  };

  // Shift a UTC hour by offset, wrap around 0-24
  const shiftHour = (h: number): number => ((h + utcOffset) % 24 + 24) % 24;

  // Current time in selected timezone
  const displayHour = shiftHour(hour);
  const displayMinute = minute;
  const displaySecond = second;

  // Position on 24h bar (shifted by UTC offset)
  const shiftedSeconds = (shiftHour(hour) * 3600 + minute * 60 + second);
  const timePosition = (shiftedSeconds / 86400) * 100;

  // Format hour in selected offset
  const fmtH = (utcH: number): string => {
    const shifted = shiftHour(utcH);
    return `${Math.floor(shifted).toString().padStart(2, "0")}:00`;
  };

  // Compute session bar position with UTC offset applied
  const getBarStyle = (start: number, end: number) => {
    const s = shiftHour(start);
    const e = shiftHour(end);
    const duration = ((end - start) + 24) % 24 || (end === start ? 24 : 0);
    if (s + duration <= 24) {
      return { left: (s / 24) * 100, width: (duration / 24) * 100 };
    }
    // Overnight wrap
    return { left: (s / 24) * 100, width: (duration / 24) * 100 };
  };

  // Check if session is active
  const isSessionActive = (s: SessionInfo): boolean => {
    if (s.start > s.end) return hour >= s.start || hour < s.end;
    return hour >= s.start && hour < s.end;
  };

  // Check if killzone is active (fractional hours)
  const isKzActive = (kz: { startUtc: number; endUtc: number }): boolean => {
    const nowFrac = hour + minute / 60;
    return nowFrac >= kz.startUtc && nowFrac < kz.endUtc;
  };

  // Time remaining for active killzone
  const getKzRemaining = (kz: { startUtc: number; endUtc: number }): string => {
    const nowMin = hour * 60 + minute;
    const endMin = kz.endUtc * 60;
    const remaining = endMin - nowMin;
    if (remaining <= 0) return "";
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    if (h > 0) return `Fin dans ${h}h ${m.toString().padStart(2, "0")}min`;
    return `Fin dans ${m}min`;
  };

  // Time until next for inactive killzone
  const getKzTimeUntil = (kz: { startUtc: number; endUtc: number }): string => {
    const nowMin = hour * 60 + minute;
    const startMin = kz.startUtc * 60;
    let diff = startMin - nowMin;
    if (diff <= 0) diff += 1440; // tomorrow
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `Dans ${h}h ${m.toString().padStart(2, "0")}min`;
    return `Dans ${m}min`;
  };

  // Find overlap zones between sessions
  const overlaps = useMemo(() => {
    const result: { start: number; end: number; names: string[] }[] = [];
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i];
        const b = sessions[j];
        // Expand overnight sessions to ranges
        const aRanges = a.start > a.end
          ? [{ s: a.start, e: 24 }, { s: 0, e: a.end }]
          : [{ s: a.start, e: a.end }];
        const bRanges = b.start > b.end
          ? [{ s: b.start, e: 24 }, { s: 0, e: b.end }]
          : [{ s: b.start, e: b.end }];
        for (const ar of aRanges) {
          for (const br of bRanges) {
            const oStart = Math.max(ar.s, br.s);
            const oEnd = Math.min(ar.e, br.e);
            if (oStart < oEnd) {
              result.push({ start: oStart, end: oEnd, names: [a.name, b.name] });
            }
          }
        }
      }
    }
    return result;
  }, [sessions]);

  const offsetLabel = UTC_OFFSETS.find(o => o.value === utcOffset)?.label
    || `UTC${utcOffset >= 0 ? "+" : ""}${utcOffset}`;

  // Session colors mapping for gradient
  const sessionGradients: Record<string, string> = {
    Sydney: "linear-gradient(90deg, #3b82f640, #8b5cf640)",
    Tokyo: "linear-gradient(90deg, #ef444440, #f59e0b40)",
    London: "linear-gradient(90deg, #22c55e40, #10b98140)",
    "New York": "linear-gradient(90deg, #f9731640, #eab30840)",
  };

  return (
    <div className="space-y-4">
      {/* CSS animations */}
      <style>{`
        @keyframes kz-pulse {
          0%, 100% { box-shadow: 0 0 4px var(--kz-color); }
          50% { box-shadow: 0 0 12px var(--kz-color), 0 0 20px var(--kz-color-dim); }
        }
        @keyframes session-glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes marker-pulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.04); }
        }
        .kz-active-border {
          animation: kz-pulse 2s ease-in-out infinite;
        }
        .session-active-glow {
          animation: session-glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* UTC Offset Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe size={13} style={{ color: "var(--text-muted)" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Fuseau horaire :</span>
          <select
            value={utcOffset}
            onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
            className="text-[11px] rounded-md px-2 py-1 font-mono"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            {UTC_OFFSETS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] mono font-bold" style={{ color: "#ef4444" }}>
          <Clock size={12} />
          <span>{displayHour.toString().padStart(2, "0")}:{displayMinute.toString().padStart(2, "0")}:{displaySecond.toString().padStart(2, "0")}</span>
          <span className="text-[9px] font-normal" style={{ color: "var(--text-muted)" }}>({offsetLabel})</span>
        </div>
      </div>

      {/* ─── Main 24h Timeline ─── */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ height: "220px", minWidth: "600px" }}>

          {/* Hour markers - every hour */}
          <div className="absolute top-0 left-0 right-0" style={{ height: "16px" }}>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => {
              const leftPct = (h / 24) * 100;
              return (
                <div key={h} className="absolute" style={{ left: `${leftPct}%` }}>
                  <div className="absolute w-px h-full" style={{
                    background: h % 3 === 0 ? "var(--border)" : "transparent",
                    left: 0,
                    top: "16px",
                    height: "204px",
                    opacity: 0.3,
                  }} />
                  {h % 2 === 0 && (
                    <span className="absolute text-[8px] mono -translate-x-1/2" style={{
                      color: "var(--text-muted)",
                      top: 0,
                      left: 0,
                    }}>
                      {fmtH(h).slice(0, 2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlap zones */}
          {overlaps.map((overlap, idx) => {
            const left = (overlap.start / 24) * 100;
            const width = ((overlap.end - overlap.start) / 24) * 100;
            return (
              <div key={`overlap-${idx}`}
                className="absolute rounded"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: "18px",
                  height: "96px",
                  background: "repeating-linear-gradient(45deg, transparent, transparent 3px, #a78bfa12 3px, #a78bfa12 6px)",
                  border: "1px dashed #a78bfa40",
                  zIndex: 1,
                }}
              >
                <span className="absolute -top-0.5 left-1 text-[7px] font-bold uppercase tracking-wider" style={{ color: "#a78bfa" }}>
                  Overlap
                </span>
              </div>
            );
          })}

          {/* Session bars */}
          {sessions.map((session, idx) => {
            const bar = getBarStyle(session.start, session.end);
            const active = isSessionActive(session);
            const perf = sessionPerformance[session.name];
            const gradient = sessionGradients[session.name] || `${session.color}25`;
            // For overnight sessions that wrap, we may need two bars
            const needsWrap = session.start > session.end;

            const renderBar = (leftPct: number, widthPct: number, key: string) => (
              <div
                key={key}
                className={`absolute rounded-md flex items-center justify-between px-2 text-[10px] font-semibold ${active ? "session-active-glow" : ""}`}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: `${20 + idx * 24}px`,
                  height: "20px",
                  background: active ? gradient : `${session.color}15`,
                  border: `1.5px solid ${active ? session.color : `${session.color}40`}`,
                  color: session.color,
                  zIndex: 2,
                  boxShadow: active ? `0 0 10px ${session.color}25` : "none",
                  transition: "all 0.3s ease",
                }}
              >
                <span className="truncate">{session.emoji} {session.name}</span>
                <span className="text-[8px] mono whitespace-nowrap ml-1">
                  {fmtH(session.start)}-{fmtH(session.end)}
                  {perf && perf.trades > 0 && (
                    <span className="ml-1" style={{ color: perf.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                      {formatPnl(perf.pnl)}$
                    </span>
                  )}
                </span>
              </div>
            );

            if (needsWrap) {
              return (
                <div key={session.name}>
                  {renderBar((session.start / 24) * 100, ((24 - session.start) / 24) * 100, `${session.name}-a`)}
                  {renderBar(0, (session.end / 24) * 100, `${session.name}-b`)}
                </div>
              );
            }
            return renderBar(bar.left, bar.width, session.name);
          })}

          {/* ICT Killzones row */}
          {ICT_KILLZONES.map((kz, idx) => {
            const left = (kz.startUtc / 24) * 100;
            const width = ((kz.endUtc - kz.startUtc) / 24) * 100;
            const active = isKzActive(kz);
            return (
              <div
                key={kz.name}
                className={`absolute rounded flex items-center px-1.5 text-[8px] font-bold ${active ? "kz-active-border" : ""}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${122 + idx * 18}px`,
                  height: "14px",
                  background: active
                    ? `repeating-linear-gradient(90deg, ${kz.color}35, ${kz.color}20 4px, ${kz.color}35 8px)`
                    : `${kz.color}12`,
                  border: `1px solid ${active ? kz.color : `${kz.color}35`}`,
                  color: kz.color,
                  zIndex: 3,
                  "--kz-color": kz.color,
                  "--kz-color-dim": `${kz.color}30`,
                } as React.CSSProperties}
              >
                <span className="truncate">{kz.name}</span>
                {active && (
                  <span className="ml-1 text-[7px] px-1 rounded-full animate-pulse"
                    style={{ background: `${kz.color}40` }}>
                    ACTIF
                  </span>
                )}
              </div>
            );
          })}

          {/* Silver Bullet windows from existing killzones */}
          {killzones.filter(kz => kz.type === "silver_bullet").map((kz, idx) => {
            const left = (kz.startUtc / 24) * 100;
            const width = ((kz.endUtc - kz.startUtc) / 24) * 100;
            const active = isKzActive(kz);
            return (
              <div
                key={kz.name}
                className="absolute rounded flex items-center justify-center text-[7px] font-bold"
                title={kz.description}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${196 + idx * 14}px`,
                  height: "12px",
                  background: active ? `${kz.color}45` : `${kz.color}15`,
                  border: `1px dashed ${active ? kz.color : `${kz.color}40`}`,
                  color: kz.color,
                  zIndex: 3,
                  boxShadow: active ? `0 0 8px ${kz.color}30` : "none",
                }}
              >
                <span>SB</span>
              </div>
            );
          })}

          {/* Current time vertical red line */}
          <div
            className="absolute"
            style={{
              left: `${timePosition}%`,
              top: "14px",
              bottom: 0,
              width: "2px",
              background: "#ef4444",
              zIndex: 20,
              boxShadow: "0 0 6px #ef444480",
            }}
          >
            {/* Triangle pointer at top */}
            <div style={{
              position: "absolute",
              top: "-6px",
              left: "-5px",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid #ef4444",
            }} />
            {/* Time label */}
            <div className="absolute -left-[22px] text-[9px] mono font-bold whitespace-nowrap"
              style={{ color: "#ef4444", top: "-18px" }}>
              {displayHour.toString().padStart(2, "0")}:{displayMinute.toString().padStart(2, "0")}:{displaySecond.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ICT Killzone Status Cards ─── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crosshair size={12} style={{ color: "var(--text-muted)" }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            ICT Killzones
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ICT_KILLZONES.map((kz) => {
            const active = isKzActive(kz);
            return (
              <div
                key={kz.name}
                className={`rounded-lg p-2.5 transition-all ${active ? "kz-active-border" : ""}`}
                style={{
                  background: active ? `${kz.color}12` : "var(--bg-secondary)",
                  border: `1.5px solid ${active ? kz.color : "var(--border)"}`,
                  "--kz-color": kz.color,
                  "--kz-color-dim": `${kz.color}30`,
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: active ? kz.color : "var(--text-muted)",
                    boxShadow: active ? `0 0 6px ${kz.color}` : "none",
                  }} />
                  <span className="text-[10px] font-bold truncate" style={{ color: active ? kz.color : "var(--text-primary)" }}>
                    {kz.name}
                  </span>
                  {active && (
                    <span className="text-[7px] px-1 py-0.5 rounded-full font-bold animate-pulse ml-auto flex-shrink-0"
                      style={{ background: `${kz.color}25`, color: kz.color }}>
                      ACTIF
                    </span>
                  )}
                </div>
                <div className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                  {fmtH(kz.startUtc)}-{fmtH(kz.endUtc)}
                </div>
                <div className="text-[9px] font-medium mt-0.5" style={{ color: active ? kz.color : "var(--text-muted)" }}>
                  {active ? getKzRemaining(kz) : getKzTimeUntil(kz)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Detailed Killzones + Silver Bullet Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {killzones.map((kz) => {
          const active = isKzActive(kz);
          return (
            <div
              key={kz.name}
              className="flex items-center gap-3 p-2.5 rounded-lg transition-all"
              style={{
                background: active ? `${kz.color}15` : "var(--bg-secondary)",
                border: `1px solid ${active ? kz.color : "var(--border)"}`,
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                background: active ? kz.color : "var(--text-muted)",
                boxShadow: active ? `0 0 6px ${kz.color}` : "none",
              }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: active ? kz.color : "var(--text-primary)" }}>
                    {kz.name}
                  </span>
                  {kz.type === "silver_bullet" && (
                    <span className="text-[8px] px-1 py-0.5 rounded font-bold"
                      style={{ background: `${kz.color}20`, color: kz.color }}>
                      SB
                    </span>
                  )}
                  {active && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                      style={{ background: `${kz.color}30`, color: kz.color }}>
                      ACTIF
                    </span>
                  )}
                </div>
                <div className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                  {fmtH(kz.startUtc)}-{fmtH(kz.endUtc)} ({offsetLabel})
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {kz.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Legend ─── */}
      <div className="flex flex-wrap gap-3 text-[9px]" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded" style={{ background: "#3b82f625", border: "1px solid #3b82f650" }} />
          Session
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded" style={{
            background: "repeating-linear-gradient(90deg, #22c55e35, #22c55e20 4px, #22c55e35 8px)",
            border: "1px solid #22c55e50",
          }} />
          Killzone
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded" style={{ background: "#60a5fa20", border: "1px dashed #60a5fa50" }} />
          Silver Bullet
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded" style={{
            background: "repeating-linear-gradient(45deg, transparent, transparent 2px, #a78bfa15 2px, #a78bfa15 4px)",
            border: "1px dashed #a78bfa40",
          }} />
          Overlap
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
          Maintenant
        </span>
      </div>

      {/* Session P&L summary */}
      <div className="flex flex-wrap gap-3">
        {sessions.map((session) => {
          const perf = sessionPerformance[session.name];
          if (!perf || perf.trades === 0) return null;
          const winRate = perf.trades > 0 ? (perf.wins / perf.trades) * 100 : 0;
          return (
            <div key={session.name} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ background: session.color }} />
              <span style={{ color: "var(--text-muted)" }}>{session.name}:</span>
              <span className="mono font-semibold" style={{ color: perf.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                {formatPnl(perf.pnl)}$
              </span>
              <span className="mono" style={{ color: "var(--text-muted)" }}>
                ({perf.trades}t, {winRate.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Market Correlation Matrix ──────────────────────────────────────────────

function CorrelationMatrix() {
  const pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"];

  const getCorrelation = (p1: string, p2: string) => {
    if (p1 === p2) return { arrow: "--", color: "var(--text-muted)" };
    const corr = STATIC_CORRELATIONS.find(
      (c) => (c.pair1 === p1 && c.pair2 === p2) || (c.pair1 === p2 && c.pair2 === p1)
    );
    if (!corr) return { arrow: "--", color: "var(--text-muted)" };

    if (corr.direction === "positive") {
      if (corr.strength === "strong") return { arrow: "\u2191\u2191", color: "#22c55e" };
      if (corr.strength === "moderate") return { arrow: "\u2191\u2197", color: "#4ade80" };
      return { arrow: "\u2197", color: "#86efac" };
    }
    if (corr.direction === "inverse") {
      if (corr.strength === "strong") return { arrow: "\u2191\u2193", color: "#ef4444" };
      if (corr.strength === "moderate") return { arrow: "\u2191\u2199", color: "#f87171" };
      return { arrow: "\u2199", color: "#fca5a5" };
    }
    return { arrow: "\u2194", color: "#f59e0b" };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            <th className="p-1.5 text-left" style={{ color: "var(--text-muted)" }}></th>
            {pairs.map((p) => (
              <th key={p} className="p-1.5 text-center mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {p.split("/")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pairs.map((row) => (
            <tr key={row} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="p-1.5 mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {row.split("/")[0]}
              </td>
              {pairs.map((col) => {
                const { arrow, color } = getCorrelation(row, col);
                return (
                  <td key={col} className="p-1.5 text-center font-bold" style={{ color }}>
                    {arrow}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2 text-[9px]" style={{ color: "var(--text-muted)" }}>
        <span><span style={{ color: "#22c55e" }}>{"\u2191\u2191"}</span> Corrélé</span>
        <span><span style={{ color: "#ef4444" }}>{"\u2191\u2193"}</span> Inverse</span>
        <span><span style={{ color: "#f59e0b" }}>{"\u2194"}</span> Neutre</span>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function WarRoomPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState<Date>(new Date(0));
  const [mounted, setMounted] = useState(false);
  const [customRules, setCustomRules] = useState<string[]>(DEFAULT_RULES);
  const [checklist, setChecklist] = useState<boolean[]>(DEFAULT_RULES.map(() => false));
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodTimeline, setMoodTimeline] = useState<{ time: string; mood: string }[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);

  // New state
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [livePrices, setLivePrices] = useState<LivePricesResponse | null>(null);
  const [activeStreamEmbed, setActiveStreamEmbed] = useState<string | null>(null);

  // Real-time clock (hydration-safe)
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load checklist, moods, and alert settings from localStorage
  useEffect(() => {
    const rules = loadCustomRules();
    setCustomRules(rules);
    setChecklist(loadChecklist(rules.length));
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

  // Fetch news
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data: NewsArticle[] = await res.json();
        setNewsArticles(data.slice(0, 5));
      }
    } catch { /* ignore */ }
    setNewsLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Fetch live prices
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/live-prices");
      if (res.ok) {
        const data: LivePricesResponse = await res.json();
        setLivePrices(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30 * 1000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const toggleChecklist = useCallback((index: number) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      localStorage.setItem(getChecklistKey(), JSON.stringify(next));
      return next;
    });
  }, []);

  const addRule = useCallback((rule: string) => {
    if (!rule.trim()) return;
    setCustomRules((prev) => {
      const next = [...prev, rule.trim()];
      saveCustomRules(next);
      return next;
    });
    setChecklist((prev) => {
      const next = [...prev, false];
      localStorage.setItem(getChecklistKey(), JSON.stringify(next));
      return next;
    });
    setNewRuleInput("");
    setShowAddRule(false);
  }, []);

  const removeRule = useCallback((index: number) => {
    setCustomRules((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveCustomRules(next);
      return next;
    });
    setChecklist((prev) => {
      const next = prev.filter((_, i) => i !== index);
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
  const killzones = useMemo(() => getKillzones(currentTime), [currentTime]);

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
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10), [trades]);

  const sortedTrades = useMemo(() => [...trades].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ), [trades]);

  // Session info (DST-aware)
  const hour = currentTime.getUTCHours();
  const minute = currentTime.getUTCMinutes();
  const second = currentTime.getUTCSeconds();
  const activeSessions = getActiveSessions(hour, sessions);

  // ─── Alerts with customizable thresholds ──────────────────────────────
  const alerts = useMemo(() => {
    const list: { icon: typeof Bell; text: string; level: "warn" | "info" | "danger" }[] = [];
    if (todayTrades.length >= alertSettings.maxTrades) {
      list.push({ icon: AlertTriangle, text: `Limite de ${alertSettings.maxTrades} trades atteinte`, level: "warn" });
    }
    const losses = todayTrades.filter((t) => t.result < 0).length;
    if (losses >= alertSettings.maxLosses) {
      list.push({ icon: Shield, text: `${alertSettings.maxLosses} pertes - arrêtez de trader`, level: "danger" });
    }
    if (todayPnl < -(alertSettings.dailyProfitTarget * 0.5)) {
      list.push({ icon: AlertTriangle, text: `Perte journalière: ${formatPnl(todayPnl)}$`, level: "danger" });
    }
    if (todayPnl >= alertSettings.dailyProfitTarget) {
      list.push({ icon: Target, text: `Objectif journalier atteint: ${formatPnl(todayPnl)}$ / ${alertSettings.dailyProfitTarget}$`, level: "info" });
    }
    if (activeSessions.length === 0) {
      list.push({ icon: Moon, text: "Hors session - marché peu liquide", level: "info" });
    }
    if (activeSessions.length >= 2) {
      list.push({ icon: Zap, text: "Overlap de sessions - haute volatilité", level: "info" });
    }
    return list;
  }, [todayTrades, todayPnl, activeSessions, alertSettings]);

  const rulesChecked = checklist.filter(Boolean).length;
  const rulesTotal = customRules.length;
  const checklistProgress = rulesTotal > 0 ? rulesChecked / rulesTotal : 0;
  const allRulesValidated = rulesTotal > 0 && rulesChecked === rulesTotal;

  // Upcoming session countdowns
  const upcomingCountdowns = useMemo(
    () => getUpcomingSessionCountdowns(currentTime, sessions),
    [currentTime, sessions]
  );

  // ─── Performance par Session ──────────────────────────────────────────
  const sessionPerformance = useMemo(() => {
    const perf: Record<string, { pnl: number; trades: number; wins: number }> = {
      "Sydney": { pnl: 0, trades: 0, wins: 0 },
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

  // ─── Key Levels computed from live prices ─────────────────────────────
  const keyLevels = useMemo(() => {
    if (!livePrices) return [];
    const allPrices = [...livePrices.forex, ...livePrices.commodities];
    return allPrices.slice(0, 6).map((p) => {
      const price = p.price;
      // Calculate round numbers near price
      let roundStep: number;
      if (price > 1000) roundStep = 50;
      else if (price > 100) roundStep = 5;
      else if (price > 10) roundStep = 0.5;
      else roundStep = 0.005;

      const roundBelow = Math.floor(price / roundStep) * roundStep;
      const roundAbove = roundBelow + roundStep;

      // Simple pivot calculation: (H + L + C) / 3 using price +/- some range
      const estimatedRange = price * 0.005; // ~0.5% range estimation
      const estimatedHigh = price + estimatedRange / 2;
      const estimatedLow = price - estimatedRange / 2;
      const pivot = (estimatedHigh + estimatedLow + price) / 3;

      return {
        symbol: p.symbol,
        price,
        change: p.change,
        roundBelow,
        roundAbove,
        pivot,
      };
    });
  }, [livePrices]);

  // ─── Risk Dashboard Data ──────────────────────────────────────────────
  const riskData = useMemo(() => {
    const todayLosses = todayTrades.filter((t) => t.result < 0).length;
    const dailyPnlProgress = alertSettings.dailyProfitTarget > 0
      ? Math.min(100, Math.max(-100, (todayPnl / alertSettings.dailyProfitTarget) * 100))
      : 0;
    const tradesRemaining = Math.max(0, alertSettings.maxTrades - todayTrades.length);
    const lossesRemaining = Math.max(0, alertSettings.maxLosses - todayLosses);

    return {
      openRisk: riskExposure,
      dailyPnlProgress,
      tradesRemaining,
      lossesRemaining,
      todayLosses,
    };
  }, [todayTrades, todayPnl, riskExposure, alertSettings]);

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
    { emoji: "\ud83d\ude24", label: t("warRoomMoodFrustrated") },
    { emoji: "\ud83d\ude30", label: t("warRoomMoodAnxious") },
    { emoji: "\ud83d\ude10", label: t("warRoomMoodNeutral") },
    { emoji: "\ud83d\ude42", label: t("warRoomMoodConfident") },
    { emoji: "\ud83d\udd25", label: t("warRoomInZone") },
  ];

  const sessionColors: Record<string, string> = {
    "Sydney": "#8b5cf6",
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
            title="Paramètres des alertes"
          >
            <Settings size={16} />
          </button>
          <div className="flex items-center gap-2 mono text-sm" style={{ color: "var(--text-muted)" }} suppressHydrationWarning>
            <Clock size={14} />
            {mounted ? currentTime.toLocaleTimeString("fr-FR") : "--:--:--"}
          </div>
        </div>
      </div>

      {/* ═══ LIVE PRICE TICKER ═══ */}
      {livePrices && (() => {
        const tickerItems = [
          ...livePrices.forex.slice(0, 6),
          ...livePrices.indices.slice(0, 4),
          ...livePrices.crypto,
          ...livePrices.commodities.slice(0, 2),
        ];
        return (
          <div className="glass rounded-xl overflow-hidden relative" style={{ border: "1px solid var(--border)" }}>
            <div className="ticker-scroll flex py-2">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <div key={`${item.symbol}-${i}`} className="flex items-center gap-2 px-4 flex-shrink-0"
                  style={{ borderRight: "1px solid var(--border)" }}>
                  <span className="text-[10px] font-semibold mono" style={{ color: "var(--text-primary)" }}>
                    {item.symbol}
                  </span>
                  <span className="text-[10px] mono font-bold" style={{ color: "var(--text-primary)" }}>
                    {item.price > 100 ? item.price.toFixed(2) : item.price > 10 ? item.price.toFixed(3) : item.price.toFixed(5)}
                  </span>
                  <span className="text-[9px] mono font-bold px-1.5 py-0.5 rounded" style={{
                    color: item.change >= 0 ? "#22c55e" : "#ef4444",
                    background: item.change >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  }}>
                    {item.change >= 0 ? "▲" : "▼"} {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══ FOMC COUNTDOWN ═══ */}
      <FomcCountdown now={currentTime} />

      {/* ═══ BREAKING NEWS TICKER ═══ */}
      <CollapsibleSection title="Breaking News" icon={Newspaper} sectionKey="news-ticker"
        badge={
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 ml-2">
            <Radio size={8} /> LIVE
          </span>
        }
      >
        <div className="space-y-1.5">
          {newsLoading && newsArticles.length === 0 ? (
            <div className="flex items-center gap-2 py-3" style={{ color: "var(--text-muted)" }}>
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-xs">{t("loading")}</span>
            </div>
          ) : newsArticles.length === 0 ? (
            <div className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
              Aucune actualité disponible
            </div>
          ) : (
            newsArticles.map((article, i) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-[--bg-secondary] transition group"
                style={{ borderBottom: i < newsArticles.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: article.category === "forex" ? "#3b82f620" :
                          article.category === "crypto" ? "#f59e0b20" :
                          article.category === "macro" ? "#8b5cf620" :
                          article.category === "commodities" ? "#22c55e20" :
                          "var(--border)",
                        color: article.category === "forex" ? "#3b82f6" :
                          article.category === "crypto" ? "#f59e0b" :
                          article.category === "macro" ? "#8b5cf6" :
                          article.category === "commodities" ? "#22c55e" :
                          "var(--text-muted)",
                      }}>
                      {article.category.toUpperCase()}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {article.source}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(article.datetime, { now: t("timeNow"), min: t("timeMin"), h: t("timeH"), d: t("timeD") })}
                    </span>
                  </div>
                  <p className="text-xs font-medium truncate group-hover:text-blue-400 transition"
                    style={{ color: "var(--text-primary)" }}>
                    {article.headline}
                  </p>
                </div>
                <ExternalLink size={12} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 4 }}
                  className="opacity-0 group-hover:opacity-100 transition" />
              </a>
            ))
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              Auto-refresh toutes les 2 min
            </span>
            <button onClick={fetchNews} className="text-[9px] px-2 py-0.5 rounded hover:bg-[--bg-secondary] transition flex items-center gap-1"
              style={{ color: "var(--text-muted)" }} disabled={newsLoading}>
              <RefreshCw size={9} className={newsLoading ? "animate-spin" : ""} /> Rafraîchir
            </button>
          </div>
        </div>
      </CollapsibleSection>

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

      {/* ═══ TODAY'S PNL SUMMARY BY ASSET ═══ */}
      {todayTrades.length > 0 && (() => {
        // Group today's trades by asset
        const assetMap: Record<string, { trades: number; wins: number; pnl: number; avgRR: number }> = {};
        todayTrades.forEach(t => {
          const a = t.asset || "N/A";
          if (!assetMap[a]) assetMap[a] = { trades: 0, wins: 0, pnl: 0, avgRR: 0 };
          assetMap[a].trades++;
          assetMap[a].pnl += t.result;
          if (t.result > 0) assetMap[a].wins++;
          assetMap[a].avgRR += calcRR(t);
        });
        Object.values(assetMap).forEach(v => { if (v.trades > 0) v.avgRR /= v.trades; });
        const sortedAssets = Object.entries(assetMap).sort((a, b) => b[1].pnl - a[1].pnl);

        // Session breakdown
        const sessionPnl: Record<string, { pnl: number; trades: number; wins: number }> = {};
        todayTrades.forEach(t => {
          const h = new Date(t.date).getUTCHours();
          let sess = "Other";
          if (h >= 0 && h < 8) sess = "Asia";
          else if (h >= 8 && h < 13) sess = "London";
          else if (h >= 13 && h < 17) sess = "NY AM";
          else if (h >= 17 && h < 21) sess = "NY PM";
          if (!sessionPnl[sess]) sessionPnl[sess] = { pnl: 0, trades: 0, wins: 0 };
          sessionPnl[sess].pnl += t.result;
          sessionPnl[sess].trades++;
          if (t.result > 0) sessionPnl[sess].wins++;
        });

        return (
          <CollapsibleSection title="Résumé du Jour" icon={BarChart3} sectionKey="daily-summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Asset */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Par Asset</h4>
                <div className="space-y-1.5">
                  {sortedAssets.map(([asset, data]) => (
                    <div key={asset} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                      <span className="text-xs font-bold w-20 truncate" style={{ color: "var(--text-primary)" }}>{asset}</span>
                      <span className={`text-xs font-bold mono flex-1 ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(2)}€
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {data.wins}W/{data.trades - data.wins}L
                      </span>
                      <span className="text-[10px] mono" style={{ color: data.avgRR >= 1 ? "#10b981" : "#f59e0b" }}>
                        {data.avgRR.toFixed(1)}R
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Session */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Par Session</h4>
                <div className="space-y-1.5">
                  {Object.entries(sessionPnl).sort((a, b) => b[1].pnl - a[1].pnl).map(([sess, data]) => {
                    const wr = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
                    const maxPnl = Math.max(...Object.values(sessionPnl).map(s => Math.abs(s.pnl)), 1);
                    const barW = (Math.abs(data.pnl) / maxPnl) * 100;
                    return (
                      <div key={sess} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                        <span className="text-xs font-medium w-16" style={{ color: "var(--text-primary)" }}>{sess}</span>
                        <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: "var(--bg-secondary)" }}>
                          <div className={`h-full rounded ${data.pnl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"}`} style={{ width: `${Math.max(barW, 5)}%` }} />
                          <span className={`absolute inset-0 flex items-center px-2 text-[10px] font-bold mono ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                          </span>
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {data.trades}t • {wr.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        );
      })()}

      {/* ═══ RISK DASHBOARD MINI ═══ */}
      <CollapsibleSection title="Tableau de Risque" icon={Shield} sectionKey="risk-dashboard">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Open Risk */}
          <div className="rounded-lg p-3" style={{ background: "#f59e0b10", border: "1px solid #f59e0b25" }}>
            <div className="text-[10px] mb-1" style={{ color: "#f59e0b" }}>Risque Ouvert</div>
            <div className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>
              {riskData.openRisk.toFixed(0)}$
            </div>
          </div>

          {/* Daily P&L Progress */}
          <div className="rounded-lg p-3" style={{
            background: riskData.dailyPnlProgress >= 0 ? "#22c55e10" : "#ef444410",
            border: `1px solid ${riskData.dailyPnlProgress >= 0 ? "#22c55e25" : "#ef444425"}`,
          }}>
            <div className="text-[10px] mb-1" style={{ color: riskData.dailyPnlProgress >= 0 ? "#22c55e" : "#ef4444" }}>
              Objectif Journalier
            </div>
            <div className="text-sm font-bold mono mb-1" style={{ color: riskData.dailyPnlProgress >= 0 ? "#22c55e" : "#ef4444" }}>
              {formatPnl(todayPnl)}$ / {alertSettings.dailyProfitTarget}$
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.abs(Math.min(100, riskData.dailyPnlProgress))}%`,
                  background: riskData.dailyPnlProgress >= 100 ? "#22c55e" :
                    riskData.dailyPnlProgress >= 0 ? "#3b82f6" : "#ef4444",
                }} />
            </div>
          </div>

          {/* Trades Remaining */}
          <div className="rounded-lg p-3" style={{
            background: riskData.tradesRemaining > 0 ? "#3b82f610" : "#ef444410",
            border: `1px solid ${riskData.tradesRemaining > 0 ? "#3b82f625" : "#ef444425"}`,
          }}>
            <div className="text-[10px] mb-1" style={{ color: riskData.tradesRemaining > 0 ? "#3b82f6" : "#ef4444" }}>
              Trades Restants
            </div>
            <div className="text-2xl font-bold mono" style={{ color: riskData.tradesRemaining > 0 ? "#3b82f6" : "#ef4444" }}>
              {riskData.tradesRemaining}
            </div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              sur {alertSettings.maxTrades} max
            </div>
          </div>

          {/* Losses Remaining */}
          <div className="rounded-lg p-3" style={{
            background: riskData.lossesRemaining > 0 ? "#8b5cf610" : "#ef444410",
            border: `1px solid ${riskData.lossesRemaining > 0 ? "#8b5cf625" : "#ef444425"}`,
          }}>
            <div className="text-[10px] mb-1" style={{ color: riskData.lossesRemaining > 0 ? "#8b5cf6" : "#ef4444" }}>
              Pertes Restantes
            </div>
            <div className="text-2xl font-bold mono" style={{ color: riskData.lossesRemaining > 0 ? "#8b5cf6" : "#ef4444" }}>
              {riskData.lossesRemaining}
            </div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              {riskData.todayLosses} pertes aujourd&apos;hui
            </div>
          </div>
        </div>
      </CollapsibleSection>

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
                const remaining = getSessionTimeRemaining(hour, minute, session, t("finished"));
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

        {/* ═══ 7. Règles du Jour Checklist ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                Règles du Jour
              </span>
            </div>
            <span className="text-[11px] mono font-medium px-2 py-0.5 rounded-full" style={{
              background: allRulesValidated ? "#22c55e20" : "var(--border)",
              color: allRulesValidated ? "#22c55e" : "var(--text-muted)",
            }}>
              {rulesChecked}/{rulesTotal} validées
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${checklistProgress * 100}%`,
                background: allRulesValidated ? "#22c55e" : "#f59e0b",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Unlock message */}
          {allRulesValidated && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg text-xs font-medium"
              style={{ background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e30" }}>
              <Zap size={14} />
              <span>{"\u{1F680}"} Prêt à trader !</span>
            </div>
          )}

          {/* Rules list */}
          <div className="space-y-1.5">
            {customRules.map((rule, i) => (
              <div key={`${rule}-${i}`} className="flex items-center gap-2 group">
                <button
                  className="flex items-center gap-2 flex-1 text-left text-xs py-1 hover:opacity-80 transition-opacity"
                  onClick={() => toggleChecklist(i)}
                  style={{ color: checklist[i] ? "var(--text-muted)" : "var(--text-primary)" }}
                >
                  {checklist[i]
                    ? <CheckSquare size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                    : <Square size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  <span style={{ textDecoration: checklist[i] ? "line-through" : "none" }}>{rule}</span>
                </button>
                {/* Only show delete for non-default or if more than 1 rule */}
                {customRules.length > 1 && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[--bg-secondary]"
                    onClick={() => removeRule(i)}
                    title="Supprimer cette règle"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add rule */}
          {showAddRule ? (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addRule(newRuleInput); if (e.key === "Escape") setShowAddRule(false); }}
                placeholder="Nouvelle règle..."
                autoFocus
                className="flex-1 px-2 py-1 rounded-lg text-xs"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              />
              <button
                onClick={() => addRule(newRuleInput)}
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
              >
                OK
              </button>
              <button
                onClick={() => { setShowAddRule(false); setNewRuleInput(""); }}
                className="p-1 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center gap-1.5 mt-3 text-xs hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              <Plus size={12} />
              <span>Ajouter une règle</span>
            </button>
          )}
        </div>

        {/* ═══ 7b. Compte à Rebours Sessions ═══ */}
        {mounted && upcomingCountdowns.length > 0 && (
          <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Timer size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                Prochaines sessions
              </span>
            </div>
            <div className="space-y-2.5">
              {upcomingCountdowns.map((cd) => {
                const isPulsing = cd.minutesUntil <= 15;
                return (
                  <div
                    key={`${cd.name}-${cd.type}`}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{
                      background: `${cd.color}10`,
                      border: `1px solid ${cd.color}${isPulsing ? "60" : "25"}`,
                      animation: isPulsing ? "countdown-pulse 1.5s ease-in-out infinite" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cd.emoji}</span>
                      <span className="text-xs font-medium" style={{ color: cd.color }}>
                        {cd.name} Open
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPulsing && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cd.color, animation: "countdown-pulse 1s ease-in-out infinite" }} />
                      )}
                      <span className="text-xs mono font-bold" style={{ color: isPulsing ? cd.color : "var(--text-primary)" }}>
                        dans {formatCountdown(cd.minutesUntil)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
      </div>

      {/* ═══ FOREX SESSIONS & ICT KILLZONES TIMELINE ═══ */}
      <CollapsibleSection title={`Sessions Forex & Killzones${(isUsDst(currentTime) || isEuDst(currentTime)) ? " - DST actif" : ""}`}
        icon={Globe} sectionKey="session-timeline">
        <ForexSessionTimeline
          sessions={sessions}
          hour={hour}
          minute={minute}
          second={second}
          currentTime={currentTime}
          sessionPerformance={sessionPerformance}
          killzones={killzones}
        />
      </CollapsibleSection>

      {/* ═══ STATUT DES MARCHÉS MONDIAUX ═══ */}
      <CollapsibleSection title="Statut des Marchés Mondiaux" icon={Globe} sectionKey="market-status">
        <MarketStatusGrid now={currentTime} />
      </CollapsibleSection>

      {/* ═══ PHASE DE MARCHÉ (WYCKOFF) ═══ */}
      <MarketPhaseCard />

      {/* ═══ Second Grid: Performance + Key Levels + Correlation ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

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
                    <span className="text-xs font-medium" style={{ color }}>{name === "Hors session" ? t("warRoomOutOfSession") : name}</span>
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

        {/* ═══ MARKET CORRELATION ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Corrélation Marchés
            </span>
          </div>
          <CorrelationMatrix />
        </div>

        {/* ═══ KEY LEVELS ═══ */}
        <div className="glass rounded-xl p-4 lg:col-span-2" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Crosshair size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Niveaux Clés
            </span>
          </div>
          {keyLevels.length === 0 ? (
            <div className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
              {t("loadingData")}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {keyLevels.map((level) => (
                <div key={level.symbol} className="rounded-lg p-2.5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold mono" style={{ color: "var(--text-primary)" }}>{level.symbol}</span>
                    <span className="text-[10px] mono font-semibold" style={{ color: level.change >= 0 ? "#22c55e" : "#ef4444" }}>
                      {level.change >= 0 ? "+" : ""}{level.change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm font-bold mono mb-1.5" style={{ color: "var(--text-primary)" }}>
                    {level.price > 10 ? level.price.toFixed(2) : level.price.toFixed(4)}
                  </div>
                  <div className="space-y-0.5 text-[9px] mono">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Pivot</span>
                      <span style={{ color: "#8b5cf6" }}>{level.pivot > 10 ? level.pivot.toFixed(2) : level.pivot.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Rond {"\u2191"}</span>
                      <span style={{ color: "#22c55e" }}>{level.roundAbove > 10 ? level.roundAbove.toFixed(2) : level.roundAbove.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Rond {"\u2193"}</span>
                      <span style={{ color: "#ef4444" }}>{level.roundBelow > 10 ? level.roundBelow.toFixed(2) : level.roundBelow.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <span className="text-sm">Ajoutez des émotions à vos trades pour voir la corrélation</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ INFO STREAMS ═══ */}
      <CollapsibleSection title="Info Streams" icon={Tv} sectionKey="info-streams" defaultOpen={false}>
        <div className="space-y-3">
          {/* Stream embed area */}
          {activeStreamEmbed && (
            <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "360px", border: "1px solid var(--border)" }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeStreamEmbed}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Live Stream"
              />
              <button
                onClick={() => setActiveStreamEmbed(null)}
                className="absolute top-2 right-2 p-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Stream cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {LIVE_STREAMS.map((stream) => (
              <button
                key={stream.name}
                onClick={() => setActiveStreamEmbed(
                  activeStreamEmbed === stream.embedId ? null : stream.embedId
                )}
                className="flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  background: activeStreamEmbed === stream.embedId ? `${stream.color}40` : `${stream.color}15`,
                  border: `1px solid ${activeStreamEmbed === stream.embedId ? stream.color : `${stream.color}30`}`,
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: stream.color }}>
                  {stream.icon}
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  {stream.name}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {activeStreamEmbed === stream.embedId ? t("warRoomStreaming") : t("warRoomClickToWatch")}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="text-[9px] text-center" style={{ color: "var(--text-muted)" }}>
            Les streams sont fournis par YouTube. Disponibilité selon les diffuseurs.
          </div>
        </div>
      </CollapsibleSection>

      {/* ═══ Settings Modal ═══ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                <Settings size={16} className="inline mr-2" style={{ color: "var(--text-secondary)" }} />
                Paramètres des alertes
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
                  {t("warRoomSave")}
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {t("warRoomCancel")}
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
        @keyframes countdown-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
