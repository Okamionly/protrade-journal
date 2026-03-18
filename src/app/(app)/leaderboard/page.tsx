"use client";

import { useTrades } from "@/hooks/useTrades";
import { useState, useMemo } from "react";
import { Trophy, Medal, Crown, TrendingUp, ArrowUp, Flame, ChevronUp, ChevronDown, Star, Zap, Target, Users, Filter } from "lucide-react";

interface MockTrader {
  id: number;
  name: string;
  avatar: string;
  gradient: string;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  pnl: number;
  streak: number;
  badge: string;
  badgeColor: string;
  isCurrentUser?: boolean;
}

const GRADIENTS = [
  "from-cyan-500 to-blue-600", "from-purple-500 to-pink-600", "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600", "from-rose-500 to-red-600", "from-indigo-500 to-violet-600",
  "from-lime-500 to-green-600", "from-fuchsia-500 to-purple-600", "from-sky-500 to-cyan-600",
  "from-yellow-500 to-amber-600", "from-teal-500 to-emerald-600", "from-pink-500 to-rose-600",
  "from-blue-500 to-indigo-600", "from-orange-500 to-red-600", "from-violet-500 to-purple-600",
  "from-red-500 to-pink-600", "from-green-500 to-lime-600", "from-cyan-400 to-sky-600",
];

function getBadge(winRate: number): { label: string; color: string } {
  if (winRate >= 75) return { label: "Diamond", color: "text-cyan-300" };
  if (winRate >= 65) return { label: "Gold", color: "text-yellow-400" };
  if (winRate >= 55) return { label: "Silver", color: "text-gray-300" };
  if (winRate >= 45) return { label: "Bronze", color: "text-orange-400" };
  return { label: "Iron", color: "text-gray-500" };
}

function generateMockTraders(userPnl: number, userWinRate: number, userTrades: number): MockTrader[] {
  const names = [
    "TradeurParis", "GoldHunter", "ScalpMaster", "SwingKing", "ForexPro_FR",
    "AlphaTrader", "LeBullish", "CryptoLyon", "PipsMaster", "NightScalper",
    "MarseilleFX", "QuantumTrade", "EliteSwing", "DayTrader_06", "BordeauxFX",
    "IceBreaker", "SniperEntry",
  ];
  const traders: MockTrader[] = names.map((name, i) => {
    const winRate = Math.round(45 + Math.random() * 35);
    const pnl = Math.round(-2000 + Math.random() * 18000);
    const badge = getBadge(winRate);
    return {
      id: i + 1, name, avatar: name[0], gradient: GRADIENTS[i % GRADIENTS.length],
      winRate, profitFactor: +(0.6 + Math.random() * 2.4).toFixed(2),
      totalTrades: Math.round(30 + Math.random() * 300), pnl,
      streak: Math.round(Math.random() * 14), badge: badge.label, badgeColor: badge.color,
    };
  });
  const userBadge = getBadge(userWinRate);
  traders.push({
    id: 99, name: "Moi", avatar: "M", gradient: "from-cyan-400 to-blue-500",
    winRate: userWinRate, profitFactor: +(userWinRate > 50 ? 1.2 + Math.random() : 0.7 + Math.random() * 0.5).toFixed(2),
    totalTrades: userTrades, pnl: userPnl, streak: Math.round(Math.random() * 8),
    badge: userBadge.label, badgeColor: userBadge.color, isCurrentUser: true,
  });
  return traders;
}

type SortKey = "winRate" | "pnl" | "profitFactor" | "totalTrades";
const TIME_TABS = ["Cette semaine", "Ce mois", "All-time"] as const;
const MARKET_TABS = ["Tous", "Forex", "Indices", "Crypto", "Actions"] as const;

