"use client";

import { useState } from "react";
import {
  Users,
  TrendingUp,
  BarChart3,
  Lock,
  LogIn,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react";

interface Trade {
  id: string;
  date: string;
  asset: string;
  direction: string;
  strategy: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  emotion: string | null;
  tags: string | null;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  balance: number;
  createdAt: string;
  _count: { trades: number };
  trades: Trade[];
}

interface Stats {
  totalUsers: number;
  totalTrades: number;
  totalProfit: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin?secret=${encodeURIComponent(secret)}`);
      if (!res.ok) {
        setError("Clé admin invalide");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
      setAuthenticated(true);
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setLoading(false);
  };

  const refreshData = async () => {
    const res = await fetch(`/api/admin?secret=${encodeURIComponent(secret)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserProfit = (user: User) =>
    user.trades.reduce((sum, t) => sum + t.result, 0);

  const getUserWinRate = (user: User) => {
    if (user.trades.length === 0) return 0;
    const wins = user.trades.filter((t) => t.result > 0).length;
    return Math.round((wins / user.trades.length) * 100);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-amber-400">Admin Panel</h1>
            <p className="text-gray-400 mt-1">ProTrade Journal</p>
          </div>

          {error && (
            <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clé secrète Admin
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Entrez la clé admin..."
              className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 mb-6"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              }}
            >
              {loading ? (
                "Connexion..."
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Accéder au Panel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Admin Panel</h1>
            <p className="text-gray-400 text-sm">ProTrade Journal</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshData}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-700 transition"
          >
            Actualiser
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            }}
          >
            Retour au site
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Utilisateurs inscrits</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-3xl font-bold mt-1">{stats.totalTrades}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Profit Global</p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    stats.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.totalProfit >= 0 ? "+" : ""}
                  {stats.totalProfit.toFixed(2)}€
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Utilisateurs ({users.length})
        </h2>

        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucun utilisateur inscrit.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const profit = getUserProfit(user);
              const winRate = getUserWinRate(user);
              const isExpanded = expandedUser === user.id;

              return (
                <div
                  key={user.id}
                  className="border border-gray-700 rounded-xl overflow-hidden transition-all"
                >
                  {/* User Row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition"
                    onClick={() =>
                      setExpandedUser(isExpanded ? null : user.id)
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {user.name || "Sans nom"}
                        </p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Balance</p>
                        <p className="font-mono font-medium">
                          €{user.balance.toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Trades</p>
                        <p className="font-medium">{user._count.trades}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Win Rate</p>
                        <p
                          className={`font-medium ${
                            winRate >= 50
                              ? "text-emerald-400"
                              : winRate > 0
                              ? "text-rose-400"
                              : "text-gray-400"
                          }`}
                        >
                          {winRate}%
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-400">P&L</p>
                        <p
                          className={`font-mono font-bold ${
                            profit >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {profit.toFixed(2)}€
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-400">Inscrit le</p>
                        <p className="text-sm text-gray-300">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Trades */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 bg-black/20">
                      {/* Mobile stats */}
                      <div className="grid grid-cols-2 sm:hidden gap-3 mb-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Balance
                          </p>
                          <p className="font-mono font-medium">
                            €{user.balance.toLocaleString("fr-FR")}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Trades
                          </p>
                          <p className="font-medium">{user._count.trades}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Win Rate</p>
                          <p
                            className={`font-medium ${
                              winRate >= 50
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {winRate}%
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Inscrit
                          </p>
                          <p className="text-sm">
                            {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Historique des trades ({user.trades.length})
                      </h4>

                      {user.trades.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4 text-center">
                          Aucun trade enregistré.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-400 border-b border-gray-700">
                                <th className="pb-2 pr-3 font-medium">Date</th>
                                <th className="pb-2 pr-3 font-medium">Actif</th>
                                <th className="pb-2 pr-3 font-medium">Dir.</th>
                                <th className="pb-2 pr-3 font-medium">
                                  Stratégie
                                </th>
                                <th className="pb-2 pr-3 font-medium">
                                  Entrée
                                </th>
                                <th className="pb-2 pr-3 font-medium">
                                  Sortie
                                </th>
                                <th className="pb-2 pr-3 font-medium">Lots</th>
                                <th className="pb-2 pr-3 font-medium">
                                  Émotion
                                </th>
                                <th className="pb-2 pr-3 font-medium">Tags</th>
                                <th className="pb-2 font-medium text-right">
                                  P&L
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {user.trades.map((trade) => (
                                <tr
                                  key={trade.id}
                                  className="border-b border-gray-800 hover:bg-white/5"
                                >
                                  <td className="py-2 pr-3 mono text-gray-400 whitespace-nowrap">
                                    {formatDate(trade.date)}
                                  </td>
                                  <td className="py-2 pr-3 font-medium">
                                    {trade.asset}
                                  </td>
                                  <td className="py-2 pr-3">
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
                                  <td className="py-2 pr-3 text-gray-300">
                                    {trade.strategy}
                                  </td>
                                  <td className="py-2 pr-3 mono">
                                    {trade.entry}
                                  </td>
                                  <td className="py-2 pr-3 mono">
                                    {trade.exit || "-"}
                                  </td>
                                  <td className="py-2 pr-3 mono">
                                    {trade.lots}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-400">
                                    {trade.emotion || "-"}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {trade.tags ? (
                                      <div className="flex flex-wrap gap-1">
                                        {trade.tags.split(",").map((tag, i) => (
                                          <span
                                            key={i}
                                            className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs"
                                          >
                                            {tag.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td
                                    className={`py-2 mono font-bold text-right ${
                                      trade.result >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {trade.result >= 0 ? "+" : ""}
                                    {trade.result}€
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
