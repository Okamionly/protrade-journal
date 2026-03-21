"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { getTradingSession, type TradingSession } from "@/hooks/useAdvancedFilters";
import { useTranslation } from "@/i18n/context";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import {
  Clock, TrendingUp, Trophy, BarChart3, Lightbulb, Filter,
  AlertTriangle, Star, Layers, BookOpen, Plus, X, Save, Trash2,
  ArrowUpRight, ArrowDownRight, Zap, Globe
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════ */

const SESSION_COLORS: Record<TradingSession, { bg: string; text: string; chart: string; chartBg: string }> = {
  Tokyo:      { bg: "bg-rose-500/15", text: "text-rose-400", chart: "#f43f5e", chartBg: "rgba(244,63,94,0.3)" },
  London:     { bg: "bg-blue-500/15", text: "text-blue-400", chart: "#3b82f6", chartBg: "rgba(59,130,246,0.3)" },
  "New York": { bg: "bg-emerald-500/15", text: "text-emerald-400", chart: "#10b981", chartBg: "rgba(16,185,129,0.3)" },
  Sydney:     { bg: "bg-purple-500/15", text: "text-purple-400", chart: "#a855f7", chartBg: "rgba(168,85,247,0.3)" },
};

const SESSIONS: TradingSession[] = ["Tokyo", "London", "New York", "Sydney"];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

// Session zones in UTC hours
const SESSION_ZONES = [
  { key: "asia",   label: "Asie",      start: 0,    end: 8,    color: "#f43f5e" },
  { key: "london", label: "Londres",   start: 7,    end: 16,   color: "#3b82f6" },
  { key: "nyAm",   label: "NY AM",     start: 13.5, end: 17,   color: "#10b981" },
  { key: "nyPm",   label: "NY PM",     start: 17,   end: 21,   color: "#22d3ee" },
];

type TimeFilter = "7d" | "30d" | "90d" | "all";

interface SessionStats {
  session: TradingSession;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  tradesList: Trade[];
}

interface SessionRule {
  id: string;
  session: TradingSession;
  rule: string;
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function filterTradesByTime(trades: Trade[], filter: TimeFilter): Trade[] {
  if (filter === "all") return trades;
  const now = new Date();
  const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return trades.filter((t) => new Date(t.date) >= cutoff);
}

function computeSessionStats(trades: Trade[]): SessionStats[] {
  const map: Record<TradingSession, Trade[]> = {
    Tokyo: [], London: [], "New York": [], Sydney: [],
  };

  for (const trade of trades) {
    const sessions = getTradingSession(trade.date);
    if (sessions.length === 0) continue;
    const primary = sessions[0];
    if (map[primary]) map[primary].push(trade);
  }

  return SESSIONS.map((session) => {
    const list = map[session];
    const results = list.map((t) => t.result);
    const wins = results.filter((r) => r > 0).length;
    const losses = results.filter((r) => r < 0).length;
    const total = results.reduce((a, b) => a + b, 0);
    return {
      session,
      trades: results.length,
      wins,
      losses,
      winRate: results.length > 0 ? (wins / results.length) * 100 : 0,
      totalPnl: total,
      avgPnl: results.length > 0 ? total / results.length : 0,
      bestTrade: results.length > 0 ? Math.max(...results) : 0,
      worstTrade: results.length > 0 ? Math.min(...results) : 0,
      tradesList: list,
    };
  });
}

function computeHeatmap(trades: Trade[]): { pnl: number[][]; count: number[][] } {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 5 }, () => Array(24).fill(0));

  for (const trade of trades) {
    const d = new Date(trade.date);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue;
    const row = day - 1;
    const hour = d.getUTCHours();
    grid[row][hour] += trade.result;
    counts[row][hour] += 1;
  }

  const avgGrid = grid.map((row, ri) =>
    row.map((val, ci) => (counts[ri][ci] > 0 ? val / counts[ri][ci] : 0))
  );

  return { pnl: avgGrid, count: counts };
}

