// =====================================================
// MarketPhase v3 — Advanced Trading Analytics Engine
// Surpasses TradeZella with deeper metrics & AI-ready data
// =====================================================

export interface Trade {
  id: string;
  date: string;
  asset: string;
  direction: string;
  strategy: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  emotion: string | null;
  tags: string | null;
  commission?: number;
  swap?: number;
}

// ---- DISTRIBUTION PAR HEURE ----
export interface HourlyDistribution {
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
}

export function computeHourlyDistribution(trades: Trade[]): HourlyDistribution[] {
  const hours: Record<number, { trades: number; wins: number; pnl: number }> = {};
  for (let h = 0; h < 24; h++) hours[h] = { trades: 0, wins: 0, pnl: 0 };

  trades.forEach((t) => {
    const h = new Date(t.date).getHours();
    hours[h].trades++;
    hours[h].pnl += t.result;
    if (t.result > 0) hours[h].wins++;
  });

  return Object.entries(hours).map(([h, s]) => ({
    hour: parseInt(h),
    trades: s.trades,
    wins: s.wins,
    winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
    pnl: s.pnl,
    avgPnl: s.trades > 0 ? s.pnl / s.trades : 0,
  }));
}

// ---- DISTRIBUTION PAR JOUR DE SEMAINE ----
export interface DayDistribution {
  day: number;
  dayName: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
}

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function computeDayDistribution(trades: Trade[]): DayDistribution[] {
  const days: Record<number, { trades: number; wins: number; pnl: number }> = {};
  for (let d = 0; d < 7; d++) days[d] = { trades: 0, wins: 0, pnl: 0 };

  trades.forEach((t) => {
    const d = new Date(t.date).getDay();
    days[d].trades++;
    days[d].pnl += t.result;
    if (t.result > 0) days[d].wins++;
  });

  return Object.entries(days).map(([d, s]) => ({
    day: parseInt(d),
    dayName: DAYS_FR[parseInt(d)],
    trades: s.trades,
    wins: s.wins,
    winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
    pnl: s.pnl,
    avgPnl: s.trades > 0 ? s.pnl / s.trades : 0,
  }));
}

// ---- DISTRIBUTION PAR SESSION FOREX ----
export interface SessionDistribution {
  session: string;
  color: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
}

function getForexSession(date: Date): string {
  const h = date.getUTCHours();
  if (h >= 0 && h < 8) return "Asie";
  if (h >= 7 && h < 16) return "Londres";
  if (h >= 13 && h < 22) return "New York";
  return "Hors session";
}

export function computeSessionDistribution(trades: Trade[]): SessionDistribution[] {
  const sessions: Record<string, { trades: number; wins: number; pnl: number; color: string }> = {
    "Asie": { trades: 0, wins: 0, pnl: 0, color: "#f59e0b" },
    "Londres": { trades: 0, wins: 0, pnl: 0, color: "#0ea5e9" },
    "New York": { trades: 0, wins: 0, pnl: 0, color: "#10b981" },
    "Hors session": { trades: 0, wins: 0, pnl: 0, color: "#6b7280" },
  };

  trades.forEach((t) => {
    const s = getForexSession(new Date(t.date));
    sessions[s].trades++;
    sessions[s].pnl += t.result;
    if (t.result > 0) sessions[s].wins++;
  });

  return Object.entries(sessions).map(([name, s]) => ({
    session: name,
    color: s.color,
    trades: s.trades,
    wins: s.wins,
    winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
    pnl: s.pnl,
    avgPnl: s.trades > 0 ? s.pnl / s.trades : 0,
  }));
}

// ---- EXPECTANCY ----
export function computeExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const winRate = wins.length / trades.length;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  return winRate * avgWin - (1 - winRate) * avgLoss;
}

