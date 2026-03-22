"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Lock,
  Crown,
  Check,
  Medal,
  TrendingUp,
  BarChart3,
  Flame,
  Target,
  ChevronDown,
  Loader2,
  Settings,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────
type Period = "week" | "month" | "all";
type Metric = "pnl" | "winrate" | "trades" | "streak";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarHash: string;
  metricValue: number;
  tradesCount: number;
  badge: "VIP" | "ADMIN" | "FREE";
  isCurrentUser: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  period: Period;
  metric: Metric;
}

// ── Constants ───────────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "all", label: "Tous les temps" },
];

const METRICS: { value: Metric; label: string; icon: React.ElementType }[] = [
  { value: "pnl", label: "P&L", icon: TrendingUp },
  { value: "winrate", label: "Win Rate", icon: Target },
  { value: "trades", label: "Nombre de trades", icon: BarChart3 },
  { value: "streak", label: "Meilleure série", icon: Flame },
];

// ── Helpers ─────────────────────────────────────────────────────────
function formatMetric(value: number, metric: Metric): string {
  switch (metric) {
    case "pnl":
      return `${value >= 0 ? "+" : ""}${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
    case "winrate":
      return `${value.toFixed(1)}%`;
    case "trades":
      return `${value}`;
    case "streak":
      return `${value} wins`;
  }
}

function avatarGradient(hash: string): string {
  const h1 = parseInt(hash.slice(0, 2), 16) * 1.41;
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 55%), hsl(${h2}, 70%, 45%))`;
}

// ── Badge component ─────────────────────────────────────────────────
function RoleBadge({ badge }: { badge: "VIP" | "ADMIN" | "FREE" }) {
  if (badge === "FREE") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        badge === "VIP"
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
      }`}
    >
      {badge === "VIP" && <Crown className="w-2.5 h-2.5" />}
      {badge}
    </span>
  );
}

// ── Podium card (top 3) ─────────────────────────────────────────────
function PodiumCard({
  entry,
  position,
  metric,
}: {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
  metric: Metric;
}) {
  const config = {
    1: {
      size: "w-20 h-20",
      ring: "ring-4 ring-yellow-400/50",
      gradient: "from-yellow-500/20 via-amber-500/10 to-transparent",
      border: "border-yellow-500/30",
      medalColor: "text-yellow-400",
      label: "1er",
      scale: "md:scale-110 md:-mt-4",
      shadow: "shadow-xl shadow-yellow-500/10",
    },
    2: {
      size: "w-16 h-16",
      ring: "ring-3 ring-gray-300/40",
      gradient: "from-gray-400/15 via-gray-300/5 to-transparent",
      border: "border-gray-400/25",
      medalColor: "text-gray-300",
      label: "2e",
      scale: "",
      shadow: "shadow-lg shadow-gray-500/5",
    },
    3: {
      size: "w-16 h-16",
      ring: "ring-3 ring-orange-400/40",
      gradient: "from-orange-500/15 via-orange-400/5 to-transparent",
      border: "border-orange-500/25",
      medalColor: "text-orange-400",
      label: "3e",
      scale: "",
      shadow: "shadow-lg shadow-orange-500/5",
    },
  }[position];

  return (
    <div
      className={`relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-xl bg-gradient-to-b ${config.gradient} border ${config.border} ${config.scale} ${config.shadow} transition-all hover:scale-105`}
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Rank medal */}
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
        position === 1
          ? "bg-yellow-500 text-black"
          : position === 2
          ? "bg-gray-400 text-black"
          : "bg-orange-500 text-black"
      }`}>
        {position}
      </div>

      {/* Avatar */}
      <div
        className={`${config.size} rounded-full ${config.ring} flex items-center justify-center text-white font-bold text-lg mt-2 mb-3`}
        style={{ background: avatarGradient(entry.avatarHash) }}
      >
        {entry.name.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-white truncate max-w-[120px]">{entry.name}</p>

      {/* Badge */}
      <div className="mt-1">
        <RoleBadge badge={entry.badge} />
      </div>

      {/* Metric */}
      <p
        className={`text-lg font-black mt-3 ${
          metric === "pnl" && entry.metricValue >= 0
            ? "text-emerald-400"
            : metric === "pnl"
            ? "text-red-400"
            : "text-cyan-400"
        }`}
      >
        {formatMetric(entry.metricValue, metric)}
      </p>

      {/* Trades count */}
      <p className="text-[11px] text-gray-500 mt-0.5">{entry.tradesCount} trades</p>

      {/* Current user highlight */}
      {entry.isCurrentUser && (
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/40 pointer-events-none" />
      )}
    </div>
  );
}

