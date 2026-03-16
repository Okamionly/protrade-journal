"use client";

import { useState, useMemo } from "react";
import { useTrades, useUser } from "@/hooks/useTrades";
import { computeRiskMetrics, computeDrawdownCurve, calculatePositionSize, type Trade } from "@/lib/advancedStats";
import { Shield, AlertTriangle, Calculator, TrendingDown, Percent, DollarSign } from "lucide-react";

export default function RiskPage() {
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const balance = user?.balance || 10000;

  // Position sizing calculator state
  const [calcEntry, setCalcEntry] = useState(1.085);
  const [calcSl, setCalcSl] = useState(1.083);
  const [calcRisk, setCalcRisk] = useState(1);

  const risk = useMemo(() => computeRiskMetrics(trades as unknown as Trade[], balance), [trades, balance]);
  const drawdown = useMemo(() => computeDrawdownCurve(trades as unknown as Trade[], balance), [trades, balance]);
  const posSize = useMemo(() => calculatePositionSize(balance, calcRisk, calcEntry, calcSl), [balance, calcRisk, calcEntry, calcSl]);

  const maxDDPoint = drawdown.reduce((max, p) => p.drawdownPercent > max.drawdownPercent ? p : max, drawdown[0] || { drawdownPercent: 0 });

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield className="w-6 h-6 text-cyan-400" /> Risk Management
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Métriques de risque avancées et calculateur de taille de position.
        </p>
      </div>

      {/* Key Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Expectancy", value: `${risk.expectancy >= 0 ? "+" : ""}${risk.expectancy}€`, color: risk.expectancy >= 0 ? "#10b981" : "#ef4444", icon: TrendingDown },
          { label: "Payoff Ratio", value: risk.payoffRatio.toFixed(2), color: risk.payoffRatio >= 1.5 ? "#10b981" : risk.payoffRatio >= 1 ? "#f59e0b" : "#ef4444", icon: Percent },
          { label: "Kelly %", value: `${risk.kellyPercent}%`, color: risk.kellyPercent > 0 ? "#0ea5e9" : "#ef4444", icon: Calculator },
          { label: "Recovery Factor", value: risk.recoveryFactor.toFixed(2), color: risk.recoveryFactor >= 2 ? "#10b981" : "#f59e0b", icon: Shield },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.label}</span>
            </div>
            <div className="text-2xl font-bold mono" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Extended metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Max Pertes Consécutives</span>
          <div className="text-2xl font-bold mono text-rose-400 mt-1">{risk.maxConsecutiveLosses}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Calmar Ratio</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.calmarRatio >= 1 ? "#10b981" : "#f59e0b" }}>{risk.calmarRatio}</div>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>P&L Net (après frais)</span>
          <div className="text-2xl font-bold mono mt-1" style={{ color: risk.netPnlAfterFees >= 0 ? "#10b981" : "#ef4444" }}>
            {risk.netPnlAfterFees >= 0 ? "+" : ""}{risk.netPnlAfterFees}€
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Commissions: {risk.totalCommissions}€ • Swaps: {risk.totalSwaps}€
          </div>
        </div>
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
                    title={`DD: -${p.drawdownPercent.toFixed(1)}% | Equity: ${p.equity.toFixed(2)}€`}
                  />
                </div>
              );
            })}
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
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Balance</label>
              <div className="input-field flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{balance.toFixed(2)}€</span>
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
                  <AlertTriangle className="w-3 h-3" /> Risque élevé — recommandé: 1-2%
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Prix d&apos;entrée</label>
                <input type="number" step="0.00001" value={calcEntry} onChange={(e) => setCalcEntry(parseFloat(e.target.value))} className="input-field mono" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Stop Loss</label>
                <input type="number" step="0.00001" value={calcSl} onChange={(e) => setCalcSl(parseFloat(e.target.value))} className="input-field mono" />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ background: "var(--bg-hover)" }}>
            <span className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>TAILLE RECOMMANDÉE</span>
            <div className="text-5xl font-bold mono text-cyan-400">{posSize.lots}</div>
            <span className="text-lg" style={{ color: "var(--text-secondary)" }}>lots</span>
            <div className="mt-4 space-y-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              <p>Risque: <span className="mono font-bold text-rose-400">{posSize.riskAmount}€</span></p>
              <p>Pips at risk: <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{posSize.pipsAtRisk}</span></p>
              <p>Kelly recommande: <span className="mono font-bold text-cyan-400">{risk.kellyPercent}%</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
