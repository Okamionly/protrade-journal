"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/useTrades";
import {
  Calculator, DollarSign, Target, Shield, TrendingUp, AlertTriangle,
  Percent, BarChart3, Layers, Info, Activity, Grid3X3, LineChart, Coins,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";

type Instrument = "forex" | "indices" | "crypto" | "actions";

const PIP_VALUES: Record<Instrument, number> = {
  forex: 10,
  indices: 1,
  crypto: 1,
  actions: 1,
};

const LEVERAGE_OPTIONS: Record<Instrument, { label: string; value: number }[]> = {
  forex: [
    { label: "1:30 (EU Retail)", value: 30 },
    { label: "1:50", value: 50 },
    { label: "1:100", value: 100 },
    { label: "1:200", value: 200 },
    { label: "1:500", value: 500 },
  ],
  indices: [
    { label: "1:5 (EU Retail)", value: 5 },
    { label: "1:10", value: 10 },
    { label: "1:20", value: 20 },
    { label: "1:50", value: 50 },
    { label: "1:100", value: 100 },
  ],
  crypto: [
    { label: "1:2 (EU Retail)", value: 2 },
    { label: "1:5", value: 5 },
    { label: "1:10", value: 10 },
    { label: "1:20", value: 20 },
    { label: "1:50", value: 50 },
    { label: "1:100", value: 100 },
    { label: "1:125", value: 125 },
  ],
  actions: [
    { label: "1:5 (EU Retail)", value: 5 },
    { label: "1:10", value: 10 },
    { label: "1:20", value: 20 },
  ],
};

const PIP_REFERENCE = [
  { pair: "EUR/USD", value: "$10 / lot", type: "Forex", leverage: "1:30 EU" },
  { pair: "GBP/USD", value: "$10 / lot", type: "Forex", leverage: "1:30 EU" },
  { pair: "USD/JPY", value: "~$6.70 / lot", type: "Forex", leverage: "1:30 EU" },
  { pair: "Gold (XAU)", value: "$10 / 0.1 pip", type: "Commodity", leverage: "1:20 EU" },
  { pair: "NAS100", value: "$1 / point", type: "Indice", leverage: "1:20 EU" },
  { pair: "US30", value: "$1 / point", type: "Indice", leverage: "1:20 EU" },
  { pair: "BTC/USD", value: "$1 / point", type: "Crypto", leverage: "1:2 EU" },
  { pair: "S&P500", value: "$1 / point", type: "Indice", leverage: "1:20 EU" },
];

const RISK_LEVELS = [0.5, 1, 1.5, 2, 3];

// --- Pip Value Calculator data ---
interface PairConfig {
  name: string;
  pipValuePerLot: number; // value in USD per standard lot per pip
  category: string;
}

const PAIR_CONFIGS: PairConfig[] = [
  { name: "EUR/USD", pipValuePerLot: 10, category: "Forex Major" },
  { name: "GBP/USD", pipValuePerLot: 10, category: "Forex Major" },
  { name: "AUD/USD", pipValuePerLot: 10, category: "Forex Major" },
  { name: "NZD/USD", pipValuePerLot: 10, category: "Forex Major" },
  { name: "USD/CHF", pipValuePerLot: 10.5, category: "Forex Major" },
  { name: "USD/JPY", pipValuePerLot: 6.7, category: "Forex Major" },
  { name: "USD/CAD", pipValuePerLot: 7.3, category: "Forex Major" },
  { name: "EUR/GBP", pipValuePerLot: 12.6, category: "Forex Cross" },
  { name: "EUR/JPY", pipValuePerLot: 6.7, category: "Forex Cross" },
  { name: "GBP/JPY", pipValuePerLot: 6.7, category: "Forex Cross" },
  { name: "XAU/USD", pipValuePerLot: 10, category: "Commodity" },
  { name: "XAG/USD", pipValuePerLot: 50, category: "Commodity" },
  { name: "NAS100", pipValuePerLot: 1, category: "Indice" },
  { name: "US30", pipValuePerLot: 1, category: "Indice" },
  { name: "S&P500", pipValuePerLot: 1, category: "Indice" },
  { name: "BTC/USD", pipValuePerLot: 1, category: "Crypto" },
];

// EUR/USD approximate rate for conversion
const EUR_USD_RATE = 1.085;

// --- Position Size Quick Reference SL distances ---
const SL_DISTANCES = [20, 30, 50, 100];

// --- Active tab type ---
type CalcTab = "position" | "pip" | "rr" | "compound" | "grid";

export default function CalculatorPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<CalcTab>("position");

  // --- Shared state ---
  const [capital, setCapital] = useState<number>(user?.balance || 10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [takeProfit, setTakeProfit] = useState<number | "">("");
  const [instrument, setInstrument] = useState<Instrument>("forex");
  const [leverage, setLeverage] = useState(30);
  const [showLeverageInfo, setShowLeverageInfo] = useState(false);

  // --- Pip Value Calculator state ---
  const [pipLotSize, setPipLotSize] = useState(1);
  const [pipPairIndex, setPipPairIndex] = useState(0);

  // --- R:R Visualizer state ---
  const [rrEntry, setRrEntry] = useState<number | "">(1.085);
  const [rrSL, setRrSL] = useState<number | "">(1.083);
  const [rrTP, setRrTP] = useState<number | "">(1.091);
  const [rrLotSize, setRrLotSize] = useState(1);

  // --- Compound Growth Calculator state ---
  const [compStartBalance, setCompStartBalance] = useState(10000);
  const [compWinRate, setCompWinRate] = useState(55);
  const [compAvgRR, setCompAvgRR] = useState(2);
  const [compTradesPerMonth, setCompTradesPerMonth] = useState(20);
  const [compRiskPerTrade, setCompRiskPerTrade] = useState(1);

  // Sync capital when user loads
  useEffect(() => {
    if (user?.balance) {
      setCapital(user.balance);
      setCompStartBalance(user.balance);
    }
  }, [user?.balance]);

  // Reset leverage when instrument changes
  useEffect(() => {
    const opts = LEVERAGE_OPTIONS[instrument];
    setLeverage(opts[0].value);
  }, [instrument]);

  const pipMultiplier = instrument === "forex"
    ? (typeof entryPrice === "number" && entryPrice > 0 && entryPrice < 1 ? 10000 :
       typeof entryPrice === "number" && entryPrice >= 1 && entryPrice < 200 ? 10000 :
       typeof entryPrice === "number" && entryPrice >= 200 ? 100 : 10000)
    : 1;
  const pipValue = PIP_VALUES[instrument];

  const results = useMemo(() => {
    if (entryPrice === "" || stopLoss === "" || entryPrice === stopLoss) return null;
    const entry = Number(entryPrice);
    const sl = Number(stopLoss);
    const tp = takeProfit ? Number(takeProfit) : null;
    const riskAmount = capital * (riskPercent / 100);
    const slDistance = Math.abs(entry - sl) * pipMultiplier;
    const positionSize = slDistance > 0 ? riskAmount / (slDistance * pipValue) : 0;
    const potentialLoss = positionSize * slDistance * pipValue;
    const notionalValue = positionSize * entry * (instrument === "forex" ? 100000 : 1);
    const marginRequired = notionalValue / leverage;
    const marginPercent = capital > 0 ? (marginRequired / capital) * 100 : 0;
    const maxNotional = capital * leverage;
    const maxLots = instrument === "forex"
      ? maxNotional / (entry * 100000 || 1)
      : maxNotional / (entry || 1);
    let potentialProfit: number | null = null;
    let rrRatio: number | null = null;
    if (tp) {
      const tpDistance = Math.abs(tp - entry) * pipMultiplier;
      potentialProfit = positionSize * tpDistance * pipValue;
      rrRatio = slDistance > 0 ? tpDistance / slDistance : null;
    }
    return { riskAmount, positionSize, slDistance, potentialLoss, potentialProfit, rrRatio, marginRequired, marginPercent, maxLots };
  }, [capital, riskPercent, entryPrice, stopLoss, takeProfit, instrument, pipMultiplier, pipValue, leverage]);

  const quickRiskTable = useMemo(() => {
    if (entryPrice === "" || stopLoss === "" || entryPrice === stopLoss) return null;
    const entry = Number(entryPrice);
    const sl = Number(stopLoss);
    const slDistance = Math.abs(entry - sl) * pipMultiplier;
    if (slDistance === 0) return null;
    return RISK_LEVELS.map((r) => {
      const riskAmt = capital * (r / 100);
      const lots = riskAmt / (slDistance * pipValue);
      const notional = lots * entry * (instrument === "forex" ? 100000 : 1);
      const margin = notional / leverage;
      return { percent: r, riskAmount: riskAmt, lots, margin };
    });
  }, [capital, entryPrice, stopLoss, pipMultiplier, pipValue, leverage, instrument]);

  const riskZone = riskPercent <= 1 ? "low" : riskPercent <= 2 ? "medium" : "high";
  const riskColor = riskZone === "low" ? "#10b981" : riskZone === "medium" ? "#f59e0b" : "#ef4444";
  const marginWarning = results && results.marginPercent > 50;
  const marginDanger = results && results.marginPercent > 80;

  // --- Pip Value calculation ---
  const pipCalcResult = useMemo(() => {
    const pair = PAIR_CONFIGS[pipPairIndex];
    const valueUSD = pair.pipValuePerLot * pipLotSize;
    const valueEUR = valueUSD / EUR_USD_RATE;
    return { pair, valueUSD, valueEUR };
  }, [pipPairIndex, pipLotSize]);

  // --- R:R Visualizer calculations ---
  const rrCalc = useMemo(() => {
    if (rrEntry === "" || rrSL === "" || rrTP === "") return null;
    const entry = Number(rrEntry);
    const sl = Number(rrSL);
    const tp = Number(rrTP);
    if (entry === sl || entry === tp) return null;
    const isLong = tp > entry;
    const slDist = Math.abs(entry - sl);
    const tpDist = Math.abs(tp - entry);
    const ratio = slDist > 0 ? tpDist / slDist : 0;
    const slPips = slDist * 10000;
    const tpPips = tpDist * 10000;
    const riskEur = (slPips * 10 * rrLotSize) / EUR_USD_RATE;
    const rewardEur = (tpPips * 10 * rrLotSize) / EUR_USD_RATE;
    return { entry, sl, tp, isLong, slDist, tpDist, ratio, slPips, tpPips, riskEur, rewardEur };
  }, [rrEntry, rrSL, rrTP, rrLotSize]);

  // --- Compound Growth calculations ---
  const compoundResults = useMemo(() => {
    const wr = compWinRate / 100;
    const riskAmt = compStartBalance * (compRiskPerTrade / 100);
    const avgWin = riskAmt * compAvgRR;
    const avgLoss = riskAmt;
    const expectedPerTrade = (wr * avgWin) - ((1 - wr) * avgLoss);
    const expectancy = (wr * compAvgRR) - (1 - wr);

    const simulate = (winRateMod: number) => {
      const months: number[] = [compStartBalance];
      let bal = compStartBalance;
      for (let m = 0; m < 12; m++) {
        for (let t = 0; t < compTradesPerMonth; t++) {
          const risk = bal * (compRiskPerTrade / 100);
          const win = Math.random() < (wr + winRateMod);
          bal += win ? risk * compAvgRR : -risk;
          if (bal <= 0) { bal = 0; break; }
        }
        months.push(bal);
      }
      return months;
    };

    // Expected (deterministic)
    const expectedMonths: number[] = [compStartBalance];
    let bal = compStartBalance;
    for (let m = 0; m < 12; m++) {
      for (let t = 0; t < compTradesPerMonth; t++) {
        const risk = bal * (compRiskPerTrade / 100);
        bal += expectedPerTrade > 0 ? risk * expectancy : risk * expectancy;
        if (bal <= 0) { bal = 0; break; }
      }
      expectedMonths.push(bal);
    }

    // Best case: +10% win rate
    const bestMonths: number[] = [compStartBalance];
    let bestBal = compStartBalance;
    const bestWr = Math.min(wr + 0.1, 1);
    for (let m = 0; m < 12; m++) {
      for (let t = 0; t < compTradesPerMonth; t++) {
        const risk = bestBal * (compRiskPerTrade / 100);
        const bestExpectancy = (bestWr * compAvgRR) - (1 - bestWr);
        bestBal += risk * bestExpectancy;
        if (bestBal <= 0) { bestBal = 0; break; }
      }
      bestMonths.push(bestBal);
    }

    // Worst case: -10% win rate
    const worstMonths: number[] = [compStartBalance];
    let worstBal = compStartBalance;
    const worstWr = Math.max(wr - 0.1, 0);
    for (let m = 0; m < 12; m++) {
      for (let t = 0; t < compTradesPerMonth; t++) {
        const risk = worstBal * (compRiskPerTrade / 100);
        const worstExpectancy = (worstWr * compAvgRR) - (1 - worstWr);
        worstBal += risk * worstExpectancy;
        if (worstBal <= 0) { worstBal = 0; break; }
      }
      worstMonths.push(worstBal);
    }

    return {
      expectedMonths,
      bestMonths,
      worstMonths,
      expectancy,
      expectedPerTrade,
      at3: expectedMonths[3],
      at6: expectedMonths[6],
      at12: expectedMonths[12],
    };
  }, [compStartBalance, compWinRate, compAvgRR, compTradesPerMonth, compRiskPerTrade]);

  // --- Position Size Grid ---
  const positionGrid = useMemo(() => {
    return RISK_LEVELS.map((riskPct) => {
      const riskAmount = capital * (riskPct / 100);
      const cells = SL_DISTANCES.map((slPips) => {
        const lots = riskAmount / (slPips * 10); // pip value = $10 for forex
        return lots;
      });
      return { riskPct, riskAmount, cells };
    });
  }, [capital]);

  // --- Tab navigation ---
  const tabs: { id: CalcTab; label: string; icon: typeof Calculator }[] = [
    { id: "position", label: "Taille Position", icon: Calculator },
    { id: "pip", label: "Valeur Pip", icon: Coins },
    { id: "rr", label: "Risque/Rendement", icon: Activity },
    { id: "compound", label: "Croissance Composée", icon: LineChart },
    { id: "grid", label: "Grille Rapide", icon: Grid3X3 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Calculator className="w-6 h-6 text-cyan-400" /> {t("positionCalculator")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Calculez la taille optimale de vos positions, valeurs pip, ratios risque/rendement et projection de croissance.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab.id ? "rgba(6,182,212,0.15)" : "var(--bg-card-solid)",
              border: activeTab === tab.id ? "1px solid rgba(6,182,212,0.4)" : "1px solid var(--border)",
              color: activeTab === tab.id ? "#06b6d4" : "var(--text-secondary)",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB: Position Size Calculator (original) */}
      {/* ============================================================ */}
      {activeTab === "position" && (
        <div className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  <DollarSign className="w-3 h-3 inline mr-1" />Capital (€)
                </label>
                <input type="number" className="input-field w-full" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  <BarChart3 className="w-3 h-3 inline mr-1" />Instrument
                </label>
                <select className="input-field w-full" value={instrument} onChange={(e) => setInstrument(e.target.value as Instrument)}>
                  <option value="forex">Forex</option>
                  <option value="indices">Indices</option>
                  <option value="crypto">Crypto</option>
                  <option value="actions">Actions</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Layers className="w-3 h-3" />Effet de levier
                  <button type="button" onClick={() => setShowLeverageInfo(!showLeverageInfo)} className="ml-auto hover:opacity-70">
                    <Info className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  </button>
                </label>
                <select className="input-field w-full" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}>
                  {LEVERAGE_OPTIONS[instrument].map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {showLeverageInfo && (
              <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Leviers réglementaires (ESMA / EU Retail) :</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Forex Major", val: "1:30" },
                    { label: "Forex Minor", val: "1:20" },
                    { label: "Indices", val: "1:5 à 1:20" },
                    { label: "Crypto", val: "1:2 (EU)" },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded-lg" style={{ background: "var(--bg-card-solid)" }}>
                      <span className="font-bold text-cyan-400">{item.label}</span>
                      <p style={{ color: "var(--text-secondary)" }}>{item.val}</p>
                    </div>
                  ))}
                </div>
                <p style={{ color: "var(--text-muted)" }}>
                  Les brokers hors-EU (offshore) offrent souvent des leviers plus élevés (1:100 à 1:500). Un levier plus élevé = plus de risque.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
                <span><Percent className="w-3 h-3 inline mr-1" />Risque : {riskPercent}%</span>
                <span style={{ color: riskColor }}>{(capital * riskPercent / 100).toFixed(2)}€</span>
              </label>
              <input type="range" className="w-full accent-cyan-400" min={0.5} max={5} step={0.1} value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} />
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>0.5%</span><span>5%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  <Target className="w-3 h-3 inline mr-1" />Prix d&apos;entrée
                </label>
                <input type="number" step="any" className="input-field w-full" placeholder="1.08500" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />Stop Loss
                </label>
                <input type="number" step="any" className="input-field w-full" placeholder="1.08300" value={stopLoss} onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  <TrendingUp className="w-3 h-3 inline mr-1" />Take Profit (optionnel)
                </label>
                <input type="number" step="any" className="input-field w-full" placeholder="1.09000" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : "")} />
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              {/* Leverage / Margin Info */}
              <div className="glass rounded-2xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Layers className="w-5 h-5 text-cyan-400" /> Marge & Levier (1:{leverage})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="metric-card rounded-xl p-4 text-center">
                    <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Marge requise</p>
                    <p className={`text-xl font-bold mono ${marginDanger ? "text-rose-400" : marginWarning ? "text-amber-400" : "text-cyan-400"}`}>
                      {results.marginRequired.toFixed(2)}€
                    </p>
                  </div>
                  <div className="metric-card rounded-xl p-4 text-center">
                    <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>% du capital utilisé</p>
                    <p className={`text-xl font-bold mono ${marginDanger ? "text-rose-400" : marginWarning ? "text-amber-400" : "text-emerald-400"}`}>
                      {results.marginPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="metric-card rounded-xl p-4 text-center">
                    <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Lots max (levier)</p>
                    <p className="text-xl font-bold mono text-cyan-400">{results.maxLots.toFixed(2)}</p>
                  </div>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${Math.min(results.marginPercent, 100)}%`,
                    background: marginDanger ? "#ef4444" : marginWarning ? "#f59e0b" : "#10b981",
                  }} />
                </div>
                <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>0%</span>
                  <span>Marge utilisée : {results.marginPercent.toFixed(1)}%</span>
                  <span>100%</span>
                </div>
                {marginWarning && (
                  <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${marginDanger ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {marginDanger
                      ? "Marge critique ! Cette position utilise plus de 80% de votre capital. Risque de margin call élevé."
                      : "Attention : cette position utilise plus de 50% de votre marge disponible."}
                  </div>
                )}
              </div>
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
                      <th className="text-right py-2 px-3">Marge (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickRiskTable.map((row) => (
                      <tr key={row.percent} className="border-t" style={{
                        borderColor: "var(--bg-hover)",
                        background: row.percent === riskPercent ? "var(--bg-hover)" : undefined,
                      }}>
                        <td className="py-2 px-3 font-medium" style={{
                          color: row.percent <= 1 ? "#10b981" : row.percent <= 2 ? "#f59e0b" : "#ef4444",
                        }}>{row.percent}%</td>
                        <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>{row.riskAmount.toFixed(2)}€</td>
                        <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>{row.lots.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right mono" style={{
                          color: row.margin > capital * 0.8 ? "#ef4444" : row.margin > capital * 0.5 ? "#f59e0b" : "var(--text-primary)",
                        }}>{row.margin.toFixed(2)}€</td>
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
                    <th className="text-right py-2 px-3">Levier EU</th>
                  </tr>
                </thead>
                <tbody>
                  {PIP_REFERENCE.map((ref) => (
                    <tr key={ref.pair} className="border-t" style={{ borderColor: "var(--bg-hover)" }}>
                      <td className="py-2 px-3 font-medium" style={{ color: "var(--text-primary)" }}>{ref.pair}</td>
                      <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{ref.type}</td>
                      <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-primary)" }}>{ref.value}</td>
                      <td className="py-2 px-3 text-right mono" style={{ color: "var(--text-muted)" }}>{ref.leverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Pip Value Calculator */}
      {/* ============================================================ */}
      {activeTab === "pip" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Coins className="w-5 h-5 text-cyan-400" /> Calculateur de valeur pip
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Calculez la valeur d&apos;un pip pour n&apos;importe quelle paire et taille de lot. Devise du compte : EUR.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Paire / Instrument</label>
                <select className="input-field w-full" value={pipPairIndex} onChange={(e) => setPipPairIndex(Number(e.target.value))}>
                  {PAIR_CONFIGS.map((p, i) => (
                    <option key={p.name} value={i}>{p.name} ({p.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Taille du lot</label>
                <input type="number" step="0.01" min={0.01} className="input-field w-full" value={pipLotSize} onChange={(e) => setPipLotSize(Number(e.target.value) || 0.01)} />
              </div>
            </div>

            {/* Result cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="metric-card rounded-2xl p-5 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Paire</p>
                <p className="text-xl font-bold text-cyan-400">{pipCalcResult.pair.name}</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{pipCalcResult.pair.category}</p>
              </div>
              <div className="metric-card rounded-2xl p-5 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Valeur pip (USD)</p>
                <p className="text-2xl font-bold mono text-emerald-400">${pipCalcResult.valueUSD.toFixed(2)}</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>pour {pipLotSize} lot{pipLotSize !== 1 ? "s" : ""}</p>
              </div>
              <div className="metric-card rounded-2xl p-5 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Valeur pip (EUR)</p>
                <p className="text-2xl font-bold mono text-amber-400">{pipCalcResult.valueEUR.toFixed(2)}€</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>taux EUR/USD ~{EUR_USD_RATE}</p>
              </div>
            </div>
          </div>

          {/* Quick reference grid */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Référence rapide (1 lot standard)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PAIR_CONFIGS.slice(0, 8).map((p) => (
                <div key={p.name} className="rounded-xl p-3" style={{ background: "var(--bg-card-solid)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold text-cyan-400">{p.name}</p>
                  <p className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>${p.pipValuePerLot}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(p.pipValuePerLot / EUR_USD_RATE).toFixed(2)}€ / pip</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Risk/Reward Visualizer */}
      {/* ============================================================ */}
      {activeTab === "rr" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Activity className="w-5 h-5 text-cyan-400" /> Visualisation Risque / Rendement
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Prix d&apos;entrée</label>
                <input type="number" step="any" className="input-field w-full" value={rrEntry} onChange={(e) => setRrEntry(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Stop Loss</label>
                <input type="number" step="any" className="input-field w-full" value={rrSL} onChange={(e) => setRrSL(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Take Profit</label>
                <input type="number" step="any" className="input-field w-full" value={rrTP} onChange={(e) => setRrTP(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Taille (lots)</label>
                <input type="number" step="0.01" min={0.01} className="input-field w-full" value={rrLotSize} onChange={(e) => setRrLotSize(Number(e.target.value) || 0.01)} />
              </div>
            </div>
          </div>

          {rrCalc && (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="metric-card rounded-2xl p-5 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ratio R:R</p>
                  <p className="text-3xl font-bold mono" style={{
                    color: rrCalc.ratio >= 2 ? "#10b981" : rrCalc.ratio >= 1 ? "#f59e0b" : "#ef4444"
                  }}>1:{rrCalc.ratio.toFixed(2)}</p>
                </div>
                <div className="metric-card rounded-2xl p-5 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Risque</p>
                  <p className="text-2xl font-bold mono text-rose-400">-{rrCalc.riskEur.toFixed(2)}€</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{rrCalc.slPips.toFixed(1)} pips</p>
                </div>
                <div className="metric-card rounded-2xl p-5 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Récompense</p>
                  <p className="text-2xl font-bold mono text-emerald-400">+{rrCalc.rewardEur.toFixed(2)}€</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{rrCalc.tpPips.toFixed(1)} pips</p>
                </div>
                <div className="metric-card rounded-2xl p-5 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Direction</p>
                  <p className="text-2xl font-bold" style={{ color: rrCalc.isLong ? "#10b981" : "#ef4444" }}>
                    {rrCalc.isLong ? "LONG" : "SHORT"}
                  </p>
                </div>
              </div>

              {/* SVG Visualization */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Visualisation du trade</h3>
                <RRVisualizerSVG entry={rrCalc.entry} sl={rrCalc.sl} tp={rrCalc.tp} ratio={rrCalc.ratio} riskEur={rrCalc.riskEur} rewardEur={rrCalc.rewardEur} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Compound Growth Calculator */}
      {/* ============================================================ */}
      {activeTab === "compound" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <LineChart className="w-5 h-5 text-cyan-400" /> Calculateur de croissance composée
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Projetez la croissance de votre compte avec des performances régulières.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Capital initial (€)</label>
                <input type="number" className="input-field w-full" value={compStartBalance} onChange={(e) => setCompStartBalance(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Win rate (%)</label>
                <input type="number" min={1} max={99} className="input-field w-full" value={compWinRate} onChange={(e) => setCompWinRate(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>R:R moyen</label>
                <input type="number" step="0.1" min={0.1} className="input-field w-full" value={compAvgRR} onChange={(e) => setCompAvgRR(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Trades / mois</label>
                <input type="number" min={1} max={200} className="input-field w-full" value={compTradesPerMonth} onChange={(e) => setCompTradesPerMonth(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Risque / trade (%)</label>
                <input type="number" step="0.1" min={0.1} max={10} className="input-field w-full" value={compRiskPerTrade} onChange={(e) => setCompRiskPerTrade(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Key projections */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card rounded-2xl p-5 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Espérance / trade</p>
              <p className="text-xl font-bold mono" style={{
                color: compoundResults.expectancy > 0 ? "#10b981" : "#ef4444"
              }}>{compoundResults.expectancy > 0 ? "+" : ""}{(compoundResults.expectancy * 100).toFixed(1)}%R</p>
            </div>
            <div className="metric-card rounded-2xl p-5 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>3 mois</p>
              <p className="text-xl font-bold mono" style={{
                color: compoundResults.at3 > compStartBalance ? "#10b981" : "#ef4444"
              }}>{compoundResults.at3.toFixed(0)}€</p>
            </div>
            <div className="metric-card rounded-2xl p-5 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>6 mois</p>
              <p className="text-xl font-bold mono" style={{
                color: compoundResults.at6 > compStartBalance ? "#10b981" : "#ef4444"
              }}>{compoundResults.at6.toFixed(0)}€</p>
            </div>
            <div className="metric-card rounded-2xl p-5 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>12 mois</p>
              <p className="text-xl font-bold mono" style={{
                color: compoundResults.at12 > compStartBalance ? "#10b981" : "#ef4444"
              }}>{compoundResults.at12.toFixed(0)}€</p>
            </div>
          </div>

          {/* SVG Growth Chart */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Courbe de croissance (12 mois)</h3>
            <CompoundGrowthSVG
              expected={compoundResults.expectedMonths}
              best={compoundResults.bestMonths}
              worst={compoundResults.worstMonths}
              startBalance={compStartBalance}
            />
            <div className="flex justify-center gap-6 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "#10b981" }} /> Attendu</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "#06b6d4" }} /> Meilleur cas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "#ef4444" }} /> Pire cas</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Position Size Quick Reference Grid */}
      {/* ============================================================ */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1" style={{ color: "var(--text-primary)" }}>
              <Grid3X3 className="w-5 h-5 text-cyan-400" /> Grille de taille de position
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Taille de lot (Forex, pip = $10) pour chaque niveau de risque et distance SL. Capital : <span className="font-bold text-cyan-400">{capital.toLocaleString()}€</span>
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Risque %</th>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Montant (€)</th>
                    {SL_DISTANCES.map((sl) => (
                      <th key={sl} className="text-center py-3 px-4" style={{ color: "var(--text-muted)" }}>SL {sl} pips</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positionGrid.map((row) => (
                    <tr key={row.riskPct} className="border-t" style={{ borderColor: "var(--bg-hover)" }}>
                      <td className="py-3 px-4 font-semibold" style={{
                        color: row.riskPct <= 1 ? "#10b981" : row.riskPct <= 2 ? "#f59e0b" : "#ef4444",
                      }}>{row.riskPct}%</td>
                      <td className="py-3 px-4 mono" style={{ color: "var(--text-secondary)" }}>
                        {row.riskAmount.toFixed(0)}€
                      </td>
                      {row.cells.map((lots, i) => (
                        <td key={SL_DISTANCES[i]} className="py-3 px-4 text-center">
                          <span className="font-bold mono text-base" style={{ color: "var(--text-primary)" }}>
                            {lots.toFixed(2)}
                          </span>
                          <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>lots</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Capital adjustment */}
          <div className="glass rounded-2xl p-5">
            <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
              <DollarSign className="w-3 h-3 inline mr-1" />Ajuster le capital (€)
            </label>
            <input type="number" className="input-field w-full" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// SVG Component: Risk/Reward Visualizer
// ====================================================================
function RRVisualizerSVG({ entry, sl, tp, ratio, riskEur, rewardEur }: {
  entry: number; sl: number; tp: number; ratio: number; riskEur: number; rewardEur: number;
}) {
  const width = 600;
  const height = 280;
  const padding = 60;
  const chartW = width - padding * 2;
  const chartH = height - 60;

  const prices = [sl, entry, tp].sort((a, b) => a - b);
  const minP = prices[0];
  const maxP = prices[2];
  const range = maxP - minP || 1;

  const yForPrice = (p: number) => {
    return 30 + chartH - ((p - minP) / range) * chartH;
  };

  const yEntry = yForPrice(entry);
  const ySL = yForPrice(sl);
  const yTP = yForPrice(tp);

  const slIsBelow = sl < entry;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[600px] mx-auto" style={{ overflow: "visible" }}>
      {/* Risk zone (SL to Entry) */}
      <rect
        x={padding}
        y={Math.min(yEntry, ySL)}
        width={chartW}
        height={Math.abs(yEntry - ySL)}
        fill="#ef4444"
        opacity={0.12}
        rx={4}
      />
      {/* Reward zone (Entry to TP) */}
      <rect
        x={padding}
        y={Math.min(yEntry, yTP)}
        width={chartW}
        height={Math.abs(yEntry - yTP)}
        fill="#10b981"
        opacity={0.12}
        rx={4}
      />

      {/* Entry line */}
      <line x1={padding} y1={yEntry} x2={padding + chartW} y2={yEntry} stroke="#06b6d4" strokeWidth={2} strokeDasharray="6,3" />
      <text x={padding - 8} y={yEntry + 4} textAnchor="end" fill="#06b6d4" fontSize={11} fontWeight={600}>{entry.toFixed(5)}</text>
      <text x={padding + chartW + 8} y={yEntry + 4} textAnchor="start" fill="#06b6d4" fontSize={11} fontWeight={600}>ENTRÉE</text>

      {/* SL line */}
      <line x1={padding} y1={ySL} x2={padding + chartW} y2={ySL} stroke="#ef4444" strokeWidth={2} />
      <text x={padding - 8} y={ySL + 4} textAnchor="end" fill="#ef4444" fontSize={11} fontWeight={600}>{sl.toFixed(5)}</text>
      <text x={padding + chartW + 8} y={ySL + 4} textAnchor="start" fill="#ef4444" fontSize={10}>SL (-{riskEur.toFixed(0)}€)</text>

      {/* TP line */}
      <line x1={padding} y1={yTP} x2={padding + chartW} y2={yTP} stroke="#10b981" strokeWidth={2} />
      <text x={padding - 8} y={yTP + 4} textAnchor="end" fill="#10b981" fontSize={11} fontWeight={600}>{tp.toFixed(5)}</text>
      <text x={padding + chartW + 8} y={yTP + 4} textAnchor="start" fill="#10b981" fontSize={10}>TP (+{rewardEur.toFixed(0)}€)</text>

      {/* R:R Badge */}
      <rect x={width / 2 - 50} y={height - 32} width={100} height={26} rx={13} fill={ratio >= 2 ? "#10b981" : ratio >= 1 ? "#f59e0b" : "#ef4444"} opacity={0.9} />
      <text x={width / 2} y={height - 15} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>R:R 1:{ratio.toFixed(2)}</text>

      {/* Arrow from Entry to TP */}
      <line x1={width / 2} y1={yEntry} x2={width / 2} y2={yTP} stroke="#10b981" strokeWidth={1.5} markerEnd="url(#arrowGreen)" />
      {/* Arrow from Entry to SL */}
      <line x1={width / 2 + 40} y1={yEntry} x2={width / 2 + 40} y2={ySL} stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#arrowRed)" />

      <defs>
        <marker id="arrowGreen" markerWidth={8} markerHeight={6} refX={4} refY={3} orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
        </marker>
        <marker id="arrowRed" markerWidth={8} markerHeight={6} refX={4} refY={3} orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  );
}

// ====================================================================
// SVG Component: Compound Growth Chart
// ====================================================================
function CompoundGrowthSVG({ expected, best, worst, startBalance }: {
  expected: number[]; best: number[]; worst: number[]; startBalance: number;
}) {
  const width = 700;
  const height = 260;
  const padding = { left: 70, right: 20, top: 20, bottom: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = [...expected, ...best, ...worst].filter((v) => v > 0);
  const maxVal = Math.max(...allValues, startBalance * 1.1);
  const minVal = Math.min(...allValues, startBalance * 0.5);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => padding.left + (i / 12) * chartW;
  const toY = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const pathFor = (data: number[]) => {
    return data.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  };

  // Y-axis labels
  const yTicks = 5;
  const yLabels: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yLabels.push(minVal + (range / yTicks) * i);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {yLabels.map((val) => (
        <g key={val}>
          <line x1={padding.left} y1={toY(val)} x2={padding.left + chartW} y2={toY(val)} stroke="var(--border)" strokeWidth={0.5} opacity={0.4} />
          <text x={padding.left - 8} y={toY(val) + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>
            {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}€
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {Array.from({ length: 13 }).map((_, i) => (
        <text key={i} x={toX(i)} y={height - 8} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>
          {i === 0 ? "Déb." : `M${i}`}
        </text>
      ))}

      {/* Start balance reference */}
      <line x1={padding.left} y1={toY(startBalance)} x2={padding.left + chartW} y2={toY(startBalance)} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />

      {/* Worst case */}
      <path d={pathFor(worst)} fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.6} />
      {/* Best case */}
      <path d={pathFor(best)} fill="none" stroke="#06b6d4" strokeWidth={1.5} opacity={0.6} />
      {/* Expected */}
      <path d={pathFor(expected)} fill="none" stroke="#10b981" strokeWidth={2.5} />

      {/* End dots */}
      <circle cx={toX(12)} cy={toY(expected[12])} r={4} fill="#10b981" />
      <circle cx={toX(12)} cy={toY(best[12])} r={3} fill="#06b6d4" />
      <circle cx={toX(12)} cy={toY(worst[12])} r={3} fill="#ef4444" />

      {/* End labels */}
      <text x={toX(12) + 8} y={toY(expected[12]) + 4} fill="#10b981" fontSize={11} fontWeight={600}>
        {expected[12].toFixed(0)}€
      </text>
      <text x={toX(12) + 8} y={toY(best[12]) + 4} fill="#06b6d4" fontSize={10}>
        {best[12].toFixed(0)}€
      </text>
      <text x={toX(12) + 8} y={toY(worst[12]) + 4} fill="#ef4444" fontSize={10}>
        {worst[12].toFixed(0)}€
      </text>
    </svg>
  );
}
