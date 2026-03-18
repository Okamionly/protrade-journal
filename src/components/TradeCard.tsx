"use client";

import { SharedTrade } from "@/hooks/useChat";
import { TrendingUp, TrendingDown } from "lucide-react";

export function TradeCard({ trade }: { trade: SharedTrade }) {
  const isWin = trade.result > 0;
  const isLong = trade.direction === "LONG";

  return (
    <div className="rounded-xl p-3 mt-2 max-w-sm bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{trade.asset}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              isLong
                ? "bg-emerald-500/20 text-emerald-500"
                : "bg-rose-500/20 text-rose-500"
            }`}
          >
            {trade.direction}
          </span>
        </div>
        {isWin ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-500" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[--text-muted]">Entrée</p>
          <p className="mono font-medium" style={{ color: "var(--text-primary)" }}>{trade.entry}</p>
        </div>
        <div>
          <p className="text-[--text-muted]">Sortie</p>
          <p className="mono font-medium" style={{ color: "var(--text-primary)" }}>{trade.exit || "-"}</p>
        </div>
        <div>
          <p className="text-[--text-muted]">Lots</p>
          <p className="mono font-medium" style={{ color: "var(--text-primary)" }}>{trade.lots}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
        <span className="text-xs text-[--text-muted]">{trade.strategy}</span>
        <span
          className={`mono font-bold text-sm ${
            isWin ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {isWin ? "+" : ""}
          {trade.result}€
        </span>
      </div>
    </div>
  );
}