function computeOverlapStats(trades: Trade[]) {
  // London-NY overlap: 13:00-16:00 UTC
  const overlap: number[] = [];
  const nonOverlap: number[] = [];

  for (const trade of trades) {
    const h = new Date(trade.date).getUTCHours();
    if (h >= 13 && h < 16) {
      overlap.push(trade.result);
    } else {
      nonOverlap.push(trade.result);
    }
  }

  const overlapPnl = overlap.reduce((a, b) => a + b, 0);
  const nonOverlapPnl = nonOverlap.reduce((a, b) => a + b, 0);
  const overlapWins = overlap.filter((r) => r > 0).length;
  const nonOverlapWins = nonOverlap.filter((r) => r > 0).length;

  return {
    overlap: {
      trades: overlap.length,
      pnl: overlapPnl,
      winRate: overlap.length > 0 ? (overlapWins / overlap.length) * 100 : 0,
      avg: overlap.length > 0 ? overlapPnl / overlap.length : 0,
    },
    nonOverlap: {
      trades: nonOverlap.length,
      pnl: nonOverlapPnl,
      winRate: nonOverlap.length > 0 ? (nonOverlapWins / nonOverlap.length) * 100 : 0,
      avg: nonOverlap.length > 0 ? nonOverlapPnl / nonOverlap.length : 0,
    },
  };
}

