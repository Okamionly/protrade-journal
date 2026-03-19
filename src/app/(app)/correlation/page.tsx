"use client";

import { useState, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Grid3x3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  BarChart3,
  Lightbulb,
  Info,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Zap,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx,
      yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

function corrColor(v: number): string {
  if (v > 0.5) return `rgba(16,185,129,${0.25 + Math.abs(v) * 0.45})`;
  if (v > 0.2) return `rgba(16,185,129,${0.08 + v * 0.25})`;
  if (v < -0.5) return `rgba(239,68,68,${0.25 + Math.abs(v) * 0.45})`;
  if (v < -0.2) return `rgba(239,68,68,${0.08 + Math.abs(v) * 0.25})`;
  return "rgba(255,255,255,0.04)";
}

function corrTextColor(v: number): string {
  if (Math.abs(v) > 0.6) return "#fff";
  if (v > 0.2) return "#10b981";
  if (v < -0.2) return "#ef4444";
  return "var(--text-muted)";
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtPnl(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmt(n)}€`;
}

// ─── Types ──────────────────────────────────────────────────────────

interface PairDetail {
  assetA: string;
  assetB: string;
  correlation: number;
  coTradeDays: number;
  combinedPnl: number;
  winRateTogether: number;
  winRateASolo: number;
  winRateBSolo: number;
  tradesA: number;
  tradesB: number;
  tradesTogether: number;
}

interface CorrelationPair {
  assetA: string;
  assetB: string;
  correlation: number;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function CorrelationPage() {
  const { trades, loading } = useTrades();
  const [selectedPair, setSelectedPair] = useState<PairDetail | null>(null);
  const [chartPairA, setChartPairA] = useState<string>("");
  const [chartPairB, setChartPairB] = useState<string>("");

  const assets = useMemo(
    () => [...new Set(trades.map((t) => t.asset))].sort(),
    [trades]
  );

  // Initialize chart pair selection when assets load
  useMemo(() => {
    if (assets.length >= 2 && !chartPairA && !chartPairB) {
      setChartPairA(assets[0]);
      setChartPairB(assets[1]);
    }
  }, [assets, chartPairA, chartPairB]);

  // Daily P&L per asset keyed by date
  const dailyPnl = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const t of trades) {
      const d = t.date?.slice(0, 10) || "";
      if (!d) continue;
      if (!map[t.asset]) map[t.asset] = {};
      map[t.asset][d] = (map[t.asset][d] || 0) + (t.result || 0);
    }
    return map;
  }, [trades]);

  // All unique dates sorted
  const allDates = useMemo(
    () =>
      [
        ...new Set(trades.map((t) => t.date?.slice(0, 10)).filter(Boolean)),
      ].sort() as string[],
    [trades]
  );

  // Trades grouped by date
  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    for (const t of trades) {
      const d = t.date?.slice(0, 10) || "";
      if (!d) continue;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    return map;
  }, [trades]);

  // Correlation matrix
  const corrMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    for (const a of assets) {
      matrix[a] = {};
      for (const b of assets) {
        if (a === b) {
          matrix[a][b] = 1;
          continue;
        }
        const xa = allDates.map((d) => dailyPnl[a]?.[d] || 0);
        const xb = allDates.map((d) => dailyPnl[b]?.[d] || 0);
        matrix[a][b] = pearsonCorrelation(xa, xb);
      }
    }
    return matrix;
  }, [assets, allDates, dailyPnl]);

  // Diversification score based on average absolute correlation
  const divScore = useMemo(() => {
    if (assets.length < 2) return assets.length === 1 ? 30 : 0;
    let totalAbsCorr = 0;
    let count = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        totalAbsCorr += Math.abs(corrMatrix[assets[i]]?.[assets[j]] || 0);
        count++;
      }
    }
    const avgAbsCorr = count > 0 ? totalAbsCorr / count : 0;
    // Score: lower avg correlation = better diversification
    // 0 avg corr => 100%, 1 avg corr => 0%
    const baseScore = Math.round((1 - avgAbsCorr) * 100);
    // Bonus for more assets (max +15)
    const assetBonus = Math.min(15, (assets.length - 2) * 5);
    return Math.max(0, Math.min(100, baseScore + assetBonus));
  }, [assets, corrMatrix]);

  // All unique pairs with their correlation
  const allPairs = useMemo(() => {
    const pairs: CorrelationPair[] = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        pairs.push({
          assetA: assets[i],
          assetB: assets[j],
          correlation: corrMatrix[assets[i]]?.[assets[j]] || 0,
        });
      }
    }
    return pairs;
  }, [assets, corrMatrix]);

  // Top 5 positive and negative correlations
  const topPositive = useMemo(
    () =>
      [...allPairs]
        .filter((p) => p.correlation > 0)
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, 5),
    [allPairs]
  );

  const topNegative = useMemo(
    () =>
      [...allPairs]
        .filter((p) => p.correlation < 0)
        .sort((a, b) => a.correlation - b.correlation)
        .slice(0, 5),
    [allPairs]
  );

  // Pair detail calculation
  const computePairDetail = useCallback(
    (assetA: string, assetB: string): PairDetail => {
      const correlation = corrMatrix[assetA]?.[assetB] || 0;

      // Days where both assets were traded
      const daysA = new Set(
        trades
          .filter((t) => t.asset === assetA)
          .map((t) => t.date?.slice(0, 10))
      );
      const daysB = new Set(
        trades
          .filter((t) => t.asset === assetB)
          .map((t) => t.date?.slice(0, 10))
      );
      const coDays = [...daysA].filter((d) => daysB.has(d));

      // Combined P&L on co-trade days
      let combinedPnl = 0;
      let winsTogether = 0;
      let totalTogether = 0;
      for (const d of coDays) {
        const dayTrades = tradesByDate[d!] || [];
        const pnlA = dayTrades
          .filter((t) => t.asset === assetA)
          .reduce((s, t) => s + (t.result || 0), 0);
        const pnlB = dayTrades
          .filter((t) => t.asset === assetB)
          .reduce((s, t) => s + (t.result || 0), 0);
        combinedPnl += pnlA + pnlB;
        totalTogether++;
        if (pnlA + pnlB > 0) winsTogether++;
      }

      // Solo win rates (days trading one but not the other)
      const soloDaysA = [...daysA].filter((d) => !daysB.has(d));
      const soloDaysB = [...daysB].filter((d) => !daysA.has(d));

      let winsASolo = 0;
      for (const d of soloDaysA) {
        const pnl = (tradesByDate[d!] || [])
          .filter((t) => t.asset === assetA)
          .reduce((s, t) => s + (t.result || 0), 0);
        if (pnl > 0) winsASolo++;
      }

      let winsBSolo = 0;
      for (const d of soloDaysB) {
        const pnl = (tradesByDate[d!] || [])
          .filter((t) => t.asset === assetB)
          .reduce((s, t) => s + (t.result || 0), 0);
        if (pnl > 0) winsBSolo++;
      }

      return {
        assetA,
        assetB,
        correlation,
        coTradeDays: coDays.length,
        combinedPnl: Math.round(combinedPnl * 100) / 100,
        winRateTogether:
          totalTogether > 0
            ? Math.round((winsTogether / totalTogether) * 100)
            : 0,
        winRateASolo:
          soloDaysA.length > 0
            ? Math.round((winsASolo / soloDaysA.length) * 100)
            : 0,
        winRateBSolo:
          soloDaysB.length > 0
            ? Math.round((winsBSolo / soloDaysB.length) * 100)
            : 0,
        tradesA: trades.filter((t) => t.asset === assetA).length,
        tradesB: trades.filter((t) => t.asset === assetB).length,
        tradesTogether: totalTogether,
      };
    },
    [corrMatrix, trades, tradesByDate]
  );

  // Handle cell click
  const handleCellClick = useCallback(
    (assetA: string, assetB: string) => {
      if (assetA === assetB) return;
      setSelectedPair(computePairDetail(assetA, assetB));
    },
    [computePairDetail]
  );

  // Cumulative P&L for co-movement chart
  const cumulativePnl = useMemo(() => {
    if (!chartPairA || !chartPairB) return { dates: [], a: [], b: [] };
    let cumA = 0;
    let cumB = 0;
    const dates: string[] = [];
    const a: number[] = [];
    const b: number[] = [];
    for (const d of allDates) {
      const pA = dailyPnl[chartPairA]?.[d] || 0;
      const pB = dailyPnl[chartPairB]?.[d] || 0;
      if (pA !== 0 || pB !== 0) {
        cumA += pA;
        cumB += pB;
        dates.push(d);
        a.push(cumA);
        b.push(cumB);
      }
    }
    return { dates, a, b };
  }, [chartPairA, chartPairB, allDates, dailyPnl]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: { icon: typeof AlertTriangle; text: string; type: "warning" | "success" | "info" }[] = [];

    // High positive correlation warnings
    for (const p of topPositive) {
      if (p.correlation >= 0.7) {
        const riskIncrease = Math.round(p.correlation * 50);
        recs.push({
          icon: AlertTriangle,
          text: `Trader ${p.assetA} et ${p.assetB} simultanément augmente votre risque de ~${riskIncrease}% en raison d'une corrélation élevée (${fmt(p.correlation)}).`,
          type: "warning",
        });
      }
    }

    // Good negative correlations (hedging)
    for (const p of topNegative) {
      if (p.correlation <= -0.5) {
        recs.push({
          icon: Shield,
          text: `${p.assetA} et ${p.assetB} ont une corrélation négative (${fmt(p.correlation)}). Les trader ensemble peut servir de couverture naturelle.`,
          type: "success",
        });
      }
    }

    // Diversification score based recommendations
    if (divScore < 40) {
      recs.push({
        icon: Target,
        text: `Votre score de diversification est faible (${divScore}%). Envisagez d'ajouter des actifs peu corrélés à votre portefeuille.`,
        type: "warning",
      });
    } else if (divScore >= 75) {
      recs.push({
        icon: Zap,
        text: `Excellente diversification (${divScore}%). Votre portefeuille est bien équilibré avec des corrélations modérées entre actifs.`,
        type: "success",
      });
    }

    // Single asset concentration
    if (assets.length === 1) {
      recs.push({
        icon: Info,
        text: `Vous ne tradez qu'un seul actif. La diversification nécessite au minimum 2-3 actifs non corrélés.`,
        type: "info",
      });
    }

    // If many assets are highly correlated
    const highCorrCount = allPairs.filter((p) => p.correlation > 0.6).length;
    if (highCorrCount >= 3) {
      recs.push({
        icon: AlertTriangle,
        text: `${highCorrCount} paires d'actifs ont une corrélation > 0.60. Votre exposition réelle est moins diversifiée qu'il n'y paraît.`,
        type: "warning",
      });
    }

    // No data fallback
    if (recs.length === 0 && trades.length > 0) {
      recs.push({
        icon: Lightbulb,
        text: `Continuez à trader différents actifs pour obtenir des recommandations de corrélation plus précises.`,
        type: "info",
      });
    }

    return recs;
  }, [topPositive, topNegative, divScore, assets, allPairs, trades]);

  // ─── SVG Sparkline Builder ──────────────────────────────────────

  function buildSparklinePath(
    values: number[],
    width: number,
    height: number,
    padding: number
  ): { path: string; min: number; max: number } {
    if (values.length < 2) return { path: "", min: 0, max: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = (width - padding * 2) / (values.length - 1);
    const points = values.map((v, i) => ({
      x: padding + i * stepX,
      y: padding + (1 - (v - min) / range) * (height - padding * 2),
    }));
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return { path: d, min, max };
  }

  // ─── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl"
              style={{ background: "var(--bg-card-solid)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Grid3x3 className="w-6 h-6 text-cyan-400" /> Corrélation &
          Diversification
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Matrice de corrélation, analyse de paires, score de diversification et
          recommandations.
        </p>
      </div>

      {/* ── Top Metrics Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Actifs tradés
            </span>
          </div>
          <div className="text-2xl font-bold mono text-cyan-400">
            {assets.length}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Score diversification
            </span>
          </div>
          <div
            className="text-2xl font-bold mono"
            style={{
              color:
                divScore >= 70
                  ? "#10b981"
                  : divScore >= 40
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          >
            {divScore}%
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Corrélation max
            </span>
          </div>
          <div className="text-2xl font-bold mono text-emerald-400">
            {topPositive[0] ? fmt(topPositive[0].correlation) : "—"}
          </div>
          <div
            className="text-[10px] mono truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {topPositive[0]
              ? `${topPositive[0].assetA} / ${topPositive[0].assetB}`
              : ""}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Corrélation min
            </span>
          </div>
          <div className="text-2xl font-bold mono text-rose-400">
            {topNegative[0] ? fmt(topNegative[0].correlation) : "—"}
          </div>
          <div
            className="text-[10px] mono truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {topNegative[0]
              ? `${topNegative[0].assetA} / ${topNegative[0].assetB}`
              : ""}
          </div>
        </div>
      </div>

      {/* ── Correlation Heatmap Matrix ───────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h3
          className="font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Grid3x3 className="w-5 h-5 text-cyan-400" /> Matrice de Corrélation
        </h3>
        <p
          className="text-xs mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Cliquez sur une cellule pour analyser la paire en détail.
        </p>
        {assets.length < 2 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tradez au moins 2 actifs pour voir la matrice de corrélation.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs mono">
              <thead>
                <tr>
                  <th
                    className="p-2 text-left"
                    style={{ color: "var(--text-muted)" }}
                  />
                  {assets.map((a) => (
                    <th
                      key={a}
                      className="p-2 text-center font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((row) => (
                  <tr key={row}>
                    <td
                      className="p-2 font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {row}
                    </td>
                    {assets.map((col) => {
                      const v = corrMatrix[row]?.[col] ?? 0;
                      const isDiag = row === col;
                      return (
                        <td
                          key={col}
                          className={`p-2 text-center font-bold rounded transition-all ${
                            isDiag
                              ? ""
                              : "cursor-pointer hover:ring-2 hover:ring-cyan-400/50"
                          }`}
                          style={{
                            background: isDiag
                              ? "rgba(6,182,212,0.1)"
                              : corrColor(v),
                            color: isDiag
                              ? "var(--text-muted)"
                              : corrTextColor(v),
                          }}
                          onClick={() => handleCellClick(row, col)}
                          title={
                            isDiag
                              ? row
                              : `${row} / ${col}: ${v.toFixed(2)}`
                          }
                        >
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div
              className="flex items-center justify-center gap-2 mt-4 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="text-rose-400">-1.00</span>
              <div className="flex h-3 rounded-full overflow-hidden" style={{ width: 180 }}>
                {Array.from({ length: 20 }, (_, i) => {
                  const v = -1 + (i / 19) * 2;
                  return (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ background: corrColor(v) }}
                    />
                  );
                })}
              </div>
              <span className="text-emerald-400">+1.00</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Asset Pair Analysis Modal ────────────────────────────── */}
      {selectedPair && (
        <div className="glass rounded-2xl p-6 border border-cyan-500/30 relative">
          <button
            onClick={() => setSelectedPair(null)}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
          <h3
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Activity className="w-5 h-5 text-cyan-400" />
            Analyse: {selectedPair.assetA} / {selectedPair.assetB}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Corrélation
              </div>
              <div
                className="text-xl font-bold mono"
                style={{
                  color:
                    selectedPair.correlation > 0.3
                      ? "#10b981"
                      : selectedPair.correlation < -0.3
                      ? "#ef4444"
                      : "var(--text-secondary)",
                }}
              >
                {fmt(selectedPair.correlation)}
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Jours co-tradés
              </div>
              <div
                className="text-xl font-bold mono text-cyan-400"
              >
                {selectedPair.coTradeDays}
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                P&L combiné
              </div>
              <div
                className={`text-xl font-bold mono ${
                  selectedPair.combinedPnl >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {fmtPnl(selectedPair.combinedPnl)}
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Trades ensemble
              </div>
              <div
                className="text-xl font-bold mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {selectedPair.tradesTogether}
              </div>
            </div>
          </div>

          {/* Win rate comparison */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(6,182,212,0.06)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Win rate ensemble
              </div>
              <div
                className="text-2xl font-bold mono"
                style={{
                  color:
                    selectedPair.winRateTogether >= 50
                      ? "#10b981"
                      : "#ef4444",
                }}
              >
                {selectedPair.winRateTogether}%
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {selectedPair.assetA} solo
              </div>
              <div
                className="text-2xl font-bold mono"
                style={{
                  color:
                    selectedPair.winRateASolo >= 50 ? "#10b981" : "#ef4444",
                }}
              >
                {selectedPair.winRateASolo}%
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {selectedPair.assetB} solo
              </div>
              <div
                className="text-2xl font-bold mono"
                style={{
                  color:
                    selectedPair.winRateBSolo >= 50 ? "#10b981" : "#ef4444",
                }}
              >
                {selectedPair.winRateBSolo}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Diversification Gauge + Top Correlations ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Diversification Score Gauge */}
        <div className="glass rounded-2xl p-6">
          <h3
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Shield className="w-5 h-5 text-cyan-400" /> Score de
            Diversification
          </h3>

          <div className="flex items-center gap-6">
            {/* SVG Gauge */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                {/* Background arc */}
                <path
                  d="M 20 90 A 50 50 0 1 1 100 90"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Value arc */}
                <path
                  d="M 20 90 A 50 50 0 1 1 100 90"
                  fill="none"
                  stroke={
                    divScore >= 70
                      ? "#10b981"
                      : divScore >= 40
                      ? "#f59e0b"
                      : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(divScore / 100) * 235} 235`}
                />
                {/* Percentage text */}
                <text
                  x="60"
                  y="68"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="22"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {divScore}
                </text>
                <text
                  x="60"
                  y="85"
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                >
                  / 100
                </text>
              </svg>
            </div>

            <div
              className="space-y-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <p>
                {assets.length} actif{assets.length > 1 ? "s" : ""}{" "}
                différent{assets.length > 1 ? "s" : ""} tradé
                {assets.length > 1 ? "s" : ""}
              </p>
              {divScore >= 70 && (
                <p className="text-emerald-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Bonne diversification
                </p>
              )}
              {divScore >= 40 && divScore < 70 && (
                <p className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Diversification
                  modérée
                </p>
              )}
              {divScore < 40 && trades.length > 0 && (
                <p className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Diversification
                  insuffisante
                </p>
              )}
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Basé sur la corrélation moyenne absolue entre tous les actifs.
              </p>
            </div>
          </div>
        </div>

        {/* Top Correlations Table */}
        <div className="glass rounded-2xl p-6">
          <h3
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <BarChart3 className="w-5 h-5 text-cyan-400" /> Top Corrélations
          </h3>

          {allPairs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Pas assez de paires d&apos;actifs.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Positive */}
              {topPositive.length > 0 && (
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    Corrélation positive
                  </div>
                  {topPositive.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 cursor-pointer hover:bg-[var(--bg-hover)] rounded px-2 -mx-2 transition-colors"
                      onClick={() => handleCellClick(p.assetA, p.assetB)}
                    >
                      <span
                        className="mono text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.assetA} / {p.assetB}
                      </span>
                      <span className="mono font-bold text-emerald-400">
                        {fmt(p.correlation)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Negative */}
              {topNegative.length > 0 && (
                <div className="mt-3">
                  <div
                    className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                    Corrélation négative
                  </div>
                  {topNegative.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 cursor-pointer hover:bg-[var(--bg-hover)] rounded px-2 -mx-2 transition-colors"
                      onClick={() => handleCellClick(p.assetA, p.assetB)}
                    >
                      <span
                        className="mono text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.assetA} / {p.assetB}
                      </span>
                      <span className="mono font-bold text-rose-400">
                        {fmt(p.correlation)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Co-movement Chart ────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h3
          className="font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Activity className="w-5 h-5 text-cyan-400" /> Co-mouvement du P&L
          Cumulé
        </h3>

        {assets.length < 2 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tradez au moins 2 actifs pour voir le graphique de co-mouvement.
          </p>
        ) : (
          <>
            {/* Asset selectors */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#06b6d4" }}
                />
                <select
                  value={chartPairA}
                  onChange={(e) => setChartPairA(e.target.value)}
                  className="text-sm mono rounded-lg px-3 py-1.5 border-none outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {assets.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                vs
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#f59e0b" }}
                />
                <select
                  value={chartPairB}
                  onChange={(e) => setChartPairB(e.target.value)}
                  className="text-sm mono rounded-lg px-3 py-1.5 border-none outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {assets.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              {chartPairA && chartPairB && chartPairA !== chartPairB && (
                <span
                  className="text-xs mono ml-auto"
                  style={{
                    color:
                      (corrMatrix[chartPairA]?.[chartPairB] || 0) > 0.3
                        ? "#10b981"
                        : (corrMatrix[chartPairA]?.[chartPairB] || 0) < -0.3
                        ? "#ef4444"
                        : "var(--text-muted)",
                  }}
                >
                  r = {fmt(corrMatrix[chartPairA]?.[chartPairB] || 0)}
                </span>
              )}
            </div>

            {/* SVG Chart */}
            {cumulativePnl.dates.length < 2 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Pas assez de données pour afficher le graphique.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 700 250"
                  className="w-full"
                  style={{ minWidth: 400 }}
                >
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = 30 + (i / 4) * 190;
                    return (
                      <line
                        key={i}
                        x1={50}
                        y1={y}
                        x2={680}
                        y2={y}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Zero line */}
                  {(() => {
                    const allVals = [
                      ...cumulativePnl.a,
                      ...cumulativePnl.b,
                    ];
                    const min = Math.min(...allVals);
                    const max = Math.max(...allVals);
                    const range = max - min || 1;
                    const zeroY = 30 + (1 - (0 - min) / range) * 190;
                    if (zeroY >= 30 && zeroY <= 220) {
                      return (
                        <line
                          x1={50}
                          y1={zeroY}
                          x2={680}
                          y2={zeroY}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* Y-axis labels */}
                  {(() => {
                    const allVals = [
                      ...cumulativePnl.a,
                      ...cumulativePnl.b,
                    ];
                    const min = Math.min(...allVals);
                    const max = Math.max(...allVals);
                    return [0, 1, 2, 3, 4].map((i) => {
                      const val = max - (i / 4) * (max - min);
                      return (
                        <text
                          key={i}
                          x={46}
                          y={34 + (i / 4) * 190}
                          textAnchor="end"
                          fill="var(--text-muted)"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {val >= 0 ? "+" : ""}
                          {fmt(val, 0)}
                        </text>
                      );
                    });
                  })()}

                  {/* X-axis date labels */}
                  {(() => {
                    const n = cumulativePnl.dates.length;
                    const step = Math.max(1, Math.floor(n / 6));
                    const indices: number[] = [];
                    for (let i = 0; i < n; i += step) indices.push(i);
                    if (indices[indices.length - 1] !== n - 1)
                      indices.push(n - 1);
                    const stepX = 630 / (n - 1);
                    return indices.map((idx) => (
                      <text
                        key={idx}
                        x={50 + idx * stepX}
                        y={240}
                        textAnchor="middle"
                        fill="var(--text-muted)"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {cumulativePnl.dates[idx]?.slice(5)}
                      </text>
                    ));
                  })()}

                  {/* Line A (cyan) */}
                  {(() => {
                    const allVals = [
                      ...cumulativePnl.a,
                      ...cumulativePnl.b,
                    ];
                    const { path } = buildSparklinePath(
                      cumulativePnl.a.map((v) => {
                        const min = Math.min(...allVals);
                        const max = Math.max(...allVals);
                        return max - min === 0 ? 0.5 : (v - min) / (max - min);
                      }),
                      630,
                      190,
                      0
                    );
                    const translated = path.replace(
                      /([ML])([\d.]+),([\d.]+)/g,
                      (_, cmd, x, y) =>
                        `${cmd}${parseFloat(x) + 50},${parseFloat(y) + 30}`
                    );
                    return (
                      <path
                        d={translated}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    );
                  })()}

                  {/* Line B (amber) */}
                  {(() => {
                    const allVals = [
                      ...cumulativePnl.a,
                      ...cumulativePnl.b,
                    ];
                    const { path } = buildSparklinePath(
                      cumulativePnl.b.map((v) => {
                        const min = Math.min(...allVals);
                        const max = Math.max(...allVals);
                        return max - min === 0 ? 0.5 : (v - min) / (max - min);
                      }),
                      630,
                      190,
                      0
                    );
                    const translated = path.replace(
                      /([ML])([\d.]+),([\d.]+)/g,
                      (_, cmd, x, y) =>
                        `${cmd}${parseFloat(x) + 50},${parseFloat(y) + 30}`
                    );
                    return (
                      <path
                        d={translated}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray="6 3"
                      />
                    );
                  })()}

                  {/* End dots */}
                  {(() => {
                    const allVals = [
                      ...cumulativePnl.a,
                      ...cumulativePnl.b,
                    ];
                    const min = Math.min(...allVals);
                    const max = Math.max(...allVals);
                    const range = max - min || 1;
                    const n = cumulativePnl.a.length;
                    const lastA = cumulativePnl.a[n - 1];
                    const lastB = cumulativePnl.b[n - 1];
                    const yA = 30 + (1 - (lastA - min) / range) * 190;
                    const yB = 30 + (1 - (lastB - min) / range) * 190;
                    return (
                      <>
                        <circle cx={680} cy={yA} r={4} fill="#06b6d4" />
                        <circle cx={680} cy={yB} r={4} fill="#f59e0b" />
                        <text
                          x={680}
                          y={yA - 8}
                          textAnchor="middle"
                          fill="#06b6d4"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {fmtPnl(lastA)}
                        </text>
                        <text
                          x={680}
                          y={yB - 8}
                          textAnchor="middle"
                          fill="#f59e0b"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {fmtPnl(lastB)}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            {/* Legend */}
            <div
              className="flex items-center gap-6 mt-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-4 h-0.5 rounded inline-block"
                  style={{ background: "#06b6d4" }}
                />
                {chartPairA}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-4 h-0.5 rounded inline-block"
                  style={{
                    background: "#f59e0b",
                    borderTop: "1px dashed #f59e0b",
                  }}
                />
                {chartPairB}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Recommendations ──────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h3
          className="font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Lightbulb className="w-5 h-5 text-cyan-400" /> Recommandations
        </h3>

        {trades.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ajoutez des trades pour obtenir des recommandations personnalisées.
          </p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Pas assez de données pour générer des recommandations.
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{
                  background:
                    rec.type === "warning"
                      ? "rgba(239,68,68,0.06)"
                      : rec.type === "success"
                      ? "rgba(16,185,129,0.06)"
                      : "rgba(6,182,212,0.06)",
                  borderLeft: `3px solid ${
                    rec.type === "warning"
                      ? "#ef4444"
                      : rec.type === "success"
                      ? "#10b981"
                      : "#06b6d4"
                  }`,
                }}
              >
                <rec.icon
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{
                    color:
                      rec.type === "warning"
                        ? "#ef4444"
                        : rec.type === "success"
                        ? "#10b981"
                        : "#06b6d4",
                  }}
                />
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {rec.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
