"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { signOut } from "next-auth/react";
import {
  User,
  Camera,
  Pencil,
  Save,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  X,
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  BellOff,
  Check,
  Loader2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  createdAt: string;
}

const CURRENCIES = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - Dollar US" },
  { value: "GBP", label: "GBP - Livre Sterling" },
  { value: "CHF", label: "CHF - Franc Suisse" },
];

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (UTC+1/+2)" },
  { value: "Europe/London", label: "Londres (UTC+0/+1)" },
  { value: "Europe/Zurich", label: "Zurich (UTC+1/+2)" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1/+2)" },
  { value: "America/New_York", label: "New York (UTC-5/-4)" },
  { value: "America/Chicago", label: "Chicago (UTC-6/-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/-7)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/+11)" },
];

const THEMES = [
  { value: "dark", labelKey: "themeDark", icon: Moon },
  { value: "light", labelKey: "themeLight", icon: Sun },
  { value: "oled", labelKey: "themeOled", icon: Monitor },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal info form
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [editingName, setEditingName] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Preferences
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);

  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setName(data.name || "");
          setBalance(String(data.balance));
        }
      } catch {
        toast(t("profileLoadError"), "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const savedCurrency = localStorage.getItem("preferred-currency") || "EUR";
    const savedTimezone = localStorage.getItem("preferred-timezone") || "Europe/Paris";
    const savedNotifications = localStorage.getItem("notifications") !== "false";
    const savedAvatar = localStorage.getItem("user-avatar");

    setTheme(savedTheme);
    setCurrency(savedCurrency);
    setTimezone(savedTimezone);
    setNotifications(savedNotifications);
    if (savedAvatar) setAvatarUrl(savedAvatar);
  }, []);

  // Save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          balance: parseFloat(balance),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditingName(false);
        // Save preferences to localStorage
        localStorage.setItem("preferred-currency", currency);
        localStorage.setItem("preferred-timezone", timezone);
        toast(t("profileUpdated"), "success");
      } else {
        const err = await res.json();
        toast(err.error || t("profileUpdateError"), "error");
      }
    } catch {
      toast(t("profileUpdateError"), "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast(t("passwordMismatch"), "error");
      return;
    }
    if (newPassword.length < 6) {
      toast(t("passwordTooShort"), "error");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(t("passwordChanged"), "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast(data.error || t("passwordChangeError"), "error");
      }
    } catch {
      toast(t("passwordChangeError"), "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const res = await fetch("/api/user/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketphase-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast(t("dataExported"), "success");
      } else {
        toast(t("exportError"), "error");
      }
    } catch {
      toast(t("exportError"), "error");
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t("deleteConfirmWord")) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (res.ok) {
        toast(t("accountDeleted"), "success");
        await signOut({ callbackUrl: "/login" });
      } else {
        const data = await res.json();
        toast(data.error || t("deleteError"), "error");
      }
    } catch {
      toast(t("deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("imageTooLarge"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      localStorage.setItem("user-avatar", base64);
      toast(t("avatarUpdated"), "success");
    };
    reader.readAsDataURL(file);
  };

  // Theme change
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // Apply theme to document
    document.documentElement.classList.remove("light", "dark", "oled");
    document.documentElement.classList.add(newTheme === "oled" ? "dark" : newTheme);
    if (newTheme === "oled") {
      document.documentElement.setAttribute("data-theme", "oled");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  // Toggle notifications
  const handleNotificationsToggle = () => {
    const next = !notifications;
    setNotifications(next);
    localStorage.setItem("notifications", String(next));
    toast(next ? t("notificationsEnabled") : t("notificationsDisabled"), "info");
  };

  // Get user initials
  const getInitials = () => {
    if (!profile?.name) return profile?.email?.charAt(0).toUpperCase() || "?";
    return profile.name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profileTitle")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("profileSubtitle")}
        </p>
      </div>

      {/* ═══════════════════════════ PHOTO DE PROFIL ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("profilePhoto")}</h2>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg shadow-cyan-500/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {/* Name + Edit */}
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder={t("yourName")}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setEditingName(false);
                    handleSaveProfile();
                  }}
                  className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setName(profile?.name || "");
                  }}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-[var(--bg-hover)] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {profile?.name || t("noName")}
                </span>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-[var(--bg-hover)] transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t("memberSince")} {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ INFORMATIONS PERSONNELLES ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("personalInfo")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("profileName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder={t("yourName")}
            />
          </div>
          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email || ""}
              readOnly
              className="w-full bg-gray-100 dark:bg-[var(--bg-hover)] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-gray-500 dark:text-gray-500 cursor-not-allowed"
            />
          </div>
          {/* Balance initiale */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("initialBalance")}</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="25000"
              min="0"
              step="100"
            />
          </div>
          {/* Devise */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("preferredCurrency")}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-gray-900">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {/* Fuseau horaire */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("timezone")}</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-gray-900">
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Save button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("save")}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ SÉCURITÉ ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          {t("security")}
        </h2>
        <div className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("currentPassword")}</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder={t("currentPasswordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("newPassword")}</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder={t("newPasswordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("confirmPassword")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder={t("confirmPasswordPlaceholder")}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">{t("passwordMismatch")}</p>
            )}
          </div>
          {/* Submit */}
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {t("changePassword")}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ ABONNEMENT VIP ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("subscription")}</h2>

        {profile?.role === "USER" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400">{t("noActiveSubscription")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {t("upgradeToVip")}
              </p>
            </div>
            <a
              href="/vip"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20"
            >
              <Crown className="w-4 h-4" />
              {t("becomeVip")}
            </a>
          </div>
        )}

        {profile?.role === "VIP" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                {t("vipMember")}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>{t("expirationDate")} : <span className="text-gray-300">--/--/----</span></p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-[var(--bg-hover)] transition">
              {t("manageSubscription")}
            </button>
          </div>
        )}

        {profile?.role === "ADMIN" && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              {t("administrator")}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("adminFullAccess")}</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════ PRÉFÉRENCES ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("preferences")}</h2>
        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("defaultTheme")}</label>
            <div className="flex gap-2">
              {THEMES.map((themeItem) => {
                const Icon = themeItem.icon;
                return (
                  <button
                    key={themeItem.value}
                    onClick={() => handleThemeChange(themeItem.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      theme === themeItem.value
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-[var(--bg-hover)] hover:text-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(themeItem.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("language")}</label>
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              >
                <option value="fr" className="bg-gray-900">Français</option>
              </select>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <Globe className="w-3.5 h-3.5" />
                {t("moreLanguagesSoon")}
              </span>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("notifications")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{t("notificationsDesc")}</p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ DONNÉES & CONFIDENTIALITÉ ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("dataPrivacy")}</h2>
        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exportMyData")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {t("exportMyDataDesc")}
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-[var(--bg-hover)] transition"
            >
              <Download className="w-4 h-4" />
              {t("export")}
            </button>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 dark:border-white/10" />

          {/* Export CSV trades */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exportCsvTrades")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {t("exportCsvTradesDesc")}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/trades/export");
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "marketphase-export.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast(t("csvExported"), "success");
                  }
                } catch {
                  toast(t("exportError"), "error");
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-[var(--bg-hover)] transition"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 dark:border-white/10" />

          {/* Import CSV */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("importCsvTrades")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {t("importCsvTradesDesc")}
              </p>
            </div>
            <Link
              href="/import"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-[var(--bg-hover)] transition"
            >
              <Upload className="w-4 h-4" />
              {t("importCsv")}
            </Link>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 dark:border-white/10" />

          {/* Delete account */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">{t("deleteMyAccount")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {t("deleteMyAccountDesc")}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              {t("delete")}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ DELETE MODAL ═══════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("deleteAccountTitle")}</h3>
            </div>
            <div className="space-y-3 mb-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("deleteAccountWillDelete")}
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>{t("deleteAccountItem1")}</li>
                <li>{t("deleteAccountItem2")}</li>
                <li>{t("deleteAccountItem3")}</li>
                <li>{t("deleteAccountItem4")}</li>
                <li>{t("deleteAccountItem5")}</li>
              </ul>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400 font-medium">
                  {t("deleteAccountTypeConfirm")}
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                placeholder={t("deleteAccountPlaceholder")}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-[var(--bg-hover)] transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== t("deleteConfirmWord") || deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t("deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
