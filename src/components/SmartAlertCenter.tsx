"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

interface SmartAlert {
  id: string;
  message: string;
  icon: string;
  type: "danger" | "warning" | "success" | "info";
  priority: number;
}

const DISMISS_DURATION_MS = 4 * 60 * 60 * 1000; // 4 heures

function getDismissKey(alertId: string): string {
  return `smart-alert-dismissed-${alertId}`;
}

function isDismissed(alertId: string): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(getDismissKey(alertId));
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  return Date.now() - ts < DISMISS_DURATION_MS;
}

function dismissAlert(alertId: string): void {
  localStorage.setItem(getDismissKey(alertId), String(Date.now()));
}

const ALERT_STYLES: Record<SmartAlert["type"], { bg: string; border: string; text: string }> = {
  danger: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    text: "#f87171",
  },
  warning: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    text: "#fbbf24",
  },
  success: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    text: "#34d399",
  },
  info: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    text: "#60a5fa",
  },
};

interface Props {
  trades: Trade[];
  balance: number;
}

export function SmartAlertCenter({ trades, balance }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [vix, setVix] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger le VIX
  useEffect(() => {
    fetch("/api/market-data/vix")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vix?.current) setVix(data.vix.current);
      })
      .catch(() => {});
  }, []);

  const alerts = useMemo<SmartAlert[]>(() => {
    const result: SmartAlert[] = [];
    const sorted = [...trades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 1. 3 pertes consecutives
    if (sorted.length >= 3) {
      const last3 = sorted.slice(0, 3);
      if (last3.every((t) => t.result < 0)) {
        result.push({
          id: "consecutive-losses",
          message: "3 pertes consécutives — Prenez une pause",
          icon: "\u{1F534}",
          type: "danger",
          priority: 100,
        });
      }
    }

    // 2. Limite de risque quotidien (perte > 2% du solde)
    if (balance > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTrades = trades.filter(
        (t) => new Date(t.date).toISOString().slice(0, 10) === todayStr
      );
      const todayLoss = todayTrades.reduce((s, t) => s + t.result, 0);
      if (todayLoss < 0 && Math.abs(todayLoss) > balance * 0.02) {
        result.push({
          id: "daily-risk-limit",
          message: "Vous approchez votre limite de risque quotidien",
          icon: "\u{1F7E1}",
          type: "warning",
          priority: 90,
        });
      }
    }

    // 3. Serie de 5+ victoires
    if (sorted.length >= 5) {
      let winStreak = 0;
      for (const t of sorted) {
        if (t.result > 0) winStreak++;
        else break;
      }
      if (winStreak >= 5) {
        result.push({
          id: "win-streak-overconfidence",
          message: `Série de ${winStreak} victoires — Attention à l\u2019excès de confiance`,
          icon: "\u{1F7E2}",
          type: "success",
          priority: 70,
        });
      }
    }

    // 4. Meilleure heure approche (14h-16h)
    const hour = new Date().getHours();
    if (hour >= 13 && hour < 16) {
      result.push({
        id: "golden-hours",
        message: "Votre meilleure heure approche (14h-16h)",
        icon: "\u{1F4CA}",
        type: "info",
        priority: 40,
      });
    }

    // 5. VIX > 25
    if (vix !== null && vix > 25) {
      result.push({
        id: "vix-high",
        message: `VIX > 25 (${vix.toFixed(1)}) — Réduisez vos positions`,
        icon: "\u{1F30A}",
        type: "danger",
        priority: 80,
      });
    }

    // Trier par priorite et garder max 2
    result.sort((a, b) => b.priority - a.priority);
    return result.slice(0, 2);
  }, [trades, balance, vix]);

  // Initialiser les alertes deja masquees
  useEffect(() => {
    if (!mounted) return;
    const dismissed = new Set<string>();
    for (const a of alerts) {
      if (isDismissed(a.id)) dismissed.add(a.id);
    }
    setDismissedIds(dismissed);
  }, [alerts, mounted]);

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId);
    setDismissedIds((prev) => new Set(prev).add(alertId));
  };

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (!mounted || visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.map((alert) => {
        const style = ALERT_STYLES[alert.type];
        return (
          <div
            key={alert.id}
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base flex-shrink-0">{alert.icon}</span>
              <span
                className="text-sm font-medium truncate"
                style={{ color: style.text }}
              >
                {alert.message}
              </span>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" style={{ color: style.text }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
