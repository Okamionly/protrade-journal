"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

export default function ChatPreviewWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chat/messages?limit=3")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data.slice(0, 3));
        } else if (data?.messages) {
          setMessages(data.messages.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        Loading...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 6,
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        <MessageSquare size={20} />
        <span>No messages yet</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "6px 8px",
            borderRadius: 6,
            backgroundColor: "var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#06b6d4",
              }}
            >
              {msg.user?.name || msg.user?.email?.split("@")[0] || "User"}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
              }}
            >
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {msg.content}
          </span>
        </div>
      ))}

      <Link
        href="/chat"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontSize: 11,
          color: "#06b6d4",
          textDecoration: "none",
          marginTop: 2,
        }}
      >
        <ExternalLink size={10} />
        Open chat
      </Link>
    </div>
  );
}
