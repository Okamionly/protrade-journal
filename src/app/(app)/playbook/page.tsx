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
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
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

  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const last10 = sorted.slice(0, 10).reverse().map((t) => t.result);

  return { total, wins, losses, winRate, avgPnl, totalPnl, expectancy, profitFactor, last10 };
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

function NotesArea({ storageKey }: { storageKey: string }) {
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
        <BookMarked size={14} />
        Notes
      </div>
      <textarea
        className="input-field w-full text-sm min-h-[80px] resize-y"
        placeholder="Notes sur cette stratégie..."
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup card
// ---------------------------------------------------------------------------

function SetupCard({ strategy, trades }: { strategy: Strategy; trades: Trade[] }) {
  const [expanded, setExpanded] = useState(false);

  const stratTrades = useMemo(
    () => trades.filter((t) => t.strategy === strategy.name),
    [trades, strategy.name]
  );

  const stats = useMemo(() => computeStats(stratTrades), [stratTrades]);

  const fmt = (n: number, decimals = 2) =>
    n === Infinity ? "∞" : n.toFixed(decimals);

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
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Win Rate
          </p>
          <p className="text-base font-bold" style={{ color: stats.winRate >= 50 ? "#10b981" : "#ef4444" }}>
            {fmt(stats.winRate, 1)}%
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            P&L moyen
          </p>
          <p
            className="text-base font-bold"
            style={{ color: stats.avgPnl >= 0 ? "#10b981" : "#ef4444" }}
          >
            {stats.avgPnl >= 0 ? "+" : ""}
            {fmt(stats.avgPnl)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            P&L total
          </p>
          <p
            className="text-base font-bold"
            style={{ color: stats.totalPnl >= 0 ? "#10b981" : "#ef4444" }}
          >
            {stats.totalPnl >= 0 ? "+" : ""}
            {fmt(stats.totalPnl)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Espérance
          </p>
          <p
            className="text-base font-bold"
            style={{ color: stats.expectancy >= 0 ? "#10b981" : "#ef4444" }}
          >
            {stats.expectancy >= 0 ? "+" : ""}
            {fmt(stats.expectancy)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Profit Factor
          </p>
          <p className="text-base font-bold text-cyan-400">{fmt(stats.profitFactor)}</p>
        </div>
      </div>

      {/* Mini chart */}
      {stats.last10.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Derniers trades
          </p>
          <MiniChart values={stats.last10} />
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="space-y-5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <EditableList
            storageKey={`playbook-${strategy.id}`}
            label="Conditions d'entrée"
            icon={<Target size={14} className="text-cyan-400" />}
          />
          <EditableList
            storageKey={`playbook-exit-${strategy.id}`}
            label="Règles de sortie"
            icon={<Zap size={14} className="text-cyan-400" />}
          />
          <NotesArea storageKey={`playbook-notes-${strategy.id}`} />
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
          Résumé global
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
                Plus utilisé
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
            Aucune stratégie définie
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Créez d&apos;abord vos stratégies de trading pour pouvoir construire votre playbook.
          </p>
          <Link
            href="/strategies"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
          >
            <Plus size={16} />
            Créer des stratégies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BookMarked size={24} className="text-cyan-400" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Playbook
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Définissez vos setups et suivez leur performance
        </p>
      </div>

      {/* Global stats */}
      <GlobalStats strategies={strategies} tradesByStrategy={tradesByStrategy} />

      {/* Setup cards */}
      <div className="space-y-4">
        {sortedStrategies.map((s) => (
          <SetupCard key={s.id} strategy={s} trades={trades} />
        ))}
      </div>
    </div>
  );
}
