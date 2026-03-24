"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { useGamification } from "@/hooks/useGamification";
import { CommunityShareTradeModal } from "@/components/CommunityShareTradeModal";
import { TradeCard } from "@/components/TradeCard";
import {
  Users,
  Share2,
  Smile,
  MessageCircle,
  Loader2,
  BarChart3,
  Bookmark,
  Heart,
  Repeat2,
  Image as ImageIcon,
  Search,
  MoreHorizontal,
  Link2,
  BarChart2,
  X,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Hash,
  DollarSign,
  UserPlus,
  UserCheck,
  Trophy,
  Star,
  Crown,
} from "lucide-react";
import Link from "next/link";

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
  emotion?: string | null;
  duration?: number | null;
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

/* ─── Constants ─────────────────────────────────────────── */

const MAX_POST_LENGTH = 280;

const POLL_PREFIX = "[POLL]";

interface PollData {
  question: string;
  options: string[];
  duration: string;
  createdAt: string;
}

interface PollDraft {
  question: string;
  options: string[];
  duration: string;
}

const POLL_DURATIONS = [
  { label: "1h", ms: 3600000 },
  { label: "6h", ms: 21600000 },
  { label: "12h", ms: 43200000 },
  { label: "24h", ms: 86400000 },
  { label: "3j", ms: 259200000 },
  { label: "7j", ms: 604800000 },
];

/* ─── Asset & Trending Constants ────────────────────────── */

const KNOWN_ASSETS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD",
  "EURGBP", "EURJPY", "GBPJPY", "XAUUSD", "XAGUSD", "US30", "NAS100",
  "SPX500", "US100", "DAX40", "BTCUSD", "ETHUSD", "USOIL", "BRENT",
  "DXY", "VIX", "EURAUD", "EURNZD", "GBPAUD", "GBPNZD", "AUDNZD",
  "CADJPY", "CHFJPY", "AUDCAD", "NZDCAD",
];

const HASHTAG_REGEX_SRC = "#([A-Za-z\\u00C0-\\u024F0-9_]{2,30})";
const ASSET_MENTION_REGEX_SRC = "\\$([A-Z]{2,10})";
const PLAIN_ASSET_LIST = KNOWN_ASSETS.join("|");
const PLAIN_ASSET_REGEX_SRC = `\\b(${PLAIN_ASSET_LIST})\\b`;

interface TrendingItem {
  topic: string;
  type: "hashtag" | "asset";
  count: number;
  previousCount: number;
}

function extractTrendingFromMessages(
  messages: FeedMessage[],
  now: number = Date.now()
): TrendingItem[] {
  const last24h = now - 24 * 60 * 60 * 1000;
  const prev24h = last24h - 24 * 60 * 60 * 1000;

  const currentCounts = new Map<string, { count: number; type: "hashtag" | "asset" }>();
  const previousCounts = new Map<string, number>();

  for (const msg of messages) {
    const msgTime = new Date(msg.createdAt).getTime();
    const isCurrent = msgTime >= last24h;
    const isPrevious = msgTime >= prev24h && msgTime < last24h;
    if (msgTime < prev24h) continue;

    const content = msg.content;

    // Extract hashtags
    const hashtags = new Set<string>();
    let match: RegExpExecArray | null;
    const hRe = new RegExp(HASHTAG_REGEX_SRC, "g");
    while ((match = hRe.exec(content)) !== null) {
      hashtags.add("#" + match[1].toLowerCase());
    }
    for (const tag of Array.from(hashtags)) {
      if (isCurrent) {
        const prev = currentCounts.get(tag) || { count: 0, type: "hashtag" as const };
        prev.count++;
        currentCounts.set(tag, prev);
      }
      if (isPrevious) {
        previousCounts.set(tag, (previousCounts.get(tag) || 0) + 1);
      }
    }

    // Extract $ASSET mentions
    const assets = new Set<string>();
    const aRe = new RegExp(ASSET_MENTION_REGEX_SRC, "g");
    while ((match = aRe.exec(content)) !== null) {
      const upper = match[1].toUpperCase();
      if (KNOWN_ASSETS.includes(upper)) assets.add("$" + upper);
    }
    // Extract plain asset mentions
    const pRe = new RegExp(PLAIN_ASSET_REGEX_SRC, "g");
    while ((match = pRe.exec(content)) !== null) {
      assets.add("$" + match[1].toUpperCase());
    }
    for (const asset of Array.from(assets)) {
      if (isCurrent) {
        const prev = currentCounts.get(asset) || { count: 0, type: "asset" as const };
        prev.count++;
        currentCounts.set(asset, prev);
      }
      if (isPrevious) {
        previousCounts.set(asset, (previousCounts.get(asset) || 0) + 1);
      }
    }
  }

  const items: TrendingItem[] = [];
  for (const [topic, data] of Array.from(currentCounts.entries())) {
    items.push({
      topic,
      type: data.type,
      count: data.count,
      previousCount: previousCounts.get(topic) || 0,
    });
  }

  return items.sort((a, b) => b.count - a.count).slice(0, 5);
}

/* ─── Render post content with clickable hashtags/assets ── */

