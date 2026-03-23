"use client";

import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Crown,
  Zap,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Subscriber {
  id: string;
  name: string;
  email: string;
  role: string;
  date: string;
}

interface Stats {
  totalUsers: number;
  vipUsers: number;
  proUsers: number;
  freeUsers: number;
  recentSubscribers: Subscriber[];
}

export function RevenueDashboard({ stats }: { stats: Stats }) {
  const mrr = stats.vipUsers * 9;
  const arr = mrr * 12;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revenue Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Suivi des abonnements et revenus
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              MRR
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {mrr.toFixed(2)}€
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +16.5% vs mois dernier
          </p>
        </div>

        {/* ARR */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              ARR
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {arr.toFixed(2)}€
          </p>
          <p className="text-xs text-gray-400 mt-1">Revenu annuel récurrent</p>
        </div>

        {/* Total subscribers */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Abonnés payants
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.proUsers + stats.vipUsers}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.proUsers} Pro + {stats.vipUsers} VIP
          </p>
        </div>

        {/* Churn */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Churn Rate
            </span>
          </div>
          <p className="text-xl text-gray-400">
            Indisponible
          </p>
          <p className="text-xs text-gray-400 mt-1">Connectez Stripe pour les données réelles</p>
        </div>
      </div>

      {/* Revenue chart + Breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">
            Croissance MRR
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{mrr}€</p>
              <p className="text-xs text-gray-400 mt-2">MRR actuel ({stats.vipUsers} VIP x 9€)</p>
              <p className="text-xs text-gray-400 mt-1">Historique indisponible — Connectez Stripe</p>
            </div>
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">
            Répartition utilisateurs
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Free
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {stats.freeUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pro
                </span>
              </div>
              <span className="text-sm font-bold text-blue-400">
                {stats.proUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  VIP
                </span>
              </div>
              <span className="text-sm font-bold text-amber-400">
                {stats.vipUsers}
              </span>
            </div>

            {/* Visual bar */}
            <div className="mt-4">
              <div className="h-4 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex">
                {stats.totalUsers > 0 && (
                  <>
                    <div
                      className="bg-gray-400 h-full"
                      style={{
                        width: `${(stats.freeUsers / stats.totalUsers) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${(stats.proUsers / stats.totalUsers) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{
                        width: `${(stats.vipUsers / stats.totalUsers) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Conversion rate */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500">Taux de conversion</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalUsers > 0
                  ? (
                      ((stats.proUsers + stats.vipUsers) / stats.totalUsers) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent subscribers */}
      <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Abonnés récents
        </h3>
        {stats.recentSubscribers.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun abonné payant pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                    Utilisateur
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                    Revenu mensuel
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                    Inscrit le
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSubscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {sub.role === "VIP" ? (
                          <Crown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Zap className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {sub.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {sub.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sub.role === "VIP"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {sub.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      9€
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(sub.date).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
