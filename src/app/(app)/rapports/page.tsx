"use client";

import { useState } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import {
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  Target, Award, BarChart3, PieChart, Printer,
  ChevronDown, ChevronUp, Filter, Clock
} from "lucide-react";

type Period = "week" | "month" | "quarter" | "year" | "custom";

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

function computeStats(trades: Trade[]) {
  if (!trades.length) return null;
  const wins = trades.filter((t) => (t.result) > 0);
  const losses = trades.filter((t) => (t.result) < 0);
  const totalPnl = trades.reduce((s, t) => s + (t.result), 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.result), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.result), 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
  const rrs = trades.map((t) => parseFloat(calculateRR(t.entry, t.sl, t.tp))).filter((r) => !isNaN(r) && isFinite(r));
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  // Max drawdown
  let peak = 0, maxDD = 0, running = 0;
  trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((t) => {
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
    if ((t.result) > 0) byAsset[a].wins++;
  });

  // By strategy
  const byStrategy: Record<string, { count: number; pnl: number; wins: number }> = {};
  trades.forEach((t) => {
    const s = t.strategy || "Sans stratégie";
    if (!byStrategy[s]) byStrategy[s] = { count: 0, pnl: 0, wins: 0 };
    byStrategy[s].count++;
    byStrategy[s].pnl += t.result;
    if ((t.result) > 0) byStrategy[s].wins++;
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

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, cs = 0;
  trades.forEach((t) => {
    if ((t.result) > 0) { cs = cs > 0 ? cs + 1 : 1; maxWinStreak = Math.max(maxWinStreak, cs); }
    else { cs = cs < 0 ? cs - 1 : -1; maxLossStreak = Math.max(maxLossStreak, Math.abs(cs)); }
  });

  // Trading days
  const tradingDays = new Set(trades.map((t) => new Date(t.date).toDateString())).size;

  return {
    total: trades.length, wins: wins.length, losses: losses.length, totalPnl,
    winRate, avgWin, avgLoss, profitFactor, avgRR, maxDD, best, worst,
    byAsset, byStrategy, byDay, maxWinStreak, maxLossStreak, tradingDays,
  };
}

export default function RapportsPage() {
  const { trades } = useTrades();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const filtered = getTradesForPeriod(trades, period, customStart, customEnd);
  const stats = computeStats(filtered);

  const periodLabels: Record<Period, string> = {
    week: "Cette semaine",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année",
    custom: "Personnalisé",
  };

  const handlePrint = () => {
    window.print();
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

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <FileText className="w-7 h-7 text-cyan-500" />
            Rapports & Export
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Génère ton rapport de performance détaillé
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={handlePrint} className="glass px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-500/10 transition" style={{ color: "var(--text-primary)" }}>
            <Printer className="w-4 h-4 text-cyan-500" />
            Imprimer / PDF
          </button>
          <button onClick={handleExportCSV} className="glass px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-500/10 transition" style={{ color: "var(--text-primary)" }}>
            <Download className="w-4 h-4 text-emerald-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass rounded-2xl p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                period === p
                  ? "bg-cyan-500 text-white"
                  : "hover:bg-[var(--bg-hover)]"
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

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-bold">MarketPhase — Rapport de Performance</h2>
        <p className="text-sm text-gray-500">{periodLabels[period]} • Généré le {new Date().toLocaleDateString("fr-FR")}</p>
      </div>

      {!stats ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: "var(--text-secondary)" }}>Aucun trade sur cette période</p>
        </div>
      ) : (
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
            {/* Best Trade */}
            <div className="glass rounded-2xl p-4 border-l-4 border-emerald-500">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Meilleur Trade</p>
              <p className="mono text-xl font-bold text-emerald-500">+{(stats.best.result).toFixed(0)}€</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {stats.best.asset} • {new Date(stats.best.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {/* Worst Trade */}
            <div className="glass rounded-2xl p-4 border-l-4 border-rose-500">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Pire Trade</p>
              <p className="mono text-xl font-bold text-rose-500">{(stats.worst.result).toFixed(0)}€</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {stats.worst.asset} • {new Date(stats.worst.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {/* Streaks */}
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
                        <span className="mono text-[10px]" style={{ color: data.pnl >= 0 ? "var(--text-primary)" : "var(--text-primary)" }}>
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
                            <td className={`py-1.5 text-right mono font-semibold ${(t.result) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {(t.result) >= 0 ? "+" : ""}{(t.result).toFixed(0)}€
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
              <svg viewBox="0 0 800 160" className="w-full h-full" preserveAspectRatio="none">
                {(() => {
                  const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const cumulative: number[] = [];
                  let sum = 0;
                  sorted.forEach((t) => { sum += t.result; cumulative.push(sum); });
                  if (!cumulative.length) return null;
                  const min = Math.min(0, ...cumulative);
                  const max = Math.max(0, ...cumulative);
                  const range = max - min || 1;
                  const points = cumulative.map((v, i) => {
                    const x = (i / Math.max(cumulative.length - 1, 1)) * 800;
                    const y = 150 - ((v - min) / range) * 140;
                    return `${x},${y}`;
                  });
                  const final = cumulative[cumulative.length - 1];
                  const color = final >= 0 ? "#10b981" : "#ef4444";
                  return (
                    <>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,${150 - ((0 - min) / range) * 140} ${points.join(" ")} 800,${150 - ((0 - min) / range) * 140}`} fill="url(#eqGrad)" />
                      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2.5" />
                      {/* Zero line */}
                      <line x1="0" y1={150 - ((0 - min) / range) * 140} x2="800" y2={150 - ((0 - min) / range) * 140} stroke="white" strokeOpacity="0.15" strokeDasharray="4" />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4 print:py-2" style={{ color: "var(--text-muted)" }}>
            <p className="text-xs">MarketPhase — Trading Journal Pro • {filtered.length} trades analysés</p>
          </div>
        </>
      )}
    </div>
  );
}
