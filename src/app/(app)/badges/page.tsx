"use client";

import {
  useGamification,
  type Badge,
  type BadgeRarity,
  type DailyQuest,
} from "@/hooks/useGamification";
import {
  Trophy, Flame, Shield, Target, Zap, Award, Crown, Star,
  Crosshair, TrendingUp, MessageCircle, Image, Calendar,
  Brain, Rocket, Swords, ShieldCheck, Lock, CheckCircle2,
  Sparkles, ChevronRight, X, Users, Clock, DollarSign,
  Heart, Share2, Gem, Ruler, CheckCircle,
} from "lucide-react";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
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
  "dollar-sign": DollarSign,
  gem: Gem,
  heart: Heart,
  share: Share2,
  award: Award,
  ruler: Ruler,
  "check-circle": CheckCircle,
};

/* ─── Category labels & order (French) ─── */
const CATEGORIES: { key: string; label: string; emoji: string; icon: React.ElementType }[] = [
  { key: "trading", label: "Trading", emoji: "\u{1F3C6}", icon: Trophy },
  { key: "performance", label: "Performance", emoji: "\u{1F4CA}", icon: TrendingUp },
  { key: "risk", label: "Gestion du risque", emoji: "\u{1F6E1}", icon: Shield },
  { key: "discipline", label: "Discipline", emoji: "\u{1F3AF}", icon: Target },
  { key: "milestones", label: "Jalons", emoji: "\u{1F48E}", icon: Gem },
  { key: "community", label: "Communauté", emoji: "\u{1F31F}", icon: Users },
  { key: "streaks", label: "Séries", emoji: "\u{1F525}", icon: Flame },
];

/* ─── Quest icon map ─── */
const QUEST_ICON_MAP: Record<string, React.ElementType> = {
  pencil: Swords,
  target: Target,
  eye: Crosshair,
  message: MessageCircle,
  trending: TrendingUp,
};

/* ─── Rarity config ─── */
const RARITY_CONFIG: Record<BadgeRarity, { label: string; color: string; border: string; bg: string; glow: string }> = {
  common: { label: "Commun", color: "text-gray-400", border: "border-gray-300 dark:border-gray-600", bg: "bg-gray-100 dark:bg-gray-800", glow: "" },
  rare: { label: "Rare", color: "text-blue-400", border: "border-blue-400 dark:border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", glow: "shadow-blue-500/20" },
  epic: { label: "Épique", color: "text-purple-400", border: "border-purple-400 dark:border-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", glow: "shadow-purple-500/20" },
  legendary: { label: "Légendaire", color: "text-amber-400", border: "border-amber-400 dark:border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", glow: "shadow-amber-500/30" },
};

/* ─── Showcase storage key ─── */
const SHOWCASE_KEY = "protrade_badge_showcase";

