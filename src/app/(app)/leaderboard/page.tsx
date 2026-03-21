"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Trophy, Users, Medal, Crown, TrendingUp, Flame, Star, Target,
  ArrowUp, ArrowDown, Minus, ChevronDown, X, BarChart3, Percent,
  Activity, Zap, Award, Filter, Clock, Shield, Crosshair,
  Sparkles, Eye, GitCompare, User,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

type Instrument = "all" | "forex" | "crypto" | "indices" | "actions";
type TimePeriod = "week" | "month" | "all-time";
type RankCategory = "pnl" | "winrate" | "profit-factor" | "consistency" | "streak" | "rr";

interface Achievement {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface TraderData {
  id: number;
  name: string;
  avatar: string;
  country: string;
  pnl: number;
  winRate: number;
  profitFactor: number;
  consistency: number;
  streak: number;
  rr: number;
  totalTrades: number;
  favoriteInstrument: string;
  rankChange: number;
  achievements: string[];
  instruments: Instrument[];
  weekPnl: number;
  monthPnl: number;
  weekWinRate: number;
  monthWinRate: number;
  weekProfitFactor: number;
  monthProfitFactor: number;
  weekConsistency: number;
  monthConsistency: number;
  weekStreak: number;
  monthStreak: number;
  weekRr: number;
  monthRr: number;
}

/* ═══════════════════════════════════════════════════════════
   Constants & Mock Data
   ═══════════════════════════════════════════════════════════ */

const ACHIEVEMENTS: Record<string, Achievement> = {
  "10k-club": { id: "10k-club", label: "10K Club", icon: Sparkles, color: "#f59e0b" },
  "win-streak-10": { id: "win-streak-10", label: "10 Wins", icon: Flame, color: "#ef4444" },
  "consistency-king": { id: "consistency-king", label: "Régulier", icon: Shield, color: "#8b5cf6" },
  "sharpshooter": { id: "sharpshooter", label: "Sniper", icon: Crosshair, color: "#10b981" },
  "diamond-hands": { id: "diamond-hands", label: "Diamant", icon: Award, color: "#06b6d4" },
  "risk-master": { id: "risk-master", label: "Risk Master", icon: Target, color: "#f97316" },
  "century": { id: "century", label: "100 Trades", icon: Zap, color: "#eab308" },
  "profit-machine": { id: "profit-machine", label: "Machine", icon: Activity, color: "#22c55e" },
};

const RANK_CATEGORIES: { key: RankCategory; label: string; icon: React.ElementType; suffix: string }[] = [
  { key: "pnl", label: "P&L", icon: TrendingUp, suffix: " $" },
  { key: "winrate", label: "Win Rate", icon: Percent, suffix: "%" },
  { key: "profit-factor", label: "Profit Factor", icon: BarChart3, suffix: "" },
  { key: "consistency", label: "Consistance", icon: Shield, suffix: "%" },
  { key: "streak", label: "Streak", icon: Flame, suffix: "" },
  { key: "rr", label: "R:R moyen", icon: Target, suffix: "" },
];

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "all-time", label: "Tout temps" },
];

const INSTRUMENT_FILTERS: { key: Instrument; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
  { key: "indices", label: "Indices" },
  { key: "actions", label: "Actions" },
];

const CURRENT_USER_ID = 7;

