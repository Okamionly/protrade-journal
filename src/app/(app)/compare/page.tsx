"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  GitCompare,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Lock,
  Crown,
  Check,
  Lightbulb,
  Download,
  Loader2,
} from "lucide-react";

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1 + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface PeriodStats {
  totalPnL: number;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  maxConsWins: number;
  maxConsLosses: number;
  mostTradedAsset: string;
  mostUsedStrategy: string;
  dailyPnL: Record<string, number>;
}

function computeStats(trades: Trade[]): PeriodStats {
  if (trades.length === 0) {
    return {
      totalPnL: 0, tradeCount: 0, winRate: 0, avgPnL: 0, avgRR: 0,
      bestTrade: 0, worstTrade: 0, profitFactor: 0,
      maxConsWins: 0, maxConsLosses: 0,
      mostTradedAsset: "-", mostUsedStrategy: "-", dailyPnL: {},
    };
  }

  const wins = trades.filter((tr) => tr.result > 0);
  const losses = trades.filter((tr) => tr.result < 0);
  const totalPnL = trades.reduce((s, tr) => s + tr.result, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgPnL = totalPnL / trades.length;
  const bestTrade = Math.max(...trades.map((tr) => tr.result));
  const worstTrade = Math.min(...trades.map((tr) => tr.result));
  const grossWin = wins.reduce((s, tr) => s + tr.result, 0);
  const grossLoss = Math.abs(losses.reduce((s, tr) => s + tr.result, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  // Compute avg R:R from entry/exit/sl
  let rrSum = 0;
  let rrCount = 0;
  for (const tr of trades) {
    if (tr.entry && tr.sl && tr.exit !== null && tr.sl !== tr.entry) {
      const risk = Math.abs(tr.entry - tr.sl);
      const reward = Math.abs((tr.exit ?? tr.entry) - tr.entry);
      if (risk > 0) {
        rrSum += reward / risk;
        rrCount++;
      }
    }
  }
  const avgRR = rrCount > 0 ? rrSum / rrCount : 0;

  let maxConsWins = 0, maxConsLosses = 0, cw = 0, cl = 0;
  for (const tr of trades) {
    if (tr.result > 0) { cw++; cl = 0; maxConsWins = Math.max(maxConsWins, cw); }
    else if (tr.result < 0) { cl++; cw = 0; maxConsLosses = Math.max(maxConsLosses, cl); }
    else { cw = 0; cl = 0; }
  }

  const assetCount: Record<string, number> = {};
  const stratCount: Record<string, number> = {};
  const dailyPnL: Record<string, number> = {};
  for (const tr of trades) {
    assetCount[tr.asset] = (assetCount[tr.asset] || 0) + 1;
    if (tr.strategy) stratCount[tr.strategy] = (stratCount[tr.strategy] || 0) + 1;
    dailyPnL[tr.date] = (dailyPnL[tr.date] || 0) + tr.result;
  }

  const mostTradedAsset = Object.entries(assetCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const mostUsedStrategy = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  return {
    totalPnL, tradeCount: trades.length, winRate, avgPnL, avgRR,
    bestTrade, worstTrade, profitFactor,
    maxConsWins, maxConsLosses, mostTradedAsset, mostUsedStrategy, dailyPnL,
  };
}

function DeltaBadge({ a, b, suffix = "", invert = false }: { a: number; b: number; suffix?: string; invert?: boolean }) {
  if (a === 0 && b === 0) return <span style={{ color: "var(--text-muted)" }}>-</span>;
  const diff = b - a;
  const pct = a !== 0 ? ((diff / Math.abs(a)) * 100) : (b !== 0 ? 100 : 0);
  const improved = invert ? diff < 0 : diff > 0;
  const color = diff === 0 ? "var(--text-muted)" : improved ? "#10b981" : "#ef4444";
  const Icon = improved ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon size={16} style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>
        {diff > 0 ? "+" : ""}{pct.toFixed(1)}%{suffix}
      </span>
    </div>
  );
}

function StatRow({ label, valueA, valueB, format = "number", invert = false }: {
  label: string; valueA: number | string; valueB: number | string; format?: string; invert?: boolean;
}) {
  const fmtVal = (v: number | string) => {
    if (typeof v === "string") return v;
    if (format === "currency") return `${v >= 0 ? "+" : ""}${v.toFixed(2)} \u20ac`;
    if (format === "percent") return `${v.toFixed(1)}%`;
    if (format === "ratio") return v === Infinity ? "\u221e" : v.toFixed(2);
    return v.toString();
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmtVal(valueA)}</span>
      </div>
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</span>
        {typeof valueA === "number" && typeof valueB === "number" ? (
          <DeltaBadge a={valueA} b={valueB} invert={invert} />
        ) : (
          <span style={{ color: "var(--text-muted)" }}>-</span>
        )}
      </div>
      <div className="text-left">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmtVal(valueB)}</span>
      </div>
    </div>
  );
}

/* ---------- Visual Comparison Bars (SVG) ---------- */

interface MetricBarChartProps {
  label: string;
  valueA: number;
  valueB: number;
  format?: "currency" | "percent" | "ratio" | "number";
  invert?: boolean;
}

function MetricBarChart({ label, valueA, valueB, format = "number", invert = false }: MetricBarChartProps) {
  const maxVal = Math.max(Math.abs(valueA), Math.abs(valueB), 0.01);
  const barA = (Math.abs(valueA) / maxVal) * 100;
  const barB = (Math.abs(valueB) / maxVal) * 100;

  const diff = valueA !== 0 ? ((valueB - valueA) / Math.abs(valueA)) * 100 : (valueB !== 0 ? 100 : 0);
  const bIsBetter = invert ? valueB < valueA : valueB > valueA;

  const colorA = bIsBetter ? "#ef4444" : "#10b981";
  const colorB = bIsBetter ? "#10b981" : "#ef4444";
  if (valueA === valueB) {
    // both neutral
  }
  const colorAFinal = valueA === valueB ? "#64748b" : colorA;
  const colorBFinal = valueA === valueB ? "#64748b" : colorB;

  const fmtVal = (v: number) => {
    if (format === "currency") return `${v >= 0 ? "+" : ""}${v.toFixed(0)}\u20ac`;
    if (format === "percent") return `${v.toFixed(1)}%`;
    if (format === "ratio") return v === Infinity ? "\u221e" : v.toFixed(2);
    return v.toFixed(0);
  };

  const chartW = 200;
  const chartH = 60;
  const barH = 18;
  const gap = 6;
  const yA = 8;
  const yB = yA + barH + gap;
  const maxBarW = chartW - 60;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
        {/* Period A bar */}
        <rect x={0} y={yA} width={Math.max((barA / 100) * maxBarW, 4)} height={barH} rx={4} fill={colorAFinal} opacity={0.85} />
        <text x={Math.max((barA / 100) * maxBarW, 4) + 6} y={yA + barH / 2 + 4} fontSize={11} fill="var(--text-secondary)" fontFamily="inherit">
          A: {fmtVal(valueA)}
        </text>

        {/* Period B bar */}
        <rect x={0} y={yB} width={Math.max((barB / 100) * maxBarW, 4)} height={barH} rx={4} fill={colorBFinal} opacity={0.85} />
        <text x={Math.max((barB / 100) * maxBarW, 4) + 6} y={yB + barH / 2 + 4} fontSize={11} fill="var(--text-secondary)" fontFamily="inherit">
          B: {fmtVal(valueB)}
        </text>
      </svg>
      {/* Percentage diff label */}
      <span
        className="text-xs font-semibold"
        style={{ color: valueA === valueB ? "var(--text-muted)" : bIsBetter ? "#10b981" : "#ef4444" }}
      >
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
      </span>
    </div>
  );
}

