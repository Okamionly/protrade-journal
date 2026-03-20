"use client";

import { Trade } from "@/hooks/useTrades";
import { computeStats } from "@/lib/utils";
import { Wallet, TrendingUp, Scale, ArrowLeftRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/context";

interface Props {
  trades: Trade[];
  balance: number;
  onEditBalance?: () => void;
}

export function DashboardCards({ trades, balance, onEditBalance }: Props) {
  const { t } = useTranslation();
  const stats = computeStats(trades);
  const totalBalance = balance + stats.netProfit;
  const profitPercent = balance > 0 ? ((stats.netProfit / balance) * 100).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="metric-card clickable rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[--text-secondary] text-sm font-medium">{t("totalBalance")}</p>
            <h3 className="text-3xl font-bold mono mt-1" style={{ color: "var(--text-primary)" }}>
              €{totalBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onEditBalance && (
              <button
                onClick={onEditBalance}
                className="w-8 h-8 rounded-lg hover:bg-[--bg-hover] flex items-center justify-center opacity-0 group-hover:opacity-100 transition border border-[--border-subtle]"
                title={t("editBalance")}
              >
                <Pencil className="text-[--text-muted] w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Wallet className="text-blue-400 w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className={`${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} font-medium`}>
            {stats.netProfit >= 0 ? "+" : ""}{profitPercent}%
          </span>
          <span className="text-[--text-muted] ml-2">{t("thisMonth")}</span>
        </div>
        <div className="mt-1 text-xs text-[--text-muted]">
          {t("initialCapital")}: €{balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        </div>
      </div>

      <Link href="/journal" className="metric-card clickable rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[--text-secondary] text-sm font-medium">{t("netProfit")}</p>
            <h3 className={`text-3xl font-bold mono mt-1 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {stats.netProfit >= 0 ? "+" : ""}€{stats.netProfit.toFixed(2)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="text-emerald-400 w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-[--text-secondary]">{t("winRate")}: </span>
          <span className="text-emerald-400 ml-1 font-bold">{stats.winRate.toFixed(1)}%</span>
        </div>
      </Link>

      <Link href="/analytics" className="metric-card clickable rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[--text-secondary] text-sm font-medium">{t("avgRR")}</p>
            <h3 className="text-3xl font-bold mono mt-1 text-purple-400">1:{stats.avgRR}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Scale className="text-purple-400 w-5 h-5" />
          </div>
        </div>
      </Link>

      <Link href="/calendar" className="metric-card clickable rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[--text-secondary] text-sm font-medium">{t("tradesThisMonth")}</p>
            <h3 className="text-3xl font-bold mono mt-1" style={{ color: "var(--text-primary)" }}>{stats.totalTrades}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ArrowLeftRight className="text-orange-400 w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-emerald-400 font-medium">{stats.wins} {t("won")}</span>
          <span className="text-[--text-muted] mx-2">|</span>
          <span className="text-rose-400 font-medium">{stats.losses} {t("lost")}</span>
        </div>
      </Link>
    </div>
  );
}
