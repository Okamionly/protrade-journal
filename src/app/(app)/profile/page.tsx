"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Clock,
  Flame,
  Award,
  Zap,
  Activity,
  PieChart,
  Star,
  Timer,
  ChevronRight,
  Mail,
  Calendar,
  Key,
  Copy,
  RefreshCw,
  Webhook,
  Package,
  Settings2,
  Hash,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";
import { NotificationSettings } from "@/components/NotificationSettings";

interface TradingStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  totalPnl: number;
  grossPnl: number;
  avgRR: number;
  avgResult: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | null;
  bestWinStreak: number;
  bestLossStreak: number;
  favoriteAssets: { asset: string; count: number; percentage: number }[];
  preferredSession: { session: string; count: number } | null;
  avgHoldingTime: number;
  mostUsedStrategy: { name: string; count: number } | null;
  totalWins: number;
  totalLosses: number;
  activityMap: Record<string, number>;
  bestMonth: { month: string; pnl: number } | null;
  rank: { grade: string; color: string };
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  publicProfile: boolean;
  apiKey: string | null;
  createdAt: string;
  stats: TradingStats;
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

// ── Stat card component ──────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "cyan",
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "cyan" | "green" | "red" | "amber" | "purple" | "blue";
  trend?: "up" | "down" | "neutral";
}) {
  const colorMap = {
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    green: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    red: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
  };
  const iconBgMap = {
    cyan: "bg-cyan-500/20",
    green: "bg-emerald-500/20",
    red: "bg-red-500/20",
    amber: "bg-amber-500/20",
    purple: "bg-purple-500/20",
    blue: "bg-blue-500/20",
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{subValue}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${iconBgMap[color]} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {trend && (
        <div className="absolute top-2 right-2">
          {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
        </div>
      )}
    </div>
  );
}

// ── Role badge component ─────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const config = {
    USER: { icon: User, label: "Free", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    VIP: { icon: Crown, label: "VIP", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    ADMIN: { icon: Shield, label: "Admin", className: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  }[role] || { icon: User, label: role, className: "bg-gray-500/20 text-gray-400 border-gray-500/30" };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// ── Glass card wrapper ───────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl bg-cyan-500/10">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Activity Heatmap (GitHub-style) ──────────────────────────────────
function ActivityHeatmap({ activityMap, totalThisYear }: { activityMap: Record<string, number>; totalThisYear: number }) {
  const weeks = useMemo(() => {
    const today = new Date();
    const result: { date: string; count: number; day: number }[][] = [];
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    let currentWeek: { date: string; count: number; day: number }[] = [];
    const cursor = new Date(start);

    while (cursor <= today) {
      const key = cursor.toISOString().split("T")[0];
      currentWeek.push({
        date: key,
        count: activityMap[key] || 0,
        day: cursor.getDay(),
      });
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [activityMap]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    let lastMonth = -1;
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const cursor = new Date(start);
    let weekIdx = 0;

    while (cursor <= today) {
      const m = cursor.getMonth();
      if (m !== lastMonth && cursor.getDay() === 0) {
        labels.push({ label: monthNames[m], index: weekIdx });
        lastMonth = m;
      }
      if (cursor.getDay() === 6) weekIdx++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return labels;
  }, [activityMap]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    if (count <= 2) return "bg-emerald-300 dark:bg-emerald-700";
    if (count <= 5) return "bg-emerald-500 dark:bg-emerald-500";
    return "bg-emerald-700 dark:bg-emerald-300";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {totalThisYear} trades cette année
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Moins</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-800" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-500" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-700 dark:bg-emerald-300" />
          <span>Plus</span>
        </div>
      </div>
      {/* Month labels */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <div className="flex gap-[3px] ml-8 mb-1">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[10px] text-gray-500 dark:text-gray-400"
                style={{ position: "relative", left: `${m.index * 13}px`, marginRight: `-${(monthLabels[i + 1]?.index ?? weeks.length) - m.index > 4 ? 0 : 8}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] shrink-0 w-6">
              <div className="h-[11px]" />
              <div className="h-[11px] text-[9px] text-gray-500 dark:text-gray-400 flex items-center">Lun</div>
              <div className="h-[11px]" />
              <div className="h-[11px] text-[9px] text-gray-500 dark:text-gray-400 flex items-center">Mer</div>
              <div className="h-[11px]" />
              <div className="h-[11px] text-[9px] text-gray-500 dark:text-gray-400 flex items-center">Ven</div>
              <div className="h-[11px]" />
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-[11px] h-[11px] rounded-sm ${getColor(day.count)} transition-colors hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500 cursor-default`}
                    title={`${day.date}: ${day.count} trade${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trading Preferences (localStorage) ──────────────────────────────
const TRADING_SESSIONS = [
  { value: "london", label: "Londres" },
  { value: "newYork", label: "New York" },
  { value: "asian", label: "Asiatique" },
  { value: "overlap", label: "Overlap" },
];

const DEFAULT_ASSETS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "EURJPY",
  "US30", "NAS100", "SPX500", "BTCUSD", "ETHUSD",
];

// ══════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { t, locale, setLocale } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal info form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  // Delete trades modal
  const [showDeleteTradesModal, setShowDeleteTradesModal] = useState(false);
  const [deletingTrades, setDeletingTrades] = useState(false);

  // API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Preferences
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [savingPublicProfile, setSavingPublicProfile] = useState(false);

  // Trading preferences
  const [defaultAsset, setDefaultAsset] = useState("");
  const [defaultLotSize, setDefaultLotSize] = useState("");
  const [riskPercentage, setRiskPercentage] = useState("");
  const [preferredTradingSession, setPreferredTradingSession] = useState("");

  // Export state
  const [exportingAll, setExportingAll] = useState(false);

  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setName(data.name || "");
          setEmail(data.email || "");
          setBalance(String(data.balance));
          setPublicProfile(data.publicProfile || false);
          setApiKey(data.apiKey || null);
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

    // Trading preferences
    setDefaultAsset(localStorage.getItem("trading-default-asset") || "");
    setDefaultLotSize(localStorage.getItem("trading-default-lotsize") || "");
    setRiskPercentage(localStorage.getItem("trading-risk-pct") || "");
    setPreferredTradingSession(localStorage.getItem("trading-preferred-session") || "");
  }, []);

  // Save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        balance: parseFloat(balance),
      };
      if (editingEmail && email.trim() !== profile?.email) {
        body.email = email.trim();
      }
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, ...data } : prev);
        setEditingName(false);
        setEditingEmail(false);
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

  // Export all data (CSV trades + CSV plans + stats JSON)
  const handleExportAllData = async () => {
    setExportingAll(true);
    try {
      // 1. Export trades CSV
      const tradesRes = await fetch("/api/trades/export");
      if (tradesRes.ok) {
        const blob = await tradesRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketphase-trades-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 500));

      // 2. Export daily plans CSV
      const plansRes = await fetch("/api/daily-plan/export");
      if (plansRes.ok) {
        const blob = await plansRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketphase-plans-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      await new Promise((r) => setTimeout(r, 500));

      // 3. Export stats summary JSON
      if (profile?.stats) {
        const statsData = {
          exportDate: new Date().toISOString(),
          totalTrades: profile.stats.totalTrades,
          winRate: profile.stats.winRate,
          profitFactor: profile.stats.profitFactor,
          totalPnl: profile.stats.totalPnl,
          bestTrade: profile.stats.bestTrade,
          worstTrade: profile.stats.worstTrade,
          bestWinStreak: profile.stats.bestWinStreak,
          bestLossStreak: profile.stats.bestLossStreak,
          avgRR: profile.stats.avgRR,
          avgResult: profile.stats.avgResult,
          favoriteAssets: profile.stats.favoriteAssets,
          bestMonth: profile.stats.bestMonth,
          rank: profile.stats.rank,
        };
        const blob = new Blob([JSON.stringify(statsData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketphase-stats-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast("Toutes les données ont été exportées", "success");
    } catch {
      toast("Erreur lors de l'export", "error");
    } finally {
      setExportingAll(false);
    }
  };

  // Save trading preferences
  const handleSaveTradingPreferences = () => {
    localStorage.setItem("trading-default-asset", defaultAsset);
    localStorage.setItem("trading-default-lotsize", defaultLotSize);
    localStorage.setItem("trading-risk-pct", riskPercentage);
    localStorage.setItem("trading-preferred-session", preferredTradingSession);
    toast("Préférences de trading sauvegardées", "success");
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

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

  // Delete all trades
  const handleDeleteAllTrades = async () => {
    setDeletingTrades(true);
    try {
      const res = await fetch("/api/user/delete-trades", { method: "DELETE" });
      if (res.ok) {
        toast(t("allTradesDeleted"), "success");
        setShowDeleteTradesModal(false);
        // Refresh profile to update stats
        const profileRes = await fetch("/api/user/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }
      } else {
        const data = await res.json();
        toast(data.error || t("deleteError"), "error");
      }
    } catch {
      toast(t("deleteError"), "error");
    } finally {
      setDeletingTrades(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("imageTooLarge"), "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
        localStorage.setItem("user-avatar", data.url);
        toast(t("avatarUpdated"), "success");
      } else {
        // Fallback to local base64 storage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAvatarUrl(base64);
          localStorage.setItem("user-avatar", base64);
          toast(t("avatarUpdated"), "success");
        };
        reader.readAsDataURL(file);
      }
    } catch {
      // Fallback to local base64 storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        localStorage.setItem("user-avatar", base64);
        toast(t("avatarUpdated"), "success");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Theme change
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
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

  // Toggle public profile (leaderboard opt-in)
  const handlePublicProfileToggle = async () => {
    const next = !publicProfile;
    setSavingPublicProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicProfile: next }),
      });
      if (res.ok) {
        setPublicProfile(next);
        toast(
          next
            ? "Vous apparaîtrez dans le classement"
            : "Vous avez été retiré du classement",
          "success"
        );
      } else {
        toast("Erreur lors de la mise à jour", "error");
      }
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    } finally {
      setSavingPublicProfile(false);
    }
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

  // Format holding time
  const formatHoldingTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  // Session label
  const getSessionLabel = (session: string) => {
    const labels: Record<string, string> = {
      asian: t("profileSessionAsian"),
      london: t("profileSessionLondon"),
      newYork: t("profileSessionNewYork"),
      overlap: t("profileSessionOverlap"),
    };
    return labels[session] || session;
  };

  const stats = profile?.stats;

  // Compute total trades this year for heatmap
  const tradesThisYear = useMemo(() => {
    if (!stats?.activityMap) return 0;
    const year = new Date().getFullYear();
    return Object.entries(stats.activityMap)
      .filter(([date]) => date.startsWith(String(year)))
      .reduce((sum, [, count]) => sum + count, 0);
  }, [stats?.activityMap]);

  // Format best month label
  const formatMonth = useCallback((monthStr: string) => {
    const [y, m] = monthStr.split("-");
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("profileLoading")}</p>
        </div>
      </div>
    );
  }

  // Rank color mapping
  const rankColorMap: Record<string, string> = {
    gray: "from-gray-500/20 to-gray-500/5 text-gray-400 border-gray-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    green: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ═══════════════════════════ PAGE HEADER ═══════════════════════════ */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profileTitle")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("profileSubtitle")}
        </p>
      </div>

      {/* ═══════════════════════════ PROFILE HEADER ═══════════════════════════ */}
      <GlassCard className="relative overflow-hidden !p-0">
        {/* Gradient banner (like Twitter profile) */}
        <div className={`h-32 w-full bg-gradient-to-r ${
          profile?.role === "ADMIN" ? "from-rose-600/40 via-pink-500/30 to-rose-600/40"
          : profile?.role === "VIP" ? "from-amber-500/40 via-yellow-400/30 to-amber-500/40"
          : "from-cyan-500/30 via-blue-500/30 to-purple-500/30"
        }`}>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-white/5 dark:to-gray-900/30" />
        </div>

        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-14">
            {/* Avatar — larger, with role ring */}
            <div className="relative group shrink-0">
              <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-xl ring-4 ${
                profile?.role === "ADMIN" ? "ring-rose-500/60 shadow-rose-500/20"
                : profile?.role === "VIP" ? "ring-amber-400/60 shadow-amber-500/20"
                : "ring-cyan-400/40 shadow-cyan-500/20"
              }`}>
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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

            {/* User info */}
            <div className="flex-1 text-center sm:text-left min-w-0 sm:pb-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder={t("yourName")}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { setEditingName(false); handleSaveProfile(); }
                        if (e.key === "Escape") { setEditingName(false); setName(profile?.name || ""); }
                      }}
                    />
                    <button
                      onClick={() => { setEditingName(false); handleSaveProfile(); }}
                      className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setName(profile?.name || ""); }}
                      className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-gray-500/20 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile?.name || t("noName")}
                    </h2>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <RoleBadge role={profile?.role || "USER"} />
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Member since — prominent pill */}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">
                {t("memberSince")} {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(locale === "en" ? "en-US" : locale === "fr" ? "fr-FR" : "en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "--"}
              </span>
            </div>

            {/* Quick stats row */}
            {stats && stats.totalTrades > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-sm">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-gray-500 dark:text-gray-400">{stats.totalTrades} trades</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-gray-500 dark:text-gray-400">{stats.winRate}% {t("winRate")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span className={`${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toFixed(2)} $
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════ TRADING SUMMARY CARD ═══════════════════════════ */}
      {stats && stats.totalTrades > 0 && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
          <div className="relative">
            <SectionHeader icon={Award} title="Résumé de Performance" subtitle="Vue d'ensemble de votre parcours de trading" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total trades */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-center">
                <BarChart3 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrades}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Trades total</p>
              </div>
              {/* Account age */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
                <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.createdAt
                    ? Math.max(1, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    : 0}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Mois d&apos;ancienneté</p>
              </div>
              {/* Best month */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.bestMonth ? `+${stats.bestMonth.pnl.toFixed(0)}` : "N/A"}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
                  {stats.bestMonth ? formatMonth(stats.bestMonth.month) : "Meilleur mois"}
                </p>
              </div>
              {/* Longest win streak */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                <Flame className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.bestWinStreak}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Meilleure série</p>
              </div>
              {/* Favorite asset */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
                <Star className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {stats.favoriteAssets[0]?.asset || "N/A"}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Actif favori</p>
              </div>
              {/* Rank / Grade */}
              <div className={`bg-gradient-to-br ${rankColorMap[stats.rank?.color] || rankColorMap.gray} border rounded-xl p-4 text-center`}>
                <Shield className="w-5 h-5 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rank?.grade || "N/A"}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Rang actuel</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ═══════════════════════════ ACTIVITY HEATMAP ═══════════════════════════ */}
      {stats && stats.activityMap && Object.keys(stats.activityMap).length > 0 && (
        <GlassCard>
          <SectionHeader icon={Activity} title="Activité de Trading" subtitle="Votre historique de trading sur 365 jours" />
          <ActivityHeatmap activityMap={stats.activityMap} totalThisYear={tradesThisYear} />
        </GlassCard>
      )}

      {/* ═══════════════════════════ TRADING STATISTICS ═══════════════════════════ */}
      {stats && stats.totalTrades > 0 && (
        <GlassCard>
          <SectionHeader icon={BarChart3} title={t("profileTradingStats")} subtitle={t("profileTradingStatsDesc")} />

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard
              icon={BarChart3}
              label={t("totalTrades")}
              value={stats.totalTrades}
              subValue={`${stats.totalWins}W / ${stats.totalLosses}L`}
              color="cyan"
            />
            <StatCard
              icon={Target}
              label={t("winRate")}
              value={`${stats.winRate}%`}
              subValue={stats.winRate >= 50 ? t("profileAboveAvg") : t("profileBelowAvg")}
              color={stats.winRate >= 50 ? "green" : "red"}
            />
            <StatCard
              icon={Activity}
              label={t("profitFactor")}
              value={stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2)}
              subValue={stats.profitFactor >= 1.5 ? t("profileExcellent") : stats.profitFactor >= 1 ? t("profileGood") : t("profileNeedsWork")}
              color={stats.profitFactor >= 1.5 ? "green" : stats.profitFactor >= 1 ? "amber" : "red"}
            />
            <StatCard
              icon={TrendingUp}
              label={t("totalPnl")}
              value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`}
              color={stats.totalPnl >= 0 ? "green" : "red"}
            />
            <StatCard
              icon={Award}
              label={t("profileBestTrade")}
              value={`+${stats.bestTrade.toFixed(2)}`}
              color="green"
            />
            <StatCard
              icon={TrendingDown}
              label={t("profileWorstTrade")}
              value={stats.worstTrade.toFixed(2)}
              color="red"
            />
            <StatCard
              icon={PieChart}
              label={t("profileAvgRR")}
              value={stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(1)}` : "N/A"}
              color="purple"
            />
            <StatCard
              icon={Zap}
              label={t("profileAvgResult")}
              value={`${stats.avgResult >= 0 ? "+" : ""}${stats.avgResult.toFixed(2)}`}
              color={stats.avgResult >= 0 ? "blue" : "red"}
            />
          </div>

          {/* Streaks */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className={`p-2 rounded-lg ${stats.currentStreakType === "win" ? "bg-emerald-500/20" : stats.currentStreakType === "loss" ? "bg-red-500/20" : "bg-gray-500/20"}`}>
                <Flame className={`w-5 h-5 ${stats.currentStreakType === "win" ? "text-emerald-400" : stats.currentStreakType === "loss" ? "text-red-400" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("currentStreak")}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.currentStreak > 0
                    ? `${stats.currentStreak} ${stats.currentStreakType === "win" ? t("profileWins") : t("profileLosses")}`
                    : t("noStreak")
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("bestStreakW")}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.bestWinStreak} {t("profileWins")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("worstStreakL")}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.bestLossStreak} {t("profileLosses")}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ═══════════════════════════ TRADING PROFILE ═══════════════════════════ */}
      {stats && stats.totalTrades > 0 && (
        <GlassCard>
          <SectionHeader icon={Star} title={t("profileTradingProfile")} subtitle={t("profileTradingProfileDesc")} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Favorite Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                {t("profileFavoriteAssets")}
              </h3>
              <div className="space-y-2">
                {stats.favoriteAssets.length > 0 ? stats.favoriteAssets.map((item, i) => (
                  <div key={item.asset} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-500 w-5">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.asset}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.count} trades ({item.percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 dark:text-gray-500">{t("noData")}</p>
                )}
              </div>
            </div>

            {/* Trading Details */}
            <div className="space-y-4">
              {/* Preferred Session */}
              <div className="bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("profilePreferredSession")}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.preferredSession ? getSessionLabel(stats.preferredSession.session) : "N/A"}
                </p>
                {stats.preferredSession && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stats.preferredSession.count} trades
                  </p>
                )}
              </div>

              {/* Average Holding Time */}
              <div className="bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("profileAvgHoldingTime")}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.avgHoldingTime > 0 ? formatHoldingTime(stats.avgHoldingTime) : "N/A"}
                </p>
              </div>

              {/* Most Used Strategy */}
              <div className="bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("profileMostUsedStrategy")}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.mostUsedStrategy ? stats.mostUsedStrategy.name : "N/A"}
                </p>
                {stats.mostUsedStrategy && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stats.mostUsedStrategy.count} trades
                  </p>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ═══════════════════════════ ACCOUNT SETTINGS ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={User} title={t("profileAccountSettings")} subtitle={t("profileAccountSettingsDesc")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("profileName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder={t("yourName")}
            />
          </div>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEditingEmail(true); }}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder="email@example.com"
              />
              {editingEmail && email !== profile?.email && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                </span>
              )}
            </div>
          </div>
          {/* Initial Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("initialBalance")}</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="25000"
              min="0"
              step="100"
            />
          </div>
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("preferredCurrency")}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-white dark:bg-gray-900">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {/* Timezone */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("timezone")}</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-white dark:bg-gray-900">
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
      </GlassCard>

      {/* ═══════════════════════════ SECURITY ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Lock} title={t("security")} subtitle={t("profileSecurityDesc")} />
        <div className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("currentPassword")}</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
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
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
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
            {/* Password strength indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= level * 3
                          ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-amber-400" : level <= 3 ? "bg-emerald-400" : "bg-cyan-400"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {newPassword.length < 6 ? t("profilePasswordWeak") : newPassword.length < 9 ? t("profilePasswordMedium") : t("profilePasswordStrong")}
                </p>
              </div>
            )}
          </div>
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t("confirmPassword")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder={t("confirmPasswordPlaceholder")}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">{t("passwordMismatch")}</p>
            )}
            {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {t("profilePasswordsMatch")}
              </p>
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
      </GlassCard>

      {/* ═══════════════════════════ VIP SUBSCRIPTION ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Crown} title={t("subscription")} />

        {profile?.role === "USER" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400">{t("noActiveSubscription")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {t("upgradeToVip")}
              </p>
            </div>
            <a
              href="/vip"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20 group shrink-0"
            >
              <Crown className="w-4 h-4" />
              {t("becomeVip")}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        )}

        {profile?.role === "VIP" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-amber-500/30">
                <Crown className="w-4 h-4" />
                {t("vipMember")}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>{t("expirationDate")} : <span className="text-gray-300">--/--/----</span></p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition">
              {t("manageSubscription")}
            </button>
          </div>
        )}

        {profile?.role === "ADMIN" && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-rose-500/30">
              <Shield className="w-4 h-4" />
              {t("administrator")}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("adminFullAccess")}</p>
          </div>
        )}
      </GlassCard>

      {/* ═══════════════════════════ PREFERENCES ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Globe} title={t("preferences")} subtitle={t("profilePreferencesDesc")} />
        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("defaultTheme")}</label>
            <div className="flex gap-2 flex-wrap">
              {THEMES.map((themeItem) => {
                const Icon = themeItem.icon;
                return (
                  <button
                    key={themeItem.value}
                    onClick={() => handleThemeChange(themeItem.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      theme === themeItem.value
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                        : "bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-300"
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
                value={locale}
                onChange={(e) => setLocale(e.target.value as "fr" | "en" | "ar" | "es" | "de")}
                className="bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              >
                <option value="fr" className="bg-white dark:bg-gray-900">Francais</option>
                <option value="en" className="bg-white dark:bg-gray-900">English</option>
                <option value="es" className="bg-white dark:bg-gray-900">Espanol</option>
                <option value="de" className="bg-white dark:bg-gray-900">Deutsch</option>
                <option value="ar" className="bg-white dark:bg-gray-900">العربية</option>
              </select>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <Globe className="w-3.5 h-3.5" />
                {t("profileLanguageAutoDetect")}
              </span>
            </div>
          </div>

          {/* Notifications -- full settings panel */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t("notifications")}</p>
            <NotificationSettings />
          </div>

          {/* Public profile / Leaderboard opt-in */}
          <div className="flex items-center justify-between py-1">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Apparaître dans le classement
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                Vos statistiques anonymisées seront visibles dans le classement communautaire
              </p>
            </div>
            <button
              onClick={handlePublicProfileToggle}
              disabled={savingPublicProfile}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 flex-shrink-0 ml-4 ${
                publicProfile ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  publicProfile ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════ TRADING PREFERENCES ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Settings2} title="Préférences de Trading" subtitle="Valeurs par défaut pour vos formulaires de trade" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Asset */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Actif par défaut
            </label>
            <select
              value={defaultAsset}
              onChange={(e) => setDefaultAsset(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              <option value="" className="bg-white dark:bg-gray-900">Aucun</option>
              {DEFAULT_ASSETS.map((a) => (
                <option key={a} value={a} className="bg-white dark:bg-gray-900">{a}</option>
              ))}
            </select>
          </div>
          {/* Default Lot Size */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              Taille de lot par défaut
            </label>
            <input
              type="number"
              value={defaultLotSize}
              onChange={(e) => setDefaultLotSize(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="0.01"
              min="0.01"
              step="0.01"
            />
          </div>
          {/* Risk Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-red-400" />
              Risque par trade (%)
            </label>
            <input
              type="number"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="1"
              min="0.1"
              max="10"
              step="0.1"
            />
          </div>
          {/* Preferred Trading Session */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Session préférée
            </label>
            <select
              value={preferredTradingSession}
              onChange={(e) => setPreferredTradingSession(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            >
              <option value="" className="bg-white dark:bg-gray-900">Aucune préférence</option>
              {TRADING_SESSIONS.map((s) => (
                <option key={s.value} value={s.value} className="bg-white dark:bg-gray-900">{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Stocké localement sur votre navigateur
          </p>
          <button
            onClick={handleSaveTradingPreferences}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>
      </GlassCard>

      {/* ═══════════════════════════ DATA & PRIVACY ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Download} title={t("dataPrivacy")} subtitle={t("profileDataPrivacyDesc")} />
        <div className="space-y-4">
          {/* Export ALL data */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                Exporter toutes mes données
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Télécharge vos trades (CSV), plans journaliers (CSV) et statistiques (JSON)
              </p>
            </div>
            <button
              onClick={handleExportAllData}
              disabled={exportingAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20 shrink-0"
            >
              {exportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Tout exporter
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800" />

          {/* Export JSON */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exportMyData")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {t("exportMyDataDesc")}
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800" />

          {/* Export CSV */}
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
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800" />

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
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              <Upload className="w-4 h-4" />
              {t("importCsv")}
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════ API KEY ═══════════════════════════ */}
      <GlassCard>
        <SectionHeader icon={Key} title={t("profileApiKeyTitle")} subtitle={t("profileApiKeyDesc")} />
        <div className="space-y-4">
          {/* Current key display */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
              {apiKey
                ? `mp_****${apiKey.slice(-4)}`
                : t("profileApiKeyNone")}
            </div>
            {apiKey && (
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(apiKey);
                  setKeyCopied(true);
                  toast(t("profileApiKeyCopied"), "success");
                  setTimeout(() => setKeyCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                {keyCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {t("profileApiKeyCopy")}
              </button>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={async () => {
              setGeneratingKey(true);
              try {
                const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                const newKey = `mp_${hex}`;
                const res = await fetch("/api/user/profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ apiKey: newKey }),
                });
                if (res.ok) {
                  setApiKey(newKey);
                  toast(t("profileApiKeyGenerated"), "success");
                } else {
                  toast(t("profileApiKeyError"), "error");
                }
              } catch {
                toast(t("profileApiKeyError"), "error");
              } finally {
                setGeneratingKey(false);
              }
            }}
            disabled={generatingKey}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition disabled:opacity-50"
          >
            {generatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t("profileApiKeyGenerate")}
          </button>

          {/* Link to docs */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Webhook className="w-4 h-4" />
            <Link href="/webhook-docs" className="underline hover:text-cyan-400 transition">
              {t("profileApiKeyDocsLink")}
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════ DANGER ZONE ═══════════════════════════ */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-red-300 dark:border-red-900/50 rounded-2xl p-6">
        <SectionHeader icon={AlertTriangle} title={t("profileDangerZone")} subtitle={t("profileDangerZoneDesc")} />
        <div className="space-y-4">
          {/* Delete all trades */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("profileDeleteAllTrades")}</p>
              <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">
                {t("profileDeleteAllTradesDesc")}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteTradesModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              {t("profileDeleteTrades")}
            </button>
          </div>

          {/* Delete account */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("deleteMyAccount")}</p>
              <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">
                {t("deleteMyAccountDesc")}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              {t("delete")}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ DELETE TRADES MODAL ═══════════════════════════ */}
      {showDeleteTradesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("profileDeleteAllTradesTitle")}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t("profileDeleteAllTradesConfirm")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteTradesModal(false)}
                className="px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteAllTrades}
                disabled={deletingTrades}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingTrades ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t("profileDeleteTrades")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════ DELETE ACCOUNT MODAL ═══════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
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
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {t("profileTypeDeleteToConfirm")}
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                placeholder='DELETE'
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
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
