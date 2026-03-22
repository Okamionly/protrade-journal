"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Trophy, Flame, Shield, Target, Zap, Award, Lock, Star,
  TrendingUp, Clock, Crosshair, BarChart3,
  Crown, Gem, Sunrise, Sparkles, Ban,
  Timer, CheckCircle2, Check, Gift, Loader2,
  Calendar, Medal, Users, ChevronUp, Diamond,
} from "lucide-react";

/* ─── types ────────────────────────────────────────────── */

interface ChallengeData {
  id: string;
  title: string;
  description: string;
  category: "daily" | "weekly" | "monthly" | "special";
  icon: string;
  color: string;
  gradient: string;
  current: number;
  target: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  joined: boolean;
  startedAt: string | null;
  reward: { xp: number; badge: string };
}

type TabId = "daily" | "weekly" | "monthly" | "special" | "saison";

/* ─── season config ───────────────────────────────────── */

interface SeasonRank {
  id: string;
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  cssClass: string;
  icon: React.ReactNode;
}

const SEASON_CONFIG = {
  id: "s1",
  name: "Saison 1 — Printemps 2026",
  startDate: "2026-03-01",
  endDate: "2026-05-29",
  totalDays: 90,
};

const SEASON_RANKS: SeasonRank[] = [
  { id: "bronze",  name: "Bronze",  minXp: 0,    maxXp: 500,  color: "#CD7F32", cssClass: "season-rank-bronze",  icon: <Medal size={24} /> },
  { id: "argent",  name: "Argent",  minXp: 500,  maxXp: 1500, color: "#C0C0C0", cssClass: "season-rank-argent",  icon: <Shield size={24} /> },
  { id: "or",      name: "Or",      minXp: 1500, maxXp: 3000, color: "#FFD700", cssClass: "season-rank-or",      icon: <Crown size={24} /> },
  { id: "platine", name: "Platine", minXp: 3000, maxXp: 5000, color: "#E5E4E2", cssClass: "season-rank-platine", icon: <Gem size={24} /> },
  { id: "diamant", name: "Diamant", minXp: 5000, maxXp: Infinity, color: "#B9F2FF", cssClass: "season-rank-diamant", icon: <Diamond size={24} /> },
];

function getSeasonRankIcon(rankId: string, size: number): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    bronze: <Medal size={size} />,
    argent: <Shield size={size} />,
    or: <Crown size={size} />,
    platine: <Gem size={size} />,
    diamant: <Diamond size={size} />,
  };
  return icons[rankId] || <Star size={size} />;
}

function getSeasonRank(xp: number): SeasonRank {
  for (let i = SEASON_RANKS.length - 1; i >= 0; i--) {
    if (xp >= SEASON_RANKS[i].minXp) return SEASON_RANKS[i];
  }
  return SEASON_RANKS[0];
}

function getNextSeasonRank(xp: number): SeasonRank | null {
  const current = getSeasonRank(xp);
  const idx = SEASON_RANKS.indexOf(current);
  return idx < SEASON_RANKS.length - 1 ? SEASON_RANKS[idx + 1] : null;
}

function getSeasonDaysElapsed(): number {
  const start = new Date(SEASON_CONFIG.startDate).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - start) / 86400000);
  return Math.max(0, Math.min(elapsed, SEASON_CONFIG.totalDays));
}

function getSeasonDaysRemaining(): number {
  return SEASON_CONFIG.totalDays - getSeasonDaysElapsed();
}

/* ─── mock leaderboard ────────────────────────────────── */

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  challengesCompleted: number;
  isCurrentUser: boolean;
}

