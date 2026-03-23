"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useStrategies, Strategy } from "@/hooks/useStrategies";
import {
  BookMarked,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Flame,
  Award,
  Columns3,
  Shield,
  ImagePlus,
  Clock,
  FileText,
  Percent,
  Scale,
  Eye,
  EyeOff,
  Star,
  AlertTriangle,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  Image,
  Trophy,
  Check,
  Square,
  CheckSquare,
  PlusCircle,
  GitCompare,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

function loadText(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || "";
}

function saveText(key: string, text: string) {
  localStorage.setItem(key, text);
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

interface StrategyStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  expectancy: number;
  profitFactor: number;
  last10: number[];
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  maxWinStreak: number;
  maxLossStreak: number;
}

function computeStats(trades: Trade[]): StrategyStats {
  const total = trades.length;
  const wins = trades.filter((t) => t.result > 0).length;
  const losses = trades.filter((t) => t.result < 0).length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const totalPnl = trades.reduce((s, t) => s + t.result, 0);
  const avgPnl = total > 0 ? totalPnl / total : 0;

  const avgWin =
    wins > 0
      ? trades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0) / wins
      : 0;
  const avgLoss =
    losses > 0
      ? Math.abs(
          trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0) / losses
        )
      : 0;

  const expectancy =
    total > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;

  const grossProfit = trades
    .filter((t) => t.result > 0)
    .reduce((s, t) => s + t.result, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const bestTrade = total > 0 ? Math.max(...trades.map((t) => t.result)) : 0;
  const worstTrade = total > 0 ? Math.min(...trades.map((t) => t.result)) : 0;

  // Streaks
  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let currentStreak: { type: "win" | "loss" | "none"; count: number } = { type: "none", count: 0 };
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  if (sorted.length > 0) {
    const firstType = sorted[0].result >= 0 ? "win" : "loss";
    let count = 0;
    for (const t of sorted) {
      const tType = t.result >= 0 ? "win" : "loss";
      if (tType === firstType) count++;
      else break;
    }
    currentStreak = { type: firstType, count };

    let ws = 0;
    let ls = 0;
    for (const t of sorted) {
      if (t.result >= 0) {
        ws++;
        ls = 0;
      } else {
        ls++;
        ws = 0;
      }
      maxWinStreak = Math.max(maxWinStreak, ws);
      maxLossStreak = Math.max(maxLossStreak, ls);
    }
  }

  const last10 = sorted.slice(0, 10).reverse().map((t) => t.result);

  return {
    total, wins, losses, winRate, avgPnl, totalPnl, expectancy, profitFactor,
    last10, avgRR, bestTrade, worstTrade, currentStreak, maxWinStreak, maxLossStreak,
  };
}

// ---------------------------------------------------------------------------
// SVG Donut Chart
// ---------------------------------------------------------------------------