function computeInstrumentBySession(trades: Trade[]) {
  const map: Record<TradingSession, Record<string, { pnl: number; count: number; wins: number }>> = {
    Tokyo: {}, London: {}, "New York": {}, Sydney: {},
  };

  for (const trade of trades) {
    const sessions = getTradingSession(trade.date);
    if (sessions.length === 0) continue;
    const primary = sessions[0];
    const asset = trade.asset || "N/A";
    if (!map[primary][asset]) map[primary][asset] = { pnl: 0, count: 0, wins: 0 };
    map[primary][asset].pnl += trade.result;
    map[primary][asset].count += 1;
    if (trade.result > 0) map[primary][asset].wins += 1;
  }

  return SESSIONS.map((session) => {
    const instruments = Object.entries(map[session])
      .map(([asset, data]) => ({
        asset,
        pnl: data.pnl,
        count: data.count,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
    return { session, instruments };
  });
}

/* ═══════════════════════════════════════════════════════════
   Session Rules (localStorage)
   ═══════════════════════════════════════════════════════════ */

function useSessionRules() {
  const [rules, setRules] = useState<SessionRule[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("protrade-session-rules");
      if (stored) setRules(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveRules = useCallback((newRules: SessionRule[]) => {
    setRules(newRules);
    localStorage.setItem("protrade-session-rules", JSON.stringify(newRules));
  }, []);

  const addRule = useCallback((session: TradingSession, rule: string) => {
    const newRule: SessionRule = { id: Date.now().toString(), session, rule };
    saveRules([...rules, newRule]);
  }, [rules, saveRules]);

  const removeRule = useCallback((id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  }, [rules, saveRules]);

  return { rules, addRule, removeRule };
}

/* ═══════════════════════════════════════════════════════════
   Visual Timeline Component
   ═══════════════════════════════════════════════════════════ */

function SessionTimeline() {
  const { t } = useTranslation();
  const nowH = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
        <Globe className="w-4 h-4 text-cyan-400" />
        {t("sessZonesTitle")}
      </h3>
      <p className="text-xs text-[--text-muted] mb-4">{t("sessZonesDesc")}</p>

      <div className="space-y-2">
        {/* Hour axis */}
        <div className="flex ml-20">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-[--text-muted]">
              {i.toString().padStart(2, "0")}
            </div>
          ))}
        </div>

        {/* Session bars */}
        {SESSION_ZONES.map((zone) => (
          <div key={zone.key} className="flex items-center gap-2">
            <div className="w-16 text-right text-xs font-medium text-[--text-secondary] flex-shrink-0">
              {zone.label}
            </div>
            <div className="flex-1 relative h-7 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div
                className="absolute top-0 h-full rounded-lg transition-all"
                style={{
                  left: `${(zone.start / 24) * 100}%`,
                  width: `${((zone.end - zone.start) / 24) * 100}%`,
                  backgroundColor: zone.color,
                  opacity: 0.35,
                }}
              />
              <div
                className="absolute top-0 h-full rounded-lg"
                style={{
                  left: `${(zone.start / 24) * 100}%`,
                  width: `${((zone.end - zone.start) / 24) * 100}%`,
                  border: `1px solid ${zone.color}`,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        ))}

        {/* Now indicator */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-right text-[10px] font-medium text-cyan-400 flex-shrink-0">
            UTC
          </div>
          <div className="flex-1 relative h-4">
            <div
              className="absolute top-0 h-full w-0.5 bg-cyan-400 rounded-full"
              style={{ left: `${(nowH / 24) * 100}%` }}
            />
            <div
              className="absolute -top-0.5 w-2 h-2 rounded-full bg-cyan-400"
              style={{ left: `calc(${(nowH / 24) * 100}% - 3px)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Heatmap Component
   ═══════════════════════════════════════════════════════════ */

function HeatmapGrid({ data, counts }: { data: number[][]; counts: number[][] }) {
  const { t } = useTranslation();
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const row of data) for (const v of row) m = Math.max(m, Math.abs(v));
    return m || 1;
  }, [data]);

  const getColor = (val: number) => {
    if (val === 0) return "bg-[--bg-secondary]";
    return val > 0 ? "bg-emerald-500" : "bg-rose-500";
  };

  const getOpacity = (val: number) => {
    if (val === 0) return 0.08;
    return 0.15 + Math.min(Math.abs(val) / maxAbs, 1) * 0.75;
  };

  const dayLabels = [t("heatmapMon"), t("heatmapTue"), t("heatmapWed"), t("heatmapThu"), t("heatmapFri")];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex gap-[2px] mb-1 ml-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-[--text-muted]">
              {i.toString().padStart(2, "0")}
            </div>
          ))}
        </div>
        {data.map((row, ri) => (
          <div key={ri} className="flex items-center gap-[2px] mb-[2px]">
            <div className="w-12 text-[10px] text-[--text-muted] text-right pr-2 flex-shrink-0">
              {dayLabels[ri]}
            </div>
            {row.map((val, ci) => (
              <div
                key={ci}
                className={`flex-1 h-7 rounded-[3px] ${getColor(val)} transition-all cursor-default relative group`}
                style={{ opacity: getOpacity(val) }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10"
                  style={{ background: "var(--bg-card-solid)", color: "var(--text-primary)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {val >= 0 ? "+" : ""}{val.toFixed(1)} &middot; {counts[ri][ci]} trades
                </div>
              </div>
            ))}
          </div>
        ))}
        {/* Session bands */}
        <div className="flex gap-[2px] mt-2 ml-12">
          {Array.from({ length: 24 }, (_, h) => {
            const sessions = [];
            if (h >= 0 && h < 9) sessions.push("Tokyo");
            if (h >= 7 && h < 16) sessions.push("London");
            if (h >= 13 && h < 22) sessions.push("NY");
            if (h >= 22 || h < 7) sessions.push("Syd");
            return (
              <div key={h} className="flex-1 text-center">
                {sessions.map((s) => (
                  <div key={s} className={`text-[7px] leading-tight font-medium ${
                    s === "Tokyo" ? "text-rose-400" : s === "London" ? "text-blue-400" :
                    s === "NY" ? "text-emerald-400" : "text-purple-400"
                  }`}>{s}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SVG Bar Chart - Session Comparison
   ═══════════════════════════════════════════════════════════ */

function SessionComparisonChart({ stats }: { stats: SessionStats[] }) {
  const maxVal = Math.max(...stats.map((s) => Math.abs(s.totalPnl)), 1);
  const chartH = 200;
  const barW = 50;
  const gap = 30;
  const totalW = stats.length * (barW + gap) - gap;
  const midY = chartH / 2;

  return (
    <svg viewBox={`0 0 ${totalW + 60} ${chartH + 40}`} className="w-full h-64">
      {/* Zero line */}
      <line x1="30" y1={midY + 20} x2={totalW + 40} y2={midY + 20} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="10" y={midY + 24} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">0</text>

      {stats.map((s, i) => {
        const x = 40 + i * (barW + gap);
        const normalizedH = (Math.abs(s.totalPnl) / maxVal) * (midY - 10);
        const isPositive = s.totalPnl >= 0;
        const barY = isPositive ? midY + 20 - normalizedH : midY + 20;
        const color = isPositive ? SESSION_COLORS[s.session].chart : "#f43f5e";

        return (
          <g key={s.session}>
            <rect
              x={x} y={barY} width={barW} height={Math.max(normalizedH, 2)}
              rx="4" fill={color} opacity="0.7"
            />
            <text x={x + barW / 2} y={chartH + 16} fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor="middle">
              {s.session === "New York" ? "NY" : s.session}
            </text>
            <text
              x={x + barW / 2}
              y={isPositive ? barY - 6 : barY + normalizedH + 14}
              fill={color} fontSize="10" fontWeight="bold" textAnchor="middle"
            >
              {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Session Rules Component
   ═══════════════════════════════════════════════════════════ */

function SessionRulesPanel() {
  const { t } = useTranslation();
  const { rules, addRule, removeRule } = useSessionRules();
  const [newSession, setNewSession] = useState<TradingSession>("Tokyo");
  const [newRule, setNewRule] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newRule.trim()) {
      addRule(newSession, newRule.trim());
      setNewRule("");
      setIsAdding(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          {t("sessRulesTitle")}
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("sessRulesAdd")}
        </button>
      </div>

      {isAdding && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          <select
            value={newSession}
            onChange={(e) => setNewSession(e.target.value as TradingSession)}
            className="bg-transparent border border-[--border] rounded-lg px-3 py-1.5 text-xs text-[--text-primary] focus:outline-none focus:border-cyan-500/50"
          >
            {SESSIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t("sessRulePlaceholder")}
            className="flex-1 bg-transparent border border-[--border] rounded-lg px-3 py-1.5 text-xs text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50"
          />
          <div className="flex gap-1">
            <button onClick={handleAdd} className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsAdding(false)} className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="text-xs text-[--text-muted] italic">{t("sessRulesEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {SESSIONS.map((session) => {
            const sessionRules = rules.filter((r) => r.session === session);
            if (sessionRules.length === 0) return null;
            return (
              <div key={session}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SESSION_COLORS[session].chart }} />
                  <span className="text-xs font-medium text-[--text-primary]">{session}</span>
                </div>
                {sessionRules.map((r) => (
                  <div key={r.id} className="flex items-center justify-between ml-4 mb-1 py-1 px-2 rounded-lg group hover:bg-[--bg-secondary]/50 transition">
                    <span className="text-xs text-[--text-secondary]">{r.rule}</span>
                    <button
                      onClick={() => removeRule(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function SessionsPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const filteredTrades = useMemo(() => filterTradesByTime(trades, timeFilter), [trades, timeFilter]);
  const stats = useMemo(() => computeSessionStats(filteredTrades), [filteredTrades]);
  const { pnl: heatmapData, count: heatmapCounts } = useMemo(() => computeHeatmap(filteredTrades), [filteredTrades]);
  const overlapStats = useMemo(() => computeOverlapStats(filteredTrades), [filteredTrades]);
  const instrumentBySession = useMemo(() => computeInstrumentBySession(filteredTrades), [filteredTrades]);

  const bestSession = useMemo(() => {
    const withTrades = stats.filter((s) => s.trades > 0);
    if (withTrades.length === 0) return null;
    return withTrades.reduce((best, s) => (s.totalPnl > best.totalPnl ? s : best));
  }, [stats]);

  const worstSession = useMemo(() => {
    const withTrades = stats.filter((s) => s.trades > 0);
    if (withTrades.length === 0) return null;
    return withTrades.reduce((worst, s) => (s.totalPnl < worst.totalPnl ? s : worst));
  }, [stats]);

  // Recommended sessions: sort by combination of winRate and avgPnl
  const recommendations = useMemo(() => {
    return [...stats]
      .filter((s) => s.trades >= 3)
      .sort((a, b) => {
        const scoreA = a.winRate * 0.6 + (a.avgPnl > 0 ? 40 : 0);
        const scoreB = b.winRate * 0.6 + (b.avgPnl > 0 ? 40 : 0);
        return scoreB - scoreA;
      });
  }, [stats]);

  if (loading) return <AnalyticsSkeleton />;

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Clock className="w-12 h-12 text-[--text-muted]" />
        <h2 className="text-xl font-semibold text-[--text-primary]">{t("sessionAnalysis")}</h2>
        <p className="text-sm text-[--text-muted]">{t("addTradesToSee")}</p>
      </div>
    );
  }

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: "7d", label: t("sessFilter7d") },
    { value: "30d", label: t("sessFilter30d") },
    { value: "90d", label: t("sessFilter90d") },
    { value: "all", label: t("sessFilterAll") },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[--text-primary]">{t("sessionAnalysis")}</h1>
            <p className="text-sm text-[--text-muted]">{t("sessionAnalysisDesc")}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Filter className="w-3.5 h-3.5 text-[--text-muted] ml-2 mr-1" />
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                timeFilter === opt.value
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-[--text-muted] hover:text-[--text-secondary]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session Timeline */}
      <SessionTimeline />

      {/* Best/Worst Session Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bestSession && bestSession.trades >= 1 && (
          <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-[--text-muted] mb-0.5">{t("sessBestSession")}</p>
                <p className="text-sm font-bold text-[--text-primary]">{bestSession.session}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-emerald-400 font-medium">
                    {bestSession.totalPnl >= 0 ? "+" : ""}{bestSession.totalPnl.toFixed(2)}
                  </span>
                  <span className="text-[--text-muted]">{bestSession.winRate.toFixed(0)}% WR</span>
                  <span className="text-[--text-muted]">{bestSession.trades} trades</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {worstSession && worstSession.trades >= 1 && (
          <div className="glass rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-[--text-muted] mb-0.5">{t("sessWorstSession")}</p>
                <p className="text-sm font-bold text-[--text-primary]">{worstSession.session}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-rose-400 font-medium">
                    {worstSession.totalPnl >= 0 ? "+" : ""}{worstSession.totalPnl.toFixed(2)}
                  </span>
                  <span className="text-[--text-muted]">{worstSession.winRate.toFixed(0)}% WR</span>
                  <span className="text-[--text-muted]">{worstSession.trades} trades</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.session} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SESSION_COLORS[s.session].chart }} />
              <span className="text-sm font-semibold text-[--text-primary]">{s.session}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("tradeCount")}</span>
                <span className="font-medium text-[--text-primary]">{s.trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("winRateLabel")}</span>
                <span className={`font-medium ${s.winRate >= 50 ? "text-emerald-400" : s.trades > 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                  {s.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">P&L</span>
                <span className={`font-bold ${s.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">{t("avgPnlLabel")}</span>
                <span className={`${s.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}
                </span>
              </div>
              {/* Win rate mini bar */}
              {s.trades > 0 && (
                <div className="pt-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.winRate}%`,
                        backgroundColor: s.winRate >= 50 ? "#10b981" : "#f43f5e",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Session Comparison SVG Chart + Overlap Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            {t("sessComparisonChart")}
          </h3>
          <SessionComparisonChart stats={stats} />
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {t("sessOverlapTitle")}
          </h3>
          <p className="text-xs text-[--text-muted] mb-4">{t("sessOverlapDesc")}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Overlap */}
            <div className="p-3 rounded-xl border border-amber-500/20" style={{ background: "rgba(245,158,11,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">{t("sessOverlapLabel")}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Trades</span>
                  <span className="text-[--text-primary] font-medium">{overlapStats.overlap.trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">P&L</span>
                  <span className={`font-bold ${overlapStats.overlap.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {overlapStats.overlap.pnl >= 0 ? "+" : ""}{overlapStats.overlap.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Win Rate</span>
                  <span className={overlapStats.overlap.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                    {overlapStats.overlap.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("avgPnlLabel")}</span>
                  <span className={overlapStats.overlap.avg >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {overlapStats.overlap.avg >= 0 ? "+" : ""}{overlapStats.overlap.avg.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Non-overlap */}
            <div className="p-3 rounded-xl border border-[--border]" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[--text-muted]" />
                <span className="text-xs font-medium text-[--text-secondary]">{t("sessNonOverlapLabel")}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Trades</span>
                  <span className="text-[--text-primary] font-medium">{overlapStats.nonOverlap.trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">P&L</span>
                  <span className={`font-bold ${overlapStats.nonOverlap.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {overlapStats.nonOverlap.pnl >= 0 ? "+" : ""}{overlapStats.nonOverlap.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Win Rate</span>
                  <span className={overlapStats.nonOverlap.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                    {overlapStats.nonOverlap.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">{t("avgPnlLabel")}</span>
                  <span className={overlapStats.nonOverlap.avg >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {overlapStats.nonOverlap.avg >= 0 ? "+" : ""}{overlapStats.nonOverlap.avg.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          {t("hourlyHeatmap")}
        </h3>
        <p className="text-xs text-[--text-muted] mb-4">{t("hourlyHeatmapDesc")}</p>
        <HeatmapGrid data={heatmapData} counts={heatmapCounts} />
        <div className="flex items-center gap-4 mt-4 text-[10px] text-[--text-muted]">
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm bg-rose-500 opacity-60" />
            <span>{t("lossLabel")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm bg-gray-700 opacity-20" />
            <span>{t("noTrades")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm bg-emerald-500 opacity-60" />
            <span>{t("profitLabel")}</span>
          </div>
        </div>
      </div>

      {/* Instrument by Session */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-cyan-400" />
          {t("sessInstrumentTitle")}
        </h3>
        <p className="text-xs text-[--text-muted] mb-4">{t("sessInstrumentDesc")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instrumentBySession.map(({ session, instruments }) => {
            if (instruments.length === 0) return null;
            const top5 = instruments.slice(0, 5);
            return (
              <div key={session} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SESSION_COLORS[session].chart }} />
                  <span className="text-xs font-semibold text-[--text-primary]">{session}</span>
                </div>
                <div className="space-y-1">
                  {top5.map((inst) => (
                    <div key={inst.asset} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[--text-primary]">{inst.asset}</span>
                        <span className="text-[--text-muted]">{inst.count} trades</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={inst.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                          {inst.winRate.toFixed(0)}%
                        </span>
                        <span className={`font-medium ${inst.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {inst.pnl >= 0 ? "+" : ""}{inst.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Sessions */}
      {recommendations.length > 0 && (
        <div className="glass rounded-2xl p-6 border border-cyan-500/15">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            {t("sessRecommendTitle")}
          </h3>
          <div className="space-y-3">
            {recommendations.map((s, i) => (
              <div key={s.session} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-[--bg-secondary] text-[--text-muted]"
                }`}>
                  {i + 1}
                </div>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SESSION_COLORS[s.session].chart }} />
                <span className="text-sm font-medium text-[--text-primary] min-w-[80px]">{s.session}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className={s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                    {s.winRate.toFixed(0)}% WR
                  </span>
                  <span className={s.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    moy. {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}
                  </span>
                  <span className="text-[--text-muted]">{s.trades} trades</span>
                </div>
                {i === 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-medium">
                    {t("sessRecommendBest")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Table */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-cyan-400" />
          {t("sessionDetails")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[--text-muted] border-b border-[--border]">
                <th className="pb-3 font-medium">{t("sessionLabel")}</th>
                <th className="pb-3 font-medium">{t("tradeCount")}</th>
                <th className="pb-3 font-medium">{t("winRateLabel")}</th>
                <th className="pb-3 font-medium">{t("avgPnlLabel")}</th>
                <th className="pb-3 font-medium">{t("totalPnlLabel")}</th>
                <th className="pb-3 font-medium">{t("bestTradeLabel")}</th>
                <th className="pb-3 font-medium">{t("worstTradeLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.session} className="border-b border-[--border-subtle]">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SESSION_COLORS[s.session].chart }} />
                      <span className="font-medium text-[--text-primary]">{s.session}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[--text-secondary]">{s.trades}</td>
                  <td className="py-3">
                    <span className={`font-medium ${s.winRate >= 50 ? "text-emerald-400" : s.trades > 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                      {s.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={s.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {s.avgPnl >= 0 ? "+" : ""}{s.avgPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`font-bold ${s.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.totalPnl >= 0 ? "+" : ""}{s.totalPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-emerald-400">
                    {s.bestTrade > 0 ? `+${s.bestTrade.toFixed(2)}` : "-"}
                  </td>
                  <td className="py-3 text-rose-400">
                    {s.worstTrade < 0 ? s.worstTrade.toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Rules */}
      <SessionRulesPanel />
    </div>
  );
}
