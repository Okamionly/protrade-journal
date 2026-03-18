"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { useMemo } from "react";
import {
  Trophy, Flame, Shield, Target, Zap, Award, Lock, Star,
  TrendingUp, TrendingDown, Clock, Crosshair, BarChart3,
  Crown, Gem, Medal, ArrowUpRight, ArrowDownRight, Layers,
  Sunrise, Sparkles, Swords,
} from "lucide-react";

/* ─── helpers ──────────────────────────────────────────── */

function uniqueDays(trades: { date: string }[]) {
  return [...new Set(trades.map((t) => t.date.slice(0, 10)))].sort();
}

function consecutiveTradingDays(trades: { date: string }[]) {
  const days = uniqueDays(trades);
  if (days.length === 0) return 0;
  let streak = 1;
  let best = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diff =
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
      86400000;
    if (diff === 1) {
      streak++;
      if (streak > best) best = streak;
    } else break;
  }
  return streak;
}

function currentConsecutiveDays(trades: { date: string }[]) {
  const days = uniqueDays(trades);
  if (days.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const last = days[days.length - 1];
  const diffToday =
    (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
  if (diffToday > 1) return 0;
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diff =
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
      86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function isThisMonth(d: string) {
  const now = new Date();
  const dt = new Date(d);
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
}

function isThisWeek(d: string) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return new Date(d) >= start;
}

function isLastMonth(d: string) {
  const now = new Date();
  const dt = new Date(d);
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return dt.getMonth() === lastMonth && dt.getFullYear() === lastYear;
}

/* ─── types ────────────────────────────────────────────── */

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  current: number;
  target: number;
  color: string;
  gradient: string;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

/* ─── page ─────────────────────────────────────────────── */

export default function ChallengesPage() {
  const { trades, loading } = useTrades();

  const sorted = useMemo(
    () => [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [trades]
  );

  /* ── challenge computations ── */
  const challenges: Challenge[] = useMemo(() => {
    const monthTrades = sorted.filter((t) => isThisMonth(t.date));
    const weekTrades = sorted.filter((t) => isThisWeek(t.date));

    // Consecutive trading days
    const consDays = currentConsecutiveDays(sorted);

    // Risk master: last 10 trades all under 2R loss
    const last10 = sorted.slice(-10);
    const riskOk = last10.filter((t) => {
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      return isNaN(rr) || t.result >= 0 || Math.abs(t.result) / Math.abs(t.entry - t.sl) <= 2;
    }).length;

    // Win streak
    let winStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].result > 0) winStreak++;
      else break;
    }

    // Monthly profit
    const monthProfit = monthTrades.reduce((s, t) => s + t.result, 0);

    // Discipline: last 20 trades, no trade > 2R loss
    const last20 = sorted.slice(-20);
    const disciplined = last20.filter((t) => {
      if (t.result >= 0) return true;
      const risk = Math.abs(t.entry - t.sl);
      return risk > 0 ? Math.abs(t.result) / risk <= 2 : true;
    }).length;

    // Diversifier: unique assets this week
    const weekAssets = new Set(weekTrades.map((t) => t.asset));

    // Early bird: trades before 10am this month
    const earlyTrades = monthTrades.filter((t) => {
      const h = new Date(t.date).getHours();
      return h < 10;
    }).length;

    // Sniper: trades with R:R > 3 this month
    const sniperTrades = monthTrades.filter((t) => {
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      return !isNaN(rr) && rr > 3 && t.result > 0;
    }).length;

    return [
      {
        id: "consistency",
        title: "Consistency King",
        description: "Trade 5 jours consecutifs",
        icon: <Crown size={20} />,
        current: Math.min(consDays, 5),
        target: 5,
        color: "#f59e0b",
        gradient: "from-amber-500/20 to-amber-600/5",
      },
      {
        id: "risk",
        title: "Risk Master",
        description: "10 trades sous 2% de risque",
        icon: <Shield size={20} />,
        current: Math.min(riskOk, 10),
        target: 10,
        color: "#06b6d4",
        gradient: "from-cyan-500/20 to-cyan-600/5",
      },
      {
        id: "winstreak",
        title: "Win Streak",
        description: "5 trades gagnants d'affilee",
        icon: <Flame size={20} />,
        current: Math.min(winStreak, 5),
        target: 5,
        color: "#ef4444",
        gradient: "from-red-500/20 to-red-600/5",
      },
      {
        id: "profit",
        title: "Profit Target",
        description: "500\u20AC de profit ce mois",
        icon: <Target size={20} />,
        current: Math.min(Math.max(monthProfit, 0), 500),
        target: 500,
        color: "#10b981",
        gradient: "from-emerald-500/20 to-emerald-600/5",
      },
      {
        id: "discipline",
        title: "Discipline",
        description: "20 trades sans perte > 2R",
        icon: <Swords size={20} />,
        current: Math.min(disciplined, 20),
        target: 20,
        color: "#8b5cf6",
        gradient: "from-violet-500/20 to-violet-600/5",
      },
      {
        id: "diversifier",
        title: "Diversifier",
        description: "5 actifs differents cette semaine",
        icon: <Layers size={20} />,
        current: Math.min(weekAssets.size, 5),
        target: 5,
        color: "#3b82f6",
        gradient: "from-blue-500/20 to-blue-600/5",
      },
      {
        id: "earlybird",
        title: "Early Bird",
        description: "3 trades avant 10h ce mois",
        icon: <Sunrise size={20} />,
        current: Math.min(earlyTrades, 3),
        target: 3,
        color: "#f97316",
        gradient: "from-orange-500/20 to-orange-600/5",
      },
      {
        id: "sniper",
        title: "Sniper",
        description: "3 trades avec R:R > 3",
        icon: <Crosshair size={20} />,
        current: Math.min(sniperTrades, 3),
        target: 3,
        color: "#ec4899",
        gradient: "from-pink-500/20 to-pink-600/5",
      },
    ];
  }, [sorted]);

  /* ── XP system ── */
  const { xp, level, title: levelTitle, xpInLevel, xpForLevel } = useMemo(() => {
    let total = 0;
    sorted.forEach((t) => {
      total += 10; // per trade
      if (t.result > 0) total += 25;
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      if (!isNaN(rr) && rr > 2) total += 50;
    });
    // bonus for completed challenges
    const completed = challenges.filter((c) => c.current >= c.target).length;
    total += completed * 100;

    const lvl = Math.floor(total / 500) + 1;
    const titles: [number, string][] = [
      [50, "Legende"], [36, "Master"], [21, "Expert"],
      [11, "Trader"], [6, "Apprenti"], [1, "Debutant"],
    ];
    const t = titles.find(([min]) => lvl >= min)?.[1] || "Debutant";
    const inLevel = total % 500;
    return { xp: total, level: lvl, title: t, xpInLevel: inLevel, xpForLevel: 500 };
  }, [sorted, challenges]);

  /* ── badges ── */
  const badges: Badge[] = useMemo(() => {
    const wins = sorted.filter((t) => t.result > 0).length;
    const totalPnL = sorted.reduce((s, t) => s + t.result, 0);
    const winRate = sorted.length > 0 ? (wins / sorted.length) * 100 : 0;
    const grossWins = sorted.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0);
    const grossLosses = Math.abs(sorted.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0));
    const pf = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

    // Best month PnL
    const months: Record<string, number> = {};
    sorted.forEach((t) => {
      const key = t.date.slice(0, 7);
      months[key] = (months[key] || 0) + t.result;
    });
    const bestMonth = Math.max(0, ...Object.values(months));

    // Diamond score (avg grade proxy): positive PF + high win rate
    const diamondScore = pf > 2 && winRate > 55;

    return [
      { id: "first-trade", title: "First Trade", description: "Passer votre premier trade", icon: <Zap size={20} />, unlocked: sorted.length >= 1, color: "#f59e0b" },
      { id: "10-trades", title: "10 Trades", description: "Completer 10 trades", icon: <BarChart3 size={20} />, unlocked: sorted.length >= 10, color: "#3b82f6" },
      { id: "50-trades", title: "50 Trades", description: "Completer 50 trades", icon: <BarChart3 size={20} />, unlocked: sorted.length >= 50, color: "#8b5cf6" },
      { id: "100-trades", title: "100 Trades", description: "Completer 100 trades", icon: <Trophy size={20} />, unlocked: sorted.length >= 100, color: "#f97316" },
      { id: "first-win", title: "First Win", description: "Gagner votre premier trade", icon: <Star size={20} />, unlocked: wins >= 1, color: "#10b981" },
      { id: "10-wins", title: "10 Wins", description: "Gagner 10 trades", icon: <Star size={20} />, unlocked: wins >= 10, color: "#06b6d4" },
      { id: "winrate-60", title: "Win Rate > 60%", description: "Atteindre 60% de win rate", icon: <TrendingUp size={20} />, unlocked: winRate > 60 && sorted.length >= 10, color: "#10b981" },
      { id: "pf-2", title: "Profit Factor > 2", description: "Profit factor superieur a 2", icon: <Gem size={20} />, unlocked: pf > 2 && sorted.length >= 10, color: "#ec4899" },
      { id: "diamond", title: "Diamond Score", description: "PF > 2 et Win Rate > 55%", icon: <Sparkles size={20} />, unlocked: diamondScore && sorted.length >= 20, color: "#a855f7" },
      { id: "1000-profit", title: "1000\u20AC Profit", description: "Accumuler 1000\u20AC de profit", icon: <Award size={20} />, unlocked: totalPnL >= 1000, color: "#f59e0b" },
      { id: "best-month", title: "Best Month", description: "Mois avec 500\u20AC+ de profit", icon: <Medal size={20} />, unlocked: bestMonth >= 500, color: "#ef4444" },
    ];
  }, [sorted]);

  /* ── streaks ── */
  const streaks = useMemo(() => {
    let curWin = 0, curLoss = 0, bestWin = 0, bestLoss = 0;
    sorted.forEach((t) => {
      if (t.result > 0) { curWin++; curLoss = 0; if (curWin > bestWin) bestWin = curWin; }
      else if (t.result < 0) { curLoss++; curWin = 0; if (curLoss > bestLoss) bestLoss = curLoss; }
      else { curWin = 0; curLoss = 0; }
    });
    return { currentWin: curWin, currentLoss: curLoss, bestWin, bestLoss, consecutiveDays: currentConsecutiveDays(sorted) };
  }, [sorted]);

  /* ── monthly progress ── */
  const monthly = useMemo(() => {
    const mTrades = sorted.filter((t) => isThisMonth(t.date));
    const lmTrades = sorted.filter((t) => isLastMonth(t.date));
    const mWins = mTrades.filter((t) => t.result > 0).length;
    const lmWins = lmTrades.filter((t) => t.result > 0).length;
    const mWinRate = mTrades.length > 0 ? (mWins / mTrades.length) * 100 : 0;
    const lmWinRate = lmTrades.length > 0 ? (lmWins / lmTrades.length) * 100 : 0;
    const mPnL = mTrades.reduce((s, t) => s + t.result, 0);
    const lmPnL = lmTrades.reduce((s, t) => s + t.result, 0);
    return {
      trades: mTrades.length,
      lastTrades: lmTrades.length,
      winRate: mWinRate,
      lastWinRate: lmWinRate,
      pnl: mPnL,
      lastPnl: lmPnL,
    };
  }, [sorted]);

  /* ─── render ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: "var(--border)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const pctBar = (current: number, target: number) => Math.min((current / target) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Trophy className="text-amber-500" size={28} />
            Challenges & Gamification
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Relevez des defis, gagnez de l&apos;XP et debloquez des badges
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass" style={{ border: "1px solid var(--border)" }}>
          <Sparkles size={16} className="text-amber-500" />
          <span className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {badges.filter((b) => b.unlocked).length}/{badges.length} Badges
          </span>
        </div>
      </div>

      {/* XP Bar */}
      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mono text-lg">
              {level}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{levelTitle}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Niveau {level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {xp.toLocaleString()} XP
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {xpInLevel}/{xpForLevel} XP vers niveau {level + 1}
            </p>
          </div>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
            style={{ width: `${(xpInLevel / xpForLevel) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>+10/trade  +25/win  +50/R:R&gt;2  +100/challenge</span>
          <span>{xpForLevel - xpInLevel} XP restants</span>
        </div>
      </div>

      {/* Active Challenges */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Target size={20} className="text-emerald-500" />
          Challenges Actifs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {challenges.map((c) => {
            const pct = pctBar(c.current, c.target);
            const done = c.current >= c.target;
            const nearDone = pct >= 80 && !done;
            return (
              <div
                key={c.id}
                className={`glass rounded-xl p-4 bg-gradient-to-br ${c.gradient} transition-all duration-300 hover:scale-[1.02] ${nearDone ? "animate-pulse" : ""}`}
                style={{ border: `1px solid ${done ? c.color : "var(--border)"}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${c.color}20`, color: c.color }}
                    >
                      {c.icon}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {c.title}
                    </span>
                  </div>
                  {done && <Trophy size={16} className="text-amber-500" />}
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{c.description}</p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="mono text-xs font-medium" style={{ color: c.color }}>
                    {c.current}/{c.target}
                  </span>
                  <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Streaks */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Flame size={20} className="text-red-500" />
          Streaks
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Win Streak",
              value: streaks.currentWin,
              icon: <TrendingUp size={18} />,
              color: "#10b981",
              active: streaks.currentWin >= 3,
            },
            {
              label: "Loss Streak",
              value: streaks.currentLoss,
              icon: <TrendingDown size={18} />,
              color: "#ef4444",
              active: false,
            },
            {
              label: "Best Win Streak",
              value: streaks.bestWin,
              icon: <Crown size={18} />,
              color: "#f59e0b",
              active: false,
            },
            {
              label: "Jours Consecutifs",
              value: streaks.consecutiveDays,
              icon: <Clock size={18} />,
              color: "#8b5cf6",
              active: streaks.consecutiveDays >= 3,
            },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                {s.active && <Flame size={14} className="text-orange-500 animate-pulse" />}
              </div>
              <div className="flex items-center gap-2">
                <div style={{ color: s.color }}>{s.icon}</div>
                <span className="mono text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly Progress */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 size={20} className="text-blue-500" />
          Progression Mensuelle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Trades",
              current: monthly.trades,
              target: 30,
              last: monthly.lastTrades,
              format: (v: number) => `${v}`,
              color: "#3b82f6",
            },
            {
              label: "Win Rate",
              current: monthly.winRate,
              target: 100,
              last: monthly.lastWinRate,
              format: (v: number) => `${v.toFixed(1)}%`,
              color: "#10b981",
            },
            {
              label: "P&L",
              current: monthly.pnl,
              target: 500,
              last: monthly.lastPnl,
              format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}\u20AC`,
              color: monthly.pnl >= 0 ? "#10b981" : "#ef4444",
            },
          ].map((m) => {
            const diff = m.label === "Trades"
              ? m.current - m.last
              : m.label === "Win Rate"
                ? m.current - m.last
                : m.current - m.last;
            const pctDiff = m.last > 0 ? ((diff / m.last) * 100) : 0;
            const up = diff >= 0;
            return (
              <div key={m.label} className="glass rounded-xl p-5" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                  <div className="flex items-center gap-1">
                    {up ? (
                      <ArrowUpRight size={14} className="text-emerald-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                    <span
                      className="mono text-xs font-medium"
                      style={{ color: up ? "#10b981" : "#ef4444" }}
                    >
                      {pctDiff !== 0 ? `${up ? "+" : ""}${pctDiff.toFixed(0)}%` : "-"}
                    </span>
                  </div>
                </div>
                <p className="mono text-xl font-bold mb-3" style={{ color: m.color }}>
                  {m.format(m.current)}
                </p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max((m.current / m.target) * 100, 0), 100)}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Objectif: {m.format(m.target)} {m.label === "P&L" ? "ce mois" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges Gallery */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Award size={20} className="text-purple-500" />
          Galerie de Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`glass rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 ${
                b.unlocked ? "hover:scale-105" : "opacity-40 grayscale"
              }`}
              style={{ border: `1px solid ${b.unlocked ? b.color + "40" : "var(--border)"}` }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2 relative"
                style={{
                  backgroundColor: b.unlocked ? `${b.color}20` : "var(--bg-primary)",
                  color: b.unlocked ? b.color : "var(--text-muted)",
                }}
              >
                {b.unlocked ? b.icon : <Lock size={20} />}
              </div>
              <span className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                {b.title}
              </span>
              <span className="text-[10px] mt-1 leading-tight" style={{ color: "var(--text-muted)" }}>
                {b.description}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
