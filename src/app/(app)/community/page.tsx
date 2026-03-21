"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import { useGamification } from "@/hooks/useGamification";
import { CommunityShareTradeModal } from "@/components/CommunityShareTradeModal";
import { calculateRR } from "@/lib/utils";
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
  ArrowUpRight,
  ArrowDownRight,
  X,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
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

function pseudoRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
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

  const getVoteData = useCallback(
    (messageId: string) => {
      return votes[messageId] || null;
    },
    [votes]
  );

  return { vote, getVoteData };
}

/* ─── Inline Trade Card (embedded in tweet) ─────────────── */

function InlineTradeCard({ trade }: { trade: SharedTrade }) {
  const isBuy = trade.direction?.toUpperCase() === "BUY" || trade.direction?.toUpperCase() === "LONG";
  const pnl = trade.result;
  const rr = trade.sl && trade.tp ? calculateRR(trade.entry, trade.sl, trade.tp) : null;

  return (
    <div
      className="mt-3 rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
    >
      <div className="p-3.5">
        {/* Asset + Direction badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>
              {trade.asset}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: isBuy ? "#10b981" : "#ef4444",
                border: `1px solid ${isBuy ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              {isBuy ? "LONG" : "SHORT"}
            </span>
          </div>
          {isBuy ? (
            <ArrowUpRight className="w-5 h-5" style={{ color: "#10b981" }} />
          ) : (
            <ArrowDownRight className="w-5 h-5" style={{ color: "#ef4444" }} />
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              Entree
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {trade.entry}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              Sortie
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {trade.exit ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              P&L
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: pnl >= 0 ? "#10b981" : "#ef4444" }}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              R:R
            </p>
            <p className="text-sm font-semibold" style={{ color: "#06b6d4" }}>
              {rr ? parseFloat(rr).toFixed(1) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
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

  // Generate pseudo-random base vote counts from messageId for display
  const baseCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 0; i < poll.options.length; i++) {
      const seed = messageId + "-opt-" + i;
      counts[i] = pseudoRandom(seed) % 80 + 5;
    }
    return counts;
  }, [messageId, poll.options.length]);

  const totalVotes = useMemo(() => {
    let total = 0;
    for (let i = 0; i < poll.options.length; i++) {
      total += baseCounts[i] + (voteData?.counts[i] || 0);
    }
    return total;
  }, [baseCounts, voteData, poll.options.length]);

  const getPercentage = (idx: number) => {
    const count = baseCounts[idx] + (voteData?.counts[idx] || 0);
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
                      : "rgba(255,255,255,0.05)",
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
                      : "rgba(255,255,255,0.05)",
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
              Termine
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
}) {
  const [showMore, setShowMore] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [copied, setCopied] = useState(false);
  const gradient = getAvatarGradient(msg.user.name);
  const handle = getHandle(msg.user.email);
  const viewCount = pseudoRandom(msg.id + "views") % 4500 + 120;

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
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
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
                  {msg.content}
                </p>
              </div>
            );
          })()}

          {/* Trade card if attached */}
          {msg.trade && <InlineTradeCard trade={msg.trade} />}

          {/* Image if attached */}
          {msg.imageUrl && (
            <div
              className="mt-3 rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src={msg.imageUrl}
                alt="Image partagee"
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
              title="Repondre"
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

            {/* Views */}
            <div
              className="flex items-center gap-1.5 p-2"
              style={{ color: "var(--text-muted)" }}
            >
              <BarChart2 className="w-[18px] h-[18px]" />
              <span className="text-[13px]">{viewCount.toLocaleString("fr-FR")}</span>
            </div>

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
                {copied && (
                  <span
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap"
                    style={{
                      background: "#06b6d4",
                      color: "#fff",
                    }}
                  >
                    Lien copie !
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

  const canPost = sending
    ? false
    : pollDraft
      ? pollDraft.question.trim().length > 0 && pollDraft.options.filter((o) => o.trim()).length >= 2
      : input.trim().length > 0 && !isOverLimit;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        <div className="flex-1 min-w-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_POST_LENGTH + 20))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canPost) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={pollDraft ? "Ajoutez un commentaire (optionnel)..." : "Quoi de neuf sur les marches ?"}
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
                background: "rgba(255,255,255,0.03)",
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
                  Duree :
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
                style={{ color: "#06b6d4", opacity: 0.5 }}
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
                style={{ color: "#06b6d4", opacity: 0.5 }}
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
                title="Creer un sondage"
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

function RightSidebar({
  myStats,
  trendingAssets,
  searchQuery,
  setSearchQuery,
}: {
  myStats: {
    winRate: number;
    totalPnl: number;
    streak: number;
    trades: number;
  } | null;
  trendingAssets: { asset: string; count: number; pnl: number }[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
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
          placeholder="Rechercher"
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

      {/* Tendances Trading */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-extrabold text-[17px]" style={{ color: "var(--text-primary)" }}>
            Tendances pour vous
          </h3>
        </div>
        <div>
          {trendingAssets.length > 0 ? (
            trendingAssets.map((item, i) => (
              <div
                key={item.asset}
                className="px-4 py-3 transition-colors cursor-default"
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {i + 1} · Trading
                </p>
                <p className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>
                  {item.asset}
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
                Ajoutez des trades pour voir les tendances
              </p>
            </div>
          )}
          {trendingAssets.length > 0 && (
            <div
              className="px-4 py-3 transition-colors cursor-pointer"
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="text-[15px]" style={{ color: "#06b6d4" }}>
                Voir plus
              </span>
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
        <div className="p-4 text-center">
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Disponible prochainement
          </p>
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
  const { likes, toggleLike } = useLikes();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { vote: pollVote, getVoteData: getPollVoteData } = usePollVotes();

  type TabId = "foryou" | "following" | "classement" | "defis" | "discussions" | "bestof" | "mentorat" | "comparer";
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

  /* ─── Room init & messaging ─── */
  const initRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (!res.ok) return;
      const rooms = await res.json();
      const community = rooms.find(
        (r: { name: string }) =>
          r.name === "Communaute" || r.name === "community" || r.name === "Communaute"
      );
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
    } catch (error) {
      console.error("Send message error:", error);
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
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.user.name?.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.trade?.asset.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  /* ─── Sort: newest first ─── */
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredMessages]);

  /* ─── Like counts (pseudo from reactions + localStorage) ─── */
  const getLikeCount = (msg: FeedMessage) => {
    const reactionCount = msg.reactions?.length || 0;
    return reactionCount + (likes.has(msg.id) ? 1 : 0);
  };

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
              background: "rgba(var(--bg-primary-rgb, 10,10,20), 0.85)",
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
                Communaute
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto scrollbar-thin" style={{ borderBottom: "1px solid var(--border)" }}>
              {([
                { id: "foryou" as TabId, label: "Pour toi" },
                { id: "following" as TabId, label: "Suivis" },
                { id: "classement" as TabId, label: "Classement" },
                { id: "defis" as TabId, label: "Défis" },
                { id: "discussions" as TabId, label: "Discussions" },
                { id: "bestof" as TabId, label: "Best Of" },
                { id: "mentorat" as TabId, label: "Mentorat" },
                { id: "comparer" as TabId, label: "Comparer" },
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
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
                    Communaute
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
                    Bienvenue dans la communaute !
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
                      isLiked={likes.has(msg.id)}
                      isBookmarked={bookmarks.has(msg.id)}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                      onReply={handleReply}
                      likeCount={getLikeCount(msg)}
                      replyCount={msg.reactions?.length || 0}
                      pollVoteData={getPollVoteData(msg.id)}
                      onPollVote={pollVote}
                    />
                  ))}
                  <div className="h-20" />
                </>
              )}
            </div>
          ) : (
            /* Other tabs — coming soon placeholders */
            <div className="py-20 text-center px-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: activeTab === "classement" ? "rgba(234,179,8,0.1)" : activeTab === "defis" ? "rgba(239,68,68,0.1)" : activeTab === "discussions" ? "rgba(59,130,246,0.1)" : activeTab === "bestof" ? "rgba(168,85,247,0.1)" : activeTab === "mentorat" ? "rgba(16,185,129,0.1)" : activeTab === "comparer" ? "rgba(236,72,153,0.1)" : "rgba(6,182,212,0.1)" }}
              >
                {activeTab === "classement" && <BarChart3 className="w-8 h-8" style={{ color: "#eab308" }} />}
                {activeTab === "defis" && <BarChart2 className="w-8 h-8" style={{ color: "#ef4444" }} />}
                {activeTab === "discussions" && <MessageCircle className="w-8 h-8" style={{ color: "#3b82f6" }} />}
                {activeTab === "bestof" && <Heart className="w-8 h-8" style={{ color: "#a855f7" }} />}
                {activeTab === "mentorat" && <Users className="w-8 h-8" style={{ color: "#10b981" }} />}
                {activeTab === "comparer" && <BarChart3 className="w-8 h-8" style={{ color: "#ec4899" }} />}
                {activeTab === "following" && <Users className="w-8 h-8" style={{ color: "#06b6d4" }} />}
              </div>
              <h2
                className="text-xl font-extrabold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {activeTab === "following" ? "Suivis" : activeTab === "classement" ? "Classement des Traders" : activeTab === "defis" ? "Défis Trading" : activeTab === "discussions" ? "Discussions" : activeTab === "bestof" ? "Best Of" : activeTab === "mentorat" ? "Mentorat" : "Comparer"}
              </h2>
              <p className="text-[15px] mb-1" style={{ color: "var(--text-secondary)" }}>
                {activeTab === "following" ? "Suivez d'autres traders pour voir leurs posts ici." : activeTab === "classement" ? "Classement communautaire des meilleurs traders par performance." : activeTab === "defis" ? "Participez à des défis hebdomadaires et mensuels entre traders." : activeTab === "discussions" ? "Espaces de discussion thématiques sur les marchés." : activeTab === "bestof" ? "Les meilleurs trades et analyses de la communauté." : activeTab === "mentorat" ? "Trouvez un mentor ou partagez votre expérience." : "Comparez vos performances avec d'autres traders."}
              </p>
              <p className="text-sm font-medium mt-4" style={{ color: "#06b6d4" }}>
                Disponible prochainement
              </p>
            </div>
          )}
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
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
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
