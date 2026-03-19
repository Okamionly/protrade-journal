"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { calculateRR, computeStats, formatCurrency } from "@/lib/utils";
import {
  FileText,
  Download,
  Copy,
  MessageSquare,
  Calendar,
  Printer,
  History,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
} from "lucide-react";

type PeriodKey = "week" | "month" | "last_month" | "custom";
type ReportType = "summary" | "detailed" | "prop_audit";

interface ReportHistoryEntry {
  id: string;
  date: string;
  period: string;
  type: ReportType;
  from: string;
  to: string;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  last_month: "Mois dernier",
  custom: "Custom range",
};

const TYPE_LABELS: Record<ReportType, string> = {
  summary: "Resume",
  detailed: "Detaille",
  prop_audit: "Prop Firm Audit",
};

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function getDateRange(period: PeriodKey, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date();
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, now];
  }
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return [start, end];
  }
  return [new Date(customFrom || now), new Date(customTo || now)];
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReportsPage() {
  const { trades, loading } = useTrades();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [generated, setGenerated] = useState(false);
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mp_report_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const [rangeStart, rangeEnd] = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        const d = new Date(t.date);
        return d >= rangeStart && d <= rangeEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades, rangeStart, rangeEnd]);

  const stats = useMemo(() => computeStats(filteredTrades), [filteredTrades]);

  const equityPoints = useMemo(() => {
    let cum = 0;
    return filteredTrades.map((t) => {
      cum += t.result;
      return cum;
    });
  }, [filteredTrades]);

  const bestTrades = useMemo(
    () => [...filteredTrades].sort((a, b) => b.result - a.result).slice(0, 3),
    [filteredTrades]
  );
  const worstTrades = useMemo(
    () => [...filteredTrades].sort((a, b) => a.result - b.result).slice(0, 3),
    [filteredTrades]
  );

  const dayPerformance = useMemo(() => {
    const days: Record<number, { pnl: number; count: number }> = {};
    for (let i = 0; i < 7; i++) days[i] = { pnl: 0, count: 0 };
    filteredTrades.forEach((t) => {
      const d = new Date(t.date).getDay();
      days[d].pnl += t.result;
      days[d].count++;
    });
    return days;
  }, [filteredTrades]);

  const strategyPerformance = useMemo(() => {
    const map: Record<string, { count: number; wins: number; pnl: number }> = {};
    filteredTrades.forEach((t) => {
      const s = t.strategy || "N/A";
      if (!map[s]) map[s] = { count: 0, wins: 0, pnl: 0 };
      map[s].count++;
      map[s].pnl += t.result;
      if (t.result > 0) map[s].wins++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, winRate: d.count > 0 ? (d.wins / d.count) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + t.result;
    });
    const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, pnl]) => {
        const [y, m] = key.split("-");
        return { label: `${months[parseInt(m) - 1]} ${y}`, pnl };
      });
  }, [filteredTrades]);

  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (filteredTrades.length === 0) return ["Aucun trade sur cette période."];
    if (stats.winRate >= 60) msgs.push(`Win rate solide à ${stats.winRate.toFixed(0)}% - bonne discipline.`);
    else if (stats.winRate < 40) msgs.push(`Win rate faible (${stats.winRate.toFixed(0)}%) - revoir les critères d'entrée.`);
    if (stats.profitFactor > 1.5) msgs.push(`Profit factor de ${stats.profitFactor.toFixed(2)} - performance rentable.`);
    else if (stats.profitFactor < 1) msgs.push(`Profit factor < 1 - les pertes dépassent les gains.`);
    const bestDay = Object.entries(dayPerformance).sort(([, a], [, b]) => b.pnl - a.pnl)[0];
    if (bestDay && bestDay[1].pnl > 0) msgs.push(`Meilleur jour: ${DAY_NAMES[parseInt(bestDay[0])]} (${formatCurrency(bestDay[1].pnl)}).`);
    if (stats.maxDrawdown > 0) msgs.push(`Drawdown max de ${formatCurrency(-stats.maxDrawdown)} - gérer le risque.`);
    if (msgs.length === 0) msgs.push("Période analysée avec succès.");
    return msgs;
  }, [filteredTrades, stats, dayPerformance]);

  const handleGenerate = useCallback(() => {
    setGenerated(true);
    const entry: ReportHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      period: PERIOD_LABELS[period],
      type: reportType,
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    };
    const updated = [entry, ...history].slice(0, 5);
    setHistory(updated);
    try { localStorage.setItem("mp_report_history", JSON.stringify(updated)); } catch { /* ignore */ }
  }, [period, reportType, rangeStart, rangeEnd, history]);

  const handlePrint = () => window.print();

  const handleCopy = useCallback(() => {
    const text = [
      `MarketPhase - Rapport ${TYPE_LABELS[reportType]}`,
      `Période: ${formatDateShort(rangeStart)} - ${formatDateShort(rangeEnd)}`,
      `P&L: ${formatCurrency(stats.netProfit)}`,
      `Win Rate: ${stats.winRate.toFixed(1)}%`,
      `Profit Factor: ${stats.profitFactor.toFixed(2)}`,
      `Trades: ${stats.totalTrades} (${stats.wins}W / ${stats.losses}L)`,
      `RR Moyen: ${stats.avgRR}`,
      `Max DD: ${formatCurrency(-stats.maxDrawdown)}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reportType, rangeStart, rangeEnd, stats]);

  const handleRegenerate = (entry: ReportHistoryEntry) => {
    setReportType(entry.type);
    if (entry.period === "Custom range") {
      setPeriod("custom");
      setCustomFrom(entry.from.split("T")[0]);
      setCustomTo(entry.to.split("T")[0]);
    } else {
      const key = Object.entries(PERIOD_LABELS).find(([, v]) => v === entry.period)?.[0] as PeriodKey;
      if (key) setPeriod(key);
    }
    setGenerated(true);
  };

  // SVG helpers
  const maxEq = Math.max(...equityPoints.map(Math.abs), 1);
  const maxDayPnl = Math.max(...Object.values(dayPerformance).map((d) => Math.abs(d.pnl)), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-8 animate-pulse" style={{ height: 120 }} />
        <div className="glass rounded-2xl p-8 animate-pulse" style={{ height: 400 }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-preview, #report-preview * { visibility: visible !important; }
          #report-preview { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #111 !important; padding: 24px; }
          #report-preview .glass { background: #fff !important; border: 1px solid #ddd !important; box-shadow: none !important; backdrop-filter: none !important; }
          #report-preview .text-emerald-400, #report-preview .text-emerald-500 { color: #059669 !important; }
          #report-preview .text-rose-400, #report-preview .text-rose-500 { color: #e11d48 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Report Generator */}
        <div className="glass rounded-2xl p-6 no-print">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Rapports & Export</h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Générez des rapports professionnels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period selector */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Période</label>
              <select
                value={period}
                onChange={(e) => { setPeriod(e.target.value as PeriodKey); setGenerated(false); }}
                className="w-full glass rounded-lg px-3 py-2 text-sm"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }}
              >
                {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Report type */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Type de rapport</label>
              <select
                value={reportType}
                onChange={(e) => { setReportType(e.target.value as ReportType); setGenerated(false); }}
                className="w-full glass rounded-lg px-3 py-2 text-sm"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Generate button */}
            <div className="flex items-end">
              <button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Générer le rapport
              </button>
            </div>
          </div>

          {/* Custom date pickers */}
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Du</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-sm" style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Au</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-sm" style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Export Options */}
        {generated && (
          <div className="flex flex-wrap gap-3 no-print">
            <button onClick={handlePrint} className="glass rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: "var(--text-primary)" }}>
              <Printer className="w-4 h-4" /> Telecharger PDF
            </button>
            <button onClick={handleCopy} className="glass rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: "var(--text-primary)" }}>
              <Copy className="w-4 h-4" /> {copied ? "Copie !" : "Copier le resume"}
            </button>
            <button className="glass rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              <MessageSquare className="w-4 h-4" /> Partager dans le Chat
            </button>
          </div>
        )}

        {/* Report Preview */}
        {generated && (
          <div id="report-preview" className="glass rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>MarketPhase</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Trading Performance Report</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{TYPE_LABELS[reportType]}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateShort(rangeStart)} &mdash; {formatDateShort(rangeEnd)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Généré le {new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-8">
              {/* Section 1: Summary Stats */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  1. Statistiques Generales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "P&L Total", value: formatCurrency(stats.netProfit), color: stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400" },
                    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                    { label: "Profit Factor", value: stats.profitFactor === Infinity ? "inf" : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400" },
                    { label: "Total Trades", value: `${stats.totalTrades}`, color: "" },
                    { label: "RR Moyen", value: stats.avgRR, color: "text-blue-400" },
                    { label: "Max Drawdown", value: formatCurrency(-stats.maxDrawdown), color: "text-rose-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      <p className={`text-xl font-bold mono mt-1 ${s.color}`} style={!s.color ? { color: "var(--text-primary)" } : undefined}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 2: Equity Curve */}
              {equityPoints.length > 1 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                    2. Courbe d&apos;Equity
                  </h3>
                  <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
                    <svg viewBox="0 0 600 200" className="w-full" preserveAspectRatio="xMidYMid meet">
                      <line x1="0" y1="100" x2="600" y2="100" stroke="var(--border)" strokeDasharray="4" />
                      <polyline
                        fill="none"
                        stroke={equityPoints[equityPoints.length - 1] >= 0 ? "#34d399" : "#fb7185"}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        points={equityPoints
                          .map((v, i) => {
                            const x = (i / (equityPoints.length - 1)) * 580 + 10;
                            const y = 100 - (v / maxEq) * 85;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                      <text x="4" y="14" fill="var(--text-muted)" fontSize="10">{formatCurrency(maxEq)}</text>
                      <text x="4" y="196" fill="var(--text-muted)" fontSize="10">{formatCurrency(-maxEq)}</text>
                    </svg>
                  </div>
                </section>
              )}

              {/* Section 3: Best & Worst Trades */}
              {(reportType === "detailed" || reportType === "prop_audit") && filteredTrades.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                    3. Top Trades
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TradeTable title="Top 3 Meilleurs" trades={bestTrades} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} />
                    <TradeTable title="Top 3 Pires" trades={worstTrades} icon={<TrendingDown className="w-4 h-4 text-rose-400" />} />
                  </div>
                </section>
              )}

              {/* Section 4: Performance by Day */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  {reportType === "detailed" || reportType === "prop_audit" ? "4" : "3"}. Performance par Jour
                </h3>
                <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
                  <svg viewBox="0 0 600 180" className="w-full" preserveAspectRatio="xMidYMid meet">
                    <line x1="0" y1="130" x2="600" y2="130" stroke="var(--border)" strokeWidth="1" />
                    {[1, 2, 3, 4, 5, 6, 0].map((day, i) => {
                      const d = dayPerformance[day];
                      const barH = (Math.abs(d.pnl) / maxDayPnl) * 100;
                      const isPos = d.pnl >= 0;
                      const x = i * 82 + 30;
                      return (
                        <g key={day}>
                          <rect
                            x={x}
                            y={isPos ? 130 - barH : 130}
                            width="50"
                            height={barH || 2}
                            rx="4"
                            fill={isPos ? "#34d399" : "#fb7185"}
                            opacity={0.8}
                          />
                          <text x={x + 25} y="155" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
                            {DAY_NAMES[day]}
                          </text>
                          <text x={x + 25} y="170" textAnchor="middle" fill="var(--text-muted)" fontSize="9">
                            {d.count}t
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </section>

              {/* Section 5: Strategy Performance */}
              {strategyPerformance.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                    {reportType === "detailed" || reportType === "prop_audit" ? "5" : "4"}. Performance par Stratégie
                  </h3>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>Stratégie</th>
                          <th className="text-right px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>Trades</th>
                          <th className="text-right px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>Win Rate</th>
                          <th className="text-right px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {strategyPerformance.map((s) => (
                          <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                            <td className="px-4 py-2.5 text-right mono" style={{ color: "var(--text-secondary)" }}>{s.count}</td>
                            <td className="px-4 py-2.5 text-right mono" style={{ color: s.winRate >= 50 ? "#34d399" : "#fb7185" }}>
                              {s.winRate.toFixed(0)}%
                            </td>
                            <td className={`px-4 py-2.5 text-right mono font-medium ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatCurrency(s.pnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Section 6: Monthly Comparison */}
              {monthlyData.length > 1 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                    {reportType === "detailed" || reportType === "prop_audit" ? "6" : "5"}. Comparaison Mensuelle
                  </h3>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>Mois</th>
                          <th className="text-right px-4 py-2.5 font-medium" style={{ color: "var(--text-muted)" }}>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((m) => (
                          <tr key={m.label} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{m.label}</td>
                            <td className={`px-4 py-2.5 text-right mono font-medium ${m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatCurrency(m.pnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Section 7: Key Takeaways */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  Points Cles
                </h3>
                <div className="rounded-xl p-5 space-y-2" style={{ border: "1px solid var(--border)" }}>
                  {insights.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{msg}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <div className="pt-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  MarketPhase &mdash; Rapport genere automatiquement &mdash; {new Date().toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report History */}
        {history.length > 0 && (
          <div className="glass rounded-2xl p-6 no-print">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Historique des Rapports</h3>
            </div>
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleRegenerate(entry)}
                  className="w-full flex items-center justify-between glass rounded-lg px-4 py-3 text-left hover:opacity-80 transition-opacity"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {TYPE_LABELS[entry.type]} &mdash; {entry.period}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(entry.date).toLocaleDateString("fr-FR")} a {new Date(entry.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <RefreshCw className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* Mini trade table component */
function TradeTable({ title, trades, icon }: { title: string; trades: Trade[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {icon}
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Date</th>
            <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Asset</th>
            <th className="text-right px-3 py-2 font-medium" style={{ color: "var(--text-muted)" }}>RR</th>
            <th className="text-right px-3 py-2 font-medium" style={{ color: "var(--text-muted)" }}>P&L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                {new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </td>
              <td className="px-3 py-2 font-medium" style={{ color: "var(--text-primary)" }}>{t.asset}</td>
              <td className="px-3 py-2 text-right mono text-blue-400">{calculateRR(t.entry, t.sl, t.tp)}</td>
              <td className={`px-3 py-2 text-right mono font-medium ${t.result >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(t.result)}
              </td>
            </tr>
          ))}
          {trades.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-center" style={{ color: "var(--text-muted)" }}>Aucun trade</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
