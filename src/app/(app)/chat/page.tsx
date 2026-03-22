"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import { useChatRooms, useChat, ChatMessage } from "@/hooks/useChat";
import { TradeCard } from "@/components/TradeCard";
import { TradeShareModal } from "@/components/TradeShareModal";
import {
  MessageCircle,
  Signal,
  BookOpen,
  GraduationCap,
  Trophy,
  Send,
  Share2,
  Pin,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  Ban,
  X,
  Hash,
  ImagePlus,
  Search,
  Users,
  ChevronDown,
  ChevronRight,
  Smile,
  Reply,
  MoreHorizontal,
  TrendingUp,
  Bell,
  Settings,
  Star,
  Eye,
  Clock,
  Zap,
  AtSign,
  PanelRightOpen,
  PanelRightClose,
  ArrowDown,
  BarChart3,
  Bold,
  Italic,
  Code,
  ChevronUp,
  Check,
  Image as ImageIcon,
  Paperclip,
  Vote,
  Target,
  Calendar,
  Award,
  ThumbsUp,
  Heart,
  Flame,
  AlertCircle,
  Lock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  MessageCircle, Signal, BookOpen, GraduationCap, Trophy, TrendingUp, Zap, Star,
};

const REACTION_EMOJIS = [
  "👍", "❤️", "🔥", "💰", "📈", "📉", "🎯", "💪", "😂", "🤔",
  "👀", "⚡", "💎", "🚀", "✅", "❌", "🏆", "😱", "🤝", "👏",
];

const ROOM_CATEGORIES: Record<string, string[]> = {
  "TRADING": ["Général", "Signaux", "Analyses"],
  "MARCHÉS": ["Forex", "Indices", "Crypto"],
  "COMMUNAUTÉ": ["Débutants", "VIP Lounge"],
};

// ─── Types ────────────────────────────────────────────────
interface Poll {
  question: string;
  options: { text: string; votes: number; voters: string[] }[];
  totalVotes: number;
  createdBy: string;
  closed: boolean;
}

interface ThreadInfo {
  parentId: string;
  replyCount: number;
  lastReplyAt: string;
  participants: string[];
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
  winRate: number | null;
  totalTrades: number | null;
  memberSince: string;
  isOnline: boolean;
}

// ─── Utilities ────────────────────────────────────────────
function RoomIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && ICON_MAP[icon]) || Hash;
  return <Icon className={className || "w-4 h-4"} />;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

function getReactionGroups(msg: ChatMessage, currentUserId?: string) {
  const map: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
  for (const r of msg.reactions || []) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, users: [], hasReacted: false };
    map[r.emoji].count++;
    map[r.emoji].users.push(r.user?.name || "Anonyme");
    if (r.userId === currentUserId) map[r.emoji].hasReacted = true;
  }
  return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }));
}

// ─── Markdown Formatter ──────────────────────────────────
function FormattedText({ text }: { text: string }) {
  // Parse markdown: **bold**, *italic*, `code`, ```code blocks```
  const parts: React.ReactNode[] = [];
  // Split by code blocks first
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  const fullParts: { type: "text" | "codeblock"; content: string }[] = [];

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fullParts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    fullParts.push({ type: "codeblock", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    fullParts.push({ type: "text", content: text.slice(lastIndex) });
  }

  fullParts.forEach((part, pi) => {
    if (part.type === "codeblock") {
      parts.push(
        <pre key={pi} className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto my-1 border border-gray-200 dark:border-gray-700">
          <code>{part.content.trim()}</code>
        </pre>
      );
    } else {
      // Process inline formatting
      const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(@\w+))/g;
      let inlineLastIndex = 0;
      let inlineMatch;
      const inlineParts: React.ReactNode[] = [];

      while ((inlineMatch = inlineRegex.exec(part.content)) !== null) {
        if (inlineMatch.index > inlineLastIndex) {
          inlineParts.push(
            <span key={`t-${pi}-${inlineLastIndex}`}>{part.content.slice(inlineLastIndex, inlineMatch.index)}</span>
          );
        }
        if (inlineMatch[2]) {
          // Bold
          inlineParts.push(<strong key={`b-${pi}-${inlineMatch.index}`} className="font-bold">{inlineMatch[2]}</strong>);
        } else if (inlineMatch[3]) {
          // Italic
          inlineParts.push(<em key={`i-${pi}-${inlineMatch.index}`} className="italic">{inlineMatch[3]}</em>);
        } else if (inlineMatch[4]) {
          // Inline code
          inlineParts.push(
            <code key={`c-${pi}-${inlineMatch.index}`} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[12px] font-mono text-rose-400 border border-gray-200 dark:border-gray-700">
              {inlineMatch[4]}
            </code>
          );
        } else if (inlineMatch[5]) {
          // @mention
          inlineParts.push(
            <span key={`m-${pi}-${inlineMatch.index}`} className="text-cyan-500 font-medium bg-cyan-500/10 px-0.5 rounded cursor-pointer hover:bg-cyan-500/20 transition">
              {inlineMatch[5]}
            </span>
          );
        }
        inlineLastIndex = inlineMatch.index + inlineMatch[0].length;
      }

      if (inlineLastIndex < part.content.length) {
        inlineParts.push(<span key={`t-${pi}-end`}>{part.content.slice(inlineLastIndex)}</span>);
      }

      parts.push(<span key={pi}>{inlineParts.length > 0 ? inlineParts : part.content}</span>);
    }
  });

  return <>{parts}</>;
}

