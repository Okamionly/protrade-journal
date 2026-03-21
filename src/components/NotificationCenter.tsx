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
  TrendingUp,
  Clock,
  MessageSquare,
  Zap,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Trade } from "@/hooks/useTrades";
import {
  useNotificationSystem,
  type NotificationType,
  type AppNotification,
} from "@/hooks/useNotifications";

/* ── Legacy types (trade-derived) ─────────────────────────────────── */

type LegacyNType = "ACHIEVEMENT" | "STREAK" | "WARNING" | "GOAL" | "TIP" | "RISK";
type Tab = "all" | "trading" | "system";

interface LegacyNotification {
  id: string;
  type: LegacyNType;
  title: string;
  message: string;
  createdAt: number;
  tab: "trading" | "system";
}

const LEGACY_STORAGE_KEY = "mp_notif_read";
const LEGACY_DISMISSED_KEY = "mp_notif_dismissed";

const LEGACY_ICON_MAP: Record<LegacyNType, { icon: typeof Trophy; cls: string }> = {
  ACHIEVEMENT: { icon: Trophy, cls: "text-emerald-500" },
  STREAK: { icon: Flame, cls: "text-amber-500" },
  WARNING: { icon: AlertTriangle, cls: "text-amber-400" },
  GOAL: { icon: Target, cls: "text-cyan-500" },
  TIP: { icon: Lightbulb, cls: "text-cyan-400" },
  RISK: { icon: ShieldAlert, cls: "text-rose-500" },
};

const NEW_ICON_MAP: Record<NotificationType, { icon: typeof Trophy; cls: string }> = {
  TRADE_ALERT: { icon: TrendingUp, cls: "text-emerald-400" },
  BIAS_REMINDER: { icon: Clock, cls: "text-cyan-400" },
  ACHIEVEMENT: { icon: Trophy, cls: "text-yellow-400" },
  CHAT_MENTION: { icon: MessageSquare, cls: "text-blue-400" },
  SYSTEM: { icon: Zap, cls: "text-purple-400" },
  PRICE_ALERT: { icon: TrendingUp, cls: "text-rose-400" },
  CALENDAR: { icon: Clock, cls: "text-amber-400" },
  REVIEW_REMINDER: { icon: Lightbulb, cls: "text-cyan-400" },
};

const TIPS = [
  "Conseil : Respecte toujours ton stop loss.",
  "Conseil : Ton meilleur jour est le mardi.",
  "Conseil : Evite de trader pendant les annonces majeures.",
  "Conseil : Revois tes trades perdants chaque semaine.",
  "Conseil : Ne risque jamais plus de 2% par trade.",
];

/* ── Time formatting ───────────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (ts >= todayStart) return "Aujourd'hui";
  if (ts >= yesterdayStart) return "Hier";
  return "Plus ancien";
}

/* ── Legacy hook (preserved from original) ────────────────────────── */

function useLegacyNotifications(trades: Trade[]) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
      const d = JSON.parse(localStorage.getItem(LEGACY_DISMISSED_KEY) || "[]");
      setReadIds(new Set(r));
      setDismissedIds(new Set(d));
    } catch { /* empty */ }
  }, []);

  const persist = useCallback((key: string, ids: Set<string>) => {
    localStorage.setItem(key, JSON.stringify([...ids]));
  }, []);

  const notifications = useMemo<LegacyNotification[]>(() => {
    if (!trades.length) return [];
    const notifs: LegacyNotification[] = [];
    const now = Date.now();

    // ACHIEVEMENT -- milestone counts
    const milestones = [10, 25, 50, 100, 200, 500];
    for (const m of milestones) {
      if (trades.length >= m) {
        notifs.push({
          id: `ach-${m}`,
          type: "ACHIEVEMENT",
          title: "Milestone atteint !",
          message: `Tu as atteint ${m} trades enregistres !`,
          createdAt: now - 3600000,
          tab: "trading",
        });
      }
    }

    // STREAK -- consecutive wins
    let streak = 0;
    for (const t of trades) {
      if (t.result > 0) streak++;
      else break;
    }
    if (streak >= 3) {
      notifs.push({
        id: `streak-${streak}`,
        type: "STREAK",
        title: "Serie gagnante !",
        message: `Serie de ${streak} wins ! Continue comme ca !`,
        createdAt: now - 1800000,
        tab: "trading",
      });
    }

    // WARNING -- consecutive losses today
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
        message: `${losses} pertes d'affilee aujourd'hui. Fais une pause.`,
        createdAt: now - 600000,
        tab: "trading",
      });
    }

    // GOAL -- monthly target (80%+ positive result rate)
    const month = new Date().toISOString().slice(0, 7);
    const monthTrades = trades.filter((t) => t.date.startsWith(month));
    if (monthTrades.length >= 5) {
      const winRate = monthTrades.filter((t) => t.result > 0).length / monthTrades.length;
      if (winRate >= 0.8) {
        notifs.push({
          id: `goal-${month}`,
          type: "GOAL",
          title: "Objectif mensuel",
          message: `Objectif mensuel atteint a ${Math.round(winRate * 100)}% !`,
          createdAt: now - 7200000,
          tab: "trading",
        });
      }
    }

    // RISK -- daily trade limit (> 5 trades)
    if (todayTrades.length > 5) {
      notifs.push({
        id: `risk-limit-${today}`,
        type: "RISK",
        title: "Limite de trades",
        message: `Tu as depasse ta limite avec ${todayTrades.length} trades aujourd'hui.`,
        createdAt: now - 300000,
        tab: "system",
      });
    }

    // TIP -- deterministic daily tip
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
      .slice(0, 20);
  }, [trades, dismissedIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    persist(LEGACY_STORAGE_KEY, next);
  }, [notifications, readIds, persist]);

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      setReadIds(next);
      persist(LEGACY_STORAGE_KEY, next);
    },
    [readIds, persist],
  );

  const dismiss = useCallback(
    (id: string) => {
      const next = new Set(dismissedIds);
      next.add(id);
      setDismissedIds(next);
      persist(LEGACY_DISMISSED_KEY, next);
    },
    [dismissedIds, persist],
  );

  return { notifications, unreadCount, readIds, markAllRead, markRead, dismiss };
}

