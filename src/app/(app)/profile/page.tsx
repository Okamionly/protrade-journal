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
} from "lucide-react";

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
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "light", label: "Clair", icon: Sun },
  { value: "oled", label: "OLED", icon: Monitor },
];

export default function ProfilePage() {
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
        toast("Erreur lors du chargement du profil", "error");
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
        toast("Profil mis à jour avec succès", "success");
      } else {
        const err = await res.json();
        toast(err.error || "Erreur lors de la mise à jour", "error");
      }
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast("Les mots de passe ne correspondent pas", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("Le mot de passe doit contenir au moins 6 caractères", "error");
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
        toast("Mot de passe modifié avec succès", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast(data.error || "Erreur lors du changement de mot de passe", "error");
      }
    } catch {
      toast("Erreur lors du changement de mot de passe", "error");
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
        toast("Données exportées avec succès", "success");
      } else {
        toast("Erreur lors de l'exportation", "error");
      }
    } catch {
      toast("Erreur lors de l'exportation", "error");
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") return;

    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (res.ok) {
        toast("Compte supprimé", "success");
        await signOut({ callbackUrl: "/login" });
      } else {
        const data = await res.json();
        toast(data.error || "Erreur lors de la suppression", "error");
      }
    } catch {
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast("L'image ne doit pas dépasser 2 Mo", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      localStorage.setItem("user-avatar", base64);
      toast("Photo de profil mise à jour", "success");
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
    toast(next ? "Notifications activées" : "Notifications désactivées", "info");
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil & Paramètres</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos informations personnelles, votre sécurité et vos préférences.
        </p>
      </div>

      {/* ═══════════════════════════ PHOTO DE PROFIL ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photo de Profil</h2>
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
                  placeholder="Votre nom"
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
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {profile?.name || "Sans nom"}
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
              Membre depuis {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ INFORMATIONS PERSONNELLES ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations Personnelles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="Votre nom"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Balance initiale</label>
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Devise préférée</label>
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Fuseau horaire</label>
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
            Enregistrer
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ SÉCURITÉ ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          Sécurité
        </h2>
        <div className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder="Votre mot de passe actuel"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder="Nouveau mot de passe (6+ caractères)"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="Confirmer le nouveau mot de passe"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          {/* Submit */}
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Changer le mot de passe
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ ABONNEMENT VIP ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Abonnement</h2>

        {profile?.role === "USER" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Aucun abonnement actif</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Passez au VIP pour débloquer toutes les fonctionnalités avancées.
              </p>
            </div>
            <a
              href="/vip"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20"
            >
              <Crown className="w-4 h-4" />
              Devenir VIP
            </a>
          </div>
        )}

        {profile?.role === "VIP" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                Membre VIP
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Date d'expiration : <span className="text-gray-300">--/--/----</span></p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition">
              Gérer mon abonnement
            </button>
          </div>
        )}

        {profile?.role === "ADMIN" && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Administrateur
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Accès complet à toutes les fonctionnalités.</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════ PRÉFÉRENCES ═══════════════════════════ */}
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Préférences</h2>
        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Thème par défaut</label>
            <div className="flex gap-2">
              {THEMES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      theme === t.value
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Langue</label>
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
                D'autres langues seront disponibles prochainement.
              </span>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Recevoir des alertes et rappels.</p>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Données & Confidentialité</h2>
        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Exporter mes données</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                Télécharger un fichier JSON contenant tous vos trades et données.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 dark:border-white/10" />

          {/* Delete account */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">Supprimer mon compte</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer votre compte</h3>
            </div>
            <div className="space-y-3 mb-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cette action supprimera définitivement :
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Tous vos trades et screenshots</li>
                <li>Vos stratégies et tags</li>
                <li>Vos plans quotidiens et objectifs</li>
                <li>Vos messages dans le chat</li>
                <li>Toutes vos données personnelles</li>
              </ul>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400 font-medium">
                  Tapez SUPPRIMER pour confirmer la suppression de votre compte.
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                placeholder="Tapez SUPPRIMER"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "SUPPRIMER" || deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
