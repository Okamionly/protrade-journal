"use client";

import { SharedTrade } from "@/hooks/useChat";
import { TrendingUp, TrendingDown } from "lucide-react";

export function TradeCard({ trade }: { trade: SharedTrade }) {
  const isWin = trade.result > 0;
  const isLong = trade.direction === "LONG";

  return (
    <div className="metric-card rounded-xl p-3 mt-2 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{trade.asset}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              isLong
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {trade.direction}
          </span>
        </div>
        {isWin ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-400" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-400">Entrée</p>
          <p className="mono font-medium">{trade.entry}</p>
        </div>
        <div>
          <p className="text-gray-400">Sortie</p>
          <p className="mono font-medium">{trade.exit || "-"}</p>
        </div>
        <div>
          <p className="text-gray-400">Lots</p>
          <p className="mono font-medium">{trade.lots}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
        <span className="text-xs text-gray-400">{trade.strategy}</span>
        <span
          className={`mono font-bold text-sm ${
            isWin ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isWin ? "+" : ""}
          {trade.result}€
        </span>
      </div>
    </div>
  );
}
