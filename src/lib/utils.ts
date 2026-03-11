export function calculateRR(entry: number, sl: number, tp: number): string {
  if (!sl || entry === sl) return "-";
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return (reward / risk).toFixed(1);
}

export function formatCurrency(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}€${value.toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("fr-FR");
}

export interface TradeStats {
  netProfit: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  avgRR: string;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export function computeStats(
  trades: { result: number; entry: number; sl: number; tp: number }[]
): TradeStats {
  const total = trades.reduce((sum, t) => sum + t.result, 0);
  const wins = trades.filter((t) => t.result > 0);
  const losses = trades.filter((t) => t.result < 0);
  const winRate =
    trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  let totalRR = 0;
  let rrCount = 0;
  trades.forEach((t) => {
    const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
    if (!isNaN(rr)) {
      totalRR += rr;
      rrCount++;
    }
  });

  const grossWins = wins.reduce((s, t) => s + t.result, 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.result, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // Max drawdown
  let peak = 0;
  let maxDD = 0;
  let cumulative = 0;
  trades.forEach((t) => {
    cumulative += t.result;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  });

  // Sharpe ratio (simplified)
  const mean = trades.length > 0 ? total / trades.length : 0;
  const variance =
    trades.length > 1
      ? trades.reduce((s, t) => s + Math.pow(t.result - mean, 2), 0) /
        (trades.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

  return {
    netProfit: total,
    winRate,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    avgRR: rrCount > 0 ? (totalRR / rrCount).toFixed(1) : "0",
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    sharpeRatio: parseFloat(sharpe.toFixed(2)),
  };
}
