import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Award,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShieldOff,
  Star,
  Flame,
  Zap,
  Trophy,
} from "lucide-react";
import ShareButton from "@/components/ShareButton";

export const dynamic = "force-dynamic";

interface Trade {
  id: string;
  date: Date;
  asset: string;
  direction: string;
  entry: number;
  exit: number | null;
  sl: number;
  tp: number;
  lots: number;
  result: number;
  strategy: string;
  commission: number | null;
  swap: number | null;
  setup: string | null;
  notes: string | null;
  createdAt: Date;
}

function computeStats(trades: Trade[]) {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalTrades = sorted.length;
  const wins = sorted.filter((t) => t.result > 0);
  const losses = sorted.filter((t) => t.result < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const totalPnL = sorted.reduce((sum, t) => sum + t.result, 0);

  const grossProfit = wins.reduce((sum, t) => sum + t.result, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.result, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const bestTrade = sorted.length > 0 ? sorted.reduce((best, t) => (t.result > best.result ? t : best), sorted[0]) : null;
  const worstTrade = sorted.length > 0 ? sorted.reduce((worst, t) => (t.result < worst.result ? t : worst), sorted[0]) : null;

  // Average R:R
  const rrValues = sorted
    .filter((t) => t.exit !== null && t.sl !== 0)
    .map((t) => {
      const risk = Math.abs(t.entry - t.sl);
      if (risk === 0) return 0;
      const reward = Math.abs((t.exit ?? t.entry) - t.entry);
      return reward / risk;
    });
  const avgRR = rrValues.length > 0 ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumPnL = 0;
  const equityCurve: { date: Date; cumPnL: number }[] = [];
  for (const t of sorted) {
    cumPnL += t.result;
    equityCurve.push({ date: new Date(t.date), cumPnL });
    if (cumPnL > peak) peak = cumPnL;
    const dd = peak - cumPnL;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Consecutive wins/losses
  let maxConsWins = 0;
  let maxConsLosses = 0;
  let currentConsWins = 0;
  let currentConsLosses = 0;
  for (const t of sorted) {
    if (t.result > 0) {
      currentConsWins++;
      currentConsLosses = 0;
      if (currentConsWins > maxConsWins) maxConsWins = currentConsWins;
    } else if (t.result < 0) {
      currentConsLosses++;
      currentConsWins = 0;
      if (currentConsLosses > maxConsLosses) maxConsLosses = currentConsLosses;
    } else {
      currentConsWins = 0;
      currentConsLosses = 0;
    }
  }

  // Current streak
  let currentStreak = 0;
  let streakType: "win" | "loss" | "none" = "none";
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].result > 0) {
      if (streakType === "none") streakType = "win";
      if (streakType === "win") currentStreak++;
      else break;
    } else if (sorted[i].result < 0) {
      if (streakType === "none") streakType = "loss";
      if (streakType === "loss") currentStreak++;
      else break;
    } else break;
  }

  // Favorite assets (top 3)
  const assetCount = new Map<string, number>();
  for (const t of sorted) {
    assetCount.set(t.asset, (assetCount.get(t.asset) || 0) + 1);
  }
  const favoriteAssets = Array.from(assetCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([asset, count]) => ({ asset, count }));

  // Monthly breakdown
  const monthlyMap = new Map<string, { pnl: number; trades: number; wins: number }>();
  for (const t of sorted) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || { pnl: 0, trades: 0, wins: 0 };
    existing.pnl += t.result;
    existing.trades++;
    if (t.result > 0) existing.wins++;
    monthlyMap.set(key, existing);
  }
  const monthlyBreakdown = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }));

  const bestMonth = monthlyBreakdown.length > 0
    ? monthlyBreakdown.reduce((best, m) => (m.pnl > best.pnl ? m : best))
    : null;

  // Trading style inference
  const strategies = new Map<string, number>();
  for (const t of sorted) {
    strategies.set(t.strategy, (strategies.get(t.strategy) || 0) + 1);
  }
  const topStrategy = strategies.size > 0
    ? Array.from(strategies.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Last 6 months
  const last6Months = monthlyBreakdown.slice(-6);

  return {
    totalTrades,
    winRate,
    profitFactor,
    totalPnL,
    bestTrade,
    worstTrade,
    avgRR,
    maxDrawdown,
    maxConsWins,
    maxConsLosses,
    currentStreak,
    streakType,
    favoriteAssets,
    bestMonth,
    topStrategy,
    equityCurve,
    monthlyBreakdown,
    last6Months,
  };
}