const ACHIEVEMENTS = [
  { label: "Meilleur win streak: 14", user: "ScalpMaster", icon: Flame, color: "text-orange-400" },
  { label: "Plus gros trade: +5 230€", user: "GoldHunter", icon: TrendingUp, color: "text-emerald-400" },
  { label: "Meilleur win rate: 82%", user: "TradeurParis", icon: Target, color: "text-cyan-400" },
  { label: "Plus de trades: 342", user: "NightScalper", icon: Zap, color: "text-yellow-400" },
  { label: "Profit Factor 3.2", user: "EliteSwing", icon: Star, color: "text-purple-400" },
  { label: "10 jours consécutifs", user: "ForexPro_FR", icon: Crown, color: "text-amber-400" },
];

export default function LeaderboardPage() {
  const { trades, loading } = useTrades();
  const [timeTab, setTimeTab] = useState<typeof TIME_TABS[number]>("All-time");
  const [marketTab, setMarketTab] = useState<typeof MARKET_TABS[number]>("Tous");
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [sortAsc, setSortAsc] = useState(false);

  const userStats = useMemo(() => {
    if (!trades.length) return { pnl: 1250, winRate: 58, total: 47 };
    const wins = trades.filter((t) => t.result > 0).length;
    const pnl = trades.reduce((s, t) => s + t.result, 0);
    return { pnl: Math.round(pnl), winRate: Math.round((wins / trades.length) * 100), total: trades.length };
  }, [trades]);

  const sorted = useMemo(() => {
    const all = generateMockTraders(userStats.pnl, userStats.winRate, userStats.total);
    all.sort((a, b) => (sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
    return all;
  }, [userStats, sortKey, sortAsc]);

  const userRank = sorted.findIndex((t) => t.isCurrentUser) + 1;
  const aboveUser = userRank > 1 ? sorted[userRank - 2] : null;
  const pnlGap = aboveUser ? aboveUser.pnl - sorted[userRank - 1].pnl : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col ? (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} className="opacity-30" />
  );

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>Chargement...</div>;

  const top3 = sorted.slice(0, 3);

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Trophy size={28} className="text-yellow-400" /> Classement
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            <Users size={14} className="inline mr-1" />{sorted.length} traders actifs
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-primary)" }}>
          {TIME_TABS.map((tab) => (
            <button key={tab} onClick={() => setTimeTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeTab === tab ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={timeTab !== tab ? { color: "var(--text-muted)" } : undefined}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-primary)" }}>
          {MARKET_TABS.map((tab) => (
            <button key={tab} onClick={() => setMarketTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${marketTab === tab ? "bg-cyan-500/20 text-cyan-400" : ""}`}
              style={marketTab !== tab ? { color: "var(--text-muted)" } : undefined}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4 items-end">
        {[top3[1], top3[0], top3[2]].map((trader, idx) => {
          const pos = [2, 1, 3][idx];
          const isGold = pos === 1;
          const medal = pos === 1 ? "from-yellow-400 to-amber-600" : pos === 2 ? "from-gray-300 to-gray-500" : "from-orange-400 to-orange-700";
          const height = isGold ? "min-h-[220px]" : "min-h-[180px]";
          const glow = isGold ? "shadow-[0_0_40px_rgba(234,179,8,0.25)]" : "";
          return (
            <div key={trader.id}
              className={`glass rounded-2xl p-4 flex flex-col items-center justify-center text-center relative ${height} ${glow} ${trader.isCurrentUser ? "ring-2 ring-cyan-400/60" : ""}`}>
              {isGold && <Crown size={24} className="text-yellow-400 absolute -top-3" />}
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${trader.gradient} flex items-center justify-center text-white font-bold text-lg mb-2 ${isGold ? "w-16 h-16 text-xl ring-2 ring-yellow-400/50" : ""}`}>
                {trader.avatar}
              </div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${medal} text-white mb-1`}>#{pos}</div>
              <p className="font-semibold text-sm truncate w-full" style={{ color: "var(--text-primary)" }}>
                {trader.name}{trader.isCurrentUser && " (vous)"}
              </p>
              <p className="mono text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{trader.winRate}% WR</p>
              <p className={`mono text-sm font-bold mt-1 ${trader.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {trader.pnl >= 0 ? "+" : ""}{trader.pnl.toLocaleString("fr-FR")}&euro;
              </p>
              <span className={`text-[10px] mt-1 ${trader.badgeColor}`}>{trader.badge}</span>
            </div>
          );
        })}
      </div>

      {/* Achievements Showcase */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <Star size={16} className="text-yellow-400" /> Records de la communaut&eacute;
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {ACHIEVEMENTS.map((a, i) => (
            <div key={i} className="glass rounded-xl px-4 py-3 flex-shrink-0 min-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <a.icon size={16} className={a.color} />
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.label}</span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{a.user}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>#</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Trader</th>
                <th className="text-right px-4 py-3 text-xs font-medium cursor-pointer select-none" style={{ color: "var(--text-muted)" }} onClick={() => handleSort("winRate")}>
                  <span className="inline-flex items-center gap-1">Win Rate <SortIcon col="winRate" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium cursor-pointer select-none" style={{ color: "var(--text-muted)" }} onClick={() => handleSort("profitFactor")}>
                  <span className="inline-flex items-center gap-1">PF <SortIcon col="profitFactor" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium cursor-pointer select-none hidden sm:table-cell" style={{ color: "var(--text-muted)" }} onClick={() => handleSort("totalTrades")}>
                  <span className="inline-flex items-center gap-1">Trades <SortIcon col="totalTrades" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium cursor-pointer select-none" style={{ color: "var(--text-muted)" }} onClick={() => handleSort("pnl")}>
                  <span className="inline-flex items-center gap-1">P&amp;L <SortIcon col="pnl" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Streak</th>
                <th className="text-right px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Badge</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((trader, i) => {
                const rank = i + 1;
                const isUser = trader.isCurrentUser;
                return (
                  <tr key={trader.id}
                    className={`transition-colors hover:bg-white/[0.02] ${isUser ? "bg-cyan-500/[0.06]" : ""}`}
                    style={{ borderBottom: "1px solid var(--border)", ...(isUser ? { boxShadow: "inset 3px 0 0 0 rgb(6 182 212)" } : {}) }}>
                    <td className="px-4 py-3 font-medium" style={{ color: rank <= 3 ? "#facc15" : "var(--text-muted)" }}>
                      {rank <= 3 ? <Medal size={16} className={rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-orange-400"} /> : rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${trader.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {trader.avatar}
                        </div>
                        <span className="font-medium truncate" style={{ color: isUser ? "#22d3ee" : "var(--text-primary)" }}>
                          {trader.name}{isUser && " (vous)"}
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 mono" style={{ color: "var(--text-primary)" }}>{trader.winRate}%</td>
                    <td className="text-right px-4 py-3 mono" style={{ color: trader.profitFactor >= 1.5 ? "#10b981" : trader.profitFactor >= 1 ? "var(--text-secondary)" : "#ef4444" }}>
                      {trader.profitFactor}
                    </td>
                    <td className="text-right px-4 py-3 mono hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{trader.totalTrades}</td>
                    <td className={`text-right px-4 py-3 mono font-semibold ${trader.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {trader.pnl >= 0 ? "+" : ""}{trader.pnl.toLocaleString("fr-FR")}&euro;
                    </td>
                    <td className="text-right px-4 py-3 hidden md:table-cell">
                      {trader.streak > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Flame size={12} className="text-orange-400" />
                          <span className="mono" style={{ color: "var(--text-primary)" }}>{trader.streak}</span>
                        </span>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs ${trader.badgeColor}`}>{trader.badge}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Position Card - Fixed Bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-40">
        <div className="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ borderTop: "2px solid rgb(6 182 212 / 0.4)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-cyan-400">#{userRank}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Votre position</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">sur {sorted.length}</span>
              </div>
              {aboveUser && pnlGap > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <ArrowUp size={12} className="inline text-cyan-400 mr-1" />
                  {pnlGap.toLocaleString("fr-FR")}&euro; de plus pour monter au rang #{userRank - 1}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Win Rate</p>
              <p className="mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>{userStats.winRate}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>P&amp;L</p>
              <p className={`mono text-sm font-bold ${userStats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {userStats.pnl >= 0 ? "+" : ""}{userStats.pnl.toLocaleString("fr-FR")}&euro;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
