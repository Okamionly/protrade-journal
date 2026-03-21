"use client";

import { useState, useEffect, useRef } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import {
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  Target, Award, BarChart3, PieChart, Printer,
  ChevronDown, ChevronUp, Filter, Clock, Mail,
  Eye, History, Shield, BookOpen, FileBarChart,
  AlertTriangle, CheckCircle2, X, Trash2
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type Period = "week" | "month" | "quarter" | "year" | "custom";
type ReportType = "weekly" | "monthly" | "propfirm";
type ViewMode = "generate" | "preview" | "history";

interface ReportHistoryEntry {
  id: string;
  date: string;
  type: ReportType;
  period: Period;
  periodLabel: string;
  tradesCount: number;
  pnl: number;
}

const REPORT_HISTORY_KEY = "protrade-report-history";

// ─── Period helpers ──────────────────────────────────────────────────
function getTradesForPeriod(trades: Trade[], period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  let start: Date;
  let end = now;

  switch (period) {
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd) : now;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return trades.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

function getPeriodDates(period: Period, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end = now;

  switch (period) {
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd) : now;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start, end };
}

// ─── Stats computation ───────────────────────────────────────────────
function computeStats(trades: Trade[]) {
  if (!trades.length) return null;
  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const totalPnl = trades.reduce((s, t) => s + t.result, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
  const rrs = trades.map((t) => parseFloat(calculateRR(t.entry, t.sl, t.tp))).filter((r) => !isNaN(r) && isFinite(r));
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  // Max drawdown
  let peak = 0, maxDD = 0, running = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  sorted.forEach((t) => {
    running += t.result;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  });

  // Best/worst trade
  const best = trades.reduce((a, b) => (a.result > b.result ? a : b));
  const worst = trades.reduce((a, b) => (a.result < b.result ? a : b));

  // By asset
  const byAsset: Record<string, { count: number; pnl: number; wins: number }> = {};
  trades.forEach((t) => {
    const a = t.asset || "N/A";
    if (!byAsset[a]) byAsset[a] = { count: 0, pnl: 0, wins: 0 };
    byAsset[a].count++;
    byAsset[a].pnl += t.result;
    if (t.result > 0) byAsset[a].wins++;
  });

  // By strategy
  const byStrategy: Record<string, { count: number; pnl: number; wins: number }> = {};
  trades.forEach((t) => {
    const s = t.strategy || "Sans stratégie";
    if (!byStrategy[s]) byStrategy[s] = { count: 0, pnl: 0, wins: 0 };
    byStrategy[s].count++;
    byStrategy[s].pnl += t.result;
    if (t.result > 0) byStrategy[s].wins++;
  });

  // By day of week
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const byDay: Record<string, { count: number; pnl: number }> = {};
  days.forEach((d) => (byDay[d] = { count: 0, pnl: 0 }));
  trades.forEach((t) => {
    const d = days[new Date(t.date).getDay()];
    byDay[d].count++;
    byDay[d].pnl += t.result;
  });

  // Daily P&L (for monthly report)
  const dailyPnl: Record<string, number> = {};
  sorted.forEach((t) => {
    const key = new Date(t.date).toLocaleDateString("fr-FR");
    dailyPnl[key] = (dailyPnl[key] || 0) + t.result;
  });

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, cs = 0;
  sorted.forEach((t) => {
    if (t.result > 0) { cs = cs > 0 ? cs + 1 : 1; maxWinStreak = Math.max(maxWinStreak, cs); }
    else { cs = cs < 0 ? cs - 1 : -1; maxLossStreak = Math.max(maxLossStreak, Math.abs(cs)); }
  });

  // Trading days
  const tradingDays = new Set(trades.map((t) => new Date(t.date).toDateString())).size;

  // Daily loss tracking (for prop firm)
  const dailyResults: Record<string, number> = {};
  sorted.forEach((t) => {
    const key = new Date(t.date).toDateString();
    dailyResults[key] = (dailyResults[key] || 0) + t.result;
  });
  const worstDay = Object.entries(dailyResults).reduce((worst, [, pnl]) => pnl < worst ? pnl : worst, 0);
  const bestDay = Object.entries(dailyResults).reduce((best, [, pnl]) => pnl > best ? pnl : best, 0);

  // Consistency score (prop firm) — how many profitable days vs total days
  const profitableDays = Object.values(dailyResults).filter((v) => v > 0).length;
  const consistencyScore = tradingDays > 0 ? (profitableDays / tradingDays) * 100 : 0;

  // Cumulative equity for chart
  const cumulativeEquity: { date: string; value: number }[] = [];
  let cum = 0;
  sorted.forEach((t) => {
    cum += t.result;
    cumulativeEquity.push({ date: new Date(t.date).toLocaleDateString("fr-FR"), value: cum });
  });

  return {
    total: trades.length, wins: wins.length, losses: losses.length, totalPnl,
    winRate, avgWin, avgLoss, profitFactor, avgRR, maxDD, best, worst,
    byAsset, byStrategy, byDay, dailyPnl, maxWinStreak, maxLossStreak, tradingDays,
    worstDay, bestDay, consistencyScore, profitableDays, dailyResults,
    cumulativeEquity,
  };
}

// ─── Report history helpers ──────────────────────────────────────────
function loadHistory(): ReportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPORT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(entries: ReportHistoryEntry[]) {
  localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(entries));
}

// ─── Print CSS injection ─────────────────────────────────────────────
const PRINT_STYLE_ID = "protrade-print-style";

function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* Hide everything except the report preview */
      body > *:not(#report-print-root),
      nav, aside, header, footer,
      [data-no-print], .print\\:hidden,
      button, .print-hide {
        display: none !important;
      }

      #report-print-root {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        background: white !important;
        color: #111 !important;
        font-size: 11px;
        line-height: 1.5;
        padding: 20px;
      }

      #report-print-root * {
        color: #111 !important;
        border-color: #ddd !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #report-print-root .print-color-emerald { color: #059669 !important; }
      #report-print-root .print-color-rose { color: #e11d48 !important; }
      #report-print-root .print-color-cyan { color: #0891b2 !important; }
      #report-print-root .print-color-amber { color: #d97706 !important; }

      #report-print-root .print-bg-emerald { background: #ecfdf5 !important; }
      #report-print-root .print-bg-rose { background: #fff1f2 !important; }

      #report-print-root table {
        width: 100%;
        border-collapse: collapse;
      }
      #report-print-root th,
      #report-print-root td {
        padding: 4px 8px;
        border-bottom: 1px solid #e5e7eb !important;
        text-align: left;
      }
      #report-print-root th {
        font-weight: 600;
        background: #f9fafb !important;
      }

      #report-print-root .print-section {
        page-break-inside: avoid;
        margin-bottom: 16px;
      }

      #report-print-root .print-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }

      #report-print-root .print-kpi-card {
        border: 1px solid #e5e7eb !important;
        border-radius: 8px;
        padding: 8px;
        text-align: center;
      }

      @page {
        margin: 15mm;
        size: A4;
      }
    }
  `;
  document.head.appendChild(style);
}

// ─── Main Component ──────────────────────────────────────────────────
export default function RapportsPage() {
  const { trades } = useTrades();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("weekly");
  const [viewMode, setViewMode] = useState<ViewMode>("generate");
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const filtered = getTradesForPeriod(trades, period, customStart, customEnd);
  const stats = computeStats(filtered);

  const periodLabels: Record<Period, string> = {
    week: "Cette semaine",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année",
    custom: "Personnalisé",
  };

  const reportTypeLabels: Record<ReportType, { label: string; desc: string; icon: typeof FileText }> = {
    weekly: { label: "Résumé hebdomadaire", desc: "Stats clés, meilleurs/pires trades, win rate, courbe P&L", icon: BookOpen },
    monthly: { label: "Rapport mensuel détaillé", desc: "Tableau complet, P&L journalier, stratégies, objectifs", icon: FileBarChart },
    propfirm: { label: "Audit Prop Firm", desc: "Drawdown max, limites journalières, consistance, conformité", icon: Shield },
  };

  // ─── Actions ─────────────────────────────────────────────────────
  const handleGeneratePDF = () => {
    injectPrintStyles();
    setShowPreview(true);

    // Save to history
    if (stats) {
      const entry: ReportHistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: reportType,
        period,
        periodLabel: periodLabels[period],
        tradesCount: stats.total,
        pnl: stats.totalPnl,
      };
      const updated = [entry, ...history].slice(0, 50);
      setHistory(updated);
      saveHistory(updated);
    }

    // Small delay so the preview DOM mounts, then print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleExportCSV = async () => {
    const res = await fetch("/api/trades/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketphase-rapport-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleEmail = () => {
    const dates = getPeriodDates(period, customStart, customEnd);
    const subject = encodeURIComponent(
      `ProTrade Journal — ${reportTypeLabels[reportType].label} (${dates.start.toLocaleDateString("fr-FR")} → ${dates.end.toLocaleDateString("fr-FR")})`
    );
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint mon rapport de trading.\n\nType: ${reportTypeLabels[reportType].label}\nPériode: ${periodLabels[period]}\n${stats ? `Trades: ${stats.total}\nP&L: ${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}€\nWin Rate: ${stats.winRate.toFixed(1)}%` : ""}\n\nCordialement`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const deleteHistoryEntry = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  // ─── Render helpers ──────────────────────────────────────────────

  const renderEquitySVG = (data: { date: string; value: number }[], height = 160) => {
    if (!data.length) return null;
    const min = Math.min(0, ...data.map((d) => d.value));
    const max = Math.max(0, ...data.map((d) => d.value));
    const range = max - min || 1;
    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 800;
      const y = (height - 10) - ((d.value - min) / range) * (height - 20);
      return `${x},${y}`;
    });
    const final = data[data.length - 1].value;
    const color = final >= 0 ? "#10b981" : "#ef4444";
    const zeroY = (height - 10) - ((0 - min) / range) * (height - 20);
    return (
      <svg viewBox={`0 0 800 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eqGradReport" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${zeroY} ${points.join(" ")} 800,${zeroY}`} fill="url(#eqGradReport)" />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1={zeroY} x2="800" y2={zeroY} stroke="white" strokeOpacity="0.15" strokeDasharray="4" />
      </svg>
    );
  };

  // ─── Preview / Print content ─────────────────────────────────────
  const renderReportContent = (forPrint = false) => {
    if (!stats) return null;
    const dates = getPeriodDates(period, customStart, customEnd);
    const containerClass = forPrint ? "" : "space-y-4";
    const sectionClass = forPrint ? "print-section mb-4" : "glass rounded-2xl p-4";
    const kpiGridClass = forPrint ? "print-kpi-grid" : "grid grid-cols-2 sm:grid-cols-4 gap-3";
    const kpiCardClass = forPrint ? "print-kpi-card" : "glass rounded-xl p-3 text-center";

    return (
      <div className={containerClass}>
        {/* Report header */}
        <div className={`${forPrint ? "text-center mb-6 pb-4 border-b-2" : "text-center mb-2"}`}>
          <h2 className={`${forPrint ? "text-xl" : "text-lg"} font-bold`} style={!forPrint ? { color: "var(--text-primary)" } : {}}>
            MarketPhase — {reportTypeLabels[reportType].label}
          </h2>
          <p className={`text-sm mt-1 ${forPrint ? "" : ""}`} style={!forPrint ? { color: "var(--text-secondary)" } : {}}>
            {dates.start.toLocaleDateString("fr-FR")} → {dates.end.toLocaleDateString("fr-FR")} | Généré le {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* KPIs — all report types */}
        <div className={forPrint ? "print-section" : ""}>
          <div className={kpiGridClass}>
            {[
              { label: "Trades", value: String(stats.total) },
              { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
              { label: "P&L Total", value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)}€` },
              { label: "Profit Factor", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2) },
              { label: "Avg R:R", value: stats.avgRR.toFixed(2) },
              { label: "Max Drawdown", value: `-${stats.maxDD.toFixed(0)}€` },
              { label: "Jours de trading", value: String(stats.tradingDays) },
              { label: "Gain moyen", value: `${stats.avgWin.toFixed(0)}€` },
            ].map((kpi, i) => (
              <div key={i} className={kpiCardClass}>
                <p className="mono text-lg font-bold" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{kpi.value}</p>
                <p className="text-[11px]" style={!forPrint ? { color: "var(--text-muted)" } : {}}>{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Best / Worst — weekly + monthly */}
        {(reportType === "weekly" || reportType === "monthly") && (
          <div className={`${forPrint ? "print-section" : ""} grid grid-cols-1 md:grid-cols-2 gap-3`}>
            <div className={`${sectionClass} ${forPrint ? "print-bg-emerald" : "border-l-4 border-emerald-500"}`}>
              <p className="text-xs font-medium mb-1" style={!forPrint ? { color: "var(--text-muted)" } : {}}>Meilleur Trade</p>
              <p className={`mono text-xl font-bold ${forPrint ? "print-color-emerald" : "text-emerald-500"}`}>+{stats.best.result.toFixed(0)}€</p>
              <p className="text-sm mt-1" style={!forPrint ? { color: "var(--text-secondary)" } : {}}>
                {stats.best.asset} | {new Date(stats.best.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className={`${sectionClass} ${forPrint ? "print-bg-rose" : "border-l-4 border-rose-500"}`}>
              <p className="text-xs font-medium mb-1" style={!forPrint ? { color: "var(--text-muted)" } : {}}>Pire Trade</p>
              <p className={`mono text-xl font-bold ${forPrint ? "print-color-rose" : "text-rose-500"}`}>{stats.worst.result.toFixed(0)}€</p>
              <p className="text-sm mt-1" style={!forPrint ? { color: "var(--text-secondary)" } : {}}>
                {stats.worst.asset} | {new Date(stats.worst.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        )}

        {/* Equity Curve — weekly */}
        {reportType === "weekly" && (
          <div className={sectionClass}>
            <h3 className="font-semibold mb-2 text-sm">Courbe d&apos;Equity</h3>
            <div className="h-32">
              {renderEquitySVG(stats.cumulativeEquity)}
            </div>
          </div>
        )}

        {/* Strategy breakdown — weekly + monthly */}
        {(reportType === "weekly" || reportType === "monthly") && Object.keys(stats.byStrategy).length > 0 && (
          <div className={sectionClass}>
            <h3 className="font-semibold mb-2 text-sm">Performance par Stratégie</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={!forPrint ? { color: "var(--text-muted)" } : {}}>
                  <th className="pb-2 font-medium">Stratégie</th>
                  <th className="pb-2 font-medium text-center">Trades</th>
                  <th className="pb-2 font-medium text-center">Win Rate</th>
                  <th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byStrategy)
                  .sort(([, a], [, b]) => b.pnl - a.pnl)
                  .map(([strat, data]) => (
                    <tr key={strat} className="border-t" style={!forPrint ? { borderColor: "var(--border)" } : {}}>
                      <td className="py-1.5 font-medium" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{strat}</td>
                      <td className="py-1.5 text-center mono">{data.count}</td>
                      <td className="py-1.5 text-center mono">{((data.wins / data.count) * 100).toFixed(0)}%</td>
                      <td className={`py-1.5 text-right mono font-semibold ${data.pnl >= 0 ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                        {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Daily P&L — monthly */}
        {reportType === "monthly" && Object.keys(stats.dailyPnl).length > 0 && (
          <div className={sectionClass}>
            <h3 className="font-semibold mb-2 text-sm">P&L Journalier</h3>
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const entries = Object.entries(stats.dailyPnl);
                const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);
                return entries.map(([day, pnl], i) => {
                  const h = Math.max((Math.abs(pnl) / maxVal) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <span className="mono text-[8px] truncate">{pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}</span>
                      <div
                        className={`w-full rounded-t ${pnl >= 0 ? (forPrint ? "print-bg-emerald" : "bg-emerald-500/70") : (forPrint ? "print-bg-rose" : "bg-rose-500/70")}`}
                        style={{ height: `${h}%`, minHeight: "2px" }}
                      />
                      <span className="text-[7px] truncate">{day.split("/").slice(0, 2).join("/")}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* All trades table — monthly */}
        {reportType === "monthly" && (
          <div className={sectionClass}>
            <h3 className="font-semibold mb-2 text-sm">Tableau des Trades</h3>
            <div className={`${forPrint ? "" : "max-h-72 overflow-y-auto"}`}>
              <table className="w-full text-xs">
                <thead className={forPrint ? "" : "sticky top-0"} style={!forPrint ? { background: "var(--bg-primary)" } : {}}>
                  <tr className="text-left" style={!forPrint ? { color: "var(--text-muted)" } : {}}>
                    <th className="pb-1.5 font-medium">Date</th>
                    <th className="pb-1.5 font-medium">Actif</th>
                    <th className="pb-1.5 font-medium">Stratégie</th>
                    <th className="pb-1.5 font-medium text-center">Dir.</th>
                    <th className="pb-1.5 font-medium text-center">R:R</th>
                    <th className="pb-1.5 font-medium text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((t) => (
                      <tr key={t.id} className="border-t" style={!forPrint ? { borderColor: "var(--border)" } : {}}>
                        <td className="py-1" style={!forPrint ? { color: "var(--text-secondary)" } : {}}>{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-1 font-medium" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{t.asset}</td>
                        <td className="py-1" style={!forPrint ? { color: "var(--text-secondary)" } : {}}>{t.strategy || "-"}</td>
                        <td className={`py-1 text-center font-bold ${t.direction === "LONG" ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                          {t.direction}
                        </td>
                        <td className="py-1 text-center mono">{calculateRR(t.entry, t.sl, t.tp)}</td>
                        <td className={`py-1 text-right mono font-semibold ${t.result >= 0 ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                          {t.result >= 0 ? "+" : ""}{t.result.toFixed(0)}€
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prop Firm Audit Section */}
        {reportType === "propfirm" && (
          <>
            {/* Compliance checks */}
            <div className={sectionClass}>
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Shield className={`w-4 h-4 ${forPrint ? "" : "text-cyan-500"}`} />
                Conformité Prop Firm
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: "Drawdown maximal",
                    value: `-${stats.maxDD.toFixed(0)}€`,
                    detail: `Maximum observé sur la période`,
                    ok: true,
                  },
                  {
                    label: "Pire journée",
                    value: `${stats.worstDay.toFixed(0)}€`,
                    detail: `Perte journalière maximale`,
                    ok: stats.worstDay > -500, // threshold example
                  },
                  {
                    label: "Consistance",
                    value: `${stats.consistencyScore.toFixed(0)}%`,
                    detail: `${stats.profitableDays}/${stats.tradingDays} jours profitables`,
                    ok: stats.consistencyScore >= 50,
                  },
                  {
                    label: "Profit Factor",
                    value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
                    detail: `Ratio gains / pertes bruts`,
                    ok: stats.profitFactor >= 1,
                  },
                  {
                    label: "Nombre de jours de trading",
                    value: String(stats.tradingDays),
                    detail: `Minimum requis souvent : 10 jours`,
                    ok: stats.tradingDays >= 10,
                  },
                ].map((check, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${forPrint ? "border" : "glass"}`}>
                    <div className="flex items-center gap-3">
                      {check.ok
                        ? <CheckCircle2 className={`w-5 h-5 ${forPrint ? "print-color-emerald" : "text-emerald-500"}`} />
                        : <AlertTriangle className={`w-5 h-5 ${forPrint ? "print-color-amber" : "text-amber-500"}`} />
                      }
                      <div>
                        <p className="font-medium text-sm" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{check.label}</p>
                        <p className="text-[11px]" style={!forPrint ? { color: "var(--text-muted)" } : {}}>{check.detail}</p>
                      </div>
                    </div>
                    <p className="mono font-bold text-sm" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{check.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily results for prop firm */}
            <div className={sectionClass}>
              <h3 className="font-semibold mb-2 text-sm">Résultats journaliers</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={!forPrint ? { color: "var(--text-muted)" } : {}}>
                    <th className="pb-1.5 font-medium">Date</th>
                    <th className="pb-1.5 font-medium text-center">Trades</th>
                    <th className="pb-1.5 font-medium text-right">P&L</th>
                    <th className="pb-1.5 font-medium text-right">Cumulé</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const dayMap: Record<string, { count: number; pnl: number }> = {};
                    sorted.forEach((t) => {
                      const key = new Date(t.date).toLocaleDateString("fr-FR");
                      if (!dayMap[key]) dayMap[key] = { count: 0, pnl: 0 };
                      dayMap[key].count++;
                      dayMap[key].pnl += t.result;
                    });
                    let cum = 0;
                    return Object.entries(dayMap).map(([date, data]) => {
                      cum += data.pnl;
                      return (
                        <tr key={date} className="border-t" style={!forPrint ? { borderColor: "var(--border)" } : {}}>
                          <td className="py-1" style={!forPrint ? { color: "var(--text-secondary)" } : {}}>{date}</td>
                          <td className="py-1 text-center mono">{data.count}</td>
                          <td className={`py-1 text-right mono font-semibold ${data.pnl >= 0 ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                            {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                          </td>
                          <td className={`py-1 text-right mono ${cum >= 0 ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                            {cum >= 0 ? "+" : ""}{cum.toFixed(0)}€
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Equity curve for prop firm */}
            <div className={sectionClass}>
              <h3 className="font-semibold mb-2 text-sm">Courbe d&apos;Equity</h3>
              <div className="h-32">
                {renderEquitySVG(stats.cumulativeEquity)}
              </div>
            </div>

            {/* Asset performance for prop firm */}
            {Object.keys(stats.byAsset).length > 0 && (
              <div className={sectionClass}>
                <h3 className="font-semibold mb-2 text-sm">Performance par Actif</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left" style={!forPrint ? { color: "var(--text-muted)" } : {}}>
                      <th className="pb-1.5 font-medium">Actif</th>
                      <th className="pb-1.5 font-medium text-center">Trades</th>
                      <th className="pb-1.5 font-medium text-center">Win Rate</th>
                      <th className="pb-1.5 font-medium text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.byAsset).sort(([, a], [, b]) => b.pnl - a.pnl).map(([asset, data]) => (
                      <tr key={asset} className="border-t" style={!forPrint ? { borderColor: "var(--border)" } : {}}>
                        <td className="py-1 font-medium" style={!forPrint ? { color: "var(--text-primary)" } : {}}>{asset}</td>
                        <td className="py-1 text-center mono">{data.count}</td>
                        <td className="py-1 text-center mono">{((data.wins / data.count) * 100).toFixed(0)}%</td>
                        <td className={`py-1 text-right mono font-semibold ${data.pnl >= 0 ? (forPrint ? "print-color-emerald" : "text-emerald-500") : (forPrint ? "print-color-rose" : "text-rose-500")}`}>
                          {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className={`text-center py-3 text-[10px] ${forPrint ? "border-t mt-4" : ""}`} style={!forPrint ? { color: "var(--text-muted)" } : {}}>
          MarketPhase — Trading Journal Pro | {filtered.length} trades analysés | {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Hidden print container */}
      {showPreview && (
        <div id="report-print-root" ref={printRef} className="hidden print:block">
          {renderReportContent(true)}
        </div>
      )}

      <div className="space-y-6 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
              <FileText className="w-7 h-7 text-cyan-500" />
              Rapports & Export
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Génère tes rapports de performance détaillés
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["generate", "preview", "history"] as ViewMode[]).map((vm) => (
              <button
                key={vm}
                onClick={() => setViewMode(vm)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                  viewMode === vm ? "bg-cyan-500 text-white" : "glass hover:bg-[var(--bg-hover)]"
                }`}
                style={viewMode !== vm ? { color: "var(--text-secondary)" } : {}}
              >
                {vm === "generate" && <FileText className="w-4 h-4" />}
                {vm === "preview" && <Eye className="w-4 h-4" />}
                {vm === "history" && <History className="w-4 h-4" />}
                {vm === "generate" ? "Générer" : vm === "preview" ? "Aperçu" : "Historique"}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector — shown in generate and preview modes */}
        {viewMode !== "history" && (
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    period === p ? "bg-cyan-500 text-white" : "hover:bg-[var(--bg-hover)]"
                  }`}
                  style={period !== p ? { color: "var(--text-secondary)" } : {}}
                >
                  {periodLabels[p]}
                </button>
              ))}
              {period === "custom" && (
                <div className="flex items-center gap-2 ml-4">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field text-sm px-3 py-1.5 rounded-lg" />
                  <span style={{ color: "var(--text-muted)" }}>→</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field text-sm px-3 py-1.5 rounded-lg" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── GENERATE MODE ──── */}
        {viewMode === "generate" && (
          <>
            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(reportTypeLabels) as [ReportType, typeof reportTypeLabels[ReportType]][]).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`glass rounded-2xl p-5 text-left transition-all ${
                    reportType === type ? "ring-2 ring-cyan-500 bg-cyan-500/5" : "hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <info.icon className={`w-6 h-6 mb-2 ${reportType === type ? "text-cyan-500" : ""}`} style={reportType !== type ? { color: "var(--text-muted)" } : {}} />
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>{info.label}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{info.desc}</p>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGeneratePDF}
                  disabled={!stats}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  Générer PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="glass px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-500/10 transition"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Download className="w-4 h-4 text-emerald-500" />
                  Export CSV
                </button>
                <button
                  onClick={handleEmail}
                  disabled={!stats}
                  className="glass px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-500/10 transition disabled:opacity-40"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Envoyer par email
                </button>
                <button
                  onClick={() => { if (stats) setViewMode("preview"); }}
                  disabled={!stats}
                  className="glass px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-500/10 transition disabled:opacity-40"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Eye className="w-4 h-4 text-amber-500" />
                  Aperçu
                </button>
              </div>
              {!stats && (
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Aucun trade sur cette période. Sélectionnez une autre période pour générer un rapport.
                </p>
              )}
            </div>

            {/* Existing stats display (original content) */}
            {stats && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label: "Trades", value: stats.total, icon: BarChart3, color: "text-cyan-500" },
                    { label: "Wins", value: stats.wins, icon: TrendingUp, color: "text-emerald-500" },
                    { label: "Losses", value: stats.losses, icon: TrendingDown, color: "text-rose-500" },
                    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: "text-amber-500" },
                    { label: "P&L", value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)}€`, icon: Award, color: stats.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500" },
                    { label: "Profit Factor", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2), icon: PieChart, color: "text-indigo-500" },
                    { label: "Avg R:R", value: stats.avgRR.toFixed(2), icon: Target, color: "text-teal-500" },
                    { label: "Max DD", value: `-${stats.maxDD.toFixed(0)}€`, icon: TrendingDown, color: "text-rose-500" },
                  ].map((kpi, i) => (
                    <div key={i} className="glass rounded-xl p-3 text-center">
                      <kpi.icon className={`w-4 h-4 mx-auto mb-1 ${kpi.color}`} />
                      <p className="mono text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass rounded-2xl p-4 border-l-4 border-emerald-500">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Meilleur Trade</p>
                    <p className="mono text-xl font-bold text-emerald-500">+{stats.best.result.toFixed(0)}€</p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      {stats.best.asset} • {new Date(stats.best.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="glass rounded-2xl p-4 border-l-4 border-rose-500">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Pire Trade</p>
                    <p className="mono text-xl font-bold text-rose-500">{stats.worst.result.toFixed(0)}€</p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      {stats.worst.asset} • {new Date(stats.worst.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="glass rounded-2xl p-4 border-l-4 border-cyan-500">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Séries</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div>
                        <p className="mono text-xl font-bold text-emerald-500">{stats.maxWinStreak}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Best Win</p>
                      </div>
                      <div>
                        <p className="mono text-xl font-bold text-rose-500">{stats.maxLossStreak}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Max Loss</p>
                      </div>
                      <div>
                        <p className="mono text-xl font-bold text-cyan-500">{stats.tradingDays}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Jours</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Sections */}
                {/* By Asset */}
                <div className="glass rounded-2xl overflow-hidden">
                  <button onClick={() => toggle("asset")} className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition">
                    <span className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <BarChart3 className="w-4 h-4 text-cyan-500" /> Performance par Actif
                    </span>
                    {expandedSection === "asset" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {(expandedSection === "asset" || true) && (
                    <div className="p-4 pt-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                            <th className="pb-2 font-medium">Actif</th>
                            <th className="pb-2 font-medium text-center">Trades</th>
                            <th className="pb-2 font-medium text-center">Win Rate</th>
                            <th className="pb-2 font-medium text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.byAsset)
                            .sort(([, a], [, b]) => b.pnl - a.pnl)
                            .map(([asset, data]) => (
                              <tr key={asset} className="border-t" style={{ borderColor: "var(--border)" }}>
                                <td className="py-2 font-medium" style={{ color: "var(--text-primary)" }}>{asset}</td>
                                <td className="py-2 text-center mono" style={{ color: "var(--text-secondary)" }}>{data.count}</td>
                                <td className="py-2 text-center mono" style={{ color: "var(--text-secondary)" }}>
                                  {((data.wins / data.count) * 100).toFixed(0)}%
                                </td>
                                <td className={`py-2 text-right mono font-semibold ${data.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* By Strategy */}
                <div className="glass rounded-2xl overflow-hidden">
                  <button onClick={() => toggle("strategy")} className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition">
                    <span className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Target className="w-4 h-4 text-indigo-500" /> Performance par Stratégie
                    </span>
                    {expandedSection === "strategy" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {(expandedSection === "strategy" || true) && (
                    <div className="p-4 pt-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                            <th className="pb-2 font-medium">Stratégie</th>
                            <th className="pb-2 font-medium text-center">Trades</th>
                            <th className="pb-2 font-medium text-center">Win Rate</th>
                            <th className="pb-2 font-medium text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.byStrategy)
                            .sort(([, a], [, b]) => b.pnl - a.pnl)
                            .map(([strat, data]) => (
                              <tr key={strat} className="border-t" style={{ borderColor: "var(--border)" }}>
                                <td className="py-2 font-medium" style={{ color: "var(--text-primary)" }}>{strat}</td>
                                <td className="py-2 text-center mono" style={{ color: "var(--text-secondary)" }}>{data.count}</td>
                                <td className="py-2 text-center mono" style={{ color: "var(--text-secondary)" }}>
                                  {((data.wins / data.count) * 100).toFixed(0)}%
                                </td>
                                <td className={`py-2 text-right mono font-semibold ${data.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {data.pnl >= 0 ? "+" : ""}{data.pnl.toFixed(0)}€
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* By Day of Week */}
                <div className="glass rounded-2xl overflow-hidden">
                  <button onClick={() => toggle("day")} className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition">
                    <span className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Calendar className="w-4 h-4 text-amber-500" /> Performance par Jour
                    </span>
                    {expandedSection === "day" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {(expandedSection === "day" || true) && (
                    <div className="p-4 pt-0">
                      <div className="flex items-end gap-2 h-32">
                        {Object.entries(stats.byDay).map(([day, data]) => {
                          const maxPnl = Math.max(...Object.values(stats.byDay).map((d) => Math.abs(d.pnl)), 1);
                          const h = Math.max((Math.abs(data.pnl) / maxPnl) * 100, 4);
                          return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                              <span className="mono text-[10px]" style={{ color: "var(--text-primary)" }}>
                                {data.count > 0 ? `${data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(0)}` : "-"}
                              </span>
                              <div
                                className={`w-full rounded-t-lg transition-all ${data.pnl >= 0 ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
                                style={{ height: `${data.count > 0 ? h : 4}%` }}
                              />
                              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trade History */}
                <div className="glass rounded-2xl overflow-hidden">
                  <button onClick={() => toggle("trades")} className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition">
                    <span className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Clock className="w-4 h-4 text-teal-500" /> Historique des Trades ({filtered.length})
                    </span>
                    {expandedSection === "trades" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {(expandedSection === "trades" || true) && (
                    <div className="p-4 pt-0 max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0" style={{ background: "var(--bg-primary)" }}>
                          <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Actif</th>
                            <th className="pb-2 font-medium text-center">Direction</th>
                            <th className="pb-2 font-medium text-center">R:R</th>
                            <th className="pb-2 font-medium text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...filtered]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((t) => {
                              const rr = calculateRR(t.entry, t.sl, t.tp);
                              return (
                                <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                                  <td className="py-1.5" style={{ color: "var(--text-secondary)" }}>
                                    {new Date(t.date).toLocaleDateString("fr-FR")}
                                  </td>
                                  <td className="py-1.5 font-medium" style={{ color: "var(--text-primary)" }}>{t.asset}</td>
                                  <td className={`py-1.5 text-center text-xs font-bold ${t.direction === "LONG" ? "text-emerald-500" : "text-rose-500"}`}>
                                    {t.direction}
                                  </td>
                                  <td className="py-1.5 text-center mono" style={{ color: "var(--text-secondary)" }}>
                                    {rr !== "-" ? rr : "-"}
                                  </td>
                                  <td className={`py-1.5 text-right mono font-semibold ${t.result >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {t.result >= 0 ? "+" : ""}{t.result.toFixed(0)}€
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Equity Curve */}
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <TrendingUp className="w-4 h-4 text-cyan-500" /> Courbe d&apos;Equity
                  </h3>
                  <div className="h-40">
                    {renderEquitySVG(stats.cumulativeEquity)}
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                  <p className="text-xs">MarketPhase — Trading Journal Pro • {filtered.length} trades analysés</p>
                </div>
              </>
            )}
          </>
        )}

        {/* ──── PREVIEW MODE ──── */}
        {viewMode === "preview" && (
          <>
            {!stats ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p style={{ color: "var(--text-secondary)" }}>Aucun trade sur cette période. Changez la période pour voir un aperçu.</p>
              </div>
            ) : (
              <>
                {/* Report type selector in preview */}
                <div className="flex items-center gap-3 flex-wrap">
                  {(Object.entries(reportTypeLabels) as [ReportType, typeof reportTypeLabels[ReportType]][]).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => setReportType(type)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                        reportType === type ? "bg-cyan-500 text-white" : "glass hover:bg-[var(--bg-hover)]"
                      }`}
                      style={reportType !== type ? { color: "var(--text-secondary)" } : {}}
                    >
                      <info.icon className="w-4 h-4" />
                      {info.label}
                    </button>
                  ))}
                </div>

                {/* Preview container */}
                <div className="glass rounded-2xl p-6 border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aperçu du rapport</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleGeneratePDF}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimer / PDF
                      </button>
                      <button
                        onClick={handleEmail}
                        className="glass px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-cyan-500/10 transition"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        Email
                      </button>
                    </div>
                  </div>

                  {/* Actual preview */}
                  {renderReportContent(false)}
                </div>
              </>
            )}
          </>
        )}

        {/* ──── HISTORY MODE ──── */}
        {viewMode === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <History className="w-5 h-5 text-cyan-500" />
                Historique des rapports
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-rose-500/10 transition text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Tout effacer
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p style={{ color: "var(--text-secondary)" }}>Aucun rapport généré pour le moment.</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Générez un rapport pour le voir apparaître ici.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        entry.type === "weekly" ? "bg-cyan-500/10" : entry.type === "monthly" ? "bg-indigo-500/10" : "bg-amber-500/10"
                      }`}>
                        {entry.type === "weekly" && <BookOpen className="w-5 h-5 text-cyan-500" />}
                        {entry.type === "monthly" && <FileBarChart className="w-5 h-5 text-indigo-500" />}
                        {entry.type === "propfirm" && <Shield className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                          {reportTypeLabels[entry.type].label}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {entry.periodLabel} • {entry.tradesCount} trades • {new Date(entry.date).toLocaleDateString("fr-FR")} à {new Date(entry.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`mono font-bold text-sm ${entry.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {entry.pnl >= 0 ? "+" : ""}{entry.pnl.toFixed(0)}€
                      </span>
                      <button
                        onClick={() => deleteHistoryEntry(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                      >
                        <X className="w-4 h-4 text-rose-500/60 hover:text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