function generateTraders(): TraderData[] {
  const names = [
    "Alexandre D.", "Sarah M.", "Julien P.", "Camille R.", "Thomas L.",
    "Marie K.", "Vous", "Antoine B.", "Léa F.", "Nicolas V.",
    "Emma C.", "Lucas G.", "Chloé S.", "Maxime T.", "Inès W.",
    "Hugo A.", "Manon Z.", "Raphaël E.", "Jade N.", "Gabriel H.",
  ];
  const countries = ["🇫🇷", "🇧🇪", "🇨🇭", "🇨🇦", "🇫🇷", "🇫🇷", "🇫🇷", "🇫🇷", "🇧🇪", "🇨🇭", "🇫🇷", "🇨🇦", "🇫🇷", "🇧🇪", "🇫🇷", "🇨🇭", "🇫🇷", "🇧🇪", "🇫🇷", "🇨🇦"];
  const favInstruments = ["EUR/USD", "BTC/USD", "NAS100", "AAPL", "GBP/JPY", "ETH/USD", "EUR/USD", "SP500", "XAU/USD", "SOL/USD", "DAX40", "TSLA", "USD/CHF", "BTC/USD", "CAC40", "EUR/GBP", "ADA/USD", "NAS100", "AMZN", "USD/JPY"];
  const instrumentSets: Instrument[][] = [
    ["forex", "indices"], ["crypto"], ["indices", "forex"], ["actions"], ["forex"],
    ["crypto", "forex"], ["forex", "indices", "crypto"], ["indices"], ["forex"], ["crypto"],
    ["indices"], ["actions", "indices"], ["forex"], ["crypto"], ["indices", "forex"],
    ["forex"], ["crypto"], ["indices"], ["actions"], ["forex"],
  ];
  const achievementSets = [
    ["10k-club", "sharpshooter", "profit-machine"], ["win-streak-10", "diamond-hands"], ["consistency-king", "century"],
    ["risk-master", "sharpshooter"], ["10k-club", "consistency-king", "century", "profit-machine"],
    ["diamond-hands", "win-streak-10"], ["sharpshooter", "century"], ["10k-club", "risk-master"],
    ["consistency-king"], ["win-streak-10", "diamond-hands", "profit-machine"],
    ["century", "sharpshooter"], ["risk-master"], ["10k-club", "consistency-king"],
    ["win-streak-10"], ["diamond-hands", "century"], ["sharpshooter", "risk-master"],
    ["10k-club"], ["consistency-king", "century"], ["profit-machine"], ["win-streak-10", "sharpshooter"],
  ];

  return names.map((name, i) => {
    const base = (20 - i) * 500 + Math.floor(Math.random() * 2000);
    return {
      id: i,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s/g, "")}`,
      country: countries[i],
      pnl: base + Math.floor(Math.random() * 3000) - 500,
      winRate: Math.min(95, 55 + Math.floor(Math.random() * 30) + (20 - i) * 0.8),
      profitFactor: +(1.2 + Math.random() * 2.5 + (20 - i) * 0.05).toFixed(2),
      consistency: Math.min(98, 40 + Math.floor(Math.random() * 40) + (20 - i) * 1.2),
      streak: Math.floor(Math.random() * 15) + (20 - i > 10 ? 5 : 1),
      rr: +(1.0 + Math.random() * 3.0).toFixed(2),
      totalTrades: 50 + Math.floor(Math.random() * 400),
      favoriteInstrument: favInstruments[i],
      rankChange: Math.floor(Math.random() * 7) - 3,
      achievements: achievementSets[i],
      instruments: instrumentSets[i],
      weekPnl: Math.floor(base * 0.15 + Math.random() * 800 - 200),
      monthPnl: Math.floor(base * 0.45 + Math.random() * 1500 - 300),
      weekWinRate: Math.min(100, 50 + Math.floor(Math.random() * 35)),
      monthWinRate: Math.min(100, 52 + Math.floor(Math.random() * 32)),
      weekProfitFactor: +(1.0 + Math.random() * 3.0).toFixed(2),
      monthProfitFactor: +(1.1 + Math.random() * 2.8).toFixed(2),
      weekConsistency: Math.min(100, 35 + Math.floor(Math.random() * 50)),
      monthConsistency: Math.min(100, 40 + Math.floor(Math.random() * 45)),
      weekStreak: Math.floor(Math.random() * 8),
      monthStreak: Math.floor(Math.random() * 12),
      weekRr: +(0.8 + Math.random() * 3.5).toFixed(2),
      monthRr: +(1.0 + Math.random() * 3.0).toFixed(2),
    };
  });
}

/* ═══════════════════════════════════════════════════════════
   Utility helpers
   ═══════════════════════════════════════════════════════════ */

function getValue(trader: TraderData, category: RankCategory, period: TimePeriod): number {
  if (period === "week") {
    const map: Record<RankCategory, number> = {
      pnl: trader.weekPnl, winrate: trader.weekWinRate, "profit-factor": trader.weekProfitFactor,
      consistency: trader.weekConsistency, streak: trader.weekStreak, rr: trader.weekRr,
    };
    return map[category];
  }
  if (period === "month") {
    const map: Record<RankCategory, number> = {
      pnl: trader.monthPnl, winrate: trader.monthWinRate, "profit-factor": trader.monthProfitFactor,
      consistency: trader.monthConsistency, streak: trader.monthStreak, rr: trader.monthRr,
    };
    return map[category];
  }
  const map: Record<RankCategory, number> = {
    pnl: trader.pnl, winrate: trader.winRate, "profit-factor": trader.profitFactor,
    consistency: trader.consistency, streak: trader.streak, rr: trader.rr,
  };
  return map[category];
}

function formatValue(val: number, category: RankCategory): string {
  if (category === "pnl") return `${val >= 0 ? "+" : ""}${val.toLocaleString("fr-FR")} $`;
  if (category === "winrate" || category === "consistency") return `${val.toFixed(1)}%`;
  if (category === "profit-factor" || category === "rr") return val.toFixed(2);
  if (category === "streak") return `${val} wins`;
  return String(val);
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs font-semibold animate-pulse">
      <ArrowUp className="w-3 h-3" /> {change}
    </span>
  );
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-rose-400 text-xs font-semibold animate-pulse">
      <ArrowDown className="w-3 h-3" /> {Math.abs(change)}
    </span>
  );
  return (
    <span className="inline-flex items-center text-[--text-muted] text-xs">
      <Minus className="w-3 h-3" />
    </span>
  );
}

function AchievementBadges({ ids, compact = false }: { ids: string[]; compact?: boolean }) {
  const maxShow = compact ? 3 : ids.length;
  const shown = ids.slice(0, maxShow);
  const extra = ids.length - maxShow;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {shown.map((id) => {
        const a = ACHIEVEMENTS[id];
        if (!a) return null;
        const Icon = a.icon;
        return (
          <span key={id} title={a.label}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}30` }}>
            <Icon className="w-2.5 h-2.5" />
            {!compact && <span>{a.label}</span>}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="text-[10px] text-[--text-muted]">+{extra}</span>
      )}
    </div>
  );
}

