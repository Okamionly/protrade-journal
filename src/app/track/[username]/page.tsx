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

  // Monthly breakdown
  const monthlyMap = new Map<
    string,
    { pnl: number; trades: number; wins: number }
  >();
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
    equityCurve,
    monthlyBreakdown,
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
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function EquityCurveSVG({ data }: { data: { date: Date; cumPnL: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Pas assez de données pour afficher la courbe
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

  // Area fill
  const areaPath = `M ${padding},${yScale(data[0].cumPnL)} ${data
    .map((d, i) => `L ${padding + i * xStep},${yScale(d.cumPnL)}`)
    .join(" ")} L ${padding + (data.length - 1) * xStep},${zeroY} L ${padding},${zeroY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Zero line */}
      <line
        x1={padding}
        y1={zeroY}
        x2={width - padding}
        y2={zeroY}
        stroke="#e5e7eb"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      {/* Area */}
      <path d={areaPath} fill="url(#equityGradient)" opacity="0.3" />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Gradient */}
      <defs>
        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y labels */}
      <text x={padding - 4} y={yScale(maxVal) + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
        {maxVal.toFixed(0)}$
      </text>
      <text x={padding - 4} y={zeroY + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
        0$
      </text>
      {minVal < 0 && (
        <text x={padding - 4} y={yScale(minVal) + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
          {minVal.toFixed(0)}$
        </text>
      )}
    </svg>
  );
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

  const trades = user.trades as Trade[];
  const stats = computeStats(trades);

  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Check if user has "imported" trades (heuristic: trades created in bulk have similar createdAt)
  const hasImportedTrades = trades.length > 5;
  const initials = (user.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const recentTrades = trades.slice(0, 20);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {user.name}
              </h1>
              {hasImportedTrades ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  <ShieldOff className="w-3.5 h-3.5" />
                  Non vérifié
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Membre depuis {memberSince}
            </p>
          </div>
          <ShareButton />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        {/* Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Trades"
            value={stats.totalTrades.toString()}
            icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
          />
          <StatCard
            label="Win Rate"
            value={formatPercent(stats.winRate)}
            icon={<Target className="w-4 h-4 text-emerald-500" />}
            color={stats.winRate >= 50 ? "green" : "red"}
          />
          <StatCard
            label="Profit Factor"
            value={
              stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)
            }
            icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
            color={stats.profitFactor >= 1 ? "green" : "red"}
          />
          <StatCard
            label="Total P&L"
            value={formatPnL(stats.totalPnL)}
            icon={
              stats.totalPnL >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )
            }
            color={stats.totalPnL >= 0 ? "green" : "red"}
          />
          <StatCard
            label="R:R Moyen"
            value={stats.avgRR.toFixed(2)}
            icon={<Award className="w-4 h-4 text-amber-500" />}
          />
          <StatCard
            label="Max Drawdown"
            value={`-${stats.maxDrawdown.toFixed(2)} $`}
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            color="red"
          />
        </div>

        {/* Equity Curve */}
        <section className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Courbe d&apos;Equity
          </h2>
          <EquityCurveSVG data={stats.equityCurve} />
        </section>

        {/* Monthly Performance Grid */}
        {stats.monthlyBreakdown.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Performance Mensuelle
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.monthlyBreakdown.map((m) => (
                <div
                  key={m.month}
                  className={`rounded-xl p-3 border ${
                    m.pnl >= 0
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {formatMonthLabel(m.month)}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      m.pnl >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatPnL(m.pnl)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {m.trades} trades · {formatPercent(m.winRate)} WR
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
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">
                    Meilleur Trade
                  </h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Asset</span>
                    <span className="font-medium">{stats.bestTrade.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">
                      {formatDate(stats.bestTrade.date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">P&L</span>
                    <span className="font-bold text-green-700">
                      {formatPnL(stats.bestTrade.result)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {stats.worstTrade && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Pire Trade</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Asset</span>
                    <span className="font-medium">
                      {stats.worstTrade.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">
                      {formatDate(stats.worstTrade.date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">P&L</span>
                    <span className="font-bold text-red-700">
                      {formatPnL(stats.worstTrade.result)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Streak Info */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <span className="text-green-700 font-medium">
              Max wins consécutifs:
            </span>
            <span className="font-bold text-green-800">
              {stats.maxConsWins}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
            <span className="text-red-700 font-medium">
              Max pertes consécutives:
            </span>
            <span className="font-bold text-red-800">
              {stats.maxConsLosses}
            </span>
          </div>
        </div>

        {/* Recent Trades Table */}
        {recentTrades.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Derniers Trades
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium text-right">Entrée</th>
                    <th className="px-4 py-3 font-medium text-right">Sortie</th>
                    <th className="px-4 py-3 font-medium text-right">P&L</th>
                    <th className="px-4 py-3 font-medium text-right">R:R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTrades.map((trade) => {
                    const risk = Math.abs(trade.entry - trade.sl);
                    const reward =
                      trade.exit !== null
                        ? Math.abs(trade.exit - trade.entry)
                        : 0;
                    const rr = risk > 0 ? (reward / risk).toFixed(2) : "—";

                    return (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {formatDate(trade.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                          {trade.asset}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              trade.direction.toLowerCase() === "long" ||
                              trade.direction.toLowerCase() === "buy"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
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
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                          {trade.entry.toFixed(5)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                          {trade.exit !== null ? trade.exit.toFixed(5) : "—"}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${
                            trade.result >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatPnL(trade.result)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
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
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">
              Aucun trade enregistré
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Ce trader n&apos;a pas encore de trades dans son journal.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">
            Propulsé par{" "}
            <span className="font-semibold text-gray-600">MarketPhase</span>{" "}
            — Journal de Trading Gratuit
          </p>
          <a
            href="/register"
            className="inline-block mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Créer mon compte gratuitement →
          </a>
        </footer>
      </div>
    </div>
  );
}

function StatCard({
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
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div
        className={`text-lg font-bold ${
          color === "green"
            ? "text-green-600"
            : color === "red"
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
