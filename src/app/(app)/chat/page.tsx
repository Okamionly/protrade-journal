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
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  MessageCircle, Signal, BookOpen, GraduationCap, Trophy, TrendingUp, Zap, Star,
};

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "💰", "📈", "📉", "🎯", "💪", "😂", "🤔"];

const ROOM_CATEGORIES: Record<string, string[]> = {
  "TRADING": ["Général", "Signaux", "Analyses"],
  "FORMATION": ["Débutants", "Stratégies"],
  "SOCIAL": ["Résultats"],
};

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

// ─── Message Bubble ───────────────────────────────────────
function MessageBubble({
  msg,
  isOwn,
  adminSecret,
  onDelete,
  onPin,
  onImageClick,
  onReaction,
  onReply,
  currentUserId,
  isConsecutive,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  adminSecret: string | null;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onImageClick: (url: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  currentUserId?: string;
  isConsecutive: boolean;
}) {
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const initial = (msg.user.name || msg.user.email)[0].toUpperCase();
  const reactions = getReactionGroups(msg, currentUserId);

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
          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5 ${
            isOwn
              ? "bg-gradient-to-br from-cyan-500 to-blue-600"
              : "bg-gradient-to-br from-purple-500 to-pink-600"
          }`}
        >
          {initial}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Header - only for first message in group */}
        {!isConsecutive && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-[13px]" style={{ color: isOwn ? "var(--accent, #06b6d4)" : "var(--text-primary)" }}>
              {msg.user.name || msg.user.email.split("@")[0]}
            </span>
            {msg.isPinned && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <Pin className="w-2.5 h-2.5" /> {t("pinned")}
              </span>
            )}
            <span className="text-[11px] text-[--text-muted]">{formatTime(msg.createdAt)}</span>
          </div>
        )}

        {/* Content */}
        {msg.content && (
          <p className="text-[13px] leading-relaxed break-words" style={{ color: "var(--text-primary)" }}>
            {msg.content}
          </p>
        )}

        {/* Image */}
        {msg.imageUrl && (
          <div className="mt-1.5">
            <img
              src={msg.imageUrl}
              alt="Capture"
              className="max-w-sm max-h-64 rounded-xl border border-gray-200 dark:border-gray-700/50 cursor-pointer hover:opacity-90 transition object-cover shadow-sm"
              onClick={() => onImageClick(msg.imageUrl!)}
            />
          </div>
        )}

        {/* Shared Trade */}
        {msg.trade && <TradeCard trade={msg.trade} />}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReaction(msg.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
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
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs border border-dashed border-gray-300 dark:border-gray-700 text-[--text-muted] hover:border-cyan-500/50 hover:text-cyan-400 transition"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Hover actions toolbar */}
      <div className="absolute right-3 -top-3 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-1 py-0.5 z-10">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-amber-400 transition"
          title={t("react")}
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onReply(msg)}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-cyan-400 transition"
          title={t("reply")}
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
        {adminSecret && (
          <>
            <button
              onClick={() => onPin(msg.id)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-amber-400 transition"
              title={msg.isPinned ? t("unpin") : t("pin")}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[--text-muted] hover:text-rose-400 transition"
              title={t("delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Quick emoji picker */}
      {showEmojiPicker && (
        <div className="absolute right-3 top-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-20 flex gap-1 flex-wrap max-w-[220px]">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReaction(msg.id, emoji); setShowEmojiPicker(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-base transition"
            >
              {emoji}
            </button>
          ))}
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

// ─── Search Modal ─────────────────────────────────────────
function SearchOverlay({ messages, onClose, onJump }: { messages: ChatMessage[]; onClose: () => void; onJump: (id: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .filter((m) => m.content?.toLowerCase().includes(q) || m.user.name?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, messages]);

  return (
    <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
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
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <p className="text-center text-sm text-[--text-muted] py-8">{t("noResults")}</p>
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
                <span className="text-[10px] text-[--text-muted]">{formatDate(m.createdAt)} {formatTime(m.createdAt)}</span>
              </div>
              <p className="text-xs text-[--text-secondary] truncate">{m.content}</p>
            </button>
          ))}
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
  const uniqueUsers = new Map<string, { name: string; initial: string }>();
  messages.forEach((m) => {
    if (!uniqueUsers.has(m.userId)) {
      uniqueUsers.set(m.userId, {
        name: m.user.name || m.user.email.split("@")[0],
        initial: (m.user.name || m.user.email)[0].toUpperCase(),
      });
    }
  });

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

            {/* Members */}
            <div>
              <h4 className="text-[11px] font-bold text-[--text-muted] uppercase tracking-wider mb-2 px-1">
                {t("members")} — {uniqueUsers.size}
              </h4>
              <div className="space-y-1">
                {Array.from(uniqueUsers.entries()).map(([id, u]) => (
                  <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {u.initial}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 ml-auto flex-shrink-0" title={t("online")} />
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
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScroll = useRef(true);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) setActiveRoomId(rooms[0].id);
  }, [rooms, activeRoomId]);

  useEffect(() => {
    const stored = sessionStorage.getItem("adminSecret");
    if (stored) setAdminSecret(stored);
  }, []);

  const { messages, loading: msgsLoading, sending, sendMessage, deleteMessage, pinMessage, toggleReaction } = useChat(activeRoomId);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Track new messages for indicator
  useEffect(() => {
    if (messages.length > prevMessageCount.current && !shouldAutoScroll.current) {
      setShowNewMsgIndicator(true);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    if (shouldAutoScroll.current) setShowNewMsgIndicator(false);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const scrollToBottom = () => {
    shouldAutoScroll.current = true;
    setShowNewMsgIndicator(false);
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

    const success = await sendMessage(content, undefined, imageUrl);
    if (success) {
      setInput("");
      setImageFile(null);
      setImagePreview(null);
      setReplyTo(null);
      shouldAutoScroll.current = true;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTradeShare = async (tradeId: string, content: string) => {
    setShowTradeModal(false);
    shouldAutoScroll.current = true;
    await sendMessage(content, tradeId);
  };

  const handleDelete = async (messageId: string) => {
    if (!adminSecret) return;
    if (confirm(t("confirmDeleteMessage"))) await deleteMessage(messageId, adminSecret);
  };

  const handlePin = async (messageId: string) => {
    if (!adminSecret) return;
    await pinMessage(messageId, adminSecret);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  const handleAdminLogin = () => {
    if (adminInput.trim()) {
      sessionStorage.setItem("adminSecret", adminInput.trim());
      setAdminSecret(adminInput.trim());
      setShowAdminInput(false);
      setAdminInput("");
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
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

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setLightboxUrl(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

      {/* Main content - 3 panels */}
      <div className="flex flex-1 min-h-0 bg-white/50 dark:bg-gray-950/50 rounded-b-2xl overflow-hidden border border-t-0 border-gray-200 dark:border-gray-800">
        {/* LEFT PANEL - Room sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/80">
          {/* Admin */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest">{t("channels")}</span>
              <button
                onClick={() => setShowAdminInput(!showAdminInput)}
                className={`p-1 rounded-md transition ${adminSecret ? "text-amber-500" : "text-[--text-muted] hover:text-[--text-secondary]"}`}
                title={t("adminMode")}
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAdminInput && (
              <div className="mt-2 flex gap-1.5">
                <input
                  type="password"
                  placeholder={t("adminKeyPlaceholder")}
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-amber-500"
                  style={{ color: "var(--text-primary)" }}
                />
                {adminSecret && (
                  <button
                    onClick={() => { sessionStorage.removeItem("adminSecret"); setAdminSecret(null); setShowAdminInput(false); }}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {adminSecret && !showAdminInput && (
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
                      return (
                        <button
                          key={room.id}
                          onClick={() => setActiveRoomId(room.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-all ${
                            isActive
                              ? "bg-cyan-500/10 text-cyan-500 font-semibold"
                              : "text-[--text-secondary] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] hover:text-[--text-primary]"
                          }`}
                        >
                          <RoomIcon icon={room.icon} className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-[--text-muted]"}`} />
                          <span className="truncate">{room.name}</span>
                          {room.messageCount > 0 && (
                            <span className={`ml-auto text-[10px] mono ${isActive ? "text-cyan-400" : "text-[--text-muted]"}`}>
                              {room.messageCount}
                            </span>
                          )}
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                T
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
        <div className="flex-1 flex flex-col min-w-0">
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
            ) : messages.length === 0 ? (
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
                {messageGroups.map((group, gi) => (
                  <div key={gi}>
                    <DateSeparator date={group.date} />
                    {group.messages.map((msg, mi) => {
                      const isConsecutive =
                        mi > 0 &&
                        group.messages[mi - 1].userId === msg.userId &&
                        new Date(msg.createdAt).getTime() - new Date(group.messages[mi - 1].createdAt).getTime() < 300000;

                      return (
                        <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-500">
                          <MessageBubble
                            msg={msg}
                            isOwn={false}
                            adminSecret={adminSecret}
                            onDelete={handleDelete}
                            onPin={handlePin}
                            onImageClick={setLightboxUrl}
                            onReaction={handleReaction}
                            onReply={handleReply}
                            isConsecutive={isConsecutive}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* New messages indicator */}
            {showNewMsgIndicator && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500 text-white text-xs font-medium shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-all animate-bounce"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Nouveaux messages
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

          {/* Input bar */}
          <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50">
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-[--text-muted] hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                  title="Capture d'écran"
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
              </div>

              {/* Input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message #${activeRoom?.name || "chat"}...`}
                  maxLength={1000}
                  className="w-full bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition placeholder-gray-400 dark:placeholder-gray-600"
                  style={{ color: "var(--text-primary)" }}
                />
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

        {/* RIGHT PANEL */}
        {showRightPanel && (
          <RightPanel
            messages={messages}
            activeRoom={activeRoom}
            onClose={() => setShowRightPanel(false)}
          />
        )}
      </div>

      {/* Trade share modal */}
      {showTradeModal && <TradeShareModal onSelect={handleTradeShare} onClose={() => setShowTradeModal(false)} />}

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
    </div>
  );
}
