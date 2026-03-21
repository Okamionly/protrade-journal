"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";
import {
  Users,
  BarChart3,
  Activity,
  Crown,
  Shield,
  ShieldCheck,
  TrendingUp,
  Download,
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  UserPlus,
  Megaphone,
  Wrench,
  RefreshCw,
  AlertTriangle,
  Clock,
  Loader2,
  X,
} from "lucide-react";

/* ──────────────── Types ──────────────── */

interface Stats {
  totalUsers: number;
  totalTrades: number;
  vipCount: number;
  adminCount: number;
  newUsersThisWeek: number;
  activeUsersToday: number;
  recentSignups: { id: string; name: string | null; email: string; createdAt: string }[];
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  createdAt: string;
  tradeCount: number;
}

interface UsersResponse {
  users: UserData[];
  total: number;
  page: number;
  totalPages: number;
}

/* ──────────────── Main Component ──────────────── */

export function AdminDashboard() {
  const { t } = useTranslation();

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users
  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Quick actions
  const [expandedActions, setExpandedActions] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      /* silent */
    }
    setStatsLoading(false);
  }, []);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setUsersData(await res.json());
    } catch {
      /* silent */
    }
    setUsersLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Debounced search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ──── Handlers ──── */

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersData((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.map((u) =>
                  u.id === userId ? { ...u, role: newRole } : u
                ),
              }
            : prev
        );
        fetchStats();
      }
    } catch {
      /* silent */
    }
    setUpdatingRole(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        fetchUsers();
        fetchStats();
      }
    } catch {
      /* silent */
    }
    setDeletingUser(null);
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage("");
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      setSeedMessage(data.message || t("adminSeedDone"));
      fetchStats();
      fetchUsers();
    } catch {
      setSeedMessage(t("adminSeedError"));
    }
    setSeeding(false);
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/admin/users?limit=10000");
      if (!res.ok) return;
      const data = await res.json();
      const allUsers: UserData[] = data.users;
      const headers = [
        t("adminUserName"),
        "Email",
        t("adminRole"),
        "Trades",
        "Balance",
        t("adminRegisteredAt"),
      ];
      const rows = allUsers.map((u) => [
        `"${(u.name || t("adminNoName")).replace(/"/g, '""')}"`,
        u.email,
        u.role,
        u.tradeCount,
        u.balance.toFixed(2),
        formatDate(u.createdAt),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  /* ──── Helpers ──── */

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      VIP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      USER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return map[role] || map.USER;
  };

  const roleIcon = (role: string) => {
    if (role === "ADMIN") return <ShieldCheck className="w-3 h-3" />;
    if (role === "VIP") return <Crown className="w-3 h-3" />;
    return null;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const avatarGradient = (id: string) => {
    const gradients = [
      "from-cyan-500 to-blue-600",
      "from-purple-500 to-pink-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
      "from-indigo-500 to-violet-600",
    ];
    const idx = id.charCodeAt(0) % gradients.length;
    return gradients[idx];
  };

  /* ──── Render ──── */

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("adminPanel")}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("adminManage")}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchUsers();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          {t("adminRefresh")}
        </button>
      </div>

      {/* ─── Stats Cards ─── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-4 animate-pulse"
            >
              <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label={t("adminTotalUsers")}
            value={stats.totalUsers}
            icon={<Users className="w-5 h-5 text-blue-400" />}
            iconBg="bg-blue-500/20"
          />
          <StatCard
            label={t("adminTotalTrades")}
            value={stats.totalTrades}
            icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
          />
          <StatCard
            label={t("adminNewUsersWeek")}
            value={stats.newUsersThisWeek}
            subtitle={t("adminLast7Days")}
            icon={<UserPlus className="w-5 h-5 text-cyan-400" />}
            iconBg="bg-cyan-500/20"
          />
          <StatCard
            label={t("adminActiveToday")}
            value={stats.activeUsersToday}
            subtitle={t("adminTodayActivity")}
            icon={<Activity className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
          />
          <StatCard
            label={t("adminVipSubscribers")}
            value={stats.vipCount}
            icon={<Crown className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
          />
          <StatCard
            label={t("adminTotalAdmins")}
            value={stats.adminCount}
            icon={<ShieldCheck className="w-5 h-5 text-rose-400" />}
            iconBg="bg-rose-500/20"
          />
        </div>
      ) : null}

      {/* ─── User Management Table ─── */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Users className="w-5 h-5 text-blue-400" />
            {t("adminUserList", { count: usersData?.total ?? 0 })}
          </h2>
          {/* Search */}
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("adminSearchUsers")}
              className="pl-9 pr-8 py-2 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : usersData && usersData.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left border-b"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th className="pb-3 font-medium">{t("adminUserName")}</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">{t("adminRole")}</th>
                    <th className="pb-3 font-medium text-center">Trades</th>
                    <th className="pb-3 font-medium">{t("adminRegisteredAt")}</th>
                    <th className="pb-3 font-medium text-right">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {/* Avatar + Name */}
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                              user.id
                            )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
                          >
                            {getInitials(user.name, user.email)}
                          </div>
                          <span
                            className="font-medium truncate max-w-[140px]"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {user.name || (
                              <span style={{ color: "var(--text-muted)" }}>
                                {t("adminNoName")}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td
                        className="py-3 pr-2 truncate max-w-[200px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {user.email}
                      </td>

                      {/* Role badge */}
                      <td className="py-3 pr-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge(
                            user.role
                          )}`}
                        >
                          {roleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>

                      {/* Trades count */}
                      <td
                        className="py-3 pr-2 text-center font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.tradeCount}
                      </td>

                      {/* Join date */}
                      <td
                        className="py-3 pr-2 text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            disabled={updatingRole === user.id}
                            className="text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50"
                            style={{
                              background: "var(--bg-secondary)",
                              borderColor: "var(--border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            <option value="USER">USER</option>
                            <option value="VIP">VIP</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          {confirmDelete === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingUser === user.id}
                                className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-50"
                              >
                                {deletingUser === user.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  t("adminConfirmYes")
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-500/20 transition"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {t("cancel")}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title={t("adminDeleteUser")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("adminShowingPage", {
                    page: usersData.page,
                    total: usersData.totalPages,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border transition hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
                  </button>
                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(5, usersData.totalPages) },
                    (_, i) => {
                      const start = Math.max(
                        1,
                        Math.min(page - 2, usersData.totalPages - 4)
                      );
                      const p = start + i;
                      if (p > usersData.totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                            p === page
                              ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                              : "hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                          style={
                            p !== page
                              ? { color: "var(--text-muted)" }
                              : undefined
                          }
                        >
                          {p}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(usersData.totalPages, p + 1)
                      )
                    }
                    disabled={page >= usersData.totalPages}
                    className="p-2 rounded-lg border transition hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p
            className="text-center py-12 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {search ? t("adminNoResults") : t("adminNoUsers")}
          </p>
        )}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <button
          onClick={() => setExpandedActions(!expandedActions)}
          className="w-full flex items-center justify-between"
        >
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Wrench className="w-5 h-5 text-rose-400" />
            {t("adminActions")}
          </h2>
          {expandedActions ? (
            <ChevronUp
              className="w-5 h-5"
              style={{ color: "var(--text-muted)" }}
            />
          ) : (
            <ChevronDown
              className="w-5 h-5"
              style={{ color: "var(--text-muted)" }}
            />
          )}
        </button>

        {expandedActions && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {/* Broadcast Announcement */}
            <div
              className="rounded-xl p-4 border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-hover)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("adminBroadcast")}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("adminBroadcastDesc")}
                  </p>
                </div>
              </div>
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder={t("adminBroadcastPlaceholder")}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-xs mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={async () => {
                  if (!announcement.trim()) return;
                  setSendingAnnouncement(true);
                  // For now, store as alert -- the API can be extended later
                  alert(`${t("adminBroadcastSent")}: "${announcement}"`);
                  setAnnouncement("");
                  setSendingAnnouncement(false);
                }}
                disabled={!announcement.trim() || sendingAnnouncement}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                {sendingAnnouncement ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t("adminSendBroadcast")
                )}
              </button>
            </div>

            {/* Maintenance Mode */}
            <div
              className="rounded-xl p-4 border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-hover)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("adminMaintenance")}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("adminMaintenanceDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {maintenanceMode ? t("adminMaintenanceOn") : t("adminMaintenanceOff")}
                </span>
                <button
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    maintenanceMode ? "bg-amber-500" : "bg-gray-400 dark:bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      maintenanceMode ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div
                className={`text-xs text-center py-1.5 rounded-lg font-medium ${
                  maintenanceMode
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {maintenanceMode ? t("adminMaintenanceActive") : t("adminSystemOnline")}
              </div>
            </div>

            {/* Export CSV */}
            <div
              className="rounded-xl p-4 border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-hover)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("adminExportUsersCsv")}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("adminExportUsersDesc")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  {t("adminExportCsv")}
                </div>
              </button>
            </div>

            {/* VIP Content + Seed */}
            <div className="space-y-4">
              {/* VIP Content */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-hover)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t("adminVipContent")}
                    </h3>
                  </div>
                </div>
                <Link
                  href="/admin/vip-content"
                  className="block w-full py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90 text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                  }}
                >
                  {t("adminManageVipContent")}
                </Link>
              </div>

              {/* Seed */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-hover)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Seed Demo Data
                    </h3>
                  </div>
                </div>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="w-full py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 hover:opacity-90"
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                  }}
                >
                  {seeding ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    t("adminLaunchSeed")
                  )}
                </button>
                {seedMessage && (
                  <p
                    className="text-xs mt-2 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {seedMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Recent Signups ─── */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Clock className="w-5 h-5 text-cyan-400" />
          {t("adminRecentSignups")}
        </h2>

        {!stats || stats.recentSignups.length === 0 ? (
          <p
            className="text-center py-8 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {t("adminNoRecentActivity")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.recentSignups.map((signup) => (
              <div
                key={signup.id}
                className="flex items-center gap-3 p-3 rounded-xl border transition hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                    signup.id
                  )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {getInitials(signup.name, signup.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {signup.name || signup.email.split("@")[0]}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatDateTime(signup.createdAt)}
                  </p>
                </div>
                <UserPlus
                  className="w-4 h-4 flex-shrink-0 text-emerald-400"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Stat Card ──────────────── */

function StatCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  mono,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
        <div
          className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`text-2xl font-bold ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
