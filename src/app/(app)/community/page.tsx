"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { useGamification } from "@/hooks/useGamification";
import { TradeCard } from "@/components/TradeCard";
import { CommunityShareTradeModal } from "@/components/CommunityShareTradeModal";
import { calculateRR } from "@/lib/utils";
import {
  Users,
  Send,
  Share2,
  Smile,
  TrendingUp,
  Trophy,
  MessageCircle,
  Loader2,
  Target,
  Award,
  MessageSquare,
  BarChart3,
  Sparkles,
  GitCompare,
  Bookmark,
  GraduationCap,
  Clock,
  Bell,
  CheckCircle,
  Flame,
  Star,
  Zap,
  Shield,
  Lightbulb,
  LineChart,
  Heart,
  Repeat2,
  Image as ImageIcon,
  ArrowUp,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface SharedTrade {
  id: string;
  asset: string;
  direction: string;
  strategy: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  date: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string | null };
}

interface FeedMessage {
  id: string;
  content: string;
  imageUrl: string | null;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role?: string;
  };
  roomId: string;
  trade: SharedTrade | null;
  isPinned: boolean;
  reactions: Reaction[];
  createdAt: string;
}

/* ─── Tabs ──────────────────────────────────────────────── */

type TabId = "feed" | "leaderboard" | "challenges" | "discussions" | "highlights" | "mentors" | "compare";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "feed", label: "Fil d'actualite", icon: MessageCircle },
  { id: "leaderboard", label: "Classement", icon: Trophy },
  { id: "challenges", label: "Defis", icon: Target },
  { id: "discussions", label: "Discussions", icon: MessageSquare },
  { id: "highlights", label: "Best Of", icon: Sparkles },
  { id: "mentors", label: "Mentorat", icon: GraduationCap },
  { id: "compare", label: "Comparer", icon: GitCompare },
];

const QUICK_EMOJIS = ["\ud83d\udc4d", "\ud83d\udd25", "\ud83d\udcb0", "\ud83d\udcc8", "\ud83c\udfaf", "\ud83d\udcaa"];

const MAX_POST_LENGTH = 500;

/* ─── Tab placeholder metadata ─────────────────────────── */

interface TabPlaceholderInfo {
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  title: string;
  subtitle: string;
  description: string;
  features: { icon: React.ElementType; text: string }[];
}

const TAB_PLACEHOLDERS: Record<string, TabPlaceholderInfo> = {
  leaderboard: {
    icon: Trophy,
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
    title: "Classement",
    subtitle: "Grimpez les echelons",
    description:
      "Comparez vos performances avec les autres traders de la communaute. Classements hebdomadaires et mensuels bases sur le win rate, le P&L et la regularite.",
    features: [
      { icon: Trophy, text: "Classements hebdomadaires et mensuels" },
      { icon: TrendingUp, text: "Bases sur vos vrais resultats de trading" },
      { icon: Star, text: "Badges et recompenses exclusifs" },
    ],
  },
  challenges: {
    icon: Target,
    accentColor: "text-rose-400",
    accentBg: "bg-rose-500/10",
    accentBorder: "border-rose-500/20",
    title: "Defis",
    subtitle: "Relevez le challenge",
    description:
      "Participez a des defis de trading hebdomadaires avec des objectifs precis. Meilleur win rate, plus gros R:R, serie de trades gagnants...",
    features: [
      { icon: Target, text: "Defis hebdomadaires avec objectifs clairs" },
      { icon: Flame, text: "Competions par categorie de trading" },
      { icon: Award, text: "Badges speciaux pour les gagnants" },
    ],
  },
  discussions: {
    icon: MessageSquare,
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    title: "Discussions",
    subtitle: "Echangez entre traders",
    description:
      "Forums thematiques pour discuter strategies, analyses de marche, psychologie du trading et plus encore. Creez vos propres sujets.",
    features: [
      { icon: MessageSquare, text: "Forums par categorie (strategie, psychologie...)" },
      { icon: Lightbulb, text: "Partagez vos analyses et setups" },
      { icon: Bookmark, text: "Sauvegardez les meilleurs posts" },
    ],
  },
  highlights: {
    icon: Sparkles,
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-500/20",
    title: "Best Of",
    subtitle: "Les meilleurs moments",
    description:
      "Selection hebdomadaire des meilleurs trades, analyses et contributions de la communaute. Vote par les membres.",
    features: [
      { icon: Sparkles, text: "Meilleurs trades de la semaine" },
      { icon: Star, text: "Analyses les plus pertinentes" },
      { icon: Zap, text: "Votes de la communaute" },
    ],
  },
  mentors: {
    icon: GraduationCap,
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    title: "Mentorat",
    subtitle: "Apprenez des meilleurs",
    description:
      "Connectez-vous avec des traders experimentes pour du coaching personnalise. Sessions de mentorat, revue de trades et accompagnement.",
    features: [
      { icon: GraduationCap, text: "Mentorat par des traders experimentes" },
      { icon: Shield, text: "Profils verifies et notes par la communaute" },
      { icon: LineChart, text: "Revue de vos trades et conseils personnalises" },
    ],
  },
  compare: {
    icon: GitCompare,
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    accentBorder: "border-cyan-500/20",
    title: "Comparer",
    subtitle: "Analysez vos ecarts",
    description:
      "Comparez vos statistiques avec d'autres traders anonymises. Identifiez vos forces, vos faiblesses et les axes d'amelioration.",
    features: [
      { icon: GitCompare, text: "Comparaison anonymisee des statistiques" },
      { icon: BarChart3, text: "Graphiques detailles par metrique" },
      { icon: TrendingUp, text: "Suggestions d'amelioration personnalisees" },
    ],
  },
};

