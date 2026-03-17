"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { Grid3x3, AlertTriangle, TrendingUp, Shield, BarChart3, Percent } from "lucide-react";

// --- Helpers ---
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx, yi = y[i] - my;
    num += xi * yi; dx += xi * xi; dy += yi * yi;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

function corrColor(v: number): string {
  if (v > 0.5) return `rgba(16,185,129,${0.3 + Math.abs(v) * 0.5})`;
  if (v > 0.2) return `rgba(16,185,129,${0.1 + v * 0.3})`;
  if (v < -0.5) return `rgba(239,68,68,${0.3 + Math.abs(v) * 0.5})`;
  if (v < -0.2) return `rgba(239,68,68,${0.1 + Math.abs(v) * 0.3})`;
  return "rgba(255,255,255,0.05)";
}

function decomposeCurrency(pair: string): string[] {
  const clean = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (clean.length === 6) return [clean.slice(0, 3), clean.slice(3)];
  return [clean];
}

export default function CorrelationPage() {
  const { trades, loading } = useTrades();

  const assets = useMemo(() => [...new Set(trades.map((t) => t.asset))].sort(), [trades]);

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

  // Correlation matrix
  const corrMatrix = useMemo(() => {
    const allDates = [...new Set(trades.map((t) => t.date?.slice(0, 10)).filter(Boolean))].sort();
    const matrix: Record<string, Record<string, number>> = {};
    for (const a of assets) {
      matrix[a] = {};
      for (const b of assets) {
        if (a === b) { matrix[a][b] = 1; continue; }
        const xa = allDates.map((d) => dailyPnl[a]?.[d] || 0);
        const xb = allDates.map((d) => dailyPnl[b]?.[d] || 0);
        matrix[a][b] = pearsonCorrelation(xa, xb);
      }
    }
    return matrix;
  }, [assets, trades, dailyPnl]);

  // Asset performance
  const assetPerf = useMemo(() => {
    const map: Record<string, { total: number; wins: number; pnl: number; best: number; worst: number; results: number[] }> = {};
    for (const t of trades) {
      if (!map[t.asset]) map[t.asset] = { total: 0, wins: 0, pnl: 0, best: -Infinity, worst: Infinity, results: [] };
      const m = map[t.asset];
      m.total++; m.pnl += t.result || 0; m.results.push(t.result || 0);
      if ((t.result || 0) > 0) m.wins++;
      if ((t.result || 0) > m.best) m.best = t.result || 0;
      if ((t.result || 0) < m.worst) m.worst = t.result || 0;
    }
    return Object.entries(map)
      .map(([asset, d]) => ({
        asset, total: d.total, winRate: d.total ? Math.round((d.wins / d.total) * 100) : 0,
        avgPnl: d.total ? Math.round((d.pnl / d.total) * 100) / 100 : 0,
        totalPnl: Math.round(d.pnl * 100) / 100, best: d.best === -Infinity ? 0 : d.best, worst: d.worst === Infinity ? 0 : d.worst,
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  // Exposure per asset
  const exposure = useMemo(() => {
    const map: Record<string, { long: number; short: number }> = {};
    for (const t of trades) {
      if (!map[t.asset]) map[t.asset] = { long: 0, short: 0 };
      const lots = t.lots || 0;
      if (t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long") map[t.asset].long += lots;
      else map[t.asset].short += lots;
    }
    return map;
  }, [trades]);

  // Currency decomposition
  const currencyExposure = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      const parts = decomposeCurrency(t.asset);
      const sign = (t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long") ? 1 : -1;
      const lots = t.lots || 0;
      if (parts.length === 2) {
        map[parts[0]] = (map[parts[0]] || 0) + sign * lots;
        map[parts[1]] = (map[parts[1]] || 0) - sign * lots;
      } else {
        map[parts[0]] = (map[parts[0]] || 0) + sign * lots;
      }
    }
    return Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [trades]);

  // Warnings: correlated pairs in same direction
  const warnings = useMemo(() => {
    const w: string[] = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const corr = corrMatrix[assets[i]]?.[assets[j]] || 0;
        const expA = (exposure[assets[i]]?.long || 0) - (exposure[assets[i]]?.short || 0);
        const expB = (exposure[assets[j]]?.long || 0) - (exposure[assets[j]]?.short || 0);
        if (corr > 0.6 && expA * expB > 0) {
          w.push(`${assets[i]} & ${assets[j]} sont corrélés (${corr}) et exposés dans la même direction`);
        }
      }
    }
    return w;
  }, [assets, corrMatrix, exposure]);

  // Diversification score
  const divScore = useMemo(() => {
    if (!trades.length) return 0;
    let score = 100;
    // Bonus for number of assets
    const n = assets.length;
    if (n <= 1) score -= 40;
    else if (n <= 3) score -= 20;
    else if (n <= 5) score -= 5;
    // Penalize concentration
    const counts = assets.map((a) => trades.filter((t) => t.asset === a).length);
    const maxPct = Math.max(...counts) / trades.length;
    if (maxPct > 0.5) score -= Math.round((maxPct - 0.5) * 60);
    // Penalize correlated same-direction
    score -= warnings.length * 10;
    return Math.max(0, Math.min(100, score));
  }, [trades, assets, warnings]);

  const maxExposure = useMemo(() => {
    let m = 0;
    for (const e of Object.values(exposure)) m = Math.max(m, e.long, e.short);
    return m || 1;
  }, [exposure]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Grid3x3 className="w-6 h-6 text-cyan-400" /> Corrélation & Exposition
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Matrice de corrélation, analyse d&apos;exposition et diversification du portefeuille.
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-2xl p-4 border border-amber-500/30" style={{ background: "rgba(245,158,11,0.08)" }}>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Actifs tradés</span>
          </div>
          <div className="text-2xl font-bold mono text-cyan-400">{assets.length}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Score diversification</span>
          </div>
          <div className="text-2xl font-bold mono" style={{ color: divScore >= 70 ? "#10b981" : divScore >= 40 ? "#f59e0b" : "#ef4444" }}>
            {divScore}/100
          </div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Meilleur actif</span>
          </div>
          <div className="text-lg font-bold mono text-emerald-400">{assetPerf[0]?.asset || "—"}</div>
          <div className="text-xs mono" style={{ color: "var(--text-muted)" }}>{assetPerf[0] ? `${assetPerf[0].totalPnl >= 0 ? "+" : ""}${assetPerf[0].totalPnl}€` : ""}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Alertes corrélation</span>
          </div>
          <div className="text-2xl font-bold mono" style={{ color: warnings.length ? "#ef4444" : "#10b981" }}>
            {warnings.length}
          </div>
        </div>
      </div>

      {/* Correlation Heatmap */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Grid3x3 className="w-5 h-5 text-cyan-400" /> Matrice de Corrélation
        </h3>
        {assets.length < 2 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Tradez au moins 2 actifs pour voir la matrice de corrélation.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs mono">
              <thead>
                <tr>
                  <th className="p-2 text-left" style={{ color: "var(--text-muted)" }} />
                  {assets.map((a) => (
                    <th key={a} className="p-2 text-center font-medium" style={{ color: "var(--text-secondary)" }}>{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((row) => (
                  <tr key={row}>
                    <td className="p-2 font-medium" style={{ color: "var(--text-secondary)" }}>{row}</td>
                    {assets.map((col) => {
                      const v = corrMatrix[row]?.[col] ?? 0;
                      return (
                        <td key={col} className="p-2 text-center font-bold rounded" style={{ background: corrColor(v), color: row === col ? "var(--text-muted)" : "var(--text-primary)" }}>
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exposure Bars + Currency Decomposition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <BarChart3 className="w-5 h-5 text-cyan-400" /> Exposition par Actif
          </h3>
          {assets.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade enregistré.</p>
          ) : (
            <div className="space-y-3">
              {assets.map((a) => {
                const e = exposure[a] || { long: 0, short: 0 };
                const lPct = (e.long / maxExposure) * 100;
                const sPct = (e.short / maxExposure) * 100;
                return (
                  <div key={a}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{a}</span>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>{e.long.toFixed(2)}L / {e.short.toFixed(2)}S</span>
                    </div>
                    <div className="flex gap-1 h-4">
                      <div className="rounded-l bg-emerald-500/70 transition-all" style={{ width: `${lPct}%` }} />
                      <div className="rounded-r bg-rose-500/70 transition-all" style={{ width: `${sPct}%` }} />
                      {lPct === 0 && sPct === 0 && <div className="flex-1 rounded" style={{ background: "var(--bg-hover)" }} />}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500/70 inline-block" /> Long</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-rose-500/70 inline-block" /> Short</span>
              </div>
            </div>
          )}
        </div>

        <div className="metric-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Percent className="w-5 h-5 text-cyan-400" /> Décomposition Devises
          </h3>
          {currencyExposure.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune exposition détectée.</p>
          ) : (
            <div className="space-y-2">
              {currencyExposure.map(([ccy, val]) => (
                <div key={ccy} className="flex items-center justify-between text-sm">
                  <span className="font-medium mono" style={{ color: "var(--text-secondary)" }}>{ccy}</span>
                  <span className={`font-bold mono ${val > 0 ? "text-emerald-400" : val < 0 ? "text-rose-400" : ""}`} style={val === 0 ? { color: "var(--text-muted)" } : undefined}>
                    {val > 0 ? "+" : ""}{val.toFixed(2)} lots
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Asset Performance Table */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <TrendingUp className="w-5 h-5 text-cyan-400" /> Performance par Actif
        </h3>
        {assetPerf.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun trade enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <th className="text-left p-2">Actif</th>
                  <th className="text-right p-2">Trades</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">P&L Moy.</th>
                  <th className="text-right p-2">P&L Total</th>
                  <th className="text-right p-2">Meilleur</th>
                  <th className="text-right p-2">Pire</th>
                </tr>
              </thead>
              <tbody>
                {assetPerf.map((a) => (
                  <tr key={a.asset} className="border-t" style={{ borderColor: "var(--bg-hover)" }}>
                    <td className="p-2 font-medium mono" style={{ color: "var(--text-primary)" }}>{a.asset}</td>
                    <td className="p-2 text-right mono" style={{ color: "var(--text-secondary)" }}>{a.total}</td>
                    <td className="p-2 text-right mono" style={{ color: a.winRate >= 50 ? "#10b981" : "#ef4444" }}>{a.winRate}%</td>
                    <td className={`p-2 text-right mono ${a.avgPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{a.avgPnl >= 0 ? "+" : ""}{a.avgPnl}€</td>
                    <td className={`p-2 text-right font-bold mono ${a.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{a.totalPnl >= 0 ? "+" : ""}{a.totalPnl}€</td>
                    <td className="p-2 text-right mono text-emerald-400">+{a.best}€</td>
                    <td className="p-2 text-right mono text-rose-400">{a.worst}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diversification Score Detail */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield className="w-5 h-5 text-cyan-400" /> Score de Diversification
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke={divScore >= 70 ? "#10b981" : divScore >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="3" strokeDasharray={`${divScore}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>
              {divScore}
            </div>
          </div>
          <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>{assets.length} actif{assets.length > 1 ? "s" : ""} différent{assets.length > 1 ? "s" : ""} tradé{assets.length > 1 ? "s" : ""}</p>
            {assets.length > 0 && (() => {
              const counts = assets.map((a) => trades.filter((t) => t.asset === a).length);
              const maxIdx = counts.indexOf(Math.max(...counts));
              const pct = Math.round((counts[maxIdx] / trades.length) * 100);
              return pct > 50 ? (
                <p className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {assets[maxIdx]} représente {pct}% des trades
                </p>
              ) : (
                <p className="text-emerald-400">Bonne répartition entre les actifs</p>
              );
            })()}
            {warnings.length > 0 && (
              <p className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {warnings.length} paire{warnings.length > 1 ? "s" : ""} corrélée{warnings.length > 1 ? "s" : ""} en même direction
              </p>
            )}
            {warnings.length === 0 && trades.length > 0 && (
              <p className="text-emerald-400">Pas de surexposition corrélée détectée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
