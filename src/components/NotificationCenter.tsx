"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Bell,
  Trophy,
  Flame,
  AlertTriangle,
  Target,
  Lightbulb,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

/* ── Types ─────────────────────────────────────────────────────────── */

type NType = "ACHIEVEMENT" | "STREAK" | "WARNING" | "GOAL" | "TIP" | "RISK";
type Tab = "all" | "trading" | "system";

interface Notification {
  id: string;
  type: NType;
  title: string;
  message: string;
  createdAt: number;
  tab: "trading" | "system";
}

const STORAGE_KEY = "mp_notif_read";
const DISMISSED_KEY = "mp_notif_dismissed";
const MAX_NOTIFICATIONS = 20;

const ICON_MAP: Record<NType, { icon: typeof Trophy; cls: string }> = {
  ACHIEVEMENT: { icon: Trophy, cls: "text-emerald-500" },
  STREAK: { icon: Flame, cls: "text-amber-500" },
  WARNING: { icon: AlertTriangle, cls: "text-amber-400" },
  GOAL: { icon: Target, cls: "text-cyan-500" },
  TIP: { icon: Lightbulb, cls: "text-cyan-400" },
  RISK: { icon: ShieldAlert, cls: "text-rose-500" },
};

const TIPS = [
  "Conseil : Respecte toujours ton stop loss.",
  "Conseil : Ton meilleur jour est le mardi.",
  "Conseil : Évite de trader pendant les annonces majeures.",
  "Conseil : Revois tes trades perdants chaque semaine.",
  "Conseil : Ne risque jamais plus de 2% par trade.",
];

/* ── Time formatting ───────────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l\u2019instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useNotifications(trades: Trade[]) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const d = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
      setReadIds(new Set(r));
      setDismissedIds(new Set(d));
    } catch { /* empty */ }
  }, []);

  const persist = useCallback((key: string, ids: Set<string>) => {
    localStorage.setItem(key, JSON.stringify([...ids]));
  }, []);

  const notifications = useMemo<Notification[]>(() => {
    if (!trades.length) return [];
    const notifs: Notification[] = [];
    const now = Date.now();

    // ACHIEVEMENT — milestone counts
    const milestones = [10, 25, 50, 100, 200, 500];
    for (const m of milestones) {
      if (trades.length >= m) {
        notifs.push({
          id: `ach-${m}`,
          type: "ACHIEVEMENT",
          title: "Milestone atteint !",
          message: `Tu as atteint ${m} trades enregistrés !`,
          createdAt: now - 3600000,
          tab: "trading",
        });
      }
    }

    // STREAK — consecutive wins
    let streak = 0;
    for (const t of trades) {
      if (t.result > 0) streak++;
      else break;
    }
    if (streak >= 3) {
      notifs.push({
        id: `streak-${streak}`,
        type: "STREAK",
        title: "Série gagnante !",
        message: `Série de ${streak} wins ! Continue comme ça !`,
        createdAt: now - 1800000,
        tab: "trading",
      });
    }

    // WARNING — consecutive losses today
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter((t) => t.date.startsWith(today));
    let losses = 0;
    for (const t of todayTrades) {
      if (t.result < 0) losses++;
      else break;
    }
    if (losses >= 3) {
      notifs.push({
        id: `warn-loss-${today}`,
        type: "WARNING",
        title: "Attention !",
        message: `${losses} pertes d\u2019affil\u00e9e aujourd\u2019hui. Fais une pause.`,
        createdAt: now - 600000,
        tab: "trading",
      });
    }

    // GOAL — monthly target (80%+ positive result rate)
    const month = new Date().toISOString().slice(0, 7);
    const monthTrades = trades.filter((t) => t.date.startsWith(month));
    if (monthTrades.length >= 5) {
      const winRate = monthTrades.filter((t) => t.result > 0).length / monthTrades.length;
      if (winRate >= 0.8) {
        notifs.push({
          id: `goal-${month}`,
          type: "GOAL",
          title: "Objectif mensuel",
          message: `Objectif mensuel atteint \u00e0 ${Math.round(winRate * 100)}% !`,
          createdAt: now - 7200000,
          tab: "trading",
        });
      }
    }

    // RISK — daily trade limit (> 5 trades)
    if (todayTrades.length > 5) {
      notifs.push({
        id: `risk-limit-${today}`,
        type: "RISK",
        title: "Limite de trades",
        message: `Tu as d\u00e9pass\u00e9 ta limite avec ${todayTrades.length} trades aujourd\u2019hui.`,
        createdAt: now - 300000,
        tab: "system",
      });
    }

    // TIP — deterministic daily tip
    const dayIdx = new Date().getDate() % TIPS.length;
    notifs.push({
      id: `tip-${today}`,
      type: "TIP",
      title: "Conseil du jour",
      message: TIPS[dayIdx],
      createdAt: now - 10800000,
      tab: "system",
    });

    return notifs
      .filter((n) => !dismissedIds.has(n.id))
      .slice(0, MAX_NOTIFICATIONS);
  }, [trades, dismissedIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    persist(STORAGE_KEY, next);
  }, [notifications, readIds, persist]);

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      setReadIds(next);
      persist(STORAGE_KEY, next);
    },
    [readIds, persist],
  );

  const dismiss = useCallback(
    (id: string) => {
      const next = new Set(dismissedIds);
      next.add(id);
      setDismissedIds(next);
      persist(DISMISSED_KEY, next);
    },
    [dismissedIds, persist],
  );

  return { notifications, unreadCount, readIds, markAllRead, markRead, dismiss };
}

/* ── Component ─────────────────────────────────────────────────────── */

export function NotificationCenter({ trades }: { trades: Trade[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, readIds, markAllRead, markRead, dismiss } =
    useNotifications(trades);

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = tab === "all" ? notifications : notifications.filter((n) => n.tab === tab);

  const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "trading", label: "Trading" },
    { key: "system", label: "Système" },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-12 w-[360px] rounded-2xl border shadow-2xl z-50 overflow-hidden transition-all duration-200 origin-top-right ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card, white)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-cyan-500 hover:text-cyan-400 transition"
            >
              <Check className="w-3.5 h-3.5" />
              Marquer tout comme lu
            </button>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 pt-2 pb-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {TAB_LABELS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                tab === t.key
                  ? "bg-cyan-500/10 text-cyan-500"
                  : "hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
              style={tab !== t.key ? { color: "var(--text-muted)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="max-h-[340px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p
              className="text-center text-xs py-10"
              style={{ color: "var(--text-muted)" }}
            >
              Aucune notification
            </p>
          ) : (
            filtered.map((n) => {
              const { icon: Icon, cls } = ICON_MAP[n.type];
              const isRead = readIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                    !isRead ? "bg-cyan-500/[0.04]" : ""
                  }`}
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className={`mt-0.5 shrink-0 ${cls}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {n.title}
                      </span>
                      {!isRead && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      )}
                    </div>
                    <p
                      className="text-[11px] leading-relaxed mt-0.5 line-clamp-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {n.message}
                    </p>
                    <span
                      className="text-[10px] mt-1 block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition shrink-0"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