// ── List row (position 4-50) ────────────────────────────────────────
function LeaderboardRow({
  entry,
  metric,
}: {
  entry: LeaderboardEntry;
  metric: Metric;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/5 ${
        entry.isCurrentUser
          ? "bg-cyan-500/10 border border-cyan-500/20"
          : "border border-transparent"
      }`}
      style={{
        background: entry.isCurrentUser
          ? "rgba(6,182,212,0.08)"
          : "rgba(255,255,255,0.02)",
      }}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span
          className={`text-sm font-bold ${
            entry.isCurrentUser ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          #{entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ background: avatarGradient(entry.avatarHash) }}
      >
        {entry.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              entry.isCurrentUser ? "text-cyan-300" : "text-white"
            }`}
          >
            {entry.name}
            {entry.isCurrentUser && (
              <span className="text-cyan-500 ml-1 text-xs">(vous)</span>
            )}
          </span>
          <RoleBadge badge={entry.badge} />
        </div>
        <p className="text-[11px] text-gray-500">{entry.tradesCount} trades</p>
      </div>

      {/* Metric */}
      <div className="text-right">
        <span
          className={`text-sm font-bold ${
            metric === "pnl" && entry.metricValue >= 0
              ? "text-emerald-400"
              : metric === "pnl"
              ? "text-red-400"
              : "text-white"
          }`}
        >
          {formatMetric(entry.metricValue, metric)}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE
// ══════════════════════════════════════════════════════════════════════
export default function LeaderboardPage() {
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [metric, setMetric] = useState<Metric>("pnl");

  // Check VIP
  useEffect(() => {
    fetch("/api/user/role")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setIsVip(d.role === "VIP" || d.role === "ADMIN"))
      .catch(() => setIsVip(false));
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?period=${period}&metric=${metric}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [period, metric]);

  useEffect(() => {
    if (isVip) fetchLeaderboard();
  }, [isVip, fetchLeaderboard]);

  // ── Loading state ──
  if (isVip === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── VIP gate ──
  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        {/* Blurred background preview */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="text-center pt-6">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                Classement
              </h1>
            </div>
            <div
              className="glass rounded-2xl p-8"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ background: "var(--border)" }}
                    />
                    <div className="flex-1 space-y-1">
                      <div
                        className="h-3 rounded"
                        style={{
                          background: "var(--border)",
                          width: `${30 + i * 8}%`,
                        }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{
                          background: "var(--border)",
                          width: `${20 + i * 5}%`,
                        }}
                      />
                    </div>
                    <div
                      className="h-4 w-12 rounded"
                      style={{ background: "var(--border)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* VIP overlay */}
        <div
          className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center"
          style={{
            border: "1px solid rgba(6,182,212,0.2)",
            background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: "rgba(6,182,212,0.1)",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Fonctionnalité VIP
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            Classement des meilleurs traders de la communauté MarketPhase
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Classement en temps réel des traders",
              "Comparez vos performances avec la communauté",
              "Badges et récompenses pour les meilleurs",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(6,182,212,0.15)" }}
                >
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {b}
                </span>
              </div>
            ))}
          </div>
          <a
            href="/vip"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            }}
          >
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a
              href="/vip"
              className="text-xs hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Voir les offres
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main leaderboard ──
  const top3 = data?.leaderboard.slice(0, 3) || [];
  const rest = data?.leaderboard.slice(3) || [];
  const currentUserOutsideTop50 =
    data?.currentUserEntry &&
    !data.leaderboard.some((e) => e.isCurrentUser);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center pt-6">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Classement
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto text-sm">
          Comparez-vous aux meilleurs traders de la communauté.
        </p>
      </div>

      {/* Controls */}
      <div
        className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Period tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p.value
                  ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Metric selector */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => setMetric(m.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  metric === m.value
                    ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.leaderboard.length === 0 && (
        <div
          className="glass rounded-2xl p-12 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(234,179,8,0.12)",
              border: "1px solid rgba(234,179,8,0.2)",
            }}
          >
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Aucun participant pour le moment
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Soyez le premier ! Activez votre profil public dans les paramètres
            pour apparaître dans le classement.
          </p>
          <a
            href="/profile"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
          >
            <Settings className="w-4 h-4" />
            Paramètres du profil
          </a>
        </div>
      )}

      {/* Podium (top 3) */}
      {!loading && top3.length > 0 && (
        <div className="flex items-end justify-center gap-4 md:gap-6 pt-6 pb-2">
          {/* 2nd place */}
          {top3[1] && (
            <div className="flex-shrink-0">
              <PodiumCard entry={top3[1]} position={2} metric={metric} />
            </div>
          )}
          {/* 1st place */}
          {top3[0] && (
            <div className="flex-shrink-0">
              <PodiumCard entry={top3[0]} position={1} metric={metric} />
            </div>
          )}
          {/* 3rd place */}
          {top3[2] && (
            <div className="flex-shrink-0">
              <PodiumCard entry={top3[2]} position={3} metric={metric} />
            </div>
          )}
        </div>
      )}

      {/* Positions 4-50 */}
      {!loading && rest.length > 0 && (
        <div
          className="glass rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="max-h-[500px] overflow-y-auto divide-y divide-white/5 p-2">
            {rest.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                metric={metric}
              />
            ))}
          </div>
        </div>
      )}

      {/* Current user outside top 50 */}
      {!loading && currentUserOutsideTop50 && data?.currentUserEntry && (
        <div
          className="glass rounded-2xl p-4"
          style={{
            border: "1px solid rgba(6,182,212,0.2)",
            background: "rgba(6,182,212,0.05)",
          }}
        >
          <p className="text-xs text-gray-400 mb-2 text-center">
            Votre position
          </p>
          <LeaderboardRow
            entry={data.currentUserEntry}
            metric={metric}
          />
        </div>
      )}

      {/* CTA if user is not in leaderboard */}
      {!loading &&
        data &&
        data.leaderboard.length > 0 &&
        !data.currentUserEntry && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">
              Vous n&apos;apparaissez pas ?{" "}
              <a
                href="/profile"
                className="text-cyan-400 hover:underline font-medium"
              >
                Activez le profil public dans vos paramètres.
              </a>
            </p>
          </div>
        )}
    </div>
  );
}