// ---- DRAWDOWN CURVE ----
export interface DrawdownPoint {
  index: number;
  date: string;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export function computeDrawdownCurve(trades: Trade[], startingBalance: number = 10000): DrawdownPoint[] {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let equity = startingBalance;
  let peak = startingBalance;
  const points: DrawdownPoint[] = [{ index: 0, date: "Start", equity: startingBalance, drawdown: 0, drawdownPercent: 0 }];

  sorted.forEach((t, i) => {
    equity += t.result - (t.commission || 0) - (t.swap || 0);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    points.push({ index: i + 1, date: t.date, equity, drawdown: dd, drawdownPercent: ddPct });
  });

  return points;
}

// ---- RISK METRICS ----
export interface RiskMetrics {
  avgRiskPerTrade: number;
  maxConsecutiveLosses: number;
  recoveryFactor: number;
  calmarRatio: number;
  payoffRatio: number;
  expectancy: number;
  kellyPercent: number;
  totalCommissions: number;
  totalSwaps: number;
  netPnlAfterFees: number;
}

export function computeRiskMetrics(trades: Trade[], balance: number = 10000): RiskMetrics {
  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 1;
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;

  // Max consecutive losses
  let maxConsLoss = 0;
  let currLoss = 0;
  trades.forEach((t) => {
    if (t.result < 0) { currLoss++; if (currLoss > maxConsLoss) maxConsLoss = currLoss; }
    else currLoss = 0;
  });

  // Max drawdown
  let peak = 0, maxDD = 0, cumulative = 0;
  trades.forEach((t) => {
    cumulative += t.result;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  });

  const netProfit = trades.reduce((s, t) => s + t.result, 0);
  const totalComm = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const totalSwap = trades.reduce((s, t) => s + (t.swap || 0), 0);

  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = computeExpectancy(trades);
  const kelly = avgLoss > 0 ? (winRate * payoffRatio - (1 - winRate)) / payoffRatio : 0;
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;
  const calmar = maxDD > 0 ? (netProfit / balance * 100) / (maxDD / balance * 100) : 0;

  return {
    avgRiskPerTrade: trades.length > 0 ? Math.abs(trades.reduce((s, t) => s + Math.abs(t.entry - t.sl) * t.lots, 0) / trades.length) : 0,
    maxConsecutiveLosses: maxConsLoss,
    recoveryFactor: parseFloat(recoveryFactor.toFixed(2)),
    calmarRatio: parseFloat(calmar.toFixed(2)),
    payoffRatio: parseFloat(payoffRatio.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    kellyPercent: parseFloat((Math.max(0, kelly) * 100).toFixed(1)),
    totalCommissions: parseFloat(totalComm.toFixed(2)),
    totalSwaps: parseFloat(totalSwap.toFixed(2)),
    netPnlAfterFees: parseFloat((netProfit - totalComm - totalSwap).toFixed(2)),
  };
}

// ---- MISTAKES TRACKER ----
export interface MistakePattern {
  type: string;
  icon: string;
  count: number;
  impactPnl: number;
  description: string;
  severity: "high" | "medium" | "low";
}

export function detectMistakes(trades: Trade[]): MistakePattern[] {
  const mistakes: MistakePattern[] = [];
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Revenge trading: trade within 5 min of a loss
  let revengeTrades = 0;
  let revengeImpact = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diff = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / 60000;
    if (prev.result < 0 && diff < 5) {
      revengeTrades++;
      revengeImpact += curr.result;
    }
  }
  if (revengeTrades > 0) {
    mistakes.push({
      type: "Revenge Trading",
      icon: "🔥",
      count: revengeTrades,
      impactPnl: revengeImpact,
      description: "Trades pris dans les 5 min après une perte",
      severity: "high",
    });
  }

  // 2. Overtrading: more than 5 trades in a day
  const tradeDays: Record<string, Trade[]> = {};
  sorted.forEach((t) => {
    const day = t.date.slice(0, 10);
    if (!tradeDays[day]) tradeDays[day] = [];
    tradeDays[day].push(t);
  });
  const overtradeDays = Object.entries(tradeDays).filter(([, ts]) => ts.length > 5);
  if (overtradeDays.length > 0) {
    const impact = overtradeDays.reduce((s, [, ts]) => s + ts.slice(5).reduce((ss, t) => ss + t.result, 0), 0);
    mistakes.push({
      type: "Overtrading",
      icon: "⚡",
      count: overtradeDays.length,
      impactPnl: impact,
      description: `${overtradeDays.length} jour(s) avec +5 trades`,
      severity: "medium",
    });
  }

  // 3. Not cutting losses: trades where loss > 2x avg loss
  const avgLoss = trades.filter((t) => t.result < 0).length > 0
    ? Math.abs(trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0) / trades.filter((t) => t.result < 0).length)
    : 0;
  const bigLosses = trades.filter((t) => t.result < 0 && Math.abs(t.result) > avgLoss * 2);
  if (bigLosses.length > 0) {
    mistakes.push({
      type: "Stop non respecté",
      icon: "🛑",
      count: bigLosses.length,
      impactPnl: bigLosses.reduce((s, t) => s + t.result, 0),
      description: "Pertes 2x supérieures à la moyenne",
      severity: "high",
    });
  }

  // 4. Trading during losing streaks: 3+ consecutive losses and still trading
  let streak = 0;
  let streakTrades = 0;
  let streakImpact = 0;
  sorted.forEach((t) => {
    if (t.result < 0) {
      streak++;
    } else {
      if (streak >= 3) { streakTrades++; streakImpact += t.result; }
      streak = 0;
    }
  });
  if (streakTrades > 0) {
    mistakes.push({
      type: "Trading en tilt",
      icon: "😤",
      count: streakTrades,
      impactPnl: streakImpact,
      description: "Trades après 3+ pertes consécutives",
      severity: "medium",
    });
  }

