"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Activity, TrendingUp, TrendingDown, Clock, Shield, Target,
  AlertTriangle, CheckSquare, Square, Smile, Meh,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Bell, Timer,
  Globe, Moon, Crosshair, Settings, X,
  ChevronDown, ChevronUp, Newspaper, Tv, Map, Layers,
  ExternalLink, RefreshCw, Radio,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";

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

  const tokyoStart = 0;
  const tokyoEnd = 9;
  const londonStart = euDst ? 7 : 8;
  const londonEnd = euDst ? 16 : 17;
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

function getSessionTimeRemaining(hour: number, minute: number, session: SessionInfo, finishedLabel = "Terminée"): string {
  const endMinutes = session.end * 60;
  const currentMinutes = hour * 60 + minute;
  const remaining = endMinutes - currentMinutes;
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

// ─── Market Centers for Geographic Map ──────────────────────────────────────

interface MarketCenter {
  name: string;
  city: string;
  x: number; // SVG x coordinate (0-800)
  y: number; // SVG y coordinate (0-400)
  utcOffset: number; // standard offset
  dstOffset?: number; // offset during DST
  openHour: number; // local open hour
  closeHour: number; // local close hour
  preMarketStart?: number;
  postMarketEnd?: number;
  useDst?: "us" | "eu" | "au" | false;
}

const MARKET_CENTERS: MarketCenter[] = [
  { name: "NYSE", city: "New York", x: 230, y: 165, utcOffset: -5, dstOffset: -4, openHour: 9.5, closeHour: 16, preMarketStart: 4, postMarketEnd: 20, useDst: "us" },
  { name: "LSE", city: "London", x: 390, y: 135, utcOffset: 0, dstOffset: 1, openHour: 8, closeHour: 16.5, preMarketStart: 5.5, postMarketEnd: 17.5, useDst: "eu" },
  { name: "XETRA", city: "Frankfurt", x: 410, y: 140, utcOffset: 1, dstOffset: 2, openHour: 9, closeHour: 17.5, preMarketStart: 8, postMarketEnd: 20, useDst: "eu" },
  { name: "TSE", city: "Tokyo", x: 660, y: 160, utcOffset: 9, openHour: 9, closeHour: 15, useDst: false },
  { name: "ASX", city: "Sydney", x: 700, y: 310, utcOffset: 10, dstOffset: 11, openHour: 10, closeHour: 16, useDst: "au" },
  { name: "HKEX", city: "Hong Kong", x: 630, y: 195, utcOffset: 8, openHour: 9.5, closeHour: 16, useDst: false },
  { name: "SSE", city: "Shanghai", x: 635, y: 175, utcOffset: 8, openHour: 9.5, closeHour: 15, useDst: false },
];

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

function getMarketStatus(center: MarketCenter, now: Date): { status: "open" | "closed" | "pre_post"; localTime: string } {
  let offset = center.utcOffset;
  if (center.useDst === "us" && isUsDst(now) && center.dstOffset !== undefined) offset = center.dstOffset;
  if (center.useDst === "eu" && isEuDst(now) && center.dstOffset !== undefined) offset = center.dstOffset;
  if (center.useDst === "au" && isAuDst(now) && center.dstOffset !== undefined) offset = center.dstOffset;

  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  let localHour = (utcHours + offset) % 24;
  if (localHour < 0) localHour += 24;

  const localDay = new Date(now.getTime() + offset * 3600000).getUTCDay();
  const isWeekend = localDay === 0 || localDay === 6;

  // Format local time
  const localH = Math.floor(localHour);
  const localM = Math.floor((localHour - localH) * 60);
  const localTime = `${localH.toString().padStart(2, "0")}:${localM.toString().padStart(2, "0")}`;

  if (isWeekend) return { status: "closed", localTime };

  if (localHour >= center.openHour && localHour < center.closeHour) {
    return { status: "open", localTime };
  }

  if (center.preMarketStart !== undefined && center.postMarketEnd !== undefined) {
    if ((localHour >= center.preMarketStart && localHour < center.openHour) ||
        (localHour >= center.closeHour && localHour < center.postMarketEnd)) {
      return { status: "pre_post", localTime };
    }
  }

  return { status: "closed", localTime };
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

// ─── Geographic Market Map SVG ──────────────────────────────────────────────

function GeographicMarketMap({ now }: { now: Date }) {
  const markets = useMemo(() => {
    return MARKET_CENTERS.map((center) => ({
      ...center,
      ...getMarketStatus(center, now),
    }));
  }, [now]);

  const statusColor = (status: "open" | "closed" | "pre_post") => {
    if (status === "open") return "#22c55e";
    if (status === "pre_post") return "#f59e0b";
    return "#ef4444";
  };

  const statusLabel = (status: "open" | "closed" | "pre_post") => {
    if (status === "open") return "Ouvert";
    if (status === "pre_post") return "Pre/Post";
    return "Fermé";
  };

  return (
    <div>
      <svg viewBox="0 0 800 400" className="w-full" style={{ maxHeight: "280px" }}>
        {/* Simplified world map paths */}
        <defs>
          <radialGradient id="glowGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowYellow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Continents simplified outlines */}
        {/* North America */}
        <path d="M120,80 L280,70 L300,100 L290,140 L270,170 L250,200 L220,210 L200,250 L170,230 L160,200 L130,180 L100,140 L90,110 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />
        {/* South America */}
        <path d="M220,250 L260,250 L280,280 L290,320 L270,360 L240,370 L220,350 L210,310 L200,280 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />
        {/* Europe */}
        <path d="M360,80 L430,70 L450,90 L440,120 L420,150 L400,160 L380,150 L370,130 L360,100 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />
        {/* Africa */}
        <path d="M370,170 L430,170 L450,200 L460,250 L440,300 L410,330 L380,310 L360,270 L355,220 L360,190 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />
        {/* Asia */}
        <path d="M450,70 L550,60 L650,80 L700,100 L700,140 L680,170 L650,190 L600,200 L550,190 L500,170 L470,150 L450,120 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />
        {/* Australia */}
        <path d="M640,280 L720,270 L740,290 L730,330 L700,340 L660,330 L640,310 Z"
          fill="var(--border)" opacity="0.3" stroke="var(--text-muted)" strokeWidth="0.5" />

        {/* Connection lines between markets */}
        {markets.map((m, i) => {
          const next = markets[(i + 1) % markets.length];
          return (
            <line key={`line-${i}`}
              x1={m.x} y1={m.y} x2={next.x} y2={next.y}
              stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.4"
            />
          );
        })}

        {/* Market center dots and labels */}
        {markets.map((m) => {
          const color = statusColor(m.status);
          const glowId = m.status === "open" ? "glowGreen" : m.status === "pre_post" ? "glowYellow" : "glowRed";
          return (
            <g key={m.name}>
              {/* Glow effect */}
              <circle cx={m.x} cy={m.y} r="20" fill={`url(#${glowId})`} />
              {/* Pulsing ring for open markets */}
              {m.status === "open" && (
                <circle cx={m.x} cy={m.y} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Main dot */}
              <circle cx={m.x} cy={m.y} r="6" fill={color} stroke="var(--bg-primary)" strokeWidth="2" />
              {/* City label */}
              <text x={m.x} y={m.y - 14} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="600">
                {m.city}
              </text>
              {/* Exchange + time label */}
              <text x={m.x} y={m.y + 20} textAnchor="middle" fill={color} fontSize="8" fontWeight="500">
                {m.name} {m.localTime}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 365)">
          <circle cx="0" cy="0" r="4" fill="#22c55e" />
          <text x="8" y="3" fill="var(--text-muted)" fontSize="8">Ouvert</text>
          <circle cx="55" cy="0" r="4" fill="#f59e0b" />
          <text x="63" y="3" fill="var(--text-muted)" fontSize="8">Pre/Post</text>
          <circle cx="120" cy="0" r="4" fill="#ef4444" />
          <text x="128" y="3" fill="var(--text-muted)" fontSize="8">Fermé</text>
        </g>
      </svg>

      {/* Compact market status grid below map */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5 mt-2">
        {markets.map((m) => (
          <div key={m.name} className="text-center p-1.5 rounded-lg" style={{
            background: `${statusColor(m.status)}10`,
            border: `1px solid ${statusColor(m.status)}25`,
          }}>
            <div className="text-[10px] font-bold" style={{ color: statusColor(m.status) }}>{m.name}</div>
            <div className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>{m.localTime}</div>
            <div className="text-[8px]" style={{ color: statusColor(m.status) }}>{statusLabel(m.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Enhanced Session Timeline ──────────────────────────────────────────────

function EnhancedSessionTimeline({
  sessions, hour, minute, currentTime, sessionPerformance,
}: {
  sessions: SessionInfo[];
  hour: number;
  minute: number;
  currentTime: Date;
  sessionPerformance: Record<string, { pnl: number; trades: number; wins: number }>;
}) {
  const timePosition = ((hour * 60 + minute) / (24 * 60)) * 100;

  // Find overlap zones
  const overlaps: { start: number; end: number; sessions: string[] }[] = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const overlapStart = Math.max(sessions[i].start, sessions[j].start);
      const overlapEnd = Math.min(sessions[i].end, sessions[j].end);
      if (overlapStart < overlapEnd) {
        overlaps.push({
          start: overlapStart,
          end: overlapEnd,
          sessions: [sessions[i].name, sessions[j].name],
        });
      }
    }
  }

  return (
    <div>
      <div className="relative" style={{ height: "120px" }}>
        {/* Hour markers */}
        <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] mono" style={{ color: "var(--text-muted)" }}>
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <span key={h}>{h.toString().padStart(2, "0")}h</span>
          ))}
        </div>

        {/* Overlap zones (highlighted) */}
        {overlaps.map((overlap, idx) => {
          const left = (overlap.start / 24) * 100;
          const width = ((overlap.end - overlap.start) / 24) * 100;
          return (
            <div key={`overlap-${idx}`}
              className="absolute rounded"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: "14px",
                height: "68px",
                background: "linear-gradient(180deg, #8b5cf620, #8b5cf608)",
                border: "1px dashed #8b5cf640",
                zIndex: 1,
              }}
            >
              <span className="absolute -top-0.5 left-1 text-[7px] font-medium" style={{ color: "#8b5cf6" }}>
                OVERLAP
              </span>
            </div>
          );
        })}

        {/* Session bars */}
        {sessions.map((session, idx) => {
          const left = (session.start / 24) * 100;
          const width = ((session.end - session.start) / 24) * 100;
          const perf = sessionPerformance[session.name];
          return (
            <div
              key={session.name}
              className="absolute rounded-md flex items-center justify-between px-2 text-[10px] font-medium"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${18 + idx * 22}px`,
                height: "18px",
                background: `${session.color}25`,
                border: `1px solid ${session.color}50`,
                color: session.color,
                zIndex: 2,
              }}
            >
              <span>{session.emoji} {session.name}</span>
              {perf && perf.trades > 0 && (
                <span className="mono text-[8px]" style={{ color: perf.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                  {formatPnl(perf.pnl)}$
                </span>
              )}
            </div>
          );
        })}

        {/* Current time marker */}
        <div
          className="absolute top-3 bottom-0 w-0.5"
          style={{
            left: `${timePosition}%`,
            background: "#ef4444",
            zIndex: 10,
          }}
        >
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <div className="absolute -bottom-3 -left-2.5 text-[8px] mono font-bold" style={{ color: "#ef4444" }}>
            {hour.toString().padStart(2, "0")}:{minute.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Session P&L summary below timeline */}
      <div className="flex gap-3 mt-4">
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
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
    const interval = setInterval(fetchPrices, 5 * 60 * 1000); // 5 minutes
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
    { emoji: "\ud83d\ude24", label: "Frustré" },
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
          <div className="flex items-center gap-2 mono text-sm" style={{ color: "var(--text-muted)" }}>
            <Clock size={14} />
            {currentTime.toLocaleTimeString("fr-FR")}
          </div>
        </div>
      </div>

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

        {/* ═══ 7. Daily Rules Checklist ═══ */}
        <div className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Checklist du jour</span>
          </div>
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

      {/* ═══ ENHANCED SESSION TIMELINE ═══ */}
      <CollapsibleSection title={`Timeline Sessions (UTC)${(isUsDst(currentTime) || isEuDst(currentTime)) ? " - DST actif" : ""}`}
        icon={Globe} sectionKey="session-timeline">
        <EnhancedSessionTimeline
          sessions={sessions}
          hour={hour}
          minute={minute}
          currentTime={currentTime}
          sessionPerformance={sessionPerformance}
        />
      </CollapsibleSection>

      {/* ═══ GEOGRAPHIC MARKET MAP ═══ */}
      <CollapsibleSection title="Carte des Marchés Mondiaux" icon={Map} sectionKey="market-map">
        <GeographicMarketMap now={currentTime} />
      </CollapsibleSection>

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
                    {activeStreamEmbed === stream.embedId ? "En cours" : "Cliquer pour regarder"}
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