/* ─── Helpers ───────────────────────────────────────────── */

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getAvatarGradient(name: string | null) {
  const gradients = [
    "from-cyan-400 to-blue-600",
    "from-purple-400 to-pink-600",
    "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-600",
    "from-rose-400 to-red-600",
    "from-indigo-400 to-violet-600",
  ];
  if (!name) return gradients[0];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

/* ─── Notify hook (localStorage) ─────────────────────────── */

function useNotifyPreferences() {
  const [notified, setNotified] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("community-notify-prefs");
      if (stored) setNotified(new Set(JSON.parse(stored)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((tabId: string) => {
    setNotified((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      try {
        localStorage.setItem("community-notify-prefs", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { notified, toggle };
}

/* ─── Likes hook (localStorage) ─────────────────────────── */

function useLikes() {
  const [likes, setLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("community-likes");
      if (stored) setLikes(new Set(JSON.parse(stored)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLike = useCallback((messageId: string) => {
    setLikes((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      try {
        localStorage.setItem("community-likes", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { likes, toggleLike };
}

/* ─── Bookmarks hook (localStorage) ─────────────────────── */

function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("community-bookmarks");
      if (stored) setBookmarks(new Set(JSON.parse(stored)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleBookmark = useCallback((messageId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      try {
        localStorage.setItem("community-bookmarks", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { bookmarks, toggleBookmark };
}

/* ─── Enhanced Placeholder component ─────────────────────── */

function ComingSoonPlaceholder({ tabId, isNotified, onToggleNotify }: { tabId: string; isNotified: boolean; onToggleNotify: () => void }) {
  const info = TAB_PLACEHOLDERS[tabId];
  if (!info) return null;
  const Icon = info.icon;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${
              info.accentColor.includes("amber") ? "#f59e0b" :
              info.accentColor.includes("rose") ? "#f43f5e" :
              info.accentColor.includes("blue") ? "#3b82f6" :
              info.accentColor.includes("purple") ? "#a855f7" :
              info.accentColor.includes("emerald") ? "#10b981" :
              "#06b6d4"
            } 0%, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl ${info.accentBg} border ${info.accentBorder} flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-8 h-8 ${info.accentColor}`} />
        </div>

        {/* Title & subtitle */}
        <h2 className="text-2xl font-bold text-[--text-primary] mb-1">{info.title}</h2>
        <p className={`text-sm font-medium ${info.accentColor} mb-4`}>{info.subtitle}</p>

        {/* Description */}
        <p className="text-sm text-[--text-secondary] leading-relaxed max-w-lg mx-auto mb-8">
          {info.description}
        </p>

        {/* Feature list */}
        <div className="space-y-3 max-w-md mx-auto mb-8">
          {info.features.map((f, i) => {
            const FIcon = f.icon;
            return (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className={`w-8 h-8 rounded-lg ${info.accentBg} border ${info.accentBorder} flex items-center justify-center shrink-0`}>
                  <FIcon className={`w-4 h-4 ${info.accentColor}`} />
                </div>
                <span className="text-sm text-[--text-secondary]">{f.text}</span>
              </div>
            );
          })}
        </div>

        {/* Notify button */}
        <button
          onClick={onToggleNotify}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isNotified
              ? "bg-[--bg-secondary] border border-[--border] text-emerald-400"
              : `${info.accentBg} border ${info.accentBorder} ${info.accentColor} hover:opacity-80`
          }`}
        >
          {isNotified ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Notification activee
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              M&apos;avertir du lancement
            </>
          )}
        </button>

        {/* Coming soon badge */}
        <div className="mt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[--bg-secondary]/60 border border-[--border] text-xs text-[--text-muted]">
            <Clock className="w-3 h-3" />
            Disponible prochainement
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Tweet-style Post Component ─────────────────────────── */

function TweetPost({
  msg,
  reactions,
  isLiked,
  isBookmarked,
  currentUserId,
  onReaction,
  onLike,
  onBookmark,
  onReply,
}: {
  msg: FeedMessage;
  reactions: { emoji: string; count: number; users: string[]; hasReacted: boolean }[];
  isLiked: boolean;
  isBookmarked: boolean;
  currentUserId: string | null;
  onReaction: (messageId: string, emoji: string) => void;
  onLike: (messageId: string) => void;
  onBookmark: (messageId: string) => void;
  onReply: (messageId: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const likeCount = reactions.reduce((s, r) => s + r.count, 0) + (isLiked ? 1 : 0);
  const gradient = getAvatarGradient(msg.user.name);

  return (
    <article
      className="px-4 py-4 border-b border-[--border] hover:bg-[--bg-secondary]/30 transition-colors cursor-default"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {getInitials(msg.user.name)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header line */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-[--text-primary] hover:underline cursor-pointer">
              {msg.user.name || "Anonyme"}
            </span>
            {msg.user.role === "ADMIN" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ADMIN
              </span>
            )}
            <span className="text-[--text-muted] text-sm">&middot;</span>
            <span className="text-[--text-muted] text-sm hover:underline cursor-pointer">
              {formatTime(msg.createdAt)}
            </span>
          </div>

          {/* Post content */}
          <div className="mt-1">
            <p className="text-[15px] text-[--text-primary] whitespace-pre-wrap break-words leading-relaxed">
              {msg.content}
            </p>
          </div>

          {/* Trade card if attached */}
          {msg.trade && (
            <div className="mt-3 rounded-xl border border-[--border] overflow-hidden">
              <TradeCard trade={msg.trade} />
            </div>
          )}

          {/* Image if attached */}
          {msg.imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[--border]">
              <img
                src={msg.imageUrl}
                alt="Image partagee"
                className="w-full h-auto max-h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Emoji reactions display */}
          {reactions.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReaction(msg.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                    r.hasReacted
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                      : "bg-[--bg-secondary]/60 border border-[--border] text-[--text-secondary] hover:bg-[--bg-secondary]"
                  }`}
                  title={r.users.join(", ")}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action bar — Twitter-style */}
          <div className="flex items-center justify-between mt-3 -ml-2 max-w-md">
            {/* Reply */}
            <button
              onClick={() => onReply(msg.id)}
              className="group flex items-center gap-1.5 p-2 rounded-full text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
              title="Repondre"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-xs">{reactions.length > 0 ? reactions.length : ""}</span>
            </button>

            {/* Repost */}
            <button
              className="group flex items-center gap-1.5 p-2 rounded-full text-[--text-muted] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all opacity-50 cursor-default"
              title="Disponible prochainement"
            >
              <Repeat2 className="w-[18px] h-[18px]" />
            </button>

            {/* Like (heart) */}
            <button
              onClick={() => onLike(msg.id)}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-all ${
                isLiked
                  ? "text-rose-500"
                  : "text-[--text-muted] hover:text-rose-500 hover:bg-rose-500/10"
              }`}
              title="J'aime"
            >
              <Heart
                className={`w-[18px] h-[18px] transition-transform ${isLiked ? "fill-rose-500 scale-110" : ""}`}
                style={isLiked ? { fill: "currentColor" } : undefined}
              />
              <span className="text-xs">{likeCount > 0 ? likeCount : ""}</span>
            </button>

            {/* Emoji reaction */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="group flex items-center gap-1.5 p-2 rounded-full text-[--text-muted] hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                title="Reagir"
              >
                <Smile className="w-[18px] h-[18px]" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 p-2 rounded-xl bg-[--bg-card-solid] border border-[--border] shadow-2xl z-30">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(msg.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[--bg-secondary] transition text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bookmark */}
            <button
              onClick={() => onBookmark(msg.id)}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-all ${
                isBookmarked
                  ? "text-cyan-400"
                  : "text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10"
              }`}
              title="Sauvegarder"
            >
              <Bookmark
                className={`w-[18px] h-[18px] ${isBookmarked ? "fill-cyan-400" : ""}`}
                style={isBookmarked ? { fill: "currentColor" } : undefined}
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Post Composer ─────────────────────────────────────── */

function PostComposer({
  input,
  setInput,
  sending,
  onSend,
  onShareTrade,
  userName,
}: {
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onShareTrade: () => void;
  userName: string | null;
}) {
  const gradient = getAvatarGradient(userName);
  const remaining = MAX_POST_LENGTH - input.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="px-4 py-4 border-b border-[--border]" style={{ borderColor: "var(--border)" }}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {getInitials(userName)}
        </div>

        {/* Composer area */}
        <div className="flex-1 min-w-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_POST_LENGTH + 50))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isOverLimit) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Quoi de neuf sur les marches ?"
            rows={3}
            className="w-full bg-transparent text-[--text-primary] text-lg placeholder:text-[--text-muted] resize-none focus:outline-none leading-relaxed"
          />

          {/* Divider */}
          <div className="h-px bg-[--border] my-3" />

          {/* Bottom bar */}
          <div className="flex items-center justify-between">
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded-full text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-50 cursor-default"
                title="Disponible prochainement"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onShareTrade}
                className="p-2 rounded-full text-[--text-muted] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Partager un trade"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-full text-[--text-muted] hover:text-amber-400 hover:bg-amber-500/10 transition-all opacity-50 cursor-default"
                title="Disponible prochainement"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Character counter + Post button */}
            <div className="flex items-center gap-3">
              {input.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Circular progress */}
                  <div className="relative w-6 h-6">
                    <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke={isOverLimit ? "#ef4444" : remaining < 50 ? "#f59e0b" : "#06b6d4"}
                        strokeWidth="2"
                        strokeDasharray={`${Math.min(1, input.length / MAX_POST_LENGTH) * 62.83} 62.83`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  {remaining < 50 && (
                    <span className={`text-xs font-medium ${isOverLimit ? "text-rose-400" : "text-amber-400"}`}>
                      {remaining}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={onSend}
                disabled={sending || !input.trim() || isOverLimit}
                className="px-5 py-2 rounded-full bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publier"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Right Sidebar ─────────────────────────────────────── */

function RightSidebar({
  myStats,
  trendingAssets,
  gamData,
}: {
  myStats: {
    winRate: number;
    totalPnl: number;
    streak: number;
    trades: number;
    meanRR: number;
    wins: number;
    losses: number;
    bestTrade: number;
    worstTrade: number;
  } | null;
  trendingAssets: { asset: string; count: number; pnl: number }[];
  gamData: { badges: { id: string; name: string; description: string; color: string; unlocked: boolean }[] } | null;
}) {
  return (
    <aside className="space-y-4 sticky top-4">
      {/* User Stats Card */}
      {myStats && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[--border]">
            <h3 className="font-bold text-[--text-primary] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Mes Statistiques
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
                <p className="text-xl font-bold text-cyan-400">{myStats.winRate.toFixed(1)}%</p>
                <p className="text-[10px] text-[--text-muted] mt-0.5">Taux de reussite</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: myStats.totalPnl >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
                <p className={`text-xl font-bold ${myStats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {myStats.totalPnl >= 0 ? "+" : ""}{myStats.totalPnl.toFixed(0)}&euro;
                </p>
                <p className="text-[10px] text-[--text-muted] mt-0.5">P&amp;L total</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(168,85,247,0.08)" }}>
                <p className="text-xl font-bold text-purple-400">{myStats.streak}</p>
                <p className="text-[10px] text-[--text-muted] mt-0.5">Serie en cours</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(245,158,11,0.08)" }}>
                <p className="text-xl font-bold text-amber-400">{myStats.trades}</p>
                <p className="text-[10px] text-[--text-muted] mt-0.5">Trades total</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[--text-muted]">R:R moyen</span>
                <span className="font-medium text-[--text-primary]">{myStats.meanRR.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[--text-muted]">Meilleur trade</span>
                <span className="font-medium text-emerald-400">+{myStats.bestTrade.toFixed(0)}&euro;</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[--text-muted]">Pire trade</span>
                <span className="font-medium text-rose-400">{myStats.worstTrade.toFixed(0)}&euro;</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[--text-muted]">Victoires / Defaites</span>
                <span className="font-medium text-[--text-primary]">{myStats.wins}V / {myStats.losses}D</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending Assets */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[--border]">
          <h3 className="font-bold text-[--text-primary] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Tendances Trading
          </h3>
        </div>
        <div className="p-2">
          {trendingAssets.length > 0 ? (
            trendingAssets.map((item, i) => (
              <div
                key={item.asset}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[--bg-secondary]/50 transition-colors cursor-default"
              >
                <div>
                  <p className="text-xs text-[--text-muted]">{i + 1} &middot; Trending</p>
                  <p className="font-bold text-sm text-[--text-primary]">{item.asset}</p>
                  <p className="text-xs text-[--text-muted]">{item.count} trade{item.count > 1 ? "s" : ""}</p>
                </div>
                <span className={`text-sm font-bold ${item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {item.pnl >= 0 ? "+" : ""}{item.pnl.toFixed(0)}&euro;
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[--text-muted]">Ajoutez des trades pour voir vos tendances</p>
            </div>
          )}
        </div>
      </div>

      {/* Traders a suivre */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[--border]">
          <h3 className="font-bold text-[--text-primary] flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Traders a suivre
          </h3>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-[--text-muted]">Disponible prochainement</p>
        </div>
      </div>

      {/* Badges */}
      {gamData && gamData.badges.filter((b) => b.unlocked).length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[--border]">
            <h3 className="font-bold text-[--text-primary] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Mes Badges
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {gamData.badges.filter((b) => b.unlocked).slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ background: `${b.color}15`, color: b.color, borderColor: `${b.color}30` }}
                  title={b.description}
                >
                  {b.name}
                </div>
              ))}
            </div>
            {gamData.badges.filter((b) => b.unlocked).length > 6 && (
              <p className="text-xs text-[--text-muted] mt-2">+{gamData.badges.filter((b) => b.unlocked).length - 6} autres</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ─── Main Page Component ───────────────────────────────── */

export default function CommunityPage() {
  const { t } = useTranslation();
  const { trades, loading: tradesLoading } = useTrades();
  const { data: gamData } = useGamification();
  const { notified, toggle: toggleNotify } = useNotifyPreferences();
  const { likes, toggleLike } = useLikes();
  const { bookmarks, toggleBookmark } = useBookmarks();

  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityRoomId, setCommunityRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── My stats (from real data) ─── */
  const myStats = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const totalPnl = trades.reduce((s, t) => s + t.result, 0);
    let streak = 0;
    const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const t of sorted) {
      if (t.result > 0) streak++;
      else break;
    }
    const avgRR = trades
      .filter((t) => t.sl && t.tp)
      .map((t) => parseFloat(calculateRR(t.entry, t.sl, t.tp)))
      .filter((v) => !isNaN(v));
    const meanRR = avgRR.length > 0 ? avgRR.reduce((s, v) => s + v, 0) / avgRR.length : 0;

    const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.result)) : 0;
    const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.result)) : 0;

    return { winRate, totalPnl, streak, trades: trades.length, meanRR, wins: wins.length, losses: losses.length, bestTrade, worstTrade };
  }, [trades]);

  /* ─── Trending assets from real trades ─── */
  const trendingAssets = useMemo(() => {
    if (!trades.length) return [];
    const map = new Map<string, { count: number; pnl: number }>();
    for (const t of trades) {
      const prev = map.get(t.asset) || { count: 0, pnl: 0 };
      prev.count++;
      prev.pnl += t.result;
      map.set(t.asset, prev);
    }
    return Array.from(map.entries())
      .map(([asset, data]) => ({ asset, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [trades]);

  /* ─── Room init & messaging ─── */
  const initRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (!res.ok) return;
      const rooms = await res.json();
      const community = rooms.find((r: { name: string }) => r.name === "Communaute" || r.name === "community" || r.name === "Communauté");
      if (community) {
        setCommunityRoomId(community.id);
      } else {
        setCommunityRoomId(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Init room error:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.userId) setCurrentUserId(data.userId);
        else if (data?.id) setCurrentUserId(data.id);
        if (data?.name) setCurrentUserName(data.name);
      })
      .catch(() => {});
  }, []);

  /* ─── Online members count (from unique users in recent messages) ─── */
  useEffect(() => {
    if (messages.length > 0) {
      const recentCutoff = Date.now() - 30 * 60 * 1000; // 30 min
      const recentUsers = new Set<string>();
      for (const msg of messages) {
        if (new Date(msg.createdAt).getTime() > recentCutoff) {
          recentUsers.add(msg.userId);
        }
      }
      setOnlineCount(recentUsers.size);
    }
  }, [messages]);

  const fetchMessages = useCallback(async (roomId: string, after?: string) => {
    try {
      const url = after
        ? `/api/chat/messages?roomId=${roomId}&after=${encodeURIComponent(after)}`
        : `/api/chat/messages?roomId=${roomId}&limit=50`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (after) {
        if (data.messages?.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: FeedMessage) => !existingIds.has(m.id));
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
        }
      } else {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initRoom(); }, [initRoom]);

  const messagesRef = useRef<FeedMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (!communityRoomId) return;
    fetchMessages(communityRoomId);
    pollRef.current = setInterval(() => {
      const lastMsg = messagesRef.current[messagesRef.current.length - 1];
      if (lastMsg) fetchMessages(communityRoomId, lastMsg.createdAt);
      else fetchMessages(communityRoomId);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [communityRoomId, fetchMessages]);

  /* ─── Scroll to top button logic ─── */
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 600);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeTab]);

  const sendMessage = async (content: string, tradeId?: string, imageUrl?: string) => {
    if (!communityRoomId || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: communityRoomId, content: content.trim(), tradeId: tradeId || null, imageUrl: imageUrl || null }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } catch (error) { console.error("Send message error:", error); }
    finally { setSending(false); }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (res.ok && communityRoomId) fetchMessages(communityRoomId);
    } catch (error) { console.error("Reaction error:", error); }
  };

  const handleShareFromJournal = (tradeId: string, content: string, comment: string) => {
    const fullContent = comment ? `${comment}\n\n${content}` : content;
    sendMessage(fullContent, tradeId);
    setShowShareModal(false);
  };

  const groupReactions = (reactions: Reaction[]) => {
    const map = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
    for (const r of reactions) {
      const existing = map.get(r.emoji) || { count: 0, users: [], hasReacted: false };
      existing.count++;
      existing.users.push(r.user.name || "?");
      if (r.userId === currentUserId) existing.hasReacted = true;
      map.set(r.emoji, existing);
    }
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
  };

  const handleReply = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setInput(`@${msg.user.name || "Anonyme"} `);
    }
  };

  /* ─── Render ─── */
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* ─── Header ─── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[--text-primary]">Hub Communautaire</h1>
              <p className="text-xs text-[--text-secondary]">
                Partagez, comparez et progressez avec la communaute
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onlineCount !== null && onlineCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-400">
                  {onlineCount} {onlineCount > 1 ? "actifs" : "actif"}
                </span>
              </div>
            )}
            <div className="text-xs text-[--text-muted] px-2 py-1 rounded-full bg-[--bg-secondary]/50">
              {messages.length} posts
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-secondary]/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: FEED — Twitter-style layout                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "feed" && (
        <div className="flex gap-6">
          {/* Main Feed Column */}
          <div className="flex-1 min-w-0">
            <div className="glass rounded-2xl overflow-hidden" ref={feedRef} style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
              {/* Post Composer */}
              {communityRoomId && (
                <PostComposer
                  input={input}
                  setInput={setInput}
                  sending={sending}
                  onSend={() => sendMessage(input)}
                  onShareTrade={() => setShowShareModal(true)}
                  userName={currentUserName}
                />
              )}

              {/* Feed content */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-cyan-400 mb-3" />
                  <p className="text-sm text-[--text-muted]">Chargement du fil...</p>
                </div>
              ) : !communityRoomId ? (
                <div className="py-16 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-lg font-bold text-[--text-primary] mb-2">Communaute</h2>
                  <p className="text-sm text-[--text-secondary] max-w-sm mx-auto">
                    Le salon communautaire n&apos;a pas encore ete cree. Contactez un administrateur pour l&apos;initialiser.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-[--bg-secondary] flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[--text-muted]" />
                  </div>
                  <h2 className="text-lg font-bold text-[--text-primary] mb-2">Aucun post pour le moment</h2>
                  <p className="text-sm text-[--text-secondary]">Soyez le premier a poster sur le fil !</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const reactions = groupReactions(msg.reactions);
                    return (
                      <TweetPost
                        key={msg.id}
                        msg={msg}
                        reactions={reactions}
                        isLiked={likes.has(msg.id)}
                        isBookmarked={bookmarks.has(msg.id)}
                        currentUserId={currentUserId}
                        onReaction={handleReaction}
                        onLike={toggleLike}
                        onBookmark={toggleBookmark}
                        onReply={handleReply}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} className="h-4" />
                </>
              )}

              {/* Scroll to top button */}
              {showScrollTop && (
                <button
                  onClick={() => feedRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                  className="fixed bottom-6 right-6 lg:right-auto lg:relative lg:bottom-auto w-10 h-10 rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:bg-cyan-400 transition-all z-30"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar — hidden on mobile */}
          <div className="hidden lg:block w-80 shrink-0">
            <RightSidebar
              myStats={myStats}
              trendingAssets={trendingAssets}
              gamData={gamData ? { badges: gamData.badges } : null}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* OTHER TABS — Coming Soon placeholders              */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "leaderboard" && (
        <ComingSoonPlaceholder tabId="leaderboard" isNotified={notified.has("leaderboard")} onToggleNotify={() => toggleNotify("leaderboard")} />
      )}
      {activeTab === "challenges" && (
        <ComingSoonPlaceholder tabId="challenges" isNotified={notified.has("challenges")} onToggleNotify={() => toggleNotify("challenges")} />
      )}
      {activeTab === "discussions" && (
        <ComingSoonPlaceholder tabId="discussions" isNotified={notified.has("discussions")} onToggleNotify={() => toggleNotify("discussions")} />
      )}
      {activeTab === "highlights" && (
        <ComingSoonPlaceholder tabId="highlights" isNotified={notified.has("highlights")} onToggleNotify={() => toggleNotify("highlights")} />
      )}
      {activeTab === "mentors" && (
        <ComingSoonPlaceholder tabId="mentors" isNotified={notified.has("mentors")} onToggleNotify={() => toggleNotify("mentors")} />
      )}
      {activeTab === "compare" && (
        <ComingSoonPlaceholder tabId="compare" isNotified={notified.has("compare")} onToggleNotify={() => toggleNotify("compare")} />
      )}

      {/* ─── Modals ─── */}
      {showShareModal && (
        <CommunityShareTradeModal
          onClose={() => setShowShareModal(false)}
          onShare={handleShareFromJournal}
        />
      )}
    </div>
  );
}