function generateLeaderboard(currentUserXp: number, currentUserCompleted: number): LeaderboardEntry[] {
  const mockNames = [
    "TraderPro_92", "AlphaFX", "SwingKing", "PipMaster",
    "NeoTrader", "BullRunFR", "ScalpQueen", "RiskWise",
    "ChartNinja", "MomentumX",
  ];
  const entries: LeaderboardEntry[] = mockNames.map((name, i) => ({
    rank: 0,
    name,
    xp: Math.max(100, Math.floor(5500 - i * 480 + (Math.sin(i * 7) * 300))),
    challengesCompleted: Math.max(1, Math.floor(12 - i + (Math.sin(i * 3) * 3))),
    isCurrentUser: false,
  }));
  // Insert current user
  entries.push({
    rank: 0,
    name: "Vous",
    xp: currentUserXp,
    challengesCompleted: currentUserCompleted,
    isCurrentUser: true,
  });
  // Sort by XP desc
  entries.sort((a, b) => b.xp - a.xp);
  // Assign ranks and take top 10
  return entries.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
}

/* ─── icon map ─────────────────────────────────────────── */

function getIcon(name: string, size: number) {
  const icons: Record<string, React.ReactNode> = {
    TrendingUp: <TrendingUp size={size} />,
    Target: <Target size={size} />,
    CheckCircle2: <CheckCircle2 size={size} />,
    Ban: <Ban size={size} />,
    Crosshair: <Crosshair size={size} />,
    Shield: <Shield size={size} />,
    Crown: <Crown size={size} />,
    Gem: <Gem size={size} />,
    Star: <Star size={size} />,
    Trophy: <Trophy size={size} />,
    Flame: <Flame size={size} />,
    Zap: <Zap size={size} />,
    Award: <Award size={size} />,
    BarChart3: <BarChart3 size={size} />,
    Sunrise: <Sunrise size={size} />,
  };
  return icons[name] || <Star size={size} />;
}

