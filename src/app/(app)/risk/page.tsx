"use client";

import { useState, useMemo } from "react";
import { useTrades, useUser } from "@/hooks/useTrades";
import { computeRiskMetrics, computeDrawdownCurve, calculatePositionSize, computeKellyRaw, type Trade, type AssetType } from "@/lib/advancedStats";
import { Shield, AlertTriangle, Calculator, TrendingDown, Percent, DollarSign, BarChart3, Activity, RotateCcw, Crosshair, Zap, Shuffle, Clock, Target, Brain, TrendingUp } from "lucide-react";
import { useTranslation } from "@/i18n/context";

export default function RiskPage() {
  const { trades, loading } = useTrades();
  const { t } = useTranslation();

  const DAYS_FR_SHORT = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
  const { user } = useUser();
  const balance = user?.balance ?? 10000;

  // Position sizing calculator state
  const [calcEntry, setCalcEntry] = useState(1.085);
  const [calcSl, setCalcSl] = useState(1.083);
  const [calcRisk, setCalcRisk] = useState(1);
  const [assetType, setAssetType] = useState<AssetType>("forex");

  const risk = useMemo(() => computeRiskMetrics(trades as unknown as Trade[], balance), [trades, balance]);
  const drawdown = useMemo(() => computeDrawdownCurve(trades as unknown as Trade[], balance), [trades, balance]);
  const kellyRaw = useMemo(() => computeKellyRaw(trades as unknown as Trade[]), [trades]);
  const posSize = useMemo(() => calculatePositionSize(balance, calcRisk, calcEntry, calcSl, 10, assetType), [balance, calcRisk, calcEntry, calcSl, assetType]);

  const maxDDPoint = drawdown.length > 0 ? drawdown.reduce((max, p) => p.drawdownPercent > max.drawdownPercent ? p : max, drawdown[0]) : { drawdownPercent: 0 };

  // VaR calculation
  const varMetrics = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    if (typedTrades.length < 5) return null;
    const results = typedTrades.map((t) => t.result).sort((a, b) => a - b);
    const idx95 = Math.floor(results.length * 0.05);
    const idx99 = Math.floor(results.length * 0.01);
    return {
      var95: results[idx95] ?? results[0],
      var99: results[idx99] ?? results[0],
    };
  }, [trades]);

  // Risk heatmap: asset (rows) x day-of-week (columns)
  const heatmapData = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    if (typedTrades.length === 0) return null;

    const map: Record<string, Record<number, { pnl: number; count: number }>> = {};
    typedTrades.forEach((t) => {
      const asset = t.asset || "N/A";
      const day = new Date(t.date).getDay();
      if (!map[asset]) map[asset] = {};
      if (!map[asset][day]) map[asset][day] = { pnl: 0, count: 0 };
      map[asset][day].pnl += t.result;
      map[asset][day].count++;
    });

    const assets = Object.keys(map).sort();
    const weekdays = [1, 2, 3, 4, 5]; // Lun-Ven
    let minAvg = 0, maxAvg = 0;

    assets.forEach((asset) => {
      weekdays.forEach((day) => {
        const cell = map[asset]?.[day];
        if (cell && cell.count > 0) {
          const avg = cell.pnl / cell.count;
          if (avg < minAvg) minAvg = avg;
          if (avg > maxAvg) maxAvg = avg;
        }
      });
    });

    return { map, assets, weekdays, minAvg, maxAvg };
  }, [trades]);

  // Recovery calculator
  const recoveryCalc = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    if (typedTrades.length === 0) return null;

    // Current drawdown from drawdown curve
    const lastPoint = drawdown[drawdown.length - 1];
    const currentDD = lastPoint ? lastPoint.drawdown : 0;
    const expectancy = risk.expectancy;

    if (currentDD <= 0) return { drawdown: 0, expectancy, tradesToRecover: 0, inDrawdown: false };

    const tradesToRecover = expectancy > 0 ? Math.ceil(Math.abs(currentDD) / expectancy) : Infinity;

    return { drawdown: currentDD, expectancy, tradesToRecover, inDrawdown: true };
  }, [trades, drawdown, risk.expectancy]);

  // ===== REAL-TIME EXPOSURE =====
  const exposureData = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    const today = new Date().toISOString().slice(0, 10);
    const openTrades = typedTrades.filter(t => {
      if (t.exit === null || t.exit === 0) return true;
      const tradeDate = t.date.slice(0, 10);
      return tradeDate === today && t.exit === null;
    });
    const totalRiskEur = openTrades.reduce((sum, t) => {
      const slDist = Math.abs(t.entry - t.sl);
      const isJPY = t.asset?.includes("JPY");
      const multiplier = isJPY ? 1000 : 100000;
      return sum + slDist * (t.lots || 0.01) * multiplier;
    }, 0);
    const riskPct = balance > 0 ? (totalRiskEur / balance) * 100 : 0;
    const maxAllowedPct = 5;
    return { openCount: openTrades.length, totalRiskEur, riskPct, maxAllowedPct };
  }, [trades, balance]);

  // ===== ENHANCED DRAWDOWN HISTORY =====
  const drawdownHistory = useMemo(() => {
    if (drawdown.length <= 1) return null;
    const points = drawdown.slice(1);
    let maxDDPct = 0;
    let maxDDDate = "";
    const equityCurve = points.map(p => p.equity);
    const ddPcts = points.map(p => p.drawdownPercent);

    // Find max DD
    points.forEach(p => {
      if (p.drawdownPercent > maxDDPct) {
        maxDDPct = p.drawdownPercent;
        maxDDDate = p.date;
      }
    });

    // Identify drawdown zones (contiguous periods where DD > 0)
    const zones: { start: number; end: number; peakDD: number; recoveryTrades: number }[] = [];
    let zoneStart = -1;
    let zonePeakDD = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].drawdownPercent > 0) {
        if (zoneStart === -1) zoneStart = i;
        if (points[i].drawdownPercent > zonePeakDD) zonePeakDD = points[i].drawdownPercent;
      } else {
        if (zoneStart !== -1) {
          zones.push({ start: zoneStart, end: i, peakDD: zonePeakDD, recoveryTrades: i - zoneStart });
          zoneStart = -1;
          zonePeakDD = 0;
        }
      }
    }
    if (zoneStart !== -1) {
      zones.push({ start: zoneStart, end: points.length - 1, peakDD: zonePeakDD, recoveryTrades: points.length - 1 - zoneStart });
    }

    const currentDD = points.length > 0 ? points[points.length - 1].drawdownPercent : 0;
    return { equityCurve, ddPcts, maxDDPct, maxDDDate, zones, currentDD, points };
  }, [drawdown]);

  // ===== ENHANCED KELLY =====
  const kellyData = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    const wins = typedTrades.filter(t => t.result > 0);
    const losses = typedTrades.filter(t => t.result < 0);
    if (typedTrades.length < 5 || wins.length === 0 || losses.length === 0) return null;

    const W = wins.length / typedTrades.length;
    const avgWin = wins.reduce((s, t) => s + t.result, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length);
    const R = avgLoss > 0 ? avgWin / avgLoss : 0;
    const kellyPct = R > 0 ? (W - (1 - W) / R) * 100 : 0;
    const halfKelly = kellyPct / 2;
    const quarterKelly = kellyPct / 4;
    const kellyPositionSize = balance > 0 ? (balance * Math.max(0, kellyPct) / 100) : 0;
    const halfKellySize = balance > 0 ? (balance * Math.max(0, halfKelly) / 100) : 0;
    const quarterKellySize = balance > 0 ? (balance * Math.max(0, quarterKelly) / 100) : 0;

    return { W, R, avgWin, avgLoss, kellyPct, halfKelly, quarterKelly, kellyPositionSize, halfKellySize, quarterKellySize };
  }, [trades, balance]);

  // ===== LOSS CORRELATION =====
  const lossCorrelation = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    const lossTrades = typedTrades.filter(t => t.result < 0);
    if (lossTrades.length < 3) return null;

    const DAYS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    // By day of week
    const byDay: Record<number, { count: number; pnl: number }> = {};
    for (let d = 0; d < 7; d++) byDay[d] = { count: 0, pnl: 0 };
    lossTrades.forEach(t => {
      const d = new Date(t.date).getDay();
      byDay[d].count++;
      byDay[d].pnl += t.result;
    });
    const dayData = Object.entries(byDay).map(([d, v]) => ({ day: parseInt(d), label: DAYS_LABELS[parseInt(d)], ...v }));

    // By hour
    const byHour: Record<number, { count: number; pnl: number }> = {};
    for (let h = 0; h < 24; h++) byHour[h] = { count: 0, pnl: 0 };
    lossTrades.forEach(t => {
      const h = new Date(t.date).getHours();
      byHour[h].count++;
      byHour[h].pnl += t.result;
    });
    const hourData = Object.entries(byHour).map(([h, v]) => ({ hour: parseInt(h), ...v })).filter(h => h.count > 0);

    // By asset
    const byAsset: Record<string, { count: number; pnl: number }> = {};
    lossTrades.forEach(t => {
      const a = t.asset || "N/A";
      if (!byAsset[a]) byAsset[a] = { count: 0, pnl: 0 };
      byAsset[a].count++;
      byAsset[a].pnl += t.result;
    });
    const assetData = Object.entries(byAsset)
      .map(([asset, v]) => ({ asset, ...v }))
      .sort((a, b) => a.pnl - b.pnl);

    // Top 3 danger zones
    const dangers: { label: string; detail: string; severity: "high" | "medium" }[] = [];
    const worstDay = dayData.reduce((w, d) => d.pnl < w.pnl ? d : w, dayData[0]);
    if (worstDay.count >= 2) dangers.push({ label: `${worstDay.label}`, detail: `${worstDay.count} pertes (${worstDay.pnl.toFixed(0)}€)`, severity: "high" });
    const worstHour = hourData.length > 0 ? hourData.reduce((w, h) => h.pnl < w.pnl ? h : w, hourData[0]) : null;
    if (worstHour && worstHour.count >= 2) dangers.push({ label: `${worstHour.hour}h00`, detail: `${worstHour.count} pertes (${worstHour.pnl.toFixed(0)}€)`, severity: "high" });
    if (assetData.length > 0) dangers.push({ label: assetData[0].asset, detail: `${assetData[0].count} pertes (${assetData[0].pnl.toFixed(0)}€)`, severity: assetData[0].count >= 3 ? "high" : "medium" });

    return { dayData, hourData, assetData: assetData.slice(0, 8), dangers: dangers.slice(0, 3) };
  }, [trades]);

  // ===== MONTE CARLO =====
  const monteCarloResults = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    if (typedTrades.length < 10) return null;

    const results = typedTrades.map(t => t.result);
    const simulations = 1000;
    const tradeCount = 100;
    const finalPnls: number[] = [];
    const maxDDs: number[] = [];

    for (let s = 0; s < simulations; s++) {
      let equity = 0;
      let peak = 0;
      let maxDD = 0;
      for (let i = 0; i < tradeCount; i++) {
        const idx = Math.floor(Math.random() * results.length);
        equity += results[idx];
        if (equity > peak) peak = equity;
        const dd = peak - equity;
        if (dd > maxDD) maxDD = dd;
      }
      finalPnls.push(equity);
      maxDDs.push(maxDD);
    }

    finalPnls.sort((a, b) => a - b);
    maxDDs.sort((a, b) => a - b);

    const profitTargets = [5, 10, 20, 50];
    const ddLevels = [5, 10, 15, 20];

    const profitProbs = profitTargets.map(target => {
      const targetAmt = balance * target / 100;
      const count = finalPnls.filter(p => p >= targetAmt).length;
      return { target, probability: (count / simulations * 100) };
    });

    const ddProbs = ddLevels.map(level => {
      const levelAmt = balance * level / 100;
      const count = maxDDs.filter(d => d >= levelAmt).length;
      return { level, probability: (count / simulations * 100) };
    });

    const median = finalPnls[Math.floor(simulations / 2)];
    const p10 = finalPnls[Math.floor(simulations * 0.1)];
    const p90 = finalPnls[Math.floor(simulations * 0.9)];

    return { profitProbs, ddProbs, median, p10, p90 };
  }, [trades, balance]);

  function getHeatmapColor(avgPnl: number, minAvg: number, maxAvg: number): string {
    if (avgPnl === 0) return "rgba(100,100,100,0.2)";
    if (avgPnl > 0) {
      const intensity = maxAvg > 0 ? Math.min(avgPnl / maxAvg, 1) : 0;
      return `rgba(16,185,129,${0.15 + intensity * 0.65})`;
    }
    const intensity = minAvg < 0 ? Math.min(Math.abs(avgPnl) / Math.abs(minAvg), 1) : 0;
    return `rgba(239,68,68,${0.15 + intensity * 0.65})`;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />)}
        </div>
      </div>
    );
  }

  const kellyDisplay = kellyRaw < 0;

  // ---- AI Risk Assessment ----
  const aiRiskInsight = useMemo(() => {
    const typedTrades = trades as unknown as Trade[];
    if (typedTrades.length < 3) return null;

    // Average risk per trade (as % of balance)
    const risksPerTrade = typedTrades
      .filter((t) => t.result < 0)
      .map((t) => (Math.abs(t.result) / balance) * 100);
    const avgRiskPct = risksPerTrade.length > 0
      ? risksPerTrade.reduce((a, b) => a + b, 0) / risksPerTrade.length
      : 0;

    // Risk zone
    const riskZone: "green" | "yellow" | "red" =
      avgRiskPct <= 2 ? "green" : avgRiskPct <= 3 ? "yellow" : "red";
    const zoneLabel = riskZone === "green" ? "zone verte" : riskZone === "yellow" ? "zone orange" : "zone rouge";

    // Trades exceeding 3% risk this week
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const highRiskThisWeek = typedTrades.filter((t) => {
      if (new Date(t.date) < sevenDaysAgo) return false;
      return t.result < 0 && (Math.abs(t.result) / balance) * 100 > 3;
    }).length;

    // Kelly optimal
    const kellyOptimal = kellyRaw > 0 ? (kellyRaw * 100).toFixed(1) : null;

    return { avgRiskPct: avgRiskPct.toFixed(1), riskZone, zoneLabel, highRiskThisWeek, kellyOptimal };
  }, [trades, balance, kellyRaw]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield className="w-6 h-6 text-cyan-400" /> {t("riskManagementTitle")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {t("riskManagementDesc")}
        </p>
      </div>

      {/* ====== AI Risk Assessment ====== */}
      {aiRiskInsight && (
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #818cf8 100%)",
          }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                <Brain className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analyse IA du Risque</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{
                background: aiRiskInsight.riskZone === "green" ? "rgba(16,185,129,0.06)" : aiRiskInsight.riskZone === "yellow" ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${aiRiskInsight.riskZone === "green" ? "rgba(16,185,129,0.12)" : aiRiskInsight.riskZone === "yellow" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"}`,
              }}>
                <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${aiRiskInsight.riskZone === "green" ? "text-emerald-400" : aiRiskInsight.riskZone === "yellow" ? "text-amber-400" : "text-rose-400"}`} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  Votre risque moyen par trade : <strong>{aiRiskInsight.avgRiskPct}%</strong> — dans la <strong>{aiRiskInsight.zoneLabel}</strong>
                </span>
              </div>
              {aiRiskInsight.highRiskThisWeek > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Attention : <strong>{aiRiskInsight.highRiskThisWeek} trade{aiRiskInsight.highRiskThisWeek > 1 ? "s" : ""}</strong> cette semaine depassent 3% de risque
                  </span>
                </div>
              )}
              {aiRiskInsight.kellyOptimal && (
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.12)" }}>
                  <Calculator className="w-4 h-4 mt-0.5 text-sky-400 flex-shrink-0" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Votre Kelly optimal suggere <strong>{aiRiskInsight.kellyOptimal}%</strong> par trade
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("riskExpectancy"), value: `${risk.expectancy >= 0 ? "+" : ""}${risk.expectancy}€`, color: risk.expectancy >= 0 ? "#10b981" : "#ef4444", icon: TrendingDown },
          { label: t("riskPayoffRatio"), value: risk.payoffRatio.toFixed(2), color: risk.payoffRatio >= 1.5 ? "#10b981" : risk.payoffRatio >= 1 ? "#f59e0b" : "#ef4444", icon: Percent },
          {
            label: t("riskKellyPercent"),
            value: kellyDisplay ? "N/A" : `${risk.kellyPercent}%`,
            color: kellyDisplay ? "#ef4444" : "#0ea5e9",
            icon: Calculator,
            subtitle: kellyDisplay ? t("riskStrategyNotProfitable") : undefined,
          },
          { label: t("riskRecoveryFactor"), value: risk.recoveryFactor.toFixed(2), color: risk.recoveryFactor >= 2 ? "#10b981" : "#f59e0b", icon: Shield },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.label}</span>
            </div>
            <div className="text-2xl font-bold mono" style={{ color: m.color }}>{m.value}</div>
            {"subtitle" in m && m.subtitle && (
              <div className="text-[10px] mt-1" style={{ color: "#ef4444" }}>{m.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      {/* Extended metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("riskMaxConsecutiveLosses")}</span>
          <div className="text-2xl font-bold mono text-rose-400 mt-1">{risk.maxConsecutiveLosses}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("riskCalmarRatio")}</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.calmarRatio >= 1 ? "#10b981" : "#f59e0b" }}>{risk.calmarRatio}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("riskNetPnlAfterFees")}</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.netPnlAfterFees >= 0 ? "#10b981" : "#ef4444" }}>
            {risk.netPnlAfterFees >= 0 ? "+" : ""}{risk.netPnlAfterFees}€
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            {t("riskCommissions")}: {risk.totalCommissions}€ &bull; {t("riskSwaps")}: {risk.totalSwaps}€
          </div>
        </div>
      </div>

      {/* VaR Section */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-amber-400" /> {t("riskVarTitle")}
        </h3>
        {!varMetrics ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskVarMin5Trades")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>{t("riskVar95")}</div>
              <div className="text-xl font-bold mono" style={{ color: "#f59e0b" }}>{varMetrics.var95.toFixed(2)}€</div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {t("riskVar95Desc").replace("{{amount}}", Math.abs(varMetrics.var95).toFixed(2))}
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>{t("riskVar99")}</div>
              <div className="text-xl font-bold mono" style={{ color: "#ef4444" }}>{varMetrics.var99.toFixed(2)}€</div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {t("riskVar99Desc").replace("{{amount}}", Math.abs(varMetrics.var99).toFixed(2))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Risk Distribution Histogram */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-cyan-400" /> {t("riskDistributionTitle")}
        </h3>
        {trades.length < 3 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskMin3Trades")}</p>
        ) : (() => {
          const typedTrades = trades as unknown as Trade[];
          // Compute risk % per trade
          const riskPcts = typedTrades.map(t => {
            if (!t.entry || !t.sl || t.sl === t.entry) return null;
            const slDist = Math.abs(t.entry - t.sl);
            const riskAmt = slDist * (t.lots || 0.01) * (t.asset?.includes("JPY") ? 1000 : 100000);
            return balance > 0 ? (riskAmt / balance) * 100 : 0;
          }).filter((v): v is number => v !== null && v > 0 && v < 20);

          if (riskPcts.length === 0) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskSlDataRequired")}</p>;

          // Bucket into ranges: 0-0.5, 0.5-1, 1-1.5, 1.5-2, 2-3, 3-5, 5+
          const buckets = [
            { label: "0-0.5%", min: 0, max: 0.5, color: "#10b981", zone: "safe" },
            { label: "0.5-1%", min: 0.5, max: 1, color: "#10b981", zone: "safe" },
            { label: "1-1.5%", min: 1, max: 1.5, color: "#22c55e", zone: "safe" },
            { label: "1.5-2%", min: 1.5, max: 2, color: "#f59e0b", zone: "moderate" },
            { label: "2-3%", min: 2, max: 3, color: "#f97316", zone: "aggressive" },
            { label: "3-5%", min: 3, max: 5, color: "#ef4444", zone: "danger" },
            { label: "5%+", min: 5, max: 100, color: "#dc2626", zone: "danger" },
          ];

          const counts = buckets.map(b => ({
            ...b,
            count: riskPcts.filter(r => r >= b.min && r < b.max).length,
          }));
          const maxCount = Math.max(...counts.map(c => c.count), 1);
          const safeCount = counts.filter(c => c.zone === "safe").reduce((s, c) => s + c.count, 0);
          const safePct = riskPcts.length > 0 ? Math.round((safeCount / riskPcts.length) * 100) : 0;

          return (
            <>
              {/* Summary badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${safePct >= 80 ? "bg-emerald-500/15 text-emerald-400" : safePct >= 50 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
                  {t("riskSafeZonePct").replace("{{pct}}", String(safePct))}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {t("riskTradesAnalyzed").replace("{{count}}", String(riskPcts.length))}
                </span>
              </div>

              {/* Histogram bars */}
              <div className="flex items-end gap-2 h-32">
                {counts.map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] mono font-bold" style={{ color: b.count > 0 ? b.color : "var(--text-muted)" }}>
                      {b.count}
                    </span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.max((b.count / maxCount) * 100, b.count > 0 ? 8 : 2)}%`,
                        background: b.color,
                        opacity: b.count > 0 ? 0.7 : 0.15,
                      }}
                    />
                    <span className="text-[8px] text-center" style={{ color: "var(--text-muted)" }}>{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Zone labels */}
              <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "#10b981" }} />
                  <span>{t("riskZoneSafe")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
                  <span>{t("riskZoneModerate")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "#ef4444" }} />
                  <span>{t("riskZoneDanger")}</span>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Drawdown Curve */}
      <div className="metric-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingDown className="w-5 h-5 text-rose-400" /> {t("riskDrawdownCurve")}
          </h3>
          {maxDDPoint && maxDDPoint.drawdownPercent > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Max DD: -{maxDDPoint.drawdownPercent.toFixed(1)}%
            </span>
          )}
        </div>
        {drawdown.length <= 1 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskAddTradesToSeeDrawdown")}</p>
        ) : (
          <div className="flex items-end gap-[1px] h-40">
            {drawdown.slice(1).map((p, i) => {
              const maxDD = Math.max(...drawdown.map((x) => x.drawdownPercent), 1);
              const pct = (p.drawdownPercent / maxDD) * 100;
              return (
                <div key={i} className="flex-1">
                  <div
                    className="w-full rounded-t transition-all cursor-default"
                    style={{
                      height: `${Math.max(pct, 1)}%`,
                      background: p.drawdownPercent > 10 ? "#ef4444" : p.drawdownPercent > 5 ? "#f59e0b" : "#10b981",
                      opacity: 0.7,
                    }}
                    title={`DD: -${p.drawdownPercent.toFixed(1)}% | Equity: ${p.equity.toFixed(2)}€`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk Heatmap */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Activity className="w-5 h-5 text-purple-400" /> {t("riskHeatmapTitle")}
        </h3>
        {!heatmapData ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskAddTradesToSeeHeatmap")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t("riskAssetCol")}</th>
                  {heatmapData.weekdays.map((d) => (
                    <th key={d} className="p-2 text-xs font-medium text-center" style={{ color: "var(--text-muted)" }}>{DAYS_FR_SHORT[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.assets.map((asset) => (
                  <tr key={asset}>
                    <td className="p-2 font-medium text-xs" style={{ color: "var(--text-primary)" }}>{asset}</td>
                    {heatmapData.weekdays.map((day) => {
                      const cell = heatmapData.map[asset]?.[day];
                      const count = cell?.count || 0;
                      const avgPnl = count > 0 ? cell!.pnl / count : 0;
                      return (
                        <td
                          key={day}
                          className="p-2 text-center rounded cursor-default"
                          style={{ background: getHeatmapColor(avgPnl, heatmapData.minAvg, heatmapData.maxAvg) }}
                          title={`${asset} ${DAYS_FR_SHORT[day]}: ${count} trades, avg ${avgPnl.toFixed(2)}€`}
                        >
                          {count > 0 ? (
                            <span className="text-xs font-bold mono" style={{ color: avgPnl >= 0 ? "#10b981" : "#ef4444" }}>
                              {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(0)}€
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.6)" }} />
                <span>{t("riskAvgLoss")}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: "rgba(100,100,100,0.2)" }} />
                <span>{t("riskNeutral")}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.6)" }} />
                <span>{t("riskAvgGain")}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery Calculator */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <RotateCcw className="w-5 h-5 text-emerald-400" /> {t("recoveryCalculator")}
        </h3>
        {!recoveryCalc ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("riskAddTradesToSeeRecovery")}</p>
        ) : !recoveryCalc.inDrawdown ? (
          <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "#10b981" }}>{t("riskNoActiveDrawdown")}</div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("riskAtEquityPeak")}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("riskCurrentDrawdown")}</div>
              <div className="text-xl font-bold mono text-rose-400">-{recoveryCalc.drawdown.toFixed(2)}€</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("riskExpectancyPerTrade")}</div>
              <div className="text-xl font-bold mono" style={{ color: recoveryCalc.expectancy > 0 ? "#10b981" : "#ef4444" }}>
                {recoveryCalc.expectancy > 0 ? "+" : ""}{recoveryCalc.expectancy.toFixed(2)}€
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("riskTradesToRecover")}</div>
              <div className="text-xl font-bold mono" style={{ color: recoveryCalc.tradesToRecover === Infinity ? "#ef4444" : "#0ea5e9" }}>
                {recoveryCalc.tradesToRecover === Infinity ? "\u221E" : recoveryCalc.tradesToRecover}
              </div>
              {recoveryCalc.tradesToRecover === Infinity && (
                <div className="text-[10px] mt-1" style={{ color: "#ef4444" }}>{t("riskNegativeExpectancy")}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Position Sizing Calculator */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calculator className="w-5 h-5 text-cyan-400" /> {t("positionCalculator")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("riskAssetType")}</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="input-field w-full"
                style={{ color: "var(--text-primary)", background: "var(--bg-hover)" }}
              >
                <option value="forex">{t("riskAssetForex")}</option>
                <option value="crypto">{t("riskAssetCrypto")}</option>
                <option value="indices">{t("riskAssetIndices")}</option>
                <option value="stocks">{t("riskAssetStocks")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("riskBalance")}</label>
              <div className="input-field flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{balance.toFixed(2)}€</span>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("riskPerTrade")}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0.25" max="5" step="0.25" value={calcRisk}
                  onChange={(e) => setCalcRisk(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-lg font-bold mono w-16 text-right" style={{ color: calcRisk > 2 ? "#ef4444" : "#10b981" }}>
                  {calcRisk}%
                </span>
              </div>
              {calcRisk > 2 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> {t("riskHighWarning")}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("riskEntryPrice")}</label>
                <input type="number" step="0.00001" value={calcEntry} onChange={(e) => setCalcEntry(parseFloat(e.target.value))} className="input-field mono" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("riskStopLoss")}</label>
                <input type="number" step="0.00001" value={calcSl} onChange={(e) => setCalcSl(parseFloat(e.target.value))} className="input-field mono" />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ background: "var(--bg-hover)" }}>
            <span className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t("riskRecommendedSize")}</span>
            <div className="text-5xl font-bold mono text-cyan-400">{posSize.lots}</div>
            <span className="text-lg" style={{ color: "var(--text-secondary)" }}>{posSize.unit}</span>
            <div className="mt-4 space-y-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              <p>{t("riskRiskLabel")}: <span className="mono font-bold text-rose-400">{posSize.riskAmount}€</span></p>
              <p>{assetType === "forex" ? t("riskPipsAtRisk") : t("riskPerUnit")}: <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{posSize.pipsAtRisk}{assetType === "forex" ? "" : "€"}</span></p>
              <p>{t("riskKellyRecommends")}: <span className="mono font-bold" style={{ color: kellyDisplay ? "#ef4444" : "#0ea5e9" }}>
                {kellyDisplay ? "N/A" : `${risk.kellyPercent}%`}
              </span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 1. EXPOSITION EN TEMPS RÉEL ===== */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Crosshair className="w-5 h-5 text-orange-400" /> Exposition en Temps Réel
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Trades ouverts</div>
            <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>{exposureData.openCount}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Risque total</div>
            <div className="text-2xl font-bold mono" style={{ color: exposureData.riskPct > 5 ? "#ef4444" : exposureData.riskPct > 2 ? "#f59e0b" : "#10b981" }}>
              {exposureData.totalRiskEur.toFixed(0)}€
            </div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>% du capital</div>
            <div className="text-2xl font-bold mono" style={{ color: exposureData.riskPct > 5 ? "#ef4444" : exposureData.riskPct > 2 ? "#f59e0b" : "#10b981" }}>
              {exposureData.riskPct.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Statut</div>
            <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block mt-1 ${
              exposureData.riskPct > 5 ? "bg-rose-500/15 text-rose-400" :
              exposureData.riskPct > 2 ? "bg-amber-500/15 text-amber-400" :
              "bg-emerald-500/15 text-emerald-400"
            }`}>
              {exposureData.riskPct > 5 ? "DANGER" : exposureData.riskPct > 2 ? "ATTENTION" : "OK"}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
            <span>0%</span>
            <span>Max autorisé: {exposureData.maxAllowedPct}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((exposureData.riskPct / exposureData.maxAllowedPct) * 100, 100)}%`,
                background: exposureData.riskPct > 5 ? "#ef4444" : exposureData.riskPct > 2 ? "#f59e0b" : "#10b981",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            <span>{exposureData.riskPct.toFixed(1)}% utilisé</span>
            <span>{Math.max(0, exposureData.maxAllowedPct - exposureData.riskPct).toFixed(1)}% restant</span>
          </div>
        </div>
      </div>

      {/* ===== 2. HISTORIQUE DE DRAWDOWN (SVG) ===== */}
      <div className="metric-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingDown className="w-5 h-5 text-rose-400" /> Historique de Drawdown
          </h3>
          {drawdownHistory && (
            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Max DD: -{drawdownHistory.maxDDPct.toFixed(1)}%
              </span>
              {drawdownHistory.currentDD > 0 && (
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DD actuel: -{drawdownHistory.currentDD.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
        {!drawdownHistory ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour voir le drawdown.</p>
        ) : (() => {
          const pts = drawdownHistory.points;
          const eqVals = drawdownHistory.equityCurve;
          const minEq = Math.min(...eqVals);
          const maxEq = Math.max(...eqVals);
          const eqRange = maxEq - minEq || 1;
          const W = 800;
          const H = 200;
          const padX = 0;
          const padY = 10;

          const xScale = (i: number) => padX + (i / (pts.length - 1)) * (W - 2 * padX);
          const yScale = (v: number) => padY + (1 - (v - minEq) / eqRange) * (H - 2 * padY);

          // Equity line path
          const eqPath = eqVals.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ");

          // Drawdown zones as red fill areas
          const ddZoneRects = drawdownHistory.zones.map((z, zi) => {
            const x1 = xScale(z.start);
            const x2 = xScale(z.end);
            return (
              <rect key={zi} x={x1} y={padY} width={x2 - x1} height={H - 2 * padY} fill="#ef4444" opacity={0.08} rx={2} />
            );
          });

          return (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "200px" }} preserveAspectRatio="none">
                {/* DD zones */}
                {ddZoneRects}
                {/* Equity curve */}
                <path d={eqPath} fill="none" stroke="#0ea5e9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {/* Peak line */}
                {(() => {
                  let peak = eqVals[0];
                  const peakPath = eqVals.map((v, i) => {
                    if (v > peak) peak = v;
                    return `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(peak).toFixed(1)}`;
                  }).join(" ");
                  return <path d={peakPath} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" opacity={0.5} />;
                })()}
              </svg>
              {/* Legend + stats */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 rounded" style={{ background: "#0ea5e9" }} />
                  <span>Courbe d&apos;équité</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 rounded border-dashed border-t" style={{ borderColor: "#10b981" }} />
                  <span>Peak</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.15)" }} />
                  <span>Zones de drawdown</span>
                </div>
                {drawdownHistory.zones.length > 0 && (
                  <span>| {drawdownHistory.zones.length} période{drawdownHistory.zones.length > 1 ? "s" : ""} de drawdown détectée{drawdownHistory.zones.length > 1 ? "s" : ""}</span>
                )}
              </div>
              {/* Drawdown zone details */}
              {drawdownHistory.zones.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {drawdownHistory.zones.slice(0, 4).map((z, i) => (
                    <div key={i} className="rounded-lg p-2 text-center" style={{ background: "rgba(239,68,68,0.06)" }}>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>DD #{i + 1}</div>
                      <div className="text-sm font-bold mono text-rose-400">-{z.peakDD.toFixed(1)}%</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{z.recoveryTrades} trades</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* ===== 3. RÈGLE DE KELLY ===== */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Target className="w-5 h-5 text-violet-400" /> Règle de Kelly
        </h3>
        {!kellyData ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Minimum 5 trades (gagnants et perdants) requis pour le calcul de Kelly.</p>
        ) : (
          <>
            {/* Formula display */}
            <div className="rounded-xl p-4 mb-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Formule : Kelly % = W - (1-W) / R</div>
              <div className="flex flex-wrap items-center gap-4 text-sm mono" style={{ color: "var(--text-secondary)" }}>
                <span>W (taux de gain) = <strong className="text-cyan-400">{(kellyData.W * 100).toFixed(1)}%</strong></span>
                <span>R (gain/perte moy.) = <strong className="text-cyan-400">{kellyData.R.toFixed(2)}</strong></span>
                <span>Gain moyen = <strong style={{ color: "#10b981" }}>{kellyData.avgWin.toFixed(2)}€</strong></span>
                <span>Perte moy. = <strong style={{ color: "#ef4444" }}>{kellyData.avgLoss.toFixed(2)}€</strong></span>
              </div>
            </div>

            {/* Kelly variants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl p-4 text-center border" style={{ background: "var(--bg-hover)", borderColor: kellyData.kellyPct > 5 ? "rgba(239,68,68,0.3)" : "transparent" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Kelly complet</div>
                <div className="text-3xl font-bold mono" style={{ color: kellyData.kellyPct > 5 ? "#ef4444" : kellyData.kellyPct > 0 ? "#0ea5e9" : "#ef4444" }}>
                  {kellyData.kellyPct.toFixed(1)}%
                </div>
                <div className="text-xs mono mt-1" style={{ color: "var(--text-muted)" }}>{kellyData.kellyPositionSize.toFixed(0)}€</div>
                {kellyData.kellyPct > 5 && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> Trop agressif
                  </div>
                )}
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Demi-Kelly (conservateur)</div>
                <div className="text-3xl font-bold mono" style={{ color: "#10b981" }}>
                  {Math.max(0, kellyData.halfKelly).toFixed(1)}%
                </div>
                <div className="text-xs mono mt-1" style={{ color: "var(--text-muted)" }}>{kellyData.halfKellySize.toFixed(0)}€</div>
                <div className="text-[10px] mt-1" style={{ color: "#10b981" }}>Recommandé</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Quart-Kelly (ultra-conservateur)</div>
                <div className="text-3xl font-bold mono" style={{ color: "#0ea5e9" }}>
                  {Math.max(0, kellyData.quarterKelly).toFixed(1)}%
                </div>
                <div className="text-xs mono mt-1" style={{ color: "var(--text-muted)" }}>{kellyData.quarterKellySize.toFixed(0)}€</div>
              </div>
            </div>

            {kellyData.kellyPct > 5 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Le Kelly complet ({'>'} 5%) est trop risqué. Utilisez le demi-Kelly ou quart-Kelly pour protéger votre capital contre les séries de pertes.
                </p>
              </div>
            )}
            {kellyData.kellyPct <= 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Kelly négatif : votre stratégie actuelle n&apos;a pas d&apos;avantage statistique. Revoyez votre approche avant de risquer du capital.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== 4. CORRÉLATION DES PERTES ===== */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Zap className="w-5 h-5 text-amber-400" /> Corrélation des Pertes
        </h3>
        {!lossCorrelation ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Minimum 3 trades perdants requis pour l&apos;analyse de corrélation.</p>
        ) : (
          <>
            {/* Danger zones */}
            {lossCorrelation.dangers.length > 0 && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {lossCorrelation.dangers.map((d, i) => (
                  <div key={i} className="rounded-lg p-3 border" style={{
                    background: d.severity === "high" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                    borderColor: d.severity === "high" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3 h-3" style={{ color: d.severity === "high" ? "#ef4444" : "#f59e0b" }} />
                      <span className="text-xs font-bold" style={{ color: d.severity === "high" ? "#ef4444" : "#f59e0b" }}>Zone #{i + 1}: {d.label}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{d.detail}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By day of week */}
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                  <Clock className="w-3 h-3" /> Pertes par jour de la semaine
                </div>
                <div className="flex items-end gap-1 h-24">
                  {lossCorrelation.dayData.filter(d => d.day >= 1 && d.day <= 5).map(d => {
                    const maxC = Math.max(...lossCorrelation.dayData.map(x => x.count), 1);
                    const pct = (d.count / maxC) * 100;
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] mono font-bold" style={{ color: d.count > 0 ? "#ef4444" : "var(--text-muted)" }}>{d.count}</span>
                        <div className="w-full rounded-t" style={{
                          height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                          background: "#ef4444",
                          opacity: d.count > 0 ? 0.5 + (d.count / maxC) * 0.4 : 0.1,
                        }} />
                        <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By hour */}
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                  <Clock className="w-3 h-3" /> Pertes par heure
                </div>
                <div className="flex items-end gap-[2px] h-24">
                  {Array.from({ length: 24 }, (_, h) => {
                    const hd = lossCorrelation.hourData.find(x => x.hour === h);
                    const count = hd?.count || 0;
                    const maxC = Math.max(...lossCorrelation.hourData.map(x => x.count), 1);
                    const pct = (count / maxC) * 100;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center" title={`${h}h: ${count} pertes`}>
                        <div className="w-full rounded-t" style={{
                          height: `${Math.max(pct, count > 0 ? 8 : 2)}%`,
                          background: "#ef4444",
                          opacity: count > 0 ? 0.4 + (count / maxC) * 0.5 : 0.05,
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>
            </div>

            {/* By asset ranked list */}
            {lossCorrelation.assetData.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Pertes par actif (classement)</div>
                <div className="space-y-1">
                  {lossCorrelation.assetData.map((a, i) => {
                    const maxPnl = Math.abs(lossCorrelation.assetData[0]?.pnl || 1);
                    const barW = (Math.abs(a.pnl) / maxPnl) * 100;
                    return (
                      <div key={a.asset} className="flex items-center gap-2">
                        <span className="text-[10px] w-20 truncate mono font-medium" style={{ color: "var(--text-primary)" }}>{a.asset}</span>
                        <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                          <div className="h-full rounded" style={{ width: `${barW}%`, background: i === 0 ? "#ef4444" : "rgba(239,68,68,0.4)" }} />
                        </div>
                        <span className="text-[10px] mono w-16 text-right" style={{ color: "#ef4444" }}>{a.pnl.toFixed(0)}€</span>
                        <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{a.count}x</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== 5. MONTE CARLO SIMULATION ===== */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shuffle className="w-5 h-5 text-indigo-400" /> Simulation Monte Carlo
        </h3>
        {!monteCarloResults ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Minimum 10 trades requis pour la simulation Monte Carlo (1 000 itérations × 100 trades).</p>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>P&L médian (100 trades)</div>
                <div className="text-xl font-bold mono" style={{ color: monteCarloResults.median >= 0 ? "#10b981" : "#ef4444" }}>
                  {monteCarloResults.median >= 0 ? "+" : ""}{monteCarloResults.median.toFixed(0)}€
                </div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Scénario pessimiste (10%)</div>
                <div className="text-xl font-bold mono" style={{ color: monteCarloResults.p10 >= 0 ? "#10b981" : "#ef4444" }}>
                  {monteCarloResults.p10 >= 0 ? "+" : ""}{monteCarloResults.p10.toFixed(0)}€
                </div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-hover)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Scénario optimiste (90%)</div>
                <div className="text-xl font-bold mono" style={{ color: monteCarloResults.p90 >= 0 ? "#10b981" : "#ef4444" }}>
                  {monteCarloResults.p90 >= 0 ? "+" : ""}{monteCarloResults.p90.toFixed(0)}€
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profit probability table */}
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Probabilité de profit (100 trades)</div>
                <div className="space-y-2">
                  {monteCarloResults.profitProbs.map(p => (
                    <div key={p.target} className="flex items-center gap-2">
                      <span className="text-[10px] mono w-12" style={{ color: "var(--text-muted)" }}>+{p.target}%</span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{
                            width: `${Math.max(p.probability, 2)}%`,
                            background: p.probability > 60 ? "#10b981" : p.probability > 30 ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {p.probability > 15 && (
                            <span className="text-[9px] font-bold" style={{ color: "#fff" }}>{p.probability.toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      {p.probability <= 15 && (
                        <span className="text-[10px] mono font-bold" style={{ color: "var(--text-muted)" }}>{p.probability.toFixed(0)}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawdown probability table */}
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Risque de drawdown (100 trades)</div>
                <div className="space-y-2">
                  {monteCarloResults.ddProbs.map(d => (
                    <div key={d.level} className="flex items-center gap-2">
                      <span className="text-[10px] mono w-12" style={{ color: "var(--text-muted)" }}>-{d.level}%</span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{
                            width: `${Math.max(d.probability, 2)}%`,
                            background: d.probability > 60 ? "#ef4444" : d.probability > 30 ? "#f59e0b" : "#10b981",
                          }}
                        >
                          {d.probability > 15 && (
                            <span className="text-[9px] font-bold" style={{ color: "#fff" }}>{d.probability.toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      {d.probability <= 15 && (
                        <span className="text-[10px] mono font-bold" style={{ color: "var(--text-muted)" }}>{d.probability.toFixed(0)}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
              Basé sur 1 000 simulations de 100 trades (redistribution aléatoire de vos résultats réels)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
