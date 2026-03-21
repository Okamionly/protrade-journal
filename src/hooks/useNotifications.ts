"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type NotificationType =
  | "TRADE_ALERT"
  | "BIAS_REMINDER"
  | "ACHIEVEMENT"
  | "CHAT_MENTION"
  | "SYSTEM"
  | "PRICE_ALERT"
  | "CALENDAR"
  | "REVIEW_REMINDER";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

/* ── Preference types ─────────────────────────────────────────────── */

export interface NotificationPreferences {
  dailyBiasReminder: boolean;
  dailyBiasTime: string; // "HH:mm"
  economicCalendarAlerts: boolean;
  tradeReviewReminder: boolean;
  chatMentions: boolean;
  achievementUnlocked: boolean;
  priceAlerts: boolean;
  soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  dailyBiasReminder: true,
  dailyBiasTime: "08:00",
  economicCalendarAlerts: true,
  tradeReviewReminder: true,
  chatMentions: true,
  achievementUnlocked: true,
  priceAlerts: true,
  soundEnabled: true,
};

/* ── Storage keys ─────────────────────────────────────────────────── */

const NOTIF_STORAGE_KEY = "protrade_notifications";
const PREFS_STORAGE_KEY = "protrade_notif_prefs";
const MAX_NOTIFICATIONS = 50;

/* ── Helpers ──────────────────────────────────────────────────────── */

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]) {
  localStorage.setItem(
    NOTIF_STORAGE_KEY,
    JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS))
  );
}

export function loadPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: NotificationPreferences) {
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

/* ── Play notification sound ──────────────────────────────────────── */

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* audio not available */
  }
}

/* ── Show browser notification ────────────────────────────────────── */

function showBrowserNotification(title: string, message: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission === "granted") {
    try {
      navigator.serviceWorker?.ready.then((reg) => {
        reg.showNotification(title, {
          body: message,
          icon: "/logo-icon.png",
          badge: "/logo-icon.png",
          tag: "protrade-notification",
        });
      });
    } catch {
      // Fallback to basic notification
      new Notification(title, { body: message, icon: "/logo-icon.png" });
    }
  }
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useNotificationSystem() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setNotifications(loadNotifications());
    setPreferencesState(loadPreferences());
  }, []);

  // Request notification permission after 30s delay on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const asked = localStorage.getItem("protrade_notif_asked");
    if (asked) return;

    const timer = setTimeout(() => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(() => {
          localStorage.setItem("protrade_notif_asked", "true");
        });
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      actionUrl?: string
    ) => {
      const notif: AppNotification = {
        id: generateId(),
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        actionUrl,
      };

      setNotifications((prev) => {
        const next = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(next);
        return next;
      });

      // Play sound if enabled
      const prefs = loadPreferences();
      if (prefs.soundEnabled) {
        playNotificationSound();
      }

      // Show browser notification
      showBrowserNotification(title, message);

      return notif.id;
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotifications(next);
      return next;
    });
  }, []);

  const updatePreferences = useCallback(
    (update: Partial<NotificationPreferences>) => {
      setPreferencesState((prev) => {
        const next = { ...prev, ...update };
        savePreferences(next);
        return next;
      });
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissNotification,
    updatePreferences,
  };
}
