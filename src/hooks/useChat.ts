"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  messageCount: number;
  lastActivity: string | null;
}

export interface SharedTrade {
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

export interface ChatMessage {
  id: string;
  content: string;
  imageUrl: string | null;
  userId: string;
  user: { id: string; name: string | null; email: string };
  roomId: string;
  trade: SharedTrade | null;
  isPinned: boolean;
  createdAt: string;
}

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Fetch rooms error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, fetchRooms };
}

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const latestTimestamp = useRef<string | null>(null);
  const prevRoomId = useRef<string>(roomId);

  const fetchMessages = useCallback(async (isPolling = false) => {
    try {
      let url = `/api/chat/messages?roomId=${roomId}&limit=50`;

      if (isPolling && latestTimestamp.current) {
        url = `/api/chat/messages?roomId=${roomId}&after=${encodeURIComponent(latestTimestamp.current)}`;
      }

      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();

      if (isPolling && latestTimestamp.current) {
        // Append new messages
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            const updated = [...prev, ...newMsgs];
            latestTimestamp.current = updated[updated.length - 1].createdAt;
            return updated;
          });
        }
      } else {
        // Full load
        setMessages(data.messages);
        if (data.messages.length > 0) {
          latestTimestamp.current = data.messages[data.messages.length - 1].createdAt;
        }
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [roomId]);

  // Reset when room changes
  useEffect(() => {
    if (prevRoomId.current !== roomId) {
      setMessages([]);
      setLoading(true);
      latestTimestamp.current = null;
      prevRoomId.current = roomId;
    }
    fetchMessages(false);
  }, [roomId, fetchMessages]);

  // Polling every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string, tradeId?: string, imageUrl?: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content, tradeId, imageUrl }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) return prev;
          latestTimestamp.current = msg.createdAt;
          return [...prev, msg];
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Send message error:", error);
      return false;
    } finally {
      setSending(false);
    }
  }, [roomId]);

  const deleteMessage = useCallback(async (messageId: string, adminSecret: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret },
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const pinMessage = useCallback(async (messageId: string, adminSecret: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/pin`, {
        method: "PUT",
        headers: { "x-admin-secret": adminSecret },
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return { messages, loading, sending, sendMessage, deleteMessage, pinMessage, fetchMessages };
}
