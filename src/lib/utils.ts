export function calculateRR(entry: number, sl: number, tp: number): string {
  if (!entry || !sl || !tp || entry === sl) return "-";
  const risk = Math.abs(entry - sl);
  if (risk === 0) return "-";
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

export interface StreakData {
  bestWinStreak: number;
  worstLossStreak: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | "none";
}

export function computeStreaks(trades: { result: number; date: string }[]): StreakData {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let bestWin = 0;
  let worstLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;

  sorted.forEach((t) => {
    if (t.result > 0) {
      currentWin++;
      currentLoss = 0;
      if (currentWin > bestWin) bestWin = currentWin;
    } else if (t.result < 0) {
      currentLoss++;
      currentWin = 0;
      if (currentLoss > worstLoss) worstLoss = currentLoss;
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  });

  return {
    bestWinStreak: bestWin,
    worstLossStreak: worstLoss,
    currentStreak: currentWin > 0 ? currentWin : currentLoss,
    currentStreakType: currentWin > 0 ? "win" : currentLoss > 0 ? "loss" : "none",
  };
}

export interface AssetPerformance {
  asset: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
}

export function computeAssetPerformance(trades: { asset: string; result: number }[]): AssetPerformance[] {
  const map: Record<string, { count: number; wins: number; total: number }> = {};
  trades.forEach((t) => {
    if (!map[t.asset]) map[t.asset] = { count: 0, wins: 0, total: 0 };
    map[t.asset].count++;
    map[t.asset].total += t.result;
    if (t.result > 0) map[t.asset].wins++;
  });
  return Object.entries(map)
    .map(([asset, s]) => ({
      asset,
      trades: s.count,
      wins: s.wins,
      winRate: (s.wins / s.count) * 100,
      totalPnL: s.total,
      avgPnL: s.total / s.count,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

export interface EmotionPerformance {
  emotion: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
}

export function computeEmotionPerformance(trades: { emotion: string | null; result: number }[]): EmotionPerformance[] {
  const map: Record<string, { count: number; wins: number; total: number }> = {};
  trades.forEach((t) => {
    const emotion = t.emotion || "Non défini";
    if (!map[emotion]) map[emotion] = { count: 0, wins: 0, total: 0 };
    map[emotion].count++;
    map[emotion].total += t.result;
    if (t.result > 0) map[emotion].wins++;
  });
  return Object.entries(map)
    .map(([emotion, s]) => ({
      emotion,
      trades: s.count,
      wins: s.wins,
      winRate: (s.wins / s.count) * 100,
      totalPnL: s.total,
      avgPnL: s.total / s.count,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

export interface MonthlyData {
  label: string;
  pnl: number;
}

export function computeMonthlyComparison(trades: { date: string; result: number }[]): MonthlyData[] {
  const months: Record<string, number> = {};
  trades.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + t.result;
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, pnl]) => {
      const [year, month] = key.split("-");
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      return { label: `${monthNames[parseInt(month) - 1]} ${year}`, pnl };
    });
}