function MiniProfile({ trader, onClose }: { trader: TraderData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute z-50 left-0 top-full mt-2 w-64 glass rounded-xl p-4 shadow-2xl border border-white/10"
      style={{ animation: "fadeIn 0.15s ease-out" }}>
      <div className="flex items-center gap-3 mb-3">
        <img src={trader.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-yellow-400/30" />
        <div>
          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {trader.country} {trader.name}
          </div>
          <div className="text-[10px] text-[--text-muted]">{trader.totalTrades} trades</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[--text-muted]">Win Rate</div>
          <div className="font-bold text-emerald-400">{trader.winRate.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[--text-muted]">P&L total</div>
          <div className="font-bold text-emerald-400">+{trader.pnl.toLocaleString("fr-FR")} $</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[--text-muted]">Instrument favori</div>
          <div className="font-bold" style={{ color: "var(--text-primary)" }}>{trader.favoriteInstrument}</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[--text-muted]">Profit Factor</div>
          <div className="font-bold text-sky-400">{trader.profitFactor}</div>
        </div>
      </div>
      {trader.achievements.length > 0 && (
        <div className="mt-3">
          <AchievementBadges ids={trader.achievements} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Comparison Modal
   ═══════════════════════════════════════════════════════════ */

function CompareModal({
  trader, currentUser, onClose,
}: { trader: TraderData; currentUser: TraderData; onClose: () => void }) {
  const stats: { label: string; key: RankCategory; icon: React.ElementType }[] = [
    { label: "P&L", key: "pnl", icon: TrendingUp },
    { label: "Win Rate", key: "winrate", icon: Percent },
    { label: "Profit Factor", key: "profit-factor", icon: BarChart3 },
    { label: "Consistance", key: "consistency", icon: Shield },
    { label: "Streak", key: "streak", icon: Flame },
    { label: "R:R moyen", key: "rr", icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease-out" }}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Comparaison</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-[--text-muted]" />
          </button>
        </div>

        {/* Avatars */}
        <div className="flex items-center justify-around mb-6">
          <div className="text-center">
            <img src={currentUser.avatar} alt="" className="w-14 h-14 rounded-full border-2 border-sky-400 mx-auto mb-1" />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Vous</div>
          </div>
          <span className="text-lg font-bold text-[--text-muted]">VS</span>
          <div className="text-center">
            <img src={trader.avatar} alt="" className="w-14 h-14 rounded-full border-2 border-yellow-400 mx-auto mb-1" />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{trader.name}</div>
          </div>
        </div>

        {/* Stats bars */}
        <div className="space-y-4">
          {stats.map(({ label, key, icon: Icon }) => {
            const myVal = getValue(currentUser, key, "all-time");
            const theirVal = getValue(trader, key, "all-time");
            const max = Math.max(myVal, theirVal, 0.01);
            const myPct = (myVal / max) * 100;
            const theirPct = (theirVal / max) * 100;
            const iWin = myVal >= theirVal;

            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-bold mono ${iWin ? "text-emerald-400" : "text-[--text-secondary]"}`}>
                    {formatValue(myVal, key)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[--text-muted]">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`font-bold mono ${!iWin ? "text-emerald-400" : "text-[--text-secondary]"}`}>
                    {formatValue(theirVal, key)}
                  </span>
                </div>
                <div className="flex items-center gap-1 h-3">
                  <div className="flex-1 flex justify-end">
                    <div className="h-full rounded-l-full transition-all duration-700"
                      style={{
                        width: `${myPct}%`,
                        background: iWin ? "linear-gradient(90deg, transparent, #10b981)" : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15))",
                      }} />
                  </div>
                  <div className="w-px h-full bg-white/20" />
                  <div className="flex-1">
                    <div className="h-full rounded-r-full transition-all duration-700"
                      style={{
                        width: `${theirPct}%`,
                        background: !iWin ? "linear-gradient(-90deg, transparent, #10b981)" : "linear-gradient(-90deg, transparent, rgba(255,255,255,0.15))",
                      }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          {(() => {
            let wins = 0;
            stats.forEach(({ key }) => {
              if (getValue(currentUser, key, "all-time") >= getValue(trader, key, "all-time")) wins++;
            });
            const ratio = wins / stats.length;
            if (ratio > 0.5) return (
              <p className="text-sm text-emerald-400 font-semibold">
                Vous menez dans {wins}/{stats.length} catégories
              </p>
            );
            if (ratio < 0.5) return (
              <p className="text-sm text-amber-400 font-semibold">
                {trader.name} mène dans {stats.length - wins}/{stats.length} catégories
              </p>
            );
            return <p className="text-sm text-sky-400 font-semibold">Match nul !</p>;
          })()}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Podium Component
   ═══════════════════════════════════════════════════════════ */

function Podium({ top3, category }: { top3: TraderData[]; category: RankCategory }) {
  if (top3.length < 3) return null;

  const podiumConfig = [
    { idx: 1, label: "2e", height: "h-20", border: "border-gray-300", bg: "rgba(192,192,192,0.15)", textColor: "text-gray-300", size: "w-16 h-16", crown: false },
    { idx: 0, label: "1er", height: "h-28", border: "border-yellow-400", bg: "rgba(234,179,8,0.15)", textColor: "text-yellow-400", size: "w-20 h-20", crown: true },
    { idx: 2, label: "3e", height: "h-14", border: "border-orange-400", bg: "rgba(251,146,60,0.15)", textColor: "text-orange-400", size: "w-14 h-14", crown: false },
  ];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 mb-2">
      {podiumConfig.map(({ idx, label, height, border, bg, textColor, size, crown }) => {
        const trader = top3[idx];
        const val = getValue(trader, category, "all-time");
        return (
          <div key={idx} className="flex flex-col items-center" style={{ animation: `slideUp 0.4s ease-out ${idx * 0.1}s both` }}>
            {/* Crown */}
            {crown && <Crown className="w-6 h-6 text-yellow-400 mb-1 animate-bounce" />}

            {/* Avatar */}
            <div className="relative mb-2">
              <img src={trader.avatar} alt={trader.name}
                className={`${size} rounded-full border-[3px] ${border} shadow-lg`} />
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${textColor}`}
                style={{ background: bg, border: `1px solid rgba(255,255,255,0.1)` }}>
                {idx + 1}
              </div>
            </div>

            {/* Name */}
            <span className="text-xs font-bold mb-0.5 truncate max-w-[80px]" style={{ color: "var(--text-primary)" }}>
              {trader.name}
            </span>
            <span className={`text-xs font-bold mono ${textColor}`}>
              {formatValue(val, category)}
            </span>

            {/* Podium bar */}
            <div className={`w-20 sm:w-24 ${height} rounded-t-xl mt-2 flex items-center justify-center`}
              style={{ background: bg, border: `1px solid rgba(255,255,255,0.05)`, borderBottom: "none" }}>
              <span className={`text-lg font-black ${textColor} opacity-50`}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Category Medal Badges (Top performers)
   ═══════════════════════════════════════════════════════════ */

function CategoryMedals({ traders, period }: { traders: TraderData[]; period: TimePeriod }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-5 h-5 text-yellow-400" />
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Meilleurs par catégorie</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {RANK_CATEGORIES.map(({ key, label, icon: Icon }) => {
          const sorted = [...traders].sort((a, b) => getValue(b, key, period) - getValue(a, key, period));
          const best = sorted[0];
          if (!best) return null;
          return (
            <div key={key} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <img src={best.avatar} alt="" className="w-8 h-8 rounded-full border border-yellow-400/30" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Icon className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-[--text-muted] truncate">{label}</span>
                </div>
                <div className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{best.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function LeaderboardPage() {
  const [category, setCategory] = useState<RankCategory>("pnl");
  const [period, setPeriod] = useState<TimePeriod>("all-time");
  const [instrument, setInstrument] = useState<Instrument>("all");
  const [hoverTrader, setHoverTrader] = useState<number | null>(null);
  const [compareTrader, setCompareTrader] = useState<TraderData | null>(null);

  const allTraders = useMemo(() => generateTraders(), []);

  const filteredTraders = useMemo(() => {
    let list = allTraders;
    if (instrument !== "all") {
      list = list.filter((t) => t.instruments.includes(instrument));
    }
    return [...list].sort((a, b) => getValue(b, category, period) - getValue(a, category, period));
  }, [allTraders, category, period, instrument]);

  const currentUser = allTraders.find((t) => t.id === CURRENT_USER_ID)!;
  const userRank = filteredTraders.findIndex((t) => t.id === CURRENT_USER_ID) + 1;
  const top3 = filteredTraders.slice(0, 3);

  const catInfo = RANK_CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div className="text-center pt-6">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Classement
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto text-sm">
          Comparez-vous aux meilleurs traders de la communauté MarketPhase.
        </p>
      </div>

      {/* Time period tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {TIME_PERIODS.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                period === key
                  ? "text-yellow-400 shadow-lg"
                  : "text-[--text-muted] hover:text-[--text-secondary]"
              }`}
              style={period === key ? { background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.2)" } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category + Instrument filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category pills */}
        <div className="flex-1 flex flex-wrap gap-2">
          {RANK_CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setCategory(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                category === key
                  ? "text-yellow-400"
                  : "text-[--text-muted] hover:text-[--text-secondary]"
              }`}
              style={category === key
                ? { background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.2)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Instrument filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[--text-muted]" />
          <div className="flex gap-1">
            {INSTRUMENT_FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setInstrument(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  instrument === key
                    ? "text-sky-400"
                    : "text-[--text-muted] hover:text-[--text-secondary]"
                }`}
                style={instrument === key
                  ? { background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="glass rounded-2xl p-6 pt-4 overflow-hidden">
        <Podium top3={top3} category={category} />
      </div>

      {/* Your rank card */}
      {userRank > 0 && (
        <div className="glass rounded-2xl p-4 border-2"
          style={{ borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.05)" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-sky-400"
              style={{ background: "rgba(14,165,233,0.15)" }}>
              #{userRank}
            </div>
            <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-sky-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {currentUser.country} Vous
                </span>
                <RankChangeIndicator change={currentUser.rankChange} />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-sky-400 font-bold mono">
                  {formatValue(getValue(currentUser, category, period), category)}
                </span>
                <AchievementBadges ids={currentUser.achievements} compact />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[--text-muted]">sur {filteredTraders.length} traders</div>
              <div className="text-xs font-bold" style={{ color: userRank <= 3 ? "#eab308" : userRank <= 10 ? "#10b981" : "var(--text-secondary)" }}>
                {userRank <= 3 ? "Top 3" : userRank <= 10 ? "Top 10" : `Top ${Math.ceil((userRank / filteredTraders.length) * 100)}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category medals */}
      <CategoryMedals traders={filteredTraders} period={period} />

      {/* Leaderboard table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <catInfo.icon className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Classement {catInfo.label}
            </span>
          </div>
          <span className="text-[11px] text-[--text-muted]">{filteredTraders.length} traders</span>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {filteredTraders.map((trader, i) => {
            const rank = i + 1;
            const isCurrentUser = trader.id === CURRENT_USER_ID;
            const val = getValue(trader, category, period);
            const isHovered = hoverTrader === trader.id;

            return (
              <div key={trader.id}
                className={`relative flex items-center gap-3 px-5 py-3 transition-all duration-200 cursor-pointer ${
                  isCurrentUser
                    ? "bg-sky-400/[0.06]"
                    : "hover:bg-white/[0.03]"
                }`}
                onMouseEnter={() => setHoverTrader(trader.id)}
                onMouseLeave={() => setHoverTrader(null)}
                onClick={() => {
                  if (!isCurrentUser) setCompareTrader(trader);
                }}
                style={{ animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.03, 0.6)}s both` }}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {rank === 1 && <span className="text-lg">🥇</span>}
                  {rank === 2 && <span className="text-lg">🥈</span>}
                  {rank === 3 && <span className="text-lg">🥉</span>}
                  {rank > 3 && (
                    <span className="text-sm font-bold mono text-[--text-muted]">#{rank}</span>
                  )}
                </div>

                {/* Rank change */}
                <div className="w-8 flex-shrink-0">
                  <RankChangeIndicator change={trader.rankChange} />
                </div>

                {/* Avatar */}
                <img src={trader.avatar} alt={trader.name}
                  className={`w-9 h-9 rounded-full flex-shrink-0 border-2 transition-all ${
                    rank === 1 ? "border-yellow-400" :
                    rank === 2 ? "border-gray-300" :
                    rank === 3 ? "border-orange-400" :
                    isCurrentUser ? "border-sky-400" : "border-white/10"
                  }`} />

                {/* Name + achievements */}
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {trader.country} {isCurrentUser ? "Vous" : trader.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-400/20 text-sky-400">
                        MOI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[--text-muted]">{trader.totalTrades} trades</span>
                    <span className="text-[10px] text-[--text-muted]">{trader.favoriteInstrument}</span>
                    <AchievementBadges ids={trader.achievements} compact />
                  </div>

                  {/* Mini profile on hover */}
                  {isHovered && !isCurrentUser && (
                    <MiniProfile trader={trader} onClose={() => setHoverTrader(null)} />
                  )}
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-bold mono ${
                    rank <= 3 ? "text-yellow-400" : isCurrentUser ? "text-sky-400" : "text-emerald-400"
                  }`}>
                    {formatValue(val, category)}
                  </div>
                  {!isCurrentUser && (
                    <button
                      className="text-[10px] text-[--text-muted] hover:text-sky-400 transition-colors flex items-center gap-0.5 ml-auto mt-0.5"
                      onClick={(e) => { e.stopPropagation(); setCompareTrader(trader); }}>
                      <GitCompare className="w-2.5 h-2.5" />
                      Comparer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compare modal */}
      {compareTrader && (
        <CompareModal
          trader={compareTrader}
          currentUser={currentUser}
          onClose={() => setCompareTrader(null)}
        />
      )}
    </div>
  );
}
