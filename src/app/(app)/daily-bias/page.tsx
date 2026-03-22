"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save, ChevronLeft, ChevronRight, Crosshair, TrendingUp, TrendingDown,
  Minus, Plus, Trash2, CheckSquare, Square, Clock, Globe, MessageSquare,
  BarChart3, Upload, X, Share2, Calendar, Copy, Eye, Target, Award,
  ChevronDown, ChevronUp, ZoomIn, Lock, Crown, Check,
} from "lucide-react";
import { useTradingRules } from "@/hooks/useTradingRules";
import { useTranslation } from "@/i18n/context";
import { useNotificationSystem } from "@/hooks/useNotifications";

const GRADE_OPTIONS = ["A+", "A", "B", "C", "D", "F"];

const SESSIONS = [
  { name: "Asia", open: 0, close: 8, color: "bg-purple-500", activeColor: "text-purple-400", barColor: "#a855f7" },
  { name: "London", open: 8, close: 16, color: "bg-blue-500", activeColor: "text-blue-400", barColor: "#3b82f6" },
  { name: "New York", open: 13, close: 21, color: "bg-emerald-500", activeColor: "text-emerald-400", barColor: "#10b981" },
];


interface DailyPlan {
  id?: string;
  date: string;
  bias: string;
  notes: string;
  pairs: string;
  keyLevels: string;
  review: string;
  grade: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  bias: string | null;
  pairs: string | null;
  grade: string | null;
  notes: string | null;
  review: string | null;
  keyLevels: string | null;
}

interface PriceItem {
  symbol: string;
  price: number;
  change: number;
}

interface MarketData {
  forex: PriceItem[];
  indices: PriceItem[];
  commodities: PriceItem[];
}

interface VixData {
  vix: { current: number; changePct: number };
}

function isSessionActive(open: number, close: number, utcHour: number): boolean {
  if (open < close) return utcHour >= open && utcHour < close;
  return utcHour >= open || utcHour < close;
}

