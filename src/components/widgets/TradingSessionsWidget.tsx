"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

interface Session {
  name: string;
  open: number;  // UTC hour
  close: number; // UTC hour
  color: string;
  emoji: string;
}

const SESSIONS: Session[] = [
  { name: "Sydney", open: 21, close: 6, color: "#8b5cf6", emoji: "AU" },
  { name: "Tokyo", open: 0, close: 9, color: "#f59e0b", emoji: "JP" },
  { name: "London", open: 7, close: 16, color: "#06b6d4", emoji: "GB" },
  { name: "New York", open: 13, close: 22, color: "#10b981", emoji: "US" },
];

function isSessionActive(session: Session, utcHour: number): boolean {
  if (session.open < session.close) {
    return utcHour >= session.open && utcHour < session.close;
  }
  // Wraps around midnight (e.g. Sydney 21-6)
  return utcHour >= session.open || utcHour < session.close;
}

export default function TradingSessionsWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const activeSessions = SESSIONS.filter((s) => isSessionActive(s, utcHour));

  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          justifyContent: "center",
        }}
      >
        <Globe size={14} color="var(--text-muted)" />
        <span
          className="mono"
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          {String(utcHour).padStart(2, "0")}:{String(utcMin).padStart(2, "0")}{" "}
          UTC
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SESSIONS.map((session) => {
          const active = isSessionActive(session, utcHour);
          return (
            <div
              key={session.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                borderRadius: 8,
                backgroundColor: active
                  ? `${session.color}15`
                  : "transparent",
                border: `1px solid ${active ? `${session.color}40` : "transparent"}`,
                transition: "all 0.3s ease",
              }}
            >
              {/* Status indicator */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: active ? session.color : "var(--text-muted)",
                  boxShadow: active
                    ? `0 0 8px ${session.color}80`
                    : "none",
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  width: 20,
                  textAlign: "center",
                }}
              >
                {session.emoji}
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? session.color : "var(--text-muted)",
                  flex: 1,
                }}
              >
                {session.name}
              </span>

              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}
              >
                {String(session.open).padStart(2, "0")}:00-
                {String(session.close).padStart(2, "0")}:00
              </span>

              {active && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: session.color,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  LIVE
                </span>
              )}
            </div>
          );
        })}
      </div>

      {activeSessions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 8,
          }}
        >
          No active sessions
        </div>
      )}
    </div>
  );
}
