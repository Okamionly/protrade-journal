"use client";

import { useTrades, useUser, Trade } from "@/hooks/useTrades";
import { DashboardCards } from "@/components/DashboardCards";
import { EquityChart, StrategyChart } from "@/components/ChartComponents";
import { TradeForm } from "@/components/TradeForm";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { ForexSessions } from "@/components/ForexSessions";
import { calculateRR, formatDate, computeStats } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, Camera, Target, Flame, TrendingUp, TrendingDown, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Trophy, Skull, PieChart, Activity, ChevronRight, Percent, Zap, Crosshair, DollarSign, AlertTriangle, Share2, Star, Crown, ExternalLink, Lightbulb, Clock, X, Flag, Brain, ClipboardEdit } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";
import { ShareStatsCard } from "@/components/ShareStatsCard";
import { MorningBriefing } from "@/components/MorningBriefing";
import { TradingWrapped } from "@/components/TradingWrapped";
import { DailyGoalTracker } from "@/components/DailyGoalTracker";
import { EmptyDayMotivation } from "@/components/EmptyDayMotivation";
import { MarketPhaseBadgeCompact } from "@/components/MarketPhaseBadge";
import { BatchRecap, useUnreviewedCount } from "@/components/BatchRecap";
import { SmartAlertCenter } from "@/components/SmartAlertCenter";
import { MarketRegimeWidget } from "@/components/MarketRegimeWidget";


/* ─── Trade du Jour Types ──────────────────────────────── */

interface TradeDuJourData {
  messageId: string;
  author: { id: string; name: string | null; email: string };
  trade: {
    id: string;
    asset: string;
    direction: string;
    result: number;
    strategy: string | null;
  };
  votes: number;
  hasVoted: boolean;
}

/* ─── Trade du Jour Dashboard Widget ───────────────────── */