function DonutChart({ winRate, size = 80 }: { winRate: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const winArc = (winRate / 100) * circumference;
  const lossArc = circumference - winArc;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#ef4444"
        strokeWidth={8}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={0}
        opacity={0.3}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth={8}
        strokeDasharray={`${winArc} ${lossArc}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={winRate >= 50 ? "#10b981" : "#ef4444"}
        fontSize={size * 0.2}
        fontWeight="bold"
      >
        {winRate.toFixed(0)}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Mini Sparkline (SVG)
// ---------------------------------------------------------------------------

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const pad = 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const lastVal = values[values.length - 1];
  const color = lastVal >= 0 ? "#10b981" : "#ef4444";

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {(() => {
        const lastPt = points[points.length - 1].split(",");
        return (
          <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill={color} />
        );
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Mini bar chart component
// ---------------------------------------------------------------------------

function MiniChart({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values.map(Math.abs), 0.01);

  return (
    <div className="flex items-end gap-[3px] h-10">
      {values.map((v, i) => {
        const height = Math.max((Math.abs(v) / max) * 100, 8);
        return (
          <div
            key={i}
            className="rounded-sm w-2"
            style={{
              height: `${height}%`,
              backgroundColor: v >= 0 ? "#10b981" : "#ef4444",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable list component
// ---------------------------------------------------------------------------

function EditableList({
  storageKey,
  label,
  icon,
}: {
  storageKey: string;
  label: string;
  icon: React.ReactNode;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setItems(loadList(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setItems(next);
      saveList(storageKey, next);
    },
    [storageKey]
  );

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    persist([...items, trimmed]);
    setNewItem("");
  };

  const remove = (idx: number) => {
    persist(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {icon}
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-2 group text-sm rounded-lg px-3 py-1.5"
            style={{ backgroundColor: "var(--bg-hover)" }}
          >
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
            <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
              {item}
            </span>
            <button
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              <XCircle size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="input-field flex-1 text-sm"
          placeholder="Nouvelle condition..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors text-cyan-400 hover:bg-cyan-400/10"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes component
// ---------------------------------------------------------------------------

function NotesArea({ storageKey, label = "Notes", icon }: { storageKey: string; label?: string; icon?: React.ReactNode }) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(loadText(storageKey));
  }, [storageKey]);

  const handleChange = (val: string) => {
    setText(val);
    saveText(storageKey, val);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {icon || <BookMarked size={14} />}
        {label}
      </div>
      <textarea
        className="input-field w-full text-sm min-h-[80px] resize-y"
        placeholder="Notes sur cette strategie..."
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screenshots Gallery Component
// ---------------------------------------------------------------------------

function ScreenshotsGallery({ strategyName, trades }: { strategyName: string; trades: Trade[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Get winning trades with screenshots for this strategy
  const screenshotTrades = useMemo(() => {
    return trades
      .filter(
        (t) =>
          t.strategy === strategyName &&
          t.result > 0 &&
          t.screenshots &&
          t.screenshots.length > 0
      )
      .sort((a, b) => b.result - a.result);
  }, [trades, strategyName]);

  const allScreenshots = useMemo(() => {
    const list: { url: string; tradeId: string; result: number; asset: string; date: string }[] = [];
    for (const t of screenshotTrades) {
      for (const s of t.screenshots) {
        list.push({ url: s.url, tradeId: t.id, result: t.result, asset: t.asset, date: t.date });
      }
    }
    return list;
  }, [screenshotTrades]);

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxUrl(allScreenshots[idx]?.url || null);
  };

  const navLightbox = (dir: -1 | 1) => {
    const next = lightboxIdx + dir;
    if (next >= 0 && next < allScreenshots.length) {
      setLightboxIdx(next);
      setLightboxUrl(allScreenshots[next].url);
    }
  };

  if (allScreenshots.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          <Image size={14} className="text-cyan-400" />
          Captures des trades gagnants
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--bg-hover)" }}
        >
          <Image size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Aucune capture pour les trades gagnants de cette strategie
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        <Image size={14} className="text-cyan-400" />
        Captures des trades gagnants
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981" }}
        >
          {allScreenshots.length}
        </span>
      </div>

      {/* Horizontal scrollable row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {allScreenshots.map((shot, idx) => (
          <button
            key={`${shot.tradeId}-${idx}`}
            onClick={() => openLightbox(idx)}
            className="shrink-0 group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.03]"
            style={{
              width: 140,
              height: 90,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-hover)",
            }}
          >
            <img
              src={shot.url}
              alt={`${shot.asset} trade`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay with trade info */}
            <div
              className="absolute inset-0 flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.75))" }}
            >
              <span className="text-[10px] text-white font-medium">{shot.asset}</span>
              <span className="text-[10px] font-bold" style={{ color: "#10b981" }}>
                +{shot.result.toFixed(2)}
              </span>
            </div>
            {/* Expand icon */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye size={12} className="text-white drop-shadow" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={24} />
          </button>

          {/* Nav buttons */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); navLightbox(-1); }}
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {lightboxIdx < allScreenshots.length - 1 && (
            <button
              className="absolute right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); navLightbox(1); }}
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
            <img
              src={lightboxUrl}
              alt="Trade screenshot"
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
            {/* Info bar */}
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-white/70">
              <span>{allScreenshots[lightboxIdx]?.asset}</span>
              <span>{allScreenshots[lightboxIdx]?.date}</span>
              <span style={{ color: "#10b981", fontWeight: 700 }}>
                +{allScreenshots[lightboxIdx]?.result.toFixed(2)}
              </span>
              <span className="text-xs">
                {lightboxIdx + 1} / {allScreenshots.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup Checklist Component (with actual checkboxes, stored in localStorage)
// ---------------------------------------------------------------------------

interface ChecklistItem {
  text: string;
  checked: boolean;
}

function SetupChecklist({ strategyId }: { strategyId: string }) {
  const storageKey = `playbook-checklist-${strategyId}`;
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setItems(loadJSON<ChecklistItem[]>(storageKey, []));
  }, [storageKey]);

  const persist = useCallback(
    (next: ChecklistItem[]) => {
      setItems(next);
      saveJSON(storageKey, next);
    },
    [storageKey]
  );

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    persist([...items, { text: trimmed, checked: false }]);
    setNewItem("");
  };

  const toggleItem = (idx: number) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    );
    persist(next);
  };

  const removeItem = (idx: number) => {
    persist(items.filter((_, i) => i !== idx));
  };

  const resetAll = () => {
    persist(items.map((item) => ({ ...item, checked: false })));
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium w-full"
        style={{ color: "var(--text-primary)" }}
      >
        <Check size={14} className="text-cyan-400" />
        <span>Conditions d&apos;entree</span>
        {items.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full ml-1"
            style={{
              backgroundColor: checkedCount === items.length && items.length > 0
                ? "rgba(16,185,129,0.12)"
                : "var(--bg-hover)",
              color: checkedCount === items.length && items.length > 0
                ? "#10b981"
                : "var(--text-muted)",
            }}
          >
            {checkedCount}/{items.length}
          </span>
        )}
        <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 pl-1">
          {/* Progress bar */}
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%`,
                    backgroundColor: checkedCount === items.length ? "#10b981" : "#06b6d4",
                  }}
                />
              </div>
              {checkedCount > 0 && (
                <button
                  onClick={resetAll}
                  className="text-[10px] px-2 py-0.5 rounded-lg transition-colors hover:bg-red-400/10"
                  style={{ color: "var(--text-muted)" }}
                >
                  Reinitialiser
                </button>
              )}
            </div>
          )}

          {/* Checklist items */}
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 group text-sm rounded-lg px-3 py-2 cursor-pointer transition-colors"
                style={{
                  backgroundColor: item.checked ? "rgba(16,185,129,0.06)" : "var(--bg-hover)",
                  border: item.checked ? "1px solid rgba(16,185,129,0.15)" : "1px solid transparent",
                }}
                onClick={() => toggleItem(i)}
              >
                {item.checked ? (
                  <CheckSquare size={16} className="text-green-400 shrink-0" />
                ) : (
                  <Square size={16} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                )}
                <span
                  className="flex-1"
                  style={{
                    color: item.checked ? "var(--text-muted)" : "var(--text-secondary)",
                    textDecoration: item.checked ? "line-through" : "none",
                  }}
                >
                  {item.text}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  <XCircle size={14} />
                </button>
              </li>
            ))}
          </ul>

          {/* Add new item */}
          <div className="flex gap-2">
            <input
              className="input-field flex-1 text-sm"
              placeholder="Ajouter une condition..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors text-cyan-400 hover:bg-cyan-400/10"
            >
              <PlusCircle size={14} />
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playbook Entry Form
// ---------------------------------------------------------------------------

