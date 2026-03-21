"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Clock,
  Calendar,
  MessageSquare,
  Trophy,
  TrendingUp,
  Volume2,
  VolumeX,
  Shield,
  BookOpen,
} from "lucide-react";
import {
  type NotificationPreferences,
  loadPreferences,
  savePreferences,
} from "@/hooks/useNotifications";

/* ── Toggle switch ────────────────────────────────────────────────── */

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-cyan-500" : "bg-gray-400 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── Setting row ──────────────────────────────────────────────────── */

function SettingRow({
  icon: Icon,
  iconColor,
  title,
  description,
  enabled,
  onChange,
  extra,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.005]"
      style={{
        background: "var(--bg-card, rgba(255,255,255,0.05))",
        borderColor: "var(--border)",
      }}
    >
      <div
        className={`shrink-0 p-2.5 rounded-xl ${iconColor}`}
        style={{ background: "var(--bg-secondary)" }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
        {extra && <div className="mt-2">{extra}</div>}
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setPrefs(loadPreferences());
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (!prefs) return null;

  const update = (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
  };

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  return (
    <div className="space-y-4">
      {/* Browser permission banner */}
      {permission !== "granted" && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            background: "var(--bg-card, rgba(255,255,255,0.05))",
            borderColor: "var(--border)",
          }}
        >
          <div className="shrink-0 p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Notifications navigateur
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {permission === "denied"
                ? "Les notifications sont bloquees. Modifiez les parametres de votre navigateur."
                : "Autorisez les notifications push pour recevoir des alertes en temps reel."}
            </p>
          </div>
          {permission === "default" && (
            <button
              onClick={requestPermission}
              className="shrink-0 px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 transition"
            >
              Autoriser
            </button>
          )}
        </div>
      )}

      {/* Daily Bias Reminder */}
      <SettingRow
        icon={Clock}
        iconColor="text-cyan-400"
        title="Rappel Daily Bias"
        description="Recevoir un rappel pour remplir votre biais quotidien"
        enabled={prefs.dailyBiasReminder}
        onChange={(v) => update({ dailyBiasReminder: v })}
        extra={
          prefs.dailyBiasReminder ? (
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Heure :
              </span>
              <input
                type="time"
                value={prefs.dailyBiasTime}
                onChange={(e) => update({ dailyBiasTime: e.target.value })}
                className="px-2 py-1 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-cyan-500"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          ) : undefined
        }
      />

      {/* Economic Calendar */}
      <SettingRow
        icon={Calendar}
        iconColor="text-amber-400"
        title="Alertes calendrier economique"
        description="Etre alerte avant les annonces economiques majeures"
        enabled={prefs.economicCalendarAlerts}
        onChange={(v) => update({ economicCalendarAlerts: v })}
      />

      {/* Trade Review Reminder */}
      <SettingRow
        icon={BookOpen}
        iconColor="text-emerald-400"
        title="Rappel revue des trades"
        description="Revoir vos trades en fin de journee"
        enabled={prefs.tradeReviewReminder}
        onChange={(v) => update({ tradeReviewReminder: v })}
      />

      {/* Chat Mentions */}
      <SettingRow
        icon={MessageSquare}
        iconColor="text-blue-400"
        title="Mentions dans le chat"
        description="Etre notifie quand quelqu'un vous mentionne"
        enabled={prefs.chatMentions}
        onChange={(v) => update({ chatMentions: v })}
      />

      {/* Achievement Unlocked */}
      <SettingRow
        icon={Trophy}
        iconColor="text-yellow-400"
        title="Badges debloques"
        description="Notification quand vous debloquez un nouveau badge"
        enabled={prefs.achievementUnlocked}
        onChange={(v) => update({ achievementUnlocked: v })}
      />

      {/* Price Alerts */}
      <SettingRow
        icon={TrendingUp}
        iconColor="text-rose-400"
        title="Alertes de prix"
        description="Recevoir des alertes quand un actif atteint votre niveau cible"
        enabled={prefs.priceAlerts}
        onChange={(v) => update({ priceAlerts: v })}
      />

      {/* Sound */}
      <SettingRow
        icon={prefs.soundEnabled ? Volume2 : VolumeX}
        iconColor="text-purple-400"
        title="Son de notification"
        description="Jouer un son lors de la reception d'une notification"
        enabled={prefs.soundEnabled}
        onChange={(v) => update({ soundEnabled: v })}
      />
    </div>
  );
}
