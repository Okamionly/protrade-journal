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
  X,
  GitCompare,
  Bookmark,
  GraduationCap,
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

const QUICK_EMOJIS = ["\ud83d\udc4d", "\ud83d\udd25", "\ud83d\udcb0", "\ud83d\udcc8", "\ud83c\udfaf", "\ud83d\udcaa"];

/* ─── Tab icon mapping for placeholders ─────────────────── */

const TAB_PLACEHOLDER_ICONS: Record<string, React.ElementType> = {
  leaderboard: Trophy,
  challenges: Target,
  discussions: MessageSquare,
  highlights: Sparkles,
  mentors: GraduationCap,
  compare: GitCompare,
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

/* ─── Placeholder component ─────────────────────────────── */

function ComingSoonPlaceholder({ tabId }: { tabId: string }) {
  const Icon = TAB_PLACEHOLDER_ICONS[tabId] || Clock;
  const tabLabel = TABS.find((t) => t.id === tabId)?.label || tabId;

  return (
    <div className="glass rounded-2xl p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
        <Icon className="w-8 h-8 text-cyan-400" />
      </div>
      <h2 className="text-xl font-bold text-[--text-primary] mb-2">{tabLabel}</h2>
      <p className="text-base text-[--text-secondary] mb-1">Disponible prochainement</p>
      <p className="text-sm text-[--text-muted]">
        Cette fonctionnalite est en cours de developpement et sera bientot accessible.
      </p>
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
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

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

  /* ─── Room init & messaging ─── */
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
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: LEADERBOARD                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "leaderboard" && <ComingSoonPlaceholder tabId="leaderboard" />}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: CHALLENGES                                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "challenges" && <ComingSoonPlaceholder tabId="challenges" />}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: DISCUSSIONS                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "discussions" && <ComingSoonPlaceholder tabId="discussions" />}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: WEEKLY HIGHLIGHTS                             */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "highlights" && <ComingSoonPlaceholder tabId="highlights" />}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: MENTORS                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "mentors" && <ComingSoonPlaceholder tabId="mentors" />}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: COMPARE                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "compare" && <ComingSoonPlaceholder tabId="compare" />}

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
