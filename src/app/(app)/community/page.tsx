"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/context";
import { TradeCard } from "@/components/TradeCard";
import { TradeShareModal } from "@/components/TradeShareModal";
import { CommunityShareTradeModal } from "@/components/CommunityShareTradeModal";
import {
  Users,
  Send,
  Share2,
  ImagePlus,
  Smile,
  TrendingUp,
  Trophy,
  Flame,
  Heart,
  MessageCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface SharedTrade {
  id: string;
  asset: string;
  direction: string;
  strategy: string;
  entry: number;
  exit: number | null;
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

const QUICK_EMOJIS = ["👍", "🔥", "💰", "📈", "🎯", "💪"];

export default function CommunityPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityRoomId, setCommunityRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get or create "community" room
  const initRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (!res.ok) return;
      const rooms = await res.json();
      let community = rooms.find((r: { name: string }) => r.name === "Communauté" || r.name === "community");
      if (community) {
        setCommunityRoomId(community.id);
      } else {
        // Create room via admin API - fallback: use first room or show message
        setCommunityRoomId(null);
      }
    } catch (error) {
      console.error("Init room error:", error);
    }
  }, []);

  // Get current user
  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.userId) setCurrentUserId(data.userId);
        else if (data?.id) setCurrentUserId(data.id);
      })
      .catch(() => {});
  }, []);

  // Fetch messages
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
          setMessages((prev) => [...prev, ...data.messages]);
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

  useEffect(() => {
    initRoom();
  }, [initRoom]);

  const messagesRef = useRef<FeedMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (!communityRoomId) return;
    fetchMessages(communityRoomId);

    // Poll for new messages using ref to avoid stale closure
    pollRef.current = setInterval(() => {
      const lastMsg = messagesRef.current[messagesRef.current.length - 1];
      if (lastMsg) {
        fetchMessages(communityRoomId, lastMsg.createdAt);
      } else {
        fetchMessages(communityRoomId);
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
        body: JSON.stringify({
          roomId: communityRoomId,
          content: content.trim(),
          tradeId: tradeId || null,
          imageUrl: imageUrl || null,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (res.ok) {
        // Refresh messages
        if (communityRoomId) fetchMessages(communityRoomId);
      }
    } catch (error) {
      console.error("Reaction error:", error);
    }
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

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
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

  if (!communityRoomId && !loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Users className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Communaute</h2>
          <p className="text-[--text-secondary] text-sm">
            Le salon communautaire n&apos;a pas encore ete cree. Contactez un administrateur pour l&apos;initialiser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Communaute</h1>
              <p className="text-sm text-[--text-secondary]">
                Partagez vos trades, analyses et realisations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--text-muted]">{messages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <MessageCircle className="w-10 h-10 text-[--text-muted] mx-auto mb-3" />
            <p className="text-[--text-secondary]">Soyez le premier a poster !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const reactions = groupReactions(msg.reactions);
            return (
              <div key={msg.id} className="glass rounded-2xl p-5 hover:border-[--border] transition-colors">
                {/* Author Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {getInitials(msg.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{msg.user.name || "Anonyme"}</span>
                      {msg.user.role === "ADMIN" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">ADMIN</span>
                      )}
                      <span className="text-xs text-[--text-muted]">{formatTime(msg.createdAt)}</span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-[--text-primary] mt-1 whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>

                    {/* Trade Card */}
                    {msg.trade && <TradeCard trade={msg.trade} />}

                    {/* Image */}
                    {msg.imageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden max-w-sm">
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          className="w-full h-auto rounded-xl"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Reactions */}
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
                      {/* Quick emoji picker */}
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
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="glass rounded-2xl p-4 sticky bottom-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTradeModal(true)}
            className="p-2 rounded-xl text-[--text-secondary] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
            title="Partager un trade"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-xl text-[--text-secondary] hover:text-emerald-400 hover:bg-emerald-500/10 transition"
            title="Partager depuis le journal"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
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

      {/* Trade Share Modal (from chat) */}
      {showTradeModal && (
        <TradeShareModal
          onSelect={handleTradeSelect}
          onClose={() => setShowTradeModal(false)}
        />
      )}

      {/* Community Share Modal (with comment) */}
      {showShareModal && (
        <CommunityShareTradeModal
          onShare={handleShareFromJournal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
