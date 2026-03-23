"use client";

import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, ShieldCheck, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared AI Insights card used on every market page                  */
/* ------------------------------------------------------------------ */

export interface InsightItem {
  icon: ReactNode;
  text: string;
  type?: "bullish" | "bearish" | "neutral" | "warning" | "info";
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  bullish:  { bg: "bg-emerald-500/8",  border: "border-emerald-500/20", text: "text-emerald-400" },
  bearish:  { bg: "bg-rose-500/8",     border: "border-rose-500/20",    text: "text-rose-400" },
  neutral:  { bg: "bg-[--bg-secondary]/30", border: "border-[--border]", text: "text-[--text-secondary]" },
  warning:  { bg: "bg-amber-500/8",    border: "border-amber-500/20",   text: "text-amber-400" },
  info:     { bg: "bg-cyan-500/8",     border: "border-cyan-500/20",    text: "text-cyan-400" },
};

export function AIInsightsCard({
  title = "Insights IA",
  insights,
  minimumTrades,
  currentTradeCount,
}: {
  title?: string;
  insights: InsightItem[];
  minimumTrades?: number;
  currentTradeCount?: number;
}) {
  // Don't render if not enough data
  if (minimumTrades && currentTradeCount !== undefined && currentTradeCount < minimumTrades) {
    return null;
  }

  if (insights.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <h2 className="font-semibold text-[--text-primary]">{title}</h2>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium border border-purple-500/30 ml-auto uppercase tracking-wider">IA</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {insights.map((insight, i) => {
          const style = TYPE_STYLES[insight.type || "info"];
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${style.bg} ${style.border} transition-colors`}
            >
              <span className={`mt-0.5 flex-shrink-0 ${style.text}`}>
                {insight.icon}
              </span>
              <p className={`text-xs font-medium leading-relaxed ${style.text}`}>
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Re-export icons for convenience in pages */
export { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, ShieldCheck, BarChart3 };
