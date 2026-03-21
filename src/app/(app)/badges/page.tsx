"use client";

import { useGamification, type Badge, type DailyQuest } from "@/hooks/useGamification";
import {
  Trophy, Flame, Shield, Target, Zap, Award, Crown, Star,
  Crosshair, TrendingUp, MessageCircle, Image, Calendar,
  Brain, Rocket, Swords, ShieldCheck, Lock, CheckCircle2,
  Sparkles, ChevronRight,
} from "lucide-react";
import { useMemo, useEffect, useRef } from "react";
import { useNotificationSystem } from "@/hooks/useNotifications";

/* ─── Icon map ─── */
const ICON_MAP: Record<string, React.ElementType> = {
  swords: Swords,
  target: Target,
  shield: Shield,
  crown: Crown,
  flame: Flame,
  zap: Zap,
  rocket: Rocket,
  calendar: Calendar,
  star: Star,
  brain: Brain,
  crosshair: Crosshair,
  "trending-up": TrendingUp,
  "shield-check": ShieldCheck,
  "message-circle": MessageCircle,
  image: Image,
  pencil: Swords,
  eye: Crosshair,
  message: MessageCircle,
  trending: TrendingUp,
};

/* ─── Category labels & order ─── */
const CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "milestones", label: "Trade Milestones", icon: Trophy },
  { key: "streaks", label: "Win Streaks", icon: Flame },
  { key: "consistency", label: "Consistency", icon: Calendar },
  { key: "performance", label: "Performance", icon: TrendingUp },
  { key: "social", label: "Social", icon: MessageCircle },
];

/* ─── Quest icon map ─── */
const QUEST_ICON_MAP: Record<string, React.ElementType> = {
  pencil: Swords,
  target: Target,
  eye: Crosshair,
  message: MessageCircle,
  trending: TrendingUp,
};

function BadgeCard({ badge }: { badge: Badge }) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const progress = badge.target > 0 ? Math.min(badge.current / badge.target, 1) : 0;

  return (
    <div
      className={`relative group p-5 rounded-2xl border transition-all duration-300 ${
        badge.unlocked
          ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-700 shadow-lg"
          : "bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 opacity-60 grayscale"
      }`}
    >
      {/* Glow effect for unlocked */}
      {badge.unlocked && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity group-hover:opacity-30"
          style={{ background: `radial-gradient(circle at center, ${badge.color}, transparent 70%)` }}
        />
      )}

      <div className="relative z-10">
        {/* Icon + Lock */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              badge.unlocked ? "shadow-lg" : ""
            }`}
            style={{
              background: badge.unlocked
                ? `linear-gradient(135deg, ${badge.color}22, ${badge.color}44)`
                : undefined,
            }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: badge.unlocked ? badge.color : "#9ca3af" }}
            />
          </div>
          {badge.unlocked ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
          )}
        </div>

        {/* Name & desc */}
        <h3
          className={`font-semibold text-sm mb-1 ${
            badge.unlocked ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-500"
          }`}
        >
          {badge.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
          {badge.description}
        </p>

        {/* Progress bar */}
        {!badge.unlocked && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
              <span>Progress</span>
              <span>
                {badge.current} / {badge.target}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background: `linear-gradient(90deg, ${badge.color}88, ${badge.color})`,
                }}
              />
            </div>
          </div>
        )}

        {/* XP reward tag */}
        {badge.unlocked && (
          <div className="flex items-center gap-1 mt-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
              +{badge.xpReward} XP
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: DailyQuest }) {
  const Icon = QUEST_ICON_MAP[quest.icon] || Target;
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        quest.completed
          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50"
          : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-800"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          quest.completed
            ? "bg-emerald-100 dark:bg-emerald-900/50"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        {quest.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
      </div>
      <span
        className={`text-sm font-medium flex-1 ${
          quest.completed
            ? "text-emerald-700 dark:text-emerald-300 line-through"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {quest.title}
      </span>
      {quest.completed && (
        <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">
          Done
        </span>
      )}
    </div>
  );
}

export default function BadgesPage() {
  const { data, loading, error } = useGamification();
  const { addNotification } = useNotificationSystem();
  const previousUnlocked = useRef<Set<string>>(new Set());

  // Detect newly unlocked badges
  useEffect(() => {
    if (!data?.badges) return;

    const currentUnlocked = new Set(
      data.badges.filter((b) => b.unlocked).map((b) => b.id)
    );

    // Load previously known unlocked badges from localStorage
    const stored = localStorage.getItem("protrade_known_badges");
    const knownSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();

    // Find new unlocks
    for (const id of currentUnlocked) {
      if (!knownSet.has(id)) {
        const badge = data.badges.find((b) => b.id === id);
        if (badge) {
          addNotification(
            "ACHIEVEMENT",
            "Badge debloque !",
            `${badge.name} - ${badge.description}`,
            "/badges"
          );
        }
      }
    }

    // Persist current state
    localStorage.setItem(
      "protrade_known_badges",
      JSON.stringify([...currentUnlocked])
    );
    previousUnlocked.current = currentUnlocked;
  }, [data, addNotification]);

  const groupedBadges = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, Badge[]> = {};
    for (const b of data.badges) {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    }
    return groups;
  }, [data]);

  const unlockedCount = data?.badges.filter((b) => b.unlocked).length ?? 0;
  const totalBadges = data?.badges.length ?? 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          Error loading gamification data: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const xpProgress =
    data.level.nextLevelXp > data.level.levelMinXp
      ? (data.xp - data.level.levelMinXp) / (data.level.nextLevelXp - data.level.levelMinXp)
      : 1;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header: Level + XP */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Level badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Trophy className="w-9 h-9 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
              Lv.{data.level.index + 1}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.level.name}
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.xp.toLocaleString()} XP
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {data.level.nextLevelXp > data.level.levelMinXp
                ? `${(data.level.nextLevelXp - data.xp).toLocaleString()} XP to ${data.level.nextLevelName}`
                : "Max level reached!"}
            </p>

            {/* XP bar */}
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
                style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                <strong className="text-gray-900 dark:text-white">{unlockedCount}</strong> / {totalBadges} badges
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.totalTrades}</strong> trades
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.winRate}%</strong> win rate
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.winStreak}</strong> best streak
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Quests */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily Quests</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
            {data.dailyQuests.filter((q) => q.completed).length} / {data.dailyQuests.length} completed
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.dailyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      </div>

      {/* Badges by category */}
      {CATEGORIES.map(({ key, label, icon: CatIcon }) => {
        const badges = groupedBadges[key];
        if (!badges || badges.length === 0) return null;
        const catUnlocked = badges.filter((b) => b.unlocked).length;
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-4">
              <CatIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{label}</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {catUnlocked} / {badges.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