function TradeDuJourWidget() {
  const [winner, setWinner] = useState<TradeDuJourData | null>(null);
  const [loadingTdj, setLoadingTdj] = useState(true);

  useEffect(() => {
    fetch("/api/trade-of-day")
      .then((r) => r.json())
      .then((data) => {
        if (data.winner) setWinner(data.winner);
      })
      .catch(() => {})
      .finally(() => setLoadingTdj(false));
  }, []);

  if (loadingTdj) {
    return (
      <div className="glass rounded-2xl p-5 mb-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-[--bg-secondary] mb-3" />
        <div className="h-6 w-48 rounded bg-[--bg-secondary]" />
      </div>
    );
  }

  if (!winner) {
    return (
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03))",
          border: "1px solid rgba(234,179,8,0.2)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Crown className="w-5 h-5" style={{ color: "#eab308" }} />
          <span className="font-bold text-sm" style={{ color: "#eab308" }}>
            Trade du Jour
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Pas encore de trade du jour
        </p>
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-xs mt-2 hover:underline"
          style={{ color: "#eab308" }}
        >
          Voter dans la communauté
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  const trade = winner.trade;
  const isBuy = trade.direction?.toUpperCase() === "BUY" || trade.direction?.toUpperCase() === "LONG";

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.10), rgba(234,179,8,0.03))",
        border: "1px solid rgba(234,179,8,0.25)",
        boxShadow: "0 2px 12px rgba(234,179,8,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(234,179,8,0.15)" }}
          >
            <Crown className="w-4 h-4" style={{ color: "#eab308" }} />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: "#eab308" }}>
              Trade du Jour
            </span>
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <Star className="w-3 h-3" style={{ color: "#eab308" }} />
              {winner.votes} vote{winner.votes > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <span
          className="text-xl font-black mono"
          style={{ color: trade.result >= 0 ? "#10b981" : "#ef4444" }}
        >
          {trade.result >= 0 ? "+" : ""}{trade.result.toFixed(2)}
        </span>
      </div>

      <div
        className="rounded-xl p-3 mb-3"
        style={{ background: "var(--bg-secondary)", border: "1px solid rgba(234,179,8,0.1)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {trade.asset}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
              style={{
                background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: isBuy ? "#10b981" : "#ef4444",
                border: `1px solid ${isBuy ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              {isBuy ? "LONG" : "SHORT"}
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            par {winner.author.name || "Anonyme"}
          </span>
        </div>
        {trade.strategy && (
          <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
            Stratégie : {trade.strategy}
          </p>
        )}
      </div>

      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline transition"
        style={{ color: "#eab308" }}
      >
        Voir dans la communauté
        <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

/* ─── Prochain Objectif Widget ─────────────────────────── */

function ProchainObjectifWidget({ monthlyGoal, monthlyPnL, trades }: { monthlyGoal: number; monthlyPnL: number; trades: Trade[] }) {
  if (monthlyGoal <= 0) return null;

  const remaining = monthlyGoal - monthlyPnL;
  if (remaining <= 0) return null; // goal already reached

  const progress = Math.min(Math.max((monthlyPnL / monthlyGoal) * 100, 0), 100);
  const percentRemaining = 100 - progress;

  // Estimate date based on daily average
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysSinceStart = Math.max(Math.floor((now.getTime() - monthStart.getTime()) / 86400000), 1);
  const dailyAvg = monthlyPnL / daysSinceStart;
  const daysToGoal = dailyAvg > 0 ? Math.ceil(remaining / dailyAvg) : null;
  const estimatedDate = daysToGoal !== null ? new Date(now.getTime() + daysToGoal * 86400000) : null;

  const isClose = percentRemaining < 20;

  return (
    <div
      className="glass rounded-2xl p-4"
      style={{ maxHeight: 150, border: isClose ? "1px solid rgba(16,185,129,0.3)" : undefined }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Flag className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Prochain Objectif
        </span>
      </div>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        Plus que <span className="text-blue-400 font-bold">{remaining.toFixed(0)}€</span> pour atteindre votre objectif mensuel
      </p>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "var(--bg-secondary)" }}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${isClose ? "bg-emerald-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        {estimatedDate && dailyAvg > 0 ? (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Estimé le {estimatedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} (~{dailyAvg.toFixed(0)}€/jour)
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Continuez vos efforts !
          </span>
        )}
        {isClose && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
            Presque !
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Activité Récente Timeline ───────────────────────── */

function ActiviteRecenteWidget({ trades }: { trades: Trade[] }) {
  // Build a timeline from trade data
  const events: { type: "trade_add" | "trade_loss"; time: Date; label: string }[] = [];

  const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const tr of sorted.slice(0, 5)) {
    const isWin = tr.result > 0;
    events.push({
      type: isWin ? "trade_add" : "trade_loss",
      time: new Date(tr.date),
      label: `${tr.asset} ${tr.direction} ${tr.result >= 0 ? "+" : ""}${tr.result.toFixed(0)}€`,
    });
  }

  if (events.length === 0) return null;

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  };

  const dotColor = (type: string) => {
    switch (type) {
      case "trade_add": return "#10b981";
      case "trade_loss": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <div className="glass rounded-2xl p-4" style={{ maxHeight: 150, overflow: "hidden" }}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Activité Récente
        </span>
      </div>
      <div className="space-y-1.5">
        {events.map((ev, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center" style={{ width: 12 }}>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dotColor(ev.type) }}
              />
              {i < events.length - 1 && (
                <div className="w-px flex-1 min-h-[8px]" style={{ background: "var(--border)" }} />
              )}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)", minWidth: 52 }}>
                {formatTimeAgo(ev.time)}
              </span>
              <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {ev.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Astuce du Jour Widget ───────────────────────────── */

const TRADING_TIPS: string[] = [
  "Un bon trader ne cherche pas à avoir raison, il cherche à être rentable.",
  "Le marché récompense la patience, pas la précipitation.",
  "Coupez vos pertes rapidement, laissez courir vos gains.",
  "Ne risquez jamais plus de 2% de votre capital par trade.",
  "Votre journal de trading est votre meilleur professeur.",
  "La discipline bat l'intelligence 9 fois sur 10.",
  "Pas de setup, pas de trade. La patience est une stratégie.",
  "Le revenge trading est le chemin le plus court vers la ruine.",
  "Concentrez-vous sur le processus, pas sur les résultats.",
  "Un trade manqué vaut mieux qu'un mauvais trade pris.",
  "Le marché sera encore là demain. Protégez votre capital.",
  "Traitez le trading comme un business, pas comme un casino.",
  "La gestion du risque n'est pas optionnelle, c'est fondamentale.",
  "Votre pire ennemi en trading, c'est votre ego.",
  "Backtestez avant de risquer de l'argent réel.",
  "Les meilleures opportunités viennent quand tout le monde a peur.",
  "Ne confondez pas être occupé avec être productif en trading.",
  "Un plan de trading sans exécution n'est qu'un vœu pieux.",
  "La constance dans l'exécution crée la constance dans les résultats.",
  "Acceptez l'incertitude : chaque trade a une issue probabiliste.",
];

function AstuceDuJourWidget() {
  const [dismissed, setDismissed] = useState(false);

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const tipIndex = dayOfYear % TRADING_TIPS.length;
  const tip = TRADING_TIPS[tipIndex];

  useEffect(() => {
    const key = `astuce_dismissed_${dayOfYear}`;
    if (localStorage.getItem(key) === "1") setDismissed(true);
  }, [dayOfYear]);

  const handleDismiss = () => {
    localStorage.setItem(`astuce_dismissed_${dayOfYear}`, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="glass rounded-2xl p-4 relative"
      style={{
        maxHeight: 150,
        background: "linear-gradient(135deg, rgba(234,179,8,0.06), rgba(234,179,8,0.02))",
        border: "1px solid rgba(234,179,8,0.15)",
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/5 transition"
        style={{ color: "var(--text-muted)" }}
      >
        <X className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#eab308" }}>
          Astuce du Jour
        </span>
      </div>
      <p className="text-xs leading-relaxed pr-4" style={{ color: "var(--text-primary)" }}>
        &laquo; {tip} &raquo;
      </p>
    </div>
  );
}

/* ─── AI Résumé du Jour ──────────────────────────────── */

function AIResumeDuJour({ trades }: { trades: Trade[] }) {
  const insight = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(
      (t) => new Date(t.date).toISOString().slice(0, 10) === todayStr
    );
    if (todayTrades.length === 0) return null;

    const totalPnl = todayTrades.reduce((s, t) => s + t.result, 0);
    const wins = todayTrades.filter((t) => t.result > 0).length;
    const wr = Math.round((wins / todayTrades.length) * 100);
    const best = todayTrades.reduce((best, t) => (t.result > best.result ? t : best), todayTrades[0]);

    const lines: string[] = [];

    // Main summary
    lines.push(
      `Aujourd'hui, ${todayTrades.length} trade${todayTrades.length > 1 ? "s" : ""} avec ${wr}% WR${totalPnl >= 0 ? ` (+${totalPnl.toFixed(2)}€)` : ` (${totalPnl.toFixed(2)}€)`}.`
    );

    // Best trade highlight
    if (best.result > 0) {
      lines.push(
        `Votre meilleur trade ${best.asset} (+${best.result.toFixed(2)}€)${best.strategy ? ` via ${best.strategy}` : ""}.`
      );
    }

    // Behavioral warnings
    const timestamps = todayTrades.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
    let rapidTrades = 0;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] < 15 * 60 * 1000) rapidTrades++;
    }
    if (rapidTrades >= 2) {
      lines.push("Attention : plusieurs trades en moins de 15 minutes — possible scalping impulsif.");
    }

    // Consecutive losses check
    const sorted = [...todayTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxConsecLoss = 0;
    let curLoss = 0;
    for (const t of sorted) {
      if (t.result < 0) { curLoss++; maxConsecLoss = Math.max(maxConsecLoss, curLoss); }
      else curLoss = 0;
    }
    if (maxConsecLoss >= 3) {
      lines.push("Alerte : 3+ pertes consécutives aujourd'hui — attention au revenge trading.");
    }

    return lines.join(" ");
  }, [trades]);

  if (!insight) return null;

  return (
    <div
      className="glass rounded-2xl p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))",
        border: "1px solid rgba(139,92,246,0.2)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.15)" }}
        >
          <Brain className="w-4 h-4" style={{ color: "#a78bfa" }} />
        </div>
        <span className="font-bold text-sm" style={{ color: "#a78bfa" }}>
          AI Résumé du Jour
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {insight}
      </p>
    </div>
  );
}

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
  const [showShareCard, setShowShareCard] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [showBatchRecap, setShowBatchRecap] = useState(false);
  const unreviewedCount = useUnreviewedCount(trades);

  useEffect(() => {
    const saved = localStorage.getItem("monthlyGoal");
    if (saved) setMonthlyGoal(parseFloat(saved));
  }, []);

  // Ctrl+N dispatches open-trade-form, and listen for it to open the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-trade-form"));
      }
    };
    const handleOpenTradeForm = () => {
      setShowForm(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-trade-form", handleOpenTradeForm);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-trade-form", handleOpenTradeForm);
    };
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
  for (const tr of sortedForStreak) {
    if (currentStreak === 0) {
      streakType = tr.result > 0 ? "win" : tr.result < 0 ? "loss" : "none";
      if (streakType !== "none") currentStreak = 1;
    } else if ((streakType === "win" && tr.result > 0) || (streakType === "loss" && tr.result < 0)) {
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

  // Suggested monthly goal based on average positive monthly P&L
  const suggestedGoal = (() => {
    const monthlyBuckets: Record<string, number> = {};
    trades.forEach((tr) => {
      const key = new Date(tr.date).toISOString().slice(0, 7);
      monthlyBuckets[key] = (monthlyBuckets[key] || 0) + tr.result;
    });
    const positiveMonths = Object.values(monthlyBuckets).filter(v => v > 0);
    if (positiveMonths.length < 1) return 0;
    const avg = positiveMonths.reduce((a, b) => a + b, 0) / positiveMonths.length;
    return Math.round(avg * 0.9); // 90% of avg positive month = realistic target
  })();

  // Risk exposure today (sum of absolute risk on today's trades)
  const balance = user?.balance ?? 25000;
  const todayRiskExposure = todayTrades.reduce((s, t) => {
    const risk = t.sl && t.sl !== 0 ? Math.abs(t.entry - t.sl) * t.lots : 0;
    return s + risk;
  }, 0);
  const todayRiskPercent = balance > 0 ? (todayRiskExposure / balance) * 100 : 0;

  // === Decision Fatigue Index ===
  const decisionFatigue = useMemo(() => {
    const now = new Date();
    const todayCount = todayTrades.length;
    const dayMap: Record<string, number> = {};
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    trades.forEach((t) => {
      const d = new Date(t.date).toISOString().slice(0, 10);
      const td = new Date(t.date);
      if (td >= thirtyDaysAgo && d !== todayStr) {
        dayMap[d] = (dayMap[d] || 0) + 1;
      }
    });
    const tradingDays = Object.keys(dayMap).length;
    const avgPerDay = tradingDays > 0 ? Object.values(dayMap).reduce((a, b) => a + b, 0) / tradingDays : 0;
    const ratio = avgPerDay > 0 ? todayCount / avgPerDay : 0;
    const level: "none" | "amber" | "red" = ratio >= 2 ? "red" : ratio >= 1.5 ? "amber" : "none";
    const hour = now.getHours();
    const nextSession = hour < 12 ? "Reprenez apres la pause dejeuner (14h)" : "Reprenez demain matin (9h)";
    return { todayCount, avgPerDay, ratio, level, nextSession };
  }, [trades, todayTrades, todayStr]);

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
      {/* === Morning Briefing === */}
      <MorningBriefing trades={trades} userName={user?.name ?? null} />

      {/* === Smart Alert Center === */}
      <SmartAlertCenter trades={trades} balance={balance} />

      {/* === Empty Day Motivation (after 16h, no trades) === */}
      <EmptyDayMotivation todayTradesCount={todayTrades.length} />

      {/* === Trading Wrapped Modal === */}
      <TradingWrapped open={showWrapped} onClose={() => setShowWrapped(false)} trades={trades} />

      {/* === Batch Recap Modal === */}
      <BatchRecap open={showBatchRecap} onClose={() => setShowBatchRecap(false)} />

      {/* === Floating Daily Goal Tracker === */}
      <DailyGoalTracker trades={trades} monthlyGoal={monthlyGoal} />

      {/* === Share button + PROMINENT DAILY P&L CARD === */}
      <div className="flex justify-end gap-2 mb-2 flex-wrap">
        <MarketPhaseBadgeCompact />
        <button
          onClick={() => setShowWrapped(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
          title="Mon Récap du mois"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Mon Récap
        </button>
        <button
          onClick={() => setShowShareCard(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}
          title="Partager mes stats"
        >
          <Share2 className="w-3.5 h-3.5" />
          Partager mes stats
        </button>
        {unreviewedCount > 0 && (
          <button
            onClick={() => setShowBatchRecap(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
            title="Annoter mes trades"
          >
            <ClipboardEdit className="w-3.5 h-3.5" />
            Annoter mes trades ({unreviewedCount})
          </button>
        )}
      </div>
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
              <div className={`text-4xl font-black mono pnl-value ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {todayPnL >= 0 ? "+" : ""}{todayPnL.toFixed(2)}
              </div>
              {/* vs hier */}
              <div className="flex items-center gap-1 mt-1">
                {dailyDelta >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className={`text-xs font-semibold pnl-value ${dailyDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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

      {/* === Decision Fatigue Index === */}
      {decisionFatigue.level !== "none" && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: decisionFatigue.level === "red"
              ? "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))"
              : "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))",
            border: `1px solid ${decisionFatigue.level === "red" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Brain className="w-4.5 h-4.5" style={{ color: decisionFatigue.level === "red" ? "#ef4444" : "#f59e0b" }} />
            <span className="text-sm font-bold" style={{ color: decisionFatigue.level === "red" ? "#ef4444" : "#f59e0b" }}>
              {decisionFatigue.level === "red" ? "Suractivite detectee — Faites une pause" : "Fatigue decisionnelle possible"}
            </span>
          </div>
          <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
            <p>{decisionFatigue.todayCount} trades aujourd&apos;hui (moy. 30j : {decisionFatigue.avgPerDay.toFixed(1)}/jour)</p>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-muted)" }}>Prochaine session recommandee : {decisionFatigue.nextSession}</span>
            </div>
          </div>
        </div>
      )}

      <DashboardCards
        trades={trades}
        balance={user?.balance ?? 25000}
        onEditBalance={() => {
          setBalanceInput(String(user?.balance ?? 25000));
          setShowBalanceModal(true);
        }}
      />

      {/* Fix #5: Quick Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 stagger-in">
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
        <div className={`glass rounded-2xl p-4 transition-all duration-300 ${
          streakType === "win" && currentStreak >= 10 ? "streak-glow-rainbow" :
          streakType === "win" && currentStreak >= 5 ? "streak-glow-gold" :
          streakType === "win" && currentStreak >= 3 ? "streak-glow-green" :
          streakType === "loss" && currentStreak >= 3 ? "streak-glow-ice" : ""
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {streakType === "win" ? (
              <span className={`inline-flex ${currentStreak >= 5 ? "animate-fire-pulse" : ""}`}>
                <Flame className="w-4 h-4 text-orange-400" />
              </span>
            ) : streakType === "loss" && currentStreak >= 3 ? (
              <span className="text-sm">❄️</span>
            ) : (
              <Zap className={`w-4 h-4 ${streakType === "loss" ? "text-rose-400" : "text-gray-400"}`} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("currentStreak")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold mono animate-streak-bounce ${
              streakType === "win" && currentStreak >= 10 ? "streak-text-rainbow" :
              streakType === "win" && currentStreak >= 5 ? "text-yellow-400" :
              streakType === "win" ? "text-emerald-400" :
              streakType === "loss" && currentStreak >= 3 ? "text-sky-400" :
              streakType === "loss" ? "text-rose-400" : ""
            }`}
              style={streakType === "none" ? { color: "var(--text-muted)" } : {}}>
              {currentStreak > 0 ? `${currentStreak} ${streakType === "win" ? "W" : "L"}` : "---"}
            </div>
            {streakType === "win" && currentStreak >= 3 && (
              <span className={`text-sm ${currentStreak >= 5 ? "animate-fire-pulse" : "animate-pulse"}`}>
                🔥
              </span>
            )}
          </div>
          {streakType === "win" && currentStreak >= 10 && (
            <div className="text-[10px] font-bold mt-1 streak-text-rainbow">Légendaire !</div>
          )}
          {streakType === "win" && currentStreak >= 5 && currentStreak < 10 && (
            <div className="text-[10px] font-bold mt-1 text-yellow-400">Inarrêtable !</div>
          )}
          {streakType === "win" && currentStreak >= 3 && currentStreak < 5 && (
            <div className="text-[10px] font-bold mt-1 text-emerald-400">En feu !</div>
          )}
          {streakType === "loss" && currentStreak >= 3 && (
            <div className="text-[10px] font-bold mt-1 text-sky-400">Restez discipliné</div>
          )}
        </div>

        {/* Weekly Sparkline card */}
        <div className="glass rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("last7Days")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-lg font-bold mono pnl-value ${weeklyTotal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
          {monthlyGoal > 0 ? (
            <button
              onClick={() => { setGoalInput(String(monthlyGoal || "")); setShowGoalModal(true); }}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              {t("editGoal")}
            </button>
          ) : (
            <button
              onClick={() => { setGoalInput(suggestedGoal > 0 ? String(suggestedGoal) : ""); setShowGoalModal(true); }}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--accent-primary), #6366f1)" }}
            >
              {t("setGoal")}
            </button>
          )}
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
                <span className={`pnl-value ${monthlyPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
                    {onTrack ? t("aheadOfSchedule") : `${remaining.toFixed(0)}€ ${t("goalRemainingAmount")}`}
                  </span>
                ) : goalReached ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    {t("goalReached")}
                  </span>
                ) : null}
              </div>
              {!goalReached && remaining > 0 && daysLeft > 0 && (
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  ~{dailyNeeded.toFixed(0)}€{t("dailyNeededAmount")} • {daysLeft} {t("daysRemainingCount")}
                </p>
              )}
            </>
          );
        })() : (
          <div>
            <p className="text-[--text-muted] text-sm">{t("noGoalSet")}</p>
            {suggestedGoal > 0 && (
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--accent-primary)" }}>
                <Lightbulb className="w-3.5 h-3.5" />
                {t("goalSuggestion").replace("{amount}", String(suggestedGoal))}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Streak + Forex Sessions + Market Regime */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Win/Loss Streak */}
        {(() => {
          let bestWin = 0, bestLoss = 0, tempWin = 0, tempLoss = 0;
          for (const tr of [...sortedForStreak].reverse()) {
            if (tr.result > 0) { tempWin++; tempLoss = 0; bestWin = Math.max(bestWin, tempWin); }
            else if (tr.result < 0) { tempLoss++; tempWin = 0; bestLoss = Math.max(bestLoss, tempLoss); }
            else { tempWin = 0; tempLoss = 0; }
          }
          return (
            <div className={`glass rounded-2xl p-4 transition-all duration-300 ${
              streakType === "win" && currentStreak >= 10 ? "streak-glow-rainbow" :
              streakType === "win" && currentStreak >= 5 ? "streak-glow-gold" :
              streakType === "win" && currentStreak >= 3 ? "streak-glow-green" :
              streakType === "loss" && currentStreak >= 3 ? "streak-glow-ice" : ""
            }`}>
              <h4 className="text-xs font-bold text-[--text-muted] uppercase tracking-wider mb-3">{t("currentStreak")}</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streakType === "win" ? "bg-emerald-500/20" : streakType === "loss" && currentStreak >= 3 ? "bg-sky-500/20" : streakType === "loss" ? "bg-rose-500/20" : "bg-gray-500/20"}`}>
                  {streakType === "loss" && currentStreak >= 3 ? (
                    <span className="text-xl">❄️</span>
                  ) : (
                    <Flame className={`w-6 h-6 ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : "text-[--text-muted]"} ${streakType === "win" && currentStreak >= 5 ? "animate-fire-pulse" : ""}`} />
                  )}
                </div>
                <div>
                  <div className={`text-2xl font-bold mono animate-streak-bounce ${
                    streakType === "win" && currentStreak >= 10 ? "streak-text-rainbow" :
                    streakType === "win" && currentStreak >= 5 ? "text-yellow-400" :
                    streakType === "win" ? "text-emerald-400" :
                    streakType === "loss" && currentStreak >= 3 ? "text-sky-400" :
                    streakType === "loss" ? "text-rose-400" : "text-[--text-muted]"
                  }`}>
                    {currentStreak}
                    {streakType === "win" && currentStreak >= 3 && <span className={`ml-1 ${currentStreak >= 5 ? "animate-fire-pulse inline-block" : ""}`}>🔥</span>}
                  </div>
                  <div className="text-xs text-[--text-muted]">
                    {streakType === "win" && currentStreak >= 10 ? <span className="streak-text-rainbow font-bold">Légendaire !</span> :
                     streakType === "win" && currentStreak >= 5 ? <span className="text-yellow-400 font-bold">Inarrêtable !</span> :
                     streakType === "win" && currentStreak >= 3 ? <span className="text-emerald-400 font-bold">En feu !</span> :
                     streakType === "loss" && currentStreak >= 3 ? <span className="text-sky-400 font-bold">Restez discipliné</span> :
                     streakType === "win" ? t("victories") : streakType === "loss" ? t("defeats") : "---"}
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
              <span className={`text-xl font-bold mono pnl-value ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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

        {/* Régime de Marché */}
        <MarketRegimeWidget />
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
              const risk = t.sl && t.sl !== 0 ? Math.abs(t.entry - t.sl) * t.lots : 0;
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
                  <div className="text-2xl font-bold mono text-emerald-400 pnl-value">+{bestTrade.result.toFixed(2)}</div>
                  <div className="text-xs text-[--text-muted] mt-1">
                    <Link href={`/journal?asset=${encodeURIComponent(bestTrade.asset)}`} className="text-cyan-400 hover:underline">{bestTrade.asset}</Link>
                    {" "}&mdash; {formatDate(bestTrade.date)}
                  </div>
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
                  <div className="text-2xl font-bold mono text-rose-400 pnl-value">{worstTrade.result.toFixed(2)}</div>
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
                        <span className={`font-bold mono text-sm pnl-value ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
        // Use date-only string comparison to avoid UTC vs local timezone mismatches
        const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const tradeDateStr = (t: Trade) => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };

        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - dayOfWeek + 1);
        thisWeekStart.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const thisWeekStartStr = toDateStr(thisWeekStart);
        const lastWeekStartStr = toDateStr(lastWeekStart);
        const todayStr = toDateStr(today);

        const thisWeekTrades = trades.filter(tr => { const ds = tradeDateStr(tr); return ds >= thisWeekStartStr && ds <= todayStr; });
        const lastWeekTrades = trades.filter(tr => { const ds = tradeDateStr(tr); return ds >= lastWeekStartStr && ds < thisWeekStartStr; });

        const twPnL = thisWeekTrades.reduce((s, t) => s + t.result, 0);
        const lwPnL = lastWeekTrades.reduce((s, t) => s + t.result, 0);
        const twWins = thisWeekTrades.filter(t => t.result > 0).length;
        const lwWins = lastWeekTrades.filter(t => t.result > 0).length;
        const twWR = thisWeekTrades.length > 0 ? (twWins / thisWeekTrades.length) * 100 : 0;
        const lwWR = lastWeekTrades.length > 0 ? (lwWins / lastWeekTrades.length) * 100 : 0;

        const metrics = [
          { key: "pnl", label: t("pnlLabel"), current: twPnL, previous: lwPnL, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}`, alwaysPositiveLabel: false },
          { key: "trades", label: t("trades"), current: thisWeekTrades.length, previous: lastWeekTrades.length, format: (v: number) => String(v), alwaysPositiveLabel: true },
          { key: "winrate", label: t("winRate"), current: twWR, previous: lwWR, format: (v: number) => `${v.toFixed(0)}%`, alwaysPositiveLabel: true },
          { key: "avgpnl", label: t("avgPnl"), current: thisWeekTrades.length ? twPnL / thisWeekTrades.length : 0, previous: lastWeekTrades.length ? lwPnL / lastWeekTrades.length : 0, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}`, alwaysPositiveLabel: false },
        ];

        return (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("weeklyComparison")}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map(({ key, label, current, previous, format, alwaysPositiveLabel }) => {
                const delta = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
                const improved = current >= previous;
                return (
                  <div key={key} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="text-xl font-bold mono" style={{ color: current >= 0 || alwaysPositiveLabel ? "var(--text-primary)" : "#ef4444" }}>
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

      {/* Trade du Jour */}
      <TradeDuJourWidget />

      {/* === New Widgets Row: Prochain Objectif + Activité Récente + Astuce du Jour === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ProchainObjectifWidget monthlyGoal={monthlyGoal} monthlyPnL={monthlyPnL} trades={trades} />
        <ActiviteRecenteWidget trades={trades} />
        <AstuceDuJourWidget />
      </div>

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
            <div className="w-20 h-20 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto mb-5">
              <TrendingUp className="w-10 h-10 text-blue-400" />
            </div>
            <h4 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Ajoutez votre premier trade en 30 secondes
            </h4>
            <p className="text-sm mb-2 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              {t("startJournalDesc")}
            </p>
            <p className="text-xs mb-8 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              Ou importez vos trades depuis MT4/MT5/TradingView
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-base inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{ boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}
            >
              <Plus className="w-5 h-5" />
              Ajouter mon premier trade
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
                      <td className={`py-4 mono font-bold pnl-value ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
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

      {/* AI Résumé du Jour */}
      <AIResumeDuJour trades={trades} />

      {/* Share Stats Card Modal */}
      <ShareStatsCard
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        stats={{
          period: "month",
          winRate: monthlyWinRate,
          pnl: monthlyPnL,
          tradesCount: monthlyTrades.length,
          bestTrade: monthlyBestTrade,
          streak: currentStreak,
          streakType,
        }}
      />
    </>
  );
}
