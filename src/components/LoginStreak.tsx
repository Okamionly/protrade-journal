"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "protrade-login-streak";

interface StreakData {
  count: number;
  lastVisit: string; // YYYY-MM-DD
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { count: 0, lastVisit: "" };
}

function computeStreak(): StreakData {
  const saved = loadStreak();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  // Already visited today
  if (saved.lastVisit === today) {
    return saved;
  }

  // Visited yesterday -> increment streak
  if (saved.lastVisit === yesterday) {
    const next: StreakData = { count: saved.count + 1, lastVisit: today };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  // Missed a day or first visit -> reset to 1
  const next: StreakData = { count: 1, lastVisit: today };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function LoginStreak() {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    setStreak(computeStreak());
  }, []);

  if (!streak || streak.count <= 0) return null;

  const count = streak.count;

  // Color tiers
  let colorClass = "text-orange-400"; // default
  let glowStyle = {};
  if (count >= 30) {
    colorClass = "text-yellow-400";
    glowStyle = { textShadow: "0 0 8px rgba(234,179,8,0.6)" };
  } else if (count >= 7) {
    colorClass = "text-amber-500";
    glowStyle = { textShadow: "0 0 6px rgba(217,119,6,0.4)" };
  }

  return (
    <div
      className="relative group flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition cursor-default"
      title={`Connect\u00e9 ${count} jour${count > 1 ? "s" : ""} d\u2019affil\u00e9e`}
    >
      <span className={`text-base leading-none ${count >= 7 ? "animate-pulse" : ""}`}>
        {"\uD83D\uDD25"}
      </span>
      <span
        className={`text-sm font-bold mono ${colorClass}`}
        style={glowStyle}
      >
        {count}
      </span>

      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
        style={{ background: "var(--bg-card-solid, #1a1a2e)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        Connect&eacute; {count} jour{count > 1 ? "s" : ""} d&apos;affil&eacute;e
        {count >= 30 && <span className="ml-1">{"\uD83C\uDFC6"}</span>}
        {count >= 7 && count < 30 && <span className="ml-1">{"\uD83E\uDD47"}</span>}
      </div>
    </div>
  );
}
