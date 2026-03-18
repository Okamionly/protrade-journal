"use client";

import { useState } from "react";
import {
  Users,
  BarChart3,
  Activity,
  CalendarDays,
  Crown,
  DollarSign,
  Shield,
  TrendingUp,
  TrendingDown,
  Download,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalTrades: number;
  activeUsers: number;
  tradesToday: number;
  vipCount: number;
  estimatedRevenue: number;
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

interface RecentTrade {
  id: string;
  date: string;
  asset: string;
  direction: string;
  result: number;
  createdAt: string;
  userName: string;
}

interface Props {
  stats: Stats;
  users: UserData[];
  recentTrades: RecentTrade[];
}

export function AdminDashboard({ stats, users: initialUsers, recentTrades }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [expandedActions, setExpandedActions] = useState(true);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch {
      // silently fail
    }
    setUpdatingRole(null);
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage("");
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      setSeedMessage(data.message || "Seed terminé");
    } catch {
      setSeedMessage("Erreur lors du seed");
    }
    setSeeding(false);
  };

  const handleExportCSV = () => {
    const headers = ["Nom", "Email", "Rôle", "Trades", "Balance", "Inscrit le"];
    const rows = users.map((u) => [
      u.name || "Sans nom",
      u.email,
      u.role,
      u.tradeCount,
      u.balance.toFixed(2),
      formatDate(u.createdAt),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      VIP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      USER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return styles[role] || styles.USER;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Panel Admin
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Gestion de MarketPhase
          </p>
        </div>
      </div>

      {/* Stats Globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Utilisateurs"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/20"
        />
        <StatCard
          label="Total Trades"
          value={stats.totalTrades}
          icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
          iconBg="bg-purple-500/20"
        />
        <StatCard
          label="Utilisateurs Actifs"
          value={stats.activeUsers}
          subtitle="7 derniers jours"
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/20"
        />
        <StatCard
          label="Trades Aujourd'hui"
          value={stats.tradesToday}
          icon={<CalendarDays className="w-5 h-5 text-cyan-400" />}
          iconBg="bg-cyan-500/20"
        />
        <StatCard
          label="VIP Abonnés"
          value={stats.vipCount}
          icon={<Crown className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/20"
        />
        <StatCard
          label="Revenus Estimés"
          value={`${stats.estimatedRevenue.toFixed(2)}€`}
          subtitle={`${stats.vipCount} × 9.99€`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/20"
          mono
        />
      </div>

      {/* Liste des Utilisateurs */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Users className="w-5 h-5 text-blue-400" />
          Liste des Utilisateurs ({users.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="pb-3 font-medium">Utilisateur</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Rôle</th>
                <th className="pb-3 font-medium">Trades</th>
                <th className="pb-3 font-medium">Balance</th>
                <th className="pb-3 font-medium">Inscrit le</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-[--bg-hover] transition"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {user.name || "Sans nom"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${roleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 font-mono" style={{ color: "var(--text-primary)" }}>
                    {user.tradeCount}
                  </td>
                  <td className="py-3 font-mono" style={{ color: "var(--text-primary)" }}>
                    {user.balance.toLocaleString("fr-FR")}€
                  </td>
                  <td className="py-3" style={{ color: "var(--text-muted)" }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRole === user.id}
                      className="text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activité Récente */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Activity className="w-5 h-5 text-cyan-400" />
          Activité Récente
        </h2>
        {recentTrades.length === 0 ? (
          <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            Aucune activité récente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Utilisateur</th>
                  <th className="pb-3 font-medium">Actif</th>
                  <th className="pb-3 font-medium">Direction</th>
                  <th className="pb-3 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b hover:bg-[--bg-hover] transition"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDateTime(trade.date)}
                    </td>
                    <td className="py-3" style={{ color: "var(--text-primary)" }}>
                      {trade.userName}
                    </td>
                    <td className="py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {trade.asset}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          trade.direction === "LONG"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`font-mono font-bold ${
                          trade.result >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {trade.result >= 0 ? "+" : ""}
                        {trade.result.toFixed(2)}€
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions Admin */}
      <div className="glass rounded-2xl p-6">
        <button
          onClick={() => setExpandedActions(!expandedActions)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield className="w-5 h-5 text-rose-400" />
            Actions Admin
          </h2>
          {expandedActions ? (
            <ChevronUp className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        {expandedActions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Seed Demo Data */}
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--bg-hover)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Seed Demo Data
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Injecter des données de test
                  </p>
                </div>
              </div>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                }}
              >
                {seeding ? "Seed en cours..." : "Lancer le Seed"}
              </button>
              {seedMessage && (
                <p className="text-xs mt-2 text-center" style={{ color: "var(--text-muted)" }}>
                  {seedMessage}
                </p>
              )}
            </div>

            {/* Export CSV */}
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--bg-hover)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Exporter Users CSV
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Télécharger la liste des utilisateurs
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                Exporter en CSV
              </button>
            </div>

            {/* Logs */}
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--bg-hover)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Voir les Logs
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Consulter les logs du système
                  </p>
                </div>
              </div>
              <button
                disabled
                className="w-full py-2 rounded-lg text-sm font-medium border transition opacity-50 cursor-not-allowed"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Bientôt disponible
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
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
