"use client";

import { useTrades, useUser, Trade } from "@/hooks/useTrades";
import { DashboardCards } from "@/components/DashboardCards";
import { EquityChart, StrategyChart } from "@/components/ChartComponents";
import { TradeForm } from "@/components/TradeForm";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { ForexSessions } from "@/components/ForexSessions";
import { calculateRR, formatDate, computeStats } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Camera, Target, Flame, TrendingUp, TrendingDown, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Trophy, Skull, PieChart, Activity, ChevronRight, Percent, Zap, Crosshair, DollarSign, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";

export default function DashboardPage() {
  const { trades, loading, addTrade, deleteTrade, updateTrade } = useTrades();
  const { user, updateBalance } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("monthlyGoal");
    if (saved) setMonthlyGoal(parseFloat(saved));
  }, []);

  const handleAddTrade = async (trade: Record<string, unknown>) => {
    const ok = await addTrade(trade);
    if (ok) toast(t("tradeCreated"), "success");
    else toast(t("tradeCreateError"), "error");
    return ok;
  };

  const handleUpdateTrade = async (trade: Record<string, unknown>) => {
    if (!editingTrade) return false;
    const ok = await updateTrade(editingTrade.id, trade);
    if (ok) toast(t("tradeEdited"), "success");
    else toast(t("tradeEditError"), "error");
    return ok;
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      const ok = await deleteTrade(id);
      if (ok) toast(t("tradeDeleted"), "success");
      else toast(t("tradeDeleteError"), "error");
    }
  };

  const saveBalance = async () => {
    const value = parseFloat(balanceInput);
    if (!isNaN(value) && value >= 0) {
      const ok = await updateBalance(value);
      if (ok) {
        toast(t("balanceUpdated"), "success");
        setShowBalanceModal(false);
      } else {
        toast(t("balanceUpdateError"), "error");
      }
    }
  };

  // Fix #2: Validate goal input - prevent negative numbers and NaN
  const saveGoal = () => {
    const value = parseFloat(goalInput);
    if (isNaN(value) || value <= 0) {
      toast(t("enterValidNumber"), "error");
      return;
    }
    setMonthlyGoal(value);
    localStorage.setItem("monthlyGoal", String(value));
    setShowGoalModal(false);
    toast(t("goalUpdated"), "success");
  };

  const handleGoalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string for clearing, but prevent negative
    if (val === "" || val === "-") {
      setGoalInput(val === "-" ? "" : val);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setGoalInput(val);
    }
  };

  // Monthly P&L - Fix #4: handle edge cases
  const now = new Date();
  const monthlyTrades = trades.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyPnL = monthlyTrades.reduce((s, t) => s + t.result, 0);
  const goalProgress = monthlyGoal > 0 ? Math.min(Math.max((monthlyPnL / monthlyGoal) * 100, 0), 100) : 0;

  // Fix #1: Show loading skeleton
  if (loading) return <DashboardSkeleton />;

  const recentTrades = trades.slice(0, 10);

  // Fix #5: Quick Stats calculations
  const monthlyWins = monthlyTrades.filter((t) => t.result > 0);
  const monthlyWinRate = monthlyTrades.length > 0 ? (monthlyWins.length / monthlyTrades.length) * 100 : 0;
  const monthlyBestTrade = monthlyTrades.length > 0 ? Math.max(...monthlyTrades.map((t) => t.result)) : 0;

  // Current streak calculation
  let currentStreak = 0;
  let streakType: "win" | "loss" | "none" = "none";
  const sortedForStreak = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const t of sortedForStreak) {
    if (currentStreak === 0) {
      streakType = t.result > 0 ? "win" : t.result < 0 ? "loss" : "none";
      if (streakType !== "none") currentStreak = 1;
    } else if ((streakType === "win" && t.result > 0) || (streakType === "loss" && t.result < 0)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // === Daily P&L Card data ===
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter(t => new Date(t.date).toISOString().slice(0, 10) === todayStr);
  const todayPnL = todayTrades.reduce((s, t) => s + t.result, 0);
  const todayWins = todayTrades.filter(t => t.result > 0).length;
  const todayWinRate = todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : 0;
  const todayBestTrade = todayTrades.length > 0 ? Math.max(...todayTrades.map(t => t.result)) : 0;

  // Yesterday comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayTrades = trades.filter(t => new Date(t.date).toISOString().slice(0, 10) === yesterdayStr);
  const yesterdayPnL = yesterdayTrades.reduce((s, t) => s + t.result, 0);
  const dailyDelta = todayPnL - yesterdayPnL;

  // Daily goal progress (daily = monthly / trading days ~22)
  const dailyGoal = monthlyGoal > 0 ? monthlyGoal / 22 : 0;
  const dailyGoalProgress = dailyGoal > 0 ? Math.min(Math.max((todayPnL / dailyGoal) * 100, 0), 100) : 0;

  // Risk exposure today (sum of absolute risk on today's trades)
  const balance = user?.balance ?? 25000;
  const todayRiskExposure = todayTrades.reduce((s, t) => {
    const risk = Math.abs(t.entry - t.sl) * t.lots;
    return s + risk;
  }, 0);
  const todayRiskPercent = balance > 0 ? (todayRiskExposure / balance) * 100 : 0;

  // === Weekly sparkline data (last 7 days P&L) ===
  const last7Days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const dayPnL = trades
      .filter(t => new Date(t.date).toISOString().slice(0, 10) === dStr)
      .reduce((s, t) => s + t.result, 0);
    last7Days.push(dayPnL);
  }
  const sparklineMax = Math.max(...last7Days.map(Math.abs), 1);
  const weeklyTotal = last7Days.reduce((a, b) => a + b, 0);

  return (
    <>
      {/* === PROMINENT DAILY P&L CARD === */}
      <div className="glass rounded-2xl p-6 mb-6" style={{ border: "1px solid", borderColor: todayPnL >= 0 ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)" }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Main P&L */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${todayPnL >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
              <DollarSign className={`w-8 h-8 ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                {t("pnlToday")}
              </div>
              <div className={`text-4xl font-black mono ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {todayPnL >= 0 ? "+" : ""}{todayPnL.toFixed(2)}
              </div>
              {/* vs hier */}
              <div className="flex items-center gap-1 mt-1">
                {dailyDelta >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className={`text-xs font-semibold ${dailyDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {dailyDelta >= 0 ? "+" : ""}{dailyDelta.toFixed(2)} {t("vsYesterday")}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Today's sub-stats */}
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("trades")}</div>
              <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>{todayTrades.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("winRate")}</div>
              <div className={`text-2xl font-bold mono ${todayWinRate >= 50 ? "text-emerald-400" : todayWinRate > 0 ? "text-amber-400" : ""}`}
                style={todayTrades.length === 0 ? { color: "var(--text-muted)" } : {}}>
                {todayWinRate.toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("best")}</div>
              <div className={`text-2xl font-bold mono ${todayBestTrade > 0 ? "text-emerald-400" : ""}`}
                style={todayBestTrade <= 0 ? { color: "var(--text-muted)" } : {}}>
                {todayBestTrade > 0 ? `+${todayBestTrade.toFixed(0)}` : "---"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("risk")}</div>
              <div className="text-2xl font-bold mono" style={{ color: todayRiskPercent <= 1 ? "#34d399" : todayRiskPercent <= 3 ? "#fbbf24" : "#f87171" }}>
                {todayRiskPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Daily goal progress bar */}
        {monthlyGoal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              <span>{t("dailyGoalProgress")}</span>
              <span>{todayPnL.toFixed(0)} / {dailyGoal.toFixed(0)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${todayPnL >= dailyGoal ? "bg-emerald-500" : todayPnL >= 0 ? "bg-blue-500" : "bg-rose-500"}`}
                style={{ width: `${Math.max(dailyGoalProgress, 0)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <DashboardCards
        trades={trades}
        balance={user?.balance ?? 25000}
        onEditBalance={() => {
          setBalanceInput(String(user?.balance ?? 25000));
          setShowBalanceModal(true);
        }}
      />

      {/* Fix #5: Quick Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("tradesCount")}</span>
          </div>
          <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
            {monthlyTrades.length}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("winRate")}</span>
          </div>
          <div className={`text-2xl font-bold mono ${monthlyWinRate >= 50 ? "text-emerald-400" : monthlyWinRate > 0 ? "text-amber-400" : ""}`}
            style={monthlyWinRate === 0 ? { color: "var(--text-muted)" } : {}}>
            {monthlyWinRate.toFixed(0)}%
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("bestTrade")}</span>
          </div>
          <div className={`text-2xl font-bold mono ${monthlyBestTrade > 0 ? "text-emerald-400" : ""}`}
            style={monthlyBestTrade <= 0 ? { color: "var(--text-muted)" } : {}}>
            {monthlyBestTrade > 0 ? `+${monthlyBestTrade.toFixed(0)}` : "---"}
          </div>
        </div>

        {/* Enhanced Streak with flame icon */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {streakType === "win" ? (
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            ) : (
              <Zap className={`w-4 h-4 ${streakType === "loss" ? "text-rose-400" : "text-gray-400"}`} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("currentStreak")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold mono ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : ""}`}
              style={streakType === "none" ? { color: "var(--text-muted)" } : {}}>
              {currentStreak > 0 ? `${currentStreak} ${streakType === "win" ? "W" : "L"}` : "---"}
            </div>
            {streakType === "win" && currentStreak >= 3 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold animate-pulse">
                🔥
              </span>
            )}
          </div>
        </div>

        {/* Weekly Sparkline card */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("last7Days")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-lg font-bold mono ${weeklyTotal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {weeklyTotal >= 0 ? "+" : ""}{weeklyTotal.toFixed(0)}
            </div>
          </div>
          {/* Mini sparkline SVG */}
          <div className="mt-2">
            <svg width="100%" height="32" viewBox="0 0 140 32" preserveAspectRatio="none" className="overflow-visible">
              {/* Zero line */}
              <line x1="0" y1="16" x2="140" y2="16" stroke="var(--text-muted)" strokeWidth="0.5" opacity="0.3" />
              {/* Sparkline bars */}
              {last7Days.map((val, i) => {
                const barHeight = sparklineMax > 0 ? (Math.abs(val) / sparklineMax) * 14 : 0;
                const isPositive = val >= 0;
                const x = i * 20 + 2;
                const y = isPositive ? 16 - barHeight : 16;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width="16"
                    height={Math.max(barHeight, 1)}
                    rx="2"
                    fill={isPositive ? "#34d399" : "#f87171"}
                    opacity={i === 6 ? 1 : 0.6}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Objectif mensuel - Fix #4: handles edge cases */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">{t("monthlyGoal")}</h3>
          </div>
          <button
            onClick={() => { setGoalInput(String(monthlyGoal || "")); setShowGoalModal(true); }}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            {monthlyGoal > 0 ? t("editGoal") : t("setGoal")}
          </button>
        </div>
        {monthlyGoal > 0 ? (() => {
          const remaining = monthlyGoal - monthlyPnL;
          const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
          const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : remaining;
          const onTrack = monthlyPnL >= (monthlyGoal * (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()));
          const goalReached = monthlyPnL >= monthlyGoal;
          return (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className={monthlyPnL >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {monthlyPnL >= 0 ? "+" : ""}{monthlyPnL.toFixed(2)}€
                </span>
                <span className="text-[--text-muted]">{t("goalLabel")} {monthlyGoal.toFixed(2)}€</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${goalReached ? "bg-emerald-500" : monthlyPnL >= 0 ? "bg-blue-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.max(goalProgress, 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[--text-muted]">
                  {monthlyTrades.length === 0
                    ? t("noTradesThisMonth")
                    : `${goalProgress.toFixed(1)}% — ${monthlyTrades.length} trade${monthlyTrades.length > 1 ? "s" : ""}`}
                </p>
                {!goalReached && remaining > 0 ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${onTrack ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {onTrack ? "En avance" : `${remaining.toFixed(0)}€ restants`}
                  </span>
                ) : goalReached ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    Objectif atteint !
                  </span>
                ) : null}
              </div>
              {!goalReached && remaining > 0 && daysLeft > 0 && (
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  ~{dailyNeeded.toFixed(0)}€/jour nécessaires • {daysLeft} jours restants
                </p>
              )}
            </>
          );
        })() : (
          <p className="text-[--text-muted] text-sm">{t("noTradesThisMonth")}</p>
        )}
      </div>

      {/* Streak + Forex Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Win/Loss Streak */}
        {(() => {
          let currentStreak = 0;
          let streakType: "win" | "loss" | "none" = "none";
          const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          for (const t of sorted) {
            if (currentStreak === 0) {
              streakType = t.result > 0 ? "win" : t.result < 0 ? "loss" : "none";
              currentStreak = 1;
            } else if ((streakType === "win" && t.result > 0) || (streakType === "loss" && t.result < 0)) {
              currentStreak++;
            } else {
              break;
            }
          }
          let bestWin = 0, bestLoss = 0, tempWin = 0, tempLoss = 0;
          for (const t of sorted.reverse()) {
            if (t.result > 0) { tempWin++; tempLoss = 0; bestWin = Math.max(bestWin, tempWin); }
            else if (t.result < 0) { tempLoss++; tempWin = 0; bestLoss = Math.max(bestLoss, tempLoss); }
            else { tempWin = 0; tempLoss = 0; }
          }
          return (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">{t("currentStreak")}</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streakType === "win" ? "bg-emerald-500/20" : streakType === "loss" ? "bg-rose-500/20" : "bg-gray-500/20"}`}>
                  <Flame className={`w-6 h-6 ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : "text-[--text-muted]"}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold mono ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : "text-[--text-muted]"}`}>
                    {currentStreak}
                  </div>
                  <div className="text-xs text-[--text-muted]">
                    {streakType === "win" ? t("victories") : streakType === "loss" ? t("defeats") : "---"}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-[--text-muted]">{t("bestStreakW")}</span><span className="text-emerald-400 font-bold">{bestWin}</span></div>
                <div className="flex justify-between"><span className="text-[--text-muted]">{t("worstStreakL")}</span><span className="text-rose-400 font-bold">{bestLoss}</span></div>
              </div>
            </div>
          );
        })()}

        {/* Quick Stats - Enhanced */}
        <div className="glass rounded-2xl p-4">
          <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">{t("today")}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {todayPnL >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
              <span className={`text-xl font-bold mono ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {todayPnL >= 0 ? "+" : ""}{todayPnL.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-[--text-muted]">{todayTrades.length} trades -- {todayWins} {t("winners")}</div>
            <div className="text-xs text-[--text-muted]">
              WR: {todayWinRate.toFixed(0)}%
            </div>
            {todayBestTrade > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{t("bestLabel")} +{todayBestTrade.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className={`w-3 h-3 ${todayRiskPercent <= 1 ? "text-emerald-400" : todayRiskPercent <= 3 ? "text-amber-400" : "text-rose-400"}`} />
              <span style={{ color: todayRiskPercent <= 1 ? "#34d399" : todayRiskPercent <= 3 ? "#fbbf24" : "#f87171" }}>
                {t("riskLabel")} {todayRiskPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Forex Sessions */}
        <ForexSessions />
      </div>

      {/* Best/Worst Trade + Key Metrics */}
      {(() => {
        const stats = computeStats(trades);
        const balance = user?.balance ?? 25000;
        const sorted = [...trades].sort((a, b) => b.result - a.result);
        const bestTrade = sorted.length > 0 ? sorted[0] : null;
        const worstTrade = sorted.length > 0 ? sorted[sorted.length - 1] : null;
        const avgRisk = trades.length > 0
          ? trades.reduce((s, t) => {
              const risk = Math.abs(t.entry - t.sl) * t.lots;
              return s + (balance > 0 ? (risk / balance) * 100 : 0);
            }, 0) / trades.length
          : 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Best Trade */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider">{t("bestTrade")}</h4>
              </div>
              {bestTrade && bestTrade.result > 0 ? (
                <>
                  <div className="text-2xl font-bold mono text-emerald-400">+{bestTrade.result.toFixed(2)}</div>
                  <div className="text-xs text-[--text-muted] mt-1">{bestTrade.asset} -- {formatDate(bestTrade.date)}</div>
                </>
              ) : (
                <div className="text-sm text-[--text-muted]">{t("noBestTrade")}</div>
              )}
            </div>

            {/* Worst Trade */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Skull className="w-5 h-5 text-rose-400" />
                </div>
                <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider">{t("worstTrade")}</h4>
              </div>
              {worstTrade && worstTrade.result < 0 ? (
                <>
                  <div className="text-2xl font-bold mono text-rose-400">{worstTrade.result.toFixed(2)}</div>
                  <div className="text-xs text-[--text-muted] mt-1">{worstTrade.asset} -- {formatDate(worstTrade.date)}</div>
                </>
              ) : (
                <div className="text-sm text-[--text-muted]">{t("noWorstTrade")}</div>
              )}
            </div>

            {/* Sharpe Ratio & Profit Factor */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider">{t("keyRatios")}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[--text-muted]">{t("sharpeRatio")}</span>
                  <span className={`text-lg font-bold mono ${stats.sharpeRatio >= 1 ? "text-emerald-400" : stats.sharpeRatio >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                    {stats.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[--text-muted]">{t("profitFactor")}</span>
                  <span className={`text-lg font-bold mono ${stats.profitFactor >= 1.5 ? "text-emerald-400" : stats.profitFactor >= 1 ? "text-amber-400" : "text-rose-400"}`}>
                    {stats.profitFactor === Infinity ? "inf" : stats.profitFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk per Trade */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider">{t("riskPerTrade")}</h4>
              </div>
              <div className="text-2xl font-bold mono" style={{ color: avgRisk <= 1 ? "#34d399" : avgRisk <= 2 ? "#fbbf24" : "#f87171" }}>
                {avgRisk.toFixed(2)}%
              </div>
              <div className="text-xs text-[--text-muted] mt-1">
                {avgRisk <= 1 ? t("conservative") : avgRisk <= 2 ? t("moderate") : t("aggressive")} -- {trades.length} trades
              </div>
            </div>
          </div>
        );
      })()}

      {/* Asset Breakdown */}
      {trades.length > 0 && (() => {
        const assetMap: Record<string, { pnl: number; count: number; wins: number }> = {};
        trades.forEach((t) => {
          if (!assetMap[t.asset]) assetMap[t.asset] = { pnl: 0, count: 0, wins: 0 };
          assetMap[t.asset].pnl += t.result;
          assetMap[t.asset].count++;
          if (t.result > 0) assetMap[t.asset].wins++;
        });
        const assetEntries = Object.entries(assetMap).sort((a, b) => b[1].pnl - a[1].pnl);
        const maxPnl = Math.max(...assetEntries.map(([, v]) => Math.abs(v.pnl)), 1);

        return (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("assetBreakdown")}</h3>
            </div>
            <div className="space-y-3">
              {assetEntries.map(([asset, data]) => {
                const wr = data.count > 0 ? ((data.wins / data.count) * 100).toFixed(0) : "0";
                const barWidth = (Math.abs(data.pnl) / maxPnl) * 100;
                return (
                  <div key={asset} className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{asset}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                          {data.count} trades
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[--text-muted]">WR {wr}%</span>
                        <span className={`font-bold mono text-sm ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${data.pnl >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Weekly Comparison */}
      {(() => {
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - dayOfWeek + 1);
        thisWeekStart.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setMilliseconds(-1);

        const thisWeekTrades = trades.filter(t => new Date(t.date) >= thisWeekStart);
        const lastWeekTrades = trades.filter(t => { const d = new Date(t.date); return d >= lastWeekStart && d <= lastWeekEnd; });

        const twPnL = thisWeekTrades.reduce((s, t) => s + t.result, 0);
        const lwPnL = lastWeekTrades.reduce((s, t) => s + t.result, 0);
        const twWins = thisWeekTrades.filter(t => t.result > 0).length;
        const lwWins = lastWeekTrades.filter(t => t.result > 0).length;
        const twWR = thisWeekTrades.length > 0 ? (twWins / thisWeekTrades.length) * 100 : 0;
        const lwWR = lastWeekTrades.length > 0 ? (lwWins / lastWeekTrades.length) * 100 : 0;

        const metrics = [
          { label: "P&L", current: twPnL, previous: lwPnL, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}` },
          { label: "Trades", current: thisWeekTrades.length, previous: lastWeekTrades.length, format: (v: number) => String(v) },
          { label: "Win Rate", current: twWR, previous: lwWR, format: (v: number) => `${v.toFixed(0)}%` },
          { label: "Avg P&L", current: thisWeekTrades.length ? twPnL / thisWeekTrades.length : 0, previous: lastWeekTrades.length ? lwPnL / lastWeekTrades.length : 0, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}` },
        ];

        return (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("weeklyComparison")}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map(({ label, current, previous, format }) => {
                const delta = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
                const improved = current >= previous;
                return (
                  <div key={label} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="text-xl font-bold mono" style={{ color: current >= 0 || label === "Trades" || label === "Win Rate" ? "var(--text-primary)" : "#ef4444" }}>
                      {format(current)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {improved ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                      <span className={`text-xs font-medium ${improved ? "text-emerald-400" : "text-rose-400"}`}>
                        {Math.abs(delta).toFixed(0)}% {t("vsPrevWeek")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("equityCurve")}</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">{t("strategyBreakdown")}</h3>
          <StrategyChart trades={trades} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">{t("recentTrades")}</h3>
          <div className="flex items-center gap-3">
            <Link
              href="/journal"
              className="text-sm text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
            >
              {t("viewAll")}
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              {t("newTrade")}
            </button>
          </div>
        </div>

        {/* Fix #3: Better empty state */}
        {trades.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {t("startJournal")}
            </h4>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              {t("startJournalDesc")}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary px-6 py-3 rounded-xl text-white font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t("addFirstTrade")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[--text-muted] text-sm border-b border-[--border]">
                  <th className="pb-3 font-medium">{t("dateCol")}</th>
                  <th className="pb-3 font-medium">{t("assetCol")}</th>
                  <th className="pb-3 font-medium">{t("type")}</th>
                  <th className="pb-3 font-medium">{t("entry")}</th>
                  <th className="pb-3 font-medium">{t("exit")}</th>
                  <th className="pb-3 font-medium">{t("screenshotsCol")}</th>
                  <th className="pb-3 font-medium">{t("rrCol")}</th>
                  <th className="pb-3 font-medium">P&L</th>
                  <th className="pb-3 font-medium">{t("actionsCol")}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentTrades.map((trade) => {
                  const isWin = trade.result > 0;
                  const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                  return (
                    <tr key={trade.id} className="trade-row border-b border-[--border]">
                      <td className="py-4 mono text-[--text-muted]">{formatDate(trade.date)}</td>
                      <td className="py-4 font-medium">{trade.asset}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-4 mono">{trade.entry}</td>
                      <td className="py-4 mono">{trade.exit || "-"}</td>
                      <td className="py-4">
                        {trade.screenshots.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            <Camera className="w-3 h-3 mr-1" />
                            {trade.screenshots.length}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="py-4 mono text-[--text-muted]">1:{rr}</td>
                      <td className={`py-4 mono font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {isWin ? "+" : ""}{trade.result}
                      </td>
                      <td className="py-4 flex gap-2">
                        <button onClick={() => { setEditingTrade(trade); }} className="text-blue-400 hover:text-blue-300">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(trade.id)} className="text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <TradeForm onSubmit={handleAddTrade} onClose={() => setShowForm(false)} />}
      {editingTrade && <TradeForm onSubmit={handleUpdateTrade} onClose={() => setEditingTrade(null)} editTrade={editingTrade} />}

      {/* Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{t("editBalance")}</h3>
            <p className="text-sm text-[--text-muted] mb-4">{t("editBalanceDesc")}</p>
            <input
              type="number"
              step="0.01"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="Ex: 25000"
              className="modal-input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveBalance()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBalanceModal(false)} className="flex-1 py-2 rounded-lg border border-[--border] hover:bg-[--bg-hover] transition">
                {t("cancel")}
              </button>
              <button onClick={saveBalance} className="flex-1 py-2 rounded-lg btn-primary text-white font-medium">
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal - Fix #2: validates input */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{t("monthlyGoalTitle")}</h3>
            <p className="text-sm text-[--text-muted] mb-4">{t("monthlyGoalDesc")}</p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={goalInput}
              onChange={handleGoalInputChange}
              placeholder="Ex: 500"
              className="modal-input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            />
            {goalInput !== "" && (isNaN(parseFloat(goalInput)) || parseFloat(goalInput) <= 0) && (
              <p className="text-xs text-rose-400 mb-3">{t("enterValidNumber")}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowGoalModal(false)} className="flex-1 py-2 rounded-lg border border-[--border] hover:bg-[--bg-hover] transition">
                {t("cancel")}
              </button>
              <button onClick={saveGoal} className="flex-1 py-2 rounded-lg btn-primary text-white font-medium">
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
