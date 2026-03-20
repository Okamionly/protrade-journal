"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/hooks/useTrades";
import { Calculator, DollarSign, Target, Shield, TrendingUp, AlertTriangle, Percent, BarChart3 } from "lucide-react";
import { useTranslation } from "@/i18n/context";

type Instrument = "forex" | "indices" | "crypto" | "actions";

const PIP_VALUES: Record<Instrument, number> = {
  forex: 10,
  indices: 1,
  crypto: 1,
  actions: 1,
};

const PIP_REFERENCE = [
  { pair: "EUR/USD", value: "$10 / lot", type: "Forex" },
  { pair: "GBP/USD", value: "$10 / lot", type: "Forex" },
  { pair: "USD/JPY", value: "~$6.70 / lot", type: "Forex" },
  { pair: "Gold (XAU)", value: "$10 / 0.1 pip", type: "Commodity" },
  { pair: "NAS100", value: "$1 / point", type: "Indice" },
  { pair: "US30", value: "$1 / point", type: "Indice" },
  { pair: "DAX40", value: "€1 / point", type: "Indice" },
  { pair: "S&P500", value: "$1 / point", type: "Indice" },
];

const RISK_LEVELS = [0.5, 1, 1.5, 2, 3];

export default function CalculatorPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [capital, setCapital] = useState<number>(user?.balance || 10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [takeProfit, setTakeProfit] = useState<number | "">("");
  const [instrument, setInstrument] = useState<Instrument>("forex");

  // Sync capital when user loads
  useState(() => { if (user?.balance) setCapital(user.balance); });

  const pipMultiplier = instrument === "forex" ? 10000 : 1;
  const pipValue = PIP_VALUES[instrument];

  const results = useMemo(() => {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) return null;

    const entry = Number(entryPrice);
    const sl = Number(stopLoss);
    const tp = takeProfit ? Number(takeProfit) : null;

    const riskAmount = capital * (riskPercent / 100);
    const slDistance = Math.abs(entry - sl) * pipMultiplier;
    const positionSize = slDistance > 0 ? riskAmount / (slDistance * pipValue) : 0;
    const potentialLoss = positionSize * slDistance * pipValue;

    let potentialProfit: number | null = null;
    let rrRatio: number | null = null;

    if (tp) {
      const tpDistance = Math.abs(tp - entry) * pipMultiplier;
      potentialProfit = positionSize * tpDistance * pipValue;
      rrRatio = slDistance > 0 ? tpDistance / slDistance : null;
    }

    return { riskAmount, positionSize, slDistance, potentialLoss, potentialProfit, rrRatio };
  }, [capital, riskPercent, entryPrice, stopLoss, takeProfit, instrument, pipMultiplier, pipValue]);

  const quickRiskTable = useMemo(() => {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) return null;
    const entry = Number(entryPrice);
    const sl = Number(stopLoss);
    const slDistance = Math.abs(entry - sl) * pipMultiplier;
    if (slDistance === 0) return null;

    return RISK_LEVELS.map((r) => {
      const riskAmt = capital * (r / 100);
      const lots = riskAmt / (slDistance * pipValue);
      return { percent: r, riskAmount: riskAmt, lots };
    });
  }, [capital, entryPrice, stopLoss, pipMultiplier, pipValue]);

  const riskZone = riskPercent <= 1 ? "low" : riskPercent <= 2 ? "medium" : "high";
  const riskColor = riskZone === "low" ? "#10b981" : riskZone === "medium" ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calculator className="w-6 h-6 text-cyan-400" /> {t("positionCalculator")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Calculez la taille optimale de vos positions en fonction de votre risque.
        </p>
      </div>

      {/* Risk Visualization Bar */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" style={{ color: riskColor }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Niveau de risque : {riskPercent}%
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
            background: riskColor + "20", color: riskColor
          }}>
            {riskZone === "low" ? "Conservateur" : riskZone === "medium" ? "Modéré" : "Agressif"}
          </span>
        </div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: "20%", background: "#10b981" }} />
          <div className="absolute inset-y-0 rounded-full" style={{ left: "20%", width: "20%", background: "#f59e0b" }} />
          <div className="absolute inset-y-0 rounded-full" style={{ left: "40%", right: 0, background: "#ef4444" }} />
          <div
            className="absolute top-0 bottom-0 w-1 rounded-full"
            style={{
              left: `${Math.min((riskPercent / 5) * 100, 100)}%`,
              background: "var(--text-primary)",
              boxShadow: "0 0 6px var(--border)",
              transform: "translateX(-50%)",
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          <span>0%</span><span>1%</span><span>2%</span><span>5%</span>
        </div>
      </div>

      {/* Calculator Form */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield className="w-5 h-5 text-cyan-400" /> Paramètres
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
              <DollarSign className="w-3 h-3 inline mr-1" />Capital (€)
            </label>
            <input
              type="number" className="input-field w-full" value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
              <BarChart3 className="w-3 h-3 inline mr-1" />Instrument
            </label>
            <select
              className="input-field w-full" value={instrument}
              onChange={(e) => setInstrument(e.target.value as Instrument)}
            >
              <option value="forex">Forex</option>
              <option value="indices">Indices</option>
              <option value="crypto">Crypto</option>
              <option value="actions">Actions</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
            <span><Percent className="w-3 h-3 inline mr-1" />Risque : {riskPercent}%</span>
            <span style={{ color: riskColor }}>{(capital * riskPercent / 100).toFixed(2)}€</span>
          </label>
          <input
            type="range" className="w-full accent-cyan-400" min={0.5} max={5} step={0.1}
            value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
            <span>0.5%</span><span>5%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
              <Target className="w-3 h-3 inline mr-1" />Prix d&apos;entrée
            </label>
            <input
              type="number" step="any" className="input-field w-full" placeholder="1.08500"
              value={entryPrice} onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
              <AlertTriangle className="w-3 h-3 inline mr-1" />Stop Loss
            </label>
            <input
              type="number" step="any" className="input-field w-full" placeholder="1.08300"
              value={stopLoss} onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
              <TrendingUp className="w-3 h-3 inline mr-1" />Take Profit (optionnel)
            </label>
            <input
              type="number" step="any" className="input-field w-full" placeholder="1.09000"
              value={takeProfit} onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Risque (€)", value: `${results.riskAmount.toFixed(2)}€`, color: riskColor, icon: DollarSign },
            { label: "Taille position", value: `${results.positionSize.toFixed(2)} lots`, color: "#0ea5e9", icon: Calculator },
            { label: `SL Distance (${instrument === "forex" ? "pips" : "pts"})`, value: results.slDistance.toFixed(1), color: "#f59e0b", icon: Target },
            { label: "Perte potentielle", value: `${results.potentialLoss.toFixed(2)}€`, color: "#ef4444", icon: AlertTriangle },
            ...(results.potentialProfit !== null ? [
              { label: "Profit potentiel", value: `${results.potentialProfit.toFixed(2)}€`, color: "#10b981", icon: TrendingUp },
            ] : []),
            ...(results.rrRatio !== null ? [
              { label: "Ratio R:R", value: `1:${results.rrRatio.toFixed(2)}`, color: results.rrRatio >= 2 ? "#10b981" : results.rrRatio >= 1 ? "#f59e0b" : "#ef4444", icon: BarChart3 },
            ] : []),
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
      )}

      {/* Quick Risk Table */}
      {quickRiskTable && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Percent className="w-5 h-5 text-cyan-400" /> Table de risque rapide
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  <th className="text-left py-2 px-3">Risque %</th>
                  <th className="text-right py-2 px-3">Montant (€)</th>
                  <th className="text-right py-2 px-3">Taille (lots)</th>
                </tr>
              </thead>
              <tbody>
                {quickRiskTable.map((row) => (
                  <tr
                    key={row.percent}
                    className="border-t"
                    style={{
                      borderColor: "var(--bg-hover)",
                      background: row.percent === riskPercent ? "var(--bg-hover)" : undefined,
                    }}
                  >
                    <td className="py-2 px-3 font-medium" style={{
                      color: row.percent <= 1 ? "#10b981" : row.percent <= 2 ? "#f59e0b" : "#ef4444",
                    }}>
                      {row.percent}%
                    </td>
                    <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>
                      {row.riskAmount.toFixed(2)}€
                    </td>
                    <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>
                      {row.lots.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pip Value Reference */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <DollarSign className="w-5 h-5 text-cyan-400" /> Référence valeurs pip / point
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-muted)" }}>
                <th className="text-left py-2 px-3">Instrument</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-right py-2 px-3">Valeur / lot</th>
              </tr>
            </thead>
            <tbody>
              {PIP_REFERENCE.map((ref) => (
                <tr key={ref.pair} className="border-t" style={{ borderColor: "var(--bg-hover)" }}>
                  <td className="py-2 px-3 font-medium" style={{ color: "var(--text-primary)" }}>{ref.pair}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{ref.type}</td>
                  <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>{ref.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