function RichPostContent({
  content,
  onHashtagClick,
}: {
  content: string;
  onHashtagClick: (tag: string) => void;
}) {
  const combinedRegex = new RegExp(
    `(?:${HASHTAG_REGEX_SRC})|(?:${ASSET_MENTION_REGEX_SRC})|(?:${PLAIN_ASSET_REGEX_SRC})`,
    "g"
  );

  const parts: { type: "text" | "hashtag" | "asset"; value: string }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = combinedRegex.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, m.index) });
    }
    if (m[1]) {
      parts.push({ type: "hashtag", value: "#" + m[1] });
    } else if (m[2] && KNOWN_ASSETS.includes(m[2].toUpperCase())) {
      parts.push({ type: "asset", value: "$" + m[2].toUpperCase() });
    } else if (m[3]) {
      parts.push({ type: "asset", value: "$" + m[3] });
    } else {
      parts.push({ type: "text", value: m[0] });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "hashtag") {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick(part.value);
              }}
              className="cursor-pointer hover:underline"
              style={{ color: "#06b6d4", fontWeight: 600 }}
            >
              {part.value}
            </span>
          );
        }
        if (part.type === "asset") {
          const assetCode = part.value.replace("$", "");
          return (
            <Link
              key={i}
              href={`/market-data?asset=${assetCode}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
              style={{ color: "#10b981", fontWeight: 600 }}
            >
              {part.value}
            </Link>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}

/* ─── Asset autocomplete suggestions ───────────────────── */

function AssetSuggestions({
  query,
  onSelect,
  visible,
}: {
  query: string;
  onSelect: (asset: string) => void;
  visible: boolean;
}) {
  if (!visible || !query) return null;
  const filtered = KNOWN_ASSETS.filter((a) =>
    a.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 8);
  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 rounded-xl py-1 shadow-2xl z-50 max-h-48 overflow-y-auto"
      style={{
        background: "var(--bg-card, var(--bg-primary))",
        border: "1px solid var(--border)",
        bottom: "100%",
        marginBottom: "4px",
      }}
    >
      {filtered.map((asset) => (
        <button
          key={asset}
          onClick={() => onSelect(asset)}
          className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <DollarSign className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
          <span className="font-semibold" style={{ color: "#10b981" }}>
            {asset}
          </span>
        </button>
      ))}
    </div>
  );
}

function parsePollFromContent(content: string): { poll: PollData; text: string } | null {
  if (!content.startsWith(POLL_PREFIX)) return null;
  try {
    const jsonStr = content.slice(POLL_PREFIX.length);
    const newlineIdx = jsonStr.indexOf("\n");
    const pollJson = newlineIdx >= 0 ? jsonStr.slice(0, newlineIdx) : jsonStr;
    const text = newlineIdx >= 0 ? jsonStr.slice(newlineIdx + 1).trim() : "";
    const poll = JSON.parse(pollJson) as PollData;
    return { poll, text };
  } catch {
    return null;
  }
}

function getPollRemainingTime(poll: PollData): string | null {
  const dur = POLL_DURATIONS.find((d) => d.label === poll.duration);
  if (!dur) return null;
  const end = new Date(poll.createdAt).getTime() + dur.ms;
  const now = Date.now();
  if (now >= end) return null;
  const remaining = end - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}j restant${Math.floor(hours / 24) > 1 ? "s" : ""}`;
  if (hours >= 1) return `${hours}h restante${hours > 1 ? "s" : ""}`;
  return `${minutes}min restante${minutes > 1 ? "s" : ""}`;
}

/* ─── Helpers ───────────────────────────────────────────── */

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getHandle(email: string) {
  return email.split("@")[0].toLowerCase();
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getAvatarGradient(name: string | null): string {
  const gradients = [
    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "linear-gradient(135deg, #a855f7, #ec4899)",
    "linear-gradient(135deg, #10b981, #14b8a6)",
    "linear-gradient(135deg, #f59e0b, #f97316)",
    "linear-gradient(135deg, #f43f5e, #ef4444)",
    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "linear-gradient(135deg, #06b6d4, #8b5cf6)",
    "linear-gradient(135deg, #ec4899, #f59e0b)",
  ];
  if (!name) return gradients[0];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

/* ─── Likes hook (server-side via /api/chat/likes) ─────── */

function useLikes(currentUserId: string | null, messages: FeedMessage[]) {
  // Derive liked state from reactions in messages
  const likes = useMemo(() => {
    const set = new Set<string>();
    if (!currentUserId) return set;
    for (const msg of messages) {
      if (msg.reactions?.some((r) => r.emoji === "\u2764\uFE0F" && r.userId === currentUserId)) {
        set.add(msg.id);
      }
    }
    return set;
  }, [currentUserId, messages]);

  // Optimistic set for instant UI feedback before server confirms
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  // Use refs so callbacks stay stable and don't cause re-renders of all consumers
  const likesRef = useRef(likes);
  likesRef.current = likes;
  const optimisticRef = useRef(optimistic);
  optimisticRef.current = optimistic;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const isLiked = useCallback(
    (messageId: string) => {
      if (messageId in optimisticRef.current) return optimisticRef.current[messageId];
      return likesRef.current.has(messageId);
    },
    [],
  );

  const toggleLike = useCallback(
    async (messageId: string) => {
      const wasLiked = likesRef.current.has(messageId);
      const currentOptimistic = optimisticRef.current[messageId];
      const currentState = currentOptimistic !== undefined ? currentOptimistic : wasLiked;

      // Optimistic update
      setOptimistic((prev) => ({ ...prev, [messageId]: !currentState }));

      try {
        const res = await fetch("/api/chat/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
        // Clear optimistic state regardless — next messages refresh will have truth
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      } catch {
        // Rollback on network error
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    [],
  );

  const getLikeCount = useCallback(
    (msg: FeedMessage) => {
      const serverCount = msg.reactions?.filter((r) => r.emoji === "\u2764\uFE0F").length || 0;
      const wasLikedOnServer = msg.reactions?.some(
        (r) => r.emoji === "\u2764\uFE0F" && r.userId === currentUserIdRef.current,
      ) || false;
      const optState = optimisticRef.current[msg.id];

      if (optState === undefined) return serverCount;
      // Adjust count based on optimistic toggle
      if (optState && !wasLikedOnServer) return serverCount + 1;
      if (!optState && wasLikedOnServer) return serverCount - 1;
      return serverCount;
    },
    [],
  );

  return { isLiked, toggleLike, getLikeCount };
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

/* ─── Poll votes hook (localStorage) ─────────────────────── */

function usePollVotes() {
  const [votes, setVotes] = useState<Record<string, { optionIndex: number; counts: Record<number, number> }>>(
    {}
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("community-poll-votes");
      if (stored) setVotes(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const vote = useCallback((messageId: string, optionIndex: number, totalOptions: number) => {
    setVotes((prev) => {
      if (prev[messageId]) return prev; // already voted
      const counts: Record<number, number> = {};
      for (let i = 0; i < totalOptions; i++) {
        counts[i] = 0;
      }
      counts[optionIndex] = 1;
      const next = { ...prev, [messageId]: { optionIndex, counts } };
      try {
        localStorage.setItem("community-poll-votes", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const votesRef = useRef(votes);
  votesRef.current = votes;

  const getVoteData = useCallback(
    (messageId: string) => {
      return votesRef.current[messageId] || null;
    },
    [],
  );

  return { vote, getVoteData };
}

/* ─── Share counts hook (localStorage) ─────────────────── */

function useShareCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("community-share-counts");
      if (stored) setCounts(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const incrementShare = useCallback((messageId: string) => {
    setCounts((prev) => {
      const next = { ...prev, [messageId]: (prev[messageId] || 0) + 1 };
      try {
        localStorage.setItem("community-share-counts", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const countsRef = useRef(counts);
  countsRef.current = counts;

  const getShareCount = useCallback(
    (messageId: string) => countsRef.current[messageId] || 0,
    [],
  );

  return { incrementShare, getShareCount };
}

/* ─── User Badges Helper ───────────────────────────────── */

function getUserBadges(
  user: FeedMessage["user"],
  allMessages: FeedMessage[],
): { emoji: string; label: string }[] {
  const badges: { emoji: string; label: string }[] = [];

  if (user.role === "VIP" || user.role === "ADMIN") {
    badges.push({ emoji: "\uD83D\uDC8E", label: "VIP" });
  }

  const userTrades = allMessages.filter((m) => m.userId === user.id && m.trade);
  const tradeCount = userTrades.length;

  if (tradeCount > 0) {
    const wins = userTrades.filter((m) => m.trade && m.trade.result > 0);
    const winRate = (wins.length / tradeCount) * 100;

    if (winRate >= 60 && tradeCount >= 5) {
      badges.push({ emoji: "\uD83C\uDFC6", label: `${winRate.toFixed(0)}% win rate` });
    }

    const sorted = [...userTrades].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    let streak = 0;
    for (const m of sorted) {
      if (m.trade && m.trade.result > 0) streak++;
      else break;
    }
    if (streak >= 5) {
      badges.push({ emoji: "\uD83D\uDD25", label: `${streak} wins` });
    }

    if (tradeCount >= 100) {
      badges.push({ emoji: "\uD83D\uDCCA", label: `${tradeCount} trades` });
    }
  }

  return badges.slice(0, 2);
}

/* ─── Trade du Jour Component (API-powered with voting) ── */

interface TdjEntry {
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

function TradeDuJour({ messages: _messages }: { messages: FeedMessage[] }) {
  const [top5, setTop5] = useState<TdjEntry[]>([]);
  const [winner, setWinner] = useState<TdjEntry | null>(null);
  const [loadingTdj, setLoadingTdj] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchTdj = useCallback(() => {
    fetch("/api/trade-of-day")
      .then((r) => r.json())
      .then((data) => {
        setTop5(data.top5 || []);
        setWinner(data.winner || null);
      })
      .catch(() => {})
      .finally(() => setLoadingTdj(false));
  }, []);

  useEffect(() => { fetchTdj(); }, [fetchTdj]);

  const handleVote = async (messageId: string) => {
    setVoting(messageId);
    try {
      const res = await fetch("/api/trade-of-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeMessageId: messageId }),
      });
      if (res.ok) fetchTdj();
    } catch { /* ignore */ }
    setVoting(null);
  };

  if (loadingTdj) {
    return (
      <div className="mx-4 mt-3 mb-1 rounded-2xl p-4 animate-pulse" style={{ background: "linear-gradient(135deg, #fefce8, #fef9c3)", border: "1px solid #fde68a" }}>
        <div className="h-5 w-32 rounded bg-yellow-200/50 mb-2" />
        <div className="h-4 w-48 rounded bg-yellow-200/30" />
      </div>
    );
  }

  if (top5.length === 0) {
    return (
      <div
        className="mx-4 mt-3 mb-1 rounded-2xl p-4 text-center"
        style={{
          background: "linear-gradient(135deg, #fefce8, #fef9c3)",
          border: "1px solid #fde68a",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-5 h-5" style={{ color: "#eab308" }} />
          <span className="font-bold text-[15px]" style={{ color: "#eab308" }}>
            Trade du jour
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Partagez votre meilleur trade pour apparaitre ici !
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mt-3 mb-1 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
        border: "1px solid #f59e0b",
        boxShadow: "0 2px 12px rgba(234,179,8,0.2)",
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5" style={{ color: "#eab308" }} />
          <span className="font-bold text-[15px]" style={{ color: "#eab308" }}>
            Trade du jour
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          1 vote / jour
        </span>
      </div>

      <div className="px-4 pb-3 space-y-2">
        {top5.map((entry, idx) => {
          const trade = entry.trade;
          const isBuy = trade.direction?.toUpperCase() === "BUY" || trade.direction?.toUpperCase() === "LONG";
          const isWinner = idx === 0 && entry.votes > 0;
          const gradient = getAvatarGradient(entry.author.name);

          return (
            <div
              key={entry.messageId}
              className="rounded-xl p-3 transition-all"
              style={{
                background: isWinner ? "rgba(234,179,8,0.12)" : "rgba(234,179,8,0.06)",
                border: isWinner ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(234,179,8,0.1)",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isWinner && <Trophy className="w-4 h-4" style={{ color: "#eab308" }} />}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                    style={{ background: gradient }}
                  >
                    {getInitials(entry.author.name)}
                  </div>
                  <span className="font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {entry.author.name || "Anonyme"}
                  </span>
                </div>
                <button
                  onClick={() => handleVote(entry.messageId)}
                  disabled={voting !== null}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: entry.hasVoted ? "rgba(234,179,8,0.25)" : "rgba(234,179,8,0.08)",
                    color: entry.hasVoted ? "#eab308" : "var(--text-muted)",
                    border: entry.hasVoted ? "1px solid rgba(234,179,8,0.4)" : "1px solid rgba(234,179,8,0.15)",
                    cursor: voting ? "wait" : "pointer",
                  }}
                >
                  <Star className="w-3 h-3" style={{ fill: entry.hasVoted ? "#eab308" : "none" }} />
                  {entry.votes}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {trade.asset}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{
                      background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      color: isBuy ? "#10b981" : "#ef4444",
                    }}
                  >
                    {isBuy ? "LONG" : "SHORT"}
                  </span>
                  {trade.strategy && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {trade.strategy}
                    </span>
                  )}
                </div>
                <span
                  className="text-sm font-bold mono"
                  style={{ color: trade.result >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {trade.result >= 0 ? "+" : ""}{trade.result.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Weekly Recap Component ───────────────────────────── */

function WeeklyRecap({ messages }: { messages: FeedMessage[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekMessages = messages.filter((m) => new Date(m.createdAt) >= sevenDaysAgo);
    if (weekMessages.length === 0) return null;

    const tradesShared = weekMessages.filter((m) => m.trade).length;

    const userPostCounts = new Map<string, { name: string; count: number }>();
    for (const m of weekMessages) {
      const prev = userPostCounts.get(m.userId) || { name: m.user.name || "Anonyme", count: 0 };
      prev.count++;
      userPostCounts.set(m.userId, prev);
    }
    const mostActive = Array.from(userPostCounts.values()).sort((a, b) => b.count - a.count)[0];

    let bestPnl: { name: string; pnl: number } | null = null;
    for (const m of weekMessages) {
      if (m.trade && (!bestPnl || m.trade.result > bestPnl.pnl)) {
        bestPnl = { name: m.user.name || "Anonyme", pnl: m.trade.result };
      }
    }

    let mostLiked: { name: string; likes: number } | null = null;
    for (const m of weekMessages) {
      const likes = m.reactions?.filter((r) => r.emoji === "\u2764\uFE0F").length || 0;
      if (!mostLiked || likes > mostLiked.likes) {
        mostLiked = { name: m.user.name || "Anonyme", likes };
      }
    }

    return {
      totalPosts: weekMessages.length,
      tradesShared,
      mostActive: mostActive || null,
      bestPnl,
      mostLiked: mostLiked && mostLiked.likes > 0 ? mostLiked : null,
    };
  }, [messages]);

  if (!stats) return null;

  return (
    <div
      className="mx-4 mt-2 mb-1 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #eef2ff, #e8e0ff)",
        border: "1px solid #c7d2fe",
        boxShadow: "0 2px 8px rgba(99,102,241,0.12)",
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" style={{ color: "#818cf8" }} />
        <span className="font-bold text-[15px]" style={{ color: "#818cf8" }}>
          Récap de la semaine
        </span>
      </div>
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: "var(--bg-secondary)" }}>
            <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Posts partagés</p>
            <p className="text-lg font-bold" style={{ color: "#818cf8" }}>{stats.totalPosts}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: "var(--bg-secondary)" }}>
            <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Trades partagés</p>
            <p className="text-lg font-bold" style={{ color: "#06b6d4" }}>{stats.tradesShared}</p>
          </div>
          {stats.mostActive && (
            <div className="rounded-xl p-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Plus actif</p>
              <p className="text-sm font-bold truncate" style={{ color: "#f59e0b" }}>{stats.mostActive.name}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.mostActive.count} posts</p>
            </div>
          )}
          {stats.bestPnl && (
            <div className="rounded-xl p-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Meilleur P&amp;L</p>
              <p className="text-sm font-bold truncate" style={{ color: "#10b981" }}>+{stats.bestPnl.pnl.toFixed(2)}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>par {stats.bestPnl.name}</p>
            </div>
          )}
          {stats.mostLiked && (
            <div className="col-span-2 rounded-xl p-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Post le plus aimé</p>
              <p className="text-sm font-bold" style={{ color: "#f43f5e" }}>
                {stats.mostLiked.name} — {stats.mostLiked.likes} <Heart className="inline w-3.5 h-3.5" style={{ fill: "#f43f5e", color: "#f43f5e" }} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Inline Trade Card (embedded in tweet) — uses shared TradeCard ── */

function InlineTradeCard({ trade }: { trade: SharedTrade }) {
  return <TradeCard trade={trade} variant="full" showActions={true} />;
}

/* ─── Poll Display Component ─────────────────────────────── */

function PollDisplay({
  poll,
  messageId,
  voteData,
  onVote,
}: {
  poll: PollData;
  messageId: string;
  voteData: { optionIndex: number; counts: Record<number, number> } | null;
  onVote: (messageId: string, optionIndex: number, totalOptions: number) => void;
}) {
  const hasVoted = voteData !== null;
  const remaining = getPollRemainingTime(poll);
  const isExpired = remaining === null;

  // Vote counts from real data only (no fake base counts)
  const totalVotes = useMemo(() => {
    let total = 0;
    for (let i = 0; i < poll.options.length; i++) {
      total += voteData?.counts[i] || 0;
    }
    return total;
  }, [voteData, poll.options.length]);

  const getPercentage = (idx: number) => {
    const count = voteData?.counts[idx] || 0;
    return totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Question */}
      <p className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>
        {poll.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const pct = getPercentage(idx);
          const isSelected = voteData?.optionIndex === idx;

          if (hasVoted || isExpired) {
            // Show results
            return (
              <div key={idx} className="relative rounded-xl overflow-hidden" style={{ height: "40px" }}>
                {/* Background bar */}
                <div
                  className="absolute inset-0 rounded-xl transition-all duration-500"
                  style={{
                    background: isSelected
                      ? "rgba(6,182,212,0.2)"
                      : "var(--bg-secondary)",
                    border: isSelected
                      ? "1px solid rgba(6,182,212,0.4)"
                      : "1px solid var(--border)",
                  }}
                />
                {/* Fill bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded-xl transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? "rgba(6,182,212,0.25)"
                      : "var(--bg-secondary)",
                  }}
                />
                {/* Text */}
                <div className="relative flex items-center justify-between px-3 h-full">
                  <div className="flex items-center gap-2">
                    {isSelected && <CheckCircle2 className="w-4 h-4" style={{ color: "#06b6d4" }} />}
                    <span
                      className="text-sm"
                      style={{
                        color: isSelected ? "#06b6d4" : "var(--text-primary)",
                        fontWeight: isSelected ? 700 : 400,
                      }}
                    >
                      {option}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{ color: isSelected ? "#06b6d4" : "var(--text-secondary)" }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            );
          }

          // Voting buttons
          return (
            <button
              key={idx}
              onClick={() => onVote(messageId, idx, poll.options.length)}
              className="w-full rounded-xl text-sm font-bold py-2.5 transition-all"
              style={{
                border: "1px solid rgba(6,182,212,0.4)",
                color: "#06b6d4",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(6,182,212,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Footer: total votes + time remaining */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          {totalVotes.toLocaleString("fr-FR")} vote{totalVotes > 1 ? "s" : ""}
        </span>
        {remaining && (
          <>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span className="text-[13px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-3.5 h-3.5" />
              {remaining}
            </span>
          </>
        )}
        {isExpired && (
          <>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Terminé
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Tweet Post Component ──────────────────────────────── */

function TweetPost({
  msg,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onReply,
  likeCount,
  replyCount,
  pollVoteData,
  onPollVote,
  onHashtagClick,
  badges,
  shareCount,
  onShare,
}: {
  msg: FeedMessage;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: (messageId: string) => void;
  onBookmark: (messageId: string) => void;
  onReply: (messageId: string) => void;
  likeCount: number;
  replyCount: number;
  pollVoteData: { optionIndex: number; counts: Record<number, number> } | null;
  onPollVote: (messageId: string, optionIndex: number, totalOptions: number) => void;
  onHashtagClick: (tag: string) => void;
  badges: { emoji: string; label: string }[];
  shareCount: number;
  onShare: (messageId: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [copied, setCopied] = useState(false);
  const gradient = getAvatarGradient(msg.user.name);
  const handle = getHandle(msg.user.email);
  // No fake view counts

  const handleLike = () => {
    onLike(msg.id);
    if (!isLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 300);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community#post-${msg.id}`);
      setCopied(true);
      onShare(msg.id);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <article
      className="px-4 py-3 transition-colors cursor-default"
      style={{
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      id={`post-${msg.id}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: gradient }}
        >
          {getInitials(msg.user.name)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header line */}
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="font-bold text-[15px] truncate hover:underline cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              {msg.user.name || "Anonyme"}
            </span>
            {badges.map((badge, i) => (
              <span
                key={i}
                className="shrink-0 text-[13px] cursor-default"
                title={badge.label}
              >
                {badge.emoji}
              </span>
            ))}
            {msg.user.role === "ADMIN" && (
              <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] shrink-0" style={{ color: "#06b6d4" }}>
                <path
                  fill="currentColor"
                  d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.691-.13.635-.08 1.293.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.604-.274 1.26-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.75 1.69.882.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.273 1.896.143.634-.131 1.218-.435 1.688-.88.444-.47.748-1.056.88-1.692.13-.635.082-1.293-.14-1.896.587-.274 1.084-.706 1.438-1.246.355-.54.552-1.17.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                />
              </svg>
            )}
            <span className="text-[15px] truncate" style={{ color: "var(--text-muted)" }}>
              @{handle}
            </span>
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
              ·
            </span>
            <span
              className="text-[13px] shrink-0 hover:underline cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              {formatTime(msg.createdAt)}
            </span>

            {/* More menu */}
            <div className="ml-auto relative shrink-0">
              <button
                onClick={() => setShowMore(!showMore)}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                  e.currentTarget.style.color = "#06b6d4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 shadow-2xl z-40"
                    style={{
                      background: "var(--bg-card, var(--bg-primary))",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => setShowMore(false)}
                      className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Signaler ce post
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Post content */}
          {(() => {
            const pollParsed = parsePollFromContent(msg.content);
            if (pollParsed) {
              return (
                <div className="mt-0.5">
                  {pollParsed.text && (
                    <p
                      className="whitespace-pre-wrap break-words mb-1"
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "15px",
                        lineHeight: "1.5",
                      }}
                    >
                      {pollParsed.text}
                    </p>
                  )}
                  <PollDisplay
                    poll={pollParsed.poll}
                    messageId={msg.id}
                    voteData={pollVoteData}
                    onVote={onPollVote}
                  />
                </div>
              );
            }
            return (
              <div className="mt-0.5">
                <p
                  className="whitespace-pre-wrap break-words"
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    lineHeight: "1.5",
                  }}
                >
                  <RichPostContent content={msg.content} onHashtagClick={onHashtagClick} />
                </p>
              </div>
            );
          })()}

          {/* Trade card if attached */}
          {msg.trade && <InlineTradeCard trade={msg.trade} />}

          {/* Image if attached */}
          {msg.imageUrl && /^(https?:\/\/|data:image\/(?!svg))/.test(msg.imageUrl) && (
            <div
              className="mt-3 rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src={msg.imageUrl}
                alt="Image partagée"
                className="w-full h-auto max-h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Action bar — Twitter-style */}
          <div className="flex items-center justify-between mt-2 -ml-2" style={{ maxWidth: "425px" }}>
            {/* Reply */}
            <button
              onClick={() => onReply(msg.id)}
              className="group flex items-center gap-1.5 p-2 rounded-full transition-all"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#06b6d4";
                e.currentTarget.style.background = "rgba(6,182,212,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
              title="Répondre"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              {replyCount > 0 && <span className="text-[13px]">{replyCount}</span>}
            </button>

            {/* Repost */}
            <button
              className="group flex items-center gap-1.5 p-2 rounded-full transition-all cursor-default"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
              title="Disponible prochainement"
            >
              <Repeat2 className="w-[18px] h-[18px]" />
            </button>

            {/* Like (heart) */}
            <button
              onClick={handleLike}
              className="group flex items-center gap-1.5 p-2 rounded-full transition-all"
              style={{ color: isLiked ? "#f43f5e" : "var(--text-muted)" }}
              onMouseEnter={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.color = "#f43f5e";
                  e.currentTarget.style.background = "rgba(244,63,94,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.color = "var(--text-muted)";
                }
                e.currentTarget.style.background = "transparent";
              }}
              title="J'aime"
            >
              <Heart
                className="w-[18px] h-[18px] transition-transform"
                style={{
                  fill: isLiked ? "#f43f5e" : "none",
                  transform: likeAnim ? "scale(1.3)" : "scale(1)",
                  transition: "transform 0.15s cubic-bezier(0.17, 0.67, 0.35, 1.5)",
                }}
              />
              {likeCount > 0 && <span className="text-[13px]">{likeCount}</span>}
            </button>

            {/* Views removed — no fake data */}

            {/* Bookmark + Share */}
            <div className="flex items-center gap-0">
              <button
                onClick={() => onBookmark(msg.id)}
                className="p-2 rounded-full transition-all"
                style={{ color: isBookmarked ? "#06b6d4" : "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#06b6d4";
                  e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isBookmarked ? "#06b6d4" : "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
                title="Sauvegarder"
              >
                <Bookmark
                  className="w-[18px] h-[18px]"
                  style={{ fill: isBookmarked ? "#06b6d4" : "none" }}
                />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full transition-all relative"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#06b6d4";
                  e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
                title="Partager"
              >
                <Link2 className="w-[18px] h-[18px]" />
                {shareCount > 0 && <span className="text-[13px] ml-0.5">{shareCount}</span>}
                {copied && (
                  <span
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap"
                    style={{
                      background: "#06b6d4",
                      color: "#fff",
                    }}
                  >
                    Lien copié !
                  </span>
                )}
              </button>
            </div>
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
  imagePreview,
  setImagePreview,
  pollDraft,
  setPollDraft,
}: {
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onShareTrade: () => void;
  userName: string | null;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  pollDraft: PollDraft | null;
  setPollDraft: (v: PollDraft | null) => void;
}) {
  const gradient = getAvatarGradient(userName);
  const charCount = input.length;
  const remaining = MAX_POST_LENGTH - charCount;
  const isOverLimit = remaining < 0;
  const progress = Math.min(1, charCount / MAX_POST_LENGTH);
  const circumference = 2 * Math.PI * 10;
  const strokeColor = isOverLimit ? "#ef4444" : remaining <= 20 ? "#ef4444" : remaining <= 40 ? "#f59e0b" : "#06b6d4";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);

  const handleInputChange = (value: string) => {
    setInput(value.slice(0, MAX_POST_LENGTH + 20));
    const cursorMatch = value.match(/\$([A-Za-z]{0,10})$/);
    if (cursorMatch) {
      setAssetQuery(cursorMatch[1]);
      setShowAssetSuggestions(true);
    } else {
      setShowAssetSuggestions(false);
      setAssetQuery("");
    }
  };

  const handleAssetSelect = (asset: string) => {
    const newInput = input.replace(/\$[A-Za-z]{0,10}$/, "$" + asset + " ");
    setInput(newInput);
    setShowAssetSuggestions(false);
    setAssetQuery("");
  };

  const canPost = sending
    ? false
    : pollDraft
      ? pollDraft.question.trim().length > 0 && pollDraft.options.filter((o) => o.trim()).length >= 2
      : input.trim().length > 0 && !isOverLimit;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedExtensions = /\.(jpe?g|png|gif|webp)$/i;
    if (!file.type.startsWith("image/") || !allowedExtensions.test(file.name)) {
      alert("Format non supporté. Utilisez JPG, PNG, GIF ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop volumineuse (max 5 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      // Remove poll if image is added
      if (pollDraft) setPollDraft(null);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleStartPoll = () => {
    setPollDraft({ question: "", options: ["", ""], duration: "24h" });
    // Remove image if poll is started
    if (imagePreview) setImagePreview(null);
  };

  return (
    <div
      className="px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: gradient }}
        >
          {getInitials(userName)}
        </div>

        {/* Composer area */}
        <div className="flex-1 min-w-0 relative">
          <AssetSuggestions
            query={assetQuery}
            onSelect={handleAssetSelect}
            visible={showAssetSuggestions}
          />
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canPost) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={pollDraft ? "Ajoutez un commentaire (optionnel)..." : "Quoi de neuf sur les marchés ?"}
            rows={2}
            className="w-full bg-transparent resize-none focus:outline-none"
            style={{
              color: "var(--text-primary)",
              fontSize: "18px",
              lineHeight: "1.5",
              caretColor: "#06b6d4",
            }}
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-2 mb-2 inline-block">
              <img
                src={imagePreview}
                alt="Apercu"
                className="rounded-2xl object-cover"
                style={{
                  maxHeight: "200px",
                  maxWidth: "100%",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  backdropFilter: "blur(4px)",
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Poll draft form */}
          {pollDraft && (
            <div
              className="mt-2 mb-2 rounded-2xl p-4 space-y-3"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Question */}
              <input
                type="text"
                value={pollDraft.question}
                onChange={(e) =>
                  setPollDraft({ ...pollDraft, question: e.target.value.slice(0, 120) })
                }
                placeholder="Posez votre question..."
                className="w-full bg-transparent text-[15px] font-bold focus:outline-none"
                style={{
                  color: "var(--text-primary)",
                  caretColor: "#06b6d4",
                }}
              />

              {/* Options */}
              <div className="space-y-2">
                {pollDraft.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollDraft.options];
                        newOpts[idx] = e.target.value.slice(0, 50);
                        setPollDraft({ ...pollDraft, options: newOpts });
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-transparent text-sm py-2 px-3 rounded-xl focus:outline-none transition-all"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        caretColor: "#06b6d4",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#06b6d4")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                    {pollDraft.options.length > 2 && (
                      <button
                        onClick={() => {
                          const newOpts = pollDraft.options.filter((_, i) => i !== idx);
                          setPollDraft({ ...pollDraft, options: newOpts });
                        }}
                        className="p-1.5 rounded-full transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#ef4444";
                          e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add option button */}
              {pollDraft.options.length < 4 && (
                <button
                  onClick={() => setPollDraft({ ...pollDraft, options: [...pollDraft.options, ""] })}
                  className="flex items-center gap-1.5 text-sm font-medium py-1.5 transition-colors"
                  style={{ color: "#06b6d4" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une option
                </button>
              )}

              {/* Duration selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  Durée :
                </span>
                {POLL_DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setPollDraft({ ...pollDraft, duration: d.label })}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
                    style={{
                      background:
                        pollDraft.duration === d.label ? "rgba(6,182,212,0.2)" : "transparent",
                      color: pollDraft.duration === d.label ? "#06b6d4" : "var(--text-muted)",
                      border:
                        pollDraft.duration === d.label
                          ? "1px solid rgba(6,182,212,0.4)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Remove poll */}
              <button
                onClick={() => setPollDraft(null)}
                className="flex items-center gap-1.5 text-sm font-medium py-1 transition-colors"
                style={{ color: "#ef4444" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Retirer le sondage
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Divider */}
          <div style={{ height: "1px", background: "var(--border)", margin: "12px 0" }} />

          {/* Bottom bar */}
          <div className="flex items-center justify-between">
            {/* Action icons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full transition-all"
                style={{ color: "#06b6d4", opacity: pollDraft ? 0.3 : 1 }}
                disabled={!!pollDraft}
                onMouseEnter={(e) => {
                  if (!pollDraft) e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Ajouter une image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-full transition-all"
                style={{ color: "#06b6d4", opacity: 0.5, cursor: "not-allowed" }}
                disabled
                title="Graphique (bientot)"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={onShareTrade}
                className="p-2 rounded-full transition-all"
                style={{ color: "#06b6d4" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Partager un trade"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-full transition-all"
                style={{ color: "#06b6d4", opacity: 0.5, cursor: "not-allowed" }}
                disabled
                title="Emoji (bientot)"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={handleStartPoll}
                className="p-2 rounded-full transition-all"
                style={{ color: "#06b6d4", opacity: imagePreview ? 0.3 : 1 }}
                disabled={!!imagePreview}
                onMouseEnter={(e) => {
                  if (!imagePreview) e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Créer un sondage"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
            </div>

            {/* Character counter + Post button */}
            <div className="flex items-center gap-3">
              {charCount > 0 && !pollDraft && (
                <div className="flex items-center gap-2">
                  {/* Circular progress */}
                  <div className="relative w-[28px] h-[28px]">
                    <svg className="-rotate-90" width="28" height="28" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeDasharray={`${progress * circumference} ${circumference}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.15s ease, stroke 0.15s ease" }}
                      />
                    </svg>
                    {remaining <= 20 && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                        style={{ color: strokeColor }}
                      >
                        {remaining}
                      </span>
                    )}
                  </div>

                  {/* Separator */}
                  <div
                    className="w-px h-6"
                    style={{ background: "var(--border)" }}
                  />
                </div>
              )}

              <button
                onClick={onSend}
                disabled={!canPost}
                className="px-5 py-2 rounded-full font-bold text-sm transition-all"
                style={{
                  background: !canPost ? "rgba(6,182,212,0.4)" : "#06b6d4",
                  color: "#fff",
                  cursor: !canPost ? "not-allowed" : "pointer",
                  opacity: !canPost ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (canPost) {
                    e.currentTarget.style.background = "#22d3ee";
                  }
                }}
                onMouseLeave={(e) => {
                  if (canPost) {
                    e.currentTarget.style.background = "#06b6d4";
                  }
                }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Poster"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Right Sidebar ─────────────────────────────────────── */

interface SuggestedUser {
  id: string;
  name: string | null;
  handle: string;
  role: string;
  winRate: number;
  sharedTrades: number;
}

function RightSidebar({
  myStats,
  trendingAssets,
  trendingTopics,
  searchQuery,
  setSearchQuery,
  currentUserId,
  onTrendClick,
}: {
  myStats: {
    winRate: number;
    totalPnl: number;
    streak: number;
    trades: number;
  } | null;
  trendingAssets: { asset: string; count: number; pnl: number }[];
  trendingTopics: TrendingItem[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  currentUserId: string | null;
  onTrendClick: (topic: string) => void;
}) {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loadingSuggested, setLoadingSuggested] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    fetch("/api/users/suggested")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SuggestedUser[]) => setSuggestedUsers(data))
      .catch(() => {})
      .finally(() => setLoadingSuggested(false));
  }, [currentUserId]);

  const toggleFollow = async (userId: string) => {
    const res = await fetch("/api/users/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (data.following) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  return (
    <aside className="space-y-4 sticky top-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher #hashtag ou $ASSET"
          className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm focus:outline-none transition-all"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06b6d4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full"
            style={{ background: "#06b6d4", color: "#fff" }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tendances pour vous */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-extrabold text-[17px]" style={{ color: "var(--text-primary)" }}>
            Tendances pour vous
          </h3>
        </div>
        <div>
          {trendingTopics.length > 0 ? (
            trendingTopics.map((item, i) => {
              const isUp = item.count > item.previousCount;
              const isNew = item.previousCount === 0;
              return (
                <div
                  key={item.topic}
                  className="px-4 py-3 transition-colors cursor-pointer"
                  onClick={() => onTrendClick(item.topic)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {i + 1} · {item.type === "hashtag" ? "Tendance" : "Trading"}
                    </p>
                    {isNew ? (
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>
                        NOUVEAU
                      </span>
                    ) : isUp ? (
                      <TrendingUp className="w-4 h-4" style={{ color: "#10b981" }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: "#ef4444" }} />
                    )}
                  </div>
                  <p className="font-bold text-[15px]" style={{ color: item.type === "hashtag" ? "#06b6d4" : "#10b981" }}>
                    {item.topic}
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    {item.count} post{item.count > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })
          ) : trendingAssets.length > 0 ? (
            trendingAssets.map((item, i) => (
              <div
                key={item.asset}
                className="px-4 py-3 transition-colors cursor-pointer"
                onClick={() => onTrendClick("$" + item.asset)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {i + 1} · Trading
                </p>
                <p className="font-bold text-[15px]" style={{ color: "#10b981" }}>
                  ${item.asset}
                </p>
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {item.count} trade{item.count > 1 ? "s" : ""}
                  <span
                    className="ml-2 font-medium"
                    style={{ color: item.pnl >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    {item.pnl >= 0 ? "+" : ""}
                    {item.pnl.toFixed(0)}&euro;
                  </span>
                </p>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Aucune tendance pour le moment
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Qui suivre */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-extrabold text-[17px]" style={{ color: "var(--text-primary)" }}>
            Qui suivre
          </h3>
        </div>
        <div>
          {loadingSuggested ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#06b6d4" }} />
            </div>
          ) : suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => {
              const isFollowing = followingSet.has(user.id);
              return (
                <div
                  key={user.id}
                  className="px-4 py-3 flex items-center gap-3 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: getAvatarGradient(user.name) }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[14px] truncate" style={{ color: "var(--text-primary)" }}>
                        {user.name || user.handle}
                      </span>
                      {(user.role === "PRO" || user.role === "VIP" || user.role === "ADMIN") && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{
                            background: user.role === "ADMIN" ? "rgba(239,68,68,0.15)" : user.role === "VIP" ? "rgba(168,85,247,0.15)" : "rgba(6,182,212,0.15)",
                            color: user.role === "ADMIN" ? "#ef4444" : user.role === "VIP" ? "#a855f7" : "#06b6d4",
                          }}
                        >
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>@{user.handle}</span>
                      <span className="text-[11px] font-medium" style={{ color: "#06b6d4" }}>{user.winRate}% WR</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 flex items-center gap-1"
                    style={{
                      background: isFollowing ? "transparent" : "#06b6d4",
                      color: isFollowing ? "#06b6d4" : "#fff",
                      border: isFollowing ? "1px solid rgba(6,182,212,0.4)" : "1px solid transparent",
                    }}
                  >
                    {isFollowing ? <><UserCheck className="w-3.5 h-3.5" /> Suivi</> : <><UserPlus className="w-3.5 h-3.5" /> Suivre</>}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center">
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Aucune suggestion pour le moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Mes Stats */}
      {myStats && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="font-extrabold text-[17px]" style={{ color: "var(--text-primary)" }}>
              Mes Stats
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(6,182,212,0.08)" }}
              >
                <p className="text-xl font-bold" style={{ color: "#06b6d4" }}>
                  {myStats.winRate.toFixed(1)}%
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Win rate
                </p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  background: myStats.totalPnl >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                }}
              >
                <p
                  className="text-xl font-bold"
                  style={{ color: myStats.totalPnl >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {myStats.totalPnl >= 0 ? "+" : ""}
                  {myStats.totalPnl.toFixed(0)}&euro;
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  P&amp;L total
                </p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(168,85,247,0.08)" }}
              >
                <p className="text-xl font-bold" style={{ color: "#a855f7" }}>
                  {myStats.streak}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Serie
                </p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(245,158,11,0.08)" }}
              >
                <p className="text-xl font-bold" style={{ color: "#f59e0b" }}>
                  {myStats.trades}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Trades
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="px-4 flex flex-wrap gap-x-2 gap-y-1">
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Conditions
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          ·
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Confidentialite
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          ·
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          &copy; 2026 MarketPhase
        </span>
      </div>
    </aside>
  );
}

/* ─── Main Page Component ───────────────────────────────── */

export default function CommunityPage() {
  const { t } = useTranslation();
  const { trades, loading: tradesLoading } = useTrades();
  const { data: gamData } = useGamification();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { vote: pollVote, getVoteData: getPollVoteData } = usePollVotes();

  type TabId = "foryou" | "following";
  const [activeTab, setActiveTab] = useState<TabId>("foryou");
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityRoomId, setCommunityRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [newPostCount, setNewPostCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pollDraft, setPollDraft] = useState<PollDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followingMessages, setFollowingMessages] = useState<FeedMessage[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);

  const { isLiked, toggleLike, getLikeCount } = useLikes(currentUserId, messages);
  const { incrementShare, getShareCount } = useShareCounts();

  type SortMode = "recent" | "populaire";
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const feedRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenCountRef = useRef(0);

  /* ─── My stats (from real data) ─── */
  const myStats = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter((t) => t.result > 0);
    const totalPnl = trades.reduce((s, t) => s + t.result, 0);
    const winRate = (wins.length / trades.length) * 100;
    let streak = 0;
    const sorted = [...trades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const t of sorted) {
      if (t.result > 0) streak++;
      else break;
    }
    return { winRate, totalPnl, streak, trades: trades.length };
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

  /* ─── Trending topics from community messages ─── */
  const trendingTopics = useMemo(() => {
    return extractTrendingFromMessages(messages);
  }, [messages]);

  /* ─── Memoized badge map — avoids O(N^2) per render ─── */
  const badgeMap = useMemo(() => {
    const map = new Map<string, { emoji: string; label: string }[]>();
    for (const msg of messages) {
      if (!map.has(msg.userId)) {
        map.set(msg.userId, getUserBadges(msg.user, messages));
      }
    }
    return map;
  }, [messages]);

  /* ─── Handle hashtag/trend click → filter feed ─── */
  const handleTrendClick = useCallback((topic: string) => {
    setSearchQuery(topic);
  }, []);

  /* ─── Room init & messaging ─── */
  const initRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (!res.ok) {
        console.error("Init room: bad status", res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const rooms = Array.isArray(data) ? data : (data.rooms ?? []);
      const community = rooms.find(
        (r: { name: string }) =>
          r.name === "Général" || r.name === "General" || r.name === "Communauté" || r.name === "Communaute" || r.name === "community"
      ) || rooms[0];
      if (community) {
        setCommunityRoomId(community.id);
      } else {
        setCommunityRoomId(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Init room error:", error);
      setError("Impossible de charger le salon. Veuillez réessayer.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.userId) setCurrentUserId(data.userId);
        else if (data?.id) setCurrentUserId(data.id);
        if (data?.name) setCurrentUserName(data.name);
      })
      .catch(() => {});
  }, []);

  const fetchMessages = useCallback(
    async (roomId: string, after?: string) => {
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
              const newMsgs = data.messages.filter(
                (m: FeedMessage) => !existingIds.has(m.id)
              );
              if (newMsgs.length > 0) {
                // Track new posts for notification bar
                setNewPostCount((c) => c + newMsgs.length);
                return [...prev, ...newMsgs];
              }
              return prev;
            });
          }
        } else {
          setMessages(data.messages || []);
          lastSeenCountRef.current = data.messages?.length || 0;
        }
      } catch (error) {
        console.error("Fetch messages error:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    initRoom();
  }, [initRoom]);

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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [communityRoomId, fetchMessages]);

  // Fetch following feed when Suivis tab is active
  useEffect(() => {
    if (activeTab !== "following" || !currentUserId || !communityRoomId) return;
    setFollowingLoading(true);
    (async () => {
      try {
        const [msgsRes, followRes] = await Promise.all([
          fetch("/api/chat/messages?roomId=" + communityRoomId + "&limit=100"),
          fetch("/api/users/follow/list"),
        ]);
        const allMsgs: FeedMessage[] = msgsRes.ok ? (await msgsRes.json()).messages || [] : [];
        if (followRes.ok) {
          const { followingIds: ids }: { followingIds: string[] } = await followRes.json();
          setFollowedUserIds(ids);
          setFollowingMessages(allMsgs.filter((m) => ids.includes(m.userId)));
        } else {
          setFollowingMessages([]);
        }
      } catch {
        setFollowingMessages([]);
      } finally {
        setFollowingLoading(false);
      }
    })();
  }, [activeTab, currentUserId, communityRoomId]);

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
        setImagePreview(null);
        setPollDraft(null);
      }
    } catch (err) {
      console.error("Send message error:", err);
      setError("Impossible d'envoyer le message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  const handleShareFromJournal = (tradeId: string, content: string, comment: string) => {
    const fullContent = comment ? `${comment}\n\n${content}` : content;
    sendMessage(fullContent, tradeId);
    setShowShareModal(false);
  };

  const handleReply = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setInput(`@${msg.user.name || "Anonyme"} `);
      // Focus composer
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleShowNewPosts = () => {
    setNewPostCount(0);
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Filter messages by search ─── */
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim();
    const qLower = q.toLowerCase();

    // Filter by hashtag
    if (q.startsWith("#")) {
      return messages.filter((m) => {
        const hRe = new RegExp(HASHTAG_REGEX_SRC, "gi");
        let match: RegExpExecArray | null;
        while ((match = hRe.exec(m.content)) !== null) {
          if (("#" + match[1]).toLowerCase() === qLower) return true;
        }
        return false;
      });
    }

    // Filter by asset mention
    if (q.startsWith("$")) {
      const assetSearch = q.slice(1).toUpperCase();
      return messages.filter((m) => {
        const content = m.content.toUpperCase();
        return (
          content.includes("$" + assetSearch) ||
          content.includes(assetSearch) ||
          m.trade?.asset.toUpperCase() === assetSearch
        );
      });
    }

    // General search
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(qLower) ||
        m.user.name?.toLowerCase().includes(qLower) ||
        m.user.email.toLowerCase().includes(qLower) ||
        m.trade?.asset.toLowerCase().includes(qLower)
    );
  }, [messages, searchQuery]);

  /* ─── Sort: newest first or by popularity ─── */
  const sortedMessages = useMemo(() => {
    if (sortMode === "populaire") {
      return [...filteredMessages].sort((a, b) => {
        const aReactions = a.reactions?.length || 0;
        const bReactions = b.reactions?.length || 0;
        return bReactions - aReactions;
      });
    }
    return [...filteredMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredMessages, sortMode]);

  /* ─── Render ─── */
  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex gap-0">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CENTER COLUMN — Main Feed                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 min-w-0"
          style={{
            maxWidth: "600px",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Sticky Header + Tabs */}
          <div
            className="sticky top-0 z-20"
            style={{
              background: "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* Title */}
            <div className="px-4 py-3">
              <h1
                className="text-[20px] font-extrabold"
                style={{ color: "var(--text-primary)" }}
              >
                Communauté
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar" style={{ borderBottom: "1px solid var(--border)" }}>
              {([
                { id: "foryou" as TabId, label: "Pour toi" },
                { id: "following" as TabId, label: "Suivis" },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-3 text-center relative transition-colors whitespace-nowrap"
                  style={{
                    color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[4px] rounded-full"
                      style={{ width: "80%", maxWidth: "56px", background: "#06b6d4" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* New posts notification bar */}
          {newPostCount > 0 && (
            <button
              onClick={handleShowNewPosts}
              className="w-full py-3 text-center text-sm font-medium transition-colors"
              style={{
                color: "#06b6d4",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {newPostCount} nouveau{newPostCount > 1 ? "x" : ""} post
              {newPostCount > 1 ? "s" : ""}
            </button>
          )}

          {/* Feed content */}
          {activeTab === "foryou" ? (
            <div ref={feedRef}>
              {/* Trade du Jour */}
              <TradeDuJour messages={messages} />

              {/* Weekly Recap */}
              <WeeklyRecap messages={messages} />

              {/* Sort pills */}
              <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setSortMode("recent")}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    background: sortMode === "recent" ? "rgba(6,182,212,0.15)" : "transparent",
                    color: sortMode === "recent" ? "#06b6d4" : "var(--text-muted)",
                    border: sortMode === "recent" ? "1px solid rgba(6,182,212,0.3)" : "1px solid var(--border)",
                  }}
                >
                  Récent
                </button>
                <button
                  onClick={() => setSortMode("populaire")}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    background: sortMode === "populaire" ? "rgba(6,182,212,0.15)" : "transparent",
                    color: sortMode === "populaire" ? "#06b6d4" : "var(--text-muted)",
                    border: sortMode === "populaire" ? "1px solid rgba(6,182,212,0.3)" : "1px solid var(--border)",
                  }}
                >
                  Populaire
                </button>
              </div>

              {/* Post Composer */}
              {communityRoomId && (
                <PostComposer
                  input={input}
                  setInput={setInput}
                  sending={sending}
                  onSend={() => {
                    if (pollDraft) {
                      // Build poll content
                      const pollData: PollData = {
                        question: pollDraft.question.trim(),
                        options: pollDraft.options.filter((o) => o.trim()),
                        duration: pollDraft.duration,
                        createdAt: new Date().toISOString(),
                      };
                      const pollContent = `${POLL_PREFIX}${JSON.stringify(pollData)}${input.trim() ? "\n" + input.trim() : ""}`;
                      sendMessage(pollContent);
                    } else {
                      sendMessage(input, undefined, imagePreview || undefined);
                    }
                  }}
                  onShareTrade={() => setShowShareModal(true)}
                  userName={currentUserName}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  pollDraft={pollDraft}
                  setPollDraft={setPollDraft}
                />
              )}

              {error && (
                <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin mb-3" style={{ color: "#06b6d4" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Chargement du fil...
                  </p>
                </div>
              ) : !communityRoomId ? (
                <div className="py-20 text-center px-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(6,182,212,0.1)" }}
                  >
                    <Users className="w-8 h-8" style={{ color: "#06b6d4" }} />
                  </div>
                  <h2
                    className="text-lg font-bold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Communauté
                  </h2>
                  <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                    Le salon communautaire n&apos;a pas encore ete cree. Contactez un administrateur.
                  </p>
                </div>
              ) : sortedMessages.length === 0 ? (
                /* Empty state */
                <div className="py-20 text-center px-8">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(6,182,212,0.1)" }}
                  >
                    <MessageCircle className="w-10 h-10" style={{ color: "#06b6d4" }} />
                  </div>
                  <h2
                    className="text-2xl font-extrabold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Bienvenue dans la communauté !
                  </h2>
                  <p
                    className="text-[15px] max-w-md mx-auto mb-6"
                    style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}
                  >
                    Partagez vos analyses, vos trades et echangez avec d&apos;autres traders.
                  </p>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector("textarea");
                      textarea?.focus();
                    }}
                    className="px-8 py-3 rounded-full font-bold text-[15px] transition-all"
                    style={{ background: "#06b6d4", color: "#fff" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#22d3ee")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#06b6d4")}
                  >
                    Poster
                  </button>
                </div>
              ) : (
                <>
                  {sortedMessages.map((msg) => (
                    <TweetPost
                      key={msg.id}
                      msg={msg}
                      isLiked={isLiked(msg.id)}
                      isBookmarked={bookmarks.has(msg.id)}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                      onReply={handleReply}
                      likeCount={getLikeCount(msg)}
                      replyCount={0}
                      pollVoteData={getPollVoteData(msg.id)}
                      onPollVote={pollVote}
                      onHashtagClick={handleTrendClick}
                      badges={badgeMap.get(msg.userId) || []}
                      shareCount={getShareCount(msg.id)}
                      onShare={incrementShare}
                    />
                  ))}
                  <div className="h-20" />
                </>
              )}
            </div>
          ) : activeTab === "following" ? (
            /* Suivis — filtered feed from followed users */
            <div>
              {followingLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin mb-3" style={{ color: "#06b6d4" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Chargement des posts...
                  </p>
                </div>
              ) : followingMessages.length === 0 ? (
                <div className="py-20 text-center px-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(6,182,212,0.1)" }}
                  >
                    <Users className="w-8 h-8" style={{ color: "#06b6d4" }} />
                  </div>
                  <h2
                    className="text-xl font-extrabold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Suivis
                  </h2>
                  <p className="text-[15px] mb-1" style={{ color: "var(--text-secondary)" }}>
                    {followedUserIds.length === 0
                      ? "Suivez d'autres traders pour voir leurs posts ici."
                      : "Les traders que vous suivez n'ont pas encore poste."}
                  </p>
                </div>
              ) : (
                <>
                  {followingMessages
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((msg) => (
                      <TweetPost
                        key={msg.id}
                        msg={msg}
                        isLiked={isLiked(msg.id)}
                        isBookmarked={bookmarks.has(msg.id)}
                        onLike={toggleLike}
                        onBookmark={toggleBookmark}
                        onReply={handleReply}
                        likeCount={getLikeCount(msg)}
                        replyCount={0}
                        pollVoteData={getPollVoteData(msg.id)}
                        onPollVote={pollVote}
                        onHashtagClick={handleTrendClick}
                        badges={badgeMap.get(msg.userId) || []}
                        shareCount={getShareCount(msg.id)}
                        onShare={incrementShare}
                      />
                    ))}
                  <div className="h-20" />
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RIGHT SIDEBAR — hidden on small screens                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div
          className="hidden lg:block shrink-0 pl-6 pt-2"
          style={{ width: "350px" }}
        >
          <RightSidebar
            myStats={myStats}
            trendingAssets={trendingAssets}
            trendingTopics={trendingTopics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onTrendClick={handleTrendClick}
            currentUserId={currentUserId}
          />
        </div>
      </div>

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