// ─── Trade Share Card ────────────────────────────────────
function SharedTradeCard({ trade }: { trade: any }) {
  // Support both API field names (asset/entry/exit/result/lots) and legacy names (pair/entryPrice/exitPrice/pnl/size)
  const pair = trade.asset || trade.pair || trade.symbol || "N/A";
  const entryPrice = trade.entry ?? trade.entryPrice;
  const exitPrice = trade.exit ?? trade.exitPrice;
  const direction = trade.direction;
  const size = trade.lots ?? trade.size;
  const stopLoss = trade.sl ?? trade.stopLoss;
  const takeProfit = trade.tp ?? trade.takeProfit;

  const pnl = trade.result ?? trade.pnl ?? (exitPrice && entryPrice
    ? ((direction === "LONG" ? 1 : -1) * (exitPrice - entryPrice) * (size || 1))
    : null);
  const isProfit = pnl !== null && pnl > 0;
  const rr = trade.riskReward || (stopLoss && takeProfit && entryPrice
    ? Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)
    : null);

  return (
    <div className={`mt-2 rounded-xl border overflow-hidden ${
      isProfit
        ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10"
        : pnl !== null
          ? "border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-rose-500/10"
          : "border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50"
    }`}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-700/30">
        <TrendingUp className={`w-4 h-4 ${isProfit ? "text-emerald-400" : pnl !== null ? "text-rose-400" : "text-cyan-400"}`} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Trade partagé
        </span>
        {direction && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            direction === "LONG"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-rose-500/20 text-rose-400"
          }`}>
            {direction}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {pair}
          </span>
          {pnl !== null && (
            <span className={`text-sm font-bold mono ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfit ? "+" : ""}{typeof pnl === "number" ? pnl.toFixed(2) : pnl} €
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {entryPrice != null && (
            <div className="flex justify-between">
              <span className="text-[--text-muted]">Entrée</span>
              <span className="mono font-medium" style={{ color: "var(--text-primary)" }}>{entryPrice}</span>
            </div>
          )}
          {exitPrice != null && (
            <div className="flex justify-between">
              <span className="text-[--text-muted]">Sortie</span>
              <span className="mono font-medium" style={{ color: "var(--text-primary)" }}>{exitPrice}</span>
            </div>
          )}
          {stopLoss != null && (
            <div className="flex justify-between">
              <span className="text-[--text-muted]">SL</span>
              <span className="mono font-medium text-rose-400">{stopLoss}</span>
            </div>
          )}
          {takeProfit != null && (
            <div className="flex justify-between">
              <span className="text-[--text-muted]">TP</span>
              <span className="mono font-medium text-emerald-400">{takeProfit}</span>
            </div>
          )}
        </div>
        {rr !== null && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-200/50 dark:border-gray-700/30">
            <Target className="w-3 h-3 text-[--text-muted]" />
            <span className="text-[11px] text-[--text-muted]">R:R</span>
            <span className="text-[11px] font-bold mono" style={{ color: "var(--text-primary)" }}>
              1:{typeof rr === "number" ? rr.toFixed(1) : rr}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Poll Component ──────────────────────────────────────
function PollCard({
  poll,
  onVote,
  currentUserId,
}: {
  poll: Poll;
  onVote: (optionIndex: number) => void;
  currentUserId?: string;
}) {
  const hasVoted = poll.options.some((o) => currentUserId && o.voters.includes(currentUserId));
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);

  return (
    <div className="mt-2 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-purple-500/20">
        <BarChart3 className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Sondage</span>
        {poll.closed && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-[--text-muted]">Terminé</span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{poll.question}</p>
        <div className="space-y-2">
          {poll.options.map((option, i) => {
            const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
            const isWinning = option.votes === maxVotes && option.votes > 0;
            const userVoted = currentUserId ? option.voters.includes(currentUserId) : false;

            return (
              <button
                key={i}
                onClick={() => !hasVoted && !poll.closed && onVote(i)}
                disabled={hasVoted || poll.closed}
                className={`w-full text-left relative rounded-lg overflow-hidden border transition-all ${
                  userVoted
                    ? "border-purple-500/50 bg-purple-500/10"
                    : hasVoted || poll.closed
                      ? "border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30"
                      : "border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900 hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer"
                }`}
              >
                {(hasVoted || poll.closed) && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                      isWinning ? "bg-purple-500/15" : "bg-gray-200/50 dark:bg-gray-700/30"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {userVoted && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    <span className={`text-xs font-medium ${userVoted ? "text-purple-400" : ""}`} style={!userVoted ? { color: "var(--text-primary)" } : {}}>
                      {option.text}
                    </span>
                  </div>
                  {(hasVoted || poll.closed) && (
                    <span className={`text-[11px] mono font-bold ${isWinning ? "text-purple-400" : "text-[--text-muted]"}`}>
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[--text-muted] mt-2">
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ─── User Profile Hover Card ─────────────────────────────
function UserProfileCard({ profile, position }: { profile: UserProfile; position: { x: number; y: number } }) {
  const initial = (profile.name || profile.email || "?")[0].toUpperCase();

  return (
    <div
      className="fixed z-50 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: Math.min(position.y + 10, window.innerHeight - 280),
      }}
    >
      {/* Banner */}
      <div className="h-16 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 relative">
        <div className="absolute -bottom-5 left-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white dark:border-gray-900">
            {initial}
          </div>
        </div>
      </div>

      <div className="px-4 pt-7 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{profile.name}</span>
          {profile.role === "ADMIN" && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
              <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
            </span>
          )}
          {profile.role === "VIP" && (
            <span className="flex items-center gap-0.5 text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full font-bold">
              <Crown className="w-2.5 h-2.5" /> VIP
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-2 h-2 rounded-full ${profile.isOnline ? "bg-emerald-400" : "bg-gray-400"}`} />
          <span className="text-[11px] text-[--text-muted]">
            {profile.isOnline ? "En ligne" : "Hors ligne"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <p className="text-xs font-bold mono" style={{ color: "var(--text-primary)" }}>
              {profile.winRate !== null ? `${profile.winRate}%` : "-"}
            </p>
            <p className="text-[10px] text-[--text-muted]">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold mono" style={{ color: "var(--text-primary)" }}>
              {profile.totalTrades !== null ? profile.totalTrades : "-"}
            </p>
            <p className="text-[10px] text-[--text-muted]">Trades</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold mono" style={{ color: "var(--text-primary)" }}>
              {profile.memberSince}
            </p>
            <p className="text-[10px] text-[--text-muted]">Membre</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// (Typing indicator is now rendered inline in the main component)

// ─── Poll Creation Modal ─────────────────────────────────
function PollCreationModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (question: string, options: string[]) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (question.trim() && validOptions.length >= 2) {
      onSubmit(question.trim(), validOptions);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Créer un sondage</span>
          <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-muted]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-[--text-muted] mb-1 block">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Bullish ou bearish sur EUR/USD ?"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
              style={{ color: "var(--text-primary)" }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-[--text-muted] mb-1 block">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition"
                  style={{ color: "var(--text-primary)" }}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="p-2 rounded-lg text-[--text-muted] hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
              >
                + Ajouter une option
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-[--text-secondary] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium disabled:opacity-30 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
              Publier le sondage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Thread Panel ────────────────────────────────────────
function ThreadPanel({
  parentMessage,
  replies,
  onClose,
  onSendReply,
  onReaction,
  onImageClick,
  isAdmin,
  currentUserId,
  onDelete,
  onPin,
  onBan,
}: {
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  onClose: () => void;
  onSendReply: (content: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onImageClick: (url: string) => void;
  isAdmin: boolean;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onBan: (userId: string) => void;
}) {
  const [threadInput, setThreadInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadInput.trim()) return;
    onSendReply(threadInput.trim());
    setThreadInput("");
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Reply className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Fil de discussion</span>
        <span className="text-[10px] text-[--text-muted] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded-full mono">
          {replies.length} réponse{replies.length !== 1 ? "s" : ""}
        </span>
        <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-muted]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800 bg-cyan-500/5">
        <MessageBubble
          msg={parentMessage}
          isOwn={parentMessage.userId === currentUserId}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onPin={onPin}
          onBan={onBan}
          onImageClick={onImageClick}
          onReaction={onReaction}
          onReply={() => {}}
          onOpenThread={() => {}}
          currentUserId={currentUserId}
          isConsecutive={false}
          threadInfo={undefined}
          showThreadButton={false}
          onShowProfile={() => {}}
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto py-2">
        {replies.map((msg, i) => {
          const isConsecutive = i > 0 && replies[i - 1].userId === msg.userId &&
            new Date(msg.createdAt).getTime() - new Date(replies[i - 1].createdAt).getTime() < 300000;
          return (
            <div key={msg.id} className="pl-2">
              <MessageBubble
                msg={msg}
                isOwn={msg.userId === currentUserId}
                isAdmin={isAdmin}
                onDelete={onDelete}
                onPin={onPin}
                onBan={onBan}
                onImageClick={onImageClick}
                onReaction={onReaction}
                onReply={() => {}}
                onOpenThread={() => {}}
                currentUserId={currentUserId}
                isConsecutive={isConsecutive}
                threadInfo={undefined}
                showThreadButton={false}
                onShowProfile={() => {}}
              />
            </div>
          );
        })}
      </div>

      {/* Reply input */}
      <form onSubmit={handleSubmit} className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={threadInput}
            onChange={(e) => setThreadInput(e.target.value)}
            placeholder="Répondre dans le fil..."
            className="flex-1 bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 transition"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            type="submit"
            disabled={!threadInput.trim()}
            className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-30 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Formatting Toolbar ──────────────────────────────────
function FormattingToolbar({ onInsert }: { onInsert: (before: string, after: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 px-1">
      <button
        type="button"
        onClick={() => onInsert("**", "**")}
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-[--text-primary] transition"
        title="Gras (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert("*", "*")}
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-[--text-primary] transition"
        title="Italique (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert("`", "`")}
        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-[--text-primary] transition"
        title="Code"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────
function MessageBubble({
  msg,
  isOwn,
  isAdmin,
  onDelete,
  onPin,
  onBan,
  onImageClick,
  onReaction,
  onReply,
  onOpenThread,
  currentUserId,
  isConsecutive,
  threadInfo,
  showThreadButton = true,
  onShowProfile,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onBan: (userId: string) => void;
  onImageClick: (url: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  onOpenThread: (msg: ChatMessage) => void;
  currentUserId?: string;
  isConsecutive: boolean;
  threadInfo?: ThreadInfo;
  showThreadButton?: boolean;
  onShowProfile: (userId: string, event: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const initial = (msg.user.name || msg.user.email || "?")[0].toUpperCase();
  const reactions = getReactionGroups(msg, currentUserId);

  // Detect embedded poll in message content
  const pollData = useMemo(() => {
    if (!msg.content?.startsWith("[POLL]")) return null;
    try {
      const jsonStr = msg.content.slice(6);
      return JSON.parse(jsonStr) as Poll;
    } catch {
      return null;
    }
  }, [msg.content]);

  return (
    <div
      className={`group relative flex gap-3 px-4 ${isConsecutive ? "py-0.5" : "py-2"} hover:bg-black/5 dark:hover:bg-[var(--bg-hover)] transition-colors ${
        msg.isPinned ? "bg-amber-500/5 border-l-2 border-amber-500/50" : ""
      }`}
    >
      {/* Avatar or spacer */}
      {isConsecutive ? (
        <div className="w-9 flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-transparent group-hover:text-[--text-muted] transition-colors mono">
            {formatTime(msg.createdAt)}
          </span>
        </div>
      ) : (
        <div
          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5 cursor-pointer relative ${
            isOwn
              ? "bg-gradient-to-br from-cyan-500 to-blue-600"
              : "bg-gradient-to-br from-purple-500 to-pink-600"
          }`}
          onClick={(e) => onShowProfile(msg.userId, e)}
        >
          {initial}
          {/* Online indicator dot on avatar */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-950" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Header - only for first message in group */}
        {!isConsecutive && (
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="font-semibold text-[13px] cursor-pointer hover:underline"
              style={{ color: isOwn ? "var(--accent, #06b6d4)" : "var(--text-primary)" }}
              onClick={(e) => onShowProfile(msg.userId, e)}
            >
              {msg.user.name || msg.user.email.split("@")[0]}
            </span>
            {msg.user.role === "ADMIN" && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
                <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
              </span>
            )}
            {msg.user.role === "VIP" && (
              <span className="flex items-center gap-0.5 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full font-bold">
                <Crown className="w-2.5 h-2.5" /> VIP
              </span>
            )}
            {msg.isPinned && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <Pin className="w-2.5 h-2.5" /> {t("pinned")}
              </span>
            )}
            <span className="text-[11px] text-[--text-muted]">{formatTime(msg.createdAt)}</span>
          </div>
        )}

        {/* Content - with markdown formatting */}
        {msg.content && !pollData && (
          <div className="text-[13px] leading-relaxed break-words" style={{ color: "var(--text-primary)" }}>
            <FormattedText text={msg.content} />
          </div>
        )}

        {/* Embedded poll */}
        {pollData && (
          <PollCard
            poll={pollData}
            onVote={(idx) => {
              // Vote via reaction mechanism as a workaround
              onReaction(msg.id, `vote_${idx}`);
            }}
            currentUserId={currentUserId}
          />
        )}

        {/* Image */}
        {msg.imageUrl && /^(https?:\/\/|data:image\/)/.test(msg.imageUrl) && (
          <div className="mt-1.5">
            <img
              src={msg.imageUrl}
              alt="Capture"
              className="max-w-sm max-h-64 rounded-xl border border-gray-200 dark:border-gray-700/50 cursor-pointer hover:opacity-90 transition object-cover shadow-sm hover:shadow-md"
              onClick={() => onImageClick(msg.imageUrl!)}
            />
          </div>
        )}

        {/* Shared Trade - enhanced card */}
        {msg.trade && <SharedTradeCard trade={msg.trade} />}

        {/* Thread indicator */}
        {threadInfo && threadInfo.replyCount > 0 && showThreadButton && (
          <button
            onClick={() => onOpenThread(msg)}
            className="flex items-center gap-2 mt-1.5 px-2 py-1 rounded-lg text-cyan-500 hover:bg-cyan-500/10 transition group/thread"
          >
            <Reply className="w-3 h-3" />
            <span className="text-[11px] font-medium">
              {threadInfo.replyCount} réponse{threadInfo.replyCount !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-[--text-muted] group-hover/thread:text-cyan-400 transition">
              — Dernière {formatTime(threadInfo.lastReplyAt)}
            </span>
            {threadInfo.participants.length > 0 && (
              <div className="flex -space-x-1 ml-1">
                {threadInfo.participants.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[8px] font-bold border border-white dark:border-gray-950"
                  >
                    {p[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </button>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReaction(msg.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all hover:scale-105 active:scale-95 ${
                  r.hasReacted
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-500"
                    : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-gray-700/50 text-[--text-secondary] hover:border-cyan-500/40"
                }`}
                title={r.users.join(", ")}
              >
                <span>{r.emoji}</span>
                <span className="mono font-medium">{r.count}</span>
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs border border-dashed border-gray-300 dark:border-gray-700 text-[--text-muted] hover:border-cyan-500/50 hover:text-cyan-400 transition hover:scale-105"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Hover actions toolbar */}
      <div className="absolute right-3 -top-3 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-1 py-0.5 z-10 animate-in fade-in duration-150">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-amber-400 transition hover:scale-110"
          title={t("react")}
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onReply(msg)}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-cyan-400 transition hover:scale-110"
          title={t("reply")}
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
        {showThreadButton && (
          <button
            onClick={() => onOpenThread(msg)}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-purple-400 transition hover:scale-110"
            title="Ouvrir le fil"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        )}
        {isAdmin && (
          <>
            <button
              onClick={() => onPin(msg.id)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-amber-400 transition hover:scale-110"
              title={msg.isPinned ? t("unpin") : t("pin")}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-rose-400 transition hover:scale-110"
              title={t("delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {!isOwn && msg.user.role !== "ADMIN" && (
              <button
                onClick={() => onBan(msg.userId)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-rose-400 transition hover:scale-110"
                title="Bannir l'utilisateur"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Compact emoji picker — 20 emojis in a 5x4 grid */}
      {showEmojiPicker && (
        <div className="absolute right-3 top-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-20 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-5 gap-0.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReaction(msg.id, emoji); setShowEmojiPicker(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-base transition hover:scale-125 active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      <span className="text-[11px] font-medium text-[--text-muted] uppercase tracking-wider">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

// ─── Inline Search Bar ───────────────────────────────────
function InlineSearchBar({
  messages,
  onClose,
  onJump,
  highlightedIds,
  setHighlightedIds,
}: {
  messages: ChatMessage[];
  onClose: () => void;
  onJump: (id: string) => void;
  highlightedIds: Set<string>;
  setHighlightedIds: (ids: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.user.name?.toLowerCase().includes(q)
    );
  }, [query, messages]);

  // Sync highlighted IDs with parent
  useEffect(() => {
    setHighlightedIds(new Set(results.map((r) => r.id)));
  }, [results, setHighlightedIds]);

  // Jump to current result
  useEffect(() => {
    if (results.length > 0 && results[currentIdx]) {
      onJump(results[currentIdx].id);
    }
  }, [currentIdx, results, onJump]);

  const goNext = () => {
    if (results.length > 0) setCurrentIdx((i) => (i + 1) % results.length);
  };
  const goPrev = () => {
    if (results.length > 0) setCurrentIdx((i) => (i - 1 + results.length) % results.length);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); goNext(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm">
      <Search className="w-4 h-4 text-[--text-muted] flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCurrentIdx(0); }}
        onKeyDown={handleKey}
        placeholder="Rechercher dans les messages..."
        className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
        style={{ color: "var(--text-primary)" }}
        autoFocus
      />
      {query.trim() && (
        <span className="text-[11px] text-[--text-muted] mono whitespace-nowrap">
          {results.length > 0
            ? `${currentIdx + 1}/${results.length} résultat${results.length !== 1 ? "s" : ""}`
            : "0 résultat"}
        </span>
      )}
      {results.length > 1 && (
        <div className="flex items-center gap-0.5">
          <button onClick={goPrev} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[--text-muted]">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={goNext} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[--text-muted]">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-muted]">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Search Modal (kept for Ctrl+K overlay) ──────────────
function SearchOverlay({ messages, onClose, onJump }: { messages: ChatMessage[]; onClose: () => void; onJump: (id: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "messages" | "users" | "trades">("all");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .filter((m) => {
        const matchesContent = m.content?.toLowerCase().includes(q);
        const matchesUser = m.user.name?.toLowerCase().includes(q);
        if (filter === "messages") return matchesContent;
        if (filter === "users") return matchesUser;
        if (filter === "trades") return m.trade && (matchesContent || matchesUser);
        return matchesContent || matchesUser;
      })
      .slice(0, 30);
  }, [query, messages, filter]);

  return (
    <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-[--text-muted]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchInMessages")}
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-muted]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search filters */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          {([
            { id: "all" as const, label: "Tout" },
            { id: "messages" as const, label: "Messages" },
            { id: "users" as const, label: "Utilisateurs" },
            { id: "trades" as const, label: "Trades" },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                filter === f.id
                  ? "bg-cyan-500/10 text-cyan-500"
                  : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <p className="text-center text-sm text-[--text-muted] py-8">{t("noResults")}</p>
          )}
          {!query.trim() && (
            <div className="text-center py-8">
              <Search className="w-8 h-8 mx-auto text-[--text-muted] opacity-30 mb-2" />
              <p className="text-xs text-[--text-muted]">Tapez pour rechercher dans l&apos;historique</p>
              <p className="text-[10px] text-[--text-muted] mt-1">Astuce : utilisez Ctrl+K pour ouvrir la recherche</p>
            </div>
          )}
          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => { onJump(m.id); onClose(); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] border-b border-gray-100 dark:border-gray-800/50 transition"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {m.user.name || m.user.email.split("@")[0]}
                </span>
                {m.trade && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">TRADE</span>
                )}
                <span className="text-[10px] text-[--text-muted]">{formatDate(m.createdAt)} {formatTime(m.createdAt)}</span>
              </div>
              <p className="text-xs text-[--text-secondary] truncate">{m.content}</p>
            </button>
          ))}
          {results.length > 0 && (
            <p className="text-center text-[10px] text-[--text-muted] py-2">
              {results.length} résultat{results.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────
function RightPanel({
  messages,
  activeRoom,
  onClose,
}: {
  messages: ChatMessage[];
  activeRoom: { name: string; description: string | null; icon: string | null } | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"pinned" | "trades" | "info">("pinned");
  const pinned = messages.filter((m) => m.isPinned);
  const trades = messages.filter((m) => m.trade);
  const uniqueUsers = new Map<string, { name: string; initial: string; role?: string }>();
  messages.forEach((m) => {
    if (!uniqueUsers.has(m.userId)) {
      uniqueUsers.set(m.userId, {
        name: m.user.name || m.user.email.split("@")[0],
        initial: (m.user.name || m.user.email)[0].toUpperCase(),
        role: m.user.role,
      });
    }
  });

  // Simulated online status (random for demo, in production would come from presence system)
  const onlineUsers = useMemo(() => {
    const set = new Set<string>();
    Array.from(uniqueUsers.keys()).forEach((id, i) => {
      if (i % 3 !== 2) set.add(id); // ~66% online
    });
    return set;
  }, [uniqueUsers.size]);

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("details")}</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[--text-muted]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[
          { id: "pinned" as const, label: t("pinnedMessages"), icon: Pin, count: pinned.length },
          { id: "trades" as const, label: t("trades"), icon: TrendingUp, count: trades.length },
          { id: "info" as const, label: t("info"), icon: Users, count: uniqueUsers.size },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition border-b-2 ${
              tab === t.id
                ? "border-cyan-500 text-cyan-500"
                : "border-transparent text-[--text-muted] hover:text-[--text-secondary]"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] mono bg-gray-100 dark:bg-white/10">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "pinned" && (
          <div className="space-y-2">
            {pinned.length === 0 ? (
              <div className="text-center py-8">
                <Pin className="w-8 h-8 mx-auto text-[--text-muted] opacity-30 mb-2" />
                <p className="text-xs text-[--text-muted]">{t("noPinnedMessages")}</p>
              </div>
            ) : (
              pinned.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[var(--bg-hover)] border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {m.user.name || m.user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-[--text-muted]">{formatTime(m.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[--text-secondary] line-clamp-3">{m.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "trades" && (
          <div className="space-y-2">
            {trades.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 mx-auto text-[--text-muted] opacity-30 mb-2" />
                <p className="text-xs text-[--text-muted]">{t("noSharedTrades")}</p>
              </div>
            ) : (
              trades.map((m) => m.trade && (
                <div key={m.id} className="rounded-xl overflow-hidden">
                  <TradeCard trade={m.trade} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "info" && (
          <div>
            {/* Room info */}
            {activeRoom && (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-[var(--bg-hover)] border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <RoomIcon icon={activeRoom.icon} className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{activeRoom.name}</span>
                </div>
                {activeRoom.description && (
                  <p className="text-xs text-[--text-secondary]">{activeRoom.description}</p>
                )}
              </div>
            )}

            {/* Members - with online/offline grouping */}
            <div>
              <h4 className="text-[11px] font-bold text-[--text-muted] uppercase tracking-wider mb-2 px-1">
                En ligne — {onlineUsers.size}
              </h4>
              <div className="space-y-1 mb-4">
                {Array.from(uniqueUsers.entries())
                  .filter(([id]) => onlineUsers.has(id))
                  .map(([id, u]) => (
                  <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {u.initial}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-950" />
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</span>
                    {u.role === "ADMIN" && <ShieldCheck className="w-3 h-3 text-amber-500 ml-auto flex-shrink-0" />}
                    {u.role === "VIP" && <Crown className="w-3 h-3 text-purple-400 ml-auto flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <h4 className="text-[11px] font-bold text-[--text-muted] uppercase tracking-wider mb-2 px-1">
                Hors ligne — {uniqueUsers.size - onlineUsers.size}
              </h4>
              <div className="space-y-1">
                {Array.from(uniqueUsers.entries())
                  .filter(([id]) => !onlineUsers.has(id))
                  .map(([id, u]) => (
                  <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] opacity-60">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {u.initial}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white dark:border-gray-950" />
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-[11px] font-bold text-[--text-muted] uppercase tracking-wider mb-2 px-1">{t("statistics")}</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t("messages"), value: messages.length, icon: MessageCircle },
                  { label: t("trades"), value: trades.length, icon: TrendingUp },
                  { label: t("pinnedMessages"), value: pinned.length, icon: Pin },
                  { label: t("members"), value: uniqueUsers.size, icon: Users },
                ].map((s) => (
                  <div key={s.label} className="p-2 rounded-lg bg-gray-50 dark:bg-[var(--bg-hover)] border border-gray-200 dark:border-gray-800 text-center">
                    <s.icon className="w-3.5 h-3.5 mx-auto text-[--text-muted] mb-1" />
                    <p className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                    <p className="text-[10px] text-[--text-muted]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────
export default function ChatPage() {
  const { t } = useTranslation();
  const { rooms, loading: roomsLoading } = useChatRooms();
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [input, setInput] = useState("");
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [searchHighlightIds, setSearchHighlightIds] = useState<Set<string>>(new Set());
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  // New state for enhanced features
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ profile: UserProfile; position: { x: number; y: number } } | null>(null);
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [roomUnreads, setRoomUnreads] = useState<Record<string, number>>({});
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScroll = useRef(true);
  const prevMessageCount = useRef(0);


  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) setActiveRoomId(rooms[0].id);
  }, [rooms, activeRoomId]);

  // Fetch current user role and banned status
  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role === "ADMIN") setIsAdmin(true);
        setIsVip(data?.role === "VIP" || data?.role === "ADMIN");
        if (data?.banned) setIsBanned(true);
      })
      .catch(() => setIsVip(false));
  }, []);

  const { messages, loading: msgsLoading, sending, sendMessage, deleteMessage, pinMessage, toggleReaction, banUser } = useChat(activeRoomId);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Track new messages for indicator + unread count
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newMsgCount = messages.length - prevMessageCount.current;
      if (!shouldAutoScroll.current) {
        setShowNewMsgIndicator(true);
        setUnreadCount((prev) => prev + newMsgCount);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Real typing indicator: client-side only, shows when user is actively typing
  useEffect(() => {
    if (!isTyping) return;
    const timer = setTimeout(() => setIsTyping(false), 2000);
    return () => clearTimeout(timer);
  }, [isTyping, input]);

  // Room unread badges - based on real new messages only
  // (no simulated unread counts)

  // Clear unread and close inline search when switching rooms
  useEffect(() => {
    if (activeRoomId) {
      setRoomUnreads((prev) => ({ ...prev, [activeRoomId]: 0 }));
      setShowInlineSearch(false);
      setSearchHighlightIds(new Set());
      setExpandedThreads(new Set());
    }
  }, [activeRoomId]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    if (shouldAutoScroll.current) {
      setShowNewMsgIndicator(false);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const scrollToBottom = () => {
    shouldAutoScroll.current = true;
    setShowNewMsgIndicator(false);
    setUnreadCount(0);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(t("imageTooLarge")); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Drag & drop image support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 2 * 1024 * 1024) { alert(t("imageTooLarge")); return; }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Paste image support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            if (file.size > 2 * 1024 * 1024) { alert(t("imageTooLarge")); return; }
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [t]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || sending || uploading) return;

    let imageUrl: string | undefined;
    if (imageFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.imageUrl;
        }
      } catch { /* ignore */ } finally {
        setUploading(false);
      }
    }

    let content = input.trim() || (imageUrl ? t("sharedImage") : "");
    if (replyTo) {
      const replyName = replyTo.user.name || replyTo.user.email.split("@")[0];
      const replyPreview = replyTo.content?.slice(0, 50) || "image";
      content = `> ${replyName}: ${replyPreview}${replyTo.content && replyTo.content.length > 50 ? "..." : ""}\n${content}`;
    }

    if (!content && !imageUrl) return;

    setSendError(null);
    const result = await sendMessage(content, undefined, imageUrl);
    if (result.success) {
      setInput("");
      setIsTyping(false);
      setImageFile(null);
      setImagePreview(null);
      setReplyTo(null);
      shouldAutoScroll.current = true;
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (result.error) {
      setSendError(result.error);
      setTimeout(() => setSendError(null), 4000);
    }
  };

  const handleTradeShare = async (tradeId: string, content: string) => {
    setShowTradeModal(false);
    shouldAutoScroll.current = true;
    await sendMessage(content, tradeId);
  };

  const handlePollSubmit = async (question: string, options: string[]) => {
    setShowPollModal(false);
    const pollData: Poll = {
      question,
      options: options.map((text) => ({ text, votes: 0, voters: [] })),
      totalVotes: 0,
      createdBy: "current_user",
      closed: false,
    };
    shouldAutoScroll.current = true;
    await sendMessage(`[POLL]${JSON.stringify(pollData)}`);
  };

  const handleDelete = async (messageId: string) => {
    if (!isAdmin) return;
    if (confirm(t("confirmDeleteMessage"))) await deleteMessage(messageId);
  };

  const handlePin = async (messageId: string) => {
    if (!isAdmin) return;
    await pinMessage(messageId);
  };

  const handleBan = async (userId: string) => {
    if (!isAdmin) return;
    if (confirm("Bannir cet utilisateur du chat ?")) {
      await banUser(userId);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleOpenThread = (msg: ChatMessage) => {
    setActiveThread(msg);
  };

  const handleThreadReply = async (content: string) => {
    if (!activeThread) return;
    const replyName = activeThread.user.name || activeThread.user.email.split("@")[0];
    const replyPreview = activeThread.content?.slice(0, 50) || "image";
    const threadContent = `[THREAD:${activeThread.id}] > ${replyName}: ${replyPreview}\n${content}`;
    shouldAutoScroll.current = true;
    await sendMessage(threadContent);
  };

  const handleShowProfile = (userId: string, event: React.MouseEvent) => {
    const msg = messages.find((m) => m.userId === userId);
    if (!msg) return;

    const profile: UserProfile = {
      name: msg.user.name || msg.user.email.split("@")[0],
      email: msg.user.email,
      role: msg.user.role || "USER",
      winRate: null,
      totalTrades: null,
      memberSince: "2024",
      isOnline: true,
    };

    setUserProfile({
      profile,
      position: { x: event.clientX, y: event.clientY },
    });

    // Auto-hide after 3 seconds
    setTimeout(() => setUserProfile(null), 4000);
  };

  const handleJumpToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-cyan-500/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-cyan-500/50"), 2000);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Insert formatting wrapper around selected text or at cursor
  const insertFormatting = (before: string, after: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = input.slice(start, end);
    const newVal = input.slice(0, start) + before + (selected || "texte") + after + input.slice(end);
    setInput(newVal);
    setTimeout(() => {
      el.focus();
      const newPos = start + before.length + (selected ? selected.length : 5) + after.length;
      el.setSelectionRange(start + before.length, start + before.length + (selected ? selected.length : 5));
    }, 0);
  };

  // Organize rooms into categories
  const categorizedRooms = useMemo(() => {
    const result: { category: string; rooms: typeof rooms }[] = [];
    const assigned = new Set<string>();

    for (const [cat, roomNames] of Object.entries(ROOM_CATEGORIES)) {
      const matching = rooms.filter((r) => roomNames.some((n) => r.name.includes(n)));
      if (matching.length > 0) {
        result.push({ category: cat, rooms: matching });
        matching.forEach((r) => assigned.add(r.id));
      }
    }

    const unassigned = rooms.filter((r) => !assigned.has(r.id));
    if (unassigned.length > 0) {
      result.unshift({ category: "SALONS", rooms: unassigned });
    }

    return result;
  }, [rooms]);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);
  const pinnedCount = messages.filter((m) => m.isPinned).length;

  // Thread info map: for each message, compute reply count etc.
  const threadInfoMap = useMemo(() => {
    const map = new Map<string, ThreadInfo>();
    const threadReplies = new Map<string, ChatMessage[]>();

    messages.forEach((m) => {
      const threadMatch = m.content?.match(/^\[THREAD:(.+?)\]/);
      if (threadMatch) {
        const parentId = threadMatch[1];
        if (!threadReplies.has(parentId)) threadReplies.set(parentId, []);
        threadReplies.get(parentId)!.push(m);
      }
    });

    threadReplies.forEach((replies, parentId) => {
      const participants = [...new Set(replies.map((r) => (r.user.name || r.user.email.split("@")[0])))];
      map.set(parentId, {
        parentId,
        replyCount: replies.length,
        lastReplyAt: replies[replies.length - 1].createdAt,
        participants,
      });
    });

    return map;
  }, [messages]);

  // Map of parentId -> reply messages for inline thread display
  const threadRepliesMap = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    messages.forEach((m) => {
      const threadMatch = m.content?.match(/^\[THREAD:(.+?)\]/);
      if (threadMatch) {
        const parentId = threadMatch[1];
        if (!map.has(parentId)) map.set(parentId, []);
        map.get(parentId)!.push(m);
      }
    });
    return map;
  }, [messages]);

  const toggleThreadExpand = useCallback((parentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  // Get thread replies for active thread
  const threadReplies = useMemo(() => {
    if (!activeThread) return [];
    return messages.filter((m) => m.content?.startsWith(`[THREAD:${activeThread.id}]`));
  }, [activeThread, messages]);

  // @mention users list
  const chatUsers = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((m) => {
      if (!map.has(m.userId)) {
        map.set(m.userId, m.user.name || m.user.email.split("@")[0]);
      }
    });
    return Array.from(map.values());
  }, [messages]);

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return chatUsers.filter((u) => u.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, chatUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    // Trigger typing indicator
    if (val.trim()) setIsTyping(true);
    else setIsTyping(false);
    // Detect @mention
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (username: string) => {
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const newBefore = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    setInput(newBefore + textAfterCursor);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionResults[mentionIndex]); }
      else if (e.key === "Escape") { setMentionQuery(null); }
    }
    // Formatting shortcuts
    if (e.ctrlKey && e.key === "b") { e.preventDefault(); insertFormatting("**", "**"); }
    if (e.ctrlKey && e.key === "i") { e.preventDefault(); insertFormatting("*", "*"); }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowInlineSearch(false);
        setSearchHighlightIds(new Set());
        setLightboxUrl(null);
        setUserProfile(null);
        if (activeThread) setActiveThread(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeThread]);

  // Close profile card on click outside
  useEffect(() => {
    if (!userProfile) return;
    const handler = () => setUserProfile(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [userProfile]);

  // Total unread across all rooms
  const totalRoomUnreads = useMemo(() => {
    return Object.values(roomUnreads).reduce((sum, n) => sum + n, 0);
  }, [roomUnreads]);

  // VIP loading state
  if (isVip === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // VIP gate
  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        {/* Blurred background preview */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>Chat Communautaire</span>
              <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-emerald-500">Live</span></div>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-3"><div className="w-8 h-8 rounded-full" style={{ background: "var(--border)" }} /><div className="space-y-1 flex-1"><div className="h-3 rounded" style={{ background: "var(--border)", width: `${40 + i * 10}%` }} /><div className="h-3 rounded" style={{ background: "var(--border)", width: `${20 + i * 8}%` }} /></div></div>
              ))}
            </div>
          </div>
        </div>
        {/* VIP overlay */}
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Échangez en temps réel avec la communauté de traders MarketPhase
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Accès au chat communautaire en temps réel",
              "Partagez vos analyses et trades",
              "Échangez avec des traders expérimentés",
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
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[--text-secondary] text-sm">{t("loadingChat")}</span>
        </div>
      </div>
    );
  }

  // Banned user view
  if (isBanned) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Vous êtes banni du chat
          </h2>
          <p className="text-sm text-[--text-muted] max-w-sm">
            Votre accès au chat a été restreint par un administrateur. Contactez le support si vous pensez que c&apos;est une erreur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 rounded-t-2xl">
        <MessageCircle className="w-5 h-5 text-cyan-400" />
        <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{t("chatTitle")}</h1>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-500 font-medium">Live</span>
        </div>

        {/* Unread badge in top bar */}
        {totalRoomUnreads > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
            <Bell className="w-3 h-3" />
            {totalRoomUnreads}
          </span>
        )}

        <div className="flex-1" />
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700/50 text-[--text-muted] hover:text-[--text-secondary] text-xs transition"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("search")}</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-[--text-muted]">Ctrl+K</kbd>
        </button>
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className={`p-1.5 rounded-lg transition ${showRightPanel ? "bg-cyan-500/10 text-cyan-400" : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"}`}
          title={t("sidePanel")}
        >
          {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content - 3+ panels */}
      <div className="flex flex-1 min-h-0 bg-white/50 dark:bg-gray-950/50 rounded-b-2xl overflow-hidden border border-t-0 border-gray-200 dark:border-gray-800">
        {/* LEFT PANEL - Room sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/80">
          {/* Admin badge */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest">{t("channels")}</span>
              {isAdmin && (
                <span className="flex items-center gap-1 text-[10px] text-amber-500" title="Mode admin actif">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            {isAdmin && (
              <p className="mt-1 text-[10px] text-amber-500 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Admin actif
              </p>
            )}
          </div>

          {/* Room list by category */}
          <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
            {categorizedRooms.map(({ category, rooms: catRooms }) => (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1 px-2 py-1.5 w-full text-[10px] font-bold text-[--text-muted] uppercase tracking-widest hover:text-[--text-secondary] transition"
                >
                  {collapsedCategories[category] ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {category}
                </button>

                {!collapsedCategories[category] && (
                  <div className="space-y-0.5">
                    {catRooms.map((room) => {
                      const isActive = room.id === activeRoomId;
                      const unread = roomUnreads[room.id] || 0;
                      return (
                        <button
                          key={room.id}
                          onClick={() => setActiveRoomId(room.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-all ${
                            isActive
                              ? "bg-cyan-500/10 text-cyan-500 font-semibold"
                              : unread > 0
                                ? "text-[--text-primary] font-semibold hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
                                : "text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] hover:text-[--text-primary]"
                          }`}
                        >
                          <RoomIcon icon={room.icon} className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-cyan-400" : unread > 0 ? "text-[--text-primary]" : "text-[--text-muted]"}`} />
                          <span className="truncate">{room.name}</span>
                          {unread > 0 && !isActive ? (
                            <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                              {unread}
                            </span>
                          ) : room.messageCount > 0 ? (
                            <span className={`ml-auto text-[10px] mono ${isActive ? "text-cyan-400" : "text-[--text-muted]"}`}>
                              {room.messageCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom user area */}
          <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                  T
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>Trader</p>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> En ligne
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Messages */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${dragOver ? "ring-2 ring-cyan-500 ring-inset bg-cyan-500/5" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Room header */}
          {activeRoom && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white/30 dark:bg-gray-950/30">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <RoomIcon icon={activeRoom.icon} className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{activeRoom.name}</h3>
                {activeRoom.description && (
                  <p className="text-[11px] text-[--text-muted] truncate">{activeRoom.description}</p>
                )}
              </div>

              {/* Room actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowInlineSearch(!showInlineSearch)}
                  className={`p-1.5 rounded-md transition ${showInlineSearch ? "bg-cyan-500/10 text-cyan-400" : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"}`}
                  title="Rechercher dans ce salon"
                >
                  <Search className="w-4 h-4" />
                </button>
                {pinnedCount > 0 && (
                  <button
                    onClick={() => setShowRightPanel(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition"
                  >
                    <Pin className="w-3 h-3" />
                    {pinnedCount}
                  </button>
                )}
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Inline search bar */}
          {showInlineSearch && (
            <InlineSearchBar
              messages={messages}
              onClose={() => { setShowInlineSearch(false); setSearchHighlightIds(new Set()); }}
              onJump={handleJumpToMessage}
              highlightedIds={searchHighlightIds}
              setHighlightedIds={setSearchHighlightIds}
            />
          )}

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-cyan-500/10 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-cyan-500 shadow-xl">
                <ImageIcon className="w-8 h-8 text-cyan-400" />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Déposez votre image ici</span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative"
          >
            {msgsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-[--text-secondary]">Chargement...</span>
                </div>
              </div>
            ) : messages.length === 0 && pinnedCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-cyan-400 opacity-50" />
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Bienvenue dans #{activeRoom?.name || "chat"}
                </h3>
                <p className="text-sm text-[--text-muted] mb-6 max-w-sm">
                  C&apos;est le début de la conversation. Partagez vos analyses, trades et idées.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {[
                    { text: "Quel est votre setup du jour ?", icon: "🎯" },
                    { text: "Je suis bullish sur EUR/USD", icon: "📈" },
                    { text: "Le NFP arrive cette semaine !", icon: "📰" },
                    { text: "Quelqu'un trade le gold ?", icon: "🥇" },
                  ].map((s) => (
                    <button
                      key={s.text}
                      onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-gray-700/50 text-[--text-secondary] hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition"
                    >
                      <span>{s.icon}</span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-2">
                {/* Pinned messages section - collapsible */}
                {pinnedCount > 0 && (
                  <div className="mx-4 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                    <button
                      onClick={() => setPinnedCollapsed(!pinnedCollapsed)}
                      className="w-full flex items-center gap-2 px-3 py-2 border-b border-amber-500/10 hover:bg-amber-500/5 transition"
                    >
                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                        Messages épinglés ({pinnedCount})
                      </span>
                      <div className="ml-auto">
                        {pinnedCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </button>
                    {!pinnedCollapsed && (
                      <div className="divide-y divide-amber-500/10">
                        {messages.filter((m) => m.isPinned).map((m) => (
                          <div key={m.id} className="px-3 py-2 hover:bg-amber-500/5 transition cursor-pointer" onClick={() => handleJumpToMessage(m.id)}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                                {m.user.name || m.user.email.split("@")[0]}
                              </span>
                              {m.user.role === "ADMIN" && (
                                <span className="flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded-full font-bold">
                                  <ShieldCheck className="w-2 h-2" /> ADMIN
                                </span>
                              )}
                              {m.user.role === "VIP" && (
                                <span className="flex items-center gap-0.5 text-[9px] text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded-full font-bold">
                                  <Crown className="w-2 h-2" /> VIP
                                </span>
                              )}
                              <span className="text-[10px] text-[--text-muted]">{formatDate(m.createdAt)} {formatTime(m.createdAt)}</span>
                            </div>
                            <p className="text-xs text-[--text-secondary] line-clamp-2">{m.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {messageGroups.map((group, gi) => (
                  <div key={gi}>
                    <DateSeparator date={group.date} />
                    {group.messages.map((msg, mi) => {
                      const isConsecutive =
                        mi > 0 &&
                        group.messages[mi - 1].userId === msg.userId &&
                        new Date(msg.createdAt).getTime() - new Date(group.messages[mi - 1].createdAt).getTime() < 300000;

                      // Skip thread replies in main view (they render inline under parent)
                      if (msg.content?.startsWith("[THREAD:")) return null;

                      const inlineReplies = threadRepliesMap.get(msg.id) || [];
                      const isThreadExpanded = expandedThreads.has(msg.id);

                      return (
                        <div key={msg.id}>
                          <div id={`msg-${msg.id}`} className={`transition-all duration-500 ${searchHighlightIds.has(msg.id) ? "bg-amber-500/10 border-l-2 border-amber-400" : ""}`}>
                            <MessageBubble
                              msg={msg}
                              isOwn={false}
                              isAdmin={isAdmin}
                              onDelete={handleDelete}
                              onPin={handlePin}
                              onBan={handleBan}
                              onImageClick={setLightboxUrl}
                              onReaction={handleReaction}
                              onReply={handleReply}
                              onOpenThread={handleOpenThread}
                              currentUserId={undefined}
                              isConsecutive={isConsecutive}
                              threadInfo={threadInfoMap.get(msg.id)}
                              onShowProfile={handleShowProfile}
                            />
                          </div>

                          {/* Inline thread replies */}
                          {inlineReplies.length > 0 && (
                            <div className="ml-12 border-l-2 border-cyan-500/20">
                              <button
                                onClick={() => toggleThreadExpand(msg.id)}
                                className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 transition w-full text-left"
                              >
                                {isThreadExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <Reply className="w-3 h-3" />
                                <span className="font-medium">
                                  {inlineReplies.length} réponse{inlineReplies.length !== 1 ? "s" : ""}
                                </span>
                                {!isThreadExpanded && inlineReplies.length > 0 && (
                                  <span className="text-[10px] text-[--text-muted]">
                                    — Dernière de {inlineReplies[inlineReplies.length - 1].user.name || inlineReplies[inlineReplies.length - 1].user.email.split("@")[0]}, {formatTime(inlineReplies[inlineReplies.length - 1].createdAt)}
                                  </span>
                                )}
                              </button>
                              {isThreadExpanded && (
                                <div className="pb-1">
                                  {inlineReplies.map((reply, ri) => {
                                    // Strip [THREAD:xxx] prefix from display content
                                    const cleanContent = reply.content?.replace(/^\[THREAD:.+?\]\s*/, "") || "";
                                    const cleanReply = { ...reply, content: cleanContent };
                                    const replyConsecutive = ri > 0 && inlineReplies[ri - 1].userId === reply.userId &&
                                      new Date(reply.createdAt).getTime() - new Date(inlineReplies[ri - 1].createdAt).getTime() < 300000;

                                    return (
                                      <div key={reply.id} className="pl-1">
                                        <MessageBubble
                                          msg={cleanReply}
                                          isOwn={false}
                                          isAdmin={isAdmin}
                                          onDelete={handleDelete}
                                          onPin={handlePin}
                                          onBan={handleBan}
                                          onImageClick={setLightboxUrl}
                                          onReaction={handleReaction}
                                          onReply={handleReply}
                                          onOpenThread={() => {}}
                                          currentUserId={undefined}
                                          isConsecutive={replyConsecutive}
                                          threadInfo={undefined}
                                          showThreadButton={false}
                                          onShowProfile={handleShowProfile}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Typing indicator — client-side only */}
            {isTyping && (
              <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-[--text-muted]">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="italic">est en train d&apos;écrire...</span>
              </div>
            )}

            {/* New messages indicator with unread count */}
            {showNewMsgIndicator && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500 text-white text-xs font-medium shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-all animate-bounce z-10"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                {unreadCount > 0 ? `${unreadCount} nouveau${unreadCount > 1 ? "x" : ""} message${unreadCount > 1 ? "s" : ""}` : "Nouveaux messages"}
              </button>
            )}
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-cyan-500/5 flex items-center gap-3">
              <Reply className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-cyan-400">
                  {replyTo.user.name || replyTo.user.email.split("@")[0]}
                </span>
                <p className="text-[11px] text-[--text-muted] truncate">{replyTo.content || "Image"}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[--text-muted]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
              <img src={imagePreview} alt="Aperçu" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
              <div className="flex-1">
                <p className="text-xs text-[--text-secondary]">Image prête à envoyer</p>
                <p className="text-[10px] text-[--text-muted]">{imageFile?.name}</p>
              </div>
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-[--text-muted] hover:text-rose-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Send error */}
          {sendError && (
            <div className="px-4 py-2 border-t border-rose-500/20 bg-rose-500/10 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="text-xs text-rose-400 font-medium">{sendError}</span>
              <button onClick={() => setSendError(null)} className="ml-auto p-0.5 rounded hover:bg-rose-500/20 text-rose-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Formatting bar */}
          {showFormattingBar && (
            <div className="px-4 py-1 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-1">
              <FormattingToolbar onInsert={insertFormatting} />
              <span className="text-[10px] text-[--text-muted] ml-2">
                **gras** | *italique* | `code` | ```bloc de code```
              </span>
            </div>
          )}

          {/* Input bar */}
          <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50">
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                  title="Image / GIF"
                >
                  <ImagePlus className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTradeModal(true)}
                  className="p-2 rounded-lg text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                  title="Partager un trade"
                >
                  <Share2 className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPollModal(true)}
                  className="p-2 rounded-lg text-[--text-muted] hover:text-purple-400 hover:bg-purple-500/10 transition"
                  title="Créer un sondage"
                >
                  <BarChart3 className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormattingBar(!showFormattingBar)}
                  className={`p-2 rounded-lg transition ${showFormattingBar ? "text-cyan-400 bg-cyan-500/10" : "text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10"}`}
                  title="Mise en forme"
                >
                  <Bold className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder={`Message #${activeRoom?.name || "chat"}... (Ctrl+B gras, Ctrl+I italique)`}
                  maxLength={1000}
                  className="w-full bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition placeholder-gray-400 dark:placeholder-gray-600"
                  style={{ color: "var(--text-primary)" }}
                />
                {/* @mention autocomplete */}
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-20">
                    <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-[--text-muted] uppercase tracking-wider">Mentionner</span>
                    </div>
                    {mentionResults.map((user, i) => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => insertMention(user)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                          i === mentionIndex ? "bg-cyan-500/10 text-cyan-500" : "text-[--text-primary] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                          {user[0]?.toUpperCase()}
                        </div>
                        <AtSign className="w-3 h-3 text-[--text-muted]" />
                        {user}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send */}
              <button
                type="submit"
                disabled={sending || uploading || (!input.trim() && !imageFile)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-30 hover:shadow-lg hover:shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Char counter */}
            {input.length > 800 && (
              <div className="text-right mt-1">
                <span className={`text-[10px] mono ${input.length > 950 ? "text-rose-400" : "text-[--text-muted]"}`}>
                  {input.length}/1000
                </span>
              </div>
            )}
          </form>
        </div>

        {/* THREAD PANEL */}
        {activeThread && (
          <ThreadPanel
            parentMessage={activeThread}
            replies={threadReplies}
            onClose={() => setActiveThread(null)}
            onSendReply={handleThreadReply}
            onReaction={handleReaction}
            onImageClick={setLightboxUrl}
            isAdmin={isAdmin}
            currentUserId={undefined}
            onDelete={handleDelete}
            onPin={handlePin}
            onBan={handleBan}
          />
        )}

        {/* RIGHT PANEL */}
        {showRightPanel && !activeThread && (
          <RightPanel
            messages={messages}
            activeRoom={activeRoom}
            onClose={() => setShowRightPanel(false)}
          />
        )}
      </div>

      {/* Trade share modal */}
      {showTradeModal && <TradeShareModal onSelect={handleTradeShare} onClose={() => setShowTradeModal(false)} />}

      {/* Poll creation modal */}
      {showPollModal && <PollCreationModal onSubmit={handlePollSubmit} onClose={() => setShowPollModal(false)} />}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-hover)] hover:bg-white/20 text-white transition">
            <X className="w-5 h-5" />
          </button>
          <img src={lightboxUrl} alt="Capture" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <SearchOverlay
          messages={messages}
          onClose={() => setShowSearch(false)}
          onJump={handleJumpToMessage}
        />
      )}

      {/* User profile hover card */}
      {userProfile && (
        <UserProfileCard
          profile={userProfile.profile}
          position={userProfile.position}
        />
      )}
    </div>
  );
}
