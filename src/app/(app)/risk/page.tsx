"use client";

import { useState, useMemo } from "react";
import { useTrades, useUser } from "@/hooks/useTrades";
import { computeRiskMetrics, computeDrawdownCurve, calculatePositionSize, computeKellyRaw, type Trade, type AssetType } from "@/lib/advancedStats";
import { Shield, AlertTriangle, Calculator, TrendingDown, Percent, DollarSign, BarChart3, Activity, RotateCcw } from "lucide-react";

const DAYS_FR_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function RiskPage() {
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const balance = user?.balance || 10000;

  // Position sizing calculator state
  const [calcEntry, setCalcEntry] = useState(1.085);
  const [calcSl, setCalcSl] = useState(1.083);
  const [calcRisk, setCalcRisk] = useState(1);
  const [assetType, setAssetType] = useState<AssetType>("forex");

  const risk = useMemo(() => computeRiskMetrics(trades as unknown as Trade[], balance), [trades, balance]);
  const drawdown = useMemo(() => computeDrawdownCurve(trades as unknown as Trade[], balance), [trades, balance]);
  const kellyRaw = useMemo(() => computeKellyRaw(trades as unknown as Trade[]), [trades]);
  const posSize = useMemo(() => calculatePositionSize(balance, calcRisk, calcEntry, calcSl, 10, assetType), [balance, calcRisk, calcEntry, calcSl, assetType]);

  const maxDDPoint = drawdown.reduce((max, p) => p.drawdownPercent > max.drawdownPercent ? p : max, drawdown[0] || { drawdownPercent: 0 });

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield className="w-6 h-6 text-cyan-400" /> Risk Management
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Metriques de risque avancees et calculateur de taille de position.
        </p>
      </div>

      {/* Key Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Expectancy", value: `${risk.expectancy >= 0 ? "+" : ""}${risk.expectancy}\u20AC`, color: risk.expectancy >= 0 ? "#10b981" : "#ef4444", icon: TrendingDown },
          { label: "Payoff Ratio", value: risk.payoffRatio.toFixed(2), color: risk.payoffRatio >= 1.5 ? "#10b981" : risk.payoffRatio >= 1 ? "#f59e0b" : "#ef4444", icon: Percent },
          {
            label: "Kelly %",
            value: kellyDisplay ? "N/A" : `${risk.kellyPercent}%`,
            color: kellyDisplay ? "#ef4444" : "#0ea5e9",
            icon: Calculator,
            subtitle: kellyDisplay ? "Strategie non profitable" : undefined,
          },
          { label: "Recovery Factor", value: risk.recoveryFactor.toFixed(2), color: risk.recoveryFactor >= 2 ? "#10b981" : "#f59e0b", icon: Shield },
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
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Max Pertes Consecutives</span>
          <div className="text-2xl font-bold mono text-rose-400 mt-1">{risk.maxConsecutiveLosses}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Calmar Ratio</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.calmarRatio >= 1 ? "#10b981" : "#f59e0b" }}>{risk.calmarRatio}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>P&L Net (apres frais)</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.netPnlAfterFees >= 0 ? "#10b981" : "#ef4444" }}>
            {risk.netPnlAfterFees >= 0 ? "+" : ""}{risk.netPnlAfterFees}\u20AC
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Commissions: {risk.totalCommissions}\u20AC &bull; Swaps: {risk.totalSwaps}\u20AC
          </div>
        </div>
      </div>

      {/* VaR Section */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <BarChart3 className="w-5 h-5 text-amber-400" /> Value at Risk (VaR)
        </h3>
        {!varMetrics ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Minimum 5 trades requis pour calculer la VaR.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>VaR 95%</div>
              <div className="text-xl font-bold mono" style={{ color: "#f59e0b" }}>{varMetrics.var95.toFixed(2)}\u20AC</div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                Il y a 5% de chance de perdre plus de {Math.abs(varMetrics.var95).toFixed(2)}\u20AC par trade
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>VaR 99%</div>
              <div className="text-xl font-bold mono" style={{ color: "#ef4444" }}>{varMetrics.var99.toFixed(2)}\u20AC</div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                Il y a 1% de chance de perdre plus de {Math.abs(varMetrics.var99).toFixed(2)}\u20AC par trade
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drawdown Curve */}
      <div className="metric-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingDown className="w-5 h-5 text-rose-400" /> Courbe de Drawdown
          </h3>
          {maxDDPoint && maxDDPoint.drawdownPercent > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Max DD: -{maxDDPoint.drawdownPercent.toFixed(1)}%
            </span>
          )}
        </div>
        {drawdown.length <= 1 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour voir la courbe de drawdown.</p>
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
                    title={`DD: -${p.drawdownPercent.toFixed(1)}% | Equity: ${p.equity.toFixed(2)}\u20AC`}
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
          <Activity className="w-5 h-5 text-purple-400" /> Heatmap de Risque (Asset x Jour)
        </h3>
        {!heatmapData ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour voir la heatmap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Asset</th>
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
                          title={`${asset} ${DAYS_FR_SHORT[day]}: ${count} trades, avg ${avgPnl.toFixed(2)}\u20AC`}
                        >
                          {count > 0 ? (
                            <span className="text-xs font-bold mono" style={{ color: avgPnl >= 0 ? "#10b981" : "#ef4444" }}>
                              {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(0)}\u20AC
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
                <span>Perte moyenne</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: "rgba(100,100,100,0.2)" }} />
                <span>Neutre</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.6)" }} />
                <span>Gain moyen</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery Calculator */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <RotateCcw className="w-5 h-5 text-emerald-400" /> Calculateur de Recovery
        </h3>
        {!recoveryCalc ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour voir le calculateur de recovery.</p>
        ) : !recoveryCalc.inDrawdown ? (
          <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "#10b981" }}>Aucun drawdown actif</div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Vous etes a votre pic d&apos;equity. Continuez comme ca !</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Drawdown actuel</div>
              <div className="text-xl font-bold mono text-rose-400">-{recoveryCalc.drawdown.toFixed(2)}\u20AC</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Expectancy / trade</div>
              <div className="text-xl font-bold mono" style={{ color: recoveryCalc.expectancy > 0 ? "#10b981" : "#ef4444" }}>
                {recoveryCalc.expectancy > 0 ? "+" : ""}{recoveryCalc.expectancy.toFixed(2)}\u20AC
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Trades pour recovery</div>
              <div className="text-xl font-bold mono" style={{ color: recoveryCalc.tradesToRecover === Infinity ? "#ef4444" : "#0ea5e9" }}>
                {recoveryCalc.tradesToRecover === Infinity ? "\u221E" : recoveryCalc.tradesToRecover}
              </div>
              {recoveryCalc.tradesToRecover === Infinity && (
                <div className="text-[10px] mt-1" style={{ color: "#ef4444" }}>Expectancy negative — recovery impossible sans ameliorer la strategie</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Position Sizing Calculator */}
      <div className="metric-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calculator className="w-5 h-5 text-cyan-400" /> Calculateur de Position
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Type d&apos;actif</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="input-field w-full"
                style={{ color: "var(--text-primary)", background: "var(--bg-hover)" }}
              >
                <option value="forex">Forex (lot = 100 000)</option>
                <option value="crypto">Crypto (1 coin)</option>
                <option value="indices">Indices (1 contrat)</option>
                <option value="stocks">Actions (1 action)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Balance</label>
              <div className="input-field flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{balance.toFixed(2)}\u20AC</span>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Risque par trade (%)</label>
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
                  <AlertTriangle className="w-3 h-3" /> Risque eleve -- recommande: 1-2%
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Prix d&apos;entree</label>
                <input type="number" step="0.00001" value={calcEntry} onChange={(e) => setCalcEntry(parseFloat(e.target.value))} className="input-field mono" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Stop Loss</label>
                <input type="number" step="0.00001" value={calcSl} onChange={(e) => setCalcSl(parseFloat(e.target.value))} className="input-field mono" />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ background: "var(--bg-hover)" }}>
            <span className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>TAILLE RECOMMANDEE</span>
            <div className="text-5xl font-bold mono text-cyan-400">{posSize.lots}</div>
            <span className="text-lg" style={{ color: "var(--text-secondary)" }}>{posSize.unit}</span>
            <div className="mt-4 space-y-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              <p>Risque: <span className="mono font-bold text-rose-400">{posSize.riskAmount}\u20AC</span></p>
              <p>{assetType === "forex" ? "Pips at risk" : "Risque/unite"}: <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{posSize.pipsAtRisk}{assetType === "forex" ? "" : "\u20AC"}</span></p>
              <p>Kelly recommande: <span className="mono font-bold" style={{ color: kellyDisplay ? "#ef4444" : "#0ea5e9" }}>
                {kellyDisplay ? "N/A" : `${risk.kellyPercent}%`}
              </span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