function formatPnL(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} $`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aou", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function EquityCurveSVG({ data }: { data: { date: Date; cumPnL: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Pas assez de donnees pour afficher la courbe
      </div>
    );
  }

  const width = 800;
  const height = 200;
  const padding = 40;

  const values = data.map((d) => d.cumPnL);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const range = maxVal - minVal || 1;

  const xStep = (width - padding * 2) / (data.length - 1);
  const yScale = (v: number) =>
    height - padding - ((v - minVal) / range) * (height - padding * 2);

  const points = data
    .map((d, i) => `${padding + i * xStep},${yScale(d.cumPnL)}`)
    .join(" ");

  const zeroY = yScale(0);

  const areaPath = `M ${padding},${yScale(data[0].cumPnL)} ${data
    .map((d, i) => `L ${padding + i * xStep},${yScale(d.cumPnL)}`)
    .join(" ")} L ${padding + (data.length - 1) * xStep},${zeroY} L ${padding},${zeroY} Z`;

  const lastVal = data[data.length - 1].cumPnL;
  const color = lastVal >= 0 ? "#10b981" : "#ef4444";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={padding}
        y1={zeroY}
        x2={width - padding}
        y2={zeroY}
        stroke="#374151"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <path d={areaPath} fill={`url(#equityGradient)`} opacity="0.2" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x={padding - 4} y={yScale(maxVal) + 4} textAnchor="end" className="fill-gray-500 text-[10px]">
        {maxVal.toFixed(0)}$
      </text>
      <text x={padding - 4} y={zeroY + 4} textAnchor="end" className="fill-gray-500 text-[10px]">
        0$
      </text>
      {minVal < 0 && (
        <text x={padding - 4} y={yScale(minVal) + 4} textAnchor="end" className="fill-gray-500 text-[10px]">
          {minVal.toFixed(0)}$
        </text>
      )}
    </svg>
  );
}

