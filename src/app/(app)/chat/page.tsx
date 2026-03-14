"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  MessageCircle,
  Signal,
  BookOpen,
  GraduationCap,
  Trophy,
};

function RoomIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && ICON_MAP[icon]) || Hash;
  return <Icon className={className || "w-4 h-4"} />;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function MessageBubble({
  msg,
  isOwn,
  adminSecret,
  onDelete,
  onPin,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  adminSecret: string | null;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}) {
  const initial = (msg.user.name || msg.user.email)[0].toUpperCase();

  return (
    <div
      className={`chat-message group flex gap-3 p-3 rounded-xl ${
        msg.isPinned ? "pinned" : ""
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
          isOwn
            ? "bg-gradient-to-br from-cyan-500 to-blue-600"
            : "bg-gradient-to-br from-purple-500 to-pink-600"
        }`}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {msg.user.name || msg.user.email.split("@")[0]}
          </span>
          {msg.isPinned && <Pin className="w-3 h-3 text-cyan-400" />}
          <span className="text-xs text-gray-500">
            {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
          </span>

          {adminSecret && (
            <div className="hidden group-hover:flex items-center gap-1 ml-auto">
              <button
                onClick={() => onPin(msg.id)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-cyan-400"
                title={msg.isPinned ? "Désépingler" : "Épingler"}
              >
                <Pin className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(msg.id)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-rose-400"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-200 break-words">{msg.content}</p>

        {msg.trade && <TradeCard trade={msg.trade} />}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { rooms, loading: roomsLoading } = useChatRooms();
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [input, setInput] = useState("");
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Set first room as active once loaded
  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Load admin secret from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("adminSecret");
    if (stored) setAdminSecret(stored);
  }, []);

  const {
    messages,
    loading: msgsLoading,
    sending,
    sendMessage,
    deleteMessage,
    pinMessage,
  } = useChat(activeRoomId);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Auto-scroll logic
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const success = await sendMessage(input.trim());
    if (success) {
      setInput("");
      shouldAutoScroll.current = true;
    }
  };

  const handleTradeShare = async (tradeId: string, content: string) => {
    setShowTradeModal(false);
    shouldAutoScroll.current = true;
    await sendMessage(content, tradeId);
  };

  const handleDelete = async (messageId: string) => {
    if (!adminSecret) return;
    if (confirm("Supprimer ce message ?")) {
      await deleteMessage(messageId, adminSecret);
    }
  };

  const handlePin = async (messageId: string) => {
    if (!adminSecret) return;
    await pinMessage(messageId, adminSecret);
  };

  const handleAdminLogin = () => {
    if (adminInput.trim()) {
      sessionStorage.setItem("adminSecret", adminInput.trim());
      setAdminSecret(adminInput.trim());
      setShowAdminInput(false);
      setAdminInput("");
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement du chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ height: "calc(100vh - 160px)" }}>
      {/* Room sidebar - horizontal on mobile, vertical on desktop */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="glass rounded-2xl p-4 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              Salons
            </h3>
            <button
              onClick={() => setShowAdminInput(!showAdminInput)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition"
              title="Mode admin"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>

          {showAdminInput && (
            <div className="mb-3 flex gap-2">
              <input
                type="password"
                placeholder="Clé admin..."
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                className="flex-1 bg-dark-bg border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
              {adminSecret && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem("adminSecret");
                    setAdminSecret(null);
                    setShowAdminInput(false);
                  }}
                  className="text-rose-400 hover:text-rose-300"
                  title="Déconnecter admin"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Rooms list - horizontal scroll on mobile */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`chat-sidebar-item flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                  room.id === activeRoomId
                    ? "active"
                    : "hover:bg-white/5 text-gray-400"
                }`}
              >
                <RoomIcon icon={room.icon} className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{room.name}</span>
                {room.messageCount > 0 && (
                  <span className="text-xs text-gray-500 ml-auto hidden lg:inline">
                    {room.messageCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {adminSecret && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Mode admin actif
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 glass rounded-2xl flex flex-col min-h-0">
        {/* Room header */}
        {activeRoom && (
          <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            <RoomIcon icon={activeRoom.icon} className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-semibold">{activeRoom.name}</h3>
              {activeRoom.description && (
                <p className="text-xs text-gray-400">{activeRoom.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Pinned messages banner */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-700 bg-cyan-500/5">
            <div className="flex items-center gap-2 text-xs text-cyan-400 mb-1">
              <Pin className="w-3 h-3" />
              <span className="font-medium">
                {pinnedMessages.length} message{pinnedMessages.length > 1 ? "s" : ""} épinglé{pinnedMessages.length > 1 ? "s" : ""}
              </span>
            </div>
            {pinnedMessages.slice(0, 2).map((m) => (
              <p key={m.id} className="text-xs text-gray-300 truncate">
                <span className="font-medium">{m.user.name || m.user.email.split("@")[0]}:</span>{" "}
                {m.content}
              </p>
            ))}
          </div>
        )}

        {/* Messages list */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-1"
        >
          {msgsLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Chargement des messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
              <p>Aucun message dans ce salon.</p>
              <p className="text-sm mb-4">Soyez le premier à écrire !</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  "Quel est votre setup du jour ?",
                  "Je suis bullish sur EUR/USD",
                  "Le NFP arrive cette semaine !",
                  "Quelqu'un trade le gold ?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={false}
                adminSecret={adminSecret}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowTradeModal(true)}
              className="flex-shrink-0 p-2.5 rounded-xl border border-gray-600 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition"
              title="Partager un trade"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrire un message..."
              maxLength={1000}
              className="chat-input flex-1 bg-dark-bg border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Trade share modal */}
      {showTradeModal && (
        <TradeShareModal
          onSelect={handleTradeShare}
          onClose={() => setShowTradeModal(false)}
        />
      )}
    </div>
  );
}