  // 5. Early exit: profitable trades closed at less than 50% of TP potential
  const earlyExits = trades.filter((t) => {
    if (!t.exit || t.result <= 0) return false;
    const potential = Math.abs(t.tp - t.entry);
    const actual = Math.abs(t.exit - t.entry);
    return actual < potential * 0.5;
  });
  if (earlyExits.length > 0) {
    const missedProfit = earlyExits.reduce((s, t) => {
      const potential = Math.abs(t.tp - t.entry) * t.lots;
      const actual = t.result;
      return s + (potential - actual);
    }, 0);
    mistakes.push({
      type: "Sortie prématurée",
      icon: "🏃",
      count: earlyExits.length,
      impactPnl: -missedProfit,
      description: "Gains coupés avant 50% du TP",
      severity: "low",
    });
  }

  // 6. Weekend holding
  const weekendTrades = trades.filter((t) => {
    const day = new Date(t.date).getDay();
    return day === 0 || day === 6;
  });
  if (weekendTrades.length > 0) {
    mistakes.push({
      type: "Trading weekend",
      icon: "📅",
      count: weekendTrades.length,
      impactPnl: weekendTrades.reduce((s, t) => s + t.result, 0),
      description: "Trades ouverts le weekend",
      severity: "low",
    });
  }

  return mistakes.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity];
  });
}

// ---- POSITION SIZING CALCULATOR ----
export type AssetType = "forex" | "crypto" | "indices" | "stocks";

export interface PositionSizeResult {
  lots: number;
  riskAmount: number;
  pipsAtRisk: number;
  unit: string;
}

export function calculatePositionSize(
  balance: number,
  riskPercent: number,
  entry: number,
  sl: number,
  pipValue: number = 10,
  assetType: AssetType = "forex"
): PositionSizeResult {
  const riskAmount = balance * (riskPercent / 100);

  if (assetType === "forex") {
    const pipsAtRisk = Math.abs(entry - sl) * 10000;
    const lots = pipsAtRisk > 0 ? riskAmount / (pipsAtRisk * pipValue) : 0;
    return {
      lots: parseFloat(lots.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      pipsAtRisk: parseFloat(pipsAtRisk.toFixed(1)),
      unit: "lots",
    };
  }

  // Crypto, indices, stocks: lot size = 1, risk per unit = price difference
  const priceRiskPerUnit = Math.abs(entry - sl);
  const units = priceRiskPerUnit > 0 ? riskAmount / priceRiskPerUnit : 0;
  const unitLabels: Record<string, string> = { crypto: "coins", indices: "contrats", stocks: "actions" };
  return {
    lots: parseFloat(units.toFixed(4)),
    riskAmount: parseFloat(riskAmount.toFixed(2)),
    pipsAtRisk: parseFloat(priceRiskPerUnit.toFixed(2)),
    unit: unitLabels[assetType] || "units",
  };
}

// ---- KELLY RAW (can be negative) ----
export function computeKellyRaw(trades: Trade[]): number {
  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 1;
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  return payoffRatio > 0 ? (winRate * payoffRatio - (1 - winRate)) / payoffRatio : 0;
}

// ---- EMOTION-PERFORMANCE HEATMAP ----
export interface EmotionDayCell {
  emotion: string;
  dayName: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export function computeEmotionDayHeatmap(trades: Trade[]): EmotionDayCell[] {
  const cells: Record<string, { pnl: number; trades: number; wins: number }> = {};
  trades.forEach((t) => {
    const emotion = t.emotion || "Non défini";
    const day = DAYS_FR[new Date(t.date).getDay()];
    const key = `${emotion}|${day}`;
    if (!cells[key]) cells[key] = { pnl: 0, trades: 0, wins: 0 };
    cells[key].pnl += t.result;
    cells[key].trades++;
    if (t.result > 0) cells[key].wins++;
  });

  return Object.entries(cells).map(([key, s]) => {
    const [emotion, dayName] = key.split("|");
    return { emotion, dayName, pnl: s.pnl, trades: s.trades, winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0 };
  });
}

// ---- TRADE SCORE (MarketPhase Score Pro) ----
export function computeTradeScore(trade: Trade, avgWin: number, avgLoss: number): number {
  let score = 50; // Base

  // Result impact (0-30)
  if (trade.result > 0) {
    score += Math.min(30, (trade.result / (avgWin || 1)) * 15);
  } else {
    score -= Math.min(30, (Math.abs(trade.result) / (avgLoss || 1)) * 15);
  }

  // R:R quality (0-10)
  if (trade.sl && trade.entry) {
    const risk = Math.abs(trade.entry - trade.sl);
    const reward = Math.abs(trade.tp - trade.entry);
    const rr = risk > 0 ? reward / risk : 0;
    score += Math.min(10, rr * 3);
  }

  // Emotion bonus (0-10)
  if (trade.emotion === "Confiant" || trade.emotion === "Neutre") score += 5;
  if (trade.emotion === "Peur" || trade.emotion === "Gourmand") score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
