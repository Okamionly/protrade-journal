"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  Clock,
  Lock,
  Crown,
  Check,
} from "lucide-react";

// ─── Period Filter ──────────────────────────────────────────────────

type PeriodKey = "7d" | "30d" | "90d" | "all";

const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 jours", days: 7 },
  { key: "30d", label: "30 jours", days: 30 },
  { key: "90d", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: null },
];

function filterDatesByPeriod(dates: string[], days: number | null): string[] {
  if (days === null || dates.length === 0) return dates;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return dates.filter((d) => d >= cutoffStr);
}

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
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [selectedPair, setSelectedPair] = useState<PairDetail | null>(null);
  const [chartPairA, setChartPairA] = useState<string>("");
  const [chartPairB, setChartPairB] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("all");

  const assets = useMemo(
    () => [...new Set(trades.map((t) => t.asset))].sort(),
    [trades]
  );

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "PRO" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  // Initialize chart pair selection when assets load
  useEffect(() => {
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

  // Dates filtered by the selected period
  const periodDays = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.days ?? null;
  const filteredDates = useMemo(
    () => filterDatesByPeriod(allDates, periodDays),
    [allDates, periodDays]
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

  // Helper to compute a correlation matrix from a given set of dates
  const computeCorrMatrix = useCallback(
    (dates: string[]) => {
      const matrix: Record<string, Record<string, number>> = {};
      for (const a of assets) {
        matrix[a] = {};
        for (const b of assets) {
          if (a === b) {
            matrix[a][b] = 1;
            continue;
          }
          const xa = dates.map((d) => dailyPnl[a]?.[d] || 0);
          const xb = dates.map((d) => dailyPnl[b]?.[d] || 0);
          matrix[a][b] = pearsonCorrelation(xa, xb);
        }
      }
      return matrix;
    },
    [assets, dailyPnl]
  );

  // Correlation matrix for selected period
  const corrMatrix = useMemo(
    () => computeCorrMatrix(filteredDates),
    [computeCorrMatrix, filteredDates]
  );

  // Full-period correlation matrix (for divergence detection)
  const fullCorrMatrix = useMemo(
    () => computeCorrMatrix(allDates),
    [computeCorrMatrix, allDates]
  );

  // 90-day correlation matrix (for divergence comparison with short periods)
  const ninetyDayDates = useMemo(
    () => filterDatesByPeriod(allDates, 90),
    [allDates]
  );
  const ninetyDayCorrMatrix = useMemo(
    () => computeCorrMatrix(ninetyDayDates),
    [computeCorrMatrix, ninetyDayDates]
  );

  // Detect divergence: current period vs 90-day correlation
  const hasDivergence = useCallback(
    (assetA: string, assetB: string): boolean => {
      if (selectedPeriod === "all" || selectedPeriod === "90d") return false;
      const current = corrMatrix[assetA]?.[assetB] ?? 0;
      const baseline = ninetyDayCorrMatrix[assetA]?.[assetB] ?? 0;
      return Math.abs(current - baseline) > 0.3;
    },
    [corrMatrix, ninetyDayCorrMatrix, selectedPeriod]
  );

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

  // ─── VIP Gate ───────────────────────────────────────────────────

  if (loading || isVip === null) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Analysez les corrélations entre vos actifs pour optimiser votre portefeuille
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Matrice de corrélation entre vos actifs",
              "Identifiez les paires qui bougent ensemble",
              "Optimisez la diversification de votre portefeuille",
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3
            className="font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Grid3x3 className="w-5 h-5 text-cyan-400" /> Matrice de Corrélation
          </h3>

          {/* Period selector tabs */}
          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <Clock className="w-3.5 h-3.5 ml-2 shrink-0" style={{ color: "var(--text-muted)" }} />
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedPeriod(opt.key)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{
                  background:
                    selectedPeriod === opt.key
                      ? "rgba(6,182,212,0.2)"
                      : "transparent",
                  color:
                    selectedPeriod === opt.key
                      ? "#06b6d4"
                      : "var(--text-muted)",
                  border:
                    selectedPeriod === opt.key
                      ? "1px solid rgba(6,182,212,0.3)"
                      : "1px solid transparent",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p
          className="text-xs mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Cliquez sur une cellule pour analyser la paire en détail.
          {selectedPeriod !== "all" && (
            <span className="ml-2">
              ({filteredDates.length} jour{filteredDates.length > 1 ? "s" : ""} de données)
            </span>
          )}
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
                      const divergent = !isDiag && hasDivergence(row, col);
                      return (
                        <td
                          key={col}
                          className={`p-2 text-center font-bold rounded transition-all relative ${
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
                              : divergent
                              ? `${row} / ${col}: ${v.toFixed(2)} — Divergence vs 90j (${(ninetyDayCorrMatrix[row]?.[col] ?? 0).toFixed(2)})`
                              : `${row} / ${col}: ${v.toFixed(2)}`
                          }
                        >
                          <span>{v.toFixed(2)}</span>
                          {divergent && (
                            <span
                              className="absolute -top-1 -right-1 text-[8px] leading-none px-1 py-0.5 rounded-full font-medium"
                              style={{
                                background: "rgba(245,158,11,0.25)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.4)",
                              }}
                              title={`Divergence: ${selectedPeriod} = ${v.toFixed(2)} vs 90j = ${(ninetyDayCorrMatrix[row]?.[col] ?? 0).toFixed(2)}`}
                            >
                              ⚠️
                            </span>
                          )}
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
            {(selectedPeriod === "7d" || selectedPeriod === "30d") && (
              <div
                className="flex items-center justify-center gap-1.5 mt-2 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  ⚠️ Divergence
                </span>
                <span>= écart &gt; 0.30 entre la période sélectionnée et 90 jours</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Asset Pair Analysis Modal ────────────────────────────── */}
      {selectedPair && (
        <div className="glass rounded-2xl p-6 border border-cyan-500/30 relative">
          <button
            onClick={() => setSelectedPair(null)}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
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