/* ---------- Daily P&L bar chart ---------- */

function DailyBarChart({ dailyA, dailyB, noDataLabel }: { dailyA: Record<string, number>; dailyB: Record<string, number>; noDataLabel: string }) {
  const allDates = [...new Set([...Object.keys(dailyA), ...Object.keys(dailyB)])].sort();
  if (allDates.length === 0) {
    return <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>{noDataLabel}</p>;
  }
  const allVals = [...Object.values(dailyA), ...Object.values(dailyB)];
  const maxAbs = Math.max(...allVals.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-1 h-48 px-2 overflow-x-auto">
      {allDates.map((date) => {
        const vA = dailyA[date] || 0;
        const vB = dailyB[date] || 0;
        const hA = Math.abs(vA) / maxAbs * 100;
        const hB = Math.abs(vB) / maxAbs * 100;
        return (
          <div key={date} className="flex items-end gap-0.5 flex-1 min-w-[16px]" style={{ height: "100%" }}>
            <div className="flex flex-col justify-end flex-1" style={{ height: "100%" }}>
              <div
                className="rounded-t-sm w-full transition-all"
                style={{
                  height: `${Math.max(hA, 4)}%`,
                  background: vA >= 0 ? "#06b6d4" : "#06b6d480",
                  opacity: 0.85,
                }}
                title={`A: ${vA.toFixed(2)} \u20ac (${date})`}
              />
            </div>
            <div className="flex flex-col justify-end flex-1" style={{ height: "100%" }}>
              <div
                className="rounded-t-sm w-full transition-all"
                style={{
                  height: `${Math.max(hB, 4)}%`,
                  background: vB >= 0 ? "#8b5cf6" : "#8b5cf680",
                  opacity: 0.85,
                }}
                title={`B: ${vB.toFixed(2)} \u20ac (${date})`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Takeaways (basic) ---------- */

function generateTakeaways(a: PeriodStats, b: PeriodStats, t: (key: string, params?: Record<string, string | number>) => string): string[] {
  const tips: string[] = [];
  if (a.tradeCount === 0 && b.tradeCount === 0) return [t("noDataToCompare")];

  if (a.winRate > 0 || b.winRate > 0) {
    const diff = b.winRate - a.winRate;
    if (Math.abs(diff) > 1) {
      tips.push(diff > 0
        ? t("winRateIncreased", { pct: diff.toFixed(1) })
        : t("winRateDecreased", { pct: Math.abs(diff).toFixed(1) }));
    }
  }

  if (a.tradeCount > 0 && b.tradeCount > 0) {
    const pct = ((b.tradeCount - a.tradeCount) / a.tradeCount * 100);
    if (Math.abs(pct) > 5) {
      tips.push(pct > 0
        ? t("tradedMoreThisPeriod", { pct: pct.toFixed(0) })
        : t("tradedLessThisPeriod", { pct: Math.abs(pct).toFixed(0) }));
    }
  }

  if (a.worstTrade < 0 && b.worstTrade < 0) {
    const improvePct = ((Math.abs(b.worstTrade) - Math.abs(a.worstTrade)) / Math.abs(a.worstTrade) * 100);
    if (improvePct < -10) {
      tips.push(t("betterLossManagement", { pct: improvePct.toFixed(0) }));
    }
  }

  if (b.profitFactor > a.profitFactor && a.profitFactor > 0) {
    tips.push(t("profitFactorImproved", { from: a.profitFactor.toFixed(2), to: b.profitFactor.toFixed(2) }));
  }

  if (b.avgPnL > a.avgPnL) {
    tips.push(t("avgPnlIncreased", { from: a.avgPnL.toFixed(2), to: b.avgPnL.toFixed(2) }));
  }

  if (tips.length === 0) tips.push(t("noSignificantChange"));
  return tips;
}

/* ---------- "Qu'est-ce qui a change?" Insight Engine ---------- */

interface Insight {
  text: string;
  type: "positive" | "negative" | "warning" | "neutral";
}

function generateInsights(a: PeriodStats, b: PeriodStats): Insight[] {
  const insights: Insight[] = [];
  if (a.tradeCount === 0 && b.tradeCount === 0) {
    insights.push({ text: "Aucune donn\u00e9e disponible pour g\u00e9n\u00e9rer des insights.", type: "neutral" });
    return insights;
  }

  const wrDiff = b.winRate - a.winRate;
  const pnlDiff = b.totalPnL - a.totalPnL;
  const rrDiff = b.avgRR - a.avgRR;
  const pfDiff = b.profitFactor - a.profitFactor;
  const countDiff = b.tradeCount - a.tradeCount;

  // Rule: WR up but PnL down -> R:R issue
  if (wrDiff > 2 && pnlDiff < 0) {
    insights.push({
      text: `Votre win rate a augment\u00e9 de ${wrDiff.toFixed(1)}% mais votre P&L a baiss\u00e9 \u2014 v\u00e9rifiez votre ratio risque/r\u00e9compense (R:R).`,
      type: "warning",
    });
  }

  // Rule: WR down but PnL up -> good R:R
  if (wrDiff < -2 && pnlDiff > 0) {
    insights.push({
      text: `Malgr\u00e9 un win rate en baisse de ${Math.abs(wrDiff).toFixed(1)}%, votre P&L a progress\u00e9 gr\u00e2ce \u00e0 un meilleur R:R. Continuez ainsi !`,
      type: "positive",
    });
  }

  // Rule: WR up and PnL up
  if (wrDiff > 2 && pnlDiff > 0) {
    insights.push({
      text: `Votre win rate a augment\u00e9 de ${wrDiff.toFixed(1)}% et votre P&L aussi (+${pnlDiff.toFixed(0)}\u20ac). Excellente p\u00e9riode !`,
      type: "positive",
    });
  }

  // Rule: R:R dropped significantly
  if (a.avgRR > 0 && rrDiff < -0.3) {
    insights.push({
      text: `Votre R:R moyen a baiss\u00e9 de ${a.avgRR.toFixed(2)} \u00e0 ${b.avgRR.toFixed(2)}. Consid\u00e9rez d\u2019\u00e9largir vos take-profits ou de resserrer vos stop-loss.`,
      type: "negative",
    });
  }

  // Rule: R:R improved
  if (a.avgRR > 0 && rrDiff > 0.3) {
    insights.push({
      text: `Votre R:R moyen s\u2019est am\u00e9lior\u00e9 de ${a.avgRR.toFixed(2)} \u00e0 ${b.avgRR.toFixed(2)}. Bonne gestion des sorties !`,
      type: "positive",
    });
  }

  // Rule: Over-trading (many more trades but worse PnL)
  if (a.tradeCount > 0 && countDiff > 0) {
    const pctMore = (countDiff / a.tradeCount) * 100;
    if (pctMore > 30 && pnlDiff < 0) {
      insights.push({
        text: `Vous avez pris ${pctMore.toFixed(0)}% de trades en plus mais votre P&L a diminu\u00e9. R\u00e9duisez les trades impulsifs.`,
        type: "warning",
      });
    }
  }

  // Rule: Fewer trades, better results
  if (a.tradeCount > 0 && countDiff < 0 && pnlDiff > 0) {
    insights.push({
      text: `Moins de trades, meilleur r\u00e9sultat. La qualit\u00e9 prime sur la quantit\u00e9.`,
      type: "positive",
    });
  }

  // Rule: Profit factor comparison
  if (a.profitFactor > 0 && b.profitFactor > 0) {
    if (pfDiff > 0.5) {
      insights.push({
        text: `Profit Factor en nette progression (${a.profitFactor.toFixed(2)} \u2192 ${b.profitFactor.toFixed(2)}). Votre edge s\u2019am\u00e9liore.`,
        type: "positive",
      });
    } else if (pfDiff < -0.5) {
      insights.push({
        text: `Profit Factor en baisse (${a.profitFactor.toFixed(2)} \u2192 ${b.profitFactor.toFixed(2)}). Revoyez vos crit\u00e8res d\u2019entr\u00e9e.`,
        type: "negative",
      });
    }
  }

  // Rule: Worst trade got worse
  if (a.worstTrade < 0 && b.worstTrade < a.worstTrade) {
    insights.push({
      text: `Votre pire trade s\u2019est aggrav\u00e9 (${a.worstTrade.toFixed(0)}\u20ac \u2192 ${b.worstTrade.toFixed(0)}\u20ac). Renforcez votre discipline de stop-loss.`,
      type: "negative",
    });
  }

  if (insights.length === 0) {
    insights.push({ text: "Pas de changement notable entre les deux p\u00e9riodes.", type: "neutral" });
  }

  return insights;
}

function InsightCard({ insight }: { insight: Insight }) {
  const colorMap = {
    positive: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "#10b981" },
    negative: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", icon: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", icon: "#f59e0b" },
    neutral: { bg: "var(--bg-hover)", border: "var(--border)", icon: "var(--text-muted)" },
  };
  const c = colorMap[insight.type];

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl transition-all"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Lightbulb size={18} style={{ color: c.icon }} />
      </div>
      <span className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{insight.text}</span>
    </div>
  );
}

/* ---------- Export as PNG ---------- */

function ExportButton({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!targetRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `comparaison-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [targetRef]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
      style={{
        background: "rgba(6,182,212,0.12)",
        color: "#06b6d4",
        border: "1px solid rgba(6,182,212,0.25)",
      }}
    >
      {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {exporting ? "Export en cours\u2026" : "Exporter en PNG"}
    </button>
  );
}

/* ========== Main Page ========== */

export default function ComparePage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(-1);

  const [periodA, setPeriodA] = useState({ start: lastWeek.start, end: lastWeek.end });
  const [periodB, setPeriodB] = useState({ start: thisWeek.start, end: thisWeek.end });
  const [preset, setPreset] = useState<string>("week");

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "week") {
      setPeriodA(getWeekRange(-1));
      setPeriodB(getWeekRange(0));
    } else if (key === "month") {
      setPeriodA(getMonthRange(-1));
      setPeriodB(getMonthRange(0));
    }
  };

  const tradesA = useMemo(() =>
    trades.filter((tr) => tr.date >= periodA.start && tr.date <= periodA.end)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [trades, periodA]);

  const tradesB = useMemo(() =>
    trades.filter((tr) => tr.date >= periodB.start && tr.date <= periodB.end)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [trades, periodB]);

  const statsA = useMemo(() => computeStats(tradesA), [tradesA]);
  const statsB = useMemo(() => computeStats(tradesB), [tradesB]);
  const takeaways = useMemo(() => generateTakeaways(statsA, statsB, t), [statsA, statsB, t]);
  const insights = useMemo(() => generateInsights(statsA, statsB), [statsA, statsB]);

  if (loading || isVip === null) {
    return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>{t("loading")}</div>;
  }

  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: `${40 + i * 10}%` }} />
                <div className="h-3 rounded" style={{ background: "var(--border)", width: `${20 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "var(--bg-card)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalit\u00e9 VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Comparez vos performances entre diff\u00e9rentes p\u00e9riodes de trading
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Comparez vos performances entre p\u00e9riodes",
              "Identifiez vos tendances d\u2019am\u00e9lioration",
              "Analyse comparative d\u00e9taill\u00e9e",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header + Export */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <GitCompare size={28} style={{ color: "#06b6d4" }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("comparison")}</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("compareTwoPeriodsDesc")}</p>
          </div>
        </div>
        <ExportButton targetRef={exportRef} />
      </div>

      {/* Exportable region */}
      <div ref={exportRef} className="space-y-6">

        {/* Period Selector */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("periodSelection")}</span>
          </div>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "week", label: t("thisWeekVsLast") },
              { key: "month", label: t("thisMonthVsLast") },
              { key: "custom", label: t("custom") },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: preset === p.key ? "rgba(6,182,212,0.15)" : "var(--bg-hover)",
                  color: preset === p.key ? "#06b6d4" : "var(--text-secondary)",
                  border: preset === p.key ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>
                {t("periodA")}
              </span>
              <div className="flex gap-2">
                <input type="date" className="input-field flex-1" value={periodA.start}
                  onChange={(e) => { setPeriodA((p) => ({ ...p, start: e.target.value })); setPreset("custom"); }} />
                <input type="date" className="input-field flex-1" value={periodA.end}
                  onChange={(e) => { setPeriodA((p) => ({ ...p, end: e.target.value })); setPreset("custom"); }} />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
                {t("periodB")}
              </span>
              <div className="flex gap-2">
                <input type="date" className="input-field flex-1" value={periodB.start}
                  onChange={(e) => { setPeriodB((p) => ({ ...p, start: e.target.value })); setPreset("custom"); }} />
                <input type="date" className="input-field flex-1" value={periodB.end}
                  onChange={(e) => { setPeriodB((p) => ({ ...p, end: e.target.value })); setPreset("custom"); }} />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Visual Comparison Charts (new) ---- */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} style={{ color: "#06b6d4" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Comparaison visuelle</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            <MetricBarChart label="P&L" valueA={statsA.totalPnL} valueB={statsB.totalPnL} format="currency" />
            <MetricBarChart label="Win Rate" valueA={statsA.winRate} valueB={statsB.winRate} format="percent" />
            <MetricBarChart label="Profit Factor" valueA={statsA.profitFactor === Infinity ? 99 : statsA.profitFactor} valueB={statsB.profitFactor === Infinity ? 99 : statsB.profitFactor} format="ratio" />
            <MetricBarChart label="R:R Moyen" valueA={statsA.avgRR} valueB={statsB.avgRR} format="ratio" />
            <MetricBarChart label="Nb. Trades" valueA={statsA.tradeCount} valueB={statsB.tradeCount} format="number" />
          </div>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#06b6d4" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodA")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodB")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Meilleur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Moins bon</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("detailedComparison")}</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-3 mb-2" style={{ borderBottom: "2px solid var(--border)" }}>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#06b6d4" }}>{t("periodA")}</span>
            </div>
            <div className="min-w-[80px] text-center">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Delta</span>
            </div>
            <div className="text-left">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>{t("periodB")}</span>
            </div>
          </div>

          <StatRow label={t("totalPnl")} valueA={statsA.totalPnL} valueB={statsB.totalPnL} format="currency" />
          <StatRow label={t("tradesCount")} valueA={statsA.tradeCount} valueB={statsB.tradeCount} />
          <StatRow label={t("winRate")} valueA={statsA.winRate} valueB={statsB.winRate} format="percent" />
          <StatRow label={t("avgPnl")} valueA={statsA.avgPnL} valueB={statsB.avgPnL} format="currency" />
          <StatRow label="R:R Moyen" valueA={statsA.avgRR} valueB={statsB.avgRR} format="ratio" />
          <StatRow label={t("bestTrade")} valueA={statsA.bestTrade} valueB={statsB.bestTrade} format="currency" />
          <StatRow label={t("worstTrade")} valueA={statsA.worstTrade} valueB={statsB.worstTrade} format="currency" invert />
          <StatRow label={t("profitFactor")} valueA={statsA.profitFactor} valueB={statsB.profitFactor} format="ratio" />
          <StatRow label={t("consecutiveWins")} valueA={statsA.maxConsWins} valueB={statsB.maxConsWins} />
          <StatRow label={t("consecutiveLosses")} valueA={statsA.maxConsLosses} valueB={statsB.maxConsLosses} invert />
          <StatRow label={t("mainAsset")} valueA={statsA.mostTradedAsset} valueB={statsB.mostTradedAsset} />
          <StatRow label={t("mainStrategy")} valueA={statsA.mostUsedStrategy} valueB={statsB.mostUsedStrategy} />
        </div>

        {/* Overlapping Equity Curves */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("dailyPnl")}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "#06b6d4" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodA")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("periodB")}</span>
              </div>
            </div>
          </div>
          <DailyBarChart dailyA={statsA.dailyPnL} dailyB={statsB.dailyPnL} noDataLabel={t("noData")} />
        </div>

        {/* ---- "Qu'est-ce qui a change?" Insights (new) ---- */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Lightbulb size={18} style={{ color: "#f59e0b" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Qu&apos;est-ce qui a chang\u00e9 ?
            </span>
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: "#10b981" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("keyTakeaways")}</span>
          </div>
          <div className="space-y-2">
            {takeaways.map((tip, i) => {
              const isPositive = tip.includes("augment\u00e9") || tip.includes("am\u00e9lior\u00e9") || tip.includes("hausse") || tip.includes("Meilleure") || tip.includes("increased") || tip.includes("improved") || tip.includes("better") || tip.includes("higher") || tip.includes("+");
              const icon = isPositive
                ? <TrendingUp size={14} style={{ color: "#10b981" }} />
                : <TrendingDown size={14} style={{ color: "#ef4444" }} />;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                  <div className="mt-0.5">{icon}</div>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{tip}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>{/* end exportable region */}
    </div>
  );
}