/* ── Exported hook (backward-compatible) ──────────────────────────── */

export function useNotifications(trades: Trade[]) {
  return useLegacyNotifications(trades);
}

/* ── Component ─────────────────────────────────────────────────────── */

export function NotificationCenter({ trades }: { trades: Trade[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Legacy trade-derived notifications
  const legacy = useLegacyNotifications(trades);

  // New persistent notification system
  const system = useNotificationSystem();

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Merge both notification sources into unified display items
  type DisplayNotif = {
    id: string;
    icon: typeof Trophy;
    iconCls: string;
    title: string;
    message: string;
    timestamp: number;
    isRead: boolean;
    isLegacy: boolean;
    actionUrl?: string;
    tab: "trading" | "system";
  };

  const allNotifications = useMemo<DisplayNotif[]>(() => {
    const items: DisplayNotif[] = [];

    // Legacy notifications
    for (const n of legacy.notifications) {
      const { icon, cls } = LEGACY_ICON_MAP[n.type];
      items.push({
        id: n.id,
        icon,
        iconCls: cls,
        title: n.title,
        message: n.message,
        timestamp: n.createdAt,
        isRead: legacy.readIds.has(n.id),
        isLegacy: true,
        tab: n.tab,
      });
    }

    // New system notifications
    for (const n of system.notifications) {
      const mapping = NEW_ICON_MAP[n.type] || NEW_ICON_MAP.SYSTEM;
      const isTrading = ["TRADE_ALERT", "BIAS_REMINDER", "PRICE_ALERT"].includes(n.type);
      items.push({
        id: n.id,
        icon: mapping.icon,
        iconCls: mapping.cls,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        isRead: n.read,
        isLegacy: false,
        actionUrl: n.actionUrl,
        tab: isTrading ? "trading" : "system",
      });
    }

    // Sort by timestamp desc, keep last 20
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, 20);
  }, [legacy.notifications, legacy.readIds, system.notifications]);

  const totalUnread = legacy.unreadCount + system.unreadCount;

  const filtered = tab === "all" ? allNotifications : allNotifications.filter((n) => n.tab === tab);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: DisplayNotif[] }[] = [];
    const map = new Map<string, DisplayNotif[]>();

    for (const n of filtered) {
      const label = getDateGroup(n.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    }

    const order = ["Aujourd'hui", "Hier", "Plus ancien"];
    for (const label of order) {
      const items = map.get(label);
      if (items?.length) groups.push({ label, items });
    }

    return groups;
  }, [filtered]);

  const handleMarkAllRead = () => {
    legacy.markAllRead();
    system.markAllAsRead();
  };

  const handleClick = (n: DisplayNotif) => {
    if (n.isLegacy) {
      legacy.markRead(n.id);
    } else {
      system.markAsRead(n.id);
      if (n.actionUrl) {
        router.push(n.actionUrl);
        setOpen(false);
      }
    }
  };

  const handleDismiss = (n: DisplayNotif) => {
    if (n.isLegacy) {
      legacy.dismiss(n.id);
    } else {
      system.dismissNotification(n.id);
    }
  };

  const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "trading", label: "Trading" },
    { key: "system", label: "Systeme" },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950 animate-pulse">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-12 w-[380px] rounded-2xl border shadow-2xl z-50 overflow-hidden transition-all duration-200 origin-top-right backdrop-blur-xl ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card, rgba(255,255,255,0.95))",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Notifications
            </h3>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {totalUnread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-cyan-500 hover:text-cyan-400 transition px-2 py-1 rounded-lg hover:bg-cyan-500/10"
              >
                <Check className="w-3.5 h-3.5" />
                Tout lu
              </button>
            )}
            {allNotifications.length > 0 && (
              <button
                onClick={system.clearAll}
                className="flex items-center gap-1 text-xs font-medium hover:text-rose-400 transition px-2 py-1 rounded-lg hover:bg-rose-500/10"
                style={{ color: "var(--text-muted)" }}
                title="Tout effacer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                router.push("/profile");
                setOpen(false);
              }}
              className="flex items-center gap-1 text-xs font-medium hover:text-cyan-400 transition px-2 py-1 rounded-lg hover:bg-cyan-500/10"
              style={{ color: "var(--text-muted)" }}
              title="Parametres"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
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
                  : "hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              }`}
              style={tab !== t.key ? { color: "var(--text-muted)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notification list -- grouped by date */}
        <div className="max-h-[380px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell
                className="w-8 h-8 mx-auto mb-3 opacity-30"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Aucune notification
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                {/* Group label */}
                <div
                  className="sticky top-0 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                  style={{
                    color: "var(--text-muted)",
                    background: "var(--bg-secondary, rgba(0,0,0,0.3))",
                  }}
                >
                  {group.label}
                </div>
                {group.items.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] ${
                        !n.isRead ? "bg-cyan-500/[0.04]" : ""
                      }`}
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className={`mt-0.5 shrink-0 ${n.iconCls}`}>
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
                          {!n.isRead && (
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
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(n);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] transition shrink-0"
                        style={{ color: "var(--text-muted)" }}
                        aria-label="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