interface PlaybookEntry {
  strategyName: string;
  description: string;
  timeframe: string;
  setupRules: string;
  exitTpMethod: string;
  exitSlMethod: string;
  maxRiskPercent: string;
  preferredLotSize: string;
  screenshotNote: string;
}

const emptyEntry: PlaybookEntry = {
  strategyName: "",
  description: "",
  timeframe: "",
  setupRules: "",
  exitTpMethod: "",
  exitSlMethod: "",
  maxRiskPercent: "",
  preferredLotSize: "",
  screenshotNote: "",
};

function PlaybookEntryForm({ onSave }: { onSave: (entry: PlaybookEntry) => void }) {
  const [entry, setEntry] = useState<PlaybookEntry>(emptyEntry);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriteria, setNewCriteria] = useState("");

  const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN"];

  const update = (field: keyof PlaybookEntry, value: string) => {
    setEntry((prev) => ({ ...prev, [field]: value }));
  };

  const addCriteria = () => {
    const trimmed = newCriteria.trim();
    if (!trimmed) return;
    setCriteria((prev) => [...prev, trimmed]);
    setNewCriteria("");
  };

  const removeCriteria = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!entry.strategyName.trim()) return;
    const key = `playbook-form-${entry.strategyName.replace(/\s+/g, "_")}`;
    saveJSON(key, { ...entry, entryCriteria: criteria });
    onSave(entry);
    setEntry(emptyEntry);
    setCriteria([]);
  };

  return (
    <div className="metric-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-cyan-400" />
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Nouvelle fiche playbook
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Nom de la strategie
          </label>
          <input
            className="input-field w-full text-sm"
            placeholder="Ex: Break & Retest H1"
            value={entry.strategyName}
            onChange={(e) => update("strategyName", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Clock size={12} />
            Timeframe
          </label>
          <div className="flex flex-wrap gap-1.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => update("timeframe", tf)}
                className="px-2.5 py-1 text-xs rounded-lg transition-colors"
                style={{
                  backgroundColor: entry.timeframe === tf ? "rgba(6,182,212,0.2)" : "var(--bg-hover)",
                  color: entry.timeframe === tf ? "#06b6d4" : "var(--text-muted)",
                  border: entry.timeframe === tf ? "1px solid rgba(6,182,212,0.4)" : "1px solid transparent",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Description du setup
        </label>
        <textarea
          className="input-field w-full text-sm min-h-[60px] resize-y"
          placeholder="Decrivez le contexte et les conditions du setup..."
          value={entry.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Regles du setup
        </label>
        <textarea
          className="input-field w-full text-sm min-h-[60px] resize-y"
          placeholder="Quelles sont les regles strictes pour valider ce setup?"
          value={entry.setupRules}
          onChange={(e) => update("setupRules", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <CheckCircle2 size={12} className="text-cyan-400" />
          Checklist d&apos;entree
        </label>
        <ul className="space-y-1">
          {criteria.map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 group text-sm rounded-lg px-3 py-1.5"
              style={{ backgroundColor: "var(--bg-hover)" }}
            >
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span className="flex-1" style={{ color: "var(--text-secondary)" }}>{c}</span>
              <button
                onClick={() => removeCriteria(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                <XCircle size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm"
            placeholder="Ex: Confirmation bougie H1..."
            value={newCriteria}
            onChange={(e) => setNewCriteria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriteria()}
          />
          <button
            onClick={addCriteria}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors text-cyan-400 hover:bg-cyan-400/10"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <TrendingUp size={12} className="text-green-400" />
            Methode Take Profit
          </label>
          <textarea
            className="input-field w-full text-sm min-h-[50px] resize-y"
            placeholder="Ex: TP sur structure, ratio 1:2..."
            value={entry.exitTpMethod}
            onChange={(e) => update("exitTpMethod", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <TrendingDown size={12} className="text-red-400" />
            Methode Stop Loss
          </label>
          <textarea
            className="input-field w-full text-sm min-h-[50px] resize-y"
            placeholder="Ex: SL sous le dernier creux..."
            value={entry.exitSlMethod}
            onChange={(e) => update("exitSlMethod", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Percent size={12} />
            Risque max par trade (%)
          </label>
          <input
            className="input-field w-full text-sm"
            placeholder="Ex: 1.5"
            type="number"
            step="0.1"
            min="0"
            value={entry.maxRiskPercent}
            onChange={(e) => update("maxRiskPercent", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Scale size={12} />
            Taille de lot preferee
          </label>
          <input
            className="input-field w-full text-sm"
            placeholder="Ex: 0.10"
            type="number"
            step="0.01"
            min="0"
            value={entry.preferredLotSize}
            onChange={(e) => update("preferredLotSize", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <ImagePlus size={12} />
          Capture d&apos;ecran du setup ideal
        </label>
        <div
          className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:border-cyan-400/40"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-hover)" }}
        >
          <ImagePlus size={28} className="mx-auto mb-2 text-cyan-400 opacity-50" />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Glissez une image ou cliquez pour uploader
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            (Fonctionnalite bientot disponible)
          </p>
        </div>
        <input
          className="input-field w-full text-sm mt-2"
          placeholder="Note sur le screenshot..."
          value={entry.screenshotNote}
          onChange={(e) => update("screenshotNote", e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!entry.strategyName.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
          style={{
            backgroundColor: entry.strategyName.trim() ? "rgba(6,182,212,0.15)" : "var(--bg-hover)",
            color: entry.strategyName.trim() ? "#06b6d4" : "var(--text-muted)",
          }}
        >
          <Plus size={16} />
          Enregistrer la fiche
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Golden Rules ("Regles d'or") component
// ---------------------------------------------------------------------------

function GoldenRules({ strategyId }: { strategyId: string }) {
  const storageKey = `playbook-golden-${strategyId}`;
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setRules(loadList(storageKey));
    setVisible(loadJSON(`playbook-golden-vis-${strategyId}`, true));
  }, [storageKey, strategyId]);

  const persist = useCallback(
    (next: string[]) => {
      setRules(next);
      saveList(storageKey, next);
    },
    [storageKey]
  );

  const add = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    persist([...rules, trimmed]);
    setNewRule("");
  };

  const remove = (idx: number) => {
    persist(rules.filter((_, i) => i !== idx));
  };

  const toggleVisibility = () => {
    const next = !visible;
    setVisible(next);
    saveJSON(`playbook-golden-vis-${strategyId}`, next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#f59e0b" }}>
          <Star size={14} />
          Regles d&apos;or
        </div>
        <button
          onClick={toggleVisibility}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-yellow-400/10"
          style={{ color: "var(--text-muted)" }}
        >
          {visible ? <Eye size={12} /> : <EyeOff size={12} />}
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>

      {visible && (
        <>
          <ul className="space-y-1">
            {rules.map((rule, i) => (
              <li
                key={i}
                className="flex items-center gap-2 group text-sm rounded-lg px-3 py-1.5"
                style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <Star size={13} className="text-yellow-400 shrink-0" />
                <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
                  {rule}
                </span>
                <button
                  onClick={() => remove(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  <XCircle size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="input-field flex-1 text-sm"
              placeholder="Ajouter une regle d'or..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button
              onClick={add}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors text-yellow-400 hover:bg-yellow-400/10"
            >
              <Plus size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Setup card with visual stats + screenshots + checklist
// ---------------------------------------------------------------------------

function SetupCard({ strategy, trades }: { strategy: Strategy; trades: Trade[] }) {
  const [expanded, setExpanded] = useState(false);

  const stratTrades = useMemo(
    () => trades.filter((t) => t.strategy === strategy.name),
    [trades, strategy.name]
  );

  const stats = useMemo(() => computeStats(stratTrades), [stratTrades]);

  const fmt = (n: number, decimals = 2) =>
    n === Infinity ? "\u221E" : n.toFixed(decimals);

  return (
    <div className="metric-card rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: strategy.color }}
          />
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {strategy.name}
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            {stats.total} trade{stats.total !== 1 ? "s" : ""}
          </span>
          {stats.currentStreak.count >= 2 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: stats.currentStreak.type === "win" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: stats.currentStreak.type === "win" ? "#10b981" : "#ef4444",
              }}
            >
              <Flame size={11} />
              {stats.currentStreak.count} {stats.currentStreak.type === "win" ? "victoires" : "pertes"}
            </span>
          )}
          {/* AI Recommendation Badge */}
          {stats.total >= 3 && (() => {
            let label = "";
            let bgColor = "";
            let textColor = "";
            if (stats.profitFactor > 2) {
              label = "Excellent ratio gain/perte";
              bgColor = "rgba(16,185,129,0.12)";
              textColor = "#10b981";
            } else if (stats.winRate > 60) {
              label = "Stratégie performante — continuez";
              bgColor = "rgba(16,185,129,0.12)";
              textColor = "#10b981";
            } else if (stats.winRate < 40) {
              label = "Stratégie à revoir — analysez vos entrées";
              bgColor = "rgba(239,68,68,0.12)";
              textColor = "#ef4444";
            } else if (stats.profitFactor < 1 && stats.profitFactor > 0) {
              label = "Profit factor < 1 — ajustez vos sorties";
              bgColor = "rgba(245,158,11,0.12)";
              textColor = "#f59e0b";
            } else {
              label = "Performance correcte";
              bgColor = "rgba(6,182,212,0.12)";
              textColor = "#06b6d4";
            }
            return (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                🧠 {label}
              </span>
            );
          })()}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Performance metrics grid */}
      <div className="flex items-center gap-6 flex-wrap">
        {stats.total > 0 && (
          <div className="flex flex-col items-center gap-1">
            <DonutChart winRate={stats.winRate} size={80} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Win Rate</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 flex-1 min-w-0">
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>R:R moyen</p>
            <p className="text-base font-bold text-cyan-400">{fmt(stats.avgRR, 1)}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>P&amp;L moyen</p>
            <p className="text-base font-bold" style={{ color: stats.avgPnl >= 0 ? "#10b981" : "#ef4444" }}>
              {stats.avgPnl >= 0 ? "+" : ""}{fmt(stats.avgPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>P&amp;L total</p>
            <p className="text-base font-bold" style={{ color: stats.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
              {stats.totalPnl >= 0 ? "+" : ""}{fmt(stats.totalPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Meilleur trade</p>
            <p className="text-base font-bold" style={{ color: "#10b981" }}>
              +{fmt(stats.bestTrade)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Pire trade</p>
            <p className="text-base font-bold" style={{ color: "#ef4444" }}>
              {fmt(stats.worstTrade)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Profit Factor</p>
            <p className="text-base font-bold text-cyan-400">{fmt(stats.profitFactor)}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Esperance</p>
            <p className="text-base font-bold" style={{ color: stats.expectancy >= 0 ? "#10b981" : "#ef4444" }}>
              {stats.expectancy >= 0 ? "+" : ""}{fmt(stats.expectancy)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Serie max gains</p>
            <p className="text-base font-bold" style={{ color: "#10b981" }}>{stats.maxWinStreak}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Serie max pertes</p>
            <p className="text-base font-bold" style={{ color: "#ef4444" }}>{stats.maxLossStreak}</p>
          </div>
        </div>

        {stats.last10.length >= 2 && (
          <div className="flex flex-col items-center gap-1">
            <MiniSparkline values={stats.last10} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Tendance (10 derniers)</span>
          </div>
        )}
      </div>

      {/* Mini bar chart */}
      {stats.last10.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Derniers trades
          </p>
          <MiniChart values={stats.last10} />
        </div>
      )}

      {/* Screenshots gallery (always visible if there are screenshots) */}
      <ScreenshotsGallery strategyName={strategy.name} trades={trades} />

      {/* Setup checklist (always visible, expandable) */}
      <SetupChecklist strategyId={strategy.id} />

      {/* Expanded section */}
      {expanded && (
        <div className="space-y-5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <EditableList
            storageKey={`playbook-${strategy.id}`}
            label="Regles d'entree"
            icon={<Target size={14} className="text-cyan-400" />}
          />
          <EditableList
            storageKey={`playbook-exit-${strategy.id}`}
            label="Regles de sortie"
            icon={<Zap size={14} className="text-cyan-400" />}
          />

          <RiskParams strategyId={strategy.id} />

          <GoldenRules strategyId={strategy.id} />

          <NotesArea storageKey={`playbook-notes-${strategy.id}`} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Parameters per strategy
// ---------------------------------------------------------------------------

function RiskParams({ strategyId }: { strategyId: string }) {
  const key = `playbook-risk-${strategyId}`;
  const [maxRisk, setMaxRisk] = useState("");
  const [lotSize, setLotSize] = useState("");

  useEffect(() => {
    const saved = loadJSON<{ maxRisk: string; lotSize: string }>(key, { maxRisk: "", lotSize: "" });
    setMaxRisk(saved.maxRisk);
    setLotSize(saved.lotSize);
  }, [key]);

  const save = (field: "maxRisk" | "lotSize", value: string) => {
    const next = { maxRisk, lotSize, [field]: value };
    if (field === "maxRisk") setMaxRisk(value);
    else setLotSize(value);
    saveJSON(key, next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        <Shield size={14} className="text-cyan-400" />
        Parametres de risque
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Risque max (%)</label>
          <input
            className="input-field w-full text-sm"
            type="number"
            step="0.1"
            min="0"
            placeholder="Ex: 1.5"
            value={maxRisk}
            onChange={(e) => save("maxRisk", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Lot prefere</label>
          <input
            className="input-field w-full text-sm"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ex: 0.10"
            value={lotSize}
            onChange={(e) => save("lotSize", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy Comparison Table (original overview)
// ---------------------------------------------------------------------------

function ComparisonTable({
  strategies,
  tradesByStrategy,
}: {
  strategies: Strategy[];
  tradesByStrategy: Map<string, StrategyStats>;
}) {
  const [sortKey, setSortKey] = useState<string>("winRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const columns: { key: string; label: string; format: (s: StrategyStats) => string; colorFn?: (s: StrategyStats) => string }[] = [
    { key: "total", label: "Trades", format: (s) => String(s.total) },
    {
      key: "winRate",
      label: "Win %",
      format: (s) => s.winRate.toFixed(1) + "%",
      colorFn: (s) => (s.winRate >= 50 ? "#10b981" : "#ef4444"),
    },
    {
      key: "avgRR",
      label: "R:R moy.",
      format: (s) => s.avgRR.toFixed(1),
      colorFn: () => "#06b6d4",
    },
    {
      key: "totalPnl",
      label: "P&L total",
      format: (s) => (s.totalPnl >= 0 ? "+" : "") + s.totalPnl.toFixed(2),
      colorFn: (s) => (s.totalPnl >= 0 ? "#10b981" : "#ef4444"),
    },
    {
      key: "profitFactor",
      label: "PF",
      format: (s) => (s.profitFactor === Infinity ? "\u221E" : s.profitFactor.toFixed(2)),
      colorFn: (s) => (s.profitFactor >= 1.5 ? "#10b981" : s.profitFactor >= 1 ? "#f59e0b" : "#ef4444"),
    },
    {
      key: "expectancy",
      label: "Esperance",
      format: (s) => (s.expectancy >= 0 ? "+" : "") + s.expectancy.toFixed(2),
      colorFn: (s) => (s.expectancy >= 0 ? "#10b981" : "#ef4444"),
    },
    {
      key: "maxWinStreak",
      label: "Serie W",
      format: (s) => String(s.maxWinStreak),
      colorFn: () => "#10b981",
    },
    {
      key: "maxLossStreak",
      label: "Serie L",
      format: (s) => String(s.maxLossStreak),
      colorFn: () => "#ef4444",
    },
  ];

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedRows = useMemo(() => {
    return [...strategies].sort((a, b) => {
      const sa = tradesByStrategy.get(a.name);
      const sb = tradesByStrategy.get(b.name);
      if (!sa || !sb) return 0;
      const valA = (sa as unknown as Record<string, number>)[sortKey] ?? 0;
      const valB = (sb as unknown as Record<string, number>)[sortKey] ?? 0;
      const vA = valA === Infinity ? 9999 : valA;
      const vB = valB === Infinity ? 9999 : valB;
      return sortDir === "desc" ? vB - vA : vA - vB;
    });
  }, [strategies, tradesByStrategy, sortKey, sortDir]);

  if (strategies.length < 2) return null;

  return (
    <div className="metric-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Columns3 size={18} className="text-cyan-400" />
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Comparaison des strategies
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Strategie
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-right py-2 px-2 text-xs font-medium cursor-pointer select-none whitespace-nowrap"
                  style={{ color: sortKey === col.key ? "#06b6d4" : "var(--text-muted)" }}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    <ArrowUpDown size={10} className="opacity-50" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((s) => {
              const st = tradesByStrategy.get(s.name);
              if (!st) return null;
              return (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="text-right py-2 px-2 font-mono text-xs font-medium"
                      style={{ color: col.colorFn ? col.colorFn(st) : "var(--text-secondary)" }}
                    >
                      {col.format(st)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side-by-Side Strategy Comparison (new "Duel" mode)
// ---------------------------------------------------------------------------

function StrategySideBySide({
  strategies,
  tradesByStrategy,
}: {
  strategies: Strategy[];
  tradesByStrategy: Map<string, StrategyStats>;
}) {
  const [stratA, setStratA] = useState<string>(strategies[0]?.name || "");
  const [stratB, setStratB] = useState<string>(strategies[1]?.name || "");

  const statsA = tradesByStrategy.get(stratA);
  const statsB = tradesByStrategy.get(stratB);

  const colorA = strategies.find((s) => s.name === stratA)?.color || "#06b6d4";
  const colorB = strategies.find((s) => s.name === stratB)?.color || "#f59e0b";

  // Metrics to compare: key, label, higherIsBetter, format function
  const metrics: {
    label: string;
    getValue: (s: StrategyStats) => number;
    format: (s: StrategyStats) => string;
    higherIsBetter: boolean;
  }[] = [
    {
      label: "Win Rate",
      getValue: (s) => s.winRate,
      format: (s) => s.winRate.toFixed(1) + "%",
      higherIsBetter: true,
    },
    {
      label: "R:R moyen",
      getValue: (s) => s.avgRR,
      format: (s) => s.avgRR.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "P&L total",
      getValue: (s) => s.totalPnl,
      format: (s) => (s.totalPnl >= 0 ? "+" : "") + s.totalPnl.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "Nb. trades",
      getValue: (s) => s.total,
      format: (s) => String(s.total),
      higherIsBetter: true,
    },
    {
      label: "Meilleur trade",
      getValue: (s) => s.bestTrade,
      format: (s) => (s.bestTrade >= 0 ? "+" : "") + s.bestTrade.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "Pire trade",
      getValue: (s) => s.worstTrade,
      format: (s) => s.worstTrade.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "Profit Factor",
      getValue: (s) => s.profitFactor === Infinity ? 9999 : s.profitFactor,
      format: (s) => s.profitFactor === Infinity ? "\u221E" : s.profitFactor.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "Esperance",
      getValue: (s) => s.expectancy,
      format: (s) => (s.expectancy >= 0 ? "+" : "") + s.expectancy.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: "Serie max gains",
      getValue: (s) => s.maxWinStreak,
      format: (s) => String(s.maxWinStreak),
      higherIsBetter: true,
    },
    {
      label: "Serie max pertes",
      getValue: (s) => s.maxLossStreak,
      format: (s) => String(s.maxLossStreak),
      higherIsBetter: false,
    },
  ];

  // Verdict: count how many metrics each strategy wins
  const verdict = useMemo(() => {
    if (!statsA || !statsB) return null;
    let winsA = 0;
    let winsB = 0;
    for (const m of metrics) {
      const vA = m.getValue(statsA);
      const vB = m.getValue(statsB);
      if (m.higherIsBetter) {
        if (vA > vB) winsA++;
        else if (vB > vA) winsB++;
      } else {
        if (vA < vB) winsA++;
        else if (vB < vA) winsB++;
      }
    }
    return { winsA, winsB };
  }, [statsA, statsB]);

  if (strategies.length < 2) {
    return (
      <div className="metric-card rounded-2xl p-6 text-center">
        <AlertTriangle size={24} className="mx-auto mb-2 text-yellow-400 opacity-60" />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Il faut au moins 2 strategies pour comparer.
        </p>
      </div>
    );
  }

  return (
    <div className="metric-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <GitCompare size={18} className="text-cyan-400" />
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Duel de strategies
        </h2>
      </div>

      {/* Strategy selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: colorA }}>
            Strategie A
          </label>
          <select
            className="input-field w-full text-sm"
            value={stratA}
            onChange={(e) => setStratA(e.target.value)}
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: colorB }}>
            Strategie B
          </label>
          <select
            className="input-field w-full text-sm"
            value={stratB}
            onChange={(e) => setStratB(e.target.value)}
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison rows */}
      {statsA && statsB && stratA !== stratB && (
        <div className="space-y-1">
          {metrics.map((m) => {
            const vA = m.getValue(statsA);
            const vB = m.getValue(statsB);
            let winnerSide: "a" | "b" | "tie" = "tie";
            if (m.higherIsBetter) {
              if (vA > vB) winnerSide = "a";
              else if (vB > vA) winnerSide = "b";
            } else {
              if (vA < vB) winnerSide = "a";
              else if (vB < vA) winnerSide = "b";
            }

            return (
              <div
                key={m.label}
                className="grid grid-cols-3 items-center py-2 px-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-hover)" }}
              >
                {/* Value A */}
                <div className="text-left">
                  <span
                    className="text-sm font-bold font-mono"
                    style={{
                      color: winnerSide === "a" ? "#10b981" : "var(--text-secondary)",
                    }}
                  >
                    {m.format(statsA)}
                    {winnerSide === "a" && (
                      <Trophy size={11} className="inline ml-1 text-green-400" />
                    )}
                  </span>
                </div>

                {/* Label (center) */}
                <div className="text-center">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.label}
                  </span>
                </div>

                {/* Value B */}
                <div className="text-right">
                  <span
                    className="text-sm font-bold font-mono"
                    style={{
                      color: winnerSide === "b" ? "#10b981" : "var(--text-secondary)",
                    }}
                  >
                    {winnerSide === "b" && (
                      <Trophy size={11} className="inline mr-1 text-green-400" />
                    )}
                    {m.format(statsB)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Verdict */}
          {verdict && (
            <div
              className="rounded-xl p-4 mt-3 text-center"
              style={{
                backgroundColor: verdict.winsA > verdict.winsB
                  ? "rgba(16,185,129,0.08)"
                  : verdict.winsB > verdict.winsA
                  ? "rgba(16,185,129,0.08)"
                  : "var(--bg-hover)",
                border: "1px solid rgba(16,185,129,0.15)",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Verdict
                </span>
              </div>
              {verdict.winsA > verdict.winsB ? (
                <p className="text-sm font-medium" style={{ color: "#10b981" }}>
                  <span style={{ color: colorA, fontWeight: 700 }}>{stratA}</span>{" "}
                  est plus performante ({verdict.winsA}/{metrics.length} metriques gagnees)
                </p>
              ) : verdict.winsB > verdict.winsA ? (
                <p className="text-sm font-medium" style={{ color: "#10b981" }}>
                  <span style={{ color: colorB, fontWeight: 700 }}>{stratB}</span>{" "}
                  est plus performante ({verdict.winsB}/{metrics.length} metriques gagnees)
                </p>
              ) : (
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Les deux strategies sont a egalite ({verdict.winsA}/{metrics.length})
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {stratA === stratB && (
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Selectionnez deux strategies differentes pour comparer.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global stats card
// ---------------------------------------------------------------------------

function GlobalStats({
  strategies,
  tradesByStrategy,
}: {
  strategies: Strategy[];
  tradesByStrategy: Map<string, StrategyStats>;
}) {
  const best = useMemo(() => {
    let bestWR: { name: string; value: number } | null = null;
    let bestPnl: { name: string; value: number } | null = null;
    let mostUsed: { name: string; value: number } | null = null;

    for (const s of strategies) {
      const st = tradesByStrategy.get(s.name);
      if (!st) continue;

      if (st.total >= 5 && (!bestWR || st.winRate > bestWR.value)) {
        bestWR = { name: s.name, value: st.winRate };
      }
      if (!bestPnl || st.totalPnl > bestPnl.value) {
        bestPnl = { name: s.name, value: st.totalPnl };
      }
      if (!mostUsed || st.total > mostUsed.value) {
        mostUsed = { name: s.name, value: st.total };
      }
    }

    return { bestWR, bestPnl, mostUsed };
  }, [strategies, tradesByStrategy]);

  if (!best.bestWR && !best.bestPnl && !best.mostUsed) return null;

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-cyan-400" />
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Resume global
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {best.bestWR && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-hover)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} style={{ color: "#10b981" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Meilleur win rate (5+ trades)
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {best.bestWR.name}
            </p>
            <p className="text-lg font-bold" style={{ color: "#10b981" }}>
              {best.bestWR.value.toFixed(1)}%
            </p>
          </div>
        )}
        {best.bestPnl && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-hover)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} style={{ color: "#10b981" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Plus profitable
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {best.bestPnl.name}
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: best.bestPnl.value >= 0 ? "#10b981" : "#ef4444" }}
            >
              {best.bestPnl.value >= 0 ? "+" : ""}
              {best.bestPnl.value.toFixed(2)}
            </p>
          </div>
        )}
        {best.mostUsed && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-hover)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-cyan-400" />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Plus utilise
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {best.mostUsed.name}
            </p>
            <p className="text-lg font-bold text-cyan-400">
              {best.mostUsed.value} trade{best.mostUsed.value !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlaybookPage() {
  const { trades, loading: tradesLoading } = useTrades();
  const { strategies, loading: strategiesLoading } = useStrategies();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"cards" | "compare" | "duel">("cards");

  const loading = tradesLoading || strategiesLoading;

  const tradesByStrategy = useMemo(() => {
    const map = new Map<string, StrategyStats>();
    for (const s of strategies) {
      const filtered = trades.filter((t) => t.strategy === s.name);
      map.set(s.name, computeStats(filtered));
    }
    return map;
  }, [trades, strategies]);

  // Sort strategies by total trades descending
  const sortedStrategies = useMemo(
    () =>
      [...strategies].sort((a, b) => {
        const sa = tradesByStrategy.get(a.name)?.total ?? 0;
        const sb = tradesByStrategy.get(b.name)?.total ?? 0;
        return sb - sa;
      }),
    [strategies, tradesByStrategy]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="metric-card rounded-2xl p-10 text-center space-y-4">
          <BookMarked size={48} className="mx-auto text-cyan-400 opacity-60" />
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Aucune strategie definie
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Creez d&apos;abord vos strategies de trading pour pouvoir construire votre playbook.
          </p>
          <Link
            href="/strategies"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
          >
            <Plus size={16} />
            Creer des strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookMarked size={24} className="text-cyan-400" />
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Playbook
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Definissez vos setups et suivez leur performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div
            className="flex rounded-xl overflow-hidden text-xs"
            style={{ border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setActiveTab("cards")}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: activeTab === "cards" ? "rgba(6,182,212,0.15)" : "transparent",
                color: activeTab === "cards" ? "#06b6d4" : "var(--text-muted)",
              }}
            >
              <BarChart3 size={13} className="inline mr-1" />
              Fiches
            </button>
            <button
              onClick={() => setActiveTab("compare")}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: activeTab === "compare" ? "rgba(6,182,212,0.15)" : "transparent",
                color: activeTab === "compare" ? "#06b6d4" : "var(--text-muted)",
              }}
            >
              <Columns3 size={13} className="inline mr-1" />
              Tableau
            </button>
            <button
              onClick={() => setActiveTab("duel")}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: activeTab === "duel" ? "rgba(6,182,212,0.15)" : "transparent",
                color: activeTab === "duel" ? "#06b6d4" : "var(--text-muted)",
              }}
            >
              <GitCompare size={13} className="inline mr-1" />
              Comparer
            </button>
          </div>

          {/* New entry button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors"
            style={{
              backgroundColor: showForm ? "rgba(6,182,212,0.15)" : "var(--bg-hover)",
              color: showForm ? "#06b6d4" : "var(--text-muted)",
            }}
          >
            <Plus size={15} />
            Nouvelle fiche
          </button>
        </div>
      </div>

      {/* Playbook entry form */}
      {showForm && (
        <PlaybookEntryForm
          onSave={() => {
            setShowForm(false);
          }}
        />
      )}

      {/* Global stats */}
      <GlobalStats strategies={strategies} tradesByStrategy={tradesByStrategy} />

      {/* Tab content */}
      {activeTab === "cards" && (
        <div className="space-y-4">
          {sortedStrategies.map((s) => (
            <SetupCard key={s.id} strategy={s} trades={trades} />
          ))}
        </div>
      )}

      {activeTab === "compare" && (
        <ComparisonTable strategies={strategies} tradesByStrategy={tradesByStrategy} />
      )}

      {activeTab === "duel" && (
        <StrategySideBySide strategies={strategies} tradesByStrategy={tradesByStrategy} />
      )}

      {/* Global golden rules section */}
      <div className="metric-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-yellow-400" />
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Regles d&apos;or globales
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Les principes qui s&apos;appliquent a toutes vos strategies, independamment du setup.
        </p>
        <GoldenRules strategyId="global" />
      </div>
    </div>
  );
}