/* ─── confetti burst ───────────────────────────────────── */

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 360;
        const dist = 60 + Math.random() * 40;
        const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"];
        const color = colors[i % colors.length];
        const size = 4 + Math.random() * 4;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              left: "50%",
              top: "50%",
              animation: `confetti-burst 0.8s ease-out forwards`,
              animationDelay: `${Math.random() * 0.15}s`,
              transform: `translate(-50%, -50%)`,
              // @ts-expect-error CSS custom properties
              "--tx": `${Math.cos((angle * Math.PI) / 180) * dist}px`,
              "--ty": `${Math.sin((angle * Math.PI) / 180) * dist}px`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-burst {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── countdown helpers ────────────────────────────────── */

function getDeadline(category: string): string {
  const d = new Date();
  if (category === "daily") {
    d.setHours(23, 59, 59, 999);
  } else if (category === "weekly") {
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(23, 59, 59, 999);
  } else {
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

function formatCountdown(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Terminé";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/* ─── tab config ───────────────────────────────────────── */

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "daily", label: "Quotidien", icon: <Zap size={16} />, color: "#f59e0b" },
  { id: "weekly", label: "Hebdomadaire", icon: <Flame size={16} />, color: "#f97316" },
  { id: "monthly", label: "Mensuel", icon: <BarChart3 size={16} />, color: "#3b82f6" },
  { id: "special", label: "Spécial", icon: <Sparkles size={16} />, color: "#a855f7" },
  { id: "saison", label: "Classement Saison", icon: <Users size={16} />, color: "#06b6d4" },
];

/* ─── page ─────────────────────────────────────────────── */

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [joining, setJoining] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const prevProgressRef = useRef<Map<string, number>>(new Map());

  // Check VIP
  useEffect(() => {
    fetch("/api/user/role")
      .then((r) => {
        if (!r.ok) throw new Error("Not OK");
        return r.json();
      })
      .then((d) => setIsVip(d.role === "VIP" || d.role === "ADMIN"))
      .catch(() => setIsVip(false));
  }, []);

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVip === true) fetchChallenges();
    else if (isVip === false) setLoading(false);
  }, [isVip, fetchChallenges]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isVip) return;
    const interval = setInterval(fetchChallenges, 30000);
    return () => clearInterval(interval);
  }, [isVip, fetchChallenges]);

  // Detect newly completed challenges
  useEffect(() => {
    const prev = prevProgressRef.current;
    const newCompleted = new Set<string>();
    challenges.forEach((c) => {
      if (c.completed && c.joined) {
        const wasPrev = prev.get(c.id);
        if (wasPrev !== undefined && wasPrev < 100 && c.progress >= 100) {
          newCompleted.add(c.id);
        }
      }
    });
    if (newCompleted.size > 0) {
      setJustCompleted((old) => new Set([...old, ...newCompleted]));
      // Auto-sync completion to backend
      newCompleted.forEach(async (id) => {
        const ch = challenges.find((c) => c.id === id);
        if (ch) {
          await fetch("/api/challenges", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challengeId: id, progress: 100, completed: true }),
          });
          setCelebratingId(id);
          setTimeout(() => setCelebratingId(null), 1500);
        }
      });
    }
    // Update ref
    const newMap = new Map<string, number>();
    challenges.forEach((c) => newMap.set(c.id, c.progress));
    prevProgressRef.current = newMap;
  }, [challenges]);

  // Join a challenge
  const handleJoin = useCallback(async (challengeId: string) => {
    setJoining(challengeId);
    try {
      await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      await fetchChallenges();
    } catch {
      // silent
    } finally {
      setJoining(null);
    }
  }, [fetchChallenges]);

  // Stats
  const stats = useMemo(() => {
    const joined = challenges.filter((c) => c.joined);
    const completed = challenges.filter((c) => c.completed && c.joined);
    const totalXp = completed.reduce((s, c) => s + c.reward.xp, 0);
    const level = Math.floor(totalXp / 500) + 1;
    const titles: [number, string][] = [
      [50, "Légende"], [36, "Master"], [21, "Expert"],
      [11, "Trader"], [6, "Apprenti"], [1, "Débutant"],
    ];
    const title = titles.find(([min]) => level >= min)?.[1] || "Débutant";
    return {
      total: challenges.length,
      joined: joined.length,
      completed: completed.length,
      totalXp,
      level,
      title,
      xpInLevel: totalXp % 500,
      xpForLevel: 500,
    };
  }, [challenges]);

  // Season data
  const seasonData = useMemo(() => {
    const seasonStart = new Date(SEASON_CONFIG.startDate).getTime();
    const seasonEnd = new Date(SEASON_CONFIG.endDate).getTime();
    const seasonCompleted = challenges.filter((c) => {
      if (!c.completed || !c.joined || !c.completedAt) return false;
      const t = new Date(c.completedAt).getTime();
      return t >= seasonStart && t <= seasonEnd;
    });
    const seasonXp = seasonCompleted.reduce((s, c) => s + c.reward.xp, 0);
    const rank = getSeasonRank(seasonXp);
    const nextRank = getNextSeasonRank(seasonXp);
    const daysElapsed = getSeasonDaysElapsed();
    const daysRemaining = getSeasonDaysRemaining();
    const progressToNextRank = nextRank
      ? ((seasonXp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100
      : 100;
    const leaderboard = generateLeaderboard(seasonXp, seasonCompleted.length);
    return {
      seasonXp,
      rank,
      nextRank,
      daysElapsed,
      daysRemaining,
      seasonProgress: (daysElapsed / SEASON_CONFIG.totalDays) * 100,
      progressToNextRank: Math.min(100, Math.max(0, progressToNextRank)),
      challengesCompleted: seasonCompleted.length,
      leaderboard,
    };
  }, [challenges]);

  // Filtered challenges
  const filtered = useMemo(
    () => challenges.filter((c) => c.category === activeTab),
    [challenges, activeTab]
  );

  const completedChallenges = useMemo(
    () => challenges.filter((c) => c.completed && c.joined),
    [challenges]
  );

  /* ─── render ─────────────────────────────────────────── */

  if (isVip === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="text-amber-500" size={28} />
              <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Challenges</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: "70%" }} />
                  <div className="h-6 rounded" style={{ background: "var(--border)", width: "50%" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Participez à des défis de trading et mesurez-vous aux meilleurs
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Challenges quotidiens, hebdomadaires et mensuels",
              "Gagnez de l'XP et débloquez des badges",
              "Suivez votre progression en temps réel",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Trophy className="text-amber-500" size={28} />
            Challenges
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Relevez des défis, gagnez de l&apos;XP et débloquez des badges
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass" style={{ border: "1px solid var(--border)" }}>
            <Trophy size={16} className="text-emerald-500" />
            <span className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {stats.completed}/{stats.total}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass" style={{ border: "1px solid var(--border)" }}>
            <Sparkles size={16} className="text-amber-500" />
            <span className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {stats.totalXp} XP
            </span>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold mono text-lg">
              {stats.level}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{stats.title}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Niveau {stats.level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {stats.totalXp.toLocaleString()} XP
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {stats.xpInLevel}/{stats.xpForLevel} XP vers niveau {stats.level + 1}
            </p>
          </div>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
            style={{ width: `${(stats.xpInLevel / stats.xpForLevel) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Complétez des challenges pour gagner de l&apos;XP</span>
          <span>{stats.xpForLevel - stats.xpInLevel} XP restants</span>
        </div>
      </div>

      {/* ─── Season Banner ─────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: `1px solid ${seasonData.rank.color}30` }}>
        {/* Season Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center season-rank-badge season-rank-badge-animated ${seasonData.rank.cssClass}`}
              style={{ color: seasonData.rank.color }}
            >
              {seasonData.rank.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {SEASON_CONFIG.name}
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: seasonData.rank.color }}>
                Rang {seasonData.rank.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {seasonData.seasonXp.toLocaleString()} XP cette saison
                {" · "}
                {seasonData.challengesCompleted} challenges
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <Timer size={15} className="text-red-400" />
              <span className="mono text-sm font-bold text-red-400">
                {seasonData.daysRemaining} jours restants
              </span>
            </div>
          </div>
        </div>

        {/* Season Progress Bar */}
        <div className="px-6 pb-3">
          <div className="flex justify-between mb-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Progression de la saison</span>
            <span className="mono">{Math.round(seasonData.seasonProgress)}% ({seasonData.daysElapsed}/{SEASON_CONFIG.totalDays} jours)</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
            <div
              className="h-full rounded-full season-progress-bar transition-all duration-700"
              style={{ width: `${seasonData.seasonProgress}%` }}
            />
          </div>
        </div>

        {/* Rank Progress */}
        <div className="px-6 pb-5">
          <div className="flex justify-between mb-1.5 text-xs">
            <span style={{ color: seasonData.rank.color }} className="font-medium">
              {seasonData.rank.name}
            </span>
            {seasonData.nextRank ? (
              <span style={{ color: seasonData.nextRank.color }} className="font-medium flex items-center gap-1">
                <ChevronUp size={12} />
                {seasonData.nextRank.name} ({seasonData.nextRank.minXp} XP)
              </span>
            ) : (
              <span style={{ color: seasonData.rank.color }} className="font-medium">
                Rang maximum atteint !
              </span>
            )}
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${seasonData.progressToNextRank}%`,
                backgroundColor: seasonData.rank.color,
              }}
            />
          </div>
          {seasonData.nextRank && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              {seasonData.nextRank.minXp - seasonData.seasonXp} XP restants pour atteindre {seasonData.nextRank.name}
            </p>
          )}
        </div>

        {/* Season Reward Preview */}
        <div
          className="flex items-center gap-3 px-6 py-3"
          style={{ backgroundColor: `${seasonData.rank.color}08`, borderTop: `1px solid ${seasonData.rank.color}15` }}
        >
          <Gift size={16} style={{ color: seasonData.rank.color }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Terminez la saison en <strong style={{ color: seasonData.rank.color }}>{seasonData.rank.name}</strong> ou plus pour d&eacute;bloquer le badge <strong style={{ color: seasonData.rank.color }}>Saison 1 {seasonData.rank.name}</strong>
          </span>
        </div>
      </div>

      {/* Completed Badges Row */}
      {completedChallenges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Award size={16} className="text-purple-500" />
            Badges gagnés ({completedChallenges.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {completedChallenges.map((c) => (
              <div
                key={c.id}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl glass"
                style={{ border: `1px solid ${c.color}40` }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  {getIcon(c.icon, 14)}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: c.color }}>{c.reward.badge}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{c.reward.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const isSeason = tab.id === "saison";
          const count = isSeason ? 10 : challenges.filter((c) => c.category === tab.id).length;
          const completedCount = isSeason ? seasonData.challengesCompleted : challenges.filter((c) => c.category === tab.id && c.completed && c.joined).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "shadow-lg scale-[1.02]"
                  : "glass hover:scale-[1.02]"
              }`}
              style={{
                border: `1px solid ${activeTab === tab.id ? tab.color + "60" : "var(--border)"}`,
                color: activeTab === tab.id ? tab.color : "var(--text-secondary)",
                background: activeTab === tab.id ? `${tab.color}15` : undefined,
              }}
            >
              {tab.icon}
              {tab.label}
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full mono"
                style={{
                  backgroundColor: activeTab === tab.id ? `${tab.color}20` : "var(--bg-primary)",
                  color: activeTab === tab.id ? tab.color : "var(--text-muted)",
                }}
              >
                {completedCount}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Season Leaderboard ─────────────────────────────── */}
      {activeTab === "saison" && (
        <div className="space-y-6">
          {/* Rank overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SEASON_RANKS.map((r) => {
              const isActive = seasonData.rank.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`glass rounded-xl p-3 text-center transition-all ${isActive ? "scale-[1.03]" : "opacity-60"}`}
                  style={{
                    border: `1px solid ${isActive ? r.color + "60" : "var(--border)"}`,
                    ...(isActive ? { boxShadow: `0 0 15px ${r.color}20` } : {}),
                  }}
                >
                  <div className="flex justify-center mb-1.5" style={{ color: r.color }}>
                    {r.icon}
                  </div>
                  <p className="text-xs font-bold" style={{ color: r.color }}>{r.name}</p>
                  <p className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                    {r.maxXp === Infinity ? `${r.minXp}+` : `${r.minXp}-${r.maxXp}`} XP
                  </p>
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table */}
          <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <Users size={18} className="text-cyan-400" />
              <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
                Classement Saison
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(6, 182, 212, 0.1)", color: "#06b6d4" }}>
                Top 10
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {seasonData.leaderboard.map((entry) => {
                const entryRank = getSeasonRank(entry.xp);
                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${
                      entry.isCurrentUser ? "season-leaderboard-highlight" : ""
                    }`}
                    style={{
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    {/* Rank number */}
                    <div className="w-8 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">
                          {entry.rank === 1 ? "\u{1F947}" : entry.rank === 2 ? "\u{1F948}" : "\u{1F949}"}
                        </span>
                      ) : (
                        <span className="mono text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Rank badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${entryRank.cssClass}`}
                      style={{ color: entryRank.color, border: `1px solid ${entryRank.color}40`, backgroundColor: `${entryRank.color}10` }}
                    >
                      {getSeasonRankIcon(entryRank.id, 14)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${entry.isCurrentUser ? "" : ""}`}
                        style={{ color: entry.isCurrentUser ? "#06b6d4" : "var(--text-primary)" }}
                      >
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
                            vous
                          </span>
                        )}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {entryRank.name} · {entry.challengesCompleted} challenges
                      </p>
                    </div>

                    {/* XP */}
                    <div className="text-right flex-shrink-0">
                      <p className="mono text-sm font-bold" style={{ color: entryRank.color }}>
                        {entry.xp.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Challenge Cards Grid */}
      {activeTab !== "saison" && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => {
          const pct = c.progress;
          const done = c.completed && c.joined;
          const nearDone = pct >= 80 && !done;
          const isCelebrating = celebratingId === c.id;
          const deadline = getDeadline(c.category);
          const countdown = formatCountdown(deadline);

          return (
            <div
              key={c.id}
              className={`relative glass rounded-2xl p-5 bg-gradient-to-br ${c.gradient} transition-all duration-300 hover:scale-[1.01] ${
                nearDone ? "ring-1 ring-amber-500/30 animate-pulse-slow" : ""
              } ${done ? "ring-2" : ""}`}
              style={{
                border: `1px solid ${done ? c.color + "80" : "var(--border)"}`,
                ...(done ? { boxShadow: `0 0 20px ${c.color}20` } : {}),
              }}
            >
              <ConfettiBurst active={isCelebrating} />

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${done ? "scale-110" : ""}`}
                    style={{
                      backgroundColor: `${c.color}20`,
                      color: c.color,
                      ...(done ? { boxShadow: `0 0 12px ${c.color}40` } : {}),
                    }}
                  >
                    {done ? <CheckCircle2 size={22} /> : getIcon(c.icon, 20)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {c.title}
                    </h3>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${c.color}15`,
                        color: c.color,
                      }}
                    >
                      {c.category === "daily" ? "Quotidien" : c.category === "weekly" ? "Hebdomadaire" : c.category === "monthly" ? "Mensuel" : "Spécial"}
                    </span>
                  </div>
                </div>
                {done && (
                  <div className="flex items-center gap-1">
                    <Trophy size={16} className="text-amber-500" />
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {c.description}
              </p>

              {/* Countdown */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Timer size={13} style={{ color: "var(--text-muted)" }} />
                  <span
                    className="mono text-xs"
                    style={{
                      color: countdown === "Terminé" || (c.category === "daily" && parseInt(countdown) < 2)
                        ? "#ef4444"
                        : "var(--text-muted)",
                    }}
                  >
                    {countdown}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles size={12} style={{ color: c.color }} />
                  <span className="mono text-xs font-semibold" style={{ color: c.color }}>
                    +{c.reward.xp} XP
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "var(--bg-primary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${c.joined ? pct : 0}%`,
                    background: done
                      ? `linear-gradient(90deg, ${c.color}, ${c.color}cc)`
                      : c.color,
                  }}
                />
                {done && (
                  <div
                    className="absolute inset-0 rounded-full animate-shimmer"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${c.color}40, transparent)`,
                      backgroundSize: "200% 100%",
                    }}
                  />
                )}
              </div>

              {/* Progress Text */}
              <div className="flex justify-between mb-4">
                <span className="mono text-xs font-medium" style={{ color: c.color }}>
                  {c.joined ? `${c.current}/${c.target}` : "-/-"}
                </span>
                <span className="mono text-xs font-bold" style={{ color: done ? c.color : "var(--text-muted)" }}>
                  {c.joined ? `${Math.round(pct)}%` : ""}
                </span>
              </div>

              {/* Reward Badge */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                style={{
                  backgroundColor: `${c.color}08`,
                  border: `1px solid ${c.color}20`,
                }}
              >
                <Gift size={14} style={{ color: c.color }} />
                <span className="text-xs font-medium" style={{ color: c.color }}>
                  {c.reward.badge}
                </span>
              </div>

              {/* Action Button */}
              {done ? (
                <div
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: `${c.color}15`, color: c.color }}
                >
                  <CheckCircle2 size={16} />
                  Complété !
                </div>
              ) : c.joined ? (
                <div
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    border: `1px solid ${c.color}30`,
                    color: c.color,
                  }}
                >
                  <Clock size={14} />
                  En cours...
                </div>
              ) : (
                <button
                  onClick={() => handleJoin(c.id)}
                  disabled={joining === c.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`,
                  }}
                >
                  {joining === c.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} />
                      Rejoindre
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Shimmer animation style */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