// ---- Helpers ----
function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const BIAS_OPTIONS_STATIC = [
  { value: "bullish", label: "Bullish", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dotColor: "#10b981" },
  { value: "bearish", label: "Bearish", icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", dotColor: "#f43f5e" },
  { value: "neutral", label: "Neutral", icon: Minus, color: "text-[--text-secondary]", bg: "bg-gray-500/15 border-gray-500/30", dotColor: "#64748b" },
];

function getBiasOption(bias: string | null) {
  return BIAS_OPTIONS_STATIC.find(b => b.value === bias) || null;
}

// ---- Market Snapshot Bar ----
function MarketSnapshot() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [vix, setVix] = useState<VixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [priceRes, vixRes] = await Promise.all([
          fetch("/api/live-prices").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/market-data/vix").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (priceRes) setMarket(priceRes);
        if (vixRes) setVix(vixRes);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="metric-card rounded-2xl p-4 animate-pulse">
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1">
              <div className="h-3 rounded w-16 mb-2" style={{ background: "var(--bg-secondary)" }} />
              <div className="h-5 rounded w-20" style={{ background: "var(--bg-secondary)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const eurusd = market?.forex?.find((p) => p.symbol === "EUR/USD");
  const sp500 = market?.indices?.find((p) => p.symbol === "S&P 500");
  const dxy = market?.indices?.find((p) => p.symbol === "DXY");
  const vixVal = vix?.vix;

  const items: { label: string; value: string; change: number | null }[] = [];
  if (eurusd) items.push({ label: "EUR/USD", value: eurusd.price.toFixed(4), change: eurusd.change });
  if (sp500) items.push({ label: "S&P 500", value: sp500.price.toLocaleString(), change: sp500.change });
  if (vixVal) items.push({ label: "VIX", value: vixVal.current.toFixed(2), change: vixVal.changePct });
  if (dxy) items.push({ label: "DXY", value: dxy.price.toFixed(2), change: dxy.change });

  if (items.length === 0) return null;

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Market Snapshot
        </h3>
      </div>
      <div className="flex flex-wrap gap-4 md:gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                {item.value}
              </span>
              {item.change !== null && (
                <span className={`text-xs font-medium ${item.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Session Windows Indicator ----
function SessionWindows() {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const totalMinutesInDay = 24 * 60;
  const currentMinutes = utcHour * 60 + utcMinute;
  const currentPositionPct = (currentMinutes / totalMinutesInDay) * 100;

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {t("tradingSessions")}
        </h3>
        <span className="ml-auto text-[10px] mono" style={{ color: "var(--text-muted)" }}>
          {now.toUTCString().slice(17, 25)} UTC
        </span>
      </div>

      <div className="flex gap-4 mb-3">
        {SESSIONS.map((s) => {
          const active = isSessionActive(s.open, s.close, utcHour);
          return (
            <div key={s.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${active ? s.color : "bg-gray-600"} ${active ? "animate-pulse" : ""}`} />
              <span className={`text-xs font-medium ${active ? s.activeColor : ""}`} style={!active ? { color: "var(--text-muted)" } : {}}>
                {s.name}
              </span>
              <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                {s.open}:00-{s.close}:00
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        {[0, 4, 8, 12, 16, 20].map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full border-l"
            style={{ left: `${(h / 24) * 100}%`, borderColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="absolute -top-0.5 left-0.5 text-[8px]" style={{ color: "var(--text-muted)" }}>
              {h}
            </span>
          </div>
        ))}

        {SESSIONS.map((s) => {
          const leftPct = (s.open / 24) * 100;
          const widthPct = ((s.close - s.open) / 24) * 100;
          const active = isSessionActive(s.open, s.close, utcHour);
          return (
            <div
              key={s.name}
              className="absolute top-1 h-4 rounded"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: active ? s.barColor : `${s.barColor}33`,
                opacity: active ? 0.7 : 0.25,
              }}
            />
          );
        })}

        <div
          className="absolute top-0 h-full w-0.5 bg-white z-10"
          style={{ left: `${currentPositionPct}%`, boxShadow: "0 0 4px rgba(255,255,255,0.5)" }}
        />
      </div>
    </div>
  );
}

// ---- Mini Calendar ----
function MiniCalendar({
  selectedDate,
  onSelectDate,
  historyMap,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  historyMap: Record<string, HistoryEntry>;
}) {
  const { t } = useTranslation();
  const DAYS_FR = [t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun")];
  const MONTHS_FR = [t("monthJan"), t("monthFeb"), t("monthMar"), t("monthApr"), t("monthMay"), t("monthJun"), t("monthJul"), t("monthAug"), t("monthSep"), t("monthOct"), t("monthNov"), t("monthDec")];

  const selectedD = new Date(selectedDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(selectedD.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedD.getMonth());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const todayStr = formatDateKey(new Date());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="glass rounded-2xl p-4" style={{ minWidth: 280 }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {MONTHS_FR[viewMonth]} {viewYear}
          </span>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 relative">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const entry = historyMap[dateStr];
          const biasOpt = entry ? getBiasOption(entry.bias) : null;

          return (
            <div
              key={dateStr}
              className="aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative"
              style={{
                background: isSelected
                  ? "rgba(14, 165, 233, 0.2)"
                  : isToday
                  ? "rgba(14, 165, 233, 0.08)"
                  : "transparent",
                border: isSelected
                  ? "1.5px solid rgba(14, 165, 233, 0.6)"
                  : isToday
                  ? "1px solid rgba(14, 165, 233, 0.3)"
                  : "1px solid transparent",
              }}
              onClick={() => onSelectDate(dateStr)}
              onMouseEnter={() => entry ? setHoveredDay(dateStr) : undefined}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <span
                className="text-xs font-medium"
                style={{
                  color: isSelected ? "#0ea5e9" : isToday ? "#0ea5e9" : "var(--text-primary)",
                }}
              >
                {day}
              </span>
              {biasOpt && (
                <div
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ background: biasOpt.dotColor }}
                />
              )}
              {isToday && !isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400" />
              )}

              {/* Tooltip on hover */}
              {hoveredDay === dateStr && entry && (
                <div
                  className="absolute z-50 p-3 rounded-xl shadow-xl"
                  style={{
                    background: "var(--bg-card-solid)",
                    border: "1px solid var(--border)",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    minWidth: 180,
                    pointerEvents: "none",
                  }}
                >
                  <div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    {new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  {entry.bias && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: biasOpt?.dotColor || "#64748b" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        {biasOpt?.label || entry.bias}
                      </span>
                    </div>
                  )}
                  {entry.pairs && (
                    <div className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                      {entry.pairs}
                    </div>
                  )}
                  {entry.grade && (
                    <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      Note: <span className="font-bold" style={{ color: "var(--text-primary)" }}>{entry.grade}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- History Section ----
function BiasHistory({
  history,
  onSelectDate,
  selectedDate,
}: {
  history: HistoryEntry[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}) {
  const [expanded, setExpanded] = useState(true);

  // Calculate accuracy stats (last 30 entries with a bias and a grade)
  const gradedEntries = history.filter(e => e.bias && e.grade);
  const correctCount = gradedEntries.filter(e => {
    const g = e.grade || "";
    return g === "A+" || g === "A" || g === "B";
  }).length;
  const accuracyPct = gradedEntries.length > 0 ? Math.round((correctCount / gradedEntries.length) * 100) : null;

  const last7 = history.slice(0, 7);

  return (
    <div className="glass rounded-2xl p-4">
      <button
        className="flex items-center justify-between w-full mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Historique récent
          </h3>
          {accuracyPct !== null && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: accuracyPct >= 70 ? "rgba(16,185,129,0.15)" : accuracyPct >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                color: accuracyPct >= 70 ? "#10b981" : accuracyPct >= 50 ? "#f59e0b" : "#ef4444",
              }}
            >
              {accuracyPct}% précision
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {last7.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
              Aucun bias enregistré récemment
            </p>
          ) : (
            last7.map((entry) => {
              const dateStr = entry.date.slice(0, 10);
              const biasOpt = getBiasOption(entry.bias);
              const BiasIcon = biasOpt?.icon || Minus;
              const isActive = dateStr === selectedDate;

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(14,165,233,0.1)" : "transparent",
                    border: isActive ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent",
                  }}
                  onClick={() => onSelectDate(dateStr)}
                >
                  {/* Bias icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: biasOpt ? `${biasOpt.dotColor}20` : "rgba(100,116,139,0.15)",
                    }}
                  >
                    <BiasIcon
                      className="w-4 h-4"
                      style={{ color: biasOpt?.dotColor || "#64748b" }}
                    />
                  </div>

                  {/* Date + pairs */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    {entry.pairs && (
                      <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                        {entry.pairs}
                      </div>
                    )}
                  </div>

                  {/* Grade */}
                  {entry.grade && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: entry.grade.startsWith("A") ? "rgba(16,185,129,0.15)"
                          : entry.grade === "B" ? "rgba(59,130,246,0.15)"
                          : entry.grade === "C" ? "rgba(245,158,11,0.15)"
                          : "rgba(239,68,68,0.15)",
                        color: entry.grade.startsWith("A") ? "#10b981"
                          : entry.grade === "B" ? "#3b82f6"
                          : entry.grade === "C" ? "#f59e0b"
                          : "#ef4444",
                      }}
                    >
                      {entry.grade}
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Accuracy stat bar */}
          {accuracyPct !== null && gradedEntries.length >= 3 && (
            <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Précision sur {gradedEntries.length} bias notés
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold mono"
                  style={{
                    color: accuracyPct >= 70 ? "#10b981" : accuracyPct >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {accuracyPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${accuracyPct}%`,
                    background: accuracyPct >= 70 ? "#10b981" : accuracyPct >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Lightbox ----
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="lightbox" onClick={onClose}>
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white z-50"
        style={{ background: "rgba(255,255,255,0.15)" }}
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---- Main Page ----
export default function DailyBiasPage() {
  const { t } = useTranslation();

  const BIAS_OPTIONS = [
    { value: "bullish", label: t("biasBullish"), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dotColor: "#10b981" },
    { value: "bearish", label: t("biasBearish"), icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", dotColor: "#f43f5e" },
    { value: "neutral", label: t("biasNeutral"), icon: Minus, color: "text-[--text-secondary]", bg: "bg-gray-500/15 border-gray-500/30", dotColor: "#64748b" },
  ];

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState<DailyPlan>({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addNotification } = useNotificationSystem();
  const { rules, addRule, deleteRule } = useTradingRules();
  const [checkedRules, setCheckedRules] = useState<Set<string>>(new Set());
  const [newRuleText, setNewRuleText] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);
  const [commentDuJour, setCommentDuJour] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isVip, setIsVip] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then(r => r.json())
      .then(d => setIsVip(d.role === "VIP" || d.role === "ADMIN"))
      .catch(() => setIsVip(false));
  }, []);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryEntry>>({});

  // Fetch history for calendar display
  const fetchHistory = useCallback(async () => {
    try {
      // Fetch 90 days of history for the calendar
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      const res = await fetch(`/api/daily-plan/history?from=${formatDateKey(from)}&to=${formatDateKey(to)}`);
      if (res.ok) {
        const data: HistoryEntry[] = await res.json();
        if (data) {
          setHistory(data);
          const map: Record<string, HistoryEntry> = {};
          data.forEach(e => { map[e.date.slice(0, 10)] = e; });
          setHistoryMap(map);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/daily-plan?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setPlan({ ...data, date });
          else setPlan({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
        }
      } catch { /* ignore */ }
    };
    load();
    setCheckedRules(new Set());
    setCommentDuJour("");
  }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, screenshots }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Refresh history after save
        fetchHistory();
        // Notification
        addNotification(
          "BIAS_REMINDER",
          "Daily bias sauvegarde",
          `Biais quotidien enregistre pour le ${date}`,
          "/daily-bias"
        );
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const toggleRule = (id: string) => {
    setCheckedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddRule = async () => {
    if (!newRuleText.trim()) return;
    await addRule(newRuleText.trim());
    setNewRuleText("");
    setShowAddRule(false);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setScreenshots((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const copyYesterdayBias = async () => {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = formatDateKey(yesterday);
    const entry = historyMap[yKey];
    if (entry) {
      setPlan(prev => ({
        ...prev,
        bias: entry.bias || prev.bias,
        pairs: entry.pairs || prev.pairs,
        keyLevels: entry.keyLevels || prev.keyLevels,
        notes: entry.notes || prev.notes,
      }));
    } else {
      // Try fetching from API
      try {
        const res = await fetch(`/api/daily-plan?date=${yKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setPlan(prev => ({
              ...prev,
              bias: data.bias || prev.bias,
              pairs: data.pairs || prev.pairs,
              keyLevels: data.keyLevels || prev.keyLevels,
              notes: data.notes || prev.notes,
            }));
          }
        }
      } catch { /* ignore */ }
    }
  };

  const shareToChat = async () => {
    if (!plan.bias && !plan.notes && !plan.keyLevels) return;
    setSharing(true);
    try {
      const roomsRes = await fetch("/api/chat/rooms");
      if (!roomsRes.ok) return;
      const rooms = await roomsRes.json();
      if (rooms.length === 0) return;
      const roomId = rooms[0].id;

      const biasLabel = BIAS_OPTIONS.find(b => b.value === plan.bias)?.label || plan.bias;
      const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      let content = `\u{1f4cb} Daily Bias \u2014 ${dateLabel}\n`;
      if (plan.bias) content += `Biais: ${biasLabel}\n`;
      if (plan.pairs) content += `Paires: ${plan.pairs}\n`;
      if (plan.keyLevels) content += `Niveaux: ${plan.keyLevels}\n`;
      if (plan.notes) content += `Notes: ${plan.notes}`;

      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content, imageUrl: screenshots[0] || null }),
      });

      for (let i = 1; i < screenshots.length; i++) {
        await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, content: `\u{1f4f8} Screenshot ${i + 1}/${screenshots.length}`, imageUrl: screenshots[i] }),
        });
      }

      alert("Bias partagé dans le chat !");
    } catch { /* ignore */ } finally {
      setSharing(false);
    }
  };

  const isToday = date === new Date().toISOString().slice(0, 10);
  const allChecked = rules.length > 0 && checkedRules.size === rules.length;

  const hasContent =
    plan.bias !== "" ||
    plan.notes.trim() !== "" ||
    plan.pairs.trim() !== "" ||
    plan.keyLevels.trim() !== "" ||
    plan.review.trim() !== "" ||
    plan.grade !== "" ||
    checkedRules.size > 0;

  const executionQuality = rules.length > 0 ? Math.round((checkedRules.size / rules.length) * 100) : null;

  // VIP loading state
  if (isVip === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // VIP gate
  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        {/* Blurred background preview */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2"><Crosshair className="w-6 h-6 text-cyan-400" /><span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Daily Bias</span></div>
            <div className="grid grid-cols-3 gap-3">
              {["Bullish","Bearish","Neutre"].map(b => (
                <div key={b} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: "60%" }} />
                  <div className="h-2 rounded" style={{ background: "var(--border)", width: "40%" }} />
                </div>
              ))}
            </div>
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-3 rounded" style={{ background: "var(--border)", width: `${50 + i * 12}%` }} />)}</div>
            </div>
          </div>
        </div>
        {/* VIP overlay */}
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Définissez votre biais quotidien et suivez votre discipline directionnelle
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Planifiez votre biais directionnel chaque jour",
              "Suivez vos règles de trading et votre discipline",
              "Historique complet et statistiques de vos biais",
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Crosshair className="w-6 h-6 text-cyan-400" />
            Daily Bias
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("dailyBiasSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <span
              className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 ${isToday ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : ""}`}
              style={!isToday ? { background: "var(--bg-card-solid)", color: "var(--text-secondary)", border: "1px solid var(--border)" } : {}}
            >
              {isToday && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400">
                  Aujourd&apos;hui
                </span>
              )}
              {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition"
              style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9", border: "1px solid rgba(14,165,233,0.3)" }}
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* Market Snapshot + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketSnapshot />
        <SessionWindows />
      </div>

      {/* Main 3-column layout: Calendar sidebar | Form | Review sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_1fr] lg:grid-cols-[280px_1fr] gap-6">

        {/* Left sidebar: Calendar + History */}
        <div className="space-y-4">
          <MiniCalendar
            selectedDate={date}
            onSelectDate={setDate}
            historyMap={historyMap}
          />
          <BiasHistory
            history={history}
            onSelectDate={setDate}
            selectedDate={date}
          />
        </div>

        {/* Center column: Main form */}
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: plan.bias ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: plan.bias ? "#10b981" : "var(--text-muted)" }}>1</span>
            Bias
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: plan.pairs ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: plan.pairs ? "#10b981" : "var(--text-muted)" }}>2</span>
            Setup
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: plan.notes ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: plan.notes ? "#10b981" : "var(--text-muted)" }}>3</span>
            Notes
          </div>

          {/* Bias directionnel - Hero card */}
          <div
            className="metric-card rounded-2xl p-6"
            style={{
              borderImage: plan.bias === "bullish"
                ? "linear-gradient(135deg, rgba(16,185,129,0.4), transparent) 1"
                : plan.bias === "bearish"
                ? "linear-gradient(135deg, rgba(244,63,94,0.4), transparent) 1"
                : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Crosshair className="w-4 h-4 text-cyan-400" />
                {t("directionalBias")}
              </h3>
              <button
                onClick={copyYesterdayBias}
                className="text-[10px] font-medium px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 hover:opacity-80"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
                title="Copier le bias d'hier"
              >
                <Copy className="w-3 h-3" />
                Copier hier
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BIAS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = plan.bias === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPlan({ ...plan, bias: opt.value })}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all font-medium ${
                      isActive ? opt.bg : ""
                    }`}
                    style={{
                      ...(!isActive ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}),
                      transform: isActive ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? opt.color : ""}`} />
                    <span className="text-sm">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paires */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Eye className="w-4 h-4 text-blue-400" />
              {t("pairsToWatch")}
            </h3>
            <input
              value={plan.pairs}
              onChange={(e) => setPlan({ ...plan, pairs: e.target.value })}
              placeholder="EUR/USD, GBP/USD, XAU/USD..."
              className="input-field"
            />
          </div>

          {/* Key levels */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart3 className="w-4 h-4 text-purple-400" />
              {t("keyLevelsLabel")}
            </h3>
            <textarea
              value={plan.keyLevels}
              onChange={(e) => setPlan({ ...plan, keyLevels: e.target.value })}
              placeholder={"Support: 1.0850\nRésistance: 1.0920\nPOI: 1.0880..."}
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Notes pre-market */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <MessageSquare className="w-4 h-4 text-amber-400" />
              {t("preMarketNotes")}
            </h3>
            <textarea
              value={plan.notes}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              placeholder="Contexte macro, catalyseurs, plan d'action..."
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Screenshots - improved gallery */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Screenshots</h3>
              {screenshots.length > 0 && (
                <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  {screenshots.length} image{screenshots.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div
              className="rounded-xl p-4 text-center cursor-pointer transition hover:opacity-80"
              style={{ border: "2px dashed var(--border)", background: "var(--bg-secondary)" }}
              onClick={() => document.getElementById("biasScreenshotInput")?.click()}
            >
              <input type="file" id="biasScreenshotInput" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cliquez pour ajouter des captures</p>
            </div>
            {screenshots.length > 0 && (
              <div className="screenshot-gallery mt-3">
                {screenshots.map((src, i) => (
                  <div
                    key={i}
                    className="screenshot-thumb"
                    style={{ border: "2px solid var(--border)" }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxSrc(src)}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                    >
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-rose-600 z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Checklist + Review + Grade + Actions */}
        <div className="space-y-4">
          {/* Step indicator for right column */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: allChecked ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: allChecked ? "#10b981" : "var(--text-muted)" }}>4</span>
            Checklist
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: plan.review ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: plan.review ? "#10b981" : "var(--text-muted)" }}>5</span>
            Review
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: plan.grade ? "rgba(16,185,129,0.2)" : "var(--bg-secondary)", color: plan.grade ? "#10b981" : "var(--text-muted)" }}>6</span>
            Note
          </div>

          {/* Checklist pre-trade */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                {t("checklistPreTrade")}
                {rules.length > 0 && (
                  <span className="ml-1 text-xs" style={{ color: allChecked ? "#10b981" : "var(--text-muted)" }}>
                    {checkedRules.size}/{rules.length}
                  </span>
                )}
              </h3>
              <button onClick={() => setShowAddRule(!showAddRule)} className="p-1.5 rounded-lg transition hover:bg-blue-500/10" style={{ color: "var(--text-muted)" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            {rules.length > 0 && (
              <div className="mb-3">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(checkedRules.size / rules.length) * 100}%`,
                      background: allChecked
                        ? "linear-gradient(90deg, #10b981, #059669)"
                        : checkedRules.size > 0
                        ? "linear-gradient(90deg, #0ea5e9, #0284c7)"
                        : "var(--bg-secondary)",
                    }}
                  />
                </div>
              </div>
            )}

            {showAddRule && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  className="input-field flex-1 text-sm"
                  placeholder="Nouvelle règle de trading..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
                />
                <button onClick={handleAddRule} className="btn-primary text-white px-3 py-1 rounded-lg text-sm">OK</button>
              </div>
            )}

            {rules.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("addRulesChecklist")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition group"
                    style={{
                      background: checkedRules.has(rule.id) ? "rgba(16,185,129,0.06)" : "transparent",
                    }}
                  >
                    <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0">
                      {checkedRules.has(rule.id) ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                    <span
                      className={`text-sm flex-1 transition-all ${checkedRules.has(rule.id) ? "line-through opacity-50" : ""}`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {rule.text}
                    </span>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {executionQuality !== null && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("executionQuality")}</span>
                  </div>
                  <span className={`text-xs font-bold mono ${executionQuality === 100 ? "text-emerald-400" : executionQuality >= 70 ? "text-amber-400" : "text-rose-400"}`}>
                    {executionQuality}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${executionQuality === 100 ? "bg-emerald-500" : executionQuality >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${executionQuality}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Review post-session */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Eye className="w-4 h-4 text-cyan-400" />
              {t("reviewPostSession")}
            </h3>
            <textarea
              value={plan.review}
              onChange={(e) => setPlan({ ...plan, review: e.target.value })}
              placeholder={t("reviewPlaceholder")}
              rows={5}
              className="input-field resize-none"
            />
          </div>

          {/* Comment du jour */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("commentOfTheDay")}</h3>
            </div>
            <textarea
              value={commentDuJour}
              onChange={(e) => setCommentDuJour(e.target.value)}
              placeholder="Journal de fin de journée : émotions, leçons, observations personnelles..."
              rows={3}
              className="input-field resize-none"
            />
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
              Note personnelle (non sauvegardée en base)
            </p>
          </div>

          {/* Grade */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Award className="w-4 h-4 text-amber-400" />
              {t("dayGrade")}
            </h3>
            <div className="flex gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setPlan({ ...plan, grade: g })}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                    plan.grade === g
                      ? g.startsWith("A") ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : g === "B" ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : g === "C" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : ""
                  }`}
                  style={{
                    ...( plan.grade !== g ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}),
                    transform: plan.grade === g ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Save + Share buttons */}
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !hasContent}
              className="flex-1 btn-primary py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{
                boxShadow: saved ? "0 0 20px rgba(16,185,129,0.4)" : undefined,
                background: saved ? "linear-gradient(135deg, #10b981, #059669)" : undefined,
              }}
            >
              <Save className="w-5 h-5" />
              {saved ? t("savedLabel") : saving ? t("savingLabel") : !hasContent ? t("addContent") : allChecked || rules.length === 0 ? t("saveBtn") : `${t("saveBtn")} (checklist ${checkedRules.size}/${rules.length})`}
            </button>
            <button
              onClick={shareToChat}
              disabled={sharing || !hasContent}
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Partager dans le chat"
            >
              <Share2 className="w-5 h-5" />
              {sharing ? "..." : "Chat"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
