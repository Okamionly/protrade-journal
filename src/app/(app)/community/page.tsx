"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { useGamification } from "@/hooks/useGamification";
import { TradeCard } from "@/components/TradeCard";
import { TradeShareModal } from "@/components/TradeShareModal";
import { CommunityShareTradeModal } from "@/components/CommunityShareTradeModal";
import { calculateRR } from "@/lib/utils";
import {
  Users,
  Send,
  Share2,
  Smile,
  TrendingUp,
  Trophy,
  Flame,
  Heart,
  MessageCircle,
  Loader2,
  Crown,
  Medal,
  Target,
  Shield,
  Award,
  UserPlus,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Crosshair,
  Sparkles,
  ChevronRight,
  X,
  GitCompare,
  Bookmark,
  GraduationCap,
  Handshake,
  Search,
  Clock,
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

/* ─── Mock data for community features (UI-only) ────────── */

const MOCK_LEADERBOARD = [
  { rank: 1, name: "AlphaTrader", winRate: 78.5, pnl: 4280, streak: 12, trades: 156, badge: "diamond", avatar: "AT" },
  { rank: 2, name: "SwingKing", winRate: 72.3, pnl: 3150, streak: 8, trades: 203, badge: "diamond", avatar: "SK" },
  { rank: 3, name: "ScalpMaster", winRate: 68.9, pnl: 2890, streak: 6, trades: 412, badge: "gold", avatar: "SM" },
  { rank: 4, name: "FxHunter", winRate: 65.2, pnl: 2340, streak: 5, trades: 189, badge: "gold", avatar: "FH" },
  { rank: 5, name: "CryptoWolf", winRate: 63.8, pnl: 1920, streak: 4, trades: 97, badge: "gold", avatar: "CW" },
  { rank: 6, name: "DayRunner", winRate: 61.4, pnl: 1650, streak: 3, trades: 234, badge: "silver", avatar: "DR" },
  { rank: 7, name: "PatternPro", winRate: 59.7, pnl: 1430, streak: 7, trades: 145, badge: "silver", avatar: "PP" },
  { rank: 8, name: "TrendSurfer", winRate: 58.2, pnl: 1180, streak: 2, trades: 178, badge: "silver", avatar: "TS" },
  { rank: 9, name: "RiskManager", winRate: 56.9, pnl: 980, streak: 4, trades: 267, badge: "bronze", avatar: "RM" },
  { rank: 10, name: "NewbieTrader", winRate: 54.1, pnl: 420, streak: 1, trades: 45, badge: "bronze", avatar: "NT" },
];

const MOCK_CHALLENGES = [
  { id: "1", title: "Meilleur R:R de la semaine", desc: "Le trade avec le meilleur ratio risque/recompense", icon: Target, color: "#06b6d4", participants: 47, endsIn: "3j 14h", prize: "Badge Sniper Elite", leader: "AlphaTrader", leaderScore: "5.2 R:R" },
  { id: "2", title: "Semaine la plus reguliere", desc: "La plus faible variance dans les resultats quotidiens", icon: Shield, color: "#10b981", participants: 32, endsIn: "3j 14h", prize: "Badge Consistency King", leader: "SwingKing", leaderScore: "0.8% var." },
  { id: "3", title: "Streak Challenge", desc: "Le plus long streak de trades gagnants cette semaine", icon: Flame, color: "#ef4444", participants: 58, endsIn: "3j 14h", prize: "Badge Flame Master", leader: "ScalpMaster", leaderScore: "9 trades" },
  { id: "4", title: "Top Profit du mois", desc: "Le plus gros P&L cumule sur le mois en cours", icon: TrendingUp, color: "#f59e0b", participants: 63, endsIn: "10j 8h", prize: "Badge Gold Trader", leader: "AlphaTrader", leaderScore: "+4 280€" },
];

const MOCK_DISCUSSIONS = [
  { id: "1", title: "Strategie ICT OTE - retour d'experience", author: "AlphaTrader", replies: 24, upvotes: 47, lastActivity: "2h", tags: ["ICT", "Strategie"], pinned: true },
  { id: "2", title: "Comment gerer le FOMO sur les breakouts ?", author: "FxHunter", replies: 18, upvotes: 35, lastActivity: "4h", tags: ["Psychologie", "Breakout"], pinned: false },
  { id: "3", title: "Setup favoris pour le scalping XAUUSD", author: "ScalpMaster", replies: 31, upvotes: 52, lastActivity: "6h", tags: ["Gold", "Scalping"], pinned: false },
  { id: "4", title: "Quel broker pour les CFD en 2026 ?", author: "DayRunner", replies: 42, upvotes: 28, lastActivity: "1j", tags: ["Broker", "CFD"], pinned: false },
  { id: "5", title: "Backtest vs Live : pourquoi mes resultats different ?", author: "PatternPro", replies: 15, upvotes: 41, lastActivity: "1j", tags: ["Backtest", "Performance"], pinned: false },
  { id: "6", title: "Routine matinale avant le marche", author: "TrendSurfer", replies: 22, upvotes: 38, lastActivity: "2j", tags: ["Routine", "Psychologie"], pinned: false },
];

const MOCK_HIGHLIGHTS = [
  { id: "1", trader: "AlphaTrader", asset: "XAUUSD", direction: "LONG", rr: "4.8", result: 960, date: "Lundi", avatar: "AT", likes: 34, category: "Meilleur R:R" },
  { id: "2", trader: "ScalpMaster", asset: "EURUSD", direction: "SHORT", rr: "2.1", result: 450, date: "Mardi", avatar: "SM", likes: 28, category: "Plus de likes" },
  { id: "3", trader: "SwingKing", asset: "BTCUSD", direction: "LONG", rr: "3.5", result: 1200, date: "Mercredi", avatar: "SK", likes: 42, category: "Plus gros gain" },
  { id: "4", trader: "FxHunter", asset: "GBPJPY", direction: "SHORT", rr: "2.8", result: 380, date: "Jeudi", avatar: "FH", likes: 19, category: "Setup le plus propre" },
];

const MOCK_MENTORS = [
  { id: "1", name: "AlphaTrader", specialty: "ICT / Smart Money", experience: "5 ans", winRate: 78.5, students: 12, rating: 4.9, avatar: "AT", available: true, badges: ["Diamond", "Mentor Elite"] },
  { id: "2", name: "SwingKing", specialty: "Swing Trading Forex", experience: "4 ans", winRate: 72.3, students: 8, rating: 4.7, avatar: "SK", available: true, badges: ["Diamond", "Consistency King"] },
  { id: "3", name: "ScalpMaster", specialty: "Scalping Gold & Indices", experience: "3 ans", winRate: 68.9, students: 15, rating: 4.8, avatar: "SM", available: false, badges: ["Gold", "Speed Demon"] },
  { id: "4", name: "PatternPro", specialty: "Price Action / Harmonics", experience: "6 ans", winRate: 59.7, students: 6, rating: 4.6, avatar: "PP", available: true, badges: ["Silver", "Pattern Expert"] },
];

const QUICK_EMOJIS = ["\ud83d\udc4d", "\ud83d\udd25", "\ud83d\udcb0", "\ud83d\udcc8", "\ud83c\udfaf", "\ud83d\udcaa"];

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  diamond: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  gold: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  silver: { bg: "bg-gray-400/15", text: "text-gray-300", border: "border-gray-400/30" },
  bronze: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
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

/* ─── Sub-components ────────────────────────────────────── */

function UserProfileModal({ user, onClose }: { user: typeof MOCK_LEADERBOARD[0]; onClose: () => void }) {
  const badges = user.badge === "diamond" ? ["Diamond Trader", "Streak Master", "Risk Expert"]
    : user.badge === "gold" ? ["Gold Trader", "Consistent"]
    : user.badge === "silver" ? ["Silver Trader"]
    : ["Bronze Trader"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[--bg-secondary] transition">
          <X className="w-5 h-5 text-[--text-muted]" />
        </button>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
            {user.avatar}
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <span className={`mt-1 px-3 py-0.5 rounded-full text-xs font-bold border ${BADGE_COLORS[user.badge].bg} ${BADGE_COLORS[user.badge].text} ${BADGE_COLORS[user.badge].border}`}>
            {user.badge.toUpperCase()} #{user.rank}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
            <p className="text-2xl font-bold text-cyan-400">{user.winRate}%</p>
            <p className="text-xs text-[--text-muted]">Win Rate</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(16,185,129,0.08)" }}>
            <p className="text-2xl font-bold text-emerald-400">+{user.pnl.toLocaleString()}€</p>
            <p className="text-xs text-[--text-muted]">P&L Total</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(239,68,68,0.08)" }}>
            <p className="text-2xl font-bold text-rose-400">{user.streak}</p>
            <p className="text-xs text-[--text-muted]">Streak actuel</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(245,158,11,0.08)" }}>
            <p className="text-2xl font-bold text-amber-400">{user.trades}</p>
            <p className="text-xs text-[--text-muted]">Trades total</p>
          </div>
        </div>

        {/* Badges */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-2 text-[--text-secondary]">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[--bg-secondary] border border-[--border] text-[--text-secondary]">
                <Award className="w-3 h-3 inline mr-1" />{b}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition">
            <UserPlus className="w-4 h-4" /> Suivre
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[--border] text-sm font-medium text-[--text-secondary] hover:bg-[--bg-secondary] transition">
            <MessageCircle className="w-4 h-4" /> Message
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page Component ───────────────────────────────── */

export default function CommunityPage() {
  const { t } = useTranslation();
  const { trades, loading: tradesLoading } = useTrades();
  const { data: gamData } = useGamification();

  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityRoomId, setCommunityRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<typeof MOCK_LEADERBOARD[0] | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "month">("week");
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set(["AlphaTrader", "SwingKing"]));
  const [likedHighlights, setLikedHighlights] = useState<Set<string>>(new Set());
  const [discussionSearch, setDiscussionSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── My stats (from real data) ─── */
  const myStats = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter((t) => t.result > 0);
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

    return { winRate, totalPnl, streak, trades: trades.length, meanRR };
  }, [trades]);

  /* ─── Community stats (averages to compare) ─── */
  const communityAvg = useMemo(() => ({
    winRate: 58.4,
    avgPnl: 1245,
    avgStreak: 3.2,
    avgTrades: 142,
    avgRR: 1.8,
  }), []);

  /* ─── Room init & messaging (preserved from original) ─── */
  const initRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (!res.ok) return;
      const rooms = await res.json();
      const community = rooms.find((r: { name: string }) => r.name === "Communaute" || r.name === "community");
      if (community) setCommunityRoomId(community.id);
      else setCommunityRoomId(null);
    } catch (error) {
      console.error("Init room error:", error);
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.userId) setCurrentUserId(data.userId);
        else if (data?.id) setCurrentUserId(data.id);
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleTradeSelect = (tradeId: string, content: string) => {
    sendMessage(content, tradeId);
    setShowTradeModal(false);
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

  const toggleFollow = (name: string) => {
    setFollowedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleHighlightLike = (id: string) => {
    setLikedHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ─── No room fallback ─── */
  if (!communityRoomId && !loading && activeTab === "feed") {
    // Still allow other tabs even without chat room
  }

  /* ─── Render ─── */
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hub Communautaire</h1>
              <p className="text-sm text-[--text-secondary]">
                Partagez, comparez et progressez avec la communaute
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">247 en ligne</span>
            </div>
            <div className="text-xs text-[--text-muted]">{messages.length} messages</div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mt-5 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
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
      {/* TAB: FEED                                          */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Feed Messages */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : !communityRoomId ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Users className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Communaute</h2>
                <p className="text-[--text-secondary] text-sm">
                  Le salon communautaire n&apos;a pas encore ete cree. Contactez un administrateur pour l&apos;initialiser.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <MessageCircle className="w-10 h-10 text-[--text-muted] mx-auto mb-3" />
                <p className="text-[--text-secondary]">Soyez le premier a poster !</p>
              </div>
            ) : (
              messages.map((msg) => {
                const reactions = groupReactions(msg.reactions);
                const isFollowed = followedUsers.has(msg.user.name || "");
                return (
                  <div key={msg.id} className="glass rounded-2xl p-5 hover:border-[--border] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 cursor-pointer hover:scale-105 transition-transform">
                        {getInitials(msg.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm cursor-pointer hover:text-cyan-400 transition">{msg.user.name || "Anonyme"}</span>
                          {msg.user.role === "ADMIN" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">ADMIN</span>
                          )}
                          {isFollowed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">SUIVI</span>
                          )}
                          <span className="text-xs text-[--text-muted]">{formatTime(msg.createdAt)}</span>
                        </div>

                        <p className="text-sm text-[--text-primary] mt-1 whitespace-pre-wrap break-words">{msg.content}</p>

                        {msg.trade && <TradeCard trade={msg.trade} />}

                        {msg.imageUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden max-w-sm">
                            <img src={msg.imageUrl} alt="Image partagee" className="w-full h-auto rounded-xl" loading="lazy" />
                          </div>
                        )}

                        {/* Reactions + actions */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {reactions.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => handleReaction(msg.id, r.emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${
                                r.hasReacted
                                  ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                                  : "bg-[--bg-secondary]/50 border border-[--border] text-[--text-secondary] hover:bg-[--bg-secondary]"
                              }`}
                              title={r.users.join(", ")}
                            >
                              <span>{r.emoji}</span>
                              <span className="font-medium">{r.count}</span>
                            </button>
                          ))}
                          <div className="relative group">
                            <button className="p-1 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-secondary]/50 transition">
                              <Smile className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 p-1.5 rounded-xl bg-gray-900 border border-gray-800 shadow-xl z-10">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 transition text-sm"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button className="p-1 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-secondary]/50 transition ml-auto">
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />

            {/* Composer */}
            {communityRoomId && (
              <div className="glass rounded-2xl p-4 sticky bottom-4 z-20">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowTradeModal(true)} className="p-2 rounded-xl text-[--text-secondary] hover:text-cyan-400 hover:bg-cyan-500/10 transition" title="Partager un trade">
                    <TrendingUp className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowShareModal(true)} className="p-2 rounded-xl text-[--text-secondary] hover:text-emerald-400 hover:bg-emerald-500/10 transition" title="Partager depuis le journal">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder="Partagez une idee, un trade, un setup..."
                    className="flex-1 bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-4">
            {/* My Stats Card */}
            {myStats && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Mes Stats
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
                    <p className="text-lg font-bold text-cyan-400">{myStats.winRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-[--text-muted]">Win Rate</p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: myStats.totalPnl >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
                    <p className={`text-lg font-bold ${myStats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {myStats.totalPnl >= 0 ? "+" : ""}{myStats.totalPnl.toFixed(0)}€
                    </p>
                    <p className="text-[10px] text-[--text-muted]">P&L</p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(239,68,68,0.08)" }}>
                    <p className="text-lg font-bold text-rose-400">{myStats.streak}</p>
                    <p className="text-[10px] text-[--text-muted]">Streak</p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(245,158,11,0.08)" }}>
                    <p className="text-lg font-bold text-amber-400">{myStats.trades}</p>
                    <p className="text-[10px] text-[--text-muted]">Trades</p>
                  </div>
                </div>
              </div>
            )}

            {/* My Badges */}
            {gamData && gamData.badges.filter((b) => b.unlocked).length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Mes Badges
                </h3>
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
            )}

            {/* Top Traders Sidebar */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> Top Traders
              </h3>
              <div className="space-y-2">
                {MOCK_LEADERBOARD.slice(0, 5).map((u) => (
                  <div
                    key={u.rank}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[--bg-secondary]/50 cursor-pointer transition"
                    onClick={() => setSelectedProfile(u)}
                  >
                    <span className="text-xs font-bold w-5 text-center text-[--text-muted]">#{u.rank}</span>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.name}</p>
                      <p className="text-[10px] text-[--text-muted]">{u.winRate}% WR</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">+{u.pnl.toLocaleString()}€</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className="w-full mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center justify-center gap-1"
              >
                Voir le classement complet <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Active Challenges Sidebar */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" /> Defis actifs
              </h3>
              <div className="space-y-2">
                {MOCK_CHALLENGES.slice(0, 3).map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl border border-[--border] hover:bg-[--bg-secondary]/30 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                      <span className="text-xs font-semibold truncate">{c.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[--text-muted]">{c.participants} participants</span>
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {c.endsIn}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab("challenges")}
                className="w-full mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center justify-center gap-1"
              >
                Voir tous les defis <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: LEADERBOARD                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Period Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeaderboardPeriod("week")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                leaderboardPeriod === "week" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "text-[--text-muted] hover:bg-[--bg-secondary]/50"
              }`}
            >
              Cette semaine
            </button>
            <button
              onClick={() => setLeaderboardPeriod("month")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                leaderboardPeriod === "month" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "text-[--text-muted] hover:bg-[--bg-secondary]/50"
              }`}
            >
              Ce mois
            </button>
          </div>

          {/* Podium */}
          <div className="glass rounded-2xl p-8">
            <div className="flex items-end justify-center gap-4 md:gap-8 mb-6">
              {/* 2nd place */}
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2 border-4 border-gray-400/30">
                  {MOCK_LEADERBOARD[1].avatar}
                </div>
                <Medal className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <p className="text-sm font-bold">{MOCK_LEADERBOARD[1].name}</p>
                <p className="text-xs text-[--text-muted]">{MOCK_LEADERBOARD[1].winRate}% WR</p>
                <p className="text-sm font-bold text-emerald-400">+{MOCK_LEADERBOARD[1].pnl.toLocaleString()}€</p>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-t-xl bg-gradient-to-t from-gray-500/20 to-transparent mx-auto mt-2" />
              </div>

              {/* 1st place */}
              <div className="text-center">
                <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2 border-4 border-yellow-400/30 shadow-lg shadow-yellow-500/20">
                  {MOCK_LEADERBOARD[0].avatar}
                </div>
                <p className="text-base font-bold">{MOCK_LEADERBOARD[0].name}</p>
                <p className="text-xs text-[--text-muted]">{MOCK_LEADERBOARD[0].winRate}% WR</p>
                <p className="text-base font-bold text-emerald-400">+{MOCK_LEADERBOARD[0].pnl.toLocaleString()}€</p>
                <div className="w-24 h-28 md:w-28 md:h-32 rounded-t-xl bg-gradient-to-t from-yellow-500/20 to-transparent mx-auto mt-2" />
              </div>

              {/* 3rd place */}
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2 border-4 border-orange-400/30">
                  {MOCK_LEADERBOARD[2].avatar}
                </div>
                <Medal className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-sm font-bold">{MOCK_LEADERBOARD[2].name}</p>
                <p className="text-xs text-[--text-muted]">{MOCK_LEADERBOARD[2].winRate}% WR</p>
                <p className="text-sm font-bold text-emerald-400">+{MOCK_LEADERBOARD[2].pnl.toLocaleString()}€</p>
                <div className="w-20 h-16 md:w-24 md:h-20 rounded-t-xl bg-gradient-to-t from-orange-500/20 to-transparent mx-auto mt-2" />
              </div>
            </div>
          </div>

          {/* Full Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-bold text-[--text-muted] border-b border-[--border]">
              <span>#</span>
              <span>Trader</span>
              <span className="text-right">Win Rate</span>
              <span className="text-right">P&L</span>
              <span className="text-right">Streak</span>
              <span className="text-right">Trades</span>
              <span />
            </div>
            {MOCK_LEADERBOARD.map((u) => (
              <div
                key={u.rank}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 items-center hover:bg-[--bg-secondary]/30 cursor-pointer transition border-b border-[--border]/50 last:border-0"
                onClick={() => setSelectedProfile(u)}
              >
                <span className={`text-sm font-bold w-6 text-center ${u.rank <= 3 ? "text-yellow-400" : "text-[--text-muted]"}`}>
                  {u.rank}
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BADGE_COLORS[u.badge].bg} ${BADGE_COLORS[u.badge].text}`}>
                      {u.badge.toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium text-right">{u.winRate}%</span>
                <span className="text-sm font-bold text-emerald-400 text-right">+{u.pnl.toLocaleString()}€</span>
                <span className="text-sm text-right flex items-center justify-end gap-1">
                  <Flame className="w-3 h-3 text-rose-400" /> {u.streak}
                </span>
                <span className="text-sm text-[--text-muted] text-right">{u.trades}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFollow(u.name); }}
                  className={`p-1.5 rounded-lg transition ${
                    followedUsers.has(u.name) ? "text-cyan-400 bg-cyan-500/10" : "text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10"
                  }`}
                  title={followedUsers.has(u.name) ? "Ne plus suivre" : "Suivre"}
                >
                  {followedUsers.has(u.name) ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: CHALLENGES                                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "challenges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_CHALLENGES.map((c, idx) => {
            const progress = [0.45, 0.62, 0.28, 0.73][idx] ?? 0.5; // stable simulated values
            return (
              <div key={c.id} className="glass rounded-2xl p-6 hover:border-[--border] transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}15` }}>
                    <c.icon className="w-6 h-6" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold">{c.title}</h3>
                    <p className="text-xs text-[--text-secondary] mt-0.5">{c.desc}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[--text-muted]">Votre progression</span>
                    <span className="font-medium" style={{ color: c.color }}>{(progress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[--bg-secondary]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, background: c.color }} />
                  </div>
                </div>

                {/* Leader + meta */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[--text-secondary]">Leader: <span className="font-semibold text-[--text-primary]">{c.leader}</span></span>
                    <span className="text-[--text-muted]">({c.leaderScore})</span>
                  </div>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.endsIn}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[--border]/50">
                  <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                    <Users className="w-3.5 h-3.5" /> {c.participants} participants
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[--text-secondary]">{c.prize}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: DISCUSSIONS                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "discussions" && (
        <div className="space-y-4">
          {/* Search + New Topic */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                type="text"
                value={discussionSearch}
                onChange={(e) => setDiscussionSearch(e.target.value)}
                placeholder="Rechercher un sujet..."
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition">
              <MessageSquare className="w-4 h-4" /> Nouveau sujet
            </button>
          </div>

          {/* Discussion list */}
          {MOCK_DISCUSSIONS
            .filter((d) => !discussionSearch || d.title.toLowerCase().includes(discussionSearch.toLowerCase()) || d.tags.some((t) => t.toLowerCase().includes(discussionSearch.toLowerCase())))
            .map((d) => (
            <div key={d.id} className="glass rounded-2xl p-5 hover:border-[--border] transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button className="p-1 rounded-lg text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition">
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-[--text-primary]">{d.upvotes}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {d.pinned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">EPINGLE</span>
                    )}
                    <h3 className="text-sm font-semibold hover:text-cyan-400 transition truncate">{d.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[--text-muted]">
                    <span>par <span className="text-[--text-secondary] font-medium">{d.author}</span></span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {d.replies} reponses</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {d.lastActivity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {d.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[--bg-secondary] border border-[--border] text-[--text-secondary]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: WEEKLY HIGHLIGHTS                             */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "highlights" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold">Best Of de la Semaine</h2>
            <p className="text-sm text-[--text-secondary]">Les trades les plus remarquables selectionnes automatiquement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_HIGHLIGHTS.map((h) => (
              <div key={h.id} className="glass rounded-2xl p-5 hover:border-[--border] transition-colors">
                {/* Category badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {h.category}
                  </span>
                  <span className="text-xs text-[--text-muted]">{h.date}</span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {h.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{h.trader}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-[--text-primary]">{h.asset}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {h.direction}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
                    <p className="text-lg font-bold text-cyan-400">{h.rr}</p>
                    <p className="text-[10px] text-[--text-muted]">R:R</p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(16,185,129,0.08)" }}>
                    <p className="text-lg font-bold text-emerald-400">+{h.result}€</p>
                    <p className="text-[10px] text-[--text-muted]">Profit</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleHighlightLike(h.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      likedHighlights.has(h.id)
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                        : "text-[--text-muted] hover:text-rose-400 hover:bg-rose-500/10"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${likedHighlights.has(h.id) ? "fill-current" : ""}`} />
                    {h.likes + (likedHighlights.has(h.id) ? 1 : 0)}
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-cyan-400 transition">
                    <Eye className="w-3.5 h-3.5" /> Voir le trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: MENTORS                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "mentors" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 text-center">
            <GraduationCap className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold">Programme de Mentorat</h2>
            <p className="text-sm text-[--text-secondary]">Connectez-vous avec des traders experimentes pour accelerer votre progression</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_MENTORS.map((m) => (
              <div key={m.id} className="glass rounded-2xl p-6 hover:border-[--border] transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                      {m.avatar}
                    </div>
                    {m.available && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[--bg-primary]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">{m.name}</h3>
                      {m.available ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">DISPONIBLE</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400">OCCUPE</span>
                      )}
                    </div>
                    <p className="text-xs text-[--text-secondary] mt-0.5">{m.specialty}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl p-2 text-center" style={{ background: "rgba(139,92,246,0.08)" }}>
                    <p className="text-sm font-bold text-violet-400">{m.winRate}%</p>
                    <p className="text-[10px] text-[--text-muted]">Win Rate</p>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: "rgba(245,158,11,0.08)" }}>
                    <p className="text-sm font-bold text-amber-400">{m.experience}</p>
                    <p className="text-[10px] text-[--text-muted]">Experience</p>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ background: "rgba(16,185,129,0.08)" }}>
                    <p className="text-sm font-bold text-emerald-400">{m.rating}</p>
                    <p className="text-[10px] text-[--text-muted]">Note</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {m.badges.map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {b}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[--bg-secondary] text-[--text-muted]">
                    {m.students} eleves
                  </span>
                </div>

                <button
                  disabled={!m.available}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                >
                  <Handshake className="w-4 h-4" /> {m.available ? "Demander un mentorat" : "Indisponible"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: COMPARE                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 text-center">
            <GitCompare className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold">Comparez vos Stats</h2>
            <p className="text-sm text-[--text-secondary]">Vos performances vs la moyenne communautaire</p>
          </div>

          {myStats ? (
            <div className="glass rounded-2xl p-6">
              <div className="space-y-6">
                {/* Win Rate */}
                <ComparisonBar
                  label="Win Rate"
                  icon={<Target className="w-4 h-4 text-cyan-400" />}
                  myValue={myStats.winRate}
                  avgValue={communityAvg.winRate}
                  format={(v) => `${v.toFixed(1)}%`}
                  color="#06b6d4"
                  max={100}
                />
                {/* P&L */}
                <ComparisonBar
                  label="P&L Total"
                  icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                  myValue={myStats.totalPnl}
                  avgValue={communityAvg.avgPnl}
                  format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}€`}
                  color="#10b981"
                  max={Math.max(Math.abs(myStats.totalPnl), communityAvg.avgPnl) * 1.3}
                />
                {/* Streak */}
                <ComparisonBar
                  label="Streak actuel"
                  icon={<Flame className="w-4 h-4 text-rose-400" />}
                  myValue={myStats.streak}
                  avgValue={communityAvg.avgStreak}
                  format={(v) => `${v.toFixed(0)} trades`}
                  color="#ef4444"
                  max={Math.max(myStats.streak, communityAvg.avgStreak) * 1.5 || 10}
                />
                {/* Total Trades */}
                <ComparisonBar
                  label="Nombre de trades"
                  icon={<BarChart3 className="w-4 h-4 text-amber-400" />}
                  myValue={myStats.trades}
                  avgValue={communityAvg.avgTrades}
                  format={(v) => `${v.toFixed(0)}`}
                  color="#f59e0b"
                  max={Math.max(myStats.trades, communityAvg.avgTrades) * 1.3 || 200}
                />
                {/* R:R */}
                <ComparisonBar
                  label="R:R Moyen"
                  icon={<Crosshair className="w-4 h-4 text-violet-400" />}
                  myValue={myStats.meanRR}
                  avgValue={communityAvg.avgRR}
                  format={(v) => `${v.toFixed(1)}`}
                  color="#8b5cf6"
                  max={Math.max(myStats.meanRR, communityAvg.avgRR) * 1.5 || 5}
                />
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <BarChart3 className="w-10 h-10 text-[--text-muted] mx-auto mb-3" />
              <p className="text-[--text-secondary]">Ajoutez des trades pour comparer vos performances</p>
            </div>
          )}

          {/* Percentile card */}
          {myStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-cyan-400">
                  Top {myStats.winRate > communityAvg.winRate ? Math.max(5, Math.floor(100 - ((myStats.winRate - 50) / 50) * 100)) : Math.min(95, Math.floor(100 - ((myStats.winRate - 40) / 50) * 100))}%
                </p>
                <p className="text-xs text-[--text-muted] mt-1">Classement Win Rate</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {myStats.winRate > communityAvg.winRate ? (
                    <span className="flex items-center justify-center gap-1"><ArrowUpRight className="w-6 h-6" /> Au dessus</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1"><ArrowDownRight className="w-6 h-6" /> En dessous</span>
                  )}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">vs Moyenne communautaire</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-amber-400">{myStats.trades}</p>
                <p className="text-xs text-[--text-muted] mt-1">Trades enregistres</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* Modals                                             */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedProfile && (
        <UserProfileModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}

      {showTradeModal && (
        <TradeShareModal onSelect={handleTradeSelect} onClose={() => setShowTradeModal(false)} />
      )}

      {showShareModal && (
        <CommunityShareTradeModal onShare={handleShareFromJournal} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}

/* ─── Comparison Bar Component ──────────────────────────── */

function ComparisonBar({
  label,
  icon,
  myValue,
  avgValue,
  format,
  color,
  max,
}: {
  label: string;
  icon: React.ReactNode;
  myValue: number;
  avgValue: number;
  format: (v: number) => string;
  color: string;
  max: number;
}) {
  const myPct = Math.min((Math.abs(myValue) / max) * 100, 100);
  const avgPct = Math.min((Math.abs(avgValue) / max) * 100, 100);
  const isBetter = myValue >= avgValue;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon} {label}
        </div>
        <div className="flex items-center gap-1">
          {isBetter ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className={`text-xs font-medium ${isBetter ? "text-emerald-400" : "text-rose-400"}`}>
            {isBetter ? "+" : ""}{(((myValue - avgValue) / (avgValue || 1)) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs w-20 text-[--text-secondary] shrink-0">Vous</span>
          <div className="flex-1 h-3 rounded-full bg-[--bg-secondary] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${myPct}%`, background: color }} />
          </div>
          <span className="text-xs font-bold w-20 text-right" style={{ color }}>{format(myValue)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs w-20 text-[--text-muted] shrink-0">Moyenne</span>
          <div className="flex-1 h-3 rounded-full bg-[--bg-secondary] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 opacity-40" style={{ width: `${avgPct}%`, background: color }} />
          </div>
          <span className="text-xs font-medium w-20 text-right text-[--text-muted]">{format(avgValue)}</span>
        </div>
      </div>
    </div>
  );
}

