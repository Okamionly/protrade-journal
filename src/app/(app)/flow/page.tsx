"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Activity, TrendingUp, TrendingDown, Search, RefreshCw,
  Filter, ArrowUpDown, Zap, BarChart3, DollarSign,
  Clock, ChevronUp, ChevronDown, Flame,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FlowEntry {
  id: string;
  time: Date;
  symbol: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  oi: number;
  sentiment: "bullish" | "bearish" | "neutral";
  unusual: boolean;
}

type SortKey = "time" | "symbol" | "premium" | "volume" | "oi";
type SortDir = "asc" | "desc";

// ─── Mock data generation ───────────────────────────────────────────────────

const SYMBOLS = [
  "SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMZN", "META", "MSFT",
  "AMD", "GOOGL", "NFLX", "COIN", "PLTR", "SOFI", "IWM", "GLD",
  "XOM", "JPM", "BAC", "BABA", "DIS", "NIO", "RIVN", "ARM",
];

const STRIKES_MAP: Record<string, number[]> = {
  SPY: [540, 545, 550, 555, 560, 565, 570, 575, 580],
  QQQ: [460, 465, 470, 475, 480, 485, 490, 495, 500],
  AAPL: [210, 215, 220, 225, 230, 235, 240],
  TSLA: [250, 260, 270, 280, 290, 300, 310, 320],
  NVDA: [120, 125, 130, 135, 140, 145, 150],
  AMZN: [185, 190, 195, 200, 205, 210],
  META: [500, 510, 520, 530, 540, 550],
  MSFT: [420, 425, 430, 435, 440, 445, 450],
  AMD: [150, 155, 160, 165, 170, 175, 180],
  GOOGL: [170, 175, 180, 185, 190],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateExpiry(): string {
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * 60) + 1;
  const d = new Date(now.getTime() + daysAhead * 86400000);
  // Find next Friday
  const day = d.getDay();
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

let entryCounter = 0;

function generateEntry(): FlowEntry {
  const symbol = randomFrom(SYMBOLS);
  const type: "CALL" | "PUT" = Math.random() > 0.45 ? "CALL" : "PUT";
  const strikes = STRIKES_MAP[symbol] || [100, 105, 110, 115, 120, 125];
  const strike = randomFrom(strikes);
  const volume = Math.floor(Math.random() * 8000) + 50;
  const oi = Math.floor(Math.random() * 25000) + 200;
  const unusual = volume / oi > 0.8;
  const premium = Math.round((Math.random() * 2000000 + 10000));

  let sentiment: "bullish" | "bearish" | "neutral";
  if (type === "CALL" && volume > 2000) sentiment = "bullish";
  else if (type === "PUT" && volume > 2000) sentiment = "bearish";
  else sentiment = Math.random() > 0.5 ? (type === "CALL" ? "bullish" : "bearish") : "neutral";

  entryCounter++;
  return {
    id: `flow-${Date.now()}-${entryCounter}`,
    time: new Date(),
    symbol,
    type,
    strike,
    expiry: generateExpiry(),
    premium,
    volume,
    oi,
    sentiment,
    unusual,
  };
}

function generateInitialBatch(count: number): FlowEntry[] {
  const entries: FlowEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const entry = generateEntry();
    entry.time = new Date(now - (count - i) * 12000 - Math.random() * 5000);
    entries.push(entry);
  }
  return entries;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPremium(cents: number): string {
  if (cents >= 1000000) return `$${(cents / 100000).toFixed(1)}M`;
  if (cents >= 100000) return `$${(cents / 1000).toFixed(0)}K`;
  if (cents >= 10000) return `$${(cents / 1000).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FlowPage() {
  const { t } = useTranslation();

  const [entries, setEntries] = useState<FlowEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CALL" | "PUT">("ALL");
  const [minPremium, setMinPremium] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize data
  useEffect(() => {
    setEntries(generateInitialBatch(40));
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      const count = Math.floor(Math.random() * 4) + 1;
      const fresh: FlowEntry[] = [];
      for (let i = 0; i < count; i++) fresh.push(generateEntry());
      const freshIds = new Set(fresh.map((e) => e.id));
      setNewIds(freshIds);
      setEntries((prev) => [...fresh, ...prev].slice(0, 200));
      setLastRefresh(new Date());
      // Clear highlight after 3s
      setTimeout(() => setNewIds(new Set()), 3000);
    }, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  // Sort handler
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  // Filtered & sorted entries
  const filtered = useMemo(() => {
    let list = entries;
    if (searchTerm) {
      const q = searchTerm.toUpperCase();
      list = list.filter((e) => e.symbol.includes(q));
    }
    if (typeFilter !== "ALL") {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (minPremium > 0) {
      list = list.filter((e) => e.premium >= minPremium * 1000);
    }
    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "time": cmp = a.time.getTime() - b.time.getTime(); break;
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break;
        case "premium": cmp = a.premium - b.premium; break;
        case "volume": cmp = a.volume - b.volume; break;
        case "oi": cmp = a.oi - b.oi; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [entries, searchTerm, typeFilter, minPremium, sortKey, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const totalVolume = entries.reduce((s, e) => s + e.volume, 0);
    const calls = entries.filter((e) => e.type === "CALL").length;
    const puts = entries.filter((e) => e.type === "PUT").length;
    const pcRatio = calls > 0 ? (puts / calls) : 0;
    const bullish = entries.filter((e) => e.sentiment === "bullish").length;
    const bullishPct = entries.length > 0 ? Math.round((bullish / entries.length) * 100) : 0;
    // Top symbol by volume
    const volBySymbol: Record<string, number> = {};
    for (const e of entries) {
      volBySymbol[e.symbol] = (volBySymbol[e.symbol] || 0) + e.volume;
    }
    let topSymbol = "N/A";
    let topVol = 0;
    for (const [sym, vol] of Object.entries(volBySymbol)) {
      if (vol > topVol) { topVol = vol; topSymbol = sym; }
    }
    return { totalVolume, pcRatio, bullishPct, topSymbol };
  }, [entries]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-violet-400" />
      : <ChevronUp className="w-3 h-3 text-violet-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Activity className="w-7 h-7 text-violet-400" />
            Options Flow
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Flux d&apos;options simulé — activité institutionnelle en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            {formatTime(lastRefresh)}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            className="glass px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{ color: paused ? "rgb(239,68,68)" : "rgb(34,197,94)" }}
          >
            {paused ? (
              <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Pause</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} /> Live</>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Flow Volume */}
        <div className="metric-card glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
              <BarChart3 className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Volume Total</span>
          </div>
          <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>
            {formatVolume(stats.totalVolume)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entries.length} transactions</div>
        </div>

        {/* Put/Call Ratio */}
        <div className="metric-card glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stats.pcRatio > 1 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: stats.pcRatio > 1 ? "rgb(239,68,68)" : "rgb(34,197,94)" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ratio Put/Call</span>
          </div>
          <div className="text-xl font-bold mono" style={{ color: stats.pcRatio > 1 ? "rgb(239,68,68)" : "rgb(34,197,94)" }}>
            {stats.pcRatio.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stats.pcRatio > 1 ? "Sentiment baissier" : "Sentiment haussier"}</div>
        </div>

        {/* Bullish % */}
        <div className="metric-card glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>% Haussier</span>
          </div>
          <div className="text-xl font-bold mono" style={{ color: stats.bullishPct >= 50 ? "rgb(34,197,94)" : "rgb(239,68,68)" }}>
            {stats.bullishPct}%
          </div>
          <div className="w-full h-1.5 rounded-full mt-2" style={{ background: "var(--bg-secondary)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.bullishPct}%`, background: "rgb(34,197,94)" }} />
          </div>
        </div>

        {/* Top Symbol */}
        <div className="metric-card glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Top Symbole</span>
          </div>
          <div className="text-xl font-bold mono" style={{ color: "rgb(245,158,11)" }}>
            {stats.topSymbol}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Plus actif par volume</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Rechercher un symbole..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
              }}
            />
          </div>

          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-primary)" }}>
            {(["ALL", "CALL", "PUT"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setTypeFilter(opt)}
                className="px-3 py-2 text-xs font-medium transition-all"
                style={{
                  background: typeFilter === opt ? (opt === "CALL" ? "rgba(34,197,94,0.2)" : opt === "PUT" ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.2)") : "transparent",
                  color: typeFilter === opt ? (opt === "CALL" ? "rgb(34,197,94)" : opt === "PUT" ? "rgb(239,68,68)" : "rgb(139,92,246)") : "var(--text-muted)",
                }}
              >
                {opt === "ALL" ? "Tous" : opt}
              </button>
            ))}
          </div>

          {/* Min Premium */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Min Premium</span>
            <select
              value={minPremium}
              onChange={(e) => setMinPremium(Number(e.target.value))}
              className="rounded-lg px-2 py-2 text-xs"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <option value={0}>Tous</option>
              <option value={25}>$25K+</option>
              <option value={50}>$50K+</option>
              <option value={100}>$100K+</option>
              <option value={500}>$500K+</option>
              <option value={1000}>$1M+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flow Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                {[
                  { key: "time" as SortKey, label: "Heure" },
                  { key: "symbol" as SortKey, label: "Symbole" },
                  { key: null, label: "Type" },
                  { key: null, label: "Strike" },
                  { key: null, label: "Expiration" },
                  { key: "premium" as SortKey, label: "Premium" },
                  { key: "volume" as SortKey, label: "Volume" },
                  { key: "oi" as SortKey, label: "OI" },
                  { key: null, label: "Sentiment" },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-xs font-semibold text-left ${col.key ? "cursor-pointer select-none hover:opacity-80" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                    Aucune transaction ne correspond aux filtres
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 80).map((entry) => {
                  const isCall = entry.type === "CALL";
                  const typeColor = isCall ? "rgb(34,197,94)" : "rgb(239,68,68)";
                  const isNew = newIds.has(entry.id);
                  const rowBg = entry.unusual
                    ? "rgba(245,158,11,0.06)"
                    : isNew
                    ? "rgba(139,92,246,0.06)"
                    : "transparent";

                  return (
                    <tr
                      key={entry.id}
                      className="transition-all duration-300"
                      style={{
                        borderBottom: "1px solid var(--border-primary)",
                        background: rowBg,
                      }}
                    >
                      {/* Time */}
                      <td className="px-4 py-3">
                        <span className="text-xs mono" style={{ color: "var(--text-secondary)" }}>
                          {formatTime(entry.time)}
                        </span>
                      </td>

                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {entry.symbol}
                        </span>
                        {entry.unusual && (
                          <Flame className="w-3.5 h-3.5 inline ml-1.5 text-amber-400" />
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: isCall ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: typeColor,
                          }}
                        >
                          {entry.type}
                        </span>
                      </td>

                      {/* Strike */}
                      <td className="px-4 py-3">
                        <span className="mono text-sm" style={{ color: "var(--text-primary)" }}>
                          ${entry.strike}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {entry.expiry}
                        </span>
                      </td>

                      {/* Premium */}
                      <td className="px-4 py-3">
                        <span className="mono text-sm font-semibold" style={{ color: entry.premium >= 500000 ? "rgb(245,158,11)" : "var(--text-primary)" }}>
                          {formatPremium(entry.premium)}
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="px-4 py-3">
                        <span className="mono text-sm" style={{ color: entry.unusual ? "rgb(245,158,11)" : "var(--text-primary)" }}>
                          {entry.volume.toLocaleString()}
                        </span>
                      </td>

                      {/* OI */}
                      <td className="px-4 py-3">
                        <span className="mono text-sm" style={{ color: "var(--text-secondary)" }}>
                          {entry.oi.toLocaleString()}
                        </span>
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background:
                              entry.sentiment === "bullish"
                                ? "rgba(34,197,94,0.15)"
                                : entry.sentiment === "bearish"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(156,163,175,0.15)",
                            color:
                              entry.sentiment === "bullish"
                                ? "rgb(34,197,94)"
                                : entry.sentiment === "bearish"
                                ? "rgb(239,68,68)"
                                : "var(--text-muted)",
                          }}
                        >
                          {entry.sentiment === "bullish" ? "Haussier" : entry.sentiment === "bearish" ? "Baissier" : "Neutre"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} affichee{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Flame className="w-3 h-3 text-amber-400" />
            = Activite inhabituelle (Volume/OI &gt; 80%)
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Legende :</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "rgba(34,197,94,0.3)" }} />
            CALL (Haussier)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.3)" }} />
            PUT (Baissier)
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-400" />
            Activite inhabituelle
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            Rafraichissement auto toutes les 15s
          </span>
        </div>
      </div>
    </div>
  );
}