function loadShowcase(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHOWCASE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShowcase(ids: string[]) {
  localStorage.setItem(SHOWCASE_KEY, JSON.stringify(ids));
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Badge Card                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function BadgeCard({
  badge,
  onSelect,
  isShowcased,
  onToggleShowcase,
}: {
  badge: Badge;
  onSelect: (b: Badge) => void;
  isShowcased: boolean;
  onToggleShowcase: (id: string) => void;
}) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const progress = badge.target > 0 ? Math.min(badge.current / badge.target, 1) : 0;
  const rarity = RARITY_CONFIG[badge.rarity];

  return (
    <div
      onClick={() => onSelect(badge)}
      className={`relative group p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl ${
        badge.unlocked
          ? `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl ${rarity.border} shadow-lg ${rarity.glow}`
          : "bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 opacity-50 grayscale"
      }`}
    >
      {/* Legendary shimmer effect */}
      {badge.unlocked && badge.rarity === "legendary" && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Glow effect for unlocked */}
      {badge.unlocked && (
        <div
          className="absolute inset-0 rounded-2xl opacity-15 blur-xl transition-opacity group-hover:opacity-25 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${badge.color}, transparent 70%)` }}
        />
      )}

      {/* Showcase star */}
      {isShowcased && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleShowcase(badge.id); }}
          className="absolute top-2 right-2 z-20"
        >
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        </button>
      )}

      <div className="relative z-10">
        {/* Icon + Lock + Rarity */}
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
          <div className="flex flex-col items-end gap-1">
            {badge.unlocked ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${rarity.color}`}>
              {rarity.label}
            </span>
          </div>
        </div>

        {/* Name & desc */}
        <h3
          className={`font-semibold text-sm mb-1 ${
            badge.unlocked ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-500"
          }`}
        >
          {badge.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed line-clamp-2">
          {badge.description}
        </p>

        {/* Progress bar */}
        {!badge.unlocked && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
              <span>Progression</span>
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

        {/* XP reward tag + community % */}
        <div className="flex items-center justify-between mt-2">
          {badge.unlocked ? (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
                +{badge.xpReward} XP
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-400">
                +{badge.xpReward} XP
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">{badge.percentOwned}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Badge Detail Modal                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function BadgeDetailModal({
  badge,
  onClose,
  isShowcased,
  onToggleShowcase,
  canAddShowcase,
}: {
  badge: Badge;
  onClose: () => void;
  isShowcased: boolean;
  onToggleShowcase: (id: string) => void;
  canAddShowcase: boolean;
}) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const rarity = RARITY_CONFIG[badge.rarity];
  const progress = badge.target > 0 ? Math.min(badge.current / badge.target, 1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl border-2 ${rarity.border} shadow-2xl overflow-hidden`}>
        {/* Header gradient */}
        <div
          className="h-32 flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}11)` }}
        >
          {badge.unlocked && badge.rarity === "legendary" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-shimmer" />
          )}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${
              badge.unlocked ? "" : "grayscale opacity-50"
            }`}
            style={{
              background: badge.unlocked
                ? `linear-gradient(135deg, ${badge.color}44, ${badge.color}77)`
                : "linear-gradient(135deg, #6b728022, #6b728044)",
            }}
          >
            <Icon className="w-10 h-10" style={{ color: badge.unlocked ? "#fff" : "#9ca3af" }} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title & rarity */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{badge.name}</h2>
            <span className={`text-xs font-bold uppercase tracking-wider ${rarity.color}`}>
              {rarity.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
            {badge.description}
          </p>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Progression</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {badge.unlocked ? "Complete" : `${badge.current} / ${badge.target}`}
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(badge.unlocked ? 1 : progress) * 100}%`,
                  background: `linear-gradient(90deg, ${badge.color}88, ${badge.color})`,
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Recompense</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{badge.xpReward} XP</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Possede par</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{badge.percentOwned}%</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Obtenu le</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {badge.unlockedAt
                  ? new Date(badge.unlockedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  : "--"}
              </p>
            </div>
          </div>

          {/* Showcase toggle */}
          {badge.unlocked && (
            <button
              onClick={() => onToggleShowcase(badge.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isShowcased
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  : canAddShowcase
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800 cursor-not-allowed"
              }`}
              disabled={!isShowcased && !canAddShowcase}
            >
              {isShowcased ? (
                <span className="flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Retire de la vitrine
                </span>
              ) : canAddShowcase ? (
                <span className="flex items-center justify-center gap-2">
                  <Star className="w-4 h-4" />
                  Ajouter a la vitrine
                </span>
              ) : (
                "Vitrine pleine (3 max)"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Quest Card                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

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
          Fait
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Recently Earned Badge Toast                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function NewBadgeToast({ badge, onDismiss }: { badge: Badge; onDismiss: () => void }) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const rarity = RARITY_CONFIG[badge.rarity];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 ${rarity.border} bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl max-w-sm`}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${badge.color}44, ${badge.color}77)` }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-0.5">
            Badge debloque !
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {badge.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">+{badge.xpReward} XP</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Category Filter Tabs                                              */
/* ═══════════════════════════════════════════════════════════════════ */

function CategoryTabs({
  categories,
  active,
  onChange,
  groupedBadges,
}: {
  categories: typeof CATEGORIES;
  active: string;
  onChange: (key: string) => void;
  groupedBadges: Record<string, Badge[]>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          active === "all"
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-blue-500/25"
            : "bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
        }`}
      >
        Tous
      </button>
      {categories.map(({ key, label, emoji }) => {
        const badges = groupedBadges[key];
        if (!badges || badges.length === 0) return null;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              active === key
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-blue-500/25"
                : "bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {emoji} {label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Page                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

export default function BadgesPage() {
  const { data, loading, error } = useGamification();
  const { addNotification } = useNotificationSystem();
  const previousUnlocked = useRef<Set<string>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showcase, setShowcase] = useState<string[]>(loadShowcase);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  // Detect newly unlocked badges
  useEffect(() => {
    if (!data?.badges) return;

    const currentUnlocked = new Set(
      data.badges.filter((b) => b.unlocked).map((b) => b.id)
    );

    const stored = localStorage.getItem("protrade_known_badges");
    const knownSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();

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
          setNewBadge(badge);
        }
      }
    }

    localStorage.setItem(
      "protrade_known_badges",
      JSON.stringify([...currentUnlocked])
    );
    previousUnlocked.current = currentUnlocked;
  }, [data, addNotification]);

  const toggleShowcase = useCallback(
    (id: string) => {
      setShowcase((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < 3
          ? [...prev, id]
          : prev;
        saveShowcase(next);
        return next;
      });
    },
    []
  );

  const groupedBadges = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, Badge[]> = {};
    for (const b of data.badges) {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    }
    return groups;
  }, [data]);

  const showcaseBadges = useMemo(() => {
    if (!data) return [];
    return showcase
      .map((id) => data.badges.find((b) => b.id === id))
      .filter((b): b is Badge => !!b && b.unlocked);
  }, [data, showcase]);

  const unlockedCount = data?.badges.filter((b) => b.unlocked).length ?? 0;
  const totalBadges = data?.badges.length ?? 0;

  // Points total
  const totalPoints = useMemo(() => {
    if (!data) return 0;
    return data.badges
      .filter((b) => b.unlocked)
      .reduce((sum, b) => sum + b.xpReward, 0);
  }, [data]);

  // Rarity stats
  const rarityStats = useMemo(() => {
    if (!data) return { common: 0, rare: 0, epic: 0, legendary: 0 };
    const unlocked = data.badges.filter((b) => b.unlocked);
    return {
      common: unlocked.filter((b) => b.rarity === "common").length,
      rare: unlocked.filter((b) => b.rarity === "rare").length,
      epic: unlocked.filter((b) => b.rarity === "epic").length,
      legendary: unlocked.filter((b) => b.rarity === "legendary").length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-10 w-96 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          Erreur de chargement : {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const xpProgress =
    data.level.nextLevelXp > data.level.levelMinXp
      ? (data.xp - data.level.levelMinXp) / (data.level.nextLevelXp - data.level.levelMinXp)
      : 1;

  // Filter badges for display
  const displayBadges =
    activeCategory === "all"
      ? data.badges
      : data.badges.filter((b) => b.category === activeCategory);

  // Sort: unlocked first, then by rarity (legendary > epic > rare > common)
  const rarityOrder: Record<BadgeRarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sortedBadges = [...displayBadges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* ─── New badge toast ─── */}
      {newBadge && (
        <NewBadgeToast badge={newBadge} onDismiss={() => setNewBadge(null)} />
      )}

      {/* ─── Badge detail modal ─── */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
          isShowcased={showcase.includes(selectedBadge.id)}
          onToggleShowcase={toggleShowcase}
          canAddShowcase={showcase.length < 3}
        />
      )}

      {/* ═══ Header: Level + XP + Points ═══ */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Level badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Trophy className="w-9 h-9 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
              Nv.{data.level.index + 1}
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
                ? `${(data.level.nextLevelXp - data.xp).toLocaleString()} XP pour ${data.level.nextLevelName}`
                : "Niveau maximum atteint !"}
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
                <strong className="text-gray-900 dark:text-white">{totalPoints.toLocaleString()}</strong> pts badges
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.totalTrades}</strong> trades
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.winRate}%</strong> win rate
              </span>
              <span>
                <strong className="text-gray-900 dark:text-white">{data.stats.winStreak}</strong> meilleure serie
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Rarity breakdown mini-bar ═══ */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Gem className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Rarete des badges</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(["common", "rare", "epic", "legendary"] as BadgeRarity[]).map((r) => {
            const cfg = RARITY_CONFIG[r];
            const count = rarityStats[r];
            const total = data.badges.filter((b) => b.rarity === r).length;
            return (
              <div key={r} className={`rounded-xl p-3 text-center border ${cfg.border} ${cfg.bg}`}>
                <p className={`text-lg font-bold ${cfg.color}`}>{count}/{total}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Badge Showcase ═══ */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Star className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Ma vitrine</h2>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">
            {showcaseBadges.length}/3 badges selectionnes
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((slot) => {
            const badge = showcaseBadges[slot];
            if (badge) {
              const Icon = ICON_MAP[badge.icon] || Award;
              const rarity = RARITY_CONFIG[badge.rarity];
              return (
                <div
                  key={slot}
                  onClick={() => setSelectedBadge(badge)}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${rarity.border} cursor-pointer hover:scale-[1.02] transition-all`}
                  style={{ background: `linear-gradient(135deg, ${badge.color}08, ${badge.color}15)` }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${badge.color}44, ${badge.color}77)` }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white text-center">{badge.name}</span>
                  <span className={`text-[10px] font-bold uppercase ${rarity.color}`}>{rarity.label}</span>
                </div>
              );
            }
            return (
              <div
                key={slot}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 min-h-[120px]"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <span className="text-[11px] text-gray-400">Emplacement vide</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Daily Quests ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quetes du jour</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
            {data.dailyQuests.filter((q) => q.completed).length} / {data.dailyQuests.length} completees
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.dailyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      </div>

      {/* ═══ Category filter tabs ═══ */}
      <CategoryTabs
        categories={CATEGORIES}
        active={activeCategory}
        onChange={setActiveCategory}
        groupedBadges={groupedBadges}
      />

      {/* ═══ Badges grid ═══ */}
      {activeCategory === "all" ? (
        // Grouped by category
        CATEGORIES.map(({ key, label, emoji, icon: CatIcon }) => {
          const badges = groupedBadges[key];
          if (!badges || badges.length === 0) return null;
          const catUnlocked = badges.filter((b) => b.unlocked).length;
          const sorted = [...badges].sort((a, b) => {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
            return rarityOrder[a.rarity] - rarityOrder[b.rarity];
          });
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-4">
                <CatIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {emoji} {label}
                </h2>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                  {catUnlocked} / {badges.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    onSelect={setSelectedBadge}
                    isShowcased={showcase.includes(badge.id)}
                    onToggleShowcase={toggleShowcase}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // Single category flat
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onSelect={setSelectedBadge}
              isShowcased={showcase.includes(badge.id)}
              onToggleShowcase={toggleShowcase}
            />
          ))}
        </div>
      )}

      {/* ═══ Custom animations ═══ */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