function MonthlyBarChart({ data }: { data: { month: string; pnl: number; trades: number; winRate: number }[] }) {
  if (data.length === 0) return null;

  const maxPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end gap-2 h-40 px-2">
      {data.map((d) => {
        const heightPercent = (Math.abs(d.pnl) / maxPnl) * 100;
        const isPositive = d.pnl >= 0;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {d.pnl >= 0 ? "+" : ""}{d.pnl.toFixed(0)}$
            </span>
            <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
              <div
                className={`w-full max-w-[40px] rounded-t-lg transition-all ${
                  isPositive
                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                    : "bg-gradient-to-t from-rose-600 to-rose-400"
                }`}
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              {formatMonthLabel(d.month).split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// XP / Level computation (simple heuristic)
function computeLevel(totalTrades: number, winRate: number) {
  const tradeXP = totalTrades * 10;
  const winBonus = winRate > 50 ? (winRate - 50) * 5 : 0;
  const xp = tradeXP + winBonus;
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  return { level: Math.min(level, 99), xp, xpInLevel };
}

export default async function TrackRecordPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  const user = await prisma.user.findFirst({
    where: { name: decodedUsername },
    include: {
      trades: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const trades = user.trades as unknown as Trade[];
  const stats = computeStats(trades);

  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const hasImportedTrades = trades.length > 5;
  const initials = (user.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { level, xpInLevel } = computeLevel(stats.totalTrades, stats.winRate);

  const recentTrades = trades.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 -z-10" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[120px] -z-10" />

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg shadow-cyan-500/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white truncate">
                {user.name}
              </h1>
              {/* Level Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-3.5 h-3.5" />
                Niv. {level}
              </span>
              {hasImportedTrades ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verifie
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-500 border border-gray-700">
                  <ShieldOff className="w-3.5 h-3.5" />
                  Non verifie
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-gray-500">
                Membre depuis {memberSince}
              </p>
              {stats.topStrategy && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Style: {stats.topStrategy}
                </span>
              )}
            </div>
            {/* XP Bar */}
            <div className="mt-2 flex items-center gap-2 max-w-xs">
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${xpInLevel}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-600">{xpInLevel}/100 XP</span>
            </div>
          </div>
          <ShareButton username={user.name || username} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        {/* Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <GlassStatCard
            label="Total Trades"
            value={stats.totalTrades.toString()}
            icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
          />
          <GlassStatCard
            label="Win Rate"
            value={formatPercent(stats.winRate)}
            icon={<Target className="w-4 h-4 text-emerald-400" />}
            color={stats.winRate >= 50 ? "green" : "red"}
          />
          <GlassStatCard
            label="Profit Factor"
            value={
              stats.profitFactor === Infinity
                ? "Inf"
                : stats.profitFactor.toFixed(2)
            }
            icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
            color={stats.profitFactor >= 1 ? "green" : "red"}
          />
          <GlassStatCard
            label="Avg R:R"
            value={stats.avgRR.toFixed(2)}
            icon={<Award className="w-4 h-4 text-amber-400" />}
          />
          <GlassStatCard
            label="Max Drawdown"
            value={`-${stats.maxDrawdown.toFixed(0)} $`}
            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            color="red"
          />
          <GlassStatCard
            label="Streak"
            value={`${stats.currentStreak} ${stats.streakType === "win" ? "W" : stats.streakType === "loss" ? "L" : ""}`}
            icon={<Flame className="w-4 h-4 text-orange-400" />}
            color={stats.streakType === "win" ? "green" : stats.streakType === "loss" ? "red" : undefined}
          />
        </div>

        {/* Favorite Assets + Best Month + Streaks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Favorite Assets */}
          <div className="rounded-2xl p-5 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Actifs Favoris
            </h3>
            {stats.favoriteAssets.length > 0 ? (
              <div className="space-y-2">
                {stats.favoriteAssets.map((a, i) => (
                  <div key={a.asset} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-700 text-gray-400" : "bg-gray-800 text-gray-500"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{a.asset}</span>
                    </div>
                    <span className="text-xs text-gray-500">{a.count} trades</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Aucune donnee</p>
            )}
          </div>

          {/* Best Month */}
          <div className="rounded-2xl p-5 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Meilleur Mois
            </h3>
            {stats.bestMonth ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPnL(stats.bestMonth.pnl)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatMonthLabel(stats.bestMonth.month)}
                </p>
                <p className="text-xs text-gray-600">
                  {stats.bestMonth.trades} trades - {formatPercent(stats.bestMonth.winRate)} WR
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Aucune donnee</p>
            )}
          </div>

          {/* Record Streaks */}
          <div className="rounded-2xl p-5 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Records
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Max wins</span>
                <span className="font-bold text-emerald-400">{stats.maxConsWins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Max pertes</span>
                <span className="font-bold text-rose-400">{stats.maxConsLosses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Serie actuelle</span>
                <span className={`font-bold ${stats.streakType === "win" ? "text-emerald-400" : stats.streakType === "loss" ? "text-rose-400" : "text-gray-500"}`}>
                  {stats.currentStreak} {stats.streakType === "win" ? "W" : stats.streakType === "loss" ? "L" : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Equity Curve */}
        <section className="rounded-2xl p-6 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Courbe d&apos;Equity
          </h2>
          <EquityCurveSVG data={stats.equityCurve} />
        </section>

        {/* Monthly Performance Bar Chart (last 6 months) */}
        {stats.last6Months.length > 0 && (
          <section className="rounded-2xl p-6 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Performance (6 derniers mois)
            </h2>
            <MonthlyBarChart data={stats.last6Months} />
          </section>
        )}

        {/* Monthly Performance Grid */}
        {stats.monthlyBreakdown.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Performance Mensuelle
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.monthlyBreakdown.map((m) => (
                <div
                  key={m.month}
                  className={`rounded-xl p-3 border backdrop-blur-sm ${
                    m.pnl >= 0
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-rose-500/10 border-rose-500/20"
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {formatMonthLabel(m.month)}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatPnL(m.pnl)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {m.trades} trades - {formatPercent(m.winRate)} WR
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Best / Worst Trades */}
        {(stats.bestTrade || stats.worstTrade) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.bestTrade && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-emerald-400">
                    Meilleur Trade
                  </h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset</span>
                    <span className="font-medium text-gray-300">{stats.bestTrade.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-300">
                      {formatDate(stats.bestTrade.date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P&L</span>
                    <span className="font-bold text-emerald-400">
                      {formatPnL(stats.bestTrade.result)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {stats.worstTrade && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                  <h3 className="font-semibold text-rose-400">Pire Trade</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset</span>
                    <span className="font-medium text-gray-300">
                      {stats.worstTrade.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-300">
                      {formatDate(stats.worstTrade.date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P&L</span>
                    <span className="font-bold text-rose-400">
                      {formatPnL(stats.worstTrade.result)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Shared Setups */}
        {recentTrades.filter(t => t.setup).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Setups Recents
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentTrades.filter(t => t.setup).slice(0, 4).map((trade) => (
                <div
                  key={trade.id}
                  className="rounded-xl p-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trade.asset}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.direction === "LONG" || trade.direction.toLowerCase() === "buy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {trade.direction}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${trade.result >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatPnL(trade.result)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{trade.setup}</p>
                  <p className="text-[10px] text-gray-600 mt-2">{formatDate(trade.date)} - {trade.strategy}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Trades Table */}
        {recentTrades.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">
              Derniers Trades
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-800/60 bg-gray-900/60 backdrop-blur-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800/60">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium text-right">Entree</th>
                    <th className="px-4 py-3 font-medium text-right">Sortie</th>
                    <th className="px-4 py-3 font-medium text-right">P&L</th>
                    <th className="px-4 py-3 font-medium text-right">R:R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {recentTrades.map((trade) => {
                    const risk = Math.abs(trade.entry - trade.sl);
                    const reward =
                      trade.exit !== null
                        ? Math.abs(trade.exit - trade.entry)
                        : 0;
                    const rr = risk > 0 ? (reward / risk).toFixed(2) : "--";

                    return (
                      <tr key={trade.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {formatDate(trade.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-200">
                          {trade.asset}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              trade.direction.toLowerCase() === "long" ||
                              trade.direction.toLowerCase() === "buy"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {trade.direction.toLowerCase() === "long" ||
                            trade.direction.toLowerCase() === "buy" ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                          {trade.entry.toFixed(5)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                          {trade.exit !== null ? trade.exit.toFixed(5) : "--"}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${
                            trade.result >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {formatPnL(trade.result)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                          {rr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty state */}
        {trades.length === 0 && (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">
              Aucun trade enregistre
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ce trader n&apos;a pas encore de trades dans son journal.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-800/60 text-center">
          <p className="text-sm text-gray-600">
            Propulse par{" "}
            <span className="font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">MarketPhase</span>{" "}
            -- Journal de Trading Gratuit
          </p>
          <a
            href="/register"
            className="inline-block mt-3 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Creer mon compte gratuitement
          </a>
        </footer>
      </div>
    </div>
  );
}

function GlassStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: "green" | "red";
}) {
  return (
    <div className="rounded-xl p-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 hover:border-gray-700/60 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div
        className={`text-lg font-bold ${
          color === "green"
            ? "text-emerald-400"
            : color === "red"
            ? "text-rose-400"
            : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
